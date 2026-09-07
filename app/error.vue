<script setup lang="ts">
useSeoMeta({
  title: "Página no disponible · ALCÉRA",
  robots: "noindex, nofollow",
});
defineProps<{ error: { statusCode: number; statusMessage?: string } }>();
</script>
<template>
  <div class="shell empty">
    <span class="eyebrow">ALCÉRA · {{ error.statusCode }}</span>
    <h1>
      {{
        error.statusCode === 404
          ? "Este aroma aún no existe."
          : "Necesitamos un momento."
      }}
    </h1>
    <p>{{ error.statusMessage }}</p>
    <button class="button" @click="clearError({ redirect: '/catalogo' })">
      Volver a la colección ↗
    </button>
  </div>
</template>
