(function () {
  // Mark the active sidebar link based on the current page URL.
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === path || (href === '/' && (path === '/' || path === '/index.html'))) {
      link.classList.add('active');
    }
  });

  // Hamburger menu (mobile only — button is hidden via CSS on desktop).
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Overlay backdrop
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // Hamburger button
  const btn = document.createElement('button');
  btn.className = 'hamburger-btn';
  btn.setAttribute('aria-label', 'Open menu');
  btn.innerHTML = '<span></span>';
  document.body.appendChild(btn);

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  btn.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', closeSidebar);
  });
})();
