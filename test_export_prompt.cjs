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
const lineOf = (md, prefix) => md.split('\n').find(l => l.startsWith(prefix));
const OMIT_HEAD = '※次の情報はこのデータに含まれていません：';
const omittedOf = md => {
  const l = lineOf(md, OMIT_HEAD);
  return l ? l.slice(OMIT_HEAD.length).replace(/。分析に必要なものだけ.*$/, '').split('、') : [];
};

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
  settings: { examId: '', goal: '本番で正答率85%以上', weekdayHours: 4, holidayHours: '', constraints: '', confidence: {} },
  goalHours: { weekdayHours: 3, holidayHours: 5 },
  countdowns: [
    { id: 'c-teiki', name: '循環器 定期試験', exam_date: '2026-10-10' },
    { id: 'c-cbt', name: 'CBT本番', exam_date: '2026-11-20' }
  ],
  calendarEvents: [
    { title: '循環器 定期試験', category: 'exam', start_date: '2026-10-10' },
    { title: '臨床実習 見学', category: 'deadline', start_date: '2026-10-20', end_date: '2026-10-24' },
    { title: '飲み会', category: 'other', start_date: '2026-10-05' },            // 種類が違うので出さない
    { title: '終わった締切', category: 'deadline', start_date: '2026-09-20' },   // 過去
    { title: 'CBT後の予定', category: 'exam', start_date: '2026-12-01' }         // 試験日より後
  ],
  qb: {
    '2C':   { '1': { done: 200, total: 250, correct: 140 }, '2': { done: 60, total: 250, correct: 48 } },
    '4B2C': { '1': { done: 40, total: 60, correct: 22 } },          // 4連問 → 2C に合算
    '1D':   { '1': { done: 80, total: 120, correct: 44 } },
    '8B':   { '1': { done: 20, total: 43, correct: 9 } },             // 基礎医学強化 → 1D に合算
    '3D':   { '1': { done: 150, total: 150, correct: 120 }, '2': { done: 150, total: 150, correct: 135 } },
    '5A1':  { '1': { done: 30, total: 30, correct: 18 } },            // vol.5 追加問題 → 1行にまとめる
    '5A2':  { '1': { done: 10, total: 30, correct: 7 } },
    '5A3':  { '1': { done: 0, total: 30, correct: 0 } },
    '2F':   { '1': { done: 0, total: 180, correct: 0 } }              // 未着手・ログも無い → 表に出さない
  },
  logs: [
    log('2026-10-01', '2C', 90, { questions_solved: 40, questions_correct: 26, focus_level: 4, memo: '心電図の読みで毎回止まる。波形を先に見る' }),
    log('2026-10-01', 'OSCE', 60, { activity: 'other', memo: '1' }),     // 問題数の無い科目・短いメモ
    log('2026-09-30', '4B2C', 60, { questions_solved: 20, questions_correct: 11, focus_level: 3 }),
    log('2026-09-29', 'osce', 30, { activity: 'other' }),                 // 大文字小文字違いの同じ科目
    log('2026-09-28', '1D', 120, { questions_solved: 30, questions_correct: 15, focus_level: 2, memo: '代謝経路が混ざる' }),
    log('2026-09-27', '3D', 45, { questions_solved: 25, questions_correct: 22, focus_level: 4 }),
    log('2026-09-22', '8B', 50, { questions_solved: 20, questions_correct: 9 }),
    log('2026-09-15', '2C', 80, { questions_solved: 30, questions_correct: 21 }),
    log('2026-09-10', '3D', 100),
    log('2026-09-08', '1D', 60)
  ],
  questionRecords: [
    { subject_id: '2C', round: 1, question_no: 12, is_correct: false, confidence: 'high', error_type: 'confuse', recorded_on: '2026-09-29',
      retest_log: [{ date: '2026-09-30', correct: false }, { date: '2026-10-01', correct: true }] },
    { subject_id: '2c', round: 2, question_no: 12, is_correct: false, confidence: 'mid', error_type: 'confuse', recorded_on: '2026-10-01' },
    { subject_id: '1D', round: 1, question_no: 5, is_correct: false, confidence: 'low', error_type: 'unknown', recorded_on: '2026-09-28' },
    { subject_id: '1D', round: 2, question_no: 5, is_correct: false, confidence: 'low', error_type: 'unknown', recorded_on: '2026-09-28' },
    { subject_id: '8B', round: 1, question_no: 3, is_correct: false, confidence: 'high', error_type: 'unknown', recorded_on: '2026-09-22' },
    { subject_id: '3D', round: 1, question_no: 7, is_correct: false, confidence: 'high', error_type: 'misread', recorded_on: '2026-09-27' },
    { subject_id: '3D', round: 1, question_no: 8, is_correct: true, confidence: 'high', error_type: null, recorded_on: '2026-09-27' }
  ],
  mockExams: [
    // 成績表の「解剖学」「組織学」はどちらも 1B として入る → 内訳では1つに合算する
    { taken_on: '2026-09-20', subject_id: '1B', correct_questions: 5, total_questions: 8, title: '第2回 CBT模試', memo: '基礎が時間切れ' },
    { taken_on: '2026-09-20', subject_id: '1B', correct_questions: 2, total_questions: 4, title: '第2回 CBT模試', memo: '基礎が時間切れ' },
    { taken_on: '2026-09-20', subject_id: '2C', correct_questions: 18, total_questions: 25, title: '第2回 CBT模試' },
    { taken_on: '2026-08-30', subject_id: '3D', correct_questions: 40, total_questions: 50, title: '第1回 CBT模試' }
  ],
  plans: [
    { id: 'p1', title: '循環器 QB 2周目', unit: 'q', status: 'active', subject_id: '2C', target_round: 2 },
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
    { date: '2026-09-30', wake_up: '07:30', bedtime: '23:30' }
  ]
};

// ---------- 集計 ----------
const data = W.buildAiExportData(dummy);

eq('試験は CBT を含む直近の試験', data.exam, { name: 'CBT本番', date: '2026-11-20', daysLeft: 49 });
eq('確保時間: 設定があれば設定、空欄は曜日別の目標から', data.hours, { weekday: 4, holiday: 5 });
eq('予定: 試験・締切だけ・今日から試験日まで', data.events.map(e => e.title), ['循環器 定期試験', '臨床実習 見学']);

eq('科目表は QB の記録がある科目だけ（OSCE・未着手の 2F は出ない）・正答率の低い順',
   data.subjects.map(r => r.id), ['1D', 'set:5A', '2C', '3D']);
const c2 = data.subjects.find(r => r.id === '2C');
eq('2C: 1周目は 4連問 と合算', [c2.r1Done, c2.r1Total, c2.maxRound], [240, 310, 2]);
eq('2C: 全体正答率（全周回・4連問込み）', [c2.overallPct, c2.done], [70, 300]);
eq('2C: 直近2週の正答率はログの問題数から（9/15 は範囲外）', [c2.recentPct, c2.recentSolved], [62, 60]);
eq('2C: 直近2週の学習時間（4連問の時間も元の科目へ）', c2.recentMin, 150);
eq('2C: 1問あたりの時間（全期間）', Math.round(c2.minPerQ * 100) / 100, Math.round(230 / 90 * 100) / 100);
const gapsOf = r => r.gaps.map(g => [g.label, g.daysSince, g.gapBefore]);
eq('2C: 最終演習と間隔は形式ごと（4連問の 9/30 は一般の間隔に混ぜない）', gapsOf(c2),
   [['一般', 1, 16], ['4連問', 2, null]]);
const d1 = data.subjects.find(r => r.id === '1D');
eq('1D: 基礎医学強化(8B)の日は一般の最終演習に混ぜない（時間だけの 9/8 も数えない）', gapsOf(d1),
   [['一般', 4, null], ['基礎強化', 10, null]]);
const d3 = data.subjects.find(r => r.id === '3D');
eq('3D: 一般だけ・解いた日が1日なら間隔は無い', gapsOf(d3), [['一般', 5, null]]);
eq('2C: 自信ありで不正解（直近2週）', [c2.confRecorded, c2.confHighWrong], [true, 1]);
const v5 = data.subjects.find(r => r.id === 'set:5A');
eq('vol.5 追加問題はブロックをまとめて1行', [v5.name, v5.r1Done, v5.r1Total, v5.overallPct],
   ['vol.5 追加問題（科目横断）', 40, 90, 63]);

eq('形式別: 記録のある形式だけ', data.formats.map(f => f.key), ['general', '4B', '5A', 'BM']);

const lastWeek = data.weeks[3];
eq('週の内訳: 大文字小文字違いの科目は1つに合算', lastWeek.top.filter(b => /osce/i.test(b.name)).map(b => b.min), [90]);

eq('模試: 同じ科目は科目コードで合算', data.mocks[1].parts.map(p => [p.name, p.correct, p.total]),
   [['1B 組織・解剖', 7, 12], ['2C 循環器', 18, 25]]);
eq('模試: 同じメモは1回だけ', data.mocks[1].memos, ['基礎が時間切れ']);
eq('繰り返し間違い: 周回・再テスト・ID の大文字小文字をまたいで数える',
   data.repeatedWrong.map(q => [q.subjectId, q.no, q.attempts, q.wrong]), [['2C', 12, 4, 3], ['1D', 5, 2, 2]]);
eq('振り返りメモ: 3文字未満は除く', data.memos.map(m => m.text), ['心電図の読みで毎回止まる。波形を先に見る', '代謝経路が混ざる']);
eq('プランの達成は昨日まで・超過は数えない・アーカイブは除く', data.planProgress.map(p => [p.title, p.done, p.target]),
   [['循環器 QB 2周目', 72, 90]]);
ok('実際の学習時間は昨日までの4週', data.actual && data.actual.totalDays === 28 && data.actual.studyDays === 9, data.actual);
ok('アプリの優先順位が出る', data.priority.length > 0 && data.priority.length <= 10, data.priority.length);
ok('優先順位の vol.5 は問題集の名前つき', data.priority.filter(r => /^5A/.test(r.id)).every(r => /^vol\.5 追加問題 ブロック\d$/.test(r.name)),
   data.priority.map(r => r.name));

// ---------- 文面：省略のロジック ----------
const md = W.formatAiExportMarkdown(data);

ok('「含まれていない情報」の行は「分析してほしいこと」の直後',
   /5\. データに含まれていない項目[^\n]*\n6\. 今日の学習の振り返り[^\n]*\n\n※次の情報はこのデータに含まれていません：[^\n]*分析に必要なものだけ、最初に質問してください。\n/.test(md));
eq('省いた項目の一覧', omittedOf(md), [
  '体調・集中力の自己申告',
  '科目ごとの自信度',
  '前回からの間隔と正答率（記録件数が不足）',
  '繰り返し間違える問題（記録件数が不足）',
  '間違いの種類の内訳（記録件数が不足）',
  '自己認識（得意・不安な科目／最近の手応え）'
]);
ok('「未記録」はどこにも出ない', !md.includes('未記録'));
ok('Anki は出さない', !/anki/i.test(md));
ok('予定・制約はカレンダーから', md.includes('- 試験までの予定・制約：カレンダー：10/10 循環器 定期試験、10/20〜10/24 臨床実習 見学'));
ok('確保時間', md.includes('- 確保できる学習時間：平日 4 時間／休日 5 時間'));
ok('目標は設定から', md.includes('- 目標：本番で正答率85%以上'));

// 空の列は列ごと消える（自信度は誰にも入っていない）
const header = lineOf(md, '| 科目 |');
ok('空の列（自信度）は列ごと消える', header && !header.includes('自信度'), header);
ok('値のある列は残る', header && header.includes('自信ありで不正解(直近2週)') && header.includes('1問あたりの時間'), header);
const colCount = header.split('|').length;
const tableRows = md.split('\n').slice(md.split('\n').indexOf(header) + 2);
ok('すべての行の列数が見出しとそろう', tableRows.slice(0, tableRows.indexOf('')).length === 4 &&
   tableRows.slice(0, tableRows.indexOf('')).every(l => l.split('|').length === colCount));
ok('科目表に OSCE は出ない', !/^\| OSCE/im.test(md));
ok('週の推移には OSCE が出る', /9\/26〜10\/2：[^\n]*OSCE 1\.5時間/.test(md), lineOf(md, '- 9/26'));
ok('問題形式の行は記録のある形式だけ', lineOf(md, '- 問題形式別の正答率：') ===
   '- 問題形式別の正答率：一般問題 76%（640問）／4連問 55%（40問）／追加問題 63%（40問）／基礎医学強化 45%（20問）',
   lineOf(md, '- 問題形式別の正答率：'));
ok('模試の内訳に 1B は1回', (lineOf(md, '- 2026-09-20') || '').split('1B 組織・解剖').length === 2, lineOf(md, '- 2026-09-20'));
ok('問題番号の記録が200件未満なら繰り返し間違いの行は出さない', !md.includes('繰り返し間違える問題（上位10）'));
ok('種類つきの不正解が20件未満なら内訳は出さない', !md.includes('間違いの種類の内訳：'));
ok('両方省いたら「間違いの傾向」の見出しごと出さない', !md.includes('## 間違いの傾向'));
ok('短いメモは出さない', !md.includes('OSCE：1'));
ok('形式が複数ある科目は形式名つきで並べる', /^\| 1D 生化学 \|[^\n]*\| 一般 4日前／基礎強化 10日前 \| - \|/m.test(md), lineOf(md, '| 1D'));
ok('間隔は値のある形式だけ', /^\| 2C 循環器 \|[^\n]*\| 一般 1日前／4連問 2日前 \| 一般 16日 \|/m.test(md), lineOf(md, '| 2C'));
ok('一般だけの科目は形式名を付けない', /^\| 3D 公衆衛生 \|[^\n]*\| 5日前 \| - \|/m.test(md), lineOf(md, '| 3D'));
ok('分析の依頼に「間が空いたことによる忘却」との切り分けを入れる',
   md.includes('理解が足りないのか、最後に解いてから・前回から間が空いて忘れていただけなのか'));
ok('間隔ごとの正答率は記録が足りなければ出さない', !md.includes('## 前回からの間隔と正答率'));

// 間隔ごとの正答率：記録が足りれば出す（1区分あたり3回・20問以上を2区分以上）
const spaced = [];
['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'].forEach(d =>
  spaced.push(log(d, '2D', 30, { questions_solved: 10, questions_correct: 8 })));
['2026-08-14', '2026-08-25', '2026-09-05'].forEach(d =>
  spaced.push(log(d, '2D', 30, { questions_solved: 10, questions_correct: 5 })));
const mdSpaced = W.buildAiExportMarkdown(Object.assign({}, dummy, { logs: dummy.logs.concat(spaced) }));
ok('間隔ごとの正答率を出す', /## 前回からの間隔と正答率（全期間・全科目）\n- [^\n]*翌日 \d+%（\d+問）[^\n]*8〜14日 \d+%（\d+問）/.test(mdSpaced),
   lineOf(mdSpaced, '- その科目に前回触った日から'));
ok('出したら一覧に載せない', !omittedOf(mdSpaced).some(x => x.startsWith('前回からの間隔と正答率')));

// 優先順位は生データより後ろ・指示文が見出しの直前
const iInstr = md.indexOf('以下はアプリが計算した優先順位です。');
const iHead = md.indexOf('## アプリが計算した優先順位（上位10科目）');
ok('優先順位の指示文は見出しの直前', iInstr > 0 && iHead > iInstr && md.slice(iInstr, iHead).split('\n').length === 3);
ok('優先順位は科目表・推移・模試より後ろ', ['## 科目別データ', '## 直近の学習時間の推移', '## 模試・過去の結果', '## PDCAのCheck']
   .every(h => md.indexOf(h) >= 0 && md.indexOf(h) < iInstr));

// しきい値を超えたら出す
const many = [];
for (let i = 1; i <= 200; i++) {
  many.push({ subject_id: '2C', round: 1, question_no: i, is_correct: i > 26, confidence: null,
              error_type: i <= 12 ? 'unknown' : i <= 20 ? 'confuse' : i <= 22 ? 'misread' : null, recorded_on: '2026-09-01' });
}
many.push({ subject_id: '2C', round: 2, question_no: 3, is_correct: false, error_type: null, recorded_on: '2026-09-20' });
const mdMany = W.buildAiExportMarkdown(Object.assign({}, dummy, { questionRecords: many }));
ok('200件以上なら繰り返し間違いを出す', mdMany.includes('  - 2C 循環器 Q3（2回中2回不正解）'));
ok('種類つきが20件以上なら内訳を出す', lineOf(mdMany, '- 間違いの種類の内訳：') ===
   '- 間違いの種類の内訳：知識不足 55%（12問）／うろ覚え・混同 36%（8問）／読み違い 9%（2問）（種類を入れていない不正解 5問は除く）',
   lineOf(mdMany, '- 間違いの種類の内訳：'));
ok('内訳を出したら時間不足だけを省いた一覧に載せる', omittedOf(mdMany).includes('間違いのうち時間不足によるもの') &&
   !omittedOf(mdMany).some(x => x.startsWith('間違いの種類の内訳')) &&
   !omittedOf(mdMany).some(x => x.startsWith('繰り返し間違える問題')), omittedOf(mdMany));

// 自信度が保存されていれば列が出て、一覧からは消える
const mdConf = W.buildAiExportMarkdown(Object.assign({}, dummy, { settings: Object.assign({}, dummy.settings, { confidence: { '2C': 3 } }) }));
ok('自信度があれば列が出る（無い科目は「-」）', (lineOf(mdConf, '| 科目 |') || '').includes('自信度(1-5)') &&
   / \| 3 \| /.test(lineOf(mdConf, '| 2C 循環器') || '') && / \| - \| /.test(lineOf(mdConf, '| 1D 生化学') || ''),
   [lineOf(mdConf, '| 2C 循環器'), lineOf(mdConf, '| 1D 生化学')]);
ok('自信度があれば一覧に載らない', !omittedOf(mdConf).includes('科目ごとの自信度'));

// 記録がまったく無いとき：セクションは出さず、一覧にまとめる
const empty = W.buildAiExportMarkdown({ todayKey: TODAY });
eq('空: 省いた項目の一覧', omittedOf(empty), [
  '試験日', '目標', '確保できる学習時間', '実際の学習時間', '試験までの予定・制約', '体調・集中力の自己申告',
  '今日の学習記録', 'QBの科目別成績', '学習時間の記録', 'QB正答率の週推移', '前回からの間隔と正答率（記録件数が不足）', '模試の結果',
  '繰り返し間違える問題（記録件数が不足）', '間違いの種類の内訳（記録件数が不足）',
  'PDCAのCheck／Act（振り返りメモ・プランの達成）', '自己認識（得意・不安な科目／最近の手応え）', 'アプリの優先順位'
]);
eq('空: 残る見出しは依頼・分析・学習リソースだけ', empty.split('\n').filter(l => /^#/.test(l)),
   ['# 依頼', '## 分析してほしいこと', '## 学習リソースと進め方']);
ok('空: 「未記録」は出ない', !empty.includes('未記録'));

ok('空: 今日の記録が無ければ振り返りの依頼（6番）も出さない', !empty.includes('6. 今日の学習の振り返り'));

// ---------- 今日の学習 ----------
const todayInput = Object.assign({}, dummy, {
  todayGoalMin: 240,
  logs: dummy.logs.concat([
    log('2026-10-02', '4B2C', 60, { questions_solved: 20, questions_correct: 15, focus_level: 4,
      started_at: at('2026-10-02', 9), ended_at: at('2026-10-02', 10), memo: '心電図は波形から読むと速い' }),
    log('2026-10-02', '1D', 90, { questions_solved: 30, questions_correct: 18,
      started_at: at('2026-10-02', 13), ended_at: at('2026-10-02', 14, 30), memo: 'ok' }),
    log('2026-10-02', 'OSCE', 30, { activity: 'other', started_at: at('2026-10-02', 16), ended_at: at('2026-10-02', 16, 30) })
  ]),
  questionRecords: dummy.questionRecords.concat([
    { subject_id: '4B2C', round: 1, question_no: 4, is_correct: false, recorded_on: '2026-10-02' },
    { subject_id: '4B2C', round: 1, question_no: 5, is_correct: true, recorded_on: '2026-10-02' },
    { subject_id: '1D', round: 1, question_no: 9, is_correct: false, recorded_on: '2026-10-01',
      retest_log: [{ date: '2026-10-02', correct: true }] }
  ])
});
const td = W.buildAiExportData(todayInput).today;
eq('今日: 合計と QB', [td.totalMin, td.goalMin, td.solved, td.correct], [180, 240, 50, 33]);
eq('今日: セッションは時間順・科目は形式が分かる名前のまま', td.sessions.map(x => [x.range, x.subject, x.min]),
   [['9:00〜10:00', '4連問 2C 循環器', 60], ['13:00〜14:30', '1D 生化学', 90], ['16:00〜16:30', 'OSCE', 30]]);
const mdToday = W.buildAiExportMarkdown(todayInput);
ok('今日: 合計の行', mdToday.includes('- 合計：3.0時間（目標 4.0時間・達成 75%）／QB 50問・正答率 66%'), lineOf(mdToday, '- 合計'));
ok('今日: セッションの行', mdToday.includes('  - 9:00〜10:00 4連問 2C 循環器（問題演習） 60分　20問中15問正解（75%）　集中度4/5　メモ：心電図は波形から読むと速い'));
ok('今日: 短いメモは出さない', mdToday.includes('  - 13:00〜14:30 1D 生化学（問題演習） 90分　30問中18問正解（60%）\n'));
ok('今日: ノルマ', mdToday.includes('- 今日の逆算プランのノルマ：循環器 QB 2周目 0/30問'));
ok('今日: 問題番号と再テスト', mdToday.includes('- 問題番号を記録した問題：2問（不正解 1問：4連問 2C 循環器 Q4）') &&
   mdToday.includes('- 再テスト：1問中1問正解'));
ok('今日: セクションは科目表より前', mdToday.indexOf('## 今日の学習（2026-10-02）') < mdToday.indexOf('## 科目別データ'));
ok('今日: 一覧に「今日の学習記録」は載らない', !omittedOf(mdToday).includes('今日の学習記録'));

// ---------- 復習の回（is_review） ----------
const reviewInput = Object.assign({}, todayInput, {
  logs: todayInput.logs.concat([
    log('2026-10-02', '1D', 40, { questions_solved: 10, questions_correct: 4, is_review: true,
      review_wrong_numbers: [3, 7, 12], started_at: at('2026-10-02', 18), ended_at: at('2026-10-02', 18, 40) })
  ])
});
const tdR = W.buildAiExportData(reviewInput).today;
eq('復習: 合計の正答率は通常の回だけ・復習は別', [tdR.solved, tdR.correct, tdR.reviewSolved, tdR.reviewCorrect], [50, 33, 10, 4]);
const mdR = W.buildAiExportMarkdown(reviewInput);
ok('復習: 合計の行に復習正答率', mdR.includes('／QB 50問・正答率 66%／復習（間違えた問題のみ）10問・復習正答率 40%'), lineOf(mdR, '- 合計'));
ok('復習: セッションに is_review と review_wrong_numbers',
   mdR.includes('  - 18:00〜18:40 1D 生化学（問題演習） 40分　復習・間違えた問題のみ（is_review=true）　10問中4問正解（40%）　review_wrong_numbers=[3,7,12]'),
   lineOf(mdR, '18:00'));
ok('復習: 通常の回の行には付けない', mdR.includes('  - 13:00〜14:30 1D 生化学（問題演習） 90分　30問中18問正解（60%）\n'));
ok('復習: 復習正答率の推移を別の見出しで出す', mdR.includes('## 復習正答率の推移（is_review=true の回のみ）'));
ok('復習: 記録が無ければ復習の見出しは出さない', !mdToday.includes('## 復習正答率の推移'));
ok('復習: 前提に is_review の説明', mdR.includes('is_review=true のセッションは「間違えた問題のみ」'));

// ---------- 科目表: 復習の回は問題数の内訳に入れ、正答率は通常の回だけ ----------
const tableInput = Object.assign({}, todayInput, {
  logs: todayInput.logs.concat([
    log('2026-10-02', '1D', 40, { questions_solved: 10, questions_correct: 2, is_review: true,
      started_at: at('2026-10-02', 18), ended_at: at('2026-10-02', 18, 40) })
  ])
});
const rowOfId = (data, id) => data.subjects.find(r => r.id === id);
const rvBefore = rowOfId(W.buildAiExportData(todayInput), '1D');
const rvRow = rowOfId(W.buildAiExportData(tableInput), '1D');
eq('科目表: 問題数は復習込み・内訳あり', [rvRow.recentSolved - rvBefore.recentSolved, rvRow.recentReviewSolved], [10, 10]);
eq('科目表: 正答率は通常の回だけ（復習を足しても同じ）', [rvRow.recentPct, rvRow.recentAccSolved], [rvBefore.recentPct, rvBefore.recentSolved]);
eq('科目表: 復習正答率は別（2/10）', rvRow.recentReviewPct, 20);
const mdTable = W.buildAiExportMarkdown(tableInput);
const rvLine = lineOf(mdTable, '| 1D');
ok('科目表: 問題数の列に「うち復習10問」', rvLine && rvLine.includes(`${rvRow.recentSolved}問（うち復習10問）`), rvLine);
ok('科目表: 復習正答率の列', rvLine && rvLine.includes('20%（10問）'), rvLine);
ok('科目表: 復習が無い表には復習正答率の列を出さない',
   !(lineOf(W.buildAiExportMarkdown(todayInput), '| 科目') || '').includes('復習正答率'));

// ---------- 1問あたりの時間は通常の回だけ ----------
{
  const heavy = Object.assign({}, todayInput, {
    logs: todayInput.logs.concat([
      log('2026-10-02', '1D', 300, { questions_solved: 10, questions_correct: 2, is_review: true,
        started_at: at('2026-10-02', 19), ended_at: at('2026-10-02', 24) })
    ])
  });
  const a = W.buildAiExportData(todayInput), b = W.buildAiExportData(heavy);
  const rowA = a.subjects.find(r => r.id === '1D'), rowB = b.subjects.find(r => r.id === '1D');
  eq('1問あたり: 科目表は復習を足しても同じ', [rowB.qbMin, rowB.qbQuestions, rowB.minPerQ], [rowA.qbMin, rowA.qbQuestions, rowA.minPerQ]);
  eq('1問あたり: 全体の平均も同じ', b.method.minPerQ, a.method.minPerQ);
}

// ---------- 設定 ----------
eq('設定: 範囲外の値は捨てる', W.normalizeAiExportSettings({ weekdayHours: '30', holidayHours: '6', confidence: { '2C': 6, '1D': '2' } }),
   { examId: '', goal: '', weekdayHours: '', holidayHours: 6, constraints: '', confidence: { '1D': 2 } });
eq('確保時間の既定値は曜日別の目標から', W.aiExportHoursFromGoals([300, 180, 180, 180, 180, 240, 360]), { weekdayHours: 3, holidayHours: 5.5 });
eq('試験を選んでいればそれを使う', W.pickAiExportExam(dummy.countdowns, 'c-teiki', TODAY).name, '循環器 定期試験');

if (process.argv.includes('--print')) console.log('\n' + md);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\n' + failures.join('\n')); process.exit(1); }
