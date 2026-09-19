import type {
  ReportData,
  Sale,
  SaleChannel,
  SalePayment,
  SaleReturn,
} from "../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const range = dateRange(
    getQuery(event) as Record<string, string | undefined>,
  );
  const db = database();
  const [salesSnapshot, paymentsSnapshot, returnsSnapshot] = await Promise.all([
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
    db.collection("saleReturns").where("date", "<=", range.end).get(),
  ]);
  const sales = salesSnapshot.docs
    .map((doc) => docData<Sale>(doc))
    .filter((sale) => sale.status !== "cancelled");
  const payments = paymentsSnapshot.docs.map((doc) =>
    docData<SalePayment>(doc),
  );
  const saleIds = new Set(sales.map((sale) => sale.id));
  const returnedQuantities = new Map<string, number>();
  for (const entry of returnsSnapshot.docs
    .map((doc) => docData<SaleReturn>(doc))
    .filter((item) => saleIds.has(item.saleId)))
    for (const item of entry.items) {
      const key = `${entry.saleId}/${item.productId}/${item.variantId}`;
      returnedQuantities.set(
        key,
        (returnedQuantities.get(key) ?? 0) + item.quantity,
      );
    }
  const products = new Map<
    string,
    {
      name: string;
      brand: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }
  >();
  const brands = new Map<
    string,
    { brand: string; revenue: number; profit: number }
  >();
  const channels = new Map<SaleChannel, number>();
  for (const sale of sales) {
    channels.set(
      sale.channel,
      (channels.get(sale.channel) ?? 0) + sale.total - (sale.refundTotal ?? 0),
    );
    for (const item of sale.items) {
      const key = `${item.productId}/${item.variantId}`;
      const brand = item.brand ?? "Sin marca";
      const returned =
        returnedQuantities.get(
          `${sale.id}/${item.productId}/${item.variantId}`,
        ) ?? 0;
      const quantity = Math.max(0, item.quantity - returned);
      const revenue = Math.round(item.lineTotal * (quantity / item.quantity));
      const cost = quantity * item.unitCost;
      const current = products.get(key) ?? {
        name: `${item.name} · ${item.size}`,
        brand,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      current.quantity += quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.profit += revenue - cost;
      products.set(key, current);
      const currentBrand = brands.get(brand) ?? {
        brand,
        revenue: 0,
        profit: 0,
      };
      currentBrand.revenue += revenue;
      currentBrand.profit += revenue - cost;
      brands.set(brand, currentBrand);
    }
  }
  const paymentMethods = new Map<string, number>();
  for (const payment of payments)
    paymentMethods.set(
      payment.method,
      (paymentMethods.get(payment.method) ?? 0) + payment.amount,
    );
  const result: ReportData = {
    from: range.from,
    to: range.to,
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue),
    brands: [...brands.values()].sort((a, b) => b.revenue - a.revenue),
    channels: [...channels]
      .map(([channel, revenue]) => ({ channel, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    paymentMethods: [...paymentMethods]
      .map(([method, amount]) => ({
        method: method as SalePayment["method"],
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
  return result;
});
