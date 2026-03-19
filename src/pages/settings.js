// ============================================================
// Settings Page
// ============================================================
import { currentUser, groups, groupMembers, users } from '../data/mockData.js';
import { getInitials, getAvatarColor } from '../utils/helpers.js';

export function renderSettings() {
  const container = document.getElementById('page-container');
  const group = groups[0];
  const members = groupMembers.map(gm => {
    const user = users.find(u => u.id === gm.userId);
    return { ...gm, ...user };
  });
  const color = getAvatarColor(currentUser.id);
  const initials = getInitials(currentUser.name);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">設定</h1>
      <p class="page-subtitle">プロフィールとグループの管理</p>
    </div>

    <div class="settings-layout">
      <div class="settings-section animate-slide-up">
        <div class="settings-profile-header">
          <div class="avatar avatar-xl" style="background:${color}">${initials}</div>
          <div class="settings-profile-info">
            <h2>${currentUser.name}</h2>
            <p>${currentUser.university} ${currentUser.grade}年</p>
            <p style="color:var(--color-text-tertiary);font-size:var(--font-size-xs)">${currentUser.email}</p>
          </div>
        </div>
      </div>

      <div class="settings-section animate-slide-up" style="animation-delay:0.1s">
        <h3 class="settings-section-title">👤 プロフィール設定</h3>
        <div class="settings-form">
          <div class="settings-field">
            <label>名前</label>
            <input type="text" value="${currentUser.name}" />
          </div>
          <div class="settings-field">
            <label>メールアドレス</label>
            <input type="email" value="${currentUser.email}" />
          </div>
          <div class="settings-field">
            <label>学年</label>
            <select>
              ${[1,2,3,4,5,6].map(g => `<option ${g === currentUser.grade ? 'selected' : ''}>医学部${g}年</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary">保存する</button>
        </div>
      </div>

      <div class="settings-section animate-slide-up" style="animation-delay:0.2s">
        <h3 class="settings-section-title">👥 グループ管理 — ${group.name}</h3>
        <div style="margin-bottom:var(--space-lg)">
          <label style="display:block;font-size:var(--font-size-sm);font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-sm)">招待コード</label>
          <div class="invite-code-display">
            <span class="invite-code-value">${group.inviteCode}</span>
            <button class="btn btn-secondary btn-sm" id="copy-invite">コピー</button>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:var(--font-size-sm);font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-sm)">メンバー (${members.length}名)</label>
          <div class="member-list">
            ${members.map(m => {
              const mc = getAvatarColor(m.id);
              const mi = getInitials(m.name);
              return `
                <div class="member-item">
                  <div class="avatar avatar-sm" style="background:${mc}">${mi}</div>
                  <span class="member-name">${m.name}</span>
                  <span class="member-role">${m.role === 'admin' ? '管理者' : 'メンバー'}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('copy-invite')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(group.inviteCode);
    const btn = document.getElementById('copy-invite');
    btn.textContent = 'コピーしました！';
    setTimeout(() => { btn.textContent = 'コピー'; }, 2000);
  });
}
