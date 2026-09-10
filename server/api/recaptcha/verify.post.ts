const ACTION = "whatsapp_open";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const projectId = config.recaptchaEnterpriseProjectId;
  const apiKey = config.recaptchaEnterpriseApiKey;
  const siteKey = config.public.recaptchaEnterpriseSiteKey;

  if (!projectId || !apiKey || !siteKey)
    throw createError({
      statusCode: 503,
      statusMessage: "La protección anti-bots aún no está configurada.",
    });

  const body = await readBody<{ token?: unknown }>(event);
  if (!body || typeof body.token !== "string" || !body.token)
    throw createError({ statusCode: 400, statusMessage: "Verificación inválida." });

  const response = await fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: { token: body.token, siteKey, expectedAction: ACTION },
      }),
    },
  );
  if (!response.ok)
    throw createError({
      statusCode: 502,
      statusMessage: "No pudimos validar la verificación. Inténtalo de nuevo.",
    });

  const assessment = (await response.json()) as {
    tokenProperties?: { valid?: boolean; action?: string };
    riskAnalysis?: { score?: number };
  };
  const valid = assessment.tokenProperties?.valid === true;
  const correctAction = assessment.tokenProperties?.action === ACTION;
  const score = assessment.riskAnalysis?.score ?? 0;

  if (!valid || !correctAction || score < 0.5)
    throw createError({
      statusCode: 403,
      statusMessage: "No fue posible verificar esta solicitud. Inténtalo de nuevo.",
    });

  return { ok: true };
});
