import { googleMerchantFeed } from "../../shared/google-merchant";
import { siteBase } from "../../shared/seo";
import { isDemo, products } from "../utils/catalog";

export default defineEventHandler(async (event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(
    event,
    "cache-control",
    "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
  );

  const config = useRuntimeConfig().public;
  return googleMerchantFeed(
    isDemo() ? [] : await products(),
    siteBase(config.siteUrl),
  );
});
