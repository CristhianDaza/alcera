import {
  saleCreateSchema,
  saleTotals,
  type Sale,
} from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, saleCreateSchema);
  const db = database();
  const id = newId();
  return db.runTransaction(async (tx) => {
    const refs = [...new Set(body.items.map((item) => item.productId))].map(
      (productId) => db.collection("products").doc(productId),
    );
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = snapshots.map(
      (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Product,
    );
    const number = await nextNumber(tx, "V", new Date(body.occurredAt));
    const items = body.items.map((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      const variant = findVariant(product, item.variantId);
      const inventory = inventoryOf(variant);
      return {
        ...item,
        sku: product?.sku,
        brand: product?.brand,
        name: product!.name,
        size: variant.size,
        unitCost: inventory.averageCost,
        lineTotal: item.quantity * item.unitPrice - item.discount,
      };
    });
    const totals = saleTotals(items, body.shippingCharged);
    if (totals.total < 0)
      throw createError({
        statusCode: 400,
        statusMessage: "Los descuentos superan el valor de la venta",
      });
    const at = nowIso();
    const requiresPurchase = body.items.some((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      return (
        inventoryOf(findVariant(product, item.variantId)).mode === "on_demand"
      );
    });
    const sale: Sale = {
      id,
      number,
      customer: body.customer,
      channel: body.channel,
      status:
        body.status === "draft"
          ? "draft"
          : requiresPurchase
            ? "pending_purchase"
            : body.status,
      items,
      ...totals,
      shippingCharged: body.shippingCharged,
      paidTotal: 0,
      balanceDue: totals.total,
      createdAt: body.occurredAt,
      updatedAt: at,
      createdBy: admin.uid,
      notes: body.notes,
    };
    tx.set(db.collection("sales").doc(id), firestoreData(sale));
    return sale;
  });
});
