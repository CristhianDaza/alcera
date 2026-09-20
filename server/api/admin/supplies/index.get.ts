import type { Supply } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const snapshot = await database()
    .collection("supplies")
    .orderBy("name")
    .get();
  return snapshot.docs.map((doc) => docData<Supply>(doc));
});
