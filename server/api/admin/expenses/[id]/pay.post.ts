import { z } from "zod";
import {
  cashAccounts,
  paymentMethods,
  type CashMovement,
  type Expense,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      date: z.iso.datetime(),
      paymentMethod: z.enum(paymentMethods),
      cashAccount: z.string().trim().min(1).max(120),
    }),
  );
  const id = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("expenses").doc(id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Gasto no encontrado",
      });
    const expense = docData<Expense>(snapshot);
    if (expense.status === "paid") return expense;
    if (expense.status === "reversed")
      throw createError({
        statusCode: 409,
        statusMessage: "Un gasto reversado no admite pagos",
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
      type: "expense",
      account: body.cashAccount,
      amount: expense.amount,
      description: expense.description,
      referenceType: "expense",
      referenceId: id,
      createdAt: at,
      createdBy: admin.uid,
    };
    tx.set(db.collection("cashMovements").doc(cash.id), cash);
    tx.update(ref, {
      status: "paid",
      paymentMethod: body.paymentMethod,
      cashAccount: body.cashAccount,
      cashMovementId: cash.id,
      paidAt: at,
      updatedAt: at,
    });
    return {
      ...expense,
      status: "paid" as const,
      paymentMethod: body.paymentMethod,
      cashAccount: body.cashAccount,
      cashMovementId: cash.id,
      paidAt: at,
      updatedAt: at,
    };
  });
});
