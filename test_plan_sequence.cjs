// 逆算プランの「優先順位どおりに順番へ詰める」純関数テスト。
//   node test_plan_sequence.cjs
// app.js を jsdom 上で eval して window に生えた関数を直接叩く
// （test_planning.cjs と同じ方式。app.js に import 文を足すとここが壊れる）。
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

const plan = (o) => Object.assign({ id: o.id, title: o.id, status: 'active', auto_redistribute: true }, o);

// ---------- 優先順位 ----------
(function priorityOrder() {
  // 同じ科目では 講義動画 → 問題演習
  const same = W.planPriorityOrder([
    plan({ id: 'qb',  subject_id: '2C', unit: 'q',     due_date: '2026-09-10' }),
    plan({ id: 'vid', subject_id: '2C', unit: 'video', due_date: '2026-09-10' })
  ]);
  eq('同じ科目なら講義動画が先', same.map(p => p.id), ['vid', 'qb']);

  // 科目どうしは締切の早い順（科目のまとまりごと動く）
  const acrossSubjects = W.planPriorityOrder([
    plan({ id: 'peds-vid', subject_id: '2O', unit: 'video', due_date: '2026-09-10' }),
    plan({ id: 'circ-qb',  subject_id: '2C', unit: 'q',     due_date: '2026-09-20' }),
    plan({ id: 'circ-vid', subject_id: '2C', unit: 'video', due_date: '2026-09-08' })
  ]);
  eq('締切の早い科目のまとまりが先で、その中は動画→問題演習',
     acrossSubjects.map(p => p.id), ['circ-vid', 'circ-qb', 'peds-vid']);

  // vol.4 は元の科目と同じまとまりに入る
  const withVol4 = W.planPriorityOrder([
    plan({ id: 'peds-vid', subject_id: '2O',   unit: 'video', due_date: '2026-09-12' }),
    plan({ id: 'circ-4b',  subject_id: '4B2C', unit: 'q',     due_date: '2026-09-30' }),
    plan({ id: 'circ-vid', subject_id: '2C',   unit: 'video', due_date: '2026-09-08' })
  ]);
  eq('4連問 2C は 2C のまとまりに入る',
     withVol4.map(p => p.id), ['circ-vid', 'circ-4b', 'peds-vid']);

  // 同着でも並びがブレない
  const a = [plan({ id: 'x', subject_id: '2C', unit: 'q', due_date: '2026-09-10' }),
             plan({ id: 'y', subject_id: '2C', unit: 'q', due_date: '2026-09-10' })];
  eq('同着は入力順で決着', W.planPriorityOrder(a).map(p => p.id), ['x', 'y']);
  eq('元の配列は変えない', a.map(p => p.id), ['x', 'y']);
  eq('空でも落ちない', W.planPriorityOrder([]), []);
})();

// ---------- 1単位あたりの所要分 ----------
(function minutesPerUnit() {
  const cost = { minPerQuestion: 3, hasQuestion: true, minPerVideo: 40, hasVideo: true,
                 video: { kokushi: { minPerVideo: 42, has: true }, cbt: { minPerVideo: 7, has: true } } };
  eq('問題演習は実測の分/問', W.planMinutesPerUnit(plan({ id: 'a', unit: 'q' }), cost), 3);
  eq('国試版の動画は版ごとの実測',
     W.planMinutesPerUnit(plan({ id: 'b', unit: 'video', subject_id: '2J', video_edition: 'kokushi' }), cost), 42);
  // CBT版はマスタ（2C 循環器 = 4本 10463秒）を実測より優先する
  const cbt = W.planMinutesPerUnit(plan({ id: 'c', unit: 'video', subject_id: '2C', video_edition: 'cbt' }), cost);
  ok('CBT版の動画はマスタの1本あたり', Math.abs(cbt - 10463 / 60 / 4) < 0.001, cbt);
  eq('実測が足りなければ見積もれない',
     W.planMinutesPerUnit(plan({ id: 'd', unit: 'q' }), { hasQuestion: false, minPerQuestion: null }), null);
})();

// ---------- 1日に進める量の手入力 ----------
eq('手入力があればそれを使う', W.planDailyCapacity({ daily_capacity: 8 }), 8);
eq('未入力なら自動', W.planDailyCapacity({ daily_capacity: null }), null);
eq('0以下は無視', W.planDailyCapacity({ daily_capacity: 0 }), null);

// ---------- 順番詰め本体 ----------
// 依頼の例: 9/6〜9/10 に「循環器の講義動画」「循環器の問題演習」「小児科の講義動画」。
// 満遍なくではなく、循環器の動画を全部終えてから次へ進むこと。
(function theExample() {
  const goal = () => 120;   // 毎日2時間
  const entries = [
    { plan: plan({ id: 'circ-vid', subject_id: '2C', unit: 'video', due_date: '2026-09-10' }),
      remaining: 6, minPerUnit: 40, startKey: '2026-09-06' },      // 6本 = 240分 = 2日
    { plan: plan({ id: 'circ-qb', subject_id: '2C', unit: 'q', due_date: '2026-09-10' }),
      remaining: 80, minPerUnit: 3, startKey: '2026-09-06' },      // 80問 = 240分
    { plan: plan({ id: 'peds-vid', subject_id: '2O', unit: 'video', due_date: '2026-09-10' }),
      remaining: 4, minPerUnit: 40, startKey: '2026-09-06' }       // 4本 = 160分
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: goal });

  const days = id => res.byPlan[id].items.map(i => `${i.dateKey}:${i.targetAmount}`);
  eq('循環器の動画を最初の2日で終わらせる',
     days('circ-vid'), ['2026-09-06:3', '2026-09-07:3']);
  eq('循環器の問題演習は動画が終わった翌日から',
     days('circ-qb'), ['2026-09-08:40', '2026-09-09:40']);
  eq('小児の動画はそのあと',
     days('peds-vid'), ['2026-09-10:3', '2026-09-11:1']);

  ok('初日に小児の動画は入らない（満遍なくにしない）',
     res.byPlan['peds-vid'].items.every(i => i.dateKey > '2026-09-07'));
  eq('循環器の2つは締切に間に合う',
     [res.byPlan['circ-vid'].overdue, res.byPlan['circ-qb'].overdue], [false, false]);
  ok('小児は締切を1日超えるので警告が出る', res.byPlan['peds-vid'].overdue === true);
  eq('超過日数', res.byPlan['peds-vid'].overDays, 1);
  eq('警告は超過したプランだけ', res.warnings.map(w => w.planId), ['peds-vid']);
})();

(function budgetIsNotWasted() {
  // 先のプランが途中で終わったら、その日の残り時間は次のプランへ回す
  const entries = [
    { plan: plan({ id: 'a', unit: 'q', due_date: '2026-09-30' }), remaining: 20, minPerUnit: 3, startKey: '2026-09-06' },
    { plan: plan({ id: 'b', unit: 'q', due_date: '2026-09-30' }), remaining: 20, minPerUnit: 3, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 120 });
  eq('先のプランは初日で終わる', res.byPlan['a'].items, [{ dateKey: '2026-09-06', targetAmount: 20 }]);
  eq('余った時間で次のプランも初日に進む', res.byPlan['b'].items, [{ dateKey: '2026-09-06', targetAmount: 20 }]);
})();

(function respectsStartAndWeekdays() {
  const entries = [
    { plan: plan({ id: 'later', unit: 'q', due_date: '2026-09-30' }),
      remaining: 10, minPerUnit: 3, startKey: '2026-09-09' },
    { plan: plan({ id: 'nosun', unit: 'q', due_date: '2026-09-30' }),
      remaining: 200, minPerUnit: 3, startKey: '2026-09-06', excludeWeekdays: [0] }   // 9/6 は日曜
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 60 });
  ok('開始日より前には置かない', res.byPlan['later'].items.every(i => i.dateKey >= '2026-09-09'));
  ok('休みの曜日には置かない',
     res.byPlan['nosun'].items.every(i => W.parseDateKey(i.dateKey).getDay() !== 0),
     res.byPlan['nosun'].items.slice(0, 3));
})();

(function alwaysMakesProgress() {
  // 1本50分・目標30分。時間が足りなくても、その日の先頭なら1単位は進める
  const entries = [
    { plan: plan({ id: 'big', unit: 'video', due_date: '2026-09-30' }),
      remaining: 3, minPerUnit: 50, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 30 });
  eq('1日1本ずつ進む', res.byPlan['big'].items.map(i => i.targetAmount), [1, 1, 1]);
})();

(function skipsRestDays() {
  // 目標学習時間0の日には置かない
  const entries = [
    { plan: plan({ id: 'a', unit: 'q', due_date: '2026-09-30' }), remaining: 40, minPerUnit: 3, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({
    entries, todayKey: '2026-09-06',
    goalMinutesOf: k => (k === '2026-09-07' ? 0 : 60)
  });
  ok('目標0分の日は飛ばす', res.byPlan['a'].items.every(i => i.dateKey !== '2026-09-07'),
     res.byPlan['a'].items);
})();

(function ignoresFinishedAndUnestimable() {
  const entries = [
    { plan: plan({ id: 'done', unit: 'q', due_date: '2026-09-30' }), remaining: 0, minPerUnit: 3, startKey: '2026-09-06' },
    { plan: plan({ id: 'noest', unit: 'q', due_date: '2026-09-30' }), remaining: 10, minPerUnit: null, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 60 });
  eq('残量ゼロと見積もれないプランは対象外', Object.keys(res.byPlan), []);
})();

(function manualCapacity() {
  const entries = [
    { plan: plan({ id: 'a', unit: 'q', due_date: '2026-09-30' }), remaining: 40, minPerUnit: 3,
      startKey: '2026-09-06', dailyCap: 10 },
    { plan: plan({ id: 'b', unit: 'q', due_date: '2026-09-30' }), remaining: 40, minPerUnit: 3, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 120 });
  ok('手入力の上限を超えない', res.byPlan['a'].items.every(i => i.targetAmount <= 10),
     res.byPlan['a'].items);
  ok('上限で余った時間は次のプランへ', res.byPlan['b'].items[0].dateKey === '2026-09-06');
})();

// ---------- 保存できる形に直す ----------
(function scheduleShape() {
  const res = { items: [{ dateKey: '2026-09-06', targetAmount: 5 }], finishKey: '2026-09-06', overdue: false };
  const sched = W.sequencedScheduleFor({ id: 'p1', title: '循環器 講義動画' }, res, '2026-09-06');
  eq('ノルマとして保存できる形になる', sched.items,
     [{ seq: 1, dateKey: '2026-09-06', kind: 'quota', targetAmount: 5, pct: null, title: '循環器 講義動画' }]);
  ok('置くものがあれば quota', sched.mode === 'quota' && sched.ok === true);
  // 1件も置けなかったときに完了扱いにすると、終わっていないプランが done になる
  eq('置くものが無ければ使わない',
     W.sequencedScheduleFor({ id: 'p1' }, { items: [], finishKey: null }, '2026-09-06').ok, false);
  ok('全部置けたときだけ採用する',
     W.canUseSequenced({ items: [{}], unplaced: 0 }) === true);
  ok('置ききれなかった並びは採用しない',
     W.canUseSequenced({ items: [{}], unplaced: 5 }) === false);
  ok('空の並びは採用しない', W.canUseSequenced({ items: [], unplaced: 0 }) === false);
  ok('結果が無ければ採用しない', W.canUseSequenced(null) === false);
})();

// 目標学習時間が全部0でも、終わっていないプランを完了にしない
(function noGoalMinutes() {
  const entries = [
    { plan: plan({ id: 'a', unit: 'q', due_date: '2026-09-30' }), remaining: 40, minPerUnit: 3, startKey: '2026-09-06' },
    { plan: plan({ id: 'b', unit: 'q', due_date: '2026-09-30' }), remaining: 40, minPerUnit: 3, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 0 });
  eq('1件も置けない', res.byPlan['a'].items, []);
  eq('残量はそのまま残る', res.byPlan['a'].unplaced, 40);
  ok('この結果は採用しない', W.canUseSequenced(res.byPlan['a']) === false);
})();

// ---------- 科目の優先度（学習状況から） ----------
const COST = { minPerQuestion: 3, hasQuestion: true, minPerVideo: 40, hasVideo: true,
               video: { kokushi: { minPerVideo: 40, has: true }, cbt: { minPerVideo: 7, has: true } } };
const TODAY = '2026-09-06';
const prio = (o) => W.buildSubjectPriority(Object.assign({ unitCost: COST, todayKey: TODAY }, o));

(function lastTouched() {
  const logs = [
    { subject_name: '2C', started_at: '2026-09-01T10:00:00Z' },
    { subject_name: '2C', started_at: '2026-06-20T10:00:00Z' },
    { subject_name: '4B2J', started_at: '2026-08-10T10:00:00Z' },   // 4連問 2J も 2J を触ったうち
    { subject_name: '自由入力', started_at: '2026-09-02T10:00:00Z' }
  ];
  const last = W.buildSubjectLastTouched(logs);
  eq('いちばん新しい日を採る', last['2C'], '2026-09-01');
  eq('vol.4 の学習は元の科目を触ったうち', last['2J'], '2026-08-10');
  eq('科目に落ちない自由入力は数えない', last['自由入力'], undefined);
})();

(function staleFactor() {
  eq('今日触っていれば等倍', W.subjectStaleFactor('2026-09-06', TODAY), 1);
  eq('45日前でちょうど中間', W.subjectStaleFactor('2026-07-23', TODAY), 1.5);
  eq('90日で頭打ち', W.subjectStaleFactor('2026-06-08', TODAY), 2);
  eq('それ以上放置しても増えない', W.subjectStaleFactor('2025-01-01', TODAY), 2);
  eq('一度も触っていなければ最大', W.subjectStaleFactor(null, TODAY), 2);
})();

(function scoreDrivers() {
  // 残り・正答率・放置以外を揃えて、1つずつ効き目を見る
  const rounds = (total, done, correct) => ({ '1': { done, total, correct } });

  // 放置しているほうが先に来る
  const stale = prio({
    qb: { '2C': rounds(100, 0, 0), '2J': rounds(100, 0, 0) },
    lastTouched: { '2C': '2026-09-05', '2J': '2026-06-01' }
  });
  eq('同じ残量なら放置している科目が先', stale.ranked.map(r => r.id), ['2J', '2C']);
  eq('放置していない側の係数', Math.round(stale.bySubject['2C'].staleFactor * 100) / 100, 1.01);
  eq('放置している側の係数', stale.bySubject['2J'].staleFactor, 2);

  // 正答率が低いほうが先に来る
  const acc = prio({
    qb: { '2C': rounds(100, 50, 45), '2J': rounds(100, 50, 25) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('同じ残量なら正答率が低い科目が先', acc.ranked.map(r => r.id), ['2J', '2C']);
  eq('正答率も出る', [Math.round(acc.bySubject['2C'].accuracy), Math.round(acc.bySubject['2J'].accuracy)], [90, 50]);

  // 残量（＝CBTの中での重さ）が大きいほうが先に来る
  const size = prio({
    qb: { '2C': rounds(400, 0, 0), '2J': rounds(50, 0, 0) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('同じ条件なら残りが多い科目が先', size.ranked.map(r => r.id), ['2C', '2J']);
  eq('CBT内の重さは総量の割合',
     size.ranked.map(r => Math.round(r.sharePct)), [89, 11]);

  // 重い科目でも終わっていれば下がる
  const finished = prio({
    qb: { '2C': rounds(400, 400, 380), '2J': rounds(50, 0, 0) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('終わった科目は重くても後ろ', finished.ranked.map(r => r.id), ['2J', '2C']);
})();

(function accuracyUnknownIsNeutral() {
  // 正答数が未入力の科目を 0 点にすると、手つかずの科目ほど後回しになってしまう
  const r = prio({
    qb: { '2C': { '1': { done: 0, total: 100, correct: 0 } } },
    lastTouched: { '2C': TODAY }
  });
  eq('正答率は出せない', r.bySubject['2C'].accuracy, null);
  eq('誤答率は中立の0.5で置く', r.bySubject['2C'].wrongRate, 0.5);
  ok('影響度は0にならない', r.bySubject['2C'].score > 0);
})();

(function reportsMissingQuestionCost() {
  const noCost = W.buildSubjectPriority({
    qb: { '2C': { '1': { done: 0, total: 100, correct: 0 } } },
    unitCost: { hasQuestion: false, minPerQuestion: null }, todayKey: TODAY, lastTouched: {}
  });
  ok('実測が足りないことを返す', noCost.questionCostKnown === false);
  eq('QBの残り時間は入らない', noCost.bySubject['2C'].remainMin, 0);
  ok('順番には効かない（画面で理由を出す）', noCost.hasData === false);
  ok('実測があれば分かる', prio({ qb: {}, lastTouched: {} }).questionCostKnown === true);
})();

(function includesVideos() {
  const r = prio({
    qb: {}, video: { '2C': { done: 2, total: 10, edition: 'kokushi' } },
    lastTouched: { '2C': TODAY }
  });
  eq('講義動画の残りも残り時間に入る', r.bySubject['2C'].remainMin, 8 * 40);
  eq('重さは総本数ぶん', r.bySubject['2C'].weightMin, 10 * 40);
})();

(function foldsVol4() {
  const r = prio({
    qb: { '2C': { '1': { done: 0, total: 100, correct: 0 } },
          '4B2C': { '1': { done: 0, total: 40, correct: 0 } } },
    lastTouched: { '2C': TODAY }
  });
  eq('4連問 2C は 2C にまとまる', r.ranked.map(x => x.id), ['2C']);
  eq('残り時間は合算', r.bySubject['2C'].remainMin, (100 + 40) * 3);
})();

// ---------- 科目の優先度が順番に効く ----------
(function priorityDrivesOrder() {
  const plans = [
    plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-09-30' }),
    plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-30' })
  ];
  // 科目マスタの並びでは 2C(循環器) が 2O(小児科) より先
  eq('スコアが無ければ科目マスタの並び順', W.planPriorityOrder(plans).map(p => p.id), ['circ', 'peds']);
  // 小児科のほうが影響度が高ければ、そちらが先に来る
  eq('スコアが高い科目が先',
     W.planPriorityOrder(plans, sid => (sid === '2O' ? 900 : 100)).map(p => p.id), ['peds', 'circ']);
  // 締切は自分で決めた約束なので、スコアより強い
  const withDue = [
    plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-09-30' }),
    plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-10' })
  ];
  eq('締切が早い科目はスコアに関わらず先',
     W.planPriorityOrder(withDue, sid => (sid === '2O' ? 900 : 100)).map(p => p.id), ['circ', 'peds']);
  // 同じ科目の中の 動画→問題演習 はスコアで崩れない
  const sameSubject = [
    plan({ id: 'qb', subject_id: '2C', unit: 'q', due_date: '2026-09-30' }),
    plan({ id: 'vid', subject_id: '2C', unit: 'video', due_date: '2026-09-30' })
  ];
  eq('同じ科目では動画が先のまま',
     W.planPriorityOrder(sameSubject, () => 500).map(p => p.id), ['vid', 'qb']);
})();

console.log();
if (failures.length) {
  console.log('--- 失敗 ---');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
