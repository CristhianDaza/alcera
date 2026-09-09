export function siteBase(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "NUXT_PUBLIC_SITE_URL debe ser el origen público, sin rutas ni parámetros.",
    );
  return url.origin;
}
export function canIndex(config: {
  siteUrl: string;
  demo: unknown;
  indexable: unknown;
}): boolean {
  const host = new URL(siteBase(config.siteUrl)).hostname;
  return (
    String(config.indexable) === "true" &&
    String(config.demo) !== "true" &&
    !/^(localhost|127\..*|0\.0\.0\.0|\[::1])$/.test(host) &&
    !host.endsWith(".localhost")
  );
}
export function canonicalUrl(base: string, path: string): string {
  const normalizedPath = path
    .split(/[?#]/)[0]!
    .replace(/^\/+|\/+$/g, "");
  return siteBase(base) + (normalizedPath ? `/${normalizedPath}` : "/");
}
export function metaDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const shortened = normalized.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  const end = lastSpace > maxLength * 0.7 ? lastSpace : shortened.length;
  return `${shortened.slice(0, end).trimEnd()}…`;
}
export const serializeSchema = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
