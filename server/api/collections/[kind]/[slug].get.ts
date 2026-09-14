import { seoLanding } from "#shared/seo-landings";
import { catalogPage } from "#shared/seo";

export default defineEventHandler(async (event) => {
  const landing = seoLanding(
    getRouterParam(event, "kind"),
    getRouterParam(event, "slug"),
  );
  if (!landing)
    throw createError({
      statusCode: 404,
      statusMessage: "Colección no encontrada",
    });

  const page = catalogPage(getQuery(event).page);
  if (!page)
    throw createError({
      statusCode: 404,
      statusMessage: "Página no encontrada",
    });

  const matches = (await products())
    .filter((product) =>
      landing.kind === "categorias"
        ? product.category === landing.filterValue
        : landing.kind === "familias"
          ? product.family?.includes(landing.filterValue)
          : landing.kind === "colecciones"
            ? landing.filterValues?.some(
                (brand) =>
                  product.brand.localeCompare(brand, "es", {
                    sensitivity: "base",
                  }) === 0,
              )
            : product.brand.localeCompare(landing.filterValue, "es", {
                sensitivity: "base",
              }) === 0,
    )
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  if (page > totalPages)
    throw createError({
      statusCode: 404,
      statusMessage: "Página no encontrada",
    });
  const start = (page - 1) * pageSize;
  return {
    products: matches.slice(start, start + pageSize),
    page,
    pageSize,
    total: matches.length,
    totalPages,
  };
});
