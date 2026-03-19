// ============================================================
// Study Timer Page
// ============================================================
import { subjectCategories, studyLogs, CBT_CHECKLIST, KOKUSHI_CHECKLIST, userChecklistProgress } from '../data/mockData.js';
import { startStopwatch, pauseStopwatch, resetStopwatch, formatStopwatchTime, getStopwatchState } from '../components/stopwatch.js';
import { createBarChart } from '../components/charts.js';
import { formatMinutes } from '../utils/helpers.js';

export function renderStudy() {
  const container = document.getElementById('page-container');
  const state = getStopwatchState();

  // 全科目一覧
  const allSubjects = subjectCategories.flatMap(c => c.subjects.map(s => ({ ...s, category: c.name })));

  // 過去7日のログをグループ化
  const today = new Date();
  const logsByDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const dayLogs = studyLogs.filter(l => { const t = new Date(l.startedAt); return t >= dayStart && t <= dayEnd; });
    logsByDay[key] = dayLogs;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">学習タイマー</h1>
      <p class="page-subtitle">集中して勉強時間を記録しよう</p>
    </div>

    <div class="study-layout">
      <div class="stopwatch-card card animate-slide-up">
        <svg width="0" height="0"><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ECDC4"/><stop offset="100%" stop-color="#45B7D1"/></linearGradient></defs></svg>
        <div class="stopwatch-subject-selector">
          <select id="study-subject">
            <option value="">-- 科目を選択 --</option>
            ${subjectCategories.map(c => `
              <optgroup label="${c.name}">
                ${c.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </optgroup>
            `).join('')}
          </select>
        </div>

        <div class="stopwatch-display">
          <div class="stopwatch-ring">
            <svg viewBox="0 0 300 300">
              <circle class="ring-bg" cx="150" cy="150" r="140"/>
              <circle class="ring-progress" id="timer-ring" cx="150" cy="150" r="140"/>
            </svg>
            <div class="stopwatch-time" id="timer-display">${formatStopwatchTime(state.elapsedSeconds)}</div>
          </div>
        </div>

        <div class="stopwatch-controls">
          <button class="stopwatch-btn stopwatch-btn-reset" id="btn-reset" title="リセット">↺</button>
          <button class="stopwatch-btn ${state.isRunning ? 'stopwatch-btn-pause' : 'stopwatch-btn-start'}" id="btn-toggle" title="${state.isRunning ? '一時停止' : '開始'}">
            ${state.isRunning ? '⏸' : '▶'}
          </button>
          <button class="stopwatch-btn stopwatch-btn-stop" id="btn-save" title="保存して終了">⏹</button>
        </div>

        <div class="stopwatch-memo" style="margin-top:var(--space-md);margin-bottom:var(--space-sm);">
          <input type="text" id="study-memo" placeholder="学習の短いメモ（任意）..." style="width:100%;max-width:300px;text-align:center;" maxlength="100"/>
        </div>

        <div class="stopwatch-status ${state.isRunning ? 'recording' : ''}" id="timer-status">
          ${state.isRunning ? '<span class="status-dot"></span>記録中...' : '開始ボタンを押して勉強を始めましょう'}
        </div>
      </div>

      <div class="card animate-slide-up" style="animation-delay:0.1s">
        <div class="card-header">
          <div class="card-title">📋 最近の学習ログ</div>
        </div>
        <div class="study-log-list">
          ${Object.entries(logsByDay).map(([day, logs]) => {
            if (logs.length === 0) return '';
            const totalMins = logs.reduce((s, l) => s + l.durationMinutes, 0);
            return `
              <div class="study-log-day">
                <div class="study-log-day-header">${day} <span class="day-total">(計 ${formatMinutes(totalMins)})</span></div>
                ${logs.map(l => {
                  const subj = allSubjects.find(s => s.id === l.subjectId);
                  const time = new Date(l.startedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                  return `<div class="study-log-entry" data-id="${l.id}">
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;align-items:center;gap:var(--space-sm);">
                        <span class="study-log-subject">${subj?.name || '不明'}</span>
                        <span class="study-log-duration">${formatMinutes(l.durationMinutes)}</span>
                        <span class="study-log-time">${time}</span>
                      </div>
                      ${l.memo ? `<div class="study-log-memo" style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.memo}</div>` : ''}
                    </div>
                    <div class="study-log-actions">
                      <button class="btn-log-action edit" data-id="${l.id}" data-subject="${subj?.name || '不明'}" data-duration="${l.durationMinutes}" title="編集">✏️</button>
                      <button class="btn-log-action delete" data-id="${l.id}" title="削除">🗑️</button>
                    </div>
                  </div>`;
                }).join('')}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    
    <div class="card animate-slide-up" style="animation-delay:0.2s;margin-top:var(--space-lg);">
      <div class="card-header" style="border-bottom:1px solid rgba(148,163,184,0.1);padding-bottom:var(--space-sm);flex-wrap:wrap;gap:var(--space-sm);">
        <div class="card-title">✅ 達成度チェックリスト</div>
        <div class="filter-tabs" style="margin:0;padding:0;">
            <button class="filter-tab active" id="tab-cbt">CBT対策</button>
            <button class="filter-tab" id="tab-kokushi">国家試験対策</button>
        </div>
      </div>
      <div id="checklist-view-cbt">
        <div class="checklist-accordion">
          ${renderAccordionChecklist(CBT_CHECKLIST)}
        </div>
      </div>
      <div id="checklist-view-kokushi" style="display:none;">
        <div class="checklist-accordion">
          ${renderAccordionChecklist(KOKUSHI_CHECKLIST)}
        </div>
      </div>
    </div>
  `;

  function renderAccordionChecklist(checklistData) {
    const grouped = {};
    checklistData.forEach(item => {
      const parts = item.category.split(':');
      const major = parts[0].trim();
      const minor = parts[1] ? parts[1].trim() : major;
      if (!grouped[major]) grouped[major] = { color: item.color, chapters: [] };
      grouped[major].chapters.push({ minor, catObj: item });
    });

    return Object.entries(grouped).map(([major, data]) => {
      const totalInMajor = data.chapters.reduce((s, c) => s + c.catObj.topics.length, 0);
      const compInMajor = data.chapters.reduce((s, c) => s + userChecklistProgress.filter(ch => ch.category === c.catObj.category && ch.completed).length, 0);
      const percentMajor = totalInMajor > 0 ? Math.round((compInMajor / totalInMajor) * 100) : 0;

      return `
        <div class="accordion-item major">
          <div class="accordion-header major" style="border-left:4px solid ${data.color}">
            <span class="accordion-title">${major}</span>
            <div class="accordion-meta">
              <span class="percent-badge">${percentMajor}%</span>
              <span class="chevron-icon">⌄</span>
            </div>
          </div>
          <div class="accordion-content major">
            ${data.chapters.map(chapter => {
              const compInMinor = userChecklistProgress.filter(ch => ch.category === chapter.catObj.category && ch.completed).length;
              const totalInMinor = chapter.catObj.topics.length;
              return `
              <div class="accordion-item minor">
                <div class="accordion-header minor">
                  <span class="accordion-title">${chapter.minor}</span>
                  <div class="accordion-meta">
                    <span class="count-badge">${compInMinor}/${totalInMinor}</span>
                    <span class="chevron-icon">⌄</span>
                  </div>
                </div>
                <div class="accordion-content minor">
                  <div class="check-list">
                    ${chapter.catObj.topics.map(topic => {
                      const isComplete = userChecklistProgress.some(ch => ch.category === chapter.catObj.category && ch.item === topic && ch.completed);
                      return `
                      <label class="check-item ${isComplete ? 'completed' : ''}">
                        <input type="checkbox" class="med-check-item" 
                          data-cat="${chapter.catObj.category}" 
                          data-topic="${topic}" 
                          ${isComplete ? 'checked' : ''}>
                        <span class="check-text">${topic}</span>
                      </label>`;
                    }).join('')}
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
  }

  // Timer event handlers
  const display = document.getElementById('timer-display');
  const ring = document.getElementById('timer-ring');
  const status = document.getElementById('timer-status');
  const btnToggle = document.getElementById('btn-toggle');
  const btnReset = document.getElementById('btn-reset');
  const btnSave = document.getElementById('btn-save');
  const circumference = 2 * Math.PI * 140;

  function updateDisplay(seconds) {
    display.innerHTML = formatStopwatchTime(seconds);
    // 1時間を1周として進捗リングを描画
    const progress = (seconds % 3600) / 3600;
    ring.style.strokeDashoffset = circumference - (progress * circumference);
  }

  // 既存状態を反映
  if (state.isRunning) {
    ring.style.strokeDasharray = circumference;
    updateDisplay(state.elapsedSeconds);
    startStopwatch(updateDisplay);
  } else if (state.elapsedSeconds > 0) {
    ring.style.strokeDasharray = circumference;
    updateDisplay(state.elapsedSeconds);
  }

  btnToggle.addEventListener('click', () => {
    const s = getStopwatchState();
    ring.style.strokeDasharray = circumference;
    if (s.isRunning) {
      pauseStopwatch();
      btnToggle.className = 'stopwatch-btn stopwatch-btn-start';
      btnToggle.textContent = '▶';
      btnToggle.title = '再開';
      status.className = 'stopwatch-status';
      status.textContent = '一時停止中';
    } else {
      startStopwatch(updateDisplay);
      btnToggle.className = 'stopwatch-btn stopwatch-btn-pause';
      btnToggle.textContent = '⏸';
      btnToggle.title = '一時停止';
      status.className = 'stopwatch-status recording';
      status.innerHTML = '<span class="status-dot"></span>記録中...';
    }
  });

  btnReset.addEventListener('click', () => {
    resetStopwatch();
    display.innerHTML = formatStopwatchTime(0);
    ring.style.strokeDashoffset = circumference;
    btnToggle.className = 'stopwatch-btn stopwatch-btn-start';
    btnToggle.textContent = '▶';
    status.className = 'stopwatch-status';
    status.textContent = '開始ボタンを押して勉強を始めましょう';
  });

  btnSave.addEventListener('click', () => {
    const s = getStopwatchState();
    if (s.elapsedSeconds > 0) {
      const subjectSelect = document.getElementById('study-subject');
      const subjectId = subjectSelect.value;
      const subjectName = subjectSelect.options[subjectSelect.selectedIndex]?.text || '未選択';
      const mins = Math.ceil(s.elapsedSeconds / 60);
      const memo = document.getElementById('study-memo').value.trim();
      studyLogs.push({ id: 'log-' + Date.now(), subjectId: subjectId || 'sub-unknown', durationMinutes: mins, memo: memo || null, startedAt: new Date().toISOString() });
      alert(`✅ ${subjectName}の勉強記録を保存しました！\n勉強時間: ${formatMinutes(mins)}`);
      resetStopwatch();
      display.innerHTML = formatStopwatchTime(0);
      ring.style.strokeDashoffset = circumference;
      btnToggle.className = 'stopwatch-btn stopwatch-btn-start';
      btnToggle.textContent = '▶';
      status.className = 'stopwatch-status';
      status.textContent = '記録を保存しました 🎉';
      renderStudy();
    }
  });

  document.querySelectorAll('.btn-log-action.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('本当にこの記録を削除しますか？')) {
        const idx = studyLogs.findIndex(log => log.id === id);
        if (idx !== -1) studyLogs.splice(idx, 1);
        renderStudy();
      }
    });
  });

  document.querySelectorAll('.btn-log-action.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ds = e.currentTarget.dataset;
      const newDurStr = prompt(`【${ds.subject}】の新しい勉強時間（分）を入力してください:`, ds.duration);
      if (newDurStr !== null) {
        const dur = parseInt(newDurStr);
        if (!isNaN(dur) && dur > 0) {
          const log = studyLogs.find(log => log.id === ds.id);
          if (log) log.durationMinutes = dur;
          renderStudy();
        } else {
          alert('⚠️ 正しい分数を入力してください');
        }
      }
    });
  });

  // Tab controls
  const tabCbt = document.getElementById('tab-cbt');
  const tabKokushi = document.getElementById('tab-kokushi');
  const viewCbt = document.getElementById('checklist-view-cbt');
  const viewKokushi = document.getElementById('checklist-view-kokushi');
  
  if(window.activeChecklistTab === 'kokushi') {
    tabKokushi.classList.add('active'); tabCbt.classList.remove('active');
    viewKokushi.style.display='block'; viewCbt.style.display='none';
  }
  
  tabCbt?.addEventListener('click', () => {
    window.activeChecklistTab = 'cbt';
    tabCbt.classList.add('active'); tabKokushi.classList.remove('active');
    viewCbt.style.display='block'; viewKokushi.style.display='none';
  });
  tabKokushi?.addEventListener('click', () => {
    window.activeChecklistTab = 'kokushi';
    tabKokushi.classList.add('active'); tabCbt.classList.remove('active');
    viewKokushi.style.display='block'; viewCbt.style.display='none';
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
      renderStudy(); // Re-render to update percentages
    });
  });

  // Accordion toggles
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');
      // Close others at same level? (Optional, let's keep it simple)
      item.classList.toggle('open');
    });
  });
}
