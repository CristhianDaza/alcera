import type { Product } from "./types";

const GOOGLE_PRODUCT_CATEGORY =
  "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne";

function escapeXml(value: string | number): string {
  return String(value).replace(
    /[<>&\"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

function text(value: string, limit: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function field(name: string, value: string | number | undefined): string {
  return value === undefined || value === ""
    ? ""
    : `      <g:${name}>${escapeXml(value)}</g:${name}>`;
}

/** Crea un feed RSS 2.0 compatible con Google Merchant Center. */
export function googleMerchantFeed(products: Product[], siteUrl: string): string {
  const base = new URL(siteUrl).origin;
  const items = products.flatMap((product) => {
    const [mainImage, ...additionalImages] = product.images;
    if (!mainImage?.url) return [];

    const productUrl = `${base}/perfumes/${encodeURIComponent(product.slug)}`;
    const hasIdentifier = Boolean(product.gtin || product.mpn);
    const multipleVariants = product.variants.length > 1;

    return product.variants.map((variant) => {
      const title = text(`${product.name} ${variant.size}`, 150);
      return [
        "    <item>",
        `      <g:id>${escapeXml(`${product.id}-${variant.id}`)}</g:id>`,
        field("title", title),
        field("description", text(product.description, 5_000)),
        field("link", productUrl),
        field("image_link", mainImage.url),
        ...additionalImages.map((image) => field("additional_image_link", image.url)),
        field("availability", variant.available ? "in_stock" : "out_of_stock"),
        field("price", `${variant.price} COP`),
        field("condition", "new"),
        field("brand", product.brand),
        field("google_product_category", GOOGLE_PRODUCT_CATEGORY),
        field("size", variant.size),
        multipleVariants ? field("item_group_id", product.id) : "",
        product.gtin ? field("gtin", product.gtin) : "",
        product.mpn ? field("mpn", product.mpn) : "",
        !hasIdentifier ? field("identifier_exists", "no") : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    });
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    "  <channel>",
    "    <title>Alcéra Perfumes</title>",
    `    <link>${escapeXml(base)}</link>`,
    "    <description>Catálogo de Alcéra Perfumes</description>",
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
