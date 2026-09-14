<script setup lang="ts">
import { seoLanding } from "#shared/seo-landings";

const route = useRoute();
const landing = seoLanding("familias", route.params.slug);
if (!landing)
  throw createError({
    statusCode: 404,
    statusMessage: "Familia no encontrada",
  });
</script>

<template>
  <SeoCollectionLanding :landing="landing" />
</template>
