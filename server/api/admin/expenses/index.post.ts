import {
  expenseCreateSchema,
  type CashMovement,
  type Expense,
} from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, expenseCreateSchema);
  const db = database();
  const id = newId();
  const cashId = body.status === "paid" ? newId() : undefined;
  return db.runTransaction(async (tx) => {
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
    const expense: Expense = {
      id,
      number: number!,
      ...body,
      cashMovementId: cashId,
      createdAt: at,
      createdBy: admin.uid,
    };
    tx.set(db.collection("expenses").doc(id), firestoreData(expense));
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
