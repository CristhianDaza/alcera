import {
  applyOrderUpdate,
  orderUpdateSchema,
  type Order,
} from "../../../../shared/orders";
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
  const parsed = orderUpdateSchema.safeParse(await readBody(event));
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: "Revisa los datos del cambio de estado.",
    });
  const db = database(),
    ref = db.collection("orders").doc(id);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "No encontramos el pedido.",
      });
    let updated;
    try {
      updated = applyOrderUpdate(
        snapshot.data() as Order,
        parsed.data,
        admin.uid,
        new Date().toISOString(),
      );
    } catch (error) {
      throw createError({
        statusCode: 409,
        statusMessage: (error as Error).message,
      });
    }
    tx.update(ref, {
      status: updated.status,
      shipping: updated.shipping,
      tracking: updated.tracking,
      updatedAt: updated.updatedAt,
      history: updated.history,
    });
  });
  return { ok: true };
});
