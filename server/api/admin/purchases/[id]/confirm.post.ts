import {
  landedUnitCost,
  inventoryItemOf,
  weightedAverageCost,
  type CashMovement,
  type InventoryMovement,
  type Purchase,
  type Supply,
  type SupplyMovement,
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
    const refs = [
      ...new Set(
        purchase.items.flatMap((item) =>
          item.productId ? [item.productId] : [],
        ),
      ),
    ].map((id) => db.collection("products").doc(id));
    const supplyRefs = [
      ...new Set(
        purchase.items.flatMap((item) =>
          item.supplyId ? [item.supplyId] : [],
        ),
      ),
    ].map((id) => db.collection("supplies").doc(id));
    const [snapshots, supplySnapshots] = await Promise.all([
      Promise.all(refs.map((ref) => tx.get(ref))),
      Promise.all(supplyRefs.map((ref) => tx.get(ref))),
    ]);
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const supplies = new Map(
      supplySnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [
          snapshot.id,
          inventoryItemOf(docData<Supply>(snapshot)),
        ]),
    );
    let cashNumber: string | undefined;
    const shouldCreateCashMovement =
      purchase.paymentStatus === "paid" && !purchase.cashMovementId;
    if (shouldCreateCashMovement)
      cashNumber = await nextNumber(tx, "M", new Date(purchase.date));
    const at = nowIso();
    const updatedProducts = new Map<string, Product>();
    const supplyMovements: SupplyMovement[] = [];
    const merchandiseTotal = purchase.items.reduce(
      (sum, item) => sum + item.total,
      0,
    );
    for (const item of purchase.items) {
      const netUnitCost = landedUnitCost(
        item.total,
        item.quantity,
        purchase.freight,
        merchandiseTotal,
        Boolean(purchase.allocateFreight),
      );
      if (item.supplyId) {
        const supply = supplies.get(item.supplyId);
        if (!supply)
          throw createError({
            statusCode: 409,
            statusMessage: "El insumo de la compra ya no existe",
          });
        const stockAfter = safeInteger(
          supply.stock + item.quantity,
          "El saldo de insumos supera el límite numérico seguro",
        );
        const averageCost = weightedAverageCost(
          supply.stock,
          supply.averageCost,
          item.quantity,
          netUnitCost,
        );
        supplies.set(supply.id, {
          ...supply,
          stock: stockAfter,
          averageCost,
          updatedAt: at,
        });
        supplyMovements.push({
          id: newId(),
          supplyId: supply.id,
          type: "purchase",
          quantityChange: item.quantity,
          unitCost: netUnitCost,
          stockBefore: supply.stock,
          stockAfter,
          referenceType: "purchase",
          referenceId: purchaseId,
          reason: `Compra ${purchase.number}`,
          occurredAt: purchase.date,
          createdAt: at,
          createdBy: admin.uid,
        });
        continue;
      }
      const product =
        updatedProducts.get(item.productId!) ?? products.get(item.productId!);
      const variant = findVariant(product, item.variantId!);
      const current = inventoryOf(variant);
      const averageCost = weightedAverageCost(
        current.stock,
        current.averageCost,
        item.quantity,
        netUnitCost,
      );
      const stockAfter = safeInteger(
        current.stock + item.quantity,
        "El saldo de inventario supera el límite numérico seguro",
      );
      updatedProducts.set(
        item.productId!,
        replaceVariant(product!, item.variantId!, {
          ...variant,
          inventory: {
            ...current,
            stock: stockAfter,
            averageCost,
            updatedAt: at,
          },
        }),
      );
      const movementId = newId();
      const movement: InventoryMovement = {
        id: movementId,
        productId: item.productId!,
        variantId: item.variantId!,
        type: "purchase",
        quantityChange: item.quantity,
        unitCost: netUnitCost,
        stockBefore: current.stock,
        stockAfter,
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
    for (const supply of supplies.values())
      tx.update(db.collection("supplies").doc(supply.id), {
        stock: supply.stock,
        averageCost: supply.averageCost,
        updatedAt: at,
      });
    for (const movement of supplyMovements)
      tx.set(db.collection("supplyMovements").doc(movement.id), movement);
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
