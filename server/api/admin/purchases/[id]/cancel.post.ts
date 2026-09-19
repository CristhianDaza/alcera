import { z } from "zod";
import {
  cashAccounts,
  landedUnitCost,
  type CashMovement,
  type InventoryMovement,
  type Purchase,
  weightedAverageCostAfterRemoval,
} from "../../../../../shared/business";
import type { Product } from "../../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      reason: z.string().trim().min(3).max(1000),
      refundAccount: z.enum(cashAccounts).optional(),
    }),
  );
  const id = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("purchases").doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Compra no encontrada",
      });
    const purchase = docData<Purchase>(snapshot);
    if (purchase.status === "cancelled") return purchase;
    const cashWasApplied = Boolean(purchase.cashMovementId);
    if (cashWasApplied && !body.refundAccount)
      throw createError({
        statusCode: 409,
        statusMessage:
          "Selecciona la cuenta que recibe la devolución del proveedor",
      });
    const refs =
      purchase.status === "confirmed"
        ? [...new Set(purchase.items.map((item) => item.productId))].map(
            (productId) => db.collection("products").doc(productId),
          )
        : [];
    const snapshots = await Promise.all(
      refs.map((productRef) => tx.get(productRef)),
    );
    const products = new Map(
      snapshots.map((product) => [
        product.id,
        { id: product.id, ...product.data() } as Product,
      ]),
    );
    const number = cashWasApplied
      ? await nextNumber(tx, "M", new Date())
      : undefined;
    const at = nowIso();
    if (purchase.status === "confirmed") {
      const updated = new Map<string, Product>();
      const merchandiseTotal = purchase.items.reduce(
        (sum, item) => sum + item.total,
        0,
      );
      for (const item of purchase.items) {
        const product =
          updated.get(item.productId) ?? products.get(item.productId);
        const variant = findVariant(product, item.variantId);
        const inventory = inventoryOf(variant);
        if (inventory.stock < item.quantity)
          throw createError({
            statusCode: 409,
            statusMessage: `No se puede reversar: ya no están disponibles ${item.quantity} unidades de ${item.name} · ${item.size}`,
          });
        const after = inventory.stock - item.quantity;
        const netUnitCost = landedUnitCost(
          item.total,
          item.quantity,
          purchase.freight,
          merchandiseTotal,
          Boolean(purchase.allocateFreight),
        );
        updated.set(
          item.productId,
          replaceVariant(product!, item.variantId, {
            ...variant,
            inventory: {
              ...inventory,
              stock: after,
              averageCost: weightedAverageCostAfterRemoval(
                inventory.stock,
                inventory.averageCost,
                item.quantity,
                netUnitCost,
              ),
              updatedAt: at,
            },
          }),
        );
        const movement: InventoryMovement = {
          id: newId(),
          productId: item.productId,
          variantId: item.variantId,
          type: "supplier_return",
          quantityChange: -item.quantity,
          unitCost: netUnitCost,
          stockBefore: inventory.stock,
          stockAfter: after,
          referenceType: "purchase",
          referenceId: id,
          reason: `Reverso ${purchase.number}: ${body.reason}`,
          occurredAt: at,
          createdAt: at,
          createdBy: admin.uid,
        };
        tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
      }
      for (const [productId, product] of updated)
        tx.update(db.collection("products").doc(productId), {
          variants: product.variants,
        });
    }
    if (cashWasApplied) {
      const cash: CashMovement = {
        id: newId(),
        number: number!,
        date: at,
        direction: "in",
        type: "adjustment",
        account: body.refundAccount!,
        amount: purchase.total,
        description: `Devolución de compra ${purchase.number}: ${body.reason}`,
        referenceType: "purchase",
        referenceId: id,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cash.id), cash);
    }
    tx.update(ref, {
      status: "cancelled",
      cancelledAt: at,
      cancellationReason: body.reason,
      updatedAt: at,
    });
    return { ...purchase, status: "cancelled" as const };
  });
});
