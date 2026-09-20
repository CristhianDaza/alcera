import {
  purchaseCreateSchema,
  type Purchase,
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
    const refs = [...new Set(body.items.map((item) => item.productId))].map(
      (productId) => db.collection("products").doc(productId),
    );
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
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
    const items = body.items.map((item) => {
      const product = products.get(item.productId);
      const variant = findVariant(product, item.variantId);
      const total = item.quantity * item.unitCost - item.discount;
      if (total < 0)
        throw createError({
          statusCode: 400,
          statusMessage: "Un descuento supera el valor de la línea",
        });
      return { ...item, name: product!.name, size: variant.size, total };
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
