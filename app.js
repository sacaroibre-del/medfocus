console.log('DEBUG: app.js loaded');
// ============================================================
// MedFocus - Complete Application (No Build Tools)
// ============================================================

let supabase = null;
let SUPABASE_URL = '', SUPABASE_KEY = '';

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
  if (supabase && session) {
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
  if (supabase && session) {
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

let myGroups = []; // Array of groups the current user has joined
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

const subjectProgress = [];
const studyLogs = [];
const userStudyTotals = [];
const posts = [];
const activityFeed = [];

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
function getLogicalDate(d) { const l=new Date(d); if(l.getHours()<5){ l.setDate(l.getDate()-1); } return l; }
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


// ==================== GROUP HELPERS ====================
function generateInviteCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

async function fetchCountdowns() {
  if (!supabase) return;
  const cached = getCached('countdowns');
  if (cached) { examCountdowns = cached; return; }
  const { data, error } = await supabase.from('exam_countdowns').select('*').order('exam_date', { ascending: true });
  if (!error && data) { examCountdowns = data; setCache('countdowns', data); }
}

async function fetchUserGroups() {
  if (!supabase || !session) return;
  const { data, error } = await supabase.from('group_members').select('role, groups(*)').eq('user_id', session.user.id).order('joined_at', { ascending: true });
  if (!error && data) myGroups = data.map(d => ({ ...d.groups, role: d.role }));
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
  if (!supabase || !session) return [];
  const cached = getCached('checklists');
  if (cached) { checklistProgressCache = cached; return cached; }
  const { data, error } = await supabase.from('user_checklist_progress').select('category, topic, completed').eq('user_id', session.user.id);
  if (!error && data) { checklistProgressCache = data; setCache('checklists', data); }
  return checklistProgressCache;
}

async function toggleChecklistItem(category, topic, checked) {
  if (!supabase || !session) return;
  const ex = checklistProgressCache.find(c => c.category === category && c.topic === topic);
  if (ex) ex.completed = checked;
  else checklistProgressCache.push({ category, topic, completed: checked });
  invalidateCache('checklists');
  
  await supabase.from('user_checklist_progress').upsert({
    user_id: session.user.id, category, topic, completed: checked
  }, { onConflict: 'user_id, category, topic' });
}

async function createGroup(name, iconUrl = null) {
  if (!supabase || !session) return;
  const code = generateInviteCode();
  const { data: group, error: gErr } = await supabase.from('groups').insert([{ 
    name, 
    invite_code: code, 
    created_by: session.user.id,
    icon_url: iconUrl 
  }]).select().single();
  if (gErr) { showToast(IC.x+' グループ作成失敗: ' + gErr.message); console.error('Group create error:', gErr); return; }
  const { error: mErr } = await supabase.from('group_members').insert([{ group_id: group.id, user_id: session.user.id, role: 'admin' }]);
  if (mErr) showToast(IC.x+' メンバー追加失敗: ' + mErr.message);
  else { showToast(IC.check+' グループを作成しました！'); await fetchUserGroups(); renderSettings(); }
}

async function updateGroup(groupId, name, iconUrl) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('groups').update({
    name,
    icon_url: iconUrl
  }).eq('id', groupId).eq('created_by', session.user.id);
  
  if (error) {
    showToast(IC.x+' 更新に失敗しました: ' + error.message);
    return;
  }
  showToast(IC.check+' グループ情報を更新しました');
  await fetchUserGroups();
  renderSettings();
}

async function uploadImage(file, bucket = 'avatars') {
  if (!supabase || !session) return null;
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

async function joinGroup(code) {
  if (!supabase || !session) return;
  const { data: group, error: findErr } = await supabase.from('groups').select('*').eq('invite_code', code.trim().toUpperCase()).single();
  if (findErr || !group) { showToast(IC.x+' 無効な招待コードです'); return; }
  const { error: mErr } = await supabase.from('group_members').insert([{ group_id: group.id, user_id: session.user.id }]);
  if (mErr) {
    if (mErr.code === '23505') showToast(IC.warn+' 既に参加しているグループです');
    else showToast(IC.x+' 参加に失敗しました');
  } else { showToast(IC.check+' グループに参加しました！'); await fetchUserGroups(); renderSettings(); }
}

async function leaveGroup(groupId) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('group_members').delete().match({ group_id: groupId, user_id: session.user.id });
  if (error) showToast(IC.x+' 退室に失敗しました');
  else { showToast(IC.check+' 退室しました'); await fetchUserGroups(); renderSettings(); }
}

async function fetchGroupRanking(groupId, period) {
  if (!supabase) return [];
  const { data: members, error: memErr } = await supabase.from('group_members').select('user_id, profiles(full_name)').eq('group_id', groupId);
  if (memErr || !members) return [];
  const userIds = members.map(m => m.user_id);
  if (userIds.length === 0) return [];

  const now = new Date();
  const logicalNow = getLogicalDate(now);
  const timeLimit = new Date(logicalNow);
  
  if (period === 'weekly') {
    // Current week: From Monday 5:00 AM of this logical week
    const day = logicalNow.getDay(); // 0:Sun, 1:Mon...
    const diff = (day === 0 ? 6 : day - 1); // Days since Monday
    timeLimit.setDate(logicalNow.getDate() - diff);
    timeLimit.setHours(5,0,0,0);
  } else {
    // Today: From 5:00 AM of today's logical date
    timeLimit.setHours(5,0,0,0);
  }

  const { data: logs, error: logErr } = await supabase.from('study_logs').select('user_id, duration_minutes').in('user_id', userIds).gte('started_at', timeLimit.toISOString());
  const safeLogs = (logErr || !logs) ? [] : logs;
  const totals = {};
  userIds.forEach(uid => totals[uid] = 0);
  safeLogs.forEach(l => { totals[l.user_id] += l.duration_minutes; });
  return members.map(m => ({ userId: m.user_id, name: m.profiles?.full_name || '名前未設定', total: totals[m.user_id] })).sort((a,b) => b.total - a.total);
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
  if (!supabase || !session) return [];
  const cached = getCached('study_logs');
  if (cached) return cached;
  const { data, error } = await supabase.from('study_logs').select('*').eq('user_id', session.user.id).order('started_at', { ascending: false });
  const result = error ? [] : data;
  setCache('study_logs', result);
  return result;
}

async function saveStudyLog(subjectId, durationMinutes, memo, focusLevel = 2, location = '未設定', startedAt = null, endedAt = null, breaks = null) {
  if (!supabase || !session) return true; // Pretend success in offline demo mode
  try {
    const now = new Date().toISOString();
    const payload = { 
      user_id: session.user.id, 
      subject_name: subjectId, 
      duration_minutes: durationMinutes,
      memo: memo || null,
      focus_level: focusLevel,
      location: location,
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
      // Save daily snapshot with current goal
      const logicalDate = getLogicalDate(new Date());
      const dateKey = toLocalDateKey(logicalDate);
      const goalForToday = getTodayGoalMinutes();
      const allLogs = await fetchStudyLogs();
      const ds = new Date(logicalDate); ds.setHours(5, 0, 0, 0);
      const de = new Date(logicalDate); de.setHours(28, 59, 59, 999);
      const todayTotal = allLogs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; }).reduce((s, l) => s + l.duration_minutes, 0);
      saveDailySnapshot(dateKey, goalForToday, todayTotal);
      showToast(IC.check+' 勉強記録を保存しました！'); 
      return true;
    }
  } catch (err) {
    console.error('saveStudyLog exception:', err);
    showToast(IC.x+' エラーが発生しました');
    return false;
  }
}

async function updateStudyLog(id, subjectName, durationMinutes, startedAt, memo, focusLevel = 2, location = '未設定', endedAt = null) {
  if (!supabase || !session) return;
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
  if (endedAt) payload.ended_at = endedAt;
  const { error } = await supabase.from('study_logs').update(payload).eq('id', id);
  if (error) showToast(IC.x+' 更新に失敗しました');
  else { invalidateCache('study_logs'); showToast(IC.check+' 記録を更新しました！'); }
}

async function deleteStudyLog(id) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('study_logs').delete().eq('id', id);
  if (error) showToast(IC.x+' 削除に失敗しました');
  else { invalidateCache('study_logs'); showToast(IC.check+' 記録を削除しました！'); }
}

async function fetchPosts() {
  if (!supabase) return posts;
  
  // Try to fetch with full relationships including groups
  let { data, error } = await supabase.from('posts').select('*, profiles(full_name), groups(name), post_replies(*, profiles(full_name))').order('created_at', { ascending: false });
  
  if (error) {
    console.warn('DEBUG: fetchPosts joined query failed. Trying robust secondary fetching strategy. Error:', error);
    
    // Step 1: Fetch posts only (try to exclude groups if it failed)
    let resPosts;
    if (error.message && error.message.includes('group_id')) {
       resPosts = await supabase.from('posts').select('*, profiles(full_name), post_replies(*, profiles(full_name))').order('created_at', { ascending: false });
    } else {
       resPosts = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    }
    
    if (resPosts.error) {
      console.error('DEBUG: fetchPosts cannot even fetch base posts:', resPosts.error);
      return [];
    }
    data = resPosts.data;
  }
  
  console.log('DEBUG: fetchPosts raw data:', data);
  return data;
}

async function deletePost(postId) {
  if (!supabase || !session) {
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      posts.splice(idx, 1);
      showToast(IC.check+' 投稿を削除しました（デモ）');
      await renderCommunity();
    }
    return;
  }
  const { error: replyErr } = await supabase.from('post_replies').delete().eq('post_id', postId);
  const { error } = await supabase.from('posts').delete().match({ id: postId, user_id: session.user.id });
  if (error) showToast(IC.x+' 削除に失敗しました: ' + error.message);
  else { showToast(IC.check+' 投稿を削除しました'); await renderCommunity(); }
}

async function deletePostReply(replyId) {
  if (!supabase || !session) {
    posts.forEach(p => {
      if (p.post_replies) {
        const idx = p.post_replies.findIndex(r => r.id === replyId);
        if (idx !== -1) p.post_replies.splice(idx, 1);
      }
    });
    showToast(IC.check+' 返信を削除しました（デモ）');
    await renderCommunity();
    return;
  }
  const { error } = await supabase.from('post_replies').delete().match({ id: replyId, user_id: session.user.id });
  if (error) showToast(IC.x+' 削除に失敗しました: ' + error.message);
  else { showToast(IC.check+' 返信を削除しました'); await renderCommunity(); }
}

async function savePostReply(postId, body, isAnonymous) {
  if (!supabase || !session) {
    const post = posts.find(p => p.id === postId);
    if (post) {
      if (!post.post_replies) post.post_replies = [];
      post.post_replies.push({
        id: 'reply-' + Date.now(),
        created_at: new Date().toISOString(),
        user_id: session?.user?.id || currentUser.id,
        body,
        is_anonymous: isAnonymous,
        profiles: { full_name: currentUser.name }
      });
      showToast(IC.check+' 返信しました（デモ）');
      return true;
    }
    return false;
  }
  
  // Try with is_anonymous
  let { error } = await supabase.from('post_replies').insert([{ 
    post_id: postId, 
    user_id: session.user.id, 
    body,
    is_anonymous: isAnonymous
  }]);
  
  // Fallback if is_anonymous column doesn't exist yet
  if (error && error.code === '42703') {
    const fallback = await supabase.from('post_replies').insert([{ post_id: postId, user_id: session.user.id, body }]);
    error = fallback.error;
  }

  if (error) {
    console.error('DEBUG: Supabase savePostReply failed:', error);
    showToast(IC.x+' 返信の失敗: ' + (error.message || 'エラーが発生しました'));
    return false;
  }
  
  showToast(IC.check+' 返信を投稿しました！');
  return true;
}

async function savePost(title, body, type, isAnonymous, groupId = null) {
  if (!supabase || !session) {
    const newPost = {
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
      user_id: session?.user?.id || currentUser.id,
      title, body, type, is_anonymous: isAnonymous,
      group_id: groupId,
      likes: 0, post_replies: [],
      profiles: { full_name: currentUser.name }
    };
    posts.unshift(newPost);
    showToast(' 投稿しました！(デモ)');
    return;
  }
  
  console.log('DEBUG: savePost called', { title, body, type, isAnonymous, groupId });
  // Try inserting with is_anonymous and group_id
  let { error } = await supabase.from('posts').insert([{ 
    user_id: session.user.id, 
    title, body, type, 
    is_anonymous: isAnonymous,
    group_id: groupId
  }]);
  
  if (error) console.warn('DEBUG: savePost first attempt error:', error);
  
  if (error && error.message && (error.message.includes('is_anonymous') || error.code === '42703')) {
    console.warn('DEBUG: is_anonymous column missing or ambiguous. retrying without it.');
    const fallback = await supabase.from('posts').insert([{ 
      user_id: session.user.id, 
      title, body, type,
      group_id: groupId
    }]);
    error = fallback.error;
  }

  if (error) {
    console.error('DEBUG: Supabase savePost failed:', error);
    showToast(' 投稿に失敗しました: ' + (error.message || 'データベースエラー'));
  }
}

async function saveFeedback(title, body, category, isAnonymous) {
  if (!supabase || !session) {
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
let isPomodoro=false, pomodoroPhase='study';
let isSimulation=false, simulationPhase='study';
let simulationBlockCurrent=1, simulationBlockTotal=6, simulationStudyMin=60, simulationBreakMin=10;
let pendingLogDuration=0, timerStartTime=0, baseElapsed=0, baseCountdown=0;
let selectedSubjectId='', selectedSubjectCustom='';
let selectedLocation='自宅', selectedFocusLevel=2;
let cumulativeStudySeconds=0; // New: actual study seconds accumulated in session
let sessionStartedAt=null; // ISO string: when user first started the session
let sessionBreaks=[]; // Array of {start: ISO, end: ISO} for pause periods

function saveTimerState() {
  localStorage.setItem('medfocus_timer_v2', JSON.stringify({
    isRunning, isCountdown, isPomodoro, pomodoroPhase, elapsedSeconds, countdownSeconds,
    isSimulation, simulationPhase, simulationBlockCurrent, simulationBlockTotal, simulationStudyMin, simulationBreakMin,
    isConfirmingLog, pendingLogDuration,
    selectedSubjectId, selectedSubjectCustom,
    selectedLocation, selectedFocusLevel,
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
      showToast(IC.tomato+' 25分の集中完了！5分休憩に入ります。');
      // Removed auto-save here
      
      pomodoroPhase = 'break';
      countdownSeconds = 5 * 60;
      baseCountdown = 5 * 60;
      initialCountdownSeconds = 5 * 60;
      elapsedSeconds = 0;
      baseElapsed = 0;
      saveTimerState();
      startSW();
      if (currentRoute === '/study' || window.location.pathname === '/study') renderStudy();
      return;
    } else {
      showToast('🚀 休憩終了！ポモドーロ再開！');
      pomodoroPhase = 'study';
      countdownSeconds = 25 * 60;
      baseCountdown = 25 * 60;
      initialCountdownSeconds = 25 * 60;
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
      overlay.style = 'position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--space-md); text-align:center; background:var(--color-bg-primary);';
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
          <div style="display:flex; gap:12px; margin-top:8px;">
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
      
      if(isNaN(dur) || dur <= 0) { showToast(' 正しい時間を入力してください'); return; }
      if(!subjVal) { showToast(' 学習内容を入力してください'); return; }

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
        const success = await saveStudyLog(subjVal, dur, memo, foc, loc, startedAt, endedAt, sessionBreaks);
        
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
  }
  tabJoin.onclick = () => setTab('join');
  tabLogin.onclick = () => setTab('login');
  tabLegacy.onclick = () => setTab('legacy');

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
      // Use wildcard for partial matching
      const { data, error } = await supabase.from('profiles').select('full_name, login_id').ilike('full_name', `%${name}%`);
      if (error) throw error;

      if (!data || data.length === 0) {
        resultDiv.innerHTML = '<span style="color:var(--color-accent-pink);">⚠️ 一致するアカウントが見つかりません</span>';
      } else {
        // Fetch more details to help distinguish duplicates
        const { data: fullData, error: fullErr } = await supabase.from('profiles').select('full_name, login_id, university, grade').ilike('full_name', `%${name}%`);
        const displayData = fullErr ? data : fullData;

        const list = displayData.map(u => {
          const isLegacy = !u.login_id;
          const id = u.login_id || encodeURIComponent(u.full_name);
          const meta = u.university ? `<br><span style="font-size:0.75rem; color:var(--color-text-tertiary);">${u.university} ${u.grade || ''}</span>` : '';
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
        const passwordCandidates = [
          'medfocus-fixed-pass-v2',
          'medfocus-fixed-pass',
          'medfocus-fixed-password',
          'medfocus-pass'
        ];
        
        // Try multiple email variants and passwords
        const emailVariants = [
          finalId + '@medfocus.app',
          finalId.toLowerCase() + '@medfocus.app'
        ];

        let lastErr = null;
        let success = false;

        for (const variant of emailVariants) {
          if (success) break;
          for (const pass of passwordCandidates) {
            console.log(`DEBUG: Trying login for ${variant} with candidate password...`);
            const { error: loginErr } = await supabase.auth.signInWithPassword({
              email: variant,
              password: pass
            });
            
            if (!loginErr) {
              success = true;
              break;
            } else {
              lastErr = loginErr;
              // If error is NOT "Invalid credentials" (e.g. rate limit), don't spam
              if (loginErr.status === 429) break;
            }
          }
        }

        if (success) {
          if (!document.querySelector('.toast')) showToast(' ログインに成功しました');
          if (authOverlay) authOverlay.style.display = 'none';
          initApp();
        } else {
          // Provide VERBOSE error for debugging
          const errorDetail = lastErr ? (lastErr.message || lastErr.error_description || '原因不明') : 'ログイン情報が正しくありません';
          showToast(`❌ ログイン失敗: ${errorDetail}`);
          console.error('Login verbose error:', lastErr);
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
  if(supabase && SUPABASE_KEY !== 'your-anon-key') supabase.auth.signOut();
  else { session = null; location.reload(); }
}

function mockLogin(email) {
  session = { user: { email, id: 'user-001' } };
  currentUser.id = 'user-001';
  currentUser.name = email.split('@')[0];
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  showToast(' ログインしました（デモモード）');
  renderRoute(currentRoute);
}

// ==================== SIDEBAR ====================
const navItems=[
  {route:'/',label:'ダッシュボード',icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'},
  {route:'/study',label:'学習記録',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>'},
  {route:'/insights',label:'インサイト',icon:'<svg viewBox="0 0 24 24"><path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z"/><circle cx="12" cy="12" r="3"/></svg>'},
  {route:'/qb',label:'QB進捗',icon:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'},
  {route:'/countdown',label:'カウントダウン',icon:'<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M10 14l2 2 4-4"/></svg>'},
  {route:'/community',label:'質問広場',icon:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},
  {route:'/ranking',label:'ランキング',icon:'<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'},
  {route:'/settings',label:'設定',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'}
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

  sb.innerHTML=`<div class="sidebar-header"><div class="sidebar-logo"><div class="sidebar-logo-icon">M</div><span class="sidebar-logo-text">MedFocus</span></div></div>
    <nav class="sidebar-nav">${navItems.map(i=>`<div class="nav-item ${path===i.route?'active':''}" data-route="${i.route}"><div class="nav-item-icon">${i.icon}</div><span>${i.label}</span></div>`).join('')}</nav>
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
function renderRoute(p){currentRoute=p;const h=routes[p]||routes['/'];if(h)h();document.querySelectorAll('.nav-item').forEach(i=>i.classList.toggle('active',i.dataset.route===p));}
function initRouter(){
  window.addEventListener('popstate',()=>renderRoute(window.location.pathname));
  document.addEventListener('click',e=>{const n=e.target.closest('[data-route]');if(n){e.preventDefault();navigate(n.dataset.route);}});
  renderRoute(window.location.pathname);
}

// ==================== POST CARD ====================
function renderPostCard(post){
  const isMine = post.user_id === session?.user?.id || post.user_id === currentUser.id;
  const isAnon = post.is_anonymous;
  const name = isAnon ? '匿名ユーザー' : (post.profiles?.full_name || (isMine ? currentUser.name : '名前未設定'));
  
  // Icon Logic
  let col = isAnon ? '#64748b' : getAvatarColor(post.user_id);
  let ini = isAnon ? '?' : getInitials(name);
  let avatarHtml = `<div class="avatar" style="background:${col}">${ini}</div>`;
  
  // Use currentUser.avatar_url for immediate reflection if it's the current user's post
  const avatarToUse = (!isAnon && isMine) ? currentUser.avatar_url : post.profiles?.avatar_url;

  if (!isAnon && avatarToUse && avatarToUse.startsWith('http')) {
    avatarHtml = `<div class="avatar" style="background:var(--color-bg-elevated);overflow:hidden;"><img src="${avatarToUse}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${ini}'"/></div>`;
  } else if (isAnon) {
    avatarHtml = `<div class="avatar" style="background:rgba(148,163,184,0.15);color:var(--color-text-tertiary);font-size:1.2rem;">?</div>`;
  }

  const badge = post.type==='activity'?'<span class="post-type-badge post-type-activity">'+IC.megaphone+' アクティビティ</span>':'<span class="post-type-badge post-type-question">'+IC.question+' 質問</span>';
  
  // Group Display Logic (with robust fallback)
  let groupName = post.groups?.name;
  let groupIcon = post.groups?.icon_url;
  if (!groupName && post.group_id && Array.isArray(myGroups)) {
    const found = myGroups.find(g => g.id === post.group_id);
    if (found) {
      groupName = found.name;
      groupIcon = found.icon_url;
    }
  }
  
  let gIconHtml = '';
  if (groupIcon && groupIcon.startsWith('http')) {
    gIconHtml = `<img src="${groupIcon}" style="width:14px;height:14px;object-fit:cover;border-radius:2px;vertical-align:middle;margin-right:4px;" />`;
  }

  const groupBadge = groupName 
    ? `<span class="post-type-badge" style="background:rgba(187,143,206,0.1);color:var(--color-accent-purple);border:1px solid rgba(187,143,206,0.2);font-weight:700">${gIconHtml}${IC.lock} ${groupName} 限定</span>` 
    : `<span class="post-type-badge" style="background:rgba(78,205,196,0.08);color:var(--color-accent-teal);border:1px solid rgba(78,205,196,0.2)">${IC.globe} 全体</span>`;
  
  let cmts=''; 
  const replies = post.post_replies || [];
  {
    const repliesHtml = replies.map(r => {
      const isReplyMine = r.user_id === session?.user?.id || r.user_id === currentUser.id;
      const rName = r.is_anonymous ? '匿名ユーザー' : (r.profiles?.full_name || '名前未設定');
      const rCol = r.is_anonymous ? '#64748b' : getAvatarColor(r.user_id);
      const rIni = r.is_anonymous ? '匿' : getInitials(rName);
      return `<div class="post-reply" style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.12);">
        <div class="avatar avatar-sm" style="background:${rCol};width:24px;height:24px;font-size:0.7rem;">${rIni}</div>
        <div class="reply-content" style="flex:1;">
          <div class="reply-header" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
            <span class="reply-name" style="font-size:0.8rem;font-weight:600;color:var(--color-text-secondary);">${rName}</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <span class="reply-time" style="font-size:0.7rem;color:var(--color-text-tertiary);">${timeAgo(r.created_at)}</span>
              ${isReplyMine ? `<button class="btn-delete-reply" data-id="${r.id}" style="background:none;border:none;color:var(--color-accent-pink);font-size:0.65rem;cursor:pointer;padding:0;text-decoration:underline;">削除</button>` : ''}
            </div>
          </div>
          <div class="reply-body" style="font-size:0.85rem;color:var(--color-text-primary);line-height:1.4;">${r.body}</div>
        </div>
      </div>`;
    }).join('');
    
    cmts = `<div class="post-replies-section" style="margin-top:16px;">
      ${replies.length > 0 ? `<div class="post-replies-list">${repliesHtml}</div>` : ''}
      <div class="post-reply-input-wrapper" style="flex-direction:column; gap:8px; margin-top:12px; display:flex;">
        <div style="display:flex;gap:8px;">
          <input type="text" class="post-reply-input" placeholder="返信を入力..." style="flex:1;font-size:0.85rem;padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--color-border);background:var(--color-bg-input);color:var(--color-text-primary);" />
          <button class="btn btn-primary btn-sm btn-submit-reply" data-post-id="${post.id}">送信</button>
        </div>
        <label style="font-size:0.7rem;color:var(--color-text-secondary);display:flex;align-items:center;gap:4px;cursor:pointer;">
          <input type="checkbox" class="post-reply-anonymous" /> 匿名で返信する
        </label>
      </div>
    </div>`;
  }
  
  return `<article class="post-card animate-slide-up">
    <div class="post-card-header">
      ${avatarHtml}
      <div class="post-author-info">
        <div class="post-author-name">${name} ${badge} ${groupBadge}</div>
        <div class="post-author-meta">${timeAgo(post.created_at)}</div>
      </div>
      ${isMine ? `<button class="btn-delete-post" data-id="${post.id}" style="background:rgba(241,148,138,0.1);border:1px solid rgba(241,148,138,0.2);color:#f1948a;padding:4px 10px;border-radius:var(--radius-sm);font-size:0.75rem;cursor:pointer;" title="投稿を削除">削除</button>` : ''}
    </div>
    ${post.title ? `<h3 class="post-card-title">${post.title}</h3>` : ''}
    <div class="post-card-body">${post.body}</div>
    <div class="post-card-actions">
      <button class="post-action" data-action="like">❤️ <span>${post.likes || 0}</span></button>
      <button class="post-action">💬 <span>${(post.post_replies || []).length}</span></button>
    </div>
    ${cmts}
  </article>`;
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
  
  const totalCBT = CBT_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalKoku = KOKUSHI_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalT = totalCBT + totalKoku;
  const compT=checks.filter(c=>c.completed).length;
  const overall=totalT>0?Math.round((compT/totalT)*100):0;

  const logicalToday = getLogicalDate(new Date());
  const todayStart = new Date(logicalToday); todayStart.setHours(5,0,0,0);
  const todayEnd = new Date(logicalToday); todayEnd.setHours(28,59,59,999); // Until 5am tomorrow
  
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
      const ds = new Date(d); ds.setHours(5,0,0,0);
      const de = new Date(d); de.setHours(28,59,59,999);
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
    if(bucket === 'morning') return '朝 (5-11)';
    if(bucket === 'lunch') return '昼 (11-17)';
    if(bucket === 'night') return '夜 (17-23)';
    return '深夜 (23-5)';
  }
  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ダッシュボード</h1><p class="page-subtitle">学習進捗の全体像を把握しよう</p></div>

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
              return subjectCategories.filter(c=>c.id.startsWith('cat-vol')).map(cat=>{
                let done=0,total=0,correct=0;
                cat.subjects.forEach(s=>{
                  const rounds=qb[s.id]||{};
                  Object.values(rounds).forEach(r=>{done+=r.done||0;total+=r.total||0;correct+=r.correct||0;});
                });
                const pct=total>0?Math.round(done/total*100):0;
                const accPct=done>0?Math.round(correct/done*100):0;
                return`<div style="margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
                    <span style="font-weight:600;">${cat.name}</span>
                    <span style="font-weight:700;color:${pct>=80?'#10b981':pct>=50?'#f59e0b':'var(--color-text-secondary)'};">${pct}%</span>
                  </div>
                  <div style="height:8px;background:var(--color-bg-elevated);border-radius:4px;overflow:hidden;margin-bottom:2px;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:4px;transition:width 0.5s;"></div>
                  </div>
                  <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${done}/${total}問  正答率 ${done>0?accPct+'%':'---'}</div>
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
        const mDate = new Date(logicalToday); mDate.setMonth(logicalToday.getMonth() - m);
        const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
        mStart.setHours(5, 0, 0, 0);
        const lastDay = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0);
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
    const ds=new Date(d);ds.setHours(5,0,0,0);const de=new Date(d);de.setHours(28,59,59,999);
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
          <div class="timer-overlay animate-fade-in" style="position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--space-md); text-align:center;">
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
                <div style="display:flex; gap:12px; margin-top:8px;">
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
                  <span class="study-log-subject">${sub?.name||l.subject_name}</span>
                  <span class="study-log-duration">${formatMinutes(l.duration_minutes)}</span>
                  <span class="study-log-time">${tmStart}〜${tmEnd}</span>
                  ${l.location && l.location !== '未設定' ? `<span class="study-log-location" style="font-size:0.75rem; margin-left:4px; color:var(--color-text-tertiary)" title="${l.location}">${locIcon(l.location)} ${l.location}</span>` : ''}
                  ${l.focus_level ? `<span class="study-log-focus" style="font-size:0.8rem; margin-left:2px;" title="集中度: ${l.focus_level}">${focusEmoji(l.focus_level)} ${l.focus_level}</span>` : ''}
                </div>
                ${l.memo?`<div class="study-log-memo" style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.memo}</div>`:''}
              </div>
              <div class="study-log-actions">
                <button class="btn-log-action edit" data-id="${l.id}" data-subject="${sub?.name||l.subject_name}" data-duration="${l.duration_minutes}" data-startedat="${realStart.toISOString()}" data-endedat="${realEnd.toISOString()}" data-memo="${l.memo||''}" data-location="${l.location || ''}" data-focus="${l.focus_level || ''}" title="編集" style="font-size:0.75rem;padding:2px 8px;">編集</button>
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
    countdownSeconds = 25 * 60;
    baseCountdown = 25 * 60;
    initialCountdownSeconds = 25 * 60;
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
    
    if(isNaN(dur) || dur <= 0) { showToast(' 正しい時間を入力してください'); return; }
    if(!subjVal) { showToast(' 学習内容を入力してください'); return; }
    
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
      const success = await saveStudyLog(subjVal, dur, memo, focVal, locVal, startedAt, endedAt, sessionBreaks);
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

      if (!newDate || !newTime || isNaN(newDur) || newDur <= 0 || !subVal) {
        showToast(' 全ての項目を正しく入力してください');
        return;
      }

      const newStartedAt = new Date(`${newDate}T${newTime}`).toISOString();
      const newEndedAt = newEndTime ? new Date(`${newDate}T${newEndTime}`).toISOString() : null;
      await updateStudyLog(ds.id, subVal, newDur, newStartedAt, newMemo, newFoc, newLoc, newEndedAt);
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

// --- Community ---
async function renderCommunity(){
  const ct=document.getElementById('page-container');const col=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const realPosts = await fetchPosts();
  // Filter for privacy: Show Global (group_id null) OR if user is in that group
  const joinedGroupIds = myGroups.map(g => g.id);
  const visiblePosts = realPosts.filter(p => !p.group_id || joinedGroupIds.includes(p.group_id));
  const sorted=[...visiblePosts].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">質問広場</h1><p class="page-subtitle">仲間と知識を共有し、疑問を解決しよう</p></div>
    <div class="filter-tabs"><button class="filter-tab active" data-filter="all">すべて</button><button class="filter-tab" data-filter="question">${IC.question} 質問</button><button class="filter-tab" data-filter="activity">${IC.megaphone} アクティビティ</button></div>
    <div class="community-layout"><div class="community-main">
      <div class="post-creator-input" id="open-post-modal"><div class="avatar" style="background:${col}">${ini}</div><span class="post-creator-placeholder">質問内容や近況を書いてください...</span></div>
      <div class="post-feed" id="post-feed">${sorted.map(p=>renderPostCard(p)).join('')}</div></div>
      <div class="community-sidebar">
        <div class="card"><div class="card-header"><div class="card-title">${IC.bell}最新アクティビティ</div></div><div class="activity-list">${activityFeed.slice(0,5).map(a=>`<div class="activity-item"><div class="activity-icon">${a.icon}</div><div class="activity-content"><div class="activity-name">${a.name}</div><div class="activity-action">${a.action}</div></div><div class="activity-time">${a.time}</div></div>`).join('')}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">${IC.stats}広場の統計</div></div><div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">質問数</span><span style="font-weight:700;color:#45B7D1">${realPosts.filter(p=>p.type==='question').length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">回答数</span><span style="font-weight:700;color:#82E0AA">${realPosts.reduce((s,p)=>s+(p.comments?.length||0),0)}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">いいね</span><span style="font-weight:700;color:#F1948A">${realPosts.reduce((s,p)=>s+p.likes,0)}</span></div></div></div>
      </div>
    </div>
    <div class="modal-overlay" id="post-modal" style="display:none"><div class="modal-content"><div class="modal-header"><div class="modal-title">新しい投稿</div><button class="modal-close" id="close-post-modal">✕</button></div>
    <div class="modal-body">
      <div class="settings-field" style="margin-bottom:var(--space-md)">
        <label style="font-size:0.75rem;color:var(--color-text-tertiary);display:block;margin-bottom:4px;">投稿先</label>
        <select id="post-group-select" style="width:100%;background:var(--color-bg-input);border:1px solid var(--color-border);color:var(--color-text-primary);padding:8px;border-radius:var(--radius-sm);">
          <option value="">${IC.globe} 全体 (質問広場)</option>
          ${myGroups.map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}
        </select>
      </div>
      <input type="text" id="post-title-input" placeholder="タイトル（質問の場合）"/><textarea id="post-body-input" placeholder="質問内容や近況を書いてください..."></textarea></div><div class="modal-footer"><label class="anonymous-toggle"><input type="checkbox" id="post-anonymous"/> 匿名で投稿</label><button class="btn btn-primary" id="submit-post">投稿する</button></div></div></div>`;

  const modal=document.getElementById('post-modal');
  document.getElementById('open-post-modal').addEventListener('click',()=>modal.style.display='flex');
  document.getElementById('close-post-modal').addEventListener('click',()=>modal.style.display='none');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
  document.getElementById('submit-post').addEventListener('click',async ()=>{
    const b=document.getElementById('post-body-input').value;
    const t=document.getElementById('post-title-input').value;
    const anon=document.getElementById('post-anonymous').checked;
    const gid=document.getElementById('post-group-select').value || null;
    if(b.trim()){
      console.log('DEBUG: Submitting post from UI', { t, b, anon, gid });
      await savePost(t || null, b, t ? 'question' : 'activity', anon, gid);
      modal.style.display='none';
      renderCommunity();
    }
  });
  document.querySelectorAll('.filter-tab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    const f=tab.dataset.filter;const filtered=f==='all'?sorted:sorted.filter(p=>p.type===f);
    document.getElementById('post-feed').innerHTML=filtered.map(p=>renderPostCard(p)).join('');}));
  document.getElementById('post-feed').addEventListener('click', async (e) => {
    const lb=e.target.closest('[data-action="like"]');
    if(lb){lb.classList.toggle('liked');const sp=lb.querySelector('span');const c=parseInt(sp.textContent);sp.textContent=lb.classList.contains('liked')?c+1:c-1;}

    // Add delete post listener
    const db=e.target.closest('.btn-delete-post');
    if(db){
      const id=db.dataset.id;
      if(confirm('本当にこの投稿を削除しますか？')){await deletePost(id); renderCommunity();}
    }

    const btnReply = e.target.closest('.btn-submit-reply');
    if (btnReply) {
      const postId = btnReply.dataset.postId;
      const wrapper = btnReply.closest('.post-reply-input-wrapper');
      const input = wrapper.querySelector('.post-reply-input');
      const anonCheck = wrapper.querySelector('.post-reply-anonymous');
      const body = input.value.trim();
      const isAnon = anonCheck ? anonCheck.checked : false;
      if (!body) return;
      btnReply.disabled = true; btnReply.textContent = '...';
      const success = await savePostReply(postId, body, isAnon);
      if (success) { input.value = ''; renderCommunity(); }
      else { btnReply.disabled = false; btnReply.textContent = '送信'; }
    }

    const btnDelReply = e.target.closest('.btn-delete-reply');
    if (btnDelReply) {
      const id = btnDelReply.dataset.id;
      if (confirm('この返信を削除しますか？')) {
        await deletePostReply(id);
      }
    }
  });
}

// --- Ranking ---
let currentRankingGroup = null;
async function renderRanking(){
  const ct=document.getElementById('page-container');let period='weekly';
  if (myGroups.length > 0 && !currentRankingGroup) currentRankingGroup = myGroups[0].id;
  function posClass(i){return i===0?'gold':i===1?'silver':i===2?'bronze':'normal';}

  async function renderMain(p, gid){
    if (myGroups.length === 0) return `<div class="card"><div class="card-body" style="padding:var(--space-2xl);text-align:center;color:var(--color-text-secondary)">設定画面からグループを作成または参加すると<br>ランキングが表示されます。</div></div>`;
    if (!gid) return `<div class="card"><div class="card-body" style="padding:var(--space-2xl);text-align:center;color:var(--color-text-secondary)">グループを選択してください。</div></div>`;

    const s = await fetchGroupRanking(gid, p);
    const groupTabs = `<div class="tabs" style="margin-bottom:var(--space-lg);overflow-x:auto;white-space:nowrap;justify-content:flex-start;scrollbar-width:none">
      ${myGroups.map(g => `<button class="tab ${g.id === gid ? 'active' : ''}" data-group="${g.id}" style="flex:none">${g.name}</button>`).join('')}</div>`;
    if (s.length === 0) return groupTabs + `<div class="card"><div class="card-body" style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">データが見つかりません</div></div>`;

    const t3=s.slice(0,3);const pod=t3.length>=3?[t3[1],t3[0],t3[2]]:t3;
      const podiumHtml = `<div class="card animate-slide-up"><div class="card-header"><div class="card-title">${IC.trophy}表彰台</div>
      <div class="tabs" style="max-width:240px;margin:0"><button class="tab ${p==='daily'?'active':''}" data-period="daily">今日</button><button class="tab ${p==='weekly'?'active':''}" data-period="weekly">今週</button></div></div>
      <div class="ranking-podium">${pod.map((u,di)=>{const ar=di===0?(pod.length>1?2:1):di===1?1:3;const cr=ar===1?IC.crown:'';const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
        // Immediate reflection for ranking
        const avatarUrl = (u.userId === (session?.user?.id || currentUser.id)) ? currentUser.avatar_url : (u.avatarUrl || u.profiles?.avatar_url);
        let avHtml = `<div class="avatar avatar-lg" style="background:${c}">${ini}</div>`;
        if (avatarUrl && avatarUrl.startsWith('http')) {
          avHtml = `<div class="avatar avatar-lg" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${ini}'"/></div>`;
        }
        return`<div class="podium-item"><div class="podium-avatar">${cr?`<span class="podium-crown">${cr}</span>`:''}
          ${avHtml}</div>
          <div class="podium-name">${u.name}</div><div class="podium-time">${formatMinutes(u.total)}</div>
          <div class="podium-bar">${ar}</div></div>`;}).join('')}</div></div>`;

    const listHtml = `<div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">${IC.list}メンバーランキング</div></div>
        ${s.map((u,i)=>{const me=u.userId===(session?.user?.id || currentUser.id);const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
          // Immediate reflection for ranking list
          const avatarUrl = me ? currentUser.avatar_url : (u.avatarUrl || u.profiles?.avatar_url);
          let avHtml = `<div class="avatar avatar-sm" style="background:${c}">${ini}</div>`;
          if (avatarUrl && avatarUrl.startsWith('http')) {
            avHtml = `<div class="avatar avatar-sm" style="background:var(--color-bg-elevated); overflow:hidden;"><img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='${ini}'"/></div>`;
          }
          return`<div class="ranking-row ${me?'is-me':''}"><div class="ranking-position ${posClass(i)}">${i+1}</div>${avHtml}<div class="ranking-user-info"><div class="ranking-user-name">${u.name} ${me?'<span class="badge badge-teal">あなた</span>':''}</div></div><div class="ranking-time">${formatMinutes(u.total)}</div></div>`;}).join('')}</div>`;
    return groupTabs + podiumHtml + listHtml;
  }

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ランキング</h1><p class="page-subtitle">グループメンバーと学習時間を競い合おう</p></div>
    <div id="ranking-main"><div style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">読み込み中...</div></div>`;
      
  const mainWrapper = document.getElementById('ranking-main');
  mainWrapper.innerHTML = await renderMain(period, currentRankingGroup);

  mainWrapper.addEventListener('click', async (e)=>{
    const tp=e.target.closest('[data-period]');const tg=e.target.closest('[data-group]');
    if(tp) period=tp.dataset.period;
    if(tg) currentRankingGroup=tg.dataset.group;
    if(tp||tg){
      mainWrapper.innerHTML='<div style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">よみこみ中...</div>';
      mainWrapper.innerHTML=await renderMain(period, currentRankingGroup);
    }
  });
}

// --- Countdown Page ---
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
        // Partial DOM update - only refresh the list
        const listContainer = document.getElementById('cd-list-container');
        if (listContainer) listContainer.innerHTML = buildCountdownList();
        // Clear inputs
        if (nameInput) nameInput.value = '';
        if (dateInput) dateInput.value = '';
        // Re-attach delete handlers
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


// ==================== QB PROGRESS TRACKER ====================
let qbProgressLoaded=false;
function getQBProgress(){try{return JSON.parse(localStorage.getItem('medfocus_qb_progress')||'{}');}catch(e){return {};}}
async function loadQBFromSupabase(){
  if(!supabase||!session||qbProgressLoaded)return;
  try{
    const{data,error}=await supabase.from('profiles').select('qb_progress').eq('id',session.user.id).single();
    if(error){
      console.warn('qb load error:',error.message);
        console.warn('QB同期にはDBカラム追加が必要です');
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
      // Remote has no data yet, push local to remote
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
  if(supabase&&session){
    supabase.from('profiles').update({qb_progress:JSON.stringify(data)}).eq('id',session.user.id)
      .then(({error})=>{
        if(error){
          console.warn('qb sync error:',error.message);
          if(error.message.includes('qb_progress'))console.warn('QB save: qb_progressカラムがありません');
        }
      });
  }
}

async function renderQBProgress(){
  await loadQBFromSupabase();
  const ct=document.getElementById('page-container');
  const qb=getQBProgress();

  // Vol summaries
  const volSummary={};
  subjectCategories.filter(c=>c.id.startsWith('cat-vol')).forEach(cat=>{
    let done=0,total=0;
    cat.subjects.forEach(s=>{
      const rounds=qb[s.id]||{};
      Object.values(rounds).forEach(r=>{done+=r.done||0;total+=r.total||0;});
    });
    volSummary[cat.name]={done,total,pct:total>0?Math.round(done/total*100):0};
  });

  ct.innerHTML=`<div style="max-width:900px;margin:0 auto;">
    <div class="page-header"><h1 class="page-title">${IC.book}QB進捗トラッカー</h1><p class="page-subtitle">各科目の問題集進捗を管理</p></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
      ${Object.entries(volSummary).map(([name,v])=>`<div class="card" style="padding:14px;text-align:center;">
        <div style="font-size:0.75rem;color:var(--color-text-tertiary);">${name}</div>
        <div style="font-size:1.8rem;font-weight:800;color:${v.pct>=80?'#10b981':v.pct>=50?'#f59e0b':'var(--color-text-primary)'};">${v.pct}%</div>
        <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${v.done}/${v.total}問</div>
        <div style="margin-top:6px;height:5px;background:var(--color-bg-elevated);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${v.pct}%;background:linear-gradient(90deg,#4ECDC4,#45B7D1);border-radius:3px;"></div>
        </div>
      </div>`).join('')}
    </div>
    ${subjectCategories.filter(c=>c.id.startsWith('cat-vol')).map(cat=>{
      const volPct=volSummary[cat.name]?.pct||0;
      return`
      <div class="card" style="margin-bottom:16px;overflow:hidden;">
        <details>
          <summary style="padding:10px 14px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
            <span>${cat.name}</span>
            <span style="font-size:0.8rem;font-weight:600;color:${volPct>=80?'#10b981':volPct>=50?'#f59e0b':'var(--color-text-tertiary)'};">${volPct}%</span>
          </summary>
          <div style="padding:4px;border-top:1px solid var(--color-border);">
          ${cat.subjects.map(s=>{
            const rounds=qb[s.id]||{};
            const roundKeys=Object.keys(rounds).sort();
            const nextRound=roundKeys.length>0?parseInt(roundKeys[roundKeys.length-1])+1:1;
            return`<div style="padding:8px 6px;border-bottom:1px solid var(--color-border);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-weight:600;font-size:0.85rem;">${s.name}</span>
                <button class="qb-add-round" data-sub="${s.id}" data-round="${nextRound}" style="font-size:0.7rem;padding:3px 8px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-secondary);cursor:pointer;">+ ${nextRound}周目</button>
              </div>
              ${roundKeys.length>0?roundKeys.map(rk=>{
                const r=rounds[rk];const pct=r.total>0?Math.round(r.done/r.total*100):0;
                const correct=r.correct||0;const accPct=r.done>0?Math.round(correct/r.done*100):0;
                return`<div style="margin:0 0 8px 0;padding:8px;background:var(--color-bg-elevated);border-radius:8px;font-size:0.8rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-weight:700;color:var(--color-text-secondary);">${rk}周目</span>
                    <button class="qb-del-round" data-sub="${s.id}" data-round="${rk}" style="font-size:0.65rem;padding:1px 6px;background:none;border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-tertiary);cursor:pointer;">✕</button>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);min-width:28px;">進捗</span>
                    <input type="number" class="qb-done" data-sub="${s.id}" data-round="${rk}" value="${r.done}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span>/</span>
                    <input type="number" class="qb-total" data-sub="${s.id}" data-round="${rk}" value="${r.total}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${pct}%;background:${pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'};border-radius:3px;"></div>
                    </div>
                    <span style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;">${pct}%</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);min-width:28px;">正答</span>
                    <input type="number" class="qb-correct" data-sub="${s.id}" data-round="${rk}" value="${correct}" min="0" style="width:48px;text-align:center;padding:4px 2px;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:4px;color:var(--color-text-primary);font-size:0.8rem;">
                    <span style="font-size:0.7rem;color:var(--color-text-tertiary);">/ ${r.done}</span>
                    <div style="flex:1;min-width:40px;height:6px;background:var(--color-bg-base);border-radius:3px;overflow:hidden;">
                      <div style="height:100%;width:${accPct}%;background:${accPct>=80?'#3b82f6':accPct>=60?'#8b5cf6':'#ec4899'};border-radius:3px;"></div>
                    </div>
                    <span style="min-width:32px;text-align:right;font-weight:700;font-size:0.8rem;color:${accPct>=80?'#3b82f6':accPct>=60?'#8b5cf6':'#ec4899'};">${r.done>0?accPct+'%':'---'}</span>
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
  ct.querySelectorAll('.qb-add-round').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const sub=btn.dataset.sub,round=btn.dataset.round;
      const d=getQBProgress();if(!d[sub])d[sub]={};
      d[sub][round]={done:0,total:0,correct:0};
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
  ct.querySelectorAll('.qb-done,.qb-total,.qb-correct').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const sub=inp.dataset.sub,round=inp.dataset.round;
      const d=getQBProgress();
      if(!d[sub])d[sub]={};if(!d[sub][round])d[sub][round]={done:0,total:0,correct:0};
      if(inp.classList.contains('qb-done'))d[sub][round].done=parseInt(inp.value)||0;
      else if(inp.classList.contains('qb-total'))d[sub][round].total=parseInt(inp.value)||0;
      else if(inp.classList.contains('qb-correct'))d[sub][round].correct=parseInt(inp.value)||0;
      saveQBProgress(d);renderQBProgress();
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
  sessionLength: ''
};

function applyInsightFilters(logs) {
  let filtered = [...logs];
  const logicalToday = getLogicalDate(new Date());
  // Preset period
  if (insightFilters.preset === 'today') {
    const ds = new Date(logicalToday); ds.setHours(5,0,0,0);
    const de = new Date(logicalToday); de.setHours(28,59,59,999);
    filtered = filtered.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; });
  } else if (insightFilters.preset === 'week') {
    const day = logicalToday.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const mon = new Date(logicalToday); mon.setDate(logicalToday.getDate() - diff); mon.setHours(5,0,0,0);
    filtered = filtered.filter(l => new Date(l.started_at) >= mon);
  } else if (insightFilters.preset === 'month') {
    const ms = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 1); ms.setHours(5,0,0,0);
    filtered = filtered.filter(l => new Date(l.started_at) >= ms);
  } else if (insightFilters.preset === 'lastmonth') {
    const ms = new Date(logicalToday.getFullYear(), logicalToday.getMonth()-1, 1); ms.setHours(5,0,0,0);
    const me = new Date(logicalToday.getFullYear(), logicalToday.getMonth(), 0); me.setHours(28,59,59,999);
    filtered = filtered.filter(l => { const t = new Date(l.started_at); return t >= ms && t <= me; });
  } else if (insightFilters.preset === 'custom') {
    if (insightFilters.dateFrom) {
      const df = new Date(insightFilters.dateFrom); df.setHours(5,0,0,0);
      filtered = filtered.filter(l => new Date(l.started_at) >= df);
    }
    if (insightFilters.dateTo) {
      const dt = new Date(insightFilters.dateTo); dt.setHours(28,59,59,999);
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
};

async function renderInsights(){
  const ct=document.getElementById('page-container');
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

  // --- Subject distribution ---
  const subjectTimeMap = {};
  logs.forEach(l => {
    const k = normalizeSubjectName(l.subject_name);
    subjectTimeMap[k] = (subjectTimeMap[k] || 0) + l.duration_minutes;
  });
  const sortedSubjects = Object.entries(subjectTimeMap).sort((a,b) => b[1] - a[1]);

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
  const trendDays = Math.min(30, Math.max(7, studyDays + 3));
  const trendLabels = [], trendData = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(logicalToday); d.setDate(d.getDate() - i);
    const ds = new Date(d); ds.setHours(5,0,0,0);
    const de = new Date(d); de.setHours(28,59,59,999);
    const mins = logs.filter(l => { const t = new Date(l.started_at); return t >= ds && t <= de; }).reduce((s,l) => s + l.duration_minutes, 0);
    trendData.push(mins);
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
        <button class="filter-reset-btn" id="filter-reset">リセット</button>
      </div>
    </div>

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
    </div>

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
              <div class="session-subject">${normalizeSubjectName(l.subject_name)}</div>
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

  `;

  // --- Charts ---
  setTimeout(() => {
    if (typeof Chart !== 'undefined' && trendData.some(v => v > 0)) {
      destroyChart('insightTrendChart');
      const ctx = document.getElementById('insightTrendChart');
      if (ctx) {
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
}
// --- Settings ---
function renderSettings(){
  const ct=document.getElementById('page-container');
  const c=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);

  // Dynamic Group Cards Build
  const groupsHtml = myGroups.length === 0 
    ? `<div style="text-align:center;padding:var(--space-xl);color:var(--color-text-secondary);border:1px dashed var(--color-border);border-radius:var(--radius-lg)">現在参加しているグループはありません。下から作成するか参加してください。</div>`
    : myGroups.map(g => `
      <div class="settings-card" style="border-color:var(--color-border);margin-bottom:var(--space-sm);padding:var(--space-md) var(--space-lg)">
        <div class="settings-row">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="avatar" style="background:var(--color-bg-elevated);width:32px;height:32px;font-size:0.9rem; overflow:hidden;">
              ${g.icon_url 
                ? (g.icon_url.startsWith('http') 
                    ? `<img src="${g.icon_url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='G'"/>` 
                    : g.icon_url)
                : IC._s('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>')}
            </div>
          <div>
            <h4 style="margin:0;font-size:1.1rem;font-weight:600">${g.name}</h4>
            <div style="font-size:0.85rem;color:var(--color-text-secondary)">招待コード: <span style="font-weight:700;letter-spacing:1px;color:var(--color-text-primary)">${g.invite_code}</span></div>
          </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${g.created_by === (session?.user?.id || currentUser.id) 
              ? `<button class="btn btn-secondary btn-sm edit-group-btn" data-id="${g.id}" data-name="${g.name}" data-icon="${g.icon_url || ''}">編集</button>` 
              : ''}
            ${g.role === 'admin' ? '<span class="badge badge-teal" style="font-weight:700">管理者</span>' : `<button class="btn btn-secondary btn-sm btn-leave-group" data-id="${g.id}" style="color:var(--color-accent-pink);border-color:rgba(241,148,138,0.3)">退出</button>`}
          </div>
        </div>
      </div>
    `).join('');

  ct.innerHTML=`
  <div class="page-header">
    <h1 class="page-title">設定</h1>
    <p class="page-subtitle">プロフィールとグループの管理</p>
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
          <div style="padding:10px; background:var(--color-bg-elevated); border-radius:var(--radius-sm); font-family:monospace; font-weight:700; color:var(--color-accent-teal); display:flex; justify-content:space-between; align-items:center;">
            <span>${currentUser.login_id || '---'}</span>
            <span style="font-size:0.7rem; color:var(--color-text-tertiary); font-weight:normal;">※次回ログイン用</span>
          </div>
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

    <!-- Group Manage -->
    <div class="settings-card animate-slide-up" style="animation-delay:.16s">
      <h3 class="settings-section-title">${IC.users}所属グループ管理</h3>
      <div style="margin-bottom:var(--space-lg)">${groupsHtml}</div>
      <div style="display:flex; flex-direction:column; gap:var(--space-xl); border-top:1px solid var(--color-border); padding-top:var(--space-lg)">
        <div>
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:12px">➕ 新しいグループを作成</label>
          <div style="display:flex;flex-direction:column;gap:12px;background:var(--color-bg-elevated);padding:var(--space-md);border-radius:var(--radius-md)">
            <div style="display:grid;grid-template-columns:50px 1fr;gap:16px;align-items:center">
              <div id="new-group-icon-preview" class="avatar" style="background:var(--color-bg-input);width:50px;height:50px;font-size:1.5rem;display:flex;align-items:center;justify-content:center;overflow:hidden;">G</div>
              <div>
                <input type="hidden" id="new-group-icon" value="" />
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('new-group-icon-file').click()" style="width:100%;font-size:0.75rem">📷 画像を選択・アップロード</button>
                <input type="file" id="new-group-icon-file" accept="image/*" style="display:none" />
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <input type="text" id="new-group-name" placeholder="グループ名..." style="flex:1;font-size:0.9rem" />
              <button class="btn btn-primary btn-sm" id="btn-create-group" style="padding:0 20px">作成</button>
            </div>
          </div>
        </div>
        <div>
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:12px">🤝 既存のグループに参加</label>
          <div style="display:flex;gap:12px;background:var(--color-bg-elevated);padding:var(--space-md);border-radius:var(--radius-md);align-items:center">
            <input type="text" id="join-group-code" placeholder="招待コード (6文字)" style="flex:1;text-transform:uppercase;font-size:0.9rem;background:var(--color-bg-input)" />
            <button class="btn btn-secondary btn-sm" id="btn-join-group" style="padding:0 20px">参加</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Privacy Settings -->
    <div class="settings-card animate-slide-up" style="animation-delay:.20s">
      <h3 class="settings-section-title">${IC.shield}プライバシー設定</h3>
      <div class="settings-row" style="padding:0">
        <div style="flex:1">
          <div style="font-size:var(--font-size-base);font-weight:500;margin-bottom:var(--space-xs)">プロフィールを公開する</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary)">オンにすると、他のユーザーがランキングなどで進捗を確認できます</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="input-public" ${currentUser.is_public !== false ? 'checked' : ''}>
          <span class="slider round"></span>
        </label>
      </div>
    </div>

    <!-- Appearance -->
    <div class="settings-card animate-slide-up" style="animation-delay:.24s">
      <h3 class="settings-section-title">🎨 外観設定</h3>
      <div class="settings-row" style="padding:0">
        <div>
          <div style="font-size:var(--font-size-base);font-weight:500;margin-bottom:var(--space-xs)">${isDark?'ダークモード':'ライトモード'}</div>
        </div>
        <button class="theme-toggle" id="theme-btn-settings"></button>
      </div>
    </div>

    <!-- Edit Group Modal -->
    <div id="group-edit-modal" class="modal-overlay" style="display:none">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header"><h3 class="modal-title">グループ情報を編集</h3><button class="modal-close" id="btn-close-edit-modal">✕</button></div>
        <div class="modal-body">
          <div class="settings-field">
            <label>グループ名</label>
            <input type="text" id="edit-group-name" placeholder="グループ名を入力..." />
          </div>
          <div class="settings-field">
            <label>アイコン</label>
            <div style="display:grid;grid-template-columns:60px 1fr;gap:16px;align-items:center;margin-top:8px">
              <div id="edit-group-icon-preview" class="avatar avatar-lg" style="background:var(--color-bg-elevated);overflow:hidden">G</div>
              <div>
                <button class="btn btn-secondary btn-sm" id="btn-trigger-edit-file" style="width:100%">📷 画像を変更</button>
                <input type="file" id="edit-group-icon-file" accept="image/*" style="display:none" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="flex-direction:column;gap:8px">
          <button class="btn btn-primary" id="btn-save-group-edit" style="width:100%;justify-content:center">💾 変更を保存</button>
          <button class="btn btn-secondary" id="btn-cancel-group-edit" style="width:100%;justify-content:center">キャンセル</button>
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
      if (supabase && session) {
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

  // Group Icon Preview
  const updateGroupIconPreview = (val) => {
    const el = document.getElementById('new-group-icon-preview');
    if (!el) return;
    if (!val || !val.startsWith('http')) { el.innerHTML = 'G'; return; }
    el.innerHTML = `<img src="${val}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='?'"/>`;
  };
  document.getElementById('new-group-icon')?.addEventListener('input', e => updateGroupIconPreview(e.target.value));

  // Group icon file selection
  document.getElementById('new-group-icon-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = e.target.previousElementSibling;
    const orig = btn.textContent;
    btn.textContent = '処理中...'; btn.disabled = true;
    const url = await uploadImage(file);
    btn.textContent = orig; btn.disabled = false;
    if (url) {
      document.getElementById('new-group-icon').value = url;
      updateGroupIconPreview(url);
      showToast(' 画像を準備しました');
    }
  });

  // Group Edit Modal Logic
  const editModal = document.getElementById('group-edit-modal');
  let currentEditingGroupId = null;
  let currentEditingIconUrl = '';

  document.querySelectorAll('.edit-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEditingGroupId = btn.dataset.id;
      document.getElementById('edit-group-name').value = btn.dataset.name;
      currentEditingIconUrl = btn.dataset.icon;
      
      const prev = document.getElementById('edit-group-icon-preview');
      if (currentEditingIconUrl && currentEditingIconUrl.startsWith('http')) {
        prev.innerHTML = `<img src="${currentEditingIconUrl}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        prev.innerHTML = 'G';
      }
      
      editModal.style.display = 'flex';
    });
  });

  document.getElementById('btn-close-edit-modal').onclick = () => editModal.style.display = 'none';
  document.getElementById('btn-cancel-group-edit').onclick = () => editModal.style.display = 'none';
  
  document.getElementById('btn-trigger-edit-file').onclick = () => document.getElementById('edit-group-icon-file').click();
  
  document.getElementById('edit-group-icon-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('edit-group-icon-preview').innerHTML = '<div class="loading-spinner" style="width:20px;height:20px"></div>';
    const url = await uploadImage(file, 'avatars');
    if (url) {
      currentEditingIconUrl = url;
      document.getElementById('edit-group-icon-preview').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" />`;
    }
  };

  document.getElementById('btn-save-group-edit').addEventListener('click', async () => {
    const newName = document.getElementById('edit-group-name').value.trim();
    if (!newName) return;
    await updateGroup(currentEditingGroupId, newName, currentEditingIconUrl);
    editModal.style.display = 'none';
  });

  // Group Create/Join logic
  document.getElementById('btn-create-group')?.addEventListener('click', async (e) => {
    const nm = document.getElementById('new-group-name').value.trim();
    const pic = document.getElementById('new-group-icon').value.trim();
    if(!nm) { showToast(' グループ名を入力してください'); return; }
    const btn = e.target; const origText = btn.textContent;
    btn.textContent = '作成中...'; btn.disabled = true;
    try { await createGroup(nm, pic); } finally { btn.textContent = origText; btn.disabled = false; }
  });
  
  document.getElementById('btn-join-group')?.addEventListener('click', async (e) => {
    const cd = document.getElementById('join-group-code').value.trim();
    if(cd.length < 4) { showToast(' 正しい招待コードを入力してください'); return; }
    const btn = e.target; const origText = btn.textContent;
    btn.textContent = '参加中...'; btn.disabled = true;
    try { await joinGroup(cd); } finally { btn.textContent = origText; btn.disabled = false; }
  });
  
  document.querySelectorAll('.btn-leave-group').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('本当にこのグループから退出しますか？')) {
        const targetBtn = e.target; const origText = targetBtn.textContent;
        targetBtn.textContent = '処理中...'; targetBtn.disabled = true;
        try { await leaveGroup(targetBtn.dataset.id); } finally { targetBtn.textContent = origText; targetBtn.disabled = false; }
      }
    });
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
registerRoute('/community',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderCommunity();});
registerRoute('/countdown',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderCountdown();});
registerRoute('/ranking',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderRanking();});
registerRoute('/settings',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderSettings();});

async function initApp(){
  console.log('DEBUG: initApp started');
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
        }
        await fetchUserGroups().catch(e => console.warn('DEBUG: Group fetch failed:', e));
      }

      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        console.log('DEBUG: Auth state changed:', _event);
        session = newSession;
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
          await fetchUserGroups().catch(() => {});
        }
        renderRoute(currentRoute);
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
