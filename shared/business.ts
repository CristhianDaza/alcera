import { z } from "zod";

export const saleStatuses = [
  "draft",
  "pending_purchase",
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export const saleChannels = [
  "website",
  "whatsapp",
  "instagram",
  "facebook",
  "physical",
  "referral",
  "other",
] as const;
export const paymentMethods = [
  "cash",
  "bank_transfer",
  "nequi",
  "daviplata",
  "card",
  "payment_link",
  "other",
] as const;
export const cashAccounts = [
  "cash",
  "nequi",
  "bancolombia",
  "daviplata",
  "card",
  "other",
] as const;
export const expenseCategories = [
  "shipping",
  "packaging",
  "advertising",
  "platform_fee",
  "rent",
  "utilities",
  "payroll",
  "taxes",
  "transport",
  "supplies",
  "other",
] as const;
export const inventoryMovementTypes = [
  "purchase",
  "sale",
  "customer_return",
  "supplier_return",
  "sample",
  "damage_loss",
  "adjustment",
] as const;

export type SaleStatus = (typeof saleStatuses)[number];
export type SaleChannel = (typeof saleChannels)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
/** Identificador estable de una cuenta; puede ser una cuenta inicial o creada por el administrador. */
export type CashAccount = string;
export type ExpenseCategory = (typeof expenseCategories)[number];
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];
export type InventoryMode = "stock" | "on_demand" | "decant";

export interface SaleItem {
  productId: string;
  variantId: string;
  sku?: string;
  brand?: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  lineTotal: number;
}
export interface Sale {
  id: string;
  number: string;
  sourceOrderId?: string;
  customer?: { name: string; phone?: string; city?: string };
  channel: SaleChannel;
  status: SaleStatus;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  shippingCharged: number;
  total: number;
  paidTotal: number;
  balanceDue: number;
  refundTotal?: number;
  returnedCost?: number;
  /** Acumulado materializado para validar y reversar devoluciones sin leer todo el historial. */
  returnedItems?: SaleReturnedItem[];
  inventoryAppliedAt?: string;
  inventoryReversedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
  /** Solo se agrega en respuestas de listado cuando se filtra por medio de pago. */
  paymentMethods?: PaymentMethod[];
  requestFingerprint?: string;
}
export interface SaleReturnedItem {
  productId: string;
  variantId: string;
  quantity: number;
}
export interface SaleReturn {
  id: string;
  saleId: string;
  date: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitCost: number;
  }>;
  refundAmount: number;
  costTotal: number;
  reason: string;
  createdAt: string;
  createdBy: string;
  requestFingerprint?: string;
}
export interface SalePayment {
  id: string;
  saleId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  cashAccount: CashAccount;
  reference?: string;
  createdAt: string;
  createdBy: string;
  requestFingerprint?: string;
}
export interface InventoryMovement {
  id: string;
  productId: string;
  variantId: string;
  type: InventoryMovementType;
  quantityChange: number;
  unitCost: number | null;
  stockBefore: number;
  stockAfter: number;
  referenceType: "sale" | "purchase" | "manual" | "return";
  referenceId?: string;
  reference?: string;
  reason: string;
  occurredAt: string;
  createdAt: string;
  createdBy: string;
  quantityUnit?: "unit" | "ml";
  sourceId?: string;
  requestFingerprint?: string;
}
export interface DecantSource {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  size: string;
  initialMl: number;
  remainingMl: number;
  costPerMl: number;
  openedAt: string;
  status: "open" | "empty" | "discarded";
  notes?: string;
  createdBy: string;
  updatedAt: string;
  requestFingerprint?: string;
}
export interface InventoryRow {
  productId: string;
  variantId: string;
  name: string;
  brand: string;
  size: string;
  type: "bottle" | "decant";
  sku?: string;
  stock: number;
  minimumStock: number;
  averageCost: number;
  value: number;
  state: "out" | "low" | "available";
  mode: InventoryMode;
  decantPackagingCost: number;
}
export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  city?: string;
  paymentTerms?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CashAccountDefinition {
  id: CashAccount;
  name: string;
  kind: "cash" | "bank" | "wallet" | "card" | "other";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Purchase {
  id: string;
  number: string;
  supplierId?: string;
  sourceSaleId?: string;
  supplierName: string;
  date: string;
  invoice?: string;
  status: "draft" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid";
  items: Array<{
    productId: string;
    variantId: string;
    name: string;
    size: string;
    quantity: number;
    unitCost: number;
    discount: number;
    total: number;
  }>;
  freight: number;
  allocateFreight?: boolean;
  total: number;
  cashAccount?: CashAccount;
  notes?: string;
  confirmedAt?: string;
  paidAt?: string;
  cashMovementId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  requestFingerprint?: string;
}
export interface Expense {
  id: string;
  number: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  supplier?: string;
  paymentMethod?: PaymentMethod;
  cashAccount?: CashAccount;
  receipt?: string;
  status: "paid" | "pending" | "reversed";
  cashMovementId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  requestFingerprint?: string;
}
export interface CashMovement {
  id: string;
  number: string;
  date: string;
  direction: "in" | "out";
  type:
    | "sale_payment"
    | "sale_refund"
    | "purchase"
    | "expense"
    | "opening_balance"
    | "capital"
    | "withdrawal"
    | "adjustment"
    | "other";
  account: CashAccount;
  amount: number;
  description: string;
  referenceType?: "sale" | "purchase" | "expense";
  referenceId?: string;
  createdAt: string;
  createdBy: string;
  requestFingerprint?: string;
}
export interface DashboardData {
  from: string;
  to: string;
  paidSales: number;
  registeredSales: number;
  grossProfit: number;
  expenseTotal: number;
  netProfit: number;
  cashBalance: number;
  receivable: number;
  lowStock: number;
  recentMovements: CashMovement[];
  topProducts: Array<{ name: string; quantity: number }>;
  salesByChannel: Array<{ channel: SaleChannel; total: number }>;
  accountBalances: Array<{ account: CashAccount; balance: number }>;
  lowStockItems: Array<{
    name: string;
    size: string;
    stock: number;
    minimumStock: number;
  }>;
}
export interface ReportData {
  from: string;
  to: string;
  products: Array<{
    name: string;
    brand: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  brands: Array<{ brand: string; revenue: number; profit: number }>;
  channels: Array<{ channel: SaleChannel; revenue: number }>;
  paymentMethods: Array<{ method: PaymentMethod; amount: number }>;
}

const id = z.string().regex(/^[a-zA-Z0-9-]{1,120}$/);
export const cashAccountId = z.string().trim().min(1).max(120);
const requestId = z.uuid();
const text = z.string().trim().min(1).max(500);
const money = z.number().int().min(0).max(1_000_000_000);
const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
const iso = z.iso.datetime();
const optionalCustomer = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional(),
    city: z.string().trim().max(120).optional(),
  })
  .optional();

export const saleCreateSchema = z.object({
  requestId,
  occurredAt: iso,
  customer: optionalCustomer,
  channel: z.enum(saleChannels),
  status: z.enum(["draft", "pending_purchase", "pending_payment"]),
  items: z
    .array(
      z
        .object({
          productId: id,
          variantId: id,
          quantity: z.number().int().min(1).max(999),
          unitPrice: money,
          discount: money.default(0),
        })
        .refine((item) => item.discount <= item.quantity * item.unitPrice, {
          message: "El descuento no puede superar el valor de la línea",
          path: ["discount"],
        }),
    )
    .min(1)
    .max(100),
  shippingCharged: money.default(0),
  notes: z.string().trim().max(2000).optional(),
});
export const paymentCreateSchema = z.object({
  requestId,
  date: iso,
  amount: z.number().int().positive().max(1_000_000_000),
  method: z.enum(paymentMethods),
  cashAccount: cashAccountId,
  reference: z.string().trim().max(200).optional(),
});
export const movementCreateSchema = z.object({
  requestId,
  productId: id,
  variantId: id,
  type: z.enum(inventoryMovementTypes).exclude(["sale", "purchase"]),
  quantityChange: z
    .number()
    .int()
    .min(-1_000_000_000)
    .max(1_000_000_000)
    .refine((value) => value !== 0),
  unitCost: money.nullable().default(null),
  reference: z.string().trim().min(1).max(200),
  reason: text,
  occurredAt: iso,
});
export const inventorySettingsSchema = z.object({
  minimumStock: z.number().int().min(0).max(1_000_000),
  averageCost: money.optional(),
  mode: z.enum(["stock", "on_demand", "decant"]).optional(),
  decantPackagingCost: money.optional(),
});
export const decantSourceCreateSchema = z.object({
  requestId,
  productId: id,
  variantId: id,
  usableMl: z.number().int().min(1).max(2_000).optional(),
  notes: z.string().trim().max(1_000).optional(),
});
export const supplierCreateSchema = z.object({
  name: text,
  taxId: z.string().trim().max(50).optional(),
  contact: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  city: z.string().trim().max(120).optional(),
  paymentTerms: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export const purchaseCreateSchema = z
  .object({
    supplierId: id.optional(),
    requestId,
    sourceSaleId: id.optional(),
    supplierName: text,
    date: iso,
    invoice: z.string().trim().max(200).optional(),
    paymentStatus: z.enum(["pending", "paid"]),
    cashAccount: cashAccountId.optional(),
    items: z
      .array(
        z
          .object({
            productId: id,
            variantId: id,
            quantity: z.number().int().positive().max(100000),
            unitCost: money,
            discount: money.default(0),
          })
          .refine((item) => item.discount <= item.quantity * item.unitCost, {
            message: "El descuento no puede superar el valor de la línea",
            path: ["discount"],
          }),
      )
      .min(1)
      .max(100),
    freight: money.default(0),
    allocateFreight: z.boolean().default(false),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.paymentStatus !== "paid" || !!v.cashAccount, {
    message: "Selecciona la cuenta de pago",
    path: ["cashAccount"],
  })
  .refine(
    (value) => {
      const total = value.items.reduce(
        (sum, item) =>
          sum +
          BigInt(item.quantity) * BigInt(item.unitCost) -
          BigInt(item.discount),
        BigInt(value.freight),
      );
      return total >= BigInt(0) && total <= maxSafeInteger;
    },
    {
      message: "El total de la compra supera el límite monetario seguro",
      path: ["items"],
    },
  );
export const expenseCreateSchema = z
  .object({
    requestId,
    date: iso,
    description: text,
    category: z.enum(expenseCategories),
    amount: z.number().int().positive().max(1_000_000_000),
    supplier: z.string().trim().max(200).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    cashAccount: cashAccountId.optional(),
    receipt: z.string().trim().max(500).optional(),
    status: z.enum(["paid", "pending"]),
  })
  .refine(
    (v) => v.status !== "paid" || (!!v.paymentMethod && !!v.cashAccount),
    { message: "Indica medio y cuenta de pago" },
  );
export const cashMovementCreateSchema = z
  .object({
    requestId,
    date: iso,
    direction: z.enum(["in", "out"]),
    type: z.enum([
      "opening_balance",
      "capital",
      "withdrawal",
      "adjustment",
      "other",
    ]),
    account: cashAccountId,
    amount: z.number().int().positive().max(1_000_000_000),
    description: text,
  })
  .refine(
    (value) =>
      !["opening_balance", "capital"].includes(value.type) ||
      value.direction === "in",
    {
      message: "Los saldos iniciales y aportes deben ser entradas",
      path: ["direction"],
    },
  )
  .refine((value) => value.type !== "withdrawal" || value.direction === "out", {
    message: "Los retiros deben ser salidas",
    path: ["direction"],
  });

export const saleTotals = (
  items: Array<{ quantity: number; unitPrice: number; discount: number }>,
  shipping: number,
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountTotal = items.reduce((sum, item) => sum + item.discount, 0);
  return {
    subtotal,
    discountTotal,
    total: subtotal - discountTotal + shipping,
  };
};

export function remainingSaleItemQuantities(
  items: SaleItem[],
  returns: Array<{ items: SaleReturnedItem[] }>,
) {
  const returned = new Map<string, number>();
  for (const entry of returns)
    for (const item of entry.items) {
      const key = `${item.productId}/${item.variantId}`;
      returned.set(key, (returned.get(key) ?? 0) + item.quantity);
    }
  const remaining = new Map<string, { item: SaleItem; quantity: number }>();
  for (const item of items) {
    const key = `${item.productId}/${item.variantId}`;
    const current = remaining.get(key);
    remaining.set(key, {
      item: current?.item ?? item,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  return [...remaining].map(([key, value]) => ({
    ...value,
    quantity: Math.max(0, value.quantity - (returned.get(key) ?? 0)),
  }));
}
export const weightedAverageCost = (
  stock: number,
  cost: number,
  added: number,
  addedCost: number,
) => {
  const units = BigInt(stock) + BigInt(added);
  if (units === BigInt(0)) return addedCost;
  const total =
    BigInt(stock) * BigInt(cost) + BigInt(added) * BigInt(addedCost);
  return Number((total + units / BigInt(2)) / units);
};

export const weightedAverageCostAfterRemoval = (
  stock: number,
  cost: number,
  removed: number,
  removedCost: number,
) => {
  const remaining = stock - removed;
  if (remaining <= 0) return 0;
  const total =
    BigInt(stock) * BigInt(cost) - BigInt(removed) * BigInt(removedCost);
  if (total <= BigInt(0)) return 0;
  const units = BigInt(remaining);
  return Number((total + units / BigInt(2)) / units);
};

export function millilitersFromSize(size: string) {
  const match = size.match(/(\d+(?:[.,]\d+)?)\s*ml/i);
  return match ? Number(match[1]!.replace(",", ".")) : 0;
}

export function decantConsumption(
  availableMl: number,
  sizeMl: number,
  quantity: number,
) {
  const usedMl = Math.round(sizeMl * quantity);
  if (!Number.isFinite(usedMl) || usedMl <= 0)
    throw new Error("Cantidad de decant inválida");
  if (usedMl > availableMl)
    throw new Error("No hay suficientes mililitros en el frasco abierto");
  return { usedMl, remainingMl: availableMl - usedMl };
}

export const decantUnitCost = (
  sizeMl: number,
  costPerMl: number,
  packagingCost: number,
) => Math.round(sizeMl * costPerMl) + packagingCost;

export function landedUnitCost(
  lineTotal: number,
  quantity: number,
  freight: number,
  merchandiseTotal: number,
  allocateFreight: boolean,
) {
  const share =
    allocateFreight && merchandiseTotal > 0
      ? Number(
          (BigInt(freight) * BigInt(lineTotal) +
            BigInt(merchandiseTotal) / BigInt(2)) /
            BigInt(merchandiseTotal),
        )
      : 0;
  const total = BigInt(lineTotal) + BigInt(share);
  return Number((total + BigInt(quantity) / BigInt(2)) / BigInt(quantity));
}
