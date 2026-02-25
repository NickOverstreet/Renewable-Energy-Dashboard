// Marks the active sidebar link based on the current page URL.
(function () {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === path || (href === '/' && (path === '/' || path === '/index.html'))) {
      link.classList.add('active');
    }
  });
})();
