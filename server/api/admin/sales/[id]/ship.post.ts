import type { Sale } from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id")!;
  const ref = database().collection("sales").doc(id);
  return database().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(snapshot);
    if (sale.status === "shipped") return sale;
    if (sale.status !== "paid" || !sale.inventoryAppliedAt)
      throw createError({
        statusCode: 409,
        statusMessage: "Solo una venta pagada y confirmada puede enviarse",
      });
    const at = nowIso();
    tx.update(ref, { status: "shipped", updatedAt: at });
    return { ...sale, status: "shipped" as const, updatedAt: at };
  });
});
