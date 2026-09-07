import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoProducts } from "../shared/demo";
const product = demoProducts[0]!,
  variant = product.variants[0]!;
const input = {
  requestId: "5a6ebbec-338f-46cb-9262-49304c281352",
  customer: { name: "Cliente", phone: "573001234567", city: "Bogotá" },
  contactConsent: true,
  items: [
    {
      productId: product.id,
      variantId: variant.id,
      expectedPrice: variant.price,
      quantity: 2,
    },
  ],
};
let records: Map<string, any>, body: unknown;
let createOrder: (event: never) => Promise<any>,
  updateOrder: (event: never) => Promise<any>,
  listOrders: (event: never) => Promise<any>;
const admin = vi.fn();
beforeEach(async () => {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("createError", (data: { statusMessage: string }) =>
    Object.assign(new Error(data.statusMessage), data),
  );
  vi.stubGlobal("isDemo", () => false);
  vi.stubGlobal("settings", async () => ({
    name: "ALCÉRA",
    whatsapp: "573001234567",
  }));
  vi.stubGlobal("getRequestIP", () => "127.0.0.1");
  vi.stubGlobal("setResponseStatus", vi.fn());
  vi.stubGlobal("readRawBody", async () => JSON.stringify(body));
  vi.stubGlobal("readBody", async () => body);
  vi.stubGlobal("getRouterParam", () => input.requestId);
  vi.stubGlobal("requireAdmin", admin);
  admin.mockReset().mockResolvedValue({ uid: "admin" });
  records = new Map([[`products/${product.id}`, structuredClone(product)]]);
  body = structuredClone(input);
  const snapshot = (ref: { path: string; id: string }) => ({
    exists: records.has(ref.path),
    data: () => records.get(ref.path),
    id: ref.id,
  });
  vi.stubGlobal("database", () => ({
    collection: (collection: string) => ({
      doc: (id: string) => ({ path: `${collection}/${id}`, id }),
    }),
    runTransaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const writes: (() => void)[] = [];
      const result = await callback({
        get: async (ref: any) => snapshot(ref),
        getAll: async (...refs: any[]) => refs.map(snapshot),
        create: (ref: any, data: unknown) =>
          writes.push(() => {
            if (records.has(ref.path)) throw new Error("duplicate");
            records.set(ref.path, data);
          }),
        set: (ref: any, data: unknown) =>
          writes.push(() => records.set(ref.path, data)),
        update: (ref: any, data: object) =>
          writes.push(() =>
            records.set(ref.path, { ...records.get(ref.path), ...data }),
          ),
      });
      writes.forEach((write) => write());
      return result;
    },
  }));
  createOrder = (await import("../server/api/orders/index.post"))
    .default as never;
  updateOrder = (await import("../server/api/admin/orders/[id].patch"))
    .default as never;
  listOrders = (await import("../server/api/admin/orders/index.get"))
    .default as never;
});
describe("API de pedidos", () => {
  it("persiste una sola solicitud al reintentar y no devuelve datos privados", async () => {
    const first = await createOrder({} as never);
    const second = await createOrder({} as never);
    expect(second).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(["id", "whatsappUrl"]);
    expect(
      [...records.keys()].filter((k) => k.startsWith("orders/")),
    ).toHaveLength(1);
    expect(records.get(`orders/${input.requestId}`)).toMatchObject({
      subtotal: variant.price * 2,
      status: "pending",
    });
    body = { ...input, customer: { ...input.customer, name: "Otra persona" } };
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
  it("no guarda ante cambio de precio, producto agotado, demo o WhatsApp sin configurar", async () => {
    records.set(`products/${product.id}`, {
      ...product,
      variants: [{ ...variant, price: variant.price + 1 }],
    });
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    records.set(`products/${product.id}`, {
      ...product,
      variants: [{ ...variant, available: false }],
    });
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    vi.stubGlobal("isDemo", () => true);
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    vi.stubGlobal("isDemo", () => false);
    vi.stubGlobal("settings", async () => ({ whatsapp: "" }));
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect([...records.keys()].some((k) => k.startsWith("orders/"))).toBe(
      false,
    );
  });
  it("limita solicitudes repetidas desde la misma dirección sin bloquear reintentos", async () => {
    for (let index = 0; index < 10; index++) {
      body = {
        ...input,
        requestId: `5a6ebbec-338f-46cb-9262-${String(index).padStart(12, "0")}`,
      };
      await createOrder({} as never);
    }
    await expect(createOrder({} as never)).resolves.toHaveProperty("id");
    body = input;
    await expect(createOrder({} as never)).rejects.toMatchObject({
      statusCode: 429,
    });
  });
  it("protege lectura y cambios con permisos de administrador", async () => {
    admin.mockRejectedValue(
      Object.assign(new Error("denied"), { statusCode: 403 }),
    );
    await expect(updateOrder({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(listOrders({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
  it("guarda cambios e historial, rechaza cambios concurrentes y mantiene la referencia de reintentos", async () => {
    await createOrder({} as never);
    body = {
      expectedStatus: "pending",
      status: "awaiting_payment",
      shipping: 10000,
      tracking: "",
      note: "Cliente confirmó envío",
    };
    await updateOrder({} as never);
    const saved = records.get(`orders/${input.requestId}`);
    expect(saved.history).toHaveLength(2);
    expect(saved.history[1]).toMatchObject({
      actor: "admin",
      status: "awaiting_payment",
    });
    expect(saved).toHaveProperty("fingerprint");
    await expect(updateOrder({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    body = input;
    await expect(createOrder({} as never)).resolves.toHaveProperty(
      "id",
      input.requestId,
    );
  });
});
