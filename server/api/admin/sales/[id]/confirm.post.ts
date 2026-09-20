import type {
  DecantSource,
  InventoryMovement,
  Sale,
  Supply,
  SupplyMovement,
} from "../../../../../shared/business";
import {
  decantConsumption,
  decantUnitCost,
  inventoryItemOf,
  millilitersFromSize,
} from "../../../../../shared/business";
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
    const productIds = [...new Set(sale.items.map((item) => item.productId))];
    const refs = productIds.map((id) => db.collection("products").doc(id));
    const supplyIds = [
      ...new Set(
        [...sale.items.map((item) => item.inventoryItemId), ...(sale.supplyUses ?? []).map((use) => use.supplyId)]
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const [snapshots, sourceSnapshots, supplySnapshots] = await Promise.all([
      Promise.all(refs.map((ref) => tx.get(ref))),
      Promise.all(
        productIds.map((productId) =>
          tx.get(
            db.collection("decantSources").where("productId", "==", productId),
          ),
        ),
      ),
      Promise.all(supplyIds.map((id) => tx.get(db.collection("supplies").doc(id)))),
    ]);
    const products = new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const at = nowIso();
    const updatedProducts = new Map<string, Product>();
    const sourcesByProduct = new Map(
      productIds.map((productId, index) => [
        productId,
        sourceSnapshots[index]!.docs.map((doc) => docData<DecantSource>(doc))
          .filter((source) => source.status === "open")
          .sort((a, b) => a.openedAt.localeCompare(b.openedAt)),
      ]),
    );
    const sourceUpdates = new Map<string, DecantSource>();
    const movements: InventoryMovement[] = [];
    const supplies = new Map(
      supplySnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [snapshot.id, inventoryItemOf(docData<Supply>(snapshot))]),
    );
    const supplyUse = new Map<string, number>();
    let additionalInventoryCost = 0;
    const items = sale.items.map((item) => {
      const product =
        updatedProducts.get(item.productId) ?? products.get(item.productId);
      const variant = findVariant(product, item.variantId);
      const current = inventoryOf(variant);
      const decant = variant.type === "decant" || current.mode === "decant";
      if (decant) {
        const ml = millilitersFromSize(variant.size);
        if (!Number.isFinite(ml) || ml <= 0)
          throw createError({
            statusCode: 400,
            statusMessage: `La presentación ${variant.size} no tiene mililitros válidos`,
          });
        const container = item.inventoryItemId
          ? supplies.get(item.inventoryItemId)
          : undefined;
        if (
          !container ||
          !container.active ||
          container.category !== "DECANT_CONTAINER" ||
          container.capacityMl !== ml
        )
          throw createError({
            statusCode: 409,
            statusMessage: `No hay envases de ${ml} ml disponibles.`,
          });
        supplyUse.set(container.id, (supplyUse.get(container.id) ?? 0) + item.quantity);
        const neededMl = Math.round(ml * item.quantity);
        const source = sourcesByProduct
          .get(item.productId)
          ?.find((candidate) => candidate.remainingMl >= neededMl);
        if (!source)
          throw createError({
            statusCode: 409,
            statusMessage: `Abre un frasco con al menos ${neededMl} ml disponibles para vender ${product!.name}`,
          });
        const sourceBefore = source.remainingMl;
        source.remainingMl = decantConsumption(
          source.remainingMl,
          ml,
          item.quantity,
        ).remainingMl;
        if (source.remainingMl === 0) source.status = "empty";
        source.updatedAt = at;
        sourceUpdates.set(source.id, source);
        const unitCost = decantUnitCost(
          ml,
          source.costPerMl,
          (current.decantPackagingCost ?? 0) + container.averageCost,
        );
        movements.push({
          id: newId(),
          productId: item.productId,
          variantId: item.variantId,
          type: "sale",
          quantityChange: -neededMl,
          quantityUnit: "ml",
          sourceId: source.id,
          unitCost,
          stockBefore: sourceBefore,
          stockAfter: source.remainingMl,
          referenceType: "sale",
          referenceId: saleId,
          reason: `Venta ${sale.number} · frasco abierto ${source.size}`,
          occurredAt: at,
          createdAt: at,
          createdBy: admin.uid,
        });
        return { ...item, unitCost };
      }
      if (current.mode === "on_demand" && current.stock < item.quantity)
        throw createError({
          statusCode: 409,
          statusMessage: `${product!.name} · ${variant.size} se vende bajo pedido. Confirma primero la compra y recepción.`,
        });
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
      movements.push({
        id: newId(),
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
      });
      return { ...item, unitCost: current.averageCost };
    });
    const supplyMovements: SupplyMovement[] = [];
    for (const use of sale.supplyUses ?? []) {
      const supply = supplies.get(use.supplyId);
      if (!supply || !supply.active || supply.category === "DECANT_CONTAINER")
        throw createError({
          statusCode: 409,
          statusMessage: "Un insumo manual seleccionado ya no está disponible",
        });
      supplyUse.set(supply.id, (supplyUse.get(supply.id) ?? 0) + use.quantity);
      additionalInventoryCost += supply.averageCost * use.quantity;
    }
    for (const [supplyId, quantity] of supplyUse) {
      const supply = supplies.get(supplyId);
      if (!supply || !supply.active)
        throw createError({
          statusCode: 409,
          statusMessage: "Un insumo configurado ya no está disponible",
        });
      if (supply.stock < quantity)
        throw createError({
          statusCode: 409,
          statusMessage: `No hay existencias suficientes de ${supply.name}`,
        });
      const after = supply.stock - quantity;
      supplyMovements.push({
        id: newId(),
        supplyId,
        type: "sale",
        quantityChange: -quantity,
        unitCost: supply.averageCost,
        stockBefore: supply.stock,
        stockAfter: after,
        referenceType: "sale",
        referenceId: saleId,
        reason: `Venta ${sale.number} · envase de decant`,
        occurredAt: at,
        createdAt: at,
        createdBy: admin.uid,
      });
      supplies.set(supplyId, { ...supply, stock: after, updatedAt: at });
    }
    for (const [productId, product] of updatedProducts)
      tx.update(db.collection("products").doc(productId), {
        variants: product.variants,
      });
    for (const source of sourceUpdates.values())
      tx.update(
        db.collection("decantSources").doc(source.id),
        firestoreData({
          remainingMl: source.remainingMl,
          status: source.status,
          updatedAt: at,
        }),
      );
    for (const movement of movements)
      tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
    for (const supply of supplies.values())
      if (supplyUse.has(supply.id))
        tx.update(db.collection("supplies").doc(supply.id), {
          stock: supply.stock,
          updatedAt: at,
        });
    for (const movement of supplyMovements)
      tx.set(db.collection("supplyMovements").doc(movement.id), movement);
    const updated = {
      ...sale,
      items,
      additionalInventoryCost,
      status: "paid" as const,
      inventoryAppliedAt: at,
      updatedAt: at,
    };
    tx.update(saleRef, {
      items,
      additionalInventoryCost,
      status: "paid",
      inventoryAppliedAt: at,
      updatedAt: at,
    });
    return updated;
  });
});
