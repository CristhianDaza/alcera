<script setup lang="ts">
import { siteBase, serializeSchema } from "#shared/seo";
import { money } from "#shared/commerce";
import type { Product } from "#shared/types";

const route = useRoute();
const { data: product, error } = await useFetch<Product>(
  "/api/products/" + route.params.slug,
);
if (error.value || !product.value)
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: "No encontramos este perfume",
  });

const p = product.value;
const selected = ref(
  p.variants.find((variant) => variant.available)?.id || p.variants[0]!.id,
);
const photo = ref(0);
const added = ref(false);
const variant = computed(() =>
  p.variants.find((item) => item.id === selected.value)!,
);
const { add } = useCart();
usePageSeo(
  p.name + " de " + p.brand + " · " + useStore().value.name,
  p.aromaDescription || p.description,
  p.images[0]?.url,
  { imageAlt: p.images[0]?.alt || `${p.name} de ${p.brand}` },
);

const { data: relatedProducts } = await useFetch<Product[]>(
  "/api/products/" + p.slug + "/related",
  { default: () => [] },
);

function colombiaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

function nextBusinessDay(date: Date) {
  const next = new Date(date);
  do next.setUTCDate(next.getUTCDate() + 1);
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  return next;
}

const deliveryFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});
const firstDeliveryDate = nextBusinessDay(colombiaToday());
const secondDeliveryDate = nextBusinessDay(firstDeliveryDate);
const medellinDelivery = deliveryFormatter.format(firstDeliveryDate);
const colombiaDeliveryStart = deliveryFormatter.format(firstDeliveryDate);
const colombiaDeliveryEnd = deliveryFormatter.format(secondDeliveryDate);

const base = siteBase(useRuntimeConfig().public.siteUrl);
useHead({
  script: [
    {
      key: "product-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": base + "/perfumes/" + p.slug + "#product",
        url: base + "/perfumes/" + p.slug,
        mainEntityOfPage: base + "/perfumes/" + p.slug,
        sku: p.id,
        category: p.category,
        name: p.name,
        description: p.description,
        image: p.images.map((image) => image.url),
        brand: { "@type": "Brand", name: p.brand },
        additionalProperty: [
          ...(p.concentration
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Concentración",
                  value: p.concentration,
                },
              ]
            : []),
          ...(p.duration
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Duración",
                  value: p.duration,
                },
              ]
            : []),
          ...(p.projection
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Proyección",
                  value: p.projection,
                },
              ]
            : []),
        ],
        offers: p.variants.map((item) => ({
          "@type": "Offer",
          name: p.name + " " + item.size,
          seller: { "@id": base + "/#organization" },
          sku: p.id + "-" + item.id,
          price: item.price,
          priceCurrency: "COP",
          availability:
            "https://schema.org/" + (item.available ? "InStock" : "OutOfStock"),
          url: base + "/perfumes/" + p.slug,
        })),
      }),
    },
  ],
});
useHead({
  script: [
    {
      key: "breadcrumbs",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
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
            name: "Perfumes",
            item: base + "/catalogo",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: p.name,
            item: base + "/perfumes/" + p.slug,
          },
        ],
      }),
    },
  ],
});
</script>

<template>
  <section class="shell section">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <NuxtLink to="/catalogo">Perfumes</NuxtLink> /
      <span aria-current="page">{{ p.name }}</span>
    </nav>
    <NuxtLink class="text-link" :to="{ path: '/catalogo', query: route.query }"
      >← Volver a la colección</NuxtLink
    >
    <article class="detail">
      <div>
        <div class="detail-photo">
          <img
            :src="p.images[photo]?.url"
            :alt="p.images[photo]?.alt || p.name"
            :srcset="imageSources(p.images[photo]?.url || '')"
            sizes="(max-width: 700px) 100vw, 50vw"
            fetchpriority="high"
            decoding="async"
            width="900"
            height="1100"
          />
        </div>
        <div v-if="p.images.length > 1" class="thumbnails">
          <button
            v-for="(image, index) in p.images"
            :key="image.url"
            :aria-label="'Ver imagen ' + (index + 1)"
            :aria-pressed="photo === index"
            @click="photo = index"
          >
            <img
              :src="image.url"
              alt=""
              loading="lazy"
              decoding="async"
              width="90"
              height="110"
            />
          </button>
        </div>
      </div>

      <div class="detail-copy">
        <span class="eyebrow">{{ p.brand }}</span>
        <h1>{{ p.name }}</h1>
        <div class="pills">
          <span>{{ p.category }}</span>
          <span v-for="family in p.family" :key="family">{{ family }}</span>
          <span v-if="p.concentration">{{ p.concentration }}</span>
        </div>
        <p class="description">{{ p.description }}</p>

        <div class="purchase-panel">
          <h2>Elige tu presentación</h2>
          <div class="variants">
            <button
              v-for="item in p.variants"
              :key="item.id"
              :class="{ selected: selected === item.id }"
              :aria-pressed="selected === item.id"
              @click="
                selected = item.id;
                added = false;
              "
            >
              {{ item.size
              }}<small>{{ item.available ? "Disponible" : "Agotado" }}</small>
            </button>
          </div>
          <p class="price">{{ money(variant.price) }} <small>COP</small></p>
          <button
            class="button full"
            :disabled="!variant.available"
            @click="
              add(p, variant);
              added = true;
            "
          >
            {{
              !variant.available
                ? "Presentación agotada"
                : added
                  ? "Añadir otra unidad"
                  : "Añadir a mi bolsa"
            }}
            <span>＋</span>
          </button>
          <p v-if="added" class="added-notice" role="status">
            Añadido a tu bolsa.
            <NuxtLink class="text-link" to="/carrito">Ver bolsa ↗</NuxtLink>
          </p>
          <p class="muted">
            Finaliza tu consulta por WhatsApp.<br />Envío y forma de pago a
            convenir.
          </p>
        </div>

        <section v-if="p.aromaDescription" class="aroma-description">
          <h2 class="eyebrow">¿A QUÉ HUELE?</h2>
          <p>{{ p.aromaDescription }}</p>
        </section>

        <section v-if="p.olfactoryPyramid || p.notes.length" class="notes">
          <h2 class="eyebrow">SU UNIVERSO OLFATIVO</h2>
          <div v-if="p.olfactoryPyramid" class="olfactory-pyramid">
            <div v-if="p.olfactoryPyramid.top.length">
              <strong>Salida</strong
              ><span>{{ p.olfactoryPyramid.top.join(", ") }}</span>
            </div>
            <div v-if="p.olfactoryPyramid.heart.length">
              <strong>Corazón</strong
              ><span>{{ p.olfactoryPyramid.heart.join(", ") }}</span>
            </div>
            <div v-if="p.olfactoryPyramid.base.length">
              <strong>Fondo</strong
              ><span>{{ p.olfactoryPyramid.base.join(", ") }}</span>
            </div>
          </div>
          <div v-else class="note-list">
            <span v-for="note in p.notes" :key="note">{{ note }}</span>
          </div>
        </section>

        <dl v-if="p.duration || p.projection" class="performance">
          <div v-if="p.duration">
            <dt>Duración</dt><dd>{{ p.duration }}</dd>
          </div>
          <div v-if="p.projection">
            <dt>Proyección</dt><dd>{{ p.projection }}</dd>
          </div>
        </dl>

        <section v-if="p.idealFor?.length" class="ideal-for">
          <h2 class="eyebrow">IDEAL PARA</h2>
          <ul>
            <li v-for="item in p.idealFor" :key="item">{{ item }}</li>
          </ul>
        </section>
      </div>
    </article>

    <section class="delivery-estimate" aria-labelledby="delivery-title">
      <span class="eyebrow">ENTREGA ESTIMADA</span>
      <h2 id="delivery-title">Tu perfume, más cerca.</h2>
      <p><strong>Medellín:</strong> recíbelo el {{ medellinDelivery }}.</p>
      <p>
        <strong>Colombia:</strong> entrega estimada entre el
        {{ colombiaDeliveryStart }} y el {{ colombiaDeliveryEnd }}.
      </p>
    </section>

    <aside
      v-if="relatedProducts.length"
      class="related-products"
      aria-labelledby="related-title"
    >
      <div class="section-heading">
        <div>
          <span class="eyebrow">SIGUE DESCUBRIENDO</span>
          <h2 id="related-title">También te pueden <em>interesar.</em></h2>
        </div>
        <NuxtLink class="text-link" to="/catalogo">Ver colección ↗</NuxtLink>
      </div>
      <div class="product-grid">
        <ProductCard
          v-for="item in relatedProducts"
          :key="item.id"
          :product="item"
        />
      </div>
    </aside>
  </section>
</template>

<style scoped>
.aroma-description {
  margin: 0 0 26px;
}
.aroma-description .eyebrow,
.ideal-for .eyebrow {
  margin-bottom: 10px;
}
.aroma-description p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
.olfactory-pyramid {
  display: grid;
  gap: 11px;
}
.olfactory-pyramid div {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px;
  font-size: 12px;
}
.olfactory-pyramid strong {
  color: var(--accent);
  font-weight: 600;
}
.note-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 12px;
}
.performance {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  margin-top: 27px;
  background: var(--line);
}
.performance div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 15px;
  background: var(--surface);
}
.performance dt {
  color: var(--muted);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.performance dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}
.ideal-for {
  margin-top: 27px;
}
.ideal-for ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12px;
}
.ideal-for li + li {
  margin-top: 4px;
}
.delivery-estimate {
  margin-top: 65px;
  padding: 29px 32px;
  background: var(--surface);
  border-left: 3px solid var(--accent-soft);
}
.delivery-estimate .eyebrow {
  margin-bottom: 10px;
}
.delivery-estimate h2 {
  margin: 0 0 13px;
  font-size: 30px;
}
.delivery-estimate p {
  margin: 4px 0;
  font-size: 12px;
}
.delivery-estimate strong {
  color: var(--ink);
}
.related-products {
  margin-top: 72px;
  padding-top: 60px;
  border-top: 1px solid var(--line);
}
.related-products .section-heading h2 {
  font-size: 42px;
}
@media (max-width: 700px) {
  .delivery-estimate {
    margin-top: 42px;
    padding: 24px;
  }
  .delivery-estimate h2,
  .related-products .section-heading h2 {
    font-size: 31px;
  }
  .related-products {
    margin-top: 48px;
    padding-top: 42px;
  }
}
@media (max-width: 700px) {
  .olfactory-pyramid div {
    grid-template-columns: 65px 1fr;
  }
}
</style>
