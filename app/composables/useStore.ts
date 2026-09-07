import type { Settings } from '#shared/types'
import { canonicalUrl } from '#shared/seo'
export const useStore = () => useState<Settings>('store', () => ({ name: 'ALCÉRA', whatsapp: '' }))
export function usePageSeo(title: string, description: string, image?: string) {
  const route = useRoute(), config = useRuntimeConfig()
  const canonical = computed(() => canonicalUrl(config.public.siteUrl, route.path))
  const socialImage = new URL(image || '/brand/alcera-logo.png', config.public.siteUrl).href
  useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogImage: socialImage, ogImageAlt: title, ogUrl: () => canonical.value, ogType: 'website', ogLocale: 'es_CO', ogSiteName: useStore().value.name, twitterCard: image ? 'summary_large_image' : 'summary', twitterTitle: title, twitterDescription: description, twitterImage: socialImage })
  useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
}
