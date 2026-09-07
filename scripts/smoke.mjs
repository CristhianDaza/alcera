import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
const base=process.env.BASE_URL || 'http://127.0.0.1:3000'
for (const path of ['/','/catalogo','/perfumes/bruma-dorada','/sitemap.xml','/robots.txt']) { const r=await fetch(base+path); assert.equal(r.status,200,path); const html=await r.text(); if(path==='/perfumes/bruma-dorada') { assert.match(html,/application\/ld\+json/); assert.match(html,/Bruma Dorada/); assert.match(html,/rel="canonical"/) } }
assert.equal((await fetch(base+'/api/products/missing')).status,404)
for (const [path,method] of [['products','GET'],['products','POST'],['settings','PUT'],['upload','POST']]) assert.equal((await fetch(`${base}/api/admin/${path}`,{method})).status,401)
const browser=await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? { channel:process.env.BROWSER_CHANNEL } : {})})
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  const page=await browser.newPage({viewport}), errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base); await page.waitForLoadState('networkidle')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`../../work/home-${viewport.width}.png`,fullPage:true})
  await page.goto(base+'/catalogo'); await page.waitForLoadState('networkidle'); await page.getByPlaceholder('Nombre o marca…').fill('Bruma')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await page.locator('.product-card').click(); await page.getByRole('button',{name:'Añadir a mi bolsa'}).click()
  await page.getByRole('link',{name:'Ver bolsa ↗',exact:true}).click()
  await page.locator('.cart-row').waitFor(); await page.waitForLoadState('networkidle')
  await page.reload(); await page.locator('.cart-row').waitFor()
  assert.equal(await page.locator('.cart-row').count(),1)
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  await page.getByRole('status').filter({hasText:'WhatsApp configurado'}).waitFor()
  const changedProducts=await (await fetch(base+'/api/products')).json()
  changedProducts[0].variants[0].price=300000
  await page.route('**/api/products',route=>route.fulfill({json:changedProducts}))
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  await page.getByRole('status').filter({hasText:'Actualizamos'}).waitFor()
  changedProducts[0].variants[0].available=false
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  await page.getByText('Agotado o retirado del catálogo').waitFor()
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  await page.getByRole('status').filter({hasText:'Retira las presentaciones'}).waitFor()
  changedProducts[0].variants[0].available=true
  await page.route('**/api/settings',route=>route.fulfill({json:{name:'Tienda de prueba',whatsapp:'573000000000'}}))
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  await page.getByRole('status').filter({hasText:'Actualizamos'}).waitFor()
  await page.getByRole('button',{name:'Preparar consulta por WhatsApp'}).click()
  const link=page.getByRole('link',{name:'Abrir WhatsApp'})
  await expect(link).toBeVisible()
  assert.match(decodeURIComponent(await link.getAttribute('href')),/Subtotal:/)
  // Solo inspecciona el enlace; nunca abre ni envía mensajes.
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.deepEqual(errors,[])
  await page.close()
 }
 console.log('PASS: SSR, SEO, 404, protección API, filtros, persistencia, cambios de precio, agotados, enlace WhatsApp y vistas móvil/escritorio.')
} finally {await browser.close()}
