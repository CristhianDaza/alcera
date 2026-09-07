import { describe, it, expect } from 'vitest'
import { canIndex, canonicalUrl, serializeSchema, siteBase } from '../shared/seo'
describe('Indexación y URLs públicas', () => {
  const live = { siteUrl: 'https://alceraperfumes.com', demo: false, indexable: true }
  it('solo permite producción activada con datos reales', () => {
    expect(canIndex(live)).toBe(true)
    for (const config of [{ ...live, demo: true }, { ...live, indexable: false }, { ...live, siteUrl: 'http://localhost:3000' }, { ...live, siteUrl: 'http://127.0.0.1:3000' }]) expect(canIndex(config)).toBe(false)
  })
  it('normaliza URLs y elimina parámetros de filtros', () => {
    expect(canonicalUrl(live.siteUrl, '/catalogo/?q=rosa#top')).toBe('https://alceraperfumes.com/catalogo')
    expect(canonicalUrl(live.siteUrl, '/')).toBe('https://alceraperfumes.com/')
    expect(() => siteBase('https://alceraperfumes.com/catalogo')).toThrow()
  })
  it('serializa contenido sin permitir cerrar el script JSON-LD', () => {
    const content = { name: '</script><script>alert(1)</script>' }
    expect(serializeSchema(content)).not.toContain('<')
    expect(JSON.parse(serializeSchema(content))).toEqual(content)
  })
})
