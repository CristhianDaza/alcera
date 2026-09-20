import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  taxId: z.string().trim().max(50).optional(),
  contact: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  city: z.string().trim().max(120).optional(),
  paymentTerms: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  active: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readValidated(event, schema);
  const id = getRouterParam(event, "id")!;
  const ref = database().collection("suppliers").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists)
    throw createError({
      statusCode: 404,
      statusMessage: "Proveedor no encontrado",
    });
  await ref.update(firestoreData({ ...body, updatedAt: nowIso() }));
  return { id, ...snapshot.data(), ...body, updatedAt: nowIso() };
});
