import type { InventoryMovement } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const snapshot = await database()
    .collection("inventoryMovements")
    .orderBy("occurredAt", "desc")
    .limit(250)
    .get();
  return snapshot.docs
    .map((doc) => docData<InventoryMovement>(doc))
    .filter((row) => !query.variantId || row.variantId === query.variantId)
    .filter(
      (row) => !query.from || row.occurredAt >= `${query.from}T00:00:00.000Z`,
    )
    .filter(
      (row) => !query.to || row.occurredAt <= `${query.to}T23:59:59.999Z`,
    );
});
