import {
  initializeStoreAnalytics,
  setStoreAnalyticsConsent,
  trackAnalyticsEvent,
} from "~/utils/analytics";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public;
  const { consent, hydrateConsent } = useCookieConsent();
  hydrateConsent();

  const router = useRouter();
  let lastLocation = "";
  function trackPageView() {
    const route = router.currentRoute.value;
    const pageLocation = window.location.href;
    if (pageLocation === lastLocation) return;
    lastLocation = pageLocation;
    void trackAnalyticsEvent("page_view", {
      page_title: document.title,
      page_location: pageLocation,
      page_path: route.fullPath,
    });
  }

  function applyConsent(accepted: boolean) {
    setStoreAnalyticsConsent(accepted);
    if (!accepted) return;

    initializeStoreAnalytics({
      apiKey: String(config.firebaseApiKey || ""),
      authDomain: String(config.firebaseAuthDomain || ""),
      projectId: String(config.firebaseProjectId || ""),
      appId: String(config.firebaseAppId || ""),
      measurementId: String(config.firebaseMeasurementId || ""),
    });
    lastLocation = "";
    trackPageView();
  }

  watch(consent, (value) => applyConsent(value === "accepted"), {
    immediate: true,
  });
  nuxtApp.hook("page:finish", trackPageView);
});
