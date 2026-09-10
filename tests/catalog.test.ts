import { describe, expect, it } from "vitest";
import { selectRelatedProducts } from "../shared/catalog";
import { demoProducts } from "../shared/demo";

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
