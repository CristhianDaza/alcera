import {
  purchaseCreateSchema,
  type Purchase,
} from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, purchaseCreateSchema);
  const db = database();
  const id = newId();
  return db.runTransaction(async (tx) => {
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
    const purchase: Purchase = {
      id,
      number,
      ...body,
      supplierName: supplierSnapshot?.exists
        ? String(supplierSnapshot.data()?.name ?? body.supplierName)
        : body.supplierName,
      status: "draft",
      items,
      total: items.reduce((sum, item) => sum + item.total, 0) + body.freight,
      createdAt: at,
      updatedAt: at,
      createdBy: admin.uid,
    };
    tx.set(db.collection("purchases").doc(id), firestoreData(purchase));
    return purchase;
  });
});
