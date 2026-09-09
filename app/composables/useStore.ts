import type { Settings } from "#shared/types";
import { canonicalUrl, metaDescription, siteBase } from "#shared/seo";
export const useStore = () =>
  useState<Settings>("store", () => ({ name: "ALCÉRA", whatsapp: "" }));
export function usePageSeo(
  title: string,
  description: string,
  image?: string,
  options: { imageAlt?: string } = {},
) {
  const route = useRoute(),
    config = useRuntimeConfig();
  const base = siteBase(config.public.siteUrl);
  const canonical = computed(() => canonicalUrl(base, route.path));
  const summary = metaDescription(description);
  const socialImage = new URL(image || "/brand/alcera-logo.png", base).href;
  const imageAlt = options.imageAlt || title;
  useSeoMeta({
    title,
    description: summary,
    ogTitle: title,
    ogDescription: summary,
    ogImage: socialImage,
    ogImageAlt: imageAlt,
    ogUrl: () => canonical.value,
    ogType: "website",
    ogLocale: "es_CO",
    ogSiteName: useStore().value.name,
    twitterCard: image ? "summary_large_image" : "summary",
    twitterTitle: title,
    twitterDescription: summary,
    twitterImage: socialImage,
    twitterImageAlt: imageAlt,
  });
  useHead(() => ({
    link: [{ key: "canonical", rel: "canonical", href: canonical.value }],
  }));
}
