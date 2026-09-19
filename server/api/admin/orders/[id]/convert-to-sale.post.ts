import { z } from "zod";
import {
  saleChannels,
  saleTotals,
  type Sale,
} from "../../../../../shared/business";
import type { Order } from "../../../../../shared/orders";
import type { Product } from "../../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      channel: z.enum(saleChannels).default("website"),
      notes: z.string().trim().max(2000).optional(),
    }),
  );
  const orderId = getRouterParam(event, "id")!;
  const db = database();
  const saleId = newId();
  return db.runTransaction(async (tx) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnapshot = await tx.get(orderRef);
    if (!orderSnapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Pedido no encontrado",
      });
    const order = docData<Order>(orderSnapshot);
    if ((order as Order & { saleId?: string }).saleId)
      throw createError({
        statusCode: 409,
        statusMessage: "El pedido ya fue convertido en venta",
      });
    if (["cancelled", "lost"].includes(order.status))
      throw createError({
        statusCode: 409,
        statusMessage: "No se puede convertir un pedido cancelado o perdido",
      });
    const refs = [...new Set(order.items.map((item) => item.productId))].map(
      (id) => db.collection("products").doc(id),
    );
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const items = order.items.map((item) => {
      const product = products.get(item.productId);
      const variant = findVariant(product, item.variantId);
      return {
        productId: item.productId,
        variantId: item.variantId,
        sku: product?.sku,
        brand: product?.brand,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.price,
        unitCost: inventoryOf(variant).averageCost,
        discount: 0,
        lineTotal: item.quantity * item.price,
      };
    });
    const shippingCharged = order.shipping ?? 0;
    const totals = saleTotals(items, shippingCharged);
    const number = await nextNumber(tx, "V", new Date(order.createdAt));
    const at = nowIso();
    const requiresPurchase = order.items.some((item) => {
      const product = products.get(item.productId);
      return (
        inventoryOf(findVariant(product, item.variantId)).mode === "on_demand"
      );
    });
    const sale: Sale = {
      id: saleId,
      number,
      sourceOrderId: orderId,
      customer: order.customer,
      channel: body.channel,
      status: requiresPurchase ? "pending_purchase" : "pending_payment",
      items,
      ...totals,
      shippingCharged,
      paidTotal: 0,
      balanceDue: totals.total,
      createdAt: at,
      updatedAt: at,
      createdBy: admin.uid,
      notes: body.notes,
    };
    tx.set(db.collection("sales").doc(saleId), firestoreData(sale));
    tx.update(orderRef, { saleId, updatedAt: at });
    return sale;
  });
});
