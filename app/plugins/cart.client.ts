import type { CartLine } from '#shared/types'
export default defineNuxtPlugin(() => {
  const { lines } = useCart()
  try {
    const saved = JSON.parse(localStorage.getItem('esencia-cart') ?? '[]')
    if (Array.isArray(saved)) lines.value = saved.filter((l: CartLine) => l && typeof l.productId === 'string' && typeof l.variantId === 'string' && typeof l.name === 'string' && typeof l.size === 'string' && Number.isFinite(l.price) && l.price > 0 && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99).slice(0,100)
  } catch { /* El navegador puede bloquear el almacenamiento. */ }
  watch(lines, value => { try { localStorage.setItem('esencia-cart', JSON.stringify(value)) } catch { /* El carrito sigue funcionando durante la sesión. */ } }, { deep: true })
})
