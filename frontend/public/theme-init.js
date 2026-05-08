(function () {
  try {
    var stored = localStorage.getItem('sd.theme');
    var isDark =
      stored === 'dark' ||
      (stored !== 'light' &&
        typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {
    // Storage may be unavailable (privacy mode); fall back to system default at first paint.
  }
})();
