<script setup lang="ts">
import { money, reconcileCart, whatsappMessage } from '#shared/commerce'
const { lines, total } = useCart(), store = useStore()
const busy = ref(false), notice = ref(''), readyUrl = ref('')
watch(lines, () => { readyUrl.value = '' }, { deep: true, flush: 'sync' })
useSeoMeta({ title:'Tu bolsa · ALCÉRA', robots:'noindex, nofollow' })
function quantity(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = Math.max(1, Math.min(99, Math.floor(Number(input.value) || 1)))
  lines.value[index]!.quantity = value
  input.value = String(value)
}
async function checkout() {
  busy.value=true; notice.value=''; readyUrl.value=''
  try {
    const [products, config] = await Promise.all([$fetch('/api/products'),$fetch('/api/settings')])
    store.value=config
    const updated = reconcileCart(lines.value,products)
    const changed = JSON.stringify(updated) !== JSON.stringify(lines.value)
    lines.value=updated
    if (changed) { notice.value='Actualizamos los precios o la disponibilidad. Revisa tu bolsa y vuelve a continuar.'; return }
    if (updated.some(l => !l.available)) { notice.value='Retira las presentaciones agotadas para continuar.'; return }
    if (!config.whatsapp) { notice.value='La tienda aún no tiene un WhatsApp configurado. No se ha enviado ningún pedido.'; return }
    if (!updated.length) return
    readyUrl.value=`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(whatsappMessage(updated,config.name))}`
    notice.value='Tu consulta está lista. Abre WhatsApp para enviarla; el pago y el envío se acuerdan allí.'
  } catch { notice.value='No pudimos comprobar los precios. Inténtalo de nuevo.' } finally { busy.value=false }
}
</script>
<template><section class="shell section"><div class="page-intro"><span class="eyebrow">CASI TUYOS</span><h1>Tu <em>bolsa.</em></h1></div><ClientOnly><div v-if="lines.length" class="cart-layout"><div><NuxtLink class="text-link" to="/catalogo">← Seguir explorando</NuxtLink><article v-for="(line,index) in lines" :key="`${line.productId}-${line.variantId}`" class="cart-row"><img :src="line.image" :alt="line.name" width="120" height="140"><div><h2>{{ line.name }}</h2><p>{{ line.size }} · {{ money(line.price) }}</p><p v-if="!line.available" class="error">Agotado o retirado del catálogo</p><button class="text-link" :aria-label="`Eliminar ${line.name}, ${line.size}`" @click="lines.splice(index,1)">Eliminar</button></div><label>Cantidad<input type="number" :value="line.quantity" min="1" max="99" @change="quantity(index,$event)"></label><strong>{{ money(line.price*line.quantity) }}</strong></article></div><aside class="summary"><span class="eyebrow">TU SELECCIÓN</span><h2>Resumen</h2><div class="subtotal"><span>Subtotal</span><strong>{{ money(total) }}</strong></div><p>Precios en COP. Envío y pago se confirman por WhatsApp. Esta consulta no reserva productos.</p><button v-if="!readyUrl" class="button full" :disabled="busy" @click="checkout">{{ busy ? 'Comprobando…' : 'Preparar consulta por WhatsApp' }} ↗</button><p v-if="notice" role="status">{{ notice }}</p><a v-if="readyUrl" :href="readyUrl" target="_blank" rel="noopener noreferrer" class="button full">Abrir WhatsApp ↗</a></aside></div><div v-else class="empty"><h2>Tu próxima esencia te espera.</h2><p>Aún no has añadido perfumes a tu bolsa.</p><NuxtLink class="button" to="/catalogo">Explorar la colección ↗</NuxtLink></div><template #fallback><p>Cargando tu bolsa…</p></template></ClientOnly></section></template>
