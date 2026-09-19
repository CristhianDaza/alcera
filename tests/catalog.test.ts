import { describe, expect, it } from "vitest";
import {
  isDecantVariant,
  catalogVariants,
  compareProductPriority,
  productHasDecants,
  selectRelatedProducts,
} from "../shared/catalog";
import { demoProducts } from "../shared/demo";
import { withoutPrivateInventory } from "../server/utils/catalog";

const product = demoProducts[0]!;

describe("Productos relacionados", () => {
  it("muestra primero hasta cuatro de la misma marca y luego cuatro de la misma familia", () => {
    const sameBrand = Array.from({ length: 5 }, (_, index) => ({
      ...product,
      id: `marca-${index}`,
      slug: `marca-${index}`,
      name: `De la marca ${index}`,
      family: ["Floral"],
    }));
    const sameFamily = Array.from({ length: 5 }, (_, index) => ({
      ...product,
      id: `familia-${index}`,
      slug: `familia-${index}`,
      name: `De la familia ${index}`,
      brand: "Otra marca",
    }));

    const related = selectRelatedProducts(
      [product, ...sameBrand, ...sameFamily],
      product,
    );

    expect(related).toHaveLength(8);
    expect(related.slice(0, 4).map((item) => item.id)).toEqual([
      "marca-0",
      "marca-1",
      "marca-2",
      "marca-3",
    ]);
    expect(related.slice(4).map((item) => item.id)).toEqual([
      "familia-0",
      "familia-1",
      "familia-2",
      "familia-3",
    ]);
  });

  it("no repite productos que coinciden en marca y familia", () => {
    const overlapping = {
      ...product,
      id: "marca-y-familia",
      slug: "marca-y-familia",
    };

    const related = selectRelatedProducts([product, overlapping], product);

    expect(related).toEqual([overlapping]);
  });
});

describe("Decants", () => {
  it("distingue decants de frascos y respeta disponibilidad", () => {
    const withDecants = {
      ...product,
      variants: [
        ...product.variants.filter((variant) => !isDecantVariant(variant)),
        {
          id: "decant-test",
          size: "5 ml",
          price: 30000,
          available: false,
          type: "decant" as const,
        },
      ],
    };

    expect(isDecantVariant(product.variants[0]!)).toBe(false);
    expect(productHasDecants(withDecants)).toBe(true);
    expect(productHasDecants(withDecants, true)).toBe(false);
    expect(catalogVariants(withDecants).every(isDecantVariant)).toBe(false);
  });
});

describe("Prioridad comercial", () => {
  it("muestra más vendidos, novedades y decants antes que destacados", () => {
    const bottleOnly = {
      ...product,
      variants: product.variants.filter((variant) => !isDecantVariant(variant)),
    };
    const products = [
      { ...bottleOnly, id: "normal", featured: false },
      { ...bottleOnly, id: "destacado", featured: true },
      {
        ...bottleOnly,
        id: "decant",
        featured: false,
        variants: [
          ...bottleOnly.variants,
          {
            id: "decant-prioridad",
            size: "5 ml",
            price: 30000,
            available: true,
            type: "decant" as const,
          },
        ],
      },
      { ...bottleOnly, id: "nuevo", featured: false, newArrival: true },
      { ...bottleOnly, id: "vendido", featured: false, bestSeller: true },
    ];

    expect(
      products.sort(compareProductPriority).map((item) => item.id),
    ).toEqual(["vendido", "nuevo", "decant", "destacado", "normal"]);
  });
});

describe("Privacidad del catálogo", () => {
  it("no expone existencias ni costos en el producto público", () => {
    const privateProduct = {
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        inventory: {
          stock: 4,
          minimumStock: 2,
          averageCost: 150_000,
          updatedAt: new Date().toISOString(),
        },
      })),
    };

    expect(
      withoutPrivateInventory(privateProduct).variants.every(
        (variant) => variant.inventory === undefined,
      ),
    ).toBe(true);
  });
});
