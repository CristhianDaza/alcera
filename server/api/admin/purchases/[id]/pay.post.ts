import { z } from "zod";
import {
  cashAccounts,
  type CashMovement,
  type Purchase,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      date: z.iso.datetime(),
      cashAccount: z.enum(cashAccounts),
    }),
  );
  const id = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("purchases").doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Compra no encontrada",
      });
    const purchase = docData<Purchase>(snapshot);
    if (purchase.paymentStatus === "paid") return purchase;
    if (purchase.status === "cancelled")
      throw createError({
        statusCode: 409,
        statusMessage: "Una compra cancelada no admite pagos",
      });
    const [number] = await nextNumbers(tx, [
      { prefix: "M", date: new Date(body.date) },
    ]);
    const at = nowIso();
    const cash: CashMovement = {
      id: newId(),
      number: number!,
      date: body.date,
      direction: "out",
      type: "purchase",
      account: body.cashAccount,
      amount: purchase.total,
      description: `Pago de compra ${purchase.number}`,
      referenceType: "purchase",
      referenceId: id,
      createdAt: at,
      createdBy: admin.uid,
    };
    tx.set(db.collection("cashMovements").doc(cash.id), cash);
    tx.update(ref, {
      paymentStatus: "paid",
      cashAccount: body.cashAccount,
      cashMovementId: cash.id,
      paidAt: at,
      updatedAt: at,
    });
    return {
      ...purchase,
      paymentStatus: "paid" as const,
      cashAccount: body.cashAccount,
      cashMovementId: cash.id,
      paidAt: at,
      updatedAt: at,
    };
  });
});
