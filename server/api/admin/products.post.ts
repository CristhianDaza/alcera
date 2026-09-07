import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

type PendingUpload = { data: Buffer; filename?: string; type?: string };

function uploadImage(file: PendingUpload) {
  return new Promise<{ publicId: string; url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "esencia", resource_type: "image" },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("No se pudo subir la imagen."));
        resolve({
          publicId: result.public_id,
          url: result.secure_url.replace(
            "/upload/",
            "/upload/f_auto,q_auto,w_1200/",
          ),
        });
      },
    );
    stream.end(file.data);
  });
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para guardar",
    });

  const form = await readMultipartFormData(event);
  const productPart = form?.find((part) => part.name === "product");
  let body: Record<string, unknown>;
  try {
    body = productPart
      ? JSON.parse(productPart.data.toString())
      : await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Datos del producto inválidos",
    });
  }
  const files = (form?.filter((part) => part.name === "images") ??
    []) as PendingUpload[];
  const pending = Array.isArray(body.images)
    ? body.images.filter((image) => {
        const value = image as { publicId?: unknown; url?: unknown };
        return value.publicId === "" && value.url === "";
      })
    : [];
  if (
    files.length !== pending.length ||
    files.some(
      (file) =>
        !file.data.length ||
        file.data.length > 10 * 1024 * 1024 ||
        (file.type &&
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)),
    )
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Revisa las imágenes seleccionadas",
    });

  const config = useRuntimeConfig(),
    cloud = config.cloudinaryCloudName;
  if (!cloud || !config.cloudinaryApiKey || !config.cloudinaryApiSecret)
    throw createError({
      statusCode: 503,
      statusMessage: "Cloudinary no está configurado",
    });
  cloudinary.config({
    cloud_name: cloud,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });
  const validationBody = {
    ...body,
    images: Array.isArray(body.images)
      ? body.images.map((image, index) => {
          const value = image as { publicId?: unknown; url?: unknown };
          return value.publicId === "" && value.url === ""
            ? {
                ...value,
                publicId: `esencia/pending-${index}`,
                url: `https://res.cloudinary.com/${cloud}/image/upload/esencia/pending-${index}.jpg`,
              }
            : value;
        })
      : body.images,
  };
  const parsed = productSchema.safeParse(validationBody);
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: "Revisa los campos del producto",
      data: parsed.error.flatten(),
    });
  if (
    parsed.data.images.some(
      (image) =>
        !image.url.startsWith(
          `https://res.cloudinary.com/${cloud}/image/upload/`,
        ) || !image.publicId.startsWith("esencia/"),
    )
  )
    throw createError({
      statusCode: 400,
      statusMessage:
        "Las imágenes deben pertenecer a la carpeta de la tienda en Cloudinary",
    });

  const uploaded: string[] = [];
  try {
    let fileIndex = 0;
    parsed.data.images = await Promise.all(
      parsed.data.images.map(async (image) => {
        if (!image.publicId.startsWith("esencia/pending-")) return image;
        const result = await uploadImage(files[fileIndex++]!);
        uploaded.push(result.publicId);
        return { ...image, ...result };
      }),
    );
    const id: string =
      typeof body.id === "string" && /^[a-zA-Z0-9-]{1,120}$/.test(body.id)
        ? body.id
        : randomUUID();
    const db = database(),
      ref = db.collection("products").doc(id),
      slugRef = db.collection("slugs").doc(parsed.data.slug);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref),
        owner = await tx.get(slugRef);
      if (owner.exists && owner.data()?.productId !== id)
        throw createError({
          statusCode: 409,
          statusMessage: "Ese enlace ya pertenece a otro perfume",
        });
      const previous = existing.data()?.slug;
      if (previous && previous !== parsed.data.slug)
        tx.delete(db.collection("slugs").doc(previous));
      tx.set(slugRef, { productId: id });
      tx.set(ref, parsed.data);
    });
    return { id, ...parsed.data };
  } catch (error) {
    await Promise.allSettled(
      uploaded.map((publicId) => cloudinary.uploader.destroy(publicId)),
    );
    throw error;
  }
});
