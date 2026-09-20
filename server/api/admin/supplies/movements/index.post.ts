import {
  supplyMovementCreateSchema,
  type Supply,
  type SupplyMovement,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, supplyMovementCreateSchema);
  if (
    ["damage_loss", "supplier_return", "sample"].includes(body.type) &&
    body.quantityChange > 0
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Ese movimiento debe restar existencias",
    });
  const db = database();
  return db.runTransaction(async (tx) => {
    const supplyRef = db.collection("supplies").doc(body.supplyId);
    const movementRef = db.collection("supplyMovements").doc(body.requestId);
    const [snapshot, existing] = await Promise.all([
      tx.get(supplyRef),
      tx.get(movementRef),
    ]);
    if (existing.exists) return docData<SupplyMovement>(existing);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Insumo no encontrado",
      });
    const supply = docData<Supply>(snapshot);
    const after = safeInteger(
      supply.stock + body.quantityChange,
      "El saldo de insumos supera el límite numérico seguro",
    );
    if (after < 0)
      throw createError({
        statusCode: 409,
        statusMessage: `No hay existencias suficientes de ${supply.name}`,
      });
    const at = nowIso();
    const movement: SupplyMovement = {
      id: movementRef.id,
      supplyId: supply.id,
      type: body.type,
      quantityChange: body.quantityChange,
      unitCost: body.unitCost,
      stockBefore: supply.stock,
      stockAfter: after,
      referenceType: "manual",
      reason: `${body.reference}: ${body.reason}`,
      occurredAt: body.occurredAt,
      createdAt: at,
      createdBy: admin.uid,
    };
    tx.update(supplyRef, {
      stock: after,
      averageCost: body.unitCost ?? supply.averageCost,
      updatedAt: at,
    });
    tx.set(movementRef, movement);
    return movement;
  });
});
