export default defineNuxtConfig({
  compatibilityDate: '2026-09-04',
  buildDir: '.nuxt',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    firebaseProjectId: '', firebaseClientEmail: '', firebasePrivateKey: '',
    cloudinaryCloudName: '', cloudinaryApiKey: '', cloudinaryApiSecret: '',
    public: { demo: true, siteUrl: 'http://localhost:3000', firebaseApiKey: '', firebaseAuthDomain: '', firebaseProjectId: '' }
  },
  app: { head: { htmlAttrs: { lang: 'es-CO' }, title: 'ALCÉRA · Perfumes', meta: [{ name: 'theme-color', content: '#f8f2e9' }], script: [{ src: '/theme-init.js', tagPosition: 'head', tagPriority: 'critical' }], link: [{ rel: 'icon', href: '/favicon.svg' }] } },
  routeRules: { '/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } }, '/api/**': { headers: { 'Cache-Control': 'no-store' } } },
  typescript: { strict: true }
})
