import type { Order } from "../../../../../shared/orders";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para guardar.",
    });
  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({
      statusCode: 400,
      statusMessage: "Referencia inválida.",
    });
  const db = database();
  const ref = db.collection("orders").doc(id);
  await db.runTransaction(async (tx) => {
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
    if (order.paymentStatus === "PAID") return;
    if (
      order.paymentStatus !== "PENDING_VERIFICATION" ||
      order.status !== "awaiting_payment"
    )
      throw createError({
        statusCode: 409,
        statusMessage:
          "El pedido no tiene un pago reportado pendiente de verificar.",
      });
    const now = new Date().toISOString();
    tx.update(ref, {
      status: "paid",
      paymentStatus: "PAID",
      paymentVerifiedAt: now,
      paymentVerifiedBy: admin.uid,
      updatedAt: now,
      history: [
        ...(order.history ?? []),
        {
          status: "paid",
          at: now,
          actor: admin.uid,
          note: "Pago Bre-B verificado por administración.",
        },
      ],
    });
  });
  return { ok: true };
});
