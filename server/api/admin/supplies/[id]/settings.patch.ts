import {
  supplySettingsSchema,
  type Supply,
} from "../../../../../shared/business";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readValidated(event, supplySettingsSchema);
  const ref = database()
    .collection("supplies")
    .doc(getRouterParam(event, "id")!);
  const snapshot = await ref.get();
  if (!snapshot.exists)
    throw createError({
      statusCode: 404,
      statusMessage: "Insumo no encontrado",
    });
  const supply = docData<Supply>(snapshot);
  const category = body.category ?? supply.category ?? "SUPPLY";
  const unit =
    category === "DECANT_CONTAINER"
      ? "UNIT"
      : (body.unit ?? supply.unit ?? "UNIT");
  const capacityMl =
    category === "DECANT_CONTAINER"
      ? (body.capacityMl ?? supply.capacityMl ?? null)
      : null;
  if (category === "DECANT_CONTAINER" && !capacityMl)
    throw createError({
      statusCode: 400,
      statusMessage:
        "La capacidad en ml es obligatoria para un envase de decant",
    });
  await ref.update(
    firestoreData({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.sku !== undefined ? { sku: body.sku } : {}),
      ...(body.minimumStock !== undefined
        ? { minimumStock: body.minimumStock }
        : {}),
      ...(body.averageCost !== undefined
        ? { averageCost: body.averageCost }
        : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
      category,
      unit,
      capacityMl,
      // Retiramos la regla automática obsoleta al editar el artículo.
      automaticConsumption: undefined,
      updatedAt: nowIso(),
    }),
  );
  const { automaticConsumption: _previous, ...rest } = supply;
  return {
    ...rest,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.sku !== undefined ? { sku: body.sku } : {}),
    ...(body.minimumStock !== undefined
      ? { minimumStock: body.minimumStock }
      : {}),
    ...(body.averageCost !== undefined
      ? { averageCost: body.averageCost }
      : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
    category,
    unit,
    capacityMl,
  };
});
