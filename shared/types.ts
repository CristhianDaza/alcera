export interface Variant {
  id: string;
  size: string;
  price: number;
  available: boolean;
  /** Las variantes antiguas sin tipo se consideran frascos originales. */
  type?: "bottle" | "decant";
  /** Datos privados de operación. Las variantes antiguas inician en cero. */
  inventory?: InventorySettings;
}
export interface InventorySettings {
  stock: number;
  minimumStock: number;
  averageCost: number;
  updatedAt: string;
  /** stock: unidades; on_demand: se compra antes de confirmar; decant: se sirve de un frasco abierto. */
  mode?: "stock" | "on_demand" | "decant";
  /** Costo por cada atomizador, etiqueta y empaque de un decant. */
  decantPackagingCost?: number;
}
export interface ProductImage {
  publicId: string;
  url: string;
  alt: string;
}
export interface OlfactoryPyramid {
  top: string[];
  heart: string[];
  base: string[];
}
export const shoppingOccasions = [
  "Día a día",
  "Oficina",
  "Noche",
  "Regalo",
] as const;
export type ShoppingOccasion = (typeof shoppingOccasions)[number];
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  description: string;
  category: string;
  family?: string[];
  notes: string[];
  olfactoryPyramid?: OlfactoryPyramid;
  aromaDescription?: string;
  idealFor?: string[];
  occasions?: ShoppingOccasion[];
  duration?: string;
  projection?: string;
  concentration?: string;
  images: ProductImage[];
  variants: Variant[];
  status: "draft" | "published";
  featured: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
}
export interface Settings {
  name: string;
  contactEmail: string;
  legalName: string;
  taxId: string;
  whatsapp: string;
  whatsappEnabled: boolean;
  instagram: string;
  facebook: string;
  tiktok: string;
  telegram: string;
  telegramEnabled: boolean;
  tawkEnabled: boolean;
}
export interface CartLine {
  productId: string;
  variantId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  available: boolean;
  image: string;
}
