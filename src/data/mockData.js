// ============================================================
// MedFocus Mock Data
// ============================================================

// --- ユーザー ---
export const currentUser = {
  id: 'user-001',
  name: '田中 太郎',
  email: 'tanaka@med.example-u.ac.jp',
  university: '東京大学医学部',
  grade: 4,
  avatarUrl: null,
  is_public: true,
  createdAt: '2025-04-01T00:00:00Z',
};

export const users = [
  currentUser,
  { id: 'user-002', name: '佐藤 花子', email: 'sato@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-01T00:00:00Z' },
  { id: 'user-003', name: '鈴木 一郎', email: 'suzuki@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-02T00:00:00Z' },
  { id: 'user-004', name: '高橋 美咲', email: 'takahashi@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-03T00:00:00Z' },
  { id: 'user-005', name: '伊藤 健太', email: 'ito@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-03T00:00:00Z' },
  { id: 'user-006', name: '渡辺 さくら', email: 'watanabe@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-05T00:00:00Z' },
  { id: 'user-007', name: '山本 大輝', email: 'yamamoto@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-06T00:00:00Z' },
  { id: 'user-008', name: '中村 愛', email: 'nakamura@med.example-u.ac.jp', university: '東京大学医学部', grade: 4, avatarUrl: null, createdAt: '2025-04-06T00:00:00Z' },
];

// --- グループ ---
export const groups = [
  {
    id: 'group-001',
    name: '東大医4年 勉強会',
    inviteCode: 'MED4TK',
    university: '東京大学医学部',
    createdAt: '2025-04-01T00:00:00Z',
  },
];

export const groupMembers = users.map((u, i) => ({
  userId: u.id,
  groupId: 'group-001',
  role: i === 0 ? 'admin' : 'member',
  joinedAt: u.createdAt,
}));

// --- 科目カテゴリと科目 ---
export const subjectCategories = [
  {
    id: 'cat-basic', name: '基礎医学', color: '#4ECDC4',
    subjects: [
      { id: 'sub-anatomy', name: '解剖学', totalTopics: 25 },
      { id: 'sub-physiology', name: '生理学', totalTopics: 20 },
      { id: 'sub-biochem', name: '生化学', totalTopics: 18 },
      { id: 'sub-pharma', name: '薬理学', totalTopics: 22 },
      { id: 'sub-patho', name: '病理学', totalTopics: 15 },
      { id: 'sub-micro', name: '微生物学', totalTopics: 16 },
    ],
  },
  {
    id: 'cat-internal', name: '内科系', color: '#45B7D1',
    subjects: [
      { id: 'sub-cardio', name: '循環器', totalTopics: 20 },
      { id: 'sub-resp', name: '呼吸器', totalTopics: 16 },
      { id: 'sub-gastro', name: '消化器', totalTopics: 18 },
      { id: 'sub-renal', name: '腎臓', totalTopics: 14 },
      { id: 'sub-endo', name: '内分泌', totalTopics: 15 },
      { id: 'sub-hema', name: '血液', totalTopics: 12 },
      { id: 'sub-immune', name: '免疫・膠原病', totalTopics: 14 },
    ],
  },
  {
    id: 'cat-surgery', name: '外科系', color: '#F7DC6F',
    subjects: [
      { id: 'sub-gensurg', name: '一般外科', totalTopics: 16 },
      { id: 'sub-ortho', name: '整形外科', totalTopics: 14 },
      { id: 'sub-neuro-s', name: '脳神経外科', totalTopics: 12 },
      { id: 'sub-cardio-s', name: '心臓血管外科', totalTopics: 10 },
    ],
  },
  {
    id: 'cat-minor', name: 'マイナー', color: '#BB8FCE',
    subjects: [
      { id: 'sub-eye', name: '眼科', totalTopics: 12 },
      { id: 'sub-ent', name: '耳鼻咽喉科', totalTopics: 12 },
      { id: 'sub-derm', name: '皮膚科', totalTopics: 10 },
      { id: 'sub-uro', name: '泌尿器科', totalTopics: 10 },
      { id: 'sub-obgyn', name: '産婦人科', totalTopics: 16 },
      { id: 'sub-peds', name: '小児科', totalTopics: 18 },
    ],
  },
  {
    id: 'cat-public', name: '公衆衛生・社会医学', color: '#F1948A',
    subjects: [
      { id: 'sub-pubhealth', name: '公衆衛生', totalTopics: 14 },
      { id: 'sub-legal', name: '法医学', totalTopics: 8 },
      { id: 'sub-stats', name: '医療統計', totalTopics: 10 },
    ],
  },
  {
    id: 'cat-exam', name: '国試・CBT対策', color: '#F0B27A',
    subjects: [
      { id: 'sub-cbt', name: 'CBT対策', totalTopics: 30 },
      { id: 'sub-kokushi', name: '国試過去問', totalTopics: 40 },
    ],
  },
];

// --- 履修チェックリスト ---
export const CBT_CHECKLIST = [
  { category: '基礎医学: 解剖学', color: '#4ECDC4', topics: ["骨格系", "筋系", "循環器系", "呼吸器系", "消化器系", "神経系", "感覚器系", "泌尿生殖器系"] },
  { category: '基礎医学: 生理学', color: '#4ECDC4', topics: ["細胞生理", "神経生理", "筋収縮", "循環生理", "呼吸生理", "腎生理・体液", "消化吸収", "内分泌・代謝", "体温調節", "感覚・特殊感覚"] },
  { category: '基礎医学: 生化学', color: '#4ECDC4', topics: ["糖代謝", "脂質代謝", "タンパク質・アミノ酸代謝", "核酸代謝", "ビタミン・補酵素", "酵素論", "エネルギー代謝（TCA・酸化的リン酸化）"] },
  { category: '基礎医学: 病理学', color: '#4ECDC4', topics: ["細胞障害・適応", "炎症", "修復・再生", "循環障害", "腫瘍総論", "感染病理", "免疫病理"] },
  { category: '基礎医学: 微生物学', color: '#4ECDC4', topics: ["細菌（グラム陽性・陰性）", "ウイルス（DNA・RNA）", "真菌・寄生虫", "消毒・滅菌", "感染防御"] },
  { category: '基礎医学: 薬理学', color: '#4ECDC4', topics: ["薬物動態", "薬力学", "自律神経薬", "循環器薬", "抗菌薬", "抗悪性腫瘍薬", "中枢神経薬", "内分泌・代謝薬"] },
  { category: '内科系: 循環器', color: '#45B7D1', topics: ["虚血性心疾患", "不整脈", "心不全", "弁膜症", "大動脈疾患", "高血圧", "心筋症・心膜炎"] },
  { category: '内科系: 呼吸器', color: '#45B7D1', topics: ["肺炎", "COPD", "喘息", "肺癌", "間質性肺炎", "胸膜疾患", "呼吸不全"] },
  { category: '内科系: 消化器', color: '#45B7D1', topics: ["消化管疾患", "肝臓疾患", "胆道系疾患", "膵臓疾患", "消化管出血", "腸閉塞"] },
  { category: '内科系: 腎臓・泌尿器', color: '#45B7D1', topics: ["急性・慢性腎不全", "ネフローゼ・腎炎症候群", "電解質異常", "尿路感染"] },
  { category: '内科系: 代謝・内分泌', color: '#45B7D1', topics: ["甲状腺疾患", "副腎疾患", "下垂体疾患", "糖尿病", "脂質異常症"] },
  { category: '内科系: 血液', color: '#45B7D1', topics: ["貧血", "白血病", "リンパ腫", "凝固・出血疾患"] },
  { category: '内科系: 神経', color: '#45B7D1', topics: ["脳血管障害", "変性疾患", "てんかん", "脱髄疾患"] },
  { category: '外科系: 外科総論', color: '#F7DC6F', topics: ["術前・術後管理", "輸液・輸血", "ショック対応", "麻酔"] },
  { category: '外科系: 消化器外科', color: '#F7DC6F', topics: ["消化器癌", "虫垂炎", "ヘルニア", "急性腹症"] },
  { category: '産科・婦人科: 産科', color: '#BB8FCE', topics: ["正常妊娠・分娩", "妊娠高血圧症候群", "前置胎盤", "早産・流産"] },
  { category: '産科・婦人科: 婦人科', color: '#BB8FCE', topics: ["子宮癌", "卵巣腫瘍", "内膜症", "不妊症"] },
  { category: '小児・精神: 小児科', color: '#F1948A', topics: ["発達・発育", "先天奇形", "新生児疾患", "小児感染症"] },
  { category: '小児・精神: 精神科', color: '#F1948A', topics: ["統合失調症", "気分障害", "不安障害", "認知症"] },
  { category: '社会医学: 公衆衛生', color: '#94A3B8', topics: ["疫学", "感染症法", "予防医学", "死亡統計"] },
  { category: '救急・集中: 救急総論', color: '#E17055', topics: ["ACLS・BLS", "外傷初期対応", "中毒", "熱中症"] },
];

export const KOKUSHI_CHECKLIST = [
  { category: '基礎医学: 解剖学', color: '#4ECDC4', topics: ["体表解剖・断面像", "骨格系・肉眼解剖", "神経解剖", "脈管系", "内臓解剖"] },
  { category: '基礎医学: 生理学', color: '#4ECDC4', topics: ["心電図機序", "呼吸生理", "腎生理", "内分泌フィードバック", "自律神経調節"] },
  { category: '基礎医学: 生化学・病理', color: '#4ECDC4', topics: ["先天性代謝異常", "ビタミン欠乏症", "ショック病態", "DIC機序", "炎症・免疫病理"] },
  { category: '内科系: 循環器', color: '#45B7D1', topics: ["急性冠症候群", "心不全", "弁膜症", "不整脈", "大動脈解離", "心タンポナーデ"] },
  { category: '内科系: 呼吸器', color: '#45B7D1', topics: ["肺炎", "COPD・喘息", "肺癌", "間質性肺炎", "自然気胸", "肺塞栓症"] },
  { category: '内科系: 消化器', color: '#45B7D1', topics: ["食道・胃・大腸癌", "IBD", "急性・慢性膵炎", "胆石・胆管炎", "消化管出血"] },
  { category: '内科系: 肝胆膵', color: '#45B7D1', topics: ["ウイルス性肝炎", "肝硬変", "肝細胞癌", "自己免疫性肝疾患", "肝不全"] },
  { category: '内科系: 腎臓', color: '#45B7D1', topics: ["AKI", "CKD・透析", "ネフローゼ", "腎炎症候群", "水・電解質平衡"] },
  { category: '内科系: 代謝・内分泌', color: '#45B7D1', topics: ["糖尿病", "甲状腺疾患", "副腎疾患", "下垂体疾患", "脂質異常症"] },
  { category: '内科系: 血液', color: '#45B7D1', topics: ["貧血", "白血病・MDS", "悪性リンパ腫", "骨髄腫", "凝固異常"] },
  { category: '内科系: 神経', color: '#45B7D1', topics: ["脳血管障害", "神経変性疾患", "認知症", "てんかん", "髄膜炎", "頭痛"] },
  { category: '内科系: 膠原病・感染症', color: '#45B7D1', topics: ["関節リウマチ", "SLE", "血管炎", "敗血症", "HIV・結核", "ワクチン"] },
  { category: '外科系: 外科総論', color: '#F7DC6F', topics: ["周術期管理", "麻酔管理", "創傷・ドレーン管理", "術後合併症"] },
  { category: '外科系: 消化器外科', color: '#F7DC6F', topics: ["胃・大腸術式", "肝胆膵手術", "急性腹症"] },
  { category: '外科系: 胸部・心臓外科', color: '#F7DC6F', topics: ["肺癌手術", "弁置換・CABG", "大動脈置換"] },
  { category: '外科系: 脳神経外科', color: '#F7DC6F', topics: ["頭部外傷", "脳腫瘍摘出", "破裂動脈瘤"] },
  { category: '外科系: 整形外科', color: '#F7DC6F', topics: ["骨折固定法", "脊椎疾患", "人工関節"] },
  { category: '産婦人科: 産科', color: '#BB8FCE', topics: ["正常分娩", "PIH", "胎盤剥離・前置胎盤", "胎児不全", "NCPR"] },
  { category: '産婦人科: 婦人科', color: '#BB8FCE', topics: ["子宮頸癌", "体癌・卵巣腫瘍", "内膜症・筋腫", "更年期・不妊"] },
  { category: '小児科: 小児科', color: '#F1948A', topics: ["発達・発育評価", "先天性心疾患", "小児感染症", "小児腫瘍", "発達障害"] },
  { category: '精神科: 精神科', color: '#F0B27A', topics: ["統合失調症", "気分障害", "不安症", "認知症対応", "精神保健法"] },
  { category: '社会医学: 公衆衛生', color: '#94A3B8', topics: ["疫学・統計", "医療・介護保険", "医師法", "感染症法"] },
  { category: '社会医学: 臨床倫理', color: '#94A3B8', topics: ["IC", "ACP", "医療安全"] },
  { category: '救急科: 救急医学', color: '#E17055', topics: ["BLS・ACLS", "JATEC", "中毒・熱中症", "人工呼吸"] }
];

export const userChecklistProgress = [];

export const subjectProgress = [
  { id: 'sp-01', userId: 'user-001', category: '基礎医学', subjectName: '解剖学', subjectId: 'sub-anatomy', completedTopics: 22, totalTopics: 25, progressRate: 88 },
  { id: 'sp-02', userId: 'user-001', category: '基礎医学', subjectName: '生理学', subjectId: 'sub-physiology', completedTopics: 15, totalTopics: 20, progressRate: 75 },
];

export function generateStudyLogs() {
  const logs = [];
  const subjectIds = ['sub-cardio', 'sub-anatomy', 'sub-pharma', 'sub-gastro', 'sub-resp', 'sub-patho', 'sub-cbt', 'sub-kokushi'];
  const today = new Date();
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today); date.setDate(date.getDate() - dayOffset);
    const sessionsCount = Math.floor(Math.random() * 4) + 1;
    for (let s = 0; s < sessionsCount; s++) {
      const hour = 8 + Math.floor(Math.random() * 12);
      const duration = 20 + Math.floor(Math.random() * 100);
      const startedAt = new Date(date); startedAt.setHours(hour, 0, 0, 0);
      const endedAt = new Date(startedAt); endedAt.setMinutes(endedAt.getMinutes() + duration);
      logs.push({ id: `log-${dayOffset}-${s}`, userId: 'user-001', subjectId: subjectIds[Math.floor(Math.random() * subjectIds.length)], durationMinutes: duration, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), memo: s === 0 ? "集中できた" : null });
    }
  }
  return logs;
}

export const studyLogs = generateStudyLogs();

export const userStudyTotals = [
  { userId: 'user-001', name: '田中 太郎', weeklyMinutes: 0, dailyMinutes: 0 },
  { userId: 'user-002', name: '佐藤 花子', weeklyMinutes: 1850, dailyMinutes: 290 },
  { userId: 'user-003', name: '鈴木 一郎', weeklyMinutes: 2100, dailyMinutes: 340 },
  { userId: 'user-004', name: '高橋 美咲', weeklyMinutes: 1600, dailyMinutes: 210 },
  { userId: 'user-005', name: '伊藤 健太', weeklyMinutes: 1950, dailyMinutes: 310 },
  { userId: 'user-006', name: '渡辺 さくら', weeklyMinutes: 2250, dailyMinutes: 360 },
  { userId: 'user-007', name: '山本 大輝', weeklyMinutes: 1400, dailyMinutes: 180 },
  { userId: 'user-008', name: '中村 愛', weeklyMinutes: 1750, dailyMinutes: 250 },
];

// --- 投稿（質問広場） ---
export const posts = [
  {
    id: 'post-001', userId: 'user-002', groupId: 'group-001', type: 'question', title: '僧帽弁閉鎖不全症の聴診所見について',
    body: '僧帽弁閉鎖不全症で汎収縮期雑音が聞こえる理由がよくわかりません。',
    likes: 5, createdAt: '2026-03-19T08:30:00Z', comments: [],
  },
  {
    id: 'post-002', userId: 'user-001', groupId: 'group-001', type: 'activity', title: null,
    body: '循環器の勉強を頑張っています！',
    likes: 2, createdAt: '2026-03-19T10:00:00Z', comments: [],
  }
];

export const examCountdowns = [
  { id: 'exam-001', name: 'CBT', date: '2026-08-20T09:00:00+09:00', color: '#4ECDC4' },
  { id: 'exam-002', name: '本試験', date: '2027-02-06T09:00:00+09:00', color: '#45B7D1' },
];

export const activityFeed = [
  { userId: 'user-001', name: '田中 太郎', action: '循環器を勉強中', time: '10分前', icon: '🫀' },
  { userId: 'user-002', name: '佐藤 花子', action: '解剖学を修了', time: '1時間前', icon: '📖' },
];
