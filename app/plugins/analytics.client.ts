import {
  initializeStoreAnalytics,
  trackAnalyticsEvent,
} from "~/utils/analytics";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public;
  initializeStoreAnalytics({
    apiKey: String(config.firebaseApiKey || ""),
    authDomain: String(config.firebaseAuthDomain || ""),
    projectId: String(config.firebaseProjectId || ""),
    appId: String(config.firebaseAppId || ""),
    measurementId: String(config.firebaseMeasurementId || ""),
  });

  const router = useRouter();
  let lastLocation = "";
  nuxtApp.hook("page:finish", () => {
    const route = router.currentRoute.value;
    const pageLocation = window.location.href;
    if (pageLocation === lastLocation) return;
    lastLocation = pageLocation;
    void trackAnalyticsEvent("page_view", {
      page_title: document.title,
      page_location: pageLocation,
      page_path: route.fullPath,
    });
  });
});
