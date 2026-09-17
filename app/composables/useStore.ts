import type { Settings } from "#shared/types";
import { pageCanonical, metaDescription, siteBase } from "#shared/seo";
export const useStore = () =>
  useState<Settings>("store", () => ({
    name: "ALCÉRA",
    contactEmail: "alcera@cris-dev.com",
    legalName: "",
    taxId: "",
    whatsapp: "",
    whatsappEnabled: true,
    telegram: "",
    telegramEnabled: false,
    tawkEnabled: true,
  }));
export function usePageSeo(
  title: MaybeRefOrGetter<string>,
  description: string,
  image?: string,
  options: { imageAlt?: string; canonical?: MaybeRefOrGetter<string> } = {},
) {
  const route = useRoute(),
    config = useRuntimeConfig();
  const base = siteBase(config.public.siteUrl);
  const canonical = computed(() =>
    options.canonical
      ? toValue(options.canonical)
      : pageCanonical(base, route.path, route.query),
  );
  const summary = metaDescription(description);
  const socialImage = new URL(image || "/brand/alcera-logo.png", base).href;
  const imageAlt = () => options.imageAlt || toValue(title);
  useSeoMeta({
    title: () => toValue(title),
    description: summary,
    ogTitle: () => toValue(title),
    ogDescription: summary,
    ogImage: socialImage,
    ogImageAlt: imageAlt,
    ogUrl: () => canonical.value,
    ogType: "website",
    ogLocale: "es_CO",
    ogSiteName: useStore().value.name,
    twitterCard: image ? "summary_large_image" : "summary",
    twitterTitle: () => toValue(title),
    twitterDescription: summary,
    twitterImage: socialImage,
    twitterImageAlt: imageAlt,
  });
  useHead(() => ({
    link: [{ key: "canonical", rel: "canonical", href: canonical.value }],
  }));
}
