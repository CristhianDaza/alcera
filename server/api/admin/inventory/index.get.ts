import type { InventoryRow } from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const search = String(query.query ?? "").toLocaleLowerCase("es");
  const brand = String(query.brand ?? "");
  const state = String(query.state ?? "");
  const snapshot = await database().collection("products").get();
  const rows = snapshot.docs.flatMap((doc) => {
    const product = { id: doc.id, ...doc.data() } as Product;
    return product.variants.map((variant): InventoryRow => {
      const inventory = inventoryOf(variant);
      return {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        brand: product.brand,
        size: variant.size,
        type: variant.type === "decant" ? "decant" : "bottle",
        sku: product.sku,
        stock: inventory.stock,
        minimumStock: inventory.minimumStock,
        averageCost: inventory.averageCost,
        value: inventory.stock * inventory.averageCost,
        state:
          inventory.stock === 0
            ? "out"
            : inventory.stock <= inventory.minimumStock
              ? "low"
              : "available",
        mode:
          inventory.mode ??
          (variant.type === "decant" ? "decant" : "on_demand"),
        decantPackagingCost: inventory.decantPackagingCost ?? 0,
      };
    });
  });
  return rows
    .filter(
      (row) =>
        !search ||
        `${row.name} ${row.brand} ${row.size} ${row.sku ?? ""}`
          .toLocaleLowerCase("es")
          .includes(search),
    )
    .filter((row) => !brand || row.brand === brand)
    .filter((row) => !state || row.state === state)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "es") ||
        a.size.localeCompare(b.size, "es"),
    );
});
