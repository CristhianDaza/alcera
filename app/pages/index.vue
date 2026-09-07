<script setup lang="ts">
const { data: products, error, refresh } = await useFetch("/api/products");
const selection = computed(() =>
  [...(products.value ?? [])]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 4),
);
const store = useStore();
usePageSeo(
  `Perfumes en Colombia · ${store.value.name}`,
  "Descubre fragancias florales, amaderadas y cítricas. Encuentra un perfume que deje huella y consulta tu pedido por WhatsApp en Colombia.",
);
</script>
<template>
  <section class="hero shell">
    <div class="hero-copy">
      <span class="eyebrow"><i /> ALCÉRA PERFUMES</span>
      <h1>Hay recuerdos<br />que se llevan<br /><em>en la piel.</em></h1>
      <p>
        Perfumes para mujer, hombre y unisex en Colombia.<br />Descubre tu
        fragancia y consulta por WhatsApp.
      </p>
      <NuxtLink class="button" to="/catalogo"
        >Explorar la colección <span>↗</span></NuxtLink
      >
      <div class="hero-caption">
        <span class="little-star">✳</span> ELIGE EN LÍNEA. CONSULTA POR
        WHATSAPP.
      </div>
    </div>
    <div class="hero-image">
      <img
        src="https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=90"
        :srcset="
          imageSources(
            'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&q=85',
          )
        "
        sizes="(max-width: 700px) 100vw, 50vw"
        alt="Composición de frascos de perfume en tonos cálidos"
        fetchpriority="high"
        width="1000"
        height="1100"
      />
      <div class="image-note">
        <span>EL PODER DE LO INVISIBLE</span>
        <p>Una impresión.<br />Para siempre.</p>
      </div>
      <span class="image-number">01 — LA COLECCIÓN</span>
    </div>
  </section>
  <div class="qualities shell">
    <span>✧ &nbsp; Fragancias con carácter</span
    ><span>◌ &nbsp; Encuentra tu presentación</span
    ><span>↗ &nbsp; Atención por WhatsApp</span>
  </div>
  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">EL INICIO DE UNA CONEXIÓN</span>
        <h2>Una selección que <em>deja huella.</em></h2>
      </div>
      <NuxtLink class="text-link" to="/catalogo"
        >Ver todos los perfumes ↗</NuxtLink
      >
    </div>
    <div v-if="error" class="notice" role="alert">
      <p>No pudimos cargar la colección.</p>
      <button class="text-link" @click="refresh()">Reintentar</button>
    </div>
    <div
      v-else
      class="product-grid selection-grid"
      :style="{ '--selection-columns': Math.max(1, selection.length) }"
    >
      <ProductCard
        v-for="(product, index) in selection"
        :key="product.id"
        :product="product"
        :index="index"
      />
    </div>
    <p v-if="products && !products.length">
      Pronto descubrirás nuestra primera colección.
    </p>
  </section>
  <section class="ritual shell">
    <div>
      <span class="eyebrow">MÁS QUE UNA FRAGANCIA</span>
      <h2>Un pequeño ritual.<br /><em>Algo muy tuyo.</em></h2>
    </div>
    <div>
      <p>
        Hay aromas que te transportan. Otros, que te acompañan. Creemos en los
        que se convierten en parte de ti.
      </p>
      <NuxtLink class="text-link" to="/catalogo">Encuentra el tuyo ↗</NuxtLink>
    </div>
  </section>
  <section class="section shell">
    <div class="section-heading">
      <div>
        <span class="eyebrow">DÉJATE LLEVAR</span>
        <h2>¿A qué huele <em>tu mundo?</em></h2>
      </div>
      <span class="muted">Una familia para cada forma de ser.</span>
    </div>
    <div class="family-grid">
      <NuxtLink
        v-for="(family, i) in ['Floral', 'Amaderada', 'Cítrica', 'Oriental']"
        :key="family"
        :to="`/catalogo?family=${family}`"
        ><span>0{{ i + 1 }}</span>
        <h3>{{ family }}</h3>
        <p>
          {{
            [
              "Delicada, luminosa, natural.",
              "Profunda, cálida, envolvente.",
              "Fresca, vibrante, espontánea.",
              "Intensa, especiada, inolvidable.",
            ][i]
          }}
        </p>
        <b>↗</b></NuxtLink
      >
    </div>
  </section>
</template>
