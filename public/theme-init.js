(function () {
  var theme;
  try { theme = localStorage.getItem('esencia-theme'); } catch (_) {}
  if (theme !== 'light' && theme !== 'dark') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#1d1513' : '#f8f2e9';
})();
