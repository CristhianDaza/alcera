import type { Product } from "#shared/types";
import { productBySlug, products } from "../../../utils/catalog";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") || "";
  const product = await productBySlug(slug);
  if (!product)
    throw createError({
      statusCode: 404,
      statusMessage: "Perfume no encontrado",
    });

  const score = (item: Product) =>
    Number(item.featured) +
    (item.category === product.category ? 4 : 0) +
    (product.family && item.family === product.family ? 2 : 0);

  return (await products())
    .filter((item) => item.id !== product.id)
    .sort((left, right) => score(right) - score(left))
    .slice(0, 4);
});
