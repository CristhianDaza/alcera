const xml = (s: string) => s.replace(/[<>&"']/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[c]!))
export default defineEventHandler(async event => {
  setHeader(event, 'content-type', 'application/xml')
  const base = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const paths = ['/', '/catalogo', ...(await products()).map(p => `/perfumes/${p.slug}`)]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${xml(base+p)}</loc></url>`).join('')}</urlset>`
})
