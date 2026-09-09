import { v2 as cloudinary } from "cloudinary";
import type { Product } from "#shared/types";
import {
  clearPersistentCatalogSnapshots,
  removeFromCatalogSnapshots,
} from "../../../utils/catalog";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para eliminar",
    });

  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({ statusCode: 400, statusMessage: "Perfume inválido." });

  const db = database(),
    ref = db.collection("products").doc(id);
  const product = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "No encontramos el perfume.",
      });
    const value = snapshot.data() as Product;
    const slugRef = db.collection("slugs").doc(value.slug);
    const slug = await tx.get(slugRef);
    tx.delete(ref);
    if (slug.exists && slug.data()?.productId === id) tx.delete(slugRef);
    return value;
  });

  const config = useRuntimeConfig();
  if (
    config.cloudinaryCloudName &&
    config.cloudinaryApiKey &&
    config.cloudinaryApiSecret
  ) {
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
    });
    await Promise.allSettled(
      product.images.map((image) =>
        cloudinary.uploader.destroy(image.publicId),
      ),
    );
  }
  try {
    await removeFromCatalogSnapshots(id);
  } catch (snapshotError) {
    console.error("Could not update catalog snapshots", snapshotError);
    await clearPersistentCatalogSnapshots().catch((clearError) =>
      console.error("Could not clear catalog snapshots", clearError),
    );
  }
  return { id };
});
