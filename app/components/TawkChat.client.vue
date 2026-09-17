<script setup lang="ts">
const store = useStore();
const { consent, hydrateConsent } = useCookieConsent();
const scriptId = "tawk-chat-script";
const scriptSource = "https://embed.tawk.to/6aa9516b0ae6783441905464/1k2imc35e";

type TawkApi = {
  showWidget?: () => void;
  hideWidget?: () => void;
  onLoad?: () => void;
};

function tawkApi() {
  return (window as typeof window & { Tawk_API?: TawkApi }).Tawk_API;
}

function enableTawk() {
  if (document.getElementById(scriptId)) {
    tawkApi()?.showWidget?.();
    return;
  }

  const target = window as typeof window & { Tawk_API?: TawkApi };
  target.Tawk_API ??= {};
  target.Tawk_API.onLoad = () => syncTawk(store.value.tawkEnabled);

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = scriptSource;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  document.head.appendChild(script);
}

function syncTawk(enabled: boolean) {
  if (enabled && consent.value === "accepted") enableTawk();
  else tawkApi()?.hideWidget?.();
}

onMounted(() => {
  hydrateConsent();
  watch(
    [() => store.value.tawkEnabled, consent],
    ([enabled]) => syncTawk(Boolean(enabled)),
    { immediate: true },
  );
});
</script>

<template><span aria-hidden="true" /></template>
