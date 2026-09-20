import { z } from "zod";
import {
  type DecantSource,
  type InventoryMovement,
} from "../../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      requestId: z.uuid(),
      quantityChange: z
        .number()
        .int()
        .refine((value) => value !== 0),
      type: z.enum(["sample", "damage_loss", "adjustment"]),
      reason: z.string().trim().min(3).max(500),
    }),
  );
  const id = getRouterParam(event, "id")!;
  const db = database();
  const fingerprint = requestFingerprint({ sourceId: id, ...body });
  return db.runTransaction(async (tx) => {
    const ref = db.collection("decantSources").doc(id);
    const movementRef = db.collection("inventoryMovements").doc(body.requestId);
    const [snapshot, existingMovement] = await Promise.all([
      tx.get(ref),
      tx.get(movementRef),
    ]);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Frasco abierto no encontrado",
      });
    const source = docData<DecantSource>(snapshot);
    if (existingMovement.exists) {
      const movement = docData<InventoryMovement>(existingMovement);
      if (
        movement.sourceId !== id ||
        movement.requestFingerprint !== fingerprint
      )
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya pertenece a otro frasco",
        });
      return source;
    }
    const after = source.remainingMl + body.quantityChange;
    if (after < 0 || after > source.initialMl)
      throw createError({
        statusCode: 409,
        statusMessage: "El ajuste deja una cantidad de mililitros inválida",
      });
    if (
      ["sample", "damage_loss"].includes(body.type) &&
      body.quantityChange > 0
    )
      throw createError({
        statusCode: 400,
        statusMessage: "Muestras y pérdidas deben restar mililitros",
      });
    const at = nowIso();
    const movement: InventoryMovement = {
      id: body.requestId,
      productId: source.productId,
      variantId: source.variantId,
      type: body.type,
      quantityChange: body.quantityChange,
      quantityUnit: "ml",
      sourceId: id,
      unitCost: source.costPerMl,
      stockBefore: source.remainingMl,
      stockAfter: after,
      referenceType: "manual",
      referenceId: id,
      reason: body.reason,
      occurredAt: at,
      createdAt: at,
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.update(ref, {
      remainingMl: after,
      status: after === 0 ? "empty" : "open",
      updatedAt: at,
    });
    tx.set(movementRef, movement);
    return {
      ...source,
      remainingMl: after,
      status: after === 0 ? "empty" : "open",
      updatedAt: at,
    };
  });
});
