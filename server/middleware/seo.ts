import { defineEventHandler, getRequestURL, getQuery, setHeader } from "h3";
// @ts-ignore
import { useRuntimeConfig } from "#imports";
import { canIndex, catalogHasParameters } from "../../shared/seo";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const path = url.pathname;
  if (
    !canIndex(useRuntimeConfig().public) ||
    /^\/(admin|carrito|api)(\/|$)/.test(path)
  )
    setHeader(event, "X-Robots-Tag", "noindex, nofollow");
  else if (
    /^\/perfumes\/?$/.test(path) &&
    catalogHasParameters(getQuery(event))
  )
    setHeader(event, "X-Robots-Tag", "noindex, follow");
});
