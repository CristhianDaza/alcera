import { describe, expect, it } from "vitest";
import {
  cashMovementCreateSchema,
  decantConsumption,
  decantUnitCost,
  expenseCreateSchema,
  landedUnitCost,
  millilitersFromSize,
  movementCreateSchema,
  remainingSaleItemQuantities,
  saleCreateSchema,
  saleTotals,
  weightedAverageCost,
  weightedAverageCostAfterRemoval,
} from "../shared/business";
import { dateRange, inventoryOf } from "../server/utils/business";

describe("business rules", () => {
  it("calculates the sale total with per-line discounts and shipping", () => {
    expect(
      saleTotals(
        [
          { quantity: 2, unitPrice: 50_000, discount: 5_000 },
          { quantity: 1, unitPrice: 20_000, discount: 0 },
        ],
        8_000,
      ),
    ).toEqual({ subtotal: 120_000, discountTotal: 5_000, total: 123_000 });
  });

  it("calculates a rounded weighted average cost", () => {
    expect(weightedAverageCost(3, 100_000, 2, 130_000)).toBe(112_000);
    expect(weightedAverageCost(0, 0, 4, 87_500)).toBe(87_500);
    expect(weightedAverageCostAfterRemoval(5, 112_000, 2, 130_000)).toBe(
      100_000,
    );
    expect(weightedAverageCostAfterRemoval(2, 130_000, 2, 130_000)).toBe(0);
  });

  it("does not allow a line discount greater than its value", () => {
    expect(
      saleCreateSchema.safeParse({
        occurredAt: new Date().toISOString(),
        channel: "physical",
        status: "pending_payment",
        items: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPrice: 20_000,
            discount: 20_001,
          },
        ],
        shippingCharged: 5_000,
      }).success,
    ).toBe(false);
  });

  it("rejects zero inventory movements", () => {
    expect(
      movementCreateSchema.safeParse({
        productId: "p1",
        variantId: "v1",
        type: "adjustment",
        quantityChange: 0,
        unitCost: null,
        reference: "conteo físico",
        reason: "Conteo físico",
        occurredAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });

  it("requires a payment account for paid expenses", () => {
    expect(
      expenseCreateSchema.safeParse({
        date: new Date().toISOString(),
        description: "Empaques",
        category: "packaging",
        amount: 20_000,
        status: "paid",
      }).success,
    ).toBe(false);
  });

  it("only accepts positive integer cash amounts", () => {
    expect(
      cashMovementCreateSchema.safeParse({
        date: new Date().toISOString(),
        direction: "in",
        type: "opening_balance",
        account: "cash",
        amount: 10.5,
        description: "Apertura",
      }).success,
    ).toBe(false);
    expect(
      cashMovementCreateSchema.safeParse({
        date: new Date().toISOString(),
        direction: "in",
        type: "withdrawal",
        account: "cash",
        amount: 10_000,
        description: "Retiro propietario",
      }).success,
    ).toBe(false);
  });

  it("uses complete Bogota calendar days for report ranges", () => {
    expect(dateRange({ from: "2026-09-01", to: "2026-09-19" })).toMatchObject({
      start: "2026-09-01T05:00:00.000Z",
      end: "2026-09-20T04:59:59.999Z",
    });
  });

  it("subtracts previous returns when a sale is cancelled", () => {
    const item = {
      productId: "p1",
      variantId: "v1",
      name: "Perfume",
      size: "100 ml",
      quantity: 2,
      unitPrice: 100_000,
      unitCost: 60_000,
      discount: 0,
      lineTotal: 200_000,
    };
    expect(
      remainingSaleItemQuantities(
        [item, { ...item, quantity: 1, lineTotal: 100_000 }],
        [
          {
            id: "r1",
            saleId: "s1",
            date: new Date().toISOString(),
            items: [
              {
                productId: "p1",
                variantId: "v1",
                quantity: 1,
                unitCost: 60_000,
              },
            ],
            refundAmount: 100_000,
            costTotal: 60_000,
            reason: "Devolución",
            createdAt: new Date().toISOString(),
            createdBy: "admin",
          },
        ],
      ),
    ).toEqual([{ item, quantity: 2 }]);
  });

  it("controls an opened bottle in milliliters", () => {
    expect(millilitersFromSize("Decant 5 ml")).toBe(5);
    expect(decantConsumption(100, 5, 3)).toEqual({
      usedMl: 15,
      remainingMl: 85,
    });
    expect(() => decantConsumption(10, 5, 3)).toThrow(
      "No hay suficientes mililitros",
    );
    expect(decantUnitCost(5, 4_000, 3_000)).toBe(23_000);
  });

  it("allocates purchase freight into landed unit cost", () => {
    expect(landedUnitCost(200_000, 2, 30_000, 300_000, true)).toBe(110_000);
    expect(landedUnitCost(200_000, 2, 30_000, 300_000, false)).toBe(100_000);
  });

  it("accepts sales pending procurement", () => {
    expect(
      saleCreateSchema.safeParse({
        occurredAt: new Date().toISOString(),
        channel: "website",
        status: "pending_purchase",
        items: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPrice: 300_000,
            discount: 0,
          },
        ],
        shippingCharged: 0,
      }).success,
    ).toBe(true);
  });

  it("uses on-demand inventory by default for a bottle", () => {
    expect(
      inventoryOf({
        id: "v1",
        size: "100 ml",
        price: 300_000,
      }).mode,
    ).toBe("on_demand");
  });
});
