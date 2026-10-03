import { createHash } from "node:crypto";
import {
  orderRequestSchema,
  resolveOrderItems,
  orderWhatsappUrl,
  type Order,
} from "../../../shared/orders";
import type { Product } from "../../../shared/types";

export default defineEventHandler(async (event) => {
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Las solicitudes están desactivadas en modo demostración.",
    });
  const raw = await readRawBody(event);
  if (!raw || Buffer.byteLength(raw) > 40000)
    throw createError({
      statusCode: 400,
      statusMessage: "Solicitud inválida o demasiado grande.",
    });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Solicitud inválida.",
    });
  }
  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage:
        "Revisa nombre, teléfono, ciudad y productos de la solicitud.",
    });
  const input = parsed.data;
  const config = await settings();
  if (input.paymentMethod === "WHATSAPP" && !config.whatsapp)
    throw createError({
      statusCode: 503,
      statusMessage: "La tienda aún no tiene WhatsApp configurado.",
    });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const db = database();
  const ref = db.collection("orders").doc(input.requestId);
  const bucket = Math.floor(Date.now() / 600000);
  const rateKey = createHash("sha256")
    .update(`${getRequestIP(event) || "unknown"}:${bucket}`)
    .digest("hex");
  const rateRef = db.collection("orderRateLimits").doc(rateKey);
  const order = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      if (existing.data()?.fingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage:
            "Esta referencia ya fue utilizada. Inicia una nueva solicitud.",
        });
      return existing.data() as Order;
    }
    const rate = await tx.get(rateRef);
    if ((rate.data()?.count ?? 0) >= 10)
      throw createError({
        statusCode: 429,
        statusMessage: "Hay demasiadas solicitudes. Inténtalo en unos minutos.",
      });
    const now = new Date().toISOString();
    const year = now.slice(0, 4);
    const referenceRef = db.collection("orderCounters").doc(year);
    const referenceCounter = await tx.get(referenceRef);
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const snapshots = await tx.getAll(
      ...ids.map((id) => db.collection("products").doc(id)),
    );
    const catalog = snapshots
      .filter((d) => d.exists)
      .map((d) => ({ ...d.data(), id: d.id }) as Product);
    let items;
    try {
      items = resolveOrderItems(input.items, catalog);
    } catch (error) {
      throw createError({
        statusCode: 409,
        statusMessage: (error as Error).message,
      });
    }
    const reference = `ALC-${year}-${String((referenceCounter.data()?.value ?? 0) + 1).padStart(4, "0")}`;
    const result: Order = {
      id: ref.id,
      reference,
      customer: input.customer,
      marketingConsent: input.marketingConsent,
      items,
      subtotal: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      shipping: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      tracking: "",
      history: [
        {
          status: "pending",
          at: now,
          actor: "customer",
          note: "Solicitud registrada desde la bolsa.",
        },
      ],
      ...(input.paymentMethod === "BREB"
        ? {
            paymentMethod: "BREB" as const,
            paymentProvider: "BREB" as const,
            paymentStatus: "PENDING" as const,
            amountToPay: items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            ),
            shippingPaymentType: "PAY_ON_DELIVERY" as const,
          }
        : { paymentMethod: "WHATSAPP" as const }),
    };
    tx.create(ref, { ...result, fingerprint, contactConsentAt: now });
    tx.set(referenceRef, {
      value: (referenceCounter.data()?.value ?? 0) + 1,
      updatedAt: now,
    });
    tx.set(rateRef, {
      count: (rate.data()?.count ?? 0) + 1,
      expiresAt: new Date((bucket + 2) * 600000),
    });
    return result;
  });
  setResponseStatus(event, 201);
  return {
    id: order.id,
    reference: order.reference ?? order.id,
    amountToPay: order.amountToPay ?? order.subtotal,
    whatsappUrl:
      order.paymentMethod === "BREB"
        ? null
        : orderWhatsappUrl(order, config.whatsapp, config.name),
  };
});
