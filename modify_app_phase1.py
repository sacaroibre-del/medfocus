import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Variables
content = content.replace(
    "let selectedLocation='自宅', selectedFocusLevel=2;",
    "let selectedLocation='自宅', selectedFocusLevel=2, selectedPurpose='other';"
)

content = content.replace(
    "    selectedLocation, selectedFocusLevel,\n    cumulativeStudySeconds",
    "    selectedLocation, selectedFocusLevel, selectedPurpose,\n    cumulativeStudySeconds"
)

content = content.replace(
    "  selectedFocusLevel = state.selectedFocusLevel || 2;\n  cumulativeStudySeconds",
    "  selectedFocusLevel = state.selectedFocusLevel || 2;\n  selectedPurpose = state.selectedPurpose || 'other';\n  cumulativeStudySeconds"
)

# 2. saveStudyLog signature
content = content.replace(
    "async function saveStudyLog(subjectId, durationMinutes, memo, focusLevel = 2, location = '未設定', startedAt = null, endedAt = null, breaks = null) {",
    "async function saveStudyLog(subjectId, durationMinutes, memo, focusLevel = 2, location = '未設定', startedAt = null, endedAt = null, breaks = null, studyPurpose = 'other') {"
)

# 3. saveStudyLog payload
payload_target = """      focus_level: focusLevel,
      location: location,
      started_at: startedAt || now,"""
payload_replacement = """      focus_level: focusLevel,
      location: location,
      study_purpose: studyPurpose,
      started_at: startedAt || now,"""
content = content.replace(payload_target, payload_replacement)

# 4. Dynamic UI (around 1450)
dynamic_ui_target = """          <div class="field">
            <label>振り返りメモ</label>"""
dynamic_ui_replacement = """          <div class="field">
            <label>学習の目的</label>
            <div class="purpose-segment-control" style="display:flex; gap:8px; margin-top:4px;">
              <button type="button" class="btn ${selectedPurpose==='cbt'?'btn-primary':'btn-secondary'} purpose-btn" data-val="cbt" style="flex:1; padding:6px 0; font-size:0.85rem;">CBT</button>
              <button type="button" class="btn ${selectedPurpose==='regular_exam'?'btn-primary':'btn-secondary'} purpose-btn" data-val="regular_exam" style="flex:1; padding:6px 0; font-size:0.85rem;">定期試験</button>
              <button type="button" class="btn ${selectedPurpose==='assignment'?'btn-primary':'btn-secondary'} purpose-btn" data-val="assignment" style="flex:1; padding:6px 0; font-size:0.85rem;">課題・実習</button>
              <button type="button" class="btn ${selectedPurpose==='other'?'btn-primary':'btn-secondary'} purpose-btn" data-val="other" style="flex:1; padding:6px 0; font-size:0.85rem;">その他</button>
            </div>
          </div>
          <div class="field">
            <label>振り返りメモ</label>"""
content = content.replace(dynamic_ui_target, dynamic_ui_replacement, 1)

# 5. Dynamic UI events
dynamic_event_target = """    overlay.querySelector('#btn-discard-log-sync').onclick = () => { """
dynamic_event_replacement = """    overlay.querySelectorAll('.purpose-btn').forEach(b => {
      b.onclick = (ev) => {
        overlay.querySelectorAll('.purpose-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
        ev.target.classList.replace('btn-secondary', 'btn-primary');
        selectedPurpose = ev.target.dataset.val;
      };
    });
    overlay.querySelector('#btn-discard-log-sync').onclick = () => { """
content = content.replace(dynamic_event_target, dynamic_event_replacement, 1)

# Dynamic UI save params
dyn_save_target = """        const success = await saveStudyLog(subjVal, dur, memo, foc, loc, startedAt, endedAt, sessionBreaks);"""
dyn_save_replacement = """        saveTimerState();
        const success = await saveStudyLog(subjVal, dur, memo, foc, loc, startedAt, endedAt, sessionBreaks, selectedPurpose);"""
content = content.replace(dyn_save_target, dyn_save_replacement, 1)

# 6. Static UI (around 3138)
static_ui_target = """                <div class="field">
                  <label>振り返りメモ</label>"""
static_ui_replacement = """                <div class="field">
                  <label>学習の目的</label>
                  <div class="purpose-segment-control" style="display:flex; gap:8px; margin-top:4px;">
                    <button type="button" class="btn ${selectedPurpose==='cbt'?'btn-primary':'btn-secondary'} purpose-btn" data-val="cbt" style="flex:1; padding:6px 0; font-size:0.85rem;">CBT</button>
                    <button type="button" class="btn ${selectedPurpose==='regular_exam'?'btn-primary':'btn-secondary'} purpose-btn" data-val="regular_exam" style="flex:1; padding:6px 0; font-size:0.85rem;">定期試験</button>
                    <button type="button" class="btn ${selectedPurpose==='assignment'?'btn-primary':'btn-secondary'} purpose-btn" data-val="assignment" style="flex:1; padding:6px 0; font-size:0.85rem;">課題・実習</button>
                    <button type="button" class="btn ${selectedPurpose==='other'?'btn-primary':'btn-secondary'} purpose-btn" data-val="other" style="flex:1; padding:6px 0; font-size:0.85rem;">その他</button>
                  </div>
                </div>
                <div class="field">
                  <label>振り返りメモ</label>"""
content = content.replace(static_ui_target, static_ui_replacement, 1) # Only replace the first occurrence found after previous replacement, or rather the second one in the file. Wait, the first replace replaced the FIRST occurrence. So replacing it again without count limit is safe because the first one is already modified.

# Let's fix the static ui replacement by finding the exact one in the template string
static_event_target = """  document.getElementById('btn-confirm-save')?.addEventListener('click', async (e) => {"""
static_event_replacement = """  document.querySelectorAll('.purpose-btn').forEach(b => {
    b.addEventListener('click', (ev) => {
      document.querySelectorAll('.purpose-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
      ev.target.classList.replace('btn-secondary', 'btn-primary');
      selectedPurpose = ev.target.dataset.val;
    });
  });

  document.getElementById('btn-confirm-save')?.addEventListener('click', async (e) => {"""
content = content.replace(static_event_target, static_event_replacement, 1)

static_save_target = """      const success = await saveStudyLog(subjVal, dur, memo, focVal, locVal, startedAt, endedAt, sessionBreaks);"""
static_save_replacement = """      const success = await saveStudyLog(subjVal, dur, memo, focVal, locVal, startedAt, endedAt, sessionBreaks, selectedPurpose);"""
content = content.replace(static_save_target, static_save_replacement, 1)


with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 1 replacements done.")
