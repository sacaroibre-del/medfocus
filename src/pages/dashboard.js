// ============================================================
// Dashboard Page
// ============================================================
import { CBT_CHECKLIST, KOKUSHI_CHECKLIST, userChecklistProgress, studyLogs, activityFeed, subjectProgress } from '../data/mockData.js';
import { createRadarChart, createBarChart, createDoughnutChart } from '../components/charts.js';
import { formatMinutes } from '../utils/helpers.js';

export function renderDashboard() {
  const container = document.getElementById('page-container');

  // 統計を計算
  const totalCBT = CBT_CHECKLIST.reduce((s, c) => s + c.topics.length, 0);
  const totalKoku = KOKUSHI_CHECKLIST.reduce((s, c) => s + c.topics.length, 0);
  const totalTopics = totalCBT + totalKoku;
  const completedTopics = userChecklistProgress.filter(c => c.completed).length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const today = new Date();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7);

  const todayMinutes = studyLogs.filter(l => new Date(l.startedAt) >= todayStart).reduce((s, l) => s + l.durationMinutes, 0);
  const weekMinutes = studyLogs.filter(l => new Date(l.startedAt) >= weekStart).reduce((s, l) => s + l.durationMinutes, 0);
  const studiedSubjects = new Set(studyLogs.map(l => l.subjectId)).size;

  // カテゴリ別進捗 (8つの極に集計)
  const buckets = ["基礎医学", "内科系", "外科系", "産婦人科", "小児科", "精神科", "社会医学", "救急科"];
  const bucketProgress = buckets.map(name => {
    const relevant = [...CBT_CHECKLIST, ...KOKUSHI_CHECKLIST].filter(c => c.category.startsWith(name));
    const total = relevant.reduce((s, c) => s + c.topics.length, 0);
    const comp = relevant.reduce((s, c) => s + userChecklistProgress.filter(ch => ch.category === c.category && ch.completed).length, 0);
    return { name, progress: total > 0 ? Math.round((comp / total) * 100) : 0, color: relevant[0]?.color || '#94a3b8' };
  });

  // ストリーク計算
  let streak = 0;
  const studyDates = new Set(studyLogs.map(l => new Date(l.startedAt).toLocaleDateString()));
  let d = new Date(today);
  while(studyDates.has(d.toLocaleDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
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
        <div class="stat-label">🔥 連続学習日数</div>
        <div class="stat-value">${streak}<span class="stat-unit">日</span></div>
        <div class="stat-change positive">▲ 継続は力なり！</div>
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
          <div class="card-title">🎯 カテゴリ別進捗 (8分野)</div>
        </div>
        <div class="chart-container">
          <canvas id="categoryRadarChart"></canvas>
        </div>
      </div>
    </div>

    <div class="dashboard-bottom">
      <div class="card animate-slide-up" style="animation-delay:0.3s">
        <div class="card-header">
          <div class="card-title">📈 分野別達成度</div>
        </div>
        <div class="category-progress-list">
          ${bucketProgress.map(c => `
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
  `;

  // 日別勉強時間（過去7日）の集計
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

  // チャートを描画
  setTimeout(() => {
    createBarChart('weeklyBarChart', dailyLabels, dailyData, '勉強時間(分)');
    createRadarChart('categoryRadarChart', bucketProgress.map(p => p.name), bucketProgress.map(p => p.progress));

    // プログレスバーアニメーション
    document.querySelectorAll('.progress-bar-fill').forEach(bar => {
      const width = bar.dataset.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.width = `${width}%`; });
    });
  }, 100);
}
