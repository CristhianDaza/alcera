import { z } from "zod";
import type { Product } from "./types";
import { money } from "./commerce";

export const orderStatuses = [
  "pending",
  "awaiting_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "lost",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const orderLabels: Record<OrderStatus, string> = {
  pending: "Pendiente de confirmar",
  awaiting_payment: "Pendiente de pago",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  lost: "Perdido",
};
export const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["awaiting_payment", "cancelled", "lost"],
  awaiting_payment: ["paid", "cancelled", "lost"],
  paid: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: ["pending"],
  lost: ["pending"],
};
const identifier = z.string().regex(/^[a-zA-Z0-9-]{1,120}$/);
export const orderRequestSchema = z.object({
  requestId: z.uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[1-9]\d{7,14}$/, "Incluye el código de país, sin espacios ni +"),
    city: z.string().trim().min(2).max(120),
  }),
  contactConsent: z.literal(true),
  items: z
    .array(
      z.object({
        productId: identifier,
        variantId: identifier,
        quantity: z.number().int().min(1).max(99),
        expectedPrice: z.number().int().positive().max(100000000),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((i) => `${i.productId}/${i.variantId}`)).size ===
        items.length,
    ),
});
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
}
export interface OrderHistory {
  status: OrderStatus;
  at: string;
  actor: string;
  note: string;
}
export interface Order {
  id: string;
  customer: OrderRequest["customer"];
  items: OrderItem[];
  subtotal: number;
  shipping: number | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  tracking: string;
  history: OrderHistory[];
}
export const orderUpdateSchema = z.object({
  expectedStatus: z.enum(orderStatuses),
  status: z.enum(orderStatuses),
  shipping: z.number().int().min(0).max(100000000).nullable(),
  tracking: z.string().trim().max(200),
  note: z.string().trim().max(1000),
});

// Only catalog values become the saved commercial snapshot.
export function resolveOrderItems(
  items: OrderRequest["items"],
  products: Product[],
): OrderItem[] {
  return items.map((item) => {
    const product = products.find(
      (p) => p.id === item.productId && p.status === "published",
    );
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant?.available)
      throw new Error(
        "Una presentación ya no está disponible. Revisa tu bolsa.",
      );
    if (variant.price !== item.expectedPrice)
      throw new Error(
        "Los precios cambiaron. Revisa tu bolsa y vuelve a continuar.",
      );
    return {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      size: variant.size,
      price: variant.price,
      quantity: item.quantity,
    };
  });
}

export function applyOrderUpdate(
  order: Order,
  change: z.infer<typeof orderUpdateSchema>,
  actor: string,
  at: string,
): Order {
  if (order.status !== change.expectedStatus)
    throw new Error(
      "El pedido cambió. Actualiza el listado antes de continuar.",
    );
  if (!orderTransitions[order.status].includes(change.status))
    throw new Error("Ese cambio de estado no está permitido.");
  if (["cancelled", "lost"].includes(change.status) && !change.note)
    throw new Error("Indica el motivo de cancelación o pérdida.");
  if (
    ["awaiting_payment", "paid"].includes(change.status) &&
    change.shipping === null
  )
    throw new Error("Indica el envío acordado (0 si es gratis).");
  if (
    ["paid", "shipped"].includes(order.status) &&
    change.shipping !== order.shipping
  )
    throw new Error("No puedes modificar el envío de un pedido pagado.");
  return {
    ...order,
    status: change.status,
    shipping: change.shipping,
    tracking: change.tracking,
    updatedAt: at,
    history: [
      ...order.history,
      { status: change.status, at, actor, note: change.note },
    ],
  };
}

export function orderWhatsappUrl(
  order: Order,
  whatsapp: string,
  storeName: string,
) {
  const message = `Hola, ${storeName}. Quiero confirmar mi solicitud ${order.id}.\n\n${order.items.map((i) => `• ${i.name} · ${i.size} × ${i.quantity}: ${money(i.price * i.quantity)}`).join("\n")}\n\nSubtotal: ${money(order.subtotal)}\nCiudad: ${order.customer.city}\nEnvío y pago pendientes de confirmar. Esta solicitud no reserva productos.`;
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}
