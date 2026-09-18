<script setup lang="ts">
import type { Product } from "#shared/types";
import { money } from "#shared/commerce";

const props = defineProps<{
  product: Product;
  index?: number;
  priority?: boolean;
}>();
const availableVariants = computed(() =>
  props.product.variants.filter((variant) => variant.available),
);
const cardStatus = computed(() => {
  if (!availableVariants.value.length) return "Agotado";
  return props.product.occasions?.includes("Regalo")
    ? "Ideal para regalo"
    : "Disponible";
});
const startingPrice = computed(() =>
  Math.min(
    ...(availableVariants.value.length
      ? availableVariants.value
      : props.product.variants
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
    :to="`/perfumes/${product.slug}`"
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
      <span
        class="product-status"
        :class="{ 'product-status--sold-out': !availableVariants.length }"
        >{{ cardStatus }}</span
      >
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
        <span class="product-card__action">{{
          product.variants.some((variant) => variant.available)
            ? "Elegir presentación"
            : "AGOTADO"
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

.product-photo__alternate {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.25s ease;
}

@media (hover: hover) {
  .product-card:hover .product-photo__alternate {
    opacity: 1;
  }
}
</style>
