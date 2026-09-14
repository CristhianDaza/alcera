// Read-only HTTP audit. Usage: node --use-system-ca scripts/seo-audit.mjs [origin] [output]
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
const origin = process.argv[2] || "http://127.0.0.1:3000";
const output = process.argv[3] || "test-results/seo-http.json";
const get = async (path) => {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  const html = await response.text();
  return {
    path,
    status: response.status,
    location: response.headers.get("location"),
    robotsHeader: response.headers.get("x-robots-tag"),
    bytes: Buffer.byteLength(html),
    html,
  };
};
const catalogResponse = await get("/api/products");
if (catalogResponse.status !== 200)
  throw new Error(`Catalog returned ${catalogResponse.status}`);
const products = JSON.parse(catalogResponse.html);
const paths = [
  "/",
  "/perfumes",
  "/guia-de-perfumes",
  "/robots.txt",
  "/sitemap.xml",
  "/carrito",
  "/admin",
  "/catalogo?page=2",
  "/no-existe-auditoria-seo",
  "/perfumes/no-existe-auditoria-seo",
  "/perfumes?page=999999",
  "/perfumes?page=2abc",
  "/perfumes?page=2&page=3",
  "/perfumes?q=sin-resultados-auditoria",
  "/perfumes?category=Mujer",
  "/perfumes/?page=2",
  ...Array.from(
    { length: Math.ceil(products.length / 12) - 1 },
    (_, i) => `/perfumes?page=${i + 2}`,
  ),
  ...products.map((p) => `/perfumes/${p.slug}`),
];
const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < paths.length) {
      const path = paths[next++];
      try {
        const { html, ...result } = await get(path);
        const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(
          (m) => m[0],
        );
        const attr = (tag, key) =>
          tag.match(new RegExp(`\\b${key}="([^"]*)"`, "i"))?.[1];
        const meta = (key) =>
          tags
            .filter(
              (tag) =>
                attr(tag, "name") === key || attr(tag, "property") === key,
            )
            .map((tag) => attr(tag, "content"));
        const schemas = [
          ...html.matchAll(
            /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ].map((m) => JSON.parse(m[1]));
        const entities = schemas.flatMap((s) => s["@graph"] || [s]);
        const product = products.find((p) => path === `/perfumes/${p.slug}`);
        const schema = entities.find((e) => e["@type"] === "Product");
        const schemaMatchesCatalog = !product
          ? undefined
          : Boolean(
              schema &&
              schema.name === product.name &&
              schema.description === product.description &&
              schema.brand?.name === product.brand &&
              JSON.stringify(schema.image) ===
                JSON.stringify(product.images.map((i) => i.url)) &&
              Array.isArray(schema.offers) &&
              schema.offers.length === product.variants.length &&
              schema.offers.every(
                (offer, i) =>
                  offer.price === product.variants[i].price &&
                  offer.priceCurrency === "COP" &&
                  offer.availability ===
                    `https://schema.org/${product.variants[i].available ? "InStock" : "OutOfStock"}`,
              ),
            );
        results.push({
          ...result,
          schemaMatchesCatalog,
          title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1],
          description: meta("description"),
          robots: meta("robots"),
          canonical: tags
            .filter((t) => attr(t, "rel") === "canonical")
            .map((t) => attr(t, "href")),
          ogImage: meta("og:image"),
          h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
            m[1].replace(/<[^>]+>/g, ""),
          ),
          productCount: entities.filter((e) => e["@type"] === "Product").length,
          schemaTypes: entities.map((e) => e["@type"]),
          productLinks: [
            ...new Set(
              [...html.matchAll(/href="(\/perfumes\/[^"?#]+)"/g)].map(
                (m) => m[1],
              ),
            ),
          ],
          imagesWithoutAlt: [...html.matchAll(/<img\b[^>]*>/g)].filter(
            (m) => !/\balt=/.test(m[0]),
          ).length,
          ...(path === "/robots.txt" || path === "/sitemap.xml"
            ? { content: html }
            : {}),
        });
      } catch (error) {
        results.push({ path, error: String(error) });
      }
    }
  }),
);
const duplicate = (values) =>
  [...new Set(values)].filter((v) => values.filter((x) => x === v).length > 1);
const summary = {
  origin,
  date: new Date().toISOString(),
  products: products.length,
  urlsChecked: results.length,
  errors: results.filter((r) => r.error),
  duplicateSlugs: duplicate(products.map((p) => p.slug)),
  duplicateDescriptions: duplicate(
    products.map((p) => p.description.trim().toLowerCase()),
  ).length,
  templateDescriptions: products.filter((p) =>
    p.description.includes("combina ingredientes cuidadosamente seleccionados"),
  ).length,
  shortDescriptionsUnder40Words: products.filter(
    (p) => p.description.split(/\s+/).length < 40,
  ).length,
  multiVariant: products.filter((p) => p.variants.length > 1).length,
  missing: Object.fromEntries(
    [
      "brand",
      "description",
      "gtin",
      "mpn",
      "sku",
      "aromaDescription",
      "concentration",
    ].map((key) => [key, products.filter((p) => !p[key]).length]),
  ),
  brands: [...new Set(products.map((p) => p.brand))],
  results,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify({
    output,
    products: products.length,
    urls: results.length,
    errors: summary.errors,
    templateDescriptions: summary.templateDescriptions,
  }),
);
