<script setup lang="ts">
import { money } from "#shared/commerce";
import {
  cashAccounts,
  expenseCategories,
  paymentMethods,
  saleChannels,
  saleStatuses,
  type CashMovement,
  type DashboardData,
  type Expense,
  type InventoryMovement,
  type InventoryRow,
  type Purchase,
  type Sale,
  type Supplier,
} from "#shared/business";
import type { Product } from "#shared/types";

const props = defineProps<{
  getHeaders: () => Promise<{ Authorization: string }>;
  catalog: Product[];
}>();
type Section =
  "summary" | "sales" | "inventory" | "purchases" | "expenses" | "cash";
const section = ref<Section>("summary");
const busy = ref(false),
  notice = ref("");
const dashboard = ref<DashboardData | null>(null),
  sales = ref<Sale[]>([]),
  inventory = ref<InventoryRow[]>([]),
  movements = ref<InventoryMovement[]>([]),
  purchases = ref<Purchase[]>([]),
  suppliers = ref<Supplier[]>([]),
  expenses = ref<Expense[]>([]),
  cash = ref<CashMovement[]>([]);
const today = () => new Date().toISOString().slice(0, 10);
const localIso = (date: string) => `${date}T12:00:00.000Z`;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
const errorMessage = (error: unknown) =>
  (error as { data?: { statusMessage?: string }; message?: string }).data
    ?.statusMessage ||
  (error as Error).message ||
  "No se pudo completar la operación.";
const labels: Record<string, string> = {
  website: "Sitio web",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  physical: "Punto físico",
  referral: "Referido",
  other: "Otro",
  draft: "Borrador",
  pending_payment: "Pendiente de pago",
  paid: "Pagada",
  delivered: "Entregada",
  cancelled: "Anulada",
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  nequi: "Nequi",
  daviplata: "Daviplata",
  card: "Datáfono",
  payment_link: "Enlace de pago",
  bancolombia: "Bancolombia",
  shipping: "Envío",
  packaging: "Empaque",
  advertising: "Publicidad",
  platform_fee: "Comisión",
  rent: "Arriendo",
  utilities: "Servicios",
  payroll: "Nómina / honorarios",
  taxes: "Impuestos",
  transport: "Transporte",
  supplies: "Suministros",
  opening_balance: "Saldo inicial",
  capital: "Aporte de capital",
  withdrawal: "Retiro",
  adjustment: "Ajuste",
  sale_refund: "Devolución de venta",
};
const options = computed(() =>
  props.catalog.flatMap((product) =>
    product.variants.map((variant) => ({
      productId: product.id,
      variantId: variant.id,
      label: `${product.name} · ${variant.size}`,
      price: variant.price,
    })),
  ),
);

async function api<T>(url: string, options: Parameters<typeof $fetch>[1] = {}) {
  return await $fetch<T>(url, {
    ...options,
    headers: await props.getHeaders(),
  } as never);
}
async function load(target = section.value) {
  busy.value = true;
  notice.value = "";
  try {
    if (target === "summary")
      dashboard.value = await api<DashboardData>("/api/admin/dashboard");
    if (target === "sales") sales.value = await api<Sale[]>("/api/admin/sales");
    if (target === "inventory")
      [inventory.value, movements.value] = await Promise.all([
        api<InventoryRow[]>("/api/admin/inventory"),
        api<InventoryMovement[]>("/api/admin/inventory/movements"),
      ]);
    if (target === "purchases")
      [purchases.value, suppliers.value] = await Promise.all([
        api<Purchase[]>("/api/admin/purchases"),
        api<Supplier[]>("/api/admin/suppliers"),
      ]);
    if (target === "expenses")
      expenses.value = await api<Expense[]>("/api/admin/expenses");
    if (target === "cash")
      cash.value = await api<CashMovement[]>("/api/admin/cash-movements");
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
}
watch(section, (value) => load(value));
onMounted(() => load("summary"));

const saleForm = reactive({
  date: today(),
  customerName: "",
  customerPhone: "",
  customerCity: "",
  channel: "physical",
  shipping: 0,
  notes: "",
  items: [{ selection: "", quantity: 1, unitPrice: 0, discount: 0 }],
});
function useCatalogPrice(line: (typeof saleForm.items)[number]) {
  const match = options.value.find(
    (item) => `${item.productId}/${item.variantId}` === line.selection,
  );
  if (match) line.unitPrice = match.price;
}
async function createSale() {
  if (saleForm.items.some((item) => !item.selection)) return;
  await perform(async () => {
    const customer = saleForm.customerName.trim()
      ? {
          name: saleForm.customerName,
          phone: saleForm.customerPhone || undefined,
          city: saleForm.customerCity || undefined,
        }
      : undefined;
    await api("/api/admin/sales", {
      method: "POST",
      body: {
        occurredAt: localIso(saleForm.date),
        customer,
        channel: saleForm.channel,
        status: "pending_payment",
        shippingCharged: Number(saleForm.shipping),
        notes: saleForm.notes || undefined,
        items: saleForm.items.map((item) => {
          const [productId, variantId] = item.selection.split("/");
          return {
            productId,
            variantId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
          };
        }),
      },
    });
    Object.assign(saleForm, {
      date: today(),
      customerName: "",
      customerPhone: "",
      customerCity: "",
      channel: "physical",
      shipping: 0,
      notes: "",
      items: [{ selection: "", quantity: 1, unitPrice: 0, discount: 0 }],
    });
    await load("sales");
    return "Venta registrada.";
  });
}
const payForm = reactive({
  saleId: "",
  amount: 0,
  method: "cash",
  account: "cash",
  reference: "",
});
function startPayment(sale: Sale) {
  Object.assign(payForm, {
    saleId: sale.id,
    amount: sale.balanceDue,
    method: "cash",
    account: "cash",
    reference: "",
  });
}
async function addPayment() {
  await perform(async () => {
    await api(`/api/admin/sales/${payForm.saleId}/payments`, {
      method: "POST",
      body: {
        date: new Date().toISOString(),
        amount: Number(payForm.amount),
        method: payForm.method,
        cashAccount: payForm.account,
        reference: payForm.reference || undefined,
      },
    });
    payForm.saleId = "";
    await load("sales");
    return "Pago registrado en caja.";
  });
}
async function confirmSale(sale: Sale) {
  await perform(async () => {
    await api(`/api/admin/sales/${sale.id}/confirm`, { method: "POST" });
    await load("sales");
    return "Venta confirmada e inventario descontado.";
  });
}
async function deliverSale(sale: Sale) {
  await perform(async () => {
    await api(`/api/admin/sales/${sale.id}/deliver`, { method: "POST" });
    await load("sales");
    return "Venta marcada como entregada.";
  });
}
async function cancelSale(sale: Sale) {
  const reason = window.prompt("Motivo obligatorio de la anulación:");
  if (!reason) return;
  let refundAccount: string | undefined;
  if (sale.paidTotal > 0) {
    const selected = window.prompt(
      `Se registrará una devolución de ${money(sale.paidTotal)}. Escribe la cuenta: cash, nequi, bancolombia, daviplata, card u other`,
      "cash",
    );
    if (!selected || !cashAccounts.includes(selected as never)) {
      notice.value = "Cuenta de devolución inválida.";
      return;
    }
    refundAccount = selected;
  }
  await perform(async () => {
    await api(`/api/admin/sales/${sale.id}/cancel`, {
      method: "POST",
      body: { reason, refundAccount },
    });
    await load("sales");
    return "Venta anulada, inventario restaurado y devolución registrada cuando aplicaba.";
  });
}

const inventoryFilter = ref("");
const filteredInventory = computed(() =>
  inventory.value.filter(
    (row) =>
      !inventoryFilter.value ||
      `${row.name} ${row.brand} ${row.size}`
        .toLowerCase()
        .includes(inventoryFilter.value.toLowerCase()),
  ),
);
const movementForm = reactive({
  selection: "",
  type: "adjustment",
  quantityChange: 1,
  unitCost: 0,
  reason: "inventario inicial",
});
async function createMovement() {
  if (!movementForm.selection) return;
  await perform(async () => {
    const [productId, variantId] = movementForm.selection.split("/");
    await api("/api/admin/inventory/movements", {
      method: "POST",
      body: {
        productId,
        variantId,
        type: movementForm.type,
        quantityChange: Number(movementForm.quantityChange),
        unitCost: movementForm.unitCost ? Number(movementForm.unitCost) : null,
        reason: movementForm.reason,
        occurredAt: new Date().toISOString(),
      },
    });
    await load("inventory");
    return "Movimiento de inventario registrado.";
  });
}
async function configureStock(row: InventoryRow) {
  const minimum = window.prompt("Stock mínimo", String(row.minimumStock));
  if (minimum === null) return;
  const cost = window.prompt(
    "Costo promedio unitario (COP)",
    String(row.averageCost),
  );
  if (cost === null) return;
  await perform(async () => {
    await api(
      `/api/admin/inventory/${row.productId}/${row.variantId}/settings`,
      {
        method: "PATCH",
        body: { minimumStock: Number(minimum), averageCost: Number(cost) },
      },
    );
    await load("inventory");
    return "Configuración actualizada.";
  });
}

const supplierForm = reactive({ name: "", phone: "", city: "" });
async function createSupplier() {
  await perform(async () => {
    await api("/api/admin/suppliers", {
      method: "POST",
      body: {
        ...supplierForm,
        phone: supplierForm.phone || undefined,
        city: supplierForm.city || undefined,
      },
    });
    Object.assign(supplierForm, { name: "", phone: "", city: "" });
    await load("purchases");
    return "Proveedor creado.";
  });
}
const purchaseForm = reactive({
  date: today(),
  supplierId: "",
  supplierName: "",
  invoice: "",
  paymentStatus: "pending",
  account: "cash",
  freight: 0,
  notes: "",
  items: [{ selection: "", quantity: 1, unitCost: 0, discount: 0 }],
});
watch(
  () => purchaseForm.supplierId,
  (id) => {
    purchaseForm.supplierName =
      suppliers.value.find((supplier) => supplier.id === id)?.name ??
      purchaseForm.supplierName;
  },
);
async function createPurchase() {
  if (purchaseForm.items.some((item) => !item.selection)) return;
  await perform(async () => {
    await api("/api/admin/purchases", {
      method: "POST",
      body: {
        supplierId: purchaseForm.supplierId || undefined,
        supplierName: purchaseForm.supplierName,
        date: localIso(purchaseForm.date),
        invoice: purchaseForm.invoice || undefined,
        paymentStatus: purchaseForm.paymentStatus,
        cashAccount:
          purchaseForm.paymentStatus === "paid"
            ? purchaseForm.account
            : undefined,
        freight: Number(purchaseForm.freight),
        notes: purchaseForm.notes || undefined,
        items: purchaseForm.items.map((item) => {
          const [productId, variantId] = item.selection.split("/");
          return {
            productId,
            variantId,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            discount: Number(item.discount),
          };
        }),
      },
    });
    await load("purchases");
    return "Compra guardada como borrador.";
  });
}
async function confirmPurchase(purchase: Purchase) {
  if (
    !window.confirm(`¿Confirmar ${purchase.number}? Aumentará el inventario.`)
  )
    return;
  await perform(async () => {
    await api(`/api/admin/purchases/${purchase.id}/confirm`, {
      method: "POST",
    });
    await load("purchases");
    return "Compra confirmada e inventario actualizado.";
  });
}

const expenseForm = reactive({
  date: today(),
  description: "",
  category: "shipping",
  amount: 0,
  supplier: "",
  status: "paid",
  method: "cash",
  account: "cash",
  receipt: "",
});
async function createExpense() {
  await perform(async () => {
    await api("/api/admin/expenses", {
      method: "POST",
      body: {
        date: localIso(expenseForm.date),
        description: expenseForm.description,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        supplier: expenseForm.supplier || undefined,
        status: expenseForm.status,
        paymentMethod:
          expenseForm.status === "paid" ? expenseForm.method : undefined,
        cashAccount:
          expenseForm.status === "paid" ? expenseForm.account : undefined,
        receipt: expenseForm.receipt || undefined,
      },
    });
    await load("expenses");
    return "Gasto registrado.";
  });
}
const cashForm = reactive({
  date: today(),
  direction: "in",
  type: "opening_balance",
  account: "cash",
  amount: 0,
  description: "",
});
async function createCashMovement() {
  await perform(async () => {
    await api("/api/admin/cash-movements", {
      method: "POST",
      body: {
        ...cashForm,
        date: localIso(cashForm.date),
        amount: Number(cashForm.amount),
      },
    });
    await load("cash");
    return "Movimiento de caja registrado.";
  });
}
async function perform(action: () => Promise<string>) {
  busy.value = true;
  notice.value = "";
  try {
    notice.value = await action();
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="business-panel">
    <nav class="business-nav" aria-label="Gestión del negocio">
      <button
        v-for="item in [
          ['summary', 'Resumen'],
          ['sales', 'Ventas'],
          ['inventory', 'Inventario'],
          ['purchases', 'Compras'],
          ['expenses', 'Gastos'],
          ['cash', 'Caja'],
        ] as const"
        :key="item[0]"
        type="button"
        :aria-current="section === item[0] ? 'page' : undefined"
        @click="section = item[0]"
      >
        {{ item[1] }}
      </button>
    </nav>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-if="busy" class="muted" role="status">Actualizando información…</p>

    <template v-if="section === 'summary'">
      <div class="section-heading">
        <div>
          <span class="eyebrow">OPERACIÓN</span>
          <h2>Resumen del mes</h2>
        </div>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <div v-if="dashboard" class="metric-grid">
        <article>
          <span>Ventas cobradas</span
          ><strong>{{ money(dashboard.paidSales) }}</strong>
        </article>
        <article>
          <span>Ventas registradas</span
          ><strong>{{ money(dashboard.registeredSales) }}</strong>
        </article>
        <article>
          <span>Utilidad bruta estimada</span
          ><strong>{{ money(dashboard.grossProfit) }}</strong>
        </article>
        <article>
          <span>Saldo de caja</span
          ><strong>{{ money(dashboard.cashBalance) }}</strong>
        </article>
        <article>
          <span>Por cobrar</span
          ><strong>{{ money(dashboard.receivable) }}</strong>
        </article>
        <article>
          <span>Inventario bajo</span><strong>{{ dashboard.lowStock }}</strong>
        </article>
      </div>
      <div v-if="dashboard" class="business-columns">
        <article class="business-card">
          <h3>Productos más vendidos</h3>
          <p v-if="!dashboard.topProducts.length" class="muted">
            Aún no hay ventas.
          </p>
          <ol>
            <li v-for="item in dashboard.topProducts" :key="item.name">
              {{ item.name }} <strong>{{ item.quantity }}</strong>
            </li>
          </ol>
        </article>
        <article class="business-card">
          <h3>Ventas por canal</h3>
          <p v-if="!dashboard.salesByChannel.length" class="muted">
            Aún no hay ventas.
          </p>
          <p v-for="item in dashboard.salesByChannel" :key="item.channel">
            {{ labels[item.channel] }} <strong>{{ money(item.total) }}</strong>
          </p>
        </article>
      </div>
    </template>

    <template v-else-if="section === 'sales'">
      <div class="section-heading">
        <h2>Ventas</h2>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <details class="business-card">
        <summary>Registrar venta manual</summary>
        <form class="admin-fields compact-form" @submit.prevent="createSale">
          <label
            >Fecha<input v-model="saleForm.date" type="date" required /></label
          ><label
            >Canal<select v-model="saleForm.channel">
              <option v-for="value in saleChannels" :key="value" :value="value">
                {{ labels[value] }}
              </option>
            </select></label
          ><label
            >Cliente (opcional)<input
              v-model="saleForm.customerName"
              maxlength="120" /></label
          ><label
            >Teléfono<input
              v-model="saleForm.customerPhone"
              maxlength="30" /></label
          ><label
            >Ciudad<input
              v-model="saleForm.customerCity"
              maxlength="120" /></label
          ><label
            >Envío COP<AdminMoneyInput v-model="saleForm.shipping"
          /></label>
          <div
            v-for="(line, index) in saleForm.items"
            :key="index"
            class="business-line wide"
          >
            <label
              >Presentación<select
                v-model="line.selection"
                required
                @change="useCatalogPrice(line)"
              >
                <option value="">Selecciona…</option>
                <option
                  v-for="item in options"
                  :key="item.productId + item.variantId"
                  :value="`${item.productId}/${item.variantId}`"
                >
                  {{ item.label }}
                </option>
              </select></label
            ><label
              >Cantidad<input
                v-model.number="line.quantity"
                type="number"
                min="1"
                required /></label
            ><label
              >Precio unitario COP<AdminMoneyInput
                v-model="line.unitPrice"
                required /></label
            ><label
              >Descuento total de la línea (COP)<AdminMoneyInput
                v-model="line.discount" /></label
            ><button
              v-if="saleForm.items.length > 1"
              type="button"
              class="text-link"
              @click="saleForm.items.splice(index, 1)"
            >
              Quitar
            </button>
          </div>
          <button
            type="button"
            class="text-link"
            @click="
              saleForm.items.push({
                selection: '',
                quantity: 1,
                unitPrice: 0,
                discount: 0,
              })
            "
          >
            Añadir línea ＋</button
          ><label class="wide"
            >Notas<textarea
              v-model="saleForm.notes"
              maxlength="2000"
            ></textarea></label
          ><button class="button" :disabled="busy">Guardar venta</button>
        </form>
      </details>
      <div class="business-table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th>Venta</th>
              <th>Cliente / canal</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in sales" :key="sale.id">
              <td>
                <strong>{{ sale.number }}</strong
                ><small>{{ formatDate(sale.createdAt) }}</small>
              </td>
              <td>
                {{ sale.customer?.name || "Sin cliente"
                }}<small>{{ labels[sale.channel] }}</small>
              </td>
              <td>
                {{ money(sale.total)
                }}<small>Saldo {{ money(sale.balanceDue) }}</small>
              </td>
              <td>
                <span class="status-pill">{{ labels[sale.status] }}</span>
              </td>
              <td class="row-actions">
                <button
                  v-if="
                    sale.balanceDue > 0 &&
                    !['draft', 'cancelled'].includes(sale.status)
                  "
                  type="button"
                  class="text-link"
                  @click="startPayment(sale)"
                >
                  Abonar</button
                ><button
                  v-if="
                    sale.balanceDue === 0 &&
                    !sale.inventoryAppliedAt &&
                    sale.status !== 'cancelled'
                  "
                  type="button"
                  class="text-link"
                  @click="confirmSale(sale)"
                >
                  Confirmar</button
                ><button
                  v-if="sale.status === 'paid' && sale.inventoryAppliedAt"
                  type="button"
                  class="text-link"
                  @click="deliverSale(sale)"
                >
                  Entregar</button
                ><button
                  v-if="sale.status !== 'cancelled'"
                  type="button"
                  class="text-link danger"
                  @click="cancelSale(sale)"
                >
                  Anular
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <form
        v-if="payForm.saleId"
        class="business-card admin-fields compact-form"
        @submit.prevent="addPayment"
      >
        <h3 class="wide">Registrar pago</h3>
        <label
          >Valor COP<AdminMoneyInput v-model="payForm.amount" required /></label
        ><label
          >Medio<select v-model="payForm.method">
            <option v-for="value in paymentMethods" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label
          >Cuenta<select v-model="payForm.account">
            <option v-for="value in cashAccounts" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label>Referencia<input v-model="payForm.reference" /></label
        ><button class="button" :disabled="busy">Guardar pago</button
        ><button type="button" class="text-link" @click="payForm.saleId = ''">
          Cancelar
        </button>
      </form>
    </template>

    <template v-else-if="section === 'inventory'">
      <div class="section-heading">
        <h2>Inventario</h2>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <details class="business-card">
        <summary>Registrar entrada, salida o ajuste</summary>
        <form
          class="admin-fields compact-form"
          @submit.prevent="createMovement"
        >
          <label class="wide"
            >Presentación<select v-model="movementForm.selection" required>
              <option value="">Selecciona…</option>
              <option
                v-for="item in options"
                :key="item.productId + item.variantId"
                :value="`${item.productId}/${item.variantId}`"
              >
                {{ item.label }}
              </option>
            </select></label
          ><label
            >Tipo<select v-model="movementForm.type">
              <option value="adjustment">Ajuste</option>
              <option value="customer_return">Devolución cliente</option>
              <option value="supplier_return">Devolución proveedor</option>
              <option value="sample">Muestra / regalo</option>
              <option value="damage_loss">Daño / pérdida</option>
            </select></label
          ><label
            >Cambio de unidades<input
              v-model.number="movementForm.quantityChange"
              type="number"
              step="1"
              required
            /><small>Usa un número negativo para restar.</small></label
          ><label
            >Costo unitario COP<AdminMoneyInput
              v-model="movementForm.unitCost" /></label
          ><label class="wide"
            >Motivo<input
              v-model="movementForm.reason"
              required
              maxlength="500" /></label
          ><button class="button" :disabled="busy">Registrar movimiento</button>
        </form>
      </details>
      <label class="admin-search-label"
        >Buscar<input
          v-model="inventoryFilter"
          type="search"
          placeholder="Perfume, marca o tamaño"
      /></label>
      <div class="business-table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th>Presentación</th>
              <th>Existencias</th>
              <th>Mínimo</th>
              <th>Costo promedio</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredInventory" :key="row.variantId">
              <td>
                <strong>{{ row.name }} · {{ row.size }}</strong
                ><small
                  >{{ row.brand }} ·
                  {{ row.type === "decant" ? "Decant" : "Frasco" }}</small
                >
              </td>
              <td>
                <span class="stock-dot" :class="`stock-${row.state}`"></span
                >{{ row.stock }}
              </td>
              <td>{{ row.minimumStock }}</td>
              <td>{{ money(row.averageCost) }}</td>
              <td>{{ money(row.value) }}</td>
              <td>
                <button
                  class="text-link"
                  type="button"
                  @click="configureStock(row)"
                >
                  Configurar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Movimientos recientes</h3>
      <div class="business-table-wrap">
        <table class="business-table">
          <tbody>
            <tr v-for="item in movements.slice(0, 20)" :key="item.id">
              <td>{{ formatDate(item.occurredAt) }}</td>
              <td>{{ item.reason }}</td>
              <td :class="item.quantityChange < 0 ? 'danger' : ''">
                {{ item.quantityChange > 0 ? "+" : ""
                }}{{ item.quantityChange }}
              </td>
              <td>{{ item.stockBefore }} → {{ item.stockAfter }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="section === 'purchases'">
      <div class="section-heading">
        <h2>Compras y proveedores</h2>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <div class="business-columns">
        <details class="business-card">
          <summary>Nuevo proveedor</summary>
          <form class="stack-form" @submit.prevent="createSupplier">
            <label>Nombre<input v-model="supplierForm.name" required /></label
            ><label>Teléfono<input v-model="supplierForm.phone" /></label
            ><label>Ciudad<input v-model="supplierForm.city" /></label
            ><button class="button" :disabled="busy">Guardar proveedor</button>
          </form>
        </details>
        <details class="business-card" open>
          <summary>Registrar compra</summary>
          <form class="stack-form" @submit.prevent="createPurchase">
            <label
              >Fecha<input
                v-model="purchaseForm.date"
                type="date"
                required /></label
            ><label
              >Proveedor registrado<select v-model="purchaseForm.supplierId">
                <option value="">Otro</option>
                <option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :value="supplier.id"
                >
                  {{ supplier.name }}
                </option>
              </select></label
            ><label
              >Nombre del proveedor<input
                v-model="purchaseForm.supplierName"
                required /></label
            ><label
              >Factura / referencia<input
                v-model="purchaseForm.invoice" /></label
            ><label
              >Pago<select v-model="purchaseForm.paymentStatus">
                <option value="pending">Pendiente</option>
                <option value="paid">Pagada</option>
              </select></label
            ><label v-if="purchaseForm.paymentStatus === 'paid'"
              >Cuenta<select v-model="purchaseForm.account">
                <option
                  v-for="value in cashAccounts"
                  :key="value"
                  :value="value"
                >
                  {{ labels[value] || value }}
                </option>
              </select></label
            >
            <div
              v-for="(line, index) in purchaseForm.items"
              :key="index"
              class="business-line"
            >
              <label
                >Presentación<select v-model="line.selection" required>
                  <option value="">Selecciona…</option>
                  <option
                    v-for="item in options"
                    :key="item.productId + item.variantId"
                    :value="`${item.productId}/${item.variantId}`"
                  >
                    {{ item.label }}
                  </option>
                </select></label
              ><label
                >Cantidad<input
                  v-model.number="line.quantity"
                  type="number"
                  min="1"
                  required /></label
              ><label
                >Costo unitario COP<AdminMoneyInput
                  v-model="line.unitCost"
                  required /></label
              ><label
                >Descuento total de la línea (COP)<AdminMoneyInput
                  v-model="line.discount" /></label
              ><button
                v-if="purchaseForm.items.length > 1"
                type="button"
                class="text-link"
                @click="purchaseForm.items.splice(index, 1)"
              >
                Quitar
              </button>
            </div>
            <button
              type="button"
              class="text-link"
              @click="
                purchaseForm.items.push({
                  selection: '',
                  quantity: 1,
                  unitCost: 0,
                  discount: 0,
                })
              "
            >
              Añadir línea ＋</button
            ><label
              >Flete / otros costos COP<AdminMoneyInput
                v-model="purchaseForm.freight" /></label
            ><button class="button" :disabled="busy">Guardar compra</button>
          </form>
        </details>
      </div>
      <div class="business-table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th>Compra</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="purchase in purchases" :key="purchase.id">
              <td>
                <strong>{{ purchase.number }}</strong
                ><small>{{ formatDate(purchase.date) }}</small>
              </td>
              <td>{{ purchase.supplierName }}</td>
              <td>{{ money(purchase.total) }}</td>
              <td>
                {{
                  purchase.status === "confirmed" ? "Confirmada" : "Borrador"
                }}
              </td>
              <td>
                <button
                  v-if="purchase.status === 'draft'"
                  class="text-link"
                  type="button"
                  @click="confirmPurchase(purchase)"
                >
                  Confirmar entrada
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="section === 'expenses'">
      <div class="section-heading">
        <h2>Gastos</h2>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <form
        class="business-card admin-fields compact-form"
        @submit.prevent="createExpense"
      >
        <label
          >Fecha<input v-model="expenseForm.date" type="date" required /></label
        ><label class="wide"
          >Descripción<input
            v-model="expenseForm.description"
            required
            maxlength="500" /></label
        ><label
          >Categoría<select v-model="expenseForm.category">
            <option
              v-for="value in expenseCategories"
              :key="value"
              :value="value"
            >
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label
          >Valor COP<AdminMoneyInput
            v-model="expenseForm.amount"
            required /></label
        ><label
          >Estado<select v-model="expenseForm.status">
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
          </select></label
        ><label v-if="expenseForm.status === 'paid'"
          >Medio<select v-model="expenseForm.method">
            <option v-for="value in paymentMethods" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label v-if="expenseForm.status === 'paid'"
          >Cuenta<select v-model="expenseForm.account">
            <option v-for="value in cashAccounts" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label
          >Proveedor (opcional)<input v-model="expenseForm.supplier" /></label
        ><label
          >Comprobante (opcional)<input v-model="expenseForm.receipt" /></label
        ><button class="button" :disabled="busy">Registrar gasto</button>
      </form>
      <div class="business-table-wrap">
        <table class="business-table">
          <tbody>
            <tr v-for="item in expenses" :key="item.id">
              <td>
                <strong>{{ item.number }}</strong
                ><small>{{ formatDate(item.date) }}</small>
              </td>
              <td>
                {{ item.description }}<small>{{ labels[item.category] }}</small>
              </td>
              <td>{{ money(item.amount) }}</td>
              <td>{{ item.status === "paid" ? "Pagado" : "Pendiente" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <div class="section-heading">
        <h2>Caja y movimientos</h2>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <form
        class="business-card admin-fields compact-form"
        @submit.prevent="createCashMovement"
      >
        <label
          >Fecha<input v-model="cashForm.date" type="date" required /></label
        ><label
          >Movimiento<select v-model="cashForm.direction">
            <option value="in">Entrada</option>
            <option value="out">Salida</option>
          </select></label
        ><label
          >Concepto<select v-model="cashForm.type">
            <option value="opening_balance">Saldo inicial</option>
            <option value="capital">Aporte de capital</option>
            <option value="withdrawal">Retiro</option>
            <option value="adjustment">Ajuste</option>
            <option value="other">Otro</option>
          </select></label
        ><label
          >Cuenta<select v-model="cashForm.account">
            <option v-for="value in cashAccounts" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        ><label
          >Valor COP<AdminMoneyInput
            v-model="cashForm.amount"
            required /></label
        ><label class="wide"
          >Descripción / razón<input
            v-model="cashForm.description"
            required /></label
        ><button class="button" :disabled="busy">Registrar movimiento</button>
      </form>
      <div class="business-table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th>Movimiento</th>
              <th>Cuenta</th>
              <th>Descripción</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in cash" :key="item.id">
              <td>
                <strong>{{ item.number }}</strong
                ><small>{{ formatDate(item.date) }}</small>
              </td>
              <td>{{ labels[item.account] || item.account }}</td>
              <td>{{ item.description }}</td>
              <td :class="item.direction === 'out' ? 'danger' : ''">
                {{ item.direction === "in" ? "+" : "−" }}
                {{ money(item.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
