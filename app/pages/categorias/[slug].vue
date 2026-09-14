<script setup lang="ts">
import { seoLanding } from "#shared/seo-landings";

const route = useRoute();
const landing = seoLanding("categorias", route.params.slug);
if (!landing)
  throw createError({
    statusCode: 404,
    statusMessage: "Categoría no encontrada",
  });
</script>

<template>
  <SeoCollectionLanding :landing="landing" />
</template>
