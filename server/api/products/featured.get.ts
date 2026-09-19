import { compareProductPriority } from "#shared/catalog";

export default defineEventHandler(async () =>
  (await products()).sort(compareProductPriority).slice(0, 12),
);
