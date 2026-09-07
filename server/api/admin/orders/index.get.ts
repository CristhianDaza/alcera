import type { Order } from "../../../../shared/orders";
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  if (isDemo()) return { orders: [], nextCursor: null };
  const cursor = getQuery(event).cursor;
  const db = database();
  let query = db.collection("orders").orderBy("createdAt", "desc").limit(26);
  if (cursor !== undefined) {
    if (typeof cursor !== "string" || !/^[a-zA-Z0-9-]{1,120}$/.test(cursor))
      throw createError({ statusCode: 400, statusMessage: "Página inválida." });
    const snapshot = await db.collection("orders").doc(cursor).get();
    if (!snapshot.exists)
      throw createError({
        statusCode: 400,
        statusMessage: "Actualiza el listado de pedidos.",
      });
    query = query.startAfter(snapshot);
  }
  const result = await query.get();
  const orders = result.docs.slice(0, 25).map((doc) => {
    const value = doc.data() as Order;
    return {
      id: doc.id,
      customer: value.customer,
      items: value.items,
      subtotal: value.subtotal,
      shipping: value.shipping,
      status: value.status,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      tracking: value.tracking,
      history: value.history,
    };
  });
  return {
    orders,
    nextCursor: result.docs.length > 25 ? orders.at(-1)!.id : null,
  };
});
