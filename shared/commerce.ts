import type { CartLine, Product } from './types'
export const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
export function reconcileCart(lines: CartLine[], products: Product[]) {
  return lines.map(line => {
    const product = products.find(p => p.id === line.productId && p.status === 'published')
    const variant = product?.variants.find(v => v.id === line.variantId)
    return { ...line, name: product?.name ?? line.name, size: variant?.size ?? line.size, price: variant?.price ?? line.price, available: !!variant?.available, image: product?.images[0]?.url ?? line.image }
  })
}
export function whatsappMessage(lines: CartLine[], name: string) {
  return `Hola, ${name}. Me interesan estos perfumes:\n\n${lines.map(l => `• ${l.name} · ${l.size} × ${l.quantity}: ${money(l.price * l.quantity)}`).join('\n')}\n\nSubtotal: ${money(lines.reduce((s, l) => s + l.price * l.quantity, 0))}\nQuisiera confirmar disponibilidad, envío y forma de pago.`
}
