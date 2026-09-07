import type { CartLine, Product, Variant } from '#shared/types'
export function useCart() {
  const lines = useState<CartLine[]>('cart', () => [])
  const count = computed(() => lines.value.reduce((s,l) => s+l.quantity,0))
  const total = computed(() => lines.value.reduce((s,l) => s+l.price*l.quantity,0))
  function add(product: Product, variant: Variant) {
    if (!variant.available) return
    const line = lines.value.find(l => l.productId === product.id && l.variantId === variant.id)
    if (line) line.quantity = Math.min(99,line.quantity+1)
    else lines.value.push({ productId: product.id, variantId: variant.id, name: product.name, size: variant.size, price: variant.price, quantity: 1, available: true, image: product.images[0]?.url ?? '' })
  }
  return { lines, count, total, add }
}
