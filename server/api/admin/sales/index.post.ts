import {
  saleCreateSchema,
  saleTotals,
  inventoryItemOf,
  type Sale,
} from "../../../../shared/business";
import { millilitersFromSize, type Supply } from "../../../../shared/business";
import type { Product } from "../../../../shared/types";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, saleCreateSchema);
  const db = database();
  const id = body.requestId;
  const fingerprint = requestFingerprint(body);
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(id);
    const existing = await tx.get(saleRef);
    if (existing.exists) {
      const sale = docData<Sale>(existing);
      if (sale.requestFingerprint !== fingerprint)
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya fue utilizada",
        });
      return sale;
    }
    const refs = [...new Set(body.items.map((item) => item.productId))].map(
      (productId) => db.collection("products").doc(productId),
    );
    const supplyIds = [
      ...new Set(
        [
          ...body.items.map((item) => item.inventoryItemId),
          ...(body.supplyUses ?? []).map((use) => use.supplyId),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const [snapshots, containerSnapshots] = await Promise.all([
      Promise.all(refs.map((ref) => tx.get(ref))),
      Promise.all(
        supplyIds.map((id) => tx.get(db.collection("supplies").doc(id))),
      ),
    ]);
    const products = snapshots.map(
      (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Product,
    );
    const containers = new Map(
      containerSnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [
          snapshot.id,
          inventoryItemOf(docData<Supply>(snapshot)),
        ]),
    );
    const number = await nextNumber(tx, "V", new Date(body.occurredAt));
    const items = body.items.map((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      const variant = findVariant(product, item.variantId);
      const inventory = inventoryOf(variant);
      const isDecant = variant.type === "decant" || inventory.mode === "decant";
      if (isDecant) {
        const capacityMl = millilitersFromSize(variant.size);
        const container = item.inventoryItemId
          ? containers.get(item.inventoryItemId)
          : undefined;
        if (
          !container ||
          !container.active ||
          container.category !== "DECANT_CONTAINER" ||
          container.capacityMl !== capacityMl
        )
          throw createError({
            statusCode: 409,
            statusMessage: `Selecciona un envase activo de ${capacityMl} ml para este decant`,
          });
      } else if (item.inventoryItemId)
        throw createError({
          statusCode: 400,
          statusMessage: "Solo los decants pueden incluir un envase",
        });
      return {
        ...item,
        sku: product?.sku,
        brand: product?.brand,
        name: product!.name,
        size: variant.size,
        unitCost: inventory.averageCost,
        lineTotal: item.quantity * item.unitPrice - item.discount,
      };
    });
    for (const use of body.supplyUses ?? []) {
      const supply = containers.get(use.supplyId);
      if (!supply || !supply.active || supply.category === "DECANT_CONTAINER")
        throw createError({
          statusCode: 409,
          statusMessage:
            "El insumo seleccionado no está disponible para esta venta",
        });
    }
    const totals = saleTotals(items, body.shippingCharged);
    if (totals.total < 0)
      throw createError({
        statusCode: 400,
        statusMessage: "Los descuentos superan el valor de la venta",
      });
    const at = nowIso();
    const requiresPurchase = body.items.some((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.productId,
      );
      return (
        inventoryOf(findVariant(product, item.variantId)).mode === "on_demand"
      );
    });
    const { requestId: _requestId, ...input } = body;
    const sale: Sale = {
      id,
      number,
      customer: input.customer,
      channel: input.channel,
      status:
        input.status === "draft"
          ? "draft"
          : requiresPurchase
            ? "pending_purchase"
            : input.status,
      items,
      supplyUses: input.supplyUses,
      ...totals,
      shippingCharged: input.shippingCharged,
      paidTotal: 0,
      balanceDue: totals.total,
      createdAt: input.occurredAt,
      updatedAt: at,
      createdBy: admin.uid,
      notes: input.notes,
      requestFingerprint: fingerprint,
    };
    tx.set(saleRef, firestoreData(sale));
    return sale;
  });
});
