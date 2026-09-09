import { gunzipSync, gzipSync } from "node:zlib";
import { isDeepStrictEqual } from "node:util";
import { demoProducts } from "../../shared/demo";
import type { Product, Settings } from "../../shared/types";

type CacheEntry<T> = {
  expiresAt: number;
  pending?: Promise<T>;
  value?: T;
};

type InlineSnapshot = {
  count: number;
  encoding: "gzip-base64-json-v1";
  payload: string;
  updatedAt: string;
};

type ChunkedSnapshot = {
  chunkCount: number;
  count: number;
  encoding: "gzip-base64-json-chunks-v1";
  updatedAt: string;
};

type SnapshotManifest = InlineSnapshot | ChunkedSnapshot;

const CATALOG_CACHE_MS = 5 * 60 * 1000;
const SETTINGS_CACHE_MS = 15 * 60 * 1000;

const MAX_INLINE_PAYLOAD_BYTES = 850_000;
const MAX_CHUNK_PAYLOAD_BYTES = 800_000;
const MAX_SNAPSHOT_CHUNKS = 100;
const publishedCatalogCache: CacheEntry<Product[]> = { expiresAt: 0 };
const allCatalogCache: CacheEntry<Product[]> = { expiresAt: 0 };
const settingsCache: CacheEntry<Settings> = { expiresAt: 0 };
const snapshotChunkCounts = new Map<boolean, number>();

function diagnosticsEnabled() {
  const config = useRuntimeConfig();
  return (
    String(config.catalogDebug) === "true" ||
    String(config.public.catalogDebug) === "true"
  );
}

export function catalogDiagnostic(
  event:
    | "CATALOG_MEMORY_HIT"
    | "CATALOG_REBUILD"
    | "CATALOG_SNAPSHOT_HIT"
    | "CATALOG_SNAPSHOT_MISS"
    | "PRODUCT_SNAPSHOT_HIT",
  details: Record<string, unknown> = {},
) {
  if (diagnosticsEnabled()) console.info(`[catalog] ${event}`, details);
}

async function cached<T>(
  entry: CacheEntry<T>,
  duration: number,
  load: () => Promise<T>,
  onHit?: () => void,
): Promise<T> {
  const now = Date.now();
  if (entry.value !== undefined && entry.expiresAt > now) {
    onHit?.();
    return structuredClone(entry.value);
  }
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

function normalizeProduct(value: Record<string, unknown>, id: string): Product {
  const rawFamily = value.family;
  const family = Array.isArray(rawFamily)
    ? rawFamily.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : typeof rawFamily === "string" && rawFamily.trim()
      ? [rawFamily.trim()]
      : [];
  return { ...value, id, family } as Product;
}

function cacheCatalog(allProducts: Product[]) {
  const now = Date.now();
  allCatalogCache.value = structuredClone(allProducts);
  allCatalogCache.expiresAt = now + CATALOG_CACHE_MS;
  publishedCatalogCache.value = structuredClone(
    allProducts.filter((product) => product.status === "published"),
  );
  publishedCatalogCache.expiresAt = now + CATALOG_CACHE_MS;
}

function snapshotName(all: boolean) {
  return all ? "all" : "published";
}

function snapshotRef(all: boolean) {
  return database().collection("catalogCache").doc(snapshotName(all));
}

function chunkRef(all: boolean, index: number) {
  return database()
    .collection("catalogCache")
    .doc(`${snapshotName(all)}-${index}`);
}

function compressedPayload(value: Product[]) {
  return gzipSync(JSON.stringify(value)).toString("base64");
}

function splitPayload(payload: string) {
  if (Buffer.byteLength(payload, "utf8") <= MAX_INLINE_PAYLOAD_BYTES) return [];
  const chunks: string[] = [];
  for (
    let offset = 0;
    offset < payload.length;
    offset += MAX_CHUNK_PAYLOAD_BYTES
  )
    chunks.push(payload.slice(offset, offset + MAX_CHUNK_PAYLOAD_BYTES));
  if (chunks.length > MAX_SNAPSHOT_CHUNKS)
    throw new Error("El catálogo supera el máximo de 100 chunks permitidos.");
  return chunks;
}

function decodeProducts(payload: string, count: number): Product[] | null {
  try {
    const parsed = JSON.parse(
      gunzipSync(Buffer.from(payload, "base64")).toString("utf8"),
    ) as unknown;
    return Array.isArray(parsed) && parsed.length === count
      ? parsed.map((product) =>
          normalizeProduct(
            product as Record<string, unknown>,
            String((product as Product).id),
          ),
        )
      : null;
  } catch {
    return null;
  }
}

function manifestChunkCount(value: unknown) {
  const manifest = value as Partial<SnapshotManifest> | undefined;
  return manifest?.encoding === "gzip-base64-json-chunks-v1" &&
    Number.isInteger(manifest.chunkCount) &&
    Number(manifest.chunkCount) > 0 &&
    Number(manifest.chunkCount) <= MAX_SNAPSHOT_CHUNKS
    ? Number(manifest.chunkCount)
    : 0;
}

async function existingChunkCount(all: boolean) {
  const known = snapshotChunkCounts.get(all);
  if (known !== undefined) return known;
  const document = await snapshotRef(all).get();
  const count = document.exists ? manifestChunkCount(document.data()) : 0;
  snapshotChunkCounts.set(all, count);
  return count;
}

async function readSnapshot(all: boolean): Promise<Product[] | null> {
  const scope = snapshotName(all);
  const document = await snapshotRef(all).get();
  if (!document.exists) {
    snapshotChunkCounts.set(all, 0);
    catalogDiagnostic("CATALOG_SNAPSHOT_MISS", { reason: "absent", scope });
    return null;
  }

  const manifest = document.data() as Partial<SnapshotManifest> | undefined;
  if (
    manifest?.encoding === "gzip-base64-json-v1" &&
    typeof manifest.payload === "string" &&
    typeof manifest.count === "number"
  ) {
    snapshotChunkCounts.set(all, 0);
    const products = decodeProducts(manifest.payload, manifest.count);
    if (products) {
      catalogDiagnostic("CATALOG_SNAPSHOT_HIT", {
        documentReads: 1,
        products: products.length,
        scope,
      });
      return products;
    }
  } else if (
    manifest?.encoding === "gzip-base64-json-chunks-v1" &&
    typeof manifest.count === "number"
  ) {
    const chunkCount = manifestChunkCount(manifest);
    snapshotChunkCounts.set(all, chunkCount);
    if (chunkCount) {
      const documents = await database().getAll(
        ...Array.from({ length: chunkCount }, (_, index) =>
          chunkRef(all, index),
        ),
      );
      const payloads = documents.map((chunk) => chunk.data()?.payload);
      if (
        documents.every((chunk) => chunk.exists) &&
        payloads.every(
          (payload): payload is string => typeof payload === "string",
        )
      ) {
        const products = decodeProducts(payloads.join(""), manifest.count);
        if (products) {
          catalogDiagnostic("CATALOG_SNAPSHOT_HIT", {
            chunks: chunkCount,
            documentReads: chunkCount + 1,
            products: products.length,
            scope,
          });
          return products;
        }
      }
    }
  }

  catalogDiagnostic("CATALOG_SNAPSHOT_MISS", { reason: "invalid", scope });
  return null;
}

async function writeSnapshot(all: boolean, value: Product[]) {
  const payload = compressedPayload(value);
  const chunks = splitPayload(payload);
  const previousChunks = await existingChunkCount(all);
  const updatedAt = new Date().toISOString();
  const databaseInstance = database();
  const batch = databaseInstance.batch();
  const manifest: SnapshotManifest = chunks.length
    ? {
        chunkCount: chunks.length,
        count: value.length,
        encoding: "gzip-base64-json-chunks-v1",
        updatedAt,
      }
    : {
        count: value.length,
        encoding: "gzip-base64-json-v1",
        payload,
        updatedAt,
      };

  batch.set(snapshotRef(all), manifest);
  chunks.forEach((chunk, index) =>
    batch.set(chunkRef(all, index), { payload: chunk }),
  );
  for (let index = chunks.length; index < previousChunks; index += 1)
    batch.delete(chunkRef(all, index));
  await batch.commit();
  snapshotChunkCounts.set(all, chunks.length);
}

async function writeBothSnapshots(allProducts: Product[]) {
  const published = allProducts.filter(
    (product) => product.status === "published",
  );
  await Promise.all([
    writeSnapshot(true, allProducts),
    writeSnapshot(false, published),
  ]);
  cacheCatalog(allProducts);
}

async function queryProducts(all: boolean): Promise<Product[]> {
  const collection = database().collection("products");
  const snapshot = await (
    all ? collection : collection.where("status", "==", "published")
  ).get();
  catalogDiagnostic("CATALOG_REBUILD", {
    estimatedDocumentReads: Math.max(1, snapshot.docs.length),
    products: snapshot.docs.length,
    scope: snapshotName(all),
  });
  return snapshot.docs.map((document) =>
    normalizeProduct(document.data(), document.id),
  );
}

export function invalidateCatalogCache() {
  for (const entry of [publishedCatalogCache, allCatalogCache]) {
    entry.value = undefined;
    entry.expiresAt = 0;
  }
}

export async function clearPersistentCatalogSnapshots() {
  invalidateCatalogCache();
  const chunkCounts = await Promise.all([
    existingChunkCount(true),
    existingChunkCount(false),
  ]);
  const batch = database().batch();
  for (const all of [true, false]) {
    batch.delete(snapshotRef(all));
    for (let index = 0; index < chunkCounts[all ? 0 : 1]!; index += 1)
      batch.delete(chunkRef(all, index));
  }
  await batch.commit();
  snapshotChunkCounts.clear();
}

export async function upsertCatalogSnapshots(product: Product) {
  const current = await products(true);
  const index = current.findIndex((item) => item.id === product.id);
  if (index >= 0) {
    if (isDeepStrictEqual(current[index], product)) return;
    current[index] = structuredClone(product);
  } else current.push(structuredClone(product));
  await writeBothSnapshots(current);
}

export async function removeFromCatalogSnapshots(id: string) {
  const current = await products(true);
  if (!current.some((product) => product.id === id)) return;
  await writeBothSnapshots(current.filter((product) => product.id !== id));
}

export function invalidateSettingsCache() {
  settingsCache.value = undefined;
  settingsCache.expiresAt = 0;
}

export const isDemo = () => String(useRuntimeConfig().public.demo) === "true";

export async function products(all = false): Promise<Product[]> {
  if (isDemo()) return structuredClone(demoProducts);
  const entry = all ? allCatalogCache : publishedCatalogCache;
  return cached(
    entry,
    CATALOG_CACHE_MS,
    async () => {
      const snapshot = await readSnapshot(all);
      if (snapshot) return snapshot;

      const result = await queryProducts(all);
      try {
        if (all) await writeBothSnapshots(result);
        else await writeSnapshot(false, result);
      } catch (error) {
        // Serving the source collection is safer than taking the catalog offline.
        console.error("Could not create catalog snapshot", error);
      }
      return result;
    },
    () => catalogDiagnostic("CATALOG_MEMORY_HIT", { scope: snapshotName(all) }),
  );
}

export async function productBySlug(slug: string): Promise<Product | null> {
  const product =
    (await products()).find((candidate) => candidate.slug === slug) ?? null;
  catalogDiagnostic("PRODUCT_SNAPSHOT_HIT", {
    found: Boolean(product),
    slug,
  });
  return product;
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
