import { describe, it, expect } from "vitest";
import {
  canIndex,
  canonicalUrl,
  metaDescription,
  serializeSchema,
  siteBase,
  catalogPage,
  catalogHasParameters,
  pageCanonical,
  paginatedCanonical,
  paginationHasParameters,
  productSearchName,
} from "../shared/seo";
import { productSchema } from "../server/utils/validation";
import { seoLanding, seoLandings } from "../shared/seo-landings";
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
  it("evita repetir una marca ya presente en el nombre del producto", () => {
    expect(
      productSearchName("Lattafa Shaheen Silver Eau de Parfum", "Lattafa"),
    ).toBe("Lattafa Shaheen Silver Eau de Parfum");
    expect(productSearchName("Lancome Idole", "Lancôme")).toBe("Lancome Idole");
    expect(productSearchName("Sauvage", "Dior")).toBe("Sauvage de Dior");
  });
  it("conserva la paginación canónica y excluye filtros y parámetros ambiguos", () => {
    expect(catalogPage(undefined)).toBe(1);
    expect(catalogPage("2")).toBe(2);
    for (const value of [
      "0",
      "-1",
      "2abc",
      "01",
      "1.5",
      "",
      ["2", "3"],
      "9007199254740992",
    ])
      expect(catalogPage(value)).toBeNull();
    expect(catalogHasParameters({ page: "2" })).toBe(false);
    expect(pageCanonical(live.siteUrl, "/perfumes/", { page: "2" })).toBe(
      `${live.siteUrl}/perfumes?page=2`,
    );
    expect(pageCanonical(live.siteUrl, "/perfumes", { page: "1" })).toBe(
      `${live.siteUrl}/perfumes`,
    );
    for (const query of [
      { page: "2", q: "rosa" },
      { category: "Mujer" },
      { page: ["2", "3"] },
      { utm_source: "google" },
    ]) {
      expect(catalogHasParameters(query)).toBe(true);
      expect(pageCanonical(live.siteUrl, "/perfumes", query)).toBe(
        `${live.siteUrl}/perfumes`,
      );
    }
    expect(pageCanonical(live.siteUrl, "/perfumes/rosa", { page: "2" })).toBe(
      `${live.siteUrl}/perfumes/rosa`,
    );
  });
  it("serializa contenido sin permitir cerrar el script JSON-LD", () => {
    const content = { name: "</script><script>alert(1)</script>" };
    expect(serializeSchema(content)).not.toContain("<");
    expect(JSON.parse(serializeSchema(content))).toEqual(content);
  });
  it("mantiene únicas y resolubles las landings editoriales prioritarias", () => {
    const paths = seoLandings.map(
      (landing) => `/${landing.kind}/${landing.slug}`,
    );
    expect(new Set(paths).size).toBe(13);
    expect(paths).toEqual([
      "/categorias/mujer",
      "/categorias/hombre",
      "/categorias/unisex",
      "/marcas/lattafa",
      "/marcas/armaf",
      "/marcas/rasasi",
      "/marcas/bharara",
      "/marcas/maison-alhambra",
      "/marcas/al-haramain",
      "/familias/dulces",
      "/familias/amaderados",
      "/familias/citricos",
      "/colecciones/perfumes-arabes",
    ]);
    for (const landing of seoLandings)
      expect(seoLanding(landing.kind, landing.slug)).toEqual(landing);
    expect(seoLanding("marcas", "desconocida")).toBeUndefined();
    expect(
      paginatedCanonical(live.siteUrl, "/marcas/lattafa", { page: "2" }),
    ).toBe(`${live.siteUrl}/marcas/lattafa?page=2`);
    expect(paginationHasParameters({ page: "2" })).toBe(false);
    expect(paginationHasParameters({ page: "2", q: "x" })).toBe(true);
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
