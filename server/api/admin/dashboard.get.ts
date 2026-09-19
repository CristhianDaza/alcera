import type {
  CashMovement,
  DashboardData,
  Sale,
  SaleChannel,
  SalePayment,
} from "../../../shared/business";
import type { Product } from "../../../shared/types";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const range = dateRange(
    getQuery(event) as Record<string, string | undefined>,
  );
  const db = database();
  const [salesSnapshot, paymentSnapshot, cashSnapshot, productSnapshot] =
    await Promise.all([
      db
        .collection("sales")
        .where("createdAt", ">=", range.start)
        .where("createdAt", "<=", range.end)
        .get(),
      db
        .collection("salePayments")
        .where("date", ">=", range.start)
        .where("date", "<=", range.end)
        .get(),
      db.collection("cashMovements").where("date", "<=", range.end).get(),
      db.collection("products").get(),
    ]);
  const sales = salesSnapshot.docs
    .map((doc) => docData<Sale>(doc))
    .filter((sale) => sale.status !== "cancelled");
  const payments = paymentSnapshot.docs.map((doc) => docData<SalePayment>(doc));
  const cash = cashSnapshot.docs.map((doc) => docData<CashMovement>(doc));
  const products = productSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Product,
  );
  const productQuantities = new Map<string, number>();
  const channelTotals = new Map<SaleChannel, number>();
  for (const sale of sales) {
    channelTotals.set(
      sale.channel,
      (channelTotals.get(sale.channel) ?? 0) + sale.total,
    );
    for (const item of sale.items)
      productQuantities.set(
        item.name,
        (productQuantities.get(item.name) ?? 0) + item.quantity,
      );
  }
  const result: DashboardData = {
    from: range.from,
    to: range.to,
    paidSales: payments.reduce((sum, payment) => sum + payment.amount, 0),
    registeredSales: sales.reduce((sum, sale) => sum + sale.total, 0),
    grossProfit: sales
      .filter((sale) => !!sale.inventoryAppliedAt)
      .reduce(
        (sum, sale) =>
          sum +
          sale.total -
          sale.items.reduce(
            (cost, item) => cost + item.quantity * item.unitCost,
            0,
          ),
        0,
      ),
    cashBalance: cash.reduce(
      (sum, movement) =>
        sum +
        (movement.direction === "in" ? movement.amount : -movement.amount),
      0,
    ),
    receivable: sales.reduce((sum, sale) => sum + sale.balanceDue, 0),
    lowStock: products
      .flatMap((product) => product.variants)
      .filter((variant) => {
        const stock = inventoryOf(variant);
        return stock.stock <= stock.minimumStock;
      }).length,
    recentMovements: cash
      .filter((movement) => movement.date >= range.start)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8),
    topProducts: [...productQuantities]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    salesByChannel: [...channelTotals]
      .map(([channel, total]) => ({ channel, total }))
      .sort((a, b) => b.total - a.total),
  };
  return result;
});
