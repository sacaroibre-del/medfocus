// 科目と問題形式を独立した2軸で集計するテスト。
//   node test_question_formats.cjs
// test_qb_sections.cjs と同じく、app.js を jsdom 上で eval して関数を直接叩く。
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

// ---------- 形式の判定 ----------
eq('vol.1〜3 の科目は一般問題', W.questionFormatOf('2C'), 'general');
eq('表示名からも引ける', W.questionFormatOf('1A 細胞生物学'), 'general');
eq('多肢選択', W.questionFormatOf('4A2C'), '4A');
eq('4連問', W.questionFormatOf('4B2C'), '4B');
eq('4連問の表示名', W.questionFormatOf('4連問 2C 循環器'), '4B');
eq('Anki は形式を持たない', W.questionFormatOf('anki'), null);
eq('模試復習も形式を持たない', W.questionFormatOf('mock-review'), null);
eq('自由入力も形式を持たない', W.questionFormatOf('謎の科目'), null);
eq('空は null', W.questionFormatOf(''), null);
eq('形式の定義に未知の key を渡すと未分類', W.questionFormatDef('xxx').label, '未分類');

// ---------- 集計 ----------
// 2C は一般問題（2周）・4連問・多肢選択、2I は一般問題と正答数未入力の4連問。
// custom-x は形式の分からない教材（未分類として残す）。
const qb = {
  '2C':       { 1: { done: 100, correct: 70, total: 100 }, 2: { done: 50, correct: 40, total: 100 } },
  '4B2C':     { 1: { done: 40,  correct: 20, total: 40 } },
  '4A2C':     { 1: { done: 10,  correct: 6,  total: 20 } },
  '2I':       { 1: { done: 30,  correct: 24, total: 60 } },
  '4B2I':     { 1: { done: 8,   correct: 0,  total: 20 } },
  'custom-x': { 1: { done: 25,  correct: 20, total: 25 } }
};

const bySubject = W.buildQBAccuracyStats(qb, 'subject');
const byFormat  = W.buildQBAccuracyStats(qb, 'format');
const byCross   = W.buildQBAccuracyStats(qb, 'cross');
const row = (st, id) => st.subjects.find(s => s.id === id);

eq('既定の軸は科目', W.buildQBAccuracyStats(qb).axis, 'subject');
eq('4連問・多肢選択は循環器に合算される', [row(bySubject, '2C').done, row(bySubject, '2C').correct], [200, 136]);
eq('合算後の循環器の名前', row(bySubject, '2C').name, '2C 循環器');
ok('科目別に vol.4 の行は残らない', !bySubject.subjects.some(s => /^4[AB]/.test(s.id)),
   bySubject.subjects.map(s => s.id));
eq('未分類の教材は消さずに残す', [row(bySubject, 'custom-x').done, row(bySubject, 'custom-x').correct], [25, 20]);
eq('循環器の内訳', row(bySubject, '2C').parts.map(p => [p.short, p.done, p.correct]),
   [['一般', 150, 110], ['多肢選択', 10, 6], ['4連問', 40, 20]]);

eq('形式別の行', byFormat.subjects.map(s => [s.id, s.done, s.correct]).sort(),
   [['4A', 10, 6], ['4B', 40, 20], ['general', 180, 134], ['unclassified', 25, 20]].sort());
eq('形式別の名前', row(byFormat, '4B').name, '4連問');
eq('科目×形式のセル', row(byCross, '2C|4B').name, '2C 循環器｜4連問');
eq('科目×形式のセル数', byCross.subjects.length, 5);

// 3つの軸の合計はどれも同じ
const sums = st => [st.totalDone, st.totalCorrect,
  st.subjects.reduce((a, s) => a + s.done, 0), st.subjects.reduce((a, s) => a + s.correct, 0)];
eq('科目別の合計', sums(bySubject), [255, 180, 255, 180]);
eq('形式別の合計＝科目別の合計', sums(byFormat), sums(bySubject));
eq('科目×形式の合計＝科目別の合計', sums(byCross), sums(bySubject));
bySubject.subjects.forEach(s => {
  const cells = byCross.subjects.filter(c => c.base === s.base);
  eq(`${s.name}: 科目×形式を足すと科目になる`,
     [cells.reduce((a, c) => a + c.done, 0), cells.reduce((a, c) => a + c.correct, 0)], [s.done, s.correct]);
});
byFormat.subjects.forEach(f => {
  const cells = byCross.subjects.filter(c => c.format === f.format);
  eq(`${f.name}: 科目×形式を足すと形式になる`,
     [cells.reduce((a, c) => a + c.done, 0), cells.reduce((a, c) => a + c.correct, 0)], [f.done, f.correct]);
});

eq('正答数が未入力の周は除外して件数を出す', [bySubject.unfilledRounds, bySubject.unfilledDone], [1, 8]);
eq('未入力の案内は教材の名前', bySubject.unfilledSubjects, ['4連問 2I 呼吸器']);
eq('周ごとの科目数は合算後の科目で数える', bySubject.rounds.map(r => [r.round, r.subjects]), [['1', 3], ['2', 1]]);
eq('ランキングは20問以上', bySubject.ranked.map(s => s.id), ['2I', '2C', 'custom-x'].sort((a, b) =>
  row(bySubject, a).acc - row(bySubject, b).acc));

// 周回の伸びは2周以上ある教材どうしで比べる。
// 周ごとに合算すると 1周目 96/150=64% → 2周目 80% で +16pt と出てしまう
// （1周目にだけ4連問・多肢選択が混ざるため）。正しくは一般問題の 70% → 80%。
const g = row(bySubject, '2C').gain;
eq('伸びは同じ教材の周どうし', [g.from.round, g.to.round, Math.round(g.from.acc), Math.round(g.to.acc), Math.round(g.gain)],
   ['1', '2', 70, 80, 10]);
eq('1周しか無い科目は伸びを持たない', row(bySubject, '2I').gain, null);

// ---------- どの科目にあと何時間 ----------
const budget = W.buildSubjectBudget(qb, { hasQuestion: true, minPerQuestion: 1 }, 1);
const b2c = budget.rows.find(r => r.id === '2C');
ok('残りの行に vol.4 は残らない', !budget.rows.some(r => /^4[AB]/.test(r.id)), budget.rows.map(r => r.id));
// 1周目の残り: 2C 0 + 4B2C 0 + 4A2C 10
eq('循環器の残りは vol.4 のぶんも含む', b2c.remaining, 10);
eq('循環器の正答率は vol.4 も含めた通算', Math.round(b2c.accuracy), 68);
// 2I: 一般 60−30＝30問 + 4連問 20−8＝12問が残り
eq('呼吸器の残り', budget.rows.find(r => r.id === '2I').remaining, 42);

// ---------- 正答率の推移 ----------
const today = new Date(2026, 8, 28, 12);
const mk = (subject, solved, correct, daysAgo) => {
  const d = new Date(today); d.setDate(d.getDate() - daysAgo);
  return { subject_name: subject, questions_solved: solved, questions_correct: correct,
           started_at: d.toISOString(), duration_minutes: 30 };
};
const logs = [
  mk('2C', 40, 30, 1), mk('4B2C', 40, 20, 1), mk('4連問 2I 呼吸器', 20, 10, 8),
  mk('2I', 30, 27, 8), mk('anki', 10, 10, 1)
];
const tAll = W.buildAccuracyTrend(logs, today, 2);
const tLinked = W.buildAccuracyTrend(logs, today, 2, '4B');
const tGeneral = W.buildAccuracyTrend(logs, today, 2, 'general');
eq('すべて: 週ごとの解答数', tAll.buckets.map(b => b.solved), [50, 90]);
eq('4連問だけ', tLinked.buckets.map(b => [b.solved, b.correct]), [[20, 10], [40, 20]]);
eq('一般問題だけ', tGeneral.buckets.map(b => [b.solved, b.correct]), [[30, 27], [40, 30]]);

// ---------- 画面 ----------
(async () => {
  localStorage.setItem('medfocus_qb_progress', JSON.stringify(qb));
  W.eval(`allLogs = []; session = null;`);
  for (const axis of ['subject', 'format', 'cross']) {
    W.setQbAccAxis(axis);
    try { await W.renderInsights(); } catch (e) { ok(`${axis}: 描画で例外が出ない`, false, e.message); continue; }
    const chips = document.querySelectorAll('#acc-axis-chips [data-axis]');
    const active = document.querySelector('#acc-axis-chips .active');
    eq(`${axis}: 切り替えが3つ並ぶ`, chips.length, 3);
    eq(`${axis}: 選んだ軸が選択中`, active && active.dataset.axis, axis);
    const names = [...document.querySelectorAll('.acc-rank-name')].map(n => n.textContent.trim());
    if (axis === 'subject') ok('科目別に循環器が出る', names.includes('2C 循環器'), names);
    if (axis === 'format') ok('形式別に4連問が出る', names.includes('4連問') && names.includes('一般問題'), names);
    if (axis === 'cross') ok('科目×形式に内訳が出る', document.querySelectorAll('.acc-rank-sub').length >= 3, names);
  }
  W.setQbAccAxis('bogus');
  eq('知らない軸は科目別に戻る', W.getQbAccAxis(), 'subject');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\n--- failures ---\n' + failures.join('\n')); process.exit(1); }
})();
