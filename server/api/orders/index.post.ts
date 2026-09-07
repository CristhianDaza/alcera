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
  if (!config.whatsapp)
    throw createError({
      statusCode: 503,
      statusMessage: "La tienda aún no tiene WhatsApp configurado.",
    });
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const db = database();
  const ref = db.collection("orders").doc(input.requestId);
  // Do not trust caller-controlled forwarding headers. A shared proxy may need a deployment-specific limiter.
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
    const now = new Date().toISOString();
    const result: Order = {
      id: ref.id,
      customer: input.customer,
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
    };
    tx.create(ref, { ...result, fingerprint, contactConsentAt: now });
    tx.set(rateRef, {
      count: (rate.data()?.count ?? 0) + 1,
      expiresAt: new Date((bucket + 2) * 600000),
    });
    return result;
  });
  setResponseStatus(event, 201);
  // No public order lookup or customer data response.
  return {
    id: order.id,
    whatsappUrl: orderWhatsappUrl(order, config.whatsapp, config.name),
  };
});
