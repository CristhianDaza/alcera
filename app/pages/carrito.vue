<script setup lang="ts">
import { money, reconcileCart } from "#shared/commerce";
const { lines, total } = useCart(),
  store = useStore();
const busy = ref(false),
  notice = ref(""),
  readyUrl = ref("");
const customer = reactive({ name: "", phone: "", city: "" });
const contactConsent = ref(false);
const orderId = ref("");
let attempt: { signature: string; id: string } | undefined;
watch([customer, contactConsent], () => {
  readyUrl.value = "";
  orderId.value = "";
});
watch(
  lines,
  () => {
    readyUrl.value = "";
    orderId.value = "";
  },
  { deep: true, flush: "sync" },
);
useSeoMeta({ title: "Tu bolsa · ALCÉRA", robots: "noindex, nofollow" });
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
      $fetch("/api/products"),
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
    if (!config.whatsapp) {
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
    };
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
    const result = await $fetch("/api/orders", {
      method: "POST",
      body: { ...payload, requestId: attempt.id },
    });
    readyUrl.value = result.whatsappUrl;
    orderId.value = result.id;
    notice.value =
      "Registramos tu solicitud. Abre WhatsApp para acordar el envío y el pago. Aún no es una compra confirmada ni reserva productos.";
  } catch (error) {
    notice.value =
      (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
      "No pudimos completar la solicitud. Reintenta: conservaremos la misma referencia para evitar duplicados.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="shell section">
    <div class="page-intro">
      <span class="eyebrow">CASI TUYOS</span>
      <h1>Tu <em>bolsa.</em></h1>
    </div>
    <ClientOnly
      ><div v-if="lines.length" class="cart-layout">
        <div>
          <NuxtLink class="text-link" to="/catalogo"
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
          <span class="eyebrow">TU SELECCIÓN</span>
          <h2>Resumen</h2>
          <div class="subtotal">
            <span>Subtotal</span><strong>{{ money(total) }}</strong>
          </div>
          <p>
            Precios en COP. Envío y pago se confirman por WhatsApp. Esta
            consulta no reserva productos.
          </p>
          <fieldset class="order-customer" :disabled="busy || !!readyUrl">
            <legend>Datos para coordinar tu pedido</legend>
            <label
              >Nombre<input
                v-model="customer.name"
                autocomplete="name"
                minlength="2"
                maxlength="120"
                required
            /></label>
            <label
              >WhatsApp con código de país<input
                v-model="customer.phone"
                type="tel"
                autocomplete="tel"
                placeholder="573001234567"
                pattern="[1-9][0-9]{7,14}"
                maxlength="15"
                required
              /><small>Sin + ni espacios.</small></label
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
            <label class="check"
              ><input v-model="contactConsent" type="checkbox" required />
              Autorizo que la tienda guarde estos datos y me contacte para
              gestionar esta solicitud.</label
            >
          </fieldset>
          <button
            v-if="!readyUrl"
            class="button full"
            type="submit"
            :disabled="busy"
          >
            {{ busy ? "Registrando…" : "Registrar solicitud" }} ↗
          </button>
          <p v-if="notice" role="status">{{ notice }}</p>
          <p v-if="orderId" class="order-reference">
            Referencia: <strong>{{ orderId }}</strong>
          </p>
          <a
            v-if="readyUrl"
            :href="readyUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="button full"
            >Abrir WhatsApp ↗</a
          >
        </form>
      </div>
      <div v-else class="empty">
        <h2>Tu próxima esencia te espera.</h2>
        <p>Aún no has añadido perfumes a tu bolsa.</p>
        <NuxtLink class="button" to="/catalogo"
          >Explorar la colección ↗</NuxtLink
        >
      </div>
      <template #fallback><p>Cargando tu bolsa…</p></template></ClientOnly
    >
  </section>
</template>
<style scoped>
.order-customer {
  border: 0;
  padding: 0;
  margin: 22px 0;
  display: grid;
  gap: 14px;
  min-width: 0;
}
.order-customer legend {
  margin-bottom: 12px;
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
.order-reference {
  overflow-wrap: anywhere;
  font-size: 12px;
}
</style>
