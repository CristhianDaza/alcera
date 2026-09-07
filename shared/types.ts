export interface Variant { id: string; size: string; price: number; available: boolean }
export interface ProductImage { publicId: string; url: string; alt: string }
export interface OlfactoryPyramid { top: string[]; heart: string[]; base: string[] }
export interface Product {
  id: string; slug: string; name: string; brand: string; description: string; category: string; family?: string; notes: string[]
  olfactoryPyramid?: OlfactoryPyramid
  aromaDescription?: string
  idealFor?: string[]
  duration?: string
  projection?: string
  concentration?: string
  images: ProductImage[]; variants: Variant[]; status: 'draft' | 'published'; featured: boolean
}
export interface Settings { name: string; whatsapp: string }
export interface CartLine { productId: string; variantId: string; name: string; size: string; price: number; quantity: number; available: boolean; image: string }
