import {
  movementCreateSchema,
  type InventoryMovement,
} from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, movementCreateSchema);
  if (
    ["damage_loss", "supplier_return", "sample"].includes(body.type) &&
    body.quantityChange > 0
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Ese movimiento debe restar existencias",
    });
  if (body.type === "customer_return" && body.quantityChange < 0)
    throw createError({
      statusCode: 400,
      statusMessage: "Una devolución de cliente debe sumar existencias",
    });
  const db = database();
  const id = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const productRef = db.collection("products").doc(body.productId);
    const movementRef = db.collection("inventoryMovements").doc(id);
    const [snapshot, existingMovement] = await Promise.all([
      tx.get(productRef),
      tx.get(movementRef),
    ]);
    if (existingMovement.exists) {
      const movement = docData<InventoryMovement>(existingMovement);
      if (
        movement.productId !== body.productId ||
        movement.variantId !== body.variantId ||
        movement.requestFingerprint !== fingerprint
      )
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya pertenece a otro movimiento",
        });
      return movement;
    }
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Perfume no encontrado",
      });
    const product = { id: snapshot.id, ...snapshot.data() } as Product;
    const variant = findVariant(product, body.variantId);
    const current = inventoryOf(variant);
    if (variant.type === "decant" || current.mode === "decant")
      throw createError({
        statusCode: 409,
        statusMessage:
          "Los decants se controlan desde un frasco abierto y no mediante unidades manuales",
      });
    const after = safeInteger(
      current.stock + body.quantityChange,
      "El saldo de inventario supera el límite numérico seguro",
    );
    if (after < 0)
      throw createError({
        statusCode: 409,
        statusMessage: "El movimiento dejaría inventario negativo",
      });
    const at = nowIso();
    const { requestId: _requestId, ...input } = body;
    const movement: InventoryMovement = {
      id,
      ...input,
      stockBefore: current.stock,
      stockAfter: after,
      referenceType: "manual",
      createdAt: at,
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.update(productRef, {
      variants: replaceVariant(product, variant.id, {
        ...variant,
        inventory: {
          ...current,
          stock: after,
          averageCost: body.unitCost ?? current.averageCost,
          updatedAt: at,
        },
      }).variants,
    });
    tx.set(movementRef, movement);
    return movement;
  });
});
