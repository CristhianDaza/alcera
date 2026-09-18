import type { Product, Variant } from "./types";

export function isDecantVariant(variant: Variant) {
  return variant.type === "decant";
}

export function productHasDecants(product: Product, onlyAvailable = false) {
  return product.variants.some(
    (variant) =>
      isDecantVariant(variant) && (!onlyAvailable || variant.available),
  );
}

/** Variantes que representan el producto principal en el catálogo general. */
export function catalogVariants(product: Product) {
  const bottles = product.variants.filter(
    (variant) => !isDecantVariant(variant),
  );
  return bottles.length ? bottles : product.variants;
}

export function selectRelatedProducts(catalog: Product[], product: Product) {
  const otherProducts = catalog.filter((item) => item.id !== product.id);
  const sameBrand = otherProducts
    .filter((item) => item.brand === product.brand)
    .slice(0, 4);
  const selectedIds = new Set(sameBrand.map((item) => item.id));
  const sameFamily = otherProducts
    .filter(
      (item) =>
        !selectedIds.has(item.id) &&
        item.family?.some((family) => product.family?.includes(family)),
    )
    .slice(0, 4);

  return [...sameBrand, ...sameFamily];
}
