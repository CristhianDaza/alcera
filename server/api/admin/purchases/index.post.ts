import {
  purchaseCreateSchema,
  inventoryItemOf,
  type Purchase,
  type Supply,
} from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, purchaseCreateSchema);
  const db = database();
  const id = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const purchaseRef = db.collection("purchases").doc(id);
    const existing = await tx.get(purchaseRef);
    if (existing.exists) {
      const purchase = docData<Purchase>(existing);
      if (purchase.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return purchase;
    }
    const refs = [...new Set(body.items.flatMap((item) => item.productId ? [item.productId] : []))].map(
      (productId) => db.collection("products").doc(productId),
    );
    const supplyRefs = [...new Set(body.items.flatMap((item) => item.supplyId ? [item.supplyId] : []))].map(
      (supplyId) => db.collection("supplies").doc(supplyId),
    );
    const [snapshots, supplySnapshots] = await Promise.all([
      Promise.all(refs.map((ref) => tx.get(ref))),
      Promise.all(supplyRefs.map((ref) => tx.get(ref))),
    ]);
    const [supplierSnapshot, saleSnapshot] = await Promise.all([
      body.supplierId
        ? tx.get(db.collection("suppliers").doc(body.supplierId))
        : undefined,
      body.sourceSaleId
        ? tx.get(db.collection("sales").doc(body.sourceSaleId))
        : undefined,
    ]);
    if (body.supplierId && !supplierSnapshot?.exists)
      throw createError({
        statusCode: 400,
        statusMessage: "El proveedor seleccionado ya no existe",
      });
    if (body.sourceSaleId && !saleSnapshot?.exists)
      throw createError({
        statusCode: 400,
        statusMessage: "La venta relacionada ya no existe",
      });
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const supplies = new Map(
      supplySnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [snapshot.id, inventoryItemOf(docData<Supply>(snapshot))]),
    );
    const items = body.items.map((item) => {
      const supply = item.supplyId ? supplies.get(item.supplyId) : undefined;
      if (item.supplyId && (!supply || !supply.active))
        throw createError({ statusCode: 400, statusMessage: "El insumo seleccionado no está disponible" });
      const product = item.productId ? products.get(item.productId) : undefined;
      const variant = product && item.variantId ? findVariant(product, item.variantId) : undefined;
      const total = item.quantity * item.unitCost - item.discount;
      if (total < 0)
        throw createError({
          statusCode: 400,
          statusMessage: "Un descuento supera el valor de la línea",
        });
      return {
        ...item,
        name: supply?.name ?? product!.name,
        size: supply
          ? (supply.category === "DECANT_CONTAINER" ? `${supply.capacityMl} ml` : supply.unit)
          : variant!.size,
        total,
      };
    });
    const number = await nextNumber(tx, "C", new Date(body.date));
    const at = nowIso();
    const { requestId: _requestId, ...input } = body;
    const purchase: Purchase = {
      id,
      number,
      ...input,
      supplierName: supplierSnapshot?.exists
        ? String(supplierSnapshot.data()?.name ?? body.supplierName)
        : body.supplierName,
      status: "draft",
      items,
      total: items.reduce((sum, item) => sum + item.total, 0) + body.freight,
      createdAt: at,
      updatedAt: at,
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.set(purchaseRef, firestoreData(purchase));
    return purchase;
  });
});
