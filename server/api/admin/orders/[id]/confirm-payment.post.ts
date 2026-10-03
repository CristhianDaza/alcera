import { randomUUID } from "node:crypto";
import { buildMetaContentFromItems } from "../../../../../shared/meta";
import type { Order, MetaPurchaseStatus } from "../../../../../shared/orders";
import {
  hashMetaPhone,
  MetaCapiError,
  sendMetaServerEvent,
} from "../../../../utils/meta-capi";

const META_SEND_LEASE_MS = 5 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para guardar.",
    });
  const id = getRouterParam(event, "id");
  if (!id || !/^[a-zA-Z0-9-]{1,120}$/.test(id))
    throw createError({
      statusCode: 400,
      statusMessage: "Referencia inválida.",
    });

  const db = database();
  const ref = db.collection("orders").doc(id);
  const proposedEventId = randomUUID();
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "No encontramos el pedido.",
      });
    const order = snapshot.data() as Order;
    if (order.paymentMethod !== "BREB")
      throw createError({
        statusCode: 409,
        statusMessage: "Este pedido no es un pago Bre-B.",
      });

    if (order.paymentStatus !== "PAID") {
      if (
        order.paymentStatus !== "PENDING_VERIFICATION" ||
        order.status !== "awaiting_payment"
      )
        throw createError({
          statusCode: 409,
          statusMessage:
            "El pedido no tiene un pago Bre-B pendiente de verificar.",
        });
      const now = new Date().toISOString();
      tx.update(ref, {
        status: "paid",
        paymentStatus: "PAID",
        paymentVerifiedAt: now,
        paymentVerifiedBy: admin.uid,
        updatedAt: now,
        history: [
          ...(order.history ?? []),
          {
            status: "paid",
            at: now,
            actor: admin.uid,
            note: "Pago Bre-B verificado por administración.",
          },
        ],
        metaPurchaseEventId: order.metaPurchaseEventId || proposedEventId,
        metaPurchaseStatus:
          order.metaPurchaseStatus ||
          (order.marketingConsent === true ? "pending" : "suppressed"),
      });
    } else if (!order.metaPurchaseEventId) {
      // Backfill legacy paid Bre-B orders without changing their payment state.
      tx.update(ref, {
        metaPurchaseEventId: proposedEventId,
        metaPurchaseStatus:
          order.metaPurchaseStatus ||
          (order.marketingConsent === true ? "pending" : "suppressed"),
      });
    }
  });

  const claim = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const order = snapshot.data() as Order;
    if (
      order.paymentStatus !== "PAID" ||
      order.status !== "paid" ||
      !order.metaPurchaseEventId
    )
      return null;

    const state = order.metaPurchaseStatus;
    if (state === "sent") return { order, status: "sent" as const };
    if (state === "suppressed") return { order, status: "suppressed" as const };
    const lastAttempt = Date.parse(order.metaPurchaseAttemptedAt || "");
    if (
      state === "sending" &&
      Number.isFinite(lastAttempt) &&
      Date.now() - lastAttempt < META_SEND_LEASE_MS
    )
      return { order, status: "sending" as const };

    tx.update(ref, {
      metaPurchaseStatus: "sending" satisfies MetaPurchaseStatus,
      metaPurchaseAttemptedAt: new Date().toISOString(),
      metaPurchaseAttemptCount: (order.metaPurchaseAttemptCount || 0) + 1,
      metaPurchaseErrorCode: null,
      metaPurchaseErrorStatus: null,
    });
    return { order, status: "claimed" as const };
  });

  if (!claim) return { ok: true, metaPurchaseStatus: "not_sent" };
  if (claim.status !== "claimed")
    return { ok: true, metaPurchaseStatus: claim.status };

  const order = claim.order;
  const items = buildMetaContentFromItems(
    order.items.map((item) => ({
      id: item.variantId,
      price: item.price,
      quantity: item.quantity,
    })),
  );
  const eventId = order.metaPurchaseEventId!;
  let errorCode = "";
  let errorStatus: number | undefined;
  try {
    const pixelId = process.env.META_PIXEL_ID?.trim() || "";
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN || "";
    const storeSettings = await settings();
    if (pixelId !== storeSettings.metaPixelId)
      throw new MetaCapiError("pixel_id_mismatch");

    const siteUrl = String(useRuntimeConfig(event).public.siteUrl || "");
    let eventSourceUrl: string | undefined;
    try {
      const parsedSiteUrl = new URL(siteUrl);
      if (
        parsedSiteUrl.protocol === "https:" &&
        parsedSiteUrl.hostname !== "localhost"
      )
        eventSourceUrl = new URL("/carrito", parsedSiteUrl).href;
    } catch {
      // event_source_url is optional when no public site URL is configured.
    }
    const verifiedAt = Date.parse(order.paymentVerifiedAt || "");
    const purchaseValue = order.amountToPay ?? order.subtotal;
    const payload = {
      event_name: "Purchase" as const,
      event_time: Number.isFinite(verifiedAt)
        ? Math.floor(verifiedAt / 1000)
        : Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website" as const,
      ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
      ...(order.marketingConsent === true && hashMetaPhone(order.customer.phone)
        ? { user_data: { ph: [hashMetaPhone(order.customer.phone)!] } }
        : {}),
      custom_data: {
        ...items,
        // Bre-B amountToPay is the confirmed subtotal; delivery is paid on receipt.
        value: purchaseValue,
      },
    };

    if (import.meta.dev)
      console.info("[meta] evento", {
        name: payload.event_name,
        event_id: eventId,
        content_ids: items.content_ids,
      });

    // Only an explicit optional-cookie grant permits sending hashed phone data; the hash is transient.
    await sendMetaServerEvent(
      pixelId,
      accessToken,
      payload,
      process.env.META_TEST_EVENT_CODE?.trim() || "",
    );
  } catch (error) {
    errorCode = error instanceof MetaCapiError ? error.code : "internal_error";
    errorStatus = error instanceof MetaCapiError ? error.httpStatus : undefined;
  }

  let resultStatus: "sent" | "failed" = "failed";
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return;
    const latest = snapshot.data() as Order;
    if (
      latest.metaPurchaseEventId !== eventId ||
      latest.metaPurchaseStatus !== "sending"
    ) {
      resultStatus = latest.metaPurchaseStatus === "sent" ? "sent" : "failed";
      return;
    }
    const sent = !errorCode;
    resultStatus = sent ? "sent" : "failed";
    tx.update(ref, {
      metaPurchaseStatus: resultStatus,
      ...(sent
        ? { metaPurchaseSentAt: new Date().toISOString() }
        : {
            metaPurchaseErrorCode: errorCode,
            metaPurchaseErrorStatus: errorStatus ?? null,
          }),
    });
  });

  return { ok: true, metaPurchaseStatus: resultStatus };
});
