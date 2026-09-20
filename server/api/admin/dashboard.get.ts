import type {
  CashMovement,
  DashboardData,
  Expense,
  Sale,
  SaleChannel,
} from "../../../shared/business";
import type { Product } from "../../../shared/types";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const range = dateRange(
    getQuery(event) as Record<string, string | undefined>,
  );
  const db = database();
  const [salesSnapshot, expenseSnapshot, cashSnapshot, productSnapshot] =
    await Promise.all([
      db
        .collection("sales")
        .where("createdAt", ">=", range.start)
        .where("createdAt", "<=", range.end)
        .get(),
      db
        .collection("expenses")
        .where("date", ">=", range.start)
        .where("date", "<=", range.end)
        .get(),
      db.collection("cashMovements").where("date", "<=", range.end).get(),
      db.collection("products").get(),
    ]);
  const sales = salesSnapshot.docs
    .map((doc) => docData<Sale>(doc))
    .filter((sale) => sale.status !== "cancelled");
  const expenses = expenseSnapshot.docs.map((doc) => docData<Expense>(doc));
  const cash = cashSnapshot.docs.map((doc) => docData<CashMovement>(doc));
  const products = productSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Product,
  );
  const periodCash = cash.filter(
    (movement) => movement.date >= range.start && movement.date <= range.end,
  );
  const grossProfit = sales
    .filter((sale) => !!sale.inventoryAppliedAt)
    .reduce(
      (sum, sale) =>
        sum +
        (sale.total - (sale.refundTotal ?? 0)) -
        (sale.items.reduce(
          (cost, item) => cost + item.quantity * item.unitCost,
          0,
        ) -
          (sale.returnedCost ?? 0)),
      0,
    );
  const expenseTotal = expenses
    .filter((expense) => expense.status === "paid")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const accountBalances = new Map<string, number>();
  for (const movement of cash)
    accountBalances.set(
      movement.account,
      (accountBalances.get(movement.account) ?? 0) +
        (movement.direction === "in" ? movement.amount : -movement.amount),
    );
  const lowStockItems = products.flatMap((product) =>
    product.variants.flatMap((variant) => {
      const inventory = inventoryOf(variant);
      const mode =
        inventory.mode ?? (variant.type === "decant" ? "decant" : "on_demand");
      return mode === "on_demand" ||
        mode === "decant" ||
        inventory.stock > inventory.minimumStock
        ? []
        : [
            {
              name: product.name,
              size: variant.size,
              stock: inventory.stock,
              minimumStock: inventory.minimumStock,
            },
          ];
    }),
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
    paidSales: periodCash
      .filter((movement) =>
        ["sale_payment", "sale_refund"].includes(movement.type),
      )
      .reduce(
        (sum, movement) =>
          sum +
          (movement.type === "sale_refund"
            ? -movement.amount
            : movement.amount),
        0,
      ),
    registeredSales: sales.reduce(
      (sum, sale) => sum + sale.total - (sale.refundTotal ?? 0),
      0,
    ),
    grossProfit,
    expenseTotal,
    netProfit: grossProfit - expenseTotal,
    cashBalance: cash.reduce(
      (sum, movement) =>
        sum +
        (movement.direction === "in" ? movement.amount : -movement.amount),
      0,
    ),
    receivable: sales.reduce((sum, sale) => sum + sale.balanceDue, 0),
    lowStock: lowStockItems.length,
    recentMovements: periodCash
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8),
    topProducts: [...productQuantities]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    salesByChannel: [...channelTotals]
      .map(([channel, total]) => ({ channel, total }))
      .sort((a, b) => b.total - a.total),
    accountBalances: [...accountBalances]
      .map(([account, balance]) => ({
        account: account as CashMovement["account"],
        balance,
      }))
      .sort((a, b) => a.account.localeCompare(b.account)),
    lowStockItems,
  };
  return result;
});
