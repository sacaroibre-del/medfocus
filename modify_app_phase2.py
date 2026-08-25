import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. insightFilters
content = content.replace(
"""  focusLevel: '',
  sessionLength: ''
};""",
"""  focusLevel: '',
  sessionLength: '',
  purpose: ''
};"""
)

# 2. resetInsightFilters
content = content.replace(
"""  insightFilters.focusLevel = '';
  insightFilters.sessionLength = '';
}""",
"""  insightFilters.focusLevel = '';
  insightFilters.sessionLength = '';
  insightFilters.purpose = '';
}"""
)

# 3. applyInsightFilters
filter_target = """  if (insightFilters.sessionLength) {"""
filter_replacement = """  if (insightFilters.purpose) {
    filtered = filtered.filter(l => (l.study_purpose || 'other') === insightFilters.purpose);
  }
  if (insightFilters.sessionLength) {"""
content = content.replace(filter_target, filter_replacement)

# 4. renderInsights UI
ui_target = """        <div class="filter-group">
          <span class="filter-label">場所</span>"""
ui_replacement = """        <div class="filter-group">
          <span class="filter-label">目的</span>
          <div class="filter-chips" id="filter-purpose-chips">
            ${[{v:'',l:'全て'},{v:'cbt',l:'CBT'},{v:'regular_exam',l:'定期試験'},{v:'assignment',l:'課題・実習'},{v:'other',l:'その他'}].map(p =>
              `<button class="filter-chip ${insightFilters.purpose===p.v?'active':''}" data-purpose="${p.v}">${p.l}</button>`
            ).join('')}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">場所</span>"""
content = content.replace(ui_target, ui_replacement, 1)

# 5. Event listener
event_target = """  // --- Event: Session length chips ---"""
event_replacement = """  // --- Event: Purpose chips ---
  document.getElementById('filter-purpose-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.purpose = chip.dataset.purpose;
    renderInsights();
  });
  // --- Event: Session length chips ---"""
content = content.replace(event_target, event_replacement)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 2 replacements done.")
