import type { Analytics } from "firebase/analytics";
import type { FirebaseApp } from "firebase/app";
import type { Product, Variant } from "#shared/types";

type AnalyticsConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  measurementId: string;
};

type EventParameters = Record<
  string,
  string | number | boolean | undefined | Record<string, unknown>[]
>;

let analyticsSetup: Promise<void> | undefined;
let analyticsInstance: Analytics | null = null;
let analyticsAllowed = false;
let analyticsConsentGranted = false;
let loadedAnalyticsModule: typeof import("firebase/analytics") | null = null;
let analyticsUserSignedIn = true;
let authChangeId = 0;

export function setStoreAnalyticsConsent(granted: boolean) {
  analyticsConsentGranted = granted;
  if (
    granted &&
    !analyticsUserSignedIn &&
    analyticsInstance &&
    loadedAnalyticsModule
  ) {
    loadedAnalyticsModule.setAnalyticsCollectionEnabled(
      analyticsInstance,
      true,
    );
    analyticsAllowed = true;
    return;
  }
  if (!granted) {
    analyticsAllowed = false;
    authChangeId += 1;
    if (analyticsInstance && loadedAnalyticsModule) {
      loadedAnalyticsModule.setAnalyticsCollectionEnabled(
        analyticsInstance,
        false,
      );
    }
  }
}

export function initializeStoreAnalytics(config: AnalyticsConfig) {
  if (!import.meta.client || analyticsSetup) return analyticsSetup;
  if (!config.apiKey || !config.projectId || !config.appId) {
    if (import.meta.dev)
      console.info(
        "[analytics] Firebase Analytics está desactivado: faltan variables públicas de configuración.",
      );
    return;
  }

  analyticsSetup = Promise.all([
    import("firebase/app"),
    import("firebase/analytics"),
    import("firebase/auth"),
  ])
    .then(async ([firebase, analyticsModule, authModule]) => {
      loadedAnalyticsModule = analyticsModule;
      const app =
        firebase.getApps()[0] ??
        firebase.initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          appId: config.appId,
          ...(config.measurementId
            ? { measurementId: config.measurementId }
            : {}),
        });

      await new Promise<void>((resolve) => {
        let initialStateResolved = false;
        const resolveInitialState = () => {
          if (initialStateResolved) return;
          initialStateResolved = true;
          resolve();
        };

        authModule.onIdTokenChanged(
          authModule.getAuth(app),
          (user) => {
            void updateAnalyticsAccess(app, analyticsModule, Boolean(user))
              .catch((error) => {
                disableAnalyticsCollection(analyticsModule);
                if (import.meta.dev)
                  console.warn(
                    "[analytics] No se pudo aplicar el estado de sesión.",
                    error,
                  );
              })
              .finally(resolveInitialState);
          },
          () => {
            disableAnalyticsCollection(analyticsModule);
            resolveInitialState();
          },
        );
      });
    })
    .catch((error) => {
      if (import.meta.dev)
        console.warn(
          "[analytics] No se pudo iniciar Firebase Analytics.",
          error,
        );
    });

  return analyticsSetup;
}

function disableAnalyticsCollection(analyticsModule: {
  setAnalyticsCollectionEnabled: (
    analytics: Analytics,
    enabled: boolean,
  ) => void;
}) {
  analyticsAllowed = false;
  authChangeId += 1;
  if (analyticsInstance)
    analyticsModule.setAnalyticsCollectionEnabled(analyticsInstance, false);
}

async function updateAnalyticsAccess(
  app: FirebaseApp,
  analyticsModule: typeof import("firebase/analytics"),
  signedIn: boolean,
) {
  analyticsUserSignedIn = signedIn;
  analyticsAllowed = false;
  const currentChange = ++authChangeId;
  if (analyticsInstance)
    analyticsModule.setAnalyticsCollectionEnabled(analyticsInstance, false);
  if (
    !analyticsConsentGranted ||
    signedIn ||
    !(await analyticsModule.isSupported())
  )
    return;
  if (currentChange !== authChangeId) return;

  analyticsInstance ??= analyticsModule.initializeAnalytics(app, {
    config: { send_page_view: false },
  });
  analyticsModule.setAnalyticsCollectionEnabled(analyticsInstance, true);
  analyticsAllowed = true;
}

export async function trackAnalyticsEvent(
  name: string,
  parameters: EventParameters = {},
) {
  if (!import.meta.client || !analyticsSetup) return;
  await analyticsSetup;
  if (!analyticsAllowed || !analyticsInstance) return;
  const { logEvent } = await import("firebase/analytics");
  if (!analyticsAllowed) return;
  logEvent(analyticsInstance, name, parameters);
}

export function analyticsItem(product: Product, variant?: Variant) {
  return {
    item_id: product.sku || product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    item_category2: product.family?.join(", ") || undefined,
    item_variant: variant?.size,
    price: variant?.price,
  };
}
