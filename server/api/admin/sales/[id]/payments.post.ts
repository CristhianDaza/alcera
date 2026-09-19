import {
  paymentCreateSchema,
  type CashMovement,
  type Sale,
  type SalePayment,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, paymentCreateSchema);
  const saleId = getRouterParam(event, "id")!;
  const db = database();
  const paymentId = newId();
  const cashId = newId();
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(saleId);
    const snapshot = await tx.get(saleRef);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(snapshot);
    if (["cancelled", "draft"].includes(sale.status))
      throw createError({
        statusCode: 409,
        statusMessage: "La venta no admite pagos en su estado actual",
      });
    if (body.amount > sale.balanceDue)
      throw createError({
        statusCode: 409,
        statusMessage: "El pago supera el saldo pendiente",
      });
    const number = await nextNumber(tx, "M", new Date(body.date));
    const at = nowIso();
    const payment: SalePayment = {
      id: paymentId,
      saleId,
      ...body,
      createdAt: at,
      createdBy: admin.uid,
    };
    const cash: CashMovement = {
      id: cashId,
      number,
      date: body.date,
      direction: "in",
      type: "sale_payment",
      account: body.cashAccount,
      amount: body.amount,
      description: `Pago ${sale.number}`,
      referenceType: "sale",
      referenceId: saleId,
      createdAt: at,
      createdBy: admin.uid,
    };
    const paidTotal = sale.paidTotal + body.amount;
    tx.set(
      db.collection("salePayments").doc(paymentId),
      firestoreData(payment),
    );
    tx.set(db.collection("cashMovements").doc(cashId), cash);
    tx.update(saleRef, {
      paidTotal,
      balanceDue: sale.total - paidTotal,
      updatedAt: at,
    });
    return payment;
  });
});
