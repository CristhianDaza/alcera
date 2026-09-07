import type { Settings } from '#shared/types'
export const useStore = () => useState<Settings>('store', () => ({ name: 'ALCÉRA', whatsapp: '' }))
export function usePageSeo(title: string, description: string, image?: string) {
  const route = useRoute(), config = useRuntimeConfig()
  const canonical = config.public.siteUrl.replace(/\/$/, '') + route.path
  useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogImage: image, ogUrl: canonical, ogType: 'website', twitterCard: 'summary_large_image' })
  useHead({ link: [{ rel: 'canonical', href: canonical }] })
}
