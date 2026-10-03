import type { MetaContent } from "../../shared/meta";
import { createHash } from "node:crypto";

export type MetaServerEvent = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data?: { ph: string[] };
  custom_data: MetaContent;
};

export function hashMetaPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  if (!/^57\d{10}$/.test(normalized)) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

export class MetaCapiError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus?: number,
  ) {
    super(code);
    this.name = "MetaCapiError";
  }
}

export async function sendMetaServerEvent(
  pixelId: string,
  accessToken: string,
  event: MetaServerEvent,
  testEventCode = "",
  request: typeof fetch = fetch,
) {
  if (!/^\d{5,20}$/.test(pixelId) || !accessToken)
    throw new MetaCapiError("not_configured");

  let response: Response;
  try {
    response = await request(
      `https://graph.facebook.com/v25.0/${pixelId}/events`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: [event],
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw new MetaCapiError("network_error");
  }

  if (!response.ok) throw new MetaCapiError("meta_rejected", response.status);

  let result: { events_received?: number };
  try {
    result = (await response.json()) as { events_received?: number };
  } catch {
    throw new MetaCapiError("invalid_response", response.status);
  }
  if (result.events_received !== 1)
    throw new MetaCapiError("event_not_accepted", response.status);
}
