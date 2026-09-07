import { demoProducts } from '../../shared/demo'
import type { Product, Settings } from '../../shared/types'
export const isDemo = () => String(useRuntimeConfig().public.demo) === 'true'
export async function products(all = false): Promise<Product[]> {
  if (isDemo()) return structuredClone(demoProducts)
  const collection = database().collection('products')
  const snapshot = await (all ? collection : collection.where('status', '==', 'published')).get()
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Product)
}
export async function settings(): Promise<Settings> {
  if (isDemo()) return { name: 'ALCÉRA', whatsapp: '' }
  const doc = await database().collection('settings').doc('store').get()
  const stored = doc.data() as Partial<Settings> | undefined
  return { whatsapp: '', ...stored, name: !stored?.name || stored.name === 'Esencia' ? 'ALCÉRA' : stored.name }
}
