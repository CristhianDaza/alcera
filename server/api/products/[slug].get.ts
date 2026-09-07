export default defineEventHandler(async (event) => {
  const product = await productBySlug(getRouterParam(event, "slug") || "");
  if (!product)
    throw createError({
      statusCode: 404,
      statusMessage: "Perfume no encontrado",
    });
  return product;
});
