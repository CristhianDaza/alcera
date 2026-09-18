<script setup lang="ts">
import {
  canIndex,
  catalogHasParameters,
  paginationHasParameters,
  siteBase,
  serializeSchema,
} from "#shared/seo";
const store = useStore();
const { data } = await useFetch("/api/settings");
if (data.value) store.value = data.value;
const { count } = useCart();
const demo = String(useRuntimeConfig().public.demo) === "true";
const route = useRoute();
const config = useRuntimeConfig().public;
const base = siteBase(config.siteUrl);
const isSeoCollection = computed(() =>
  /^\/(categorias|marcas|familias|colecciones)\/[^/]+\/?$/.test(route.path),
);
useSeoMeta({
  robots: () =>
    !canIndex(config) || /^\/(admin|carrito)(\/|$)/.test(route.path)
      ? "noindex, nofollow"
      : /^\/perfumes\/?$/.test(route.path) && catalogHasParameters(route.query)
        ? "noindex, follow"
        : isSeoCollection.value && paginationHasParameters(route.query)
          ? "noindex, follow"
          : "index, follow, max-image-preview:large",
});
useHead(() => ({
  script: [
    {
      key: "store-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": base + "/#organization",
            name: store.value.name,
            legalName: store.value.legalName || undefined,
            taxID: store.value.taxId || undefined,
            email: store.value.contactEmail || undefined,
            url: base + "/",
            logo: base + "/brand/alcera-logo.png",
          },
          {
            "@type": "WebSite",
            "@id": base + "/#website",
            name: store.value.name,
            url: base + "/",
            inLanguage: "es-CO",
            publisher: { "@id": base + "/#organization" },
          },
        ],
      }),
    },
  ],
}));
const navigation = [
  { label: "Colección", category: "", to: "/perfumes" },
  { label: "Mujer", category: "Mujer", to: "/categorias/mujer" },
  { label: "Hombre", category: "Hombre", to: "/categorias/hombre" },
  { label: "Unisex", category: "Unisex", to: "/categorias/unisex" },
  { label: "Decants", category: null, to: "/decants" },
];
const activeCategory = computed(() =>
  /^\/perfumes\/?$/.test(route.path)
    ? route.query.category || ""
    : route.path === "/categorias/mujer"
      ? "Mujer"
      : route.path === "/categorias/hombre"
        ? "Hombre"
        : route.path === "/categorias/unisex"
          ? "Unisex"
          : null,
);
function isNavigationActive(item: (typeof navigation)[number]) {
  return item.to === "/decants"
    ? route.path === "/decants"
    : activeCategory.value === item.category;
}
const { openPreferences } = useCookieConsent();
</script>
<template>
  <div>
    <NuxtLoadingIndicator
      color="#f4b7c4"
      :height="6"
      :duration="2_400"
      :throttle="0"
    />
    <a class="skip" href="#main">Saltar al contenido</a>
    <div class="announcement">
      100% ORIGINALES <span>·</span> EL ARTE DE DEJAR HUELLA
    </div>
    <header class="header shell">
      <NuxtLink class="brand-link" to="/"
        ><BrandMark :name="store.name"
      /></NuxtLink>
      <nav aria-label="Principal">
        <NuxtLink
          v-for="item in navigation"
          :key="item.label"
          v-slot="{ href, navigate }"
          :to="item.to"
          custom
        >
          <a
            :href="href || item.to"
            :class="{ 'is-current': isNavigationActive(item) }"
            :aria-current="isNavigationActive(item) ? 'page' : undefined"
            @click="navigate"
            >{{ item.label }}</a
          >
        </NuxtLink>
      </nav>
      <HeaderSearch />
      <div class="header-actions">
        <ThemeToggle /><NuxtLink
          to="/carrito"
          class="bag"
          aria-label="Ver bolsa de compras"
          ><svg
            viewBox="0 0 24 24"
            width="22"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
          >
            <path d="M5 7h14l1 14H4L5 7Z" />
            <path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg
          ><span class="bag-label">Tu bolsa</span
          ><ClientOnly
            ><span class="count">{{ count }}</span
            ><template #fallback
              ><span class="count">0</span></template
            ></ClientOnly
          ></NuxtLink
        >
      </div>
    </header>
    <main id="main" tabindex="-1"><NuxtPage /></main>
    <footer class="footer">
      <div class="shell footer-grid">
        <div>
          <NuxtLink class="brand-link" to="/"
            ><BrandMark :name="store.name"
          /></NuxtLink>
          <p>
            Lo invisible también deja huella.<br />Encuentra una fragancia que
            hable de ti.
          </p>
        </div>
        <div>
          <h2>Explora</h2>
          <NuxtLink to="/perfumes">Todos los perfumes</NuxtLink
          ><NuxtLink to="/categorias/mujer">Perfumes para mujer</NuxtLink
          ><NuxtLink to="/categorias/hombre">Perfumes para hombre</NuxtLink
          ><NuxtLink to="/categorias/unisex">La colección unisex</NuxtLink>
          <NuxtLink to="/decants">Decants de perfumes</NuxtLink>
          <NuxtLink to="/marcas/lattafa">Perfumes Lattafa</NuxtLink>
          <NuxtLink to="/marcas/armaf">Perfumes Armaf</NuxtLink>
          <NuxtLink to="/colecciones/perfumes-arabes">Perfumes árabes</NuxtLink>
          <NuxtLink to="/guia-de-perfumes">Guía de perfumes</NuxtLink>
        </div>
        <div>
          <h2>Información legal</h2>
          <NuxtLink to="/politica-de-privacidad"
            >Política de privacidad</NuxtLink
          >
          <NuxtLink to="/terminos-y-condiciones"
            >Términos y condiciones</NuxtLink
          >
          <NuxtLink to="/cambios-devoluciones"
            >Cambios, devoluciones y garantías</NuxtLink
          >
          <NuxtLink to="/informacion-envios">Información de envíos</NuxtLink>
          <NuxtLink to="/politica-de-cookies">Política de cookies</NuxtLink>
        </div>
      </div>
      <div class="shell footer-bottom">
        <span>
          © 2026 {{ store.name }} Perfumes. Designed &amp; Developed by
          <a
            href="https://cris-dev.com/"
            target="_blank"
            rel="noopener noreferrer"
            >cris-dev</a
          >.
        </span>
        <span v-if="demo"
          >Sitio de demostración · Productos y precios ilustrativos</span
        >
        <span v-else>Precios en pesos colombianos</span>
        <button
          class="footer-cookie-link"
          type="button"
          @click="openPreferences"
        >
          Configurar cookies
        </button>
      </div>
    </footer>
    <FloatingActions />
    <TawkChat />
    <CookieConsent />
  </div>
</template>
