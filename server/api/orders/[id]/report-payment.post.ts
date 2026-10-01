import type { Order } from "../../../../shared/orders";

export default defineEventHandler(async (event) => {
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Los pagos están desactivados en modo demostración.",
    });
  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({
      statusCode: 400,
      statusMessage: "Referencia inválida.",
    });
  const db = database();
  const ref = db.collection("orders").doc(id);
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "No encontramos el pedido.",
      });
    const order = snapshot.data() as Order;
    if (order.paymentMethod !== "BREB")
      throw createError({
        statusCode: 409,
        statusMessage: "Este pedido no es un pago Bre-B.",
      });
    if (order.paymentStatus === "PAID")
      return { paymentStatus: "PAID" as const };
    if (order.paymentStatus === "PENDING_VERIFICATION")
      return { paymentStatus: "PENDING_VERIFICATION" as const };
    if (order.status !== "pending")
      throw createError({
        statusCode: 409,
        statusMessage: "El pedido ya no está esperando el pago.",
      });
    const now = new Date().toISOString();
    tx.update(ref, {
      status: "awaiting_payment",
      paymentStatus: "PENDING_VERIFICATION",
      paymentReportedAt: now,
      updatedAt: now,
      history: [
        ...(order.history ?? []),
        {
          status: "awaiting_payment",
          at: now,
          actor: "customer",
          note: "El cliente reportó el pago Bre-B; pendiente de verificación manual.",
        },
      ],
    });
    return { paymentStatus: "PENDING_VERIFICATION" as const };
  });
  return { ok: true, ...result };
});
