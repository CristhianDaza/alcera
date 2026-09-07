import { canIndex, siteBase } from '../../shared/seo'
export default defineEventHandler(event => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const config = useRuntimeConfig().public
  return 'User-agent: *\nAllow: /\n' + (canIndex(config) ? 'Sitemap: ' + siteBase(config.siteUrl) + '/sitemap.xml\n' : '')
})
