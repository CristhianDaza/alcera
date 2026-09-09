<script setup lang="ts">
import type { Product } from "#shared/types";

type Budget = "under250" | "250to450" | "over450";
type Answers = {
  category: string;
  family: string;
  intensity: "soft" | "balanced" | "intense";
  occasion: "day" | "night" | "all";
  style: "classic" | "sweet" | "magnetic" | "fresh";
  budget: Budget;
};

const props = defineProps<{ products: Product[] }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ complete: [productIds: string[]] }>();
const storageKey = "alcera-perfume-finder";
const step = ref(0);
const answers = ref<Partial<Answers>>({});

const familyOptions = computed(() => {
  const families = [
    ...new Set(props.products.map((product) => product.family).filter(Boolean)),
  ];
  return families.length
    ? families
    : ["Cítrica", "Floral", "Amaderada", "Oriental"];
});
const questions = computed(() => [
  {
    key: "category",
    title: "¿Para quién buscas el perfume?",
    options: [
      ["Hombre", "Hombre"],
      ["Mujer", "Mujer"],
      ["Unisex", "Unisex"],
    ],
  },
  {
    key: "family",
    title: "¿Qué tipo de aroma te atrae más?",
    options: familyOptions.value.map((family) => [family, family]),
  },
  {
    key: "intensity",
    title: "¿Qué tan fuerte quieres que se sienta?",
    options: [
      ["soft", "Suave y discreto"],
      ["balanced", "Equilibrado"],
      ["intense", "Intenso, que deje huella"],
    ],
  },
  {
    key: "occasion",
    title: "¿Para qué momento lo usarás más?",
    options: [
      ["day", "Día a día"],
      ["night", "Noches y ocasiones especiales"],
      ["all", "Para todo, sin distinción"],
    ],
  },
  {
    key: "style",
    title: "¿Qué frase te describe mejor?",
    options: [
      ["classic", "Clásica, elegante y atemporal"],
      ["sweet", "Dulce, divertida y juvenil"],
      ["magnetic", "Segura, intensa y magnética"],
      ["fresh", "Relajada, natural y fresca"],
    ],
  },
  {
    key: "budget",
    title: "¿Qué presupuesto tienes en mente?",
    options: [
      ["under250", "Menos de $250 mil"],
      ["250to450", "Entre $250 mil y $450 mil"],
      ["over450", "Más de $450 mil"],
    ],
  },
]);

function startingPrice(product: Product) {
  return Math.min(...product.variants.map((variant) => variant.price));
}
function includesValue(value: string | undefined, terms: string[]) {
  return terms.some((term) => value?.toLocaleLowerCase().includes(term));
}
function score(product: Product) {
  const family = product.family?.toLocaleLowerCase();
  const category = product.category.toLocaleLowerCase();
  const price = startingPrice(product);
  let value = Number(product.featured);
  if (category === answers.value.category?.toLocaleLowerCase()) value += 6;
  else if (category === "unisex") value += 2;
  if (family === answers.value.family?.toLocaleLowerCase()) value += 7;

  const budget = answers.value.budget;
  if (
    (budget === "under250" && price < 250000) ||
    (budget === "250to450" && price >= 250000 && price <= 450000) ||
    (budget === "over450" && price > 450000)
  )
    value += 5;

  const projection =
    `${product.projection || ""} ${product.duration || ""}`.toLocaleLowerCase();
  if (
    answers.value.intensity === "intense" &&
    (includesValue(projection, ["alta", "intensa", "larga"]) ||
      ["oriental", "amaderada"].includes(family || ""))
  )
    value += 3;
  if (
    answers.value.intensity === "soft" &&
    (includesValue(projection, ["suave", "baja", "media"]) ||
      ["cítrica", "floral"].includes(family || ""))
  )
    value += 3;
  if (answers.value.intensity === "balanced") value += 2;

  if (
    answers.value.occasion === "day" &&
    ["cítrica", "floral"].includes(family || "")
  )
    value += 3;
  if (
    answers.value.occasion === "night" &&
    ["oriental", "amaderada"].includes(family || "")
  )
    value += 3;
  if (answers.value.occasion === "all" && category === "unisex") value += 3;
  if (
    answers.value.style === "classic" &&
    ["amaderada", "oriental"].includes(family || "")
  )
    value += 3;
  if (
    answers.value.style === "sweet" &&
    ["floral", "oriental"].includes(family || "")
  )
    value += 3;
  if (
    answers.value.style === "magnetic" &&
    ["oriental", "amaderada"].includes(family || "")
  )
    value += 3;
  if (
    answers.value.style === "fresh" &&
    ["cítrica", "floral"].includes(family || "")
  )
    value += 3;
  return value;
}
const results = computed(() =>
  [...props.products].sort((a, b) => score(b) - score(a)).slice(0, 3),
);

function choose(key: keyof Answers, value: string) {
  answers.value[key] = value as never;
  window.setTimeout(() => {
    step.value += 1;
  }, 180);
}
function close() {
  open.value = false;
}
function restart() {
  step.value = 0;
  answers.value = {};
}
function saveResults() {
  const productIds = results.value.map((product) => product.id);
  localStorage.setItem(
    storageKey,
    JSON.stringify({ productIds, savedAt: Date.now() }),
  );
  emit("complete", productIds);
}
watch(open, (isOpen) => {
  if (isOpen) restart();
});
watch(step, (currentStep) => {
  if (currentStep === questions.value.length) saveResults();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="finder-fade">
      <div v-if="open" class="finder-backdrop" @click.self="close">
        <section
          class="finder-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finder-title"
          @keydown.esc="close"
        >
          <button
            class="finder-close"
            type="button"
            aria-label="Cerrar buscador"
            @click="close"
          >
            ×
          </button>
          <div class="finder-progress" aria-hidden="true">
            <span :style="{ width: `${(Math.min(step, 6) / 6) * 100}%` }" />
          </div>
          <div class="finder-bottle" aria-hidden="true">
            <i /><b
              :style="{ height: `${(Math.min(step, 6) / 6) * 100}%` }"
            /><em>✦</em>
          </div>

          <template v-if="step < questions.length">
            <span class="eyebrow">TU PERFUME IDEAL · {{ step + 1 }} DE 6</span>
            <h2 id="finder-title">{{ questions[step]?.title }}</h2>
            <div class="finder-options">
              <button
                v-for="option in questions[step]?.options"
                :key="option[0]"
                type="button"
                @click="
                  choose(questions[step]!.key as keyof Answers, option[0] || '')
                "
              >
                {{ option[1] }} <span>↗</span>
              </button>
            </div>
          </template>

          <template v-else>
            <span class="eyebrow">TU SELECCIÓN PERSONAL</span>
            <h2 id="finder-title">Perfumes hechos para <em>ti.</em></h2>
            <p class="finder-intro">
              Seleccionamos estas fragancias según lo que nos contaste.
            </p>
            <div class="finder-results">
              <NuxtLink
                v-for="product in results"
                :key="product.id"
                :to="`/perfumes/${product.slug}`"
                @click="close"
              >
                <img
                  :src="product.images[0]?.url"
                  :alt="product.images[0]?.alt || product.name"
                  loading="lazy"
                  decoding="async"
                  width="58"
                  height="62"
                />
                <span
                  ><small>{{ product.brand }}</small
                  ><strong>{{ product.name }}</strong
                  ><em>{{ product.family || product.category }}</em></span
                >
                <b aria-hidden="true">↗</b>
              </NuxtLink>
            </div>
            <div class="finder-result-actions">
              <button class="text-link" type="button" @click="restart">
                Repetir preguntas
              </button>
              <NuxtLink class="button" to="/" @click="close"
                >Ver mi selección en Inicio</NuxtLink
              >
            </div>
          </template>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.finder-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 22px;
  background: #2117139c;
}
.finder-modal {
  position: relative;
  width: min(100%, 680px);
  max-height: min(760px, calc(100vh - 44px));
  overflow: auto;
  padding: 44px 50px 48px;
  background: var(--paper);
  box-shadow: 0 24px 60px #120c0a59;
}
.finder-close {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 38px;
  height: 38px;
  border: 0;
  background: none;
  color: var(--ink);
  font-size: 29px;
  line-height: 1;
  cursor: pointer;
}
.finder-progress {
  height: 2px;
  margin: 0 0 32px;
  background: var(--line);
}
.finder-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.35s ease;
}
.finder-bottle {
  position: relative;
  width: 62px;
  height: 78px;
  margin: 0 auto 22px;
  overflow: hidden;
  border: 2px solid var(--ink);
  border-radius: 12px 12px 18px 18px;
}
.finder-bottle i {
  position: absolute;
  top: -15px;
  left: 17px;
  width: 24px;
  height: 16px;
  border: 2px solid var(--ink);
  background: var(--paper);
}
.finder-bottle b {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--accent-soft);
  transition: height 0.42s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.finder-bottle em {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  color: #fff;
  font-style: normal;
  opacity: 0.8;
}
.finder-modal > .eyebrow,
.finder-modal > h2,
.finder-intro {
  display: block;
  max-width: 510px;
  margin-right: auto;
  margin-left: auto;
  text-align: center;
}
.finder-modal h2 {
  margin-top: 8px;
  font-size: clamp(34px, 5vw, 50px);
}
.finder-intro {
  margin-bottom: 24px;
  color: var(--muted);
  font-size: 14px;
}
.finder-options {
  display: grid;
  gap: 10px;
  max-width: 510px;
  margin: 29px auto 0;
}
.finder-options button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 14px 17px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s;
}
.finder-options button:hover {
  border-color: var(--accent-soft);
  background: var(--surface);
  transform: translateX(3px);
}
.finder-options button span {
  color: var(--accent);
}
.finder-results {
  display: grid;
  gap: 9px;
}
.finder-results a {
  display: grid;
  grid-template-columns: 58px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
}
.finder-results a:hover {
  border-color: var(--accent-soft);
  background: var(--surface);
}
.finder-results img {
  width: 58px;
  height: 62px;
  object-fit: contain;
  background: #fff;
}
.finder-results span {
  display: grid;
  gap: 3px;
}
.finder-results small {
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.6px;
}
.finder-results strong {
  font-family: "Libre Caslon Display", serif;
  font-size: 20px;
  font-weight: 400;
}
.finder-results em {
  color: var(--muted);
  font-size: 10px;
  font-style: normal;
}
.finder-results > a > b {
  color: var(--accent);
  font-weight: 400;
}
.finder-result-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-top: 25px;
}
.finder-result-actions .text-link {
  cursor: pointer;
}
.finder-fade-enter-active,
.finder-fade-leave-active {
  transition: opacity 0.2s ease;
}
.finder-fade-enter-from,
.finder-fade-leave-to {
  opacity: 0;
}
@media (max-width: 700px) {
  .finder-backdrop {
    padding: 12px;
  }
  .finder-modal {
    max-height: calc(100vh - 24px);
    padding: 36px 22px 28px;
  }
  .finder-modal h2 {
    font-size: 34px;
  }
  .finder-progress {
    margin-bottom: 24px;
  }
  .finder-options {
    margin-top: 22px;
  }
  .finder-options button {
    min-height: 54px;
    font-size: 14px;
  }
  .finder-result-actions {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 4px;
  }
  .finder-result-actions .button {
    width: 100%;
  }
  .finder-result-actions .text-link {
    justify-content: center;
  }
  .finder-results strong {
    font-size: 18px;
  }
}
</style>
