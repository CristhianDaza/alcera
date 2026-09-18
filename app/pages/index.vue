<script setup lang="ts">
import type { Product } from "#shared/types";

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
    .slice(0, 4),
);
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

function trackWhatsappClick(linkLocation: "home_hero" | "home_concierge") {
  void trackAnalyticsEvent("whatsapp_click", {
    link_location: linkLocation,
    page_path: route.fullPath,
  });
}

const familyList = [
  {
    name: "Floral",
    to: "/familias/florales",
    tag: "Luminosa",
    desc: "Romántica, luminosa y atemporal.",
    image: "/images/family-floral.jpg",
    imageSmall: "/images/family-floral-480.jpg",
    alt: "Rosa y flores de jazmín sobre una superficie de piedra",
  },
  {
    name: "Amaderada",
    to: "/familias/amaderados",
    tag: "Profunda",
    desc: "Cálida, sofisticada y con carácter.",
    image: "/images/family-woody.jpg",
    imageSmall: "/images/family-woody-480.jpg",
    alt: "Maderas de cedro y vetiver sobre una superficie oscura",
  },
  {
    name: "Cítrica",
    to: "/familias/citricos",
    tag: "Vibrante",
    desc: "Fresca, vibrante y llena de energía.",
    image: "/images/family-citrus.jpg",
    imageSmall: "/images/family-citrus-480.jpg",
    alt: "Bergamota, limón y hojas verdes sobre piedra oscura",
  },
  {
    name: "Oriental",
    to: "/familias/orientales",
    tag: "Seductora",
    desc: "Intensa, envolvente y seductora.",
    image: "/images/family-oriental.jpg",
    imageSmall: "/images/family-oriental-480.jpg",
    alt: "Ámbar, vainilla y especias sobre una superficie color vino",
  },
];

const finderOpen = ref(route.query.finder === "1");

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
        <NuxtLink class="button hero-cta" to="/perfumes">
          Explorar colección <span aria-hidden="true">→</span>
        </NuxtLink>
        <a
          v-if="whatsappUrl"
          class="hero-secondary-link"
          :href="whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click="trackWhatsappClick('home_hero')"
        >
          Recibir asesoría <span aria-hidden="true">↗</span>
        </a>
        <button
          v-else
          class="hero-secondary-link"
          type="button"
          @click="finderOpen = true"
        >
          Recibir asesoría <span aria-hidden="true">→</span>
        </button>
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
      <span class="trust-icon" aria-hidden="true">◇</span>
      <div class="trust-text">
        <strong>Envíos a toda Colombia</strong>
        <span>Entrega coordinada y empaque protegido</span>
      </div>
    </div>
  </div>

  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">UNIVERSO OLFATIVO</span>
        <h2>Descubre tu <em>familia olfativa.</em></h2>
      </div>
      <span class="muted"
        >Cada aroma despierta una emoción. ¿Cuál te representa?</span
      >
    </div>
    <div class="family-cards">
      <NuxtLink
        v-for="item in familyList"
        :key="item.name"
        :to="item.to"
        class="family-card"
      >
        <img
          class="family-card-image"
          :src="item.image"
          :srcset="`${item.imageSmall} 480w, ${item.image} 720w`"
          sizes="(max-width: 700px) 45vw, (max-width: 1050px) 42vw, 23vw"
          :alt="item.alt"
          loading="lazy"
          decoding="async"
          width="720"
          height="1080"
        />
        <div class="family-card-head">
          <span class="family-badge">{{ item.tag }}</span>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.desc }}</p>
        <span class="family-link-label">Explorar notas</span>
      </NuxtLink>
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
        '--selection-columns': Math.max(1, selection.length),
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

  <section class="shell home-guide">
    <div class="home-guide__image">
      <img
        src="/images/hero-perfumes-editorial-v2-768.webp"
        alt="Composición de perfumería para acompañar la guía de fragancias"
        loading="lazy"
        decoding="async"
        width="768"
        height="960"
      />
    </div>
    <div class="home-guide__content">
      <div>
        <span class="eyebrow">APRENDE A ELEGIR</span>
        <h2>¿Qué tipo de fragancia <em>va contigo?</em></h2>
        <p>
          Conoce las familias olfativas, las notas y las concentraciones para
          elegir con más confianza.
        </p>
      </div>
      <NuxtLink class="button" to="/guia-de-perfumes">
        Ver guía completa <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </section>

  <section class="shell concierge-card">
    <div class="concierge-content">
      <span class="eyebrow">¿NECESITAS AYUDA?</span>
      <h2>Hablemos por <em>WhatsApp.</em></h2>
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
          @click="trackWhatsappClick('home_concierge')"
        >
          Recibir asesoría por WhatsApp ↗
        </a>
        <button v-else class="button" type="button" @click="finderOpen = true">
          Recibir una recomendación <span>✦</span>
        </button>
      </div>
    </div>
    <div class="concierge-image">
      <img
        src="/images/whatsapp-advisory-editorial.jpg"
        alt="Teléfono y libreta sobre una mesa de asesoría de perfumes"
        loading="lazy"
        decoding="async"
        width="900"
        height="1350"
      />
    </div>
  </section>

  <PerfumeFinder v-model="finderOpen" :products="products || []" />
</template>
