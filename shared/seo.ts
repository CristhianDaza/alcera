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
  const normalizedPath = path.split(/[?#]/)[0]!.replace(/^\/+|\/+$/g, "");
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
export function productSearchName(name: string, brand: string): string {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return normalize(name).includes(normalize(brand))
    ? name
    : `${name} de ${brand}`;
}
export const serializeSchema = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

export function catalogPage(value: unknown): number | null {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function catalogHasParameters(query: Record<string, unknown>): boolean {
  return paginationHasParameters(query);
}

export function paginationHasParameters(
  query: Record<string, unknown>,
): boolean {
  return (
    Object.keys(query).some((key) => key !== "page") ||
    catalogPage(query.page) === null
  );
}

export function paginatedCanonical(
  base: string,
  path: string,
  query: Record<string, unknown>,
): string {
  const url = canonicalUrl(base, path);
  const page = catalogPage(query.page);
  return !paginationHasParameters(query) && page && page > 1
    ? `${url}?page=${page}`
    : url;
}

export function pageCanonical(
  base: string,
  path: string,
  query: Record<string, unknown>,
): string {
  return /^\/perfumes\/?$/.test(path)
    ? paginatedCanonical(base, path, query)
    : canonicalUrl(base, path);
}
