// AI分析用エクスポート（buildAiExportData / formatAiExportMarkdown）の純関数テスト。
//   node test_export_prompt.cjs           … テストだけ
//   node test_export_prompt.cjs --print   … ダミーデータでの出力例も表示する
// app.js を jsdom 上で eval して window に生えた関数を直接叩く（test_qb_sections.cjs と同じ方式）。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="page-container"></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost' }
);
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
global.setTimeout = (cb) => cb();
global.clearTimeout = () => {};

const code = fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/import\.meta\.env/g, '({})');
window.eval(code);

const W = window;
let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : ''));
}
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  fail++; failures.push(`${name}\n    expected: ${e}\n    actual:   ${a}`);
}

// ---------- ダミーデータ ----------
// 時刻はローカル時刻で作る（実行環境のタイムゾーンに左右されないように）
const TODAY = '2026-10-02';
const at = (dateKey, hh, mm) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm || 0).toISOString();
};
const log = (date, subject, min, extra) => Object.assign({
  started_at: at(date, 10), subject_name: subject, duration_minutes: min, activity: 'qb',
  questions_solved: null, questions_correct: null, focus_level: null, memo: null
}, extra || {});

const dummy = {
  todayKey: TODAY,
  settings: {
    examId: '', goal: '本番で正答率85%以上', weekdayHours: 4, holidayHours: 8,
    constraints: '10/10 定期試験（循環器）\n10/20〜24 臨床実習の見学',
    confidence: { '2C': 3, '1D': 2, '3D': 4 }
  },
  draft: {
    condition: '睡眠は取れているが、午後に集中が切れやすい',
    ankiDaily: '200枚', ankiBacklog: '', ankiRetention: '88%',
    strong: '公衆衛生', weak: '生化学、循環器の心電図', going: ''
  },
  countdowns: [
    { id: 'c-teiki', name: '循環器 定期試験', exam_date: '2026-10-10' },
    { id: 'c-cbt', name: 'CBT本番', exam_date: '2026-11-20' }
  ],
  qb: {
    '2C':   { '1': { done: 200, total: 250, correct: 140 }, '2': { done: 60, total: 250, correct: 48 } },
    '4B2C': { '1': { done: 40, total: 60, correct: 22 } },          // 4連問 → 2C に合算
    '1D':   { '1': { done: 80, total: 120, correct: 44 } },
    '8B':   { '1': { done: 20, total: 43, correct: 9 } },             // 基礎医学強化 → 1D に合算
    '3D':   { '1': { done: 150, total: 150, correct: 120 }, '2': { done: 150, total: 150, correct: 135 } },
    '2F':   { '1': { done: 0, total: 180, correct: 0 } }              // 未着手・ログも無い → 表に出さない
  },
  logs: [
    log('2026-10-01', '2C', 90, { questions_solved: 40, questions_correct: 26, focus_level: 4, memo: '心電図の読みで毎回止まる。波形を先に見る' }),
    log('2026-09-30', '4B2C', 60, { questions_solved: 20, questions_correct: 11, focus_level: 3 }),
    log('2026-09-28', '1D', 120, { questions_solved: 30, questions_correct: 15, focus_level: 2, memo: '代謝経路が混ざる' }),
    log('2026-09-27', '3D', 45, { questions_solved: 25, questions_correct: 22, focus_level: 4 }),
    log('2026-09-25', 'anki', 30, { activity: 'anki', focus_level: 3 }),
    log('2026-09-24', 'anki', 25, { activity: 'anki' }),
    log('2026-09-22', '8B', 50, { questions_solved: 20, questions_correct: 9 }),
    log('2026-09-15', '2C', 80, { questions_solved: 30, questions_correct: 21 }),  // 2週より前
    log('2026-09-10', '3D', 100),
    log('2026-09-08', '1D', 60)
  ],
  questionRecords: [
    { subject_id: '2C', round: 1, question_no: 12, is_correct: false, confidence: 'high', error_type: 'confuse', recorded_on: '2026-09-29',
      retest_log: [{ date: '2026-09-30', correct: false }, { date: '2026-10-01', correct: true }] },
    { subject_id: '2C', round: 2, question_no: 12, is_correct: false, confidence: 'mid', error_type: 'confuse', recorded_on: '2026-10-01' },
    { subject_id: '1D', round: 1, question_no: 5, is_correct: false, confidence: 'low', error_type: 'unknown', recorded_on: '2026-09-28' },
    { subject_id: '1D', round: 2, question_no: 5, is_correct: false, confidence: 'low', error_type: 'unknown', recorded_on: '2026-09-28' },
    { subject_id: '8B', round: 1, question_no: 3, is_correct: false, confidence: 'high', error_type: 'unknown', recorded_on: '2026-09-22' },
    { subject_id: '3D', round: 1, question_no: 7, is_correct: false, confidence: 'high', error_type: 'misread', recorded_on: '2026-09-27' },
    { subject_id: '3D', round: 1, question_no: 8, is_correct: true, confidence: 'high', error_type: null, recorded_on: '2026-09-27' },
    { subject_id: '2C', round: 1, question_no: 30, is_correct: false, confidence: null, error_type: null, recorded_on: '2026-09-10' }
  ],
  mockExams: [
    { taken_on: '2026-09-20', subject_id: '2C', correct_questions: 18, total_questions: 25, title: '第2回 CBT模試' },
    { taken_on: '2026-09-20', subject_id: '1D', correct_questions: 12, total_questions: 25, title: '第2回 CBT模試', memo: '基礎が時間切れ' },
    { taken_on: '2026-08-30', subject_id: '3D', correct_questions: 40, total_questions: 50, title: '第1回 CBT模試' }
  ],
  plans: [
    { id: 'p1', title: '循環器 QB 2周目', unit: 'q', status: 'active' },
    { id: 'p2', title: '古いプラン', unit: 'q', status: 'archived' }
  ],
  planTasks: [
    { plan_id: 'p1', kind: 'quota', due_date: '2026-09-29', target_amount: 30, done_amount: 30 },
    { plan_id: 'p1', kind: 'quota', due_date: '2026-09-30', target_amount: 30, done_amount: 12 },
    { plan_id: 'p1', kind: 'quota', due_date: '2026-10-01', target_amount: 30, done_amount: 40 },  // 超過分は数えない
    { plan_id: 'p1', kind: 'quota', due_date: '2026-10-02', target_amount: 30, done_amount: 0 },   // 今日は入れない
    { plan_id: 'p2', kind: 'quota', due_date: '2026-09-29', target_amount: 30, done_amount: 0 }
  ],
  sleepLogs: [
    { date: '2026-10-01', wake_up: '07:00', bedtime: '00:30' },
    { date: '2026-09-30', wake_up: '07:30', bedtime: '23:30' },
    { date: '2026-08-01', wake_up: '11:00', bedtime: '04:00' }   // 2週より前
  ]
};

// ---------- 集計 ----------
const data = W.buildAiExportData(dummy);

eq('試験は CBT を含む直近の試験', data.exam, { name: 'CBT本番', date: '2026-11-20', daysLeft: 49 });
eq('科目は全体正答率の低い順（2F は記録が無いので出ない）', data.subjects.map(r => r.id), ['1D', '2C', '3D']);

const c2 = data.subjects.find(r => r.id === '2C');
eq('2C: 1周目は 4連問 と合算', [c2.r1Done, c2.r1Total, c2.maxRound], [240, 310, 2]);
eq('2C: 全体正答率（全周回・4連問込み）', [c2.overallPct, c2.done], [70, 300]);
eq('2C: 2周目以降', [c2.laterPct, c2.laterDone], [80, 60]);
eq('2C: 直近2週の正答率はログの問題数から（9/15 は範囲外）', [c2.recentPct, c2.recentSolved], [62, 60]);
eq('2C: 直近2週の学習時間（4連問の時間も元の科目へ）', c2.recentMin, 150);
eq('2C: 自信ありで不正解（直近2週）', [c2.confRecorded, c2.confHighWrong], [true, 1]);
eq('2C: 自信度は設定から', c2.confidence, 3);

const d1 = data.subjects.find(r => r.id === '1D');
eq('1D: 基礎医学強化(8B)を合算', [d1.r1Done, d1.r1Total, d1.overallPct], [100, 163, 53]);
eq('1D: 2周目以降が無ければ null', d1.laterPct, null);
eq('1D: 自信ありで不正解は 8B の分', d1.confHighWrong, 1);

const fmt = Object.fromEntries(data.formats.map(f => [f.key, [f.pct, f.done]]));
eq('形式別: 4連問', fmt['4B'], [55, 40]);
eq('形式別: 基礎医学強化', fmt['BM'], [45, 20]);
eq('形式別: 記録の無い形式は null', fmt['4A'], [null, 0]);

eq('週は4つ、最後が今日で終わる', data.weeks.map(w => [w.start, w.end]),
   [['2026-09-05', '2026-09-11'], ['2026-09-12', '2026-09-18'], ['2026-09-19', '2026-09-25'], ['2026-09-26', '2026-10-02']]);
eq('週の合計', data.weeks.map(w => w.total), [160, 80, 105, 315]);

eq('Anki: 時間は直近2週の anki ログ', [data.anki.recentMin, data.anki.recentDays], [55, 2]);
eq('模試は日付順・同じ回はまとめる', data.mocks.map(m => [m.date, m.correct, m.total]),
   [['2026-08-30', 40, 50], ['2026-09-20', 30, 50]]);

eq('繰り返し間違い: 周回と再テストをまたいで数える', data.repeatedWrong.map(q => [q.subjectId, q.no, q.attempts, q.wrong]),
   [['2C', 12, 4, 3], ['1D', 5, 2, 2]]);
eq('間違いの種類', [data.errors.counts, data.errors.untyped, data.errors.typedTotal],
   [{ unknown: 3, confuse: 2, misread: 1 }, 1, 6]);

eq('プランの達成は昨日まで・超過は数えない・アーカイブは除く', data.planProgress.map(p => [p.title, p.done, p.target]),
   [['循環器 QB 2周目', 72, 90]]);
eq('振り返りメモは直近2週の新しい順', data.memos.map(m => m.date), ['2026-10-01', '2026-09-28']);
eq('集中度の平均', [Math.round(data.focus.avg * 10) / 10, data.focus.count], [3.2, 5]);
eq('睡眠: 就寝は日付をまたいで平均', [W.aiExportMinToClock(data.sleep.wake), W.aiExportMinToClock(data.sleep.bed)], ['7:15', '0:00']);

// ---------- 文面 ----------
const md = W.formatAiExportMarkdown(data);
ok('テンプレートの見出しがそろう', ['# 依頼', '## 分析してほしいこと', '## 前提・制約', '## 学習リソースと進め方',
   '## 科目別データ（出力日：2026-10-02）', '## 直近の学習時間の推移', '## Anki', '## 模試・過去の結果',
   '## 間違いの傾向', '## PDCAのCheck／Actの記録（直近2週）', '## 自己認識'].every(h => md.includes(h + '\n')));
ok('試験日と残り日数', md.includes('- 試験：CBT／試験日 2026-11-20（残り 49 日）'));
ok('予定・制約は1行にまとめる', md.includes('- 試験までの予定・制約：10/10 定期試験（循環器）／10/20〜24 臨床実習の見学'));
ok('科目の行', md.includes('| 2C 循環器 | 240/310（今2周目） | 70%（300問） | 62%（60問） | 80%（60問） | 2.5時間 | 3 | 1問 |'), md.split('\n').find(l => l.startsWith('| 2C')));
ok('2周目以降が無い科目は未記録', md.includes('| 1D 生化学 | 100/163（今1周目） | 53%（100問） | 48%（50問） | 未記録 |'), md.split('\n').find(l => l.startsWith('| 1D')));
ok('問題形式の行', /- 問題形式別の正答率：一般問題 [^\n]*4連問 55%（40問）[^\n]*基礎医学強化 45%（20問）/.test(md));
ok('Anki の空欄は未記録', md.includes('- 溜まり（未消化）：未記録'));
ok('時間不足は未記録', md.includes('時間不足 未記録'));
ok('空の自由記述は行ごと省く', !md.includes('うまくいっていないこと'));
ok('入力した自己認識は出る', md.includes('- 不安な科目：生化学、循環器の心電図'));

// 記録がまったく無いとき：推測で埋めずに未記録
const empty = W.buildAiExportMarkdown({ todayKey: TODAY });
ok('空: 試験は未記録', empty.includes('- 試験：CBT／試験日 未記録（残り 未記録）'));
ok('空: 目標・時間は未記録', empty.includes('- 目標：未記録') && empty.includes('平日 未記録 時間／休日 未記録 時間'));
const emptyQb = W.buildAiExportMarkdown({ todayKey: TODAY, qb: { '2C': { '1': { done: 10, total: 250, correct: 6 } } } });
ok('空: ログが無ければ学習時間は未記録', emptyQb.includes('| 2C 循環器 | 10/250（今1周目） | 60%（10問） | 未記録 | 未記録 | 未記録 |'), emptyQb.split('\n').find(l => l.startsWith('| 2C')));
ok('空: 体調の行は出さない', !empty.includes('体調・集中力の状態'));
ok('空: 科目表は未記録の1行', empty.includes('| 未記録 | 未記録 | 未記録 | 未記録 | 未記録 | 未記録 | 未記録 | 未記録 |'));
ok('空: 各セクション未記録', ['## Anki\n- 未記録', '## 模試・過去の結果\n- 未記録',
   '- 繰り返し間違えるテーマ（上位10）：未記録', '- 間違いの種類の内訳：未記録',
   '## PDCAのCheck／Actの記録（直近2週）\n- 未記録', '## 自己認識\n- 未記録'].every(s => empty.includes(s)));

// ---------- 設定 ----------
eq('設定: 範囲外の値は捨てる', W.normalizeAiExportSettings({ weekdayHours: '30', holidayHours: '6', confidence: { '2C': 6, '1D': '2' } }),
   { examId: '', goal: '', weekdayHours: '', holidayHours: 6, constraints: '', confidence: { '1D': 2 } });
eq('確保時間の初期値は曜日別の目標から', W.aiExportHoursFromGoals([300, 180, 180, 180, 180, 240, 360]), { weekdayHours: 3, holidayHours: 5.5 });
eq('試験を選んでいればそれを使う', W.pickAiExportExam(dummy.countdowns, 'c-teiki', TODAY).name, '循環器 定期試験');

if (process.argv.includes('--print')) console.log('\n' + md);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\n' + failures.join('\n')); process.exit(1); }
