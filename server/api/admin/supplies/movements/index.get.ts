import type { SupplyMovement } from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const snapshot = await database()
    .collection("supplyMovements")
    .orderBy("occurredAt", "desc")
    .limit(200)
    .get();
  return snapshot.docs.map((doc) => docData<SupplyMovement>(doc));
});
