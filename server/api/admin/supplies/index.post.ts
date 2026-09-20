import { supplyCreateSchema, type Supply } from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, supplyCreateSchema);
  const at = nowIso();
  const ref = database().collection("supplies").doc(newId());
  const supply: Supply = {
    id: ref.id,
    ...body,
    capacityMl:
      body.category === "DECANT_CONTAINER" ? body.capacityMl! : null,
    unit: body.category === "DECANT_CONTAINER" ? "UNIT" : body.unit,
    // Las reglas antiguas se conservan solo como datos migrables; no se aplican a ventas nuevas.
    automaticConsumption: undefined,
    active: body.active,
    createdAt: at,
    updatedAt: at,
  };
  await ref.set(firestoreData(supply));
  return supply;
});
