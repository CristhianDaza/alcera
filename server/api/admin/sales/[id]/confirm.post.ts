import type { InventoryMovement, Sale } from "../../../../../shared/business";
import type { Product } from "../../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const saleId = getRouterParam(event, "id")!;
  const db = database();
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(saleId);
    const saleSnapshot = await tx.get(saleRef);
    if (!saleSnapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(saleSnapshot);
    if (sale.inventoryAppliedAt) return sale;
    if (sale.status === "cancelled")
      throw createError({
        statusCode: 409,
        statusMessage: "La venta está anulada",
      });
    if (sale.paidTotal < sale.total)
      throw createError({
        statusCode: 409,
        statusMessage: "Registra el pago total antes de confirmar",
      });
    const refs = [...new Set(sale.items.map((item) => item.productId))].map(
      (id) => db.collection("products").doc(id),
    );
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const at = nowIso();
    const updatedProducts = new Map<string, Product>();
    const items = sale.items.map((item) => {
      const product =
        updatedProducts.get(item.productId) ?? products.get(item.productId);
      const variant = findVariant(product, item.variantId);
      const current = inventoryOf(variant);
      if (current.stock < item.quantity)
        throw createError({
          statusCode: 409,
          statusMessage: `No hay existencias suficientes de ${product!.name} · ${variant.size}`,
        });
      const next = {
        ...variant,
        inventory: {
          ...current,
          stock: current.stock - item.quantity,
          updatedAt: at,
        },
      };
      updatedProducts.set(
        item.productId,
        replaceVariant(product!, item.variantId, next),
      );
      const movementId = newId();
      const movement: InventoryMovement = {
        id: movementId,
        productId: item.productId,
        variantId: item.variantId,
        type: "sale",
        quantityChange: -item.quantity,
        unitCost: current.averageCost,
        stockBefore: current.stock,
        stockAfter: current.stock - item.quantity,
        referenceType: "sale",
        referenceId: saleId,
        reason: `Venta ${sale.number}`,
        occurredAt: at,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("inventoryMovements").doc(movementId), movement);
      return { ...item, unitCost: current.averageCost };
    });
    for (const [productId, product] of updatedProducts)
      tx.update(db.collection("products").doc(productId), {
        variants: product.variants,
      });
    const updated = {
      ...sale,
      items,
      status: "paid" as const,
      inventoryAppliedAt: at,
      updatedAt: at,
    };
    tx.update(saleRef, {
      items,
      status: "paid",
      inventoryAppliedAt: at,
      updatedAt: at,
    });
    return updated;
  });
});
