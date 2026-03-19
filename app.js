console.log('DEBUG: app.js loaded');
// ============================================================
// MedFocus - Complete Application (No Build Tools)
// ============================================================

// ==================== CONFIG & SUPABASE ====================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
let supabase = null;

try {
  console.log('DEBUG: Checking Supabase initialization...', {available: !!window.supabase, url: SUPABASE_URL});
  if (window.supabase && !SUPABASE_URL.includes('your-project')) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('DEBUG: Supabase client created');
  } else {
    console.log('DEBUG: Supabase bypassed (demo mode)');
  }
} catch (e) {
  console.error('DEBUG: Supabase error:', e);
}

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

// ==================== DATA ====================
const currentUser = {
  id:'user-001', name:'田中 太郎', email:'tanaka@med.example-u.ac.jp',
  university:'東京大学医学部', grade:4, createdAt:'2025-04-01T00:00:00Z'
};

const users = [
  currentUser,
  {id:'user-002',name:'佐藤 花子',email:'sato@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-003',name:'鈴木 一郎',email:'suzuki@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-004',name:'高橋 美咲',email:'takahashi@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-005',name:'伊藤 健太',email:'ito@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-006',name:'渡辺 さくら',email:'watanabe@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-007',name:'山本 大輝',email:'yamamoto@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
  {id:'user-008',name:'中村 愛',email:'nakamura@med.example-u.ac.jp',university:'東京大学医学部',grade:4},
];

const groups = [{id:'group-001',name:'東大医4年 勉強会',inviteCode:'MED4TK',university:'東京大学医学部'}];
const groupMembers = users.map((u,i)=>({userId:u.id,groupId:'group-001',role:i===0?'admin':'member'}));

const subjectCategories = [
  {id:'cat-basic',name:'基礎医学',color:'#4ECDC4',subjects:[
    {id:'sub-anatomy',name:'解剖学',totalTopics:25},{id:'sub-physiology',name:'生理学',totalTopics:20},
    {id:'sub-biochem',name:'生化学',totalTopics:18},{id:'sub-pharma',name:'薬理学',totalTopics:22},
    {id:'sub-patho',name:'病理学',totalTopics:15},{id:'sub-micro',name:'微生物学',totalTopics:16}
  ]},
  {id:'cat-internal',name:'内科系',color:'#45B7D1',subjects:[
    {id:'sub-cardio',name:'循環器',totalTopics:20},{id:'sub-resp',name:'呼吸器',totalTopics:16},
    {id:'sub-gastro',name:'消化器',totalTopics:18},{id:'sub-renal',name:'腎臓',totalTopics:14},
    {id:'sub-endo',name:'内分泌',totalTopics:15},{id:'sub-hema',name:'血液',totalTopics:12},
    {id:'sub-immune',name:'免疫・膠原病',totalTopics:14}
  ]},
  {id:'cat-surgery',name:'外科系',color:'#F7DC6F',subjects:[
    {id:'sub-gensurg',name:'一般外科',totalTopics:16},{id:'sub-ortho',name:'整形外科',totalTopics:14},
    {id:'sub-neuro-s',name:'脳神経外科',totalTopics:12},{id:'sub-cardio-s',name:'心臓血管外科',totalTopics:10}
  ]},
  {id:'cat-minor',name:'マイナー',color:'#BB8FCE',subjects:[
    {id:'sub-eye',name:'眼科',totalTopics:12},{id:'sub-ent',name:'耳鼻咽喉科',totalTopics:12},
    {id:'sub-derm',name:'皮膚科',totalTopics:10},{id:'sub-uro',name:'泌尿器科',totalTopics:10},
    {id:'sub-obgyn',name:'産婦人科',totalTopics:16},{id:'sub-peds',name:'小児科',totalTopics:18}
  ]},
  {id:'cat-public',name:'公衆衛生',color:'#F1948A',subjects:[
    {id:'sub-pubhealth',name:'公衆衛生',totalTopics:14},{id:'sub-legal',name:'法医学',totalTopics:8},
    {id:'sub-stats',name:'医療統計',totalTopics:10}
  ]},
  {id:'cat-exam',name:'国試・CBT',color:'#F0B27A',subjects:[
    {id:'sub-cbt',name:'CBT対策',totalTopics:30},{id:'sub-kokushi',name:'国試過去問',totalTopics:40},
    {id:'sub-moshi',name:'模試',totalTopics:10}
  ]}
];

const subjectProgress = [
  {userId:'user-001',category:'基礎医学',subjectName:'解剖学',subjectId:'sub-anatomy',completedTopics:22,totalTopics:25},
  {userId:'user-001',category:'基礎医学',subjectName:'生理学',subjectId:'sub-physiology',completedTopics:15,totalTopics:20},
  {userId:'user-001',category:'基礎医学',subjectName:'生化学',subjectId:'sub-biochem',completedTopics:10,totalTopics:18},
  {userId:'user-001',category:'基礎医学',subjectName:'薬理学',subjectId:'sub-pharma',completedTopics:18,totalTopics:22},
  {userId:'user-001',category:'基礎医学',subjectName:'病理学',subjectId:'sub-patho',completedTopics:12,totalTopics:15},
  {userId:'user-001',category:'基礎医学',subjectName:'微生物学',subjectId:'sub-micro',completedTopics:8,totalTopics:16},
  {userId:'user-001',category:'内科系',subjectName:'循環器',subjectId:'sub-cardio',completedTopics:16,totalTopics:20},
  {userId:'user-001',category:'内科系',subjectName:'呼吸器',subjectId:'sub-resp',completedTopics:10,totalTopics:16},
  {userId:'user-001',category:'内科系',subjectName:'消化器',subjectId:'sub-gastro',completedTopics:14,totalTopics:18},
  {userId:'user-001',category:'内科系',subjectName:'腎臓',subjectId:'sub-renal',completedTopics:5,totalTopics:14},
  {userId:'user-001',category:'内科系',subjectName:'内分泌',subjectId:'sub-endo',completedTopics:8,totalTopics:15},
  {userId:'user-001',category:'内科系',subjectName:'血液',subjectId:'sub-hema',completedTopics:9,totalTopics:12},
  {userId:'user-001',category:'内科系',subjectName:'免疫・膠原病',subjectId:'sub-immune',completedTopics:6,totalTopics:14},
  {userId:'user-001',category:'外科系',subjectName:'一般外科',subjectId:'sub-gensurg',completedTopics:10,totalTopics:16},
  {userId:'user-001',category:'外科系',subjectName:'整形外科',subjectId:'sub-ortho',completedTopics:7,totalTopics:14},
  {userId:'user-001',category:'外科系',subjectName:'脳神経外科',subjectId:'sub-neuro-s',completedTopics:4,totalTopics:12},
  {userId:'user-001',category:'外科系',subjectName:'心臓血管外科',subjectId:'sub-cardio-s',completedTopics:3,totalTopics:10},
  {userId:'user-001',category:'マイナー',subjectName:'眼科',subjectId:'sub-eye',completedTopics:6,totalTopics:12},
  {userId:'user-001',category:'マイナー',subjectName:'耳鼻咽喉科',subjectId:'sub-ent',completedTopics:4,totalTopics:12},
  {userId:'user-001',category:'マイナー',subjectName:'皮膚科',subjectId:'sub-derm',completedTopics:3,totalTopics:10},
  {userId:'user-001',category:'マイナー',subjectName:'泌尿器科',subjectId:'sub-uro',completedTopics:2,totalTopics:10},
  {userId:'user-001',category:'マイナー',subjectName:'産婦人科',subjectId:'sub-obgyn',completedTopics:8,totalTopics:16},
  {userId:'user-001',category:'マイナー',subjectName:'小児科',subjectId:'sub-peds',completedTopics:10,totalTopics:18},
  {userId:'user-001',category:'公衆衛生',subjectName:'公衆衛生',subjectId:'sub-pubhealth',completedTopics:7,totalTopics:14},
  {userId:'user-001',category:'公衆衛生',subjectName:'法医学',subjectId:'sub-legal',completedTopics:3,totalTopics:8},
  {userId:'user-001',category:'公衆衛生',subjectName:'医療統計',subjectId:'sub-stats',completedTopics:5,totalTopics:10},
  {userId:'user-001',category:'国試・CBT',subjectName:'CBT対策',subjectId:'sub-cbt',completedTopics:20,totalTopics:30},
  {userId:'user-001',category:'国試・CBT',subjectName:'国試過去問',subjectId:'sub-kokushi',completedTopics:15,totalTopics:40},
  {userId:'user-001',category:'国試・CBT',subjectName:'模試',subjectId:'sub-moshi',completedTopics:4,totalTopics:10}
];

// Generate study logs
function generateStudyLogs(){
  const logs=[];const subs=['sub-cardio','sub-anatomy','sub-pharma','sub-gastro','sub-resp','sub-patho','sub-cbt','sub-kokushi'];const today=new Date();
  for(let d=0;d<14;d++){const date=new Date(today);date.setDate(date.getDate()-d);const n=Math.floor(Math.random()*4)+1;
    for(let s=0;s<n;s++){const h=8+Math.floor(Math.random()*12);const dur=20+Math.floor(Math.random()*100);
      const st=new Date(date);st.setHours(h,0,0,0);const en=new Date(st);en.setMinutes(en.getMinutes()+dur);
      logs.push({id:`log-${d}-${s}`,userId:'user-001',subjectId:subs[Math.floor(Math.random()*subs.length)],durationMinutes:dur,startedAt:st.toISOString(),endedAt:en.toISOString()});}}
  return logs;
}
const studyLogs = generateStudyLogs();

const userStudyTotals = [
  {userId:'user-001',name:'田中 太郎',weeklyMinutes:0,dailyMinutes:0},
  {userId:'user-002',name:'佐藤 花子',weeklyMinutes:1850,dailyMinutes:290},
  {userId:'user-003',name:'鈴木 一郎',weeklyMinutes:2100,dailyMinutes:340},
  {userId:'user-004',name:'高橋 美咲',weeklyMinutes:1600,dailyMinutes:210},
  {userId:'user-005',name:'伊藤 健太',weeklyMinutes:1950,dailyMinutes:310},
  {userId:'user-006',name:'渡辺 さくら',weeklyMinutes:2250,dailyMinutes:360},
  {userId:'user-007',name:'山本 大輝',weeklyMinutes:1400,dailyMinutes:180},
  {userId:'user-008',name:'中村 愛',weeklyMinutes:1750,dailyMinutes:250}
];

// Calculate current user times
(()=>{const now=new Date();const w=new Date(now);w.setDate(w.getDate()-7);const td=new Date(now);td.setHours(0,0,0,0);
  const me=userStudyTotals.find(u=>u.userId==='user-001');
  me.weeklyMinutes=studyLogs.filter(l=>new Date(l.startedAt)>=w).reduce((s,l)=>s+l.durationMinutes,0);
  me.dailyMinutes=studyLogs.filter(l=>new Date(l.startedAt)>=td).reduce((s,l)=>s+l.durationMinutes,0);
})();

const posts = [
  {id:'post-001',userId:'user-002',type:'question',title:'僧帽弁閉鎖不全症の聴診所見について',body:'僧帽弁閉鎖不全症で汎収縮期雑音が聞こえる理由がよくわかりません。大動脈弁狭窄症との鑑別ポイントも含めて教えていただけると助かります。',isAnonymous:false,createdAt:'2026-03-19T08:30:00Z',likes:5,
    comments:[{id:'c-001',postId:'post-001',userId:'user-001',body:'MRは左室→左房への逆流が収縮期全体を通じて起こるから汎収縮期雑音になります。ASは駆出性だから菱形型の雑音パターンです。',isAnonymous:false,createdAt:'2026-03-19T08:45:00Z'},
      {id:'c-002',postId:'post-001',userId:'user-003',body:'頸部への放散があればASを疑います。腋窩への放散ならMRです。',isAnonymous:false,createdAt:'2026-03-19T09:00:00Z'}]},
  {id:'post-002',userId:'user-004',type:'question',title:'ネフローゼ症候群の分類で混乱しています',body:'微小変化型と膜性腎症の違いが覚えられません。まとめ方のコツがあれば教えてください。',isAnonymous:false,createdAt:'2026-03-18T22:15:00Z',likes:8,
    comments:[{id:'c-003',postId:'post-002',userId:'user-005',body:'表で整理すると覚えやすいです！微小変化型：小児に多い、選択性蛋白尿、ステロイド著効。膜性腎症：成人に多い、非選択性蛋白尿。',isAnonymous:false,createdAt:'2026-03-18T22:40:00Z'}]},
  {id:'post-003',userId:'user-006',type:'question',title:'薬理学のゴロ合わせを共有しませんか？',body:'β遮断薬の分類（ISA+/ISA-）やCa拮抗薬のDHP系/非DHP系の区別で良いゴロ合わせがあれば教えてください！',isAnonymous:true,createdAt:'2026-03-18T20:00:00Z',likes:12,comments:[]},
  {id:'post-004',userId:'user-007',type:'activity',title:null,body:'循環器の勉強を開始しました 🫀',isAnonymous:false,createdAt:'2026-03-19T10:00:00Z',likes:3,comments:[]},
  {id:'post-005',userId:'user-008',type:'activity',title:null,body:'生化学のまとめノートが完成しました 📘',isAnonymous:false,createdAt:'2026-03-19T09:30:00Z',likes:6,comments:[]},
  {id:'post-006',userId:'user-003',type:'question',title:'CBT対策のおすすめ問題集',body:'CBT対策に「QAssist」と「medu4」のどちらが良いか迷っています。4年の皆さんはどちらを使っていますか？',isAnonymous:false,createdAt:'2026-03-18T15:00:00Z',likes:15,
    comments:[{id:'c-004',postId:'post-006',userId:'user-001',body:'自分はQAssist使ってます。動画の解説もわかりやすいです。',isAnonymous:false,createdAt:'2026-03-18T15:20:00Z'},
      {id:'c-005',postId:'post-006',userId:'user-006',body:'medu4の方がコンパクトで要点がまとまっている気がします。好みですね！',isAnonymous:false,createdAt:'2026-03-18T16:00:00Z'}]}
];

const examCountdowns = [
  {id:'exam-001',name:'CBT',date:'2026-08-20T09:00:00+09:00',color:'#4ECDC4'},
  {id:'exam-002',name:'本試験',date:'2027-02-06T09:00:00+09:00',color:'#45B7D1'},
  {id:'exam-003',name:'内科学中間試験',date:'2026-05-15T09:00:00+09:00',color:'#F7DC6F'}
];

const activityFeed = [
  {name:'山本 大輝',action:'循環器の勉強を開始しました',time:'10分前',icon:'🫀'},
  {name:'中村 愛',action:'生化学のまとめノートが完成しました',time:'30分前',icon:'📘'},
  {name:'佐藤 花子',action:'解剖学で2時間勉強しました',time:'1時間前',icon:'📖'},
  {name:'伊藤 健太',action:'国試過去問を30問解きました',time:'2時間前',icon:'✏️'},
  {name:'鈴木 一郎',action:'薬理学の進捗が80%になりました',time:'3時間前',icon:'🎯'},
  {name:'渡辺 さくら',action:'呼吸器の勉強を開始しました',time:'4時間前',icon:'🫁'},
  {name:'高橋 美咲',action:'質問を投稿しました',time:'5時間前',icon:'❓'}
];

// ==================== THEME ====================
let isDark = localStorage.getItem('medfocus-theme') !== 'light';
function applyTheme(){
  if(isDark){ document.documentElement.classList.remove('light'); }
  else { document.documentElement.classList.add('light'); }
  localStorage.setItem('medfocus-theme', isDark ? 'dark' : 'light');
  // Update Chart.js defaults
  const textColor = isDark ? '#94a3b8' : '#3d6380';
  const borderColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(43,181,171,0.15)';
  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = borderColor;
}
function toggleTheme(){ isDark = !isDark; applyTheme(); renderSidebar(); }
applyTheme();

// ==================== TOAST ====================
function showToast(msg){
  let t = document.getElementById('toast-notif');
  if(!t){ t = document.createElement('div'); t.id='toast-notif'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(()=>{ t.classList.add('show'); });
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove('show'); }, 2800);
}

// ==================== HELPERS ====================
function formatMinutes(m){const h=Math.floor(m/60);const min=m%60;if(h===0)return`${min}分`;if(min===0)return`${h}時間`;return`${h}時間${min}分`;}
function daysUntil(d){return Math.max(0,Math.ceil((new Date(d)-new Date())/(1000*60*60*24)));}
function timeAgo(d){const ms=new Date()-new Date(d);const m=Math.floor(ms/60000);const h=Math.floor(ms/3600000);const dy=Math.floor(ms/86400000);if(m<1)return'たった今';if(m<60)return`${m}分前`;if(h<24)return`${h}時間前`;if(dy<7)return`${dy}日前`;return new Date(d).toLocaleDateString('ja-JP');}
function getInitials(n){if(!n)return'?';const p=n.split(' ');return p.length>=2?p[0][0]+p[1][0]:n.slice(0,2);}
const avatarColors=['#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#F7DC6F','#BB8FCE','#85C1E9','#F1948A','#82E0AA','#F0B27A','#AED6F1'];
function getAvatarColor(id){let h=0;for(let i=0;i<id.length;i++)h=id.charCodeAt(i)+((h<<5)-h);return avatarColors[Math.abs(h)%avatarColors.length];}

// ==================== CHART HELPERS ====================
// ==================== SUPABASE DATA HELPERS ====================
async function fetchStudyLogs() {
  if (!supabase || !session) return [];
  const { data, error } = await supabase.from('study_logs').select('*').eq('user_id', session.user.id).order('started_at', { ascending: false });
  return error ? [] : data;
}

async function saveStudyLog(subjectId, durationMinutes) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('study_logs').insert([{ 
    user_id: session.user.id, 
    subject_name: subjectId, 
    duration_minutes: durationMinutes 
  }]);
  if (error) showToast('❌ 保存に失敗しました');
  else showToast('✅ 勉強記録を保存しました！');
}

async function fetchPosts() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  return error ? [] : data;
}

async function savePost(title, body, type, isAnonymous) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('posts').insert([{ 
    user_id: session.user.id, 
    title, body, type, is_anonymous: isAnonymous 
  }]);
  if (error) showToast('❌ 投稿に失敗しました');
  else showToast('✅ 投稿しました！');
}

Chart.defaults.color='#94a3b8';
Chart.defaults.borderColor='rgba(148,163,184,0.12)';
Chart.defaults.font.family="'Inter','Noto Sans JP',sans-serif";

function createRadarChart(canvasId,labels,data){
  destroyChart(canvasId);const ctx=document.getElementById(canvasId);if(!ctx)return;
  chartInstances[canvasId]=new Chart(ctx,{type:'radar',data:{labels,datasets:[{label:'進捗率',data,
    backgroundColor:'rgba(78,205,196,0.15)',borderColor:'#4ECDC4',borderWidth:2,
    pointBackgroundColor:'#4ECDC4',pointBorderColor:'#0a0e1a',pointBorderWidth:2,pointRadius:5}]},
  options:{responsive:true,maintainAspectRatio:true,scales:{r:{beginAtZero:true,max:100,ticks:{stepSize:20,display:false},
    grid:{color:'rgba(148,163,184,0.08)'},angleLines:{color:'rgba(148,163,184,0.08)'},
    pointLabels:{font:{size:11,weight:'500'},color:'#94a3b8'}}},
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a2332',titleColor:'#f0f4f8',bodyColor:'#94a3b8',
    borderColor:'rgba(78,205,196,0.3)',borderWidth:1,cornerRadius:8,callbacks:{label:c=>`${c.raw}%`}}},
  animation:{duration:1000,easing:'easeOutQuart'}}});
}

function createBarChart(canvasId,labels,data){
  destroyChart(canvasId);const ctx=document.getElementById(canvasId);if(!ctx)return;
  chartInstances[canvasId]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'勉強時間(分)',data,
    backgroundColor:(context)=>{const{ctx:c,chartArea}=context.chart;if(!chartArea)return'#4ECDC4';
      const g=c.createLinearGradient(0,chartArea.bottom,0,chartArea.top);
      g.addColorStop(0,'rgba(78,205,196,0.4)');g.addColorStop(1,'rgba(69,183,209,0.8)');return g;},
    borderRadius:6,borderSkipped:false,maxBarThickness:40}]},
  options:{responsive:true,maintainAspectRatio:true,scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(148,163,184,0.06)'}}},
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a2332',titleColor:'#f0f4f8',bodyColor:'#94a3b8',borderColor:'rgba(78,205,196,0.3)',borderWidth:1,cornerRadius:8}},
  animation:{duration:800,easing:'easeOutQuart'}}});
}

// ==================== STOPWATCH ====================
let timerInterval=null,elapsedSeconds=0,isRunning=false;
function startSW(onTick){if(isRunning)return;isRunning=true;timerInterval=setInterval(()=>{elapsedSeconds++;if(onTick)onTick(elapsedSeconds);},1000);}
function pauseSW(){isRunning=false;if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
function resetSW(){pauseSW();elapsedSeconds=0;}
function fmtSW(t){const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;const p=n=>String(n).padStart(2,'0');
  return h>0?`${p(h)}:${p(m)}<span class="seconds">:${p(s)}</span>`:`${p(m)}<span class="seconds">:${p(s)}</span>`;}

// ==================== AUTH UI ====================
function renderLogin(){
  const app = document.getElementById('app');
  document.body.classList.add('hide-sidebar');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">M</div>
          <h1 class="auth-title">${isSignUpMode ? 'アカウント作成' : 'ログイン'}</h1>
          <p class="auth-subtitle">${isSignUpMode ? 'MedFocusへようこそ！情報を入力してください' : 'メールアドレスとパスワードでログイン'}</p>
        </div>
        <form class="auth-form" id="auth-form">
          ${isSignUpMode ? `
            <div class="auth-field">
              <label>名前</label>
              <input type="text" id="auth-name" placeholder="例: 田中 太郎" required />
            </div>
          ` : ''}
          <div class="auth-field">
            <label>メールアドレス</label>
            <input type="email" id="auth-email" placeholder="example@med.ac.jp" required />
          </div>
          <div class="auth-field">
            <label>パスワード</label>
            <input type="password" id="auth-password" placeholder="••••••••" required minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:12px">
            ${isSignUpMode ? '新規登録' : 'ログイン'}
          </button>
        </form>
        <div class="auth-footer">
          ${isSignUpMode ? '既にアカウントをお持ちですか？' : 'アカウントをまだお持ちでないですか？'}
          <span class="auth-link" id="auth-toggle">${isSignUpMode ? 'ログイン' : '新規登録'}</span>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--color-text-tertiary);cursor:pointer;" id="demo-login">
          (設定せずに試す)
        </div>
      </div>
    </div>
  `;

  document.getElementById('auth-toggle').onclick = () => { isSignUpMode = !isSignUpMode; renderLogin(); };
  document.getElementById('demo-login').onclick = () => mockLogin('demo@example.com');
  document.getElementById('auth-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if(isSignUpMode) {
      const name = document.getElementById('auth-name').value;
      handleSignUp(email, password, name);
    } else {
      handleLogin(email, password);
    }
  };
}

async function handleLogin(email, password) {
  if(!supabase || SUPABASE_KEY === 'your-anon-key') { mockLogin(email); return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) { showToast('❌ ' + error.message); }
}

async function handleSignUp(email, password, name) {
  if(!supabase || SUPABASE_KEY === 'your-anon-key') { showToast('⚠️ Supabaseキーを設定してください'); return; }
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if(error) { showToast('❌ ' + error.message); }
  else { 
    // Create initial profile
    const user = data.user;
    if (user) {
      await supabase.from('profiles').insert([{ id: user.id, full_name: name, university: '未設定', grade: 1 }]);
    }
    if (data.session) {
      showToast('✅ アカウントを作成しました！');
    } else {
      showToast('📧 確認メールを送信しました。メールのリンクをクリックしてください。'); 
    }
  }
}

function handleLogout() {
  if(supabase && SUPABASE_KEY !== 'your-anon-key') supabase.auth.signOut();
  else { session = null; location.reload(); }
}

function mockLogin(email) {
  session = { user: { email, id: 'user-001' } };
  showToast('✅ ログインしました（デモモード）');
  renderRoute(currentRoute);
}

// ==================== SIDEBAR ====================
const navItems=[
  {route:'/',label:'ダッシュボード',icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'},
  {route:'/study',label:'学習タイマー',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>'},
  {route:'/community',label:'質問広場',icon:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'},
  {route:'/ranking',label:'ランキング',icon:'<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'},
  {route:'/settings',label:'設定',icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'}
];

function renderSidebar(){
  const sb=document.getElementById('sidebar');const path=currentRoute;
  const c=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const themeIcon=isDark?'🌙':'☀️';
  const themeLabel=isDark?'ダークモード':'ライトモード';
  sb.innerHTML=`<div class="sidebar-header"><div class="sidebar-logo"><div class="sidebar-logo-icon">M</div><span class="sidebar-logo-text">MedFocus</span></div></div>
    <nav class="sidebar-nav">${navItems.map(i=>`<div class="nav-item ${path===i.route?'active':''}" data-route="${i.route}"><div class="nav-item-icon">${i.icon}</div><span>${i.label}</span></div>`).join('')}</nav>
    <div class="sidebar-theme-row"><span class="sidebar-theme-label">${themeIcon} ${themeLabel}</span><button class="theme-toggle" id="theme-btn" title="テーマ切り替え"></button></div>
    <div class="sidebar-profile" id="logout-btn" title="クリックでログアウト" style="cursor:pointer">
      <div class="sidebar-avatar" style="background:${c}">${ini}</div>
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${currentUser.name}</div>
        <div class="sidebar-profile-role">${currentUser.university} ${currentUser.grade}年</div>
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
  const name=post.is_anonymous?'匿名ユーザー':(post.user_id === currentUser.id ? currentUser.name : '他のユーザー');
  const col=post.is_anonymous?'#64748b':getAvatarColor(post.user_id);
  const ini=post.is_anonymous?'匿':getInitials(name);
  const badge=post.type==='activity'?'<span class="post-type-badge post-type-activity">📢 アクティビティ</span>':'<span class="post-type-badge post-type-question">❓ 質問</span>';
  // Note: Comments implementation will be added later if needed
  const cmts=''; 
  return`<article class="post-card animate-slide-up"><div class="post-card-header"><div class="avatar" style="background:${col}">${ini}</div><div class="post-author-info"><div class="post-author-name">${name} ${badge}</div><div class="post-author-meta">${timeAgo(post.created_at)}</div></div></div>${post.title?`<h3 class="post-card-title">${post.title}</h3>`:''}<div class="post-card-body">${post.body}</div><div class="post-card-actions"><button class="post-action" data-action="like">❤️ <span>${post.likes || 0}</span></button><button class="post-action">💬 <span>0</span></button></div>${cmts}</article>`;
}

// ==================== PAGES ====================

// --- Dashboard ---
async function renderDashboard(){
  const ct=document.getElementById('page-container');
  const logs = await fetchStudyLogs();
  
  const totalT=subjectProgress.reduce((s,p)=>s+p.totalTopics,0);
  const compT=subjectProgress.reduce((s,p)=>s+p.completedTopics,0);
  const overall=Math.round((compT/totalT)*100);
  const today=new Date();const todayS=new Date(today);todayS.setHours(0,0,0,0);
  const weekS=new Date(today);weekS.setDate(weekS.getDate()-7);
  const todayMin=logs.filter(l=>new Date(l.started_at)>=todayS).reduce((s,l)=>s+l.duration_minutes,0);
  const weekMin=logs.filter(l=>new Date(l.started_at)>=weekS).reduce((s,l)=>s+l.duration_minutes,0);
  const studied=new Set(subjectProgress.filter(p=>p.completedTopics>0).map(p=>p.subjectName)).size;

  const catProg=subjectCategories.map(cat=>{
    const cs=subjectProgress.filter(p=>p.category===cat.name);
    const t=cs.reduce((s,p)=>s+p.totalTopics,0);const c=cs.reduce((s,p)=>s+p.completedTopics,0);
    return{name:cat.name,color:cat.color,progress:t>0?Math.round((c/t)*100):0};
  });

  const dailyD=[],dailyL=[];
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);
    const ds=new Date(d);ds.setHours(0,0,0,0);const de=new Date(d);de.setHours(23,59,59,999);
    dailyD.push(logs.filter(l=>{const t=new Date(l.started_at);return t>=ds&&t<=de;}).reduce((s,l)=>s+l.duration_minutes,0));
    dailyL.push(d.toLocaleDateString('ja-JP',{weekday:'short'}));}

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ダッシュボード</h1><p class="page-subtitle">学習進捗の全体像を把握しよう</p></div>
    <div class="dashboard-stats">
      <div class="stat-card animate-slide-up"><div class="stat-label">📊 総合進捗率</div><div class="stat-value">${overall}<span class="stat-unit">%</span></div><div class="stat-change positive">▲ ${compT}/${totalT} トピック完了</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.05s"><div class="stat-label">⏱ 今日の勉強</div><div class="stat-value">${formatMinutes(todayMin)}</div><div class="stat-change positive">▲ 集中して頑張っています</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.1s"><div class="stat-label">📅 今週の合計</div><div class="stat-value">${formatMinutes(weekMin)}</div><div class="stat-change positive">▲ ${Math.round(weekMin/7)}分/日平均</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.15s"><div class="stat-label">📚 学習中の科目</div><div class="stat-value">${studied}<span class="stat-unit">科目</span></div><div class="stat-change positive">▲ 全${subjectProgress.length}科目中</div></div>
    </div>
    <div class="dashboard-charts">
      <div class="card animate-slide-up" style="animation-delay:.2s"><div class="card-header"><div class="card-title">📊 週間学習時間</div></div><div class="chart-container"><canvas id="weeklyBarChart"></canvas></div></div>
      <div class="card animate-slide-up" style="animation-delay:.25s"><div class="card-header"><div class="card-title">🎯 カテゴリ別進捗</div></div><div class="chart-container"><canvas id="categoryRadarChart"></canvas></div></div>
    </div>
    <div class="dashboard-bottom">
      <div class="card animate-slide-up" style="animation-delay:.3s"><div class="card-header"><div class="card-title">📈 カテゴリ別進捗率</div></div>
        <div class="category-progress-list">${catProg.map(c=>`<div class="category-progress-item"><div class="category-progress-header"><span class="category-progress-name"><span class="dot" style="background:${c.color}"></span>${c.name}</span><span class="category-progress-value">${c.progress}%</span></div><div class="progress-bar"><div class="progress-bar-fill" style="width:0%;background:${c.color}" data-width="${c.progress}"></div></div></div>`).join('')}</div></div>
      <div class="card animate-slide-up" style="animation-delay:.35s"><div class="card-header"><div class="card-title">🔔 仲間のアクティビティ</div></div>
        <div class="activity-list">${activityFeed.map(a=>`<div class="activity-item"><div class="activity-icon">${a.icon}</div><div class="activity-content"><div class="activity-name">${a.name}</div><div class="activity-action">${a.action}</div></div><div class="activity-time">${a.time}</div></div>`).join('')}</div></div>
    </div>`;

  setTimeout(()=>{
    createBarChart('weeklyBarChart',dailyL,dailyD);
    createRadarChart('categoryRadarChart',catProg.map(c=>c.name),catProg.map(c=>c.progress));
    document.querySelectorAll('.progress-bar-fill').forEach(b=>{const w=b.dataset.width;requestAnimationFrame(()=>{b.style.width=w+'%';});});
  },100);
}

// --- Study ---
async function renderStudy(){
  const ct=document.getElementById('page-container');
  const logs = await fetchStudyLogs();
  const allSubjects=subjectCategories.flatMap(c=>c.subjects.map(s=>({...s,category:c.name})));
  const today=new Date();const logsByDay={};
  for(let i=0;i<7;i++){const d=new Date(today);d.setDate(d.getDate()-i);
    const key=d.toLocaleDateString('ja-JP',{month:'short',day:'numeric',weekday:'short'});
    const ds=new Date(d);ds.setHours(0,0,0,0);const de=new Date(d);de.setHours(23,59,59,999);
    logsByDay[key]=logs.filter(l=>{const t=new Date(l.started_at);return t>=ds&&t<=de;});}

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">学習タイマー</h1><p class="page-subtitle">集中して勉強時間を記録しよう</p></div>
    <div class="study-layout">
      <div class="stopwatch-card card animate-slide-up">
        <svg width="0" height="0"><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ECDC4"/><stop offset="100%" stop-color="#45B7D1"/></linearGradient></defs></svg>
        <div class="stopwatch-subject-selector"><select id="study-subject"><option value="">-- 科目を選択 --</option>${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>`).join('')}</select></div>
        <div class="stopwatch-display"><div class="stopwatch-ring"><svg viewBox="0 0 300 300"><circle class="ring-bg" cx="150" cy="150" r="140"/><circle class="ring-progress" id="timer-ring" cx="150" cy="150" r="140"/></svg><div class="stopwatch-time" id="timer-display">${fmtSW(elapsedSeconds)}</div></div></div>
        <div class="stopwatch-controls">
          <button class="stopwatch-btn stopwatch-btn-reset" id="btn-reset" title="リセット">↺</button>
          <button class="stopwatch-btn ${isRunning?'stopwatch-btn-pause':'stopwatch-btn-start'}" id="btn-toggle">${isRunning?'⏸':'▶'}</button>
          <button class="stopwatch-btn stopwatch-btn-stop" id="btn-save" title="保存">⏹</button>
        </div>
        <div class="stopwatch-status ${isRunning?'recording':''}" id="timer-status">${isRunning?'<span class="status-dot"></span>記録中...':'開始ボタンを押して勉強を始めましょう'}</div>
      </div>
      <div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">📋 最近の学習ログ</div></div>
        <div class="study-log-list">${Object.entries(logsByDay).map(([day,logs])=>{if(!logs.length)return'';const tot=logs.reduce((s,l)=>s+l.duration_minutes,0);
          return`<div class="study-log-day"><div class="study-log-day-header">${day} <span class="day-total">(計 ${formatMinutes(tot)})</span></div>${logs.map(l=>{const sub=allSubjects.find(s=>s.id===l.subject_name);const tm=new Date(l.started_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
            return`<div class="study-log-entry"><span class="study-log-subject">${sub?.name||l.subject_name}</span><span class="study-log-duration">${formatMinutes(l.duration_minutes)}</span><span class="study-log-time">${tm}</span></div>`;}).join('')}</div>`;}).join('')}</div></div>
    </div>`;

  const display=document.getElementById('timer-display');const ring=document.getElementById('timer-ring');
  const status=document.getElementById('timer-status');const btnT=document.getElementById('btn-toggle');
  const circ=2*Math.PI*140;
  function upd(s){display.innerHTML=fmtSW(s);const p=(s%3600)/3600;ring.style.strokeDashoffset=circ-(p*circ);}
  if(isRunning){ring.style.strokeDasharray=circ;startSW(upd);}
  else if(elapsedSeconds>0){ring.style.strokeDasharray=circ;upd(elapsedSeconds);}

  btnT.addEventListener('click',()=>{ring.style.strokeDasharray=circ;
    if(isRunning){pauseSW();btnT.className='stopwatch-btn stopwatch-btn-start';btnT.textContent='▶';status.className='stopwatch-status';status.textContent='一時停止中';}
    else{startSW(upd);btnT.className='stopwatch-btn stopwatch-btn-pause';btnT.textContent='⏸';status.className='stopwatch-status recording';status.innerHTML='<span class="status-dot"></span>記録中...';}});
  document.getElementById('btn-reset').addEventListener('click',()=>{resetSW();display.innerHTML=fmtSW(0);ring.style.strokeDashoffset=circ;btnT.className='stopwatch-btn stopwatch-btn-start';btnT.textContent='▶';status.className='stopwatch-status';status.textContent='開始ボタンを押して勉強を始めましょう';});
  document.getElementById('btn-save').addEventListener('click',async ()=>{if(elapsedSeconds>0){const sel=document.getElementById('study-subject');const subId=sel.value;const nm=sel.options[sel.selectedIndex]?.text||'未選択';await saveStudyLog(subId||nm,Math.ceil(elapsedSeconds/60));resetSW();display.innerHTML=fmtSW(0);ring.style.strokeDashoffset=circ;btnT.className='stopwatch-btn stopwatch-btn-start';btnT.textContent='▶';status.className='stopwatch-status';status.textContent='記録を保存しました 🎉';renderStudy();}});
}

// --- Community ---
async function renderCommunity(){
  const ct=document.getElementById('page-container');const col=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const realPosts = await fetchPosts();
  const sorted=[...realPosts].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">質問広場</h1><p class="page-subtitle">仲間と知識を共有し、疑問を解決しよう</p></div>
    <div class="filter-tabs"><button class="filter-tab active" data-filter="all">すべて</button><button class="filter-tab" data-filter="question">❓ 質問</button><button class="filter-tab" data-filter="activity">📢 アクティビティ</button></div>
    <div class="community-layout"><div class="community-main">
      <div class="post-creator-input" id="open-post-modal"><div class="avatar" style="background:${col}">${ini}</div><span class="post-creator-placeholder">質問や近況を投稿する...</span></div>
      <div class="post-feed" id="post-feed">${sorted.map(p=>renderPostCard(p)).join('')}</div></div>
      <div class="community-sidebar">
        <div class="card"><div class="card-header"><div class="card-title">🔔 最新アクティビティ</div></div><div class="activity-list">${activityFeed.slice(0,5).map(a=>`<div class="activity-item"><div class="activity-icon">${a.icon}</div><div class="activity-content"><div class="activity-name">${a.name}</div><div class="activity-action">${a.action}</div></div><div class="activity-time">${a.time}</div></div>`).join('')}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">📊 広場の統計</div></div><div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">質問数</span><span style="font-weight:700;color:#45B7D1">${realPosts.filter(p=>p.type==='question').length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">回答数</span><span style="font-weight:700;color:#82E0AA">${realPosts.reduce((s,p)=>s+(p.comments?.length||0),0)}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="font-size:.8125rem;color:#94a3b8">いいね</span><span style="font-weight:700;color:#F1948A">${realPosts.reduce((s,p)=>s+p.likes,0)}</span></div></div></div>
      </div>
    </div>
    <div class="modal-overlay" id="post-modal" style="display:none"><div class="modal-content"><div class="modal-header"><div class="modal-title">新しい投稿</div><button class="modal-close" id="close-post-modal">✕</button></div><div class="modal-body"><input type="text" id="post-title-input" placeholder="タイトル（質問の場合）"/><textarea id="post-body-input" placeholder="質問内容や近況を書いてください..."></textarea></div><div class="modal-footer"><label class="anonymous-toggle"><input type="checkbox" id="post-anonymous"/> 匿名で投稿</label><button class="btn btn-primary" id="submit-post">投稿する</button></div></div></div>`;

  const modal=document.getElementById('post-modal');
  document.getElementById('open-post-modal').addEventListener('click',()=>modal.style.display='flex');
  document.getElementById('close-post-modal').addEventListener('click',()=>modal.style.display='none');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
  document.getElementById('submit-post').addEventListener('click',async ()=>{
    const b=document.getElementById('post-body-input').value;
    const t=document.getElementById('post-title-input').value;
    const anon=document.getElementById('post-anonymous').checked;
    if(b.trim()){
      await savePost(t || null, b, t ? 'question' : 'activity', anon);
      modal.style.display='none';
      renderCommunity();
    }
  });
  document.querySelectorAll('.filter-tab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    const f=tab.dataset.filter;const filtered=f==='all'?sorted:sorted.filter(p=>p.type===f);
    document.getElementById('post-feed').innerHTML=filtered.map(p=>renderPostCard(p)).join('');}));
  document.getElementById('post-feed').addEventListener('click',e=>{const lb=e.target.closest('[data-action="like"]');if(lb){lb.classList.toggle('liked');const sp=lb.querySelector('span');const c=parseInt(sp.textContent);sp.textContent=lb.classList.contains('liked')?c+1:c-1;}});
}

// --- Ranking ---
function renderRanking(){
  const ct=document.getElementById('page-container');let period='weekly';
  function getSorted(p){const k=p==='weekly'?'weeklyMinutes':'dailyMinutes';return[...userStudyTotals].sort((a,b)=>b[k]-a[k]);}
  function getMins(u,p){return p==='weekly'?u.weeklyMinutes:u.dailyMinutes;}
  function posClass(i){return i===0?'gold':i===1?'silver':i===2?'bronze':'normal';}

  function renderMain(p){
    const s=getSorted(p);const t3=s.slice(0,3);const pod=t3.length>=3?[t3[1],t3[0],t3[2]]:t3;
    return`<div class="card animate-slide-up"><div class="card-header"><div class="card-title">🏆 表彰台</div>
      <div class="tabs" style="max-width:240px;margin:0"><button class="tab ${p==='daily'?'active':''}" data-period="daily">今日</button><button class="tab ${p==='weekly'?'active':''}" data-period="weekly">今週</button></div></div>
      <div class="ranking-podium">${pod.map((u,di)=>{const ar=di===0?2:di===1?1:3;const cr=ar===1?'👑':'';const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
        return`<div class="podium-item"><div class="podium-avatar">${cr?`<span class="podium-crown">${cr}</span>`:''}
          <div class="avatar avatar-lg" style="background:${c}">${ini}</div></div>
          <div class="podium-name">${u.name}</div><div class="podium-time">${formatMinutes(getMins(u,p))}</div>
          <div class="podium-bar">${ar}</div></div>`;}).join('')}</div></div>
      <div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">📋 全体ランキング</div></div>
        ${s.map((u,i)=>{const me=u.userId===currentUser.id;const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
          return`<div class="ranking-row ${me?'is-me':''}"><div class="ranking-position ${posClass(i)}">${i+1}</div><div class="avatar avatar-sm" style="background:${c}">${ini}</div><div class="ranking-user-info"><div class="ranking-user-name">${u.name} ${me?'<span class="badge badge-teal">あなた</span>':''}</div></div><div class="ranking-time">${formatMinutes(getMins(u,p))}</div></div>`;}).join('')}</div>`;
  }

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ランキング</h1><p class="page-subtitle">仲間の頑張りをチェックして、モチベーションを高めよう</p></div>
    <div class="ranking-layout"><div id="ranking-main">${renderMain(period)}</div>
      <div class="countdown-section"><div style="font-size:1.125rem;font-weight:600;margin-bottom:8px">⏰ 試験カウントダウン</div>
        ${examCountdowns.map(e=>{const d=daysUntil(e.date);const dt=new Date(e.date).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
          return`<div class="countdown-card"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:${e.color}"></div><div class="countdown-name">${e.name}</div><div class="countdown-date">${dt}</div><div class="countdown-days"><span class="countdown-number" style="color:${e.color}">${d}</span><span class="countdown-label">日</span></div></div>`;}).join('')}
      </div></div>`;
  ct.addEventListener('click',e=>{const t=e.target.closest('[data-period]');if(t){period=t.dataset.period;document.getElementById('ranking-main').innerHTML=renderMain(period);}});
}

// --- Settings ---
function renderSettings(){
  const ct=document.getElementById('page-container');const g=groups[0];
  const c=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const members=groupMembers.map(gm=>{const u=users.find(u=>u.id===gm.userId);return{...gm,...u};});

  ct.innerHTML=`
  <div class="page-header">
    <h1 class="page-title">設定</h1>
    <p class="page-subtitle">プロフィールとグループの管理</p>
  </div>
  <div class="settings-layout">

    <!-- Profile Hero Card -->
    <div class="settings-card animate-slide-up">
      <div class="settings-profile-header">
        <div class="avatar avatar-xl" id="settings-avatar" style="background:${c}">${ini}</div>
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
        <div class="settings-field"><label>表示名</label><input type="text" id="input-name" value="${currentUser.name}" placeholder="例: 田中 太郎"/></div>
        <div class="settings-field"><label>メールアドレス</label><input type="email" id="input-email" value="${currentUser.email}" placeholder="例: tanaka@med.ac.jp"/></div>
        <div class="settings-field"><label>大学・医学部名</label><input type="text" id="input-univ" value="${currentUser.university}" placeholder="例: 東京大学医学部"/></div>
        <div class="settings-field"><label>学年</label>
          <select id="input-grade">${[1,2,3,4,5,6].map(gr=>`<option value="${gr}" ${gr===currentUser.grade?'selected':''}>医学部${gr}年</option>`).join('')}</select>
        </div>
        <div class="settings-field"><label>自己紹介（任意）</label>
          <textarea id="input-bio" rows="3" placeholder="例: 循環器が得意です。模試は毎月受けています。" style="width:100%;resize:vertical">${currentUser.bio||''}</textarea>
        </div>
        <div class="settings-row">
          <button class="btn btn-primary" id="save-profile-btn">💾 保存する</button>
          <button class="btn btn-secondary" id="reset-profile-btn">元に戻す</button>
        </div>
      </div>
    </div>

    <!-- Appearance -->
    <div class="settings-card animate-slide-up" style="animation-delay:.16s">
      <h3 class="settings-section-title">🎨 外観設定</h3>
      <div class="settings-row" style="padding:var(--space-sm) 0">
        <div>
          <div style="font-size:var(--font-size-base);font-weight:500;margin-bottom:var(--space-xs)">${isDark?'ダークモード':'ライトモード'}</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">ライト・ダークを切り替えます</div>
        </div>
        <button class="theme-toggle" id="theme-btn-settings"></button>
      </div>
    </div>

    <!-- Group -->
    <div class="settings-card animate-slide-up" style="animation-delay:.24s">
      <h3 class="settings-section-title">👥 グループ管理 — ${g.name}</h3>
      <div style="margin-bottom:var(--space-lg)">
        <label style="display:block;font-size:var(--font-size-sm);font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-sm)">招待コード</label>
        <div class="invite-code-display">
          <span class="invite-code-value">${g.inviteCode}</span>
          <button class="btn btn-secondary btn-sm" id="copy-invite">コピー</button>
        </div>
      </div>
      <div>
        <label style="display:block;font-size:var(--font-size-sm);font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-sm)">メンバー (${members.length}名)</label>
        <div class="member-list">${members.map(m=>{
          const mc=getAvatarColor(m.id);const mi=getInitials(m.name);
          return`<div class="member-item"><div class="avatar avatar-sm" style="background:${mc}">${mi}</div><span class="member-name">${m.name}</span><span class="member-role">${m.role==='admin'?'👑 管理者':'メンバー'}</span></div>`;
        }).join('')}</div>
      </div>
    </div>

    <!-- Danger zone -->
    <div class="settings-card animate-slide-up" style="animation-delay:.32s;border-color:rgba(241,148,138,0.2)">
      <h3 class="settings-section-title" style="color:var(--color-accent-pink)">⚠️ 危険な操作</h3>
      <div class="settings-row">
        <div>
          <div style="font-size:var(--font-size-sm);font-weight:500;">グループから退出する</div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">この操作は取り消せません</div>
        </div>
        <button class="settings-danger-btn" id="leave-group-btn">退出する</button>
      </div>
    </div>

  </div>`;

  // ---- Event Listeners ----
  const origName=currentUser.name, origEmail=currentUser.email, origUniv=currentUser.university, origGrade=currentUser.grade;

  // Live preview — name
  document.getElementById('input-name').addEventListener('input', e=>{
    document.getElementById('display-name').textContent = e.target.value || '（名前未設定）';
    const ini2=getInitials(e.target.value||'?');
    document.getElementById('settings-avatar').textContent = ini2;
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

  // Save button
  document.getElementById('save-profile-btn').addEventListener('click', async ()=>{
    const newName=document.getElementById('input-name').value.trim();
    const newEmail=document.getElementById('input-email').value.trim();
    const newUniv=document.getElementById('input-univ').value.trim();
    const newGrade=parseInt(document.getElementById('input-grade').value);
    const newBio=document.getElementById('input-bio').value;
    if(!newName){ document.getElementById('input-name').focus(); showToast('⚠️ 名前を入力してください'); return; }
    
    if (supabase && session) {
      const { error } = await supabase.from('profiles').update({
        full_name: newName,
        university: newUniv,
        grade: newGrade
      }).eq('id', session.user.id);
      
      if (error) {
        showToast('❌ 保存に失敗しました: ' + error.message);
        return;
      }
    }

    currentUser.name=newName;
    currentUser.email=newEmail;
    currentUser.university=newUniv||'未設定';
    currentUser.grade=newGrade;
    currentUser.bio=newBio;
    // Update sidebar profile
    renderSidebar();
    showToast('✅ プロフィールを保存しました！');
  });

  // Reset button
  document.getElementById('reset-profile-btn').addEventListener('click', ()=>{
    document.getElementById('input-name').value=origName;
    document.getElementById('input-email').value=origEmail;
    document.getElementById('input-univ').value=origUniv;
    document.getElementById('input-grade').value=origGrade;
    document.getElementById('display-name').textContent=origName;
    document.getElementById('display-email').textContent=origEmail;
    document.getElementById('display-role').textContent=`${origUniv} 医学部${origGrade}年`;
    document.getElementById('settings-avatar').textContent=getInitials(origName);
    showToast('↩️ 変更を元に戻しました');
  });

  // Theme toggle in settings page
  document.getElementById('theme-btn-settings').addEventListener('click', ()=>{ toggleTheme(); renderSettings(); });

  // Invite code copy
  document.getElementById('copy-invite').addEventListener('click',()=>{
    navigator.clipboard?.writeText(g.inviteCode);
    const b=document.getElementById('copy-invite');b.textContent='コピーしました！';
    setTimeout(()=>b.textContent='コピー',2000);
    showToast('📋 招待コードをコピーしました');
  });

  // Leave group
  document.getElementById('leave-group-btn').addEventListener('click',()=>{
    if(confirm('本当にグループ「'+g.name+'」から退出しますか？\nこの操作は取り消せません。')){
      showToast('グループから退出しました（デモモード）');
    }
  });
}

// ==================== REGISTER & INIT ====================
console.log('DEBUG: Registering routes and starting app');
registerRoute('/',()=>{if(!session){renderLogin();return;}document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderDashboard();});
registerRoute('/study',()=>{if(!session){renderLogin();return;}document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderStudy();});
registerRoute('/community',()=>{if(!session){renderLogin();return;}document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderCommunity();});
registerRoute('/ranking',()=>{if(!session){renderLogin();return;}document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderRanking();});
registerRoute('/settings',()=>{if(!session){renderLogin();return;}document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderSettings();});

async function initApp(){
  console.log('DEBUG: initApp started');
  if(supabase) {
    try {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      session = initialSession;
      if (session) {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          currentUser.id = profile.id;
          currentUser.name = profile.full_name;
          currentUser.university = profile.university;
          currentUser.grade = profile.grade;
        }
      }
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session = newSession;
        if (session) {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            currentUser.id = profile.id;
            currentUser.name = profile.full_name;
            currentUser.university = profile.university;
            currentUser.grade = profile.grade;
          }
        }
        renderRoute(currentRoute);
      });
    } catch(e) {
      console.error('DEBUG: Auth session error:', e);
    }
  }
  
  window.addEventListener('popstate',()=>renderRoute(window.location.pathname));
  document.addEventListener('click',e=>{const n=e.target.closest('[data-route]');if(n){e.preventDefault();navigate(n.dataset.route);}});
  
  console.log('DEBUG: App: Initial route render:', window.location.pathname);
  renderRoute(window.location.pathname);
}

initApp();
console.log('DEBUG: app.js finished executing');
