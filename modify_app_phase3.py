import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update trend data structure
trend_data_target = """  const trendData = [];
  for (let i = 0; i < dateRange.length; i++) {"""
trend_data_replacement = """  const trendData = [];
  const trendDataCBT = [];
  const trendDataExam = [];
  const trendDataAssig = [];
  const trendDataOther = [];
  for (let i = 0; i < dateRange.length; i++) {"""
content = content.replace(trend_data_target, trend_data_replacement, 1)

# 2. Update daily data pushing
trend_push_target = """    const dayLogs = logs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    trendData.push(dayLogs.reduce((s, l) => s + l.duration_minutes, 0));
  }"""
trend_push_replacement = """    const dayLogs = logs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    trendData.push(dayLogs.reduce((s, l) => s + l.duration_minutes, 0));
    trendDataCBT.push(dayLogs.filter(l => l.study_purpose==='cbt').reduce((s, l) => s + l.duration_minutes, 0));
    trendDataExam.push(dayLogs.filter(l => l.study_purpose==='regular_exam').reduce((s, l) => s + l.duration_minutes, 0));
    trendDataAssig.push(dayLogs.filter(l => l.study_purpose==='assignment').reduce((s, l) => s + l.duration_minutes, 0));
    trendDataOther.push(dayLogs.filter(l => (l.study_purpose||'other')==='other').reduce((s, l) => s + l.duration_minutes, 0));
  }"""
content = content.replace(trend_push_target, trend_push_replacement, 1)

# 3. Update B-3 Best Environment
b3_target = """  // B-3: Best focus environment (location x timeSlot)
  const envMap = {};
  last30Logs.forEach(l => {
    if (!l.focus_level) return;
    const loc = l.location || '未設定';
    const h = new Date(l.started_at).getHours();
    const slot = getTimeSlotLabel(getTimeSlotForHour(h));
    const key = `${loc} × ${slot}`;
    if (!envMap[key]) envMap[key] = { sum: 0, count: 0 };
    envMap[key].sum += Number(l.focus_level);
    envMap[key].count++;
  });
  const bestEnvs = Object.entries(envMap).filter(([, v]) => v.count >= 3).map(([k, v]) => ({ name: k, avg: (v.sum / v.count).toFixed(1), count: v.count })).sort((a, b) => b.avg - a.avg);"""
b3_replacement = """  // B-3: Best focus environment (location x timeSlot x purpose)
  const envMap = {};
  last30Logs.forEach(l => {
    if (!l.focus_level) return;
    const loc = l.location || '未設定';
    const h = new Date(l.started_at).getHours();
    const slot = getTimeSlotLabel(getTimeSlotForHour(h));
    const purpose = l.study_purpose || 'other';
    const purposeLabel = purpose === 'cbt' ? 'CBT' : purpose === 'regular_exam' ? '定期試験' : purpose === 'assignment' ? '課題' : 'その他';
    const key = `${purposeLabel}の${loc} (${slot})`;
    if (!envMap[key]) envMap[key] = { sum: 0, count: 0 };
    envMap[key].sum += Number(l.focus_level);
    envMap[key].count++;
  });
  const bestEnvs = Object.entries(envMap).filter(([, v]) => v.count >= 2).map(([k, v]) => ({ name: k, avg: (v.sum / v.count).toFixed(1), count: v.count })).sort((a, b) => b.avg - a.avg);"""
content = content.replace(b3_target, b3_replacement, 1)

# 4. Insert Performance & Balance before HTML assembly
html_start_target = """  // --- Assemble HTML ---"""
html_start_replacement = """  // Phase 3: Performance & Balance
  const purposeStats = {};
  logs.forEach(l => {
    const p = l.study_purpose || 'other';
    if (!purposeStats[p]) purposeStats[p] = { dur: 0, focSum: 0, count: 0 };
    purposeStats[p].dur += l.duration_minutes;
    purposeStats[p].focSum += Number(l.focus_level || 0);
    purposeStats[p].count++;
  });
  const purposeLabels = { cbt: 'CBT', regular_exam: '定期試験', assignment: '課題', other: 'その他' };
  
  let balanceAlertHtml = '';
  const totalBalanceDur = Object.values(purposeStats).reduce((s, v) => s + v.dur, 0);
  if (totalBalanceDur > 0) {
    const cbtDur = purposeStats['cbt'] ? purposeStats['cbt'].dur : 0;
    const cbtRatio = cbtDur / totalBalanceDur;
    if (cbtRatio < 0.1 && (insightFilters.preset === 'all' || insightFilters.preset === 'month')) {
      balanceAlertHtml = `<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); color:#fcd34d; padding:12px; border-radius:8px; margin-top:12px; font-size:0.85rem; display:flex; align-items:center; gap:8px;">${IC.warn} CBTの学習比率が10%未満です。計画を見直してみましょう。</div>`;
    }
  }

  const performanceHtml = Object.entries(purposeStats).map(([p, stat]) => {
    if(stat.count === 0) return '';
    const avgFoc = (stat.focSum / stat.count).toFixed(1);
    const avgDur = Math.round(stat.dur / stat.count);
    return `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9rem;">
      <span style="color:var(--color-text-secondary)">${purposeLabels[p] || p}</span>
      <span>平均 ${avgDur}分 / ${avgFoc}★</span>
    </div>`;
  }).join('');

  // --- Assemble HTML ---"""
content = content.replace(html_start_target, html_start_replacement, 1)

# 5. Inject Performance and Balance charts into HTML
html_inject_target = """      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-pink)">${insightIcons.list}</div>
          <div><div class="section-title">セッション一覧</div><div class="section-subtitle">${sessionCount}件</div></div>
        </div>"""
html_inject_replacement = """      <div class="card">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${IC.chart}</div>
          <div><div class="section-title">学習バランスとパフォーマンス</div><div class="section-subtitle">目的別の内訳</div></div>
        </div>
        <div style="margin-top:16px;">
          ${performanceHtml || '<div style="color:var(--color-text-tertiary); font-size:0.9rem;">データがありません</div>'}
          ${balanceAlertHtml}
        </div>
        <div style="margin-top:24px; position:relative; height:200px;">
          <canvas id="insightBalanceChart"></canvas>
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-pink)">${insightIcons.list}</div>
          <div><div class="section-title">セッション一覧</div><div class="section-subtitle">${sessionCount}件</div></div>
        </div>"""
content = content.replace(html_inject_target, html_inject_replacement, 1)

# 6. Initialize Stacked Bar Chart
chart_init_target = """        chartInstances['insightTrendChart'] = new Chart(ctx, {"""
chart_init_replacement = """        const balCtx = document.getElementById('insightBalanceChart');
        if (balCtx) {
          chartInstances['insightBalanceChart'] = new Chart(balCtx, {
            type: 'bar',
            data: { 
              labels: trendLabels, 
              datasets: [
                { label: 'CBT', data: trendDataCBT, backgroundColor: '#4ECDC4' },
                { label: '定期試験', data: trendDataExam, backgroundColor: '#F1948A' },
                { label: '課題', data: trendDataAssig, backgroundColor: '#45B7D1' },
                { label: 'その他', data: trendDataOther, backgroundColor: '#94a3b8' }
              ]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
                y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { font: { size: 9 } } }
              },
              plugins: { 
                legend: { display: true, labels: { color: '#94a3b8', font: { size: 10 } } }, 
                tooltip: { backgroundColor: '#1a2332', titleColor: '#f0f4f8', bodyColor: '#94a3b8' } 
              },
              animation: { duration: 800, easing: 'easeOutQuart' }
            }
          });
        }

        chartInstances['insightTrendChart'] = new Chart(ctx, {"""
content = content.replace(chart_init_target, chart_init_replacement, 1)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 3 replacements done.")
