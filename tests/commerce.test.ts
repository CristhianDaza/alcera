import { describe, it, expect } from 'vitest'
import { reconcileCart, whatsappMessage, money } from '../shared/commerce'
import { demoProducts } from '../shared/demo'
import { productSchema, settingsSchema } from '../server/utils/validation'
const p=demoProducts[0]!, v=p.variants[0]!
const line={ productId:p.id, variantId:v.id, name:p.name, size:v.size, price:1, quantity:2, available:true, image:'' }
describe('Pedido por WhatsApp',()=>{
  it('actualiza el precio desde el catálogo sin cambiar cantidades',()=>{ const result=reconcileCart([line],demoProducts); expect(result[0]?.price).toBe(v.price); expect(result[0]?.quantity).toBe(2) })
  it('bloquea borradores y productos eliminados',()=>{ expect(reconcileCart([line],[])[0]?.available).toBe(false); expect(reconcileCart([line],[{...p,status:'draft'}])[0]?.available).toBe(false) })
  it('detecta variantes agotadas y retiradas',()=>{ expect(reconcileCart([line],[{...p,variants:[]}])[0]?.available).toBe(false); expect(reconcileCart([line],[{...p,variants:[{...v,available:false}]}])[0]?.available).toBe(false) })
  it('incluye cantidad, subtotal y condiciones en el mensaje',()=>{ const message=whatsappMessage([{...line,price:100000}],'Esencia'); expect(message).toContain('× 2'); expect(message).toContain(money(200000)); expect(message).toContain('envío y forma de pago') })
})
describe('Validación administrativa',()=>{
  const valid={...p,images:[{publicId:'esencia/photo',url:'https://res.cloudinary.com/demo/image/upload/photo.jpg',alt:'Perfume'}]}
  it('acepta un producto completo',()=>expect(productSchema.safeParse(valid).success).toBe(true))
  it('rechaza precios inválidos, slugs inseguros y variantes duplicadas',()=>{ for(const change of [{slug:'../x'},{variants:[{...v,price:-1}]},{variants:[v,v]}]) expect(productSchema.safeParse({...valid,...change}).success).toBe(false) })
  it('rechaza imágenes ajenas a Cloudinary',()=>expect(productSchema.safeParse(p).success).toBe(false))
  it('valida WhatsApp sin inventar un contacto',()=>{ expect(settingsSchema.safeParse({name:'Esencia',whatsapp:''}).success).toBe(true); expect(settingsSchema.safeParse({name:'Esencia',whatsapp:'+57 abc'}).success).toBe(false) })
})
