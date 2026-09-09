import { selectRelatedProducts } from "../../../../shared/catalog";
import { catalogDiagnostic, products } from "../../../utils/catalog";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") || "";
  const catalog = await products();
  const product = catalog.find((item) => item.slug === slug);
  if (!product)
    throw createError({
      statusCode: 404,
      statusMessage: "Perfume no encontrado",
    });
  catalogDiagnostic("PRODUCT_SNAPSHOT_HIT", { found: true, slug });
  return { product, related: selectRelatedProducts(catalog, product) };
});
