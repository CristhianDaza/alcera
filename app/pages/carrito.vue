<script setup lang="ts">
import { money, reconcileCart } from "#shared/commerce";
type BrebPaymentStatus = "PENDING" | "PENDING_VERIFICATION" | "PAID";
const { lines, total } = useCart(),
  store = useStore();
const catalog = useCatalogStore();
const route = useRoute();
const router = useRouter();
const runtime = useRuntimeConfig();
const brebQrImage = computed(() => {
  try {
    const url = new URL(String(runtime.public.brebQrImage || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
});
const paymentMethod = ref<"BREB" | "WHATSAPP">(
  brebQrImage.value ? "BREB" : "WHATSAPP",
);
const paymentStatus = ref<BrebPaymentStatus>("PENDING");
const busy = ref(false),
  notice = ref(""),
  readyUrl = ref("");
const customer = reactive({ name: "", phone: "", city: "" });
const contactConsent = ref(false);
const orderId = ref("");
const orderReference = ref("");
const brebAmount = ref(0);
const brebPaymentPanel = ref<HTMLElement | null>(null);
const whatsappOrderPanel = ref<HTMLElement | null>(null);
const isBrebOrder = computed(() =>
  Boolean(orderId.value && paymentMethod.value === "BREB"),
);
const isWhatsappOrder = computed(() =>
  Boolean(
    orderId.value && paymentMethod.value === "WHATSAPP" && readyUrl.value,
  ),
);
watch(paymentMethod, (method) => {
  void trackAnalyticsEvent("payment_method_selected", {
    payment_method: method,
  });
});
let attempt: { signature: string; id: string } | undefined;
const analyticsItems = computed(() =>
  lines.value.map((line) => ({
    item_id: line.productId,
    item_name: line.name,
    item_variant: line.size,
    price: line.price,
    quantity: line.quantity,
  })),
);
async function restoreBrebOrder(id: string) {
  const result = await $fetch<{
    id: string;
    reference: string;
    amountToPay: number;
    paymentStatus: BrebPaymentStatus;
  }>(`/api/orders/${encodeURIComponent(id)}`);
  orderId.value = result.id;
  orderReference.value = result.reference;
  brebAmount.value = result.amountToPay;
  paymentStatus.value = result.paymentStatus;
  paymentMethod.value = "BREB";
}
async function scrollToBrebPayment() {
  await nextTick();
  brebPaymentPanel.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
async function scrollToWhatsappOrder() {
  await nextTick();
  whatsappOrderPanel.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
onMounted(async () => {
  try {
    const requestedOrderId =
      typeof route.query.pedido === "string" ? route.query.pedido : "";
    const saved = JSON.parse(
      localStorage.getItem("alcera-breb-order") || "null",
    );
    const id =
      requestedOrderId || (saved?.paymentMethod === "BREB" ? saved.id : "");
    if (typeof id === "string" && id) {
      await restoreBrebOrder(id);
      if (requestedOrderId) await scrollToBrebPayment();
    }
  } catch {
    /* El pedido se puede recuperar de nuevo desde la misma referencia guardada. */
  }
  void trackAnalyticsEvent("view_cart", {
    currency: "COP",
    value: total.value,
    item_count: lines.value.reduce((sum, line) => sum + line.quantity, 0),
    items: analyticsItems.value,
  });
});
function trackWhatsappClick() {
  void trackAnalyticsEvent("whatsapp_click", {
    link_location: "checkout",
    order_id: orderId.value,
    currency: "COP",
    value: total.value,
    item_count: lines.value.reduce((sum, line) => sum + line.quantity, 0),
  });
}
function openWhatsappAndReturnToPerfumes() {
  trackWhatsappClick();
  lines.value = [];
  void router.push("/perfumes");
}
watch([customer, contactConsent], () => {
  if (orderId.value) return;
  readyUrl.value = "";
  orderId.value = "";
});
watch(
  lines,
  () => {
    if (orderId.value) return;
    readyUrl.value = "";
    orderId.value = "";
  },
  { deep: true, flush: "sync" },
);
useSeoMeta({
  title: "Tu bolsa · Alcéra Perfumes",
  robots: "noindex, nofollow",
});
function quantity(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Math.max(1, Math.min(99, Math.floor(Number(input.value) || 1)));
  lines.value[index]!.quantity = value;
  input.value = String(value);
}
async function checkout() {
  if (busy.value || readyUrl.value) return;
  busy.value = true;
  notice.value = "";
  readyUrl.value = "";
  try {
    const [products, config] = await Promise.all([
      catalog.ensureLoaded(true),
      $fetch("/api/settings"),
    ]);
    store.value = config;
    const updated = reconcileCart(lines.value, products);
    const changed = JSON.stringify(updated) !== JSON.stringify(lines.value);
    lines.value = updated;
    if (changed) {
      notice.value =
        "Actualizamos los precios o la disponibilidad. Revisa tu bolsa y vuelve a continuar.";
      return;
    }
    if (updated.some((l) => !l.available)) {
      notice.value = "Retira las presentaciones agotadas para continuar.";
      return;
    }
    if (paymentMethod.value === "WHATSAPP" && !config.whatsapp) {
      notice.value =
        "La tienda aún no tiene un WhatsApp configurado. No se ha enviado ningún pedido.";
      return;
    }
    if (!updated.length) return;
    const payload = {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        city: customer.city.trim(),
      },
      contactConsent: contactConsent.value,
      items: updated.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        expectedPrice: line.price,
      })),
      paymentMethod: paymentMethod.value,
    };
    void trackAnalyticsEvent("begin_checkout", {
      currency: "COP",
      value: total.value,
      item_count: updated.reduce((sum, line) => sum + line.quantity, 0),
      items: analyticsItems.value,
    });
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(payload)),
    );
    const signature = Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    if (!attempt) {
      try {
        attempt =
          JSON.parse(
            sessionStorage.getItem("alcera-order-attempt") || "null",
          ) ?? undefined;
      } catch {
        /* Optional retry persistence. */
      }
    }
    if (attempt?.signature !== signature)
      attempt = { signature, id: crypto.randomUUID() };
    try {
      sessionStorage.setItem("alcera-order-attempt", JSON.stringify(attempt));
    } catch {
      /* Retry still works during this page session. */
    }
    const result = await $fetch<{
      id: string;
      reference: string;
      amountToPay: number;
      whatsappUrl: string | null;
    }>("/api/orders", {
      method: "POST",
      body: { ...payload, requestId: attempt.id },
    });
    readyUrl.value = result.whatsappUrl || "";
    orderId.value = result.id;
    orderReference.value = result.reference;
    brebAmount.value = result.amountToPay;
    if (paymentMethod.value === "BREB") {
      try {
        localStorage.setItem(
          "alcera-breb-order",
          JSON.stringify({ id: result.id, paymentMethod: "BREB" }),
        );
      } catch {
        /* La referencia seguirá visible durante esta sesión. */
      }
      await router.replace({
        query: { ...route.query, pedido: result.id },
      });
      await scrollToBrebPayment();
      void trackAnalyticsEvent("breb_payment_started", {
        currency: "COP",
        value: total.value,
        order_id: result.id,
      });
    }
    void trackAnalyticsEvent("generate_lead", {
      currency: "COP",
      value: total.value,
      order_id: result.id,
    });
    notice.value =
      paymentMethod.value === "BREB"
        ? "Pedido creado. El envío no está incluido y se paga al recibir tu pedido."
        : "Registramos tu solicitud. Abre WhatsApp para acordar el envío y el pago. Aún no es una compra confirmada ni reserva productos.";
    if (paymentMethod.value === "WHATSAPP" && readyUrl.value) {
      await scrollToWhatsappOrder();
    }
  } catch (error) {
    notice.value =
      (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
      "No pudimos completar la solicitud. Reintenta: conservaremos la misma referencia para evitar duplicados.";
  } finally {
    busy.value = false;
  }
}
async function reportBrebPayment() {
  if (!orderId.value || busy.value || paymentStatus.value !== "PENDING") return;
  busy.value = true;
  notice.value = "";
  try {
    const result = await $fetch<{ paymentStatus: BrebPaymentStatus }>(
      `/api/orders/${encodeURIComponent(orderId.value)}/report-payment`,
      { method: "POST" },
    );
    paymentStatus.value = result.paymentStatus;
    if (result.paymentStatus === "PENDING_VERIFICATION") {
      const paidAmount = brebAmount.value;
      lines.value = [];
      void trackAnalyticsEvent("breb_payment_reported", {
        currency: "COP",
        value: paidAmount,
        order_id: orderId.value,
      });
      return;
    }
    void trackAnalyticsEvent("breb_payment_reported", {
      currency: "COP",
      value: total.value,
      order_id: orderId.value,
    });
  } catch (error) {
    notice.value =
      (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
      "No pudimos registrar el aviso. Intenta de nuevo.";
  } finally {
    busy.value = false;
  }
}
function clearSavedBrebOrder() {
  try {
    localStorage.removeItem("alcera-breb-order");
  } catch {
    /* No se requiere almacenamiento para salir de esta pantalla. */
  }
  orderId.value = "";
  orderReference.value = "";
  const query = { ...route.query };
  delete query.pedido;
  void router.replace({ query });
}
</script>
<template>
  <section class="shell section">
    <div class="page-intro">
      <span class="eyebrow">CASI TUYOS</span>
      <h1>Tu <em>bolsa.</em></h1>
    </div>
    <ClientOnly
      ><div
        v-if="lines.length && !isBrebOrder && !isWhatsappOrder"
        class="cart-layout"
      >
        <div>
          <NuxtLink class="text-link" to="/perfumes"
            >← Seguir explorando</NuxtLink
          >
          <article
            v-for="(line, index) in lines"
            :key="`${line.productId}-${line.variantId}`"
            class="cart-row"
          >
            <img
              :src="line.image"
              :alt="line.name"
              loading="lazy"
              decoding="async"
              width="120"
              height="140"
            />
            <div>
              <h2>{{ line.name }}</h2>
              <p>{{ line.size }} · {{ money(line.price) }}</p>
              <p v-if="!line.available" class="error">
                Agotado o retirado del catálogo
              </p>
              <button
                class="text-link"
                :disabled="busy"
                :aria-label="`Eliminar ${line.name}, ${line.size}`"
                @click="lines.splice(index, 1)"
              >
                Eliminar
              </button>
            </div>
            <label
              >Cantidad<input
                type="number"
                :disabled="busy"
                :value="line.quantity"
                min="1"
                max="99"
                @change="quantity(index, $event)" /></label
            ><strong>{{ money(line.price * line.quantity) }}</strong>
          </article>
        </div>
        <form class="summary" @submit.prevent="checkout">
          <section
            class="checkout-summary"
            aria-labelledby="checkout-summary-title"
          >
            <h2 id="checkout-summary-title">Resumen del pedido</h2>
            <div class="checkout-summary-row">
              <span>Subtotal</span><strong>{{ money(total) }}</strong>
            </div>
            <div class="checkout-summary-row">
              <span>Envío</span><strong>Pago al recibir</strong>
            </div>
            <div class="checkout-summary-row checkout-total">
              <span>Total a pagar ahora</span
              ><strong>{{ money(total) }}</strong>
            </div>
            <p class="shipping-note">El envío se paga al recibir tu pedido.</p>
          </section>
          <fieldset class="payment-choice" :disabled="busy || !!orderId">
            <legend>Forma de pago</legend>
            <label
              class="payment-option"
              :class="{ 'is-selected': paymentMethod === 'BREB' }"
            >
              <input
                v-model="paymentMethod"
                type="radio"
                value="BREB"
                :disabled="!brebQrImage"
              />
              <span
                ><strong>Bre-B / QR</strong
                ><small>Paga desde tu banco o billetera compatible.</small>
                <small class="payment-total"
                  >Total: {{ money(total) }}</small
                ></span
              >
            </label>
            <p v-if="!brebQrImage" class="muted">
              El pago Bre-B estará disponible cuando la tienda configure su QR.
            </p>
            <label
              class="payment-option"
              :class="{ 'is-selected': paymentMethod === 'WHATSAPP' }"
            >
              <input v-model="paymentMethod" type="radio" value="WHATSAPP" />
              <span
                ><strong>Coordinar pago por WhatsApp</strong
                ><small
                  >Te contactaremos para acordar la forma de pago.</small
                ></span
              >
            </label>
          </fieldset>
          <fieldset class="order-customer" :disabled="busy || !!readyUrl">
            <legend>Datos del pedido</legend>
            <label
              >Nombre<input
                v-model="customer.name"
                autocomplete="name"
                minlength="2"
                maxlength="120"
                required
            /></label>
            <label
              >Número de WhatsApp<input
                v-model="customer.phone"
                type="tel"
                autocomplete="tel"
                inputmode="numeric"
                placeholder="3001234567"
                pattern="3[0-9]{9}"
                maxlength="10"
                required
              /><small>Ingresa los 10 dígitos de tu celular.</small></label
            >
            <label
              >Ciudad y departamento<input
                v-model="customer.city"
                autocomplete="address-level2"
                minlength="2"
                maxlength="120"
                placeholder="Medellín, Antioquia"
                required
            /></label>
          </fieldset>
          <section class="checkout-consent" aria-labelledby="consent-title">
            <h3 id="consent-title">Consentimiento</h3>
            <label class="check"
              ><input
                v-model="contactConsent"
                type="checkbox"
                :disabled="busy || !!readyUrl"
                required
              />
              <span
                >Autorizo que la tienda trate estos datos y me contacte para
                gestionar esta solicitud, conforme a la
                <NuxtLink to="/politica-de-privacidad"
                  >Política de Privacidad</NuxtLink
                >.</span
              ></label
            >
          </section>
          <p class="checkout-legal">
            Al registrar la solicitud reconoces la
            <NuxtLink to="/politica-de-privacidad"
              >Política de Privacidad</NuxtLink
            >. Cualquier compra confirmada se regirá por los
            <NuxtLink to="/terminos-y-condiciones"
              >Términos y Condiciones</NuxtLink
            >.
          </p>
          <button
            v-if="!readyUrl"
            class="button full"
            type="submit"
            :disabled="busy"
          >
            {{
              busy
                ? "Registrando…"
                : paymentMethod === "BREB"
                  ? "Continuar al pago"
                  : "Coordinar por WhatsApp"
            }}
          </button>
          <p v-if="notice" role="status">{{ notice }}</p>
          <p v-if="orderReference" class="order-reference">
            Referencia: <strong>{{ orderReference }}</strong>
          </p>
        </form>
      </div>
      <div ref="brebPaymentPanel" v-else-if="isBrebOrder" class="breb-payment">
        <template v-if="paymentStatus === 'PENDING'">
          <span class="eyebrow">PAGO POR BRE-B</span>
          <h2 class="breb-order-reference">Pedido {{ orderReference }}</h2>
          <p class="breb-amount">
            Total a pagar ahora: <strong>{{ money(brebAmount) }}</strong>
          </p>
          <div class="subtotal">
            <span>Envío</span><strong>Pago al recibir</strong>
          </div>
          <img
            :src="brebQrImage"
            alt="Código QR Bre-B de Alcéra Perfumes"
            class="breb-qr"
          />
          <p>
            Escanea el código QR desde la app de tu banco o billetera
            compatible. El valor corresponde exactamente a los productos; el
            envío no está incluido.
          </p>
          <p class="muted">
            Si estás comprando desde tu celular, puedes tomar una captura del QR
            o abrir tu app bancaria y usar la opción de escanear desde una
            imagen, si está disponible.
          </p>
          <p>
            Cuando hayas realizado el pago, indícanoslo. La confirmación queda
            pendiente de verificación manual.
          </p>
          <button
            type="button"
            class="button full"
            :disabled="busy"
            @click="reportBrebPayment"
          >
            {{ busy ? "Registrando…" : "Ya realicé el pago" }}
          </button>
        </template>
        <template v-else-if="paymentStatus === 'PENDING_VERIFICATION'">
          <span class="eyebrow">PEDIDO {{ orderReference }}</span>
          <h2>Verificando pago</h2>
          <p role="status">
            Recibimos tu confirmación. Verificaremos el pago y te contactaremos
            a la mayor brevedad posible.
          </p>
          <p class="muted">Tu bolsa fue actualizada.</p>
        </template>
        <template v-else>
          <span class="eyebrow">PEDIDO {{ orderReference }}</span>
          <h2>Pago confirmado</h2>
          <p role="status">El equipo actualizará el estado de tu pedido.</p>
        </template>
        <p v-if="notice" role="status">{{ notice }}</p>
        <NuxtLink to="/perfumes" class="text-link" @click="clearSavedBrebOrder"
          >Seguir explorando</NuxtLink
        >
      </div>
      <div
        ref="whatsappOrderPanel"
        v-else-if="isWhatsappOrder"
        class="breb-payment whatsapp-order"
      >
        <span class="eyebrow">SOLICITUD REGISTRADA</span>
        <h2 class="breb-order-reference">Pedido {{ orderReference }}</h2>
        <p>
          Abre WhatsApp para acordar la forma de pago y el envío. La solicitud
          aún no confirma una compra ni reserva productos.
        </p>
        <section
          class="whatsapp-order-summary"
          aria-labelledby="whatsapp-summary-title"
        >
          <h3 id="whatsapp-summary-title">Resumen del pedido</h3>
          <div
            v-for="line in lines"
            :key="`${line.productId}-${line.variantId}`"
            class="checkout-summary-row whatsapp-order-item"
          >
            <span>{{ line.quantity }} × {{ line.name }} · {{ line.size }}</span>
            <strong>{{ money(line.price * line.quantity) }}</strong>
          </div>
          <div class="checkout-summary-row">
            <span>Subtotal</span><strong>{{ money(total) }}</strong>
          </div>
          <div class="checkout-summary-row">
            <span>Envío</span><strong>Pago al recibir</strong>
          </div>
          <div class="checkout-summary-row checkout-total">
            <span>Total de productos</span><strong>{{ money(total) }}</strong>
          </div>
        </section>
        <a
          :href="readyUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="button full"
          @click="openWhatsappAndReturnToPerfumes"
          >Abrir WhatsApp ↗</a
        >
      </div>
      <div v-else class="empty">
        <h2>Tu próxima esencia te espera.</h2>
        <p>Aún no has añadido perfumes a tu bolsa.</p>
        <NuxtLink class="button" to="/perfumes">Explorar la colección</NuxtLink>
      </div>
      <template #fallback><p>Cargando tu bolsa…</p></template></ClientOnly
    >
  </section>
</template>
<style scoped>
.order-customer {
  border: 0;
  padding: 0;
  margin: 16px 0 18px;
  display: grid;
  gap: 12px;
  min-width: 0;
}
.payment-choice {
  display: grid;
  gap: 10px;
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 20px 0 0;
}
.payment-choice legend {
  margin-bottom: 10px;
  font-weight: 600;
}
.payment-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--line-strong);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}
.payment-option.is-selected {
  border: 2px solid var(--accent);
  padding: 13px;
  background: var(--surface);
}
.payment-option:focus-within {
  outline: 2px solid var(--accent-soft);
  outline-offset: 3px;
}
.payment-option input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--accent);
}
.payment-option span {
  display: grid;
  gap: 5px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.payment-option small {
  color: var(--muted);
  line-height: 1.4;
}
.payment-option .payment-total {
  color: var(--ink);
  font-weight: 600;
}
.checkout-summary h2 {
  margin: 0 0 14px;
  font-size: clamp(24px, 3vw, 30px);
}
.checkout-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 14px;
  padding: 8px 0;
}
.checkout-summary-row strong {
  text-align: right;
  overflow-wrap: anywhere;
}
.checkout-total {
  margin-top: 6px;
  padding: 14px 0 10px;
  border-top: 1px solid var(--line-strong);
  font-weight: 700;
}
.checkout-total strong {
  color: var(--accent);
  font-size: 1.2em;
}
.shipping-note {
  margin: 5px 0 0;
  color: var(--muted);
}
.checkout-consent {
  margin: 0 0 12px;
}
.checkout-consent h3 {
  margin: 0 0 8px;
  font-size: 14px;
}
.breb-payment {
  width: min(100%, 620px);
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 16px;
  background: var(--surface);
}
.breb-payment h2,
.breb-payment p {
  margin: 0;
}
.breb-order-reference {
  font-size: clamp(20px, 5vw, 30px);
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.breb-amount {
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 600;
}
.breb-amount strong {
  font-size: 1.2em;
}
.breb-qr {
  width: min(100%, 360px);
  aspect-ratio: 1;
  object-fit: contain;
  margin: 0 auto;
  background: white;
}
.order-customer legend {
  margin-bottom: 4px;
  font-weight: 600;
}
.order-customer label:not(.check) {
  display: grid;
  gap: 5px;
}
.order-customer input:not([type="checkbox"]) {
  width: 100%;
  min-width: 0;
}
.order-customer .check {
  align-items: flex-start;
  font-size: 12px;
}
.checkout-consent .check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.checkout-consent input[type="checkbox"] {
  flex: 0 0 auto;
  margin-top: 2px;
}
.whatsapp-order > p {
  margin: 0;
}
.whatsapp-order-summary {
  border-block: 1px solid var(--line);
  padding: 12px 0;
}
.whatsapp-order-summary h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.whatsapp-order-item span {
  overflow-wrap: anywhere;
}
.order-customer .check a,
.checkout-legal a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.checkout-legal {
  margin: -8px 0 18px;
  font-size: 11px;
}
.order-reference {
  overflow-wrap: anywhere;
  font-size: 12px;
}
@media (max-width: 700px) {
  .summary {
    padding: 20px 16px;
  }
  .payment-option {
    padding: 13px;
  }
  .payment-option.is-selected {
    padding: 12px;
  }
  .summary .button.full {
    min-height: 52px;
  }
}
</style>
