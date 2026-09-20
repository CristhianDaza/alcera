import { z } from "zod";
import {
  cashAccounts,
  type CashMovement,
  type Expense,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      reason: z.string().trim().min(3).max(1000),
      cashAccount: z.string().trim().min(1).max(120).optional(),
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
    if (expense.status === "reversed") return expense;
    if (expense.status === "paid" && !body.cashAccount)
      throw createError({
        statusCode: 409,
        statusMessage: "Selecciona la cuenta que recibe el reverso",
      });
    const number =
      expense.status === "paid"
        ? await nextNumber(tx, "M", new Date())
        : undefined;
    const at = nowIso();
    if (expense.status === "paid") {
      const cash: CashMovement = {
        id: newId(),
        number: number!,
        date: at,
        direction: "in",
        type: "adjustment",
        account: body.cashAccount!,
        amount: expense.amount,
        description: `Reverso de gasto ${expense.number}: ${body.reason}`,
        referenceType: "expense",
        referenceId: id,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cash.id), cash);
    }
    tx.update(ref, {
      status: "reversed",
      reversedAt: at,
      reversalReason: body.reason,
      updatedAt: at,
    });
    return { ...expense, status: "reversed" as const, updatedAt: at };
  });
});
