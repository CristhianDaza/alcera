import { canIndex, siteBase } from "../../shared/seo";
export default defineEventHandler((event) => {
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");
  const config = useRuntimeConfig().public;
  if (!canIndex(config)) return "User-agent: *\nDisallow: /\n";
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    `Sitemap: ${siteBase(config.siteUrl)}/sitemap.xml`,
    "",
  ].join("\n");
});
