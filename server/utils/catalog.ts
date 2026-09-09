import { demoProducts } from "../../shared/demo";
import type { Product, Settings } from "../../shared/types";

type CacheEntry<T> = {
  expiresAt: number;
  pending?: Promise<T>;
  value?: T;
};

const CATALOG_CACHE_MS = 5 * 60 * 1000;
const PRODUCT_CACHE_MS = 5 * 60 * 1000;
const SETTINGS_CACHE_MS = 15 * 60 * 1000;
const publishedCatalogCache: CacheEntry<Product[]> = { expiresAt: 0 };
const productCache = new Map<string, CacheEntry<Product | null>>();
const settingsCache: CacheEntry<Settings> = { expiresAt: 0 };

async function cached<T>(
  entry: CacheEntry<T>,
  duration: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  if (entry.value !== undefined && entry.expiresAt > now)
    return structuredClone(entry.value);
  if (!entry.pending) {
    entry.pending = load()
      .then((value) => {
        entry.value = value;
        entry.expiresAt = Date.now() + duration;
        return value;
      })
      .finally(() => {
        entry.pending = undefined;
      });
  }
  return structuredClone(await entry.pending);
}

export function invalidateCatalogCache() {
  publishedCatalogCache.value = undefined;
  publishedCatalogCache.expiresAt = 0;
  productCache.clear();
}

export function invalidateSettingsCache() {
  settingsCache.value = undefined;
  settingsCache.expiresAt = 0;
}

export const isDemo = () => String(useRuntimeConfig().public.demo) === "true";
export async function products(all = false): Promise<Product[]> {
  if (isDemo()) return structuredClone(demoProducts);
  const collection = database().collection("products");
  const load = async () => {
    const snapshot = await (
      all ? collection : collection.where("status", "==", "published")
    ).get();
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Product);
  };
  return all ? load() : cached(publishedCatalogCache, CATALOG_CACHE_MS, load);
}

export async function productBySlug(slug: string): Promise<Product | null> {
  if (isDemo())
    return structuredClone(
      demoProducts.find((product) => product.slug === slug) ?? null,
    );

  const entry = productCache.get(slug) ?? { expiresAt: 0 };
  productCache.set(slug, entry);
  return cached(entry, PRODUCT_CACHE_MS, async () => {
    const snapshot = await database()
      .collection("products")
      .where("status", "==", "published")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document
      ? ({ ...document.data(), id: document.id } as Product)
      : null;
  });
}
export async function settings(): Promise<Settings> {
  if (isDemo()) return { name: "ALCÉRA", whatsapp: "" };
  return cached(settingsCache, SETTINGS_CACHE_MS, async () => {
    const doc = await database().collection("settings").doc("store").get();
    const stored = doc.data() as Partial<Settings> | undefined;
    return {
      whatsapp: "",
      ...stored,
      name: !stored?.name || stored.name === "Esencia" ? "ALCÉRA" : stored.name,
    };
  });
}
