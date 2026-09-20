import { describe, expect, it } from "vitest";
import {
  cashMovementCreateSchema,
  availableDecantContainers,
  selectedDecantContainerId,
  decantConsumption,
  decantUnitCost,
  expenseCreateSchema,
  landedUnitCost,
  millilitersFromSize,
  movementCreateSchema,
  purchaseCreateSchema,
  remainingSaleItemQuantities,
  saleCreateSchema,
  saleTotals,
  supplyCreateSchema,
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
    expect(weightedAverageCost(10_000_000, 999_999_999, 100_000, 1)).toBe(
      990_099_009,
    );
  });

  it("does not allow a line discount greater than its value", () => {
    expect(
      saleCreateSchema.safeParse({
        requestId: crypto.randomUUID(),
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
        requestId: crypto.randomUUID(),
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
        requestId: crypto.randomUUID(),
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
        requestId: crypto.randomUUID(),
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
        requestId: crypto.randomUUID(),
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

  it("rejects purchase totals outside JavaScript safe integer precision", () => {
    expect(
      purchaseCreateSchema.safeParse({
        requestId: crypto.randomUUID(),
        supplierName: "Proveedor",
        date: new Date().toISOString(),
        paymentStatus: "pending",
        items: Array.from({ length: 100 }, (_, index) => ({
          productId: `p-${index}`,
          variantId: `v-${index}`,
          quantity: 100_000,
          unitCost: 1_000_000_000,
          discount: 0,
        })),
        freight: 0,
      }).success,
    ).toBe(false);
  });

  it("accepts sales pending procurement", () => {
    expect(
      saleCreateSchema.safeParse({
        requestId: crypto.randomUUID(),
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

  it("accepts manually selected packaging supplies on a sale", () => {
    expect(
      saleCreateSchema.safeParse({
        requestId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        channel: "physical",
        status: "pending_payment",
        items: [
          {
            productId: "p1",
            variantId: "v1",
            quantity: 1,
            unitPrice: 20_000,
            discount: 0,
          },
        ],
        supplyUses: [{ supplyId: "box-small", quantity: 1 }],
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

  it("creates general inventory items and validates decant containers", () => {
    const base = {
      name: "Frasco 10 ml",
      stock: 20,
      minimumStock: 2,
      averageCost: 500,
    };
    expect(supplyCreateSchema.safeParse(base).success).toBe(true);
    expect(
      supplyCreateSchema.safeParse({
        ...base,
        category: "DECANT_CONTAINER",
        unit: "UNIT",
        capacityMl: 10,
      }).success,
    ).toBe(true);
    expect(
      supplyCreateSchema.safeParse({
        ...base,
        category: "DECANT_CONTAINER",
        unit: "UNIT",
      }).success,
    ).toBe(false);
  });

  it("only offers active containers with the selected capacity", () => {
    const at = new Date().toISOString();
    const items = [
      { id: "c10", name: "Vidrio 10", stock: 10, minimumStock: 0, averageCost: 1, active: true, category: "DECANT_CONTAINER" as const, unit: "UNIT" as const, capacityMl: 10, createdAt: at, updatedAt: at },
      { id: "c5", name: "Vidrio 5", stock: 10, minimumStock: 0, averageCost: 1, active: true, category: "DECANT_CONTAINER" as const, unit: "UNIT" as const, capacityMl: 5, createdAt: at, updatedAt: at },
      { id: "box", name: "Caja", stock: 10, minimumStock: 0, averageCost: 1, active: true, category: "PACKAGING" as const, unit: "UNIT" as const, createdAt: at, updatedAt: at },
      { id: "off", name: "Inactivo", stock: 10, minimumStock: 0, averageCost: 1, active: false, category: "DECANT_CONTAINER" as const, unit: "UNIT" as const, capacityMl: 10, createdAt: at, updatedAt: at },
    ];
    expect(availableDecantContainers(items, 10).map((item) => item.id)).toEqual(["c10"]);
    expect(selectedDecantContainerId(items, 10)).toBe("c10");
  });

  it("accepts purchase entries for an inventory item", () => {
    expect(
      purchaseCreateSchema.safeParse({
        requestId: crypto.randomUUID(),
        supplierName: "Proveedor",
        date: new Date().toISOString(),
        paymentStatus: "pending",
        items: [{ supplyId: "container-10", quantity: 50, unitCost: 500, discount: 0 }],
        freight: 0,
      }).success,
    ).toBe(true);
  });
});
