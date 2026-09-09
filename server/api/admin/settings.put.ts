import { invalidateSettingsCache } from "../../utils/catalog";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  if (isDemo())
    throw createError({
      statusCode: 409,
      statusMessage: "Desactiva el modo demostración para guardar",
    });
  const result = settingsSchema.safeParse(await readBody(event));
  if (!result.success)
    throw createError({
      statusCode: 400,
      statusMessage: "Nombre o número de WhatsApp inválido",
    });
  await database().collection("settings").doc("store").set(result.data);
  invalidateSettingsCache();
  return result.data;
});
