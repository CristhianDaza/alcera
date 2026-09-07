import { describe, expect, it } from "vitest";
import {
  applyOrderUpdate,
  orderRequestSchema,
  resolveOrderItems,
  orderWhatsappUrl,
  type Order,
} from "../shared/orders";
import { demoProducts } from "../shared/demo";
const product = demoProducts[0]!,
  variant = product.variants[0]!;
const input = {
  requestId: "5a6ebbec-338f-46cb-9262-49304c281352",
  customer: {
    name: "Cliente de prueba",
    phone: "573001234567",
    city: "Medellín",
  },
  contactConsent: true as const,
  items: [
    {
      productId: product.id,
      variantId: variant.id,
      expectedPrice: variant.price,
      quantity: 2,
    },
  ],
};
const order: Order = {
  id: input.requestId,
  customer: input.customer,
  items: resolveOrderItems(input.items, [product]),
  subtotal: variant.price * 2,
  shipping: null,
  status: "pending",
  createdAt: "2026-09-06T12:00:00.000Z",
  updatedAt: "2026-09-06T12:00:00.000Z",
  tracking: "",
  history: [],
};
describe("Solicitudes de pedido", () => {
  it("completa el ciclo hasta entrega y no permite reabrirlo ni cancelar pagos sin devolución", () => {
    let current = order;
    for (const status of [
      "awaiting_payment",
      "paid",
      "shipped",
      "delivered",
    ] as const) {
      current = applyOrderUpdate(
        current,
        {
          expectedStatus: current.status,
          status,
          shipping: 10000,
          tracking: "Guía 123",
          note: "Confirmado",
        },
        "admin",
        "2026-09-07T12:00:00.000Z",
      );
    }
    expect(current.status).toBe("delivered");
    expect(current.history).toHaveLength(4);
    expect(() =>
      applyOrderUpdate(
        current,
        {
          expectedStatus: "delivered",
          status: "pending",
          shipping: 10000,
          tracking: "",
          note: "",
        },
        "admin",
        "now",
      ),
    ).toThrow("no está permitido");
    expect(() =>
      applyOrderUpdate(
        { ...order, status: "paid", shipping: 10000 },
        {
          expectedStatus: "paid",
          status: "cancelled",
          shipping: 10000,
          tracking: "",
          note: "Cancelar",
        },
        "admin",
        "now",
      ),
    ).toThrow("no está permitido");
  });
  it("rechaza datos incompletos, cantidades inválidas, duplicados y ausencia de autorización", () => {
    expect(orderRequestSchema.safeParse(input).success).toBe(true);
    for (const change of [
      { contactConsent: false },
      { customer: { ...input.customer, phone: "+57 abc" } },
      { items: [] },
      { items: [input.items[0], input.items[0]] },
      { items: [{ ...input.items[0], quantity: 0 }] },
      { items: [{ ...input.items[0], quantity: 100 }] },
      { items: [{ ...input.items[0], productId: "../private" }] },
    ]) {
      expect(
        orderRequestSchema.safeParse({ ...input, ...change }).success,
      ).toBe(false);
    }
  });
  it("toma nombres y precios del catálogo y rechaza precio alterado o disponibilidad perdida", () => {
    expect(order.items[0]).toMatchObject({
      name: product.name,
      price: variant.price,
      quantity: 2,
    });
    expect(() =>
      resolveOrderItems([{ ...input.items[0]!, expectedPrice: 1 }], [product]),
    ).toThrow("precios cambiaron");
    for (const catalog of [
      [],
      [{ ...product, status: "draft" as const }],
      [{ ...product, variants: [] }],
      [{ ...product, variants: [{ ...variant, available: false }] }],
    ]) {
      expect(() => resolveOrderItems(input.items, catalog)).toThrow(
        "no está disponible",
      );
    }
  });
  it("exige envío acordado, impide saltarse el pago y registra autor y fecha", () => {
    const change = {
      expectedStatus: "pending" as const,
      status: "awaiting_payment" as const,
      shipping: 10000,
      tracking: "",
      note: "Disponible; envío confirmado.",
    };
    expect(() =>
      applyOrderUpdate(order, { ...change, shipping: null }, "admin", "now"),
    ).toThrow("envío acordado");
    expect(() =>
      applyOrderUpdate(order, { ...change, status: "paid" }, "admin", "now"),
    ).toThrow("no está permitido");
    const next = applyOrderUpdate(order, change, "admin-id", "now");
    expect(next.history).toEqual([
      {
        status: "awaiting_payment",
        actor: "admin-id",
        at: "now",
        note: change.note,
      },
    ]);
    expect(next.shipping).toBe(10000);
    expect(order.status).toBe("pending");
    expect(() => applyOrderUpdate(next, change, "admin", "now")).toThrow(
      "pedido cambió",
    );
  });
  it("exige motivo de pérdida y conserva importes después de pagar", () => {
    expect(() =>
      applyOrderUpdate(
        order,
        {
          expectedStatus: "pending",
          status: "lost",
          shipping: null,
          tracking: "",
          note: "",
        },
        "admin",
        "now",
      ),
    ).toThrow("motivo");
    expect(() =>
      applyOrderUpdate(
        { ...order, status: "paid", shipping: 5000 },
        {
          expectedStatus: "paid",
          status: "shipped",
          shipping: 0,
          tracking: "",
          note: "",
        },
        "admin",
        "now",
      ),
    ).toThrow("pedido pagado");
  });
  it("permite reabrir solicitudes canceladas o perdidas para corregirlas", () => {
    const reopened = applyOrderUpdate(
      { ...order, status: "cancelled" },
      {
        expectedStatus: "cancelled",
        status: "pending",
        shipping: null,
        tracking: "",
        note: "El cliente pidió retomarlo.",
      },
      "admin",
      "now",
    );
    expect(reopened.status).toBe("pending");
  });
  it("genera WhatsApp con referencia, subtotal y condiciones sin declarar una compra", () => {
    const url = new URL(orderWhatsappUrl(order, "573001234567", "ALCÉRA"));
    expect(url.hostname).toBe("wa.me");
    expect(url.searchParams.get("text")).toContain(order.id);
    expect(url.searchParams.get("text")).toContain("no reserva productos");
  });
});
