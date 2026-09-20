import type { DecantSource } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const productId = getQuery(event).productId;
  const snapshot = await database()
    .collection("decantSources")
    .orderBy("openedAt", "desc")
    .limit(250)
    .get();
  return snapshot.docs
    .map((doc) => docData<DecantSource>(doc))
    .filter((source) => !productId || source.productId === productId);
});
