import {
  landedUnitCost,
  weightedAverageCost,
  type CashMovement,
  type InventoryMovement,
  type Purchase,
} from "../../../../../shared/business";
import type { Product } from "../../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const purchaseId = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const purchaseRef = db.collection("purchases").doc(purchaseId);
    const purchaseSnapshot = await tx.get(purchaseRef);
    if (!purchaseSnapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Compra no encontrada",
      });
    const purchase = docData<Purchase>(purchaseSnapshot);
    if (purchase.confirmedAt) return purchase;
    if (purchase.status === "cancelled")
      throw createError({
        statusCode: 409,
        statusMessage: "Una compra cancelada no puede confirmarse",
      });
    const refs = [...new Set(purchase.items.map((item) => item.productId))].map(
      (id) => db.collection("products").doc(id),
    );
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    let cashNumber: string | undefined;
    const shouldCreateCashMovement =
      purchase.paymentStatus === "paid" && !purchase.cashMovementId;
    if (shouldCreateCashMovement)
      cashNumber = await nextNumber(tx, "M", new Date(purchase.date));
    const at = nowIso();
    const updatedProducts = new Map<string, Product>();
    const merchandiseTotal = purchase.items.reduce(
      (sum, item) => sum + item.total,
      0,
    );
    for (const item of purchase.items) {
      const product =
        updatedProducts.get(item.productId) ?? products.get(item.productId);
      const variant = findVariant(product, item.variantId);
      const current = inventoryOf(variant);
      const netUnitCost = landedUnitCost(
        item.total,
        item.quantity,
        purchase.freight,
        merchandiseTotal,
        Boolean(purchase.allocateFreight),
      );
      const averageCost = weightedAverageCost(
        current.stock,
        current.averageCost,
        item.quantity,
        netUnitCost,
      );
      updatedProducts.set(
        item.productId,
        replaceVariant(product!, item.variantId, {
          ...variant,
          inventory: {
            ...current,
            stock: current.stock + item.quantity,
            averageCost,
            updatedAt: at,
          },
        }),
      );
      const movementId = newId();
      const movement: InventoryMovement = {
        id: movementId,
        productId: item.productId,
        variantId: item.variantId,
        type: "purchase",
        quantityChange: item.quantity,
        unitCost: netUnitCost,
        stockBefore: current.stock,
        stockAfter: current.stock + item.quantity,
        referenceType: "purchase",
        referenceId: purchaseId,
        reason: `Compra ${purchase.number}`,
        occurredAt: purchase.date,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("inventoryMovements").doc(movementId), movement);
    }
    for (const [productId, product] of updatedProducts)
      tx.update(db.collection("products").doc(productId), {
        variants: product.variants,
      });
    let cashMovementId = purchase.cashMovementId;
    if (shouldCreateCashMovement) {
      const cashId = newId();
      cashMovementId = cashId;
      const cash: CashMovement = {
        id: cashId,
        number: cashNumber!,
        date: purchase.date,
        direction: "out",
        type: "purchase",
        account: purchase.cashAccount!,
        amount: purchase.total,
        description: `Compra ${purchase.number}`,
        referenceType: "purchase",
        referenceId: purchaseId,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cashId), cash);
    }
    tx.update(purchaseRef, {
      status: "confirmed",
      confirmedAt: at,
      ...(cashMovementId
        ? { cashMovementId, paidAt: purchase.paidAt ?? at }
        : {}),
      updatedAt: at,
    });
    return {
      ...purchase,
      status: "confirmed",
      confirmedAt: at,
      cashMovementId,
      paidAt: cashMovementId ? (purchase.paidAt ?? at) : purchase.paidAt,
      updatedAt: at,
    };
  });
});
