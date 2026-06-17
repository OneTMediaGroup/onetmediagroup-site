function initMobileNav() {
  const sidebar =
    document.querySelector('.admin-sidebar') ||
    document.querySelector('.supervisor-sidebar') ||
    document.querySelector('.sidebar');

  if (!sidebar) return;

  let toggle = document.getElementById('mobileNavToggle');

  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'mobileNavToggle';
    toggle.className = 'mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="mobile-nav-icon">☰</span><span class="mobile-nav-title">Menu</span>';
    document.body.insertAdjacentElement('afterbegin', toggle);
  }

  function shouldUseDrawer() {
    return window.matchMedia('(max-width: 720px), (min-width: 721px) and (max-width: 1180px) and (orientation: portrait)').matches;
  }

  function closeMenu() {
    if (!shouldUseDrawer()) return;
    sidebar.classList.add('mobile-nav-collapsed');
    document.body.classList.remove('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.mobile-nav-icon').textContent = '☰';
    toggle.querySelector('.mobile-nav-title').textContent = 'Menu';
  }

  function openMenu() {
    if (!shouldUseDrawer()) return;
    sidebar.classList.remove('mobile-nav-collapsed');
    document.body.classList.add('mobile-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.mobile-nav-icon').textContent = '×';
    toggle.querySelector('.mobile-nav-title').textContent = 'Close';
  }

  function syncMode() {
    if (shouldUseDrawer()) {
      toggle.style.display = 'flex';
      closeMenu();
    } else {
      toggle.style.display = 'none';
      sidebar.classList.remove('mobile-nav-collapsed');
      document.body.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelector('.mobile-nav-icon').textContent = '☰';
      toggle.querySelector('.mobile-nav-title').textContent = 'Menu';
    }
  }

  toggle.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!shouldUseDrawer()) return;

    const isOpen = !sidebar.classList.contains('mobile-nav-collapsed');
    if (isOpen) closeMenu();
    else openMenu();
  };

  sidebar.addEventListener('click', (event) => {
    const target = event.target.closest('a, [data-admin-tool], [data-supervisor-tool]');
    if (target && shouldUseDrawer()) {
      window.setTimeout(closeMenu, 180);
    }
  });

  window.addEventListener('resize', syncMode);
  window.addEventListener('orientationchange', () => window.setTimeout(syncMode, 250));

  syncMode();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileNav);
} else {
  initMobileNav();
}
