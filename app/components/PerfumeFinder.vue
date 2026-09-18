<script setup lang="ts">
import type { Product } from "#shared/types";
import { catalogVariants } from "#shared/catalog";

type Budget = "under250" | "250to450" | "over450";
type Answers = {
  category: string;
  family: string;
  intensity: "soft" | "balanced" | "intense";
  occasion: "day" | "night" | "all";
  style: "classic" | "sweet" | "magnetic" | "fresh";
  budget: Budget;
};
type FinderOption = {
  value: string;
  label: string;
  detail: string;
};
type FinderQuestion = {
  key: keyof Answers;
  title: string;
  description: string;
  options: FinderOption[];
};

const props = defineProps<{ products: Product[] }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ complete: [productIds: string[]] }>();
const storageKey = "alcera-perfume-finder";
const step = ref(0);
const answers = ref<Partial<Answers>>({});
const isChoosing = ref(false);

const familyOptions = computed(() => {
  const families = [
    ...new Set(props.products.flatMap((product) => product.family ?? [])),
  ];
  return families.length
    ? families
    : ["Cítrica", "Floral", "Amaderada", "Oriental"];
});
const questions = computed<FinderQuestion[]>(() => [
  {
    key: "category",
    title: "¿Para quién buscas el perfume?",
    description: "Elegimos desde dónde empezar tu selección.",
    options: [
      { value: "Hombre", label: "Hombre", detail: "Aromas con carácter" },
      {
        value: "Mujer",
        label: "Mujer",
        detail: "Aromas que acompañan tu estilo",
      },
      {
        value: "Unisex",
        label: "Unisex",
        detail: "Sin etiquetas, solo afinidad",
      },
    ],
  },
  {
    key: "family",
    title: "¿Qué tipo de aroma te atrae más?",
    description: "La familia olfativa es la pista más importante.",
    options: familyOptions.value.map((family) => ({
      value: family,
      label: family,
      detail: familyDescription(family),
    })),
  },
  {
    key: "intensity",
    title: "¿Qué tan fuerte quieres que se sienta?",
    description: "Piensa en el rastro que quieres dejar.",
    options: [
      { value: "soft", label: "Suave y discreto", detail: "Cerca de la piel" },
      {
        value: "balanced",
        label: "Equilibrado",
        detail: "Presencia sin imponerse",
      },
      { value: "intense", label: "Intenso", detail: "Que deje huella" },
    ],
  },
  {
    key: "occasion",
    title: "¿Para qué momento lo usarás más?",
    description: "Una fragancia cambia con el plan y la hora.",
    options: [
      {
        value: "day",
        label: "Día a día",
        detail: "Oficina, planes tranquilos y rutina",
      },
      {
        value: "night",
        label: "Noche y ocasiones",
        detail: "Cenas, citas y celebraciones",
      },
      { value: "all", label: "Para todo", detail: "Una opción versátil" },
    ],
  },
  {
    key: "style",
    title: "¿Qué frase te describe mejor?",
    description: "Tu estilo nos ayuda a ordenar las opciones.",
    options: [
      {
        value: "classic",
        label: "Clásico y elegante",
        detail: "Atemporal y refinado",
      },
      {
        value: "sweet",
        label: "Dulce y expresivo",
        detail: "Alegre, cálido y cercano",
      },
      {
        value: "magnetic",
        label: "Magnético e intenso",
        detail: "Seguro y memorable",
      },
      {
        value: "fresh",
        label: "Natural y fresco",
        detail: "Relajado y luminoso",
      },
    ],
  },
  {
    key: "budget",
    title: "¿Qué presupuesto tienes en mente?",
    description: "Solo priorizaremos opciones que encajen contigo.",
    options: [
      {
        value: "under250",
        label: "Menos de $250 mil",
        detail: "Para descubrir",
      },
      {
        value: "250to450",
        label: "Entre $250 y $450 mil",
        detail: "Una selección amplia",
      },
      {
        value: "over450",
        label: "Más de $450 mil",
        detail: "Para una elección especial",
      },
    ],
  },
]);

function startingPrice(product: Product) {
  const prices = product.variants
    .filter((variant) => variant.available)
    .map((variant) => variant.price);
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}
function familyDescription(family: string) {
  const descriptions: Record<string, string> = {
    cítrica: "Vibrante, limpia y energizante",
    floral: "Luminosa, suave y envolvente",
    amaderada: "Profunda, cálida y elegante",
    oriental: "Intensa, especiada y seductora",
    frutal: "Jugosa, alegre y moderna",
    aromática: "Verde, fresca y refinada",
  };
  return (
    descriptions[family.toLocaleLowerCase()] || "Descubre sus notas y carácter"
  );
}
function includesValue(value: string | undefined, terms: string[]) {
  return terms.some((term) => value?.toLocaleLowerCase().includes(term));
}
function score(product: Product) {
  const families = (product.family ?? []).map((family) =>
    family.toLocaleLowerCase(),
  );
  const category = product.category.toLocaleLowerCase();
  const price = startingPrice(product);
  let value = Number(product.featured);
  if (category === answers.value.category?.toLocaleLowerCase()) value += 6;
  else if (category === "unisex") value += 2;
  if (families.includes(answers.value.family?.toLocaleLowerCase() ?? ""))
    value += 7;

  const budget = answers.value.budget;
  if (
    (budget === "under250" && price < 250000) ||
    (budget === "250to450" && price >= 250000 && price <= 450000) ||
    (budget === "over450" && price > 450000)
  )
    value += 5;

  const projection =
    `${product.projection || ""} ${product.duration || ""}`.toLocaleLowerCase();
  const occasions = (product.occasions ?? []).join(" ").toLocaleLowerCase();
  const idealFor = (product.idealFor ?? []).join(" ").toLocaleLowerCase();
  if (
    answers.value.intensity === "intense" &&
    (includesValue(projection, ["alta", "intensa", "larga"]) ||
      families.some((family) => ["oriental", "amaderada"].includes(family)))
  )
    value += 3;
  if (
    answers.value.intensity === "soft" &&
    (includesValue(projection, ["suave", "baja", "media"]) ||
      families.some((family) => ["cítrica", "floral"].includes(family)))
  )
    value += 3;
  if (answers.value.intensity === "balanced") value += 2;

  if (
    answers.value.occasion === "day" &&
    (includesValue(occasions, ["día", "oficina"]) ||
      families.some((family) =>
        ["cítrica", "floral", "aromática"].includes(family),
      ))
  )
    value += 3;
  if (
    answers.value.occasion === "night" &&
    (includesValue(occasions, ["noche"]) ||
      families.some((family) => ["oriental", "amaderada"].includes(family)))
  )
    value += 3;
  if (answers.value.occasion === "all" && category === "unisex") value += 3;
  if (
    answers.value.style === "classic" &&
    (includesValue(idealFor, ["elegante", "clásic"]) ||
      families.some((family) => ["amaderada", "oriental"].includes(family)))
  )
    value += 3;
  if (
    answers.value.style === "sweet" &&
    (includesValue(idealFor, ["dulce", "juvenil"]) ||
      families.some((family) =>
        ["floral", "oriental", "dulce", "frutal"].includes(family),
      ))
  )
    value += 3;
  if (
    answers.value.style === "magnetic" &&
    (includesValue(idealFor, ["intens", "noche", "seductor"]) ||
      families.some((family) => ["oriental", "amaderada"].includes(family)))
  )
    value += 3;
  if (
    answers.value.style === "fresh" &&
    (includesValue(idealFor, ["fresc", "día", "natural"]) ||
      families.some((family) =>
        ["cítrica", "floral", "frutal", "aromática"].includes(family),
      ))
  )
    value += 3;
  return value;
}
const results = computed(() =>
  [...props.products]
    .filter((product) => product.variants.some((variant) => variant.available))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4),
);
function matchReason(product: Product) {
  const families = (product.family ?? []).map((family) =>
    family.toLocaleLowerCase(),
  );
  if (families.includes(answers.value.family?.toLocaleLowerCase() ?? ""))
    return `Tu afinidad por los aromas ${answers.value.family?.toLocaleLowerCase()}.`;
  if (answers.value.occasion === "night")
    return "Una buena opción para noches y planes especiales.";
  if (answers.value.occasion === "day")
    return "Una opción fácil de llevar durante el día.";
  return "Encaja con el estilo y la intensidad que elegiste.";
}

function choose(key: keyof Answers, value: string) {
  if (isChoosing.value) return;
  isChoosing.value = true;
  answers.value[key] = value as never;
  window.setTimeout(() => {
    step.value += 1;
    isChoosing.value = false;
  }, 180);
}
function previous() {
  if (step.value <= 0 || isChoosing.value) return;
  step.value -= 1;
}
function close() {
  open.value = false;
}
function restart() {
  step.value = 0;
  answers.value = {};
  isChoosing.value = false;
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
            <div class="finder-step-meta">
              <button
                v-if="step > 0"
                class="finder-back"
                type="button"
                @click="previous"
              >
                ← Atrás
              </button>
              <span class="eyebrow"
                >TU PERFUME IDEAL · {{ step + 1 }} DE 6</span
              >
            </div>
            <h2 id="finder-title">{{ questions[step]?.title }}</h2>
            <p class="finder-question-description">
              {{ questions[step]?.description }}
            </p>
            <div class="finder-options">
              <button
                v-for="option in questions[step]?.options"
                :key="option.value"
                type="button"
                :disabled="isChoosing"
                @click="choose(questions[step]!.key, option.value)"
              >
                <span
                  ><strong>{{ option.label }}</strong
                  ><small>{{ option.detail }}</small></span
                >
                <i aria-hidden="true">→</i>
              </button>
            </div>
          </template>

          <template v-else>
            <span class="eyebrow">TU SELECCIÓN PERSONAL</span>
            <h2 id="finder-title">Perfumes hechos para <em>ti.</em></h2>
            <p class="finder-intro">
              Seleccionamos opciones disponibles según lo que nos contaste.
            </p>
            <div v-if="results.length" class="finder-results">
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
                  ><em>{{ matchReason(product) }}</em></span
                ><b aria-hidden="true">→</b></NuxtLink
              >
            </div>
            <p v-else class="finder-empty">
              Aún no tenemos opciones disponibles para recomendarte. Explora la
              colección o vuelve a intentarlo pronto.
            </p>
            <div class="finder-result-actions">
              <button class="text-link" type="button" @click="restart">
                Repetir preguntas
              </button>
              <NuxtLink class="button" to="/perfumes" @click="close"
                >Ver toda la colección</NuxtLink
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
.finder-step-meta {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 510px;
  min-height: 24px;
  margin: 0 auto;
}
.finder-step-meta .eyebrow {
  display: block;
  text-align: center;
}
.finder-back {
  position: absolute;
  left: 0;
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.finder-back:hover {
  color: var(--accent);
}
.finder-modal h2 {
  margin-top: 8px;
  font-size: clamp(34px, 5vw, 50px);
}
.finder-question-description {
  max-width: 430px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
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
.finder-options button > span {
  display: grid;
  gap: 3px;
}
.finder-options button strong {
  font-size: 15px;
  font-weight: 600;
}
.finder-options button small {
  color: var(--muted);
  font-size: 11px;
}
.finder-options button i {
  color: var(--accent);
  font-size: 18px;
  font-style: normal;
}
.finder-options button:disabled {
  cursor: wait;
  opacity: 0.7;
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
.finder-empty {
  max-width: 430px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
  text-align: center;
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
  .finder-back {
    left: -2px;
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
