import {
  decantSourceCreateSchema,
  type DecantSource,
  type InventoryMovement,
} from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

function milliliters(size: string) {
  const match = size.match(/(\d+(?:[.,]\d+)?)\s*ml/i);
  return match ? Math.floor(Number(match[1]!.replace(",", "."))) : 0;
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, decantSourceCreateSchema);
  const db = database();
  const sourceId = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const productRef = db.collection("products").doc(body.productId);
    const sourceRef = db.collection("decantSources").doc(sourceId);
    const [snapshot, existingSource] = await Promise.all([
      tx.get(productRef),
      tx.get(sourceRef),
    ]);
    if (existingSource.exists) {
      const source = docData<DecantSource>(existingSource);
      if (source.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return source;
    }
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Perfume no encontrado",
      });
    const product = { id: snapshot.id, ...snapshot.data() } as Product;
    const variant = findVariant(product, body.variantId);
    if (variant.type === "decant")
      throw createError({
        statusCode: 400,
        statusMessage: "Selecciona un frasco, no un decant",
      });
    const inventory = inventoryOf(variant);
    if (inventory.stock < 1)
      throw createError({
        statusCode: 409,
        statusMessage: "No hay un frasco disponible para abrir",
      });
    const initialMl = body.usableMl ?? milliliters(variant.size);
    if (!initialMl)
      throw createError({
        statusCode: 400,
        statusMessage: "Indica los mililitros utilizables del frasco",
      });
    const at = nowIso();
    const nextInventory = {
      ...inventory,
      stock: inventory.stock - 1,
      updatedAt: at,
    };
    const source: DecantSource = {
      id: sourceId,
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      size: variant.size,
      initialMl,
      remainingMl: initialMl,
      costPerMl: Math.round(inventory.averageCost / initialMl),
      openedAt: at,
      status: "open",
      notes: body.notes,
      createdBy: admin.uid,
      updatedAt: at,
      requestFingerprint: fingerprint,
    };
    const movement: InventoryMovement = {
      id: newId(),
      productId: product.id,
      variantId: variant.id,
      type: "adjustment",
      quantityChange: -1,
      unitCost: inventory.averageCost,
      stockBefore: inventory.stock,
      stockAfter: nextInventory.stock,
      referenceType: "manual",
      referenceId: sourceId,
      reason: `Frasco abierto para decants (${initialMl} ml)`,
      occurredAt: at,
      createdAt: at,
      createdBy: admin.uid,
    };
    tx.update(productRef, {
      variants: replaceVariant(product, variant.id, {
        ...variant,
        inventory: nextInventory,
      }).variants,
    });
    tx.set(sourceRef, firestoreData(source));
    tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
    return source;
  });
});
