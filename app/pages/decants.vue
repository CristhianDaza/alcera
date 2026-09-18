<script setup lang="ts">
import { money } from "#shared/commerce";
import { isDecantVariant, productHasDecants } from "#shared/catalog";
import { serializeSchema, siteBase } from "#shared/seo";

const catalog = useCatalogStore();
await catalog.ensureLoaded();
if (import.meta.server && catalog.error.value)
  throw createError({
    statusCode: 503,
    statusMessage: "Los decants no están disponibles temporalmente",
  });

const search = ref("");
const brand = ref("");
const size = ref("");
const availableOnly = ref(true);
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

const decantProducts = computed(() =>
  catalog.products.value.filter((product) => productHasDecants(product)),
);
const brands = computed(() =>
  [...new Set(decantProducts.value.map((product) => product.brand))].sort(
    (a, b) => a.localeCompare(b, "es"),
  ),
);
const sizes = computed(() =>
  [
    ...new Set(
      decantProducts.value.flatMap((product) =>
        product.variants.filter(isDecantVariant).map((variant) => variant.size),
      ),
    ),
  ].sort((a, b) => Number.parseInt(a) - Number.parseInt(b)),
);
const filtered = computed(() =>
  decantProducts.value.filter((product) => {
    const matchingVariants = product.variants.filter(
      (variant) =>
        isDecantVariant(variant) &&
        (!size.value || variant.size === size.value),
    );
    return (
      normalize(`${product.name} ${product.brand}`).includes(
        normalize(search.value),
      ) &&
      (!brand.value || product.brand === brand.value) &&
      matchingVariants.some(
        (variant) => !availableOnly.value || variant.available,
      )
    );
  }),
);
const hasFilters = computed(
  () => search.value || brand.value || size.value || !availableOnly.value,
);
function clearFilters() {
  search.value = "";
  brand.value = "";
  size.value = "";
  availableOnly.value = true;
}
function decantPrice(product: (typeof decantProducts.value)[number]) {
  const variants = product.variants.filter(
    (variant) =>
      isDecantVariant(variant) &&
      (!size.value || variant.size === size.value) &&
      (!availableOnly.value || variant.available),
  );
  return Math.min(...variants.map((variant) => variant.price));
}

const store = useStore();
usePageSeo(
  () => `Decants de perfumes originales · ${store.value.name}`,
  "Descubre perfumes originales en presentaciones decant de 5 ml, 10 ml, 30 ml y otros tamaños disponibles en Colombia.",
  "/images/hero-perfumes-editorial-v2.webp",
  { imageAlt: "Selección de decants de perfumes originales" },
);
const base = siteBase(useRuntimeConfig().public.siteUrl);
useHead(() => ({
  script: [
    {
      key: "decants-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Decants de perfumes originales",
        url: `${base}/decants`,
        inLanguage: "es-CO",
        numberOfItems: filtered.value.length,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: filtered.value.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${product.name} de ${product.brand}`,
            url: `${base}/perfumes/${product.slug}?formato=decant`,
          })),
        },
      }),
    },
  ],
}));
</script>

<template>
  <section class="shell section catalog decants-page">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Decants</span>
    </nav>

    <div class="page-intro decants-intro">
      <span class="eyebrow">DESCUBRE ANTES DE ELEGIR</span>
      <h1>Decants de <em>perfumes originales.</em></h1>
      <p>
        Prueba una fragancia en una presentación práctica o lleva tus aromas
        favoritos contigo. Cada decant se prepara a partir del perfume original
        y puedes elegir el tamaño disponible en la ficha.
      </p>
    </div>

    <div class="decant-benefits" aria-label="Ventajas de los decants">
      <div>
        <strong>Prueba con calma</strong
        ><span>Conoce cómo evoluciona en tu piel.</span>
      </div>
      <div>
        <strong>Elige tu tamaño</strong
        ><span>Opciones como 5 ml, 10 ml o 30 ml.</span>
      </div>
      <div>
        <strong>Fácil de llevar</strong
        ><span>Tu fragancia favorita siempre contigo.</span>
      </div>
    </div>

    <div class="filters decant-filters">
      <label class="search-label"
        >Buscar perfume<input
          v-model="search"
          type="search"
          placeholder="Nombre o marca…"
      /></label>
      <label
        >Marca<select v-model="brand">
          <option value="">Todas</option>
          <option v-for="item in brands" :key="item">{{ item }}</option>
        </select></label
      >
      <label
        >Tamaño<select v-model="size">
          <option value="">Todos</option>
          <option v-for="item in sizes" :key="item">{{ item }}</option>
        </select></label
      >
    </div>

    <div class="results-bar">
      <span role="status" aria-live="polite">
        {{ filtered.length }}
        {{ filtered.length === 1 ? "perfume" : "perfumes" }} con decants
      </span>
      <div class="results-actions">
        <button v-if="hasFilters" class="text-link" @click="clearFilters">
          Limpiar filtros
        </button>
        <label class="check"
          ><input v-model="availableOnly" type="checkbox" /> Solo
          disponibles</label
        >
      </div>
    </div>

    <p v-if="catalog.loading.value" role="status">Preparando los decants…</p>
    <div v-else-if="catalog.error.value" class="empty" role="alert">
      <h2>No pudimos cargar los decants.</h2>
      <button class="button" @click="catalog.refresh()">Reintentar</button>
    </div>
    <div v-else-if="!filtered.length" class="empty">
      <span class="empty-symbol" aria-hidden="true">✧</span>
      <h2>
        {{
          hasFilters
            ? "No encontramos esa combinación."
            : "Los decants están por llegar."
        }}
      </h2>
      <p>
        {{
          hasFilters
            ? "Prueba con otro tamaño o limpia los filtros."
            : "Muy pronto encontrarás aquí nuevas presentaciones para probar."
        }}
      </p>
      <button v-if="hasFilters" class="button" @click="clearFilters">
        Ver todos los decants
      </button>
    </div>
    <div v-else class="product-grid">
      <ProductCard
        v-for="(product, index) in filtered"
        :key="product.id"
        :product="product"
        variant-type="decant"
        :priority="index < 4"
      />
    </div>
    <p v-if="filtered.length" class="decant-price-note">
      Precios desde {{ money(Math.min(...filtered.map(decantPrice))) }} COP.
      Elige una fragancia para ver todos sus tamaños.
    </p>
  </section>
</template>

<style scoped>
.decants-intro {
  max-width: 780px;
}
.decant-benefits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin: 34px 0 44px;
  background: var(--line);
}
.decant-benefits div {
  display: grid;
  gap: 7px;
  padding: 22px;
  background: var(--surface);
}
.decant-benefits strong {
  font-family: var(--serif);
  font-size: 18px;
}
.decant-benefits span,
.decant-price-note {
  color: var(--muted);
  font-size: 12px;
}
.decant-filters {
  grid-template-columns: 2fr 1fr 1fr;
}
.decant-price-note {
  margin-top: 28px;
  text-align: center;
}
@media (max-width: 700px) {
  .decant-benefits,
  .decant-filters {
    grid-template-columns: 1fr;
  }
  .decant-benefits {
    margin: 26px 0 34px;
  }
}
</style>
