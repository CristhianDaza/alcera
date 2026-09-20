import { z } from "zod";
import {
  remainingSaleItemQuantities,
  type CashMovement,
  type InventoryMovement,
  type Sale,
  type SaleReturn,
} from "../../../../../shared/business";
import type { Product } from "../../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      reason: z.string().trim().min(3).max(1000),
      refundAccount: z.string().trim().min(1).max(120).optional(),
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
    const originalMovements = sale.inventoryAppliedAt
      ? (
          await tx.get(
            db
              .collection("inventoryMovements")
              .where("referenceId", "==", saleId),
          )
        ).docs
          .map((doc) => docData<InventoryMovement>(doc))
          .filter(
            (movement) =>
              movement.type === "sale" && movement.quantityChange < 0,
          )
      : [];
    const previousReturns = sale.inventoryAppliedAt
      ? sale.returnedItems
        ? [{ items: sale.returnedItems }]
        : (
            await tx.get(
              db.collection("saleReturns").where("saleId", "==", saleId),
            )
          ).docs.map((doc) => docData<SaleReturn>(doc))
      : [];
    const sourceIds = [
      ...new Set(
        originalMovements
          .map((movement) => movement.sourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const sourceSnapshots = await Promise.all(
      sourceIds.map((id) => tx.get(db.collection("decantSources").doc(id))),
    );
    const sources = new Map(
      sourceSnapshots.map((snapshot) => [
        snapshot.id,
        docData<import("../../../../../shared/business").DecantSource>(
          snapshot,
        ),
      ]),
    );
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const updatedProducts = new Map<string, Product>();
    const updatedSources = new Map<
      string,
      import("../../../../../shared/business").DecantSource
    >();
    const at = nowIso();
    const refundNumber =
      sale.paidTotal > 0 ? await nextNumber(tx, "M", new Date()) : undefined;
    if (sale.inventoryAppliedAt && !sale.inventoryReversedAt) {
      for (const original of originalMovements.filter(
        (movement) => movement.quantityUnit === "ml" && movement.sourceId,
      )) {
        const source =
          updatedSources.get(original.sourceId!) ??
          sources.get(original.sourceId!);
        if (!source)
          throw createError({
            statusCode: 409,
            statusMessage:
              "No se encontró el frasco fuente del decant para reversar la venta",
          });
        const restoredMl = -original.quantityChange;
        if (source.remainingMl + restoredMl > source.initialMl)
          throw createError({
            statusCode: 409,
            statusMessage:
              "El frasco abierto fue ajustado después de la venta y no puede restaurarse automáticamente",
          });
        const nextSource = {
          ...source,
          remainingMl: source.remainingMl + restoredMl,
          status: "open" as const,
          updatedAt: at,
        };
        updatedSources.set(source.id, nextSource);
        const movement: InventoryMovement = {
          id: newId(),
          productId: original.productId,
          variantId: original.variantId,
          type: "customer_return",
          quantityChange: restoredMl,
          quantityUnit: "ml",
          sourceId: source.id,
          unitCost: original.unitCost,
          stockBefore: source.remainingMl,
          stockAfter: nextSource.remainingMl,
          referenceType: "sale",
          referenceId: saleId,
          reason: `Anulación ${sale.number}: ${body.reason}`,
          occurredAt: at,
          createdAt: at,
          createdBy: admin.uid,
        };
        tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
      }
      for (const { item, quantity } of remainingSaleItemQuantities(
        sale.items,
        previousReturns,
      )) {
        if (quantity === 0) continue;
        const product =
          updatedProducts.get(item.productId) ?? products.get(item.productId);
        const variant = findVariant(product, item.variantId);
        const current = inventoryOf(variant);
        const original = originalMovements.find(
          (movement) =>
            movement.variantId === item.variantId &&
            movement.productId === item.productId &&
            movement.quantityChange < 0 &&
            movement.quantityUnit !== "ml",
        );
        if (!original) continue;
        const stockAfter = safeInteger(
          current.stock + quantity,
          "El saldo de inventario supera el límite numérico seguro",
        );
        updatedProducts.set(
          item.productId,
          replaceVariant(product!, item.variantId, {
            ...variant,
            inventory: {
              ...current,
              stock: stockAfter,
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
          quantityChange: quantity,
          unitCost: item.unitCost,
          stockBefore: current.stock,
          stockAfter,
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
      for (const source of updatedSources.values())
        tx.update(db.collection("decantSources").doc(source.id), {
          remainingMl: source.remainingMl,
          status: source.status,
          updatedAt: at,
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
