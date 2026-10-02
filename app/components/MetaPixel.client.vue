<script setup lang="ts">
const { consent, hydrateConsent } = useCookieConsent();
const route = useRoute();
const pixelId = "1117452117477934";
const scriptId = "meta-pixel-script";

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

function enableMetaPixel() {
  const target = fbqWindow();
  if (target.fbq) return;

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
  fbq("init", pixelId);
  fbq("track", "PageView");

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

onMounted(() => {
  hydrateConsent();
  watch(
    consent,
    (value) => {
      if (value === "accepted") enableMetaPixel();
    },
    { immediate: true },
  );

  watch(
    () => route.fullPath,
    () => {
      if (consent.value === "accepted" && document.getElementById(scriptId)) {
        fbqWindow().fbq?.("track", "PageView");
      }
    },
  );
});
</script>

<template><span aria-hidden="true" /></template>
