// ============================================================
// Simple SPA Router
// ============================================================

const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  if (currentRoute === path) return;
  window.history.pushState({}, '', path);
  renderRoute(path);
}

function renderRoute(path) {
  currentRoute = path;
  const handler = routes[path] || routes['/'];
  if (handler) {
    handler();
  }
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === path);
  });
}

export function initRouter() {
  window.addEventListener('popstate', () => {
    renderRoute(window.location.pathname);
  });

  // Handle nav clicks
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-route]');
    if (navItem) {
      e.preventDefault();
      navigate(navItem.dataset.route);
    }
  });

  renderRoute(window.location.pathname);
}
