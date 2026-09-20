import { z } from "zod";
import {
  cashAccounts,
  type CashMovement,
  type InventoryMovement,
  type Sale,
  type SaleReturn,
} from "../../../../../shared/business";
import type { Product } from "../../../../../shared/types";

const identifier = z.string().regex(/^[a-zA-Z0-9-]{1,120}$/);

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(
    event,
    z
      .object({
        requestId: z.uuid(),
        date: z.iso.datetime(),
        items: z
          .array(
            z.object({
              productId: identifier,
              variantId: identifier,
              quantity: z.number().int().positive().max(999),
            }),
          )
          .min(1)
          .max(100),
        refundAmount: z.number().int().min(0).max(1_000_000_000),
        refundAccount: z.string().trim().min(1).max(120).optional(),
        reason: z.string().trim().min(3).max(1000),
      })
      .refine((value) => value.refundAmount === 0 || !!value.refundAccount, {
        message: "Selecciona la cuenta del reembolso",
        path: ["refundAccount"],
      }),
  );
  const saleId = getRouterParam(event, "id")!;
  const requestedVariants = new Set(
    body.items.map((item) => `${item.productId}/${item.variantId}`),
  );
  if (requestedVariants.size !== body.items.length)
    throw createError({
      statusCode: 400,
      statusMessage:
        "Cada presentación debe aparecer una sola vez en la devolución",
    });
  const db = database();
  const fingerprint = requestFingerprint({ saleId, ...body });
  return db.runTransaction(async (tx) => {
    const saleRef = db.collection("sales").doc(saleId);
    const returnRef = db.collection("saleReturns").doc(body.requestId);
    const [saleSnapshot, existingReturn] = await Promise.all([
      tx.get(saleRef),
      tx.get(returnRef),
    ]);
    if (existingReturn.exists) {
      const saleReturn = docData<SaleReturn>(existingReturn);
      if (
        saleReturn.saleId !== saleId ||
        saleReturn.requestFingerprint !== fingerprint
      )
        throw createError({
          statusCode: 409,
          statusMessage: "La clave de operación ya pertenece a otra venta",
        });
      return saleReturn;
    }
    if (!saleSnapshot.exists)
      throw createError({
        statusCode: 404,
        statusMessage: "Venta no encontrada",
      });
    const sale = docData<Sale>(saleSnapshot);
    if (
      !sale.inventoryAppliedAt ||
      !["paid", "shipped", "delivered"].includes(sale.status)
    )
      throw createError({
        statusCode: 409,
        statusMessage: "Solo una venta confirmada admite devoluciones",
      });
    if (body.refundAmount > sale.paidTotal)
      throw createError({
        statusCode: 409,
        statusMessage: "El reembolso supera el dinero recibido",
      });
    // Las ventas anteriores a este campo se migran de forma perezosa al registrar
    // su siguiente devolución. Las nuevas no vuelven a leer todo el historial.
    const previousReturnedItems =
      sale.returnedItems ??
      (
        await tx.get(db.collection("saleReturns").where("saleId", "==", saleId))
      ).docs.flatMap((doc) => docData<SaleReturn>(doc).items);
    const productIds = [...new Set(body.items.map((item) => item.productId))];
    const productSnapshots = await Promise.all(
      productIds.map((id) => tx.get(db.collection("products").doc(id))),
    );
    const products = new Map(
      productSnapshots.map((snapshot) => [
        snapshot.id,
        { id: snapshot.id, ...snapshot.data() } as Product,
      ]),
    );
    const refundNumber = body.refundAmount
      ? await nextNumber(tx, "M", new Date(body.date))
      : undefined;
    const at = nowIso();
    const updatedProducts = new Map<string, Product>();
    let costTotal = 0;
    const returnedItems = body.items.map((requested) => {
      const soldLines = sale.items.filter(
        (item) =>
          item.productId === requested.productId &&
          item.variantId === requested.variantId,
      );
      const sold = soldLines[0];
      if (!sold)
        throw createError({
          statusCode: 400,
          statusMessage: "La presentación no pertenece a la venta",
        });
      const alreadyReturned = previousReturnedItems
        .filter(
          (item) =>
            item.productId === requested.productId &&
            item.variantId === requested.variantId,
        )
        .reduce((sum, item) => sum + item.quantity, 0);
      const soldQuantity = soldLines.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      if (requested.quantity + alreadyReturned > soldQuantity)
        throw createError({
          statusCode: 409,
          statusMessage: `La devolución supera lo vendido de ${sold.name}`,
        });
      const product =
        updatedProducts.get(requested.productId) ??
        products.get(requested.productId);
      const variant = findVariant(product, requested.variantId);
      const inventory = inventoryOf(variant);
      if (variant.type === "decant" || inventory.mode === "decant")
        throw createError({
          statusCode: 409,
          statusMessage:
            "Los decants abiertos no vuelven al inventario; registra el reembolso como ajuste de caja si aplica",
        });
      const nextStock = safeInteger(
        inventory.stock + requested.quantity,
        "El saldo de inventario supera el límite numérico seguro",
      );
      updatedProducts.set(
        requested.productId,
        replaceVariant(product!, variant.id, {
          ...variant,
          inventory: { ...inventory, stock: nextStock, updatedAt: at },
        }),
      );
      const movement: InventoryMovement = {
        id: newId(),
        productId: requested.productId,
        variantId: requested.variantId,
        type: "customer_return",
        quantityChange: requested.quantity,
        unitCost: sold.unitCost,
        stockBefore: inventory.stock,
        stockAfter: nextStock,
        referenceType: "return",
        referenceId: saleId,
        reason: body.reason,
        occurredAt: body.date,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("inventoryMovements").doc(movement.id), movement);
      costTotal += requested.quantity * sold.unitCost;
      return { ...requested, unitCost: sold.unitCost };
    });
    for (const [productId, product] of updatedProducts)
      tx.update(db.collection("products").doc(productId), {
        variants: product.variants,
      });
    const saleReturn: SaleReturn = {
      id: body.requestId,
      saleId,
      date: body.date,
      items: returnedItems,
      refundAmount: body.refundAmount,
      costTotal,
      reason: body.reason,
      createdAt: at,
      createdBy: admin.uid,
      requestFingerprint: fingerprint,
    };
    tx.set(returnRef, saleReturn);
    if (body.refundAmount) {
      const cash: CashMovement = {
        id: `${body.requestId}-cash`,
        number: refundNumber!,
        date: body.date,
        direction: "out",
        type: "sale_refund",
        account: body.refundAccount!,
        amount: body.refundAmount,
        description: `Devolución ${sale.number}: ${body.reason}`,
        referenceType: "sale",
        referenceId: saleId,
        createdAt: at,
        createdBy: admin.uid,
      };
      tx.set(db.collection("cashMovements").doc(cash.id), cash);
    }
    const refundTotal = (sale.refundTotal ?? 0) + body.refundAmount;
    const returnedCost = (sale.returnedCost ?? 0) + costTotal;
    const paidTotal = sale.paidTotal - body.refundAmount;
    const returnedByVariant = new Map<string, number>();
    for (const item of [...previousReturnedItems, ...returnedItems]) {
      const key = `${item.productId}/${item.variantId}`;
      returnedByVariant.set(
        key,
        (returnedByVariant.get(key) ?? 0) + item.quantity,
      );
    }
    const cumulativeReturnedItems = [...returnedByVariant.entries()].map(
      ([key, quantity]) => {
        const separator = key.indexOf("/");
        return {
          productId: key.slice(0, separator),
          variantId: key.slice(separator + 1),
          quantity,
        };
      },
    );
    tx.update(saleRef, {
      refundTotal,
      returnedCost,
      returnedItems: cumulativeReturnedItems,
      paidTotal,
      balanceDue: Math.max(0, sale.total - refundTotal - paidTotal),
      updatedAt: at,
    });
    return saleReturn;
  });
});
