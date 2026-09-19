import type { CashMovement } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const snapshot = await database()
    .collection("cashMovements")
    .orderBy("date", "desc")
    .limit(500)
    .get();
  return snapshot.docs
    .map((doc) => docData<CashMovement>(doc))
    .filter((row) => !query.account || row.account === query.account)
    .filter((row) => !query.from || row.date >= `${query.from}T00:00:00.000Z`)
    .filter((row) => !query.to || row.date <= `${query.to}T23:59:59.999Z`);
});
