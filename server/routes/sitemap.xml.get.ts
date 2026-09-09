import { canIndex, siteBase } from "../../shared/seo";
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(
    event,
    "cache-control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );
  const config = useRuntimeConfig().public;
  const base = siteBase(config.siteUrl);
  const paths = canIndex(config)
    ? [
        "/",
        "/catalogo",
        ...(await products())
          .filter((p) => p.status === "published")
          .map((p) => `/perfumes/${p.slug}`),
      ]
    : [];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${xml(base + path)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
});
