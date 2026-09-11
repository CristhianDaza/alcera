export default defineEventHandler(async () =>
  (await products())
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 12),
);
