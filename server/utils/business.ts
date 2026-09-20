import { createHash, randomUUID } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import type { Product, Variant } from "../../shared/types";

export const nowIso = () => new Date().toISOString();
export const newId = () => randomUUID();
export const requestFingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
/** Firestore rechaza propiedades opcionales con valor undefined. */
export function firestoreData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(firestoreData) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, firestoreData(item)]),
    ) as T;
  return value;
}

export function failValidation(error: { flatten(): unknown }): never {
  throw createError({
    statusCode: 400,
    statusMessage: "Revisa los datos enviados",
    data: error.flatten(),
  });
}

export async function readValidated<T>(
  event: import("h3").H3Event,
  schema: {
    safeParse(
      value: unknown,
    ):
      | { success: true; data: T }
      | { success: false; error: { flatten(): unknown } };
  },
): Promise<T> {
  const result = schema.safeParse(await readBody(event));
  if (!result.success) failValidation(result.error);
  return result.data;
}

export function docData<T>(doc: { id: string; data(): unknown }): T {
  return { id: doc.id, ...(doc.data() as object) } as T;
}

export function safeInteger(value: number, message: string) {
  if (!Number.isSafeInteger(value))
    throw createError({ statusCode: 409, statusMessage: message });
  return value;
}

export async function nextNumber(
  tx: Transaction,
  prefix: "V" | "C" | "G" | "M",
  date = new Date(),
) {
  return (await nextNumbers(tx, [{ prefix, date }]))[0]!;
}

/** Reserva varios consecutivos leyendo todos los contadores antes de escribir. */
export async function nextNumbers(
  tx: Transaction,
  requests: Array<{ prefix: "V" | "C" | "G" | "M"; date?: Date }>,
) {
  const entries = requests.map(({ prefix, date = new Date() }) => {
    const period = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      prefix,
      period,
      ref: database().collection("businessCounters").doc(`${prefix}-${period}`),
    };
  });
  const snapshots = await Promise.all(entries.map(({ ref }) => tx.get(ref)));
  const values = new Map<string, number>();
  const numbers = entries.map(({ prefix, period, ref }, index) => {
    const key = `${prefix}-${period}`;
    const value = (values.get(key) ?? snapshots[index]!.data()?.value ?? 0) + 1;
    values.set(key, value);
    return `${prefix}-${period}-${String(value).padStart(4, "0")}`;
  });
  for (const entry of entries.filter(
    (candidate, index, all) =>
      all.findIndex(
        (item) =>
          item.prefix === candidate.prefix && item.period === candidate.period,
      ) === index,
  )) {
    const key = `${entry.prefix}-${entry.period}`;
    tx.set(entry.ref, { value: values.get(key)!, updatedAt: nowIso() });
  }
  return numbers;
}

export function findVariant(
  product: Product | undefined,
  variantId: string,
): Variant {
  const variant = product?.variants.find((item) => item.id === variantId);
  if (!product || !variant)
    throw createError({
      statusCode: 404,
      statusMessage: "Presentación no encontrada",
    });
  return variant;
}

export function replaceVariant(
  product: Product,
  variantId: string,
  variant: Variant,
): Product {
  return {
    ...product,
    variants: product.variants.map((item) =>
      item.id === variantId ? variant : item,
    ),
  };
}

export function inventoryOf(variant: Variant) {
  const inventory = variant.inventory;
  return {
    stock: inventory?.stock ?? 0,
    minimumStock: inventory?.minimumStock ?? 0,
    averageCost: inventory?.averageCost ?? 0,
    updatedAt: inventory?.updatedAt ?? nowIso(),
    mode:
      inventory?.mode ?? (variant.type === "decant" ? "decant" : "on_demand"),
    decantPackagingCost: inventory?.decantPackagingCost ?? 0,
    decantSupplies: inventory?.decantSupplies ?? [],
  };
}

export function bogotaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function followingDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function dateRange(query: Record<string, string | undefined>) {
  const today = bogotaDate();
  const from = query.from || `${today.slice(0, 8)}01`;
  const to = query.to || today;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    from > to
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Rango de fechas inválido",
    });
  return {
    from,
    to,
    start: `${from}T05:00:00.000Z`,
    end: `${followingDate(to)}T04:59:59.999Z`,
  };
}
