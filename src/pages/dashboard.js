// ============================================================
// Dashboard Page
// ============================================================
import { MEDICAL_CHECKLIST, userChecklistProgress, studyLogs, activityFeed, subjectProgress } from '../data/mockData.js';
import { createRadarChart, createBarChart, createDoughnutChart } from '../components/charts.js';
import { formatMinutes } from '../utils/helpers.js';

export function renderDashboard() {
  const container = document.getElementById('page-container');

  // 統計を計算
  const totalTopics = MEDICAL_CHECKLIST.reduce((s, c) => s + c.topics.length, 0);
  const completedTopics = userChecklistProgress.filter(c => c.completed).length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const today = new Date();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7);

  const todayMinutes = studyLogs.filter(l => new Date(l.startedAt) >= todayStart).reduce((s, l) => s + l.durationMinutes, 0);
  const weekMinutes = studyLogs.filter(l => new Date(l.startedAt) >= weekStart).reduce((s, l) => s + l.durationMinutes, 0);
  const studiedSubjects = new Set(studyLogs.map(l => l.subjectId)).size;

  // カテゴリ別進捗
  const categoryProgress = MEDICAL_CHECKLIST.map(cat => {
    const total = cat.topics.length;
    const completed = userChecklistProgress.filter(ch => ch.category === cat.category && ch.completed).length;
    return { name: cat.category, color: cat.color, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  // 日別勉強時間（過去7日）
  const dailyData = [];
  const dailyLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const mins = studyLogs.filter(l => { const t = new Date(l.startedAt); return t >= dayStart && t <= dayEnd; }).reduce((s, l) => s + l.durationMinutes, 0);
    dailyData.push(mins);
    dailyLabels.push(d.toLocaleDateString('ja-JP', { weekday: 'short' }));
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">ダッシュボード</h1>
      <p class="page-subtitle">学習進捗の全体像を把握しよう</p>
    </div>

    <div class="dashboard-stats">
      <div class="stat-card animate-slide-up">
        <div class="stat-label">📊 総合進捗率</div>
        <div class="stat-value">${overallProgress}<span class="stat-unit">%</span></div>
        <div class="stat-change positive">▲ ${completedTopics}/${totalTopics} トピック完了</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.05s">
        <div class="stat-label">⏱ 今日の勉強</div>
        <div class="stat-value">${formatMinutes(todayMinutes)}</div>
        <div class="stat-change positive">▲ 集中して頑張っています</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.1s">
        <div class="stat-label">📅 今週の合計</div>
        <div class="stat-value">${formatMinutes(weekMinutes)}</div>
        <div class="stat-change positive">▲ ${Math.round(weekMinutes / 7)}分/日平均</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.15s">
        <div class="stat-label">📚 学習中の科目</div>
        <div class="stat-value">${studiedSubjects}<span class="stat-unit">科目</span></div>
        <div class="stat-change positive">▲ 今週の学習ログより</div>
      </div>
    </div>

    <div class="dashboard-charts">
      <div class="card animate-slide-up" style="animation-delay:0.2s">
        <div class="card-header">
          <div class="card-title">📊 週間学習時間</div>
        </div>
        <div class="chart-container">
          <canvas id="weeklyBarChart"></canvas>
        </div>
      </div>
      <div class="card animate-slide-up" style="animation-delay:0.25s">
        <div class="card-header">
          <div class="card-title">🎯 カテゴリ別進捗</div>
        </div>
        <div class="chart-container">
          <canvas id="categoryRadarChart"></canvas>
        </div>
      </div>
    </div>

    <div class="dashboard-bottom">
      <div class="card animate-slide-up" style="animation-delay:0.3s">
        <div class="card-header">
          <div class="card-title">📈 カテゴリ別進捗率</div>
        </div>
        <div class="category-progress-list">
          ${categoryProgress.map(c => `
            <div class="category-progress-item">
              <div class="category-progress-header">
                <span class="category-progress-name"><span class="dot" style="background:${c.color}"></span>${c.name}</span>
                <span class="category-progress-value">${c.progress}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width:${c.progress}%;background:${c.color}" data-width="${c.progress}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card animate-slide-up" style="animation-delay:0.35s">
        <div class="card-header">
          <div class="card-title">🔔 仲間のアクティビティ</div>
        </div>
        <div class="activity-list">
          ${activityFeed.map(a => `
            <div class="activity-item">
              <div class="activity-icon">${a.icon}</div>
              <div class="activity-content">
                <div class="activity-name">${a.name}</div>
                <div class="activity-action">${a.action}</div>
              </div>
              <div class="activity-time">${a.time}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    
    <div class="card animate-slide-up" style="animation-delay:0.4s;margin-top:var(--space-md);">
      <div class="card-header"><div class="card-title">✅ 日本医学会分類 履修チェックリスト</div></div>
      <div class="checklist-container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:var(--space-md);padding:var(--space-md);">
        ${MEDICAL_CHECKLIST.map(cat => `
          <div class="checklist-category" style="background:var(--color-bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);">
            <h4 style="color:${cat.color};margin-bottom:var(--space-xs);font-size:0.95rem;">${cat.category}</h4>
            <div style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:var(--space-sm);">${userChecklistProgress.filter(ch=>ch.category===cat.category&&ch.completed).length} / ${cat.topics.length} 完了</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${cat.topics.map(topic => {
                const isChecked = userChecklistProgress.some(ch => ch.category === cat.category && ch.topic === topic && ch.completed);
                return `<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;">
                  <input type="checkbox" class="med-check-item" data-cat="${cat.category}" data-topic="${topic}" ${isChecked?'checked':''}>
                  <span style="${isChecked?'text-decoration:line-through;color:var(--color-text-tertiary)':''}">${topic}</span>
                </label>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // チャートを描画
  setTimeout(() => {
    createBarChart('weeklyBarChart', dailyLabels, dailyData, '勉強時間(分)');
    createRadarChart('categoryRadarChart', categoryProgress.map(c => c.name), categoryProgress.map(c => c.progress));

    // プログレスバーアニメーション
    document.querySelectorAll('.progress-bar-fill').forEach(bar => {
      const width = bar.dataset.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.width = `${width}%`; });
    });
    
    // Checkbox event listeners
    document.querySelectorAll('.med-check-item').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const cat = e.target.dataset.cat;
        const top = e.target.dataset.topic;
        const checked = e.target.checked;
        const ex = userChecklistProgress.find(c => c.category === cat && c.topic === top);
        if (ex) ex.completed = checked;
        else userChecklistProgress.push({ category: cat, topic: top, completed: checked });
        renderDashboard(); // Re-render to update percentages
      });
    });
  }, 100);
}
