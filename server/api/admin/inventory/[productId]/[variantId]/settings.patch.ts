import { inventorySettingsSchema } from "../../../../../../shared/business";
import type { Product } from "../../../../../../shared/types";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readValidated(event, inventorySettingsSchema);
  const productId = getRouterParam(event, "productId")!;
  const variantId = getRouterParam(event, "variantId")!;
  const db = database();
  const ref = db.collection("products").doc(productId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Perfume no encontrado",
      });
    const product = { id: snapshot.id, ...snapshot.data() } as Product;
    const variant = findVariant(product, variantId);
    const current = inventoryOf(variant);
    tx.update(ref, {
      variants: replaceVariant(product, variantId, {
        ...variant,
        inventory: { ...current, ...body, updatedAt: nowIso() },
      }).variants,
    });
  });
  return { ok: true };
});
