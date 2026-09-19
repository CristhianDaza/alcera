<script setup lang="ts">
import { money } from "#shared/commerce";
import {
  cashAccounts,
  expenseCategories,
  paymentMethods,
  saleChannels,
  saleStatuses,
  type CashMovement,
  type DecantSource,
  type DashboardData,
  type Expense,
  type InventoryMovement,
  type InventoryRow,
  type Purchase,
  type ReportData,
  type Sale,
  type SalePayment,
  type SaleReturn,
  type Supplier,
} from "#shared/business";
import type { Product } from "#shared/types";

const props = defineProps<{
  getHeaders: () => Promise<{ Authorization: string }>;
  catalog: Product[];
}>();
const emit = defineEmits<{ openOrders: [] }>();
const route = useRoute();
const router = useRouter();
const queryText = (value: unknown) => (typeof value === "string" ? value : "");
function syncFilters(values: Record<string, string>) {
  const query = { ...route.query };
  for (const [key, value] of Object.entries(values)) {
    if (value) query[key] = value;
    else delete query[key];
  }
  void router.replace({ query });
}
type Section =
  | "summary"
  | "sales"
  | "inventory"
  | "purchases"
  | "expenses"
  | "cash"
  | "reports";
const section = ref<Section>("summary");
const busy = ref(false),
  notice = ref("");
const dashboard = ref<DashboardData | null>(null),
  sales = ref<Sale[]>([]),
  salesCursor = ref(""),
  inventory = ref<InventoryRow[]>([]),
  decantSources = ref<DecantSource[]>([]),
  movements = ref<InventoryMovement[]>([]),
  purchases = ref<Purchase[]>([]),
  suppliers = ref<Supplier[]>([]),
  expenses = ref<Expense[]>([]),
  cash = ref<CashMovement[]>([]);
const reports = ref<ReportData | null>(null);
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const localIso = (date: string) => `${date}T12:00:00.000Z`;
const dashboardPeriod = reactive({ from: monthStart(), to: today() });
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
  pending_purchase: "Pendiente de compra",
  paid: "Pagada",
  shipped: "Enviada",
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
      inventoryMode:
        variant.inventory?.mode ??
        (variant.type === "decant" ? "decant" : "on_demand"),
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
      dashboard.value = await api<DashboardData>("/api/admin/dashboard", {
        query: dashboardPeriod,
      });
    if (target === "sales") {
      sales.value = await api<Sale[]>("/api/admin/sales");
      salesCursor.value =
        sales.value.length === 50 ? (sales.value.at(-1)?.id ?? "") : "";
    }
    if (target === "inventory")
      [inventory.value, movements.value, decantSources.value] =
        await Promise.all([
          api<InventoryRow[]>("/api/admin/inventory"),
          api<InventoryMovement[]>("/api/admin/inventory/movements"),
          api<DecantSource[]>("/api/admin/inventory/decant-sources"),
        ]);
    if (target === "purchases")
      [purchases.value, suppliers.value, sales.value] = await Promise.all([
        api<Purchase[]>("/api/admin/purchases"),
        api<Supplier[]>("/api/admin/suppliers"),
        api<Sale[]>("/api/admin/sales"),
      ]);
    if (target === "expenses")
      expenses.value = await api<Expense[]>("/api/admin/expenses");
    if (target === "cash")
      cash.value = await api<CashMovement[]>("/api/admin/cash-movements");
    if (target === "reports")
      reports.value = await api<ReportData>("/api/admin/reports", {
        query: dashboardPeriod,
      });
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
}
watch(section, (value) => load(value));
onMounted(() => load("summary"));
async function loadMoreSales() {
  if (!salesCursor.value) return;
  busy.value = true;
  try {
    const result = await api<Sale[]>("/api/admin/sales", {
      query: { cursor: salesCursor.value },
    });
    sales.value.push(
      ...result.filter(
        (sale) => !sales.value.some((current) => current.id === sale.id),
      ),
    );
    salesCursor.value = result.length === 50 ? (result.at(-1)?.id ?? "") : "";
  } catch (error) {
    notice.value = errorMessage(error);
  } finally {
    busy.value = false;
  }
}

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
const saleFilters = reactive({
  query: queryText(route.query.saleQuery),
  status: queryText(route.query.saleStatus),
  channel: queryText(route.query.saleChannel),
  from: queryText(route.query.saleFrom),
  to: queryText(route.query.saleTo),
});
const filteredSales = computed(() => {
  const term = saleFilters.query.toLocaleLowerCase("es");
  return sales.value.filter(
    (sale) =>
      (!term ||
        `${sale.number} ${sale.customer?.name ?? ""}`
          .toLocaleLowerCase("es")
          .includes(term)) &&
      (!saleFilters.status || sale.status === saleFilters.status) &&
      (!saleFilters.channel || sale.channel === saleFilters.channel) &&
      (!saleFilters.from ||
        sale.createdAt >= `${saleFilters.from}T00:00:00.000Z`) &&
      (!saleFilters.to || sale.createdAt <= `${saleFilters.to}T23:59:59.999Z`),
  );
});
const receivables = computed(() =>
  sales.value.filter(
    (sale) => sale.status !== "cancelled" && sale.balanceDue > 0,
  ),
);
const saleDetail = ref<{
  sale: Sale;
  payments: SalePayment[];
  returns: SaleReturn[];
} | null>(null);
async function openSale(sale: Sale) {
  await perform(async () => {
    saleDetail.value = await api(`/api/admin/sales/${sale.id}`);
    return "Detalle de venta cargado.";
  });
}
async function returnSaleItem(item: Sale["items"][number]) {
  if (!saleDetail.value) return;
  const quantity = window.prompt(
    `Cantidad a devolver de ${item.name} · ${item.size}`,
    "1",
  );
  if (!quantity) return;
  const refund = window.prompt(
    "Dinero que se devolverá al cliente (COP; 0 si no aplica)",
    String(item.unitPrice * Number(quantity)),
  );
  if (refund === null) return;
  const reason = window.prompt(
    "Motivo de la devolución",
    "Devolución del cliente",
  );
  if (!reason) return;
  let refundAccount: string | undefined;
  if (Number(refund) > 0) {
    const account = window.prompt(
      "Cuenta del reembolso: cash, nequi, bancolombia, daviplata, card u other",
      "cash",
    );
    if (!account || !cashAccounts.includes(account as never)) return;
    refundAccount = account;
  }
  const saleId = saleDetail.value.sale.id;
  await perform(async () => {
    await api(`/api/admin/sales/${saleId}/returns`, {
      method: "POST",
      body: {
        date: new Date().toISOString(),
        items: [
          {
            productId: item.productId,
            variantId: item.variantId,
            quantity: Number(quantity),
          },
        ],
        refundAmount: Number(refund),
        refundAccount,
        reason,
      },
    });
    await load("sales");
    saleDetail.value = await api(`/api/admin/sales/${saleId}`);
    return "Devolución registrada con su ajuste de inventario y caja.";
  });
}
watch(
  saleFilters,
  (value) =>
    syncFilters({
      saleQuery: value.query,
      saleStatus: value.status,
      saleChannel: value.channel,
      saleFrom: value.from,
      saleTo: value.to,
    }),
  { deep: true },
);
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
        status: saleForm.items.some((line) => {
          const option = options.value.find(
            (item) => `${item.productId}/${item.variantId}` === line.selection,
          );
          return option?.inventoryMode === "on_demand";
        })
          ? "pending_purchase"
          : "pending_payment",
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
    const sale = sales.value.find((item) => item.id === payForm.saleId);
    const completesPayment = Boolean(
      sale &&
      payForm.amount >= sale.balanceDue &&
      sale.status !== "pending_purchase",
    );
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
    let confirmationWarning = "";
    if (completesPayment)
      try {
        await api(`/api/admin/sales/${payForm.saleId}/confirm`, {
          method: "POST",
        });
      } catch (error) {
        confirmationWarning = ` El pago quedó guardado, pero debes confirmar el inventario manualmente: ${errorMessage(error)}`;
      }
    payForm.saleId = "";
    await load("sales");
    return `Pago registrado en caja.${confirmationWarning || (completesPayment ? " Inventario confirmado automáticamente." : "")}`;
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
async function shipSale(sale: Sale) {
  await perform(async () => {
    await api(`/api/admin/sales/${sale.id}/ship`, { method: "POST" });
    await load("sales");
    return "Venta marcada como enviada.";
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
const inventoryState = ref(queryText(route.query.inventoryState));
const inventoryType = ref(queryText(route.query.inventoryType));
const inventoryBrand = ref(queryText(route.query.inventoryBrand));
const inventoryBrands = computed(() =>
  [...new Set(inventory.value.map((row) => row.brand))].sort((a, b) =>
    a.localeCompare(b, "es"),
  ),
);
const filteredInventory = computed(() =>
  inventory.value.filter(
    (row) =>
      (!inventoryFilter.value ||
        `${row.name} ${row.brand} ${row.size}`
          .toLowerCase()
          .includes(inventoryFilter.value.toLowerCase())) &&
      (!inventoryState.value || row.state === inventoryState.value) &&
      (!inventoryType.value || row.type === inventoryType.value) &&
      (!inventoryBrand.value || row.brand === inventoryBrand.value),
  ),
);
const inventoryPage = ref(1);
const inventoryPageSize = 25;
const inventoryTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredInventory.value.length / inventoryPageSize)),
);
const paginatedInventory = computed(() => {
  const start = (inventoryPage.value - 1) * inventoryPageSize;
  return filteredInventory.value.slice(start, start + inventoryPageSize);
});
const inventoryPages = computed(() =>
  paginationPages(inventoryTotalPages.value, inventoryPage.value),
);
const alertPage = ref(1);
const alertPageSize = 8;
const alertTotalPages = computed(() =>
  Math.max(
    1,
    Math.ceil((dashboard.value?.lowStockItems.length ?? 0) / alertPageSize),
  ),
);
const paginatedAlerts = computed(() => {
  const start = (alertPage.value - 1) * alertPageSize;
  return (dashboard.value?.lowStockItems ?? []).slice(
    start,
    start + alertPageSize,
  );
});
const alertPages = computed(() =>
  paginationPages(alertTotalPages.value, alertPage.value),
);
function paginationPages(total: number, current: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page++
  ) {
    pages.push(page);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
watch(
  [inventoryFilter, inventoryState, inventoryType, inventoryBrand],
  ([, state, type, brand]) => {
    inventoryPage.value = 1;
    syncFilters({
      inventoryState: state,
      inventoryType: type,
      inventoryBrand: brand,
    });
  },
);
watch(inventoryTotalPages, (total) => {
  if (inventoryPage.value > total) inventoryPage.value = total;
});
watch(alertTotalPages, (total) => {
  if (alertPage.value > total) alertPage.value = total;
});
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
  const mode = window.prompt("Modo: stock, on_demand o decant", row.mode);
  if (!mode || !["stock", "on_demand", "decant"].includes(mode)) {
    notice.value = "El modo debe ser stock, on_demand o decant.";
    return;
  }
  const packaging =
    mode === "decant"
      ? window.prompt(
          "Costo de atomizador, etiqueta y empaque por decant (COP)",
          String(row.decantPackagingCost),
        )
      : null;
  if (packaging === null && mode === "decant") return;
  await perform(async () => {
    await api(
      `/api/admin/inventory/${row.productId}/${row.variantId}/settings`,
      {
        method: "PATCH",
        body: {
          minimumStock: Number(minimum),
          averageCost: Number(cost),
          mode,
          decantPackagingCost:
            mode === "decant" ? Number(packaging) : undefined,
        },
      },
    );
    await load("inventory");
    return "Configuración actualizada.";
  });
}
async function openDecantSource(row: InventoryRow) {
  const suggested = row.size.match(/\d+/)?.[0] ?? "";
  const usableMl = window.prompt(
    `Mililitros utilizables de ${row.name} · ${row.size}`,
    suggested,
  );
  if (usableMl === null) return;
  await perform(async () => {
    await api("/api/admin/inventory/decant-sources", {
      method: "POST",
      body: {
        productId: row.productId,
        variantId: row.variantId,
        usableMl: Number(usableMl) || undefined,
      },
    });
    await load("inventory");
    return "Frasco abierto para decants. Sus mililitros se descontarán al confirmar ventas de decant.";
  });
}
async function adjustDecantSource(source: DecantSource) {
  const change = window.prompt(
    "Cambio en mililitros (usa negativo para muestra, pérdida o corrección)",
    "-1",
  );
  if (!change) return;
  const type = window.prompt(
    "Tipo: sample, damage_loss o adjustment",
    "adjustment",
  );
  if (!type || !["sample", "damage_loss", "adjustment"].includes(type)) return;
  const reason = window.prompt(
    "Motivo del ajuste",
    "Conteo del frasco abierto",
  );
  if (!reason) return;
  await perform(async () => {
    await api(`/api/admin/inventory/decant-sources/${source.id}/adjust`, {
      method: "POST",
      body: { quantityChange: Number(change), type, reason },
    });
    await load("inventory");
    return "Mililitros del frasco actualizados.";
  });
}

const supplierForm = reactive({
  name: "",
  taxId: "",
  contact: "",
  phone: "",
  email: "",
  city: "",
  paymentTerms: "",
  notes: "",
});
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
    Object.assign(supplierForm, {
      name: "",
      taxId: "",
      contact: "",
      phone: "",
      email: "",
      city: "",
      paymentTerms: "",
      notes: "",
    });
    await load("purchases");
    return "Proveedor creado.";
  });
}
async function editSupplier(supplier: Supplier) {
  const name = window.prompt("Nombre del proveedor", supplier.name);
  if (!name) return;
  const phone = window.prompt("Teléfono", supplier.phone ?? "");
  if (phone === null) return;
  const city = window.prompt("Ciudad", supplier.city ?? "");
  if (city === null) return;
  await perform(async () => {
    await api(`/api/admin/suppliers/${supplier.id}`, {
      method: "PATCH",
      body: { name, phone, city },
    });
    await load("purchases");
    return "Proveedor actualizado.";
  });
}
const purchaseForm = reactive({
  date: today(),
  supplierId: "",
  sourceSaleId: "",
  supplierName: "",
  invoice: "",
  paymentStatus: "pending",
  account: "cash",
  freight: 0,
  allocateFreight: true,
  notes: "",
  items: [{ selection: "", quantity: 1, unitCost: 0, discount: 0 }],
});
const purchaseFilters = reactive({ status: "", payment: "", from: "", to: "" });
const filteredPurchases = computed(() =>
  purchases.value.filter(
    (purchase) =>
      (!purchaseFilters.status || purchase.status === purchaseFilters.status) &&
      (!purchaseFilters.payment ||
        purchase.paymentStatus === purchaseFilters.payment) &&
      (!purchaseFilters.from ||
        purchase.date >= `${purchaseFilters.from}T00:00:00.000Z`) &&
      (!purchaseFilters.to ||
        purchase.date <= `${purchaseFilters.to}T23:59:59.999Z`),
  ),
);
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
        sourceSaleId: purchaseForm.sourceSaleId || undefined,
        supplierName: purchaseForm.supplierName,
        date: localIso(purchaseForm.date),
        invoice: purchaseForm.invoice || undefined,
        paymentStatus: purchaseForm.paymentStatus,
        cashAccount:
          purchaseForm.paymentStatus === "paid"
            ? purchaseForm.account
            : undefined,
        freight: Number(purchaseForm.freight),
        allocateFreight: purchaseForm.allocateFreight,
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
async function payPurchase(purchase: Purchase) {
  const account = window.prompt(
    "Cuenta de salida: cash, nequi, bancolombia, daviplata, card u other",
    "cash",
  );
  if (!account || !cashAccounts.includes(account as never)) return;
  await perform(async () => {
    await api(`/api/admin/purchases/${purchase.id}/pay`, {
      method: "POST",
      body: { date: new Date().toISOString(), cashAccount: account },
    });
    await load("purchases");
    return "Pago de compra registrado en caja.";
  });
}
async function cancelPurchase(purchase: Purchase) {
  const reason = window.prompt(
    "Motivo de cancelación o devolución al proveedor",
  );
  if (!reason) return;
  let refundAccount: string | undefined;
  if (purchase.status === "confirmed" && purchase.paymentStatus === "paid") {
    const account = window.prompt(
      "Cuenta que recibe la devolución: cash, nequi, bancolombia, daviplata, card u other",
      "cash",
    );
    if (!account || !cashAccounts.includes(account as never)) return;
    refundAccount = account;
  }
  await perform(async () => {
    await api(`/api/admin/purchases/${purchase.id}/cancel`, {
      method: "POST",
      body: { reason, refundAccount },
    });
    await load("purchases");
    return "Compra cancelada con sus movimientos de reverso.";
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
const expenseFilters = reactive({ category: "", status: "", from: "", to: "" });
const filteredExpenses = computed(() =>
  expenses.value.filter(
    (expense) =>
      (!expenseFilters.category ||
        expense.category === expenseFilters.category) &&
      (!expenseFilters.status || expense.status === expenseFilters.status) &&
      (!expenseFilters.from ||
        expense.date >= `${expenseFilters.from}T00:00:00.000Z`) &&
      (!expenseFilters.to ||
        expense.date <= `${expenseFilters.to}T23:59:59.999Z`),
  ),
);
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
async function selectExpenseReceipt(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    notice.value = "El comprobante debe pesar máximo 10 MB.";
    return;
  }
  await perform(async () => {
    const signature = await api<{
      timestamp: number;
      folder: string;
      upload_preset: string;
      signature: string;
      api_key: string;
      cloud: string;
    }>("/api/admin/upload", { method: "POST" });
    const form = new FormData();
    form.append("file", file);
    form.append("timestamp", String(signature.timestamp));
    form.append("folder", signature.folder);
    form.append("upload_preset", signature.upload_preset);
    form.append("signature", signature.signature);
    form.append("api_key", signature.api_key);
    const result = await $fetch<{ secure_url: string }>(
      `https://api.cloudinary.com/v1_1/${signature.cloud}/auto/upload`,
      { method: "POST", body: form },
    );
    expenseForm.receipt = result.secure_url;
    input.value = "";
    return "Comprobante cargado.";
  });
}
async function payExpense(expense: Expense) {
  const account = window.prompt(
    "Cuenta de salida: cash, nequi, bancolombia, daviplata, card u other",
    "cash",
  );
  if (!account || !cashAccounts.includes(account as never)) return;
  await perform(async () => {
    await api(`/api/admin/expenses/${expense.id}/pay`, {
      method: "POST",
      body: {
        date: new Date().toISOString(),
        paymentMethod: "cash",
        cashAccount: account,
      },
    });
    await load("expenses");
    return "Gasto pagado y salida de caja registrada.";
  });
}
async function reverseExpense(expense: Expense) {
  const reason = window.prompt("Motivo del reverso");
  if (!reason) return;
  let cashAccount: string | undefined;
  if (expense.status === "paid") {
    const account = window.prompt(
      "Cuenta que recibe el reverso: cash, nequi, bancolombia, daviplata, card u other",
      expense.cashAccount ?? "cash",
    );
    if (!account || !cashAccounts.includes(account as never)) return;
    cashAccount = account;
  }
  await perform(async () => {
    await api(`/api/admin/expenses/${expense.id}/reverse`, {
      method: "POST",
      body: { reason, cashAccount },
    });
    await load("expenses");
    return "Gasto reversado sin borrar su auditoría.";
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
const cashFilters = reactive({ account: "", from: "", to: "" });
const filteredCash = computed(() =>
  cash.value.filter(
    (movement) =>
      (!cashFilters.account || movement.account === cashFilters.account) &&
      (!cashFilters.from ||
        movement.date >= `${cashFilters.from}T00:00:00.000Z`) &&
      (!cashFilters.to || movement.date <= `${cashFilters.to}T23:59:59.999Z`),
  ),
);
const transferForm = reactive({
  date: today(),
  from: "cash",
  to: "nequi",
  amount: 0,
  description: "",
});
const reconciliationForm = reactive({
  date: today(),
  account: "cash",
  actualBalance: 0,
  reason: "Conteo y conciliación",
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
async function createTransfer() {
  await perform(async () => {
    await api("/api/admin/cash-movements/transfer", {
      method: "POST",
      body: {
        ...transferForm,
        date: localIso(transferForm.date),
        amount: Number(transferForm.amount),
      },
    });
    Object.assign(transferForm, {
      date: today(),
      from: "cash",
      to: "nequi",
      amount: 0,
      description: "",
    });
    await load("cash");
    return "Transferencia entre cuentas registrada.";
  });
}
async function reconcileAccount() {
  await perform(async () => {
    await api("/api/admin/cash-movements/reconcile", {
      method: "POST",
      body: {
        ...reconciliationForm,
        date: localIso(reconciliationForm.date),
        actualBalance: Number(reconciliationForm.actualBalance),
      },
    });
    await load("cash");
    return "Cuenta conciliada; cualquier diferencia quedó como ajuste auditado.";
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
function exportCsv(name: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
          ['reports', 'Reportes'],
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
          <h2>Resumen</h2>
        </div>
        <button class="text-link" :disabled="busy" @click="load()">
          Actualizar
        </button>
      </div>
      <form class="business-period" @submit.prevent="load('summary')">
        <label
          >Desde<input v-model="dashboardPeriod.from" type="date" required
        /></label>
        <label
          >Hasta<input v-model="dashboardPeriod.to" type="date" required
        /></label>
        <button class="text-link" :disabled="busy">Aplicar período</button>
      </form>
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
          <span>Gastos pagados</span
          ><strong>{{ money(dashboard.expenseTotal) }}</strong>
        </article>
        <article>
          <span>Utilidad neta estimada</span
          ><strong>{{ money(dashboard.netProfit) }}</strong>
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
        <article class="business-card">
          <h3>Saldos por cuenta</h3>
          <p v-for="item in dashboard.accountBalances" :key="item.account">
            {{ labels[item.account] || item.account }}
            <strong>{{ money(item.balance) }}</strong>
          </p>
        </article>
        <article class="business-card">
          <h3>Alertas de inventario</h3>
          <p v-if="!dashboard.lowStockItems.length" class="muted">
            No hay alertas.
          </p>
          <p v-for="item in paginatedAlerts" :key="`${item.name}-${item.size}`">
            {{ item.name }} · {{ item.size }}
            <strong>{{ item.stock }} / mínimo {{ item.minimumStock }}</strong>
          </p>
          <nav
            v-if="alertTotalPages > 1"
            class="pagination admin-pagination"
            aria-label="Paginación de alertas de inventario"
          >
            <span class="pagination-info" role="status">
              Mostrando {{ (alertPage - 1) * alertPageSize + 1 }}–{{
                Math.min(
                  alertPage * alertPageSize,
                  dashboard.lowStockItems.length,
                )
              }}
              de {{ dashboard.lowStockItems.length }} alertas
            </span>
            <div class="pagination-controls">
              <button
                type="button"
                class="text-link pagination-btn"
                :disabled="alertPage <= 1"
                @click="alertPage--"
              >
                ← Anterior
              </button>
              <div class="pagination-pages">
                <template v-for="(page, index) in alertPages" :key="index">
                  <span
                    v-if="typeof page === 'string'"
                    class="pagination-ellipsis"
                    >{{ page }}</span
                  >
                  <button
                    v-else
                    type="button"
                    class="pagination-page-btn"
                    :class="{ active: page === alertPage }"
                    :aria-current="page === alertPage ? 'page' : undefined"
                    @click="alertPage = page"
                  >
                    {{ page }}
                  </button>
                </template>
              </div>
              <button
                type="button"
                class="text-link pagination-btn"
                :disabled="alertPage >= alertTotalPages"
                @click="alertPage++"
              >
                Siguiente →
              </button>
            </div>
          </nav>
        </article>
        <article class="business-card">
          <h3>Movimientos recientes</h3>
          <p v-if="!dashboard.recentMovements.length" class="muted">
            No hay movimientos en este período.
          </p>
          <p v-for="item in dashboard.recentMovements" :key="item.id">
            {{ formatDate(item.date) }} · {{ item.description }}
            <strong :class="item.direction === 'out' ? 'danger' : ''"
              >{{ item.direction === "in" ? "+" : "−"
              }}{{ money(item.amount) }}</strong
            >
          </p>
        </article>
      </div>
    </template>

    <template v-else-if="section === 'sales'">
      <div class="section-heading">
        <h2>Ventas</h2>
        <div class="row-actions">
          <button
            type="button"
            class="text-link"
            @click="
              exportCsv('ventas', [
                [
                  'Venta',
                  'Fecha',
                  'Cliente',
                  'Canal',
                  'Estado',
                  'Total',
                  'Pagado',
                  'Saldo',
                ],
                ...filteredSales.map((sale) => [
                  sale.number,
                  sale.createdAt,
                  sale.customer?.name || '',
                  labels[sale.channel] || sale.channel,
                  labels[sale.status] || sale.status,
                  sale.total,
                  sale.paidTotal,
                  sale.balanceDue,
                ]),
              ])
            "
          >
            Exportar CSV</button
          ><button class="text-link" :disabled="busy" @click="load()">
            Actualizar
          </button>
        </div>
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
      <div class="admin-filters business-filters">
        <label
          >Buscar<input
            v-model="saleFilters.query"
            type="search"
            placeholder="Consecutivo o cliente"
        /></label>
        <label
          >Estado<select v-model="saleFilters.status">
            <option value="">Todos</option>
            <option v-for="value in saleStatuses" :key="value" :value="value">
              {{ labels[value] }}
            </option>
          </select></label
        >
        <label
          >Canal<select v-model="saleFilters.channel">
            <option value="">Todos</option>
            <option v-for="value in saleChannels" :key="value" :value="value">
              {{ labels[value] }}
            </option>
          </select></label
        >
        <label>Desde<input v-model="saleFilters.from" type="date" /></label>
        <label>Hasta<input v-model="saleFilters.to" type="date" /></label>
      </div>
      <details v-if="receivables.length" class="business-card">
        <summary>Cuentas por cobrar · {{ receivables.length }}</summary>
        <p v-for="sale in receivables" :key="sale.id">
          {{ sale.number }} · {{ sale.customer?.name || "Sin cliente" }}
          <strong>{{ money(sale.balanceDue) }}</strong>
          <button class="text-link" type="button" @click="startPayment(sale)">
            Registrar abono
          </button>
        </p>
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
            <tr v-for="sale in filteredSales" :key="sale.id">
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
                <button type="button" class="text-link" @click="openSale(sale)">
                  Detalle
                </button>
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
                  @click="shipSale(sale)"
                >
                  Enviar</button
                ><button
                  v-if="
                    ['paid', 'shipped'].includes(sale.status) &&
                    sale.inventoryAppliedAt
                  "
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
      <button
        v-if="salesCursor"
        type="button"
        class="text-link"
        :disabled="busy"
        @click="loadMoreSales"
      >
        Cargar más ventas
      </button>
      <article v-if="saleDetail" class="business-card sale-detail">
        <div class="section-heading">
          <h3>{{ saleDetail.sale.number }}</h3>
          <button type="button" class="text-link" @click="saleDetail = null">
            Cerrar
          </button>
        </div>
        <p>
          {{ saleDetail.sale.customer?.name || "Sin cliente" }} ·
          {{ labels[saleDetail.sale.channel] }}
        </p>
        <button
          v-if="saleDetail.sale.sourceOrderId"
          type="button"
          class="text-link"
          @click="emit('openOrders')"
        >
          Abrir pedidos · {{ saleDetail.sale.sourceOrderId }}
        </button>
        <div class="business-table-wrap">
          <table class="business-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Costo histórico</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in saleDetail.sale.items"
                :key="`${item.productId}-${item.variantId}`"
              >
                <td>{{ item.name }} · {{ item.size }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ money(item.lineTotal) }}</td>
                <td>{{ money(item.unitCost * item.quantity) }}</td>
                <td>
                  <button
                    v-if="
                      saleDetail.sale.inventoryAppliedAt &&
                      ['paid', 'delivered'].includes(saleDetail.sale.status)
                    "
                    type="button"
                    class="text-link"
                    @click="returnSaleItem(item)"
                  >
                    Devolver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h4>Pagos</h4>
        <p v-if="!saleDetail.payments.length" class="muted">No hay pagos.</p>
        <p v-for="payment in saleDetail.payments" :key="payment.id">
          {{ formatDate(payment.date) }} ·
          {{ labels[payment.method] || payment.method }}
          <strong>{{ money(payment.amount) }}</strong>
        </p>
        <h4>Devoluciones</h4>
        <p v-if="!saleDetail.returns.length" class="muted">
          No hay devoluciones.
        </p>
        <p v-for="item in saleDetail.returns" :key="item.id">
          {{ formatDate(item.date) }} · {{ item.reason }}
          <strong>{{ money(item.refundAmount) }}</strong>
        </p>
      </article>
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
        <div class="row-actions">
          <button
            type="button"
            class="text-link"
            @click="
              exportCsv('inventario', [
                [
                  'Producto',
                  'Marca',
                  'Presentación',
                  'Modalidad',
                  'Stock',
                  'Mínimo',
                  'Costo promedio',
                  'Valor',
                ],
                ...filteredInventory.map((row) => [
                  row.name,
                  row.brand,
                  row.size,
                  row.mode,
                  row.stock,
                  row.minimumStock,
                  row.averageCost,
                  row.value,
                ]),
              ])
            "
          >
            Exportar CSV</button
          ><button class="text-link" :disabled="busy" @click="load()">
            Actualizar
          </button>
        </div>
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
      <div class="admin-filters business-filters">
        <label
          >Buscar<input
            v-model="inventoryFilter"
            type="search"
            placeholder="Perfume, marca o tamaño"
        /></label>
        <label
          >Marca<select v-model="inventoryBrand">
            <option value="">Todas</option>
            <option
              v-for="brand in inventoryBrands"
              :key="brand"
              :value="brand"
            >
              {{ brand }}
            </option>
          </select></label
        >
        <label
          >Tipo<select v-model="inventoryType">
            <option value="">Todos</option>
            <option value="bottle">Frascos</option>
            <option value="decant">Decants</option>
          </select></label
        >
        <label
          >Estado<select v-model="inventoryState">
            <option value="">Todos</option>
            <option value="out">Agotado</option>
            <option value="low">Bajo</option>
            <option value="available">Disponible</option>
          </select></label
        >
      </div>
      <div class="business-table-wrap">
        <table class="business-table">
          <thead>
            <tr>
              <th>Presentación</th>
              <th>Existencias</th>
              <th>Modalidad</th>
              <th>Mínimo</th>
              <th>Costo promedio</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedInventory" :key="row.variantId">
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
              <td>
                {{
                  row.mode === "on_demand"
                    ? "Por encargo"
                    : row.mode === "decant"
                      ? "Decant"
                      : "En stock"
                }}
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
                <button
                  v-if="row.type === 'bottle' && row.stock > 0"
                  class="text-link"
                  type="button"
                  @click="openDecantSource(row)"
                >
                  Abrir para decants
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav
        v-if="inventoryTotalPages > 1"
        class="pagination admin-pagination"
        aria-label="Paginación de inventario"
      >
        <span class="pagination-info" role="status">
          Mostrando {{ (inventoryPage - 1) * inventoryPageSize + 1 }}–{{
            Math.min(
              inventoryPage * inventoryPageSize,
              filteredInventory.length,
            )
          }}
          de {{ filteredInventory.length }} presentaciones
        </span>
        <div class="pagination-controls">
          <button
            type="button"
            class="text-link pagination-btn"
            :disabled="inventoryPage <= 1"
            @click="inventoryPage--"
          >
            ← Anterior
          </button>
          <div class="pagination-pages">
            <template v-for="(page, index) in inventoryPages" :key="index">
              <span
                v-if="typeof page === 'string'"
                class="pagination-ellipsis"
                >{{ page }}</span
              >
              <button
                v-else
                type="button"
                class="pagination-page-btn"
                :class="{ active: page === inventoryPage }"
                :aria-current="page === inventoryPage ? 'page' : undefined"
                @click="inventoryPage = page"
              >
                {{ page }}
              </button>
            </template>
          </div>
          <button
            type="button"
            class="text-link pagination-btn"
            :disabled="inventoryPage >= inventoryTotalPages"
            @click="inventoryPage++"
          >
            Siguiente →
          </button>
        </div>
      </nav>
      <article v-if="decantSources.length" class="business-card">
        <h3>Frascos abiertos para decants</h3>
        <div class="business-table-wrap">
          <table class="business-table">
            <thead>
              <tr>
                <th>Frasco</th>
                <th>Disponible</th>
                <th>Costo/ml</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="source in decantSources" :key="source.id">
                <td>{{ source.name }} · {{ source.size }}</td>
                <td>{{ source.remainingMl }} / {{ source.initialMl }} ml</td>
                <td>{{ money(source.costPerMl) }}</td>
                <td>
                  {{
                    source.status === "open"
                      ? "Abierto"
                      : source.status === "empty"
                        ? "Terminado"
                        : "Descartado"
                  }}
                </td>
                <td>
                  <button
                    v-if="source.status !== 'discarded'"
                    type="button"
                    class="text-link"
                    @click="adjustDecantSource(source)"
                  >
                    Ajustar ml
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <h3>Movimientos recientes</h3>
      <div class="business-table-wrap">
        <table class="business-table">
          <tbody>
            <tr v-for="item in movements.slice(0, 20)" :key="item.id">
              <td>{{ formatDate(item.occurredAt) }}</td>
              <td>{{ item.reason }}</td>
              <td :class="item.quantityChange < 0 ? 'danger' : ''">
                {{ item.quantityChange > 0 ? "+" : "" }}{{ item.quantityChange
                }}{{ item.quantityUnit === "ml" ? " ml" : "" }}
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
        <div class="row-actions">
          <button
            type="button"
            class="text-link"
            @click="
              exportCsv('compras', [
                ['Compra', 'Fecha', 'Proveedor', 'Estado', 'Pago', 'Total'],
                ...filteredPurchases.map((item) => [
                  item.number,
                  item.date,
                  item.supplierName,
                  item.status,
                  item.paymentStatus,
                  item.total,
                ]),
              ])
            "
          >
            Exportar CSV</button
          ><button class="text-link" :disabled="busy" @click="load()">
            Actualizar
          </button>
        </div>
      </div>
      <div class="admin-filters business-filters">
        <label
          >Estado<select v-model="purchaseFilters.status">
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
          </select></label
        >
        <label
          >Pago<select v-model="purchaseFilters.payment">
            <option value="">Todos</option>
            <option value="pending">Por pagar</option>
            <option value="paid">Pagada</option>
          </select></label
        >
        <label>Desde<input v-model="purchaseFilters.from" type="date" /></label
        ><label>Hasta<input v-model="purchaseFilters.to" type="date" /></label>
      </div>
      <div class="business-columns">
        <details class="business-card">
          <summary>Nuevo proveedor</summary>
          <form class="stack-form" @submit.prevent="createSupplier">
            <label>Nombre<input v-model="supplierForm.name" required /></label
            ><label
              >NIT / identificación<input v-model="supplierForm.taxId" /></label
            ><label
              >Persona de contacto<input
                v-model="supplierForm.contact" /></label
            ><label>Teléfono<input v-model="supplierForm.phone" /></label
            ><label
              >Correo<input v-model="supplierForm.email" type="email" /></label
            ><label>Ciudad<input v-model="supplierForm.city" /></label
            ><label
              >Condiciones de pago<input
                v-model="supplierForm.paymentTerms" /></label
            ><label
              >Notas<textarea
                v-model="supplierForm.notes"
                maxlength="2000"
              ></textarea></label
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
              >Venta bajo pedido relacionada<select
                v-model="purchaseForm.sourceSaleId"
              >
                <option value="">Ninguna</option>
                <option
                  v-for="sale in sales.filter(
                    (item) => item.status === 'pending_purchase',
                  )"
                  :key="sale.id"
                  :value="sale.id"
                >
                  {{ sale.number }} · {{ sale.customer?.name || "Sin cliente" }}
                </option>
              </select></label
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
            ><label class="check"
              ><input v-model="purchaseForm.allocateFreight" type="checkbox" />
              Repartir el flete entre los productos para calcular su costo
              real</label
            ><button class="button" :disabled="busy">Guardar compra</button>
          </form>
        </details>
      </div>
      <details v-if="suppliers.length" class="business-card">
        <summary>Proveedores · {{ suppliers.length }}</summary>
        <div class="business-table-wrap">
          <table class="business-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Condiciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="supplier in suppliers" :key="supplier.id">
                <td>
                  {{ supplier.name
                  }}<small
                    >{{ supplier.taxId || "Sin identificación" }} ·
                    {{ supplier.city || "Sin ciudad" }}</small
                  >
                </td>
                <td>
                  {{ supplier.contact || ""
                  }}<small
                    >{{ supplier.phone || "" }}
                    {{ supplier.email || "" }}</small
                  >
                </td>
                <td>
                  {{ supplier.paymentTerms || "Sin condiciones registradas" }}
                </td>
                <td>
                  <button
                    type="button"
                    class="text-link"
                    @click="editSupplier(supplier)"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
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
            <tr v-for="purchase in filteredPurchases" :key="purchase.id">
              <td>
                <strong>{{ purchase.number }}</strong
                ><small>{{ formatDate(purchase.date) }}</small>
                <small v-if="purchase.sourceSaleId"
                  >Venta relacionada: {{ purchase.sourceSaleId }}</small
                >
              </td>
              <td>{{ purchase.supplierName }}</td>
              <td>{{ money(purchase.total) }}</td>
              <td>
                {{
                  purchase.status === "confirmed"
                    ? "Confirmada"
                    : purchase.status === "cancelled"
                      ? "Cancelada"
                      : "Borrador"
                }}
                <small>{{
                  purchase.paymentStatus === "paid" ? "Pagada" : "Por pagar"
                }}</small>
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
                <button
                  v-if="
                    purchase.paymentStatus === 'pending' &&
                    purchase.status !== 'cancelled'
                  "
                  class="text-link"
                  type="button"
                  @click="payPurchase(purchase)"
                >
                  Registrar pago
                </button>
                <button
                  v-if="purchase.status !== 'cancelled'"
                  type="button"
                  class="text-link danger"
                  @click="cancelPurchase(purchase)"
                >
                  Cancelar / reversar
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
        <div class="row-actions">
          <button
            type="button"
            class="text-link"
            @click="
              exportCsv('gastos', [
                ['Fecha', 'Descripción', 'Categoría', 'Estado', 'Valor'],
                ...filteredExpenses.map((item) => [
                  item.date,
                  item.description,
                  labels[item.category] || item.category,
                  item.status,
                  item.amount,
                ]),
              ])
            "
          >
            Exportar CSV</button
          ><button class="text-link" :disabled="busy" @click="load()">
            Actualizar
          </button>
        </div>
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
            <option value="reversed">Reversado</option>
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
          >Comprobante (opcional)<input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            @change="selectExpenseReceipt"
          /><small v-if="expenseForm.receipt"
            >Archivo cargado correctamente.</small
          ></label
        ><button class="button" :disabled="busy">Registrar gasto</button>
      </form>
      <div class="admin-filters business-filters">
        <label
          >Categoría<select v-model="expenseFilters.category">
            <option value="">Todas</option>
            <option
              v-for="value in expenseCategories"
              :key="value"
              :value="value"
            >
              {{ labels[value] || value }}
            </option>
          </select></label
        >
        <label
          >Estado<select v-model="expenseFilters.status">
            <option value="">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
          </select></label
        >
        <label>Desde<input v-model="expenseFilters.from" type="date" /></label
        ><label>Hasta<input v-model="expenseFilters.to" type="date" /></label>
      </div>
      <div class="business-table-wrap">
        <table class="business-table">
          <tbody>
            <tr v-for="item in filteredExpenses" :key="item.id">
              <td>
                <strong>{{ item.number }}</strong
                ><small>{{ formatDate(item.date) }}</small>
              </td>
              <td>
                {{ item.description }}<small>{{ labels[item.category] }}</small>
                <a
                  v-if="item.receipt"
                  :href="item.receipt"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Ver comprobante ↗</a
                >
              </td>
              <td>{{ money(item.amount) }}</td>
              <td>
                {{
                  item.status === "paid"
                    ? "Pagado"
                    : item.status === "reversed"
                      ? "Reversado"
                      : "Pendiente"
                }}
              </td>
              <td>
                <button
                  v-if="item.status === 'pending'"
                  class="text-link"
                  type="button"
                  @click="payExpense(item)"
                >
                  Registrar pago
                </button>
                <button
                  v-if="item.status !== 'reversed'"
                  type="button"
                  class="text-link danger"
                  @click="reverseExpense(item)"
                >
                  Reversar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="section === 'reports'">
      <div class="section-heading">
        <h2>Reportes</h2>
        <button class="text-link" :disabled="busy" @click="load('reports')">
          Actualizar
        </button>
      </div>
      <form class="business-period" @submit.prevent="load('reports')">
        <label
          >Desde<input v-model="dashboardPeriod.from" type="date" required
        /></label>
        <label
          >Hasta<input v-model="dashboardPeriod.to" type="date" required
        /></label>
        <button class="text-link" :disabled="busy">Aplicar período</button>
      </form>
      <div v-if="reports" class="business-columns">
        <article class="business-card">
          <div class="section-heading">
            <h3>Por producto</h3>
            <button
              class="text-link"
              type="button"
              @click="
                exportCsv('ventas-producto', [
                  [
                    'Producto',
                    'Marca',
                    'Unidades',
                    'Ingresos',
                    'Costo',
                    'Utilidad',
                  ],
                  ...reports.products.map((item) => [
                    item.name,
                    item.brand,
                    item.quantity,
                    item.revenue,
                    item.cost,
                    item.profit,
                  ]),
                ])
              "
            >
              Exportar CSV
            </button>
          </div>
          <div class="business-table-wrap">
            <table class="business-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidades</th>
                  <th>Ingresos</th>
                  <th>Utilidad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in reports.products" :key="item.name">
                  <td>
                    {{ item.name }}<small>{{ item.brand }}</small>
                  </td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ money(item.revenue) }}</td>
                  <td>{{ money(item.profit) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
        <article class="business-card">
          <div class="section-heading">
            <h3>Por marca</h3>
            <button
              class="text-link"
              type="button"
              @click="
                exportCsv('ventas-marca', [
                  ['Marca', 'Ingresos', 'Utilidad'],
                  ...reports.brands.map((item) => [
                    item.brand,
                    item.revenue,
                    item.profit,
                  ]),
                ])
              "
            >
              Exportar CSV
            </button>
          </div>
          <p v-for="item in reports.brands" :key="item.brand">
            {{ item.brand }}
            <strong
              >{{ money(item.revenue) }} · utilidad
              {{ money(item.profit) }}</strong
            >
          </p>
        </article>
        <article class="business-card">
          <h3>Por canal</h3>
          <p v-for="item in reports.channels" :key="item.channel">
            {{ labels[item.channel] }}
            <strong>{{ money(item.revenue) }}</strong>
          </p>
        </article>
        <article class="business-card">
          <h3>Por medio de pago</h3>
          <p v-for="item in reports.paymentMethods" :key="item.method">
            {{ labels[item.method] || item.method }}
            <strong>{{ money(item.amount) }}</strong>
          </p>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="section-heading">
        <h2>Caja y movimientos</h2>
        <div class="row-actions">
          <button
            type="button"
            class="text-link"
            @click="
              exportCsv('caja', [
                [
                  'Movimiento',
                  'Fecha',
                  'Cuenta',
                  'Dirección',
                  'Descripción',
                  'Valor',
                ],
                ...filteredCash.map((item) => [
                  item.number,
                  item.date,
                  labels[item.account] || item.account,
                  item.direction,
                  item.description,
                  item.amount,
                ]),
              ])
            "
          >
            Exportar CSV</button
          ><button class="text-link" :disabled="busy" @click="load()">
            Actualizar
          </button>
        </div>
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
      <details class="business-card">
        <summary>Transferir entre cuentas</summary>
        <form
          class="admin-fields compact-form"
          @submit.prevent="createTransfer"
        >
          <label
            >Fecha<input v-model="transferForm.date" type="date" required
          /></label>
          <label
            >Desde<select v-model="transferForm.from">
              <option v-for="value in cashAccounts" :key="value" :value="value">
                {{ labels[value] || value }}
              </option>
            </select></label
          >
          <label
            >Hacia<select v-model="transferForm.to">
              <option v-for="value in cashAccounts" :key="value" :value="value">
                {{ labels[value] || value }}
              </option>
            </select></label
          >
          <label
            >Valor COP<AdminMoneyInput v-model="transferForm.amount" required
          /></label>
          <label class="wide"
            >Descripción<input v-model="transferForm.description" required
          /></label>
          <button class="button" :disabled="busy">
            Registrar transferencia
          </button>
        </form>
      </details>
      <details class="business-card">
        <summary>Conciliar saldo de una cuenta</summary>
        <form
          class="admin-fields compact-form"
          @submit.prevent="reconcileAccount"
        >
          <label
            >Fecha<input v-model="reconciliationForm.date" type="date" required
          /></label>
          <label
            >Cuenta<select v-model="reconciliationForm.account">
              <option v-for="value in cashAccounts" :key="value" :value="value">
                {{ labels[value] || value }}
              </option>
            </select></label
          >
          <label
            >Saldo real COP<AdminMoneyInput
              v-model="reconciliationForm.actualBalance"
          /></label>
          <label class="wide"
            >Razón<input v-model="reconciliationForm.reason" required
          /></label>
          <button class="button" :disabled="busy">Conciliar</button>
        </form>
      </details>
      <div class="admin-filters business-filters">
        <label
          >Cuenta<select v-model="cashFilters.account">
            <option value="">Todas</option>
            <option v-for="value in cashAccounts" :key="value" :value="value">
              {{ labels[value] || value }}
            </option>
          </select></label
        >
        <label>Desde<input v-model="cashFilters.from" type="date" /></label
        ><label>Hasta<input v-model="cashFilters.to" type="date" /></label>
      </div>
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
            <tr v-for="item in filteredCash" :key="item.id">
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
