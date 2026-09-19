import { describe, expect, it } from "vitest";
import {
  cashMovementCreateSchema,
  decantConsumption,
  decantUnitCost,
  expenseCreateSchema,
  landedUnitCost,
  millilitersFromSize,
  movementCreateSchema,
  saleCreateSchema,
  saleTotals,
  weightedAverageCost,
} from "../shared/business";

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
  });

  it("rejects zero inventory movements", () => {
    expect(
      movementCreateSchema.safeParse({
        productId: "p1",
        variantId: "v1",
        type: "adjustment",
        quantityChange: 0,
        unitCost: null,
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
});
