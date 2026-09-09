import type { Product } from "./types";

export function selectRelatedProducts(catalog: Product[], product: Product) {
  const score = (item: Product) =>
    Number(item.featured) +
    (item.category === product.category ? 4 : 0) +
    (item.family?.some((family) => product.family?.includes(family)) ? 2 : 0);

  return catalog
    .filter((item) => item.id !== product.id)
    .sort((left, right) => score(right) - score(left))
    .slice(0, 4);
}
