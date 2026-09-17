export type CookieConsent = "accepted" | "rejected" | null;

const CONSENT_KEY = "alcera-cookie-consent";

export function useCookieConsent() {
  const consent = useState<CookieConsent>("cookie-consent", () => null);
  const preferencesOpen = useState("cookie-preferences-open", () => false);
  const hydrated = useState("cookie-consent-hydrated", () => false);

  function hydrateConsent() {
    if (!import.meta.client || hydrated.value) return;
    hydrated.value = true;

    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "rejected") {
        consent.value = stored;
      }
    } catch {
      /* El aviso sigue disponible aunque el almacenamiento esté bloqueado. */
    }
  }

  function setConsent(value: Exclude<CookieConsent, null>) {
    consent.value = value;
    preferencesOpen.value = false;

    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* La elección se conserva durante la sesión. */
    }
  }

  function openPreferences() {
    preferencesOpen.value = true;
  }

  function closePreferences() {
    if (consent.value) preferencesOpen.value = false;
  }

  return {
    consent,
    preferencesOpen,
    hydrateConsent,
    setConsent,
    openPreferences,
    closePreferences,
  };
}
