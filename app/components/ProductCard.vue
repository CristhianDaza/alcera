<script setup lang="ts">
import type { Product } from "#shared/types";
import { money } from "#shared/commerce";
import {
  catalogVariants,
  isDecantVariant,
  productHasDecants,
} from "#shared/catalog";

const props = defineProps<{
  product: Product;
  index?: number;
  priority?: boolean;
  variantType?: "bottle" | "decant";
}>();
const relevantVariants = computed(() =>
  props.variantType === "decant"
    ? props.product.variants.filter(isDecantVariant)
    : props.variantType === "bottle"
      ? props.product.variants.filter((variant) => !isDecantVariant(variant))
      : catalogVariants(props.product),
);
const availableVariants = computed(() =>
  relevantVariants.value.filter((variant) => variant.available),
);
const hasDecants = computed(() => productHasDecants(props.product));
const cardBadge = computed(() => {
  if (!availableVariants.value.length)
    return { label: "Agotado", tone: "sold-out" };
  if (props.product.newArrival) return { label: "Novedad", tone: "featured" };
  if (props.product.bestSeller)
    return { label: "Más vendido", tone: "featured" };
  if (props.product.occasions?.includes("Regalo"))
    return { label: "Ideal para regalo", tone: "default" };
  return null;
});
const availabilityLabel = computed(() =>
  availableVariants.value.length ? "Disponible" : "Agotado",
);
const startingPrice = computed(() =>
  Math.min(
    ...(availableVariants.value.length
      ? availableVariants.value
      : relevantVariants.value
    ).map((variant) => variant.price),
  ),
);
const route = useRoute();

function trackProductSelection() {
  void trackAnalyticsEvent("select_item", {
    item_list_id: route.path,
    item_list_name: document.title,
    items: [analyticsItem(props.product)],
  });
}
</script>

<template>
  <NuxtLink
    :to="{
      path: `/perfumes/${product.slug}`,
      query: variantType === 'decant' ? { formato: 'decant' } : undefined,
    }"
    class="product-card"
    @click="trackProductSelection"
  >
    <div class="product-photo">
      <img
        :src="product.images[0]?.url"
        :srcset="imageSources(product.images[0]?.url || '')"
        sizes="(max-width: 700px) 45vw, 23vw"
        :alt="product.images[0]?.alt || product.name"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'auto'"
        decoding="async"
        width="650"
        height="800"
      />
      <img
        v-if="product.images[1]"
        class="product-photo__alternate"
        :src="product.images[1].url"
        :srcset="imageSources(product.images[1].url)"
        sizes="(max-width: 700px) 45vw, 23vw"
        :alt="product.images[1].alt || product.name"
        loading="lazy"
        decoding="async"
        width="650"
        height="800"
      />
      <div v-if="cardBadge || hasDecants" class="product-badges">
        <span
          v-if="cardBadge"
          class="product-status"
          :class="`product-status--${cardBadge.tone}`"
          >{{ cardBadge.label }}</span
        >
        <span v-if="hasDecants" class="decant-tag">Decants</span>
      </div>
      <span class="product-tag">{{ product.brand }}</span>
    </div>
    <div class="product-card__details">
      <div class="product-meta">
        <span>{{ product.brand }}</span>
        <span v-if="product.concentration">{{ product.concentration }}</span>
      </div>
      <h3>{{ product.name }}</h3>
      <p
        v-if="product.family?.length || product.duration"
        class="product-performance"
      >
        <span v-if="product.family?.length">{{
          product.family.join(" · ")
        }}</span>
        <span v-if="product.duration">Duración {{ product.duration }}</span>
      </p>
      <div class="product-bottom">
        <strong>Desde {{ money(startingPrice) }}</strong>
        <span
          class="product-availability"
          :class="{
            'product-availability--sold-out': !availableVariants.length,
          }"
          >{{ availabilityLabel }}</span
        >
        <span class="product-card__action">{{
          availableVariants.length ? "Elegir presentación" : "AGOTADO"
        }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-performance {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: -3px 0 14px;
  color: var(--muted);
  font-size: 11px;
}

.product-performance span + span::before {
  content: "·";
  margin-right: 10px;
}

.product-availability {
  color: var(--muted);
  font-size: 11px;
}

.product-availability--sold-out {
  color: var(--error);
}

.product-photo__alternate {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.product-badges {
  position: absolute;
  z-index: 2;
  top: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 24px);
}
.product-badges .product-status,
.product-badges .decant-tag {
  position: static;
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 4px 8px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.decant-tag {
  background: var(--ink);
  color: var(--paper);
}

@media (hover: hover) {
  .product-card:hover .product-photo__alternate {
    opacity: 1;
  }
}
</style>
