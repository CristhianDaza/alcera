import type { Product } from "./types";

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
