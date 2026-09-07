<script setup lang="ts">
const dark = ref(false);
let preference: MediaQueryList | undefined;
let chosen = false;
function applyTheme(value: boolean) {
  dark.value = value;
  document.documentElement.dataset.theme = value ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", value ? "#1d1513" : "#f8f2e9");
}
function followSystem(event: MediaQueryListEvent) {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("esencia-theme");
  } catch {
    /* Preferencia solo durante la sesión. */
  }
  if (!chosen && saved !== "light" && saved !== "dark")
    applyTheme(event.matches);
}
function toggle() {
  chosen = true;
  applyTheme(!dark.value);
  try {
    localStorage.setItem("esencia-theme", dark.value ? "dark" : "light");
  } catch {
    /* El selector funciona aunque el almacenamiento esté bloqueado. */
  }
}
onMounted(() => {
  applyTheme(document.documentElement.dataset.theme === "dark");
  preference = window.matchMedia("(prefers-color-scheme: dark)");
  preference.addEventListener("change", followSystem);
});
onBeforeUnmount(() => preference?.removeEventListener("change", followSystem));
</script>
<template>
  <button
    class="theme-toggle"
    type="button"
    aria-label="Modo oscuro"
    :aria-pressed="dark"
    title="Cambiar entre modo claro y oscuro"
    @click="toggle"
  >
    <svg
      class="theme-moon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
    </svg>
    <svg
      class="theme-sun"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
      />
    </svg>
  </button>
</template>
