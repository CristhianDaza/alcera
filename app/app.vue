<script setup lang="ts">
const store = useStore()
const { data } = await useFetch('/api/settings')
if (data.value) store.value = data.value
const { count } = useCart()
const demo = String(useRuntimeConfig().public.demo) === 'true'
const route = useRoute()
const navigation = [
  { label: 'Colección', category: '', to: '/catalogo' },
  { label: 'Mujer', category: 'Mujer', to: '/catalogo?category=Mujer' },
  { label: 'Hombre', category: 'Hombre', to: '/catalogo?category=Hombre' },
  { label: 'Unisex', category: 'Unisex', to: '/catalogo?category=Unisex' }
]
const activeCategory = computed(() => /^\/catalogo\/?$/.test(route.path) ? (route.query.category || '') : null)
</script>
<template>
  <div>
    <a class="skip" href="#main">Saltar al contenido</a>
    <div class="announcement">EL ARTE DE DEJAR HUELLA <span>·</span> UNA FRAGANCIA, MIL HISTORIAS</div>
    <header class="header shell">
      <NuxtLink class="brand-link" to="/"><BrandMark :name="store.name" /></NuxtLink>
      <nav aria-label="Principal">
        <NuxtLink v-for="item in navigation" :key="item.label" v-slot="{ href, navigate }" :to="item.to" custom>
          <a :href="href || item.to" :class="{ 'is-current': activeCategory === item.category }" :aria-current="activeCategory === item.category ? 'page' : undefined" @click="navigate">{{ item.label }}</a>
        </NuxtLink>
      </nav>
      <div class="header-actions"><ThemeToggle /><NuxtLink to="/carrito" class="bag" aria-label="Ver bolsa de compras"><svg viewBox="0 0 24 24" width="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg><span class="bag-label">Tu bolsa</span><ClientOnly><span class="count">{{ count }}</span><template #fallback><span class="count">0</span></template></ClientOnly></NuxtLink></div>
    </header>
    <main id="main" tabindex="-1"><NuxtPage /></main>
    <footer class="footer"><div class="shell footer-grid"><div><NuxtLink class="brand-link" to="/"><BrandMark :name="store.name" /></NuxtLink><p>Lo invisible también deja huella.<br>Encuentra una fragancia que hable de ti.</p></div><div><h3>Explora</h3><NuxtLink to="/catalogo">Todos los perfumes</NuxtLink><NuxtLink to="/catalogo?category=Unisex">La colección unisex</NuxtLink></div><div><h3>A tu ritmo</h3><p>Elige tus favoritos y consulta tu pedido<br>por WhatsApp. Envío y pago a convenir.</p><NuxtLink to="/admin">Administración ↗</NuxtLink></div></div><div class="shell footer-bottom"><span>© {{ new Date().getFullYear() }} {{ store.name }} · Colombia</span><span v-if="demo">Sitio de demostración · Productos y precios ilustrativos</span><span v-else>Precios en pesos colombianos</span></div></footer>
    <FloatingActions />
  </div>
</template>
