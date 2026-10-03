import { describe, expect, it } from "vitest";
import { buildMetaContent, isMetaPixelAllowed } from "../shared/meta";
import { demoProducts } from "../shared/demo";

describe("eventos de Meta", () => {
  it("usa IDs de presentación reales y construye los parámetros estándar", () => {
    const product = demoProducts[0]!;
    const variant = product.variants[0]!;
    const event = buildMetaContent([{ product, variant, quantity: 3 }]);

    expect(event).toEqual({
      content_ids: [variant.id],
      contents: [{ id: variant.id, quantity: 3, item_price: variant.price }],
      content_type: "product",
      value: variant.price * 3,
      currency: "COP",
      num_items: 3,
    });
  });

  it("solo habilita el Pixel con consentimiento en producción no demo", () => {
    const pixelId = "123456789012345";
    expect(isMetaPixelAllowed(true, true, false, pixelId)).toBe(true);
    expect(isMetaPixelAllowed(false, true, false, pixelId)).toBe(false);
    expect(isMetaPixelAllowed(true, false, false, pixelId)).toBe(false);
    expect(isMetaPixelAllowed(true, true, true, pixelId)).toBe(false);
  });
});
