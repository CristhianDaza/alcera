<script setup lang="ts">
import { productSearchName, siteBase, serializeSchema } from "#shared/seo";
import { money, variantLabel } from "#shared/commerce";
import { isDecantVariant, selectRelatedProducts } from "#shared/catalog";
import type { Product } from "#shared/types";
import { seoLanding, seoLandingForFilter } from "#shared/seo-landings";

const route = useRoute();
const catalog = useCatalogStore();
const slug = String(route.params.slug || "");
const cachedProduct = catalog.loaded.value
  ? catalog.products.value.find((item) => item.slug === slug)
  : undefined;
if (cachedProduct) catalog.diagnostic("PRODUCT_STORE_HIT", { slug });
type ProductPage = { product: Product; related: Product[] };
let fetchedPage: ProductPage | null = null;
let fetchError: { statusCode?: number } | null = null;
if (!cachedProduct) {
  const { data, error } = await useFetch<ProductPage>(
    `/api/products/${slug}/page`,
  );
  fetchedPage = data.value ?? null;
  fetchError = error.value ?? null;
}
const resolvedProduct = cachedProduct ?? fetchedPage?.product;
if (!resolvedProduct)
  throw createError({
    statusCode: fetchError?.statusCode || 404,
    statusMessage: "No encontramos este perfume",
  });
const p: Product = resolvedProduct;

const categoryLanding = seoLanding(
  "categorias",
  p.category.toLocaleLowerCase("es"),
);
const brandLanding = seoLanding("marcas", p.brand.toLocaleLowerCase("es"));
function familyLocation(family: string) {
  const landing = seoLandingForFilter("familias", family);
  return landing
    ? `/familias/${landing.slug}`
    : { path: "/perfumes", query: { family } };
}

const relatedProducts = computed(() =>
  catalog.loaded.value
    ? selectRelatedProducts(catalog.products.value, p)
    : (fetchedPage?.related ?? []),
);
const sameBrandProducts = computed(() =>
  relatedProducts.value.filter((product) => product.brand === p.brand),
);
const sameFamilyProducts = computed(() =>
  relatedProducts.value.filter(
    (product) =>
      product.brand !== p.brand &&
      product.family?.some((family) => p.family?.includes(family)),
  ),
);
const requestedDecant = route.query.formato === "decant";
const preferredVariants = requestedDecant
  ? p.variants.filter(isDecantVariant)
  : p.variants;
const selected = ref(
  preferredVariants.find((item) => item.available)?.id ||
    preferredVariants[0]?.id ||
    p.variants.find((item) => item.available)?.id ||
    p.variants[0]!.id,
);
const photo = ref(0);
const added = ref(false);
const recentlyViewed = ref<Product[]>([]);
const recentlyViewedStorageKey = "esencia-recently-viewed";
const recentlyViewedStorageLimit = 5;
const quantity = ref(1);
const addedQuantity = ref(0);
const variant = computed(() =>
  p.variants.find((item) => item.id === selected.value)!,
);
const bottleVariants = computed(() =>
  p.variants.filter((item) => !isDecantVariant(item)),
);
const decantVariants = computed(() => p.variants.filter(isDecantVariant));
const addButtonLabel = computed(() => {
  if (!variant.value.available) return "Presentación agotada";
  if (added.value)
    return quantity.value > 1
      ? `Añadir otras ${quantity.value} unidades`
      : "Añadir otra unidad";
  return quantity.value > 1
    ? `Añadir ${quantity.value} unidades`
    : "Añadir a mi bolsa";
});
const { add } = useCart();
function setQuantity(value: number) {
  quantity.value = Math.min(99, Math.max(1, Math.trunc(value) || 1));
  added.value = false;
}
function changeQuantity(event: Event) {
  setQuantity(Number((event.target as HTMLInputElement).value));
}
function addSelectedVariant() {
  const amount = add(p, variant.value, quantity.value);
  addedQuantity.value = amount;
  added.value = true;
  if (!amount) return;
  void trackAnalyticsEvent("add_to_cart", {
    currency: "COP",
    value: variant.value.price * amount,
    items: [{ ...analyticsItem(p, variant.value), quantity: amount }],
  });
}

function isStoredProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<Product>;
  return (
    typeof product.id === "string" &&
    typeof product.slug === "string" &&
    typeof product.name === "string" &&
    typeof product.brand === "string" &&
    Array.isArray(product.images) &&
    Array.isArray(product.variants)
  );
}

function saveRecentlyViewed() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(recentlyViewedStorageKey) ?? "[]",
    );
    const previous = Array.isArray(saved) ? saved.filter(isStoredProduct) : [];
    const history = [
      p,
      ...previous.filter((product) => product.id !== p.id),
    ].slice(0, recentlyViewedStorageLimit);
    localStorage.setItem(recentlyViewedStorageKey, JSON.stringify(history));
    recentlyViewed.value = history
      .filter((product) => product.id !== p.id)
      .slice(0, 4);
  } catch {
    // El navegador puede bloquear el almacenamiento; la ficha sigue funcionando.
  }
}

onMounted(() => {
  saveRecentlyViewed();
  void trackAnalyticsEvent("view_item", {
    currency: "COP",
    value: variant.value.price,
    items: [analyticsItem(p, variant.value)],
  });
});
usePageSeo(
  productSearchName(p.name, p.brand) + " · " + useStore().value.name,
  p.aromaDescription || p.description,
  p.images[0]?.url,
  {
    imageAlt: p.images[0]?.alt || `${p.name} de ${p.brand}`,
  },
);

function colombiaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts();
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    date: new Date(Date.UTC(value("year"), value("month") - 1, value("day"))),
    hour: value("hour"),
  };
}

function addBusinessDays(date: Date, days: number) {
  const next = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    next.setUTCDate(next.getUTCDate() + 1);
    if (next.getUTCDay() !== 0 && next.getUTCDay() !== 6) remaining--;
  }
  return next;
}

const deliveryFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});
const current = colombiaNow();
const isWeekday =
  current.date.getUTCDay() >= 1 && current.date.getUTCDay() <= 5;
const dispatchDate =
  isWeekday && current.hour < 16
    ? current.date
    : addBusinessDays(current.date, 1);
const medellinDelivery = deliveryFormatter.format(
  addBusinessDays(dispatchDate, 1),
);
const colombiaDeliveryStart = deliveryFormatter.format(
  addBusinessDays(dispatchDate, 3),
);
const colombiaDeliveryEnd = deliveryFormatter.format(
  addBusinessDays(dispatchDate, 4),
);

const base = siteBase(useRuntimeConfig().public.siteUrl);
const productUrl = base + "/perfumes/" + p.slug;
const gtinProperty = p.gtin ? `gtin${p.gtin.length}` : "";
useHead({
  script: [
    {
      key: "product-schema",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": productUrl + "#product",
        url: productUrl,
        mainEntityOfPage: productUrl,
        sku: p.sku || p.id,
        ...(p.mpn ? { mpn: p.mpn } : {}),
        ...(gtinProperty ? { [gtinProperty]: p.gtin } : {}),
        category: p.category,
        name: p.name,
        description: p.description,
        image: p.images.map((image) => image.url),
        brand: { "@type": "Brand", name: p.brand },
        additionalProperty: [
          ...(p.concentration
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Concentración",
                  value: p.concentration,
                },
              ]
            : []),
          ...(p.duration
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Duración",
                  value: p.duration,
                },
              ]
            : []),
          ...(p.projection
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Proyección",
                  value: p.projection,
                },
              ]
            : []),
        ],
        offers: p.variants.map((item) => ({
          "@type": "Offer",
          name: p.name + " " + variantLabel(item),
          seller: { "@id": base + "/#organization" },
          sku: (p.sku || p.id) + "-" + item.id,
          price: item.price,
          priceCurrency: "COP",
          availability:
            "https://schema.org/" + (item.available ? "InStock" : "OutOfStock"),
          url: productUrl,
        })),
      }),
    },
  ],
});
useHead({
  script: [
    {
      key: "breadcrumbs",
      type: "application/ld+json",
      innerHTML: serializeSchema({
        "@context": "https://schema.org",
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
            name: "Perfumes",
            item: base + "/perfumes",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: p.name,
            item: productUrl,
          },
        ],
      }),
    },
  ],
});
</script>

<template>
  <section class="shell section">
    <nav class="breadcrumbs" aria-label="Ruta de navegación">
      <NuxtLink to="/">Inicio</NuxtLink> /
      <NuxtLink to="/perfumes">Perfumes</NuxtLink> /
      <span aria-current="page">{{ p.name }}</span>
    </nav>
    <NuxtLink class="text-link" to="/perfumes"
      >← Volver a la colección</NuxtLink
    >
    <article class="detail">
      <div>
        <div class="detail-photo">
          <img
            :src="p.images[photo]?.url"
            :alt="p.images[photo]?.alt || p.name"
            :srcset="imageSources(p.images[photo]?.url || '')"
            sizes="(max-width: 700px) 100vw, 50vw"
            fetchpriority="high"
            decoding="async"
            width="900"
            height="1100"
          />
        </div>
        <div v-if="p.images.length > 1" class="thumbnails">
          <button
            v-for="(image, index) in p.images"
            :key="image.url"
            :aria-label="'Ver imagen ' + (index + 1)"
            :aria-pressed="photo === index"
            @click="photo = index"
          >
            <img
              :src="imageWidth(image.url, 180)"
              alt=""
              loading="lazy"
              decoding="async"
              width="90"
              height="110"
            />
          </button>
        </div>
      </div>

      <div class="detail-copy">
        <NuxtLink
          v-if="brandLanding"
          class="eyebrow"
          :to="`/marcas/${brandLanding.slug}`"
          >{{ p.brand }}</NuxtLink
        >
        <span v-else class="eyebrow">{{ p.brand }}</span>
        <h1>{{ p.name }}</h1>
        <div class="pills">
          <NuxtLink
            :to="
              brandLanding
                ? `/marcas/${brandLanding.slug}`
                : { path: '/perfumes', query: { brand: p.brand } }
            "
          >
            {{ p.brand }}
          </NuxtLink>
          <NuxtLink
            :to="
              categoryLanding
                ? `/categorias/${categoryLanding.slug}`
                : { path: '/perfumes', query: { category: p.category } }
            "
          >
            {{ p.category }}
          </NuxtLink>
          <NuxtLink
            v-for="family in p.family"
            :key="family"
            :to="familyLocation(family)"
          >
            {{ family }}
          </NuxtLink>
          <NuxtLink
            v-if="p.concentration"
            :to="{
              path: '/perfumes',
              query: { concentration: p.concentration },
            }"
          >
            {{ p.concentration }}
          </NuxtLink>
        </div>
        <p class="description">{{ p.description }}</p>

        <div class="purchase-panel">
          <h2>Elige tu presentación</h2>
          <p class="purchase-guidance">
            Selecciona el formato y tamaño que prefieras.
          </p>
          <div class="variant-groups">
            <section v-if="bottleVariants.length" class="variant-group">
              <h3>Frasco original</h3>
              <div class="variants">
                <button
                    v-for="item in bottleVariants"
                    :key="item.id"
                    :class="{
                    selected: selected === item.id,
                    unavailable: !item.available,
                  }"
                    :aria-pressed="selected === item.id"
                    :aria-label="`${variantLabel(item)}, ${item.available ? 'disponible' : 'agotado'}`"
                    @click="
                    selected = item.id;
                    added = false;
                  "
                >
                  <span>{{ item.size }}</span>
                  <small>{{ item.available ? "Disponible" : "Agotado" }}</small>
                  <span
                      v-if="selected === item.id"
                      class="variant-check"
                      aria-hidden="true"
                  >✓</span
                  >
                </button>
              </div>
            </section>
            <section v-if="decantVariants.length" class="variant-group">
              <h3>Decants</h3>
              <p>El perfume original, reenvasado en un formato práctico.</p>
              <div class="variants">
                <button
                    v-for="item in decantVariants"
                    :key="item.id"
                    :class="{
                    selected: selected === item.id,
                    unavailable: !item.available,
                  }"
                    :aria-pressed="selected === item.id"
                    :aria-label="`${variantLabel(item)}, ${item.available ? 'disponible' : 'agotado'}`"
                    @click="
                    selected = item.id;
                    added = false;
                  "
                >
                  <span>{{ item.size }}</span>
                  <small>{{ item.available ? "Disponible" : "Agotado" }}</small>
                  <span
                      v-if="selected === item.id"
                      class="variant-check"
                      aria-hidden="true"
                  >✓</span
                  >
                </button>
              </div>
            </section>
          </div>
          <div class="purchase-summary">
            <span
            >{{
                isDecantVariant(variant)
                    ? `Decant de ${variant.size}`
                    : `Frasco de ${variant.size}`
              }}{{ quantity > 1 ? ` · ${quantity} unidades` : "" }}</span
            >
            <p class="price">
              {{ money(variant.price * quantity) }} <small>COP</small>
            </p>
          </div>
          <div class="purchase-actions">
            <div class="quantity-picker" aria-label="Cantidad">
              <button
                  type="button"
                  :disabled="quantity <= 1"
                  aria-label="Reducir cantidad"
                  @click="setQuantity(quantity - 1)"
              >
                −
              </button>
              <label
              ><span>Cantidad</span
              ><input
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="99"
                  :value="quantity"
                  @change="changeQuantity"
              /></label>
              <button
                  type="button"
                  :disabled="quantity >= 99"
                  aria-label="Aumentar cantidad"
                  @click="setQuantity(quantity + 1)"
              >
                ＋
              </button>
            </div>
            <button
                class="button add-to-cart"
                :disabled="!variant.available"
                @click="addSelectedVariant"
            >
              {{ addButtonLabel }}
              <span>＋</span>
            </button>
          </div>
          <dl
            v-if="
              p.family?.length || p.concentration || p.duration || p.projection
            "
            class="decision-facts"
            aria-label="Información para elegir esta fragancia"
          >
            <div v-if="p.family?.length">
              <dt>Familia olfativa</dt>
              <dd>{{ p.family.join(", ") }}</dd>
            </div>
            <div v-if="p.concentration">
              <dt>Concentración</dt>
              <dd>{{ p.concentration }}</dd>
            </div>
            <div v-if="p.duration">
              <dt>Duración orientativa</dt>
              <dd>{{ p.duration }}</dd>
            </div>
            <div v-if="p.projection">
              <dt>Proyección orientativa</dt>
              <dd>{{ p.projection }}</dd>
            </div>
          </dl>
          <p class="price">{{ money(variant.price) }} <small>COP</small></p>
          <button
            class="button full"
            :disabled="!variant.available"
            @click="addSelectedVariant"
          >
            {{
              !variant.available
                ? "Presentación agotada"
                : added
                  ? "Añadir otra unidad"
                  : "Añadir a mi bolsa"
            }}
            <span>＋</span>
          </button>
          <ul class="purchase-reassurance" aria-label="Garantías de compra">
            <li>Producto 100% original</li>
            <li>Envíos a toda Colombia</li>
            <li>Asesoría antes de comprar</li>
          </ul>
          <p v-if="added" class="added-notice" role="status">
            {{
              addedQuantity === 0
                ? "Ya tienes el máximo de 99 unidades en tu bolsa."
                : addedQuantity === 1
                  ? "Una unidad añadida a tu bolsa."
                  : `${addedQuantity} unidades añadidas a tu bolsa.`
            }}
            <NuxtLink class="text-link" to="/carrito">Ver bolsa</NuxtLink>
          </p>
          <p class="muted">
            Finaliza tu consulta por WhatsApp.<br />Envío y forma de pago a
            convenir.
          </p>
        </div>

        <section v-if="p.aromaDescription" class="aroma-description">
          <h2 class="eyebrow">¿A QUÉ HUELE?</h2>
          <p>{{ p.aromaDescription }}</p>
        </section>

        <section v-if="p.olfactoryPyramid" class="notes">
          <h2 class="eyebrow">SU UNIVERSO OLFATIVO</h2>
          <div v-if="p.olfactoryPyramid" class="olfactory-pyramid">
            <div v-if="p.olfactoryPyramid.top.length">
              <strong>Salida</strong
              ><span>{{ p.olfactoryPyramid.top.join(", ") }}</span>
            </div>
            <div v-if="p.olfactoryPyramid.heart.length">
              <strong>Corazón</strong
              ><span>{{ p.olfactoryPyramid.heart.join(", ") }}</span>
            </div>
            <div v-if="p.olfactoryPyramid.base.length">
              <strong>Fondo</strong
              ><span>{{ p.olfactoryPyramid.base.join(", ") }}</span>
            </div>
          </div>
        </section>

        <section v-if="p.idealFor?.length" class="ideal-for">
          <h2 class="eyebrow">IDEAL PARA</h2>
          <ul>
            <li v-for="item in p.idealFor" :key="item">{{ item }}</li>
          </ul>
        </section>
      </div>
    </article>

    <section class="delivery-estimate" aria-labelledby="delivery-title">
      <span class="eyebrow">ENTREGA ESTIMADA</span>
      <h2 id="delivery-title">Tu perfume, más cerca.</h2>
      <p>
        Los pedidos realizados antes de las 4:00 p. m. se preparan el mismo día
        hábil. El costo se confirma según la ubicación.
      </p>
      <p>
        <strong>Medellín:</strong> entrega en un día hábil, estimada para el
        {{ medellinDelivery }}.
      </p>
      <p>
        <strong>Resto de Colombia:</strong> entrega de 3 a 4 días hábiles,
        estimada entre el {{ colombiaDeliveryStart }} y el
        {{ colombiaDeliveryEnd }}.
      </p>
    </section>

    <aside
      v-if="recentlyViewed.length"
      class="recently-viewed"
      aria-labelledby="recently-viewed-title"
    >
      <div class="section-heading">
        <div>
          <span class="eyebrow">TU HISTORIAL</span>
          <h2 id="recently-viewed-title">Vistos <em>recientemente.</em></h2>
        </div>
        <NuxtLink class="text-link" to="/perfumes">Ver colección</NuxtLink>
      </div>
      <div class="product-grid recently-viewed-grid">
        <ProductCard
          v-for="item in recentlyViewed"
          :key="item.id"
          :product="item"
        />
      </div>
    </aside>

    <aside
      v-if="sameBrandProducts.length"
      class="related-products"
      aria-labelledby="same-brand-title"
    >
      <div class="section-heading">
        <div>
          <span class="eyebrow">DE LA MISMA MARCA</span>
          <h2 id="same-brand-title">
            Más de <em>{{ p.brand }}.</em>
          </h2>
        </div>
        <NuxtLink class="text-link" to="/perfumes">Ver colección</NuxtLink>
      </div>
      <div class="product-grid recommendation-grid">
        <ProductCard
          v-for="item in sameBrandProducts"
          :key="item.id"
          :product="item"
        />
      </div>
    </aside>

    <aside
      v-if="sameFamilyProducts.length"
      class="related-products related-products--family"
      aria-labelledby="same-family-title"
    >
      <div class="section-heading">
        <div>
          <span class="eyebrow">DE LA MISMA FAMILIA OLFATIVA</span>
          <h2 id="same-family-title">Aromas con un aire <em>parecido.</em></h2>
        </div>
        <NuxtLink class="text-link" to="/perfumes">Ver colección</NuxtLink>
      </div>
      <div class="product-grid recommendation-grid">
        <ProductCard
          v-for="item in sameFamilyProducts"
          :key="item.id"
          :product="item"
        />
      </div>
    </aside>
  </section>
</template>

<style scoped>
.purchase-panel {
  position: relative;
}
.purchase-guidance {
  margin: -7px 0 20px;
  color: var(--muted);
  font-size: 12px;
}
.variant-groups {
  display: grid;
  gap: 20px;
}
.variant-group + .variant-group {
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.variant-group h3 {
  margin: 0 0 4px;
  font-family: "DM Sans", sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.variant-group > p {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.purchase-panel .variants {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
  gap: 9px;
}
.purchase-panel .variants button {
  position: relative;
  min-width: 0;
  min-height: 66px;
  padding: 12px 34px 12px 13px;
  text-align: left;
}
.purchase-panel .variants button > span:first-child {
  display: block;
  font-size: 15px;
  font-weight: 600;
}
.purchase-panel .variants small {
  color: var(--muted);
}
.purchase-panel .variants button:not(.selected) {
  background: color-mix(in srgb, var(--paper) 35%, transparent);
}
.purchase-panel .variants .unavailable:not(.selected) {
  opacity: 0.58;
}
.purchase-panel .variants .selected {
  padding: 11px 33px 11px 12px;
  box-shadow: inset 0 0 0 1px var(--accent-soft);
}
.variant-check {
  position: absolute;
  top: 50%;
  right: 12px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  transform: translateY(-50%);
}
.purchase-summary {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin: 24px 0 17px;
}
.purchase-summary > span {
  color: var(--muted);
  font-size: 11px;
}
.purchase-summary .price {
  margin: 0;
  text-align: right;
}
.purchase-actions {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  gap: 10px;
}
.quantity-picker {
  display: grid;
  grid-template-columns: 36px minmax(42px, 1fr) 36px;
  min-height: 50px;
  border: 1px solid var(--line-strong);
  background: var(--paper);
}
.quantity-picker button {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 18px;
}
.quantity-picker button:first-child {
  border-right: 1px solid var(--line);
}
.quantity-picker button:last-child {
  border-left: 1px solid var(--line);
}
.quantity-picker button:disabled {
  color: var(--line-strong);
  cursor: not-allowed;
}
.quantity-picker label {
  display: grid;
  place-items: center;
}
.quantity-picker label span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.quantity-picker input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  appearance: textfield;
}
.quantity-picker input::-webkit-inner-spin-button,
.quantity-picker input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}
.add-to-cart {
  width: 100%;
  min-width: 0;
  min-height: 50px;
  padding-inline: 16px;
}
.aroma-description {
  margin: 0 0 26px;
}
.aroma-description .eyebrow,
.ideal-for .eyebrow {
  margin-bottom: 10px;
}
.aroma-description p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}
.olfactory-pyramid {
  display: grid;
  gap: 11px;
}
.olfactory-pyramid div {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px;
  font-size: 12px;
}
.olfactory-pyramid strong {
  color: var(--accent);
  font-weight: 600;
}
.note-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 12px;
}
.decision-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1px;
  margin: 22px 0 0;
  background: var(--line);
}
.decision-facts div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 13px 14px;
  background: var(--surface);
}
.decision-facts dt {
  color: var(--muted);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.decision-facts dd {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}
.purchase-reassurance {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
  padding: 0;
  margin: 17px 0 0;
  list-style: none;
  color: var(--muted);
  font-size: 10px;
}
.purchase-reassurance li {
  display: flex;
  align-items: center;
}
.purchase-reassurance li:not(:last-child)::after {
  width: 3px;
  height: 3px;
  margin: 0 10px;
  border-radius: 50%;
  background: var(--accent);
  content: "";
}
.ideal-for {
  margin-top: 27px;
}
.ideal-for ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12px;
}
.ideal-for li + li {
  margin-top: 4px;
}
.delivery-estimate {
  margin-top: 65px;
  padding: 29px 32px;
  background: var(--surface);
  border-left: 3px solid var(--accent-soft);
}
.delivery-estimate .eyebrow {
  margin-bottom: 10px;
}
.delivery-estimate h2 {
  margin: 0 0 13px;
  font-size: 30px;
}
.delivery-estimate p {
  margin: 4px 0;
  font-size: 12px;
}
.delivery-estimate strong {
  color: var(--ink);
}
.related-products {
  margin-top: 72px;
  padding-top: 60px;
  border-top: 1px solid var(--line);
}
.related-products--family {
  margin-top: 54px;
  padding-top: 54px;
}
.recommendation-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.recently-viewed {
  margin-top: 72px;
}
.recently-viewed-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.related-products .section-heading h2,
.recently-viewed .section-heading h2 {
  font-size: 42px;
}
@media (max-width: 700px) {
  .purchase-panel {
    padding: 18px;
  }
  .purchase-panel > h2 {
    margin-bottom: 13px;
    font-size: 24px;
  }
  .purchase-guidance {
    max-width: 240px;
    margin-bottom: 22px;
  }
  .purchase-panel .variants {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .purchase-panel .variants button {
    min-height: 70px;
    padding: 12px 30px 12px 11px;
  }
  .purchase-panel .variants .selected {
    padding: 11px 29px 11px 10px;
  }
  .variant-check {
    right: 9px;
  }
  .purchase-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
  .purchase-summary .price {
    font-size: 32px;
    text-align: left;
  }
  .purchase-panel > .button {
    min-height: 52px;
  }
  .purchase-actions {
    grid-template-columns: 112px minmax(0, 1fr);
  }
  .quantity-picker {
    grid-template-columns: 32px minmax(42px, 1fr) 32px;
    min-height: 52px;
  }
  .quantity-picker input {
    min-height: 50px;
  }
  .add-to-cart {
    min-height: 52px;
    padding-inline: 11px;
    font-size: 10px;
  }
  .delivery-estimate {
    margin-top: 42px;
    padding: 24px;
  }
  .delivery-estimate h2,
  .related-products .section-heading h2,
  .recently-viewed .section-heading h2 {
    font-size: 31px;
  }
  .recently-viewed {
    margin-top: 48px;
  }
  .recently-viewed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .related-products {
    margin-top: 48px;
    padding-top: 42px;
  }
  .related-products--family {
    margin-top: 42px;
    padding-top: 42px;
  }
  .recommendation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  .olfactory-pyramid div {
    grid-template-columns: 65px 1fr;
  }
}
</style>
