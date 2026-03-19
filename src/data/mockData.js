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
    id: 'cat-basic',
    name: '基礎医学',
    color: '#4ECDC4',
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
    id: 'cat-internal',
    name: '内科系',
    color: '#45B7D1',
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
    id: 'cat-surgery',
    name: '外科系',
    color: '#F7DC6F',
    subjects: [
      { id: 'sub-gensurg', name: '一般外科', totalTopics: 16 },
      { id: 'sub-ortho', name: '整形外科', totalTopics: 14 },
      { id: 'sub-neuro-s', name: '脳神経外科', totalTopics: 12 },
      { id: 'sub-cardio-s', name: '心臓血管外科', totalTopics: 10 },
    ],
  },
  {
    id: 'cat-minor',
    name: 'マイナー',
    color: '#BB8FCE',
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
    id: 'cat-public',
    name: '公衆衛生・社会医学',
    color: '#F1948A',
    subjects: [
      { id: 'sub-pubhealth', name: '公衆衛生', totalTopics: 14 },
      { id: 'sub-legal', name: '法医学', totalTopics: 8 },
      { id: 'sub-stats', name: '医療統計', totalTopics: 10 },
    ],
  },
  {
    id: 'cat-exam',
    name: '国試・CBT対策',
    color: '#F0B27A',
    subjects: [
      { id: 'sub-cbt', name: 'CBT対策', totalTopics: 30 },
      { id: 'sub-kokushi', name: '国試過去問', totalTopics: 40 },
      { id: 'sub-moshi', name: '模試', totalTopics: 10 },
    ],
  },
];

// --- 履修チェックリスト（CBT & 国試） ---
export const CBT_CHECKLIST = [
  { category: 'ブロック1 (基礎医学)', color: '#4ECDC4', topics: ['解剖学・組織学', '生理学', '生化学', '薬理学', '病理学', '微生物・感染症学', '免疫学'] },
  { category: 'ブロック2,3 (臨床・全身)', color: '#45B7D1', topics: ['循環器', '呼吸器', '消化器', '腎・泌尿器', '神経', '内分泌・代謝', '血液', 'アレルギー・膠原病'] },
  { category: 'ブロック2,3 (臨床・各科)', color: '#96CEB4', topics: ['外科学一般・麻酔科', '小児科', '産婦人科', '精神科', '救急・中毒科', '眼科', '耳鼻咽喉科', '皮膚科', '放射線科'] },
  { category: 'ブロック4 (社会医学)', color: '#F7DC6F', topics: ['公衆衛生学', '法医学'] },
  { category: 'ブロック5,6 (連問・多選択)', color: '#BB8FCE', topics: ['ブロック5 臨床実地問題', 'ブロック6 順次解答4連問'] }
];

export const KOKUSHI_CHECKLIST = [
  { category: '必修・基本事項', color: '#4ECDC4', topics: ['医師のプロフェッショナリズム', '医学総論（必修）', '医学各論（必修）', '公衆衛生（必修）', '救急初期対応'] },
  { category: '医学総論', color: '#45B7D1', topics: ['症候学・臨床推論', '身体診察', '検査生理・画像', '治療・処置'] },
  { category: '医学各論（内科・外科）', color: '#96CEB4', topics: ['循環器', '呼吸器', '消化管・肝胆膵', '腎臓', '内分泌・代謝', '血液・造血器', '免疫・アレルギー', '感染症'] },
  { category: '医学各論（マイナー・他）', color: '#F7DC6F', topics: ['神経', '精神科', '小児科', '産科・婦人科', '眼科', '耳鼻咽喉科', '整形外科', '皮膚科', '泌尿器科', '放射線科'] },
  { category: '社会医学・その他', color: '#F1948A', topics: ['公衆衛生・予防医学', '統計・疫学', '関係法規・医療制度'] }
];

export const userChecklistProgress = [
  { category: 'ブロック1 (基礎医学)', topic: '解剖学・組織学', completed: true },
  { category: 'ブロック1 (基礎医学)', topic: '生理学', completed: true },
  { category: '医学各論（内科・外科）', topic: '循環器', completed: true },
  { category: '医学各論（内科・外科）', topic: '呼吸器', completed: true },
];

export const subjectProgress = [
  { id: 'sp-01', userId: 'user-001', category: '基礎医学', subjectName: '解剖学', subjectId: 'sub-anatomy', completedTopics: 22, totalTopics: 25, progressRate: 88 },
  { id: 'sp-02', userId: 'user-001', category: '基礎医学', subjectName: '生理学', subjectId: 'sub-physiology', completedTopics: 15, totalTopics: 20, progressRate: 75 },
  { id: 'sp-03', userId: 'user-001', category: '基礎医学', subjectName: '生化学', subjectId: 'sub-biochem', completedTopics: 10, totalTopics: 18, progressRate: 55.6 },
  { id: 'sp-04', userId: 'user-001', category: '基礎医学', subjectName: '薬理学', subjectId: 'sub-pharma', completedTopics: 18, totalTopics: 22, progressRate: 81.8 },
  { id: 'sp-05', userId: 'user-001', category: '基礎医学', subjectName: '病理学', subjectId: 'sub-patho', completedTopics: 12, totalTopics: 15, progressRate: 80 },
  { id: 'sp-06', userId: 'user-001', category: '基礎医学', subjectName: '微生物学', subjectId: 'sub-micro', completedTopics: 8, totalTopics: 16, progressRate: 50 },

  { id: 'sp-07', userId: 'user-001', category: '内科系', subjectName: '循環器', subjectId: 'sub-cardio', completedTopics: 16, totalTopics: 20, progressRate: 80 },
  { id: 'sp-08', userId: 'user-001', category: '内科系', subjectName: '呼吸器', subjectId: 'sub-resp', completedTopics: 10, totalTopics: 16, progressRate: 62.5 },
  { id: 'sp-09', userId: 'user-001', category: '内科系', subjectName: '消化器', subjectId: 'sub-gastro', completedTopics: 14, totalTopics: 18, progressRate: 77.8 },
  { id: 'sp-10', userId: 'user-001', category: '内科系', subjectName: '腎臓', subjectId: 'sub-renal', completedTopics: 5, totalTopics: 14, progressRate: 35.7 },
  { id: 'sp-11', userId: 'user-001', category: '内科系', subjectName: '内分泌', subjectId: 'sub-endo', completedTopics: 8, totalTopics: 15, progressRate: 53.3 },
  { id: 'sp-12', userId: 'user-001', category: '内科系', subjectName: '血液', subjectId: 'sub-hema', completedTopics: 9, totalTopics: 12, progressRate: 75 },
  { id: 'sp-13', userId: 'user-001', category: '内科系', subjectName: '免疫・膠原病', subjectId: 'sub-immune', completedTopics: 6, totalTopics: 14, progressRate: 42.9 },

  { id: 'sp-14', userId: 'user-001', category: '外科系', subjectName: '一般外科', subjectId: 'sub-gensurg', completedTopics: 10, totalTopics: 16, progressRate: 62.5 },
  { id: 'sp-15', userId: 'user-001', category: '外科系', subjectName: '整形外科', subjectId: 'sub-ortho', completedTopics: 7, totalTopics: 14, progressRate: 50 },
  { id: 'sp-16', userId: 'user-001', category: '外科系', subjectName: '脳神経外科', subjectId: 'sub-neuro-s', completedTopics: 4, totalTopics: 12, progressRate: 33.3 },
  { id: 'sp-17', userId: 'user-001', category: '外科系', subjectName: '心臓血管外科', subjectId: 'sub-cardio-s', completedTopics: 3, totalTopics: 10, progressRate: 30 },

  { id: 'sp-18', userId: 'user-001', category: 'マイナー', subjectName: '眼科', subjectId: 'sub-eye', completedTopics: 6, totalTopics: 12, progressRate: 50 },
  { id: 'sp-19', userId: 'user-001', category: 'マイナー', subjectName: '耳鼻咽喉科', subjectId: 'sub-ent', completedTopics: 4, totalTopics: 12, progressRate: 33.3 },
  { id: 'sp-20', userId: 'user-001', category: 'マイナー', subjectName: '皮膚科', subjectId: 'sub-derm', completedTopics: 3, totalTopics: 10, progressRate: 30 },
  { id: 'sp-21', userId: 'user-001', category: 'マイナー', subjectName: '泌尿器科', subjectId: 'sub-uro', completedTopics: 2, totalTopics: 10, progressRate: 20 },
  { id: 'sp-22', userId: 'user-001', category: 'マイナー', subjectName: '産婦人科', subjectId: 'sub-obgyn', completedTopics: 8, totalTopics: 16, progressRate: 50 },
  { id: 'sp-23', userId: 'user-001', category: 'マイナー', subjectName: '小児科', subjectId: 'sub-peds', completedTopics: 10, totalTopics: 18, progressRate: 55.6 },

  { id: 'sp-24', userId: 'user-001', category: '公衆衛生・社会医学', subjectName: '公衆衛生', subjectId: 'sub-pubhealth', completedTopics: 7, totalTopics: 14, progressRate: 50 },
  { id: 'sp-25', userId: 'user-001', category: '公衆衛生・社会医学', subjectName: '法医学', subjectId: 'sub-legal', completedTopics: 3, totalTopics: 8, progressRate: 37.5 },
  { id: 'sp-26', userId: 'user-001', category: '公衆衛生・社会医学', subjectName: '医療統計', subjectId: 'sub-stats', completedTopics: 5, totalTopics: 10, progressRate: 50 },

  { id: 'sp-27', userId: 'user-001', category: '国試・CBT対策', subjectName: 'CBT対策', subjectId: 'sub-cbt', completedTopics: 20, totalTopics: 30, progressRate: 66.7 },
  { id: 'sp-28', userId: 'user-001', category: '国試・CBT対策', subjectName: '国試過去問', subjectId: 'sub-kokushi', completedTopics: 15, totalTopics: 40, progressRate: 37.5 },
  { id: 'sp-29', userId: 'user-001', category: '国試・CBT対策', subjectName: '模試', subjectId: 'sub-moshi', completedTopics: 4, totalTopics: 10, progressRate: 40 },
];

// --- 学習ログ（過去14日分） ---
function generateStudyLogs() {
  const logs = [];
  const subjectIds = ['sub-cardio', 'sub-anatomy', 'sub-pharma', 'sub-gastro', 'sub-resp', 'sub-patho', 'sub-cbt', 'sub-kokushi'];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const sessionsCount = Math.floor(Math.random() * 4) + 1;

    for (let s = 0; s < sessionsCount; s++) {
      const hour = 8 + Math.floor(Math.random() * 12);
      const duration = 20 + Math.floor(Math.random() * 100);
      const startedAt = new Date(date);
      startedAt.setHours(hour, 0, 0, 0);
      const endedAt = new Date(startedAt);
      endedAt.setMinutes(endedAt.getMinutes() + duration);

      logs.push({
        id: `log-${dayOffset}-${s}`,
        userId: 'user-001',
        subjectId: subjectIds[Math.floor(Math.random() * subjectIds.length)],
        durationMinutes: duration,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      });
    }
  }
  return logs;
}

export const studyLogs = generateStudyLogs();

// --- 他ユーザーの勉強時間（ランキング用） ---
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

// 現在ユーザーの時間を計算
(() => {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const myEntry = userStudyTotals.find(u => u.userId === 'user-001');
  myEntry.weeklyMinutes = studyLogs
    .filter(l => new Date(l.startedAt) >= oneWeekAgo)
    .reduce((sum, l) => sum + l.durationMinutes, 0);
  myEntry.dailyMinutes = studyLogs
    .filter(l => new Date(l.startedAt) >= todayStart)
    .reduce((sum, l) => sum + l.durationMinutes, 0);
})();

// --- 投稿（質問広場） ---
export const posts = [
  {
    id: 'post-001',
    userId: 'user-002',
    groupId: 'group-001',
    type: 'question',
    title: '僧帽弁閉鎖不全症の聴診所見について',
    body: '僧帽弁閉鎖不全症で汎収縮期雑音が聞こえる理由がよくわかりません。大動脈弁狭窄症との鑑別ポイントも含めて教えていただけると助かります。',
    imageUrl: null,
    isAnonymous: false,
    createdAt: '2026-03-19T08:30:00Z',
    likes: 5,
    comments: [
      { id: 'c-001', postId: 'post-001', userId: 'user-001', body: 'MRは左室→左房への逆流が収縮期全体を通じて起こるから汎収縮期雑音になります。ASは駆出性だから菱形型の雑音パターンで、最強点も異なります（AS: 第2肋間胸骨右縁、MR: 心尖部）。', isAnonymous: false, createdAt: '2026-03-19T08:45:00Z' },
      { id: 'c-002', postId: 'post-001', userId: 'user-003', body: '頸部への放散があればASを疑います。腋窩への放散ならMRです。', isAnonymous: false, createdAt: '2026-03-19T09:00:00Z' },
    ],
  },
  {
    id: 'post-002',
    userId: 'user-004',
    groupId: 'group-001',
    type: 'question',
    title: 'ネフローゼ症候群の分類で混乱しています',
    body: '微小変化型と膜性腎症の違いが覚えられません。年齢層や補体の変動、予後の違いなど、まとめ方のコツがあれば教えてください。',
    imageUrl: null,
    isAnonymous: false,
    createdAt: '2026-03-18T22:15:00Z',
    likes: 8,
    comments: [
      { id: 'c-003', postId: 'post-002', userId: 'user-005', body: '表で整理すると覚えやすいです！微小変化型：小児に多い、選択性蛋白尿、ステロイド著効。膜性腎症：成人に多い、非選択性蛋白尿、予後は比較的良好だが一部進行。', isAnonymous: false, createdAt: '2026-03-18T22:40:00Z' },
    ],
  },
  {
    id: 'post-003',
    userId: 'user-006',
    groupId: 'group-001',
    type: 'question',
    title: '薬理学のゴロ合わせを共有しませんか？',
    body: 'β遮断薬の分類（ISA+/ISA-）や、Ca拮抗薬のDHP系/非DHP系の区別で良いゴロ合わせがあれば教えてください！',
    imageUrl: null,
    isAnonymous: true,
    createdAt: '2026-03-18T20:00:00Z',
    likes: 12,
    comments: [],
  },
  {
    id: 'post-004',
    userId: 'user-007',
    groupId: 'group-001',
    type: 'activity',
    title: null,
    body: '循環器の勉強を開始しました 🫀',
    imageUrl: null,
    isAnonymous: false,
    createdAt: '2026-03-19T10:00:00Z',
    likes: 3,
    comments: [],
  },
  {
    id: 'post-005',
    userId: 'user-008',
    groupId: 'group-001',
    type: 'activity',
    title: null,
    body: '生化学のまとめノートが完成しました 📘',
    imageUrl: null,
    isAnonymous: false,
    createdAt: '2026-03-19T09:30:00Z',
    likes: 6,
    comments: [],
  },
  {
    id: 'post-006',
    userId: 'user-003',
    groupId: 'group-001',
    type: 'question',
    title: 'CBT対策のおすすめ問題集',
    body: 'CBT対策に「QAssist」と「medu4」のどちらが良いか迷っています。4年の皆さんはどちらを使っていますか？',
    imageUrl: null,
    isAnonymous: false,
    createdAt: '2026-03-18T15:00:00Z',
    likes: 15,
    comments: [
      { id: 'c-004', postId: 'post-006', userId: 'user-001', body: '自分はQAssist使ってます。動画の解説もわかりやすいし、問題数も充実している印象です。', isAnonymous: false, createdAt: '2026-03-18T15:20:00Z' },
      { id: 'c-005', postId: 'post-006', userId: 'user-006', body: 'medu4の方がコンパクトに要点がまとまっている気がします。好みですね！', isAnonymous: false, createdAt: '2026-03-18T16:00:00Z' },
    ],
  },
];

// --- 試験カウントダウン ---
export const examCountdowns = [
  { id: 'exam-001', name: 'CBT', date: '2026-08-20T09:00:00+09:00', color: '#4ECDC4' },
  { id: 'exam-002', name: '本試験', date: '2027-02-06T09:00:00+09:00', color: '#45B7D1' },
  { id: 'exam-003', name: '内科学中間試験', date: '2026-05-15T09:00:00+09:00', color: '#F7DC6F' },
];

// --- アクティビティフィード ---
export const activityFeed = [
  { userId: 'user-007', name: '山本 大輝', action: '循環器の勉強を開始しました', time: '10分前', icon: '🫀' },
  { userId: 'user-008', name: '中村 愛', action: '生化学のまとめノートが完成しました', time: '30分前', icon: '📘' },
  { userId: 'user-002', name: '佐藤 花子', action: '解剖学で2時間勉強しました', time: '1時間前', icon: '📖' },
  { userId: 'user-005', name: '伊藤 健太', action: '国試過去問を30問解きました', time: '2時間前', icon: '✏️' },
  { userId: 'user-003', name: '鈴木 一郎', action: '薬理学の進捗が80%になりました', time: '3時間前', icon: '🎯' },
  { userId: 'user-006', name: '渡辺 さくら', action: '呼吸器の勉強を開始しました', time: '4時間前', icon: '🫁' },
  { userId: 'user-004', name: '高橋 美咲', action: '質問を投稿しました', time: '5時間前', icon: '❓' },
];
