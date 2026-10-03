import type { MetaContent } from "#shared/meta";
import { isMetaPixelAllowed } from "#shared/meta";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

let consentAccepted = false;
let activePixelId = "";
let lastPageView = "";
const pendingEvents: {
  name: "ViewContent" | "AddToCart" | "InitiateCheckout";
  content: MetaContent;
  eventId: string;
}[] = [];

function browserFbq() {
  return window as typeof window & { fbq?: Fbq; _fbq?: Fbq };
}

export function setMetaPixelConsent(accepted: boolean) {
  consentAccepted = accepted;
  if (!accepted) {
    lastPageView = "";
    pendingEvents.length = 0;
  }
}

export function enableMetaPixel(
  pixelId: string,
  accepted: boolean,
  demo: boolean,
) {
  setMetaPixelConsent(accepted);
  if (
    !import.meta.client ||
    !isMetaPixelAllowed(accepted, import.meta.env.PROD, demo, pixelId)
  )
    return false;
  // A page uses one configured Pixel ID; reload after changing it in settings.
  if (activePixelId && activePixelId !== pixelId) return false;

  const target = browserFbq();
  if (!target.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    target.fbq = fbq;
    target._fbq = fbq;
  }

  if (activePixelId !== pixelId) {
    activePixelId = pixelId;
    target.fbq("init", pixelId);
  }
  if (!document.getElementById("meta-pixel-script")) {
    const script = document.createElement("script");
    script.id = "meta-pixel-script";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  return true;
}

export function trackMetaPageView(location: string, demo: boolean) {
  if (!consentAccepted || !activePixelId || demo || !location) return;
  if (location === lastPageView) return;
  lastPageView = location;
  if (import.meta.dev) {
    console.info("[meta] evento", {
      name: "PageView",
      event_id: crypto.randomUUID(),
      content_ids: [],
    });
    return;
  }
  try {
    browserFbq().fbq?.(
      "track",
      "PageView",
      {},
      {
        eventID: crypto.randomUUID(),
      },
    );
    while (pendingEvents.length) {
      const pending = pendingEvents.shift()!;
      sendMetaEvent(pending.name, pending.content, pending.eventId);
    }
  } catch {
    // Marketing analytics must never interrupt navigation.
  }
}

export function trackMetaBrowserEvent(
  name: "ViewContent" | "AddToCart" | "InitiateCheckout",
  content: MetaContent,
  eventId = crypto.randomUUID(),
) {
  if (!consentAccepted) return false;
  const params = { ...content };
  if (import.meta.dev) {
    console.info("[meta] evento", {
      name,
      event_id: eventId,
      content_ids: content.content_ids,
    });
    return false;
  }
  if (!import.meta.client) return false;
  if (!activePixelId) {
    if (pendingEvents.length < 25)
      pendingEvents.push({ name, content: params, eventId });
    return false;
  }
  return sendMetaEvent(name, params, eventId);
}

function sendMetaEvent(
  name: "ViewContent" | "AddToCart" | "InitiateCheckout",
  params: MetaContent,
  eventId: string,
) {
  try {
    browserFbq().fbq?.("track", name, params, { eventID: eventId });
    return true;
  } catch {
    return false;
  }
}
