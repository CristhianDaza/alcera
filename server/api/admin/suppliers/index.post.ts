import {
  supplierCreateSchema,
  type Supplier,
} from "../../../../shared/business";

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const body = await readValidated(event, supplierCreateSchema);
  const id = newId();
  const at = nowIso();
  const supplier: Supplier = {
    id,
    ...body,
    active: true,
    createdAt: at,
    updatedAt: at,
  };
  await database()
    .collection("suppliers")
    .doc(id)
    .set(firestoreData({ ...supplier, createdBy: admin.uid }));
  return supplier;
});
