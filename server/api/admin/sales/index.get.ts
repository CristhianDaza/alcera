import type { Sale } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const db = database();
  let request = db.collection("sales").orderBy("createdAt", "desc").limit(50);
  if (query.cursor) {
    if (
      typeof query.cursor !== "string" ||
      !/^[a-zA-Z0-9-]{1,120}$/.test(query.cursor)
    )
      throw createError({ statusCode: 400, statusMessage: "Cursor inválido" });
    const cursor = await db.collection("sales").doc(query.cursor).get();
    if (!cursor.exists)
      throw createError({ statusCode: 400, statusMessage: "Cursor inválido" });
    request = request.startAfter(cursor);
  }
  const snapshot = await request.get();
  const term = String(query.query ?? "").toLocaleLowerCase("es");
  return snapshot.docs
    .map((doc) => docData<Sale>(doc))
    .filter(
      (sale) => !query.from || sale.createdAt >= `${query.from}T00:00:00.000Z`,
    )
    .filter(
      (sale) => !query.to || sale.createdAt <= `${query.to}T23:59:59.999Z`,
    )
    .filter((sale) => !query.status || sale.status === query.status)
    .filter((sale) => !query.channel || sale.channel === query.channel)
    .filter(
      (sale) =>
        !term ||
        `${sale.number} ${sale.customer?.name ?? ""}`
          .toLocaleLowerCase("es")
          .includes(term),
    );
});
