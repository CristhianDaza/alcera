<script setup lang="ts">
import { enableMetaPixel, trackMetaPageView } from "~/utils/metaPixel";

const { consent, hydrateConsent } = useCookieConsent();
const store = useStore();
const route = useRoute();
const { public: publicConfig } = useRuntimeConfig();
const demo = String(publicConfig.demo) === "true";

function applyPixelConsent() {
  const accepted = consent.value === "accepted";
  if (
    enableMetaPixel(store.value.metaPixelId || "", accepted, demo) &&
    accepted
  )
    trackMetaPageView(window.location.href, demo);
}

onMounted(() => {
  hydrateConsent();
  watch([consent, () => store.value.metaPixelId], applyPixelConsent, {
    immediate: true,
  });
  watch(
    () => route.fullPath,
    () => {
      if (consent.value === "accepted")
        trackMetaPageView(window.location.href, demo);
    },
    { flush: "post" },
  );
});
</script>

<template><span aria-hidden="true" /></template>
