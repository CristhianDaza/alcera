import type { CartLine, Product, Variant } from "#shared/types";
import { variantLabel } from "#shared/commerce";
export function useCart() {
  const lines = useState<CartLine[]>("cart", () => []);
  const count = computed(() => lines.value.reduce((s, l) => s + l.quantity, 0));
  const total = computed(() =>
    lines.value.reduce((s, l) => s + l.price * l.quantity, 0),
  );
  function add(product: Product, variant: Variant, quantity = 1) {
    if (!variant.available) return 0;
    const amount = Math.min(99, Math.max(1, Math.trunc(quantity) || 1));
    const line = lines.value.find(
      (l) => l.productId === product.id && l.variantId === variant.id,
    );
    const addedQuantity = line ? Math.min(amount, 99 - line.quantity) : amount;
    if (line) line.quantity += addedQuantity;
    else
      lines.value.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        size: variantLabel(variant),
        price: variant.price,
        quantity: amount,
        available: true,
        image: product.images[0]?.url ?? "",
      });
    return addedQuantity;
  }
  return { lines, count, total, add };
}
