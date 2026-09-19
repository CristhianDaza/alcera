import { z } from "zod";
import {
  cashAccounts,
  type CashMovement,
  type InventoryMovement,
  type Sale,
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
  const saleId = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(saleId);
    const saleSnapshot = await tx.get(saleRef);
    if (!saleSnapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(saleSnapshot);
    if (sale.status === "cancelled") return sale;
    if (sale.paidTotal > 0 && !body.refundAccount)
      throw createError({
        statusCode: 409,
        statusMessage:
          "Selecciona la cuenta desde la que se devolverá el dinero",
      });
    const refs = sale.inventoryAppliedAt
      ? [...new Set(sale.items.map((item) => item.productId))].map((id) =>
          db.collection("products").doc(id),
        )
      : [];
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const updatedProducts = new Map<string, Product>();
    const at = nowIso();
    const refundNumber =
      sale.paidTotal > 0 ? await nextNumber(tx, "M", new Date()) : undefined;
    if (sale.inventoryAppliedAt && !sale.inventoryReversedAt) {
      for (const item of sale.items) {
        const product =
          updatedProducts.get(item.productId) ?? products.get(item.productId);
        const variant = findVariant(product, item.variantId);
        const current = inventoryOf(variant);
        updatedProducts.set(
          item.productId,
          replaceVariant(product!, item.variantId, {
            ...variant,
            inventory: {
              ...current,
              stock: current.stock + item.quantity,
              updatedAt: at,
            },
          }),
        );
        const movementId = newId();
        const movement: InventoryMovement = {
          id: movementId,
          productId: item.productId,
          variantId: item.variantId,
          type: "customer_return",
          quantityChange: item.quantity,
          unitCost: item.unitCost,
          stockBefore: current.stock,
          stockAfter: current.stock + item.quantity,
          referenceType: "sale",
          referenceId: saleId,
          reason: `Anulación ${sale.number}: ${body.reason}`,
          occurredAt: at,
          createdAt: at,
          createdBy: admin.uid,
        };
        tx.set(db.collection("inventoryMovements").doc(movementId), movement);
      }
      for (const [productId, product] of updatedProducts)
        tx.update(db.collection("products").doc(productId), {
          variants: product.variants,
        });
    }
    if (sale.paidTotal > 0) {
      const cashId = newId();
      const refund: CashMovement = {
        id: cashId,
        number: refundNumber!,
        date: at,
        direction: "out",
        type: "sale_refund",
        account: body.refundAccount!,
        amount: sale.paidTotal,
        description: `Devolución por anulación ${sale.number}: ${body.reason}`,
        referenceType: "sale",
        referenceId: saleId,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cashId), refund);
    }
    tx.update(
      saleRef,
      firestoreData({
        status: "cancelled",
        paidTotal: 0,
        balanceDue: 0,
        inventoryReversedAt: sale.inventoryAppliedAt ? at : undefined,
        cancellationReason: body.reason,
        updatedAt: at,
      }),
    );
    return {
      ...sale,
      status: "cancelled",
      inventoryReversedAt: sale.inventoryAppliedAt ? at : undefined,
      updatedAt: at,
    };
  });
});
