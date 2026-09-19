import {
  cashMovementCreateSchema,
  type CashMovement,
} from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, cashMovementCreateSchema);
  const db = database();
  const id = newId();
  return db.runTransaction(async (tx) => {
    const number = await nextNumber(tx, "M", new Date(body.date));
    const movement: CashMovement = {
      id,
      number,
      ...body,
      createdAt: nowIso(),
      createdBy: admin.uid,
    };
    tx.set(db.collection("cashMovements").doc(id), movement);
    return movement;
  });
});
