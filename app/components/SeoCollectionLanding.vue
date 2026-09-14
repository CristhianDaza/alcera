<script setup lang="ts">
import type { Product } from "#shared/types";
import type { SeoLanding } from "#shared/seo-landings";
import {
  catalogPage,
  paginatedCanonical,
  serializeSchema,
  siteBase,
} from "#shared/seo";

const props = defineProps<{ landing: SeoLanding }>();
const store = useStore();
const route = useRoute();
const base = siteBase(useRuntimeConfig().public.siteUrl);
const page = computed(() => catalogPage(route.query.page));
if (!page.value)
  throw createError({ statusCode: 404, statusMessage: "Página no encontrada" });
type LandingResponse = {
  products: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
const { data, error, refresh } = await useFetch<LandingResponse>(
  `/api/collections/${props.landing.kind}/${props.landing.slug}`,
  { query: { page } },
);

if (import.meta.server && error.value)
  throw createError({
    statusCode: error.value.statusCode === 404 ? 404 : 503,
    statusMessage:
      error.value.statusCode === 404
        ? "Página no encontrada"
        : "La colección no está disponible temporalmente",
  });
if (import.meta.server && !data.value?.products.length)
  throw createError({
    statusCode: 404,
    statusMessage: "Colección no encontrada",
  });
const canonical = computed(() =>
  paginatedCanonical(base, route.path, route.query),
);
const displayedPages = computed(() => {
  const total = data.value?.totalPages ?? 1;
  const current = data.value?.page ?? 1;
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});
function pageLocation(pageNumber: number) {
  return pageNumber > 1
    ? { path: route.path, query: { page: String(pageNumber) } }
    : { path: route.path };
}
const productGrid = ref<HTMLElement | null>(null);
function scrollToProducts() {
  productGrid.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
watch(
  () => data.value?.page,
  (current, previous) => {
    if (previous && current !== previous) void nextTick(scrollToProducts);
  },
);

usePageSeo(
  () =>
    `${props.landing.title}${page.value && page.value > 1 ? ` · Página ${page.value}` : ""} · ${store.value.name}`,
  props.landing.description,
  "/images/hero-perfumes-editorial-v2.webp",
  { imageAlt: props.landing.title, canonical },
);

useHead(() => ({
  script: [
    {
      key: `collection-${props.landing.kind}-${props.landing.slug}`,
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical.value}#page`,
            url: canonical.value,
            name: props.landing.title,
            description: props.landing.description,
            inLanguage: "es-CO",
            isPartOf: { "@id": `${base}/#website` },
            mainEntity: { "@id": `${canonical.value}#products` },
          },
          {
            "@type": "ItemList",
            "@id": `${canonical.value}#products`,
            numberOfItems: data.value?.total ?? 0,
            itemListElement: (data.value?.products ?? []).map(
              (product, index) => ({
                "@type": "ListItem",
                position:
                  ((page.value ?? 1) - 1) * (data.value?.pageSize ?? 12) +
                  index +
                  1,
                name: `${product.name} de ${product.brand}`,
                url: `${base}/perfumes/${product.slug}`,
                image: product.images[0]?.url,
              }),
            ),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Inicio",
                item: `${base}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Perfumes",
                item: `${base}/perfumes`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: props.landing.name,
                item: canonical.value,
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
  <section class="shell section catalog seo-collection">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <NuxtLink to="/perfumes">Perfumes</NuxtLink> /
      <span aria-current="page">{{ landing.name }}</span>
    </nav>
    <div class="page-intro">
      <span class="eyebrow">{{ landing.eyebrow }}</span>
      <h1>{{ landing.title }}</h1>
      <p>{{ landing.introduction }}</p>
    </div>

    <div class="section-heading seo-collection__heading">
      <div>
        <span class="eyebrow">CATÁLOGO DISPONIBLE</span>
        <h2>{{ landing.name }} publicados</h2>
      </div>
      <span class="muted"
        >{{ data?.total ?? 0 }} referencias · Precios en COP</span
      >
    </div>

    <div v-if="error" class="notice" role="alert">
      <p>No pudimos cargar esta colección.</p>
      <button class="text-link" @click="refresh()">Reintentar</button>
    </div>
    <div v-else ref="productGrid" class="product-grid">
      <ProductCard
        v-for="(product, index) in data?.products"
        :key="product.id"
        :product="product"
        :priority="index < 4"
      />
    </div>

    <nav
      v-if="data && data.totalPages > 1"
      class="pagination catalog-pagination"
      aria-label="Paginación de la colección"
    >
      <span class="pagination-info" role="status">
        Página {{ data.page }} de {{ data.totalPages }} ·
        {{ data.total }} referencias
      </span>
      <div class="pagination-controls">
        <NuxtLink
          v-if="data.page > 1"
          class="text-link pagination-btn"
          :to="pageLocation(data.page - 1)"
          @click="scrollToProducts"
          >← Anterior</NuxtLink
        >
        <span v-else class="text-link pagination-btn is-disabled">
          ← Anterior
        </span>
        <div class="pagination-pages">
          <template v-for="(item, index) in displayedPages" :key="index">
            <span v-if="typeof item === 'string'" class="pagination-ellipsis">{{
              item
            }}</span>
            <NuxtLink
              v-else
              class="pagination-page-btn"
              :class="{ active: item === data.page }"
              :aria-current="item === data.page ? 'page' : undefined"
              :to="pageLocation(item)"
              @click="scrollToProducts"
              >{{ item }}</NuxtLink
            >
          </template>
        </div>
        <NuxtLink
          v-if="data.page < data.totalPages"
          class="text-link pagination-btn"
          :to="pageLocation(data.page + 1)"
          @click="scrollToProducts"
          >Siguiente →</NuxtLink
        >
        <span v-else class="text-link pagination-btn is-disabled">
          Siguiente →
        </span>
      </div>
    </nav>

    <div class="seo-collection__more">
      <p>¿Quieres comparar con otras marcas o perfiles olfativos?</p>
      <NuxtLink class="button button--outline" to="/perfumes">
        Ver todos los perfumes
      </NuxtLink>
    </div>
  </section>
</template>
