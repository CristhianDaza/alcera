import { z } from "zod";
import { cashAccounts, type CashMovement } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z
      .object({
        date: z.iso.datetime(),
        from: z.enum(cashAccounts),
        to: z.enum(cashAccounts),
        amount: z.number().int().positive().max(1_000_000_000),
        description: z.string().trim().min(1).max(500),
      })
      .refine((value) => value.from !== value.to, {
        message: "Las cuentas deben ser distintas",
        path: ["to"],
      }),
  );
  const db = database();
  return db.runTransaction(async (tx) => {
    const [numberOut, numberIn] = await nextNumbers(tx, [
      { prefix: "M", date: new Date(body.date) },
      { prefix: "M", date: new Date(body.date) },
    ]);
    const at = nowIso();
    const transferId = newId();
    const movements: CashMovement[] = [
      {
        id: newId(),
        number: numberOut!,
        date: body.date,
        direction: "out",
        type: "other",
        account: body.from,
        amount: body.amount,
        description: `Transferencia a ${body.to}: ${body.description}`,
        createdAt: at,
        createdBy: admin.uid,
      },
      {
        id: newId(),
        number: numberIn!,
        date: body.date,
        direction: "in",
        type: "other",
        account: body.to,
        amount: body.amount,
        description: `Transferencia desde ${body.from}: ${body.description}`,
        createdAt: at,
        createdBy: admin.uid,
      },
    ];
    for (const movement of movements)
      tx.set(db.collection("cashMovements").doc(movement.id), {
        ...movement,
        transferId,
      });
    return { transferId, movements };
  });
});
