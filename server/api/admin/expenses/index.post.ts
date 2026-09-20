import {
  expenseCreateSchema,
  type CashMovement,
  type Expense,
} from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, expenseCreateSchema);
  const db = database();
  const id = body.requestId;
  const cashId = body.status === "paid" ? `${id}-cash` : undefined;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const expenseRef = db.collection("expenses").doc(id);
    const existing = await tx.get(expenseRef);
    if (existing.exists) {
      const expense = docData<Expense>(existing);
      if (expense.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return expense;
    }
    const [number, cashNumber] = await nextNumbers(
      tx,
      body.status === "paid"
        ? [
            { prefix: "G", date: new Date(body.date) },
            { prefix: "M", date: new Date(body.date) },
          ]
        : [{ prefix: "G", date: new Date(body.date) }],
    );
    const at = nowIso();
    const { requestId: _requestId, ...input } = body;
    const expense: Expense = {
      id,
      number: number!,
      ...input,
      cashMovementId: cashId,
      createdAt: at,
      updatedAt: at,
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.set(expenseRef, firestoreData(expense));
    if (body.status === "paid") {
      const cash: CashMovement = {
        id: cashId!,
        number: cashNumber!,
        date: body.date,
        direction: "out",
        type: "expense",
        account: body.cashAccount!,
        amount: body.amount,
        description: body.description,
        referenceType: "expense",
        referenceId: id,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cashId!), cash);
    }
    return expense;
  });
});
