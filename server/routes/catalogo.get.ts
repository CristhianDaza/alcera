export default defineEventHandler((event) => {
  const { search } = getRequestURL(event);
  return sendRedirect(event, `/perfumes${search}`, 301);
});
