<script setup lang="ts">
import { serializeSchema, siteBase } from "#shared/seo";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
await catalog.ensureLoaded();
const data = catalog.products;
const error = catalog.error;
const status = computed(() =>
  catalog.loading.value ? "pending" : catalog.error.value ? "error" : "success",
);
const refresh = catalog.refresh;
const queryText = (value: unknown) => (typeof value === "string" ? value : "");
const search = ref(queryText(route.query.q));
const category = computed({
  get: () => queryText(route.query.category),
  set: (value) => updateQuery({ category: value }),
});
const family = computed({
  get: () => queryText(route.query.family),
  set: (value) => updateQuery({ family: value }),
});
const brand = computed({
  get: () => queryText(route.query.brand),
  set: (value) => updateQuery({ brand: value }),
});
const concentration = computed({
  get: () => queryText(route.query.concentration),
  set: (value) => updateQuery({ concentration: value }),
});
const available = computed({
  get: () => route.query.available === "1",
  set: (value) => updateQuery({ available: value ? "1" : "" }),
});
const sort = computed({
  get: () => queryText(route.query.sort) || "featured",
  set: (value) => updateQuery({ sort: value === "featured" ? "" : value }),
});
function updateQuery(values: Record<string, string>, preservePage = false) {
  const query = { ...route.query };
  if (!preservePage && !("page" in values)) {
    delete query.page;
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) query[key] = value;
    else delete query[key];
  }
  void router.replace({ query });
}
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => updateQuery({ q: value.trim() }), 250);
});
watch(
  () => route.query.q,
  (value) => {
    search.value = queryText(value);
  },
);
onBeforeUnmount(() => clearTimeout(searchTimer));
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
const standardFamilies = [
  "Floral",
  "Amaderada",
  "Cítrica",
  "Oriental",
  "Frutal",
  "Dulce",
  "Almizclado",
  "Especiado",
  "Aromático",
  "Acuático",
];
const families = computed(() => [
  ...new Set([
    ...standardFamilies,
    ...(data.value ?? [])
      .flatMap((p) => p.family ?? [])
      .filter((item): item is string => Boolean(item)),
    ...(family.value ? [family.value] : []),
  ]),
]);
const categories = computed(() => [
  ...new Set([
    "Mujer",
    "Hombre",
    "Unisex",
    ...(data.value ?? []).map((p) => p.category),
    ...(category.value ? [category.value] : []),
  ]),
]);
const brands = computed(() =>
  [
    ...new Set([
      ...(data.value ?? []).map((p) => p.brand).filter(Boolean),
      ...(brand.value ? [brand.value] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "es")),
);
const concentrations = computed(() =>
  [
    ...new Set([
      ...(data.value ?? [])
        .map((p) => p.concentration)
        .filter((item): item is string => Boolean(item)),
      ...(concentration.value ? [concentration.value] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "es")),
);
const hasFilters = computed(() =>
  Boolean(
    search.value ||
    category.value ||
    family.value ||
    brand.value ||
    concentration.value ||
    available.value,
  ),
);
function clearFilters() {
  search.value = "";
  clearTimeout(searchTimer);
  updateQuery(
    {
      q: "",
      category: "",
      family: "",
      brand: "",
      concentration: "",
      available: "",
      page: "",
    },
    true,
  );
}
const filtered = computed(() => {
  const list = (data.value ?? []).filter(
    (p) =>
      normalize(`${p.name} ${p.brand}`).includes(normalize(search.value)) &&
      (!category.value || p.category === category.value) &&
      (!family.value || p.family?.includes(family.value)) &&
      (!brand.value || p.brand === brand.value) &&
      (!concentration.value || p.concentration === concentration.value) &&
      (!available.value || p.variants.some((v) => v.available)),
  );
  const price = (p: (typeof list)[number]) =>
    Math.min(
      ...p.variants
        .filter((v) => !available.value || v.available)
        .map((v) => v.price),
    );
  return list.sort((a, b) =>
    sort.value === "asc"
      ? price(a) - price(b)
      : sort.value === "desc"
        ? price(b) - price(a)
        : Number(b.featured) - Number(a.featured),
  );
});
const page = computed({
  get: () => {
    const raw = queryText(route.query.page);
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  },
  set: (value: number) => {
    updateQuery({ page: value > 1 ? String(value) : "" }, true);
    if (import.meta.client) {
      const el = document.querySelector(".catalog");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  },
});
const pageSize = 12;
const productPrice = (product: NonNullable<typeof data.value>[number]) => {
  const availablePrices = product.variants
    .filter((item) => item.available)
    .map((item) => item.price);
  return Math.min(
    ...(availablePrices.length
      ? availablePrices
      : product.variants.map((item) => item.price)),
  );
};
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / pageSize)),
);
const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});
const displayedPages = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});
watch(totalPages, (total) => {
  if (page.value > total && total > 0) {
    page.value = total;
  }
});
usePageSeo(
  `Perfumes para mujer, hombre y unisex · ${useStore().value.name}`,
  "Explora perfumes por marca, familia olfativa y presentación. Precios en COP y pedidos por WhatsApp.",
);
const base = siteBase(useRuntimeConfig().public.siteUrl);
useHead(() => ({
  script: [
    {
      key: "catalog-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": base + "/catalogo#page",
            url: base + "/catalogo",
            name: "Colección de perfumes",
            description:
              "Perfumes para mujer, hombre y unisex disponibles en Colombia.",
            inLanguage: "es-CO",
            isPartOf: { "@id": base + "/#website" },
            mainEntity: { "@id": base + "/catalogo#products" },
          },
          {
            "@type": "ItemList",
            "@id": base + "/catalogo#products",
            numberOfItems: filtered.value.length,
            itemListElement: paginatedProducts.value.map((product, index) => ({
              "@type": "ListItem",
              position: (page.value - 1) * pageSize + index + 1,
              item: {
                "@type": "Product",
                url: `${base}/perfumes/${product.slug}`,
                name: `${product.name} de ${product.brand}`,
                image: product.images[0]?.url,
                offers: {
                  "@type": "Offer",
                  url: `${base}/perfumes/${product.slug}`,
                  seller: { "@id": base + "/#organization" },
                  priceCurrency: "COP",
                  price: productPrice(product),
                  availability:
                    "https://schema.org/" +
                    (product.variants.some((item) => item.available)
                      ? "InStock"
                      : "OutOfStock"),
                },
              },
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Inicio",
                item: base + "/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Catálogo",
                item: base + "/catalogo",
              },
            ],
          },
        ],
      }),
    },
  ],
}));
</script>

<template>
  <section class="shell section catalog">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Catálogo</span>
    </nav>
    <div class="page-intro">
      <span class="eyebrow">ENCUENTRA TU PRÓXIMA HISTORIA</span>
      <h1>Colección de <em>perfumes.</em></h1>
      <p>
        Un aroma para cada versión de ti. Explora, elige y consulta por
        WhatsApp.
      </p>
    </div>
    <div class="filters">
      <label class="search-label"
        >Buscar perfume<input
          v-model="search"
          type="search"
          placeholder="Nombre o marca…"
      /></label>
      <label
        >Categoría<select v-model="category">
          <option value="">Todas</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select></label
      >
      <label
        >Familia<select v-model="family">
          <option value="">Todas</option>
          <option v-for="f in families" :key="f">{{ f }}</option>
        </select></label
      >
      <label
        >Marca<select v-model="brand">
          <option value="">Todas</option>
          <option v-for="b in brands" :key="b">{{ b }}</option>
        </select></label
      >
      <label
        >Concentración<select v-model="concentration">
          <option value="">Todas</option>
          <option v-for="c in concentrations" :key="c">{{ c }}</option>
        </select></label
      >
      <label
        >Ordenar<select v-model="sort">
          <option value="featured">Destacados</option>
          <option value="asc">Menor precio</option>
          <option value="desc">Mayor precio</option>
        </select></label
      >
    </div>
    <div class="results-bar">
      <span role="status" aria-live="polite"
        >{{ filtered.length }}
        {{ filtered.length === 1 ? "perfume" : "perfumes"
        }}<span class="results-currency"> · Precios en COP</span></span
      >
      <div class="results-actions">
        <button v-if="hasFilters" class="text-link" @click="clearFilters">
          Limpiar filtros</button
        ><label class="check"
          ><input v-model="available" type="checkbox" /> Solo disponibles</label
        >
      </div>
    </div>
    <div
      v-if="category || family || brand || concentration"
      class="active-filters"
      aria-label="Filtros activos"
    >
      <button
        v-if="category"
        @click="category = ''"
        :aria-label="`Quitar categoría ${category}`"
      >
        {{ category }} <span aria-hidden="true">×</span>
      </button>
      <button
        v-if="family"
        @click="family = ''"
        :aria-label="`Quitar familia ${family}`"
      >
        {{ family }} <span aria-hidden="true">×</span>
      </button>
      <button
        v-if="brand"
        @click="brand = ''"
        :aria-label="`Quitar marca ${brand}`"
      >
        {{ brand }} <span aria-hidden="true">×</span>
      </button>
      <button
        v-if="concentration"
        @click="concentration = ''"
        :aria-label="`Quitar concentración ${concentration}`"
      >
        {{ concentration }} <span aria-hidden="true">×</span>
      </button>
    </div>
    <p v-if="status === 'pending'" role="status">Descubriendo la colección…</p>
    <div v-else-if="error" class="empty" role="alert">
      <h2>No pudimos cargar los perfumes.</h2>
      <p>Inténtalo de nuevo en unos segundos.</p>
      <button class="button" @click="refresh()">Reintentar</button>
    </div>
    <div v-else-if="!filtered.length" class="empty">
      <span class="empty-symbol" aria-hidden="true">✧</span>
      <h2>
        {{
          hasFilters
            ? "No encontramos esa combinación."
            : "La colección está por llegar."
        }}
      </h2>
      <p>
        {{
          hasFilters
            ? "Prueba con otra marca o quita un filtro para descubrir más fragancias."
            : "Pronto podrás descubrir nuestras fragancias."
        }}
      </p>
      <button v-if="hasFilters" class="button" @click="clearFilters">
        Ver toda la colección ↗
      </button>
    </div>
    <template v-else>
      <div class="product-grid">
        <ProductCard
          v-for="(product, index) in paginatedProducts"
          :key="product.id"
          :product="product"
          :priority="index < 4"
        />
      </div>
      <nav
        v-if="totalPages > 1"
        class="pagination catalog-pagination"
        aria-label="Paginación de la colección de perfumes"
      >
        <span class="pagination-info" role="status">
          Mostrando
          {{ (page - 1) * pageSize + 1 }}–{{
            Math.min(page * pageSize, filtered.length)
          }}
          de {{ filtered.length }} perfumes
        </span>
        <div class="pagination-controls">
          <button
            type="button"
            class="text-link pagination-btn"
            :disabled="page <= 1"
            @click="page--"
          >
            ← Anterior
          </button>
          <div class="pagination-pages">
            <template v-for="(p, idx) in displayedPages" :key="idx">
              <span v-if="typeof p === 'string'" class="pagination-ellipsis">{{
                p
              }}</span>
              <button
                v-else
                type="button"
                class="pagination-page-btn"
                :class="{ active: p === page }"
                :aria-current="p === page ? 'page' : undefined"
                @click="page = p"
              >
                {{ p }}
              </button>
            </template>
          </div>
          <button
            type="button"
            class="text-link pagination-btn"
            :disabled="page >= totalPages"
            @click="page++"
          >
            Siguiente →
          </button>
        </div>
      </nav>
    </template>
  </section>
</template>
