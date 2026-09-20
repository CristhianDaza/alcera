import {
  paymentMethods,
  saleChannels,
  saleStatuses,
  type PaymentMethod,
  type Sale,
  type SalePayment,
} from "../../../../shared/business";

const identifier = /^[a-zA-Z0-9-]{1,120}$/;
const dateValue = /^\d{4}-\d{2}-\d{2}$/;

function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const raw = getQuery(event);
  const value = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const cursorId = value("cursor");
  const from = value("from");
  const to = value("to");
  const status = value("status");
  const channel = value("channel");
  const paymentMethod = value("paymentMethod");
  const term = value("query").trim().toLocaleLowerCase("es");
  if (cursorId && !identifier.test(cursorId))
    throw createError({ statusCode: 400, statusMessage: "Cursor inválido" });
  if (
    (from && !dateValue.test(from)) ||
    (to && !dateValue.test(to)) ||
    (from && to && from > to)
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Rango de fechas inválido",
    });
  if (status && !saleStatuses.includes(status as (typeof saleStatuses)[number]))
    throw createError({ statusCode: 400, statusMessage: "Estado inválido" });
  if (
    channel &&
    !saleChannels.includes(channel as (typeof saleChannels)[number])
  )
    throw createError({ statusCode: 400, statusMessage: "Canal inválido" });
  if (paymentMethod && !paymentMethods.includes(paymentMethod as PaymentMethod))
    throw createError({
      statusCode: 400,
      statusMessage: "Medio de pago inválido",
    });

  const db = database();
  let cursor = cursorId
    ? await db.collection("sales").doc(cursorId).get()
    : undefined;
  if (cursorId && !cursor?.exists)
    throw createError({ statusCode: 400, statusMessage: "Cursor inválido" });

  let matchingSaleIds: Set<string> | undefined;
  let methodsBySale = new Map<string, PaymentMethod[]>();
  if (paymentMethod) {
    const payments = await db
      .collection("salePayments")
      .where("method", "==", paymentMethod)
      .get();
    methodsBySale = payments.docs.reduce((result, document) => {
      const payment = docData<SalePayment>(document);
      const methods = result.get(payment.saleId) ?? [];
      if (!methods.includes(payment.method)) methods.push(payment.method);
      result.set(payment.saleId, methods);
      return result;
    }, new Map<string, PaymentMethod[]>());
    matchingSaleIds = new Set(methodsBySale.keys());
    if (!matchingSaleIds.size) return [];
  }

  const results: Sale[] = [];
  let exhausted = false;
  while (results.length < 50 && !exhausted) {
    let request = db
      .collection("sales")
      .orderBy("createdAt", "desc")
      .limit(100);
    if (cursor) request = request.startAfter(cursor);
    const snapshot = await request.get();
    exhausted = snapshot.size < 100;
    if (!snapshot.size) break;
    for (const document of snapshot.docs) {
      cursor = document;
      const sale = docData<Sale>(document);
      if (from && sale.createdAt < `${from}T05:00:00.000Z`) continue;
      if (to && sale.createdAt > `${nextDate(to)}T04:59:59.999Z`) continue;
      if (status && sale.status !== status) continue;
      if (channel && sale.channel !== channel) continue;
      if (matchingSaleIds && !matchingSaleIds.has(sale.id)) continue;
      if (
        term &&
        !`${sale.number} ${sale.customer?.name ?? ""}`
          .toLocaleLowerCase("es")
          .includes(term)
      )
        continue;
      results.push(
        paymentMethod
          ? { ...sale, paymentMethods: methodsBySale.get(sale.id) ?? [] }
          : sale,
      );
      if (results.length === 50) break;
    }
  }
  return results;
});
