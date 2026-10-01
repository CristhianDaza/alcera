import type { Order } from "../../../shared/orders";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({
      statusCode: 400,
      statusMessage: "Referencia inválida.",
    });
  const snapshot = await database().collection("orders").doc(id).get();
  if (!snapshot.exists)
    throw createError({
      statusCode: 404,
      statusMessage: "No encontramos el pedido.",
    });
  const order = snapshot.data() as Order;
  if (order.paymentMethod !== "BREB")
    throw createError({
      statusCode: 404,
      statusMessage: "No encontramos el pedido.",
    });
  return {
    id: snapshot.id,
    reference: order.reference ?? snapshot.id,
    amountToPay: order.amountToPay ?? order.subtotal,
    status: order.status,
    paymentStatus: order.paymentStatus ?? "PENDING",
    paymentReportedAt: order.paymentReportedAt ?? null,
  };
});
