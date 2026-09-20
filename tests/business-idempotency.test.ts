import { beforeEach, describe, expect, it, vi } from "vitest";

type RecordValue = Record<string, unknown>;

const saleId = "sale-1";
const firstRequestId = "11111111-1111-4111-8111-111111111111";
let body: RecordValue;
let records: Map<string, RecordValue>;
let addPayment: (event: never) => Promise<RecordValue>;

beforeEach(async () => {
  vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  vi.stubGlobal("createError", (data: RecordValue) =>
    Object.assign(new Error(String(data.statusMessage)), data),
  );
  vi.stubGlobal("readBody", async () => body);
  vi.stubGlobal(
    "readValidated",
    async (
      _event: unknown,
      schema: {
        safeParse(
          value: unknown,
        ): { success: true; data: RecordValue } | { success: false };
      },
    ) => {
      const result = schema.safeParse(body);
      if (!result.success)
        throw Object.assign(new Error("invalid"), { statusCode: 400 });
      return result.data;
    },
  );
  vi.stubGlobal("getRouterParam", () => saleId);
  vi.stubGlobal("requireAdmin", async () => ({ uid: "admin" }));
  vi.stubGlobal("docData", (document: { id: string; data(): unknown }) => ({
    id: document.id,
    ...(document.data() as object),
  }));
  vi.stubGlobal("nowIso", () => "2026-09-19T15:00:00.000Z");
  vi.stubGlobal("requestFingerprint", (value: unknown) =>
    JSON.stringify(value),
  );
  vi.stubGlobal("firestoreData", (value: unknown) => value);
  vi.stubGlobal("nextNumber", async () => "M-202609-0001");

  records = new Map([
    [
      `sales/${saleId}`,
      {
        number: "V-202609-0001",
        status: "pending_payment",
        total: 100_000,
        paidTotal: 0,
        balanceDue: 100_000,
      },
    ],
  ]);
  body = {
    requestId: firstRequestId,
    date: "2026-09-19T15:00:00.000Z",
    amount: 20_000,
    method: "cash",
    cashAccount: "cash",
  };

  const snapshot = (ref: { path: string; id: string }) => ({
    exists: records.has(ref.path),
    data: () => records.get(ref.path),
    id: ref.id,
  });
  const db = {
    collection: (collection: string) => ({
      doc: (id: string) => ({ path: `${collection}/${id}`, id }),
    }),
    runTransaction: async (
      callback: (transaction: RecordValue) => Promise<RecordValue>,
    ) => {
      const writes: Array<() => void> = [];
      const result = await callback({
        get: async (ref: { path: string; id: string }) => snapshot(ref),
        set: (ref: { path: string }, data: RecordValue) =>
          writes.push(() => records.set(ref.path, structuredClone(data))),
        update: (ref: { path: string }, data: RecordValue) =>
          writes.push(() =>
            records.set(ref.path, {
              ...records.get(ref.path),
              ...structuredClone(data),
            }),
          ),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  vi.stubGlobal("database", () => db);
  addPayment = (await import("../server/api/admin/sales/[id]/payments.post"))
    .default as never;
});

describe("idempotencia de operaciones de gestión", () => {
  it("no duplica un pago ni su movimiento de caja al repetir requestId", async () => {
    const first = await addPayment({} as never);
    const repeated = await addPayment({} as never);

    expect(repeated).toEqual(first);
    expect(records.get(`sales/${saleId}`)).toMatchObject({
      paidTotal: 20_000,
      balanceDue: 80_000,
    });
    expect(
      [...records.keys()].filter((key) => key.startsWith("salePayments/")),
    ).toEqual([`salePayments/${firstRequestId}`]);
    expect(
      [...records.keys()].filter((key) => key.startsWith("cashMovements/")),
    ).toEqual([`cashMovements/${firstRequestId}-cash`]);

    body = { ...body, amount: 20_001 };
    await expect(addPayment({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(records.get(`sales/${saleId}`)).toMatchObject({ paidTotal: 20_000 });
  });

  it("acepta pagos parciales distintos y rechaza el que supera el saldo", async () => {
    await addPayment({} as never);
    body = {
      ...body,
      requestId: "22222222-2222-4222-8222-222222222222",
      amount: 30_000,
    };
    await addPayment({} as never);
    expect(records.get(`sales/${saleId}`)).toMatchObject({
      paidTotal: 50_000,
      balanceDue: 50_000,
    });

    body = {
      ...body,
      requestId: "33333333-3333-4333-8333-333333333333",
      amount: 50_001,
    };
    await expect(addPayment({} as never)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(records.has(`salePayments/${body.requestId}`)).toBe(false);
  });
});
