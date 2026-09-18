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
  { label: "Guía", category: null, to: "/guia-de-perfumes" },
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
function isNavigationCurrent(item: (typeof navigation)[number]) {
  return item.category === null
    ? route.path === item.to
    : activeCategory.value === item.category;
}
const { openPreferences } = useCookieConsent();
const mobileMenuOpen = ref(false);
const contactWhatsappUrl = computed(() => {
  if (store.value.whatsappEnabled === false) return "";
  const number = store.value.whatsapp?.replace(/\D/g, "");
  return number ? `https://wa.me/${number}` : "";
});
function socialProfileUrl(value: string, hosts: string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      hosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
      ? url.href
      : "";
  } catch {
    return "";
  }
}
const instagramUrl = computed(() =>
  socialProfileUrl(store.value.instagram, ["instagram.com"]),
);
const facebookUrl = computed(() =>
  socialProfileUrl(store.value.facebook, ["facebook.com", "fb.com"]),
);
const tiktokUrl = computed(() =>
  socialProfileUrl(store.value.tiktok, ["tiktok.com"]),
);
const hasFooterSocials = computed(
  () =>
    Boolean(
      contactWhatsappUrl.value ||
        instagramUrl.value ||
        facebookUrl.value ||
        tiktokUrl.value,
    ),
);
watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
  },
);
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
      Perfumes 100% originales <span>·</span> Envíos a toda Colombia
    </div>
    <header class="header shell">
      <NuxtLink class="brand-link" to="/"
        ><BrandMark :name="store.name"
      /></NuxtLink>
      <nav
        id="header-navigation"
        :class="{ 'is-open': mobileMenuOpen }"
        aria-label="Principal"
        @click="mobileMenuOpen = false"
      >
        <NuxtLink
          v-for="item in navigation"
          :key="item.label"
          v-slot="{ href, navigate }"
          :to="item.to"
          custom
        >
          <a
            :href="href || item.to"
            :class="{ 'is-current': isNavigationCurrent(item) }"
            :aria-current="
              isNavigationCurrent(item) ? 'page' : undefined
            "
            @click="navigate"
            >{{ item.label }}</a
          >
        </NuxtLink>
      </nav>
      <HeaderSearch />
      <button
        class="menu-trigger"
        type="button"
        aria-controls="header-navigation"
        :aria-expanded="mobileMenuOpen"
        :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path v-if="!mobileMenuOpen" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
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
          <nav
            v-if="hasFooterSocials"
            class="footer-socials"
            aria-label="Redes sociales"
          >
            <a
              v-if="contactWhatsappUrl"
              :href="contactWhatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.1 3.9A11.3 11.3 0 0 0 12.1.6C5.86.6.79 5.67.79 11.9c0 2 .52 3.94 1.5 5.65L.7 23.4l6-1.57a11.26 11.26 0 0 0 5.4 1.37h.01c6.23 0 11.3-5.07 11.3-11.3 0-3.02-1.18-5.86-3.31-8ZM12.1 21.3h-.01a9.38 9.38 0 0 1-4.78-1.31l-.34-.2-3.56.93.95-3.46-.22-.35A9.37 9.37 0 0 1 2.7 11.9c0-5.18 4.22-9.4 9.41-9.4 2.51 0 4.86.98 6.63 2.75a9.34 9.34 0 0 1 2.74 6.65c0 5.18-4.21 9.4-9.38 9.4Zm5.15-7.02c-.28-.14-1.65-.81-1.9-.9-.26-.1-.44-.14-.63.14-.18.28-.72.9-.88 1.08-.16.19-.32.21-.6.07-1.64-.81-2.72-1.45-3.8-3.31-.29-.5.3-.45.81-1.5.1-.18.01-.34-.06-.47-.07-.14-.63-1.51-.86-2.06-.23-.55-.46-.47-.63-.48h-.54c-.18 0-.47.07-.72.34-.25.28-.94.92-.94 2.23s.97 2.58 1.1 2.76c.14.18 1.91 2.92 4.64 4.1.65.28 1.16.45 1.55.58.65.2 1.24.17 1.7.1.52-.08 1.65-.68 1.88-1.34.23-.65.23-1.2.16-1.33-.07-.12-.25-.2-.53-.34Z" />
              </svg>
            </a>
            <a
              v-if="instagramUrl"
              :href="instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <svg
                class="footer-social-instagram"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.4" cy="6.6" r=".8" class="footer-social-dot" />
              </svg>
            </a>
            <a
              v-if="facebookUrl"
              :href="facebookUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.8 21v-8h2.7l.4-3.1h-3.1V7.92c0-.9.25-1.51 1.54-1.51H17V3.64A22.6 22.6 0 0 0 14.7 3.5c-2.28 0-3.84 1.39-3.84 3.95V9.9H8.3V13h2.56v8h2.94Z" />
              </svg>
            </a>
            <a
              v-if="tiktokUrl"
              :href="tiktokUrl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              title="TikTok"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.8 3c.3 2.1 1.5 3.4 3.6 3.5v3.1a6.8 6.8 0 0 1-3.5-1v6.5a5.96 5.96 0 1 1-5.15-5.9v3.2a2.85 2.85 0 1 0 2 2.7V3h3Z" />
              </svg>
            </a>
          </nav>
        </div>
        <div>
          <h2>Ayuda</h2>
          <NuxtLink to="/informacion-envios">Información de envíos</NuxtLink>
          <NuxtLink to="/cambios-devoluciones"
            >Cambios, devoluciones y garantías</NuxtLink
          >
          <NuxtLink to="/guia-de-perfumes">Guía de perfumes</NuxtLink>
          <a
            v-if="store.contactEmail"
            :href="`mailto:${store.contactEmail}`"
            >Contacto</a
          >
          <a
            v-else-if="contactWhatsappUrl"
            :href="contactWhatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            >Contacto por WhatsApp</a
          >
        </div>
        <div>
          <h2>Políticas</h2>
          <NuxtLink to="/politica-de-privacidad"
            >Política de privacidad</NuxtLink
          >
          <NuxtLink to="/terminos-y-condiciones"
            >Términos y condiciones</NuxtLink
          >
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
