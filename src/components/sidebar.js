// ============================================================
// Sidebar Component
// ============================================================
import { currentUser } from '../data/mockData.js';
import { getInitials, getAvatarColor } from '../utils/helpers.js';

const navItems = [
  { route: '/', label: 'ダッシュボード', icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` },
  { route: '/study', label: '学習タイマー', icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>` },
  { route: '/community', label: '質問広場', icon: `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` },
  { route: '/ranking', label: 'ランキング', icon: `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V8a2 2 0 0 1 4 0v14"/><path d="M8 22v-4h8v4"/></svg>` },
  { route: '/settings', label: '設定', icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
];

export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const currentPath = window.location.pathname;
  const color = getAvatarColor(currentUser.id);
  const initials = getInitials(currentUser.name);

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">M</div>
        <span class="sidebar-logo-text">MedFocus</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${navItems.map(item => `
        <div class="nav-item ${currentPath === item.route ? 'active' : ''}" data-route="${item.route}">
          <div class="nav-item-icon">${item.icon}</div>
          <span>${item.label}</span>
        </div>
      `).join('')}
    </nav>
    <div class="sidebar-profile">
      <div class="sidebar-avatar" style="background: ${color}">${initials}</div>
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${currentUser.name}</div>
        <div class="sidebar-profile-role">${currentUser.university} ${currentUser.grade}年</div>
      </div>
    </div>
  `;
}
