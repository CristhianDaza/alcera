<script setup lang="ts">
import { serializeSchema, siteBase } from "#shared/seo";

const store = useStore();
const base = siteBase(useRuntimeConfig().public.siteUrl);

usePageSeo(
  `Guía de perfumes y familias olfativas · ${store.value.name}`,
  "Aprende a elegir un perfume: familias olfativas, concentraciones, notas, proyección y duración.",
  "/images/hero-perfumes-editorial-v2.png",
  { imageAlt: "Guía para elegir perfumes y familias olfativas" },
);

const families = [
  {
    name: "Floral",
    description:
      "Flores como rosa, jazmín, azahar o peonía. Suelen sentirse románticas, suaves o luminosas.",
  },
  {
    name: "Amaderada",
    description:
      "Cedro, sándalo, vetiver y pachulí. Aportan calidez, profundidad y una sensación elegante.",
  },
  {
    name: "Cuero",
    description:
      "Acordes de cuero, gamuza, abedul o tabaco. Aportan una sensación seca, intensa y con carácter.",
  },
  {
    name: "Cítrica",
    description:
      "Bergamota, limón, mandarina y toronja. Fresca, chispeante y especialmente fácil de llevar de día.",
  },
  {
    name: "Oriental",
    description:
      "Ámbar, resinas, vainilla e incienso. También se conoce como ámbar; suele ser cálida, intensa y envolvente.",
  },
  {
    name: "Frutal",
    description:
      "Pera, frutos rojos, durazno o manzana. Jugosa, alegre y, a menudo, muy fácil de reconocer.",
  },
  {
    name: "Dulce",
    description:
      "Acordes gourmand como vainilla, caramelo, cacao o praliné. Cremosa, reconfortante y con presencia.",
  },
  {
    name: "Almizclado",
    description:
      "Almizcles limpios o cálidos. Dan una sensación de piel recién cuidada, suave y cercana.",
  },
  {
    name: "Especiado",
    description:
      "Pimienta, canela, cardamomo o clavo. Añaden contraste, carácter y calidez.",
  },
  {
    name: "Aromático",
    description:
      "Lavanda, romero, salvia o hierbas. Fresco, verde y clásico, con frecuencia asociado a barbería.",
  },
  {
    name: "Acuático",
    description:
      "Acordes marinos, ozónicos o de lluvia. Transmiten una frescura limpia y aireada.",
  },
];

const faqs = [
  {
    question: "¿Cómo sé qué familia olfativa elegir?",
    answer:
      "Piensa primero en la sensación que buscas, no en una nota aislada: cítrica o acuática si quieres frescura; floral o frutal para algo luminoso; amaderada, especiada u oriental para más calidez y carácter; dulce para un efecto cremoso y envolvente. La mejor guía sigue siendo probarlo en tu piel.",
  },
  {
    question: "¿Qué son las notas de salida, corazón y fondo?",
    answer:
      "Son las etapas de evolución de una fragancia. Las notas de salida son la primera impresión, normalmente frescas y volátiles. Las de corazón aparecen después y definen su personalidad. Las de fondo son las que permanecen al final —como maderas, almizcles, ámbar o vainilla— y sostienen el aroma en la piel.",
  },
  {
    question: "¿Qué significan proyección, estela y duración?",
    answer:
      "La proyección es qué tanto se percibe el perfume alrededor de quien lo usa durante las primeras horas. La estela es el rastro que queda al pasar. La duración es cuánto tiempo se detecta en piel o ropa. Son cualidades distintas: un perfume puede durar mucho y proyectar de forma cercana.",
  },
  {
    question: "¿La concentración determina cuánto dura un perfume?",
    answer:
      "Influye, pero no lo decide todo. La fórmula, la piel, el clima y la cantidad aplicada también cambian el resultado. Una concentración mayor suele contener más materia aromática, aunque un Eau de Toilette bien formulado puede rendir más que un Eau de Parfum ligero.",
  },
  {
    question: "¿Por qué el mismo perfume huele distinto en cada persona?",
    answer:
      "El pH, la hidratación de la piel, la temperatura, el clima y hasta los productos corporales que usas afectan cómo se desarrolla. Por eso conviene probarlo en piel y esperar al menos 20 a 30 minutos antes de decidir.",
  },
  {
    question: "¿Dónde y cómo debería aplicarlo?",
    answer:
      "Aplica sobre piel limpia e hidratada, en puntos de pulso como cuello, muñecas o pliegues de los brazos. Rocía a unos centímetros y deja secar: frotar las muñecas puede alterar la salida. Empieza con pocas atomizaciones; siempre puedes añadir una más.",
  },
];

useHead(() => ({
  script: [
    {
      key: "perfume-guide-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": base + "/guia-de-perfumes#article",
            headline: "Guía esencial para elegir perfumes",
            description:
              "Familias olfativas, concentraciones, notas, proyección y duración.",
            inLanguage: "es-CO",
            mainEntityOfPage: base + "/guia-de-perfumes",
            publisher: { "@id": base + "/#organization" },
          },
          {
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Inicio",
                item: base + "/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Guía de perfumes",
                item: base + "/guia-de-perfumes",
              },
            ],
          },
        ],
      }),
    },
  ],
}));
</script>

<template>
  <article class="shell section perfume-guide">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <span aria-current="page">Guía de perfumes</span>
    </nav>

    <header class="guide-hero">
      <span class="eyebrow">APRENDE A ELEGIR TU AROMA</span>
      <h1>El perfume se entiende <em>en la piel.</em></h1>
      <p>
        Una guía sencilla para reconocer qué te gusta, leer una pirámide
        olfativa y elegir una fragancia con más seguridad.
      </p>
      <NuxtLink class="button" to="/perfumes"
        >Explorar perfumes <span>↗</span></NuxtLink
      >
    </header>

    <section class="guide-section" aria-labelledby="familias-title">
      <div class="guide-heading">
        <span class="eyebrow">01 · FAMILIAS OLFATIVAS</span>
        <h2 id="familias-title">La personalidad de un <em>perfume.</em></h2>
        <p>
          Una fragancia puede tener más de una familia. Estas son pistas para
          empezar a explorar.
        </p>
      </div>
      <div class="guide-family-grid">
        <NuxtLink
          v-for="family in families"
          :key="family.name"
          class="guide-family"
          :to="`/perfumes?family=${family.name}`"
        >
          <h3>{{ family.name }}</h3>
          <p>{{ family.description }}</p>
          <span>Ver perfumes ↗</span>
        </NuxtLink>
      </div>
    </section>

    <section
      class="guide-section guide-explainer"
      aria-labelledby="notas-title"
    >
      <div class="guide-heading">
        <span class="eyebrow">02 · PIRÁMIDE OLFATIVA</span>
        <h2 id="notas-title">Un aroma que <em>evoluciona.</em></h2>
        <p>No huele igual al primer minuto que varias horas después.</p>
      </div>
      <div class="scent-pyramid">
        <div class="pyramid-step pyramid-step--top">
          <span>Notas de salida</span>
          <p>
            La primera impresión: cítricos, hierbas y frutas. Se perciben
            durante los primeros minutos.
          </p>
        </div>
        <div class="pyramid-step pyramid-step--heart">
          <span>Notas de corazón</span>
          <p>
            El carácter central: flores, especias o acordes verdes. Aparecen
            cuando la salida se suaviza.
          </p>
        </div>
        <div class="pyramid-step pyramid-step--base">
          <span>Notas de fondo</span>
          <p>
            La huella final: maderas, almizcles, vainilla, ámbar o resinas. Son
            las más persistentes.
          </p>
        </div>
      </div>
    </section>

    <section class="guide-section" aria-labelledby="concentraciones-title">
      <div class="guide-heading">
        <span class="eyebrow">03 · CONCENTRACIONES</span>
        <h2 id="concentraciones-title">
          ¿Qué cambia entre <em>cada versión?</em>
        </h2>
        <p>
          Indican, de forma aproximada, la proporción de compuestos aromáticos.
          No son una promesa exacta de duración.
        </p>
      </div>
      <div
        class="concentration-table"
        role="table"
        aria-label="Concentraciones de perfumes"
      >
        <div class="concentration-row concentration-row--head" role="row">
          <span role="columnheader">Concentración</span
          ><span role="columnheader">Rango orientativo</span
          ><span role="columnheader">Cómo suele sentirse</span>
        </div>
        <div class="concentration-row" role="row">
          <strong>Eau Fraîche / Agua fresca</strong><span>1–3%</span
          ><span>Muy ligera y refrescante; ideal para reaplicar.</span>
        </div>
        <div class="concentration-row" role="row">
          <strong>Eau de Cologne</strong><span>2–5%</span
          ><span>Fresca, cítrica y de corta duración.</span>
        </div>
        <div class="concentration-row" role="row">
          <strong>Eau de Toilette</strong><span>5–15%</span
          ><span>Equilibrada, versátil y habitual para el día.</span>
        </div>
        <div class="concentration-row" role="row">
          <strong>Eau de Parfum</strong><span>15–20%</span
          ><span>Más rica y presente; suele acompañar durante más tiempo.</span>
        </div>
        <div class="concentration-row" role="row">
          <strong>Parfum / Extrait de Parfum</strong><span>20–40%</span
          ><span
            >Más concentrada y cercana a la piel; unas pocas atomizaciones
            suelen bastar.</span
          >
        </div>
      </div>
      <p class="guide-note">
        “Perfume concentrado” puede ser un nombre comercial. Revisa siempre la
        concentración indicada por la marca.
      </p>
    </section>

    <section
      class="guide-section guide-performance"
      aria-labelledby="rendimiento-title"
    >
      <div class="guide-heading">
        <span class="eyebrow">04 · RENDIMIENTO</span>
        <h2 id="rendimiento-title">Que se note, sin que <em>invada.</em></h2>
      </div>
      <div class="performance-grid">
        <div>
          <h3>Proyección</h3>
          <p>
            La distancia a la que otras personas perciben el aroma mientras lo
            llevas.
          </p>
        </div>
        <div>
          <h3>Estela</h3>
          <p>El rastro sutil que queda en el aire cuando pasas.</p>
        </div>
        <div>
          <h3>Duración</h3>
          <p>
            El tiempo que permanece perceptible. La piel hidratada y el clima
            fresco pueden ayudar.
          </p>
        </div>
      </div>
    </section>

    <section class="guide-section guide-faq" aria-labelledby="faq-title">
      <div class="guide-heading">
        <span class="eyebrow">05 · RESUELVE TUS DUDAS</span>
        <h2 id="faq-title">Preguntas frecuentes sobre <em>perfumes.</em></h2>
      </div>
      <div class="faq-list">
        <details
          v-for="(faq, index) in faqs"
          :key="faq.question"
          :open="index === 0"
        >
          <summary>
            {{ faq.question }} <span aria-hidden="true">+</span>
          </summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
    </section>

    <section class="guide-cta">
      <span class="eyebrow">LISTA PARA DESCUBRIR</span>
      <h2>Tu aroma ideal puede estar <em>más cerca.</em></h2>
      <p>
        Explora por familia olfativa o déjanos orientarte según tu estilo y
        ocasión.
      </p>
      <div>
        <NuxtLink class="button" to="/perfumes"
          >Ver la colección <span>↗</span></NuxtLink
        ><NuxtLink class="button button--outline" to="/?finder=1"
          >Usar el buscador de perfume ✦</NuxtLink
        >
      </div>
    </section>
  </article>
</template>
