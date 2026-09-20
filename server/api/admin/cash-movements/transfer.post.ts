import { z } from "zod";
import { cashAccounts, type CashMovement } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z
      .object({
        requestId: z.uuid(),
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
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const transferId = body.requestId;
    const outRef = db.collection("cashMovements").doc(`${transferId}-out`);
    const inRef = db.collection("cashMovements").doc(`${transferId}-in`);
    const [existingOut, existingIn] = await Promise.all([
      tx.get(outRef),
      tx.get(inRef),
    ]);
    if (existingOut.exists && existingIn.exists) {
      const movements = [
        docData<CashMovement>(existingOut),
        docData<CashMovement>(existingIn),
      ];
      if (
        movements.some(
          (movement) => movement.requestFingerprint !== fingerprint,
        )
      )
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return {
        transferId,
        movements,
      };
    }
    if (existingOut.exists || existingIn.exists)
      throw createError({
        statusCode: 409,
        statusMessage: "La transferencia está incompleta y requiere revisión",
      });
    const [numberOut, numberIn] = await nextNumbers(tx, [
      { prefix: "M", date: new Date(body.date) },
      { prefix: "M", date: new Date(body.date) },
    ]);
    const at = nowIso();
    const movements: CashMovement[] = [
      {
        id: `${transferId}-out`,
        number: numberOut!,
        date: body.date,
        direction: "out",
        type: "other",
        account: body.from,
        amount: body.amount,
        description: `Transferencia a ${body.to}: ${body.description}`,
        createdAt: at,
        createdBy: admin.uid,
        requestFingerprint: fingerprint,
      },
      {
        id: `${transferId}-in`,
        number: numberIn!,
        date: body.date,
        direction: "in",
        type: "other",
        account: body.to,
        amount: body.amount,
        description: `Transferencia desde ${body.from}: ${body.description}`,
        createdAt: at,
        createdBy: admin.uid,
        requestFingerprint: fingerprint,
      },
    ];
    for (const [index, movement] of movements.entries())
      tx.set(index === 0 ? outRef : inRef, {
        ...movement,
        transferId,
      });
    return { transferId, movements };
  });
});
