<script setup lang="ts">
const store = useStore();
const showBackToTop = ref(false);

const whatsappUrl = computed(() => {
  const number = store.value.whatsapp?.replace(/\D/g, "");
  if (!number) return "";

  const message = `Hola, quiero recibir asesoría sobre las fragancias de ${store.value.name}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
});

function updateScrollState() {
  showBackToTop.value = window.scrollY > 360;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });
});

onBeforeUnmount(() => window.removeEventListener("scroll", updateScrollState));
</script>

<template>
  <div class="floating-actions" aria-label="Acciones rápidas">
    <Transition name="floating-action">
      <button
        v-if="showBackToTop"
        class="floating-button floating-button--top"
        type="button"
        aria-label="Volver al inicio"
        title="Volver al inicio"
        @click="scrollToTop"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
        </svg>
        <span>Subir</span>
      </button>
    </Transition>
    <ProtectedWhatsAppLink
      v-if="whatsappUrl"
      class="floating-button floating-button--whatsapp"
      :url="whatsappUrl"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M27.1 4.8A15.35 15.35 0 0 0 16.1.25C7.63.25.74 7.14.74 15.61c0 2.7.7 5.34 2.04 7.67L.6 31.25l8.16-2.14a15.29 15.29 0 0 0 7.32 1.87h.01c8.46 0 15.35-6.89 15.35-15.36 0-4.1-1.6-7.95-4.34-10.84ZM16.1 28.39h-.01a12.7 12.7 0 0 1-6.48-1.78l-.46-.28-4.84 1.27 1.3-4.7-.3-.48a12.71 12.71 0 0 1-1.96-6.8c0-7.01 5.7-12.71 12.72-12.71 3.4 0 6.59 1.33 8.98 3.73a12.62 12.62 0 0 1 3.7 8.99c0 7.01-5.7 12.76-12.66 12.76Zm6.97-9.5c-.38-.19-2.23-1.1-2.58-1.22-.35-.13-.6-.19-.86.19-.25.38-.98 1.22-1.2 1.47-.22.25-.44.28-.82.1-2.25-1.12-3.73-2-5.21-4.54-.39-.67.39-.62 1.12-2.06.13-.25.06-.47-.03-.66-.1-.19-.86-2.07-1.17-2.84-.31-.74-.63-.64-.86-.65h-.73c-.25 0-.66.1-1.01.47-.35.38-1.33 1.3-1.33 3.16s1.36 3.66 1.55 3.91c.19.25 2.68 4.09 6.5 5.73.91.39 1.62.63 2.17.81.91.29 1.74.25 2.39.15.73-.11 2.23-.91 2.55-1.79.31-.88.31-1.64.22-1.79-.1-.16-.35-.25-.73-.44Z"
        />
      </svg>
      <span>WhatsApp</span>
    </ProtectedWhatsAppLink>
  </div>
</template>
