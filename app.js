console.log('DEBUG: app.js loaded');
// ============================================================
// MedFocus - Complete Application (No Build Tools)
// ============================================================

let supabase = null;
// Initialize Supabase with storage fallback
function initSupabase() {
  const savedUrl = localStorage.getItem('medfocus-supabase-url');
  const savedKey = localStorage.getItem('medfocus-supabase-key');
  
  const url = savedUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const key = savedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    if (url && key && !url.includes('your-project') && key !== 'your-anon-key') {
      supabase = window.supabase.createClient(url, key);
      console.log('DEBUG: Supabase initialized connected to:', url);
    } else {
      console.log('DEBUG: Supabase bypassing (missing config)');
      supabase = null;
    }
  } catch (e) {
    console.error('DEBUG: Supabase initialization error:', e);
    supabase = null;
  }
}
initSupabase();

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
  id: '', name: '未設定', email: '',
  university: '未設定', grade: 1, bio: ''
};

const users = [];

let myGroups = []; // Array of groups the current user has joined
let examCountdowns = []; // Array of exam countdowns

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
const chartInstances = {};
function destroyChart(id){if(chartInstances[id]){chartInstances[id].destroy();delete chartInstances[id];}}
function destroyAllCharts(){Object.keys(chartInstances).forEach(destroyChart);}
Chart.defaults.color='#94a3b8';

// ==================== GROUP HELPERS ====================
function generateInviteCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

async function fetchCountdowns() {
  if (!supabase) return;
  const { data, error } = await supabase.from('exam_countdowns').select('*').order('exam_date', { ascending: true });
  if (!error && data) examCountdowns = data;
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
  const { data, error } = await supabase.from('user_checklist_progress').select('category, topic, completed').eq('user_id', session.user.id);
  if (!error && data) checklistProgressCache = data;
  return checklistProgressCache;
}

async function toggleChecklistItem(category, topic, checked) {
  if (!supabase || !session) return;
  const ex = checklistProgressCache.find(c => c.category === category && c.topic === topic);
  if (ex) ex.completed = checked;
  else checklistProgressCache.push({ category, topic, completed: checked });
  
  await supabase.from('user_checklist_progress').upsert({
    user_id: session.user.id, category, topic, completed: checked
  }, { onConflict: 'user_id, category, topic' });
}

async function createGroup(name) {
  if (!supabase || !session) return;
  const code = generateInviteCode();
  const { data: group, error: gErr } = await supabase.from('groups').insert([{ name, invite_code: code, created_by: session.user.id }]).select().single();
  if (gErr) { showToast('❌ グループ作成失敗: ' + gErr.message); console.error('Group create error:', gErr); return; }
  const { error: mErr } = await supabase.from('group_members').insert([{ group_id: group.id, user_id: session.user.id, role: 'admin' }]);
  if (mErr) showToast('❌ メンバー追加失敗: ' + mErr.message);
  else { showToast('✅ グループを作成しました！'); await fetchUserGroups(); renderSettings(); }
}

async function joinGroup(code) {
  if (!supabase || !session) return;
  const { data: group, error: findErr } = await supabase.from('groups').select('*').eq('invite_code', code.trim().toUpperCase()).single();
  if (findErr || !group) { showToast('❌ 無効な招待コードです'); return; }
  const { error: mErr } = await supabase.from('group_members').insert([{ group_id: group.id, user_id: session.user.id }]);
  if (mErr) {
    if (mErr.code === '23505') showToast('⚠️ 既に参加しているグループです');
    else showToast('❌ 参加に失敗しました');
  } else { showToast('✅ グループに参加しました！'); await fetchUserGroups(); renderSettings(); }
}

async function leaveGroup(groupId) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('group_members').delete().match({ group_id: groupId, user_id: session.user.id });
  if (error) showToast('❌ 退室に失敗しました');
  else { showToast('✅ 退室しました'); await fetchUserGroups(); renderSettings(); }
}

async function fetchGroupRanking(groupId, period) {
  if (!supabase) return [];
  const { data: members, error: memErr } = await supabase.from('group_members').select('user_id, profiles(full_name)').eq('group_id', groupId);
  if (memErr || !members) return [];
  const userIds = members.map(m => m.user_id);
  if (userIds.length === 0) return [];
  const timeLimit = new Date();
  if (period === 'weekly') timeLimit.setDate(timeLimit.getDate() - 7);
  else timeLimit.setHours(0,0,0,0);
  const { data: logs, error: logErr } = await supabase.from('study_logs').select('user_id, duration_minutes').in('user_id', userIds).gte('started_at', timeLimit.toISOString());
  const safeLogs = (logErr || !logs) ? [] : logs;
  const totals = {};
  userIds.forEach(uid => totals[uid] = 0);
  safeLogs.forEach(l => { totals[l.user_id] += l.duration_minutes; });
  return members.map(m => ({ userId: m.user_id, name: m.profiles?.full_name || '名前未設定', total: totals[m.user_id] })).sort((a,b) => b.total - a.total);
}

// ==================== SUPABASE DATA HELPERS ====================
async function fetchStudyLogs() {
  if (!supabase || !session) return [];
  const { data, error } = await supabase.from('study_logs').select('*').eq('user_id', session.user.id).order('started_at', { ascending: false });
  return error ? [] : data;
}

async function saveStudyLog(subjectId, durationMinutes, memo) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('study_logs').insert([{ 
    user_id: session.user.id, 
    subject_name: subjectId, 
    duration_minutes: durationMinutes,
    memo: memo || null
  }]);
  if (error) showToast('❌ 保存に失敗しました');
  else showToast('✅ 勉強記録を保存しました！');
}

async function updateStudyLog(id, subjectName, durationMinutes) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('study_logs').update({ subject_name: subjectName, duration_minutes: durationMinutes }).eq('id', id);
  if (error) showToast('❌ 更新に失敗しました');
  else showToast('✅ 記録を更新しました！');
}

async function deleteStudyLog(id) {
  if (!supabase || !session) return;
  const { error } = await supabase.from('study_logs').delete().eq('id', id);
  if (error) showToast('❌ 削除に失敗しました');
  else showToast('✅ 記録を削除しました！');
}

async function fetchPosts() {
  if (!supabase) return posts;
  
  // Try to fetch with full relationships first (Vite/Supabase standard join)
  let { data, error } = await supabase.from('posts').select('*, profiles(full_name), post_replies(*, profiles(full_name))').order('created_at', { ascending: false });
  
  if (error) {
    console.warn('DEBUG: fetchPosts joined query failed. Trying robust secondary fetching strategy. Error:', error);
    
    // Step 1: Fetch posts only
    const resPosts = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (resPosts.error) {
      console.error('DEBUG: fetchPosts cannot even fetch base posts:', resPosts.error);
      return [];
    }
    
    // Step 2: Manually fetch replies for these posts if the joined query failed
    const postIds = resPosts.data.map(p => p.id);
    const resReplies = await supabase.from('post_replies').select('*').in('post_id', postIds).order('created_at', { ascending: true });
    
    // Combine them
    data = resPosts.data.map(p => ({
      ...p,
      profiles: null, // Just show as N/A or default later
      post_replies: resReplies.data ? resReplies.data.filter(r => r.post_id === p.id) : []
    }));
  }
  
  return data;
}

async function deletePost(postId) {
  if (!supabase || !session) {
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      posts.splice(idx, 1);
      showToast('✅ 投稿を削除しました（デモ）');
      await renderCommunity();
    }
    return;
  }
  const { error: replyErr } = await supabase.from('post_replies').delete().eq('post_id', postId);
  const { error } = await supabase.from('posts').delete().match({ id: postId, user_id: session.user.id });
  if (error) showToast('❌ 削除に失敗しました: ' + error.message);
  else { showToast('✅ 投稿を削除しました'); await renderCommunity(); }
}

async function deletePostReply(replyId) {
  if (!supabase || !session) {
    posts.forEach(p => {
      if (p.post_replies) {
        const idx = p.post_replies.findIndex(r => r.id === replyId);
        if (idx !== -1) p.post_replies.splice(idx, 1);
      }
    });
    showToast('✅ 返信を削除しました（デモ）');
    await renderCommunity();
    return;
  }
  const { error } = await supabase.from('post_replies').delete().match({ id: replyId, user_id: session.user.id });
  if (error) showToast('❌ 削除に失敗しました: ' + error.message);
  else { showToast('✅ 返信を削除しました'); await renderCommunity(); }
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
      showToast('✅ 返信しました（デモ）');
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
    showToast('❌ 返信の失敗: ' + (error.message || 'エラーが発生しました'));
    return false;
  }
  
  showToast('✅ 返信を投稿しました！');
  return true;
}

async function savePost(title, body, type, isAnonymous) {
  if (!supabase || !session) {
    console.log('DEBUG: savePost (local/demo mode)');
    const newPost = {
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
      user_id: session?.user?.id || currentUser.id,
      title, body, type, is_anonymous: isAnonymous,
      likes: 0, post_replies: [],
      profiles: { full_name: currentUser.name }
    };
    posts.unshift(newPost);
    showToast('✅ 投稿しました！(デモ)');
    return;
  }
  
  // Try inserting with is_anonymous
  let { error } = await supabase.from('posts').insert([{ 
    user_id: session.user.id, 
    title, body, type, is_anonymous: isAnonymous 
  }]);
  
  if (error && error.message && (error.message.includes('is_anonymous') || error.code === '42703')) {
    console.warn('DEBUG: is_anonymous column missing or ambiguous. retrying without it.');
    const fallback = await supabase.from('posts').insert([{ 
      user_id: session.user.id, 
      title, body, type 
    }]);
    error = fallback.error;
  }

  if (error) {
    console.error('DEBUG: Supabase savePost failed:', error);
    showToast('❌ 投稿に失敗しました: ' + (error.message || 'データベースエラー'));
  }
}

async function saveFeedback(title, body, category, isAnonymous) {
  if (!supabase || !session) {
    console.log('DEBUG: saveFeedback (local/demo mode)', { title, body, category, isAnonymous });
    showToast('✅ 貴重なご意見ありがとうございます！（デモ）');
    return true;
  }
  const { error } = await supabase.from('feedbacks').insert([{ 
    user_id: session.user.id, 
    title, body, category, 
    is_anonymous: isAnonymous 
  }]);
  if (error) {
    console.error('DEBUG: Supabase saveFeedback failed:', error);
    showToast('❌ 送信に失敗しました: ' + (error.message || 'Error'));
    return false;
  }
  showToast('✅ 貴重なご意見ありがとうございます！');
  return true;
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

// ==================== STOPWATCH / TIMER ====================
let timerInterval=null, elapsedSeconds=0, isRunning=false;
let isCountdown=false, countdownSeconds=0, initialCountdownSeconds=0, isConfirmingLog=false;
let pendingLogDuration=0;

function startSW(onTick){
  if(isRunning) return;
  isRunning=true;
  timerInterval=setInterval(()=>{
    if(isCountdown) {
      if(countdownSeconds > 0) {
        countdownSeconds--;
        elapsedSeconds++; // Still track total elapsed for logs
      } else {
        // Countdown Finished
        finishSession();
      }
    } else {
      elapsedSeconds++;
    }
    if(onTick) onTick(isCountdown ? countdownSeconds : elapsedSeconds);
  }, 1000);
}

function finishSession() {
  pauseSW();
  pendingLogDuration = Math.floor(elapsedSeconds / 60);
  isConfirmingLog = true;
  // Try to play a notification sound (beep)
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.5);
  } catch(e) { console.warn('Could not play notification sound:', e); }
  
  if (typeof renderStudy === 'function') renderStudy();
}

function pauseSW(){
  isRunning=false;
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
}

function resetSW(){
  pauseSW();
  elapsedSeconds=0;
  countdownSeconds=0;
  isConfirmingLog=false;
}

function fmtSW(t){
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
  const p=n=>String(n).padStart(2,'0');
  return h>0 ? `${p(h)}:${p(m)}<span class="seconds">:${p(s)}</span>` : `${p(m)}<span class="seconds">:${p(s)}</span>`;
}

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
  document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn.textContent;
    btn.textContent = '処理中...';
    btn.disabled = true;

    try {
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      if(isSignUpMode) {
        const name = document.getElementById('auth-name').value;
        await handleSignUp(email, password, name);
      } else {
        await handleLogin(email, password);
      }
    } catch (err) {
      showToast('❌ 予期せぬエラー: ' + err.message);
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
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
      const { error: insertErr } = await supabase.from('profiles').insert([{ id: user.id, full_name: name, university: '未設定', grade: 1 }]);
      if (insertErr) console.warn('Profile creation failed:', insertErr);
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
  currentUser.id = 'user-001';
  currentUser.name = email.split('@')[0];
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
  const isMine = post.user_id === session?.user?.id || post.user_id === currentUser.id;
  const name=post.is_anonymous?'匿名ユーザー':(post.profiles?.full_name || (isMine ? currentUser.name : '名前未設定'));
  const col=post.is_anonymous?'#64748b':getAvatarColor(post.user_id);
  const ini=post.is_anonymous?'匿':getInitials(name);
  const badge=post.type==='activity'?'<span class="post-type-badge post-type-activity">📢 アクティビティ</span>':'<span class="post-type-badge post-type-question">❓ 質問</span>';
  
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
      <div class="avatar" style="background:${col}">${ini}</div>
      <div class="post-author-info">
        <div class="post-author-name">${name} ${badge}</div>
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
async function renderDashboard(){
  const ct=document.getElementById('page-container');
  const logs = await fetchStudyLogs();
  const checks = await fetchChecklists();
  
  const totalCBT = CBT_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalKoku = KOKUSHI_CHECKLIST.reduce((s,c)=>s+c.topics.length,0);
  const totalT = totalCBT + totalKoku;
  const compT=checks.filter(c=>c.completed).length;
  const overall=totalT>0?Math.round((compT/totalT)*100):0;

  // --- Statistics ---
  const today=new Date(); today.setHours(0,0,0,0);
  const totalMinutes = logs.reduce((s,l)=>s+l.duration_minutes,0);
  
  // Streak calculation
  let streak = 0;
  const studyDates = new Set(logs.map(l => new Date(l.started_at).toLocaleDateString()));
  let d = new Date(today);
  while(studyDates.has(d.toLocaleDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  
  const todayMin=logs.filter(l=>new Date(l.started_at)>=today).reduce((s,l)=>s+l.duration_minutes,0);
  const avgMin = logs.length > 0 ? Math.round(totalMinutes / new Set(logs.map(l=>new Date(l.started_at).toLocaleDateString())).size) : 0;
  
  // --- Radar Chart Aggregation ---
  const buckets = ["基礎医学", "内科系", "外科系", "産婦人科", "小児科", "精神科", "社会医学", "救急科"];
  const bucketProg = buckets.map(b => {
    let total = 0;
    let completed = 0;
    
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

  const dailyD=[],dailyL=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);
    const ds=new Date(d);ds.setHours(0,0,0,0);const de=new Date(d);de.setHours(23,59,59,999);
    dailyD.push(logs.filter(l=>{const t=new Date(l.started_at);return t>=ds&&t<=de;}).reduce((s,l)=>s+l.duration_minutes,0));
    dailyL.push(d.toLocaleDateString('ja-JP',{weekday:'short'}));}

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ダッシュボード</h1><p class="page-subtitle">学習進捗の全体像を把握しよう</p></div>
    <div class="dashboard-stats">
      <div class="stat-card animate-slide-up"><div class="stat-label">📊 総合進捗率</div><div class="stat-value">${overall}<span class="stat-unit">%</span></div><div class="stat-change positive">▲ ${compT}/${totalT} トピック完了</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.05s"><div class="stat-label">⏱ 今日の勉強</div><div class="stat-value">${formatMinutes(todayMin)}</div><div class="stat-change positive">▲ 目標まであと少し</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.1s"><div class="stat-label">🔥 連続達成</div><div class="stat-value">${streak}<span class="stat-unit">日</span></div><div class="stat-change positive">▲ 自己ベスト更新中！</div></div>
      <div class="stat-card animate-slide-up" style="animation-delay:.15s"><div class="stat-label">⏳ 総学習時間</div><div class="stat-value">${Math.floor(totalMinutes/60)}<span class="stat-unit">時間</span></div><div class="stat-change positive">▲ 1日平均 ${formatMinutes(avgMin)}</div></div>
    </div>
    <div class="dashboard-charts">
      <div class="card animate-slide-up" style="animation-delay:.2s"><div class="card-header"><div class="card-title">📊 週間学習時間</div></div><div class="chart-container"><canvas id="weeklyBarChart"></canvas></div></div>
      <div class="card animate-slide-up" style="animation-delay:.25s"><div class="card-header"><div class="card-title">🎯 カテゴリ別進捗</div></div><div class="chart-container"><canvas id="categoryRadarChart"></canvas></div></div>
    </div>
    <div class="dashboard-bottom">
      <div class="card animate-slide-up" style="animation-delay:.3s"><div class="card-header"><div class="card-title">📈 進捗詳細 (8カテゴリ)</div></div>
        <div class="category-progress-list">${bucketProg.map(b=>`<div class="category-progress-item"><div class="category-progress-header"><span class="category-progress-name">${b.name}</span><span class="category-progress-value">${b.value}%</span></div><div class="progress-bar"><div class="progress-bar-fill" style="width:0%;background:var(--color-primary)" data-width="${b.value}"></div></div></div>`).join('')}</div></div>
      <div class="card animate-slide-up" style="animation-delay:.35s"><div class="card-header"><div class="card-title">🔔 仲間のアクティビティ</div></div>
        <div class="activity-list">${activityFeed.map(a=>`<div class="activity-item"><div class="activity-icon">${a.icon}</div><div class="activity-content"><div class="activity-name">${a.name}</div><div class="activity-action">${a.action}</div></div><div class="activity-time">${a.time}</div></div>`).join('')}</div></div>
    </div>`;

  setTimeout(()=>{
    createBarChart('weeklyBarChart',dailyL,dailyD);
    createRadarChart('categoryRadarChart',bucketProg.map(b=>b.name),bucketProg.map(b=>b.value));
    document.querySelectorAll('.progress-bar-fill').forEach(b=>{const w=b.dataset.width;requestAnimationFrame(()=>{b.style.width=w+'%';});});
  },100);
}

// --- Study ---
async function renderStudy(){
  const ct=document.getElementById('page-container');
  const logs = await fetchStudyLogs();
  const checks = await fetchChecklists();
  const allSubjects=subjectCategories.flatMap(c=>c.subjects.map(s=>({...s,category:c.name})));
  const today=new Date();const logsByDay={};
  for(let i=0;i<7;i++){const d=new Date(today);d.setDate(d.getDate()-i);
    const key=d.toLocaleDateString('ja-JP',{month:'short',day:'numeric',weekday:'short'});
    const ds=new Date(d);ds.setHours(0,0,0,0);const de=new Date(d);de.setHours(23,59,59,999);
    logsByDay[key]=logs.filter(l=>{const t=new Date(l.started_at);return t>=ds&&t<=de;});}

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">学習タイマー</h1><p class="page-subtitle">集中して勉強時間を記録しよう</p></div>
    <div class="study-layout">
      <!-- Timer Main Card -->
      <div class="stopwatch-card card animate-slide-up" style="position:relative; overflow:hidden;">
        <!-- Mode Switcher -->
        <div class="timer-mode-switcher" style="display:flex; justify-content:center; gap:8px; margin-bottom:var(--space-md); background:var(--color-bg-elevated); padding:4px; border-radius:var(--radius-md);">
          <button class="mode-tab ${!isCountdown?'active':''}" id="mode-up">ストップウォッチ</button>
          <button class="mode-tab ${isCountdown?'active':''}" id="mode-down">タイマー</button>
        </div>

        <svg width="0" height="0"><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4ECDC4"/><stop offset="100%" stop-color="#45B7D1"/></linearGradient></defs></svg>
        <div class="stopwatch-subject-selector"><select id="study-subject"><option value="">-- 科目を選択 --</option>${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>`).join('')}</select></div>
        
        <!-- Countdown Settings (only if not running) -->
        ${isCountdown && !isRunning ? `
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
        <div class="stopwatch-status ${isRunning?'recording':''}" id="timer-status">${isRunning?'<span class="status-dot"></span>集中記録中...':'準備ができたら開始しましょう'}</div>
        <div class="stopwatch-memo" style="margin-top:var(--space-md);"><input type="text" id="study-memo" placeholder="メモ（任意）..." style="width:100%;max-width:300px;text-align:center;background:var(--color-bg-input);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-primary);padding:5px;" maxlength="100"/></div>

        <!-- Confirmation Overlay -->
        ${isConfirmingLog ? `
          <div class="timer-overlay animate-fade-in" style="position:absolute; inset:0; background:rgba(15,23,42,0.9); backdrop-filter:blur(10px); z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:var(--space-xl); text-align:center;">
            <div class="celebration-icon" style="font-size:3rem; margin-bottom:var(--space-md);">🎉</div>
            <h2 style="font-size:1.5rem; font-weight:700; color:var(--color-text-primary); margin-bottom:var(--space-xs);">お疲れ様でした！</h2>
            <p style="color:var(--color-text-secondary); margin-bottom:var(--space-lg);">今日の学習を記録しましょう</p>
            
            <div class="confirm-form" style="width:100%; max-width:320px; display:flex; flex-direction:column; gap:16px; text-align:left;">
              <div class="field">
                <label style="font-size:0.75rem; color:var(--color-text-tertiary); display:block; margin-bottom:4px;">学習時間 (分)</label>
                <input type="number" id="confirm-duration" value="${pendingLogDuration}" style="width:100%; background:var(--color-bg-input); border:1px solid var(--color-border); color:var(--color-text-primary); padding:10px; border-radius:var(--radius-md); font-size:1.1rem; font-weight:700;" />
              </div>
              <div class="field">
                <label style="font-size:0.75rem; color:var(--color-text-tertiary); display:block; margin-bottom:4px;">学習内容</label>
                <select id="confirm-subject" style="width:100%; background:var(--color-bg-input); border:1px solid var(--color-border); color:var(--color-text-primary); padding:10px; border-radius:var(--radius-md);">
                  <option value="">-- 未選択 --</option>
                  ${subjectCategories.map(c=>`<optgroup label="${c.name}">${c.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>`).join('')}
                </select>
              </div>
              <div class="field">
                <label style="font-size:0.75rem; color:var(--color-text-tertiary); display:block; margin-bottom:4px;">振り返りメモ</label>
                <textarea id="confirm-memo" placeholder="学んだことや一言..." style="width:100%; background:var(--color-bg-input); border:1px solid var(--color-border); color:var(--color-text-primary); padding:10px; border-radius:var(--radius-md); min-height:80px;"></textarea>
              </div>
              <div style="display:flex; gap:12px; margin-top:8px;">
                <button class="btn btn-secondary" id="btn-discard-log" style="flex:1;">破棄</button>
                <button class="btn btn-primary" id="btn-confirm-save" style="flex:2;">記録を保存</button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">📋 最近の学習ログ</div></div>
        <div class="study-log-list">${Object.entries(logsByDay).map(([day,logs])=>{if(!logs.length)return'';const tot=logs.reduce((s,l)=>s+l.duration_minutes,0);
          return`<div class="study-log-day"><div class="study-log-day-header">${day} <span class="day-total">(計 ${formatMinutes(tot)})</span></div>${logs.map(l=>{const sub=allSubjects.find(s=>s.id===l.subject_name);const tm=new Date(l.started_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
            return`<div class="study-log-entry" data-id="${l.id}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:var(--space-sm);">
                  <span class="study-log-subject">${sub?.name||l.subject_name}</span>
                  <span class="study-log-duration">${formatMinutes(l.duration_minutes)}</span>
                  <span class="study-log-time">${tm}</span>
                </div>
                ${l.memo?`<div class="study-log-memo" style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.memo}</div>`:''}
              </div>
              <div class="study-log-actions">
                <button class="btn-log-action edit" data-id="${l.id}" data-subject="${sub?.name||l.subject_name}" data-duration="${l.duration_minutes}" title="編集" style="font-size:0.75rem;padding:2px 8px;">編集</button>
                <button class="btn-log-action delete" data-id="${l.id}" title="削除" style="font-size:0.75rem;padding:2px 8px;color:var(--color-accent-pink);">削除</button>
              </div>
            </div>`;}).join('')}</div>`;}).join('')}</div></div>
    </div>
    
    <div class="card animate-slide-up" style="animation-delay:.2s;margin-top:var(--space-lg);">
      <div class="card-header" style="border-bottom:1px solid rgba(148,163,184,0.1);padding-bottom:var(--space-sm);flex-wrap:wrap;gap:var(--space-sm);">
        <div class="card-title">✅ 達成度チェックリスト</div>
        <div class="filter-tabs" style="margin:0;padding:0;">
            <button class="filter-tab active" id="tab-cbt">CBT対策</button>
            <button class="filter-tab" id="tab-kokushi">国家試験対策</button>
        </div>
      </div>
      <div id="checklist-view-cbt">
        <div class="checklist-accordion" style="padding:var(--space-md);">
          ${renderAccordionChecklist(CBT_CHECKLIST, checks)}
        </div>
      </div>
      <div id="checklist-view-kokushi" style="display:none;">
        <div class="checklist-accordion" style="padding:var(--space-md);">
          ${renderAccordionChecklist(KOKUSHI_CHECKLIST, checks)}
        </div>
      </div>
    </div>`;

  function renderAccordionChecklist(checklist, userChecks) {
    const grouped = {};
    checklist.forEach(cat => {
      const parts = cat.category.split(': ');
      const major = parts[0];
      const sub = parts[1] || '';
      if (!grouped[major]) grouped[major] = { color: cat.color, chapters: [] };
      grouped[major].chapters.push({ sub, catObj: cat });
    });

    return Object.entries(grouped).map(([major, data]) => {
      const totalInMajor = data.chapters.reduce((s, c) => s + c.catObj.topics.length, 0);
      const compInMajor = data.chapters.reduce((s, c) => s + userChecks.filter(ch => ch.category === c.catObj.category && ch.completed).length, 0);
      return `
        <div class="accordion-item major-category" style="margin-bottom:8px;border:1px solid rgba(148,163,184,0.1);border-radius:var(--radius-md);overflow:hidden;">
          <div class="accordion-header major-header" style="background:var(--color-bg-elevated);padding:12px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${data.color};">
            <span style="font-weight:600;font-size:0.95rem;">${major} <span style="font-weight:400;font-size:0.8rem;color:var(--color-text-tertiary);margin-left:8px;">(${compInMajor}/${totalInMajor})</span></span>
            <span class="accordion-icon">▶</span>
          </div>
          <div class="accordion-content major-content" style="display:none;background:var(--color-bg-secondary);padding:8px 0;">
            ${data.chapters.map(chap => {
              const compInChap = userChecks.filter(ch => ch.category === chap.catObj.category && ch.completed).length;
              const totalInChap = chap.catObj.topics.length;
              return `
                <div class="accordion-item sub-category" style="margin:4px 16px;border-radius:var(--radius-sm);overflow:hidden;">
                  <div class="accordion-header sub-header" style="padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:rgba(148,163,184,0.05);">
                    <span style="font-size:0.9rem;color:var(--color-text-secondary);">${chap.sub} <span style="font-size:0.75rem;color:var(--color-text-tertiary);margin-left:4px;">(${compInChap}/${totalInChap})</span></span>
                    <span class="accordion-icon" style="font-size:0.7rem;">▶</span>
                  </div>
                  <div class="accordion-content sub-content" style="display:none;padding:12px;background:var(--color-bg-elevated);">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
                      ${chap.catObj.topics.map(topic => {
                        const isChecked = userChecks.some(ch => ch.category === chap.catObj.category && ch.topic === topic && ch.completed);
                        return `
                          <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;">
                            <input type="checkbox" class="med-check-item" data-cat="${chap.catObj.category}" data-topic="${topic}" ${isChecked?'checked':''}>
                            <span style="${isChecked?'text-decoration:line-through;color:var(--color-text-tertiary)':''}">${topic}</span>
                          </label>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // Accordion Logic
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.accordion-icon');
      const isVisible = content.style.display === 'block';
      content.style.display = isVisible ? 'none' : 'block';
      icon.textContent = isVisible ? '▶' : '▼';
      icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
    });
  });

  const display=document.getElementById('timer-display');const ring=document.getElementById('timer-ring');
  const status=document.getElementById('timer-status');const btnT=document.getElementById('btn-toggle');
  const circ=2*Math.PI*140;
  function upd(s){
    display.innerHTML=fmtSW(s);
    let p;
    if(isCountdown && initialCountdownSeconds > 0) {
      p = s / initialCountdownSeconds; // Ratio of remaining time
    } else {
      p = (s % 3600) / 3600; // Rotary for stopwatch
    }
    ring.style.strokeDashoffset=circ-(p*circ);
  }
  if(isRunning){ring.style.strokeDasharray=circ;startSW(upd);}
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
        showToast('⚠️ 時間をセットしてください');
        return;
      }
      startSW(upd);
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
    if(elapsedSeconds > 0) {
      finishSession();
    } else {
      showToast('⚠️ 記録する時間がありません');
    }
  });

  // Mode Tabs
  document.getElementById('mode-up')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = false;
    renderStudy();
  });
  document.getElementById('mode-down')?.addEventListener('click', () => {
    if(isRunning) return;
    isCountdown = true;
    if(countdownSeconds === 0) {
      countdownSeconds = 1500; // Default 25m
      initialCountdownSeconds = 1500;
    }
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
  document.getElementById('btn-confirm-save')?.addEventListener('click', async () => {
    const durEle = document.getElementById('confirm-duration');
    const subEle = document.getElementById('confirm-subject');
    const memoEle = document.getElementById('confirm-memo');
    
    const dur = parseInt(durEle.value);
    const subId = subEle.value;
    const subName = subEle.options[subEle.selectedIndex]?.text || '未選択';
    const memo = memoEle.value.trim();
    
    if(isNaN(dur) || dur <= 0) { showToast('⚠️ 正しい時間を入力してください'); return; }
    
    await saveStudyLog(subId || subName, dur, memo);
    resetSW();
    renderStudy();
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
  const tabCbt = document.getElementById('tab-cbt');
  const tabKokushi = document.getElementById('tab-kokushi');
  const viewCbt = document.getElementById('checklist-view-cbt');
  const viewKokushi = document.getElementById('checklist-view-kokushi');
  if(window.activeChecklistTab === 'kokushi') { tabKokushi.classList.add('active'); tabCbt.classList.remove('active'); viewKokushi.style.display='block'; viewCbt.style.display='none'; }
  tabCbt.addEventListener('click', () => { window.activeChecklistTab = 'cbt'; tabCbt.classList.add('active'); tabKokushi.classList.remove('active'); viewCbt.style.display='block'; viewKokushi.style.display='none'; });
  tabKokushi.addEventListener('click', () => { window.activeChecklistTab = 'kokushi'; tabKokushi.classList.add('active'); tabCbt.classList.remove('active'); viewKokushi.style.display='block'; viewCbt.style.display='none'; });
  document.querySelectorAll('.med-check-item').forEach(cb => cb.addEventListener('change', async (e) => {
    const cat = e.target.dataset.cat; const top = e.target.dataset.topic; const checked = e.target.checked;
    await toggleChecklistItem(cat, top, checked); renderStudy();
  }));
  document.querySelectorAll('.btn-log-action.edit').forEach(btn => btn.addEventListener('click', async (e) => {
    const ds = e.currentTarget.dataset;
    const newDurStr = prompt(`【${ds.subject}】の新しい勉強時間（分）を入力してください:`, ds.duration);
    if(newDurStr !== null) {
      const dur = parseInt(newDurStr);
      if(!isNaN(dur) && dur > 0) { await updateStudyLog(ds.id, ds.subject, dur); renderStudy(); }
      else { showToast('⚠️ 正しい分数を入力してください'); }
    }
  }));
}

// --- Community ---
async function renderCommunity(){
  const ct=document.getElementById('page-container');const col=getAvatarColor(currentUser.id);const ini=getInitials(currentUser.name);
  const realPosts = await fetchPosts();
  const sorted=[...realPosts].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">質問広場</h1><p class="page-subtitle">仲間と知識を共有し、疑問を解決しよう</p></div>
    <div class="filter-tabs"><button class="filter-tab active" data-filter="all">すべて</button><button class="filter-tab" data-filter="question">❓ 質問</button><button class="filter-tab" data-filter="activity">📢 アクティビティ</button></div>
    <div class="community-layout"><div class="community-main">
      <div class="post-creator-input" id="open-post-modal"><div class="avatar" style="background:${col}">${ini}</div><span class="post-creator-placeholder">質問内容や近況を書いてください...</span></div>
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
    const podiumHtml = `<div class="card animate-slide-up"><div class="card-header"><div class="card-title">🏆 表彰台</div>
      <div class="tabs" style="max-width:240px;margin:0"><button class="tab ${p==='daily'?'active':''}" data-period="daily">今日</button><button class="tab ${p==='weekly'?'active':''}" data-period="weekly">今週</button></div></div>
      <div class="ranking-podium">${pod.map((u,di)=>{const ar=di===0?(pod.length>1?2:1):di===1?1:3;const cr=ar===1?'👑':'';const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
        return`<div class="podium-item"><div class="podium-avatar">${cr?`<span class="podium-crown">${cr}</span>`:''}
          <div class="avatar avatar-lg" style="background:${c}">${ini}</div></div>
          <div class="podium-name">${u.name}</div><div class="podium-time">${formatMinutes(u.total)}</div>
          <div class="podium-bar">${ar}</div></div>`;}).join('')}</div></div>`;

    const listHtml = `<div class="card animate-slide-up" style="animation-delay:.1s"><div class="card-header"><div class="card-title">📋 メンバーランキング</div></div>
        ${s.map((u,i)=>{const me=u.userId===currentUser.id;const c=getAvatarColor(u.userId);const ini=getInitials(u.name);
          return`<div class="ranking-row ${me?'is-me':''}"><div class="ranking-position ${posClass(i)}">${i+1}</div><div class="avatar avatar-sm" style="background:${c}">${ini}</div><div class="ranking-user-info"><div class="ranking-user-name">${u.name} ${me?'<span class="badge badge-teal">あなた</span>':''}</div></div><div class="ranking-time">${formatMinutes(u.total)}</div></div>`;}).join('')}</div>`;
    return groupTabs + podiumHtml + listHtml;
  }

  ct.innerHTML=`<div class="page-header"><h1 class="page-title">ランキング</h1><p class="page-subtitle">グループメンバーと学習時間を競い合おう</p></div>
    <div class="ranking-layout"><div id="ranking-main"><div style="text-align:center;padding:var(--space-2xl);color:var(--color-text-secondary)">読み込み中...</div></div>
      <div class="countdown-section"><div style="font-size:1.125rem;font-weight:600;margin-bottom:8px">⏰ 試験カウントダウン</div>
        ${examCountdowns.length===0?'<div class="card"><div class="card-body" style="color:var(--color-text-secondary);font-size:0.9rem">登録されているカウントダウンはありません</div></div>':''}
        ${examCountdowns.map(e=>{
          const d=daysUntil(e.exam_date);const dt=new Date(e.exam_date).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
          return`<div class="countdown-card"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:${e.color||'#4ECDC4'}"></div><div class="countdown-name">${e.name}</div><div class="countdown-date">${dt}</div><div class="countdown-days"><span class="countdown-number" style="color:${e.color||'#4ECDC4'}">${d}</span><span class="countdown-label">日</span></div></div>`;
        }).join('')}
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
      </div></div>`;
      
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
    btnSubmitCd.addEventListener('click', async (e) => {
      const name = document.getElementById('cd-title-input').value.trim();
      const dateStr = document.getElementById('cd-date-input').value;
      if (!name) { showToast('⚠️ イベント名を入力してください'); return; }
      if (!dateStr) { showToast('⚠️ 日付を選択してください'); return; }
      
      const origText = e.target.textContent;
      e.target.textContent = '保存中...'; e.target.disabled = true;
      try {
        if (supabase) {
          const payload = { name, exam_date: dateStr };
          if (session && session.user) payload.user_id = session.user.id;
          const { error } = await supabase.from('exam_countdowns').insert([payload]);
          if (error) throw error;
          showToast('✅ カウントダウンを追加しました！');
          await fetchCountdowns(); renderRanking();
        }
      } catch (err) {
        showToast('❌ 追加失敗: ' + (err.message || 'Error'));
        console.error('Countdown add error:', err);
      } finally {
        e.target.textContent = origText; e.target.disabled = false;
      }
    });
  }
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
          <div><h4 style="margin:0;font-size:1.1rem;font-weight:600">${g.name}</h4><div style="font-size:0.85rem;color:var(--color-text-secondary)">招待コード: <span style="font-weight:700;letter-spacing:1px;color:var(--color-text-primary)">${g.invite_code}</span></div></div>
          ${g.role === 'admin' ? '<span class="badge badge-teal" style="font-weight:700">👑 管理者</span>' : `<button class="btn btn-secondary btn-sm btn-leave-group" data-id="${g.id}" style="color:var(--color-accent-pink);border-color:rgba(241,148,138,0.3)">退出</button>`}
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
        <div class="settings-field"><label>メールアドレス</label><input type="email" id="input-email" value="${currentUser.email}" placeholder="ログイン共通" disabled style="opacity:0.6"/></div>
        <div class="settings-field"><label>大学・所属名</label><input type="text" id="input-univ" value="${currentUser.university}" placeholder="例: 東京大学医学部"/></div>
        <div class="settings-field"><label>学年</label>
          <select id="input-grade">${[1,2,3,4,5,6].map(gr=>`<option value="${gr}" ${gr===currentUser.grade?'selected':''}>${gr}年</option>`).join('')}</select>
        </div>
        <div class="settings-row">
          <button class="btn btn-primary" id="save-profile-btn" style="width:100%;justify-content:center">💾 プロフィールを保存</button>
        </div>
      </div>
    </div>

    <!-- Group Manage -->
    <div class="settings-card animate-slide-up" style="animation-delay:.16s">
      <h3 class="settings-section-title">👥 所属グループ管理</h3>
      <div style="margin-bottom:var(--space-lg)">${groupsHtml}</div>
      <div class="settings-row" style="gap:var(--space-md);flex-wrap:wrap;border-top:1px solid var(--color-border);padding-top:var(--space-lg)">
        <div style="flex:1;min-width:240px">
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:8px">➕ 新しいグループを作成</label>
          <div style="display:flex;gap:8px"><input type="text" id="new-group-name" placeholder="グループ名..." style="flex:1;font-size:0.9rem" /><button class="btn btn-primary btn-sm" id="btn-create-group">作成</button></div>
        </div>
        <div style="flex:1;min-width:240px">
          <label style="font-size:var(--font-size-xs);font-weight:600;color:var(--color-text-secondary);display:block;margin-bottom:8px">🤝 既存のグループに参加</label>
          <div style="display:flex;gap:8px"><input type="text" id="join-group-code" placeholder="招待コード (6文字)" style="flex:1;text-transform:uppercase;font-size:0.9rem" /><button class="btn btn-secondary btn-sm" id="btn-join-group">参加</button></div>
        </div>
      </div>
    </div>

    <!-- Privacy Settings -->
    <div class="settings-card animate-slide-up" style="animation-delay:.20s">
      <h3 class="settings-section-title">🔒 プライバシー設定</h3>
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
            <option value="機能要望">✨ 機能要望</option>
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

  // Save profile button
  document.getElementById('save-profile-btn').addEventListener('click', async (e)=>{
    const newName=document.getElementById('input-name').value.trim();
    const newUniv=document.getElementById('input-univ').value.trim();
    const newGrade=parseInt(document.getElementById('input-grade').value);
    const isPublic = document.getElementById('input-public').checked;
    if(!newName){ document.getElementById('input-name').focus(); showToast('⚠️ 名前を入力してください'); return; }
    
    e.target.textContent = '保存中...';
    if (supabase && session) {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: newName,
        university: newUniv,
        grade: newGrade,
        is_public: isPublic
      });
      if (error) { showToast('❌ 保存に失敗しました: ' + error.message); e.target.textContent = '💾 プロフィールを保存'; return; }
    }

    currentUser.name=newName;
    currentUser.university=newUniv||'未設定';
    currentUser.grade=newGrade;
    currentUser.is_public=isPublic;
    renderSidebar();
    showToast('✅ プロフィールを保存しました！');
    e.target.textContent = '💾 プロフィールを保存';
    renderDashboard();
  });

  // Group Create/Join logic
  document.getElementById('btn-create-group')?.addEventListener('click', async (e) => {
    const nm = document.getElementById('new-group-name').value.trim();
    if(!nm) { showToast('⚠️ グループ名を入力してください'); return; }
    const btn = e.target; const origText = btn.textContent;
    btn.textContent = '作成中...'; btn.disabled = true;
    try { await createGroup(nm); } finally { btn.textContent = origText; btn.disabled = false; }
  });
  
  document.getElementById('btn-join-group')?.addEventListener('click', async (e) => {
    const cd = document.getElementById('join-group-code').value.trim();
    if(cd.length < 4) { showToast('⚠️ 正しい招待コードを入力してください'); return; }
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
    
    if (!body) { showToast('⚠️ 内容を入力してください'); return; }
    
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
registerRoute('/community',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderCommunity();});
registerRoute('/ranking',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderRanking();});
registerRoute('/settings',()=>{if(!session){renderLogin();return;}ensureAppLayout();document.body.classList.remove('hide-sidebar');destroyAllCharts();renderSidebar();renderSettings();});

async function initApp(){
  console.log('DEBUG: initApp started');
  if(supabase) {
    try {
      await fetchCountdowns();
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
          await fetchUserGroups();
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
