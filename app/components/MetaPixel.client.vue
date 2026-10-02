<script setup lang="ts">
const { consent, hydrateConsent } = useCookieConsent();
const store = useStore();
const route = useRoute();
const scriptId = "meta-pixel-script";
const initializedPixelIds = new Set<string>();

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

function fbqWindow() {
  return window as typeof window & { fbq?: Fbq; _fbq?: Fbq };
}

function enableMetaPixel(pixelId: string) {
  if (!pixelId || initializedPixelIds.has(pixelId)) return;

  const target = fbqWindow();
  if (!target.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    target.fbq = fbq;
    target._fbq = fbq;
  }

  initializedPixelIds.add(pixelId);
  target.fbq("init", pixelId);
  target.fbq("track", "PageView");

  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
}

onMounted(() => {
  hydrateConsent();
  watch(
    [consent, () => store.value.metaPixelId],
    ([value, pixelId]) => {
      if (value === "accepted") enableMetaPixel(pixelId || "");
    },
    { immediate: true },
  );

  watch(
    () => route.fullPath,
    () => {
      const pixelId = store.value.metaPixelId;
      if (
        consent.value === "accepted" &&
        initializedPixelIds.has(pixelId) &&
        document.getElementById(scriptId)
      ) {
        fbqWindow().fbq?.("track", "PageView");
      }
    },
  );
});
</script>

<template><span aria-hidden="true" /></template>
