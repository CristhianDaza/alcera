import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoProducts } from "../shared/demo";
import type { Product } from "../shared/types";

let productReads = 0;
let debug = false;
let snapshotDeletes = 0;
let snapshotReads = 0;
let snapshotWrites = 0;
let sourceCatalog: Product[] = [];
const snapshots = new Map<string, Record<string, unknown>>();

function documentRef(id: string) {
  return {
    id,
    delete: async () => {
      snapshotDeletes += 1;
      snapshots.delete(id);
    },
    get: async () => {
      snapshotReads += 1;
      return {
        exists: snapshots.has(id),
        data: () => snapshots.get(id),
      };
    },
    set: async (value: Record<string, unknown>) => {
      snapshotWrites += 1;
      snapshots.set(id, structuredClone(value));
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  productReads = 0;
  debug = false;
  snapshotDeletes = 0;
  snapshotReads = 0;
  snapshotWrites = 0;
  sourceCatalog = [structuredClone(demoProducts[0]!)];
  snapshots.clear();
  vi.stubGlobal("useRuntimeConfig", () => ({
    catalogDebug: debug,
    public: { catalogDebug: debug, demo: false },
  }));
  vi.stubGlobal("database", () => {
    const productCollection = {
      where: () => productCollection,
      get: async () => {
        productReads += Math.max(1, sourceCatalog.length);
        return {
          docs: sourceCatalog.map((product) => ({
            id: product.id,
            data: () => structuredClone(product),
          })),
        };
      },
    };
    return {
      batch: () => {
        const operations: Array<() => Promise<unknown>> = [];
        return {
          delete: (ref: ReturnType<typeof documentRef>) =>
            operations.push(() => ref.delete()),
          set: (
            ref: ReturnType<typeof documentRef>,
            value: Record<string, unknown>,
          ) => operations.push(() => ref.set(value)),
          commit: async () =>
            Promise.all(operations.map((operation) => operation())),
        };
      },
      collection: (name: string) =>
        name === "products"
          ? productCollection
          : { doc: (id: string) => documentRef(id) },
      getAll: (...refs: Array<ReturnType<typeof documentRef>>) =>
        Promise.all(refs.map((ref) => ref.get())),
    };
  });
});

afterEach(() => vi.unstubAllGlobals());

function deterministicNoise(seed: number, length: number) {
  let value = seed || 1;
  let result = "";
  for (let index = 0; index < length; index += 1) {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    result += String.fromCharCode(33 + ((value >>> 16) % 90));
  }
  return result;
}

describe("caché consolidada del catálogo", () => {
  it("consulta los productos una vez y después reutiliza el snapshot", async () => {
    const { invalidateCatalogCache, productBySlug, products } =
      await import("../server/utils/catalog");

    const firstCatalog = await products();
    const secondCatalog = await products();
    expect(productReads).toBe(1);
    expect(snapshotReads).toBe(1);
    firstCatalog[0]!.name = "No debe mutar la caché";
    expect(secondCatalog[0]!.name).toBe(demoProducts[0]!.name);

    await productBySlug(demoProducts[0]!.slug);
    expect(productReads).toBe(1);

    invalidateCatalogCache();
    await products();
    await productBySlug(demoProducts[0]!.slug);
    expect(productReads).toBe(1);
    expect(snapshotReads).toBe(2);
  });

  it("actualiza y elimina productos sin volver a consultar la colección", async () => {
    const {
      invalidateCatalogCache,
      products,
      removeFromCatalogSnapshots,
      upsertCatalogSnapshots,
    } = await import("../server/utils/catalog");

    await products(true);
    productReads = 0;
    snapshotReads = 0;
    snapshotWrites = 0;

    const updated = { ...sourceCatalog[0]!, name: "Actualizado" };
    await upsertCatalogSnapshots(updated);
    expect(productReads).toBe(0);
    expect(snapshotReads).toBe(0);
    expect(snapshotWrites).toBe(2);

    invalidateCatalogCache();
    expect((await products())[0]!.name).toBe("Actualizado");
    await removeFromCatalogSnapshots(updated.id);
    invalidateCatalogCache();
    expect(await products()).toEqual([]);
    expect(productReads).toBe(0);
  });

  it("divide catálogos grandes y una instancia fría lee solo sus chunks", async () => {
    sourceCatalog = Array.from({ length: 1_000 }, (_, index) => ({
      ...structuredClone(demoProducts[0]!),
      id: `product-${index}`,
      slug: `product-${index}`,
      description: deterministicNoise(index + 1, 2_000),
    }));
    let catalogModule = await import("../server/utils/catalog");
    expect((await catalogModule.products()).length).toBe(1_000);
    expect(productReads).toBe(1_000);
    const manifest = snapshots.get("published")!;
    expect(manifest.encoding).toBe("gzip-base64-json-chunks-v1");
    expect(Number(manifest.chunkCount)).toBeGreaterThan(1);

    vi.resetModules();
    catalogModule = await import("../server/utils/catalog");
    const readsBeforeColdStart = snapshotReads;
    expect((await catalogModule.products()).length).toBe(1_000);
    expect(productReads).toBe(1_000);
    expect(snapshotReads - readsBeforeColdStart).toBe(
      Number(manifest.chunkCount) + 1,
    );
    expect(snapshotDeletes).toBe(0);
  });

  it("expone el origen de las lecturas solo cuando se activa el diagnóstico", async () => {
    debug = true;
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { invalidateCatalogCache, productBySlug, products } =
      await import("../server/utils/catalog");

    await products();
    await products();
    invalidateCatalogCache();
    await products();
    await productBySlug(sourceCatalog[0]!.slug);

    const events = info.mock.calls.map((call) => String(call[0]));
    expect(events).toEqual(
      expect.arrayContaining([
        expect.stringContaining("CATALOG_SNAPSHOT_MISS"),
        expect.stringContaining("CATALOG_REBUILD"),
        expect.stringContaining("CATALOG_MEMORY_HIT"),
        expect.stringContaining("CATALOG_SNAPSHOT_HIT"),
        expect.stringContaining("PRODUCT_SNAPSHOT_HIT"),
      ]),
    );
    info.mockRestore();
  });
});
