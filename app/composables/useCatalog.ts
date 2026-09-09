import type { Product } from "#shared/types";

type CatalogState = {
  error: string;
  loaded: boolean;
  loading: boolean;
  products: Product[];
};

let pendingClientRequest: Promise<Product[]> | undefined;

export function useCatalogStore() {
  const config = useRuntimeConfig();
  const state = useState<CatalogState>("catalog", () => ({
    error: "",
    loaded: false,
    loading: false,
    products: [],
  }));

  function diagnostic(event: string, details: Record<string, unknown> = {}) {
    if (String(config.public.catalogDebug) === "true")
      console.debug(`[catalog] ${event}`, details);
  }

  async function requestCatalog() {
    const response = await $fetch.raw<Product[]>("/api/products");
    const cacheHeaders = [
      response.headers.get("cache-status"),
      response.headers.get("cdn-cache-status"),
      response.headers.get("x-nf-cache"),
    ]
      .filter(Boolean)
      .join(" ");
    const age = Number(response.headers.get("age") || 0);
    if (import.meta.client && (age > 0 || /\bhit\b/i.test(cacheHeaders)))
      diagnostic("CATALOG_HTTP_CACHE_HIT", { age, cacheHeaders });
    return response._data ?? [];
  }

  async function ensureLoaded(force = false) {
    if (state.value.loaded && !force) {
      diagnostic("PRODUCT_STORE_HIT", {
        products: state.value.products.length,
      });
      return state.value.products;
    }
    if (import.meta.client && pendingClientRequest && !force)
      return pendingClientRequest;

    state.value.loading = true;
    state.value.error = "";
    const request = requestCatalog();
    if (import.meta.client) pendingClientRequest = request;
    try {
      const products = await request;
      state.value.products = products;
      state.value.loaded = true;
      return products;
    } catch (error) {
      state.value.error =
        (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
        "No pudimos cargar la colección.";
      return state.value.products;
    } finally {
      state.value.loading = false;
      if (import.meta.client && pendingClientRequest === request)
        pendingClientRequest = undefined;
    }
  }

  return {
    error: computed(() => state.value.error),
    loaded: computed(() => state.value.loaded),
    loading: computed(() => state.value.loading),
    products: computed(() => state.value.products),
    diagnostic,
    ensureLoaded,
    refresh: () => ensureLoaded(true),
  };
}
