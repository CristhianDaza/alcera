<script setup lang="ts">
const {
  consent,
  preferencesOpen,
  hydrateConsent,
  setConsent,
  closePreferences,
} = useCookieConsent();
const dialog = useTemplateRef<HTMLElement>("dialog");

const visible = computed(() => consent.value === null || preferencesOpen.value);

function acceptAll() {
  setConsent("accepted");
}

function necessaryOnly() {
  setConsent("rejected");
}

onMounted(() => {
  hydrateConsent();
});

watch(preferencesOpen, (open) => {
  if (!open) return;
  nextTick(() => dialog.value?.focus());
});
</script>

<template>
  <Transition name="cookie-panel">
    <section
      v-if="visible"
      ref="dialog"
      class="cookie-panel"
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-description"
      aria-modal="false"
      tabindex="-1"
      @keydown.esc="closePreferences"
    >
      <button
        v-if="consent !== null"
        class="cookie-panel__close"
        type="button"
        aria-label="Cerrar preferencias de cookies"
        @click="closePreferences"
      >
        ×
      </button>
      <span class="cookie-panel__eyebrow">Cookies y privacidad</span>
      <h2 id="cookie-title">Política de cookies</h2>
      <p id="cookie-description">
        Usamos cookies y tecnologías similares necesarias para guardar tu bolsa,
        tema y preferencias. Si nos autorizas, también podremos medir de forma
        general cómo se usa la tienda y activar el chat para atenderte mejor.
      </p>

      <div class="cookie-panel__actions">
        <button
          class="cookie-action cookie-action--primary"
          type="button"
          @click="acceptAll"
        >
          Aceptar opcionales
        </button>
        <button class="cookie-action" type="button" @click="necessaryOnly">
          Rechazar opcionales
        </button>
      </div>
      <p class="cookie-panel__note">
        Las cookies necesarias siempre permanecen activas. Puedes cambiar esta
        elección cuando quieras desde el pie de página.
      </p>
    </section>
  </Transition>
</template>
