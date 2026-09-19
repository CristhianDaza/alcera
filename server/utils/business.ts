import { randomUUID } from "node:crypto";
import type { Transaction } from "firebase-admin/firestore";
import type { Product, Variant } from "../../shared/types";

export const nowIso = () => new Date().toISOString();
export const newId = () => randomUUID();
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
  return entries.map(({ prefix, period, ref }, index) => {
    const value = (snapshots[index]!.data()?.value ?? 0) + 1;
    tx.set(ref, { value, updatedAt: nowIso() });
    return `${prefix}-${period}-${String(value).padStart(4, "0")}`;
  });
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
  return (
    variant.inventory ?? {
      stock: 0,
      minimumStock: 0,
      averageCost: 0,
      updatedAt: nowIso(),
    }
  );
}

export function dateRange(query: Record<string, string | undefined>) {
  const now = new Date();
  const from =
    query.from ||
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
  const to = query.to || now.toISOString().slice(0, 10);
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
    start: `${from}T00:00:00.000Z`,
    end: `${to}T23:59:59.999Z`,
  };
}
