import { z } from "zod";

export const saleStatuses = [
  "draft",
  "pending_payment",
  "paid",
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
export type CashAccount = (typeof cashAccounts)[number];
export type ExpenseCategory = (typeof expenseCategories)[number];
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export interface SaleItem {
  productId: string;
  variantId: string;
  sku?: string;
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
  inventoryAppliedAt?: string;
  inventoryReversedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
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
  reason: string;
  occurredAt: string;
  createdAt: string;
  createdBy: string;
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
export interface Purchase {
  id: string;
  number: string;
  supplierId?: string;
  supplierName: string;
  date: string;
  invoice?: string;
  status: "draft" | "confirmed";
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
  total: number;
  cashAccount?: CashAccount;
  notes?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
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
  status: "paid" | "pending";
  cashMovementId?: string;
  createdAt: string;
  createdBy: string;
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
}
export interface DashboardData {
  from: string;
  to: string;
  paidSales: number;
  registeredSales: number;
  grossProfit: number;
  cashBalance: number;
  receivable: number;
  lowStock: number;
  recentMovements: CashMovement[];
  topProducts: Array<{ name: string; quantity: number }>;
  salesByChannel: Array<{ channel: SaleChannel; total: number }>;
}

const id = z.string().regex(/^[a-zA-Z0-9-]{1,120}$/);
const text = z.string().trim().min(1).max(500);
const money = z.number().int().min(0).max(1_000_000_000);
const iso = z.iso.datetime();
const optionalCustomer = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional(),
    city: z.string().trim().max(120).optional(),
  })
  .optional();

export const saleCreateSchema = z.object({
  occurredAt: iso,
  customer: optionalCustomer,
  channel: z.enum(saleChannels),
  status: z.enum(["draft", "pending_payment"]),
  items: z
    .array(
      z.object({
        productId: id,
        variantId: id,
        quantity: z.number().int().min(1).max(999),
        unitPrice: money,
        discount: money.default(0),
      }),
    )
    .min(1)
    .max(100),
  shippingCharged: money.default(0),
  notes: z.string().trim().max(2000).optional(),
});
export const paymentCreateSchema = z.object({
  date: iso,
  amount: z.number().int().positive().max(1_000_000_000),
  method: z.enum(paymentMethods),
  cashAccount: z.enum(cashAccounts),
  reference: z.string().trim().max(200).optional(),
});
export const movementCreateSchema = z.object({
  productId: id,
  variantId: id,
  type: z.enum(inventoryMovementTypes).exclude(["sale", "purchase"]),
  quantityChange: z
    .number()
    .int()
    .refine((value) => value !== 0),
  unitCost: money.nullable().default(null),
  reason: text,
  occurredAt: iso,
});
export const inventorySettingsSchema = z.object({
  minimumStock: z.number().int().min(0).max(1_000_000),
  averageCost: money.optional(),
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
    supplierName: text,
    date: iso,
    invoice: z.string().trim().max(200).optional(),
    paymentStatus: z.enum(["pending", "paid"]),
    cashAccount: z.enum(cashAccounts).optional(),
    items: z
      .array(
        z.object({
          productId: id,
          variantId: id,
          quantity: z.number().int().positive().max(100000),
          unitCost: money,
          discount: money.default(0),
        }),
      )
      .min(1)
      .max(100),
    freight: money.default(0),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.paymentStatus !== "paid" || !!v.cashAccount, {
    message: "Selecciona la cuenta de pago",
    path: ["cashAccount"],
  });
export const expenseCreateSchema = z
  .object({
    date: iso,
    description: text,
    category: z.enum(expenseCategories),
    amount: z.number().int().positive().max(1_000_000_000),
    supplier: z.string().trim().max(200).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    cashAccount: z.enum(cashAccounts).optional(),
    receipt: z.string().trim().max(500).optional(),
    status: z.enum(["paid", "pending"]),
  })
  .refine(
    (v) => v.status !== "paid" || (!!v.paymentMethod && !!v.cashAccount),
    { message: "Indica medio y cuenta de pago" },
  );
export const cashMovementCreateSchema = z.object({
  date: iso,
  direction: z.enum(["in", "out"]),
  type: z.enum([
    "opening_balance",
    "capital",
    "withdrawal",
    "adjustment",
    "other",
  ]),
  account: z.enum(cashAccounts),
  amount: z.number().int().positive().max(1_000_000_000),
  description: text,
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
export const weightedAverageCost = (
  stock: number,
  cost: number,
  added: number,
  addedCost: number,
) =>
  stock + added === 0
    ? addedCost
    : Math.round((stock * cost + added * addedCost) / (stock + added));
