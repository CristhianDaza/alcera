<script setup lang="ts">
const router = useRouter();
const route = useRoute();

const isOpen = ref(false);
const query = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

const { data: products } = await useFetch("/api/products");

const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

const results = computed(() => {
  const q = normalize(query.value);
  if (!q || q.length < 2) return [];
  return (products.value ?? [])
    .filter((p) =>
      normalize(`${p.name} ${p.brand} ${p.family ?? ""}`).includes(q),
    )
    .slice(0, 6);
});

const hasResults = computed(() => results.value.length > 0);
const showDropdown = computed(() => isOpen.value && query.value.length >= 2);

function open() {
  isOpen.value = true;
  nextTick(() => inputRef.value?.focus());
}

function close() {
  isOpen.value = false;
  query.value = "";
}

function submit() {
  const q = query.value.trim();
  if (!q) return;
  router.push({ path: "/catalogo", query: { q } });
  close();
}

function selectProduct(slug: string) {
  router.push(`/perfumes/${slug}`);
  close();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
  if (e.key === "Enter") submit();
}

function handleInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value;
}

function handleClickOutside(e: MouseEvent | TouchEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("touchstart", handleClickOutside, {
    passive: true,
  });
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  document.removeEventListener("touchstart", handleClickOutside);
});

watch(() => route.fullPath, close);

const minPrice = (p: { variants: { price: number }[] }) =>
  Math.min(...p.variants.map((v) => v.price));

const fmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
</script>

<template>
  <Teleport to="body">
    <Transition name="hs-backdrop">
      <div
        v-if="isOpen"
        class="hs-backdrop"
        aria-hidden="true"
        @click="close"
        @touchstart.passive="close"
      />
    </Transition>
  </Teleport>

  <div ref="rootRef" class="hs-root" :class="{ 'hs-root--open': isOpen }">
    <button
      v-if="!isOpen"
      class="hs-trigger"
      aria-label="Abrir buscador"
      @click="open"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5 21 21" stroke-linecap="round" />
      </svg>
    </button>

    <div v-else class="hs-field">
      <svg
        class="hs-icon"
        viewBox="0 0 24 24"
        width="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5 21 21" stroke-linecap="round" />
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        inputmode="search"
        class="hs-input"
        placeholder="Buscar perfumes…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Buscar perfumes"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <button class="hs-close" aria-label="Cerrar buscador" @click="close">
        <svg
          viewBox="0 0 24 24"
          width="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <Transition name="hs-drop">
      <div
        v-if="showDropdown"
        class="hs-dropdown"
        role="listbox"
        aria-label="Resultados de búsqueda"
      >
        <template v-if="hasResults">
          <button
            v-for="p in results"
            :key="p.id"
            class="hs-item"
            role="option"
            @click="selectProduct(p.slug)"
          >
            <span class="hs-item-img">
              <img
                v-if="p.images?.[0]"
                :src="p.images[0].url"
                :alt="p.images[0].alt || p.name"
                loading="lazy"
              />
              <svg
                v-else
                viewBox="0 0 24 24"
                width="18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                opacity=".4"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </span>
            <span class="hs-item-body">
              <span class="hs-item-name">{{ p.name }}</span>
              <span class="hs-item-meta">
                <span class="hs-item-brand">{{ p.brand }}</span>
                <span class="hs-item-price">{{ fmt.format(minPrice(p)) }}</span>
              </span>
            </span>
          </button>
          <button class="hs-see-all" @click="submit">
            Ver todos para "{{ query }}"
            <svg
              viewBox="0 0 24 24"
              width="13"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </template>
        <div v-else class="hs-empty">Sin resultados para "{{ query }}"</div>
      </div>
    </Transition>
  </div>
</template>
