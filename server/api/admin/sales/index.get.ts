import type { Sale } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const snapshot = await database()
    .collection("sales")
    .orderBy("createdAt", "desc")
    .limit(250)
    .get();
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
