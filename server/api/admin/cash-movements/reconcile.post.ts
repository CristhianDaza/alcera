import { z } from "zod";
import { cashAccounts, type CashMovement } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z.object({
      date: z.iso.datetime(),
      account: z.enum(cashAccounts),
      actualBalance: z.number().int().min(0).max(1_000_000_000),
      reason: z.string().trim().min(3).max(500),
    }),
  );
  const db = database();
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(
      db.collection("cashMovements").where("account", "==", body.account),
    );
    const currentBalance = snapshot.docs
      .map((doc) => docData<CashMovement>(doc))
      .reduce(
        (sum, movement) =>
          sum +
          (movement.direction === "in" ? movement.amount : -movement.amount),
        0,
      );
    const difference = body.actualBalance - currentBalance;
    if (difference === 0) return { adjusted: false, currentBalance };
    const number = await nextNumber(tx, "M", new Date(body.date));
    const movement: CashMovement = {
      id: newId(),
      number,
      date: body.date,
      direction: difference > 0 ? "in" : "out",
      type: "adjustment",
      account: body.account,
      amount: Math.abs(difference),
      description: `Conciliación: ${body.reason}`,
      createdAt: nowIso(),
      createdBy: admin.uid,
    };
    tx.set(db.collection("cashMovements").doc(movement.id), movement);
    return {
      adjusted: true,
      previousBalance: currentBalance,
      actualBalance: body.actualBalance,
      movement,
    };
  });
});
