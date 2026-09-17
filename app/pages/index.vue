<script setup lang="ts">
import type { Product } from "#shared/types";
import { seoLandings } from "#shared/seo-landings";

const catalog = useCatalogStore();
const {
  data: featuredProducts,
  error,
  refresh,
} = await useFetch<Product[]>("/api/products/featured");
if (import.meta.server && error.value)
  throw createError({
    statusCode: 503,
    statusMessage: "La colección no está disponible temporalmente",
  });
const products = computed(() =>
  catalog.loaded.value
    ? catalog.products.value
    : (featuredProducts.value ?? []),
);
const route = useRoute();
const router = useRouter();
const selection = computed(() =>
  [...(products.value ?? [])]
    .filter((product) => product.variants.some((variant) => variant.available))
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 8),
);
const exploreGroups = [
  {
    title: "Comprar por categoría",
    links: seoLandings.filter((landing) => landing.kind === "categorias"),
  },
  {
    title: "Comprar por marca",
    links: seoLandings.filter((landing) => landing.kind === "marcas"),
  },
  {
    title: "Comprar por familia olfativa",
    links: seoLandings.filter((landing) => landing.kind === "familias"),
  },
  {
    title: "Selección especial",
    links: seoLandings.filter((landing) => landing.kind === "colecciones"),
  },
];
const store = useStore();
usePageSeo(
  `Perfumes en Colombia · ${store.value.name}`,
  "Descubre fragancias florales, amaderadas y cítricas. Encuentra un perfume que deje huella y consulta tu pedido por WhatsApp en Colombia.",
  "/images/hero-perfumes-editorial-v2.webp",
  {
    imageAlt:
      "Selección de perfumes de Alcéra Perfumes sobre una composición editorial",
  },
);

const whatsappUrl = computed(() => {
  const number = store.value.whatsapp?.replace(/\D/g, "");
  if (!number) return "";
  const message = `Hola, me gustaría recibir asesoría sobre las fragancias de ${store.value.name}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
});

function trackWhatsappClick() {
  void trackAnalyticsEvent("whatsapp_click", {
    link_location: "home_concierge",
    page_path: route.fullPath,
  });
}

const familyList = [
  {
    name: "Floral",
    to: "/familias/florales",
    tag: "Luminosa",
    desc: "Rosa, jazmín y azahar.",
  },
  {
    name: "Amaderada",
    to: "/familias/amaderados",
    tag: "Profunda",
    desc: "Cedro, sándalo y vetiver.",
  },
  {
    name: "Cítrica",
    to: "/familias/citricos",
    tag: "Vibrante",
    desc: "Bergamota, neroli y mandarina.",
  },
  {
    name: "Oriental",
    to: "/familias/orientales",
    tag: "Seductora",
    desc: "Ámbar, vainilla y benjuí.",
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
    if (savedFinderIds.value.length) void catalog.ensureLoaded();
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
  if (isOpen) void catalog.ensureLoaded();
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
      <h1>Encuentra un perfume que <em>se sienta como tú.</em></h1>
      <p class="hero-desc">
        Perfumes 100% originales para mujer, hombre y unisex, con asesoría
        personalizada y envíos a toda Colombia.
      </p>
      <div class="hero-actions">
        <button
          class="button hero-cta"
          type="button"
          @click="finderOpen = true"
        >
          Encuentra tu perfume ideal <span>✦</span>
        </button>
        <NuxtLink class="hero-secondary-link" to="/perfumes">
          Ver todos los perfumes <span aria-hidden="true">→</span>
        </NuxtLink>
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
        src="/images/hero-perfumes-editorial-v2.webp"
        srcset="
          /images/hero-perfumes-editorial-v2-480.webp  480w,
          /images/hero-perfumes-editorial-v2-768.webp  768w,
          /images/hero-perfumes-editorial-v2.webp     1122w
        "
        sizes="(max-width: 700px) 100vw, (max-width: 1050px) 43vw, 40vw"
        alt="Frascos de perfume sin marca sobre una base escultórica con cinta color vino"
        fetchpriority="high"
        decoding="async"
        width="1122"
        height="1402"
      />
    </div>
  </section>

  <div class="trust-banner shell">
    <div class="trust-item">
      <span class="trust-icon" aria-hidden="true">✦</span>
      <div class="trust-text">
        <strong>100% Originales</strong>
        <span>Fragancias auténticas y seleccionadas</span>
      </div>
    </div>
    <div class="trust-divider" aria-hidden="true"></div>
    <div class="trust-item">
      <span class="trust-icon" aria-hidden="true">◈</span>
      <div class="trust-text">
        <strong>Elección acompañada</strong>
        <span>Te ayudamos a encontrar tu aroma ideal</span>
      </div>
    </div>
    <div class="trust-divider" aria-hidden="true"></div>
    <div class="trust-item">
      <div class="trust-text">
        <strong>Envíos a toda Colombia</strong>
        <span>Entrega coordinada y empaque protegido</span>
      </div>
    </div>
  </div>

  <section v-if="savedFinderProducts.length" class="section shell saved-finder">
    <div class="section-heading">
      <div>
        <span class="eyebrow">TU SELECCIÓN GUARDADA</span>
        <h2>Perfumes elegidos para <em>ti.</em></h2>
      </div>
      <button class="text-link" type="button" @click="finderOpen = true">
        Actualizar mi selección
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

  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">FAVORITOS PARA DESCUBRIR</span>
        <h2>Una selección para <em>empezar.</em></h2>
      </div>
      <NuxtLink class="text-link" to="/perfumes"
        >Ver toda la colección</NuxtLink
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

  <section class="section shell home-explore">
    <div class="section-heading">
      <div>
        <span class="eyebrow">EXPLORA LA COLECCIÓN</span>
        <h2>Encuentra tu aroma por <em>marca o estilo.</em></h2>
      </div>
      <NuxtLink class="text-link" to="/perfumes"
        >Ver todos los perfumes</NuxtLink
      >
    </div>
    <div class="home-explore__groups">
      <section v-for="group in exploreGroups" :key="group.title">
        <h3>{{ group.title }}</h3>
        <nav :aria-label="group.title">
          <NuxtLink
            v-for="landing in group.links"
            :key="`${landing.kind}-${landing.slug}`"
            :to="`/${landing.kind}/${landing.slug}`"
          >
            {{ landing.name }}
          </NuxtLink>
        </nav>
      </section>
    </div>
  </section>

  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">UNIVERSO OLFATIVO</span>
        <h2>¿A qué huele <em>tu esencia?</em></h2>
      </div>
      <span class="muted">Encuentra rápidamente las notas que prefieres.</span>
    </div>
    <div class="family-cards">
      <NuxtLink
        v-for="item in familyList"
        :key="item.name"
        :to="item.to"
        class="family-card"
      >
        <div class="family-card-head">
          <span class="family-badge">{{ item.tag }}</span>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        <span class="family-link-label">Explorar notas</span>
      </NuxtLink>
    </div>
  </section>

  <section class="shell concierge-card">
    <div class="concierge-content">
      <span class="eyebrow">ATENCIÓN PERSONALIZADA</span>
      <h2>Elige con confianza, <em>estamos para ayudarte.</em></h2>
      <p>
        Cuéntanos qué aromas disfrutas, para qué ocasión lo buscas y tu
        presupuesto. Te recomendamos opciones y coordinamos tu entrega.
      </p>
      <div class="concierge-actions">
        <a
          v-if="whatsappUrl"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="button"
          @click="trackWhatsappClick"
        >
          Recibir asesoría por WhatsApp ↗
        </a>
        <button v-else class="button" type="button" @click="finderOpen = true">
          Recibir una recomendación <span>✦</span>
        </button>
        <NuxtLink class="guide-inline-link" to="/guia-de-perfumes">
          ¿No sabes qué concentración elegir? Consulta nuestra guía
        </NuxtLink>
      </div>
    </div>
  </section>

  <PerfumeFinder
    v-model="finderOpen"
    :products="products || []"
    @complete="setSavedFinderProducts"
  />
</template>
