<script setup lang="ts">
import type { Product } from "#shared/types";

const catalog = useCatalogStore();
await catalog.ensureLoaded();
const { products, error, refresh } = catalog;
const route = useRoute();
const router = useRouter();
const selection = computed(() =>
  [...(products.value ?? [])]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 12),
);
const store = useStore();
usePageSeo(
  `Perfumes en Colombia · ${store.value.name}`,
  "Descubre fragancias florales, amaderadas y cítricas. Encuentra un perfume que deje huella y consulta tu pedido por WhatsApp en Colombia.",
);

const whatsappUrl = computed(() => {
  const number = store.value.whatsapp?.replace(/\D/g, "");
  if (!number) return "";
  const message = `Hola, me gustaría recibir asesoría sobre las fragancias de ${store.value.name}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
});

const familyList = [
  {
    name: "Floral",
    tag: "Luminosa",
    desc: "Delicada, radiante y envolvente. Notas de rosa, jazmín silvestre y azahar.",
  },
  {
    name: "Amaderada",
    tag: "Profunda",
    desc: "Cálida, señorial y terrosa. Cedro noble, sándalo cremoso y vetiver.",
  },
  {
    name: "Cítrica",
    tag: "Vibrante",
    desc: "Fresca, espontánea y luminosa. Bergamota viva, neroli y mandarina.",
  },
  {
    name: "Oriental",
    tag: "Seductora",
    desc: "Intensa, especiada y magnética. Ámbar cálido, vainilla noble y benjuí.",
  },
];

const finderOpen = ref(route.query.finder === "1");
const savedFinderIds = ref<string[]>([]);
const savedFinderProducts = computed(() =>
  savedFinderIds.value
    .map((id) => products.value?.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product)),
);

function setSavedFinderProducts(productIds: string[]) {
  savedFinderIds.value = productIds;
}

onMounted(() => {
  try {
    const stored = JSON.parse(
      localStorage.getItem("alcera-perfume-finder") || "{}",
    ) as { productIds?: unknown };
    if (
      Array.isArray(stored.productIds) &&
      stored.productIds.every((id) => typeof id === "string")
    )
      savedFinderIds.value = stored.productIds;
  } catch {
    localStorage.removeItem("alcera-perfume-finder");
  }
});

watch(
  () => route.query.finder,
  (value) => {
    if (value === "1") finderOpen.value = true;
  },
);

watch(finderOpen, (isOpen) => {
  if (!isOpen && route.query.finder === "1") {
    const query = { ...route.query };
    delete query.finder;
    void router.replace({ query });
  }
});
</script>

<template>
  <section class="hero shell">
    <div class="hero-copy">
      <span class="eyebrow"><i /> ALTA PERFUMERÍA</span>
      <h1>Hay recuerdos<br />que se llevan<br /><em>en la piel.</em></h1>
      <p class="hero-desc">
        Perfumes 100% originales para mujer, hombre y unisex en Colombia.
        Descubre tu aroma personal con asesoría experta y pedido directo.
      </p>
      <div class="hero-actions">
        <NuxtLink class="button hero-cta" to="/catalogo">
          Explorar la colección <span>↗</span>
        </NuxtLink>
        <button
          class="button button--outline hero-cta"
          type="button"
          @click="finderOpen = true"
        >
          Encuentra tu perfume ideal <span>✦</span>
        </button>
        <NuxtLink class="button button--outline hero-cta" to="/guia-de-perfumes">
          Aprende sobre perfumes <span>↗</span>
        </NuxtLink>
        <div class="hero-shortcuts">
          <span class="hero-shortcuts-label">Explora por:</span>
          <div class="hero-chips">
            <NuxtLink to="/catalogo?category=Mujer" class="hero-chip"
              >Mujer</NuxtLink
            >
            <NuxtLink to="/catalogo?category=Hombre" class="hero-chip"
              >Hombre</NuxtLink
            >
            <NuxtLink to="/catalogo?category=Unisex" class="hero-chip"
              >Unisex</NuxtLink
            >
          </div>
        </div>
      </div>
    </div>
    <div class="hero-image">
      <div class="hero-image-brand">
        <img
          src="/brand/alcera-logo.png"
          alt="Alcéra Perfumes"
          width="3200"
          height="1200"
        />
      </div>
      <img
        src="/images/hero-perfumes-editorial-v2.png"
        sizes="(max-width: 700px) 100vw, (max-width: 1050px) 43vw, 40vw"
        alt="Frascos de perfume sin marca sobre una base escultórica con cinta color vino"
        fetchpriority="high"
        decoding="async"
        width="1122"
        height="1402"
      />
    </div>
  </section>

  <section v-if="savedFinderProducts.length" class="section shell saved-finder">
    <div class="section-heading">
      <div>
        <span class="eyebrow">TU SELECCIÓN GUARDADA</span>
        <h2>Perfumes elegidos para <em>ti.</em></h2>
      </div>
      <button class="text-link" type="button" @click="finderOpen = true">
        Actualizar mi selección ↗
      </button>
    </div>
    <div
      class="product-grid selection-grid"
      :style="{
        '--selection-columns': Math.max(1, savedFinderProducts.length),
      }"
    >
      <ProductCard
        v-for="product in savedFinderProducts"
        :key="product.id"
        :product="product"
      />
    </div>
  </section>

  <div class="trust-banner shell">
    <div class="trust-item">
      <span class="trust-icon" aria-hidden="true">✦</span>
      <div class="trust-text">
        <strong>100% Originales</strong>
        <span>Perfumes auténticos, seleccionados para ti</span>
      </div>
    </div>
    <div class="trust-divider" aria-hidden="true"></div>
    <div class="trust-item">
      <span class="trust-icon" aria-hidden="true">◈</span>
      <div class="trust-text">
        <strong>Asesoría Personalizada</strong>
        <span>Te guiamos por WhatsApp a elegir tu fragancia</span>
      </div>
    </div>
    <div class="trust-divider" aria-hidden="true"></div>
    <div class="trust-item">
      <span class="trust-icon" aria-hidden="true">↗</span>
      <div class="trust-text">
        <strong>Envíos a toda Colombia</strong>
        <span>Entrega segura y empaque protegido</span>
      </div>
    </div>
  </div>

  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">SELECCIÓN DESTACADA</span>
        <h2>Fragancias que <em>dejan huella.</em></h2>
      </div>
      <NuxtLink class="text-link" to="/catalogo"
        >Ver toda la colección ↗</NuxtLink
      >
    </div>
    <div v-if="error" class="notice" role="alert">
      <p>No pudimos cargar la colección.</p>
      <button class="text-link" @click="refresh()">Reintentar</button>
    </div>
    <div
      v-else
      class="product-grid selection-grid"
      :style="{
        '--selection-columns': Math.min(4, Math.max(1, selection.length)),
      }"
    >
      <ProductCard
        v-for="(product, index) in selection"
        :key="product.id"
        :product="product"
        :index="index"
      />
    </div>
    <p v-if="products && !products.length" class="empty-notice">
      Pronto descubrirás nuestra primera colección.
    </p>
  </section>

  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">UNIVERSO OLFATIVO</span>
        <h2>¿A qué huele <em>tu esencia?</em></h2>
      </div>
      <span class="muted">Elige una familia para descubrir sus notas.</span>
    </div>
    <div class="family-cards">
      <NuxtLink
        v-for="item in familyList"
        :key="item.name"
        :to="`/catalogo?family=${item.name}`"
        class="family-card"
      >
        <div class="family-card-head">
          <span class="family-badge">{{ item.tag }}</span>
          <span class="family-arrow" aria-hidden="true">↗</span>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        <span class="family-link-label">Explorar notas ↗</span>
      </NuxtLink>
    </div>
  </section>

  <section class="shell guide-teaser">
    <div>
      <span class="eyebrow">GUÍA DE PERFUMES</span>
      <h2>Aprende a leer lo que <em>hueles.</em></h2>
      <p>
        Familias olfativas, concentraciones, notas, proyección y duración: todo
        lo que necesitas para elegir con confianza.
      </p>
    </div>
    <NuxtLink class="button button--outline" to="/guia-de-perfumes"
      >Conocer la guía <span>↗</span></NuxtLink
    >
  </section>

  <section class="shell concierge-card">
    <div class="concierge-content">
      <span class="eyebrow">ATENCIÓN PERSONALIZADA</span>
      <h2>¿Buscas una recomendación <em>a tu medida?</em></h2>
      <p>
        Si tienes dudas sobre qué aroma va mejor con tu estilo, ocasión, te
        asesoramos en tiempo real y coordinamos tu entrega fácilmente.
      </p>
      <div class="concierge-actions">
        <NuxtLink class="button" to="/catalogo"
          >Ver catálogo completo <span>↗</span></NuxtLink
        >
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="button button--outline"
        >
          Consultar por WhatsApp ↗
        </a>
      </div>
    </div>
  </section>

  <PerfumeFinder
    v-model="finderOpen"
    :products="products || []"
    @complete="setSavedFinderProducts"
  />
</template>
