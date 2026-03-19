// ============================================================
// Ranking Page
// ============================================================
import { userStudyTotals, examCountdowns, currentUser } from '../data/mockData.js';
import { formatMinutes, getInitials, getAvatarColor } from '../utils/helpers.js';
import { renderCountdownCard } from '../components/countdown.js';

export function renderRanking() {
  const container = document.getElementById('page-container');

  let currentPeriod = 'weekly';

  function getSortedRanking(period) {
    const key = period === 'weekly' ? 'weeklyMinutes' : 'dailyMinutes';
    return [...userStudyTotals].sort((a, b) => b[key] - a[key]);
  }

  function getMinutes(user, period) {
    return period === 'weekly' ? user.weeklyMinutes : user.dailyMinutes;
  }

  function renderRankingContent(period) {
    const sorted = getSortedRanking(period);
    const top3 = sorted.slice(0, 3);
    // Podium order: 2nd, 1st, 3rd
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

    const positionClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

    return `
      <div class="card animate-slide-up">
        <div class="card-header">
          <div class="card-title">🏆 表彰台</div>
          <div class="tabs" style="max-width:240px;margin:0">
            <button class="tab ${period === 'daily' ? 'active' : ''}" data-period="daily">今日</button>
            <button class="tab ${period === 'weekly' ? 'active' : ''}" data-period="weekly">今週</button>
          </div>
        </div>
        <div class="ranking-podium">
          ${podiumOrder.map((user, displayIdx) => {
            const actualRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
            const crown = actualRank === 1 ? '👑' : '';
            const color = getAvatarColor(user.userId);
            const initials = getInitials(user.name);
            return `
              <div class="podium-item">
                <div class="podium-avatar">
                  ${crown ? `<span class="podium-crown">${crown}</span>` : ''}
                  <div class="avatar avatar-lg" style="background:${color}">${initials}</div>
                </div>
                <div class="podium-name">${user.name}</div>
                <div class="podium-time">${formatMinutes(getMinutes(user, period))}</div>
                <div class="podium-bar">${actualRank}</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card animate-slide-up" style="animation-delay:0.1s">
        <div class="card-header"><div class="card-title">📋 全体ランキング</div></div>
        <div class="ranking-table">
          ${sorted.map((user, i) => {
            const isMe = user.userId === currentUser.id;
            const color = getAvatarColor(user.userId);
            const initials = getInitials(user.name);
            return `
              <div class="ranking-row ${isMe ? 'is-me' : ''}">
                <div class="ranking-position ${positionClass(i)}">${i + 1}</div>
                <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
                <div class="ranking-user-info">
                  <div class="ranking-user-name">${user.name} ${isMe ? '<span class="badge badge-teal">あなた</span>' : ''}</div>
                </div>
                <div class="ranking-time">${formatMinutes(getMinutes(user, period))}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">ランキング</h1>
      <p class="page-subtitle">仲間の頑張りをチェックして、モチベーションを高めよう</p>
    </div>
    <div class="ranking-layout">
      <div id="ranking-main">${renderRankingContent(currentPeriod)}</div>
      <div class="countdown-section">
        <div style="font-size:var(--font-size-lg);font-weight:600;margin-bottom:var(--space-sm)">⏰ 試験カウントダウン</div>
        ${examCountdowns.length === 0 ? '<div class="card"><div class="card-body" style="color:var(--color-text-secondary);font-size:0.9rem">登録されているカウントダウンはありません</div></div>' : ''}
        ${examCountdowns.map(e => renderCountdownCard(e)).join('')}
        
        <button class="btn btn-secondary btn-sm" id="btn-add-countdown" style="margin-top:var(--space-sm);width:100%;justify-content:center">＋ 追加する</button>
        <div id="countdown-form-container" class="card animate-slide-up" style="display:none;margin-top:var(--space-sm);padding:var(--space-md);border-color:var(--color-border-focus);">
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:var(--color-accent-teal);">＋ 目標を追加</div>
          <input type="text" id="cd-title-input" placeholder="イベント名 (例: 国家試験)" style="width:100%;font-size:0.85rem;margin-bottom:8px;" />
          <input type="date" id="cd-date-input" style="width:100%;font-size:0.85rem;margin-bottom:12px;font-family:inherit;" />
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-submit-cd" style="flex:1;justify-content:center;">保存</button>
            <button class="btn btn-secondary btn-sm" id="btn-cancel-cd" style="flex:1;justify-content:center;">キャンセル</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const btnAddCd = document.getElementById('btn-add-countdown');
  const cdForm = document.getElementById('countdown-form-container');
  const btnSubmitCd = document.getElementById('btn-submit-cd');
  const btnCancelCd = document.getElementById('btn-cancel-cd');

  if (btnAddCd && cdForm) {
    btnAddCd.addEventListener('click', () => {
      btnAddCd.style.display = 'none';
      cdForm.style.display = 'block';
    });
    btnCancelCd.addEventListener('click', () => {
      cdForm.style.display = 'none';
      btnAddCd.style.display = 'flex';
      document.getElementById('cd-title-input').value = '';
      document.getElementById('cd-date-input').value = '';
    });
    btnSubmitCd.addEventListener('click', () => {
      const name = document.getElementById('cd-title-input').value.trim();
      const dateStr = document.getElementById('cd-date-input').value;
      if (!name) { alert('⚠️ イベント名を入力してください'); return; }
      if (!dateStr) { alert('⚠️ 日付を選択してください'); return; }
      
      examCountdowns.push({ id: 'cd-' + Date.now(), name, examDate: dateStr, color: '#4ECDC4' });
      alert('✅ カウントダウンを追加しました！');
      renderRanking();
    });
  }

  // Period toggle
  container.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-period]');
    if (tab) {
      currentPeriod = tab.dataset.period;
      document.getElementById('ranking-main').innerHTML = renderRankingContent(currentPeriod);
    }
  });
}
