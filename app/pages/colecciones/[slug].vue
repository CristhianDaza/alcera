<script setup lang="ts">
import { seoLanding } from "#shared/seo-landings";

const route = useRoute();
const landing = seoLanding("colecciones", route.params.slug);
if (!landing)
  throw createError({
    statusCode: 404,
    statusMessage: "Colección no encontrada",
  });
</script>

<template>
  <SeoCollectionLanding :landing="landing" />
</template>
