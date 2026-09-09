import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoProducts } from "../shared/demo";

let reads = 0;

beforeEach(() => {
  vi.resetModules();
  reads = 0;
  vi.stubGlobal("useRuntimeConfig", () => ({ public: { demo: false } }));
  vi.stubGlobal("database", () => {
    const products = {
      where: () => products,
      limit: () => products,
      get: async () => {
        reads += 1;
        return {
          docs: [
            {
              id: demoProducts[0]!.id,
              data: () => structuredClone(demoProducts[0]),
            },
          ],
        };
      },
    };
    return {
      collection: (name: string) => {
        if (name === "products") return products;
        return {
          doc: () => ({ get: async () => ({ data: () => undefined }) }),
        };
      },
    };
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("caché del catálogo público", () => {
  it("reutiliza catálogo y producto por slug hasta una invalidación", async () => {
    const { invalidateCatalogCache, productBySlug, products } =
      await import("../server/utils/catalog");

    const firstCatalog = await products();
    const secondCatalog = await products();
    expect(reads).toBe(1);
    firstCatalog[0]!.name = "No debe mutar la caché";
    expect(secondCatalog[0]!.name).toBe(demoProducts[0]!.name);

    await productBySlug(demoProducts[0]!.slug);
    await productBySlug(demoProducts[0]!.slug);
    expect(reads).toBe(2);

    invalidateCatalogCache();
    await products();
    await productBySlug(demoProducts[0]!.slug);
    expect(reads).toBe(4);
  });
});
