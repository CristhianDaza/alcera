<script setup lang="ts">
import type { Product } from "#shared/types";
import { money } from "#shared/commerce";

const props = defineProps<{ product: Product; index?: number }>();
const route = useRoute();
const availableVariants = computed(() =>
  props.product.variants.filter((variant) => variant.available),
);
const startingPrice = computed(() =>
  Math.min(
    ...(availableVariants.value.length
      ? availableVariants.value
      : props.product.variants
    ).map((variant) => variant.price),
  ),
);
</script>

<template>
  <NuxtLink
    :to="{
      path: '/perfumes/' + product.slug,
      query: route.path === '/catalogo' ? route.query : {},
    }"
    class="product-card"
  >
    <div class="product-photo">
      <img
        :src="product.images[0]?.url"
        :srcset="imageSources(product.images[0]?.url || '')"
        sizes="(max-width: 700px) 45vw, 23vw"
        :alt="product.images[0]?.alt || product.name"
        loading="lazy"
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
        width="650"
        height="800"
      />
      <span class="product-tag">{{ product.brand }}</span>
      <span class="product-arrow" aria-hidden="true">↗</span>
    </div>
    <div class="product-card__details">
      <div class="product-meta">
        <span>{{ product.category }}</span>
        <span v-if="product.concentration">{{ product.concentration }}</span>
      </div>
      <h3>{{ product.name }}</h3>
      <p
        v-if="product.duration || product.projection"
        class="product-performance"
      >
        <span v-if="product.duration">Duración: {{ product.duration }}</span>
        <span v-if="product.projection"
          >Proyección: {{ product.projection }}</span
        >
      </p>
      <div class="product-bottom">
        <span>Desde {{ money(startingPrice) }}</span>
        <span>{{
          product.variants.some((variant) => variant.available)
            ? "Ver perfume ↗"
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
  margin: -3px 0 10px;
  color: var(--muted);
  font-size: 11px;
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
