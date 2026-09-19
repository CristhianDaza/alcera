<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name?: string; compactOnMobile?: boolean }>(),
  { name: "ALCÉRA", compactOnMobile: false },
);
const compactName = computed(() =>
  props.name.replace(/\s+perfumes$/i, "").trim(),
);
</script>

<template>
  <span
    class="brand-mark"
    :class="{ 'brand-mark--compact-mobile': compactOnMobile }"
    aria-label="Alcéra Perfumes"
  >
    <svg class="brand-mark__symbol" viewBox="0 0 46 46" aria-hidden="true">
      <path d="M9 35 23 7l14 28M15 25h16" />
      <path class="brand-mark__curve" d="M35 12c-7-4-15 1-15 11s8 15 15 11" />
    </svg>
    <span class="brand-mark__type">
      <span class="brand-mark__name-full">{{ compactName }}</span>
      <span class="brand-mark__name-compact">{{ compactName }}</span>
    </span>
    <span class="brand-mark__descriptor">PERFUMES</span>
  </span>
</template>
