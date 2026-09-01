console.log('DEBUG: app.js loaded');
// ============================================================
// MedFocus - Complete Application (No Build Tools)
// ============================================================

let supabase = null;
let SUPABASE_URL = '', SUPABASE_KEY = '';

// デモモードは実在しないユーザー(user-001)で動くため、Supabase へは一切書き込まない。
// これが無いと、実 Supabase を設定した状態でデモログインしたときに
// user_id が UUID でないまま INSERT され、毎回エラーになる。
let isDemoMode = false;
// Supabase の読み書きをして良いかの唯一の判定。以降 supabase && session の直接判定は使わない。
function hasDB() { return !!(supabase && session && !isDemoMode); }

// IDログインは <ログインID>@medfocus.app という合成アドレスで認証する。
// 実メールアドレスで登録されたアカウントはこの形式ではないため、
// login_id を持っていてもIDログインでは絶対に認証が通らない。
// （@medfocus.local は以前の世代の合成ドメイン）
const SYNTHETIC_EMAIL_DOMAINS = ['@medfocus.app', '@medfocus.local'];
function isSyntheticEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  return SYNTHETIC_EMAIL_DOMAINS.some(d => e.endsWith(d));
}
// このアカウントがIDでログインできるか（＝合成アドレスで作られたか）
function canLoginWithId() {
  return isSyntheticEmail(session && session.user && session.user.email);
}

// Initialize Supabase with storage fallback
function initSupabase() {
  const savedUrl = localStorage.getItem('medfocus-supabase-url');
  const savedKey = localStorage.getItem('medfocus-supabase-key');
  
  SUPABASE_URL = savedUrl || (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : '') || '';
  SUPABASE_KEY = savedKey || (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || '';

  try {
    console.log('DEBUG: Initializing Supabase with URL:', SUPABASE_URL ? 'PRESENT' : 'MISSING');
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project') && SUPABASE_KEY !== 'your-anon-key') {
      if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('DEBUG: Supabase client created');
      } else {
        console.warn('DEBUG: Supabase global not found (window.supabase is undefined)');
        supabase = null;
      }
    } else {
      console.log('DEBUG: Supabase bypassing (missing or placeholder config)');
      supabase = null;
    }
  } catch (e) {
    console.error('DEBUG: Supabase initialization error:', e);
    supabase = null;
  }
}
initSupabase();

console.log('DEBUG: Browser check - Safari:', /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
console.log('DEBUG: LocalStorage available:', (() => { try { localStorage.setItem('test', '1'); localStorage.removeItem('test'); return true; } catch(e) { return false; } })());

async function fetchUserProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.warn('Profile not found, creating default:', error);
    return null;
  }
  return data;
}

// ==================== STATE ====================
console.log('DEBUG: State initializing');
let session = null;
let isSignUpMode = false;
let currentRoute = '/';

// ==================== AUDIO ====================
let audioCtx = null;
function initAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}
function playBeep() {
  const isSoundEnabled = localStorage.getItem('medfocus_sound') !== 'false';
  if (!isSoundEnabled) return;
  try {
    initAudio();
    const playNote = (freq, start, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + start);
      osc.stop(audioCtx.currentTime + start + dur);
    };
    // Beep pattern: Pi-pi-piii
    playNote(1046.50, 0, 0.1); 
    playNote(1046.50, 0.15, 0.1);
    playNote(1046.50, 0.3, 0.2); 
  } catch (err) {
    console.warn('Audio play failed', err);
  }
}

// ==================== DATA ====================
const currentUser = {
  id: '', name: '未設定', email: '',
  university: '未設定', grade: 1, bio: '',
  daily_goal: 60, login_id: '' // Added login_id
};

const users = [];

// ==================== SVG ICON SYSTEM ====================
const IC = {
  // 14px inline icons for use alongside text
  _s: (path, extra='') => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;flex-shrink:0" ${extra}>${path}</svg>`,
  // 16px icons for card titles
  _m: (path, extra='') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex-shrink:0;margin-right:6px" ${extra}>${path}</svg>`,
  // Common icons
  get flame() { return this._s('<path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/>'); },
  get chart() { return this._m('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'); },
  get clock() { return this._m('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'); },
  get book() { return this._m('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'); },
  get brain() { return this._m('<path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2"/>'); },
  get target() { return this._m('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'); },
  get trophy() { return this._m('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V16.5a.5.5 0 0 0-.5-.5h-1a4 4 0 0 1-4-4V4h16v8a4 4 0 0 1-4 4h-1a.5.5 0 0 0-.5.5V22"/>'); },
  get list() { return this._m('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'); },
  get bell() { return this._m('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'); },
  get stats() { return this._m('<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>'); },
  get calendar() { return this._m('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'); },
  get shield() { return this._m('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'); },
  get users() { return this._m('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'); },
  get home() { return this._s('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'); },
  get building() { return this._s('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01"/>'); },
  get coffee() { return this._s('<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>'); },
  get school() { return this._s('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>'); },
  get train() { return this._s('<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>'); },
  get pin() { return this._s('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'); },
  get check() { return this._s('<polyline points="20 6 9 17 4 12"/>'); },
  get x() { return this._s('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'); },
  get warn() { return this._s('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'); },
  get star() { return this._s('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>'); },
  get starEmpty() { return this._s('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'); },
  get timer() { return this._s('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'); },
  get tomato() { return this._s('<circle cx="12" cy="14" r="8"/><path d="M12 6V2"/><path d="M8 6c2-2 6-2 8 0"/>'); },
  get question() { return this._s('<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'); },
  get megaphone() { return this._s('<path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'); },
  get crown() { return this._s('<path d="M2 4l3 12h14l3-12-5 4-5-4-5 4z" fill="currentColor"/>'); },
  get globe() { return this._s('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'); },
  get lock() { return this._s('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'); },
  get pdca() { return this._s('<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>'); },
};

// Location icon helper
function locIcon(name) {
  if (name === '自宅') return IC.home;
  if (name === '図書館') return IC.book;
  if (name === 'カフェ') return IC.coffee;
  if (name === '大学') return IC.school;
  if (name === '移動中') return IC.train;
  return IC.pin;
}

// ==================== FOCUS LEVEL HELPERS ====================
function focusEmoji(level) {
  const n = Number(level);
  if (n >= 4.5) return '★';
  if (n >= 3.5) return '★';
  if (n >= 2.5) return '☆';
  if (n >= 1.5) return '☆';
  return '☆';
}
function focusOptions(selected) {
  const levels = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
  const labels = {
    5: '5.0 最高の集中', 4.5: '4.5', 4: '4.0 かなり集中',
    3.5: '3.5', 3: '3.0 普通', 2.5: '2.5',
    2: '2.0 やや散漫', 1.5: '1.5', 1: '1.0 集中できず'
  };
  return levels.map(v => `<option value="${v}" ${Number(selected)==v?'selected':''}>${labels[v]}</option>`).join('');
}

// ==================== GOAL MANAGEMENT ====================
// Weekly goal template: minutes per day-of-week (0=Sun, 6=Sat)
// Default: Weekdays 180min (3h), Weekends 300min (5h)
const DEFAULT_WEEKLY_GOALS = [300, 180, 180, 180, 180, 180, 300]; // Sun, Mon..Sat

function getWeeklyGoals() {
  const saved = localStorage.getItem('medfocus_weekly_goals');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return [...DEFAULT_WEEKLY_GOALS];
}

function saveWeeklyGoals(goals) {
  localStorage.setItem('medfocus_weekly_goals', JSON.stringify(goals));
  // Also sync to Supabase if logged in
  if (hasDB()) {
    supabase.from('profiles').update({ weekly_goals: JSON.stringify(goals) }).eq('id', session.user.id)
      .then(({ error }) => { if (error) console.warn('weekly_goals sync error:', error.message); });
  }
}

function getTodayGoalMinutes() {
  const today = getLogicalDate(new Date());
  const dateKey = toLocalDateKey(today);
  // Check for ad-hoc override first
  const override = localStorage.getItem('medfocus_daily_override_' + dateKey);
  if (override) return parseInt(override);
  // Fall back to weekly template
  const goals = getWeeklyGoals();
  return goals[today.getDay()];
}

// ==================== SLEEP LOG ====================
// インメモリキャッシュ（Supabase取得後にここに保持）
let cachedSleepLogs = null;

function getSleepLogs() {
  // キャッシュがあればキャッシュを返す、なければlocalStorageにフォールバック
  if (cachedSleepLogs !== null) return cachedSleepLogs;
  try { return JSON.parse(localStorage.getItem('medfocus_sleep_log') || '[]'); } catch(e) { return []; }
}

function saveSleepLogs(logs) {
  // localStorageにも書いておく（オフライン対応）
  try { localStorage.setItem('medfocus_sleep_log', JSON.stringify(logs)); } catch(e) {}
}

function getSleepLogForDate(dateKey) {
  return getSleepLogs().find(l => l.date === dateKey) || null;
}

// Supabaseから全睡眠ログを取得してキャッシュに保存
async function fetchSleepLogs() {
  if (!hasDB()) {
    // オフライン時はlocalStorageから読む
    cachedSleepLogs = null;
    return getSleepLogs();
  }
  try {
    // ① まずマイグレーション（localStorageを上書きする前に実行）
    await migrateSleepLogsToSupabase();

    // ② Supabaseから最新データを取得
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('date, wake_up, bedtime')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    if (error) throw error;

    // ③ Supabaseのデータが0件でも、既存localStorageを保護して返す
    const remoteData = data || [];
    if (remoteData.length === 0) {
      // Supabase側がまだ空 → localStorageのデータを使い続ける
      const localData = (() => { try { return JSON.parse(localStorage.getItem('medfocus_sleep_log') || '[]'); } catch(e) { return []; } })();
      cachedSleepLogs = localData;
      return cachedSleepLogs;
    }

    cachedSleepLogs = remoteData;
    // localStorageにも同期（バックアップ）
    saveSleepLogs(cachedSleepLogs);
    return cachedSleepLogs;
  } catch(e) {
    console.warn('fetchSleepLogs fallback to localStorage:', e);
    cachedSleepLogs = null;
    return getSleepLogs();
  }
}


// localStorageの既存データをSupabaseに移行（初回のみ）
async function migrateSleepLogsToSupabase() {
  const migratedKey = 'medfocus_sleep_migrated';
  if (localStorage.getItem(migratedKey)) return;
  try {
    const localLogs = JSON.parse(localStorage.getItem('medfocus_sleep_log') || '[]');
    if (localLogs.length === 0) { localStorage.setItem(migratedKey, '1'); return; }
    const upsertData = localLogs
      .filter(l => l.date)
      .map(l => ({ user_id: session.user.id, date: l.date, wake_up: l.wake_up || null, bedtime: l.bedtime || null, updated_at: new Date().toISOString() }));
    if (upsertData.length > 0) {
      const { error } = await supabase.from('sleep_logs').upsert(upsertData, { onConflict: 'user_id,date' });
      if (!error) {
        localStorage.setItem(migratedKey, '1');
        // キャッシュ更新
        const { data } = await supabase.from('sleep_logs').select('date, wake_up, bedtime').eq('user_id', session.user.id).order('date', { ascending: false });
        if (data) { cachedSleepLogs = data; saveSleepLogs(cachedSleepLogs); }
      }
    } else {
      localStorage.setItem(migratedKey, '1');
    }
  } catch(e) { console.warn('Sleep migration error:', e); }
}

// Supabaseに1件upsert（キャッシュも即時更新）
async function upsertSleepLog(dateKey, type, timeStr) {
  // キャッシュを先に更新（楽観的更新でUIを即レスポンス）
  if (cachedSleepLogs === null) cachedSleepLogs = getSleepLogs();
  let entry = cachedSleepLogs.find(l => l.date === dateKey);
  if (!entry) { entry = { date: dateKey }; cachedSleepLogs.push(entry); }
  entry[type] = timeStr;
  saveSleepLogs(cachedSleepLogs);

  if (!hasDB()) return; // オフラインは終了
  try {
    const payload = {
      user_id: session.user.id,
      date: dateKey,
      [type]: timeStr,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('sleep_logs').upsert(payload, { onConflict: 'user_id,date' });
    if (error) throw error;
  } catch(e) {
    console.warn('upsertSleepLog error (saved to localStorage only):', e);
    showToast(IC.warn + ' オフライン: 睡眠記録はローカルに保存されました');
  }
}

// 1件削除
async function deleteSleepLog(dateKey) {
  // キャッシュから削除
  if (cachedSleepLogs !== null) {
    cachedSleepLogs = cachedSleepLogs.filter(l => l.date !== dateKey);
    saveSleepLogs(cachedSleepLogs);
  } else {
    const local = getSleepLogs().filter(l => l.date !== dateKey);
    saveSleepLogs(local);
  }
  if (!hasDB()) return;
  try {
    await supabase.from('sleep_logs').delete().match({ user_id: session.user.id, date: dateKey });
  } catch(e) { console.warn('deleteSleepLog error:', e); }
}

async function recordSleepEvent(type) {
  // type: 'wake_up' or 'bedtime'
  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const logicalDate = getLogicalDate(now);
  const dateKey = toLocalDateKey(logicalDate);
  await upsertSleepLog(dateKey, type, timeStr);
  return timeStr;
}

function getSleepToggleState() {
  const logicalDate = getLogicalDate(new Date());
  const dateKey = toLocalDateKey(logicalDate);
  const entry = getSleepLogForDate(dateKey);
  
  const prevDate = new Date(logicalDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevEntry = getSleepLogForDate(toLocalDateKey(prevDate));

  // 前日が徹夜なら、今日の起床ボタンはスキップ（すでに起きているため）
  if ((!entry || !entry.wake_up) && isAllNighter(prevEntry)) {
    return 'bedtime';
  }

  if (!entry || !entry.wake_up) return 'wake_up'; // show 起床 button
  return 'bedtime'; // show 就寝 button
}

// 徹夜判定: bedtime === 'ALLNIGHTER'
function isAllNighter(entry) {
  return entry && entry.bedtime === 'ALLNIGHTER';
}


// ==================== INSIGHT ANALYSIS HELPERS ====================
function calculateCV(values) {
  if (!values || values.length === 0) return 0;
  const count = values.length;
  const sum = values.reduce((a, v) => a + v, 0);
  const mean = sum / count;
  if (mean === 0) return 0;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / count;
  return Math.sqrt(variance) / mean;
}
function getMinutesFromBase3AM(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  let total = hours * 60 + minutes;
  let offset = total - 180;
  if (offset < 0) offset += 1440;
  return offset;
}
function getTimeSlotForHour(h) {
  if (h >= 3 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}
function getTimeSlotLabel(slot) {
  if (slot === 'morning') return '朝';
  if (slot === 'afternoon') return '昼';
  if (slot === 'evening') return '夜';
  return '深夜';
}

function setTodayGoalOverride(minutes) {
  const today = getLogicalDate(new Date());
  const dateKey = toLocalDateKey(today);
  localStorage.setItem('medfocus_daily_override_' + dateKey, minutes.toString());
  // Also update existing snapshot if any
  const snapshotKey = 'medfocus_daily_snapshot_' + dateKey;
  const existingSnapshot = localStorage.getItem(snapshotKey);
  if (existingSnapshot) {
    try {
      const snap = JSON.parse(existingSnapshot);
      snap.goal_minutes = minutes;
      snap.achievement_rate = minutes > 0 ? Math.round((snap.actual_minutes / minutes) * 100) : 0;
      localStorage.setItem(snapshotKey, JSON.stringify(snap));
    } catch(e) {}
  }
  // Sync override to Supabase
  if (hasDB()) {
    const overrides = JSON.parse(localStorage.getItem('medfocus_daily_overrides_map') || '{}');
    overrides[dateKey] = minutes;
    // Keep only last 30 days
    const keys = Object.keys(overrides).sort();
    while (keys.length > 30) { delete overrides[keys.shift()]; }
    localStorage.setItem('medfocus_daily_overrides_map', JSON.stringify(overrides));
    supabase.from('profiles').update({ daily_overrides: JSON.stringify(overrides) }).eq('id', session.user.id)
      .then(({ error }) => { if (error) console.warn('daily_overrides sync error:', error.message); });
  }
}

function getGoalForDate(date) {
  const dateKey = toLocalDateKey(date);
  // Check override first (user's explicit change takes priority)
  const override = localStorage.getItem('medfocus_daily_override_' + dateKey);
  if (override) return parseInt(override);
  // Check override from synced map
  try {
    const map = JSON.parse(localStorage.getItem('medfocus_daily_overrides_map') || '{}');
    if (map[dateKey]) return parseInt(map[dateKey]);
  } catch(e) {}
  // Check snapshot (historical data)
  const snapshot = localStorage.getItem('medfocus_daily_snapshot_' + dateKey);
  if (snapshot) {
    try { return JSON.parse(snapshot).goal_minutes; } catch(e) {}
  }
  // Fall back to weekly template
  const goals = getWeeklyGoals();
  return goals[date.getDay()];
}

function saveDailySnapshot(dateKey, goalMinutes, actualMinutes) {
  const data = {
    goal_minutes: goalMinutes,
    actual_minutes: actualMinutes,
    achievement_rate: goalMinutes > 0 ? Math.round((actualMinutes / goalMinutes) * 100) : 0,
    saved_at: new Date().toISOString()
  };
  localStorage.setItem('medfocus_daily_snapshot_' + dateKey, JSON.stringify(data));
}

function getGoalRingColor(percent) {
  if (percent >= 100) return '#10b981'; // Emerald green - achieved
  if (percent >= 80) return '#ef4444';  // Red - heat
  if (percent >= 60) return '#f59e0b';  // Amber - approaching goal
  if (percent >= 30) return '#3b82f6';  // Blue - momentum
  return '#64748b';                     // Slate gray - calm start
}

let examCountdowns = []; // Array of exam countdowns

const subjectCategories = [
  {id:'cat-vol1',name:'vol.1 基礎医学',color:'#4ECDC4',subjects:[
    {id:'1A',name:'1A 細胞生物学'},{id:'1B',name:'1B 組織・解剖'},
    {id:'1C',name:'1C 生理学'},{id:'1D',name:'1D 生化学'},
    {id:'1E',name:'1E 分子生物学'},{id:'1F',name:'1F 発生'},
    {id:'1G',name:'1G 微生物'},{id:'1H',name:'1H 免疫'},
    {id:'1I',name:'1I 薬理学'},{id:'1J',name:'1J 病理学総論'}
  ]},
  {id:'cat-vol2',name:'vol.2 臨床医学',color:'#45B7D1',subjects:[
    {id:'2A',name:'2A 消化管'},{id:'2B',name:'2B 肝・胆・膵'},
    {id:'2C',name:'2C 循環器'},{id:'2D',name:'2D 代謝・内分泌'},
    {id:'2E',name:'2E 腎・泌尿器'},{id:'2F',name:'2F 免疫・膠原病'},
    {id:'2G',name:'2G 血液'},{id:'2H',name:'2H 感染症'},
    {id:'2I',name:'2I 呼吸器'},{id:'2J',name:'2J 神経'},
    {id:'2K',name:'2K 中毒'},{id:'2L',name:'2L 救急'},
    {id:'2M',name:'2M 麻酔科'},{id:'2N',name:'2N 老年医学'},
    {id:'2O',name:'2O 小児科'},{id:'2P',name:'2P 婦人科・乳腺外科'},
    {id:'2Q',name:'2Q 産科'},{id:'2R',name:'2R 眼科'},
    {id:'2S',name:'2S 耳鼻咽喉科'},{id:'2T',name:'2T 整形外科'},
    {id:'2U',name:'2U 精神科'},{id:'2V',name:'2V 皮膚科'},
    {id:'2W',name:'2W 泌尿器科'},{id:'2X',name:'2X 放射線科'}
  ]},
  {id:'cat-vol3',name:'vol.3 医学総論・公衆衛生',color:'#F1948A',subjects:[
    {id:'3A',name:'3A 症候・病態'},{id:'3B',name:'3B 診療の知識・技能'},
    {id:'3C',name:'3C 身体診察'},{id:'3D',name:'3D 公衆衛生'}
  ]},
  {id:'cat-other',name:'その他',color:'#94a3b8',subjects:[
    {id:'anki',name:'Anki'}
  ]}
];

// Subject name normalizer (fix case mismatches like 'anki' vs 'Anki')
const subjectNameMap={};
subjectCategories.forEach(c=>c.subjects.forEach(s=>{subjectNameMap[s.name.toLowerCase()]=s.name;subjectNameMap[s.id.toLowerCase()]=s.name;}));
function normalizeSubjectName(name){
  if(!name)return '未設定';
  return subjectNameMap[name.toLowerCase()]||name;
}

// ==================== ACTIVITY（活動種別） ====================
// study_purpose が「何のために」の軸なのに対し、activity は「何をしたか」の軸。
// 講義動画(インプット)と問題演習(アウトプット)を分離しないと、
// 消化ラグ・問/時間の効率・未回収の在庫といった分析が成立しない。
const ACTIVITIES = [
  { v:'video',  l:'講義動画', short:'動画', color:'#8b5cf6' },
  { v:'qb',     l:'問題演習', short:'QB',   color:'#4ECDC4' },
  { v:'anki',   l:'暗記',     short:'暗記', color:'#f59e0b' },
  { v:'review', l:'復習',     short:'復習', color:'#45B7D1' },
  { v:'other',  l:'その他',   short:'他',   color:'#94a3b8' },
];
const ACTIVITY_MAP = {};
ACTIVITIES.forEach(a => { ACTIVITY_MAP[a.v] = a; });
// 「20問中14問正解 (70%)」の表示。問題数が記録されているログにだけ付く。
// 「動画 6本」の表示。その回に見た本数が記録されているログにだけ付く。
function videoCountChip(log){
  const n = log && log.videos_watched;
  if (!Number.isFinite(Number(n)) || Number(n) <= 0) return '';
  return `<span class="qb-count-chip" style="--chip-color:#8b5cf6">動画 ${Number(n)}本</span>`;
}

function qbCountChip(log){
  const s = log && log.questions_solved;
  if (!Number.isFinite(Number(s)) || Number(s) <= 0) return '';
  const solved = Number(s);
  const correct = Number(log.questions_correct);
  if (!Number.isFinite(correct)) return `<span class="qb-count-chip">${solved}問</span>`;
  const pct = (correct / solved) * 100;
  return `<span class="qb-count-chip" style="--chip-color:${accColor(pct)}">${correct}/${solved}問 ${pct.toFixed(0)}%</span>`;
}

function activityChip(v){
  const a = ACTIVITY_MAP[v];
  if(!a) return '';
  return `<span class="activity-chip" style="--chip-color:${a.color}">${a.short}</span>`;
}
// 問題演習のときだけ出す「何問中何問正解」の入力欄。
// 記録フォームは静的版と finishSession の動的版が同時に DOM に載りうるので、
// id が衝突しないよう suffix で分ける。
// 講義動画のときだけ出す「視聴済み本数」の入力欄。
// QB の問題数が「今回解いた数」を足していくのに対し、こちらは
// 教材進捗トラッカーの視聴済み本数を上書きする（本数は通し番号で数えるため）。
function videoCountFieldsHtml(suffix){
  const show = selectedActivity === 'video';
  return `<div class="field video-count-field" id="video-count-wrap${suffix}" style="display:${show ? 'block' : 'none'}">
    <label>視聴済み本数（合計・任意）</label>
    <div class="qb-count-row">
      <input type="number" id="video-done${suffix}" min="0" step="1" placeholder="0" inputmode="numeric" />
      <span class="qb-count-sep">/</span>
      <span class="qb-count-sep" id="video-total${suffix}">--</span>
      <span class="qb-count-acc" id="video-delta${suffix}">—</span>
    </div>
    <div class="video-count-note" id="video-note${suffix}"></div>
  </div>`;
}

// 記録フォームで選ばれている科目ID。自由入力や未選択なら null。
function selectedSubjectIdForForm(suffix){
  const sel = document.getElementById('confirm-subject');
  const v = sel ? sel.value : '';
  if (!v || v === 'custom') return null;
  return subjectCategories.some(c => c.subjects.some(s => s.id === v)) ? v : null;
}

// 表示の出し分けと、現在値のプリフィル。科目や活動を変えるたびに呼ぶ。
function syncVideoCountFields(suffix){
  const wrap = document.getElementById('video-count-wrap' + suffix);
  if (!wrap) return;
  wrap.style.display = (selectedActivity === 'video') ? 'block' : 'none';
  const inp   = document.getElementById('video-done'  + suffix);
  const totEl = document.getElementById('video-total' + suffix);
  const dEl   = document.getElementById('video-delta' + suffix);
  const noteEl= document.getElementById('video-note'  + suffix);
  if (!inp || !totEl || !dEl || !noteEl) return;

  const sid = selectedSubjectIdForForm(suffix);
  if (!sid) {
    inp.value = ''; inp.disabled = true;
    totEl.textContent = '--'; dEl.textContent = '—'; dEl.style.color = '';
    noteEl.textContent = '科目を選ぶと入力できます（自由入力の科目は対象外）';
    inp.dataset.subject = ''; inp.dataset.before = '';
    return;
  }
  inp.disabled = false;
  const vp = (getVideoProgress() || {})[sid] || { done: 0, total: 0 };
  totEl.textContent = vp.total > 0 ? vp.total + '本' : '未登録';
  // 科目が変わったら、その科目の現在値を入れ直す
  if (inp.dataset.subject !== sid) {
    inp.dataset.subject = sid;
    inp.dataset.before = String(vp.done || 0);
    inp.value = String(vp.done || 0);
  }
  const before = parseInt(inp.dataset.before, 10) || 0;
  const now = parseInt(inp.value, 10);
  if (!Number.isFinite(now)) { dEl.textContent = '—'; dEl.style.color = ''; noteEl.textContent = `現在 ${before}本`; return; }
  if (vp.total > 0 && now > vp.total) {
    dEl.textContent = '登録本数を超過'; dEl.style.color = '#ef4444';
    noteEl.textContent = `現在 ${before}本 / 登録 ${vp.total}本`;
    return;
  }
  const diff = now - before;
  dEl.textContent = diff === 0 ? '±0' : (diff > 0 ? '+' + diff : String(diff));
  dEl.style.color = diff > 0 ? '#10b981' : (diff < 0 ? '#f59e0b' : 'var(--color-text-tertiary)');
  noteEl.textContent = `保存すると教材進捗を ${before} → ${now}本 に更新します`;
}

function wireVideoCountFields(root, suffix){
  const inp = (root || document).querySelector('#video-done' + suffix);
  if (inp) inp.addEventListener('input', () => syncVideoCountFields(suffix));
  const sel = (root || document).querySelector('#confirm-subject');
  if (sel) sel.addEventListener('change', () => {
    const i = document.getElementById('video-done' + suffix);
    if (i) i.dataset.subject = '';   // 科目が変わったら現在値を入れ直させる
    syncVideoCountFields(suffix);
  });
  syncVideoCountFields(suffix);
}

// 保存時に読み出す。未入力・対象外なら null。
function readVideoCount(suffix){
  const inp = document.getElementById('video-done' + suffix);
  if (selectedActivity !== 'video' || !inp || inp.disabled) return { subjectId: null, done: null, error: null };
  const sid = inp.dataset.subject || null;
  if (!sid) return { subjectId: null, done: null, error: null };
  const raw = inp.value.trim();
  if (raw === '') return { subjectId: null, done: null, error: null };
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return { subjectId: null, done: null, error: '視聴済み本数が正しくありません' };
  const vp = (getVideoProgress() || {})[sid] || { done: 0, total: 0 };
  if (vp.total > 0 && n > vp.total) return { subjectId: null, done: null, error: `視聴済み本数が登録本数(${vp.total}本)を超えています` };
  const before = vp.done || 0;
  // 終了画面は累計を上書きする方式なので、その回の本数は差分として求める。
  // 減らす修正のときは「この回に見た本数」としては意味を成さないので記録しない。
  const watched = n > before ? n - before : null;
  return { subjectId: sid, done: n, before, watched, error: null };
}

// 教材進捗の視聴済み本数を上書きする。変更がなければ何もしない。
function applyVideoCountToProgress(subjectId, done){
  if (!subjectId || !Number.isFinite(done)) return null;
  const v = getVideoProgress();
  const cur = v[subjectId] || { done: 0, total: 0 };
  if ((cur.done || 0) === done) return null;
  const before = cur.done || 0;
  v[subjectId] = { ...cur, done };
  saveVideoProgress(v);
  return { subjectId, before, after: done, total: cur.total || 0 };
}

function qbCountFieldsHtml(suffix){
  const show = selectedActivity === 'qb';
  return `<div class="field qb-count-field" id="qb-count-wrap${suffix}" style="display:${show ? 'block' : 'none'}">
    <label>解いた問題（任意）</label>
    <div class="qb-count-row">
      <input type="number" id="qb-solved${suffix}" min="0" step="1" placeholder="0" inputmode="numeric" />
      <span class="qb-count-sep">問中</span>
      <input type="number" id="qb-correct${suffix}" min="0" step="1" placeholder="0" inputmode="numeric" />
      <span class="qb-count-sep">問正解</span>
      <span class="qb-count-acc" id="qb-acc${suffix}">—</span>
    </div>
  </div>`;
}

// 入力欄の表示切替と正答率の即時表示。activity ボタンからも呼ぶ。
function syncQbCountFields(suffix){
  const wrap = document.getElementById('qb-count-wrap' + suffix);
  if (!wrap) return;
  wrap.style.display = (selectedActivity === 'qb') ? 'block' : 'none';
  const sEl = document.getElementById('qb-solved' + suffix);
  const cEl = document.getElementById('qb-correct' + suffix);
  const aEl = document.getElementById('qb-acc' + suffix);
  if (!sEl || !cEl || !aEl) return;
  const s = parseInt(sEl.value, 10);
  const c = parseInt(cEl.value, 10);
  if (!Number.isFinite(s) || s <= 0 || !Number.isFinite(c)) { aEl.textContent = '—'; aEl.style.color = ''; return; }
  // 正解数が問題数を超えていたら黙って直さず、その場で赤く知らせる
  if (c > s) { aEl.textContent = '正解数が多すぎます'; aEl.style.color = '#ef4444'; return; }
  const pct = (c / s) * 100;
  aEl.textContent = pct.toFixed(0) + '%';
  aEl.style.color = accColor(pct);
}

function wireQbCountFields(root, suffix){
  ['qb-solved', 'qb-correct'].forEach(base => {
    const el = (root || document).querySelector('#' + base + suffix);
    if (el) el.addEventListener('input', () => syncQbCountFields(suffix));
  });
  syncQbCountFields(suffix);
}

// 保存前に取り出す。未入力なら null（＝記録しない）。
function readQbCounts(suffix){
  const sEl = document.getElementById('qb-solved' + suffix);
  const cEl = document.getElementById('qb-correct' + suffix);
  if (selectedActivity !== 'qb' || !sEl || !cEl) return { solved: null, correct: null, error: null };
  const sRaw = sEl.value.trim(), cRaw = cEl.value.trim();
  if (!sRaw && !cRaw) return { solved: null, correct: null, error: null };
  const s = parseInt(sRaw, 10);
  const c = cRaw === '' ? 0 : parseInt(cRaw, 10);
  if (!Number.isFinite(s) || s < 0) return { solved: null, correct: null, error: '問題数が正しくありません' };
  if (!Number.isFinite(c) || c < 0) return { solved: null, correct: null, error: '正解数が正しくありません' };
  if (c > s) return { solved: null, correct: null, error: '正解数が問題数を超えています' };
  return { solved: s, correct: c, error: null };
}

function activitySegmentHtml(selected){
  return `<div class="activity-segment-control">${ACTIVITIES.map(a =>
    `<button type="button" class="btn ${selected===a.v?'btn-primary':'btn-secondary'} activity-btn" data-val="${a.v}">${a.l}</button>`
  ).join('')}</div>`;
}

const subjectProgress = [];
const studyLogs = [];

// ==================== THEME ====================
let isDark = localStorage.getItem('medfocus-theme') !== 'light';
function applyTheme(){
  if(isDark){ document.documentElement.classList.remove('light'); }
  else { document.documentElement.classList.add('light'); }
  
  try {
    localStorage.setItem('medfocus-theme', isDark ? 'dark' : 'light');
  } catch(e) { console.warn('localStorage not available', e); }

  // Update Chart.js defaults
  if (typeof Chart !== 'undefined') {
    const textColor = isDark ? '#94a3b8' : '#3d6380';
    const borderColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(43,181,171,0.15)';
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = borderColor;
  }
}
function toggleTheme(){ isDark = !isDark; applyTheme(); renderSidebar(); }
applyTheme();

// ==================== TOAST ====================
function showToast(msg){
  let t = document.getElementById('toast-notif');
  if(!t){ t = document.createElement('div'); t.id='toast-notif'; t.className='toast'; document.body.appendChild(t); }
  t.innerHTML = msg;
  requestAnimationFrame(()=>{ t.classList.add('show'); });
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove('show'); }, 2800);
}

// ==================== HELPERS ====================
function getLogicalDate(d) { const l=new Date(d); if(l.getHours()<3){ l.setDate(l.getDate()-1); } return l; }
function toLocalDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatMinutes(m){const h=Math.floor(m/60);const min=m%60;if(h===0)return`${min}分`;if(min===0)return`${h}時間`;return`${h}時間${min}分`;}
function daysUntil(d){return Math.max(0,Math.ceil((new Date(d)-new Date())/(1000*60*60*24)));}
function timeAgo(d){const ms=new Date()-new Date(d);const m=Math.floor(ms/60000);const h=Math.floor(ms/3600000);const dy=Math.floor(ms/86400000);if(m<1)return'たった今';if(m<60)return`${m}分前`;if(h<24)return`${h}時間前`;if(dy<7)return`${dy}日前`;return new Date(d).toLocaleDateString('ja-JP');}
function getInitials(n){if(!n)return'?';const p=n.split(' ');return p.length>=2?p[0][0]+p[1][0]:n.slice(0,2);}
const avatarColors=['#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#F7DC6F','#BB8FCE','#85C1E9','#F1948A','#82E0AA','#F0B27A','#AED6F1'];
function getAvatarColor(id){let h=0;for(let i=0;i<id.length;i++)h=id.charCodeAt(i)+((h<<5)-h);return avatarColors[Math.abs(h)%avatarColors.length];}

// ==================== CHART HELPERS ====================
const chartInstances = {};
function destroyChart(id){if(chartInstances[id]){chartInstances[id].destroy();delete chartInstances[id];}}
function destroyAllCharts(){Object.keys(chartInstances).forEach(destroyChart);}
if (typeof Chart !== 'undefined') {
  Chart.defaults.color='#94a3b8';
  Chart.defaults.borderColor='rgba(148,163,184,0.12)';
  Chart.defaults.font.family="'Inter','Noto Sans JP',sans-serif";
} else {
  console.warn('DEBUG: Chart.js not loaded. Charts will be skipped.');
}

async function fetchCountdowns() {
  if (!supabase) return;
  const cached = getCached('countdowns');
  if (cached) { examCountdowns = cached; return; }
  const { data, error } = await supabase.from('exam_countdowns').select('*').order('exam_date', { ascending: true });
  if (!error && data) { examCountdowns = data; setCache('countdowns', data); }
}

const CBT_CHECKLIST = [
  // 基礎医学
  { category: '基礎医学: 解剖学', color: '#4ECDC4', topics: ["骨格系", "筋系", "循環器系", "呼吸器系", "消化器系", "神経系", "感覚器系", "泌尿生殖器系"] },
  { category: '基礎医学: 生理学', color: '#4ECDC4', topics: ["細胞生理", "神経生理", "筋収縮", "循環生理", "呼吸生理", "腎生理・体液", "消化吸収", "内分泌・代謝", "体温調節", "感覚・特殊感覚"] },
  { category: '基礎医学: 生化学', color: '#4ECDC4', topics: ["糖代謝", "脂質代謝", "タンパク質・アミノ酸代謝", "核酸代謝", "ビタミン・補酵素", "酵素論", "エネルギー代謝（TCA・酸化的リン酸化）"] },
  { category: '基礎医学: 病理学', color: '#4ECDC4', topics: ["細胞障害・適応", "炎症", "修復・再生", "循環障害", "腫瘍総論", "感染病理", "免疫病理"] },
  { category: '基礎医学: 微生物学', color: '#4ECDC4', topics: ["細菌（グラム陽性・陰性）", "ウイルス（DNA・RNA）", "真菌・寄生虫", "消毒・滅菌", "感染防御"] },
  { category: '基礎医学: 免疫学', color: '#4ECDC4', topics: ["自然免疫", "獲得免疫", "抗原抗体反応", "アレルギー分類", "免疫不全", "自己免疫疾患"] },
  { category: '基礎医学: 薬理学', color: '#4ECDC4', topics: ["薬物動態", "薬力学", "自律神経薬", "循環器薬", "抗菌薬", "抗悪性腫瘍薬", "中枢神経薬", "内分泌・代謝薬"] },
  
  // 臨床医学（内科系）
  { category: '内科系: 循環器', color: '#45B7D1', topics: ["虚血性心疾患", "不整脈", "心不全", "弁膜症", "大動脈疾患", "高血圧", "心筋症・心膜炎"] },
  { category: '内科系: 呼吸器', color: '#45B7D1', topics: ["肺炎", "COPD", "喘息", "肺癌", "間質性肺炎", "胸膜疾患", "呼吸不全"] },
  { category: '内科系: 消化器', color: '#45B7D1', topics: ["消化管（食道・胃・腸）疾患", "肝臓疾患", "胆道系疾患", "膵臓疾患", "消化管出血", "腸閉塞・腸重積"] },
  { category: '内科系: 腎臓・泌尿器', color: '#45B7D1', topics: ["急性・慢性腎不全", "ネフローゼ・腎炎症候群", "電解質異常", "尿路感染", "腎癌・膀胱癌"] },
  { category: '内科系: 内分泌・代謝', color: '#45B7D1', topics: ["甲状腺疾患", "副腎疾患", "下垂体疾患", "糖尿病", "脂質異常症", "骨代謝疾患"] },
  { category: '内科系: 血液', color: '#45B7D1', topics: ["貧血（鉄欠乏・溶血等）", "白血病", "リンパ腫", "多発性骨髄腫", "凝固・出血疾患", "輸血"] },
  { category: '内科系: 神経', color: '#45B7D1', topics: ["脳血管障害", "変性疾患（ALS・パーキンソン等）", "認知症", "てんかん", "脱髄疾患", "末梢神経障害", "頭痛"] },
  { category: '内科系: 膠原病・免疫', color: '#45B7D1', topics: ["関節リウマチ", "SLE", "強皮症・多発筋炎", "シェーグレン", "血管炎症候群"] },
  { category: '内科系: 感染症', color: '#45B7D1', topics: ["細菌感染（敗血症等）", "ウイルス感染（HIV等）", "性感染症", "院内感染・抗菌薬適正使用"] },

  // 臨床医学（外科系）
  { category: '外科系: 外科総論', color: '#96CEB4', topics: ["術前・術後管理", "輸液・輸血", "ショック対応", "創傷・感染管理", "麻酔"] },
  { category: '外科系: 消化器外科', color: '#96CEB4', topics: ["消化器癌（胃・大腸・膵・肝）", "虫垂炎", "ヘルニア", "急性腹症"] },
  { category: '外科系: 胸部外科', color: '#96CEB4', topics: ["肺癌手術", "縦隔腫瘍", "食道外科", "心臓外科"] },
  { category: '外科系: 脳神経外科', color: '#96CEB4', topics: ["頭部外傷", "脳腫瘍", "脳血管手術", "水頭症"] },
  { category: '外科系: 整形外科', color: '#96CEB4', topics: ["骨折・脱臼", "脊椎疾患", "変形性関節症", "スポーツ傷害", "骨腫瘍"] },
  { category: '外科系: 泌尿器科', color: '#96CEB4', topics: ["前立腺癌・肥大", "腎・膀胱腫瘍", "尿路結石", "男性不妊"] },

  // 産科・婦人科
  { category: '産科・婦人科: 産科', color: '#F7DC6F', topics: ["正常妊娠・分娩", "妊娠高血圧症候群", "前置胎盤・常位胎盤早期剥離", "早産・流産", "胎児発育不全", "多胎妊娠"] },
  { category: '産科・婦人科: 婦人科', color: '#F7DC6F', topics: ["子宮癌（頸癌・体癌）", "卵巣腫瘍", "子宮内膜症", "月経異常", "更年期障害", "不妊症"] },

  // 小児科・精神科
  { category: '小児・精神: 小児科', color: '#BB8FCE', topics: ["発達・発育", "先天奇形・染色体異常", "新生児疾患", "小児感染症", "先天性心疾患", "小児腫瘍", "予防接種"] },
  { category: '小児・精神: 精神科', color: '#BB8FCE', topics: ["統合失調症", "気分障害（双極・うつ）", "不安障害", "認知症（精神科的側面）", "物質依存", "児童精神（発達障害）", "向精神薬"] },

  // 公衆衛生・社会医学
  { category: '社会医学: 公衆衛生', color: '#F1948A', topics: ["疫学（コホート・症例対照等）", "スクリーニング", "感染症法", "予防医学（一次〜三次）", "死亡統計・人口動態"] },
  { category: '社会医学: 医療制度・倫理', color: '#F1948A', topics: ["医療保険制度", "医の倫理（インフォームドコンセント等）", "医師法・医療法", "介護保険", "産業保健"] },

  // 救急・集中治療
  { category: '救急・集中: 救急総論', color: '#82E0AA', topics: ["ACLS・BLS", "外傷初期対応（JATEC）", "中毒", "熱中症・凍傷", "溺水・電撃傷"] },
  { category: '救急・集中: ICU管理', color: '#82E0AA', topics: ["人工呼吸管理", "血行動態モニタリング", "ARDS・DIC", "栄養管理", "鎮静・鎮痛"] }
];

const KOKUSHI_CHECKLIST = [
  // 基礎医学・総論
  { category: '国試基礎: 解剖・生理・生化学', color: '#4ECDC4', topics: ["体表解剖・断面像（CT/MRI読影）","神経解剖（脳神経・脊髄路）","血管走行・分布","リンパ節・リンパ流","組織像（病理との連携）","心電図・不整脈生理","肺気量・換気・拡散能","GFR・クリアランス","ホルモンフィードバック","自律神経調節","先天性代謝異常（PKU・ガラクトース血症等）","ビタミン欠乏症","微量元素","栄養評価（NRS・SGA）","輸液の組成と適応"] },
  { category: '国試基礎: 病態生理', color: '#4ECDC4', topics: ["ショックの分類と治療","DIC機序","電解質・酸塩基平衡異常","全身炎症反応（SIRS・敗血症）","腫瘍マーカーと病態"] },
  
  // 内科系（循環器・呼吸器・消化器・肝・腎）
  { category: '国試内科: 循環器・呼吸器', color: '#45B7D1', topics: ["急性冠症候群（診断・治療）","心電図判読（ST変化・ブロック等）","心不全（HFrEF・HFpEF）","弁膜症（AS・MR・MS等）","不整脈（AF・VT・WPW等）","高血圧緊急症","大動脈解離・大動脈瘤","心タンポナーデ","先天性心疾患（成人含む）","肺塞栓症","肺炎（市中・院内・非定型）","COPD（診断・増悪管理）","気管支喘息（ステップ治療）","肺癌（病型・治療選択）","間質性肺炎（UIP・NSIP等）","胸膜炎・膿胸","気胸","呼吸不全（I型・II型）","睡眠時無呼吸症候群","サルコイドーシス"] },
  { category: '国試内科: 消化器・肝・腎', color: '#45B7D1', topics: ["食道癌・食道炎","胃癌・胃潰瘍・H.pylori","炎症性腸疾患（UC・CD）","大腸癌・ポリポーシス","急性膵炎・慢性膵炎","膵癌","胆石・胆嚢炎・胆管炎","消化管出血（上部・下部）","腸閉塞・腸重積","虚血性腸疾患","ウイルス性肝炎（B・C型）","肝硬変・合併症","肝細胞癌","自己免疫性肝炎・PBC・PSC","アルコール性肝疾患","NAFLD/NASH","肝不全・肝移植適応","急性腎障害（AKI）","慢性腎臓病（CKD）・透析","ネフローゼ症候群（一次・二次）","腎炎症候群（IgA腎症等）","電解質異常（Na・K・Ca・P）","酸塩基平衡異常","腎血管性高血圧"] },
  { category: '国試内科: 代謝・血液・神経', color: '#45B7D1', topics: ["1型・2型糖尿病（診断基準・合併症・治療）","甲状腺疾患（バセドウ・橋本・癌）","副腎疾患（クッシング・アジソン・褐色細胞腫）","下垂体・視床下部疾患","副甲状腺・Ca代謝","脂質異常症・メタボリック症候群","高尿酸血症・痛風","鉄欠乏性・巨赤芽球性・溶血性貧血","再生不良性貧血・MDS","急性・慢性白血病（分類・治療）","悪性リンパ腫（ホジキン・非ホジキン）","多発性骨髄腫","凝固・出血（血友病・ITP・TTP）","輸血療法・副反応","脳梗塞・TIA（rtPA適応・二次予防）","脳出血・くも膜下出血","変性疾患（ALS・パーキンソン・MSA等）","認知症（AD・DLB・FTD・VaD）","てんかん（分類・薬物選択）","多発性硬化症・視神経脊髄炎","末梢神経障害・ギラン・バレー","髄膜炎・脳炎","頭痛（片頭痛・群発・二次性）"] },
  { category: '国試内科: 膠原病・感染症', color: '#45B7D1', topics: ["関節リウマチ（診断・生物学的製剤）","SLE（分類・臓器病変）","強皮症・多発筋炎/皮膚筋炎","シェーグレン症候群","血管炎（GPA・MPA・大動脈炎等）","抗リン脂質抗体症候群","成人Still病","敗血症・敗血症性ショック","市中・院内感染の管理","HIV/AIDS（診断・治療・日和見感染）","結核（診断・治療・接触者対応）","性感染症","マラリア・寄生虫","抗菌薬の選択と耐性（MRSA・ESBL等）","ワクチン予防可能疾患"] },

  // 外科系
  { category: '国試外科: 外科総論・消化器・胸部', color: '#96CEB4', topics: ["術前評価（心肺・肝腎機能）","周術期管理・輸液","麻酔の種類と管理","創傷治癒・感染管理","ドレーン管理","術後合併症（肺塞栓・縫合不全等）","消化管癌の術式（食道・胃・大腸・直腸）","肝・胆・膵の手術適応","急性腹症の鑑別と処置","虫垂炎・腹膜炎","ヘルニア（鼠経・腹壁等）","消化管穿孔","肺癌の病期・術式","縦隔腫瘍・胸腺腫","食道癌の集学的治療","弁膜症・CABG適応","大動脈外科（解離・瘤）"] },
  { category: '国試外科: 脳神・整形・泌尿・皮膚', color: '#96CEB4', topics: ["頭部外傷（硬膜外・硬膜下血腫）","脳腫瘍（グリオーマ・転移性）","脳動脈瘤・AVM","正常圧水頭症","腰椎・頚椎手術","骨折の分類・治療原則","脊椎疾患（椎間板・脊柱管狭窄）","変形性関節症・人工関節","関節リウマチ整形外科的治療","骨腫瘍（良性・悪性）","スポーツ傷害","腎癌・膀胱癌・前立腺癌","前立腺肥大症","尿路結石","尿路感染（腎盂腎炎・膀胱炎）","男性不妊・ED","皮膚癌（基底細胞・有棘細胞・悪性黒色腫）","熱傷（程度・面積・治療）","皮膚炎・湿疹","感染性皮膚疾患（帯状疱疹等）","乾癬・天疱瘡"] },
  { category: '国試外科: 眼科・耳鼻科', color: '#96CEB4', topics: ["緑内障・白内障・網膜疾患","眼感染症・ぶどう膜炎","難聴（伝音・感音）","めまい（メニエール・BPPVほか）","副鼻腔炎・鼻ポリープ","頭頸部癌"] },

  // 産婦人科・小児・精神
  { category: '国試産科・婦人科', color: '#F7DC6F', topics: ["正常妊娠・分娩・産褥","妊娠高血圧症候群（PIH）","前置胎盤・常位胎盤早期剥離","早産・切迫早産・流産","胎児発育不全・胎児機能不全","多胎妊娠","産科的DIC","新生児蘇生法（NCPR）","先天異常の出生前診断","妊娠中の薬物投与","子宮頸癌（HPV・検診・治療）","子宮体癌（診断・治療）","卵巣腫瘍（良性・悪性・境界）","子宮内膜症・子宮腺筋症","子宮筋腫","月経異常（無月経・月経困難症）","更年期障害・HRT","不妊症の原因と治療","性感染症（産婦人科的側面）"] },
  { category: '国試小児科', color: '#BB8FCE', topics: ["正常新生児の管理","新生児仮死・蘇生","新生児黄疸","低出生体重児の管理","発達・発育の評価","発達障害（ASD・ADHD・LD）","先天性心疾患（VSD・ASD・TOF・PDA等）","小児感染症（麻疹・風疹・水痘・手足口病等）","川崎病","小児悪性腫瘍（白血病・神経芽腫・Wilms腫瘍）","気管支喘息（小児）","1型糖尿病","染色体・先天異常症候群（ダウン等）","予防接種（定期・任意・スケジュール）","熱性痙攣・てんかん（小児）","アレルギー疾患（食物・アトピー）"] },
  { category: '国試精神科', color: '#BB8FCE', topics: ["統合失調症（陽性・陰性症状・治療）","双極性障害（I型・II型）","うつ病・持続性抑うつ","不安症・パニック症・社交不安症","強迫症・PTSD","身体症状症","摂食障害（拒食・過食）","物質使用障害（アルコール・薬物）","認知症の精神科的管理","自殺リスク評価と対応","向精神薬（抗精神病薬・抗うつ薬・気分安定薬）","電気けいれん療法（ECT）","精神科救急","精神保健福祉法（入院形態）","措置入院・医療保護入院"] },

  // 救急・社会・倫理
  { category: '国試救急・集中治療', color: '#82E0AA', topics: ["BLS・ACLS（一次・二次救命処置）","外傷初期対応（JATEC・ATLS）","多発外傷・外傷性脳損傷","急性中毒（薬物・CO・農薬等）","熱中症・低体温症","溺水・電撃傷-高山病","急性腹症の鑑別","アナフィラキシー","人工呼吸管理（設定・ウィーニング）","血行動態モニタリング","敗血症管理（バンドル）","ARDS","DIC治療","急性腎障害のICU管理","栄養管理（経腸・経静脈）","鎮痛・鎮静・せん妄（PADガイドライン）"] },
  { category: '国試社会医学・公衆衛生', color: '#F1948A', topics: ["疫学・統計","行政・法律","社会保障・保健","感染症法（1〜5類・指定感染症）","医師法・医療法・薬機法","個人情報保護・守秘義務","医療保険制度（国保・被用者保険・後期高齢）","介護保険（要介護認定・サービス）","母子保健（母子健康手帳・乳幼児健診）","がん検診・特定健診","予防医学（一次・二次・三次）","相対危険度・オッズ比・寄与危険度"] },
  { category: '国試臨床倫理・医療安全', color: '#F1948A', topics: ["インフォームドコンセント","患者の自律性・意思能力","終末期医療・ACP（事前ケア計画）","DNR・DNAR","臓器提供・脳死","安楽死・尊厳死の倫理","研究倫理（ヘルシンキ宣言）","医療事故の定義と報告","インシデントレポート","チーム医療・多職種連携","医療訴訟・過失の概念","感染管理（標準予防策・PPE）"] }
];

let checklistProgressCache = [];

async function fetchChecklists() {
  if (!hasDB()) return [];
  const cached = getCached('checklists');
  if (cached) { checklistProgressCache = cached; return cached; }
  const { data, error } = await supabase.from('user_checklist_progress').select('category, topic, completed').eq('user_id', session.user.id);
  if (!error && data) { checklistProgressCache = data; setCache('checklists', data); }
  return checklistProgressCache;
}

async function toggleChecklistItem(category, topic, checked) {
  if (!hasDB()) return;
  const ex = checklistProgressCache.find(c => c.category === category && c.topic === topic);
  if (ex) ex.completed = checked;
  else checklistProgressCache.push({ category, topic, completed: checked });
  invalidateCache('checklists');
  
  await supabase.from('user_checklist_progress').upsert({
    user_id: session.user.id, category, topic, completed: checked
  }, { onConflict: 'user_id, category, topic' });
}

async function uploadImage(file, bucket = 'avatars') {
  if (!hasDB()) return null;
  const ext = file.name.split('.').pop();
  const filePath = `${session.user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) {
    console.error('Upload error:', error);
    showToast(IC.x+' アップロードに失敗しました: ' + error.message);
    return null;
  }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

// ==================== SUPABASE DATA HELPERS ====================
// Data cache with TTL to avoid redundant network requests on navigation
const _dataCache = {};
const CACHE_TTL = 30000; // 30 seconds

function getCached(key) {
  const entry = _dataCache[key];
  if (entry && (Date.now() - entry.ts) < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  _dataCache[key] = { data, ts: Date.now() };
}
function invalidateCache(key) {
  if (key) delete _dataCache[key];
  else Object.keys(_dataCache).forEach(k => delete _dataCache[k]);
}

async function fetchStudyLogs() {
  if (!hasDB()) return [];
  const cached = getCached('study_logs');
  if (cached) return cached;
  const { data, error } = await supabase.from('study_logs').select('*').eq('user_id', session.user.id).order('started_at', { ascending: false });
  const result = error ? [] : data;
  setCache('study_logs', result);
  return result;
}

// 1セッションの演習実績を教材進捗トラッカーへ反映する。
// 科目ごとの総問題数は登録済みなので「加算」ではなく「進捗の更新」として扱い、
// その周の残りを埋めきったら、あふれた分を次の周へ繰り越す。
// 反映は保存時の1回だけ。あとからログを編集・削除しても進捗は戻さない
// （戻すと手で直した値まで巻き戻してしまい、かえって危険なため）。
function applyQbSessionToProgress(subjectId, solved, correct) {
  if (!subjectId) return null;
  const s = Number(solved);
  if (!Number.isFinite(s) || s <= 0) return null;
  // 自由入力の科目はトラッカー上の対応先が無いので触らない
  const known = subjectCategories.some(c => c.subjects.some(sub => sub.id === subjectId));
  if (!known) return null;

  const qb = getQBProgress();
  const rounds = { ...(qb[subjectId] || {}) };
  const keys = Object.keys(rounds).map(k => parseInt(k, 10))
                     .filter(Number.isFinite).sort((a, b) => a - b);
  // 繰り越し先の総数は1周目の登録値を使う。未登録なら何もしない
  const baseTotal = keys.length ? (rounds[String(keys[0])].total || 0) : 0;
  if (!baseTotal) return null;

  let remaining = s;
  let remainingCorrect = Number.isFinite(Number(correct)) ? Number(correct) : 0;
  const changes = [];
  let r = keys.length ? keys[0] : 1;
  let guard = 0;

  while (remaining > 0 && guard++ < 100) {
    const key = String(r);
    if (!rounds[key]) rounds[key] = { done: 0, total: baseTotal, correct: 0 };
    const cur = { ...rounds[key] };
    const total = cur.total || baseTotal;
    const before = cur.done || 0;
    const capacity = Math.max(0, total - before);
    if (capacity === 0) { r++; continue; }        // すでに埋まっている周は飛ばす
    const take = Math.min(remaining, capacity);
    // 正解数は投入数に比例配分。最後のまとまりで端数を吸収し、合計を入力値と一致させる
    const takeCorrect = (take === remaining)
      ? remainingCorrect
      : Math.min(take, Math.round(remainingCorrect * (take / remaining)));
    cur.done = before + take;
    cur.correct = (cur.correct || 0) + takeCorrect;
    cur.total = total;
    rounds[key] = cur;
    changes.push({ round: key, from: before, to: cur.done, total, added: take });
    remaining -= take;
    remainingCorrect -= takeCorrect;
    r++;
  }

  if (!changes.length) return null;
  qb[subjectId] = rounds;
  saveQBProgress(qb);   // ここで進捗スナップショットも更新される
  return { subjectId, changes, leftover: remaining };
}

// 何がどう動いたかをトーストで具体的に見せる（黙って書き換えない）
function describeQbChanges(result) {
  if (!result) return '';
  const name = normalizeSubjectName(result.subjectId);
  const parts = result.changes.map(c =>
    `${c.round}周目 ${c.from}→${c.to}/${c.total}問${c.to >= c.total ? '(完了)' : ''}`);
  return `${name} ${parts.join(' / ')}`;
}

async function saveStudyLog(subjectId, durationMinutes, memo, focusLevel = 2, location = '未設定', startedAt = null, endedAt = null, breaks = null, studyPurpose = 'other', activity = null, questionsSolved = null, questionsCorrect = null, videosWatched = null) {
  // 問題演習の実績を教材進捗へ反映する処理。DB の有無に関わらず同じ結果になるよう関数化する
  // （教材進捗は localStorage 主体なので、デモモードでも同じ挙動を再現できる）
  const applyQb = () => (activity === 'qb')
    ? applyQbSessionToProgress(subjectId, questionsSolved, questionsCorrect)
    : null;

  if (!hasDB()) {
    // オフライン／デモモード: 学習ログは保存しないが、教材進捗はローカルで更新する
    const applied = applyQb();
    showToast(applied
      ? IC.check + ' 記録しました（' + describeQbChanges(applied) + '）'
      : IC.check + ' 勉強記録を保存しました！（デモ）');
    return true;
  }
  try {
    const now = new Date().toISOString();
    const payload = { 
      user_id: session.user.id, 
      subject_name: subjectId, 
      duration_minutes: durationMinutes,
      memo: memo || null,
      focus_level: focusLevel,
      location: location,
      study_purpose: studyPurpose,
      activity: activity,
      questions_solved: questionsSolved,
      questions_correct: questionsCorrect,
      videos_watched: videosWatched,
      started_at: startedAt || now,
      ended_at: endedAt || now
    };
    if (breaks && breaks.length > 0) payload.breaks = JSON.stringify(breaks);
    const { error } = await supabase.from('study_logs').insert([payload]);
    if (error) {
      console.error('Supabase save error:', error);
      showToast(IC.x+' 保存に失敗しました: ' + error.message);
      return false;
    } else { 
      invalidateCache('study_logs');
      // 問題演習で問題数を記録したときは、教材進捗トラッカーも同時に進める
      const qbApplied = applyQb();
      // Save daily snapshot with current goal
      const logicalDate = getLogicalDate(new Date());
      const dateKey = toLocalDateKey(logicalDate);
      const goalForToday = getTodayGoalMinutes();
      const allLogs = await fetchStudyLogs();
      const ds = new Date(logicalDate); ds.setHours(5, 0, 0, 0);
      const de = new Date(logicalDate); de.setHours(28, 59, 59, 999);
      const todayTotal = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; }).reduce((s, l) => s + l.duration_minutes, 0);
      saveDailySnapshot(dateKey, goalForToday, todayTotal);
      showToast(qbApplied
        ? IC.check + ' 記録しました（' + describeQbChanges(qbApplied) + '）'
        : IC.check + ' 勉強記録を保存しました！');
      return true;
    }
  } catch (err) {
    console.error('saveStudyLog exception:', err);
    showToast(IC.x+' エラーが発生しました');
    return false;
  }
}

async function updateStudyLog(id, subjectName, durationMinutes, startedAt, memo, focusLevel = 2, location = '未設定', endedAt = null, activity = undefined, questionsSolved = undefined, questionsCorrect = undefined, videosWatched = undefined) {
  if (!hasDB()) return;
  // If endedAt not provided, compute from startedAt + duration
  if (!endedAt && startedAt) {
    const d = new Date(startedAt);
    d.setMinutes(d.getMinutes() + durationMinutes);
    endedAt = d.toISOString();
  }
  const payload = { 
    subject_name: subjectName, 
    duration_minutes: durationMinutes,
    started_at: startedAt,
    memo: memo || null,
    focus_level: focusLevel,
    location: location
  };
  if (activity !== undefined) payload.activity = activity;
  if (questionsSolved !== undefined) payload.questions_solved = questionsSolved;
  if (questionsCorrect !== undefined) payload.questions_correct = questionsCorrect;
  if (videosWatched !== undefined) payload.videos_watched = videosWatched;
  if (endedAt) payload.ended_at = endedAt;
  const { error } = await supabase.from('study_logs').update(payload).eq('id', id);
  if (error) showToast(IC.x+' 更新に失敗しました');
  else { invalidateCache('study_logs'); showToast(IC.check+' 記録を更新しました！'); }
}

async function deleteStudyLog(id) {
  if (!hasDB()) return;
  const { error } = await supabase.from('study_logs').delete().eq('id', id);
  if (error) showToast(IC.x+' 削除に失敗しました');
  else { invalidateCache('study_logs'); showToast(IC.check+' 記録を削除しました！'); }
}



async function saveFeedback(title, body, category, isAnonymous) {
  if (!hasDB()) {
    console.log('DEBUG: saveFeedback (local/demo mode)', { title, body, category, isAnonymous });
    showToast(' 貴重なご意見ありがとうございます！（デモ）');
    return true;
  }
  const { error } = await supabase.from('feedbacks').insert([{ 
    user_id: session.user.id, 
    title, body, category, 
    is_anonymous: isAnonymous 
  }]);
  if (error) {
    console.error('DEBUG: Supabase saveFeedback failed:', error);
    showToast(' 送信に失敗しました: ' + (error.message || 'Error'));
    return false;
  }
  showToast(' 貴重なご意見ありがとうございます！');
  return true;
}

// --- Background / Sleep Sync ---
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Force a resync of timer state based on Date.now()
    if (isRunning || isConfirmingLog) {
      loadTimerState();
    }
  }
});


if (typeof Chart !== 'undefined') {
  Chart.defaults.color='#94a3b8';
  Chart.defaults.borderColor='rgba(148,163,184,0.12)';
  Chart.defaults.font.family="'Inter','Noto Sans JP',sans-serif";
}


function createRadarChart(canvasId,labels,data){
  if (typeof Chart === 'undefined') { console.warn('DEBUG: Chart.js is not loaded, skipping radar chart'); return; }
  destroyChart(canvasId);const ctx=document.getElementById(canvasId);if(!ctx)return;
  try {
    chartInstances[canvasId]=new Chart(ctx,{type:'radar',data:{labels,datasets:[{label:'進捗率',data,
      backgroundColor:'rgba(78,205,196,0.15)',borderColor:'#4ECDC4',borderWidth:2,
      pointBackgroundColor:'#4ECDC4',pointBorderColor:'#0a0e1a',pointBorderWidth:2,pointRadius:5}]},
    options:{responsive:true,maintainAspectRatio:true,scales:{r:{beginAtZero:true,max:100,ticks:{stepSize:20,display:false},
      grid:{color:'rgba(148,163,184,0.08)'},angleLines:{color:'rgba(148,163,184,0.08)'},
      pointLabels:{font:{size:11,weight:'500'},color:'#94a3b8'}}},
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a2332',titleColor:'#f0f4f8',bodyColor:'#94a3b8',
      borderColor:'rgba(78,205,196,0.3)',borderWidth:1,cornerRadius:8,callbacks:{label:c=>`${c.raw}%`}}},
    animation:{duration:1000,easing:'easeOutQuart'}}});
  } catch(e) { console.error('DEBUG: Chart.js createRadarChart error:', e); }
}

function createBarChart(canvasId,labels,data){
  if (typeof Chart === 'undefined') { console.warn('DEBUG: Chart.js is not loaded, skipping bar chart'); return; }
  destroyChart(canvasId);const ctx=document.getElementById(canvasId);if(!ctx)return;
  try {
    chartInstances[canvasId]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'勉強時間(分)',data,
      backgroundColor:(context)=>{
        const{ctx:c,chartArea}=context.chart;if(!chartArea)return'#4ECDC4';
        const g=c.createLinearGradient(0,chartArea.bottom,0,chartArea.top);
        g.addColorStop(0,'rgba(78,205,196,0.4)');g.addColorStop(1,'rgba(69,183,209,0.8)');return g;},
      borderRadius:6,borderSkipped:false,maxBarThickness:40}]},
    options:{responsive:true,maintainAspectRatio:true,scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(148,163,184,0.06)'}}},
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a2332',titleColor:'#f0f4f8',bodyColor:'#94a3b8',borderColor:'rgba(78,205,196,0.3)',borderWidth:1,cornerRadius:8}},
    animation:{duration:800,easing:'easeOutQuart'}}});
  } catch(e) { console.error('DEBUG: Chart.js createBarChart error:', e); }
}

// ==================== STOPWATCH / TIMER ====================
let timerInterval=null, elapsedSeconds=0, isRunning=false;
let isCountdown=false, countdownSeconds=0, initialCountdownSeconds=0, isConfirmingLog=false;
let isPomodoro=false, pomodoroPhase='study', pomodoroStudySec=25*60, pomodoroBreakSec=5*60;
let isSimulation=false, simulationPhase='study';
let simulationBlockCurrent=1, simulationBlockTotal=6, simulationStudyMin=60, simulationBreakMin=10;
let pendingLogDuration=0, timerStartTime=0, baseElapsed=0, baseCountdown=0;
let selectedSubjectId='', selectedSubjectCustom='';
let selectedLocation='自宅', selectedFocusLevel=2, selectedPurpose='other', selectedActivity='qb';
let cumulativeStudySeconds=0; // New: actual study seconds accumulated in session
let sessionStartedAt=null; // ISO string: when user first started the session
let sessionBreaks=[]; // Array of {start: ISO, end: ISO} for pause periods

function saveTimerState() {
  localStorage.setItem('medfocus_timer_v2', JSON.stringify({
    isRunning, isCountdown, isPomodoro, pomodoroPhase, pomodoroStudySec, pomodoroBreakSec, elapsedSeconds, countdownSeconds,
    isSimulation, simulationPhase, simulationBlockCurrent, simulationBlockTotal, simulationStudyMin, simulationBreakMin,
    isConfirmingLog, pendingLogDuration,
    selectedSubjectId, selectedSubjectCustom,
    selectedLocation, selectedFocusLevel, selectedPurpose, selectedActivity,
    cumulativeStudySeconds,
    sessionStartedAt, sessionBreaks,
    lastUpdate: Date.now()
  }));
}

function loadTimerState() {
  const s = localStorage.getItem('medfocus_timer_v2');
  if(!s) return;
  const state = JSON.parse(s);
  isRunning = state.isRunning;
  isCountdown = state.isCountdown;
  isPomodoro = state.isPomodoro || false;
  pomodoroPhase = state.pomodoroPhase || 'study';
  pomodoroStudySec = state.pomodoroStudySec || 25 * 60;
  pomodoroBreakSec = state.pomodoroBreakSec || 5 * 60;
  isSimulation = state.isSimulation || false;
  simulationPhase = state.simulationPhase || 'study';
  simulationBlockCurrent = state.simulationBlockCurrent || 1;
  simulationBlockTotal = state.simulationBlockTotal || 6;
  simulationStudyMin = state.simulationStudyMin || 60;
  simulationBreakMin = state.simulationBreakMin || 10;
  isConfirmingLog = state.isConfirmingLog || false;
  pendingLogDuration = state.pendingLogDuration || 0;
  selectedSubjectId = state.selectedSubjectId || '';
  selectedSubjectCustom = state.selectedSubjectCustom || '';
  selectedLocation = state.selectedLocation || '自宅';
  selectedFocusLevel = state.selectedFocusLevel || 2;
  selectedPurpose = state.selectedPurpose || 'other';
  selectedActivity = state.selectedActivity || 'qb';
  cumulativeStudySeconds = state.cumulativeStudySeconds || 0;
  sessionStartedAt = state.sessionStartedAt || null;
  sessionBreaks = state.sessionBreaks || [];
  
  const delta = Math.floor((Date.now() - state.lastUpdate)/1000);
  if (isRunning) {
    elapsedSeconds = state.elapsedSeconds + delta;
    if (isCountdown) {
      countdownSeconds = Math.max(0, state.countdownSeconds - delta);
      if (countdownSeconds === 0) { isRunning = false; finishSession(); return; }
    }
    startSW(); // Resume
  } else {
    elapsedSeconds = state.elapsedSeconds;
    countdownSeconds = state.countdownSeconds;
  }
}

// ==================== PiP MINI TIMER ====================
let pipVideo = null;
let pipCanvas = null;
let pipCtx = null;
let pipStream = null;
let pipActive = false;
let pipWindow = null;

const pipThemes = [
  { id:'navy',   label:'🟦', bg:'#1e293b', text:'#f1f5f9', sub:'#cbd5e1', track:'#334155', accent:'#4ecdc4' },
  { id:'forest', label:'🟩', bg:'#14532d', text:'#dcfce7', sub:'#bbf7d0', track:'#166534', accent:'#4ade80' },
  { id:'purple', label:'🟪', bg:'#2e1065', text:'#f3e8ff', sub:'#ddd6fe', track:'#4c1d95', accent:'#a78bfa' },
  { id:'rose',   label:'🟥', bg:'#4c1d2a', text:'#ffe4e6', sub:'#fecdd3', track:'#881337', accent:'#fb7185' },
  { id:'mono',   label:'⬛', bg:'#27272a', text:'#fafafa', sub:'#d4d4d8', track:'#3f3f46', accent:'#a1a1aa' },
  { id:'light',  label:'⬜', bg:'#f8fafc', text:'#0f172a', sub:'#475569', track:'#e2e8f0', accent:'#3b82f6' }
];
let pipThemeIdx = parseInt(localStorage.getItem('medfocus_pip_theme') || '0');
function getPipTheme() { return pipThemes[pipThemeIdx % pipThemes.length]; }
function cyclePipTheme() {
  pipThemeIdx = (pipThemeIdx + 1) % pipThemes.length;
  localStorage.setItem('medfocus_pip_theme', pipThemeIdx);
}

function initPipCanvas() {
  if (pipCanvas) return;
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  pipCanvas = document.createElement('canvas');
  pipCanvas.width = 640 * dpr;
  pipCanvas.height = 240 * dpr;
  pipCtx = pipCanvas.getContext('2d');
  pipCtx.scale(dpr, dpr);
  pipVideo = document.createElement('video');
  pipVideo.muted = true;
  pipVideo.autoplay = true;
  pipVideo.playsInline = true;
}

// PiP info helpers
function getPipSubjectName() {
  if (selectedSubjectId === 'custom') return selectedSubjectCustom || '自由入力';
  if (selectedSubjectId) {
    const allSubs = subjectCategories.flatMap(c => c.subjects);
    const found = allSubs.find(s => s.id === selectedSubjectId);
    return found ? found.name : selectedSubjectId;
  }
  return '';
}
function getPipModeName() {
  if (isSimulation) return `模試 B${simulationBlockCurrent}/${simulationBlockTotal}`;
  if (isPomodoro) return pomodoroPhase === 'study' ? 'ポモドーロ' : '休憩';
  if (isCountdown) return 'タイマー';
  return 'ストップウォッチ';
}

function drawPipFrame() {
  if (!pipCtx) return;
  const ctx = pipCtx;
  const W = 640, H = 240;
  const t = getPipTheme();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  
  const pad = n => String(n).padStart(2, '0');
  const displaySec = isCountdown ? countdownSeconds : elapsedSeconds;
  const h = Math.floor(displaySec / 3600);
  const m = Math.floor((displaySec % 3600) / 60);
  const s = displaySec % 60;
  const timeStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  
  // Mode + Subject line
  const subName = getPipSubjectName();
  const modeName = getPipModeName();
  const infoStr = subName ? `${modeName}  ·  ${subName}` : modeName;
  ctx.fillStyle = t.accent;
  ctx.font = '600 28px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(infoStr, W / 2, 38);
  
  // Time
  ctx.fillStyle = isRunning ? t.text : t.sub;
  ctx.font = 'bold 80px ui-monospace, "SF Mono", monospace';
  ctx.fillText(timeStr, W / 2, 130);
  
  // Progress bar
  if (isCountdown && initialCountdownSeconds > 0) {
    const prog = countdownSeconds / initialCountdownSeconds;
    const barX = 40, barY = 160, barW = W - 80, barH = 10;
    ctx.fillStyle = t.track;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 5); ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barH, barW * prog), barH, 5); ctx.fill();
  }
  
  // State + button hint
  ctx.fillStyle = t.accent;
  ctx.font = '600 24px -apple-system, sans-serif';
  ctx.fillText(isRunning ? '⏸ 一時停止' : '▶ 開始', W / 2, 210);
}

// Document PiP (Chrome 116+) with real HTML buttons
async function openDocPip() {
  const t = getPipTheme();
  pipWindow = await window.documentPictureInPicture.requestWindow({width:380,height:200});
  pipActive = true;
  
  const doc = pipWindow.document;
  doc.title = 'MedFocus Timer';
  doc.head.innerHTML = `<style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:-apple-system,'Helvetica Neue',sans-serif;background:${t.bg};color:${t.text};display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden;user-select:none;}
    .info{font-size:14px;color:${t.accent};font-weight:700;margin-bottom:3px;letter-spacing:0.3px;}
    .label{font-size:13px;color:${t.sub};font-weight:500;margin-bottom:4px;}
    .time{font-size:52px;font-weight:800;font-family:ui-monospace,'SF Mono',monospace;letter-spacing:-2px;line-height:1;}
    .time.paused{opacity:0.45;}
    .bar-wrap{width:85%;height:8px;background:${t.track};border-radius:4px;margin:10px 0;overflow:hidden;}
    .bar-fill{height:100%;border-radius:4px;background:${t.accent};transition:width 0.3s;}
    .controls{display:flex;gap:10px;margin-top:6px;}
    .btn{padding:6px 20px;border:none;border-radius:20px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;}
    .btn-start{background:${t.accent};color:${t.bg};}
    .btn-stop{background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.3);}
    .btn-stop:hover{background:rgba(239,68,68,0.35);}
    .btn-start:hover{filter:brightness(1.15);}
  </style>`;
  doc.body.innerHTML = `
    <div class="info" id="pip-info"></div>
    <div class="label" id="pip-label"></div>
    <div class="time" id="pip-time"></div>
    <div class="bar-wrap" id="pip-bar-wrap" style="display:none;"><div class="bar-fill" id="pip-bar"></div></div>
    <div class="controls">
      <button class="btn btn-start" id="pip-toggle">▶ 開始</button>
      <button class="btn btn-stop" id="pip-finish">⏹ 終了</button>
    </div>`;
  
  doc.getElementById('pip-toggle').addEventListener('click', () => {
    if(isRunning){pauseSW();} else {startSW();}
    updatePip();
  });
  doc.getElementById('pip-finish').addEventListener('click', () => {
    if(isRunning) finishSession(true);
    pipWindow.close();
  });
  
  pipWindow.addEventListener('pagehide', () => { pipActive = false; pipWindow = null; });
  updateDocPip();
  showToast(IC.check+' ミニタイマーをフローティング表示しました');
}

function updateDocPip() {
  if (!pipWindow || pipWindow.closed) { pipActive = false; pipWindow = null; return; }
  const doc = pipWindow.document;
  const pad = n => String(n).padStart(2, '0');
  const sec = isCountdown ? countdownSeconds : elapsedSeconds;
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  const timeStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  
  const infoEl = doc.getElementById('pip-info');
  const labelEl = doc.getElementById('pip-label');
  const timeEl = doc.getElementById('pip-time');
  const toggleBtn = doc.getElementById('pip-toggle');
  const barWrap = doc.getElementById('pip-bar-wrap');
  const barFill = doc.getElementById('pip-bar');
  
  const subName = getPipSubjectName();
  const modeName = getPipModeName();
  if(infoEl) infoEl.textContent = subName ? `${modeName}  ·  ${subName}` : modeName;
  
  let label = isCountdown ? '残り時間' : '経過時間';
  if(labelEl) labelEl.textContent = label;
  if(timeEl) { timeEl.textContent = timeStr; timeEl.className = isRunning ? 'time' : 'time paused'; }
  if(toggleBtn) {
    toggleBtn.textContent = isRunning ? '⏸ 一時停止' : '▶ 開始';
    toggleBtn.className = 'btn btn-start';
  }
  if(isCountdown && initialCountdownSeconds > 0) {
    if(barWrap) barWrap.style.display = 'block';
    if(barFill) barFill.style.width = `${(countdownSeconds/initialCountdownSeconds)*100}%`;
  } else {
    if(barWrap) barWrap.style.display = 'none';
  }
}

async function togglePip() {
  if (pipActive) {
    if (pipWindow && !pipWindow.closed) { pipWindow.close(); }
    else if (document.pictureInPictureElement) { await document.exitPictureInPicture().catch(() => {}); }
    pipActive = false;
    showToast(IC.check+' ミニタイマーを閉じました');
    return;
  }
  
  // Prefer Document PiP (real HTML buttons)
  if ('documentPictureInPicture' in window) {
    try { await openDocPip(); return; } catch(e) { console.warn('Doc PiP failed:', e); }
  }
  
  // Fallback: Video PiP with canvas
  try {
    initPipCanvas();
    drawPipFrame();
    pipStream = pipCanvas.captureStream(0);
    pipVideo.srcObject = pipStream;
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
    pipActive = true;
    showToast(IC.check+' ミニタイマーをフローティング表示しました');
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({title:'MedFocus Timer',artist:'学習タイマー'});
      navigator.mediaSession.setActionHandler('play', () => { if(!isRunning) startSW(); });
      navigator.mediaSession.setActionHandler('pause', () => { if(isRunning) pauseSW(); updatePip(); });
    }
    
    pipVideo.addEventListener('leavepictureinpicture', () => {
      pipActive = false;
    }, { once: true });
  } catch (e) {
    console.warn('PiP not supported:', e);
    showToast(' このブラウザではPiPがサポートされていません');
  }
}

function updatePip() {
  if (pipWindow && !pipWindow.closed) { updateDocPip(); return; }
  if (!pipActive || !pipStream) return;
  drawPipFrame();
  const track = pipStream.getVideoTracks()[0];
  if (track && track.requestFrame) track.requestFrame();
}

function updateTabTitle() {
  if (!isRunning) { document.title = 'MedFocus'; return; }
  const p = n => String(n).padStart(2, '0');
  const sec = isCountdown ? countdownSeconds : elapsedSeconds;
  const m = Math.floor(sec / 60), s = sec % 60;
  const prefix = '';
  document.title = `${prefix} ${p(m)}:${p(s)} - MedFocus`;
}

function startSW(){
  if(isRunning && !timerInterval) { /* Allow auto-resume */ }
  else if(isRunning) return;
  // Record session start time on first start
  if(!sessionStartedAt) sessionStartedAt = new Date().toISOString();
  // If resuming from pause, close the last break
  if(sessionBreaks.length > 0 && !sessionBreaks[sessionBreaks.length-1].end) {
    sessionBreaks[sessionBreaks.length-1].end = new Date().toISOString();
  }
  isRunning=true;
  timerStartTime = Date.now();
  baseElapsed = elapsedSeconds;
  baseCountdown = countdownSeconds;
  saveTimerState();
  timerInterval=setInterval(()=>{
    const delta = Math.floor((Date.now() - timerStartTime)/1000);
    elapsedSeconds = baseElapsed + delta;
    if(isCountdown) {
      countdownSeconds = Math.max(0, baseCountdown - delta);
      if(countdownSeconds === 0 && isRunning) {
        playBeep();
        finishSession();
      }
    }
    if(elapsedSeconds % 5 === 0) saveTimerState();
    // Always query fresh DOM to avoid stale references after re-renders
    const disp = document.getElementById('timer-display');
    if(disp) {
      const formatted = fmtSW(isCountdown ? countdownSeconds : elapsedSeconds);
      if (disp.innerHTML !== formatted) disp.innerHTML = formatted;
    }
    const ring = document.getElementById('timer-ring');
    if(ring) {
      const circ = 2 * Math.PI * 140; // ~880
      let p, hue;
      if(isCountdown && initialCountdownSeconds > 0) {
        p = countdownSeconds / initialCountdownSeconds;
        hue = p * 120; // 120 (Green) to 0 (Red) for timer, or full rainbow? User said rainbow.
        // Full rainbow based on progress:
        hue = (p * 360) % 360;
        ring.style.strokeDashoffset = circ - (p * circ);
        ring.style.stroke = `hsl(${hue}, 80%, 60%)`;
      } else if(!isCountdown) {
        p = (elapsedSeconds % 1800) / 1800; // 30m cycle
        hue = (p * 360) % 360;
        // Increase: starts at circ (empty), goes to 0 (full)
        ring.style.strokeDashoffset = circ - (p * circ);
        ring.style.stroke = `hsl(${hue}, 80%, 60%)`;
      }
    }
    // Update PiP & tab title
    updatePip();
    updateTabTitle();
  }, 200);
}

function finishSession(manualStop = false) {
  pauseSW();
  
  // If manual stop, skip auto-cycling and go to save overlay
  if (manualStop) {
    // Add current block's elapsed time to cumulative
    if ((isPomodoro && pomodoroPhase === 'study') || (isSimulation && simulationPhase === 'study')) {
      cumulativeStudySeconds += elapsedSeconds;
    } else if (!isPomodoro && !isSimulation) {
      cumulativeStudySeconds = elapsedSeconds;
    }
    // Skip to save overlay (fall through to code below the auto-cycle blocks)
  } else {
    // Auto-cycle logic for timer reaching zero
  if (isSimulation) {
    if (simulationPhase === 'study') {
      cumulativeStudySeconds += elapsedSeconds;
      showToast(IC.check+` ブロック${simulationBlockCurrent}完了！休憩に入ります。`);
      // Removed auto-save here
      
      if (simulationBlockCurrent >= simulationBlockTotal) {
        showToast(IC.check+' 全ブロック完了！お疲れ様でした！');
        isSimulation = false;
        simulationBlockCurrent = 1;
      } else {
        simulationPhase = 'break';
        countdownSeconds = simulationBreakMin * 60;
        baseCountdown = simulationBreakMin * 60;
        initialCountdownSeconds = simulationBreakMin * 60;
        elapsedSeconds = 0;
        baseElapsed = 0;
        saveTimerState();
        startSW();
      }
      if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
      return;
    } else {
      simulationBlockCurrent++;
      showToast(IC.check+` 休憩終了！ブロック${simulationBlockCurrent}開始！`);
      simulationPhase = 'study';
      countdownSeconds = simulationStudyMin * 60;
      baseCountdown = simulationStudyMin * 60;
      initialCountdownSeconds = simulationStudyMin * 60;
      elapsedSeconds = 0;
      baseElapsed = 0;
      saveTimerState();
      startSW();
      if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
      return;
    }
  }

  if (isPomodoro) {
    if (pomodoroPhase === 'study') {
      cumulativeStudySeconds += elapsedSeconds;
      const studyMin = Math.round(pomodoroStudySec / 60);
      const breakMin = Math.round(pomodoroBreakSec / 60);
      showToast(IC.tomato+` ${studyMin}分の集中完了！${breakMin}分休憩に入ります。`);
      pomodoroPhase = 'break';
      countdownSeconds = pomodoroBreakSec;
      baseCountdown = pomodoroBreakSec;
      initialCountdownSeconds = pomodoroBreakSec;
      elapsedSeconds = 0;
      baseElapsed = 0;
      saveTimerState();
      startSW();
      if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
      return;
    } else {
      showToast('🚀 休憩終了！ポモドーロ再開！');
      pomodoroPhase = 'study';
      countdownSeconds = pomodoroStudySec;
      baseCountdown = pomodoroStudySec;
      initialCountdownSeconds = pomodoroStudySec;
      elapsedSeconds = 0;
      baseElapsed = 0;
      saveTimerState();
      startSW();
      if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
      return;
    }
  }
  } // end else (auto-cycle)

  // If we got here via auto-cycle return above, we won't reach this.
  // This code is only reached on manual stop.

  if (!manualStop) {
    if (!isPomodoro && !isSimulation) {
      cumulativeStudySeconds = elapsedSeconds;
    } else {
      // For Pomodoro/Simulation, if we stopped mid-study block, add the current block's time
      if ((isPomodoro && pomodoroPhase === 'study') || (isSimulation && simulationPhase === 'study')) {
        cumulativeStudySeconds += elapsedSeconds;
      }
    }
  }

  pendingLogDuration = Math.floor(cumulativeStudySeconds / 60);
  isConfirmingLog = true;
  saveTimerState();
  
  // IMMEDIATELY show overlay directly in DOM to avoid network freeze
  const timerCard = document.querySelector('.stopwatch-card');
  if (timerCard) {
    let overlay = document.getElementById('session-finish-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'session-finish-overlay';
      overlay.className = 'timer-overlay animate-fade-in';
      overlay.style = 'position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow-y:auto; text-align:center; background:var(--color-bg-primary);';
      timerCard.appendChild(overlay);
    }
    const allSubjects=subjectCategories.flatMap(c=>c.subjects.map(s=>({...s})));
    overlay.innerHTML = `
      <div class="confirm-card animate-slide-up">
        <div class="celebration-icon" style="margin-bottom:var(--space-md);"><span style="font-size:2rem;color:var(--color-accent-teal)">${IC.check}</span></div>
        <h2 style="font-size:1.5rem; font-weight:700; color:var(--color-primary); margin-bottom:var(--space-xs);">お疲れ様でした！</h2>
        <p style="color:var(--color-text-secondary); margin-bottom:var(--space-lg); font-size:0.9rem;">今日の学習を記録しましょう</p>
        
        <div class="confirm-form" style="width:100%; display:flex; flex-direction:column; gap:16px; text-align:left;">
          <div class="field">
            <label>学習時間 (分)</label>
            <input type="number" id="confirm-duration" value="${pendingLogDuration}" style="width:100%; font-size:1.2rem; font-weight:700; text-align:center;" />
          </div>
          <div class="field">
            <label>学習内容</label>
            <div id="confirm-subject-wrapper">
              <select id="confirm-subject" style="width:100%;">
                <option value="">-- 未選択 --</option>
                ${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}" ${selectedSubjectId===s.id?'selected':''}>${s.name}</option>`).join('')}</optgroup>`).join('')}
                <option value="custom" ${selectedSubjectId==='custom'?'selected':''}>自由入力</option>
              </select>
              <input type="text" id="confirm-subject-custom" placeholder="具体的な学習内容..." value="${selectedSubjectCustom}" style="width:100%; margin-top:8px; display:${selectedSubjectId==='custom'?'block':'none'};" />
            </div>
          </div>
          <div class="field">
            <label>活動の種類</label>
            ${activitySegmentHtml(selectedActivity)}
          </div>
          ${videoCountFieldsHtml('-sync')}
          ${qbCountFieldsHtml('-sync')}
          <div class="field">
            <label>学習の目的</label>
            <div class="purpose-segment-control" style="display:flex; gap:8px; margin-top:4px;">
              <button type="button" class="btn ${selectedPurpose==='cbt'?'btn-primary':'btn-secondary'} purpose-btn" data-val="cbt" style="flex:1; padding:6px 0; font-size:0.85rem;">CBT</button>
              <button type="button" class="btn ${selectedPurpose==='regular_exam'?'btn-primary':'btn-secondary'} purpose-btn" data-val="regular_exam" style="flex:1; padding:6px 0; font-size:0.85rem;">定期試験</button>
              <button type="button" class="btn ${selectedPurpose==='assignment'?'btn-primary':'btn-secondary'} purpose-btn" data-val="assignment" style="flex:1; padding:6px 0; font-size:0.85rem;">課題・実習</button>
              <button type="button" class="btn ${selectedPurpose==='other'?'btn-primary':'btn-secondary'} purpose-btn" data-val="other" style="flex:1; padding:6px 0; font-size:0.85rem;">その他</button>
            </div>
          </div>
          <div class="field">
            <label>振り返りメモ</label>
            <textarea id="confirm-memo" placeholder="学んだことや一言..." style="width:100%; min-height:80px;"></textarea>
          </div>
          <div style="display:flex; gap:12px;">
            <div class="field" style="flex:1;">
              <label>場所</label>
              <select id="confirm-location" style="width:100%;">
                <option value="自宅" ${selectedLocation==='自宅'?'selected':''}>${locIcon('自宅')} 自宅</option>
                <option value="図書館" ${selectedLocation==='図書館'?'selected':''}>${locIcon('図書館')} 図書館</option>
                <option value="カフェ" ${selectedLocation==='カフェ'?'selected':''}>${locIcon('カフェ')} カフェ</option>
                <option value="大学" ${selectedLocation==='大学'?'selected':''}>${locIcon('大学')} 大学</option>
                <option value="移動中" ${selectedLocation==='移動中'?'selected':''}>${locIcon('移動中')} 移動中</option>
                <option value="その他" ${selectedLocation==='その他'?'selected':''}>${IC.pin} その他</option>
              </select>
            </div>
            <div class="field" style="flex:1;">
              <label>集中度</label>
              <select id="confirm-focus" style="width:100%;">
                ${focusOptions(selectedFocusLevel)}
              </select>
            </div>
          </div>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="btn-discard-log-sync" style="flex:1; justify-content:center;">破棄</button>
            <button class="btn btn-primary" id="btn-confirm-save-sync" style="flex:2; justify-content:center;">記録を保存</button>
          </div>
        </div>
      </div>
    `;
    // Attach sync event listeners
    const subjectSelect = overlay.querySelector('#confirm-subject');
    const customSubjectInput = overlay.querySelector('#confirm-subject-custom');
    
    subjectSelect.addEventListener('change', (e) => {
      customSubjectInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
    
    overlay.querySelectorAll('.purpose-btn').forEach(b => {
      b.onclick = (ev) => {
        overlay.querySelectorAll('.purpose-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
        ev.target.classList.replace('btn-secondary', 'btn-primary');
        selectedPurpose = ev.target.dataset.val;
      };
    });
    overlay.querySelectorAll('.activity-btn').forEach(b => {
      b.onclick = (ev) => {
        overlay.querySelectorAll('.activity-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
        ev.currentTarget.classList.replace('btn-secondary', 'btn-primary');
        selectedActivity = ev.currentTarget.dataset.val;
        saveTimerState();
        syncQbCountFields('-sync');
        syncVideoCountFields('-sync');
      };
    });
    wireQbCountFields(overlay, '-sync');
    wireVideoCountFields(overlay, '-sync');
    overlay.querySelector('#btn-discard-log-sync').onclick = () => { 
      overlay.remove();
      resetSW(); 
      renderStudy(); 
    };
    
    overlay.querySelector('#btn-confirm-save-sync').onclick = async (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      
      const durStr = overlay.querySelector('#confirm-duration').value;
      const dur = parseInt(durStr, 10);
      const sub = subjectSelect.value;
      const custom = customSubjectInput.value;
      const subjVal = sub === 'custom' ? (custom.trim() || 'その他') : sub;
      const memo = overlay.querySelector('#confirm-memo').value.trim();
      const loc = overlay.querySelector('#confirm-location').value;
      const foc = parseFloat(overlay.querySelector('#confirm-focus').value);
      const qb = readQbCounts('-sync');
      const vid = readVideoCount('-sync');

      if(isNaN(dur) || dur <= 0) { showToast(' 正しい時間を入力してください'); return; }
      if(!subjVal) { showToast(' 学習内容を入力してください'); return; }
      if(qb.error) { showToast(IC.x + ' ' + qb.error); return; }
      if(vid.error) { showToast(IC.x + ' ' + vid.error); return; }

      // Disable button to show processing state and prevent double clicks
      btn.disabled = true;
      btn.textContent = '保存中...';
      btn.style.opacity = '0.7';

      try {
        selectedSubjectId = sub; selectedSubjectCustom = custom;
        selectedLocation = loc; selectedFocusLevel = foc;
        saveTimerState();

        const endedAt = new Date().toISOString();
        const startedAt = sessionStartedAt || endedAt;
        saveTimerState();
        const vidApplied = applyVideoCountToProgress(vid.subjectId, vid.done);
        const success = await saveStudyLog(subjVal, dur, memo, foc, loc, startedAt, endedAt, sessionBreaks, selectedPurpose, selectedActivity, qb.solved, qb.correct, vid.watched);
        if (success && vidApplied) showToast(IC.check + ` 視聴済み本数を ${vidApplied.before} → ${vidApplied.after}本 に更新しました`);
        
        if (success) {
          // Remove overlay completely to prevent duplicate ID issues in DOM
          if (document.body.contains(overlay)) overlay.remove();
          resetSW(); 
          renderStudy();
        } else {
          // If save failed, restore button so user can try again
          btn.disabled = false;
          btn.textContent = '記録を保存';
          btn.style.opacity = '1';
        }
      } catch (err) {
        console.error('Session finish error:', err);
        showToast(' 予期せぬエラーが発生しました');
        btn.disabled = false;
        btn.textContent = '記録を保存';
        btn.style.opacity = '1';
      }
    };
  } else {
    // Fallback if not on study page
    if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
    else showToast(IC.check+' 学習セッションが終了しました！記録を確認してください。');
  }
}

function pauseSW(){
  if(isRunning) {
    const delta = Math.floor((Date.now() - timerStartTime)/1000);
    elapsedSeconds = baseElapsed + delta;
    if(isCountdown) countdownSeconds = Math.max(0, baseCountdown - delta);
    // Record break start
    sessionBreaks.push({ start: new Date().toISOString(), end: null });
  }
  isRunning=false;
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  saveTimerState();
  updateTabTitle();
  updatePip();
}

function resetSW(){
  pauseSW();
  elapsedSeconds=0;
  countdownSeconds=0;
  baseElapsed=0;
  baseCountdown=0;
  cumulativeStudySeconds=0;
  sessionStartedAt=null;
  sessionBreaks=[];
  isConfirmingLog=false;
  pomodoroPhase='study';
  simulationPhase='study';
  simulationBlockCurrent=1;
  saveTimerState();
}

function fmtSW(t){
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
  const p=n=>String(n).padStart(2,'0');
  return h>0 ? `${p(h)}:${p(m)}<span class="seconds">:${p(s)}</span>` : `${p(m)}<span class="seconds">:${p(s)}</span>`;
}

function generateUID() {
  return 'mf-' + Math.random().toString(36).substring(2, 9);
}

// ==================== AUTH UI ====================
function renderLogin(){
  const app = document.getElementById('app');
  document.body.classList.add('hide-sidebar');
  
  // Ensure we have an auth overlay instead of replacing everything if possible
  // Fix: The previous app.innerHTML = ... was wiping out #sidebar and #main-content
  let authOverlay = document.getElementById('auth-overlay');
  if (!authOverlay) {
    authOverlay = document.createElement('div');
    authOverlay.id = 'auth-overlay';
    authOverlay.style.position = 'fixed';
    authOverlay.style.inset = '0';
    authOverlay.style.zIndex = '9999';
    authOverlay.style.backgroundColor = 'var(--color-bg-primary)';
    document.body.appendChild(authOverlay);
  }
  authOverlay.style.display = 'flex';
  
  authOverlay.innerHTML = `
    <div class="auth-container" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding: 20px;">
      <div class="auth-card" style="width:100%; max-width:400px; padding: 32px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); background: var(--color-bg-card);">
        <div class="auth-header" style="text-align:center; margin-bottom:24px;">
          <div class="auth-logo" style="width:48px; height:48px; background:var(--gradient-primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; color:#0e1525; margin:0 auto 16px;">M</div>
          <h1 class="auth-title" style="font-size:1.5rem; font-weight:700; margin-bottom:8px;">MedFocus</h1>
          <p class="auth-subtitle" style="font-size:0.9rem; color:var(--color-text-secondary);">自分に合った方法で始めましょう</p>
        </div>

        <div class="auth-tabs" style="display:flex; gap:4px; margin-bottom:20px; background:var(--color-bg-elevated); padding:4px; border-radius:12px;">
          <button id="tab-join" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem; background:var(--color-bg-primary);">新規登録</button>
          <button id="tab-login" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem;">IDログイン</button>
          <button id="tab-legacy" style="flex:1; padding:8px; border-radius:8px; font-weight:600; font-size:0.75rem;">旧アカウント</button>
        </div>

        <form class="auth-form" id="auth-form" style="display:flex; flex-direction:column; gap:16px;">
          <div id="field-name" class="auth-field">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">お名前</label>
            <input type="text" id="auth-name" placeholder="例: 田中 太郎" style="width:100%;" />
          </div>
          <div id="field-id" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">ログインID</label>
            <input type="text" id="auth-id" placeholder="例: mf-x1y2z3" style="width:100%;" />
          </div>
          <div id="field-legacy-email" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">メールアドレス</label>
            <input type="email" id="auth-legacy-email" placeholder="以前登録したメールアドレス" style="width:100%;" />
          </div>
          <div id="field-legacy-pass" class="auth-field" style="display:none;">
            <label style="display:block; font-size:0.85rem; color:var(--color-text-tertiary); margin-bottom:6px;">パスワード</label>
            <input type="password" id="auth-legacy-pass" placeholder="以前設定したパスワード" style="width:100%;" />
          </div>
          <button type="submit" id="btn-auth-submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:1.1rem; border-radius:12px;">
            はじめる
          </button>
          <div id="field-legacy-reset" class="auth-field" style="display:none; text-align:center; margin-top:-4px;">
            <button type="button" id="btn-reset-password" style="background:none; border:none; color:var(--color-accent-teal); font-size:0.78rem; text-decoration:underline; cursor:pointer; padding:4px;">パスワードを忘れた場合（再設定メールを送る）</button>
          </div>
        </form>
        
        <div id="id-announcement" style="display:none; margin-top:20px; padding:16px; background:rgba(78,205,196,0.1); border:1px dashed var(--color-accent-teal); border-radius:12px; text-align:center;">
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:8px;">あなたのログインIDを発行しました：</p>
          <div id="generated-id-display" style="font-size:1.4rem; font-weight:800; color:var(--color-accent-teal); font-family:monospace; margin-bottom:12px;"></div>
          <p style="font-size:0.75rem; color:var(--color-accent-pink);">⚠️ このIDは忘れないようにメモしてください！</p>
          <button id="btn-start-after-id" class="btn btn-primary" style="margin-top:16px; width:100%; justify-content:center;">スタートする</button>
        </div>

        <div id="rescue-section" style="display:none; margin-top:20px; padding:16px; background:rgba(241,148,138,0.1); border:1px solid rgba(241,148,138,0.2); border-radius:12px;">
          <p style="font-size:0.85rem; font-weight:600; margin-bottom:12px; color:var(--color-accent-pink);">${IC._s('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>')} IDを検索・復旧する</p>
          <div style="display:flex; gap:8px;">
            <input type="text" id="rescue-name" placeholder="以前使っていたお名前" style="flex:1; font-size:0.85rem;" />
            <button id="btn-rescue-search" class="btn btn-secondary btn-sm">検索</button>
          </div>
          <div id="rescue-result" style="margin-top:12px; font-size:0.8rem; display:none;"></div>
        </div>

        <div style="text-align:center; margin-top:24px; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; color:var(--color-accent-teal); cursor:pointer; text-decoration:underline;" id="btn-forgot-id">IDを忘れた・以前のアカウントを探す</div>
          <div style="font-size:12px; color:var(--color-text-tertiary); cursor:pointer;" id="demo-login">(デモモードで試す)</div>
        </div>
      </div>
    </div>
  `;

  let mode = 'join';
  const tabJoin = document.getElementById('tab-join');
  const tabLogin = document.getElementById('tab-login');
  const fieldName = document.getElementById('field-name');
  const fieldId = document.getElementById('field-id');
  const btnSubmit = document.getElementById('btn-auth-submit');

  const tabLegacy = document.getElementById('tab-legacy');
  const fieldLegacyEmail = document.getElementById('field-legacy-email');
  const fieldLegacyPass = document.getElementById('field-legacy-pass');

  function setTab(t) {
    mode = t;
    tabJoin.style.background = t==='join' ? 'var(--color-bg-primary)' : 'transparent';
    tabLogin.style.background = t==='login' ? 'var(--color-bg-primary)' : 'transparent';
    tabLegacy.style.background = t==='legacy' ? 'var(--color-bg-primary)' : 'transparent';
    fieldName.style.display = t==='join' ? 'block' : 'none';
    fieldId.style.display = t==='login' ? 'block' : 'none';
    fieldLegacyEmail.style.display = t==='legacy' ? 'block' : 'none';
    fieldLegacyPass.style.display = t==='legacy' ? 'block' : 'none';
    btnSubmit.textContent = t==='join' ? 'はじめる' : 'ログイン';
    document.getElementById('btn-forgot-id').style.display = (t==='login') ? 'block' : 'none';
    document.getElementById('field-legacy-reset').style.display = (t==='legacy') ? 'block' : 'none';
  }
  tabJoin.onclick = () => setTab('join');
  tabLogin.onclick = () => setTab('login');
  tabLegacy.onclick = () => setTab('legacy');

  // パスワード再設定メール。メールのリンクを開くと Supabase が復帰用セッションを張るので、
  // そのまま同じアプリに戻ってきてログイン済みの状態になる。
  document.getElementById('btn-reset-password').onclick = async () => {
    const emailInput = document.getElementById('auth-legacy-email');
    const email = emailInput.value.trim();
    if (!email) { showToast(' 先にメールアドレスを入力してください'); emailInput.focus(); return; }
    if (!supabase || SUPABASE_KEY === 'your-anon-key') { showToast(' デモモードでは利用できません'); return; }
    const rb = document.getElementById('btn-reset-password');
    const orig = rb.textContent;
    rb.textContent = '送信中...'; rb.disabled = true;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) {
        showToast(IC.x + ' 送信に失敗しました: ' + (error.message || '不明なエラー'));
        console.error('resetPasswordForEmail:', error);
      } else {
        showToast(IC.check + ' ' + email + ' に再設定メールを送りました。メール内のリンクを開いてください。');
      }
    } catch (e) {
      showToast(IC.x + ' 送信に失敗しました');
      console.error('resetPasswordForEmail exception:', e);
    } finally {
      rb.textContent = orig; rb.disabled = false;
    }
  };

  document.getElementById('btn-forgot-id').onclick = () => {
    const sec = document.getElementById('rescue-section');
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
  };

  document.getElementById('btn-rescue-search').onclick = async () => {
    const name = document.getElementById('rescue-name').value.trim();
    const resultDiv = document.getElementById('rescue-result');
    if (!name) return;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="color:var(--color-text-tertiary);">検索中...</span>';

    try {
      if (!supabase) throw new Error('接続エラー (Supabase未初期化)');
      // profiles に RLS を掛けると未ログインでは直接読めなくなるため、
      // 氏名の完全一致で最小限だけを返す RPC を使う。
      // RPC 未作成の環境では従来の直接検索にフォールバックする。
      let data, error;
      const rpc = await supabase.rpc('find_login_id_by_name', { p_name: name });
      if (rpc.error && (rpc.error.code === 'PGRST202' || /function .* does not exist/i.test(rpc.error.message || ''))) {
        console.warn('find_login_id_by_name が未作成のため直接検索にフォールバックします');
        const legacy = await supabase.from('profiles').select('full_name, login_id').ilike('full_name', `%${name}%`);
        data = legacy.data; error = legacy.error;
      } else {
        data = rpc.data; error = rpc.error;
      }
      if (error) throw error;

      if (!data || data.length === 0) {
        resultDiv.innerHTML = '<span style="color:var(--color-accent-pink);">⚠️ 一致するアカウントが見つかりません</span>';
      } else {
        // 絞り込み用に大学・学年まで返すのは情報を出しすぎるため、氏名とIDのみ表示する
        const displayData = data;

        const list = displayData.map(u => {
          const isLegacy = !u.login_id;
          const id = u.login_id || encodeURIComponent(u.full_name);
          const meta = '';  // 大学・学年は返さない（未ログインの検索で出す情報を最小限にする）
          return `<div style="padding:10px; background:var(--color-bg-elevated); border-radius:8px; margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
            <span style="flex:1; margin-right:8px;">
              <b>${u.full_name}</b>さん ${meta}<br>
              ID: <code style="color:var(--color-accent-teal); font-size:1rem;">${id}</code>
              ${isLegacy ? '<br><span style="font-size:0.7rem; color:var(--color-accent-pink);">※旧方式のアカウント</span>' : ''}
            </span>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('auth-id').value='${id}'; document.getElementById('rescue-section').style.display='none'; showToast(' IDをセットしました')">セット</button>
          </div>`;
        }).join('');
        resultDiv.innerHTML = `<p style="color:var(--color-text-secondary); margin-bottom:4px;">${displayData.length}件見つかりました：</p>${list}`;
      }
    } catch(err) {
      console.error('ID Rescue Error:', err);
      resultDiv.innerHTML = `<div style="color:var(--color-accent-pink); margin-top:8px;">❌ 検索エラーが発生しました<br><span style="font-size:0.7rem; opacity:0.8;">理由: ${err.message || '不明なエラー'}</span></div>`;
    }
  };

  document.getElementById('demo-login').onclick = () => {
    if (authOverlay) authOverlay.style.display = 'none';
    mockLogin('demo@example.com');
  };

  document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-submit');
    const origText = btn ? btn.textContent : '...';
    if(btn) { btn.textContent = '処理中...'; btn.disabled = true; }

    try {
      // ===== LEGACY MODE: email + password direct login =====
      if (mode === 'legacy') {
        const legacyEmail = document.getElementById('auth-legacy-email').value.trim();
        const legacyPass = document.getElementById('auth-legacy-pass').value;
        if (!legacyEmail || !legacyPass) {
          showToast(' メールアドレスとパスワードを入力してください');
          if(btn){ btn.disabled = false; btn.textContent = origText; }
          return;
        }
        if (!supabase || SUPABASE_KEY === 'your-anon-key') {
          mockLogin(legacyEmail);
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
          return;
        }
        const { error: legacyErr } = await supabase.auth.signInWithPassword({
          email: legacyEmail,
          password: legacyPass
        });
        if (legacyErr) {
          showToast(' ログイン失敗: ' + (legacyErr.message || '認証エラー'));
          if(btn){ btn.disabled = false; btn.textContent = origText; }
        } else {
          // Auto-assign login_id if missing
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const uid = sessionData.session.user.id;
            const { data: prof } = await supabase.from('profiles').select('login_id').eq('id', uid).single();
            if (!prof?.login_id) {
              const newId = generateUID();
              await supabase.from('profiles').update({ login_id: newId }).eq('id', uid);
              currentUser.login_id = newId;
              // Show new ID announcement
              document.getElementById('auth-form').style.display = 'none';
              const announce = document.getElementById('id-announcement');
              announce.querySelector('p').textContent = '次回からはこのIDでログインできます：';
              announce.style.display = 'block';
              document.getElementById('generated-id-display').textContent = newId;
              document.getElementById('btn-start-after-id').onclick = () => {
                if (authOverlay) authOverlay.style.display = 'none';
                initApp();
              };
              return;
            } else {
              currentUser.login_id = prof.login_id;
            }
          }
          showToast(' おかえりなさい！');
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
        }
        return;
      }

      // ===== JOIN / ID LOGIN =====
      let finalId = '';
      let finalName = '';

      if (mode === 'join') {
        finalName = document.getElementById('auth-name').value.trim();
        if (!finalName) { 
          showToast(' 名前を入力してください'); 
          if(btn){ btn.disabled = false; btn.textContent = origText; } 
          return; 
        }
        finalId = generateUID();
      } else {
        finalId = document.getElementById('auth-id').value.trim().toLowerCase();
        if (!finalId) { 
          showToast(' ログインIDを入力してください'); 
          if(btn){ btn.disabled = false; btn.textContent = origText; } 
          return; 
        }
      }

      const email = finalId + '@medfocus.app';
      const password = 'medfocus-fixed-pass-v2';

      if (!supabase || SUPABASE_KEY === 'your-anon-key' || SUPABASE_URL.includes('your-project')) {
        // Mock offline mode
        mockLogin(email);
        if (finalName) currentUser.full_name = finalName;
        currentUser.login_id = finalId;

        if (mode === 'join') {
          // Show ID Announcement even in demo mode
          document.getElementById('auth-form').style.display = 'none';
          const announce = document.getElementById('id-announcement');
          announce.style.display = 'block';
          document.getElementById('generated-id-display').textContent = finalId;
          document.getElementById('btn-start-after-id').onclick = () => {
            if (authOverlay) authOverlay.style.display = 'none';
            initApp();
          };
        } else {
          showToast(' デモモード：' + (finalName || finalId) + 'として開始します');
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
        }
        return;
      }

      if (mode === 'join') {
        const { data: signupData, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: finalName } }
        });

        if (signupErr) throw signupErr;

        const user = signupData.user;
        if (user) {
          await supabase.from('profiles').insert([{ id: user.id, full_name: finalName, login_id: finalId }]);
        }

        // Show ID Announcement
        document.getElementById('auth-form').style.display = 'none';
        const announce = document.getElementById('id-announcement');
        announce.style.display = 'block';
        document.getElementById('generated-id-display').textContent = finalId;
        document.getElementById('btn-start-after-id').onclick = () => {
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
        };
      } else {
        // 過去に使っていたパスワードの互換リスト。先頭が現行。
        const passwordCandidates = [
          'medfocus-fixed-pass-v2',
          'medfocus-fixed-pass',
          'medfocus-fixed-password',
          'medfocus-pass'
        ];

        // finalId は上で toLowerCase 済みなので、大文字小文字の派生を作っても同じ文字列にしかならない。
        // 重複したまま試すと同じリクエストを2倍投げることになり、
        // 認証のレート制限をいたずらに消費するので一意化する。
        const emailVariants = [...new Set([
          finalId + '@medfocus.app',
          finalId.toLowerCase() + '@medfocus.app'
        ])];

        let lastErr = null;
        let success = false;
        let aborted = false;   // 資格情報以外の理由（回数制限・通信断）で打ち切ったか

        for (const variant of emailVariants) {
          if (success || aborted) break;
          for (const pass of passwordCandidates) {
            const { error: loginErr } = await supabase.auth.signInWithPassword({
              email: variant,
              password: pass
            });

            if (!loginErr) { success = true; break; }

            lastErr = loginErr;
            // 「資格情報が違う」以外のエラーで総当たりを続けても意味がない。
            // 特に 429 は、続けるほど解除が遠のく。
            const code = loginErr.code || loginErr.error_code || '';
            const isBadCredentials = loginErr.status === 400 && code.indexOf('invalid_credentials') >= 0;
            if (!isBadCredentials) { aborted = true; break; }
          }
        }

        if (success) {
          if (!document.querySelector('.toast')) showToast(' ログインに成功しました');
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
        } else {
          const status = lastErr ? lastErr.status : null;
          const raw = lastErr ? (lastErr.message || lastErr.error_description || '原因不明') : 'ログイン情報が正しくありません';
          let msg;
          if (status === 429) {
            msg = 'ログイン試行が多すぎます。しばらく（数分〜1時間）待ってからもう一度お試しください。';
          } else if (aborted) {
            msg = `通信または設定のエラーです: ${raw}`;
          } else {
            // profiles に login_id があってもここに来る場合がある。
            // 実メールアドレスで登録されたアカウントは合成アドレスを持たないため。
            msg = 'このログインIDでは認証できません。メールアドレスで登録した方は「旧アカウント」タブからログインしてください。';
          }
          showToast(`❌ ${msg}`);
          console.error('Login failed:', { status, code: lastErr && (lastErr.code || lastErr.error_code), raw, aborted });
          if(btn){ btn.disabled = false; btn.textContent = origText; }
        }
      }
    } catch (err) {
      console.error('Submit Error:', err);
      showToast(IC.x+' エラーが発生しました: ' + (err.message || '不明なエラー'));
      if(btn){ btn.disabled = false; btn.textContent = origText; }
    }
  };
}

function handleLogout() {
  isDemoMode = false;
  if(supabase && SUPABASE_KEY !== 'your-anon-key') supabase.auth.signOut();
  else { session = null; location.reload(); }
}

function mockLogin(email) {
  isDemoMode = true;
  session = { user: { email, id: 'user-001' } };
  currentUser.id = 'user-001';
  currentUser.name = email.split('@')[0];
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  showToast(' ログインしました（デモモード）');
  renderRoute(currentRoute);
}

// ==================== SIDEBAR ====================
const navItems = [
  { route: '/', label: 'ダッシュボード', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
  {
    group: 'study',
    label: '学習管理',
    icon: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 20l3-3.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2"/></svg>',
    items: [
      { route: '/study', label: '学習記録', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>' },
      { route: '/insights', label: 'インサイト', icon: '<svg viewBox="0 0 24 24"><path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z"/><circle cx="12" cy="12" r="3"/></svg>' },
      { route: '/qb', label: '教材進捗', icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>' }
    ]
  },
  {
    group: 'others',
    label: 'その他',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2"/></svg>',
    items: [
      { route: '/countdown', label: 'カウントダウン', icon: '<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 14l2 2 4-4"/></svg>' },
      { route: '/settings', label: '設定', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' }
    ]
  }
];



function renderSidebar(){
  const sb=document.getElementById('sidebar');const path=currentRoute;
  const c=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const themeIcon=isDark?IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'):IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>');
  const themeLabel=isDark?'ダークモード':'ライトモード';

  let avatarHtml = `<div class="sidebar-avatar" style="background:${c}">${ini}</div>`;
  if (currentUser.avatar_url && currentUser.avatar_url.startsWith('http')) {
    avatarHtml = `<div class="sidebar-avatar" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${currentUser.avatar_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${ini}'"/></div>`;
  }

  const navHtml = navItems.map(i => {
    if (i.route) {
      return `<div class="nav-item ${path===i.route?'active':''}" data-route="${i.route}"><div class="nav-item-icon">${i.icon}</div><span>${i.label}</span></div>`;
    } else if (i.group) {
      const childItemsHtml = i.items.map(child => {
        return `<div class="nav-item ${path===child.route?'active':''}" data-route="${child.route}"><div class="nav-item-icon">${child.icon}</div><span>${child.label}</span></div>`;
      }).join('');
      
      return `<div class="nav-group">
        <div class="nav-group-header">
          <div class="nav-group-header-left">
            <span>${i.label}</span>
          </div>
        </div>
        <div class="nav-group-items">
          ${childItemsHtml}
        </div>
      </div>`;
    }
    return '';
  }).join('');

  sb.innerHTML=`<div class="sidebar-header"><div class="sidebar-logo"><div class="sidebar-logo-icon">M</div><span class="sidebar-logo-text">MedFocus</span></div></div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-theme-row"><span class="sidebar-theme-label">${themeIcon} ${themeLabel}</span><button class="theme-toggle" id="theme-btn" title="テーマ切り替え"></button></div>
    <div class="sidebar-profile" id="logout-btn" title="クリックでログアウト" style="cursor:pointer">
      ${avatarHtml}
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${currentUser.name}</div>
        <div class="sidebar-profile-role">${currentUser.university} ${currentUser.grade}年</div>
        <div class="sidebar-profile-id" style="font-size:0.65rem; color:var(--color-text-tertiary); margin-top:2px;">ID: ${currentUser.login_id || '---'}</div>
      </div>
    </div>`;

  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('logout-btn').addEventListener('click', () => { if(confirm('ログアウトしますか？')) handleLogout(); });
}

// ==================== ROUTER ====================
const routes={};
function registerRoute(p,h){routes[p]=h;}
function navigate(p){if(currentRoute===p)return;window.history.pushState({},'',p);renderRoute(p);}
function renderRoute(p){
  currentRoute=p;
  const h=routes[p]||routes['/'];
  if(h)h();
  
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.route===p));
}
function initRouter(){
  window.addEventListener('popstate',()=>renderRoute(window.location.pathname));
  document.addEventListener('click',e=>{const n=e.target.closest('[data-route]');if(n){e.preventDefault();navigate(n.dataset.route);}});
  renderRoute(window.location.pathname);
}


// ==================== PAGES ====================

// --- Dashboard ---
let dashboardPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'

function createMixedChart(canvasId, labels, barData, lineData, barLabel, lineLabel) {
  if (typeof Chart === 'undefined') return;
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  try {
    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar', label: barLabel || '実績(分)', data: barData,
            backgroundColor: (context) => {
              const { ctx: c, chartArea } = context.chart;
              if (!chartArea) return '#4ECDC4';
              const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              g.addColorStop(0, 'rgba(78,205,196,0.4)');
              g.addColorStop(1, 'rgba(69,183,209,0.8)');
              return g;
            },
            borderRadius: 6, borderSkipped: false, maxBarThickness: 40, order: 2
          },
          {
            type: 'line', label: lineLabel || '目標(分)', data: lineData,
            borderColor: '#f59e0b', borderWidth: 2, borderDash: [6, 3],
            pointBackgroundColor: '#f59e0b', pointRadius: 3,
            fill: false, tension: 0.1, order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.06)' } }
        },
        plugins: {
          legend: { display: true, labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
          tooltip: {
            backgroundColor: '#1a2332', titleColor: '#f0f4f8', bodyColor: '#94a3b8',
            borderColor: 'rgba(78,205,196,0.3)', borderWidth: 1, cornerRadius: 8
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      }
    });
  } catch (e) { console.error('DEBUG: createMixedChart error:', e); }
}




async function renderDashboard(){

  const ct=document.getElementById('page-container');
  const logs = await fetchStudyLogs();
  const checks = await fetchChecklists();
  await fetchSleepLogs(); // Supabaseから睡眠ログを取得・キャッシュ更新

  const logicalToday = getLogicalDate(new Date());


  
  const totalCBT = CBT_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalKoku = KOKUSHI_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalT = totalCBT + totalKoku;
  const compT=checks.filter(c=>c.completed).length;
  const overall=totalT>0?Math.round((compT/totalT)*100):0;

  const todayStart = new Date(logicalToday); todayStart.setHours(3,0,0,0);
  const todayEnd = new Date(logicalToday); todayEnd.setHours(26,59,59,999); // Until 5am tomorrow
  
  const totalMinutes = logs.reduce((s,l)=>s+l.duration_minutes,0);
  
  // Streak calculation (Daily, using Logical Date)
  let streak = 0;
  const studyDates = new Set(logs.map(l => getLogicalDate(new Date(l.started_at)).toLocaleDateString()));
  let dIter = new Date(logicalToday);
  while(studyDates.has(dIter.toLocaleDateString())) {
    streak++;
    dIter.setDate(dIter.getDate() - 1);
  }
  
  const todayMin = logs.filter(l => {
    const t = new Date(l.started_at);
    return t >= todayStart && t <= todayEnd;
  }).reduce((s,l)=>s+l.duration_minutes,0);

  const goalMin = getTodayGoalMinutes();
  const pct = goalMin > 0 ? Math.min(150, Math.round((todayMin / goalMin) * 100)) : 0;
  const ringColor = getGoalRingColor(pct);
  const remainMin = Math.max(0, goalMin - todayMin);
  const avgMin = logs.length > 0 ? Math.round(totalMinutes / Math.max(1, studyDates.size)) : 0;

  // --- Time of Day Analysis (24h Breakdown) ---
  // Distribute study time across hours proportionally
  const hourlyStats = {};
  for(let i=0; i<24; i++) hourlyStats[i] = {min:0, sumF:0, countF:0};
  
  logs.forEach(l => {
    const start = new Date(l.started_at);
    const durMin = l.duration_minutes;
    if (!durMin || durMin <= 0) return;
    
    const end = new Date(start.getTime() + durMin * 60000);
    
    // Walk through each hour boundary the session spans
    let cursor = new Date(start);
    let remaining = durMin;
    
    while (remaining > 0 && cursor < end) {
      const hr = cursor.getHours();
      // Next hour boundary
      const nextHour = new Date(cursor);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      
      // Minutes in this hour: either until next hour or until session ends
      const minutesInThisHour = Math.min(remaining, (nextHour - cursor) / 60000);
      
      if (minutesInThisHour > 0 && hourlyStats[hr]) {
        hourlyStats[hr].min += Math.round(minutesInThisHour * 10) / 10;
        if (l.focus_level) {
          // Weight focus by time spent in this hour
          hourlyStats[hr].sumF += Number(l.focus_level) * (minutesInThisHour / durMin);
          hourlyStats[hr].countF += minutesInThisHour / durMin;
        }
      }
      
      remaining -= minutesInThisHour;
      cursor = nextHour;
    }
  });

  // SVG ring calculations
  const radius = 105;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (Math.min(pct, 100) / 100) * circ;

  // --- Radar Chart Aggregation ---
  const buckets = ["基礎医学", "内科系", "外科系", "産婦人科", "小児科", "精神科", "社会医学", "救急科"];
  const bucketProg = buckets.map(b => {
    let total = 0; let completed = 0;
    [...CBT_CHECKLIST, ...KOKUSHI_CHECKLIST].forEach(cat => {
      let targetBucket = "";
      const name = cat.category;
      if (name.includes("基礎医学") || name.includes("国試基礎")) targetBucket = "基礎医学";
      else if (name.includes("内科系") || name.includes("国試内科")) targetBucket = "内科系";
      else if (name.includes("外科系") || name.includes("国試外科")) targetBucket = "外科系";
      else if (name.includes("産科・婦人科") || name.includes("国試産科")) targetBucket = "産婦人科";
      else if (name.includes("小児科")) targetBucket = "小児科";
      else if (name.includes("精神科")) targetBucket = "精神科";
      else if (name.includes("社会医学") || name.includes("公衆衛生") || name.includes("臨床倫理")) targetBucket = "社会医学";
      else if (name.includes("救急") || name.includes("集中治療")) targetBucket = "救急科";
      if (targetBucket === b) {
        total += cat.topics.length;
        completed += checks.filter(ch => ch.category === cat.category && ch.completed).length;
      }
    });
    return { name: b, value: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  // --- Subject-wise Study Time Aggregation ---
  // Color palette defaults + user overrides from localStorage
  const SUBJECT_COLORS = [
    '#4ECDC4', '#45B7D1', '#FF6B6B', '#F7DC6F', '#BB8FCE',
    '#F1948A', '#F0B27A', '#82E0AA', '#5DADE2', '#AF7AC5',
    '#F39C12', '#E74C3C', '#1ABC9C', '#3498DB', '#9B59B6',
    '#E67E22', '#2ECC71', '#E91E63', '#00BCD4', '#FF9800',
    '#8BC34A', '#673AB7', '#009688', '#FF5722', '#607D8B'
  ];
  const subjectTimeMap = {};
  let colorIdx = 0;
  
  function getUserSubjectColors() {
    try { return JSON.parse(localStorage.getItem('medfocus_subject_colors') || '{}'); } catch(e) { return {}; }
  }
  function saveUserSubjectColor(name, color) {
    const colors = getUserSubjectColors();
    colors[name.toLowerCase()] = color;
    localStorage.setItem('medfocus_subject_colors', JSON.stringify(colors));
  }
  
  function getSubjectColor(name) {
    const k = name.toLowerCase();
    const userColors = getUserSubjectColors();
    if (userColors[k]) return userColors[k];
    // Auto-assign and persist
    const c = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
    colorIdx++;
    return c;
  }
  
  const allSubjects = subjectCategories.flatMap(c => c.subjects.map(s => ({...s, categoryColor: c.color})));
  logs.forEach(l => {
    const key = normalizeSubjectName(l.subject_name);
    const lookupKey = key.toLowerCase();
    if (!subjectTimeMap[lookupKey]) {
      subjectTimeMap[lookupKey] = { name: key, minutes: 0, color: getSubjectColor(key) };
    }
    subjectTimeMap[lookupKey].minutes += l.duration_minutes;
  });
  const sortedSubjectTime = Object.values(subjectTimeMap).filter(s => s.minutes > 0).sort((a,b) => b.minutes - a.minutes);
  const maxSubMinutes = sortedSubjectTime.length > 0 ? sortedSubjectTime[0].minutes : 1;

  // Focus & Location Analytics
  let totalFocus = 0, focusCount = 0;
  const locationStats = {};
  logs.forEach(l => {
    if (l.focus_level) {
      totalFocus += Number(l.focus_level);
      focusCount++;
      const loc = l.location || '未設定';
      if (!locationStats[loc]) locationStats[loc] = { sum: 0, count: 0 };
      locationStats[loc].sum += Number(l.focus_level);
      locationStats[loc].count++;
    }
  });
  const avgFocus = focusCount > 0 ? (totalFocus / focusCount).toFixed(1) : '-';
  const sortedLocations = Object.entries(locationStats)
    .map(([loc, stat]) => ({ loc, avg: (stat.sum / stat.count).toFixed(1), count: stat.count }))
    .sort((a,b) => b.count - a.count);

  const bestLocation = sortedLocations.length > 0 ? sortedLocations[0] : null;

  // --- Heatmap Logic ---
  const heatDays = 98; // 14 weeks exactly
  const hToday = getLogicalDate(new Date()); hToday.setHours(0,0,0,0);
  const heatStart = new Date(hToday); heatStart.setDate(hToday.getDate() - heatDays + 1);
  while (heatStart.getDay() !== 1) { // align to Monday
    heatStart.setDate(heatStart.getDate() - 1);
  }
  const totalHeatDays = Math.round((hToday - heatStart) / (1000*60*60*24)) + 1;
  const numWeeks = Math.ceil(totalHeatDays / 7);
  
  let heatmapHTML = '';
  for (let c = 0; c < numWeeks; c++) {
    for (let r = 0; r < 7; r++) {
      const d = new Date(heatStart);
      d.setDate(d.getDate() + c * 7 + r);
      if (d > hToday) {
         heatmapHTML += `<div style="width:14px;height:14px"></div>`;
         continue;
      }
      const ds = new Date(d); ds.setHours(3,0,0,0);
      const de = new Date(d); de.setHours(26,59,59,999);
      const dMin = logs.filter(l => {
        const t = new Date(l.started_at);
        return t >= ds && t <= de;
      }).reduce((s,l)=>s+l.duration_minutes,0);
      
      let level = 0;
      if (dMin > 0) level = 1;
      if (dMin >= 60) level = 2; 
      if (dMin >= 180) level = 3; 
      if (dMin >= 300) level = 4;
      const title = `${d.toLocaleDateString('ja-JP')} : ${formatMinutes(dMin)}`;
      heatmapHTML += `<div class="heatmap-cell" data-level="${level}" title="${title}"></div>`;
    }
  }

  // 試験逆算ペースメーター（目標リングの直下に出す）
  const pacer = buildExamPacer(examCountdowns, getQBProgress(), getVideoProgress(),
                               logs, getDailyProgressDeltas());

  // Format hours for ring display
  const todayH = (todayMin / 60).toFixed(1);
  const goalH = (goalMin / 60).toFixed(1);
  const remainH = (remainMin / 60).toFixed(1);

  // Helper for TOD icon
  function getTODIcon(bucket) {
    if(bucket === 'morning') return IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>');
    if(bucket === 'lunch') return IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>');
    if(bucket === 'night') return IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>');
    return IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>');
  }
  function getTODName(bucket) {
    if(bucket === 'morning') return '朝 (3-11)';
    if(bucket === 'lunch') return '昼 (11-17)';
    if(bucket === 'night') return '夜 (17-23)';
    return '深夜 (23-3)';
  }
  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ダッシュボード</h1><p class="page-subtitle">学習進捗の全体像を把握しよう</p></div>

    <!-- Sleep Toggle -->
    <div class="sleep-toggle-card animate-slide-up">
      <button class="sleep-toggle-btn ${getSleepToggleState() === 'wake_up' ? 'is-wakeup' : 'is-bedtime'}" id="sleep-toggle-btn">
        <span class="sleep-toggle-icon">${getSleepToggleState() === 'wake_up' 
          ? IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>')
          : IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}</span>
        <span class="sleep-toggle-label">${getSleepToggleState() === 'wake_up' ? '起床' : '就寝'}</span>
      </button>
      ${(() => {
        // 起床済みかつ就寝未記録の場合のみ「徹夜」ボタンを表示
        const todayEntry = getSleepLogForDate(toLocalDateKey(logicalToday));
        const showAllNighter = todayEntry && todayEntry.wake_up && !todayEntry.bedtime;
        return showAllNighter
          ? `<button class="sleep-toggle-btn" id="sleep-allnighter-btn" style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc;font-size:0.8rem;padding:8px 14px;">
              <span style="font-size:1.1rem;">🌙</span>
              <span style="font-size:0.8rem;">徹夜</span>
            </button>`
          : '';
      })()}
      <span class="sleep-toggle-info" id="sleep-info-container">
        ${(() => {
          const todayEntry = getSleepLogForDate(toLocalDateKey(logicalToday));
          
          const prevDate = new Date(logicalToday);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevEntry = getSleepLogForDate(toLocalDateKey(prevDate));

          if (todayEntry && isAllNighter(todayEntry)) {
            return `${IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')} 起床 ${todayEntry.wake_up || '--:--'} <span style="color:#a5b4fc;font-size:0.75rem;">（徹夜 0h）</span>`;
          }
          if (todayEntry && todayEntry.wake_up) {
            return `起床 ${todayEntry.wake_up}${todayEntry.bedtime ? ' / 就寝 ' + todayEntry.bedtime : ''}`;
          }
          if (isAllNighter(prevEntry)) {
            return `前日徹夜（${todayEntry && todayEntry.bedtime ? '就寝 ' + todayEntry.bedtime : '就寝待ち'}）`;
          }
          return '睡眠未記録';
        })()}
        <button class="sleep-edit-btn" id="sleep-edit-modal-trigger" title="睡眠記録を編集/追加">
          ${IC._s('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path>')}
        </button>
      </span>
    </div>

    <!-- HERO: Goal Ring -->
    <div class="card goal-ring-hero animate-slide-up">
      ${streak > 0 ? `<div class="goal-ring-streak"><span style="display:inline-flex;align-items:center;gap:4px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg> 連続達成 ${streak}日目</span></div>` : ''}
      <div class="goal-ring-container ${pct >= 100 ? 'achieved' : ''}" id="goal-ring-wrap">
        <svg viewBox="0 0 240 240">
          <circle class="goal-ring-bg" cx="120" cy="120" r="${radius}"/>
          <circle class="goal-ring-glow" cx="120" cy="120" r="${radius}"
            stroke="${ringColor}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="goal-ring-glow"/>
          <circle class="goal-ring-progress" cx="120" cy="120" r="${radius}"
            stroke="${ringColor}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="goal-ring-arc"/>
        </svg>
        <div class="goal-ring-text">
          <div class="goal-ring-current" style="color:${ringColor}">${todayH}h</div>
          <div class="goal-ring-target">/ ${goalH}h</div>
          <div class="goal-ring-remaining">${pct >= 100 ? IC.check+' 達成！' : `残り ${remainH}h`}</div>
        </div>
      </div>
      <div class="goal-adjuster" id="goal-adjuster">
        <button class="goal-adjuster-btn" id="goal-dec">−</button>
        <div class="goal-adjuster-label">今日の目標: ${goalH}h</div>
        <button class="goal-adjuster-btn" id="goal-inc">＋</button>
      </div>
    </div>

    <!-- 試験逆算ペースメーター -->
    ${!pacer ? '' : `
    <div class="card pacer-card animate-slide-up" style="animation-delay:.07s">
      <div class="pacer-head">
        <div class="pacer-head-left">
          ${pacer.future.length > 1 ? `
            <select id="pacer-exam" class="pacer-select">
              ${pacer.future.map(e => `<option value="${e.id}" ${String(e.id)===String(pacer.exam.id)?'selected':''}>${e.name}</option>`).join('')}
            </select>` : `<span class="pacer-exam-name">${pacer.exam.name}</span>`}
          <span class="pacer-days">あと <strong>${pacer.daysLeft}</strong> 日</span>
        </div>
        <select id="pacer-round" class="pacer-select">
          ${[1,2,3].map(n => `<option value="${n}" ${n===pacer.targetRound?'selected':''}>${n}周目まで</option>`).join('')}
        </select>
      </div>

      ${pacer.noMaterial ? `
        <div class="data-collecting-msg" style="margin:0">
          教材進捗トラッカーで問題数を登録すると、必要ペースを計算します。
          <div style="margin-top:8px"><a href="/qb" data-route="/qb" class="acc-link">教材進捗トラッカーを開く →</a></div>
        </div>
      ` : `
        <div class="pacer-grid">
          <div class="pacer-stat">
            <div class="pacer-stat-label">1日あたり必要</div>
            <div class="pacer-stat-value" style="color:var(--color-accent-teal)">${Math.ceil(pacer.requiredPerDay)}<span class="acc-unit">問/日</span></div>
            <div class="pacer-stat-sub">残り ${pacer.qb.remaining.toLocaleString()}問</div>
          </div>
          <div class="pacer-stat">
            <div class="pacer-stat-label">直近7日の実績</div>
            <div class="pacer-stat-value" style="color:${pacer.pace.perDay === null ? 'var(--color-text-tertiary)' : (pacer.pace.perDay >= pacer.requiredPerDay ? '#10b981' : '#ef4444')}">${pacer.pace.perDay === null ? '--' : Math.round(pacer.pace.perDay)}<span class="acc-unit">${pacer.pace.perDay === null ? '' : '問/日'}</span></div>
            <div class="pacer-stat-sub">${pacer.pace.perDay === null ? '記録が貯まると表示' : (pacer.pace.perDay >= pacer.requiredPerDay ? '必要ペースを満たしています' : `不足 ${Math.ceil(pacer.requiredPerDay - pacer.pace.perDay)}問/日`)}</div>
          </div>
          <div class="pacer-stat">
            <div class="pacer-stat-label">本番までの予測</div>
            <div class="pacer-stat-value" style="color:${pacer.projectedPct === null ? 'var(--color-text-tertiary)' : accColor(Math.min(100, pacer.projectedPct))}">${pacer.projectedPct === null ? '--' : Math.min(100, Math.round(pacer.projectedPct))}<span class="acc-unit">${pacer.projectedPct === null ? '' : '%'}</span></div>
            <div class="pacer-stat-sub">現在 ${Math.round(pacer.qb.pct)}% (${pacer.qb.done.toLocaleString()}/${pacer.qb.total.toLocaleString()}問)</div>
          </div>
        </div>

        <div class="pacer-bar">
          <div class="pacer-bar-now" style="width:${Math.min(100, pacer.qb.pct)}%"></div>
          ${pacer.projectedPct !== null ? `<div class="pacer-bar-proj" style="left:${Math.min(100, pacer.qb.pct)}%;width:${Math.max(0, Math.min(100, pacer.projectedPct) - Math.min(100, pacer.qb.pct))}%"></div>` : ''}
        </div>
        <div class="pacer-bar-legend">
          <span><i class="pacer-now"></i>今の進捗</span>
          <span><i class="pacer-proj"></i>このペースでの到達見込み</span>
        </div>

        ${pacer.status === 'good' ? `<div class="pacer-verdict good">${IC.check} このペースなら ${pacer.targetRound}周目まで間に合います。</div>` : ''}
        ${pacer.status === 'warning' ? `<div class="pacer-verdict warning">${IC.warn} ぎりぎりです。1日 ${Math.ceil(pacer.requiredPerDay)}問 を切らないようにしましょう。</div>` : ''}
        ${pacer.status === 'danger' ? `<div class="pacer-verdict danger">${IC.warn} このままだと ${Math.round(pacer.projectedPct)}% で本番を迎えます。1日 ${Math.ceil(pacer.requiredPerDay)}問 が必要です。</div>` : ''}
        ${pacer.status === 'unknown' ? `<div class="pacer-verdict">学習記録で「問題演習」の問題数を入れると、実績ペースと予測が出ます。</div>` : ''}
        ${pacer.videoBlocking ? `<div class="pacer-note">${IC.warn} 講義動画が ${pacer.video.remaining}本 残っています（1日 ${Math.ceil(pacer.video.requiredPerDay * 10) / 10}本）。見ていない範囲はQBに進めないので、実際の必要ペースはこれより厳しくなります。</div>` : ''}
      `}
    </div>`}

    <!-- Mini Stats -->
    <div class="mini-stats-row animate-slide-up" style="animation-delay:.1s">
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-teal)">${Math.floor(totalMinutes/60)}<span style="font-size:.75rem;font-weight:500;color:var(--color-text-secondary)">h</span></div>
        <div class="mini-stat-label">総学習時間</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-blue)">${formatMinutes(avgMin)}</div>
        <div class="mini-stat-label">1日平均</div>
      </div>
      <div class="mini-stat">
        <div class="mini-stat-value" style="color:var(--color-accent-green)">${overall}<span style="font-size:.75rem;font-weight:500;color:var(--color-text-secondary)">%</span></div>
        <div class="mini-stat-label">総合進捗率</div>
      </div>
    </div>

    <!-- Study Trend Chart -->
    <div class="card animate-slide-up" style="animation-delay:.15s">
      <div class="card-header">
        <div class="card-title">${IC.chart}学習推移</div>
        <div class="period-tabs" id="period-tabs">
          <button class="period-tab ${dashboardPeriod==='daily'?'active':''}" data-period="daily">最近7日</button>
          <button class="period-tab ${dashboardPeriod==='thisweek'?'active':''}" data-period="thisweek">今週</button>
          <button class="period-tab ${dashboardPeriod==='weekly'?'active':''}" data-period="weekly">週</button>
          <button class="period-tab ${dashboardPeriod==='monthly'?'active':''}" data-period="monthly">月</button>
        </div>
      </div>
      <div id="trend-summary" style="font-size:.8125rem;color:var(--color-text-secondary);margin-bottom:var(--space-sm)"></div>
      <div class="chart-container"><canvas id="trendMixedChart"></canvas></div>
    </div>

    <!-- Continuous Heatmap -->
    <div class="card animate-slide-up" style="animation-delay:.20s; margin-top:var(--space-md);">
      <div class="card-header"><div class="card-title">${IC.calendar}継続ヒートマップ</div></div>
      <div class="heatmap-container">
        <div class="heatmap-scroll">
          <div class="heatmap-wrapper">
            <div class="heatmap-month-labels"></div> <!-- Future use for month labels -->
            <div class="heatmap-day-labels">
              <div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div><div>日</div>
            </div>
            <div class="heatmap-grid" id="heatmap-grid">
              ${heatmapHTML}
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; align-items:center; gap:4px; font-size:10px; color:var(--color-text-tertiary);">
          <span>Less</span>
          <div class="heatmap-cell" data-level="0"></div>
          <div class="heatmap-cell" data-level="1"></div>
          <div class="heatmap-cell" data-level="2"></div>
          <div class="heatmap-cell" data-level="3"></div>
          <div class="heatmap-cell" data-level="4"></div>
          <span>More</span>
        </div>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="dashboard-bottom" style="margin-top:var(--space-xl)">
      <div class="card animate-slide-up" style="animation-delay:.25s"><div class="card-header"><div class="card-title">${IC.clock}科目別学習時間</div><span style="font-size:0.75rem;color:var(--color-text-tertiary)">${sortedSubjectTime.length}科目</span></div>
        <div class="category-progress-list">
          ${sortedSubjectTime.length > 0 ? (() => {
            const top10 = sortedSubjectTime.slice(0, 10);
            const rest = sortedSubjectTime.slice(10);
            const renderItem = (s) => `
              <div class="category-progress-item">
                <div class="category-progress-header">
                  <span class="category-progress-name" style="position:relative;display:inline-flex;align-items:center;">
                    <input type="color" class="subject-color-picker" data-subject="${s.name}" value="${s.color}" style="position:absolute;opacity:0;width:16px;height:16px;left:0;cursor:pointer;z-index:2;"/>
                    <span class="dot subject-color-dot" style="background:${s.color};width:10px;height:10px;border-radius:50%;margin-right:8px;z-index:1;"></span>
                    ${s.name}
                  </span>
                  <span class="category-progress-value">${formatMinutes(s.minutes)}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:0%; background:${s.color}" data-width="${Math.round((s.minutes / maxSubMinutes) * 100)}"></div>
                </div>
              </div>`;
            return top10.map(renderItem).join('') + (rest.length > 0 ? `
              <details class="subject-expand-details">
                <summary class="subject-expand-btn">
                  ${IC._s('<polyline points="6 9 12 15 18 9"/>')} 他 ${rest.length}科目を表示
                </summary>
                <div class="subject-expand-content">
                  ${rest.map(renderItem).join('')}
                </div>
              </details>` : '');
          })() : '<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-md)">まだ学習記録がありません</p>'}
        </div>
      </div>

      <!-- Environment & Analytics -->
      <div style="display:flex; flex-direction:column; gap:var(--space-md);">
        <div class="card animate-slide-up" style="animation-delay:.3s"><div class="card-header"><div class="card-title">${IC.book}QB進捗サマリー</div></div>
          <div style="padding:var(--space-md);padding-top:0;">
            ${(()=>{
              const qb=getQBProgress();
              const vid=getVideoProgress();
              // 周をまたいで合算すると母数が周の数だけ増えて達成率が意味を失うため、
              // 周ごとに1本ずつ棒を並べる。
              return subjectCategories.filter(c=>c.id.startsWith('cat-vol')).map(cat=>{
                const agg=volRoundAggregate(qb,vid,cat);
                return`<div style="margin-bottom:14px;">
                  <div style="font-weight:600;font-size:0.85rem;margin-bottom:6px;">${cat.name}</div>
                  ${agg.rounds.length===0
                    ? '<div style="font-size:0.72rem;color:var(--color-text-tertiary);">未登録</div>'
                    : agg.rounds.map(r=>`
                      <div style="margin-bottom:7px;">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:0.75rem;margin-bottom:3px;">
                          <span style="color:var(--color-text-secondary);font-weight:600;">${r.round}周目</span>
                          <span style="font-weight:700;font-size:0.82rem;color:${roundBarColor(r.pct)};">${r.total>0?r.pct+'%':'--'}</span>
                        </div>
                        <div style="height:8px;background:var(--color-bg-elevated);border-radius:4px;overflow:hidden;margin-bottom:2px;">
                          <div style="height:100%;width:${r.pct}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:4px;transition:width 0.5s;"></div>
                        </div>
                        <div style="font-size:0.68rem;color:var(--color-text-tertiary);">${r.done}/${r.total}問 ・ 正答率 ${r.accPct!==null?r.accPct+'%':'---'}</div>
                      </div>`).join('')}
                </div>`;
              }).join('');
            })()}
          </div>
        </div>

        <div class="card animate-slide-up" style="animation-delay:.35s"><div class="card-header"><div class="card-title">${IC.target}集中度と環境分析</div></div>
          <div style="padding:var(--space-md); padding-top:0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-sm);">
              <span style="color:var(--color-text-secondary); font-size:0.9rem;">平均集中度:</span>
              <span style="font-weight:bold; font-size:1.1rem;">
                ${avgFocus !== '-' ? `${avgFocus} / 5.0` : 'データなし'}
              </span>
            </div>
            ${bestLocation ? `
              <div style="margin-bottom:var(--space-md);">
                <span style="color:var(--color-text-secondary); font-size:0.9rem;">頻出の場所:</span>
                <span style="font-weight:bold;">${bestLocation.loc} (平均集中度 ${bestLocation.avg})</span>
              </div>
              <div style="display:grid; gap:8px;">
                ${sortedLocations.map(stat => `
                  <div style="display:flex; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px;">
                    <div style="flex:1;">${stat.loc}</div>
                    <div style="font-size:0.9rem; margin-right:12px; color:var(--color-text-secondary);">${stat.count}回</div>
                    <div style="font-weight:bold;">${stat.avg}★</div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="text-align:center; color:var(--color-text-tertiary);">データなし</p>'}
          </div>

          <div style="padding:var(--space-md); border-top:1px solid var(--color-border);">
            <div style="font-weight:bold; font-size:0.9rem; margin-bottom:12px;">${IC.clock}時間帯別のパフォーマンス</div>
            <div class="chart-container" style="min-height:180px; position:relative;">
              <canvas id="todLevelChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Animate ring ---
  setTimeout(() => {
    const arc = document.getElementById('goal-ring-arc');
    const glow = document.getElementById('goal-ring-glow');
    if (arc) arc.style.strokeDashoffset = dashOffset;
    if (glow) glow.style.strokeDashoffset = dashOffset;
  }, 100);

  // --- Render trend chart based on period ---
  function renderTrendChart(period) {
    const labels = [], barData = [], lineData = [];
    const logicalToday = getLogicalDate(new Date());

    if (period === 'daily') {
      const days = ['日','月','火','水','木','金','土'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(logicalToday); d.setDate(d.getDate() - i);
        const ds = new Date(d); ds.setHours(5, 0, 0, 0);
        const de = new Date(d); de.setHours(28, 59, 59, 999);
        const mins = logs.filter(l => { 
          const t = new Date(l.started_at); 
          return t >= ds && t <= de; 
        }).reduce((s, l) => s + l.duration_minutes, 0);
        barData.push(mins);
        lineData.push(getGoalForDate(d));
        labels.push(`${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`);
      }
      const avgAch = lineData.reduce((s, g, i) => s + (g > 0 ? Math.min(100, Math.round(barData[i] / g * 100)) : 0), 0) / Math.max(1, lineData.filter(g => g > 0).length);
      const el = document.getElementById('trend-summary');
      if (el) el.textContent = `最近7日間の平均達成率: ${Math.round(avgAch)}%`;
    } else if (period === 'thisweek') {
      // Monday to Sunday fixed window
      const dayIdx = logicalToday.getDay(); // 0:Sun, 1:Mon
      const diffSinceMon = (dayIdx === 0 ? 6 : dayIdx - 1);
      const monDate = new Date(logicalToday); monDate.setDate(logicalToday.getDate() - diffSinceMon);
      const dayNames = ['月','火','水','木','金','土','日'];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(monDate); d.setDate(monDate.getDate() + i);
        const ds = new Date(d); ds.setHours(5, 0, 0, 0);
        const de = new Date(d); de.setHours(28, 59, 59, 999);
        
        let mins = 0;
        if (d <= logicalToday) {
          mins = logs.filter(l => {
            const t = new Date(l.started_at);
            return t >= ds && t <= de;
          }).reduce((s, l) => s + l.duration_minutes, 0);
        }
        barData.push(mins);
        lineData.push(getGoalForDate(d));
        labels.push(dayNames[i]);
      }
      const weekSum = barData.reduce((a, b) => a + b, 0);
      const el = document.getElementById('trend-summary');
      if (el) el.textContent = `今週の合計: ${formatMinutes(weekSum)}`;
    } else if (period === 'weekly') {
      // Past 5 weeks (Mon-Sun)
      for (let i = 4; i >= 0; i--) {
        const dNow = new Date(logicalToday); dNow.setDate(dNow.getDate() - i * 7);
        const wIdx = dNow.getDay();
        const diffMon = (wIdx === 0 ? 6 : wIdx - 1);
        const wStart = new Date(dNow); wStart.setDate(dNow.getDate() - diffMon);
        wStart.setHours(5, 0, 0, 0);
        const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
        wEnd.setHours(28, 59, 59, 999);
        
        const mins = logs.filter(l => {
          const t = new Date(l.started_at);
          return t >= wStart && t <= wEnd;
        }).reduce((s, l) => s + l.duration_minutes, 0);
        
        let goalSum = 0;
        for (let di = 0; di < 7; di++) {
          const dd = new Date(wStart); dd.setDate(wStart.getDate() + di);
          goalSum += getGoalForDate(dd);
        }
        barData.push(mins);
        lineData.push(goalSum);
        labels.push(`${wStart.getMonth() + 1}/${wStart.getDate()}~`);
      }
      const el = document.getElementById('trend-summary');
      if (el) el.textContent = `週次推移 (月〜日 単位)`;
    } else { // monthly
      // Past 6 months
      for (let m = 5; m >= 0; m--) {
        const mStart = new Date(logicalToday.getFullYear(), logicalToday.getMonth() - m, 1);
        mStart.setHours(5, 0, 0, 0);
        const lastDay = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0);
        const mEnd = new Date(lastDay); mEnd.setHours(28, 59, 59, 999);
        
        const mins = logs.filter(l => {
          const t = new Date(l.started_at);
          return t >= mStart && t <= mEnd;
        }).reduce((s, l) => s + l.duration_minutes, 0);
        
        let goalSum = 0;
        for (let di = 0; di < lastDay.getDate(); di++) {
          const dd = new Date(mStart); dd.setDate(mStart.getDate() + di);
          goalSum += getGoalForDate(dd);
        }
        barData.push(mins);
        lineData.push(goalSum);
        labels.push(`${mStart.getFullYear()}/${mStart.getMonth() + 1}`);
      }
      const el = document.getElementById('trend-summary');
      if (el) el.textContent = `月間推移 (5時境界)`;
    }
    createMixedChart('trendMixedChart', labels, barData, lineData, '実績(分)', '目標(分)');
  }

  setTimeout(() => {
    renderTrendChart(dashboardPeriod);
    

    // --- Render TOD Hourly Level Chart --- 
    if (typeof Chart !== 'undefined') {
      const todCanvas = document.getElementById('todLevelChart');
      if (todCanvas) {
        destroyChart('todLevelChart');
        // Re-order to start from 5 AM: [5,6,7...,23,0,1,2,3,4]
        const todOrder = [];
        for(let i=5; i<24; i++) todOrder.push(i);
        for(let i=0; i<5; i++) todOrder.push(i);
        
        const todLabels = todOrder.map(h => `${h}時`);
        const todMinData = todOrder.map(h => hourlyStats[h].min);
        const todFocusData = todOrder.map(h => hourlyStats[h].countF > 0 ? (hourlyStats[h].sumF / hourlyStats[h].countF).toFixed(1) : 0);
        
        chartInstances['todLevelChart'] = new Chart(todCanvas, {
          type: 'bar',
          data: {
            labels: todLabels,
            datasets: [
              {
                label: '学習時間(分)',
                data: todMinData,
                backgroundColor: 'rgba(78, 205, 196, 0.5)',
                borderColor: '#4ECDC4',
                borderWidth: 1,
                borderRadius: 2,
                order: 2,
                yAxisID: 'y'
              },
              {
                label: '平均集中度',
                data: todFocusData,
                type: 'line',
                borderColor: '#FF6B6B',
                backgroundColor: '#FF6B6B',
                borderWidth: 2,
                pointRadius: 2,
                pointBackgroundColor: '#FF6B6B',
                tension: 0.3,
                order: 1,
                yAxisID: 'yFocus'
              }
            ]
          },
          options: {
            // Standard vertical bars for timeline feel
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { 
                display: true, 
                grid: { color: 'rgba(148,163,184,0.06)' },
                ticks: { font: { size: 9 }, callback: (v) => v + 'm' }
              },
              x: { 
                display: true, 
                grid: { display: false }, 
                ticks: { 
                  font: { size: 8 }, 
                  maxRotation: 0, 
                  autoSkip: false,
                  callback: function(val, index) {
                    // Show only every 3 hours or key times to save space on mobile
                    const hr = todOrder[index];
                    return (hr % 3 === 0 || hr === 5) ? this.getLabelForValue(val) : '';
                  }
                } 
              },
              yFocus: {
                position: 'right',
                min: 0, max: 5,
                display: false,
                grid: { display: false }
              }
            },
            plugins: {
              legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  title: (items) => {
                    const hr = todOrder[items[0].dataIndex];
                    const nextHr = (hr + 1) % 24;
                    return `${hr}:00 〜 ${nextHr}:00 の活動`;
                  },
                  label: (ctx) => {
                    const label = ctx.dataset.label || '';
                    if (label.includes('集中度')) return `${label}: ${ctx.parsed.y}★`;
                    return `${label}: ${ctx.parsed.y}分`;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Animate progress bars
    const fills = document.querySelectorAll('.progress-bar-fill');
    fills.forEach((b, i) => {
      const w = b.getAttribute('data-width');
      if (w !== null) {
        setTimeout(() => { b.style.width = w + '%'; }, i * 20);
      }
    });

    // Auto-scroll heatmap to right (to show today)
    const hScroll = document.querySelector('.heatmap-scroll');
    if (hScroll) hScroll.scrollLeft = hScroll.scrollWidth;
    
  }, 200);

  // --- Event Listeners ---
  // Period tabs
  document.getElementById('pacer-exam')?.addEventListener('change', e => { setPacerExamId(e.target.value); renderDashboard(); });
  document.getElementById('pacer-round')?.addEventListener('change', e => { setPacerTargetRound(parseInt(e.target.value, 10)); renderDashboard(); });

  document.getElementById('period-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-tab');
    if (!btn) return;
    dashboardPeriod = btn.dataset.period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderTrendChart(dashboardPeriod);
  });

  // Goal adjuster
  document.getElementById('goal-dec')?.addEventListener('click', () => {
    const cur = getTodayGoalMinutes();
    const next = Math.max(0, cur - 30);
    setTodayGoalOverride(next);
    renderDashboard();
  });
  document.getElementById('goal-inc')?.addEventListener('click', () => {
    const cur = getTodayGoalMinutes();
    const next = cur + 30;
    setTodayGoalOverride(next);
    renderDashboard();
  });

  document.getElementById('sleep-toggle-btn')?.addEventListener('click', async () => {
    const state = getSleepToggleState();
    const time = await recordSleepEvent(state);
    if (state === 'wake_up') {
      showToast(IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>') + ` 起床を記録しました（${time}）`);
    } else {
      showToast(IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>') + ` 就寝を記録しました（${time}）`);
    }
    renderDashboard();
  });

  document.getElementById('sleep-allnighter-btn')?.addEventListener('click', async () => {
    const logicalDate = getLogicalDate(new Date());
    const dateKey = toLocalDateKey(logicalDate);
    await upsertSleepLog(dateKey, 'bedtime', 'ALLNIGHTER');
    showToast('🌙 徹夜として記録しました（睡眠0時間）');
    renderDashboard();
  });

  document.getElementById('sleep-edit-modal-trigger')?.addEventListener('click', () => {
    showSleepEditModal();
  });

  function showSleepEditModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay animate-fade-in';
    modal.style.zIndex = '2000';

    const localTodayStr = toLocalDateKey(new Date());
    
    modal.innerHTML = `
      <div class="modal-content animate-slide-up" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title">睡眠記録の編集・追加</div>
          <button class="modal-close" id="close-sleep-modal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:16px;">
            起床・就寝ボタンの押し忘れや、過去の記録を修正・追加できます。
          </p>
          
          <div class="settings-field" style="margin-bottom:12px;">
            <label>日付</label>
            <input type="date" id="sleep-edit-date" value="${localTodayStr}" max="${localTodayStr}" />
          </div>
          
          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div class="settings-field" style="flex:1;">
              <label>起床時間</label>
              <input type="time" id="sleep-edit-wakeup" />
            </div>
            <div class="settings-field" style="flex:1;">
              <label>就寝時間</label>
              <input type="time" id="sleep-edit-bedtime" />
            </div>
          </div>

          <div style="display:flex; gap:8px; margin-bottom:16px;">
            <button class="btn btn-primary" id="btn-save-sleep-edit" style="flex:1;">
              記録を保存する
            </button>
            <button class="btn" id="btn-allnighter-sleep-edit" style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc;padding:8px 16px;border-radius:8px;font-size:0.85rem;white-space:nowrap;">
              🌙 徹夜
            </button>
          </div>

          <hr style="border:none; border-top:1px solid var(--color-border); margin:16px 0;" />

          <div style="font-weight:700; font-size:0.85rem; margin-bottom:8px;">最近の睡眠記録</div>
          <div class="sleep-history-list" id="sleep-history-container">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const dateInput = modal.querySelector('#sleep-edit-date');
    const wakeupInput = modal.querySelector('#sleep-edit-wakeup');
    const bedtimeInput = modal.querySelector('#sleep-edit-bedtime');
    const historyContainer = modal.querySelector('#sleep-history-container');

    const updateInputsForSelectedDate = () => {
      const selectedDate = dateInput.value;
      const entry = getSleepLogForDate(selectedDate);
      wakeupInput.value = entry && entry.wake_up ? entry.wake_up : '';
      // ALLNIGHTERの場合、就寝欄には表示しない
      bedtimeInput.value = entry && entry.bedtime && entry.bedtime !== 'ALLNIGHTER' ? entry.bedtime : '';
      // 徹夜ボタンのラベル変更
      const allNighterBtn = modal.querySelector('#btn-allnighter-sleep-edit');
      if (allNighterBtn) {
        const isAN = isAllNighter(entry);
        allNighterBtn.style.background = isAN ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)';
        allNighterBtn.textContent = isAN ? '🌙 徹夜記録済み' : '🌙 徹夜';
      }
    };

    const renderSleepHistory = () => {
      const logs = getSleepLogs();
      // Sort newest first
      const sortedLogs = [...logs].sort((a,b) => b.date.localeCompare(a.date));
      if (sortedLogs.length === 0) {
        historyContainer.innerHTML = '<div style="text-align:center; padding:12px; color:var(--color-text-tertiary); font-size:0.8rem;">記録がありません</div>';
        return;
      }
      historyContainer.innerHTML = sortedLogs.map(log => `
        <div class="sleep-history-item">
          <div>
            <span class="sleep-history-date">${log.date}</span>
            <span class="sleep-history-times" style="margin-left:8px;">
              ${isAllNighter(log)
                ? `起床: ${log.wake_up || '--:--'} / <span style="color:#a5b4fc;">🌙 徹夜(0h)</span>`
                : `起床: ${log.wake_up || '--:--'} / 就寝: ${log.bedtime || '--:--'}`
              }
            </span>
          </div>
          <button class="sleep-history-delete" data-date="${log.date}">削除</button>
        </div>
      `).join('');

      historyContainer.querySelectorAll('.sleep-history-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const targetDate = e.target.dataset.date;
          if (confirm(`${targetDate} の睡眠記録を削除しますか？`)) {
            await deleteSleepLog(targetDate);
            renderSleepHistory();
            updateInputsForSelectedDate();
            showToast('睡眠記録を削除しました');
          }
        });
      });
    };

    dateInput.addEventListener('change', updateInputsForSelectedDate);


    modal.querySelector('#btn-save-sleep-edit').onclick = async () => {
      const dateVal = dateInput.value;
      const wakeVal = wakeupInput.value;
      const bedVal = bedtimeInput.value;

      if (!dateVal) {
        alert('日付を選択してください');
        return;
      }

      if (wakeVal) await upsertSleepLog(dateVal, 'wake_up', wakeVal);
      if (bedVal) await upsertSleepLog(dateVal, 'bedtime', bedVal);

      // 両方空の場合は削除
      if (!wakeVal && !bedVal) {
        await deleteSleepLog(dateVal);
      }

      showToast(IC.check + ' 睡眠記録を保存しました');
      modal.remove();
      renderDashboard();
    };

    modal.querySelector('#btn-allnighter-sleep-edit').onclick = async () => {
      const dateVal = dateInput.value;
      if (!dateVal) { alert('日付を選択してください'); return; }
      const wakeVal = wakeupInput.value;
      // 起床時刻が入力されている場合は先に保存
      if (wakeVal) await upsertSleepLog(dateVal, 'wake_up', wakeVal);
      await upsertSleepLog(dateVal, 'bedtime', 'ALLNIGHTER');
      showToast('🌙 ' + dateVal + ' を徹夜として記録しました');
      modal.remove();
      renderDashboard();
    };


    // Initialize
    updateInputsForSelectedDate();
    renderSleepHistory();

    const close = () => modal.remove();
    modal.querySelector('#close-sleep-modal').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
  }


  // (Redundant click logic removed as input is now directly overlayed)
  document.querySelectorAll('.subject-color-picker').forEach(picker => {
    picker.addEventListener('input', (e) => {
      const subjectName = e.target.dataset.subject;
      const newColor = e.target.value;
      saveUserSubjectColor(subjectName, newColor);
      // Instantly update dot + bar without full re-render
      const dot = e.target.parentElement.querySelector('.dot');
      if (dot) dot.style.background = newColor;
      const bar = e.target.closest('.category-progress-item')?.querySelector('.progress-bar-fill');
      if (bar) bar.style.background = newColor;
    });
  });
}

// --- Study ---
async function renderStudy(){
  const ct=document.getElementById('page-container');
  if(!ct) return;

  // Optimize: Parallel fetch
  const [logs, checks] = await Promise.all([fetchStudyLogs(), fetchChecklists()]);
  
  const logicalToday = getLogicalDate(new Date());
  const allSubjects=subjectCategories.flatMap(c=>c.subjects.map(s=>({...s,category:c.name})));
  const logsByDay={};
  for(let i=0;i<7;i++){
    const d=new Date(logicalToday); d.setDate(logicalToday.getDate()-i);
    const key=d.toLocaleDateString('ja-JP',{month:'short',day:'numeric',weekday:'short'});
    const ds=new Date(d);ds.setHours(3,0,0,0);const de=new Date(d);de.setHours(26,59,59,999);
    logsByDay[key]=logs.filter(l=>{const t=new Date(l.started_at);return t>=ds&&t<=de;});}

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">学習記録</h1><p class="page-subtitle">集中して勉強時間を記録しよう</p></div>
    <div class="study-layout">
      <!-- Timer Main Card -->
      <div class="stopwatch-card card animate-slide-up" style="position:relative; overflow:hidden;">
        <!-- Mode Switcher -->
        <div class="timer-mode-switcher" style="display:flex; justify-content:center; gap:8px; margin-bottom:var(--space-md); background:var(--color-bg-elevated); padding:4px; border-radius:var(--radius-md);">
          <button class="mode-tab ${!isCountdown && !isPomodoro && !isSimulation?'active':''}" id="mode-up">ストップウォッチ</button>
          <button class="mode-tab ${isCountdown && !isPomodoro && !isSimulation?'active':''}" id="mode-down">タイマー</button>
          <button class="mode-tab ${isPomodoro?'active':''}" id="mode-pomodoro">ポモドーロ</button>
          <button class="mode-tab ${isSimulation?'active':''}" id="mode-simulation">本番模試</button>
        </div>

        <svg width="0" height="0"><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ECDC4"/><stop offset="100%" stop-color="#45B7D1"/></linearGradient></defs></svg>
        <div class="stopwatch-subject-selector">
          <select id="study-subject">
            <option value="">-- 科目を選択 --</option>
            ${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}" ${selectedSubjectId===s.id?'selected':''}>${s.name}</option>`).join('')}</optgroup>`).join('')}
            <option value="custom" ${selectedSubjectId==='custom'?'selected':''}>その他・自由入力</option>
          </select>
        </div>
        <div id="study-subject-custom-row" style="display:${selectedSubjectId==='custom'?'block':'none'}; margin-bottom:var(--space-md);">
          <input type="text" id="study-subject-custom" placeholder="具体的な学習内容..." value="${selectedSubjectCustom}" style="width:100%;max-width:300px;text-align:center;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);padding:5px;" />
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons-container" style="position:absolute; top:16px; right:16px; display:flex; gap:8px; z-index:10; background:rgba(148,163,184,0.1); padding:4px; border-radius:24px; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);">
          <!-- Sound Toggle Button -->
          <button id="btn-sound-toggle" class="stopwatch-btn" title="通知音のON/OFF" style="font-size:1.1rem; background:transparent; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            ${localStorage.getItem('medfocus_sound') !== 'false' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'}
          </button>
          <div style="width:1px; background:var(--color-border); margin:6px 0;"></div>
          <!-- Zen Mode Button -->
          <button id="btn-zen-mode" class="stopwatch-btn" title="集中(フルスクリーン)モード" style="font-size:1.1rem; background:transparent; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h6l3-9 4 18 3-9h6"/></svg></button>
        </div>

        <!-- Countdown Settings (only if not running) -->
        ${isCountdown && !isRunning && !isSimulation ? `
          <div class="countdown-settings animate-fade-in" style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:var(--space-md);">
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm preset-btn" data-min="25">25分</button>
              <button class="btn btn-secondary btn-sm preset-btn" data-min="50">50分</button>
              <button class="btn btn-secondary btn-sm preset-btn" data-min="90">90分</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" id="custom-min" placeholder="分" style="width:60px; text-align:center; background:var(--color-bg-input); border:1px solid var(--color-border); color:var(--color-text-primary); border-radius:var(--radius-sm); padding:4px;" />
              <span style="font-size:0.8rem; color:var(--color-text-secondary);">分に設定</span>
            </div>
          </div>
        ` : ''}

        <!-- Simulation Settings (only if not running) -->
        ${isSimulation && !isRunning ? `
          <div class="simulation-settings animate-fade-in" style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:var(--space-md);">
            <div style="font-weight:bold; font-size:0.9rem; color:var(--color-text-primary);">試験シミュレーションを選択</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button class="btn btn-secondary btn-sm sim-preset-btn" data-type="cbt" style="${simulationBlockTotal===6 ? 'border-color:var(--color-primary); color:var(--color-primary);' : ''}">CBT形式 (60分×6ブロック)</button>
              <button class="btn btn-secondary btn-sm sim-preset-btn" data-type="kokushi" style="${simulationBlockTotal===3 ? 'border-color:var(--color-primary); color:var(--color-primary);' : ''}">国試形式 (120分×3ブロック)</button>
            </div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary);">現在: ブロック毎 ${simulationStudyMin}分 / 休憩 ${simulationBreakMin}分 / 全${simulationBlockTotal}ブロック</div>
          </div>
        ` : ''}


        <div class="stopwatch-display">
          <div class="stopwatch-ring">
            <svg viewBox="0 0 300 300">
              <circle class="ring-bg" cx="150" cy="150" r="140"/>
              <circle class="ring-progress" id="timer-ring" cx="150" cy="150" r="140" style="stroke:${isCountdown?'var(--color-accent-pink)':'var(--color-primary)'}"/>
            </svg>
            <div class="stopwatch-time" id="timer-display">${fmtSW(isCountdown ? (isRunning ? countdownSeconds : (countdownSeconds || 1500)) : elapsedSeconds)}</div>
          </div>
        </div>

        <div class="stopwatch-controls">
          <button class="stopwatch-btn stopwatch-btn-reset" id="btn-reset" title="リセット">↺</button>
          <button class="stopwatch-btn ${isRunning?'stopwatch-btn-pause':'stopwatch-btn-start'}" id="btn-toggle">${isRunning?'⏸':'▶'}</button>
          <button class="stopwatch-btn stopwatch-btn-stop" id="btn-save" title="記録する">⏹</button>
        </div>
        ${document.pictureInPictureEnabled || 'documentPictureInPicture' in window ? `<div style="display:flex;align-items:center;gap:6px;margin-top:8px;justify-content:center;">
          <button id="btn-pip" style="background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-secondary);padding:4px 12px;font-size:0.8rem;cursor:pointer;" title="ミニタイマーをフローティング表示">${pipActive ? 'PiP 閉じる' : 'PiP'}</button>
          <button id="btn-pip-color" style="background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:4px 8px;font-size:0.9rem;cursor:pointer;" title="PiPの色を変更">${getPipTheme().label}</button>
        </div>` : ''}
        <div class="stopwatch-status ${isRunning?'recording':''}" id="timer-status">${isRunning? (isPomodoro && pomodoroPhase === 'break' ? '<span class="status-dot"></span>休憩中...' : isSimulation ? (simulationPhase === 'break' ? `<span class="status-dot"></span>休憩中... (次: ブロック${simulationBlockCurrent})` : `<span class="status-dot"></span>ブロック${simulationBlockCurrent}/${simulationBlockTotal} 挑戦中...`) : '<span class="status-dot"></span>集中記録中...') : '準備ができたら開始しましょう'}</div>
        <div class="stopwatch-memo" style="margin-top:var(--space-md);"><input type="text" id="study-memo" placeholder="メモ（任意）..." style="width:100%;max-width:300px;text-align:center;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);padding:5px;" maxlength="100"/></div>

        <!-- Confirmation Overlay -->
        ${isConfirmingLog ? `
          <div class="timer-overlay animate-fade-in" style="position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow-y:auto; text-align:center;">
            <div class="confirm-card animate-slide-up">
              <div class="celebration-icon" style="margin-bottom:var(--space-md);"><span style="font-size:2rem;color:var(--color-accent-teal)">${IC.check}</span></div>
              <h2 style="font-size:1.5rem; font-weight:700; color:var(--color-primary); margin-bottom:var(--space-xs);">お疲れ様でした！</h2>
              <p style="color:var(--color-text-secondary); margin-bottom:var(--space-lg); font-size:0.9rem;">今日の学習を記録しましょう</p>
              
              <div class="confirm-form" style="width:100%; display:flex; flex-direction:column; gap:16px; text-align:left;">
                <div class="field">
                  <label>学習時間 (分)</label>
                  <input type="number" id="confirm-duration" value="${pendingLogDuration}" style="width:100%; font-size:1.2rem; font-weight:700; text-align:center;" />
                </div>
                <div class="field">
                  <label>学習内容</label>
                  <div id="confirm-subject-wrapper">
                    <select id="confirm-subject" style="width:100%;">
                      <option value="">-- 未選択 --</option>
                      ${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}" ${selectedSubjectId===s.id?'selected':''}>${s.name}</option>`).join('')}</optgroup>`).join('')}
                      <option value="custom" ${selectedSubjectId==='custom'?'selected':''}>自由入力</option>
                    </select>
                    <input type="text" id="confirm-subject-custom" placeholder="具体的な学習内容..." value="${selectedSubjectCustom}" style="width:100%; margin-top:8px; display:${selectedSubjectId==='custom'?'block':'none'};" />
                  </div>
                </div>
                <div class="field">
                  <label>活動の種類</label>
                  ${activitySegmentHtml(selectedActivity)}
                </div>
                ${videoCountFieldsHtml('')}
                ${qbCountFieldsHtml('')}
                <div class="field">
                  <label>学習の目的</label>
                  <div class="purpose-segment-control" style="display:flex; gap:8px; margin-top:4px;">
                    <button type="button" class="btn ${selectedPurpose==='cbt'?'btn-primary':'btn-secondary'} purpose-btn" data-val="cbt" style="flex:1; padding:6px 0; font-size:0.85rem;">CBT</button>
                    <button type="button" class="btn ${selectedPurpose==='regular_exam'?'btn-primary':'btn-secondary'} purpose-btn" data-val="regular_exam" style="flex:1; padding:6px 0; font-size:0.85rem;">定期試験</button>
                    <button type="button" class="btn ${selectedPurpose==='assignment'?'btn-primary':'btn-secondary'} purpose-btn" data-val="assignment" style="flex:1; padding:6px 0; font-size:0.85rem;">課題・実習</button>
                    <button type="button" class="btn ${selectedPurpose==='other'?'btn-primary':'btn-secondary'} purpose-btn" data-val="other" style="flex:1; padding:6px 0; font-size:0.85rem;">その他</button>
                  </div>
                </div>
                <div class="field">
                  <label>振り返りメモ</label>
                  <textarea id="confirm-memo" placeholder="学んだことや一言..." style="width:100%; min-height:80px;"></textarea>
                </div>
                <div style="display:flex; gap:12px;">
                  <div class="field" style="flex:1;">
                    <label>場所</label>
                    <select id="confirm-location" style="width:100%;">
                      <option value="自宅" ${selectedLocation==='自宅'?'selected':''}>${locIcon('自宅')} 自宅</option>
                      <option value="図書館" ${selectedLocation==='図書館'?'selected':''}>${locIcon('図書館')} 図書館</option>
                      <option value="カフェ" ${selectedLocation==='カフェ'?'selected':''}>${locIcon('カフェ')} カフェ</option>
                      <option value="大学" ${selectedLocation==='大学'?'selected':''}>${locIcon('大学')} 大学</option>
                      <option value="移動中" ${selectedLocation==='移動中'?'selected':''}>${locIcon('移動中')} 移動中</option>
                      <option value="その他" ${selectedLocation==='その他'?'selected':''}>${IC.pin} その他</option>
                    </select>
                  </div>
                  <div class="field" style="flex:1;">
                    <label>集中度</label>
                    <select id="confirm-focus" style="width:100%;">
                      ${focusOptions(selectedFocusLevel)}
                    </select>
                  </div>
                </div>
                <div class="confirm-actions">
                  <button class="btn btn-secondary" id="btn-discard-log" style="flex:1; justify-content:center;">破棄</button>
                  <button class="btn btn-primary" id="btn-confirm-save" style="flex:2; justify-content:center;">記録を保存</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="study-log-card card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">${IC.list}最近の学習ログ</div></div>
        <div class="study-log-list">${Object.entries(logsByDay).map(([day,logs])=>{if(!logs.length)return'';const tot=logs.reduce((s,l)=>s+l.duration_minutes,0);
          return`<div class="study-log-day"><div class="study-log-day-header">${day} <span class="day-total">(計 ${formatMinutes(tot)})</span></div>${logs.map(l=>{const sub=allSubjects.find(s=>s.id===l.subject_name);
            // Compute real start/end times
            let realStart, realEnd;
            if(l.ended_at) {
              realStart = new Date(l.started_at);
              realEnd = new Date(l.ended_at);
            } else {
              // Old logs: started_at is actually the end time (insert time)
              realEnd = new Date(l.started_at);
              realStart = new Date(realEnd.getTime() - l.duration_minutes * 60000);
            }
            const tmStart = realStart.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
            const tmEnd = realEnd.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
            return`<div class="study-log-entry" data-id="${l.id}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:var(--space-sm);flex-wrap:wrap;">
                  <span class="study-log-subject">${sub?.name||l.subject_name}</span>${activityChip(l.activity)}${qbCountChip(l)}${videoCountChip(l)}
                  <span class="study-log-duration">${formatMinutes(l.duration_minutes)}</span>
                  <span class="study-log-time">${tmStart}〜${tmEnd}</span>
                  ${l.location && l.location !== '未設定' ? `<span class="study-log-location" style="font-size:0.75rem; margin-left:4px; color:var(--color-text-tertiary)" title="${l.location}">${locIcon(l.location)} ${l.location}</span>` : ''}
                  ${l.focus_level ? `<span class="study-log-focus" style="font-size:0.8rem; margin-left:2px;" title="集中度: ${l.focus_level}">${focusEmoji(l.focus_level)} ${l.focus_level}</span>` : ''}
                </div>
                ${l.memo?`<div class="study-log-memo" style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.memo}</div>`:''}
              </div>
              <div class="study-log-actions">
                <button class="btn-log-action edit" data-id="${l.id}" data-subject="${sub?.name||l.subject_name}" data-duration="${l.duration_minutes}" data-startedat="${realStart.toISOString()}" data-endedat="${realEnd.toISOString()}" data-memo="${l.memo||''}" data-location="${l.location || ''}" data-focus="${l.focus_level || ''}" data-activity="${l.activity || ''}" data-solved="${l.questions_solved ?? ''}" data-correct="${l.questions_correct ?? ''}" data-videos="${l.videos_watched ?? ''}" title="編集" style="font-size:0.75rem;padding:2px 8px;">編集</button>
                <button class="btn-log-action delete" data-id="${l.id}" title="削除" style="font-size:0.75rem;padding:2px 8px;color:var(--color-accent-pink);">削除</button>
              </div>
            </div>`;}).join('')}</div>`;}).join('')}</div></div>
    </div>
    
    <div class="study-check-card card animate-slide-up" style="animation-delay:.2s;margin-top:var(--space-lg);">
      <div class="card-header" style="border-bottom:1px solid rgba(148,163,184,0.1);padding-bottom:var(--space-sm);">
        <div class="card-title">${IC.stats}QB × 学習分析</div>
      </div>
      <div style="padding:var(--space-md);">
        ${(()=>{
          const qb=getQBProgress();
          const subStudyMap={};
          logs.forEach(l=>{const k=normalizeSubjectName(l.subject_name);subStudyMap[k]=(subStudyMap[k]||0)+l.duration_minutes;});
          const allSubs=subjectCategories.flatMap(c=>c.subjects);
          const rows=allSubs.map(s=>{
            const rounds=qb[s.id]||{};
            let done=0,total=0,correct=0;
            Object.values(rounds).forEach(r=>{done+=r.done||0;total+=r.total||0;correct+=r.correct||0;});
            const studyMin=subStudyMap[s.name]||0;
            if(done===0&&total===0&&studyMin===0)return null;
            const pct=total>0?Math.round(done/total*100):0;
            const acc=done>0?Math.round(correct/done*100):0;
            return{name:s.name,done,total,pct,acc,studyMin};
          }).filter(Boolean).sort((a,b)=>b.studyMin-a.studyMin);
          if(rows.length===0)return'<div style="text-align:center;padding:var(--space-lg);color:var(--color-text-tertiary);font-size:0.9rem;">学習記録またはQB進捗を登録すると分析が表示されます</div>';
          return rows.map(r=>`
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(148,163,184,0.06);">
              <div>
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">${r.name}</div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <span style="font-size:0.75rem;color:var(--color-text-tertiary);">${IC.timer} ${formatMinutes(r.studyMin)}</span>
                  ${r.total>0?`<span style="font-size:0.75rem;color:var(--color-text-tertiary);">${IC.list} ${r.done}/${r.total}問</span>
                  <span style="font-size:0.75rem;color:${r.acc>=80?'#10b981':r.acc>=60?'#f59e0b':'#ef4444'};">正答率 ${r.acc}%</span>`:''}
                </div>
              </div>
              <div style="width:52px;height:52px;position:relative;">
                <svg viewBox="0 0 36 36" style="width:52px;height:52px;transform:rotate(-90deg);">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-bg-elevated)" stroke-width="3"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="${r.pct>=80?'#10b981':r.pct>=50?'#f59e0b':'#4ecdc4'}" stroke-width="3" stroke-dasharray="${r.pct*0.88} 88" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;">${r.pct}%</div>
              </div>
            </div>
          `).join('');
        })()}
      </div>
    </div>`;


  const display=document.getElementById('timer-display');const ring=document.getElementById('timer-ring');
  const status=document.getElementById('timer-status');const btnT=document.getElementById('btn-toggle');
  const circ=2*Math.PI*140;
  function upd(s){
    display.innerHTML=fmtSW(s);
    const circ = 2 * Math.PI * 140;
    let p, hue;
    if(isCountdown && initialCountdownSeconds > 0) {
      p = s / initialCountdownSeconds;
      hue = (p * 360) % 360;
      ring.style.strokeDashoffset = circ - (p * circ);
      ring.style.stroke = `hsl(${hue}, 80%, 60%)`;
    } else if(!isCountdown) {
      p = (s % 1800) / 1800;
      hue = (p * 360) % 360;
      ring.style.strokeDashoffset = circ - (p * circ);
      ring.style.stroke = `hsl(${hue}, 80%, 60%)`;
    }
  }
  if(isRunning){ring.style.strokeDasharray=circ;startSW();}
  else if(isCountdown ? countdownSeconds > 0 : elapsedSeconds > 0){
    ring.style.strokeDasharray=circ;
    upd(isCountdown ? countdownSeconds : elapsedSeconds);
  }

  btnT.addEventListener('click',()=>{
    ring.style.strokeDasharray=circ;
    if(isRunning){
      pauseSW();
      btnT.className='stopwatch-btn stopwatch-btn-start';
      btnT.textContent='▶';
      status.className='stopwatch-status';
      status.textContent='一時停止中';
    } else {
      if(isCountdown && countdownSeconds === 0) {
        showToast(' 時間をセットしてください');
        return;
      }
      initAudio();
      startSW();
      btnT.className='stopwatch-btn stopwatch-btn-pause';
      btnT.textContent='⏸';
      status.className='stopwatch-status recording';
      status.innerHTML='<span class="status-dot"></span>記録中...';
      if(isCountdown && !isRunning) renderStudy(); // Re-render to hide settings
    }
  });

  document.getElementById('btn-reset').addEventListener('click',()=>{
    resetSW();
    display.innerHTML=fmtSW(isCountdown ? (countdownSeconds || 1500) : 0);
    ring.style.strokeDashoffset=circ;
    btnT.className='stopwatch-btn stopwatch-btn-start';
    btnT.textContent='▶';
    status.className='stopwatch-status';
    status.textContent='準備ができたら開始しましょう';
    renderStudy();
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    if(elapsedSeconds > 0 || cumulativeStudySeconds > 0) {
      finishSession(true); // manual stop = true
    } else {
      showToast(' 記録する時間がありません');
    }
  });

  // PiP Mini Timer
  document.getElementById('btn-pip')?.addEventListener('click', () => {
    togglePip();
  });
  document.getElementById('btn-pip-color')?.addEventListener('click', (e) => {
    cyclePipTheme();
    e.target.textContent = getPipTheme().label;
    if (pipActive) drawPipFrame();
    showToast(`🎨 PiPテーマ: ${getPipTheme().id}`);
  });

  // Zen Mode Toggle
  document.getElementById('btn-zen-mode')?.addEventListener('click', () => {
    document.body.classList.toggle('zen-mode');
  });

  // Sound Toggle
  document.getElementById('btn-sound-toggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    let isSoundEnabled = localStorage.getItem('medfocus_sound') !== 'false';
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('medfocus_sound', isSoundEnabled);
    btn.innerHTML = isSoundEnabled ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    if (isSoundEnabled) {
      showToast(IC.check+' 通知音をオンにしました');
      playBeep(); // Test beep sound!
    } else {
      showToast(IC.check+' 通知音をミュートにしました');
    }
  });

  // Mode Tabs
  document.getElementById('mode-up')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = false;
    isPomodoro = false;
    isSimulation = false;
    renderStudy();
  });
  document.getElementById('mode-down')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = true;
    isPomodoro = false;
    isSimulation = false;
    if(countdownSeconds === 0) {
      countdownSeconds = 25 * 60; // Default 25m
      baseCountdown = 25 * 60;
      initialCountdownSeconds = 25 * 60;
    }
    renderStudy();
  });
  document.getElementById('mode-pomodoro')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = true;
    isPomodoro = true;
    isSimulation = false;
    pomodoroPhase = 'study';
    // pomodoroStudySec は既存設定を引き継ぐ（未設定なら25分）
    if (pomodoroStudySec <= 0) pomodoroStudySec = 25 * 60;
    if (pomodoroBreakSec <= 0) pomodoroBreakSec = 5 * 60;
    countdownSeconds = pomodoroStudySec;
    baseCountdown = pomodoroStudySec;
    initialCountdownSeconds = pomodoroStudySec;
    renderStudy();
  });
  document.getElementById('mode-simulation')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = true;
    isPomodoro = false;
    isSimulation = true;
    simulationPhase = 'study';
    simulationBlockCurrent = 1;
    // Default to CBT
    simulationBlockTotal = 6;
    simulationStudyMin = 60;
    simulationBreakMin = 10;
    countdownSeconds = simulationStudyMin * 60;
    baseCountdown = simulationStudyMin * 60;
    initialCountdownSeconds = simulationStudyMin * 60;
    renderStudy();
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      countdownSeconds = parseInt(btn.dataset.min) * 60;
      initialCountdownSeconds = countdownSeconds;
      elapsedSeconds = 0;
      // ポモドーロモードのとき、設定した時間を記憶する
      if (isPomodoro && pomodoroPhase === 'study') {
        pomodoroStudySec = countdownSeconds;
        baseCountdown = countdownSeconds;
      }
      renderStudy();
    });
  });
  // Simulation Presets
  document.querySelectorAll('.sim-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if(isRunning) return;
      const t = e.target.dataset.type;
      if (t === 'cbt') {
        simulationBlockTotal = 6; simulationStudyMin = 60; simulationBreakMin = 10;
      } else {
        simulationBlockTotal = 3; simulationStudyMin = 120; simulationBreakMin = 15;
      }
      simulationBlockCurrent = 1;
      simulationPhase = 'study';
      countdownSeconds = simulationStudyMin * 60;
      baseCountdown = simulationStudyMin * 60;
      initialCountdownSeconds = simulationStudyMin * 60;
      renderStudy();
    });
  });

  // Custom Input
  document.getElementById('custom-min')?.addEventListener('input', (e) => {
    const min = parseInt(e.target.value);
    if(min > 0) {
      countdownSeconds = min * 60;
      initialCountdownSeconds = countdownSeconds;
      elapsedSeconds = 0;
      // ポモドーロモードのとき、設定した時間を記憶する
      if (isPomodoro && pomodoroPhase === 'study') {
        pomodoroStudySec = countdownSeconds;
        baseCountdown = countdownSeconds;
      }
      if(display) display.innerHTML = fmtSW(countdownSeconds);
    }
  });

  // Confirmation Form
  document.getElementById('confirm-subject')?.addEventListener('change', (e) => {
    selectedSubjectId = e.target.value;
    const customInp = document.getElementById('confirm-subject-custom');
    if (customInp) {
      customInp.style.display = selectedSubjectId === 'custom' ? 'block' : 'none';
    }
    saveTimerState();
  });

  document.getElementById('confirm-subject-custom')?.addEventListener('input', (e) => {
    selectedSubjectCustom = e.target.value;
    saveTimerState();
  });

  document.querySelectorAll('.purpose-btn').forEach(b => {
    b.addEventListener('click', (ev) => {
      document.querySelectorAll('.purpose-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
      ev.target.classList.replace('btn-secondary', 'btn-primary');
      selectedPurpose = ev.target.dataset.val;
    });
  });

  document.querySelectorAll('.activity-btn').forEach(b => {
    b.addEventListener('click', (ev) => {
      document.querySelectorAll('.activity-btn').forEach(btn => btn.classList.replace('btn-primary', 'btn-secondary'));
      ev.currentTarget.classList.replace('btn-secondary', 'btn-primary');
      selectedActivity = ev.currentTarget.dataset.val;
      saveTimerState();
      syncQbCountFields('');
      syncQbCountFields('-sync');
      syncVideoCountFields('');
      syncVideoCountFields('-sync');
    });
  });
  wireQbCountFields(document, '');
  wireVideoCountFields(document, '');

  document.getElementById('btn-confirm-save')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const durEle = document.getElementById('confirm-duration');
    const subEle = document.getElementById('confirm-subject');
    const memoEle = document.getElementById('confirm-memo');
    const locEle = document.getElementById('confirm-location');
    const focEle = document.getElementById('confirm-focus');
    
    const dur = parseInt(durEle.value);
    const subId = subEle.value;
    const customInp = document.getElementById('confirm-subject-custom');
    const subjVal = subId === 'custom' ? (customInp?.value.trim() || 'その他') : subId;
    const memo = memoEle.value.trim();
    const locVal = locEle ? locEle.value : selectedLocation;
    const focVal = focEle ? parseFloat(focEle.value) : selectedFocusLevel;
    
    const qb = readQbCounts('');
    const vid = readVideoCount('');

    if(isNaN(dur) || dur <= 0) { showToast(' 正しい時間を入力してください'); return; }
    if(!subjVal) { showToast(' 学習内容を入力してください'); return; }
    if(qb.error) { showToast(IC.x + ' ' + qb.error); return; }
    if(vid.error) { showToast(IC.x + ' ' + vid.error); return; }

    btn.disabled = true;
    btn.textContent = '保存中...';
    btn.style.opacity = '0.7';

    try {
      // Save selections as new defaults via state
      selectedLocation = locVal;
      selectedFocusLevel = focVal;
      saveTimerState();

      const endedAt = new Date().toISOString();
      const startedAt = sessionStartedAt || endedAt;
      const vidApplied = applyVideoCountToProgress(vid.subjectId, vid.done);
      const success = await saveStudyLog(subjVal, dur, memo, focVal, locVal, startedAt, endedAt, sessionBreaks, selectedPurpose, selectedActivity, qb.solved, qb.correct, vid.watched);
      if (success && vidApplied) showToast(IC.check + ` 視聴済み本数を ${vidApplied.before} → ${vidApplied.after}本 に更新しました`);
      if (success) {
        resetSW();
        renderStudy();
      } else {
        btn.disabled = false;
        btn.textContent = '記録を保存';
        btn.style.opacity = '1';
      }
    } catch (err) {
      console.error('Static save error:', err);
      btn.disabled = false;
      btn.textContent = '記録を保存';
      btn.style.opacity = '1';
    }
  });

  document.getElementById('btn-discard-log')?.addEventListener('click', () => {
    if(confirm('この記録を破棄しますか？')) {
      resetSW();
      renderStudy();
    }
  });
  document.querySelectorAll('.btn-log-action.delete').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    if(confirm('本当にこの記録を削除しますか？')) { await deleteStudyLog(id); renderStudy(); }
  }));

  async function showEditLogModal(ds) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay animate-fade-in';
    modal.style.zIndex = '2000';
    
    // Parse started_at and ended_at for date/time inputs
    const startD = new Date(ds.startedat);
    const endD = ds.endedat ? new Date(ds.endedat) : new Date(startD.getTime() + ds.duration * 60000);
    const dateStr = startD.toISOString().split('T')[0];
    const startTimeStr = startD.toTimeString().split(' ')[0].substring(0, 5);
    const endTimeStr = endD.toTimeString().split(' ')[0].substring(0, 5);
    
    modal.innerHTML = `
      <div class="modal-content animate-slide-up" style="max-width:400px;">
        <div class="modal-header">
          <div class="modal-title">学習記録の編集</div>
          <button class="modal-close" id="close-edit-modal">✕</button>
        </div>
        <div class="modal-body">
          <div class="settings-field" style="margin-bottom:12px;">
            <label>日付</label>
            <input type="date" id="edit-log-date" value="${dateStr}" />
          </div>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="settings-field" style="flex:1;">
              <label>開始時刻</label>
              <input type="time" id="edit-log-time" value="${startTimeStr}" />
            </div>
            <div class="settings-field" style="flex:1;">
              <label>終了時刻</label>
              <input type="time" id="edit-log-end-time" value="${endTimeStr}" />
            </div>
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>学習時間 (分)</label>
            <input type="number" id="edit-log-duration" value="${ds.duration}" />
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>学習内容</label>
            <select id="edit-log-subject">
              ${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}" ${s.name===ds.subject?'selected':''}>${s.name}</option>`).join('')}</optgroup>`).join('')}
              <option value="custom" ${!subjectCategories.some(c=>c.subjects.some(s=>s.name===ds.subject))?'selected':''}>その他/自由入力</option>
            </select>
            <input type="text" id="edit-log-subject-custom" value="${!subjectCategories.some(c=>c.subjects.some(s=>s.name===ds.subject))?ds.subject:''}" style="margin-top:8px; display:${!subjectCategories.some(c=>c.subjects.some(s=>s.name===ds.subject))?'block':'none'};" placeholder="内容を入力..." />
          </div>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="settings-field" style="flex:1;">
              <label>場所</label>
              <select id="edit-log-location" style="width:100%;">
                <option value="自宅" ${ds.location==='自宅'?'selected':''}>${locIcon('自宅')} 自宅</option>
                <option value="図書館" ${ds.location==='図書館'?'selected':''}>${locIcon('図書館')} 図書館</option>
                <option value="カフェ" ${ds.location==='カフェ'?'selected':''}>${locIcon('カフェ')} カフェ</option>
                <option value="大学" ${ds.location==='大学'?'selected':''}>${locIcon('大学')} 大学</option>
                <option value="移動中" ${ds.location==='移動中'?'selected':''}>${locIcon('移動中')} 移動中</option>
                <option value="その他" ${ds.location==='その他'||!ds.location?'selected':''}>${IC.pin} その他</option>
              </select>
            </div>
            <div class="settings-field" style="flex:1;">
              <label>集中度</label>
              <select id="edit-log-focus" style="width:100%;">
                ${focusOptions(ds.focus)}
              </select>
            </div>
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>活動の種類</label>
            <select id="edit-log-activity" style="width:100%;">
              <option value="" ${!ds.activity?'selected':''}>未分類</option>
              ${ACTIVITIES.map(a=>`<option value="${a.v}" ${ds.activity===a.v?'selected':''}>${a.l}</option>`).join('')}
            </select>
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>解いた問題（任意）</label>
            <div class="qb-count-row">
              <input type="number" id="edit-log-solved" min="0" step="1" inputmode="numeric" value="${ds.solved || ''}" placeholder="0" />
              <span class="qb-count-sep">問中</span>
              <input type="number" id="edit-log-correct" min="0" step="1" inputmode="numeric" value="${ds.correct || ''}" placeholder="0" />
              <span class="qb-count-sep">問正解</span>
            </div>
            <div style="font-size:0.68rem; color:var(--color-text-tertiary); margin-top:6px; line-height:1.5;">
              ※ ここを直しても教材進捗トラッカーの値は変わりません（進捗は保存時に一度だけ反映されます）
            </div>
          </div>
          <div class="settings-field" style="margin-bottom:12px;">
            <label>この回に見た講義動画（任意）</label>
            <div class="qb-count-row">
              <input type="number" id="edit-log-videos" min="0" step="1" inputmode="numeric" value="${ds.videos || ''}" placeholder="0" />
              <span class="qb-count-sep">本</span>
            </div>
            <div style="font-size:0.68rem; color:var(--color-text-tertiary); margin-top:6px; line-height:1.5;">
              ※ 1回のセッションで見た本数です。教材進捗トラッカーの累計は変わりません
            </div>
          </div>
          <div class="settings-field">
            <label>メモ</label>
            <textarea id="edit-log-memo" style="width:100%; min-height:60px;">${ds.memo}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-edit-log">キャンセル</button>
          <button class="btn btn-primary" id="save-edit-log">保存する</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('close-edit-modal').onclick = close;
    document.getElementById('cancel-edit-log').onclick = close;
    
    const subSelect = document.getElementById('edit-log-subject');
    const subCustom = document.getElementById('edit-log-subject-custom');
    subSelect.onchange = () => { subCustom.style.display = subSelect.value === 'custom' ? 'block' : 'none'; };

    document.getElementById('save-edit-log').onclick = async () => {
      const newDate = document.getElementById('edit-log-date').value;
      const newTime = document.getElementById('edit-log-time').value;
      const newEndTime = document.getElementById('edit-log-end-time').value;
      const newDur = parseInt(document.getElementById('edit-log-duration').value);
      const subVal = subSelect.value === 'custom' ? subCustom.value : subSelect.options[subSelect.selectedIndex].text;
      const newMemo = document.getElementById('edit-log-memo').value;
      const newLoc = document.getElementById('edit-log-location').value;
      const newFoc = parseFloat(document.getElementById('edit-log-focus').value);
      const newAct = document.getElementById('edit-log-activity').value || null;
      const videosRaw = document.getElementById('edit-log-videos').value.trim();
      const newVideos = videosRaw === '' ? null : parseInt(videosRaw, 10);
      if (newVideos !== null && (!Number.isFinite(newVideos) || newVideos < 0)) { showToast(IC.x + ' 動画の本数が正しくありません'); return; }
      const solvedRaw = document.getElementById('edit-log-solved').value.trim();
      const correctRaw = document.getElementById('edit-log-correct').value.trim();
      const newSolved = solvedRaw === '' ? null : parseInt(solvedRaw, 10);
      const newCorrect = correctRaw === '' ? null : parseInt(correctRaw, 10);
      if (newSolved !== null && (!Number.isFinite(newSolved) || newSolved < 0)) { showToast(IC.x + ' 問題数が正しくありません'); return; }
      if (newCorrect !== null && (!Number.isFinite(newCorrect) || newCorrect < 0)) { showToast(IC.x + ' 正解数が正しくありません'); return; }
      if (newSolved !== null && newCorrect !== null && newCorrect > newSolved) { showToast(IC.x + ' 正解数が問題数を超えています'); return; }

      if (!newDate || !newTime || isNaN(newDur) || newDur <= 0 || !subVal) {
        showToast(' 全ての項目を正しく入力してください');
        return;
      }

      const newStartedAt = new Date(`${newDate}T${newTime}`).toISOString();
      const newEndedAt = newEndTime ? new Date(`${newDate}T${newEndTime}`).toISOString() : null;
      await updateStudyLog(ds.id, subVal, newDur, newStartedAt, newMemo, newFoc, newLoc, newEndedAt, newAct, newSolved, newCorrect, newVideos);
      close();
      renderStudy();
    };
  }

  document.querySelectorAll('.btn-log-action.edit').forEach(btn => btn.addEventListener('click', (e) => {
    showEditLogModal(e.currentTarget.dataset);
  }));

  // Subject Selectors
  document.getElementById('study-subject')?.addEventListener('change', (e) => {
    selectedSubjectId = e.target.value;
    const customRow = document.getElementById('study-subject-custom-row');
    if (customRow) {
      customRow.style.display = selectedSubjectId === 'custom' ? 'block' : 'none';
    }
    saveTimerState();
  });

  document.getElementById('study-subject-custom')?.addEventListener('input', (e) => {
    selectedSubjectCustom = e.target.value;
    saveTimerState();
  });
}



// ==================== COUNTDOWN ====================
async function renderCountdown() {
  const ct = document.getElementById('page-container');
  await fetchCountdowns();

  function buildCountdownList() {
    return examCountdowns.length === 0
      ? '<div class="card" style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">登録されているカウントダウンはありません。下から追加しましょう！</div>'
      : examCountdowns.map(e => {
          const d = daysUntil(e.exam_date);
          const dt = new Date(e.exam_date).toLocaleDateString('ja-JP', {year:'numeric',month:'long',day:'numeric'});
          const isPast = d === 0 && new Date(e.exam_date) < new Date();
          return `<div class="countdown-card animate-slide-up" style="position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${isPast ? 'var(--color-text-tertiary)' : (e.color||'#4ECDC4')}"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div class="countdown-name">${e.name}</div>
                <div class="countdown-date">${dt}</div>
              </div>
              <button class="btn-log-action delete btn-delete-cd" data-id="${e.id}" title="削除">✕</button>
            </div>
            <div class="countdown-days">
              <span class="countdown-number" style="color:${isPast ? 'var(--color-text-tertiary)' : (e.color||'#4ECDC4')}">${isPast ? '終了' : d}</span>
              ${isPast ? '' : '<span class="countdown-label">日</span>'}
            </div>
          </div>`;
        }).join('');
  }

  ct.innerHTML = `<div class="page-header"><h1 class="page-title">${IC.calendar}試験カウントダウン</h1><p class="page-subtitle">目標の試験日までの残り日数を管理しよう</p></div>
    <div id="cd-list-container" style="display:flex;flex-direction:column;gap:var(--space-md);margin-bottom:var(--space-xl)">
      ${buildCountdownList()}
    </div>
    <div class="card" style="padding:var(--space-lg)">
      <div style="font-size:1rem;font-weight:600;margin-bottom:var(--space-md);color:var(--color-accent-teal)">＋ 新しいカウントダウンを追加</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
        <input type="text" id="cd-title-input" placeholder="イベント名（例: 国家試験、CBT）" style="width:100%" />
        <input type="date" id="cd-date-input" style="width:100%;font-family:inherit" />
        <button class="btn btn-primary" id="btn-submit-cd" style="width:100%;justify-content:center">追加する</button>
      </div>
    </div>
  `;

  // Add handler
  document.getElementById('btn-submit-cd')?.addEventListener('click', async function() {
    const btn = this;
    const nameInput = document.getElementById('cd-title-input');
    const dateInput = document.getElementById('cd-date-input');
    const name = nameInput?.value.trim();
    const dateStr = dateInput?.value;
    if (!name) { showToast(IC.warn+' イベント名を入力してください'); return; }
    if (!dateStr) { showToast(IC.warn+' 日付を選択してください'); return; }

    btn.textContent = '保存中...'; btn.disabled = true;
    try {
      if (supabase) {
        const payload = { name, exam_date: dateStr };
        if (session?.user) payload.user_id = session.user.id;
        const { error } = await supabase.from('exam_countdowns').insert([payload]);
        if (error) throw error;
        showToast(IC.check+' カウントダウンを追加しました！');
        invalidateCache('countdowns');
        await fetchCountdowns();
        const listContainer = document.getElementById('cd-list-container');
        if (listContainer) listContainer.innerHTML = buildCountdownList();
        if (nameInput) nameInput.value = '';
        if (dateInput) dateInput.value = '';
        attachDeleteHandlers();
      }
    } catch (err) {
      showToast(IC.x+' 追加失敗: ' + (err.message || 'Error'));
      console.error('Countdown add error:', err);
    } finally {
      btn.textContent = '追加する'; btn.disabled = false;
    }
  });

  function attachDeleteHandlers() {
    document.querySelectorAll('.btn-delete-cd').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.dataset.id;
        if (!confirm('このカウントダウンを削除しますか？')) return;
        try {
          if (supabase) {
            const { error } = await supabase.from('exam_countdowns').delete().eq('id', id);
            if (error) throw error;
            showToast(IC.check+' 削除しました');
            invalidateCache('countdowns');
            await fetchCountdowns();
            const listContainer = document.getElementById('cd-list-container');
            if (listContainer) listContainer.innerHTML = buildCountdownList();
            attachDeleteHandlers();
          }
        } catch (err) {
          showToast(IC.x+' 削除失敗: ' + (err.message || 'Error'));
        }
      });
    });
  }
  attachDeleteHandlers();
}

// ==================== QB PROGRESS HELPER FUNCTIONS ====================
let qbProgressLoaded=false;
// ==================== 進捗スナップショット（日次） ====================
// qb_progress / video_progress は「現在値」しか保持しないため、
// 日次で断面を残して初めて「その日に何問進んだか」「正答率がどう動いたか」を
// 差分として計算できる。連続する2日のスナップショットの差＝その日の実績。
// 注意: アプリを開かなかった日はスナップショットが無く、その間の進捗は
// 次に開いた日にまとめて計上される（getDailyProgressDeltas が日数を返すので按分可能）。
const SNAPSHOT_PREFIX = 'medfocus_progress_snapshot_';
const SNAPSHOT_INDEX_KEY = 'medfocus_progress_snapshot_index';
const SNAPSHOT_MAX_DAYS = 400;

function summarizeProgress(qb, video) {
  const bySubject = {};
  const totals = { qbDone:0, qbTotal:0, qbCorrect:0, videoDone:0, videoTotal:0 };
  Object.entries(qb || {}).forEach(([sid, rounds]) => {
    let d = 0, t = 0, c = 0;
    Object.values(rounds || {}).forEach(r => { d += r.done||0; t += r.total||0; c += r.correct||0; });
    if (d === 0 && t === 0) return;
    if (!bySubject[sid]) bySubject[sid] = {};
    bySubject[sid].qb = { done:d, total:t, correct:c };
    totals.qbDone += d; totals.qbTotal += t; totals.qbCorrect += c;
  });
  Object.entries(video || {}).forEach(([sid, v]) => {
    const d = v.done||0, t = v.total||0;
    if (d === 0 && t === 0) return;
    if (!bySubject[sid]) bySubject[sid] = {};
    bySubject[sid].video = { done:d, total:t };
    totals.videoDone += d; totals.videoTotal += t;
  });
  return { totals, bySubject };
}

function getSnapshotIndex() {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_INDEX_KEY) || '[]'); } catch(e) { return []; }
}

function getProgressSnapshot(dateKey) {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_PREFIX + dateKey) || 'null'); } catch(e) { return null; }
}

// 日付昇順のスナップショット配列を返す
function getProgressSnapshots() {
  return getSnapshotIndex().sort().map(getProgressSnapshot).filter(Boolean);
}

function saveProgressSnapshot() {
  const dateKey = toLocalDateKey(getLogicalDate(new Date()));
  const snap = summarizeProgress(getQBProgress(), getVideoProgress());
  const prev = getProgressSnapshot(dateKey);
  // 中身が変わっていなければ書き込まない（Supabase への無駄な往復を避ける）
  if (prev && JSON.stringify(prev.totals) === JSON.stringify(snap.totals)
           && JSON.stringify(prev.bySubject) === JSON.stringify(snap.bySubject)) return;

  const payload = { date: dateKey, totals: snap.totals, bySubject: snap.bySubject, saved_at: new Date().toISOString() };
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + dateKey, JSON.stringify(payload));
    let idx = getSnapshotIndex();
    if (!idx.includes(dateKey)) idx.push(dateKey);
    idx.sort();
    while (idx.length > SNAPSHOT_MAX_DAYS) {
      localStorage.removeItem(SNAPSHOT_PREFIX + idx.shift());
    }
    localStorage.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify(idx));
  } catch(e) { console.warn('snapshot save error:', e); }

  if (hasDB()) {
    supabase.from('progress_snapshots').upsert({
      user_id: session.user.id,
      snapshot_date: dateKey,
      qb_done: snap.totals.qbDone,
      qb_total: snap.totals.qbTotal,
      qb_correct: snap.totals.qbCorrect,
      video_done: snap.totals.videoDone,
      video_total: snap.totals.videoTotal,
      detail: snap.bySubject,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,snapshot_date' })
      .then(({ error }) => { if (error) console.warn('snapshot sync error:', error.message); });
  }
}

// 過去分をまとめて入力し終えたあとに呼ぶ。今日より前の断面を捨てて、
// 現在値を新しい基準にする。これをしないと「過去分の一括入力」が
// そのまま「今日1日の実績」として日次差分に現れてしまう。
async function resetProgressBaseline() {
  const todayKey = toLocalDateKey(getLogicalDate(new Date()));
  const idx = getSnapshotIndex();
  const removed = idx.filter(d => d < todayKey);
  removed.forEach(d => { try { localStorage.removeItem(SNAPSHOT_PREFIX + d); } catch(e) {} });
  try {
    localStorage.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify(idx.filter(d => d >= todayKey)));
    localStorage.removeItem(SNAPSHOT_PREFIX + todayKey);
  } catch(e) {}
  if (hasDB()) {
    const { error } = await supabase.from('progress_snapshots')
      .delete().eq('user_id', session.user.id).lt('snapshot_date', todayKey);
    if (error) console.warn('baseline reset error:', error.message);
  }
  saveProgressSnapshot();
  return removed.length;
}

async function fetchProgressSnapshots() {
  if (!hasDB()) return getProgressSnapshots();
  try {
    const { data, error } = await supabase.from('progress_snapshots')
      .select('*').eq('user_id', session.user.id).order('snapshot_date', { ascending: true });
    if (error || !data) return getProgressSnapshots();
    // リモートをローカルへ反映（別端末で記録した分を取り込む）
    const idx = getSnapshotIndex();
    data.forEach(row => {
      const payload = {
        date: row.snapshot_date,
        totals: { qbDone:row.qb_done||0, qbTotal:row.qb_total||0, qbCorrect:row.qb_correct||0,
                  videoDone:row.video_done||0, videoTotal:row.video_total||0 },
        bySubject: row.detail || {},
        saved_at: row.updated_at
      };
      try {
        localStorage.setItem(SNAPSHOT_PREFIX + row.snapshot_date, JSON.stringify(payload));
        if (!idx.includes(row.snapshot_date)) idx.push(row.snapshot_date);
      } catch(e) {}
    });
    try { localStorage.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify(idx.sort())); } catch(e) {}
    return getProgressSnapshots();
  } catch(e) {
    console.warn('snapshot fetch error:', e);
    return getProgressSnapshots();
  }
}

// スナップショット層の読み出しAPI。連続する断面の差分＝その期間に進んだ量。
// spanDays は前回スナップショットからの経過日数（アプリを開かなかった日を検出できる）。
// 現時点では画面から呼んでいない。Phase 3（動画→QBのラグ分析）で使う。
function getDailyProgressDeltas() {
  const snaps = getProgressSnapshots();
  const out = [];
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i-1], b = snaps[i];
    const spanDays = Math.max(1, Math.round(
      (new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')) / 86400000));
    const bySubject = {};
    const keys = new Set([...Object.keys(a.bySubject||{}), ...Object.keys(b.bySubject||{})]);
    keys.forEach(sid => {
      const pa = a.bySubject[sid] || {}, pb = b.bySubject[sid] || {};
      const qbDone   = ((pb.qb&&pb.qb.done)||0)    - ((pa.qb&&pa.qb.done)||0);
      const qbCorrect= ((pb.qb&&pb.qb.correct)||0) - ((pa.qb&&pa.qb.correct)||0);
      const videoDone= ((pb.video&&pb.video.done)||0) - ((pa.video&&pa.video.done)||0);
      if (qbDone || qbCorrect || videoDone) bySubject[sid] = { qbDone, qbCorrect, videoDone };
    });
    out.push({
      date: b.date,
      spanDays,
      qbDone:    b.totals.qbDone    - a.totals.qbDone,
      qbCorrect: b.totals.qbCorrect - a.totals.qbCorrect,
      videoDone: b.totals.videoDone - a.totals.videoDone,
      bySubject
    });
  }
  return out;
}

function getQBProgress(){try{return JSON.parse(localStorage.getItem('medfocus_qb_progress')||'{}');}catch(e){return {};}}
async function loadQBFromSupabase(){
  if(!supabase||!session||qbProgressLoaded)return;
  try{
    const{data,error}=await supabase.from('profiles').select('qb_progress').eq('id',session.user.id).single();
    if(error){
      console.warn('qb load error:',error.message);
    } else if(data?.qb_progress){
      const remote=typeof data.qb_progress==='string'?JSON.parse(data.qb_progress):data.qb_progress;
      const local=getQBProgress();
      const merged={...remote};
      Object.entries(local).forEach(([sub,rounds])=>{
        if(!merged[sub])merged[sub]=rounds;
        else Object.entries(rounds).forEach(([rk,r])=>{
          if(!merged[sub][rk]||(r.done||0)>(merged[sub][rk].done||0))merged[sub][rk]=r;
        });
      });
      localStorage.setItem('medfocus_qb_progress',JSON.stringify(merged));
    } else {
      const local=getQBProgress();
      if(Object.keys(local).length>0){
        await supabase.from('profiles').update({qb_progress:JSON.stringify(local)}).eq('id',session.user.id);
      }
    }
    qbProgressLoaded=true;
  }catch(e){console.warn('qb load error:',e);}
}
function saveQBProgress(data){
  localStorage.setItem('medfocus_qb_progress',JSON.stringify(data));
  saveProgressSnapshot();
  if(hasDB()){
    supabase.from('profiles').update({qb_progress:JSON.stringify(data)}).eq('id',session.user.id)
      .then(({error})=>{
        if(error){
          console.warn('qb sync error:',error.message);
        }
      });
  }
}

// 教材進捗トラッカーで開いている vol を覚えておく。
// 入力のたびに renderQBProgress() で全再描画されるため、
// これが無いと1項目入力するたびにアコーディオンが閉じて入力位置を見失う。
const qbOpenCats = new Set();

// ==================== 動画進捗（QAssist 等の講義動画） ====================
// QB と同じ科目ID（1A〜3D）を単位に「視聴済み本数 / 全本数」を持つ。
// これがあって初めて「動画は進んでいるが QB が追いついていない」ズレが数値になる。
let videoProgressLoaded = false;
function getVideoProgress(){try{return JSON.parse(localStorage.getItem('medfocus_video_progress')||'{}');}catch(e){return {};}}
async function loadVideoFromSupabase(){
  if(!supabase||!session||videoProgressLoaded)return;
  try{
    const{data,error}=await supabase.from('profiles').select('video_progress').eq('id',session.user.id).single();
    if(error){
      console.warn('video load error:',error.message);
    } else if(data?.video_progress){
      const remote=typeof data.video_progress==='string'?JSON.parse(data.video_progress):data.video_progress;
      const local=getVideoProgress();
      const merged={...remote};
      Object.entries(local).forEach(([sub,v])=>{
        if(!merged[sub])merged[sub]=v;
        else if((v.done||0)>(merged[sub].done||0))merged[sub]=v;
      });
      localStorage.setItem('medfocus_video_progress',JSON.stringify(merged));
    } else {
      const local=getVideoProgress();
      if(Object.keys(local).length>0){
        await supabase.from('profiles').update({video_progress:JSON.stringify(local)}).eq('id',session.user.id);
      }
    }
    videoProgressLoaded=true;
  }catch(e){console.warn('video load error:',e);}
}
function saveVideoProgress(data){
  localStorage.setItem('medfocus_video_progress',JSON.stringify(data));
  if(hasDB()){
    supabase.from('profiles').update({video_progress:JSON.stringify(data)}).eq('id',session.user.id)
      .then(({error})=>{ if(error){ console.warn('video sync error:',error.message); } });
  }
  saveProgressSnapshot();
}

// ==================== 試験逆算ペースメーター ====================
// 「間に合うのか」「今日は何問やればいいのか」を、残り日数と実績ペースから出す。
const PACER_ROUND_KEY = 'medfocus_pacer_target_round';
const PACER_EXAM_KEY  = 'medfocus_pacer_exam_id';

function getPacerTargetRound(){ const v = parseInt(localStorage.getItem(PACER_ROUND_KEY), 10); return Number.isFinite(v) && v >= 1 ? v : 1; }
function setPacerTargetRound(n){ try { localStorage.setItem(PACER_ROUND_KEY, String(n)); } catch(e){} }
function getPacerExamId(){ return localStorage.getItem(PACER_EXAM_KEY) || ''; }
function setPacerExamId(id){ try { localStorage.setItem(PACER_EXAM_KEY, id || ''); } catch(e){} }

// 「N周目まで終える」に対する進捗。各周は同じ範囲を1周するので、
// 目標量 = 1周分の総数 × N、消化量 = 1〜N周目の done の合計（各周は総数で頭打ち）。
function qbTargetProgress(qb, targetRound) {
  let total = 0, done = 0;
  Object.values(qb || {}).forEach(rounds => {
    const keys = Object.keys(rounds || {}).map(k => parseInt(k, 10)).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!keys.length) return;
    const base = rounds[String(keys[0])].total || 0;
    if (!base) return;
    total += base * targetRound;
    for (let r = 1; r <= targetRound; r++) {
      const cur = rounds[String(r)];
      done += Math.min(cur ? (cur.done || 0) : 0, base);
    }
  });
  return { done, total, remaining: Math.max(0, total - done),
           pct: total > 0 ? (done / total) * 100 : 0 };
}

// 直近 days 日の実績ペース（問/日）。
// セッション記録(questions_solved)があればそれを使う。時刻付きで最も正確なため。
// 無ければ進捗スナップショットの差分にフォールバックする。
function recentQuestionPace(allLogs, snapshotDeltas, days) {
  const today = getLogicalDate(new Date());
  const since = new Date(today); since.setDate(since.getDate() - (days - 1));
  const sinceKey = toLocalDateKey(since);

  let logged = 0, hasLogged = false;
  (allLogs || []).forEach(l => {
    const n = Number(l.questions_solved);
    if (!Number.isFinite(n) || n <= 0) return;
    if (toLocalDateKey(getLogicalDate(new Date(l.started_at))) < sinceKey) return;
    logged += n; hasLogged = true;
  });
  if (hasLogged) return { perDay: logged / days, total: logged, source: 'session', days };

  let snap = 0, hasSnap = false;
  (snapshotDeltas || []).forEach(d => {
    if (d.date < sinceKey) return;
    if (d.qbDone > 0) { snap += d.qbDone; hasSnap = true; }
  });
  if (hasSnap) return { perDay: snap / days, total: snap, source: 'snapshot', days };

  return { perDay: null, total: 0, source: null, days };
}

function buildExamPacer(exams, qb, video, allLogs, snapshotDeltas) {
  const today = getLogicalDate(new Date()); today.setHours(0,0,0,0);
  const future = (exams || [])
    .filter(e => e && e.exam_date)
    .map(e => ({ ...e, _d: new Date(e.exam_date + 'T00:00:00') }))
    .filter(e => !isNaN(e._d) && e._d >= today)
    .sort((a, b) => a._d - b._d);
  if (!future.length) return null;

  const savedId = getPacerExamId();
  const exam = future.find(e => String(e.id) === savedId) || future[0];
  const daysLeft = Math.max(0, Math.round((exam._d - today) / 86400000));
  const targetRound = getPacerTargetRound();

  const qbT = qbTargetProgress(qb, targetRound);
  if (qbT.total === 0) return { exam, future, daysLeft, targetRound, noMaterial: true };

  const pace = recentQuestionPace(allLogs, snapshotDeltas, 7);
  const requiredPerDay = daysLeft > 0 ? qbT.remaining / daysLeft : qbT.remaining;
  const projectedDone = pace.perDay !== null ? qbT.done + pace.perDay * daysLeft : null;
  const projectedPct = projectedDone !== null && qbT.total > 0
    ? Math.min(200, (projectedDone / qbT.total) * 100) : null;

  let status = 'unknown';
  if (projectedPct !== null) {
    if (projectedPct >= 100) status = 'good';
    else if (projectedPct >= 90) status = 'warning';
    else status = 'danger';
  }

  // 動画は本数で管理しており、セッション側に本数を記録していないので
  // ペースはスナップショットの差分からしか出せない
  let vDone = 0, vTotal = 0;
  Object.values(video || {}).forEach(v => { vDone += v.done || 0; vTotal += v.total || 0; });
  const videoRemaining = Math.max(0, vTotal - vDone);

  return {
    exam, future, daysLeft, targetRound, noMaterial: false,
    qb: qbT, pace, requiredPerDay, projectedDone, projectedPct, status,
    video: { done: vDone, total: vTotal, remaining: videoRemaining,
             requiredPerDay: daysLeft > 0 ? videoRemaining / daysLeft : videoRemaining,
             pct: vTotal > 0 ? (vDone / vTotal) * 100 : null },
    // 動画を見ていない範囲はQBに進めないため、動画が残っているとQBの必要ペースは実質もっと厳しい
    videoBlocking: vTotal > 0 && videoRemaining > 0
  };
}

// その科目の「1周分の総問題数」。各周は同じ範囲を1周するので、
// 全ての周がこの値を総数として共有するのが正しい。
function baseTotalForSubject(rounds) {
  const keys = Object.keys(rounds || {}).map(k => parseInt(k, 10))
                     .filter(Number.isFinite).sort((a, b) => a - b);
  if (!keys.length) return 0;
  const first = rounds[String(keys[0])];
  if (first && first.total > 0) return first.total;
  // 1周目が未登録なら、登録済みの中で最大の総数を基準にする
  return keys.reduce((m, k) => Math.max(m, (rounds[String(k)] || {}).total || 0), 0);
}

// 総数が1周目と食い違っている周を洗い出す。
// 「+N周目」ボタンが総数を引き継いでいなかった時期に作られた周が該当する。
function findRoundTotalMismatches(qb) {
  const idToName = {};
  subjectCategories.forEach(c => c.subjects.forEach(s => { idToName[s.id] = s.name; }));
  const out = [];
  Object.entries(qb || {}).forEach(([sid, rounds]) => {
    const base = baseTotalForSubject(rounds);
    if (!base) return;
    Object.entries(rounds || {}).forEach(([rk, r]) => {
      const t = r.total || 0;
      if (t !== base) {
        out.push({ subjectId: sid, name: idToName[sid] || sid, round: rk,
                   from: t, to: base, done: r.done || 0 });
      }
    });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name) || parseInt(a.round) - parseInt(b.round));
}

// 総数だけを1周目に揃える。done と correct は触らない。
function normalizeRoundTotals() {
  const qb = getQBProgress();
  const fixes = findRoundTotalMismatches(qb);
  fixes.forEach(f => { qb[f.subjectId][f.round].total = f.to; });
  if (fixes.length) saveQBProgress(qb);
  return fixes;
}

// vol（カテゴリ）配下の科目を、周回ごとに集計する。
// 周をまたいで合算すると母数が周の数だけ膨らみ、達成率が意味を失うので合算しない。
function volRoundAggregate(qb, video, cat) {
  const byRound = {};
  let vDone = 0, vTotal = 0;
  // 分母は vol 全体の総数に固定する。
  // 「その周の行がある科目だけ」を足すと、科目を1つ2周目に着手するたびに
  // 分母が跳ね上がり、周どうしを比べられない中途半端な数字になる。
  // 各周は同じ範囲を1周するので、どの周も vol 全体を分母にするのが正しい。
  let volTotal = 0;
  cat.subjects.forEach(s => {
    volTotal += baseTotalForSubject(qb[s.id] || {});
    Object.entries(qb[s.id] || {}).forEach(([rk, r]) => {
      if (!byRound[rk]) byRound[rk] = { round: rk, done: 0, correct: 0 };
      byRound[rk].done    += r.done    || 0;
      byRound[rk].correct += r.correct || 0;
    });
    const v = video[s.id] || {};
    vDone += v.done || 0; vTotal += v.total || 0;
  });
  const rounds = Object.values(byRound)
    .sort((a, b) => parseInt(a.round) - parseInt(b.round))
    .map(r => ({
      ...r,
      total: volTotal,
      pct: volTotal > 0 ? Math.round(r.done / volTotal * 100) : 0,
      accPct: r.done > 0 ? Math.round(r.correct / r.done * 100) : null
    }));
  return {
    rounds,
    video: { done: vDone, total: vTotal, pct: vTotal > 0 ? Math.round(vDone / vTotal * 100) : 0 },
    // 見出しに出す代表値は「1周目の到達率」。周の合算ではない
    headlinePct: rounds.length ? rounds[0].pct : 0
  };
}

function roundBarColor(pct) { return pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : 'var(--color-text-secondary)'; }

// vol カードの中身（動画1本＋周回ごとに1本ずつ）。入力欄を含まないので差し替えても安全。
function volSummaryInnerHtml(agg, opts) {
  const showCounts = !opts || opts.showCounts !== false;
  const vid = `<div class="prog-dual-row">
      <span class="prog-dual-tag" style="--chip-color:#8b5cf6">動画</span>
      <div class="prog-dual-bar"><div style="height:100%;width:${agg.video.pct}%;background:#8b5cf6;border-radius:3px;"></div></div>
      <span class="prog-dual-pct">${agg.video.total > 0 ? agg.video.pct + '%' : '--'}</span>
    </div>`;
  const rows = agg.rounds.length === 0
    ? `<div class="prog-dual-row">
         <span class="prog-dual-tag" style="--chip-color:#4ECDC4">QB</span>
         <div class="prog-dual-bar"></div>
         <span class="prog-dual-pct">--</span>
       </div>`
    : agg.rounds.map(r => `<div class="prog-dual-row">
        <span class="prog-dual-tag" style="--chip-color:#4ECDC4">${r.round}周</span>
        <div class="prog-dual-bar"><div style="height:100%;width:${r.pct}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:3px;"></div></div>
        <span class="prog-dual-pct" style="color:${roundBarColor(r.pct)}">${r.total > 0 ? r.pct + '%' : '--'}</span>
      </div>`).join('');
  const counts = showCounts ? `<div class="vol-round-counts">
      動画 ${agg.video.done}/${agg.video.total}本
      ${agg.rounds.map(r => `・${r.round}周 ${r.done}/${r.total}問${r.accPct !== null ? `(正答${r.accPct}%)` : ''}`).join('')}
    </div>` : '';
  return vid + rows + counts;
}

// 入力のたびに renderQBProgress() で作り直すと、開いていた vol が閉じ、
// 入力中の欄も破棄されてフォーカスと入力位置を失う。
// 入力欄には触れず、そこから計算される表示（バー・％・バッジ・vol集計）だけを差し替える。
function refreshQbDerived() {
  const qb = getQBProgress();
  const video = getVideoProgress();
  const set = (sel, fn) => { const el = document.querySelector(sel); if (el) fn(el); };

  subjectCategories.filter(c => c.id.startsWith('cat-vol')).forEach(cat => {
    const agg = volRoundAggregate(qb, video, cat);
    set(`[data-volbody="${cat.id}"]`, el => { el.innerHTML = volSummaryInnerHtml(agg); });
    set(`[data-volpct="${cat.id}"]`, el => {
      el.style.color = roundBarColor(agg.headlinePct);
      el.innerHTML = `${agg.headlinePct}%<span style="font-weight:400;font-size:0.68rem;color:var(--color-text-tertiary);margin-left:3px;">1周目</span>`;
    });

    cat.subjects.forEach(s => {
      const vp = video[s.id] || { done: 0, total: 0 };
      const vPct = vp.total > 0 ? Math.round(vp.done / vp.total * 100) : 0;
      set(`[data-vidfill="${s.id}"]`, el => { el.style.width = vPct + '%'; });
      set(`[data-vidpct="${s.id}"]`, el => { el.textContent = vp.total > 0 ? vPct + '%' : '---'; });

      const rounds = qb[s.id] || {};
      Object.entries(rounds).forEach(([rk, r]) => {
        const pct = r.total > 0 ? Math.round(r.done / r.total * 100) : 0;
        const correct = r.correct || 0;
        const accPct = r.done > 0 ? Math.round(correct / r.done * 100) : 0;
        const accColorHex = accPct >= 80 ? '#3b82f6' : accPct >= 60 ? '#8b5cf6' : '#ec4899';
        set(`[data-roundfill="${s.id}|${rk}"]`, el => {
          el.style.width = pct + '%';
          el.style.background = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        });
        set(`[data-roundpct="${s.id}|${rk}"]`, el => { el.textContent = pct + '%'; });
        set(`[data-accof="${s.id}|${rk}"]`, el => { el.textContent = '/ ' + (r.done || 0); });
        set(`[data-accfill="${s.id}|${rk}"]`, el => { el.style.width = accPct + '%'; el.style.background = accColorHex; });
        set(`[data-accpct="${s.id}|${rk}"]`, el => {
          el.textContent = r.done > 0 ? accPct + '%' : '---';
          el.style.color = accColorHex;
        });
      });

      // 未回収バッジ（動画が QB1周目より 20pt 以上先行しているとき）
      const r1 = rounds['1'];
      const q1Pct = (r1 && r1.total > 0) ? Math.round(r1.done / r1.total * 100) : 0;
      const gap = vPct - q1Pct;
      const showGap = vp.total > 0 && r1 && r1.total > 0 && gap >= 20;
      set(`[data-gapslot="${s.id}"]`, el => {
        el.innerHTML = showGap
          ? `<span class="gap-badge" style="--chip-color:${gap >= 40 ? '#ef4444' : '#f59e0b'}" title="動画の視聴が QB1周目より ${gap}pt 先行しています">未回収 +${gap}pt</span>`
          : '';
      });
    });
  });
}

async function renderQBProgress(){
  await loadQBFromSupabase();
  await loadVideoFromSupabase();
  const ct=document.getElementById('page-container');
  const qb=getQBProgress();
  const video=getVideoProgress();

  const volCats = subjectCategories.filter(c=>c.id.startsWith('cat-vol'));
  const volAgg = {};
  volCats.forEach(cat => { volAgg[cat.id] = volRoundAggregate(qb, video, cat); });

  ct.innerHTML=`<div style="max-width:900px;margin:0 auto;">
    <div class="page-header"><h1 class="page-title">${IC.book}教材進捗トラッカー</h1><p class="page-subtitle">科目ごとの講義動画とQBの進捗を管理</p></div>
    ${(() => {
      const mm = findRoundTotalMismatches(qb);
      if (!mm.length) return '';
      const sample = mm.slice(0, 4).map(f => `${f.name} ${f.round}周目 ${f.from}→${f.to}問`).join('、');
      return `<div class="fixtotal-bar">
        <div class="fixtotal-text">
          <strong>${IC.warn} 総問題数が1周目と食い違う周が ${mm.length} 件あります</strong>
          <span>各周は同じ範囲を1周するので、総数は全周で同じはずです。以前の「+N周目」ボタンが総数を引き継いでいなかったために起きています。</span>
          <span class="fixtotal-sample">${sample}${mm.length > 4 ? ` 他${mm.length - 4}件` : ''}</span>
        </div>
        <button class="fixtotal-btn" id="btn-fix-totals">1周目に揃える</button>
      </div>`;
    })()}
    <div class="baseline-bar">
      <div class="baseline-text">
        <strong>過去分をまとめて入力したときは</strong>
        <span>そのままだと「今日1日で進んだ分」として集計されます。入力し終えたら基準を取り直してください。</span>
      </div>
      <button class="baseline-btn" id="btn-reset-baseline">現在の値を初期値にする</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
      ${volCats.map(cat=>`<div class="card" style="padding:14px;">
        <div style="font-size:0.75rem;color:var(--color-text-tertiary);text-align:center;margin-bottom:8px;">${cat.name}</div>
        <div data-volbody="${cat.id}">${volSummaryInnerHtml(volAgg[cat.id])}</div>
      </div>`).join('')}
    </div>
    ${volCats.map(cat=>{
      const volPct=volAgg[cat.id].headlinePct;
      return`
      <div class="card" style="margin-bottom:16px;overflow:hidden;">
        <details data-cat="${cat.id}" ${qbOpenCats.has(cat.id)?'open':''}>
          <summary style="padding:10px 14px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
            <span>${cat.name}</span>
            <span data-volpct="${cat.id}" style="font-size:0.8rem;font-weight:600;color:${roundBarColor(volPct)};">${volPct}%<span style="font-weight:400;font-size:0.68rem;color:var(--color-text-tertiary);margin-left:3px;">1周目</span></span>
          </summary>
          <div style="padding:4px;border-top:1px solid var(--color-border);">
          ${cat.subjects.map(s=>{
            const rounds=qb[s.id]||{};
            const roundKeys=Object.keys(rounds).sort();
            const nextRound=roundKeys.length>0?parseInt(roundKeys[roundKeys.length-1])+1:1;
            const vp=video[s.id]||{done:0,total:0};
            const vPct=vp.total>0?Math.round(vp.done/vp.total*100):0;
            // 「回収率」= 視聴済みの範囲を QB1周目でどれだけ回収できているか
            const r1=rounds['1'];
            const q1Pct=(r1&&r1.total>0)?Math.round(r1.done/r1.total*100):0;
            const gap=vPct-q1Pct;
            // 動画・QBの両方に母数があり、動画が20pt以上先行しているときだけ警告する
            const showGap=vp.total>0&&r1&&r1.total>0&&gap>=20;
            const gapColor=gap>=40?'#ef4444':'#f59e0b';
            return`<div style="padding:8px 6px;border-bottom:1px solid var(--color-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:0.85rem;">${s.name}</span>
                <span style="display:flex;align-items:center;gap:6px;">
                  <span data-gapslot="${s.id}">${showGap?`<span class="gap-badge" style="--chip-color:${gapColor}" title="動画の視聴が QB1周目より ${gap}pt 先行しています">未回収 +${gap}pt</span>`:''}</span>
                  <button class="qb-add-round" data-sub="${s.id}" data-round="${nextRound}" style="font-size:0.7rem;padding:3px 8px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-secondary);cursor:pointer;">+ ${nextRound}周目</button>
                </span>
              </div>
              <div style="margin:0 0 8px 0;padding:8px;background:var(--color-bg-elevated);border-radius:8px;font-size:0.8rem;border-left:3px solid #8b5cf6;">
                <div class="qb-metric-row">
                  <span class="qb-metric-label" style="color:#a78bfa;font-weight:700;">動画</span>
                  <input type="number" class="vid-done" data-sub="${s.id}" value="${vp.done||0}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                  <span>/</span>
                  <input type="number" class="vid-total" data-sub="${s.id}" value="${vp.total||0}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                  <span style="font-size:0.7rem;color:var(--color-text-tertiary);">本</span>
                  <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                    <div data-vidfill="${s.id}" style="height:100%;width:${vPct}%;background:#8b5cf6;border-radius:3px;"></div>
                  </div>
                  <span data-vidpct="${s.id}" style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;color:#a78bfa;">${vp.total>0?vPct+'%':'---'}</span>
                </div>
              </div>
              ${roundKeys.length>0?roundKeys.map(rk=>{
                const r=rounds[rk];const pct=r.total>0?Math.round(r.done/r.total*100):0;
                const correct=r.correct||0;const accPct=r.done>0?Math.round(correct/r.done*100):0;
                return`<div style="margin:0 0 8px 0;padding:8px;background:var(--color-bg-elevated);border-radius:8px;font-size:0.8rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-weight:700;color:var(--color-text-secondary);">${rk}周目</span>
                    <button class="qb-del-round" data-sub="${s.id}" data-round="${rk}" style="font-size:0.65rem;padding:1px 6px;background:none;border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-tertiary);cursor:pointer;">✕</button>
                  </div>
                  <div class="qb-metric-row" style="margin-bottom:6px;">
                    <span class="qb-metric-label">進捗</span>
                    <input type="number" class="qb-done" data-sub="${s.id}" data-round="${rk}" value="${r.done}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span>/</span>
                    <input type="number" class="qb-total" data-sub="${s.id}" data-round="${rk}" value="${r.total}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div data-roundfill="${s.id}|${rk}" style="height:100%;width:${pct}%;background:${pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'};border-radius:3px;"></div>
                    </div>
                    <span data-roundpct="${s.id}|${rk}" style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;">${pct}%</span>
                  </div>
                  <div class="qb-metric-row">
                    <span class="qb-metric-label">正答</span>
                    <input type="number" class="qb-correct" data-sub="${s.id}" data-round="${rk}" value="${correct}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span data-accof="${s.id}|${rk}" style="font-size:0.7rem;color:var(--color-text-tertiary);">/ ${r.done}</span>
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div data-accfill="${s.id}|${rk}" style="height:100%;width:${accPct}%;background:${accPct>=80?'#3b82f6':accPct>=60?'#8b5cf6':'#ec4899'};border-radius:3px;"></div>
                    </div>
                    <span data-accpct="${s.id}|${rk}" style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;color:${accPct>=80?'#3b82f6':accPct>=60?'#8b5cf6':'#ec4899'};">${r.done>0?accPct+'%':'---'}</span>
                  </div>
                </div>`;
              }).join(''):'<div style="font-size:0.75rem;color:var(--color-text-tertiary);padding:4px 8px;">未登録</div>'}
            </div>`;
          }).join('')}
          </div>
        </details>
      </div>
    `;}).join('')}
  </div>`;

  // Event listeners
  document.getElementById('btn-fix-totals')?.addEventListener('click', () => {
    const preview = findRoundTotalMismatches(getQBProgress());
    if (!preview.length) return;
    const lines = preview.slice(0, 12).map(f => `  ${f.name} ${f.round}周目: ${f.from} → ${f.to}問`).join('\n');
    const more = preview.length > 12 ? `\n  ...他 ${preview.length - 12} 件` : '';
    if (!confirm(`次の ${preview.length} 件の「総問題数」を1周目に揃えます。\n\n${lines}${more}\n\n進捗（解いた数）と正答数は変更しません。よろしいですか？`)) return;
    const fixed = normalizeRoundTotals();
    showToast(IC.check + ` ${fixed.length}件の総問題数を揃えました`);
    renderQBProgress();
  });

  document.getElementById('btn-reset-baseline')?.addEventListener('click', async () => {
    if(!confirm('今日より前の進捗スナップショットを削除し、現在の値を新しい初期値にします。\n\n学習記録・QB進捗・動画進捗そのものは削除されません。よろしいですか？')) return;
    const n = await resetProgressBaseline();
    showToast(IC.check + ` 初期値を更新しました（${n}件の古い断面を削除）`);
  });
  ct.querySelectorAll('details[data-cat]').forEach(d=>{
    d.addEventListener('toggle',()=>{
      if(d.open)qbOpenCats.add(d.dataset.cat);
      else qbOpenCats.delete(d.dataset.cat);
    });
  });
  ct.querySelectorAll('.qb-add-round').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const sub=btn.dataset.sub,round=btn.dataset.round;
      const d=getQBProgress();if(!d[sub])d[sub]={};
      // 各周は同じ範囲を1周するので、総問題数は1周目から引き継ぐ。
      // 引き継がないと空欄になり、進捗と同じ数を入れてしまって常に100%になる。
      d[sub][round]={done:0,total:baseTotalForSubject(d[sub]),correct:0};
      saveQBProgress(d);renderQBProgress();
    });
  });
  ct.querySelectorAll('.qb-del-round').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!confirm(`${btn.dataset.round}周目を削除しますか？`))return;
      const d=getQBProgress();
      if(d[btn.dataset.sub])delete d[btn.dataset.sub][btn.dataset.round];
      saveQBProgress(d);renderQBProgress();
    });
  });
  ct.querySelectorAll('.vid-done,.vid-total').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const sub=inp.dataset.sub;
      const d=getVideoProgress();
      if(!d[sub])d[sub]={done:0,total:0};
      if(inp.classList.contains('vid-done'))d[sub].done=parseInt(inp.value)||0;
      else d[sub].total=parseInt(inp.value)||0;
      saveVideoProgress(d);
      refreshQbDerived();   // 全再描画しない（開いている vol とフォーカスを保つ）
    });
  });
  ct.querySelectorAll('.qb-done,.qb-total,.qb-correct').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const sub=inp.dataset.sub,round=inp.dataset.round;
      const d=getQBProgress();
      if(!d[sub])d[sub]={};if(!d[sub][round])d[sub][round]={done:0,total:0,correct:0};
      if(inp.classList.contains('qb-done'))d[sub][round].done=parseInt(inp.value)||0;
      else if(inp.classList.contains('qb-total'))d[sub][round].total=parseInt(inp.value)||0;
      else if(inp.classList.contains('qb-correct'))d[sub][round].correct=parseInt(inp.value)||0;
      saveQBProgress(d);
      refreshQbDerived();   // 全再描画しない（開いている vol とフォーカスを保つ）
    });
  });
}

// ==================== INSIGHTS FILTER STATE ====================
const insightFilters = {
  preset: 'all',
  dateFrom: '',
  dateTo: '',
  subjects: [],
  location: '',
  timeSlot: '',
  focusLevel: '',
  sessionLength: '',
  purpose: '',
  activity: ''
};

function applyInsightFilters(logs) {
  let filtered = [...logs];
  const logicalToday = getLogicalDate(new Date());
  // Preset period
  if (insightFilters.preset === 'today') {
    const ds = new Date(logicalToday); ds.setHours(3,0,0,0);
    const de = new Date(logicalToday); de.setHours(26,59,59,999);
    filtered = filtered.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
  } else if (insightFilters.preset === 'week') {
    const day = logicalToday.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const mon = new Date(logicalToday); mon.setDate(logicalToday.getDate() - diff); mon.setHours(3,0,0,0);
    filtered = filtered.filter(l => new Date(l.started_at) >= mon);
  } else if (insightFilters.preset === 'month') {
    const ms = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1); ms.setHours(3,0,0,0);
    filtered = filtered.filter(l => new Date(l.started_at) >= ms);
  } else if (insightFilters.preset === 'lastmonth') {
    const ms = new Date(logicalToday.getFullYear(), logicalToday.getMonth()-1, 1); ms.setHours(3,0,0,0);
    const me = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 0); me.setHours(26,59,59,999);
    filtered = filtered.filter(l => { const t = new Date(l.started_at); return t >= ms && t <= me; });
  } else if (insightFilters.preset === 'custom') {
    if (insightFilters.dateFrom) {
      const df = new Date(insightFilters.dateFrom); df.setHours(3,0,0,0);
      filtered = filtered.filter(l => new Date(l.started_at) >= df);
    }
    if (insightFilters.dateTo) {
      const dt = new Date(insightFilters.dateTo); dt.setHours(26,59,59,999);
      filtered = filtered.filter(l => new Date(l.started_at) <= dt);
    }
  }
  // Subject filter
  if (insightFilters.subjects.length > 0) {
    filtered = filtered.filter(l => insightFilters.subjects.includes(normalizeSubjectName(l.subject_name)));
  }
  // Location filter
  if (insightFilters.location) {
    filtered = filtered.filter(l => (l.location || '未設定') === insightFilters.location);
  }
  // Time slot filter
  if (insightFilters.timeSlot) {
    filtered = filtered.filter(l => {
      const h = new Date(l.started_at).getHours();
      if (insightFilters.timeSlot === 'morning') return h >= 5 && h < 11;
      if (insightFilters.timeSlot === 'afternoon') return h >= 11 && h < 17;
      if (insightFilters.timeSlot === 'evening') return h >= 17 && h < 23;
      if (insightFilters.timeSlot === 'night') return h >= 23 || h < 5;
      return true;
    });
  }
  // Focus level filter
  if (insightFilters.focusLevel) {
    const fl = parseInt(insightFilters.focusLevel);
    filtered = filtered.filter(l => l.focus_level && Number(l.focus_level) >= fl);
  }
  // Session length filter
  if (insightFilters.purpose) {
    filtered = filtered.filter(l => (l.study_purpose || 'other') === insightFilters.purpose);
  }
  // Activity filter ('unclassified' は activity 未設定の旧ログ)
  if (insightFilters.activity) {
    filtered = insightFilters.activity === 'unclassified'
      ? filtered.filter(l => !l.activity)
      : filtered.filter(l => l.activity === insightFilters.activity);
  }
  if (insightFilters.sessionLength) {
    filtered = filtered.filter(l => {
      if (insightFilters.sessionLength === 'short') return l.duration_minutes <= 30;
      if (insightFilters.sessionLength === 'medium') return l.duration_minutes > 30 && l.duration_minutes <= 60;
      if (insightFilters.sessionLength === 'long') return l.duration_minutes > 60;
      return true;
    });
  }
  return filtered;
}

function resetInsightFilters() {
  insightFilters.preset = 'all';
  insightFilters.dateFrom = '';
  insightFilters.dateTo = '';
  insightFilters.subjects = [];
  insightFilters.location = '';
  insightFilters.timeSlot = '';
  insightFilters.focusLevel = '';
  insightFilters.sessionLength = '';
  insightFilters.purpose = '';
  insightFilters.activity = '';
}

// ==================== Phase 1: QB正答率分析 ====================
// ランキングに載せる最低解答数。少数のサンプルで「弱点科目」と断じないための下限。
const ACC_MIN_SAMPLE = 20;

function accColor(a) {
  if (a < 60) return '#ef4444';
  if (a < 75) return '#f59e0b';
  if (a < 85) return '#3b82f6';
  return '#10b981';
}

// qb_progress（現在値＝過去すべての累積）から正答率の断面を作る。
// 注意: correct は既定値が 0 のため、done>0 かつ correct===0 の周回は
// 「正答数が未入力」とみなして集計から外す。本当に正答率0%の周回はまず無く、
// 混ぜると全科目が0%になって分析が壊れるため。
function buildQBAccuracyStats(qb) {
  const idToName = {};
  subjectCategories.forEach(c => c.subjects.forEach(s => { idToName[s.id] = s.name; }));

  const subjects = [];
  const roundAgg = {};
  let totalDone = 0, totalCorrect = 0;
  let unfilledRounds = 0, unfilledDone = 0;
  const unfilledSubjects = new Set();

  Object.entries(qb || {}).forEach(([sid, rounds]) => {
    let done = 0, correct = 0;
    const byRound = [];
    Object.entries(rounds || {}).forEach(([rk, r]) => {
      const d = r.done || 0, c = r.correct || 0;
      if (d <= 0) return;
      if (c <= 0) {
        unfilledRounds++; unfilledDone += d;
        unfilledSubjects.add(idToName[sid] || sid);
        return;
      }
      done += d; correct += c;
      byRound.push({ round: rk, done: d, correct: c, acc: (c / d) * 100 });
      if (!roundAgg[rk]) roundAgg[rk] = { done: 0, correct: 0, subjects: 0 };
      roundAgg[rk].done += d; roundAgg[rk].correct += c; roundAgg[rk].subjects++;
    });
    if (done > 0) {
      byRound.sort((a, b) => parseInt(a.round) - parseInt(b.round));
      subjects.push({ id: sid, name: idToName[sid] || sid, done, correct,
                      acc: (correct / done) * 100, byRound });
      totalDone += done; totalCorrect += correct;
    }
  });

  const rounds = Object.entries(roundAgg)
    .map(([rk, v]) => ({ round: rk, done: v.done, correct: v.correct,
                         acc: (v.correct / v.done) * 100, subjects: v.subjects }))
    .sort((a, b) => parseInt(a.round) - parseInt(b.round));

  return {
    subjects, rounds, totalDone, totalCorrect,
    totalAcc: totalDone > 0 ? (totalCorrect / totalDone) * 100 : null,
    unfilledRounds, unfilledDone, unfilledSubjects: [...unfilledSubjects],
    ranked: subjects.filter(s => s.done >= ACC_MIN_SAMPLE).sort((a, b) => a.acc - b.acc),
    thin:   subjects.filter(s => s.done <  ACC_MIN_SAMPLE).sort((a, b) => b.done - a.done)
  };
}

// ==================== Phase 2: 学習パイプラインと未回収在庫 ====================
// 動画の視聴が QB1周目より何pt先行しているか。これ以上開いたら「未回収」とみなす。
const BACKLOG_MIN_GAP = 20;

// 科目数を単位にした学習パイプライン。
// 動画は「本」、QBは「問」で単位が違うので合算できない。
// そこで「その段階に到達した科目がいくつあるか」で串刺しにする。
function buildPipeline(qb, video) {
  const idToName = {};
  subjectCategories.forEach(c => c.subjects.forEach(s => { idToName[s.id] = s.name; }));

  const ids = new Set([...Object.keys(qb || {}), ...Object.keys(video || {})]);
  const rows = [];
  ids.forEach(sid => {
    const v = (video || {})[sid] || { done: 0, total: 0 };
    const rounds = (qb || {})[sid] || {};
    const r1 = rounds['1'] || null;
    const laterDone = Object.entries(rounds)
      .filter(([rk]) => parseInt(rk) >= 2)
      .reduce((s, [, r]) => s + (r.done || 0), 0);
    const hasMaterial = (v.total > 0) || (r1 && r1.total > 0);
    if (!hasMaterial) return;
    rows.push({
      id: sid,
      name: idToName[sid] || sid,
      videoDone: v.done || 0, videoTotal: v.total || 0,
      videoPct: v.total > 0 ? (v.done / v.total) * 100 : null,
      qb1Done: r1 ? (r1.done || 0) : 0, qb1Total: r1 ? (r1.total || 0) : 0,
      qb1Pct: (r1 && r1.total > 0) ? (r1.done / r1.total) * 100 : null,
      laterDone
    });
  });

  // 各科目を「到達している最も先の段階」ひとつに割り当てる。
  // 累積ファネルにしないのは、動画を終える前にQBへ進むことが普通にあり、
  // 段階が入れ子にならない（＝途中でバーが太くなる）ため。
  // 排他的に振り分ければ合計＝登録科目数になり、分布として正しく読める。
  function stageOf(r) {
    if (r.laterDone > 0) return 'qb2';
    if (r.qb1Total > 0 && r.qb1Done >= r.qb1Total) return 'qb1done';
    if (r.qb1Done > 0) return 'qb1';
    if (r.videoTotal > 0 && r.videoDone >= r.videoTotal) return 'videoDone';
    if (r.videoDone > 0) return 'videoWip';
    return 'none';
  }
  rows.forEach(r => { r.stage = stageOf(r); });

  const STAGE_DEFS = [
    { key: 'none',      label: '未着手',              color: '#475569' },
    { key: 'videoWip',  label: '動画を視聴中',        color: '#7c3aed' },
    { key: 'videoDone', label: '動画は完了・QB未着手', color: '#a78bfa' },
    { key: 'qb1',       label: 'QB1周目を進行中',     color: '#4ECDC4' },
    { key: 'qb1done',   label: 'QB1周目を完了',       color: '#3b82f6' },
    { key: 'qb2',       label: '2周目以降',           color: '#10b981' },
  ];
  const stages = STAGE_DEFS.map(s => ({
    ...s,
    count: rows.filter(r => r.stage === s.key).length
  }));

  // 動画は進んだのに QB に入っていない＝回収待ちの科目数
  const awaitingQB = rows.filter(r => r.stage === 'videoWip' || r.stage === 'videoDone').length;

  return { rows, stages, total: rows.length, awaitingQB };
}

// 視聴済みだが QB で回収できていない科目＝「未回収在庫」。
// lastVideoAt は activity='video' のログから引くので、Phase 0 以降に
// 記録した分しか日付が付かない（付かないものは null のまま末尾に置く）。
function buildBacklog(pipelineRows, allLogs, logicalToday) {
  const lastVideoAt = {};
  allLogs.forEach(l => {
    if (l.activity !== 'video') return;
    const n = normalizeSubjectName(l.subject_name);
    const t = new Date(l.started_at);
    if (!lastVideoAt[n] || t > lastVideoAt[n]) lastVideoAt[n] = t;
  });

  return pipelineRows
    .filter(r => r.videoTotal > 0 && r.videoDone > 0 && r.videoPct !== null)
    .map(r => {
      const q1 = r.qb1Pct === null ? 0 : r.qb1Pct;
      const gap = r.videoPct - q1;
      const seen = lastVideoAt[r.name] || null;
      const days = seen
        ? Math.max(0, Math.round((getLogicalDate(logicalToday) - getLogicalDate(seen)) / 86400000))
        : null;
      return { ...r, gap, lastVideoAt: seen, daysSince: days };
    })
    .filter(r => r.gap >= BACKLOG_MIN_GAP)
    .sort((a, b) => {
      if (a.daysSince === null && b.daysSince === null) return b.gap - a.gap;
      if (a.daysSince === null) return 1;   // 日付不明は後ろへ
      if (b.daysSince === null) return -1;
      return b.daysSince - a.daysSince || b.gap - a.gap;
    });
}

// インプット(講義動画) と アウトプット(問題演習) の時間比。
// activity 未設定の旧ログは比率から除外し、件数だけ別に伝える。
function buildIOBalance(logs) {
  const acc = { video: 0, qb: 0, other: 0, unclassified: 0 };
  logs.forEach(l => {
    const m = l.duration_minutes || 0;
    if (!l.activity) acc.unclassified += m;
    else if (l.activity === 'video') acc.video += m;
    else if (l.activity === 'qb') acc.qb += m;
    else acc.other += m;
  });
  const core = acc.video + acc.qb;
  return {
    ...acc,
    core,
    videoShare: core > 0 ? (acc.video / core) * 100 : null,
    ratio: acc.video > 0 ? acc.qb / acc.video : null,
    hasData: core > 0
  };
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ==================== 休憩分析 ====================
// 「休憩」＝同じ論理日のなかで、前のセッションの終了から次のセッションの開始までの空き時間。
// BREAK_MAX_MIN を超える空きは休憩ではなく学習ブロックの切れ目（外出・食事・就寝前後）とみなして除外する。
const BREAK_MAX_MIN = 90;
const BREAK_BINS = [
  { key: 'micro', label: '〜5分',    min: 0,  max: 5 },
  { key: 'short', label: '6〜15分',  min: 6,  max: 15 },
  { key: 'mid',   label: '16〜30分', min: 16, max: 30 },
  { key: 'long',  label: '31〜60分', min: 31, max: 60 },
  { key: 'xlong', label: '61〜90分', min: 61, max: 90 }
];
const BREAK_RUN_BINS = [
  { label: '〜45分',    min: 0,   max: 45 },
  { label: '46〜90分',  min: 46,  max: 90 },
  { label: '91〜150分', min: 91,  max: 150 },
  { label: '151分〜',   min: 151, max: Infinity }
];

// セッション内の休憩＝タイマーを一時停止していた区間。study_logs.breaks に
// [{start, end}] で入っている（保存側は saveStudyLog の payload.breaks）。
// ポモドーロ／試験シミュレーションはフェーズ切替のたびに pauseSW→startSW を
// 連続で呼ぶので長さ0の休憩が1件残る。これを実際の一時停止と混ぜないよう、
// MIN_PAUSE_SEC 未満は捨てる。
const MIN_PAUSE_SEC = 30;
// ended_at − started_at − duration_minutes ＝ セッション内の非学習時間。
// 一時停止だけでなくポモドーロの休憩フェーズも拾えるが、保存確認画面を開いた
// まま放置した分も混ざるので、極端な値は集計から外す。
const MAX_OVERHEAD_MIN = 180;

// 旧ログには ended_at が無く、started_at が実際には「記録した時刻（＝終了時刻）」になっている。
function getLogRange(l) {
  if (l.ended_at) return { start: new Date(l.started_at), end: new Date(l.ended_at) };
  const end = new Date(l.started_at);
  return { start: new Date(end.getTime() - (l.duration_minutes || 0) * 60000), end };
}

// study_logs.breaks を一時停止の配列に変換する。文字列でもオブジェクトでも受ける。
function parseSessionBreaks(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch (e) { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(b => {
    if (!b || !b.start || !b.end) return null;  // 再開せずに終わった休憩は長さが確定しない
    const st = new Date(b.start), en = new Date(b.end);
    if (isNaN(st) || isNaN(en)) return null;
    const seconds = Math.round((en - st) / 1000);
    return seconds >= MIN_PAUSE_SEC ? { start: st, end: en, seconds } : null;
  }).filter(Boolean);
}

// 1セッションの内訳（実学習・一時停止・逆算した非学習時間）を出す。
// ended_at の無い旧ログは開始時刻が復元値で差が必ず0になるため対象外。
function describeSession(l) {
  if (!l.ended_at) return null;
  const start = new Date(l.started_at), end = new Date(l.ended_at);
  if (isNaN(start) || isNaN(end)) return null;
  const span = Math.round((end - start) / 60000);
  const dur = l.duration_minutes || 0;
  const pauses = parseSessionBreaks(l.breaks);
  const overheadRaw = span - dur;
  return {
    log: l, span, dur, pauses,
    pauseCount: pauses.length,
    pauseMin: Math.round(pauses.reduce((a, b) => a + b.seconds, 0) / 60),
    // 逆算値。負（時間を手で増やした）や極端に大きいものは信用しない
    overhead: overheadRaw >= 0 && overheadRaw <= MAX_OVERHEAD_MIN ? overheadRaw : null,
    overheadRaw
  };
}

function buildIntraSessionStats(logs) {
  const sessions = logs.map(describeSession).filter(Boolean);
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const pauseLens = [];
  sessions.forEach(x => x.pauses.forEach(pz => pauseLens.push(pz.seconds / 60)));
  const withPause = sessions.filter(x => x.pauseCount > 0);
  const oh = sessions.filter(x => x.overhead !== null);

  const pauseBins = [
    { label: '一時停止なし', match: x => x.pauseCount === 0 },
    { label: '1回',         match: x => x.pauseCount === 1 },
    { label: '2回以上',     match: x => x.pauseCount >= 2 }
  ].map(bin => {
    const hit = sessions.filter(bin.match);
    const focus = hit.filter(x => x.log.focus_level);
    return {
      label: bin.label,
      count: hit.length,
      share: sessions.length ? Math.round(hit.length / sessions.length * 100) : 0,
      focusCount: focus.length,
      avgFocus: avg(focus.map(x => Number(x.log.focus_level))),
      avgDur: hit.length ? Math.round(avg(hit.map(x => x.dur))) : null,
      avgPauseMin: hit.length ? Math.round(avg(hit.map(x => x.pauseMin))) : null
    };
  });

  return {
    sessions,
    // 一時停止が1件でも取れていれば内訳を出す価値がある
    hasData: sessions.length >= 3 && (pauseLens.length > 0 || oh.some(x => x.overhead > 0)),
    sessionCount: sessions.length,
    coverage: logs.length ? Math.round(sessions.length / logs.length * 100) : 0,
    pauseCount: pauseLens.length,
    pausedSessions: withPause.length,
    pausePerSession: sessions.length ? +(pauseLens.length / sessions.length).toFixed(1) : 0,
    totalPauseMin: Math.round(pauseLens.reduce((a, b) => a + b, 0)),
    avgPauseMin: pauseLens.length ? Math.round(avg(pauseLens)) : null,
    medianPauseMin: pauseLens.length ? Math.round(median(pauseLens)) : null,
    longestPauseMin: pauseLens.length ? Math.round(Math.max(...pauseLens)) : null,
    overheadCount: oh.length,
    overheadTotalMin: oh.reduce((a, b) => a + b.overhead, 0),
    avgOverheadMin: oh.length ? Math.round(avg(oh.map(x => x.overhead))) : null,
    medianOverheadMin: oh.length ? Math.round(median(oh.map(x => x.overhead))) : null,
    overheadExcluded: sessions.length - oh.length,
    pauseBins
  };
}

function buildBreakStats(logs) {
  const byDay = {};
  logs.forEach(l => {
    const r = getLogRange(l);
    if (isNaN(r.start) || isNaN(r.end)) return;
    const key = toLocalDateKey(getLogicalDate(r.start));
    (byDay[key] = byDay[key] || []).push({ log: l, start: r.start, end: r.end });
  });

  const breaks = [];
  const days = [];
  Object.entries(byDay).forEach(([date, arr]) => {
    arr.sort((a, b) => a.start - b.start);
    let runMin = arr[0].log.duration_minutes || 0;  // 直近の中断以降に積み上げた実学習時間
    let breakMin = 0, breakCount = 0, cutCount = 0;
    for (let i = 1; i < arr.length; i++) {
      const gap = Math.round((arr[i].start - arr[i - 1].end) / 60000);
      const dur = arr[i].log.duration_minutes || 0;
      if (gap < 0) { runMin += dur; continue; }  // 記録が重なっている場合は休憩とみなさない
      if (gap <= BREAK_MAX_MIN) {
        breaks.push({
          minutes: gap,
          nextId: arr[i].log.id,
          prevDur: arr[i - 1].log.duration_minutes || 0,
          prevRunMin: runMin,
          nextFocus: arr[i].log.focus_level ? Number(arr[i].log.focus_level) : null,
          nextDur: dur,
          hour: arr[i - 1].end.getHours()
        });
        breakMin += gap; breakCount++;
        runMin += dur;
      } else {
        cutCount++;
        runMin = dur;
      }
    }
    // 拘束時間＝各セッションの実経過（started_at〜ended_at）。逆算が信用できない
    // ログは実学習時間で代用するので、密度が過小に出ることはあっても過大には出ない。
    const spanMin = arr.reduce((s, x) => {
      const d = x.log.duration_minutes || 0;
      const sp = Math.round((x.end - x.start) / 60000);
      return s + (sp >= d && sp - d <= MAX_OVERHEAD_MIN ? sp : d);
    }, 0);
    days.push({
      date, sessions: arr.length, breakMin, breakCount, cutCount, spanMin,
      studyMin: arr.reduce((s, x) => s + (x.log.duration_minutes || 0), 0)
    });
  });

  const lens = breaks.map(b => b.minutes);
  const multiDays = days.filter(d => d.sessions > 1);
  const totalStudy = days.reduce((s, d) => s + d.studyMin, 0);
  const totalBreak = days.reduce((s, d) => s + d.breakMin, 0);
  const totalSpan = days.reduce((s, d) => s + d.spanMin, 0);
  const totalIntra = Math.max(0, totalSpan - totalStudy);  // セッション内の非学習時間
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;

  const bins = BREAK_BINS.map(bin => {
    const hit = breaks.filter(b => b.minutes >= bin.min && b.minutes <= bin.max);
    const focus = hit.filter(b => b.nextFocus);
    return {
      ...bin,
      count: hit.length,
      share: breaks.length ? Math.round(hit.length / breaks.length * 100) : 0,
      focusCount: focus.length,
      avgNextFocus: avg(focus.map(b => b.nextFocus)),
      avgNextDur: hit.length ? Math.round(avg(hit.map(b => b.nextDur))) : null
    };
  });

  // 休憩明けの集中度がいちばん高かった長さ。母数が少ないビンで断定しないよう3件以上に絞る。
  const cands = bins.filter(b => b.focusCount >= 3 && b.avgNextFocus !== null);
  const bestBin = cands.length ? cands.reduce((a, b) => (b.avgNextFocus > a.avgNextFocus ? b : a)) : null;
  const worstBin = cands.length > 1 ? cands.reduce((a, b) => (b.avgNextFocus < a.avgNextFocus ? b : a)) : null;

  // 「どれだけ続けて勉強したあとの休憩か」別に、休憩明けの集中度を見る。
  const runBins = BREAK_RUN_BINS.map(r => {
    const hit = breaks.filter(b => b.prevDur >= r.min && b.prevDur <= r.max);
    const focus = hit.filter(b => b.nextFocus);
    return {
      ...r,
      count: hit.length,
      focusCount: focus.length,
      avgBreak: hit.length ? Math.round(avg(hit.map(b => b.minutes))) : null,
      avgNextFocus: avg(focus.map(b => b.nextFocus))
    };
  });

  // ログID → 直前の休憩の長さ（分）。演習の質を「休憩明けかどうか」で切るのに使う。
  const breakBeforeById = {};
  breaks.forEach(b => { if (b.nextId != null) breakBeforeById[b.nextId] = b.minutes; });

  return {
    breaks, days, bins, bestBin, worstBin, runBins, breakBeforeById,
    hasData: breaks.length >= 3,
    count: breaks.length,
    avgBreak: lens.length ? Math.round(avg(lens)) : 0,
    medianBreak: lens.length ? Math.round(median(lens)) : 0,
    longestBreak: lens.length ? Math.max(...lens) : 0,
    perDay: multiDays.length ? +(breaks.length / multiDays.length).toFixed(1) : 0,
    activeDays: multiDays.length,
    totalBreak,
    totalIntra,
    totalStudy,
    // 拘束時間（セッションの実経過＋セッション間の休憩）に占める実学習の割合。
    // セッション内の一時停止・ポモドーロ休憩も分母に入る。
    density: (totalSpan + totalBreak) > 0 ? Math.round(totalStudy / (totalSpan + totalBreak) * 100) : null,
    avgRunBeforeBreak: breaks.length ? Math.round(avg(breaks.map(b => b.prevDur))) : 0
  };
}

// ==================== 演習の質（セッション単位） ====================
// questions_solved / questions_correct はセッション単位で時刻付きに入っているので、
// 「いつ・どんな状態で解いたか」ごとの正答率が出せる。教材進捗トラッカー側の
// 累積正答率（全周回の合計・期間フィルタの影響を受けない）とは別の切り口。
const QB_MIN_SESSIONS = 3;   // これ未満のセッション数の区分は判定に使わない
const QB_MIN_SOLVED = 20;    // 解答数がこれ未満の区分も参考値どまり

function qbSessionsOf(logs) {
  return logs.map(l => {
    const solved = Number(l.questions_solved);
    const correct = Number(l.questions_correct);
    if (!Number.isFinite(solved) || solved <= 0) return null;
    if (!Number.isFinite(correct) || correct < 0 || correct > solved) return null;
    const start = getLogRange(l).start;
    if (isNaN(start)) return null;
    const dur = l.duration_minutes || 0;
    return {
      log: l, start, solved, correct,
      minPerQ: dur > 0 ? dur / solved : null,
      focus: l.focus_level ? Number(l.focus_level) : null,
      hour: start.getHours()
    };
  }).filter(Boolean);
}

// 区分ひとつぶんの集計。正答率は「セッションごとの率の平均」ではなく
// 解答数で重み付けした通算（＝総正答 ÷ 総解答）にする。
function qbBin(label, items) {
  const solved = items.reduce((s, x) => s + x.solved, 0);
  const correct = items.reduce((s, x) => s + x.correct, 0);
  const paced = items.filter(x => x.minPerQ !== null && x.minPerQ > 0);
  return {
    label,
    sessions: items.length,
    solved, correct,
    accuracy: solved > 0 ? correct / solved * 100 : null,
    minPerQ: paced.length ? paced.reduce((s, x) => s + x.minPerQ, 0) / paced.length : null,
    reliable: items.length >= QB_MIN_SESSIONS && solved >= QB_MIN_SOLVED
  };
}

const QB_SPEED_BINS = [
  { label: '〜1分',   min: 0,   max: 1 },
  { label: '1〜2分',  min: 1,   max: 2 },
  { label: '2〜3分',  min: 2,   max: 3 },
  { label: '3分〜',   min: 3,   max: Infinity }
];

function buildQbQualityStats(logs, breakBeforeById) {
  const items = qbSessionsOf(logs);
  const bb = breakBeforeById || {};
  const solved = items.reduce((s, x) => s + x.solved, 0);
  const correct = items.reduce((s, x) => s + x.correct, 0);
  const paced = items.filter(x => x.minPerQ !== null && x.minPerQ > 0);

  const bySlot = ['morning', 'afternoon', 'evening', 'night']
    .map(sl => ({ key: sl, ...qbBin(getTimeSlotLabel(sl), items.filter(x => getTimeSlotForHour(x.hour) === sl)) }));

  const byFocus = [
    { label: '★1〜2', match: x => x.focus !== null && x.focus <= 2 },
    { label: '★3',    match: x => x.focus === 3 },
    { label: '★4',    match: x => x.focus === 4 },
    { label: '★5',    match: x => x.focus === 5 }
  ].map(b => qbBin(b.label, items.filter(b.match)));

  const byBreak = [
    { label: '休憩をはさまず連続',  match: x => bb[x.log.id] === undefined },
    { label: '〜15分の休憩明け',    match: x => bb[x.log.id] !== undefined && bb[x.log.id] <= 15 },
    { label: '16分以上の休憩明け',  match: x => bb[x.log.id] !== undefined && bb[x.log.id] > 15 }
  ].map(b => qbBin(b.label, items.filter(b.match)));

  // 速く解いた回で正答率が落ちていないか（雑になっていないか）
  const bySpeed = QB_SPEED_BINS.map(b =>
    ({ ...qbBin(b.label, paced.filter(x => x.minPerQ >= b.min && x.minPerQ < b.max)) }));

  // ★の自己申告が実際の成績と対応しているか。
  // 高評価（★4以上）と低評価（★2以下）の正答率差で見る。
  const hi = qbBin('hi', items.filter(x => x.focus !== null && x.focus >= 4));
  const lo = qbBin('lo', items.filter(x => x.focus !== null && x.focus <= 2));
  const calibration = (hi.reliable && lo.reliable && hi.accuracy !== null && lo.accuracy !== null)
    ? { hi: hi.accuracy, lo: lo.accuracy, diff: hi.accuracy - lo.accuracy }
    : null;

  const reliableSlots = bySlot.filter(b => b.reliable);
  const bestSlot  = reliableSlots.length ? reliableSlots.reduce((a, b) => (b.accuracy > a.accuracy ? b : a)) : null;
  const worstSlot = reliableSlots.length > 1 ? reliableSlots.reduce((a, b) => (b.accuracy < a.accuracy ? b : a)) : null;

  return {
    hasData: items.length >= QB_MIN_SESSIONS && solved >= QB_MIN_SOLVED,
    items, bySlot, byFocus, byBreak, bySpeed, calibration, bestSlot, worstSlot,
    sessionCount: items.length,
    coverage: logs.length ? Math.round(items.length / logs.length * 100) : 0,
    solved, correct,
    accuracy: solved > 0 ? correct / solved * 100 : null,
    minPerQ: paced.length ? paced.reduce((s, x) => s + x.minPerQ, 0) / paced.length : null,
    medianMinPerQ: paced.length ? median(paced.map(x => x.minPerQ)) : null
  };
}

// ==================== 解き直しの間隔 ====================
// activity='review' は使っていない（復習も問題演習として記録している）ため、
// タグではなく「同じ科目に前回触れた日からの間隔」で復習を捉える。
// 粒度は科目単位なので、問題単位の忘却曲線ではない点に注意。
const REVIEW_GAP_BINS = [
  { label: '翌日',     min: 1,  max: 1 },
  { label: '2〜3日',   min: 2,  max: 3 },
  { label: '4〜7日',   min: 4,  max: 7 },
  { label: '8〜14日',  min: 8,  max: 14 },
  { label: '15〜30日', min: 15, max: 30 },
  { label: '31日以上', min: 31, max: Infinity }
];
const REVIEW_STALE_DAYS = 14;   // これ以上空いた科目を放置として挙げる

function buildReviewIntervalStats(logs, logicalToday) {
  // 科目 × 論理日 に畳んでから、その科目を触った日の並びで間隔を取る。
  // 同じ日に複数セッションあっても「1回の学習」として数える。
  const bySubject = {};
  logs.forEach(l => {
    const r = getLogRange(l);
    if (isNaN(r.start)) return;
    const name = normalizeSubjectName(l.subject_name);
    const key = toLocalDateKey(getLogicalDate(r.start));
    const days = (bySubject[name] = bySubject[name] || {});
    const e = (days[key] = days[key] || { solved: 0, correct: 0, minutes: 0, focusSum: 0, focusN: 0, hasQb: false });
    e.minutes += l.duration_minutes || 0;
    const sv = Number(l.questions_solved), co = Number(l.questions_correct);
    if (Number.isFinite(sv) && sv > 0 && Number.isFinite(co) && co >= 0 && co <= sv) {
      e.solved += sv; e.correct += co; e.hasQb = true;
    }
    if (l.focus_level) { e.focusSum += Number(l.focus_level); e.focusN++; }
  });

  const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
  const visits = [];
  const subjects = [];
  Object.entries(bySubject).forEach(([name, days]) => {
    const keys = Object.keys(days).sort();
    keys.forEach((k, i) => {
      visits.push({ subject: name, day: k, gapDays: i === 0 ? null : dayDiff(k, keys[i - 1]), ...days[k] });
    });
    subjects.push({ subject: name, lastDay: keys[keys.length - 1], visitCount: keys.length });
  });

  const bins = REVIEW_GAP_BINS.map(b => {
    const hit = visits.filter(v => v.gapDays !== null && v.gapDays >= b.min && v.gapDays <= b.max);
    const qb = hit.filter(v => v.hasQb);
    const solved = qb.reduce((s, v) => s + v.solved, 0);
    const correct = qb.reduce((s, v) => s + v.correct, 0);
    const foc = hit.filter(v => v.focusN > 0);
    return {
      ...b,
      count: hit.length,
      qbCount: qb.length,
      solved, correct,
      accuracy: solved > 0 ? correct / solved * 100 : null,
      avgFocus: foc.length ? foc.reduce((s, v) => s + v.focusSum / v.focusN, 0) / foc.length : null,
      reliable: qb.length >= QB_MIN_SESSIONS && solved >= QB_MIN_SOLVED
    };
  });

  const cands = bins.filter(b => b.reliable && b.accuracy !== null);
  const bestBin = cands.length ? cands.reduce((a, b) => (b.accuracy > a.accuracy ? b : a)) : null;
  const worstBin = cands.length > 1 ? cands.reduce((a, b) => (b.accuracy < a.accuracy ? b : a)) : null;

  const todayKey = toLocalDateKey(logicalToday);
  const stale = subjects
    .map(x => ({ ...x, daysSince: dayDiff(todayKey, x.lastDay) }))
    .filter(x => x.daysSince >= REVIEW_STALE_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince);

  const gaps = visits.filter(v => v.gapDays !== null).map(v => v.gapDays);
  return {
    hasData: gaps.length >= QB_MIN_SESSIONS,
    visits, bins, bestBin, worstBin, stale,
    subjectCount: subjects.length,
    revisitCount: gaps.length,
    avgGap: gaps.length ? Math.round(gaps.reduce((s, v) => s + v, 0) / gaps.length) : null,
    medianGap: gaps.length ? Math.round(median(gaps)) : null,
    hasAccuracy: bins.some(b => b.accuracy !== null)
  };
}

// ==================== 目標と実績（曜日別） ====================
// 実績はログから直接出す。目標は getGoalForDate（上書き→スナップショット→曜日別
// テンプレートの順）から引くので、過去日でスナップショットが無いぶんは
// 「いまの曜日別テンプレート」で評価している点に注意。
const GOAL_HISTORY_DAYS = 56;

function buildGoalHistory(allLogs, logicalToday, days = GOAL_HISTORY_DAYS) {
  const minutesByDay = {};
  allLogs.forEach(l => {
    const r = getLogRange(l);
    if (isNaN(r.start)) return;
    const k = toLocalDateKey(getLogicalDate(r.start));
    minutesByDay[k] = (minutesByDay[k] || 0) + (l.duration_minutes || 0);
  });

  const rows = [];
  // 今日はまだ途中なので入れない
  for (let i = days; i >= 1; i--) {
    const d = new Date(logicalToday);
    d.setDate(d.getDate() - i);
    const k = toLocalDateKey(d);
    const goal = getGoalForDate(d) || 0;
    const actual = minutesByDay[k] || 0;
    rows.push({ date: k, dow: d.getDay(), goal, actual, off: actual === 0, met: goal > 0 && actual >= goal });
  }

  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dow = [1, 2, 3, 4, 5, 6, 0].map(d => {
    const hit = rows.filter(r => r.dow === d);
    const studied = hit.filter(r => !r.off);
    const goalSum = hit.reduce((s, r) => s + r.goal, 0);
    const actualSum = hit.reduce((s, r) => s + r.actual, 0);
    const studiedMins = studied.map(r => r.actual);
    return {
      dow: d, label: dowNames[d],
      days: hit.length,
      offDays: hit.length - studied.length,
      offRate: hit.length ? Math.round((hit.length - studied.length) / hit.length * 100) : 0,
      metDays: hit.filter(r => r.met).length,
      avgGoal: hit.length ? Math.round(goalSum / hit.length) : 0,
      avgActual: hit.length ? Math.round(actualSum / hit.length) : 0,
      // 学習した日だけで見た実績。オフ日で薄まらない値。
      avgActualStudied: studiedMins.length ? Math.round(studiedMins.reduce((s, v) => s + v, 0) / studiedMins.length) : 0,
      medianStudied: studiedMins.length ? Math.round(median(studiedMins)) : 0,
      rate: goalSum > 0 ? Math.round(actualSum / goalSum * 100) : null
    };
  });

  // オフ日が半分以上あって達成率も低い曜日＝目標が実態に合っていない曜日
  const mismatched = dow
    .filter(x => x.days >= 4 && x.avgGoal > 0 && x.offRate >= 50 && x.rate !== null && x.rate < 60)
    .sort((a, b) => b.offRate - a.offRate);

  const totalGoal = rows.reduce((s, r) => s + r.goal, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const studiedRows = rows.filter(r => !r.off);
  return {
    hasData: rows.some(r => r.actual > 0),
    rows, dow, mismatched,
    days: rows.length,
    offDays: rows.length - studiedRows.length,
    metDays: rows.filter(r => r.met).length,
    rate: totalGoal > 0 ? Math.round(totalActual / totalGoal * 100) : null,
    // オフ日を除いた達成率。バイト・旅行の日に引きずられない見方。
    rateStudied: (() => {
      const g = studiedRows.reduce((s, r) => s + r.goal, 0);
      const a = studiedRows.reduce((s, r) => s + r.actual, 0);
      return g > 0 ? Math.round(a / g * 100) : null;
    })()
  };
}

// ==================== インプット / アウトプットの基準線 ====================
// 動画1本と1問では単位あたりの所要時間が違うので、時間比をそのまま
// 50:50 と比べても意味がない。実測の単価 × 教材の総量から
// 「この教材を終えたら必然的にこうなる」比率を出して基準線にする。
const UNIT_MIN_VIDEOS = 5;      // 単価を出すのに要る最低サンプル
const UNIT_MIN_QUESTIONS = 50;

function buildUnitCost(logs) {
  let vMin = 0, vCount = 0, vSessions = 0, qMin = 0, qCount = 0, qSessions = 0;
  logs.forEach(l => {
    const m = l.duration_minutes || 0;
    const vw = Number(l.videos_watched), qs = Number(l.questions_solved);
    if (l.activity === 'video' && Number.isFinite(vw) && vw > 0) { vMin += m; vCount += vw; vSessions++; }
    if (l.activity === 'qb' && Number.isFinite(qs) && qs > 0) { qMin += m; qCount += qs; qSessions++; }
  });
  return {
    minPerVideo: vCount > 0 ? vMin / vCount : null,
    videoSamples: vCount, videoSessions: vSessions,
    minPerQuestion: qCount > 0 ? qMin / qCount : null,
    questionSamples: qCount, questionSessions: qSessions,
    hasVideo: vCount >= UNIT_MIN_VIDEOS,
    hasQuestion: qCount >= UNIT_MIN_QUESTIONS
  };
}

function buildIOBaseline(unit, pipelineRows) {
  const rows = pipelineRows || [];
  const videoTotal = rows.reduce((s, r) => s + (r.videoTotal || 0), 0);
  const videoDone = rows.reduce((s, r) => s + (r.videoDone || 0), 0);
  const qbTotal = rows.reduce((s, r) => s + (r.qb1Total || 0), 0);
  const qbDone = rows.reduce((s, r) => s + (r.qb1Done || 0), 0);
  const progress = {
    videoPct: videoTotal > 0 ? videoDone / videoTotal * 100 : null,
    qbPct: qbTotal > 0 ? qbDone / qbTotal * 100 : null,
    videoTotal, videoDone, qbTotal, qbDone
  };
  progress.gap = (progress.videoPct !== null && progress.qbPct !== null)
    ? progress.videoPct - progress.qbPct : null;

  if (!unit.hasVideo || !unit.hasQuestion || videoTotal <= 0 || qbTotal <= 0) {
    return { hasData: false, progress };
  }
  const vMin = videoTotal * unit.minPerVideo;
  const qMin = qbTotal * unit.minPerQuestion;
  const total = vMin + qMin;
  return {
    hasData: true, progress,
    videoTotal, qbTotal, vMin, qMin,
    videoShare: total > 0 ? vMin / total * 100 : null,
    // 残りを終えるのに必要な時間（QBは1周目のみを前提）
    remainVideoMin: Math.max(0, videoTotal - videoDone) * unit.minPerVideo,
    remainQbMin: Math.max(0, qbTotal - qbDone) * unit.minPerQuestion
  };
}

// ==================== インサイトのセクション折りたたみ ====================
const INSIGHT_GROUP_KEY = 'medfocus_insight_groups';
const INSIGHT_GROUP_DEFAULTS = { overview: true, breaks: true, goal: false, qb: false, life: false, trend: false, sessions: false };
function getInsightGroupState() {
  try { return JSON.parse(localStorage.getItem(INSIGHT_GROUP_KEY) || '{}'); } catch (e) { return {}; }
}
function isInsightGroupOpen(id) {
  const st = getInsightGroupState();
  return st[id] === undefined ? (INSIGHT_GROUP_DEFAULTS[id] ?? true) : !!st[id];
}
function setInsightGroupOpen(id, open) {
  const st = getInsightGroupState();
  st[id] = open;
  localStorage.setItem(INSIGHT_GROUP_KEY, JSON.stringify(st));
}
function insightGroupOpenHTML(id, title, subtitle, icon, color, badge) {
  const open = isInsightGroupOpen(id);
  return `
    <section class="insight-group ${open ? 'open' : ''}" data-group="${id}">
      <button type="button" class="insight-group-header" data-group-toggle="${id}" aria-expanded="${open}">
        <span class="section-icon-wrap" style="color:${color}">${icon}</span>
        <span class="insight-group-heading">
          <span class="insight-group-title">${title}</span>
          <span class="insight-group-sub">${subtitle}</span>
        </span>
        ${badge ? `<span class="insight-group-badge">${badge}</span>` : ''}
        <span class="insight-group-chevron"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
      </button>
      <div class="insight-group-body">`;
}
const insightGroupCloseHTML = `</div></section>`;

function toggleInsightGroup(id, force) {
  const sec = document.querySelector(`.insight-group[data-group="${id}"]`);
  if (!sec) return;
  const open = force === undefined ? !sec.classList.contains('open') : force;
  sec.classList.toggle('open', open);
  sec.querySelector('.insight-group-header')?.setAttribute('aria-expanded', String(open));
  setInsightGroupOpen(id, open);
  // 閉じたまま生成されたグラフは幅0で描かれているので、開いたときに測り直す
  if (open) setTimeout(() => {
    sec.querySelectorAll('canvas').forEach(c => chartInstances[c.id]?.resize());
  }, 20);
}
function setAllInsightGroups(open) {
  document.querySelectorAll('.insight-group').forEach(sec => toggleInsightGroup(sec.dataset.group, open));
}

// SVG icons for section headers (no emoji)
const insightIcons = {
  filter: '<svg viewBox="0 0 24 24"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  summary: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  subject: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h20"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  location: '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  ai: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  focus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  target: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
};

// 条件別の正答率テーブル。母数が足りない行は薄く出して、判定に使わないことを示す。
function qbAccTable(bins) {
  return `<div class="break-table">
    <div class="break-row break-row-head break-row-run">
      <div>区分</div><div style="text-align:right">解答数</div><div style="text-align:right">正答率</div><div style="text-align:right">1問あたり</div>
    </div>
    ${bins.map(b => `
      <div class="break-row break-row-run ${b.reliable ? '' : 'is-thin'}">
        <div class="break-row-label">${b.label}</div>
        <div class="break-row-num">${b.solved > 0 ? b.solved + '問' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
        <div class="break-row-num">${b.accuracy !== null ? b.accuracy.toFixed(0) + '%' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
        <div class="break-row-num">${b.minPerQ !== null ? b.minPerQ.toFixed(1) + '分' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
      </div>
    `).join('')}
  </div>`;
}

async function renderInsights(){
  const ct=document.getElementById('page-container');
  await loadQBFromSupabase();
  await loadVideoFromSupabase();
  const allLogs=await fetchStudyLogs();
  const logs=applyInsightFilters(allLogs);
  const logicalToday=getLogicalDate(new Date());

  // --- Collect unique subjects & locations from ALL logs for filter options ---
  const allSubjectNames = [...new Set(allLogs.map(l => normalizeSubjectName(l.subject_name)))].sort();
  const allLocations = [...new Set(allLogs.map(l => l.location || '未設定'))].sort();

  // --- Filtered stats ---
  const totalMin = logs.reduce((s,l) => s + l.duration_minutes, 0);
  const sessionCount = logs.length;
  const studyDateSet = new Set(logs.map(l => toLocalDateKey(getLogicalDate(new Date(l.started_at)))));
  const studyDays = studyDateSet.size;
  const focusLogs = logs.filter(l => l.focus_level);
  const avgFocus = focusLogs.length > 0 ? (focusLogs.reduce((s,l) => s + Number(l.focus_level), 0) / focusLogs.length).toFixed(1) : '-';
  const avgSessionMin = sessionCount > 0 ? Math.round(totalMin / sessionCount) : 0;

  // --- Study streak (from allLogs, filter-independent) ---
  const allStudyDateSet = new Set(allLogs.map(l => toLocalDateKey(getLogicalDate(new Date(l.started_at)))));
  let studyStreak = 0;
  {
    const todayKey = toLocalDateKey(logicalToday);
    const yesterdayKey = toLocalDateKey(new Date(logicalToday.getTime() - 86400000));
    let checkDate = allStudyDateSet.has(todayKey) ? new Date(logicalToday) :
                    allStudyDateSet.has(yesterdayKey) ? new Date(logicalToday.getTime() - 86400000) : null;
    while (checkDate && allStudyDateSet.has(toLocalDateKey(checkDate))) {
      studyStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  const streakActive = allStudyDateSet.has(toLocalDateKey(logicalToday));

  // --- Subject distribution ---
  const subjectTimeMap = {};
  logs.forEach(l => {
    const k = normalizeSubjectName(l.subject_name);
    subjectTimeMap[k] = (subjectTimeMap[k] || 0) + l.duration_minutes;
  });
  const sortedSubjects = Object.entries(subjectTimeMap).sort((a,b) => b[1] - a[1]);

  // --- Subject focus map ---
  const subjectFocusMap = {};
  logs.forEach(l => {
    if (!l.focus_level) return;
    const k = normalizeSubjectName(l.subject_name);
    if (!subjectFocusMap[k]) subjectFocusMap[k] = { sum: 0, count: 0 };
    subjectFocusMap[k].sum += Number(l.focus_level);
    subjectFocusMap[k].count++;
  });
  const sortedSubjectFocus = Object.entries(subjectFocusMap)
    .map(([name, v]) => [name, v.sum / v.count, v.count])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // --- DOW (day of week) stats ---
  const dowNames = ['日','月','火','水','木','金','土'];
  const dowMinutes = [0,0,0,0,0,0,0];
  const dowCounts = [0,0,0,0,0,0,0];
  logs.forEach(l => {
    const d = getLogicalDate(new Date(l.started_at)).getDay();
    dowMinutes[d] += l.duration_minutes;
    dowCounts[d]++;
  });
  const maxDowMin = Math.max(...dowMinutes, 1);

  // --- Location stats ---
  const locationStats = {};
  logs.forEach(l => {
    const loc = l.location || '未設定';
    if (!locationStats[loc]) locationStats[loc] = { min: 0, focusSum: 0, focusCount: 0, count: 0 };
    locationStats[loc].min += l.duration_minutes;
    locationStats[loc].count++;
    if (l.focus_level) {
      locationStats[loc].focusSum += Number(l.focus_level);
      locationStats[loc].focusCount++;
    }
  });
  const sortedLocations = Object.entries(locationStats).sort((a,b) => b[1].min - a[1].min);
  const maxLocMin = sortedLocations.length > 0 ? sortedLocations[0][1].min : 1;

  // --- Time-of-day × Day-of-week heatmap ---
  const todDowMap = {}; // key: `${dow}-${hour}` → minutes
  logs.forEach(l => {
    const start = new Date(l.started_at);
    const dur = l.duration_minutes;
    if (!dur || dur <= 0) return;
    const end = new Date(start.getTime() + dur * 60000);
    let cursor = new Date(start);
    let remaining = dur;
    while (remaining > 0 && cursor < end) {
      const hr = cursor.getHours();
      const dow = getLogicalDate(new Date(cursor)).getDay();
      const nextHour = new Date(cursor); nextHour.setMinutes(0,0,0); nextHour.setHours(nextHour.getHours()+1);
      const minsInHour = Math.min(remaining, (nextHour - cursor) / 60000);
      const key = `${dow}-${hr}`;
      todDowMap[key] = (todDowMap[key] || 0) + minsInHour;
      remaining -= minsInHour;
      cursor = nextHour;
    }
  });
  const maxHeatVal = Math.max(...Object.values(todDowMap), 1);

  // --- Daily trend for chart ---
  let graphStart = new Date(logicalToday);
  let graphEnd = new Date(logicalToday);

  if (insightFilters.preset === 'today') {
    graphStart.setDate(logicalToday.getDate() - 6);
  } else if (insightFilters.preset === 'week') {
    const day = logicalToday.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    graphStart.setDate(logicalToday.getDate() - diff);
  } else if (insightFilters.preset === 'month') {
    graphStart = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1);
  } else if (insightFilters.preset === 'lastmonth') {
    graphStart = new Date(logicalToday.getFullYear(), logicalToday.getMonth() - 1, 1);
    graphEnd = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 0);
  } else if (insightFilters.preset === 'custom') {
    if (insightFilters.dateFrom) graphStart = new Date(insightFilters.dateFrom);
    else if (allLogs.length > 0) {
      const dates = allLogs.map(l => new Date(l.started_at)).sort((a,b)=>a-b);
      graphStart = getLogicalDate(dates[0]);
    } else {
      graphStart.setDate(logicalToday.getDate() - 29);
    }
    if (insightFilters.dateTo) graphEnd = new Date(insightFilters.dateTo);
  } else {
    // 'all'
    if (allLogs.length > 0) {
      const dates = allLogs.map(l => new Date(l.started_at)).sort((a,b)=>a-b);
      graphStart = getLogicalDate(dates[0]);
    } else {
      graphStart.setDate(logicalToday.getDate() - 29);
    }
  }

  if (graphStart > graphEnd) {
    const tmp = graphStart; graphStart = graphEnd; graphEnd = tmp;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  let diffDays = Math.round((graphEnd - graphStart) / oneDayMs) + 1;
  let loopStart = new Date(graphStart);

  if (diffDays > 90) {
    loopStart = new Date(graphEnd);
    loopStart.setDate(loopStart.getDate() - 89);
    diffDays = 90;
  }
  if (diffDays < 7) {
    loopStart.setDate(loopStart.getDate() - (7 - diffDays));
    diffDays = 7;
  }

  const trendLabels = [], trendData = [];
  const trendDataCBT = [], trendDataExam = [], trendDataAssig = [], trendDataOther = [];
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(loopStart); d.setDate(d.getDate() + i);
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayLogs = logs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    const mins = dayLogs.reduce((s,l) => s + l.duration_minutes, 0);
    trendData.push(mins);
    trendDataCBT.push(dayLogs.filter(l => l.study_purpose==='cbt').reduce((s,l)=>s+l.duration_minutes, 0));
    trendDataExam.push(dayLogs.filter(l => l.study_purpose==='regular_exam').reduce((s,l)=>s+l.duration_minutes, 0));
    trendDataAssig.push(dayLogs.filter(l => l.study_purpose==='assignment').reduce((s,l)=>s+l.duration_minutes, 0));
    trendDataOther.push(dayLogs.filter(l => (l.study_purpose||'other')==='other').reduce((s,l)=>s+l.duration_minutes, 0));
    trendLabels.push(`${d.getMonth()+1}/${d.getDate()}`);
  }

  // --- Donut chart data ---
  const DONUT_COLORS = ['#4ECDC4','#45B7D1','#FF6B6B','#F7DC6F','#BB8FCE','#F1948A','#F0B27A','#82E0AA','#5DADE2','#AF7AC5','#F39C12','#E74C3C','#1ABC9C'];
  const donutTotal = sortedSubjects.reduce((s,[,m]) => s + m, 0) || 1;
  let donutSVG = '';
  let donutOffset = 0;
  const donutR = 60, donutC = 2 * Math.PI * donutR;
  sortedSubjects.slice(0, 10).forEach(([name, min], i) => {
    const pct = min / donutTotal;
    const dash = donutC * pct;
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    donutSVG += `<circle cx="80" cy="80" r="${donutR}" fill="none" stroke="${color}" stroke-width="20" stroke-dasharray="${dash} ${donutC - dash}" stroke-dashoffset="${-donutOffset}" transform="rotate(-90 80 80)"/>`;
    donutOffset += dash;
  });

  // --- Heatmap HTML ---
  const hourOrder = [];
  for(let i=5;i<24;i++) hourOrder.push(i);
  for(let i=0;i<5;i++) hourOrder.push(i);
  let heatmapHTML = '<div class="tod-heatmap-label"></div>';
  hourOrder.forEach((h, i) => {
    if (i % 3 === 0) heatmapHTML += `<div class="tod-heatmap-label">${h}</div>`;
    else heatmapHTML += `<div class="tod-heatmap-label" style="font-size:0"></div>`;
  });
  const dowOrder = [1,2,3,4,5,6,0]; // Mon-Sun
  dowOrder.forEach(dow => {
    heatmapHTML += `<div class="tod-heatmap-label">${dowNames[dow]}</div>`;
    hourOrder.forEach(hr => {
      const val = todDowMap[`${dow}-${hr}`] || 0;
      const intensity = maxHeatVal > 0 ? val / maxHeatVal : 0;
      const alpha = Math.min(1, intensity * 1.2);
      const bg = val > 0 ? `rgba(78,205,196,${0.15 + alpha * 0.85})` : '';
      const shadow = alpha > 0.7 ? `box-shadow:0 0 4px rgba(78,205,196,${alpha * 0.5})` : '';
      heatmapHTML += `<div class="tod-heatmap-cell" style="${val > 0 ? 'background:'+bg+';'+shadow : ''}" title="${dowNames[dow]} ${hr}時: ${Math.round(val)}分"></div>`;
    });
  });

  // Preset label
  const presetLabels = {all:'全期間',today:'今日',week:'今週',month:'今月',lastmonth:'先月',custom:'カスタム'};

  // --- Section A: Weekly Comparison ---
  const thisWeekLogs = [];
  const lastWeekLogs = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayLogs = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    thisWeekLogs.push(...dayLogs);
  }
  for (let i = 7; i < 14; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayLogs = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    lastWeekLogs.push(...dayLogs);
  }

  // A-1: Average first study start time
  function getWeekAvgStartTime(weekLogs, startOffset) {
    const startTimes = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(logicalToday); d.setDate(d.getDate() - startOffset - i);
      const ds = new Date(d); ds.setHours(3,0,0,0);
      const de = new Date(d); de.setHours(26,59,59,999);
      const dayL = weekLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
      if (dayL.length > 0) {
        const earliest = dayL.reduce((min, l) => { const t = new Date(l.started_at); return t < min ? t : min; }, new Date(dayL[0].started_at));
        startTimes.push(getMinutesFromBase3AM(String(earliest.getHours()).padStart(2,'0') + ':' + String(earliest.getMinutes()).padStart(2,'0')));
      }
    }
    if (startTimes.length === 0) return null;
    return Math.round(startTimes.reduce((a, b) => a + b, 0) / startTimes.length);
  }
  const thisWeekAvgStart = getWeekAvgStartTime(thisWeekLogs, 0);
  const lastWeekAvgStart = getWeekAvgStartTime(lastWeekLogs, 7);
  function minutesFromBase5AMToTimeStr(mins) {
    let actual = (mins + 300) % 1440;
    return String(Math.floor(actual / 60)).padStart(2,'0') + ':' + String(actual % 60).padStart(2,'0');
  }

  // A-2: Daily average study time
  const thisWeekTotalMin = thisWeekLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const lastWeekTotalMin = lastWeekLogs.reduce((s, l) => s + l.duration_minutes, 0);
  const thisWeekDailyAvg = Math.round(thisWeekTotalMin / 7);
  const lastWeekDailyAvg = Math.round(lastWeekTotalMin / 7);
  const dailyAvgChange = lastWeekDailyAvg > 0 ? Math.round(((thisWeekDailyAvg - lastWeekDailyAvg) / lastWeekDailyAvg) * 100) : 0;

  // A-3: Average focus
  const thisWeekFocusLogs = thisWeekLogs.filter(l => l.focus_level);
  const lastWeekFocusLogs = lastWeekLogs.filter(l => l.focus_level);
  const thisWeekAvgFocus = thisWeekFocusLogs.length > 0 ? (thisWeekFocusLogs.reduce((s, l) => s + Number(l.focus_level), 0) / thisWeekFocusLogs.length) : null;
  const lastWeekAvgFocus = lastWeekFocusLogs.length > 0 ? (lastWeekFocusLogs.reduce((s, l) => s + Number(l.focus_level), 0) / lastWeekFocusLogs.length) : null;
  const focusChangeVal = (thisWeekAvgFocus !== null && lastWeekAvgFocus !== null) ? (thisWeekAvgFocus - lastWeekAvgFocus) : null;

  // A-4: Late night study percentage
  function getLateNightPct(wkLogs) {
    const total = wkLogs.reduce((s, l) => s + l.duration_minutes, 0);
    if (total === 0) return 0;
    const lateNight = wkLogs.filter(l => { const h = new Date(l.started_at).getHours(); return h >= 23 || h < 5; }).reduce((s, l) => s + l.duration_minutes, 0);
    return Math.round((lateNight / total) * 100);
  }
  const thisWeekLateNight = getLateNightPct(thisWeekLogs);
  const lastWeekLateNight = getLateNightPct(lastWeekLogs);
  const lateNightDiff = thisWeekLateNight - lastWeekLateNight;

  // Overall rhythm status
  const startTimeDiff = (thisWeekAvgStart !== null && lastWeekAvgStart !== null) ? (thisWeekAvgStart - lastWeekAvgStart) : 0;
  let rhythmStatus = 'good'; let rhythmLabel = '良好';
  if (Math.abs(startTimeDiff) >= 90 || lateNightDiff >= 15) { rhythmStatus = 'danger'; rhythmLabel = '要注意'; }
  else if (Math.abs(startTimeDiff) >= 45 || lateNightDiff >= 5) { rhythmStatus = 'warning'; rhythmLabel = '警戒'; }

  // --- Section B: Personal Analysis (last 30 days) ---
  const last30Logs = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayL = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    last30Logs.push(...dayL);
  }

  // B-1: Chronotype
  const chronoSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  last30Logs.forEach(l => { const h = new Date(l.started_at).getHours(); chronoSlots[getTimeSlotForHour(h)] += l.duration_minutes; });
  const chronoTotal30 = Object.values(chronoSlots).reduce((a, b) => a + b, 0) || 1;
  const morningPct = Math.round((chronoSlots.morning / chronoTotal30) * 100);
  const nightPct = Math.round(((chronoSlots.evening + chronoSlots.night) / chronoTotal30) * 100);
  let chronoType = 'balanced', chronoName = 'オールラウンダー';
  let chronoIconSvg = IC._s('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>');
  let chronoColor = 'var(--color-accent-teal)';
  if (morningPct >= 40) {
    chronoType = 'morning'; chronoName = '朝型スプリンター';
    chronoIconSvg = IC._s('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>');
    chronoColor = '#f59e0b';
  } else if (nightPct >= 50) {
    chronoType = 'night'; chronoName = '夜型ディープフォーカス';
    chronoIconSvg = IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>');
    chronoColor = '#8b5cf6';
  }

  // B-2: Learning pace CV
  const dailyMinutes30 = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayMin = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; }).reduce((s, l) => s + l.duration_minutes, 0);
    dailyMinutes30.push(dayMin);
  }
  const paceCV = calculateCV(dailyMinutes30);
  const isConsistent = paceCV < 0.6;
  const paceName = isConsistent ? 'コツコツ習慣化タイプ' : '追い込み集中タイプ';
  const paceIconSvg = isConsistent ? IC._s('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>') : IC._s('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/>');
  const paceColor = isConsistent ? '#22c55e' : '#f59e0b';

  // B-3: Best focus environment (location x timeSlot x purpose)
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
  const bestEnvs = Object.entries(envMap).filter(([, v]) => v.count >= 2).map(([k, v]) => ({ name: k, avg: (v.sum / v.count).toFixed(1), count: v.count })).sort((a, b) => b.avg - a.avg);
  const bestEnv = bestEnvs.length > 0 ? bestEnvs[0] : null;

  // --- Section C: Sleep Correlation ---
  const sleepLogs = getSleepLogs();
  const recentSleep = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const dk = toLocalDateKey(d);
    const entry = sleepLogs.find(sl => sl.date === dk);
    if (entry && entry.wake_up) recentSleep.push(entry);
  }

  // C-1: Wake-up time stability
  let wakeStabilityStatus = null, wakeStabilitySD = null;
  if (recentSleep.length >= 3) {
    const wakeMins = recentSleep.filter(s => s.wake_up).map(s => getMinutesFromBase3AM(s.wake_up));
    if (wakeMins.length >= 3) {
      const wMean = wakeMins.reduce((a, b) => a + b, 0) / wakeMins.length;
      const wVariance = wakeMins.reduce((a, v) => a + Math.pow(v - wMean, 2), 0) / wakeMins.length;
      wakeStabilitySD = Math.round(Math.sqrt(wVariance));
      if (wakeStabilitySD < 30) wakeStabilityStatus = 'good';
      else if (wakeStabilitySD < 60) wakeStabilityStatus = 'warning';
      else wakeStabilityStatus = 'danger';
    }
  }

  // C-2: First study lag
  function getAvgLag(days, offset) {
    const lags = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(logicalToday); d.setDate(d.getDate() - offset - i);
      const dk = toLocalDateKey(d);
      const sl = sleepLogs.find(s => s.date === dk);
      if (!sl || !sl.wake_up) continue;
      const ds = new Date(d); ds.setHours(3,0,0,0);
      const de = new Date(d); de.setHours(26,59,59,999);
      const dayL = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
      if (dayL.length === 0) continue;
      const earliest = dayL.reduce((min, l) => { const t = new Date(l.started_at); return t < min ? t : min; }, new Date(dayL[0].started_at));
      const wakeMn = getMinutesFromBase3AM(sl.wake_up);
      const studyMn = getMinutesFromBase3AM(String(earliest.getHours()).padStart(2,'0') + ':' + String(earliest.getMinutes()).padStart(2,'0'));
      let lag = studyMn - wakeMn;
      if (lag < 0) lag += 1440;
      if (lag < 720) lags.push(lag);
    }
    return lags.length === 0 ? null : Math.round(lags.reduce((a, b) => a + b, 0) / lags.length);
  }
  const thisWeekLag = getAvgLag(7, 0);
  const lastWeekLag = getAvgLag(7, 7);

  // C-3: Best sleep duration
  let bestSleepSlot = null;
  const sleepSlotFocus = { '<6h': { sum: 0, count: 0 }, '6-7h': { sum: 0, count: 0 }, '7-8h': { sum: 0, count: 0 }, '8h+': { sum: 0, count: 0 } };
  for (let i = 0; i < 30; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const dk = toLocalDateKey(d);
    const prevD = new Date(d); prevD.setDate(prevD.getDate() - 1);
    const prevDk = toLocalDateKey(prevD);
    const todaySl = sleepLogs.find(s => s.date === dk);
    const prevSl = sleepLogs.find(s => s.date === prevDk);
    // 徹夜日（ALLNIGHTER）: 睡眠0時間として <6h 扱い
    if (prevSl && isAllNighter(prevSl)) {
      const ds2 = new Date(d); ds2.setHours(3,0,0,0);
      const de2 = new Date(d); de2.setHours(26,59,59,999);
      allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds2 && t <= de2 && l.focus_level; }).forEach(l => { sleepSlotFocus['<6h'].sum += Number(l.focus_level); sleepSlotFocus['<6h'].count++; });
      continue;
    }
    if (!todaySl || !todaySl.wake_up || !prevSl || !prevSl.bedtime) continue;
    const wakeMin = getMinutesFromBase3AM(todaySl.wake_up);
    const bedMin = getMinutesFromBase3AM(prevSl.bedtime);
    let sleepMin = wakeMin - bedMin; if (sleepMin < 0) sleepMin += 1440;
    const sleepHours = sleepMin / 60;
    let slotKey; if (sleepHours < 6) slotKey = '<6h'; else if (sleepHours < 7) slotKey = '6-7h'; else if (sleepHours < 8) slotKey = '7-8h'; else slotKey = '8h+';
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de && l.focus_level; }).forEach(l => { sleepSlotFocus[slotKey].sum += Number(l.focus_level); sleepSlotFocus[slotKey].count++; });
  }
  const sleepSlotResults = Object.entries(sleepSlotFocus).filter(([, v]) => v.count >= 2).map(([k, v]) => ({ slot: k, avg: v.sum / v.count, count: v.count })).sort((a, b) => b.avg - a.avg);
  bestSleepSlot = sleepSlotResults.length > 0 ? sleepSlotResults[0] : null;

  // C-4: Pre-sleep cooldown
  let shortCooldownDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const dk = toLocalDateKey(d);
    const sl = sleepLogs.find(s => s.date === dk);
    if (!sl || !sl.bedtime) continue;
    const ds = new Date(d); ds.setHours(3,0,0,0);
    const de = new Date(d); de.setHours(26,59,59,999);
    const dayL = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
    if (dayL.length === 0) continue;
    const latest = dayL.reduce((max, l) => { const end = new Date(new Date(l.started_at).getTime() + l.duration_minutes * 60000); return end > max ? end : max; }, new Date(0));
    const latestEndMin = getMinutesFromBase3AM(String(latest.getHours()).padStart(2,'0') + ':' + String(latest.getMinutes()).padStart(2,'0'));
    const bedMn = getMinutesFromBase3AM(sl.bedtime);
    let gap = bedMn - latestEndMin; if (gap < 0) gap += 1440;
    if (gap < 30) shortCooldownDays++;
  }
  const cooldownWarning = shortCooldownDays >= 3;

  // C-5: Late night buffer exceeded
  let lateNightAlert = false;
  const allBedMins = sleepLogs.filter(s => s.bedtime).map(s => getMinutesFromBase3AM(s.bedtime));
  if (allBedMins.length >= 10) {
    const avgBedMin = Math.round(allBedMins.reduce((a, b) => a + b, 0) / allBedMins.length);
    let consecutive = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(logicalToday); d.setDate(d.getDate() - i);
      const dk = toLocalDateKey(d);
      const sl = sleepLogs.find(s => s.date === dk);
      if (sl && sl.bedtime) {
        const bm = getMinutesFromBase3AM(sl.bedtime);
        let diff = bm - avgBedMin; if (diff < -720) diff += 1440;
        if (diff >= 90) consecutive++;
      }
    }
    lateNightAlert = consecutive >= 3;
  }
  const hasSleepData = recentSleep.length >= 3;

  // C-6: Sleep Statistics (data from 2026-06-03 onwards only)
  const SLEEP_STATS_START = '2026-05-29';
  const IDEAL_SLEEP_HOURS = 7;
  const sleepDailyData = []; // {date, hours} for chart
  const sleepHoursArr = []; // just hours for stats
  let allNighterCount = 0;
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const dk = toLocalDateKey(d);
    if (dk < SLEEP_STATS_START) continue;
    const prevD = new Date(d); prevD.setDate(prevD.getDate() - 1);
    const prevDk = toLocalDateKey(prevD);
    const todaySl = sleepLogs.find(s => s.date === dk);
    const prevSl = sleepLogs.find(s => s.date === prevDk);
    
    if (prevSl && isAllNighter(prevSl)) {
      sleepDailyData.push({ date: dk, hours: 0 });
      sleepHoursArr.push(0);
      allNighterCount++;
      continue;
    }
    if (!todaySl || !todaySl.wake_up || !prevSl || !prevSl.bedtime) continue;
    const wakeM = getMinutesFromBase3AM(todaySl.wake_up);
    const bedM = getMinutesFromBase3AM(prevSl.bedtime);
    let slM = wakeM - bedM; if (slM < 0) slM += 1440;
    const h = slM / 60;
    sleepDailyData.push({ date: dk, hours: Math.round(h * 10) / 10 });
    sleepHoursArr.push(h);
  }
  
  sleepDailyData.reverse(); // chronological order
  
  const hasSleepStats = sleepHoursArr.length >= 1;
  const sleepAvgHours = hasSleepStats ? (sleepHoursArr.reduce((a, b) => a + b, 0) / sleepHoursArr.length) : 0;
  const sleepMinHours = hasSleepStats ? Math.min(...sleepHoursArr) : 0;
  const sleepMaxHours = hasSleepStats ? Math.max(...sleepHoursArr) : 0;
  
  // Sleep debt: (ideal - actual) summed over the period
  const sleepDebtHours = hasSleepStats ? sleepHoursArr.reduce((debt, h) => debt + (IDEAL_SLEEP_HOURS - h), 0) : 0;
  
  // This week (last 7 days) vs last week avg sleep
  const thisWeekSleepArr = sleepHoursArr.slice(0, Math.min(7, sleepHoursArr.length));
  const lastWeekSleepArr = sleepHoursArr.slice(7, Math.min(14, sleepHoursArr.length));
  const thisWeekSleepAvg = thisWeekSleepArr.length > 0 ? thisWeekSleepArr.reduce((a, b) => a + b, 0) / thisWeekSleepArr.length : null;
  const lastWeekSleepAvg = lastWeekSleepArr.length > 0 ? lastWeekSleepArr.reduce((a, b) => a + b, 0) / lastWeekSleepArr.length : null;
  
  // Sleep slot focus comparison (for display)
  const sleepSlotCompare = Object.entries(sleepSlotFocus)
    .filter(([, v]) => v.count >= 1)
    .map(([k, v]) => ({ slot: k, avg: v.count > 0 ? (v.sum / v.count).toFixed(1) : '-', count: v.count }));

  // Phase 3: Performance & Balance (6/3以降のデータのみ)
  const BALANCE_START = '2026-06-03';
  const purposeStats = {};
  logs.filter(l => l.started_at && l.started_at >= BALANCE_START).forEach(l => {
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

  // ===== Phase 1: QB正答率分析 =====
  // 正答率は qb_progress の現在値（＝過去すべての累積）から出すので、
  // 期間フィルタとは独立に、初日からの全データが対象になる。
  const acc = buildQBAccuracyStats(getQBProgress());

  // 科目ごとの累積学習時間。散布図の x 軸に使う。
  // qb は科目ID（"2C"）、study_logs は表示名（"2C 循環器"）なので名前側に寄せて突き合わせる。
  const subjMinutesAll = {};
  allLogs.forEach(l => {
    const n = normalizeSubjectName(l.subject_name);
    subjMinutesAll[n] = (subjMinutesAll[n] || 0) + l.duration_minutes;
  });

  const scatterPoints = acc.ranked
    .map(s => ({ x: (subjMinutesAll[s.name] || 0) / 60, y: s.acc, name: s.name, done: s.done }))
    .filter(p => p.x > 0);
  const medHours = median(scatterPoints.map(p => p.x));
  const medAcc   = median(scatterPoints.map(p => p.y));
  // 右下＝時間をかけているのに正答率が低い＝やり方を見直すべき科目
  const reviewMethod = scatterPoints
    .filter(p => p.x >= medHours && p.y < medAcc)
    .sort((a, b) => a.y - b.y);

  // 周回別の伸び（同一科目で2周目以降の記録がある分だけ）
  const roundGains = acc.subjects
    .filter(s => s.byRound.length >= 2)
    .map(s => {
      const first = s.byRound[0], last = s.byRound[s.byRound.length - 1];
      return { name: s.name, from: first, to: last, gain: last.acc - first.acc };
    })
    .sort((a, b) => b.gain - a.gain);

  const hasAccData = acc.ranked.length > 0 || acc.subjects.length > 0;

  // ===== Phase 2: パイプライン / 未回収在庫 / インプット・アウトプット比 =====
  const pipeline = buildPipeline(getQBProgress(), getVideoProgress());
  const backlog  = buildBacklog(pipeline.rows, allLogs, new Date());
  const backlogDated = backlog.filter(b => b.daysSince !== null);
  const oldestBacklog = backlogDated.length > 0 ? backlogDated[0] : null;
  const io = buildIOBalance(logs);
  const breakStats = buildBreakStats(logs);
  const intraStats = buildIntraSessionStats(logs);
  const qbQuality = buildQbQualityStats(logs, breakStats.breakBeforeById);
  const reviewStats = buildReviewIntervalStats(logs, logicalToday);
  const goalHistory = buildGoalHistory(allLogs, logicalToday);
  const unitCost = buildUnitCost(logs);
  const ioBaseline = buildIOBaseline(unitCost, pipeline.rows);

  // --- Build HTML ---
  ct.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">インサイト</h1>
      <p class="page-subtitle">学習データを分析して最適な勉強法を見つけよう</p>
    </div>

    <!-- Filter Bar -->
    <div class="insights-filter-bar animate-slide-up">
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">期間</span>
          <div class="filter-chips" id="filter-preset-chips">
            ${['all','today','week','month','lastmonth','custom'].map(p =>
              `<button class="filter-chip ${insightFilters.preset===p?'active':''}" data-preset="${p}">${presetLabels[p]}</button>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="filter-row" id="custom-date-row" style="display:${insightFilters.preset==='custom'?'flex':'none'}">
        <span class="filter-label">日付</span>
        <input type="date" class="filter-date-input" id="filter-date-from" value="${insightFilters.dateFrom}">
        <span class="filter-sep">〜</span>
        <input type="date" class="filter-date-input" id="filter-date-to" value="${insightFilters.dateTo}">
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">活動</span>
          <div class="filter-chips" id="filter-activity-chips">
            ${[{v:'',l:'全て'}].concat(ACTIVITIES.map(a=>({v:a.v,l:a.l}))).concat([{v:'unclassified',l:'未分類'}]).map(a =>
              `<button class="filter-chip ${insightFilters.activity===a.v?'active':''}" data-activity="${a.v}">${a.l}</button>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">目的</span>
          <div class="filter-chips" id="filter-purpose-chips">
            ${[{v:'',l:'全て'},{v:'cbt',l:'CBT'},{v:'regular_exam',l:'定期試験'},{v:'assignment',l:'課題・実習'},{v:'other',l:'その他'}].map(p =>
              `<button class="filter-chip ${insightFilters.purpose===p.v?'active':''}" data-purpose="${p.v}">${p.l}</button>`
            ).join('')}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">場所</span>
          <select class="filter-select" id="filter-location">
            <option value="">全て</option>
            ${allLocations.map(l => `<option value="${l}" ${insightFilters.location===l?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <span class="filter-label">時間帯</span>
          <div class="filter-chips" id="filter-timeslot-chips">
            ${[{v:'',l:'全て'},{v:'morning',l:'朝'},{v:'afternoon',l:'昼'},{v:'evening',l:'夜'},{v:'night',l:'深夜'}].map(t =>
              `<button class="filter-chip ${insightFilters.timeSlot===t.v?'active':''}" data-slot="${t.v}">${t.l}</button>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">集中度</span>
          <div class="filter-chips" id="filter-focus-chips">
            ${[{v:'',l:'全て'},{v:'3',l:'★3+'},{v:'4',l:'★4+'},{v:'5',l:'★5'}].map(f =>
              `<button class="filter-chip ${insightFilters.focusLevel===f.v?'active':''}" data-focus="${f.v}">${f.l}</button>`
            ).join('')}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">時間</span>
          <div class="filter-chips" id="filter-session-chips">
            ${[{v:'',l:'全て'},{v:'short',l:'〜30分'},{v:'medium',l:'30-60分'},{v:'long',l:'60分〜'}].map(s =>
              `<button class="filter-chip ${insightFilters.sessionLength===s.v?'active':''}" data-len="${s.v}">${s.l}</button>`
            ).join('')}
          </div>
        </div>
      </div>
      <div class="filter-actions">
        <button class="filter-reset-btn" id="insight-expand-all">すべて開く</button>
        <button class="filter-reset-btn" id="insight-collapse-all">すべて閉じる</button>
        <button class="filter-reset-btn" id="filter-reset">リセット</button>
      </div>
    </div>

    ${insightGroupOpenHTML('overview', '概要', '期間全体のサマリー', insightIcons.summary, 'var(--color-accent-teal)')}
    <!-- Summary Cards -->
    <div class="insight-summary-grid animate-slide-up" style="animation-delay:.1s">
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-teal)">${Math.floor(totalMin/60)}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">h${totalMin%60>0?' '+totalMin%60+'m':''}</span></div>
        <div class="insight-summary-label">総学習時間</div>
        <div class="insight-summary-sub">${sessionCount}セッション</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-blue)">${studyDays}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">日</span></div>
        <div class="insight-summary-label">学習日数</div>
        <div class="insight-summary-sub">平均 ${formatMinutes(studyDays>0?Math.round(totalMin/studyDays):0)}/日</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-purple)">${avgFocus !== '-' ? avgFocus : '-'}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">${avgFocus !== '-' ? '/5' : ''}</span></div>
        <div class="insight-summary-label">平均集中度</div>
        <div class="insight-summary-sub">${focusLogs.length}件のデータ</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:var(--color-accent-green)">${formatMinutes(avgSessionMin)}</div>
        <div class="insight-summary-label">平均セッション</div>
        <div class="insight-summary-sub">${sortedSubjects.length}科目</div>
      </div>
      <div class="insight-summary-card">
        <div class="insight-summary-value" style="color:${streakActive ? '#f97316' : 'var(--color-text-secondary)'}">${studyStreak}<span style="font-size:0.8rem;font-weight:500;color:var(--color-text-secondary)">日</span></div>
        <div class="insight-summary-label">連続学習</div>
        <div class="insight-summary-sub">${streakActive ? '🔥 継続中！' : '😴 昨日まで'}</div>
      </div>
    </div>
    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('breaks', '休憩の取り方', 'セッション内の一時停止と、セッション間の空き時間', insightIcons.clock, 'var(--color-accent-orange)', breakStats.hasData ? breakStats.count + '件' : '')}
    <!-- Section I-1: セッション内の休憩 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.105s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-orange)">${IC.timer}</div>
        <div><div class="section-title">セッション内の休憩</div><div class="section-subtitle">タイマーを止めていた時間と、記録に残らなかった空き時間</div></div>
      </div>

      ${!intraStats.hasData ? `
        <div class="data-collecting-msg">
          タイマーの一時停止を挟んだセッションが貯まると、ここに内訳が出ます。<br>
          対象セッション ${intraStats.sessionCount}件 / 一時停止 ${intraStats.pauseCount}件
        </div>
      ` : `
        <div class="rhythm-stat-grid">
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.timer} 1セッションの一時停止</div>
            <div class="rhythm-stat-value">${intraStats.pausePerSession}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">回</span></div>
            <div class="rhythm-stat-change change-neutral">${intraStats.pausedSessions}/${intraStats.sessionCount}セッションで停止している</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.clock} 一時停止の長さ</div>
            <div class="rhythm-stat-value">${intraStats.avgPauseMin !== null ? intraStats.avgPauseMin : '--'}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">分</span></div>
            <div class="rhythm-stat-change change-neutral">${intraStats.medianPauseMin !== null ? `中央値 ${intraStats.medianPauseMin}分 / 最長 ${intraStats.longestPauseMin}分` : 'データなし'}</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.book} セッション内の空き時間</div>
            <div class="rhythm-stat-value">${intraStats.avgOverheadMin !== null ? formatMinutes(intraStats.avgOverheadMin) : '--'}</div>
            <div class="rhythm-stat-change change-neutral">1セッションあたり（計 ${formatMinutes(intraStats.overheadTotalMin)}）</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.list} 分析できたセッション</div>
            <div class="rhythm-stat-value">${intraStats.coverage}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">%</span></div>
            <div class="rhythm-stat-change change-neutral">${intraStats.sessionCount}/${sessionCount}件（開始・終了が揃った記録）</div>
          </div>
        </div>

        <div class="break-verdict break-verdict-muted">
          <div>「セッション内の空き時間」は <strong>終了時刻 − 開始時刻 − 実学習時間</strong> の逆算です。一時停止のほか、ポモドーロ／試験シミュレーションの休憩フェーズや、保存画面を開いたままだった時間もここに入ります。一時停止として記録されたのは合計 ${formatMinutes(intraStats.totalPauseMin)} でした。</div>
        </div>

        <div class="break-subtitle">一時停止の回数 × そのセッションの質</div>
        <div class="break-table">
          <div class="break-row break-row-head break-row-run">
            <div>一時停止</div><div style="text-align:right">セッション</div><div style="text-align:right">平均集中度</div><div style="text-align:right">学習時間</div>
          </div>
          ${intraStats.pauseBins.map(b => `
            <div class="break-row break-row-run">
              <div class="break-row-label">${b.label}</div>
              <div class="break-row-num">${b.count}件<span class="break-row-share">${b.share}%</span></div>
              <div class="break-row-num">${b.avgFocus !== null ? '★' + b.avgFocus.toFixed(1) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
              <div class="break-row-num">${b.avgDur !== null ? formatMinutes(b.avgDur) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
            </div>
          `).join('')}
        </div>
        ${intraStats.overheadExcluded > 0 ? `<div class="break-note">${intraStats.overheadExcluded}件は空き時間が${MAX_OVERHEAD_MIN}分を超えるか計算が合わないため、逆算の集計から除いています（保存画面の開きっぱなし、時間の手入力など）。</div>` : ''}
      `}
    </div>

    <!-- Section I-2: セッション間の休憩 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.11s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-orange)">${insightIcons.clock}</div>
        <div><div class="section-title">セッション間の休憩</div><div class="section-subtitle">前の記録の終了〜次の記録の開始を休憩として推定（${BREAK_MAX_MIN}分を超える空きは中断とみなして除外）</div></div>
      </div>

      ${!breakStats.hasData ? `
        <div class="data-collecting-msg">
          同じ日に2回以上セッションを記録すると、その間隔から休憩の傾向を分析します。<br>
          現在の休憩データ: ${breakStats.count}件（3件以上で表示されます）
        </div>
      ` : `
        <div class="rhythm-stat-grid">
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.timer} 平均休憩時間</div>
            <div class="rhythm-stat-value">${breakStats.avgBreak}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">分</span></div>
            <div class="rhythm-stat-change change-neutral">中央値 ${breakStats.medianBreak}分 / 最長 ${breakStats.longestBreak}分</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.clock} 1日あたりの休憩</div>
            <div class="rhythm-stat-value">${breakStats.perDay}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">回</span></div>
            <div class="rhythm-stat-change change-neutral">2セッション以上の${breakStats.activeDays}日が対象</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.target} 学習密度</div>
            <div class="rhythm-stat-value">${breakStats.density !== null ? breakStats.density : '--'}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">%</span></div>
            <div class="rhythm-stat-change ${breakStats.density >= 80 ? 'change-positive' : breakStats.density >= 65 ? 'change-neutral' : 'change-warning'}">机に向かった時間のうち実学習（セッション内 ${formatMinutes(breakStats.totalIntra)} ＋ セッション間 ${formatMinutes(breakStats.totalBreak)}）</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.book} 休憩前の連続学習</div>
            <div class="rhythm-stat-value">${formatMinutes(breakStats.avgRunBeforeBreak)}</div>
            <div class="rhythm-stat-change change-neutral">この長さ続けたところで休憩している</div>
          </div>
        </div>

        ${breakStats.bestBin ? `
          <div class="break-verdict">
            <span class="break-verdict-mark">${IC.check}</span>
            <div><strong>${breakStats.bestBin.label}</strong>の休憩をはさんだあとが、いちばん集中して戻れています（休憩明け 平均 ★${breakStats.bestBin.avgNextFocus.toFixed(1)} / ${breakStats.bestBin.focusCount}回）${
              breakStats.worstBin && breakStats.worstBin.key !== breakStats.bestBin.key
                ? `。いっぽう <strong>${breakStats.worstBin.label}</strong> のあとは ★${breakStats.worstBin.avgNextFocus.toFixed(1)} まで落ちています。`
                : '。'
            }</div>
          </div>
        ` : `
          <div class="break-verdict break-verdict-muted">
            <div>休憩明けのセッションで集中度（★）を記録すると、どの長さの休憩がいちばん効いているかを判定できます。（各区分3件以上で判定）</div>
          </div>
        `}

        <div class="break-table">
          <div class="break-row break-row-head">
            <div>休憩の長さ</div><div>回数の分布</div><div style="text-align:right">回数</div><div style="text-align:right">休憩明け集中</div><div style="text-align:right">次の学習時間</div>
          </div>
          ${breakStats.bins.map(b => {
            const isBest = breakStats.bestBin && b.key === breakStats.bestBin.key;
            return `<div class="break-row ${isBest ? 'is-best' : ''}">
              <div class="break-row-label">${b.label}</div>
              <div class="break-bar-wrap"><div class="break-bar-fill" style="width:${b.share}%"></div></div>
              <div class="break-row-num">${b.count}回<span class="break-row-share">${b.share}%</span></div>
              <div class="break-row-num">${b.avgNextFocus !== null ? '★' + b.avgNextFocus.toFixed(1) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
              <div class="break-row-num">${b.avgNextDur !== null ? formatMinutes(b.avgNextDur) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
            </div>`;
          }).join('')}
        </div>

        <div class="break-subtitle">続けて勉強した時間 × 休憩明けの集中度</div>
        <div class="break-table">
          <div class="break-row break-row-head break-row-run">
            <div>連続学習</div><div style="text-align:right">回数</div><div style="text-align:right">平均休憩</div><div style="text-align:right">休憩明け集中</div>
          </div>
          ${breakStats.runBins.map(r => `
            <div class="break-row break-row-run">
              <div class="break-row-label">${r.label}</div>
              <div class="break-row-num">${r.count}回</div>
              <div class="break-row-num">${r.avgBreak !== null ? r.avgBreak + '分' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
              <div class="break-row-num">${r.avgNextFocus !== null ? '★' + r.avgNextFocus.toFixed(1) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
            </div>
          `).join('')}
        </div>
        <div class="break-note">セッションを記録し忘れた時間は休憩として数えられます。タイマーの停止／再開が実態に近いほど精度が上がります。</div>
      `}
    </div>
    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('goal', '目標と実績', '曜日ごとに目標が実態に合っているか', insightIcons.target, 'var(--color-accent-green)')}
    <!-- Section J: 目標達成率（曜日別） -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.112s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-green)">${insightIcons.target}</div>
        <div><div class="section-title">曜日別の目標達成率</div><div class="section-subtitle">直近${goalHistory.days}日（今日を除く）／実績はログ、目標は曜日別テンプレート</div></div>
      </div>

      ${!goalHistory.hasData ? `
        <div class="data-collecting-msg">学習記録が貯まると、曜日ごとの目標と実績の差が出ます。</div>
      ` : `
        <div class="rhythm-stat-grid">
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.check} 目標を達成した日</div>
            <div class="rhythm-stat-value">${goalHistory.metDays}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">/${goalHistory.days}日</span></div>
            <div class="rhythm-stat-change change-neutral">学習しなかった日 ${goalHistory.offDays}日</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.chart} 達成率（全日）</div>
            <div class="rhythm-stat-value">${goalHistory.rate !== null ? goalHistory.rate : '--'}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">%</span></div>
            <div class="rhythm-stat-change change-neutral">目標の合計に対する実績の合計</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.target} 達成率（学習した日）</div>
            <div class="rhythm-stat-value">${goalHistory.rateStudied !== null ? goalHistory.rateStudied : '--'}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">%</span></div>
            <div class="rhythm-stat-change ${goalHistory.rateStudied >= 100 ? 'change-positive' : goalHistory.rateStudied >= 80 ? 'change-neutral' : 'change-warning'}">バイト・旅行の日に薄められない値</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.calendar} 学習した日</div>
            <div class="rhythm-stat-value">${goalHistory.days - goalHistory.offDays}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">/${goalHistory.days}日</span></div>
            <div class="rhythm-stat-change change-neutral">残りはオフ日として扱う</div>
          </div>
        </div>

        ${goalHistory.mismatched.length > 0 ? `
          <div class="break-verdict">
            <span class="break-verdict-mark">${IC.warn}</span>
            <div>${goalHistory.mismatched.map(m =>
              `<strong>${m.label}曜</strong>は ${m.days}日中 ${m.offDays}日が学習なしで、達成率 ${m.rate}%。目標 ${formatMinutes(m.avgGoal)} は実態に合っていない可能性があります${m.medianStudied > 0 ? `（学習した日の中央値は ${formatMinutes(m.medianStudied)}）` : ''}。`
            ).join('<br>')}</div>
          </div>
        ` : ''}

        <div class="break-table">
          <div class="break-row break-row-head break-row-wide">
            <div>曜日</div><div style="text-align:right">目標</div><div style="text-align:right">実績平均</div><div style="text-align:right">オフ日</div><div style="text-align:right">達成率</div>
          </div>
          ${goalHistory.dow.map(d => `
            <div class="break-row break-row-wide ${d.rate !== null && d.rate >= 100 ? 'is-best' : ''}">
              <div class="break-row-label">${d.label}曜</div>
              <div class="break-row-num">${d.avgGoal > 0 ? formatMinutes(d.avgGoal) : '<span style="color:var(--color-text-tertiary)">なし</span>'}</div>
              <div class="break-row-num">${formatMinutes(d.avgActual)}</div>
              <div class="break-row-num">${d.offDays}/${d.days}</div>
              <div class="break-row-num">${d.rate !== null ? d.rate + '%' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
            </div>
          `).join('')}
        </div>
        <div class="break-note">実績は学習ログから、目標は「その日の上書き→保存済みスナップショット→現在の曜日別テンプレート」の順に引いています。スナップショットが無い過去日は<strong>いまの曜日別目標</strong>で遡って評価しているため、途中で目標を変えた場合はその前の期間がずれます。スナップショットは端末内（localStorage）にしか無く、端末を変えると引き継がれません。</div>
      `}
    </div>
    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('qb', '演習・QB分析', '正答率、解くスピード、解き直しの間隔、教材の消化バランス', insightIcons.target, 'var(--color-accent-green)')}
    <!-- Section D: QB正答率と弱点科目 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.11s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-green)">${insightIcons.target || insightIcons.focus}</div>
        <div><div class="section-title">QB正答率と弱点科目</div><div class="section-subtitle">全周回の累積から算出（期間フィルタの影響を受けません）</div></div>
      </div>

      ${!hasAccData ? `
        <div class="data-collecting-msg">
          教材進捗トラッカーで各周回の「正答」数を入力すると、ここに弱点科目が表示されます。
          <div style="margin-top:10px"><a href="/qb" data-route="/qb" class="acc-link">教材進捗トラッカーを開く →</a></div>
        </div>
      ` : `
        <div class="acc-summary-grid">
          <div class="acc-summary-item">
            <div class="acc-summary-label">総解答数</div>
            <div class="acc-summary-value">${acc.totalDone.toLocaleString()}<span class="acc-unit">問</span></div>
          </div>
          <div class="acc-summary-item">
            <div class="acc-summary-label">総正答数</div>
            <div class="acc-summary-value">${acc.totalCorrect.toLocaleString()}<span class="acc-unit">問</span></div>
          </div>
          <div class="acc-summary-item">
            <div class="acc-summary-label">全体正答率</div>
            <div class="acc-summary-value" style="color:${accColor(acc.totalAcc || 0)}">${acc.totalAcc !== null ? acc.totalAcc.toFixed(1) : '-'}<span class="acc-unit">%</span></div>
          </div>
          <div class="acc-summary-item">
            <div class="acc-summary-label">分析対象</div>
            <div class="acc-summary-value">${acc.ranked.length}<span class="acc-unit">科目</span></div>
          </div>
        </div>

        ${acc.unfilledRounds > 0 ? `
          <div class="acc-warn-box">
            ${IC.warn} <strong>正答数が未入力の周回が ${acc.unfilledRounds} 件</strong>（計 ${acc.unfilledDone.toLocaleString()}問）あり、集計から除外しています。
            <div class="acc-warn-sub">対象: ${acc.unfilledSubjects.slice(0, 6).join('、')}${acc.unfilledSubjects.length > 6 ? ` 他${acc.unfilledSubjects.length - 6}科目` : ''}</div>
            <div style="margin-top:8px"><a href="/qb" data-route="/qb" class="acc-link">教材進捗トラッカーで入力する →</a></div>
          </div>
        ` : ''}

        ${acc.ranked.length > 0 ? `
          <div class="acc-rank-head">正答率の低い順（${ACC_MIN_SAMPLE}問以上を解いた科目）</div>
          <div class="acc-rank-list">
            ${acc.ranked.map(s => `
              <div class="acc-rank-row">
                <div class="acc-rank-name" title="${s.name}">${s.name}</div>
                <div class="acc-rank-bar"><div style="width:${Math.max(2, s.acc)}%;background:${accColor(s.acc)}"></div></div>
                <div class="acc-rank-pct" style="color:${accColor(s.acc)}">${s.acc.toFixed(0)}%</div>
                <div class="acc-rank-n">${s.correct}/${s.done}</div>
              </div>
            `).join('')}
          </div>
        ` : `<div class="data-collecting-msg">${ACC_MIN_SAMPLE}問以上を解いた科目がまだありません。</div>`}

        ${acc.thin.length > 0 ? `
          <div class="acc-thin-note">データ不足（${ACC_MIN_SAMPLE}問未満のため順位づけから除外）: ${acc.thin.map(s => `${s.name}(${s.done}問)`).join('、')}</div>
        ` : ''}
      `}
    </div>

    <!-- Section E: 投下時間 × 正答率 -->
    ${scatterPoints.length >= 3 ? `
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.115s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${insightIcons.trend}</div>
        <div><div class="section-title">投下時間 × 正答率</div><div class="section-subtitle">時間をかけた分だけ伸びているかを確認する</div></div>
      </div>
      <div class="acc-scatter-wrap"><canvas id="insightAccScatter"></canvas></div>
      <div class="acc-quad-legend">
        <span><i style="background:#10b981"></i>左上: 短時間で得点源</span>
        <span><i style="background:#3b82f6"></i>右上: 時間なりに伸びている</span>
        <span><i style="background:#64748b"></i>左下: これから伸ばす余地</span>
        <span><i style="background:#ef4444"></i>右下: 時間の割に伸びていない</span>
      </div>
      ${reviewMethod.length > 0 ? `
        <div class="acc-review-box">
          <div class="acc-review-head">${IC.warn} 学習方法の見直し候補（時間・正答率とも中央値と比較）</div>
          ${reviewMethod.slice(0, 5).map(p => `
            <div class="acc-review-row">
              <span class="acc-review-name">${p.name}</span>
              <span class="acc-review-stat">${p.x.toFixed(1)}h 投下 / 正答率 <strong style="color:${accColor(p.y)}">${p.y.toFixed(0)}%</strong></span>
            </div>
          `).join('')}
          <div class="acc-review-note">中央値: ${medHours.toFixed(1)}h ・ 正答率 ${medAcc.toFixed(0)}%</div>
        </div>
      ` : `<div class="acc-review-note" style="margin-top:12px">時間の割に正答率が低い科目はありません。</div>`}
    </div>
    ` : ''}

    <!-- Section F: 周回別の伸び -->
    ${acc.rounds.length > 0 ? `
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.118s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${insightIcons.summary}</div>
        <div><div class="section-title">周回別の伸び</div><div class="section-subtitle">解き直すたびにどれだけ上がっているか</div></div>
      </div>
      <div class="round-tile-row">
        ${acc.rounds.map((r, i) => {
          const prev = i > 0 ? acc.rounds[i-1] : null;
          const delta = prev ? r.acc - prev.acc : null;
          return `<div class="round-tile">
            <div class="round-tile-label">${r.round}周目</div>
            <div class="round-tile-value" style="color:${accColor(r.acc)}">${r.acc.toFixed(0)}<span class="acc-unit">%</span></div>
            <div class="round-tile-sub">${r.correct.toLocaleString()}/${r.done.toLocaleString()}問 ・ ${r.subjects}科目</div>
            ${delta !== null ? `<div class="round-tile-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}pt</div>` : '<div class="round-tile-delta neutral">基準</div>'}
          </div>`;
        }).join('')}
      </div>
      ${roundGains.length > 0 ? `
        <div class="acc-rank-head" style="margin-top:16px">科目別の伸び（2周目以降の記録がある科目）</div>
        <div class="gain-list">
          ${roundGains.map(g => `
            <div class="gain-row">
              <span class="gain-name">${g.name}</span>
              <span class="gain-track">
                <span style="color:${accColor(g.from.acc)}">${g.from.acc.toFixed(0)}%</span>
                <span class="gain-arrow">→</span>
                <span style="color:${accColor(g.to.acc)}">${g.to.acc.toFixed(0)}%</span>
              </span>
              <span class="gain-delta ${g.gain >= 0 ? 'up' : 'down'}">${g.gain >= 0 ? '+' : ''}${g.gain.toFixed(1)}pt</span>
            </div>
          `).join('')}
        </div>
      ` : `<div class="acc-thin-note">同じ科目で2周目以降を記録すると、ここに伸びが表示されます。</div>`}
    </div>
    ` : ''}

    <!-- Section G: 学習パイプラインと未回収在庫 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.12s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-teal)">${insightIcons.list}</div>
        <div><div class="section-title">学習パイプライン</div><div class="section-subtitle">講義動画からQBまで、科目がどこまで進んでいるか</div></div>
      </div>

      ${pipeline.total === 0 ? `
        <div class="data-collecting-msg">
          教材進捗トラッカーで動画の本数とQBの問題数を登録すると、ここにパイプラインが表示されます。
          <div style="margin-top:10px"><a href="/qb" data-route="/qb" class="acc-link">教材進捗トラッカーを開く →</a></div>
        </div>
      ` : `
        <div class="funnel-caption">登録済み ${pipeline.total} 科目が、いまどの段階にあるか</div>
        <div class="stage-stack">
          ${pipeline.stages.filter(s => s.count > 0).map(s =>
            `<div class="stage-seg" style="width:${(s.count / pipeline.total) * 100}%;background:${s.color}"
                  title="${s.label}: ${s.count}科目"></div>`
          ).join('')}
        </div>
        <div class="funnel-list">
          ${pipeline.stages.map(s => {
            const pct = pipeline.total > 0 ? (s.count / pipeline.total) * 100 : 0;
            return `<div class="funnel-row ${s.count === 0 ? 'is-empty' : ''}">
              <div class="funnel-label"><i class="stage-dot" style="background:${s.color}"></i>${s.label}</div>
              <div class="funnel-bar"><div style="width:${s.count > 0 ? Math.max(1.5, pct) : 0}%;background:${s.color}"></div></div>
              <div class="funnel-count">${s.count}<span class="funnel-of">科目</span></div>
              <div class="funnel-drop">${pct > 0 ? pct.toFixed(0) + '%' : ''}</div>
            </div>`;
          }).join('')}
        </div>
        ${pipeline.awaitingQB > 0 ? `
          <div class="funnel-highlight">
            動画を進めたのに QB に<strong>まだ一度も</strong>入っていない科目が <strong>${pipeline.awaitingQB}</strong> 科目あります。
          </div>
        ` : ''}

        <div class="backlog-block">
          <div class="backlog-head">
            <span class="backlog-title">未回収の在庫</span>
            <span class="backlog-sub">QB1周目が動画より${BACKLOG_MIN_GAP}pt以上遅れている科目（着手済みでも遅れていれば対象）</span>
          </div>
          ${backlog.length === 0 ? `
            <div class="backlog-ok">${IC.check} 未回収の科目はありません。動画とQBのペースが揃っています。</div>
          ` : `
            <div class="backlog-summary">
              <div class="backlog-stat">
                <div class="backlog-stat-value" style="color:${backlog.length >= 5 ? '#ef4444' : '#f59e0b'}">${backlog.length}</div>
                <div class="backlog-stat-label">消化待ちの科目</div>
              </div>
              <div class="backlog-stat">
                <div class="backlog-stat-value">${oldestBacklog ? oldestBacklog.daysSince : '--'}<span class="acc-unit">${oldestBacklog ? '日前' : ''}</span></div>
                <div class="backlog-stat-label">${oldestBacklog ? '最古: ' + oldestBacklog.name : '最終視聴日は記録待ち'}</div>
              </div>
              <div class="backlog-stat">
                <div class="backlog-stat-value">${Math.round(backlog.reduce((s,b)=>s+b.gap,0)/backlog.length)}<span class="acc-unit">pt</span></div>
                <div class="backlog-stat-label">平均ギャップ</div>
              </div>
            </div>
            <div class="backlog-list">
              ${backlog.map(b => `
                <div class="backlog-row">
                  <span class="backlog-name">${b.name}</span>
                  <span class="backlog-track">
                    <span class="backlog-vid">動画 ${b.videoPct.toFixed(0)}%</span>
                    <span class="gain-arrow">→</span>
                    <span class="backlog-qb">QB ${b.qb1Pct === null ? '未着手' : b.qb1Pct.toFixed(0) + '%'}</span>
                  </span>
                  <span class="backlog-gap" style="color:${b.gap >= 40 ? '#ef4444' : '#f59e0b'}">+${b.gap.toFixed(0)}pt</span>
                  <span class="backlog-days">${b.daysSince !== null ? b.daysSince + '日前' : '—'}</span>
                </div>
              `).join('')}
            </div>
            <div class="backlog-note">
              見た講義は、QBで回収するまでは資産ではなく負債です。古い順に潰していきましょう。
              ${backlog.length > backlogDated.length ? `<br>※ ${backlog.length - backlogDated.length}科目は「講義動画」として記録した学習ログが無いため、経過日数を表示できません。` : ''}
            </div>
          `}
        </div>
      `}
    </div>

    <!-- Section H: インプット / アウトプット比率 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.125s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-yellow)">${insightIcons.summary}</div>
        <div><div class="section-title">インプットとアウトプットの比率</div><div class="section-subtitle">教材の構成から引いた基準線と比べる（${presetLabels[insightFilters.preset]}）</div></div>
      </div>

      ${!io.hasData ? `
        <div class="data-collecting-msg">
          学習を記録するときに「活動の種類」を選ぶと、講義動画と問題演習の時間配分がここに出ます。
          ${io.unclassified > 0 ? `<div class="acc-thin-note" style="margin-top:8px">この期間には活動が未分類のログが ${formatMinutes(io.unclassified)} 分あります（比率の計算から除外）。</div>` : ''}
        </div>
      ` : `
        <div class="io-ratio-line">
          <span class="io-ratio-big">${io.ratio === null ? '—' : '1 : ' + io.ratio.toFixed(1)}</span>
          <span class="io-ratio-cap">講義動画 : 問題演習</span>
        </div>
        <div class="io-bar">
          <div class="io-seg io-video" style="width:${io.core > 0 ? (io.video / io.core) * 100 : 0}%"></div>
          <div class="io-seg io-qb" style="width:${io.core > 0 ? (io.qb / io.core) * 100 : 0}%"></div>
        </div>
        <div class="io-legend">
          <span><i class="io-video"></i>講義動画 ${formatMinutes(io.video)}</span>
          <span><i class="io-qb"></i>問題演習 ${formatMinutes(io.qb)}</span>
          ${io.other > 0 ? `<span><i class="io-other"></i>暗記・復習など ${formatMinutes(io.other)}（比率対象外）</span>` : ''}
        </div>
        ${(() => {
          // 動画1本と1問では所要時間が違うので、時間比を 50:50 と比べても意味がない。
          // 教材を1周終えたら必然的にそうなる比率を基準線として並べ、そこからのズレだけを見る。
          if (!ioBaseline.hasData) {
            return `<div class="break-note">動画の本数と問題数の記録が貯まると、「この教材を1周すると時間配分は必然的に◯:◯になる」という基準線を引いて比べられます（現在 動画 ${unitCost.videoSamples}本 / ${unitCost.questionSamples}問ぶん）。</div>`;
          }
          const diff = io.videoShare - ioBaseline.videoShare;
          const verdict = diff > 10 ? { cls: 'change-warning', txt: '基準より講義動画に寄っています' }
                        : diff < -10 ? { cls: 'change-positive', txt: '基準より問題演習に寄っています' }
                        : { cls: 'change-positive', txt: '教材の構成どおりの配分です' };
          return `
            <div class="io-baseline-grid">
              <div class="io-baseline-item">
                <div class="io-baseline-label">実績</div>
                <div class="io-baseline-value">動画 ${io.videoShare.toFixed(0)}% : QB ${(100 - io.videoShare).toFixed(0)}%</div>
              </div>
              <div class="io-baseline-item">
                <div class="io-baseline-label">基準線（教材を1周した場合）</div>
                <div class="io-baseline-value">動画 ${ioBaseline.videoShare.toFixed(0)}% : QB ${(100 - ioBaseline.videoShare).toFixed(0)}%</div>
              </div>
              <div class="io-baseline-item">
                <div class="io-baseline-label">基準からのズレ</div>
                <div class="io-baseline-value ${verdict.cls}">${diff >= 0 ? '+' : ''}${diff.toFixed(0)}pt ${verdict.txt}</div>
              </div>
            </div>
            <div class="break-note">基準線は 実測の単価（動画1本 ${unitCost.minPerVideo.toFixed(0)}分 / 1問 ${unitCost.minPerQuestion.toFixed(1)}分）× 教材の総量（動画 ${ioBaseline.videoTotal}本 / ${ioBaseline.qbTotal}問）から算出。QBは1周目のみを前提にしているので、複数周やる前提ならQB側の基準はもっと高くなります。残りを終えるには 動画 ${formatMinutes(Math.round(ioBaseline.remainVideoMin))} / QB ${formatMinutes(Math.round(ioBaseline.remainQbMin))} が必要です。</div>
          `;
        })()}
        ${ioBaseline.progress.gap !== null ? `
          <div class="break-verdict ${ioBaseline.progress.gap > 20 ? '' : 'break-verdict-muted'}">
            ${ioBaseline.progress.gap > 20 ? `<span class="break-verdict-mark">${IC.warn}</span>` : ''}
            <div>進捗で見ると 動画 <strong>${ioBaseline.progress.videoPct.toFixed(0)}%</strong> / QB1周目 <strong>${ioBaseline.progress.qbPct.toFixed(0)}%</strong>（差 ${ioBaseline.progress.gap.toFixed(0)}pt）。${
              ioBaseline.progress.gap > 20
                ? '見た講義に対してQBでの回収が追いついていません。'
                : '消化の進み方は揃っています。'
            }時間ではなく消化率で比べているので、単位あたりの所要時間の違いに影響されません。</div>
          </div>
        ` : ''}
        ${io.unclassified > 0 ? `<div class="acc-thin-note">活動が未分類のログ ${formatMinutes(io.unclassified)} は比率から除外しています。</div>` : ''}
      `}
    </div>

    <!-- Section K: 演習の質（条件別） -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.128s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-teal)">${insightIcons.focus}</div>
        <div><div class="section-title">条件別の正答率</div><div class="section-subtitle">セッションごとの解答記録から、いつ・どんな状態で解いた問題がよく当たっているか</div></div>
      </div>

      ${!qbQuality.hasData ? `
        <div class="data-collecting-msg">
          問題演習のセッションで「解いた数」と「正答数」を記録すると、時間帯・集中度・休憩明けごとの正答率が出ます。<br>
          現在 ${qbQuality.sessionCount}セッション / ${qbQuality.solved}問（${QB_MIN_SESSIONS}セッション・${QB_MIN_SOLVED}問以上で表示）
        </div>
      ` : `
        <div class="rhythm-stat-grid">
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.book} 通算正答率</div>
            <div class="rhythm-stat-value">${qbQuality.accuracy.toFixed(0)}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">%</span></div>
            <div class="rhythm-stat-change change-neutral">${qbQuality.correct} / ${qbQuality.solved}問</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.timer} 1問あたりの時間</div>
            <div class="rhythm-stat-value">${qbQuality.minPerQ !== null ? qbQuality.minPerQ.toFixed(1) : '--'}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">分</span></div>
            <div class="rhythm-stat-change change-neutral">${qbQuality.medianMinPerQ !== null ? `中央値 ${qbQuality.medianMinPerQ.toFixed(1)}分` : ''}（解説を読む時間を含む）</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.target} ★と成績の対応</div>
            <div class="rhythm-stat-value">${qbQuality.calibration ? (qbQuality.calibration.diff >= 0 ? '+' : '') + qbQuality.calibration.diff.toFixed(0) + 'pt' : '--'}</div>
            <div class="rhythm-stat-change ${!qbQuality.calibration ? 'change-neutral' : qbQuality.calibration.diff >= 5 ? 'change-positive' : 'change-warning'}">${qbQuality.calibration ? '★4以上 と ★2以下 の正答率差' : '★の記録が貯まると判定できます'}</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.list} 対象セッション</div>
            <div class="rhythm-stat-value">${qbQuality.sessionCount}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">件</span></div>
            <div class="rhythm-stat-change change-neutral">記録全体の${qbQuality.coverage}%</div>
          </div>
        </div>

        ${qbQuality.bestSlot && qbQuality.worstSlot && qbQuality.bestSlot.label !== qbQuality.worstSlot.label ? `
          <div class="break-verdict">
            <span class="break-verdict-mark">${IC.check}</span>
            <div><strong>${qbQuality.bestSlot.label}</strong>に解いた問題の正答率が ${qbQuality.bestSlot.accuracy.toFixed(0)}% でいちばん高く、<strong>${qbQuality.worstSlot.label}</strong>は ${qbQuality.worstSlot.accuracy.toFixed(0)}% でした（差 ${(qbQuality.bestSlot.accuracy - qbQuality.worstSlot.accuracy).toFixed(0)}pt）。</div>
          </div>
        ` : ''}

        ${qbQuality.calibration && qbQuality.calibration.diff < 5 ? `
          <div class="break-verdict break-verdict-muted">
            <div>★4以上をつけた回の正答率 ${qbQuality.calibration.hi.toFixed(0)}% に対し、★2以下の回は ${qbQuality.calibration.lo.toFixed(0)}%。<strong>体感の集中度と実際の成績がほとんど対応していません。</strong>★を基準に調子を判断するより、正答率そのものを見たほうが確かです。</div>
          </div>
        ` : ''}

        <div class="break-subtitle">時間帯別</div>
        ${qbAccTable(qbQuality.bySlot)}

        <div class="break-subtitle">集中度別</div>
        ${qbAccTable(qbQuality.byFocus)}

        <div class="break-subtitle">休憩をはさんだか</div>
        ${qbAccTable(qbQuality.byBreak)}

        <div class="break-note">正答率はセッションごとの率を平均せず、解答数で重み付けした通算（総正答 ÷ 総解答）です。灰色の行は ${QB_MIN_SESSIONS}セッション・${QB_MIN_SOLVED}問に届いておらず、参考値どまりです。</div>
      `}
    </div>

    <!-- Section L: 解くスピードと正答率 -->
    ${qbQuality.hasData ? `
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.13s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${IC.timer}</div>
        <div><div class="section-title">解くスピードと正答率</div><div class="section-subtitle">速く解いた回で雑になっていないか</div></div>
      </div>
      <div class="break-table">
        <div class="break-row break-row-head break-row-run">
          <div>1問あたり</div><div style="text-align:right">セッション</div><div style="text-align:right">解答数</div><div style="text-align:right">正答率</div>
        </div>
        ${qbQuality.bySpeed.map(b => `
          <div class="break-row break-row-run ${b.reliable ? '' : 'is-thin'}">
            <div class="break-row-label">${b.label}</div>
            <div class="break-row-num">${b.sessions}件</div>
            <div class="break-row-num">${b.solved}問</div>
            <div class="break-row-num">${b.accuracy !== null ? b.accuracy.toFixed(0) + '%' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
          </div>
        `).join('')}
      </div>
      ${(() => {
        const rel = qbQuality.bySpeed.filter(b => b.reliable && b.accuracy !== null);
        if (rel.length < 2) return '<div class="break-note">区分ごとの母数が揃うと、速さと正確さのトレードオフを判定できます。</div>';
        const fastest = rel[0], slowest = rel[rel.length - 1];
        const d = slowest.accuracy - fastest.accuracy;
        return d >= 10
          ? `<div class="break-verdict"><span class="break-verdict-mark">${IC.warn}</span><div><strong>${fastest.label}</strong>で解いた回の正答率は ${fastest.accuracy.toFixed(0)}%、<strong>${slowest.label}</strong>では ${slowest.accuracy.toFixed(0)}%。速く解いた回ほど正答率が ${d.toFixed(0)}pt 低く、雑になっている可能性があります。</div></div>`
          : `<div class="break-verdict break-verdict-muted"><div>${fastest.label} で ${fastest.accuracy.toFixed(0)}%、${slowest.label} で ${slowest.accuracy.toFixed(0)}%。速さによる正答率の差は ${Math.abs(d).toFixed(0)}pt で、大きな崩れはありません。</div></div>`;
      })()}
    </div>
    ` : ''}

    <!-- Section M: 解き直しの間隔 -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.132s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${insightIcons.calendar}</div>
        <div><div class="section-title">解き直しの間隔</div><div class="section-subtitle">同じ科目に前回触れてから何日空けたか（活動が「復習」でなくても数えます）</div></div>
      </div>

      ${!reviewStats.hasData ? `
        <div class="data-collecting-msg">同じ科目を2回以上やった記録が貯まると、間隔ごとの正答率が出ます。</div>
      ` : `
        <div class="rhythm-stat-grid">
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${insightIcons.calendar} 解き直しの間隔</div>
            <div class="rhythm-stat-value">${reviewStats.medianGap}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">日</span></div>
            <div class="rhythm-stat-change change-neutral">中央値（平均 ${reviewStats.avgGap}日）</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.list} 解き直した回数</div>
            <div class="rhythm-stat-value">${reviewStats.revisitCount}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">回</span></div>
            <div class="rhythm-stat-change change-neutral">${reviewStats.subjectCount}科目が対象</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.target} いちばん当たった間隔</div>
            <div class="rhythm-stat-value">${reviewStats.bestBin ? reviewStats.bestBin.label : '--'}</div>
            <div class="rhythm-stat-change ${reviewStats.bestBin ? 'change-positive' : 'change-neutral'}">${reviewStats.bestBin ? `正答率 ${reviewStats.bestBin.accuracy.toFixed(0)}%` : '解答数が貯まると判定できます'}</div>
          </div>
          <div class="rhythm-stat-item">
            <div class="rhythm-stat-label">${IC.warn} ${REVIEW_STALE_DAYS}日以上あいた科目</div>
            <div class="rhythm-stat-value">${reviewStats.stale.length}<span style="font-size:0.7rem;font-weight:600;color:var(--color-text-secondary)">科目</span></div>
            <div class="rhythm-stat-change ${reviewStats.stale.length > 0 ? 'change-warning' : 'change-positive'}">${reviewStats.stale.length > 0 ? `最長 ${reviewStats.stale[0].daysSince}日` : '放置なし'}</div>
          </div>
        </div>

        ${reviewStats.bestBin && reviewStats.worstBin && reviewStats.bestBin.label !== reviewStats.worstBin.label ? `
          <div class="break-verdict">
            <span class="break-verdict-mark">${IC.check}</span>
            <div><strong>${reviewStats.bestBin.label}</strong>空けて解き直したときの正答率が ${reviewStats.bestBin.accuracy.toFixed(0)}% でいちばん高く、<strong>${reviewStats.worstBin.label}</strong>では ${reviewStats.worstBin.accuracy.toFixed(0)}% まで落ちています。</div>
          </div>
        ` : ''}

        <div class="break-table">
          <div class="break-row break-row-head break-row-run">
            <div>前回からの間隔</div><div style="text-align:right">回数</div><div style="text-align:right">正答率</div><div style="text-align:right">平均集中度</div>
          </div>
          ${reviewStats.bins.map(b => `
            <div class="break-row break-row-run ${reviewStats.bestBin && b.label === reviewStats.bestBin.label ? 'is-best' : b.reliable ? '' : 'is-thin'}">
              <div class="break-row-label">${b.label}</div>
              <div class="break-row-num">${b.count}回</div>
              <div class="break-row-num">${b.accuracy !== null ? b.accuracy.toFixed(0) + '%' : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
              <div class="break-row-num">${b.avgFocus !== null ? '★' + b.avgFocus.toFixed(1) : '<span style="color:var(--color-text-tertiary)">-</span>'}</div>
            </div>
          `).join('')}
        </div>

        ${reviewStats.stale.length > 0 ? `
          <div class="break-subtitle">しばらく触れていない科目</div>
          <div class="break-table">
            ${reviewStats.stale.slice(0, 8).map(x => `
              <div class="break-row break-row-run">
                <div class="break-row-label">${x.subject}</div>
                <div class="break-row-num">${x.visitCount}回</div>
                <div class="break-row-num"></div>
                <div class="break-row-num" style="color:${x.daysSince >= 30 ? '#ef4444' : '#f59e0b'}">${x.daysSince}日前</div>
              </div>
            `).join('')}
          </div>
          ${reviewStats.stale.length > 8 ? `<div class="break-note">他 ${reviewStats.stale.length - 8}科目</div>` : ''}
        ` : ''}

        <div class="break-note">粒度は科目単位（「2C 循環器を3日前にやった」まで）で、問題単位ではありません。厳密な忘却曲線ではなく、解き直しの間隔の傾向として読んでください。</div>
      `}
    </div>

    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('life', '生活リズムと睡眠', '起床・就寝、学習タイプ、睡眠と成績の関係', insightIcons.calendar, 'var(--color-accent-yellow)')}
    <!-- Section A: Recent Rhythm & Trends -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.12s">
      <div class="section-header" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div class="section-icon-wrap" style="color:var(--color-accent-yellow)">${insightIcons.clock}</div>
          <div><div class="section-title">生活リズムと最近の傾向</div><div class="section-subtitle">先週との比較で変化をチェック</div></div>
        </div>
        <span class="rhythm-status-badge ${rhythmStatus}">${rhythmLabel}</span>
      </div>
      <div class="rhythm-stat-grid">
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${IC.timer} 平均勉強開始</div>
          <div class="rhythm-stat-value">${thisWeekAvgStart !== null ? minutesFromBase5AMToTimeStr(thisWeekAvgStart) : '--:--'}</div>
          ${thisWeekAvgStart !== null && lastWeekAvgStart !== null ? `<div class="rhythm-stat-change ${startTimeDiff > 30 ? 'change-negative' : startTimeDiff < -30 ? 'change-positive' : 'change-neutral'}">${startTimeDiff > 0 ? '+' : ''}${startTimeDiff}分${startTimeDiff > 30 ? ' (後退)' : startTimeDiff < -30 ? ' (早起き化)' : ''}</div>` : '<div class="rhythm-stat-change change-neutral">先週データなし</div>'}
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${IC.clock} 1日平均学習</div>
          <div class="rhythm-stat-value">${formatMinutes(thisWeekDailyAvg)}</div>
          <div class="rhythm-stat-change ${dailyAvgChange >= 0 ? 'change-positive' : 'change-negative'}">${dailyAvgChange >= 0 ? '+' : ''}${dailyAvgChange}%</div>
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${IC.target} 平均集中度</div>
          <div class="rhythm-stat-value">${thisWeekAvgFocus !== null ? '★' + thisWeekAvgFocus.toFixed(1) : '--'}</div>
          ${focusChangeVal !== null ? `<div class="rhythm-stat-change ${focusChangeVal >= 0 ? 'change-positive' : 'change-negative'}">${focusChangeVal >= 0 ? '+' : ''}${focusChangeVal.toFixed(1)}</div>` : '<div class="rhythm-stat-change change-neutral">--</div>'}
        </div>
        <div class="rhythm-stat-item">
          <div class="rhythm-stat-label">${IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')} 深夜学習割合</div>
          <div class="rhythm-stat-value">${thisWeekLateNight}%</div>
          <div class="rhythm-stat-change ${lateNightDiff >= 5 ? 'change-warning' : lateNightDiff <= -5 ? 'change-positive' : 'change-neutral'}">${lateNightDiff >= 0 ? '+' : ''}${lateNightDiff}%</div>
        </div>
      </div>
    </div>

    <!-- Section B: Personal Analysis -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.14s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${insightIcons.focus}</div>
        <div><div class="section-title">学習タイプ自己分析</div><div class="section-subtitle">直近30日間のデータから診断</div></div>
      </div>
      ${chronoTotal30 > 1 ? `
      <div class="personal-type-grid">
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:${chronoColor}22;color:${chronoColor}">${chronoIconSvg}</div>
          <div class="personal-type-name">${chronoName}</div>
          <div class="personal-type-detail">朝${morningPct}% / 夜${nightPct}%</div>
        </div>
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:${paceColor}22;color:${paceColor}">${paceIconSvg}</div>
          <div class="personal-type-name">${paceName}</div>
          <div class="personal-type-detail">CV: ${paceCV.toFixed(2)}</div>
        </div>
        <div class="personal-type-item">
          <div class="personal-type-icon" style="background:rgba(78,205,196,0.13);color:var(--color-accent-teal)">${IC._s('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>')}</div>
          <div class="personal-type-name">${bestEnv ? bestEnv.name : '分析中...'}</div>
          <div class="personal-type-detail">${bestEnv ? '★' + bestEnv.avg + '（' + bestEnv.count + '件）' : 'データ蓄積中'}</div>
        </div>
      </div>
      ` : '<div class="data-collecting-msg">データを蓄積中です...</div>'}
    </div>

    <!-- Section C: Sleep Correlation -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.16s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}</div>
        <div><div class="section-title">睡眠と学習の相関</div><div class="section-subtitle">起床・就寝データから分析</div></div>
      </div>
      ${hasSleepData ? `
      <div class="sleep-insight-grid">
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.timer} 起床リズム安定度</div>
          <div class="sleep-insight-value">
            ${wakeStabilityStatus ? `<span class="rhythm-status-badge ${wakeStabilityStatus}">${wakeStabilityStatus === 'good' ? '安定' : wakeStabilityStatus === 'warning' ? 'やや不安定' : '不安定'}</span>` : '--'}
          </div>
          ${wakeStabilitySD !== null ? `<div class="sleep-insight-note">標準偏差: ${wakeStabilitySD}分</div>` : ''}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.clock} 初動タイムラグ</div>
          <div class="sleep-insight-value">${thisWeekLag !== null ? thisWeekLag + '分' : '--'}</div>
          ${thisWeekLag !== null && lastWeekLag !== null ? `<div class="sleep-insight-note">先週比: <span class="${(thisWeekLag - lastWeekLag) <= 0 ? 'change-positive' : 'change-negative'}">${thisWeekLag - lastWeekLag >= 0 ? '+' : ''}${thisWeekLag - lastWeekLag}分</span></div>` : ''}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.star} ベスト睡眠時間</div>
          <div class="sleep-insight-value">${bestSleepSlot ? bestSleepSlot.slot : '--'}</div>
          ${bestSleepSlot ? `<div class="sleep-insight-note">翌日の平均集中度: ★${bestSleepSlot.avg.toFixed(1)}</div>` : '<div class="sleep-insight-note">データ蓄積中</div>'}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.shield} クールダウン</div>
          <div class="sleep-insight-value">${cooldownWarning ? '<span class="change-warning">要注意</span>' : '<span class="change-positive">良好</span>'}</div>
          <div class="sleep-insight-note">${cooldownWarning ? '直近7日中' + shortCooldownDays + '日が就寝直前まで勉強' : '適切なクールダウン時間を確保'}</div>
        </div>
      </div>
      ${cooldownWarning ? '<div class="sleep-alert-box alert-warning">' + IC.warn + ' 就寝直前まで勉強する傾向があり、睡眠の質を下げている可能性があります。勉強終了後は30分以上のクールダウンを心がけましょう。</div>' : ''}
      ${lateNightAlert ? '<div class="sleep-alert-box alert-danger">' + IC.warn + ' 3日連続で就寝が大幅に後退しています。夜型化の兆候です。</div>' : ''}
      ` : '<div class="data-collecting-msg">ダッシュボードの起床/就寝ボタンでデータを蓄積しましょう（3日分以上必要）</div>'}
    </div>

    <!-- Section C2: Sleep Statistics -->
    <div class="card insight-analysis-card animate-slide-up" style="animation-delay:.17s">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${IC._s('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}</div>
        <div><div class="section-title">睡眠統計</div><div class="section-subtitle">睡眠パターンと負債の分析</div></div>
      </div>
      ${hasSleepStats ? `
      <div class="sleep-insight-grid">
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.clock} 平均睡眠時間</div>
          <div class="sleep-insight-value" style="font-size:1.3rem;">${sleepAvgHours.toFixed(1)}<span style="font-size:0.7rem;color:var(--color-text-secondary)">h</span></div>
          ${thisWeekSleepAvg !== null && lastWeekSleepAvg !== null ? `<div class="sleep-insight-note"><span class="${(thisWeekSleepAvg - lastWeekSleepAvg) >= 0 ? 'change-positive' : 'change-negative'}">${(thisWeekSleepAvg - lastWeekSleepAvg) >= 0 ? '+' : ''}${(thisWeekSleepAvg - lastWeekSleepAvg).toFixed(1)}h vs 先週</span></div>` : `<div class="sleep-insight-note">${sleepHoursArr.length}日分のデータ</div>`}
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.target} 睡眠負債</div>
          <div class="sleep-insight-value" style="font-size:1.3rem;color:${sleepDebtHours > 7 ? '#ef4444' : sleepDebtHours > 3 ? '#f59e0b' : '#4ade80'}">${sleepDebtHours > 0 ? '+' : ''}${sleepDebtHours.toFixed(1)}<span style="font-size:0.7rem;color:var(--color-text-secondary)">h</span></div>
          <div class="sleep-insight-note">${sleepDebtHours > 7 ? '⚠ 深刻な睡眠不足です' : sleepDebtHours > 3 ? '注意：睡眠が不足気味です' : sleepDebtHours > 0 ? 'ほぼ良好です' : '十分に眠れています'}（基準: ${IDEAL_SLEEP_HOURS}h/日）</div>
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">${IC.star} 最長 / 最短</div>
          <div class="sleep-insight-value" style="font-size:1.1rem;">${sleepMaxHours.toFixed(1)}h <span style="font-size:0.7rem;color:var(--color-text-tertiary)">/</span> ${sleepMinHours.toFixed(1)}h</div>
          <div class="sleep-insight-note">振れ幅 ${(sleepMaxHours - sleepMinHours).toFixed(1)}h</div>
        </div>
        <div class="sleep-insight-item">
          <div class="sleep-insight-label">🌙 徹夜</div>
          <div class="sleep-insight-value" style="font-size:1.3rem;color:${allNighterCount > 0 ? '#f59e0b' : '#4ade80'}">${allNighterCount}<span style="font-size:0.7rem;color:var(--color-text-secondary)">回</span></div>
          <div class="sleep-insight-note">${allNighterCount > 2 ? '⚠ 徹夜は集中度を大幅に低下させます' : allNighterCount > 0 ? '控えめに' : '良い睡眠習慣です'}</div>
        </div>
      </div>

      <!-- Sleep Duration Chart -->
      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:0.85rem;margin-bottom:8px;">睡眠時間の推移</div>
        <div class="chart-container" style="height:200px;"><canvas id="insightSleepChart"></canvas></div>
      </div>

      <!-- Sleep-Focus Correlation -->
      ${sleepSlotCompare.length > 0 ? `
      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:0.85rem;margin-bottom:8px;">睡眠時間別の平均集中度</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${sleepSlotCompare.map(s => `
            <div style="flex:1;min-width:70px;background:var(--color-bg-elevated);border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:0.75rem;color:var(--color-text-tertiary);margin-bottom:4px;">${s.slot}</div>
              <div style="font-size:1.1rem;font-weight:700;color:${s.slot === '<6h' ? '#ef4444' : s.slot === '8h+' ? '#4ade80' : 'var(--color-text-primary)'}">${s.avg}★</div>
              <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${s.count}件</div>
            </div>
          `).join('')}
        </div>
        ${(() => {
          const best = sleepSlotCompare.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))[0];
          const worst = sleepSlotCompare.sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg))[0];
          if (best && worst && best.slot !== worst.slot && parseFloat(best.avg) - parseFloat(worst.avg) >= 0.3) {
            return `<div style="background:rgba(78,205,196,0.1);border:1px solid rgba(78,205,196,0.3);color:var(--color-accent-teal);padding:10px;border-radius:8px;margin-top:10px;font-size:0.8rem;">
              💡 ${best.slot}の睡眠時は平均★${best.avg}、${worst.slot}では★${worst.avg}。差は${(parseFloat(best.avg) - parseFloat(worst.avg)).toFixed(1)}ポイントです。
            </div>`;
          }
          return '';
        })()}
      </div>
      ` : ''}
      ` : '<div class="data-collecting-msg">睡眠データが蓄積されると統計が表示されます</div>'}
    </div>

    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('trend', '学習時間の傾向', '推移・科目・時間帯・場所・曜日の内訳', insightIcons.trend, 'var(--color-accent-blue)')}
    <!-- Trend Chart + Subject Donut -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.15s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-teal)">${insightIcons.trend}</div>
          <div><div class="section-title">学習推移</div><div class="section-subtitle">日別の学習時間</div></div>
        </div>
        <div class="chart-container"><canvas id="insightTrendChart"></canvas></div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-blue)">${insightIcons.subject}</div>
          <div><div class="section-title">科目分布</div><div class="section-subtitle">学習時間の内訳</div></div>
        </div>
        ${sortedSubjects.length > 0 ? `
          <div style="display:flex;align-items:center;gap:var(--space-lg)">
            <svg viewBox="0 0 160 160" style="width:140px;height:140px;flex-shrink:0">
              <circle cx="80" cy="80" r="${donutR}" fill="none" stroke="var(--color-bg-elevated)" stroke-width="20"/>
              ${donutSVG}
              <text x="80" y="76" text-anchor="middle" fill="var(--color-text-primary)" font-size="16" font-weight="800">${Math.floor(donutTotal/60)}h</text>
              <text x="80" y="94" text-anchor="middle" fill="var(--color-text-tertiary)" font-size="10">合計</text>
            </svg>
            <div style="flex:1;font-size:0.75rem;display:flex;flex-direction:column;gap:4px">
              ${sortedSubjects.slice(0,7).map(([name,min],i) => `
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${DONUT_COLORS[i%DONUT_COLORS.length]};flex-shrink:0"></span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
                  <span style="font-weight:700;color:var(--color-text-secondary)">${formatMinutes(min)}</span>
                </div>
              `).join('')}
              ${sortedSubjects.length > 7 ? `<div style="color:var(--color-text-tertiary)">...他${sortedSubjects.length-7}科目</div>` : ''}
            </div>
          </div>
        ` : '<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-xl)">データなし</p>'}
      </div>
    </div>

    <!-- TOD Heatmap + Location -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.2s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-yellow)">${insightIcons.clock}</div>
          <div><div class="section-title">時間帯 × 曜日</div><div class="section-subtitle">いつ勉強しているか</div></div>
        </div>
        <div class="tod-heatmap-grid">${heatmapHTML}</div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10px;color:var(--color-text-tertiary);margin-top:8px">
          <span>少</span>
          <div style="width:12px;height:12px;border-radius:2px;background:var(--color-bg-elevated)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,0.3)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,0.6)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(78,205,196,1)"></div>
          <span>多</span>
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-green)">${insightIcons.location}</div>
          <div><div class="section-title">場所別の分析</div><div class="section-subtitle">学習時間と集中度</div></div>
        </div>
        ${sortedLocations.length > 0 ? sortedLocations.map(([loc, stat]) => {
          const locAvgFocus = stat.focusCount > 0 ? (stat.focusSum / stat.focusCount).toFixed(1) : '-';
          return `<div class="location-stat-row">
            <div class="location-name">${loc}</div>
            <div class="location-bar-wrap"><div class="location-bar-fill" style="width:${Math.round(stat.min/maxLocMin*100)}%;background:var(--gradient-primary)" data-width="${Math.round(stat.min/maxLocMin*100)}"></div></div>
            <div class="location-stat-meta">${formatMinutes(stat.min)} / ${locAvgFocus}★</div>
          </div>`;
        }).join('') : '<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-xl)">データなし</p>'}
      </div>
    </div>

    <!-- Subject Focus Chart -->
    <div class="card animate-slide-up" style="animation-delay:.22s; overflow:hidden">
      <div class="section-header">
        <div class="section-icon-wrap" style="color:var(--color-accent-purple)">${insightIcons.focus}</div>
        <div><div class="section-title">科目別 平均集中度</div><div class="section-subtitle">集中しやすい科目・難しい科目を把握しよう</div></div>
      </div>
      ${sortedSubjectFocus.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:var(--space-sm)">
          ${sortedSubjectFocus.map(([name, avg, cnt]) => {
            const pct = Math.round(avg / 5 * 100);
            const color = avg >= 4.5 ? '#4ecdc4' : avg >= 3.5 ? '#45b7d1' : avg >= 2.5 ? '#f7dc6f' : '#ff6b6b';
            return `<div style="display:flex;align-items:center;gap:10px">
              <div style="width:110px;font-size:0.75rem;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">${name}</div>
              <div style="flex:1;background:var(--color-bg-elevated);border-radius:4px;height:10px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.6s ease"></div>
              </div>
              <div style="width:40px;text-align:right;font-size:0.78rem;font-weight:700;color:${color};flex-shrink:0">★${avg.toFixed(1)}</div>
              <div style="width:28px;text-align:right;font-size:0.68rem;color:var(--color-text-tertiary);flex-shrink:0">${cnt}件</div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:16px;margin-top:var(--space-md);font-size:0.72rem;color:var(--color-text-tertiary)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#4ecdc4;display:inline-block"></span>★4.5+</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#45b7d1;display:inline-block"></span>★3.5+</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#f7dc6f;display:inline-block"></span>★2.5+</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#ff6b6b;display:inline-block"></span>★2.5未満</span>
        </div>
      ` : '<p style="text-align:center;color:var(--color-text-tertiary);padding:var(--space-xl)">集中度データなし（セッション記録時に★を評価してください）</p>'}
    </div>

    <!-- DOW Chart + Session List -->
    <div class="insights-grid animate-slide-up" style="animation-delay:.25s">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-orange)">${insightIcons.calendar}</div>
          <div><div class="section-title">曜日別学習時間</div><div class="section-subtitle">曜日ごとの傾向</div></div>
        </div>
        <div class="dow-chart">
          ${[1,2,3,4,5,6,0].map(d => `
            <div class="dow-bar-wrap">
              <div class="dow-bar-value">${dowMinutes[d] > 0 ? formatMinutes(dowMinutes[d]) : ''}</div>
              <div class="dow-bar" style="height:${Math.max(2, Math.round(dowMinutes[d]/maxDowMin*100))}%"></div>
              <div class="dow-bar-label">${dowNames[d]}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
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
    </div>
    ${insightGroupCloseHTML}

    ${insightGroupOpenHTML('sessions', 'セッション記録', '条件に一致した学習ログの一覧', insightIcons.list, 'var(--color-accent-pink)', sessionCount + '件')}
    <div class="insights-grid full">
      <div class="card" style="overflow:hidden">
        <div class="section-header">
          <div class="section-icon-wrap" style="color:var(--color-accent-pink)">${insightIcons.list}</div>
          <div><div class="section-title">セッション一覧</div><div class="section-subtitle">${sessionCount}件</div></div>
        </div>
        <div class="session-list">
          <div class="session-row session-row-header">
            <div>日時</div><div>科目</div><div style="text-align:right">時間</div><div style="text-align:center">集中</div><div style="text-align:right">場所</div>
          </div>
          ${logs.slice(0, 50).map(l => {
            const d = new Date(l.started_at);
            const dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            return `<div class="session-row">
              <div class="session-date">${dateStr}</div>
              <div class="session-subject">${normalizeSubjectName(l.subject_name)}${activityChip(l.activity)}</div>
              <div class="session-duration">${formatMinutes(l.duration_minutes)}</div>
              <div class="session-focus">${l.focus_level ? '★'.repeat(Number(l.focus_level)) : '-'}</div>
              <div class="session-location">${l.location || '未設定'}</div>
            </div>`;
          }).join('')}
          ${logs.length > 50 ? `<div style="text-align:center;padding:var(--space-md);color:var(--color-text-tertiary);font-size:var(--font-size-xs)">他 ${logs.length - 50} 件</div>` : ''}
          ${logs.length === 0 ? '<div style="text-align:center;padding:var(--space-xl);color:var(--color-text-tertiary)">該当するセッションがありません</div>' : ''}
        </div>
      </div>
    </div>
    ${insightGroupCloseHTML}

  `;

  // --- Charts ---
  setTimeout(() => {
    // 投下時間 × 正答率の散布図。中央値で4象限に切り、右下（時間の割に伸びていない）を赤で示す。
    if (typeof Chart !== 'undefined' && scatterPoints.length >= 3) {
      destroyChart('insightAccScatter');
      const scCtx = document.getElementById('insightAccScatter');
      if (scCtx) {
        const ptColor = p => (p.x >= medHours && p.y <  medAcc) ? '#ef4444'
                           : (p.x >= medHours && p.y >= medAcc) ? '#3b82f6'
                           : (p.x <  medHours && p.y >= medAcc) ? '#10b981'
                           : '#64748b';
        chartInstances['insightAccScatter'] = new Chart(scCtx, {
          type: 'scatter',
          data: { datasets: [{
            data: scatterPoints,
            pointBackgroundColor: scatterPoints.map(ptColor),
            pointBorderColor: scatterPoints.map(ptColor),
            pointRadius: 6, pointHoverRadius: 9
          }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => {
                const p = c.raw;
                return `${p.name}: ${p.x.toFixed(1)}h / 正答率 ${p.y.toFixed(0)}% (${p.done}問)`;
              } } }
            },
            scales: {
              x: { title: { display: true, text: '累積学習時間 (h)' }, beginAtZero: true },
              y: { title: { display: true, text: '正答率 (%)' }, min: 0, max: 100 }
            }
          },
          plugins: [{
            id: 'medianCrosshair',
            afterDraw(chart) {
              const { ctx: g, chartArea: a, scales } = chart;
              if (!a) return;
              const mx = scales.x.getPixelForValue(medHours);
              const my = scales.y.getPixelForValue(medAcc);
              g.save();
              g.setLineDash([4, 4]);
              g.strokeStyle = 'rgba(148,163,184,0.45)';
              g.lineWidth = 1;
              g.beginPath(); g.moveTo(mx, a.top); g.lineTo(mx, a.bottom); g.stroke();
              g.beginPath(); g.moveTo(a.left, my); g.lineTo(a.right, my); g.stroke();
              g.restore();
            }
          }]
        });
      }
    }

    if (typeof Chart !== 'undefined' && trendData.some(v => v > 0)) {
      destroyChart('insightTrendChart');
      const ctx = document.getElementById('insightTrendChart');
      if (ctx) {
        destroyChart('insightBalanceChart');
        const balCtx = document.getElementById('insightBalanceChart');
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

        chartInstances['insightTrendChart'] = new Chart(ctx, {
          type: 'bar',
          data: { labels: trendLabels, datasets: [{
            label: '学習時間(分)', data: trendData,
            backgroundColor: (context) => {
              const {ctx:c, chartArea} = context.chart;
              if (!chartArea) return '#4ECDC4';
              const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              g.addColorStop(0, 'rgba(78,205,196,0.3)'); g.addColorStop(1, 'rgba(69,183,209,0.8)');
              return g;
            },
            borderRadius: 4, borderSkipped: false, maxBarThickness: 24
          }]},
          options: {
            responsive: true, maintainAspectRatio: true,
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
              y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { font: { size: 9 }, callback: v => v + 'm' } }
            },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2332', titleColor: '#f0f4f8', bodyColor: '#94a3b8', borderColor: 'rgba(78,205,196,0.3)', borderWidth: 1, cornerRadius: 8 } },
            animation: { duration: 800, easing: 'easeOutQuart' }
          }
        });
      }
    }
  }, 200);

  // Sleep chart
  setTimeout(() => {
    if (typeof Chart !== 'undefined' && hasSleepStats && sleepDailyData.length > 0) {
      destroyChart('insightSleepChart');
      const sleepCanvas = document.getElementById('insightSleepChart');
      if (sleepCanvas) {
        chartInstances['insightSleepChart'] = new Chart(sleepCanvas, {
          type: 'bar',
          data: {
            labels: sleepDailyData.map(d => d.date.slice(5)), // MM-DD
            datasets: [{
              label: '睡眠時間(h)',
              data: sleepDailyData.map(d => d.hours),
              backgroundColor: (context) => {
                const v = context.raw;
                if (v === 0) return 'rgba(239,68,68,0.7)'; // 徹夜: red
                if (v < 6) return 'rgba(245,158,11,0.7)';   // <6h: amber
                if (v >= 7) return 'rgba(74,222,128,0.7)';   // 7h+: green
                return 'rgba(99,102,241,0.6)';               // 6-7h: indigo
              },
              borderRadius: 4,
              borderSkipped: false,
              maxBarThickness: 24
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
              y: {
                beginAtZero: true,
                max: Math.max(10, sleepMaxHours + 1),
                grid: { color: 'rgba(148,163,184,0.06)' },
                ticks: { font: { size: 9 }, callback: v => v + 'h' }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1a2332', titleColor: '#f0f4f8', bodyColor: '#94a3b8',
                borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 8,
                callbacks: {
                  label: (ctx) => ctx.raw === 0 ? '徹夜' : ctx.raw + '時間'
                }
              },
              annotation: {
                annotations: {
                  idealLine: {
                    type: 'line', yMin: IDEAL_SLEEP_HOURS, yMax: IDEAL_SLEEP_HOURS,
                    borderColor: 'rgba(74,222,128,0.5)', borderWidth: 2, borderDash: [5, 5],
                    label: { display: true, content: '理想 ' + IDEAL_SLEEP_HOURS + 'h', position: 'end', backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', font: { size: 9 } }
                  }
                }
              }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
          }
        });
      }
    }
  }, 250);

  // --- Event: Filter preset chips ---
  document.getElementById('filter-preset-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.preset = chip.dataset.preset;
    renderInsights();
  });
  // --- Event: Custom date inputs ---
  document.getElementById('filter-date-from')?.addEventListener('change', e => {
    insightFilters.dateFrom = e.target.value;
    insightFilters.preset = 'custom';
    renderInsights();
  });
  document.getElementById('filter-date-to')?.addEventListener('change', e => {
    insightFilters.dateTo = e.target.value;
    insightFilters.preset = 'custom';
    renderInsights();
  });
  // --- Event: Location select ---
  document.getElementById('filter-location')?.addEventListener('change', e => {
    insightFilters.location = e.target.value;
    renderInsights();
  });
  // --- Event: Time slot chips ---
  document.getElementById('filter-timeslot-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.timeSlot = chip.dataset.slot;
    renderInsights();
  });
  // --- Event: Focus chips ---
  document.getElementById('filter-focus-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.focusLevel = chip.dataset.focus;
    renderInsights();
  });
  // --- Event: Activity chips ---
  document.getElementById('filter-activity-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.activity = chip.dataset.activity;
    renderInsights();
  });
  // --- Event: Purpose chips ---
  document.getElementById('filter-purpose-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.purpose = chip.dataset.purpose;
    renderInsights();
  });
  // --- Event: Session length chips ---
  document.getElementById('filter-session-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    insightFilters.sessionLength = chip.dataset.len;
    renderInsights();
  });
  // --- Event: Reset ---
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    resetInsightFilters();
    renderInsights();
  });
  // --- Event: セクションの折りたたみ ---
  ct.querySelectorAll('[data-group-toggle]').forEach(btn => {
    btn.addEventListener('click', () => toggleInsightGroup(btn.dataset.groupToggle));
  });
  document.getElementById('insight-expand-all')?.addEventListener('click', () => setAllInsightGroups(true));
  document.getElementById('insight-collapse-all')?.addEventListener('click', () => setAllInsightGroups(false));

}

// --- Settings ---
function renderSettings(){
  const ct=document.getElementById('page-container');
  const c=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);


  ct.innerHTML=`
  <div class="page-header">
    <h1 class="page-title">設定</h1>
    <p class="page-subtitle">プロフィールと学習設定の管理</p>
  </div>
  <div class="settings-layout">

    <!-- Profile Hero Card -->
    <div class="settings-card animate-slide-up">
      <div class="settings-profile-header">
        <div class="avatar avatar-xl" id="settings-avatar" style="background:${currentUser.avatar_url ? 'var(--color-bg-elevated)' : c}">
          ${currentUser.avatar_url ? `<img src="${currentUser.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.parentElement.innerHTML='${ini}'"/>` : ini}
        </div>
        <div class="settings-profile-info">
          <h2 id="display-name">${currentUser.name}</h2>
          <p id="display-role">${currentUser.university} 医学部${currentUser.grade}年</p>
          <p style="color:var(--color-text-tertiary);font-size:.75rem" id="display-email">${currentUser.email}</p>
        </div>
      </div>
    </div>

    <!-- Profile Edit -->
    <div class="settings-card animate-slide-up" style="animation-delay:.08s">
      <h3 class="settings-section-title">👤 プロフィール設定</h3>
      <div class="settings-form">
        <div class="settings-field">
          <label>アイコン（画像URL）</label>
          <input type="text" id="input-avatar" value="${currentUser.avatar_url || ''}" placeholder="https://..."/>
          <div style="margin-top:8px">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('input-avatar-file').click()" style="width:100%">📷 画像を選択・アップロード</button>
            <input type="file" id="input-avatar-file" accept="image/*" style="display:none" />
          </div>
        </div>
        <div class="settings-field"><label>表示名</label><input type="text" id="input-name" value="${currentUser.name}" placeholder="例: 田中 太郎"/></div>
        <div class="settings-field">
          <label>ログインID (変更不可)</label>
          <div style="padding:10px; background:var(--color-bg-elevated); border-radius:var(--radius-sm); font-family:monospace; font-weight:700; color:${canLoginWithId() ? 'var(--color-accent-teal)' : 'var(--color-text-tertiary)'}; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span>${currentUser.login_id || '---'}</span>
            <span style="font-size:0.7rem; color:var(--color-text-tertiary); font-weight:normal; text-align:right;">${canLoginWithId() ? '※次回ログイン用' : '※このアカウントでは使えません'}</span>
          </div>
          ${!canLoginWithId() ? `<div style="margin-top:6px; font-size:0.72rem; color:var(--color-text-tertiary); line-height:1.6;">このアカウントは<strong>メールアドレスで登録</strong>されています。ログイン画面では「旧アカウント」タブから、下のメールアドレスとパスワードでログインしてください。</div>` : ''}
        </div>
        <div class="settings-field"><label>メールアドレス</label><input type="email" id="input-email" value="${currentUser.email}" placeholder="ログイン共通" disabled style="opacity:0.6"/></div>
        <div class="settings-field"><label>大学・所属名</label><input type="text" id="input-univ" value="${currentUser.university}" placeholder="例: 東京大学医学部"/></div>
        <div class="settings-field"><label>学年</label>
          <select id="input-grade">${[1,2,3,4,5,6].map(gr=>`<option value="${gr}" ${gr===currentUser.grade?'selected':''}>${gr}年</option>`).join('')}</select>
        </div>
        <div class="settings-field"><label>${IC.flame} 曜日別 学習目標 (分)</label>
          <div class="weekly-goal-grid" id="weekly-goal-grid">
            ${['日','月','火','水','木','金','土'].map((day, i) => {
              const goals = getWeeklyGoals();
              return `<div class="weekly-goal-day">
                <label>${day}</label>
                <input type="number" min="0" max="1440" value="${goals[i]}" data-day="${i}" class="weekly-goal-input"/>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="settings-row">
          <button class="btn btn-primary" id="save-profile-btn" style="width:100%;justify-content:center">💾 プロフィールを保存</button>
        </div>
      </div>
    </div>

    </div>
    
    <!-- Feedback / Suggestion Box -->
    <div class="settings-card animate-slide-up" style="animation-delay:.30s">
      <h3 class="settings-section-title">📮 製作者への意見箱</h3>
      <p style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:var(--space-md)">
        不具合の報告や、追加してほしい機能など、開発者へ直接メッセージを送れます。
      </p>
      <div class="settings-form">
        <div class="settings-field">
          <label>カテゴリ</label>
          <select id="feedback-category">
            <option value="機能要望">機能要望</option>
            <option value="バグ報告">🐛 バグ報告</option>
            <option value="その他">💬 その他</option>
          </select>
        </div>
        <div class="settings-field"><label>件名</label><input type="text" id="feedback-title" placeholder="（例）タイマーの音を消したい"/></div>
        <div class="settings-field"><label>内容</label><textarea id="feedback-body" placeholder="具体的な内容を教えてください..." style="min-height:100px;width:100%;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px"></textarea></div>
        <div class="settings-row" style="margin-bottom:var(--space-md)">
          <label class="anonymous-toggle" style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer"><input type="checkbox" id="feedback-anonymous"/> 匿名で送信する</label>
        </div>
        <button class="btn btn-primary" id="btn-submit-feedback" style="width:100%;justify-content:center">🚀 フィードバックを送信</button>
      </div>
    </div>
    
    <div style="text-align:center;padding:40px 0;"><button id="btn-logout" class="btn btn-secondary" style="border-color:rgba(241,148,138,0.4);color:var(--color-accent-pink)">ログアウト</button></div>
  </div>`;

  // ---- Event Listeners ----
  const origName=currentUser.name, origEmail=currentUser.email, origUniv=currentUser.university, origGrade=currentUser.grade;

  // Live preview — name
  document.getElementById('input-name').addEventListener('input', e=>{
    document.getElementById('display-name').textContent = e.target.value || '（名前未設定）';
    if (!document.getElementById('input-avatar').value) {
      const ini2=getInitials(e.target.value||'?');
      document.getElementById('settings-avatar').textContent = ini2;
    }
  });

  const updateAvatarPreview = (val) => {
    const el = document.getElementById('settings-avatar');
    if (!val || !val.startsWith('http')) {
      el.textContent = getInitials(document.getElementById('input-name').value || '?');
      el.style.background = getAvatarColor(currentUser.id);
      return;
    }
    el.innerHTML = `<img src="${val}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='?'"/>`;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.overflow = 'hidden';
  };
  document.getElementById('input-avatar').addEventListener('input', e => updateAvatarPreview(e.target.value));

  // Profile icon file selection
  document.getElementById('input-avatar-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = e.target.previousElementSibling;
    const orig = btn.textContent;
    btn.textContent = 'アップロード中...'; btn.disabled = true;
    const url = await uploadImage(file);
    btn.textContent = orig; btn.disabled = false;
    if (url) {
      document.getElementById('input-avatar').value = url;
      updateAvatarPreview(url);
      showToast(' 画像をアップロードしました');
    }
  });

  // Live preview — univ/grade
  const updateRole=()=>{
    const u=document.getElementById('input-univ').value||'大学未設定';
    const gr=document.getElementById('input-grade').value||'?';
    document.getElementById('display-role').textContent=`${u} 医学部${gr}年`;
  };
  document.getElementById('input-univ').addEventListener('input', updateRole);
  document.getElementById('input-grade').addEventListener('change', updateRole);
  document.getElementById('input-email').addEventListener('input', e=>{
    document.getElementById('display-email').textContent = e.target.value;
  });

  // Save profile button
  document.getElementById('save-profile-btn').addEventListener('click', async (e)=>{
    const newName=document.getElementById('input-name').value.trim();
    const newAvatar=document.getElementById('input-avatar').value.trim();
    const newUniv=document.getElementById('input-univ').value.trim();
      const newGrade=parseInt(document.getElementById('input-grade').value);
      const isPublic = document.getElementById('input-public').checked;

      // Save weekly goals
      const weeklyGoals = getWeeklyGoals();
      document.querySelectorAll('.weekly-goal-input').forEach(inp => {
        const dayIdx = parseInt(inp.dataset.day);
        const val = parseInt(inp.value);
        if (!isNaN(dayIdx) && !isNaN(val) && val >= 0) {
          weeklyGoals[dayIdx] = val;
        }
      });
      saveWeeklyGoals(weeklyGoals);
      
      if(!newName){ document.getElementById('input-name').focus(); showToast(' 名前を入力してください'); return; }
      
      e.target.textContent = '保存中...';
      if (hasDB()) {
        const { error } = await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: newName,
          avatar_url: newAvatar,
          university: newUniv,
          grade: newGrade,
          is_public: isPublic,
          daily_goal: weeklyGoals[new Date().getDay()],
          weekly_goals: JSON.stringify(weeklyGoals),
          login_id: currentUser.login_id // Ensure login_id is included in the upsert
        });
        if (error) { showToast(IC.x+' 保存に失敗しました: ' + error.message); e.target.textContent = '💾 プロフィールを保存'; return; }
      }

      currentUser.name=newName;
      currentUser.avatar_url=newAvatar;
      currentUser.university=newUniv||'未設定';
      currentUser.grade=newGrade;
      currentUser.is_public=isPublic;
      currentUser.daily_goal=weeklyGoals[new Date().getDay()];
    renderSidebar();
    showToast(' プロフィールを保存しました！');
    e.target.textContent = '💾 プロフィールを保存';
    renderDashboard();
  });



  // Logout Logic
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (confirm('ログアウトしますか？')) {
      if (supabase) await supabase.auth.signOut();
      else { session = null; renderRoute('/'); }
    }
  });
  // Theme toggle in settings page
  document.getElementById('theme-btn-settings')?.addEventListener('click', ()=>{ toggleTheme(); renderSettings(); });

  // Feedback Event Listener
  document.getElementById('btn-submit-feedback')?.addEventListener('click', async (e) => {
    const titleEle = document.getElementById('feedback-title');
    const bodyEle = document.getElementById('feedback-body');
    const catEle = document.getElementById('feedback-category');
    const anonEle = document.getElementById('feedback-anonymous');
    
    const title = titleEle.value.trim();
    const body = bodyEle.value.trim();
    const category = catEle.value;
    const isAnon = anonEle.checked;
    
    if (!body) { showToast(' 内容を入力してください'); return; }
    
    const btn = e.target;
    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = '送信中...';
    
    const success = await saveFeedback(title || '無題', body, category, isAnon);
    if (success) {
      titleEle.value = '';
      bodyEle.value = '';
    }
    btn.disabled = false;
    btn.textContent = origText;
  });
}

// ==================== REGISTER & INIT ====================
console.log('DEBUG: Registering routes and starting app');

function ensureAppLayout() {
  const app = document.getElementById('app');
  if (!document.getElementById('sidebar')) {
    app.innerHTML = `
      <aside id="sidebar"></aside>
      <main id="main-content">
        <div id="page-container"></div>
      </main>
    `;
  }
}

registerRoute('/',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderDashboard();});
registerRoute('/study',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderStudy();});

registerRoute('/insights',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderInsights();});
registerRoute('/qb',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderQBProgress();});
registerRoute('/countdown',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderCountdown();});
registerRoute('/settings',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderSettings();});


// ログイン確定後に一度だけ走らせる。教材進捗を読み込み、その日の断面を必ず1件残す。
// （進捗を編集しなかった日でも断面があることで、差分計算が正しく日割りになる）
async function bootstrapProgressTracking() {
  try {
    await loadQBFromSupabase();
    await loadVideoFromSupabase();
    await fetchProgressSnapshots();
    saveProgressSnapshot();
  } catch(e) { console.warn('progress bootstrap error:', e); }
}

let authSubscription = null;

async function initApp(){
  console.log('DEBUG: initApp started');
  // initApp はログイン成功時にも呼ばれる。前回のリスナーを外さないと多重登録になる。
  if (authSubscription) {
    try { authSubscription.data.subscription.unsubscribe(); } catch(e) {}
    authSubscription = null;
  }
  // Initial Theme Check
  applyTheme();

  if(supabase) {
    loadTimerState();
    try {
      await fetchCountdowns();
      const { data, error } = await supabase.auth.getSession();
      if (!error && data) session = data.session;
      
      if (session) {
        const profile = await fetchUserProfile(session.user.id).catch(e => {
          console.error('DEBUG: Profile fetch failed:', e);
          return null;
        });
        if (profile) {
          currentUser.id = profile.id;
          currentUser.name = profile.full_name || '名前未設定';
          currentUser.university = profile.university || '未設定';
          currentUser.grade = profile.grade || 1;
          currentUser.avatar_url = profile.avatar_url || '';
          currentUser.daily_goal = profile.daily_goal || 60;
          currentUser.login_id = profile.login_id || '';
          currentUser.email = (session && session.user && session.user.email) || '';
        }
        // 初回描画をネットワーク待ちで止めないよう、あえて await しない
        bootstrapProgressTracking();
      }

      authSubscription = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        console.log('DEBUG: Auth state changed:', _event);
        session = newSession;
        if (session) isDemoMode = false;
        if (session) {
          const profile = await fetchUserProfile(session.user.id).catch(() => null);
          if (profile) {
            currentUser.id = profile.id;
            currentUser.name = profile.full_name || '名前未設定';
            currentUser.university = profile.university || '未設定';
            currentUser.grade = profile.grade || 1;
            currentUser.avatar_url = profile.avatar_url || '';
            currentUser.daily_goal = profile.daily_goal || 60;
            currentUser.login_id = profile.login_id || '';
          currentUser.email = (session && session.user && session.user.email) || '';
            // Sync weekly goals from DB to localStorage
            if (profile.weekly_goals) {
              try {
                const dbGoals = JSON.parse(profile.weekly_goals);
                if (Array.isArray(dbGoals) && dbGoals.length === 7) {
                  localStorage.setItem('medfocus_weekly_goals', JSON.stringify(dbGoals));
                }
              } catch(e) {}
            }
            // Sync daily overrides from DB to localStorage
            if (profile.daily_overrides) {
              try {
                const dbOverrides = JSON.parse(profile.daily_overrides);
                if (typeof dbOverrides === 'object') {
                  localStorage.setItem('medfocus_daily_overrides_map', JSON.stringify(dbOverrides));
                  Object.entries(dbOverrides).forEach(([dk, val]) => {
                    localStorage.setItem('medfocus_daily_override_' + dk, val.toString());
                  });
                }
              } catch(e) {}
            }
          }
        }
        renderRoute(currentRoute);
        // 認証コールバックの内側で Supabase を呼ぶとロックを奪い合って固まるため、
        // 進捗の読み込みはコールバックを抜けてから、待たずに走らせる。
        if (session) setTimeout(() => { bootstrapProgressTracking(); }, 0);
      });

    } catch(e) {
      console.error('DEBUG: Auth/Supabase init error:', e);
    }
  }
  
  // Clean up global router listeners to avoid duplicates
  window.removeEventListener('popstate', handlePopState);
  window.addEventListener('popstate', handlePopState);
  
  document.removeEventListener('click', handleInternalLinkClick);
  document.addEventListener('click', handleInternalLinkClick);
  
  console.log('DEBUG: App initial route render:', window.location.pathname);
  renderRoute(window.location.pathname);
}

function handlePopState() { renderRoute(window.location.pathname); }
function handleInternalLinkClick(e) {
  const n = e.target.closest('[data-route]');
  if(n){ e.preventDefault(); navigate(n.dataset.route); }
}

// Global Error Handler
window.onerror = function(msg, url, line) {
  console.error("CRITICAL ERROR: " + msg + " at " + line);
  // Optional: show emergency UI if screen is blank
  const app = document.getElementById('app');
  if (app && app.innerHTML.trim() === "") {
    app.innerHTML = `<div style="padding: 40px; text-align: center; color: white;">
      <h2>⚠️ アプリの起動中にエラーが発生しました</h2>
      <p style="opacity: 0.7;">${msg}</p>
      <button onclick="localStorage.clear(); location.reload();" style="margin-top: 20px; padding: 10px 20px; background: #4ECDC4; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">再読み込み・キャッシュクリア</button>
    </div>`;
  }
};

initApp();
console.log('DEBUG: app.js finished executing');
