import type { Sale, SalePayment } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id")!;
  const db = database();
  const [sale, payments] = await Promise.all([
    db.collection("sales").doc(id).get(),
    db.collection("salePayments").where("saleId", "==", id).get(),
  ]);
  if (!sale.exists)
    throw createError({
      statusCode: 404,
      statusMessage: "Venta no encontrada",
    });
  return {
    sale: docData<Sale>(sale),
    payments: payments.docs
      .map((doc) => docData<SalePayment>(doc))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
});
