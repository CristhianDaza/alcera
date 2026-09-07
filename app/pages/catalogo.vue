<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { data, error, status, refresh } = await useFetch('/api/products')
const queryText = (value: unknown) => typeof value === 'string' ? value : ''
const search = ref(queryText(route.query.q))
const category = computed({ get: () => queryText(route.query.category), set: value => updateQuery({ category: value }) })
const family = computed({ get: () => queryText(route.query.family), set: value => updateQuery({ family: value }) })
const available = computed({ get: () => route.query.available === '1', set: value => updateQuery({ available: value ? '1' : '' }) })
const sort = computed({ get: () => queryText(route.query.sort) || 'featured', set: value => updateQuery({ sort: value === 'featured' ? '' : value }) })
function updateQuery(values: Record<string, string>) {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(values)) {
    if (value) query[key] = value
    else delete query[key]
  }
  void router.replace({ query })
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, value => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => updateQuery({ q: value.trim() }), 250)
})
watch(() => route.query.q, value => { search.value = queryText(value) })
onBeforeUnmount(() => clearTimeout(searchTimer))
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
const families = computed(() => [...new Set([...(data.value ?? []).map(p => p.family).filter((item): item is string => Boolean(item)), ...(family.value ? [family.value] : [])])])
const categories = computed(() => [...new Set(['Mujer', 'Hombre', 'Unisex', ...(data.value ?? []).map(p => p.category), ...(category.value ? [category.value] : [])])])
const hasFilters = computed(() => Boolean(search.value || category.value || family.value || available.value))
function clearFilters() {
  search.value = ''
  clearTimeout(searchTimer)
  updateQuery({ q: '', category: '', family: '', available: '' })
}
const filtered = computed(() => {
  const list = (data.value ?? []).filter(p => normalize(`${p.name} ${p.brand}`).includes(normalize(search.value)) && (!category.value || p.category === category.value) && (!family.value || p.family === family.value) && (!available.value || p.variants.some(v => v.available)))
  const price = (p: typeof list[number]) => Math.min(...p.variants.filter(v => !available.value || v.available).map(v => v.price))
  return list.sort((a,b) => sort.value === 'asc' ? price(a)-price(b) : sort.value === 'desc' ? price(b)-price(a) : Number(b.featured)-Number(a.featured))
})
usePageSeo(`Perfumes para mujer, hombre y unisex · ${useStore().value.name}`, 'Explora perfumes por marca, familia olfativa y presentación. Precios en COP y pedidos por WhatsApp.')
</script>

<template>
  <section class="shell section catalog">
    <div class="page-intro"><span class="eyebrow">ENCUENTRA TU PRÓXIMA HISTORIA</span><h1>Colección de <em>perfumes.</em></h1><p>Un aroma para cada versión de ti. Explora, elige y consulta por WhatsApp.</p></div>
    <div class="filters">
      <label class="search-label">Buscar perfume<input v-model="search" type="search" placeholder="Nombre o marca…"></label>
      <label>Categoría<select v-model="category"><option value="">Todas</option><option v-for="c in categories" :key="c">{{ c }}</option></select></label>
      <label>Familia<select v-model="family"><option value="">Todas</option><option v-for="f in families" :key="f">{{ f }}</option></select></label>
      <label>Ordenar<select v-model="sort"><option value="featured">Destacados</option><option value="asc">Menor precio</option><option value="desc">Mayor precio</option></select></label>
    </div>
    <div class="results-bar">
      <span role="status" aria-live="polite">{{ filtered.length }} {{ filtered.length === 1 ? 'perfume' : 'perfumes' }}<span class="results-currency"> · Precios en COP</span></span>
      <div class="results-actions"><button v-if="hasFilters" class="text-link" @click="clearFilters">Limpiar filtros</button><label class="check"><input v-model="available" type="checkbox"> Solo disponibles</label></div>
    </div>
    <div v-if="category || family" class="active-filters" aria-label="Filtros activos">
      <button v-if="category" @click="category = ''" :aria-label="`Quitar categoría ${category}`">{{ category }} <span aria-hidden="true">×</span></button>
      <button v-if="family" @click="family = ''" :aria-label="`Quitar familia ${family}`">{{ family }} <span aria-hidden="true">×</span></button>
    </div>
    <p v-if="status === 'pending'" role="status">Descubriendo la colección…</p>
    <div v-else-if="error" class="empty" role="alert"><h2>No pudimos cargar los perfumes.</h2><p>Inténtalo de nuevo en unos segundos.</p><button class="button" @click="refresh()">Reintentar</button></div>
    <div v-else-if="!filtered.length" class="empty"><span class="empty-symbol" aria-hidden="true">✧</span><h2>{{ hasFilters ? 'No encontramos esa combinación.' : 'La colección está por llegar.' }}</h2><p>{{ hasFilters ? 'Prueba con otra marca o quita un filtro para descubrir más fragancias.' : 'Pronto podrás descubrir nuestras fragancias.' }}</p><button v-if="hasFilters" class="button" @click="clearFilters">Ver toda la colección ↗</button></div>
    <div v-else class="product-grid"><ProductCard v-for="product in filtered" :key="product.id" :product="product" /></div>
  </section>
</template>
