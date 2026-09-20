import {
  cashMovementCreateSchema,
  type CashMovement,
} from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, cashMovementCreateSchema);
  const db = database();
  const id = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const movementRef = db.collection("cashMovements").doc(id);
    const existing = await tx.get(movementRef);
    if (existing.exists) {
      const movement = docData<CashMovement>(existing);
      if (movement.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return movement;
    }
    const number = await nextNumber(tx, "M", new Date(body.date));
    const { requestId: _requestId, ...input } = body;
    const movement: CashMovement = {
      id,
      number,
      ...input,
      createdAt: nowIso(),
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.set(movementRef, movement);
    return movement;
  });
});
