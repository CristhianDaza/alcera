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
  const id = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(id);
    const existing = await tx.get(saleRef);
    if (existing.exists) {
      const sale = docData<Sale>(existing);
      if (sale.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return sale;
    }
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
    const { requestId: _requestId, ...input } = body;
    const sale: Sale = {
      id,
      number,
      customer: input.customer,
      channel: input.channel,
      status:
        input.status === "draft"
          ? "draft"
          : requiresPurchase
            ? "pending_purchase"
            : input.status,
      items,
      ...totals,
      shippingCharged: input.shippingCharged,
      paidTotal: 0,
      balanceDue: totals.total,
      createdAt: input.occurredAt,
      updatedAt: at,
      createdBy: admin.uid,
      notes: input.notes,
      requestFingerprint: fingerprint,
    };
    tx.set(saleRef, firestoreData(sale));
    return sale;
  });
});
