<script setup lang="ts">
import { money } from "#shared/commerce";
import {
  orderLabels,
  orderStatuses,
  orderTransitions,
  type Order,
  type OrderStatus,
} from "#shared/orders";
const props = defineProps<{
  getHeaders: () => Promise<{ Authorization: string }>;
}>();
const orders = ref<Order[]>([]),
  cursor = ref<string | null>(null);
const loading = ref(false),
  saving = ref(false),
  notice = ref("");
const selected = ref<Order | null>(null),
  filter = ref("");
const form = reactive({
  status: "pending" as OrderStatus,
  shipping: "",
  tracking: "",
  note: "",
  paymentConfirmed: false,
});
const visible = computed(() =>
  orders.value.filter((o) => !filter.value || o.status === filter.value),
);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
function errorMessage(error: unknown) {
  return (
    (error as { data?: { statusMessage?: string } }).data?.statusMessage ||
    "No se pudo completar la operación. Inténtalo de nuevo."
  );
}
async function load(more = false) {
  loading.value = true;
  notice.value = "";
  try {
    const result = await $fetch("/api/admin/orders", {
      headers: await props.getHeaders(),
      query: more && cursor.value ? { cursor: cursor.value } : {},
    });
    orders.value = more
      ? [
          ...orders.value,
          ...result.orders.filter(
            (o) => !orders.value.some((existing) => existing.id === o.id),
          ),
        ]
      : result.orders;
    cursor.value = result.nextCursor;
    if (!more) selected.value = null;
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}
function select(order: Order) {
  selected.value = order;
  Object.assign(form, {
    status: orderTransitions[order.status][0] || order.status,
    shipping: order.shipping === null ? "" : String(order.shipping),
    tracking: order.tracking,
    note: "",
    paymentConfirmed: false,
  });
  notice.value = "";
}
async function save() {
  if (!selected.value || (form.status === "paid" && !form.paymentConfirmed))
    return;
  saving.value = true;
  notice.value = "";
  try {
    await $fetch(`/api/admin/orders/${selected.value.id}`, {
      method: "PATCH",
      headers: await props.getHeaders(),
      body: {
        expectedStatus: selected.value.status,
        status: form.status,
        shipping: form.shipping === "" ? null : Number(form.shipping),
        tracking: form.tracking,
        note: form.note,
      },
    });
    await load();
    if (!notice.value) notice.value = "Estado guardado con su historial.";
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    saving.value = false;
  }
}
onMounted(() => load());
</script>
<template>
  <section class="orders-panel" aria-labelledby="orders-title">
    <div class="section-heading">
      <h2 id="orders-title">Pedidos</h2>
      <button
        type="button"
        class="text-link"
        :disabled="loading || saving"
        @click="load()"
      >
        Actualizar
      </button>
    </div>
    <p>
      Solicitudes de la tienda. Confirma disponibilidad y envío antes de
      solicitar el pago. No reservan inventario automáticamente.
    </p>
    <label
      >Filtrar pedidos cargados<select v-model="filter">
        <option value="">Todos los estados</option>
        <option v-for="status in orderStatuses" :key="status" :value="status">
          {{ orderLabels[status] }}
        </option>
      </select></label
    >
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <p v-if="loading" role="status">Cargando pedidos…</p>
    <p v-else-if="!visible.length">No hay pedidos en esta selección.</p>
    <div class="order-list">
      <button
        v-for="order in visible"
        :key="order.id"
        type="button"
        :disabled="saving"
        :aria-pressed="selected?.id === order.id"
        @click="select(order)"
      >
        <strong>{{ order.customer.name }} · {{ order.customer.city }}</strong>
        <span
          >{{ orderLabels[order.status] }} · {{ money(order.subtotal) }} +
          {{
            order.shipping === null
              ? "envío por acordar"
              : money(order.shipping) + " de envío"
          }}</span
        >
        <small>{{ formatDate(order.createdAt) }} · {{ order.id }}</small>
      </button>
    </div>
    <button
      v-if="cursor"
      type="button"
      class="text-link"
      :disabled="loading || saving"
      @click="load(true)"
    >
      Cargar más pedidos
    </button>
    <article v-if="selected" class="order-detail">
      <h3>Solicitud {{ selected.id }}</h3>
      <p>
        {{ selected.customer.name }} · {{ selected.customer.city }} ·
        <a
          :href="`https://wa.me/${selected.customer.phone}`"
          target="_blank"
          rel="noopener noreferrer"
          >{{ selected.customer.phone }} ↗</a
        >
      </p>
      <ul>
        <li
          v-for="item in selected.items"
          :key="`${item.productId}-${item.variantId}`"
        >
          {{ item.name }} · {{ item.size }} × {{ item.quantity }} —
          {{ money(item.price * item.quantity) }}
        </li>
      </ul>
      <p>
        Subtotal: <strong>{{ money(selected.subtotal) }}</strong> · Total:
        <strong>{{
          selected.shipping === null
            ? "Pendiente de acordar envío"
            : money(selected.subtotal + selected.shipping)
        }}</strong>
      </p>
      <form
        v-if="orderTransitions[selected.status].length"
        class="admin-fields"
        @submit.prevent="save"
      >
        <label
          >Siguiente estado<select v-model="form.status" :disabled="saving">
            <option
              v-for="status in orderTransitions[selected.status]"
              :key="status"
              :value="status"
            >
              {{ orderLabels[status] }}
            </option>
          </select></label
        >
        <label
          >Envío acordado (COP)<input
            v-model="form.shipping"
            type="number"
            min="0"
            max="100000000"
            step="1"
            :required="['awaiting_payment', 'paid'].includes(form.status)"
            :disabled="saving || ['paid', 'shipped'].includes(selected.status)"
          /><small
            >0 si es gratis; vacío si aún no se ha acordado.</small
          ></label
        >
        <label
          >Transportadora y guía (opcional)<input
            v-model="form.tracking"
            maxlength="200"
            :disabled="saving"
        /></label>
        <label
          >Nota / motivo<textarea
            v-model="form.note"
            maxlength="1000"
            :required="['lost', 'cancelled'].includes(form.status)"
            :disabled="saving"
          />
        </label>
        <label v-if="form.status === 'paid'" class="check wide"
          ><input
            v-model="form.paymentConfirmed"
            type="checkbox"
            required
            :disabled="saving"
          />
          Verifiqué que recibimos el pago completo de
          {{ money(selected.subtotal + Number(form.shipping || 0)) }}.</label
        >
        <button class="button" :disabled="saving || loading">
          {{ saving ? "Guardando…" : "Guardar estado" }}
        </button>
      </form>
      <p v-if="selected.tracking">
        Transportadora y guía: {{ selected.tracking }}
      </p>
      <h4>Historial</h4>
      <ol>
        <li v-for="(entry, index) in selected.history" :key="index">
          <strong>{{ orderLabels[entry.status] }}</strong> ·
          {{ formatDate(entry.at) }}
          <p>
            {{ entry.note }}
            <small
              >({{
                entry.actor === "customer"
                  ? "Cliente"
                  : "Administrador: " + entry.actor
              }})</small
            >
          </p>
        </li>
      </ol>
    </article>
  </section>
</template>
<style scoped>
.orders-panel {
  margin: 32px 0 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--line);
}
.order-list {
  display: grid;
  gap: 10px;
  margin: 20px 0;
}
.order-list button {
  display: grid;
  gap: 6px;
  padding: 16px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  overflow-wrap: anywhere;
}
.order-list button[aria-pressed="true"] {
  border-color: var(--accent);
}
.order-detail {
  margin-top: 24px;
  padding: 20px;
  background: var(--surface);
  overflow-wrap: anywhere;
}
.order-detail h3 {
  font-size: 18px;
}
.order-detail li {
  margin: 10px 0;
}
.order-detail input,
.order-detail select,
.order-detail textarea {
  min-width: 0;
  width: 100%;
}
.order-detail input[type="checkbox"] {
  width: auto;
}
</style>
