import type { Expense } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const snapshot = await database()
    .collection("expenses")
    .orderBy("date", "desc")
    .limit(250)
    .get();
  return snapshot.docs
    .map((doc) => docData<Expense>(doc))
    .filter((row) => !query.from || row.date >= `${query.from}T00:00:00.000Z`)
    .filter((row) => !query.to || row.date <= `${query.to}T23:59:59.999Z`)
    .filter((row) => !query.category || row.category === query.category)
    .filter((row) => !query.status || row.status === query.status);
});
