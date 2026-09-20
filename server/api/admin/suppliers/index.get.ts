import type { Supplier } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const snapshot = await database()
    .collection("suppliers")
    .orderBy("name")
    .limit(250)
    .get();
  return snapshot.docs.map((doc) => docData<Supplier>(doc));
});
