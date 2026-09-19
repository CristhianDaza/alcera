import { productHasDecants } from "#shared/catalog";

export default defineEventHandler(async () =>
  (await products()).some((product) => productHasDecants(product, true)),
);
