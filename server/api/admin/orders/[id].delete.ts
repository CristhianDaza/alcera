export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para eliminar",
    });

  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({ statusCode: 400, statusMessage: "Pedido inválido." });

  const ref = database().collection("orders").doc(id);
  const order = await ref.get();
  if (!order.exists)
    throw createError({
      statusCode: 404,
      statusMessage: "No encontramos el pedido.",
    });
  await ref.delete();
  return { id };
});
