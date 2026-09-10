export default defineNuxtConfig({
  compatibilityDate: "2026-09-04",
  buildDir: ".nuxt",
  devtools: { enabled: false },
  css: ["~/assets/main.css"],
  runtimeConfig: {
    firebaseProjectId: "",
    firebaseClientEmail: "",
    firebasePrivateKey: "",
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    recaptchaEnterpriseProjectId: "",
    recaptchaEnterpriseApiKey: "",
    public: {
      demo: true,
      indexable: false,
      catalogDebug: false,
      siteUrl: "http://localhost:3000",
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      recaptchaEnterpriseSiteKey: "6LditrQtAAAAAJi5hbB9hIlsHDZMednvxW8Bau_Z",
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "es-CO" },
      title: "ALCÉRA · Perfumes",
      meta: [{ name: "theme-color", content: "#f8f2e9" }],
      script: [
        { src: "/theme-init.js", tagPosition: "head", tagPriority: "critical" },
      ],
      link: [
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;600;700&family=Libre+Caslon+Display&display=swap",
        },
      ],
    },
  },
  routeRules: {
    "/admin/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
    "/api/**": { headers: { "cache-control": "no-store" } },
    "/api/products/**": {
      headers: {
        "cache-control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
    "/api/settings": {
      headers: {
        "cache-control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  },
  typescript: { strict: true },
});
