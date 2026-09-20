import type { Sale } from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const saleId = getRouterParam(event, "id")!;
  const ref = database().collection("sales").doc(saleId);
  return database().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(snapshot);
    if (sale.status === "delivered") return sale;
    if (!["paid", "shipped"].includes(sale.status) || !sale.inventoryAppliedAt)
      throw createError({
        statusCode: 409,
        statusMessage: "Solo una venta pagada y confirmada puede entregarse",
      });
    const at = nowIso();
    tx.update(ref, { status: "delivered", updatedAt: at });
    return { ...sale, status: "delivered", updatedAt: at };
  });
});
