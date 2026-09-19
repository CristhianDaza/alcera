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
  return db.runTransaction(async (tx) => {
    const ref = db.collection("decantSources").doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Frasco abierto no encontrado",
      });
    const source = docData<DecantSource>(snapshot);
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
      id: newId(),
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
    };
    tx.update(ref, {
      remainingMl: after,
      status: after === 0 ? "empty" : "open",
      updatedAt: at,
    });
    tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
    return {
      ...source,
      remainingMl: after,
      status: after === 0 ? "empty" : "open",
      updatedAt: at,
    };
  });
});
