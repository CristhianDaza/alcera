import type { Product, Variant } from "./types";

export type MetaContentLine = {
  product: Product;
  variant: Variant;
  quantity: number;
};

export type MetaContent = {
  content_ids: string[];
  contents: { id: string; quantity: number; item_price: number }[];
  content_type: "product";
  value: number;
  currency: "COP";
  num_items: number;
};

export function buildMetaContentFromItems(
  lines: { id: string; price: number; quantity: number }[],
): MetaContent {
  const contents = lines
    .filter(
      (line) =>
        Boolean(line.id) &&
        Number.isSafeInteger(line.price) &&
        line.price >= 0 &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0,
    )
    .map((line) => ({
      id: line.id,
      quantity: line.quantity,
      item_price: line.price,
    }));
  return {
    content_ids: [...new Set(contents.map((item) => item.id))],
    contents,
    content_type: "product",
    value: contents.reduce(
      (sum, item) => sum + item.item_price * item.quantity,
      0,
    ),
    currency: "COP",
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/** Uses the stable presentation/variant ID as the Meta catalog item ID. */
export function buildMetaContent(lines: MetaContentLine[]): MetaContent {
  const validLines = lines
    .filter(
      ({ product, variant, quantity }) =>
        product.variants.some((item) => item.id === variant.id) &&
        Number.isInteger(quantity) &&
        quantity > 0,
    )
    .map(({ variant, quantity }) => ({
      id: variant.id,
      price: variant.price,
      quantity,
    }));
  return buildMetaContentFromItems(validLines);
}

export function isMetaPixelAllowed(
  consentAccepted: boolean,
  production: boolean,
  demo: boolean,
  pixelId: string,
) {
  return consentAccepted && production && !demo && /^\d{5,20}$/.test(pixelId);
}
