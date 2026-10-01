/** Builds a safe WhatsApp contact URL from an international phone number or username. */
export function whatsappContactUrl(contact: string, message?: string) {
  const value = contact.trim();
  if (!value) return "";

  let identifier = value;
  if (/^https:\/\/wa\.me\//i.test(value)) {
    try {
      const url = new URL(value);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "wa.me" ||
        url.search ||
        url.hash
      )
        return "";
      identifier = url.pathname.slice(1);
    } catch {
      return "";
    }
  }

  const validPhone = /^[1-9]\d{7,14}$/.test(identifier);
  const validUsername = /^[A-Za-z][A-Za-z0-9._]{4,29}$/.test(identifier);
  if (!validPhone && !validUsername) return "";

  const base = `https://wa.me/${identifier}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
