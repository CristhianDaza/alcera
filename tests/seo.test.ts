import { describe, it, expect } from "vitest";
import {
  canIndex,
  canonicalUrl,
  metaDescription,
  serializeSchema,
  siteBase,
} from "../shared/seo";
import { productSchema } from "../server/utils/validation";
describe("Indexación y URLs públicas", () => {
  const live = {
    siteUrl: "https://alceraperfumes.com",
    demo: false,
    indexable: true,
  };
  it("solo permite producción activada con datos reales", () => {
    expect(canIndex(live)).toBe(true);
    for (const config of [
      { ...live, demo: true },
      { ...live, indexable: false },
      { ...live, siteUrl: "http://localhost:3000" },
      { ...live, siteUrl: "http://127.0.0.1:3000" },
    ])
      expect(canIndex(config)).toBe(false);
  });
  it("normaliza URLs y elimina parámetros de filtros", () => {
    expect(canonicalUrl(live.siteUrl, "/perfumes/?q=rosa#top")).toBe(
      "https://alceraperfumes.com/perfumes",
    );
    expect(canonicalUrl(live.siteUrl, "/")).toBe("https://alceraperfumes.com/");
    expect(canonicalUrl(live.siteUrl, "perfumes/")).toBe(
      "https://alceraperfumes.com/perfumes",
    );
    expect(() => siteBase("https://alceraperfumes.com/perfumes")).toThrow();
  });
  it("produce descripciones sociales compactas y legibles", () => {
    const description = `  ${"fragancia ".repeat(30)} especial  `;
    expect(metaDescription(description)).toMatch(/…$/);
    expect(metaDescription(description).length).toBeLessThanOrEqual(160);
    expect(metaDescription("  Aroma   floral. ")).toBe("Aroma floral.");
  });
  it("serializa contenido sin permitir cerrar el script JSON-LD", () => {
    const content = { name: "</script><script>alert(1)</script>" };
    expect(serializeSchema(content)).not.toContain("<");
    expect(JSON.parse(serializeSchema(content))).toEqual(content);
  });
  it("acepta solo identificadores comerciales y GTIN con checksum válido", () => {
    const product = {
      slug: "perfume-prueba",
      name: "Perfume de prueba",
      brand: "Marca",
      sku: "SKU-123",
      gtin: "4006381333931",
      mpn: "MPN 123",
      description: "Descripción específica del perfume de prueba.",
      category: "Unisex",
      notes: [],
      images: [
        {
          publicId: "esencia/perfume-prueba",
          url: "https://res.cloudinary.com/demo/image/upload/esencia/perfume-prueba.jpg",
          alt: "Perfume de prueba",
        },
      ],
      variants: [{ id: "50ml", size: "50 ml", price: 100000, available: true }],
      status: "published",
      featured: false,
    } as const;
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(
      productSchema.safeParse({ ...product, gtin: "4006381333932" }).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({ ...product, sku: "SKU CON ESPACIOS" }).success,
    ).toBe(false);
  });
});
