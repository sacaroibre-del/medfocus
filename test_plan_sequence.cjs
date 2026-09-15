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
// app.js の定数は const なので window に生えず、jsdom の eval も呼ぶたびに別スコープ。
// ここは値を直に置いて、app.js 側を動かしたらテストも意識して直す形にする。
const ROUND_GAP_DEFAULT_DAYS = 7;    // app.js ROUND_GAP_DEFAULT_DAYS
const ROUND_GAP_PIVOT_ACCURACY = 75; // app.js ROUND_GAP_PIVOT_ACCURACY
const ROUND_GAP_MIN_DAYS = 1;        // app.js ROUND_GAP_MIN_DAYS
const ROUND_GAP_MAX_DAYS = 21;       // app.js ROUND_GAP_MAX_DAYS

// ---------- 優先順位 ----------
(function priorityOrder() {
  // 同じ科目では 講義動画 → 問題演習
  const same = W.planPriorityOrder([
    plan({ id: 'qb',  subject_id: '2C', unit: 'q',     due_date: '2026-09-10' }),
    plan({ id: 'vid', subject_id: '2C', unit: 'video', due_date: '2026-09-10' })
  ]);
  eq('同じ科目なら講義動画が先', same.map(p => p.id), ['vid', 'qb']);

  // スコアが無ければ科目マスタの並び順（締切は主キーではない）
  const acrossSubjects = W.planPriorityOrder([
    plan({ id: 'peds-vid', subject_id: '2O', unit: 'video', due_date: '2026-11-10' }),
    plan({ id: 'circ-qb',  subject_id: '2C', unit: 'q',     due_date: '2026-11-20' }),
    plan({ id: 'circ-vid', subject_id: '2C', unit: 'video', due_date: '2026-11-08' })
  ], { todayKey: '2026-09-06' });
  eq('科目のまとまりごと動き、その中は動画→問題演習',
     acrossSubjects.map(p => p.id), ['circ-vid', 'circ-qb', 'peds-vid']);

  // vol.4 は元の科目と同じまとまりに入る
  const withVol4 = W.planPriorityOrder([
    plan({ id: 'peds-vid', subject_id: '2O',   unit: 'video', due_date: '2026-11-12' }),
    plan({ id: 'circ-4b',  subject_id: '4B2C', unit: 'q',     due_date: '2026-11-30' }),
    plan({ id: 'circ-vid', subject_id: '2C',   unit: 'video', due_date: '2026-11-08' })
  ], { todayKey: '2026-09-06' });
  eq('4連問 2C は 2C のまとまりに入る',
     withVol4.map(p => p.id), ['circ-vid', 'circ-4b', 'peds-vid']);

  // 同着でも並びがブレない
  const a = [plan({ id: 'x', subject_id: '2C', unit: 'q', due_date: '2026-11-10' }),
             plan({ id: 'y', subject_id: '2C', unit: 'q', due_date: '2026-11-10' })];
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
  // 問題演習は分割しない。動画を見終わった翌日に80問まとめて置く
  eq('循環器の問題演習は動画が終わった翌日に全問',
     days('circ-qb'), ['2026-09-08:80']);
  eq('小児の動画はそのあと',
     days('peds-vid'), ['2026-09-09:3', '2026-09-10:1']);

  ok('初日に小児の動画は入らない（満遍なくにしない）',
     res.byPlan['peds-vid'].items.every(i => i.dateKey > '2026-09-07'));
  eq('全部が締切に間に合う',
     ['circ-vid', 'circ-qb', 'peds-vid'].map(id => res.byPlan[id].overdue), [false, false, false]);
  eq('警告は出ない', res.warnings, []);
})();

(function warnsWhenOverdue() {
  // 締切までに置ききれないプランは、順番を変えずに警告で知らせる
  const entries = [
    { plan: plan({ id: 'first', subject_id: '2C', unit: 'video', due_date: '2026-09-30' }),
      remaining: 20, minPerUnit: 40, startKey: '2026-09-06' },
    { plan: plan({ id: 'late', subject_id: '2O', unit: 'video', due_date: '2026-09-08' }),
      remaining: 4, minPerUnit: 40, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 120 });
  ok('後ろに回った科目が締切を超える', res.byPlan['late'].overdue === true,
     { 完了: res.byPlan['late'].finishKey, 締切: res.byPlan['late'].dueKey });
  ok('超過日数が出る', res.byPlan['late'].overDays > 0, res.byPlan['late'].overDays);
  eq('警告は超過したプランだけ', res.warnings.map(w => w.planId), ['late']);
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

(function videoBeforeQbSameSubject() {
  // 同じ科目では、講義動画を見終わった翌日からQBを始める。
  // 見ていない範囲をQBで解くことになるので、同じ日に混ぜない。
  const entries = [
    { plan: plan({ id: 'vid', subject_id: '2J', unit: 'video', due_date: '2026-11-30' }),
      remaining: 3, minPerUnit: 38, startKey: '2026-09-06' },
    { plan: plan({ id: 'qb', subject_id: '2J', unit: 'q', due_date: '2026-11-30' }),
      remaining: 46, minPerUnit: 2, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 180 });
  const vEnd = res.byPlan['vid'].finishKey;
  const qStart = res.byPlan['qb'].items[0].dateKey;
  ok('QBは動画を見終わった翌日から', qStart > vEnd, { 動画完了: vEnd, QB開始: qStart });
  ok('動画が終わっていない日にQBを置かない',
     res.byPlan['qb'].items.every(i => i.dateKey > vEnd), res.byPlan['qb'].items);

  // vol.4 も元の科目の動画を待つ
  const withVol4 = W.buildSequencedPlanSchedules({
    entries: [entries[0],
      { plan: plan({ id: '4b', subject_id: '4B2J', unit: 'q', due_date: '2026-11-30' }),
        remaining: 20, minPerUnit: 2, startKey: '2026-09-06' }],
    todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  ok('4連問も元の科目の動画を待つ',
     withVol4.byPlan['4b'].items.every(i => i.dateKey > withVol4.byPlan['vid'].finishKey));

  // 動画プランの無い科目は待たされない
  const noVideo = W.buildSequencedPlanSchedules({
    entries: [{ plan: plan({ id: 'solo', subject_id: '3D', unit: 'q', due_date: '2026-11-30' }),
                remaining: 40, minPerUnit: 2, startKey: '2026-09-06' },
               entries[0]],
    todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  eq('動画の無い科目は初日から解ける', noVideo.byPlan['solo'].items[0].dateKey, '2026-09-06');
})();

(function rollingVideoThenQb() {
  // 元の不具合: 「全科目の動画を見てから、まとめて全科目のQB」になっていた。
  // 動画→翌日にQB のゲートだけで、動画とQBが日ごとに噛み合う形になる。
  const vid = (id, sid, n) => ({ plan: plan({ id, subject_id: sid, unit: 'video', due_date: '2026-11-30' }),
    remaining: n, minPerUnit: 40, startKey: '2026-09-06' });
  const qb = (id, sid, n) => ({ plan: plan({ id, subject_id: sid, unit: 'q', due_date: '2026-11-30' }),
    remaining: n, minPerUnit: 2, startKey: '2026-09-06' });
  const res = W.buildSequencedPlanSchedules({
    entries: [vid('vA', '2C', 4), qb('qA', '2C', 40), vid('vB', '2J', 4), qb('qB', '2J', 40),
              vid('vC', '2O', 4), qb('qC', '2O', 40)],
    todayKey: '2026-09-06', goalMinutesOf: () => 180
  });

  // 各科目は「動画を見終わった翌日以降にQB」を保つ
  [['vA', 'qA'], ['vB', 'qB'], ['vC', 'qC']].forEach(([v, q]) => {
    ok(`${v} の翌日以降に ${q}`, res.byPlan[q].items[0].dateKey > res.byPlan[v].finishKey,
       { 動画完了: res.byPlan[v].finishKey, QB開始: res.byPlan[q].items[0].dateKey });
  });

  // 全科目の動画を見終わるのを待ってからQBに入る形になっていないこと
  const lastVideoDay = ['vA', 'vB', 'vC'].map(id => res.byPlan[id].finishKey).sort().pop();
  const firstQbDay = ['qA', 'qB', 'qC'].map(id => res.byPlan[id].items[0].dateKey).sort()[0];
  ok('最後の動画を見終わる前にQBが始まっている', firstQbDay < lastVideoDay,
     { 最初のQB: firstQbDay, 最後の動画: lastVideoDay });

  // QBと別科目の動画が同じ日に並ぶ（1日 ＝ 見終わった科目のQB ＋ 別の科目の動画）
  const videoDays = new Set(['vA', 'vB', 'vC'].flatMap(id => res.byPlan[id].items.map(i => i.dateKey)));
  const qbDays = new Set(['qA', 'qB', 'qC'].flatMap(id => res.byPlan[id].items.map(i => i.dateKey)));
  ok('QBと動画が同じ日に並ぶ日がある', [...qbDays].some(d => videoDays.has(d)),
     { QB: [...qbDays].sort(), 動画: [...videoDays].sort() });

  // 学習時間を余らせない（1日180分・動画40分/本・QB2分/問なら端数まで使える）
  const perDay = {};
  ['vA', 'vB', 'vC'].forEach(id => res.byPlan[id].items.forEach(i =>
    { perDay[i.dateKey] = (perDay[i.dateKey] || 0) + i.targetAmount * 40; }));
  ['qA', 'qB', 'qC'].forEach(id => res.byPlan[id].items.forEach(i =>
    { perDay[i.dateKey] = (perDay[i.dateKey] || 0) + i.targetAmount * 2; }));
  const days = Object.keys(perDay).sort();
  ok('最終日以外は1日の学習時間をほぼ使い切る',
     days.slice(0, -1).every(d => perDay[d] >= 140), perDay);
})();

(function manualCapPassesLeftoverOn() {
  // 1日の上限で止まったときは、余った時間を次のプランへ回す（上限とはそういう意味）
  const capped = W.buildSequencedPlanSchedules({
    entries: [
      { plan: plan({ id: 'a', subject_id: '2C', unit: 'q', due_date: '2026-11-30' }),
        remaining: 200, minPerUnit: 2, startKey: '2026-09-06', dailyCap: 10 },
      { plan: plan({ id: 'b', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
        remaining: 200, minPerUnit: 2, startKey: '2026-09-06' }
    ], todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  eq('上限ぶんだけ進む', capped.byPlan['a'].items[0].targetAmount, 10);
  eq('余った時間は次のプランへ', capped.byPlan['b'].items[0].dateKey, '2026-09-06');
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

// ---------- 進んだぶんの前倒し ----------
(function pullsForwardAfterProgress() {
  // 完了した講義動画プランは順番詰めの対象に入らない。その完了日を渡さないと
  // 「今日見終わった科目のQB」が今日に置かれてしまう。
  const entries = [
    { plan: plan({ id: 'qb2B', subject_id: '2B', unit: 'q', due_date: '2026-11-30' }),
      remaining: 52, minPerUnit: 2, startKey: '2026-09-06' },
    { plan: plan({ id: 'vid2J', subject_id: '2J', unit: 'video', due_date: '2026-11-30' }),
      remaining: 3, minPerUnit: 38, startKey: '2026-09-06' }
  ];
  const sameDay = W.buildSequencedPlanSchedules({
    entries, todayKey: '2026-09-06', goalMinutesOf: () => 180,
    videoDoneAt: { '2b': '2026-09-06' }   // 2B の動画は今日見終わった
  });
  eq('今日見終わった科目のQBは翌日から',
     sameDay.byPlan['qb2B'].items.map(i => i.dateKey), ['2026-09-07']);

  const yesterday = W.buildSequencedPlanSchedules({
    entries, todayKey: '2026-09-06', goalMinutesOf: () => 180,
    videoDoneAt: { '2b': '2026-09-05' }   // 昨日見終わっていれば今日から解ける
  });
  eq('昨日見終わった科目のQBは今日から',
     yesterday.byPlan['qb2B'].items.map(i => i.dateKey), ['2026-09-06']);

  const noVideo = W.buildSequencedPlanSchedules({
    entries, todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  eq('動画プランが無ければ今日から解ける',
     noVideo.byPlan['qb2B'].items.map(i => i.dateKey), ['2026-09-06']);
})();

(function lastProgressKey() {
  eq('最後に進捗があった日を返す', W.planLastProgressKey([
    { due_date: '2026-09-04', done_amount: 2 },
    { due_date: '2026-09-06', done_amount: 1 },
    { due_date: '2026-09-08', done_amount: 0 }
  ]), '2026-09-06');
  eq('完了印だけでも拾う', W.planLastProgressKey([
    { due_date: '2026-09-07', done_amount: 0, completed: true }
  ]), '2026-09-07');
  eq('進捗が無ければ null', W.planLastProgressKey([{ due_date: '2026-09-07', done_amount: 0 }]), null);
  eq('空でも落ちない', W.planLastProgressKey([]), null);
})();

(function inProgressSubjectsStayFirst() {
  // 優先度は「今日触ったか」で動く（放置係数 2.0 → 1.0）。着手した科目を
  // 先に回さないと、1本見た翌日に別の科目へ抜かれて中途半端な科目が増える。
  const plans = [
    plan({ id: 'fresh', subject_id: '2O', unit: 'video', due_date: '2026-11-30' }),
    plan({ id: 'started', subject_id: '2J', unit: 'video', due_date: '2026-11-30' })
  ];
  const scoreOf = sid => (sid === '2O' ? 900 : 100);   // 未着手のほうが影響度は高い
  eq('着手していなければ影響度順',
     W.planPriorityOrder(plans, { todayKey: '2026-09-06', scoreOf }).map(p => p.id), ['fresh', 'started']);
  eq('着手して途中の科目を先に終わらせる',
     W.planPriorityOrder(plans, { todayKey: '2026-09-06', scoreOf, inProgress: new Set(['2j']) })
       .map(p => p.id), ['started', 'fresh']);
  // 締切が目前の科目は、途中の科目より強い
  const urgent = [
    plan({ id: 'due', subject_id: '2O', unit: 'video', due_date: '2026-09-08' }),
    plan({ id: 'started', subject_id: '2J', unit: 'video', due_date: '2026-11-30' })
  ];
  eq('締切目前は途中の科目より先',
     W.planPriorityOrder(urgent, { todayKey: '2026-09-06', scoreOf, inProgress: new Set(['2j']) })
       .map(p => p.id), ['due', 'started']);
})();

// ---------- 今日すでに勉強した分を引く ----------
(function noTreadmill() {
  // 進めるたびに翌日ぶんが今日へ降りてくると、やってもやっても今日が減らない。
  const entries = [
    { plan: plan({ id: 'vA', subject_id: '2C', unit: 'video', due_date: '2026-11-30' }),
      remaining: 3, minPerUnit: 47, startKey: '2026-09-06' },     // 141分
    { plan: plan({ id: 'vB', subject_id: '2J', unit: 'video', due_date: '2026-11-30' }),
      remaining: 3, minPerUnit: 38, startKey: '2026-09-06' }      // 114分
  ];
  const run = spent => W.buildSequencedPlanSchedules({
    entries, todayKey: '2026-09-06', goalMinutesOf: () => 180, spentTodayMin: spent });
  const todayOf = (res, id) => res.byPlan[id].items.filter(i => i.dateKey === '2026-09-06');

  const morning = run(0);
  eq('手つかずの日は科目ぶんをまとめて置く', todayOf(morning, 'vA').map(i => i.targetAmount), [3]);

  // 20分だけ勉強した日: 残り160分に141分は収まるので、今日の予定は変わらない
  const little = run(20);
  eq('少し勉強しただけなら今日の予定は変わらない',
     todayOf(little, 'vA').map(i => i.targetAmount), [3]);

  // 今日ぶん(141分)をこなした後: 残り39分に114分は収まらないので今日には足さない
  const afterPlan = run(141);
  eq('今日ぶんをこなしたら今日には足さない', todayOf(afterPlan, 'vB'), []);
  ok('次の科目は翌日から',
     morning.byPlan['vB'].items.length > 0 && afterPlan.byPlan['vB'].items[0].dateKey > '2026-09-06',
     afterPlan.byPlan['vB'].items[0]);

  // 目標を使い切ったら今日には何も置かない
  const spentAll = run(200);
  ok('使い切った日には何も置かない',
     ['vA', 'vB'].every(id => todayOf(spentAll, id).length === 0));
  ok('残りは翌日以降に置かれる',
     ['vA', 'vB'].every(id => spentAll.byPlan[id].items.length > 0));
})();

(function spentMinutes() {
  const T = '2026-09-06';
  const logs = [
    { duration_minutes: 60, started_at: T + 'T10:00:00Z' },
    { duration_minutes: 45, started_at: T + 'T14:00:00Z' },
    { duration_minutes: 90, started_at: '2026-09-05T14:00:00Z' }
  ];
  eq('今日ぶんだけ足す', W.planSpentMinutesOn(logs, T), 105);
  eq('別の日は0', W.planSpentMinutesOn(logs, '2026-09-04'), 0);
  eq('ログが無くても落ちない', W.planSpentMinutesOn(null, T), 0);
  eq('日付が壊れたログは飛ばす',
     W.planSpentMinutesOn([{ duration_minutes: 10, started_at: 'not-a-date' }], T), 0);
})();

// ---------- 実測が無いときの仮の単価 ----------
(function fallbackUnitCost() {
  const none = { hasQuestion: false, hasVideo: false, minPerQuestion: null, minPerVideo: null, video: {} };
  eq('実測が無ければ見積もれない', W.planMinutesPerUnit(plan({ id: 'a', unit: 'q' }), none), null);
  eq('問題演習の仮の単価', W.planMinutesPerUnitOrDefault(plan({ id: 'a', unit: 'q' }), none), 2);
  eq('講義動画の仮の単価',
     W.planMinutesPerUnitOrDefault(plan({ id: 'b', unit: 'video', subject_id: '2J' }), none), 40);
  const measured = { hasQuestion: true, minPerQuestion: 3, hasVideo: true, minPerVideo: 40, video: {} };
  eq('実測があればそちらを使う', W.planMinutesPerUnitOrDefault(plan({ id: 'a', unit: 'q' }), measured), 3);

  // 単価を見積もれない科目を順番詰めから落とすと、その科目だけ
  // 「動画を見終わってからQB」が崩れる。仮の値でも並べる。
  const res = W.buildSequencedPlanSchedules({
    entries: [
      { plan: plan({ id: 'vid', subject_id: '2A', unit: 'video', due_date: '2026-11-30' }),
        remaining: 3, minPerUnit: W.planMinutesPerUnitOrDefault(plan({ id: 'vid', unit: 'video' }), none),
        startKey: '2026-09-06' },
      { plan: plan({ id: 'qb', subject_id: '2A', unit: 'q', due_date: '2026-11-30' }),
        remaining: 55, minPerUnit: W.planMinutesPerUnitOrDefault(plan({ id: 'qb', unit: 'q' }), none),
        startKey: '2026-09-06' }
    ], todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  ok('仮の単価でも動画→翌日にQBを保つ',
     res.byPlan['qb'].items[0].dateKey > res.byPlan['vid'].finishKey,
     { 動画完了: res.byPlan['vid'].finishKey, QB開始: res.byPlan['qb'].items[0].dateKey });
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
  // 問題演習は分割せず残り全問を置くが、目標学習時間0の日は休みなので置かない
  ok('休養日には問題演習も置かない', res.byPlan['b'].items.length === 0);
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
  // priority = W × G × L / C。条件を1つずつ変えて効き目を見る
  const rounds = (total, done, correct) => ({ '1': { done, total, correct } });

  // 正答率が低いほうが先に来る（伸びしろ G が大きく、L も中間帯に近い）
  const acc = prio({
    qb: { '2C': rounds(100, 50, 45), '2J': rounds(100, 50, 25) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('正答率が低い科目が先', acc.ranked.map(r => r.id), ['2J', '2C']);
  eq('正答率も出る', [Math.round(acc.bySubject['2C'].accuracy), Math.round(acc.bySubject['2J'].accuracy)], [90, 50]);
  ok('伸びしろは低いほうが大きい', acc.bySubject['2J'].gain > acc.bySubject['2C'].gain);

  // 量はランクに効かない（旧モデルでは「残りが多い科目が先」だった）
  const size = prio({
    qb: { '2C': rounds(400, 0, 0), '2J': rounds(50, 0, 0) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  ok('残りが8倍でもスコアは同じ',
     Math.abs(size.bySubject['2C'].score - size.bySubject['2J'].score) < 1e-9,
     { '2C': size.bySubject['2C'].score, '2J': size.bySubject['2J'].score });
  ok('残り時間そのものは持っている', size.bySubject['2C'].remainMin > size.bySubject['2J'].remainMin);
  eq('教材量の割合も出る', size.ranked.map(r => Math.round(r.materialPct)), [89, 11]);

  // 重い科目でも終わっていれば下がる（残り0はスコア0）
  const finished = prio({
    qb: { '2C': rounds(400, 400, 380), '2J': rounds(50, 0, 0) },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('終わった科目は重くても後ろ', finished.ranked.map(r => r.id), ['2J', '2C']);
  eq('残り0はスコア0', finished.bySubject['2C'].score, 0);

  // 放置係数は無くなった。時間の効き目は「試験日までの減衰」が引き受ける
  eq('放置係数は持たない', acc.bySubject['2C'].staleFactor, undefined);
  eq('誤答率も持たない（p に一本化）', acc.bySubject['2C'].wrongRate, undefined);
})();

(function accuracyUnknownIsNeutral() {
  // 正答数が未入力の科目を伸びしろ0にすると、手つかずの科目ほど後回しになる。
  // 全体平均ではなく中立値 0.5 に置く（平均に寄せると、ふだんの正答率が高い人ほど
  // 未入力科目が沈む）。
  const r = prio({
    qb: { '2C': { '1': { done: 0, total: 100, correct: 0 } },
          '2J': { '1': { done: 100, total: 100, correct: 98 } } },
    lastTouched: { '2C': TODAY, '2J': TODAY }
  });
  eq('正答率は出せない', r.bySubject['2C'].accuracy, null);
  eq('正答率未入力の印', r.bySubject['2C'].hasAccuracy, false);
  eq('中立値 0.5 で置く', r.bySubject['2C'].p, 0.5);
  ok('全体平均が高くてもスコアは0にならない', r.bySubject['2C'].score > 0, r.bySubject['2C'].score);
})();

(function reportsMissingQuestionCost() {
  // 実測が無くても仮の単価で並べる。落とすとその科目だけ残り時間が0になり、
  // スコアも0になって順番から抜け落ちるため。仮だったことは画面に出す。
  const noCost = W.buildSubjectPriority({
    qb: { '2C': { '1': { done: 0, total: 100, correct: 0 } } },
    unitCost: { hasQuestion: false, minPerQuestion: null }, todayKey: TODAY, lastTouched: {}
  });
  ok('実測が足りないことを返す', noCost.questionCostKnown === false);
  eq('仮の単価で残り時間は出す', noCost.bySubject['2C'].remainMin, 100 * 2);
  ok('順番にも効く', noCost.hasData === true);
  ok('実測があれば分かる', prio({ qb: {}, lastTouched: {} }).questionCostKnown === true);
})();

(function includesVideos() {
  const r = prio({
    qb: {}, video: { '2C': { done: 2, total: 10, edition: 'kokushi' } },
    lastTouched: { '2C': TODAY }
  });
  eq('講義動画の残りも残り時間に入る', r.bySubject['2C'].remainMin, 8 * 40);
  eq('教材量は総本数ぶん', r.bySubject['2C'].materialMin, 10 * 40);
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
  const OPTS = { todayKey: TODAY };
  const withScore = s => ({ todayKey: TODAY, scoreOf: s });
  const plans = [
    plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
    plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-11-30' })
  ];
  // 科目マスタの並びでは 2C(循環器) が 2O(小児科) より先
  eq('スコアが無ければ科目マスタの並び順', W.planPriorityOrder(plans, OPTS).map(p => p.id), ['circ', 'peds']);
  // 小児科のほうが影響度が高ければ、そちらが先に来る
  eq('スコアが高い科目が先',
     W.planPriorityOrder(plans, withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id), ['peds', 'circ']);

  // 締切は普段は順番を決めない。決めようのない科目ごとの締切の1日差で
  // 順番がひっくり返らないようにするため。
  const slightlyEarlier = [
    plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
    plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-11-29' })
  ];
  eq('締切が少し早いだけではスコアを覆せない',
     W.planPriorityOrder(slightlyEarlier, withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id),
     ['peds', 'circ']);

  // ただし締切が目前なら割り込む
  const urgent = [
    plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
    plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-10' })   // 4日後
  ];
  eq('締切が目前の科目はスコアに関わらず割り込む',
     W.planPriorityOrder(urgent, withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id),
     ['circ', 'peds']);
  eq('境界の7日後はまだ目前',
     W.planPriorityOrder([
       plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
       plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-13' })
     ], withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id), ['circ', 'peds']);
  eq('8日後は目前でないのでスコア順',
     W.planPriorityOrder([
       plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
       plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-14' })
     ], withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id), ['peds', 'circ']);
  eq('締切が過ぎている科目も割り込む',
     W.planPriorityOrder([
       plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-11-30' }),
       plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-01' })
     ], withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id), ['circ', 'peds']);
  eq('目前どうしは締切順',
     W.planPriorityOrder([
       plan({ id: 'peds', subject_id: '2O', unit: 'q', due_date: '2026-09-11' }),
       plan({ id: 'circ', subject_id: '2C', unit: 'q', due_date: '2026-09-08' })
     ], withScore(sid => (sid === '2O' ? 900 : 100))).map(p => p.id), ['circ', 'peds']);

  // 同じ科目の中の 動画→問題演習 はスコアでも締切でも崩れない
  const sameSubject = [
    plan({ id: 'qb', subject_id: '2C', unit: 'q', due_date: '2026-11-30' }),
    plan({ id: 'vid', subject_id: '2C', unit: 'video', due_date: '2026-11-30' })
  ];
  eq('同じ科目では動画が先のまま',
     W.planPriorityOrder(sameSubject, withScore(() => 500)).map(p => p.id), ['vid', 'qb']);
})();

// ---------- CBT の出題比重 ----------
(function blueprint() {
  const ALL = ('1A 1B 1C 1D 1E 1F 1G 1H 1I 1J 2A 2B 2C 2D 2E 2F 2G 2H 2I 2J 2K 2L 2M 2N '
             + '2O 2P 2Q 2R 2S 2T 2U 2V 2W 2X 3A 3B 3C 3D').split(' ');
  const q = id => W.cbtExamInfoOf(id).questions;

  ok('全科目に対応づけがある', ALL.every(id => W.cbtExamInfoOf(id) !== null),
     ALL.filter(id => !W.cbtExamInfoOf(id)));
  const total = ALL.reduce((s, id) => s + q(id), 0);
  ok('科目に配った合計が320問になる', Math.abs(total - 320) < 0.001, total);

  // 複数領域にまたがる科目は、その全部から受け取る
  ok('循環器は D領域だけでなく E領域からも受け取る', q('2C') > q('2A') * 0.99 && q('2C') > 10, q('2C'));
  eq('またがっている領域が分かる', W.cbtExamInfoOf('2C').domains, ['D', 'E', 'F']);
  eq('単一領域の科目', W.cbtExamInfoOf('1B').domains, ['C']);

  // 科目数の偏りで順位が壊れていないこと（E領域を5科目で割ると感染症が循環器を超えていた）
  ok('メジャー内科 > 全身系 > マイナー', q('2C') > q('2H') && q('2H') > q('2R'),
     { 循環器: q('2C'), 感染症: q('2H'), 眼科: q('2R') });
  ok('メジャー内科どうしは同じ', Math.abs(q('2C') - q('2I')) < 0.001);
  ok('公衆衛生がA・B領域を独占しない（3A・3B・3Cにも配る）', q('3D') < 32, q('3D'));

  // vol.3（総論）は F領域 + A・B領域 = 全体の30% を数科目で分けるため、
  // そのままだと診療の知識・技能や症候・病態がメジャー内科を上回ってしまう。
  // F領域を臓器科目へ配って抑えている。ここが崩れると優先順位が総論に偏る。
  ok('診療の知識・技能はメジャー内科を上回らない', q('3B') <= q('2C'), { '3B': q('3B'), '2C': q('2C') });
  ok('症候・病態もメジャー内科を上回らない', q('3A') <= q('2C'), { '3A': q('3A'), '2C': q('2C') });
  ok('身体診察もメジャー内科を上回らない', q('3C') <= q('2C'), { '3C': q('3C'), '2C': q('2C') });
  const volPct = pre => ALL.filter(id => id.startsWith(pre)).reduce((s, id) => s + W.cbtExamInfoOf(id).pct, 0);
  ok('vol.3 全体で2割を超えない', volPct('3') < 20, volPct('3'));
  ok('vol.2（臓器別の臨床）が過半を占める', volPct('2') > 50, volPct('2'));

  // 比重は影響度を支配しないよう頭打ちにする
  ALL.forEach(id => {
    const w = W.cbtExamWeightOf(id);
    ok('比重は0.5〜2.0に収まる: ' + id, w >= 0.5 && w <= 2, w);
  });
  eq('対応づけの無い科目は中立', W.cbtExamWeightOf('anki'), 1);
  eq('自由入力も中立', W.cbtExamWeightOf('自習室でまとめ'), 1);
  eq('4連問 2C は 2C と同じ比重', W.cbtExamWeightOf('4B2C'), W.cbtExamWeightOf('2C'));
  eq('多肢選択 2R も元の科目と同じ', W.cbtExamWeightOf('4A2R'), W.cbtExamWeightOf('2R'));
})();

(function cramFactor() {
  eq('公衆衛生は直前型', W.cbtCramFactorOf('3D'), 0.5);
  eq('積み上げが要る科目はそのまま', W.cbtCramFactorOf('2C'), 1);
  eq('対応の無い科目もそのまま', W.cbtCramFactorOf('anki'), 1);
  eq('4連問も元の科目に従う', W.cbtCramFactorOf('4B3D'), W.cbtCramFactorOf('3D'));

  // 出題数そのものは下げない。下げると「CBT出題数」の列が実態と食い違う
  ok('出題数は据え置き', W.cbtExamInfoOf('3D').questions > 15, W.cbtExamInfoOf('3D').questions);
  ok('出題比重も据え置き', W.cbtExamWeightOf('3D') > 1.5, W.cbtExamWeightOf('3D'));

  // 影響度だけが下がる
  const rounds = { '1': { done: 0, total: 200, correct: 0 } };
  const r = prio({ qb: { '3D': rounds, '2C': rounds }, lastTouched: {} });
  eq('影響度は詰め込み係数のぶん下がる',
     Math.round(r.bySubject['3D'].score / r.bySubject['2C'].score * 1000) / 1000,
     Math.round(W.cbtExamWeightOf('3D') * 0.5 / W.cbtExamWeightOf('2C') * 1000) / 1000);
  eq('係数も行に出せる', r.bySubject['3D'].cramFactor, 0.5);
})();

(function examWeightAffectsScore() {
  // 残り・正答率・放置を揃えると、出題比重の差だけが残る
  const rounds = { '1': { done: 0, total: 100, correct: 0 } };
  const r = prio({ qb: { '2C': rounds, '2R': rounds }, lastTouched: { '2C': TODAY, '2R': TODAY } });
  eq('出題の多い科目が先', r.ranked.map(x => x.id), ['2C', '2R']);
  eq('出題数はマスタと一致する',
     [r.bySubject['2C'].examQuestions, r.bySubject['2R'].examQuestions],
     [W.cbtExamInfoOf('2C').questions, W.cbtExamInfoOf('2R').questions]);
  ok('メジャー内科の出題数はマイナーより多い',
     r.bySubject['2C'].examQuestions > r.bySubject['2R'].examQuestions);
  ok('影響度の比は比重の比になる',
     Math.abs(r.bySubject['2C'].score / r.bySubject['2R'].score
              - W.cbtExamWeightOf('2C') / W.cbtExamWeightOf('2R')) < 1e-9);
  // 教材の量（登録した総問題数）は出題比重とは別物として残す
  ok('教材量も別に持つ', r.bySubject['2C'].materialMin === r.bySubject['2R'].materialMin);
})();

// ---------- 締切の初期値 ----------
(function defaultDue() {
  // 試験が登録されていなければ30日後（従来どおり）
  eq('試験が無ければ30日後', W.defaultPlanDue([], TODAY), { key: '2026-10-06', title: null });

  // 登録されていれば直近の未来の試験日。科目ごとの締切を決めなくてよくなる
  const exams = [
    { exam_date: '2026-08-01', title: '終わった試験' },
    { exam_date: '2027-01-20', title: '国試' },
    { exam_date: '2026-11-15', title: 'CBT本番' }
  ];
  eq('直近の未来の試験日が入る', W.defaultPlanDue(exams, TODAY), { key: '2026-11-15', title: 'CBT本番' });
  eq('過ぎた試験は選ばない',
     W.defaultPlanDue([{ exam_date: '2026-08-01', title: '終わった試験' }], TODAY),
     { key: '2026-10-06', title: null });
  eq('今日の試験は選ぶ',
     W.defaultPlanDue([{ exam_date: TODAY, title: '今日' }], TODAY), { key: TODAY, title: '今日' });
})();

// 動画とセットのQBは「翌日に残り全問」（時間を超えてよい）。
// 動画の無いQBだけのプランは、講義動画と同じで「1日に収まるならまとめて、
// 収まらないなら入るだけ置いて翌日へ」。200問を1日に積んで期間を余らせない。
(function qbOnlyIsPacedByBudget() {
  const qb = (id, sid, n) => ({ plan: plan({ id, subject_id: sid, unit: 'q', due_date: '2026-09-13' }),
    remaining: n, minPerUnit: 2, startKey: '2026-09-06' });

  // 【A】QBだけのプランが並ぶとき
  const only = W.buildSequencedPlanSchedules({
    entries: [qb('big', '3D', 200), qb('mid', '3A', 80), qb('small', '1I', 30)],
    todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  const bigDays = only.byPlan['big'].items;
  ok('大きいQBは1日に積まず日をまたぐ', bigDays.length > 1, bigDays);
  ok('1日に置く量はその日の枠まで（200問400分を1日に置かない）',
     bigDays.every(i => i.targetAmount * 2 <= 180), bigDays);
  ok('1日に収まるQBはまとめて置く',
     only.byPlan['small'].items.length === 1, only.byPlan['small'].items);
  eq('順番は優先順位のまま（大きいものを後回しにしない）',
     only.byPlan['big'].items[0].dateKey, '2026-09-06');

  // 【B】動画とセットのQBは分割しない。動画は完了済みでプランが残っていない状態。
  const paired = W.buildSequencedPlanSchedules({
    entries: [qb('bigPaired', '2B', 150)],
    todayKey: '2026-09-06', goalMinutesOf: () => 180,
    videoDoneAt: { '2b': '2026-09-05' }, videoGroups: new Set(['2b'])
  });
  eq('動画とセットのQBは翌日に残り全問（枠を超えてよい）',
     paired.byPlan['bigPaired'].items, [{ dateKey: '2026-09-06', targetAmount: 150 }]);

  // videoGroups を渡さなければ同じ入力でも分割される（違いが videoGroups だけであること）
  const unpaired = W.buildSequencedPlanSchedules({
    entries: [qb('bigPaired', '2B', 150)],
    todayKey: '2026-09-06', goalMinutesOf: () => 180,
    videoDoneAt: { '2b': '2026-09-05' }
  });
  ok('動画を持たない科目なら同じ量でも分割される',
     unpaired.byPlan['bigPaired'].items.length > 1, unpaired.byPlan['bigPaired'].items);

  // 【C】混在。動画のある科目はまとめ置き、QBだけの科目は枠なりに進む。
  const mixed = W.buildSequencedPlanSchedules({
    entries: [{ plan: plan({ id: 'vid', subject_id: '2B', unit: 'video', due_date: '2026-09-13' }),
                remaining: 3, minPerUnit: 40, startKey: '2026-09-06' },
               qb('pairedQb', '2B', 52), qb('soloQb', '3D', 200)],
    todayKey: '2026-09-06', goalMinutesOf: () => 180
  });
  eq('動画とセットのQBは動画の翌日にまとめて',
     mixed.byPlan['pairedQb'].items, [{ dateKey: '2026-09-07', targetAmount: 52 }]);
  ok('QBだけの科目は初日から枠なりに進む',
     mixed.byPlan['soloQb'].items.length > 1
     && mixed.byPlan['soloQb'].items[0].dateKey === '2026-09-06',
     mixed.byPlan['soloQb'].items);
})();

// buildPlanSequence は、見終わった動画プランも見て videoGroups を組む。
// canAuto で絞ると「動画を見終わった科目のQB」が分割されてしまう。
(function videoGroupsSurviveCompletedPlans() {
  const state = [
    { plan: plan({ id: 'vid', subject_id: '2B', unit: 'video', total_volume: 3,
                   start_date: '2026-09-01', due_date: '2026-09-13' }),
      mine: [{ id: 'v1', due_date: '2026-09-05', target_amount: 3, done_amount: 3, completed: true }],
      canAuto: false },
    { plan: plan({ id: 'qb', subject_id: '2B', unit: 'q', total_volume: 150,
                   start_date: '2026-09-01', due_date: '2026-09-13' }),
      mine: [], canAuto: true },
    { plan: plan({ id: 'solo', subject_id: '3D', unit: 'q', total_volume: 200,
                   start_date: '2026-09-01', due_date: '2026-09-13' }),
      mine: [], canAuto: true }
  ];
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 180;
  const res = W.buildPlanSequence(state, '2026-09-06', { video: 40, q: 2 }, null, 0);
  W.planGoalMinutesOf = goalWas;
  ok('見終わった動画の科目のQBはまとめて置かれる',
     res && res.byPlan['qb'].items.length === 1, res && res.byPlan['qb'].items);
  ok('動画を持たない科目のQBは枠なりに分割される',
     res && res.byPlan['solo'].items.length > 1, res && res.byPlan['solo'].items);
})();

// 同じ教材の1周目と2周目が同じ日に並ばないこと。
// 同じ問題をその日のうちに2度解くことになり、解き直しの間隔も空かないため。
(function roundsDoNotOverlap() {
  const entries = [
    { plan: plan({ id: 'r1', subject_id: '4A2Q', unit: 'q', target_round: 1, due_date: '2026-09-30' }),
      remaining: 60, minPerUnit: 2, startKey: '2026-09-06' },
    { plan: plan({ id: 'r2', subject_id: '4A2Q', unit: 'q', target_round: 2, due_date: '2026-10-31' }),
      remaining: 60, minPerUnit: 2, startKey: '2026-09-06' }
  ];
  // 1日の枠は両方まとめて入る広さにしておく。狭いと時間切れで分かれてしまい、
  // 周回の前後を見ているのか時間切れなのかが区別できない。
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 480 });
  const d1 = res.byPlan['r1'].items.map(i => i.dateKey);
  const d2 = res.byPlan['r2'].items.map(i => i.dateKey);
  ok('1周目と2周目が同じ日に並ばない', !d2.some(k => d1.indexOf(k) >= 0), { r1: d1, r2: d2 });
  ok('2周目は1周目を終えた翌日から',
     d2[0] > res.byPlan['r1'].finishKey, { '1周目完了': res.byPlan['r1'].finishKey, '2周目開始': d2[0] });
  ok('1周目は初日から進む', d1[0] === '2026-09-06', d1);
})();

// 別の教材どうしは止め合わない。「多肢選択 2Q」と「2Q 産科」は解く問題が別。
(function otherMaterialsAreNotBlocked() {
  const entries = [
    { plan: plan({ id: 'multi1', subject_id: '4A2Q', unit: 'q', target_round: 1, due_date: '2026-09-30' }),
      remaining: 30, minPerUnit: 2, startKey: '2026-09-06' },
    { plan: plan({ id: 'base2', subject_id: '2Q', unit: 'q', target_round: 2, due_date: '2026-09-30' }),
      remaining: 30, minPerUnit: 2, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 120 });
  eq('多肢選択の1周目は初日', res.byPlan['multi1'].items[0].dateKey, '2026-09-06');
  eq('別教材の2周目は初日から進める', res.byPlan['base2'].items[0].dateKey, '2026-09-06');
})();

// 3周目は2周目まで待つ。1周目が終わっているだけでは始めない。
(function thirdRoundWaitsForSecond() {
  const entries = [
    { plan: plan({ id: 'a1', subject_id: '2Q', unit: 'q', target_round: 1, due_date: '2026-12-31' }),
      remaining: 30, minPerUnit: 2, startKey: '2026-09-06' },
    { plan: plan({ id: 'a2', subject_id: '2Q', unit: 'q', target_round: 2, due_date: '2026-12-31' }),
      remaining: 30, minPerUnit: 2, startKey: '2026-09-06' },
    { plan: plan({ id: 'a3', subject_id: '2Q', unit: 'q', target_round: 3, due_date: '2026-12-31' }),
      remaining: 30, minPerUnit: 2, startKey: '2026-09-06' }
  ];
  const res = W.buildSequencedPlanSchedules({ entries, todayKey: '2026-09-06', goalMinutesOf: () => 480 });
  const first = id => res.byPlan[id].items[0].dateKey;
  ok('2周目は1周目のあと', first('a2') > res.byPlan['a1'].finishKey, { a1: res.byPlan['a1'].items, a2: res.byPlan['a2'].items });
  ok('3周目は2周目のあと', first('a3') > res.byPlan['a2'].finishKey, { a2: res.byPlan['a2'].items, a3: res.byPlan['a3'].items });
})();

// 1周目を今日終えた教材の2周目は、今日には降りてこない。
// 終わったプランは順番詰めの queue に入らないので、完了日を別に拾えているかを見る。
(function nextRoundWaitsForFinishedRound() {
  const state = [
    { plan: plan({ id: 'done1', subject_id: '4A2Q', unit: 'q', target_round: 1, total_volume: 20,
                   start_date: '2026-09-01', due_date: '2026-09-30' }),
      mine: [{ id: 'x1', due_date: '2026-09-06', target_amount: 20, done_amount: 20, completed: true }],
      canAuto: false },
    { plan: plan({ id: 'next2', subject_id: '4A2Q', unit: 'q', target_round: 2, total_volume: 20,
                   start_date: '2026-09-01', due_date: '2026-10-31' }),
      mine: [], canAuto: true }
  ];
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 120;
  const res = W.buildPlanSequence(state, '2026-09-06', { q: 2 }, null, 0);
  W.planGoalMinutesOf = goalWas;
  // 正答率も実測の間隔も無いので既定の間隔（ROUND_GAP_DEFAULT_DAYS）ぶん空く
  ok('今日1周目を終えた教材の2周目は復習間隔ぶん空けてから',
     res && res.byPlan['next2'].items[0].dateKey
        === W.shiftDateKey('2026-09-06', ROUND_GAP_DEFAULT_DAYS),
     res && res.byPlan['next2'].items);
})();

// ---------- 次の周までに空ける日数 ----------
(function reviewGapPureFunctions() {
  const D = ROUND_GAP_DEFAULT_DAYS;
  // 見るのは「後の時点の伸び」の縮小推定値（shrunkGain）。
  // 2周目の最中の正答率（avgGain）は間隔が短いほど有利に出るので使わない。
  eq('実測が無ければ既定値', W.roundGapBaseDays(null), D);
  eq('サンプルが1科目だけのビンは採らない',
     W.roundGapBaseDays({ bins: [{ days: 2, count: 1, shrunkGain: 30 }, { days: 11, count: 4, shrunkGain: 5 }] }), 11);
  eq('いちばん伸びたビンの代表日数を採る',
     W.roundGapBaseDays({ bins: [{ days: 2, count: 3, shrunkGain: 4 }, { days: 6, count: 2, shrunkGain: 12 }] }), 6);
  eq('伸び幅が出ていないビンは飛ばす',
     W.roundGapBaseDays({ bins: [{ days: 2, count: 5, shrunkGain: null }] }), D);
  eq('旧指標（直後の正答率）では選ばない',
     W.roundGapBaseDays({ bins: [{ days: 2, count: 9, avgGain: 40 }] }), D);
  eq('同値なら既定値に近いビン',
     W.roundGapBaseDays({ bins: [{ days: 2, count: 3, shrunkGain: 8 }, { days: 6, count: 3, shrunkGain: 8 }] }), 6);

  eq('基準の正答率なら基準どおり', W.roundReviewGapDays(ROUND_GAP_PIVOT_ACCURACY, 8), 8);
  eq('正答率が低いほど短い', W.roundReviewGapDays(50, 12), 8);
  eq('正答率が高いほど長い', W.roundReviewGapDays(100, 12), 16);
  eq('正答数が未入力なら基準どおり', W.roundReviewGapDays(null, 9), 9);
  ok('短いほうは1日を下回らない', W.roundReviewGapDays(0, 6) >= ROUND_GAP_MIN_DAYS,
     W.roundReviewGapDays(0, 6));
  eq('長いほうは上限で止まる', W.roundReviewGapDays(100, 40), ROUND_GAP_MAX_DAYS);
})();

// 1周目の出来が悪い教材ほど、2周目が早く回ってくること。
(function weakMaterialComesBackSooner() {
  const mk = (id, sid, round, gap) => ({
    plan: plan({ id, subject_id: sid, unit: 'q', target_round: round, due_date: '2026-12-31' }),
    remaining: 30, minPerUnit: 2, startKey: '2026-09-06', reviewGapDays: gap
  });
  const res = W.buildSequencedPlanSchedules({
    entries: [mk('weak1', '2Q', 1, 0), mk('weak2', '2Q', 2, 4),
              mk('ok1', '2J', 1, 0),   mk('ok2', '2J', 2, 14)],
    todayKey: '2026-09-06', goalMinutesOf: () => 480
  });
  const first = id => res.byPlan[id].items[0].dateKey;
  eq('出来が悪い教材の2周目は1周目の4日後', first('weak2'), '2026-09-10');
  eq('出来がいい教材の2周目は14日後', first('ok2'), '2026-09-20');
  ok('出来が悪いほうが先に戻ってくる', first('weak2') < first('ok2'),
     { weak: first('weak2'), ok: first('ok2') });
})();

// 教材進捗の正答率と実測の間隔が、順番詰めまで通ること。
(function gapFlowsFromProgressAndMeasurement() {
  const mkState = (id, sid, round) => ({
    plan: plan({ id, subject_id: sid, unit: 'q', target_round: round, total_volume: 20,
                 start_date: '2026-09-01', due_date: '2026-12-31' }),
    mine: round === 1
      ? [{ id: id + '-t', due_date: '2026-09-06', target_amount: 20, done_amount: 20, completed: true }]
      : [],
    canAuto: round !== 1
  });
  // 1周目: 2Q は正答率50%、2J は100%。実測はいちばん伸びた間隔が 8〜14日（代表11日）。
  const qb = { '2Q': { '1': { total: 20, done: 20, correct: 10 } },
               '2J': { '1': { total: 20, done: 20, correct: 20 } } };
  const roundGain = { bins: [{ days: 6, count: 2, shrunkGain: 3 }, { days: 11, count: 3, shrunkGain: 15 }] };
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 480;
  const res = W.buildPlanSequence(
    [mkState('q1', '2Q', 1), mkState('q2', '2Q', 2), mkState('j1', '2J', 1), mkState('j2', '2J', 2)],
    '2026-09-06', { hasQuestion: true, minPerQuestion: 2 }, null, 0, { qb, roundGain });
  W.planGoalMinutesOf = goalWas;
  // 基準11日 × 正答率50/75 = 7日、× 100/75 = 15日
  eq('正答率50%の2周目は7日後', res.byPlan['q2'].items[0].dateKey, '2026-09-13');
  eq('正答率100%の2周目は15日後', res.byPlan['j2'].items[0].dateKey, '2026-09-21');
})();

// ---------- 残り時間を目標周回ぶんまで数える ----------
// 1周目ぶんだけで数えると、1周目を終えた科目はスコアが 0 になり、
// 出来が悪かった科目ほど2周目が最後尾に沈む（誤答率が 0 に掛かって消える）。
(function remainingCountsPlannedRounds() {
  // 2Q: 1周目を解き終えた。正答率60%（＝誤答率0.4）
  // 2J: 1周目がまだ半分。正答率90%
  const qb = { '2Q': { '1': { total: 200, done: 200, correct: 120 } },
               '2J': { '1': { total: 200, done: 100, correct: 90 } } };
  const lastTouched = { '2Q': TODAY, '2J': TODAY };

  const only1 = prio({ qb, lastTouched });
  eq('1周目ぶんで数えると解き終えた科目の残り時間は0', only1.bySubject['2Q'].remainMin, 0);
  eq('残り時間が0ならスコアも0（誤答率が効かない）', only1.bySubject['2Q'].score, 0);

  const upTo2 = prio({ qb, lastTouched, targetRoundBy: { '2q': 2, '2j': 2 } });
  ok('2周目ぶんを数えると残り時間が戻る', upTo2.bySubject['2Q'].remainMin > 0,
     upTo2.bySubject['2Q'].remainMin);
  ok('1周目の出来が悪い科目が、進みの遅い科目より上に来る',
     upTo2.bySubject['2Q'].score > upTo2.bySubject['2J'].score,
     { '2Q': upTo2.bySubject['2Q'].score, '2J': upTo2.bySubject['2J'].score });
  eq('順位でも先頭', upTo2.ranked[0].id, '2Q');

  // 科目ごとに別の目標周回を持てる（多肢選択だけ2周目、など）
  const mixed = prio({ qb, lastTouched, targetRoundBy: { '2q': 2 } });
  ok('目標周回を渡した科目だけ残り時間が伸びる',
     mixed.bySubject['2Q'].remainMin > 0 && mixed.bySubject['2J'].remainMin === only1.bySubject['2J'].remainMin,
     { '2Q': mixed.bySubject['2Q'].remainMin, '2J': mixed.bySubject['2J'].remainMin });
})();

(function targetRoundBySubjectFromPlans() {
  const map = W.planTargetRoundBySubject([
    plan({ id: 'a', subject_id: '4A2Q', unit: 'q', target_round: 1 }),
    plan({ id: 'b', subject_id: '4A2Q', unit: 'q', target_round: 3 }),
    plan({ id: 'c', subject_id: '2J',   unit: 'q', target_round: 2 }),
    plan({ id: 'd', subject_id: '2J',   unit: 'q', target_round: 5, status: 'archived' }),
    plan({ id: 'e', subject_id: '2C',   unit: 'video', target_round: null })
  ]);
  eq('同じ科目では最大の周回を採る', map['4a2q'], 3);
  eq('進行中でないプランは数えない', map['2j'], 2);
  eq('周回を持たないプランは入らない', map['2c'], undefined);
})();

// ==================== Phase 1: 追加データの層 ====================

// ---------- 出題重み W の正規化 ----------
(function examWeightNormalized() {
  // CBT_SUBJECT_DOMAIN は const なのでソースから科目IDを拾う
  const src = require('fs').readFileSync(__dirname + '/app.js', 'utf8');
  const block = src.slice(src.indexOf('const CBT_SUBJECT_DOMAIN'), src.indexOf("'3D': [['AB', 3]]") + 40);
  const ids = [...new Set([...block.matchAll(/'([123][A-Z])':/g)].map(m => m[1]))];
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const before = mean(ids.map(id => W.cbtExamWeightOf(id)));
  const after = mean(ids.map(id => W.cbtExamWeightNorm(id)));
  ok('正規化前の平均は1.0からずれている（クランプの張り付きぶん）',
     Math.abs(before - 1) > 0.005, before);
  ok('正規化後の平均は1.0', Math.abs(after - 1) < 1e-9, after);
  ok('順位は変わらない',
     ids.slice().sort((a, b) => W.cbtExamWeightOf(b) - W.cbtExamWeightOf(a)).join()
     === ids.slice().sort((a, b) => W.cbtExamWeightNorm(b) - W.cbtExamWeightNorm(a)).join());
  eq('対応づけの無い科目は中立のまま', W.cbtExamWeightOf('anki'), 1);
})();

// ---------- 正答率 p（2段階の縮小推定） ----------
//   p過去' = (n過去·p過去 + m0·p0) / (n過去 + m0)    n過去=0 なら p0
//   p      = (n直近·p直近 + m·p過去') / (n直近 + m)
(function blendedAccuracy() {
  const m = 10, m0 = 10;   // PLANNING_CONFIG.accuracy.priorWeight / globalPriorWeight
  const NEUTRAL = 0.5;     // PLANNING_CONFIG.accuracy.neutral

  // --- 少ない解答数をそのまま信じない（ご指定のケース①） ---
  const tiny = W.blendedRoundAccuracy({ '1': { total: 100, done: 5, correct: 5 } }, NEUTRAL);
  ok('1周目 5/5 でも p は 1.0 にならない', tiny.p < 1, tiny.p);
  eq('寄せる先が無いので p過去\' は p0', tiny.pPastShrunk, NEUTRAL);
  ok('p = (5×1.0 + 10×0.5)/15', Math.abs(tiny.p - (5 * 1 + m * NEUTRAL) / (5 + m)) < 1e-9, tiny.p);

  // --- 直近周が二重に数えられていない（ご指定のケース②） ---
  const two = W.blendedRoundAccuracy({
    '1': { total: 200, done: 200, correct: 120 },   // 60%
    '2': { total: 200, done: 10,  correct: 10 }     // 100%（10問だけ）
  }, NEUTRAL);
  eq('直近周は2周目', two.round, 2);
  eq('直近周の解答数', two.nRecent, 10);
  eq('p過去 は1周目だけ（直近周を含まない）', two.nPast, 200);
  ok('p過去 = 120/200 = 0.6 ちょうど', Math.abs(two.pPast - 0.6) < 1e-9, two.pPast);
  // 二重に数えていれば p過去 は (120+10)/210 = 0.619… になるはず
  ok('直近周を混ぜた 130/210 にはなっていない', Math.abs(two.pPast - 130 / 210) > 1e-6, two.pPast);
  const expectPast = (200 * 0.6 + m0 * NEUTRAL) / (200 + m0);
  ok('p過去\' は p0 へ少しだけ寄る', Math.abs(two.pPastShrunk - expectPast) < 1e-9, two.pPastShrunk);
  ok('p = (10×1.0 + 10×p過去\')/20',
     Math.abs(two.p - (10 * 1 + m * expectPast) / (10 + m)) < 1e-9, two.p);
  ok('10問だけの100%をそのまま信じない', two.p < 0.85, two.p);

  // --- 解くほど直近周の値へ寄る ---
  const late = W.blendedRoundAccuracy({
    '1': { total: 200, done: 200, correct: 120 },
    '2': { total: 200, done: 200, correct: 200 }
  }, NEUTRAL);
  ok('解くほど直近周に寄る', late.p > two.p, { early: two.p, late: late.p });
  ok('それでも過去のぶんだけ1.0より下', late.p < 1, late.p);

  // --- p0 が効く（全体的に正答率が高い人は寄せ先も高い） ---
  const lowP0 = W.blendedRoundAccuracy({ '1': { total: 100, done: 5, correct: 5 } }, 0.4);
  const highP0 = W.blendedRoundAccuracy({ '1': { total: 100, done: 5, correct: 5 } }, 0.9);
  ok('p0 が高いほど p も高い', highP0.p > lowP0.p, { low: lowP0.p, high: highP0.p });

  // --- 正答数が未入力なら p0、ただし表示用の印は残る ---
  const none = W.blendedRoundAccuracy({ '1': { total: 200, done: 50 } }, 0.62);
  eq('正答数が無ければ p は p0', none.p, 0.62);
  eq('「正答率未入力」を出せるよう印は残す', none.hasData, false);
  eq('空でも落ちない', W.blendedRoundAccuracy(null, 0.62).p, 0.62);
  eq('p0 未指定なら中立値', W.blendedRoundAccuracy(null).p, NEUTRAL);
})();

// ---------- p0（全科目・全周をならした正答率） ----------
(function globalAccuracy() {
  const qb = {
    '2C': { '1': { total: 100, done: 100, correct: 60 }, '2': { total: 100, done: 50, correct: 40 } },
    '2J': { '1': { total: 100, done: 100, correct: 80 } },
    '2Q': { '1': { total: 100, done: 20 } }                      // 正答数未入力は数えない
  };
  ok('全科目・全周の合計から出す',
     Math.abs(W.globalQbAccuracy(qb) - (60 + 40 + 80) / (100 + 50 + 100)) < 1e-9,
     W.globalQbAccuracy(qb));
  eq('データが無ければ中立値', W.globalQbAccuracy({}), 0.5);
  eq('空でも落ちない', W.globalQbAccuracy(null), 0.5);
})();

// ---------- 科目ごとの1問あたりの分 ----------
(function unitCostBySubject() {
  const logs = [
    // 4連問 2Q: 30問を150分 → 5.0分/問（サンプル20問超）
    { activity: 'qb', subject_name: '4B2Q', questions_solved: 30, duration_minutes: 150 },
    // 多肢選択 2Q: 10問しか無いのでサンプル不足
    { activity: 'qb', subject_name: '4A2Q', questions_solved: 10, duration_minutes: 20 },
    // 動画のログは数えない
    { activity: 'video', subject_name: '2Q', videos_watched: 3, duration_minutes: 120 }
  ];
  const by = W.buildUnitCostBySubject(logs);
  ok('科目別の実測が出る', Math.abs(by['4b2q'].minPerQuestion - 5) < 1e-9, by['4b2q']);
  eq('サンプルが足りれば has', by['4b2q'].has, true);
  eq('足りなければ has は false', by['4a2q'].has, false);
  eq('動画のログは入らない', by['2q'], undefined);

  const cost = { hasQuestion: true, minPerQuestion: 2 };
  eq('科目別の実測があればそれを使う', W.minutesPerQuestionFor('4B2Q', cost, by), 5);
  eq('足りない科目は全体の実測に落ちる', W.minutesPerQuestionFor('4A2Q', cost, by), 2);
  eq('全体の実測も無ければ仮の単価', W.minutesPerQuestionFor('2C', {}, by), 2);
})();

// ---------- その教材に1日あたり割ける分 ----------
(function dailyMinutes() {
  const withCap = plan({ id: 'a', unit: 'q', daily_capacity: 20 });
  eq('手入力の量があれば 量 × 1問あたりの分', W.planDailyMinutes(withCap, 3, 4, 240), 60);
  const noCap = plan({ id: 'b', unit: 'q' });
  eq('無ければ その日の目標時間 ÷ 教材数', W.planDailyMinutes(noCap, 3, 4, 240), 60);
  eq('教材数が0でも割らない', W.planDailyMinutes(noCap, 3, 0, 240), 240);
  eq('目標時間が無ければ0', W.planDailyMinutes(noCap, 3, 4, 0), 0);
})();

// ---------- プランに紐づく試験日 ----------
(function planExamDate() {
  const cds = [{ id: 'e1', exam_date: '2026-11-20' }, { id: 'e2', exam_date: '2027-02-01' }];
  eq('参照先の試験日を引く', W.planExamDateOf(plan({ id: 'a', exam_countdown_id: 'e2' }), cds), '2027-02-01');
  eq('参照が無ければ null', W.planExamDateOf(plan({ id: 'b' }), cds), null);
  eq('参照先が消えていれば null', W.planExamDateOf(plan({ id: 'c', exam_countdown_id: 'zz' }), cds), null);
})();

// ---------- 周回の完了日 ----------
(function roundCompletion() {
  const before = { '2C': { '1': { total: 100, done: 90, correct: 60 } } };
  const after  = { '2C': { '1': { total: 100, done: 100, correct: 70 } } };
  const r1 = W.applyRoundCompletions(before, after, '2026-09-15');
  eq('100%に達した日を打つ', r1['2C']['1'].completed_at, '2026-09-15');
  eq('推定ではない', r1['2C']['1'].completed_estimated, false);

  // 既に100%だった周に、別の日が打ち直されない
  const r2 = W.applyRoundCompletions(r1, r1, '2026-09-20');
  eq('完了済みの周は日付が動かない', r2['2C']['1'].completed_at, '2026-09-15');

  // 100%を割ったら取り消す（問題数を直したときなど）
  const reopened = { '2C': { '1': Object.assign({}, r1['2C']['1'], { total: 120 }) } };
  const r3 = W.applyRoundCompletions(r1, reopened, '2026-09-21');
  eq('100%を割ったら完了日を消す', r3['2C']['1'].completed_at, undefined);

  // 追跡前から100%だった周のバックフィル
  const legacy = { '2C': { '1': { total: 100, done: 100, correct: 70 } },
                   '2J': { '1': { total: 50, done: 50, correct: 40 } } };
  const bf = W.backfillRoundCompletions(legacy, { '2c|1': '2026-08-01' });
  eq('プランから導出できた周は日付を入れる', bf.qb['2C']['1'].completed_at, '2026-08-01');
  eq('推定フラグが立つ', bf.qb['2C']['1'].completed_estimated, true);
  eq('導出できない周に日付は入れない', bf.qb['2J']['1'].completed_at, undefined);
  eq('代わりに印だけ付ける', bf.qb['2J']['1'].completed_backfilled, true);
  eq('埋めた件数', bf.filled, 1);
  eq('印だけ付けた件数', bf.marked, 1);

  // 印の付いた周に、あとから今日が打たれないこと
  const r4 = W.applyRoundCompletions(bf.qb, bf.qb, '2026-09-15');
  eq('追跡前から100%の周に今日を打たない', r4['2J']['1'].completed_at, undefined);

  // 順番詰めが使う形に取り出す
  const map = W.recordedRoundDoneAt(bf.qb);
  eq('記録のある周だけ出る', map['2c|1'], '2026-08-01');
  eq('記録の無い周は入らない', map['2j|1'], undefined);
})();

// ---------- 模試 ----------
(function mockExam() {
  ok('正答率は正答数÷問題数', Math.abs(W.mockExamAccuracy({ correct_questions: 45, total_questions: 60 }) - 0.75) < 1e-9);
  eq('問題数が0なら null', W.mockExamAccuracy({ correct_questions: 0, total_questions: 0 }), null);
  eq('欠損でも落ちない', W.mockExamAccuracy(null), null);
})();

// ==================== Phase 5: 間隔の上限を試験日に連動 ====================
(function gapCapFollowsExam() {
  const MAX = 21, MIN = 1;   // PLANNING_CONFIG.round.maxGapDays / minGapDays
  eq('試験日が無ければ上限そのまま', W.roundGapCap(null, '2026-09-15'), MAX);
  // floor(0.3 × 60) = 18
  eq('試験まで60日なら18日', W.roundGapCap('2026-11-14', '2026-09-15'), 18);
  // floor(0.3 × 20) = 6
  eq('試験まで20日なら6日', W.roundGapCap('2026-10-05', '2026-09-15'), 6);
  // floor(0.3 × 200) = 60 → 上限21で頭打ち
  eq('遠い試験でも上限21', W.roundGapCap('2027-04-03', '2026-09-15'), MAX);
  // floor(0.3 × 2) = 0 → 下限1
  eq('試験が目前でも1日は空ける', W.roundGapCap('2026-09-17', '2026-09-15'), MIN);
  eq('試験日が過去でも下限1', W.roundGapCap('2026-09-01', '2026-09-15'), MIN);
})();

// ==================== Phase 2: 締切クランプと状態 ====================
const unlock = (o) => W.roundUnlockPlan(Object.assign({
  gapDays: 7, prevDoneKey: '2026-09-15', todayKey: '2026-09-15',
  remainMin: 200, dailyMin: 100, bufferDays: 1
}, o));

(function deadlineClamp() {
  // requiredDays = ceil(200/100) = 2
  // 締切まで余裕たっぷり: room = (2026-10-31 - 2026-09-15) - 2 - 1 = 46 - 3 = 43
  const roomy = unlock({ dueKey: '2026-10-31' });
  eq('必要日数', roomy.requiredDays, 2);
  eq('余裕がある', roomy.room, 43);
  eq('間隔はそのまま', roomy.effectiveGap, 7);
  eq('短縮していない', roomy.shortened, false);
  eq('解禁日 = 前周完了日 + 間隔', roomy.unlockKey, '2026-09-22');

  // 締切が近い: 2026-09-20 まで。room = 5 - 2 - 1 = 2 → gap 7 が 2 に縮む
  const tightish = unlock({ dueKey: '2026-09-20' });
  eq('余裕が少ない', tightish.room, 2);
  eq('締切に合わせて間隔が縮む', tightish.effectiveGap, 2);
  eq('短縮した印', tightish.shortened, true);
  eq('元の間隔も残す', tightish.gapDays, 7);
  eq('解禁日も前倒しになる', tightish.unlockKey, '2026-09-17');
})();

(function statusIsExclusive() {
  // ① 間隔1日でも締切に収まらない → 「締切がきつい」。遅れは重ねない
  //    room = (2026-09-17 - 2026-09-15) - 2 - 1 = 2 - 3 = -1
  const tight = unlock({ dueKey: '2026-09-17' });
  ok('room が1未満', tight.room < 1, tight.room);
  eq('状態は「締切がきつい」', tight.status, 'tight');
  eq('遅れ判定はしない', tight.isBehind, false);

  // ② 解禁前 → 待機中
  const waiting = unlock({ dueKey: '2026-10-31', todayKey: '2026-09-18' });
  eq('状態は待機中', waiting.status, 'waiting');
  eq('遅れ判定はしない', waiting.isBehind, false);
  eq('いつ解禁かを持つ', waiting.unlockKey, '2026-09-22');

  // ③ 解禁後、必要日数が締切までの日数を超える → 遅れ
  //    前周完了(9/15)の時点では入る計画だった（room = 46 - 30 - 1 = 15）。
  //    そこから時間を空費して今日が 10/20、締切まで11日しかないのに必要日数は30日。
  const behind = unlock({ dueKey: '2026-10-31', todayKey: '2026-10-20',
                          remainMin: 3000, prevDoneKey: '2026-09-15' });
  ok('計画そのものは入っていた（きついではない）', behind.room >= 1, behind.room);
  eq('状態は遅れ', behind.status, 'behind');
  eq('遅れ判定をする', behind.isBehind, true);

  // ④ 解禁後で間に合う → ok
  const fine = unlock({ dueKey: '2026-10-31', todayKey: '2026-09-25' });
  eq('状態は ok', fine.status, 'ok');
  eq('遅れ判定はしない', fine.isBehind, false);
})();

(function tightWinsOverBehind() {
  // 「締切がきつい」と「遅れ」が同時に成り立つ状況でも、きついが優先で
  // 遅れは重ねて出さない（計画側の問題と実行の遅れを分けるため）
  const both = unlock({ dueKey: '2026-09-16', todayKey: '2026-09-30',
                        remainMin: 5000, dailyMin: 10 });
  eq('状態はきついのほう', both.status, 'tight');
  eq('遅れは重ねない', both.isBehind, false);
})();

(function noDeadlineKeepsOldBehaviour() {
  const free = unlock({ dueKey: null });
  eq('締切が無ければ room は null', free.room, null);
  eq('間隔はそのまま', free.effectiveGap, 7);
  eq('短縮もしない', free.shortened, false);
  eq('遅れ判定もしない', free.isBehind, false);
  eq('解禁日は出る', free.unlockKey, '2026-09-22');
})();

(function gapCapAppliesOnTopOfDeadline() {
  // 試験が近いと、締切に余裕があっても上限で頭打ちになる
  // 試験まで10日 → gapCap = floor(0.3×10) = 3
  const capped = unlock({ dueKey: '2026-12-31', gapDays: 14, examKey: '2026-09-25' });
  eq('上限は3日', capped.gapCap, 3);
  eq('上限で頭打ち', capped.effectiveGap, 3);
  eq('短縮した印が立つ', capped.shortened, true);
  // 試験日なしなら21が上限なので14がそのまま通る
  const uncapped = unlock({ dueKey: '2026-12-31', gapDays: 14 });
  eq('試験日が無ければ上限21', uncapped.gapCap, 21);
  eq('14日がそのまま通る', uncapped.effectiveGap, 14);
})();

(function edgeCases() {
  eq('1日に進める分が0なら必要日数は出せない', unlock({ dailyMin: 0 }).requiredDays, null);
  eq('その場合は締切クランプをしない', unlock({ dailyMin: 0, dueKey: '2026-09-20' }).effectiveGap, 7);
  eq('残りが0なら必要日数も0', unlock({ remainMin: 0 }).requiredDays, 0);
  eq('前周の完了日が無ければ解禁日も無い', unlock({ prevDoneKey: null }).unlockKey, null);
  eq('間隔は最低1日', unlock({ gapDays: 0 }).effectiveGap, 1);
})();

// 締切クランプが順番詰めまで通ること（純関数だけでなく実際の日付に効く）
(function clampReachesTheSchedule() {
  const mk = (id, round, due) => ({
    plan: plan({ id, subject_id: '2Q', unit: 'q', target_round: round,
                 total_volume: 30, start_date: '2026-09-01', due_date: due }),
    mine: round === 1
      ? [{ id: id + '-t', due_date: '2026-09-15', target_amount: 30, done_amount: 30, completed: true }]
      : [],
    canAuto: round !== 1
  });
  // 1周目の正答率100% → 間隔は基準7日 × 100/75 = 9日ぶん空くのが素の姿
  const qb = { '2Q': { '1': { total: 30, done: 30, correct: 30 } } };
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 480;

  // 締切が遠ければ9日後（2026-09-24）
  const roomy = W.buildPlanSequence(
    [mk('a1', 1, '2026-12-31'), mk('a2', 2, '2026-12-31')],
    '2026-09-15', { hasQuestion: true, minPerQuestion: 2 }, null, 0,
    { qb, bufferDays: 1 });
  eq('締切が遠ければ間隔どおり9日後', roomy.byPlan['a2'].items[0].dateKey, '2026-09-24');
  eq('短縮していない', roomy.byPlan['a2'].unlock.shortened, false);

  // 締切が近いと詰まる。2周目の締切 9/20、1問2分×30問=60分、1日480分 → 必要1日
  //   room = (9/20 - 9/15) - 1 - 1 = 3 → 間隔9日が3日に縮む
  const tight = W.buildPlanSequence(
    [mk('b1', 1, '2026-12-31'), mk('b2', 2, '2026-09-20')],
    '2026-09-15', { hasQuestion: true, minPerQuestion: 2 }, null, 0,
    { qb, bufferDays: 1 });
  const u = tight.byPlan['b2'].unlock;
  eq('締切に合わせて間隔が縮む', u.effectiveGap, 3);
  eq('短縮した印', u.shortened, true);
  eq('元の間隔も分かる', u.gapDays, 9);
  eq('解禁日が前倒しになる', tight.byPlan['b2'].items[0].dateKey, '2026-09-18');
  W.planGoalMinutesOf = goalWas;
})();

// 試験日が近いと、締切に余裕があっても間隔の上限で頭打ちになる（Phase 5 の通し）
(function examCapReachesTheSchedule() {
  const mk = (id, round) => ({
    plan: plan({ id, subject_id: '2Q', unit: 'q', target_round: round, total_volume: 30,
                 start_date: '2026-09-01', due_date: '2026-12-31', exam_countdown_id: 'e1' }),
    mine: round === 1
      ? [{ id: id + '-t', due_date: '2026-09-15', target_amount: 30, done_amount: 30, completed: true }]
      : [],
    canAuto: round !== 1
  });
  const qb = { '2Q': { '1': { total: 30, done: 30, correct: 30 } } };   // 間隔9日ぶん
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 480;
  // 試験まで10日 → gapCap = floor(0.3 × 10) = 3
  const res = W.buildPlanSequence(
    [mk('c1', 1), mk('c2', 2)], '2026-09-15', { hasQuestion: true, minPerQuestion: 2 }, null, 0,
    { qb, bufferDays: 1, countdowns: [{ id: 'e1', exam_date: '2026-09-25' }] });
  eq('試験日から上限が決まる', res.byPlan['c2'].unlock.gapCap, 3);
  eq('上限で頭打ち', res.byPlan['c2'].items[0].dateKey, '2026-09-18');
  W.planGoalMinutesOf = goalWas;
})();

// ---------- 状態バッジ（きつい／待機中／遅れ を混ぜない） ----------
(function statusBadges() {
  const p = plan({ id: 'x', status: 'active' });
  const prog = { status: 'ok' };
  const badge = (seq, pr) => W.planStatusBadge(p, pr || prog, seq);

  ok('締切がきついバッジ', badge({ unlock: { status: 'tight' } }).includes('締切がきつい'));
  ok('きついときは遅れを重ねない',
     !badge({ unlock: { status: 'tight', isBehind: false }, overdue: true }).includes('遅れ'));
  ok('きついときは prog.behind も重ねない',
     !badge({ unlock: { status: 'tight' } }, { status: 'behind' }).includes('遅れ'));

  const waiting = badge({ unlock: { status: 'waiting', unlockKey: '2026-09-22' } });
  ok('待機中バッジ', waiting.includes('待機中'));
  ok('いつ解禁かを出す', waiting.includes('9/22'), waiting);
  ok('待機中は遅れを出さない', !waiting.includes('遅れ'));

  ok('解禁後に間に合わなければ遅れ',
     badge({ unlock: { status: 'behind', isBehind: true } }).includes('遅れ'));
  ok('従来の overdue も遅れのまま',
     badge({ overdue: true, overDays: 3 }).includes('遅れ'));
  ok('どれでもなければ順調', badge({ unlock: { status: 'ok' } }).includes('順調'));

  ok('完了はすべてに優先',
     W.planStatusBadge(plan({ id: 'y', status: 'done' }), prog, { unlock: { status: 'tight' } }).includes('完了'));
})();

// ---------- 短縮の説明 ----------
(function unlockNote() {
  eq('短縮していなければ何も出さない',
     W.planUnlockNoteHTML({ unlock: { status: 'ok', shortened: false } }), '');
  eq('解禁の情報が無ければ何も出さない', W.planUnlockNoteHTML({}), '');

  const short = W.planUnlockNoteHTML({ unlock: {
    status: 'ok', shortened: true, gapDays: 9, effectiveGap: 3, gapCap: 21, unlockKey: '2026-09-18' } });
  ok('何日から何日に縮めたかを出す', short.includes('9日 → 3日'), short);
  ok('締切に合わせたと言う', short.includes('締切に合わせて'), short);
  ok('解禁日も出す', short.includes('9/18'), short);

  // 上限に当たって縮んだときは理由を「試験日が近いため」にする
  const capped = W.planUnlockNoteHTML({ unlock: {
    status: 'ok', shortened: true, gapDays: 14, effectiveGap: 3, gapCap: 3, unlockKey: '2026-09-18' } });
  ok('試験が理由だと分かる', capped.includes('試験日が近いため'), capped);

  const tight = W.planUnlockNoteHTML({ unlock: { status: 'tight', requiredDays: 20, shortened: true,
    gapDays: 9, effectiveGap: 1, gapCap: 21, unlockKey: '2026-09-16' } });
  ok('きついときは打つ手を書く', tight.includes('締切を延ばす'), tight);
  ok('必要日数を出す', tight.includes('20日'), tight);
})();

// ==================== Phase 6: 2周目以降の範囲 ====================

// ---------- 問題番号の入力（"3,7,12-14"） ----------
(function questionNumberParsing() {
  eq('カンマ区切り', W.parseQuestionNumbers('3,7,9'), [3, 7, 9]);
  eq('範囲を展開する', W.parseQuestionNumbers('12-14'), [12, 13, 14]);
  eq('混在', W.parseQuestionNumbers('3,7,12-14'), [3, 7, 12, 13, 14]);
  eq('空白は無視', W.parseQuestionNumbers(' 3 , 7 , 12 - 14 '), [3, 7, 12, 13, 14]);
  eq('全角のカンマ・数字・ハイフンも読む', W.parseQuestionNumbers('３，７，１２−１４'), [3, 7, 12, 13, 14]);
  eq('読点でも区切る', W.parseQuestionNumbers('3、7'), [3, 7]);
  eq('重複は畳む', W.parseQuestionNumbers('3,3,5,4-6'), [3, 4, 5, 6]);
  eq('昇順に直す', W.parseQuestionNumbers('9,2,5'), [2, 5, 9]);
  eq('逆向きの範囲も読む', W.parseQuestionNumbers('14-12'), [12, 13, 14]);
  eq('空なら空配列', W.parseQuestionNumbers(''), []);
  eq('null でも落ちない', W.parseQuestionNumbers(null), []);
  eq('0 や負数は捨てる', W.parseQuestionNumbers('0,-3,5'), [5]);
  eq('数字でないものは捨てる', W.parseQuestionNumbers('abc,5'), [5]);

  eq('連番はまとめて書き戻す', W.formatQuestionNumbers([3, 7, 12, 13, 14]), '3,7,12-14');
  eq('2連番は範囲にしない', W.formatQuestionNumbers([3, 4]), '3,4');
  eq('3連番から範囲にする', W.formatQuestionNumbers([3, 4, 5]), '3-5');
  eq('空なら空文字', W.formatQuestionNumbers([]), '');
  eq('往復しても変わらない',
     W.formatQuestionNumbers(W.parseQuestionNumbers('3,7,12-14')), '3,7,12-14');
})();

// ---------- 誤答のみモードの既定 ----------
(function wrongOnlyDefault() {
  // PLANNING_CONFIG.scope.wrongOnlyThreshold = 0.80
  eq('正答率が高ければ既定でオン', W.wrongOnlyDefaultFor(0.85), true);
  eq('ちょうど閾値でもオン', W.wrongOnlyDefaultFor(0.80), true);
  eq('低ければオフ（全問やる）', W.wrongOnlyDefaultFor(0.79), false);
  eq('正答率が無ければオフ', W.wrongOnlyDefaultFor(null), false);
})();

// ---------- 次の周にやる範囲と残り時間 ----------
const scope = (o) => W.roundScope(Object.assign({
  total: 200, minPerQuestion: 2, prevRound: 1, p: 0.9, records: [], wrongOnly: true
}, o));

(function scopeFromRecords() {
  // 記録がある場合: 誤答 ∪ 確信度「低」の正答
  const records = [
    { round: 1, question_no: 3,  is_correct: false, confidence: 'high' },
    { round: 1, question_no: 7,  is_correct: false, confidence: 'low'  },
    { round: 1, question_no: 12, is_correct: true,  confidence: 'low'  },   // 正解だが自信なし
    { round: 1, question_no: 20, is_correct: true,  confidence: 'high' },   // 対象外
    { round: 2, question_no: 99, is_correct: false, confidence: 'low'  }    // 別の周は数えない
  ];
  const r = scope({ records });
  eq('記録から出したと分かる', r.mode, 'recorded');
  eq('誤答と自信なしの正答だけ', r.questions, [3, 7, 12]);
  eq('件数', r.count, 3);
  eq('残り時間は件数 × 1問あたり', r.remainMin, 6);
  eq('推定ではない', r.estimated, false);
})();

(function scopeEstimatedWithoutRecords() {
  // 記録が無い場合: 全体 × (1 − p)
  const r = scope({ records: [], p: 0.9 });
  eq('推定だと分かる', r.mode, 'estimated');
  eq('全体 × (1 − p) = 200 × 0.1 = 20', r.count, 20);
  eq('残り時間も推定ぶん', r.remainMin, 40);
  eq('推定フラグ', r.estimated, true);
  eq('番号は出せない', r.questions, null);

  // 正答率が低いほど範囲は広がる
  eq('p=0.5 なら半分', scope({ p: 0.5 }).count, 100);
  eq('p が無ければ全問に倒す', scope({ p: null }).count, 200);
})();

(function scopeFullWhenOff() {
  const r = scope({ wrongOnly: false, records: [{ round: 1, question_no: 3, is_correct: false }] });
  eq('誤答のみがオフなら全問', r.mode, 'full');
  eq('件数は全体', r.count, 200);
  eq('記録があっても絞らない', r.questions, null);
  eq('推定でもない', r.estimated, false);
})();

(function scopeEdges() {
  eq('総数が無ければ0', scope({ total: 0 }).count, 0);
  // 記録が「全問正解・全部自信あり」なら対象0件。推定に逃げない
  const allRight = scope({ records: [{ round: 1, question_no: 1, is_correct: true, confidence: 'high' }] });
  eq('対象0件でも記録は記録', allRight.mode, 'recorded');
  eq('0件', allRight.count, 0);
  eq('確信度が未入力の正答は対象外', scope({
    records: [{ round: 1, question_no: 5, is_correct: true, confidence: null }] }).count, 0);
  eq('確信度が未入力の誤答は対象', scope({
    records: [{ round: 1, question_no: 5, is_correct: false, confidence: null }] }).count, 1);
})();

// ---------- 高確信の誤答の再テスト（持ち越しあり） ----------
const RETEST_MAX = 20;   // PLANNING_CONFIG.scope.retestMaxPerDay

(function retestSchedule() {
  const recs = [
    // 自信があったのに外した → 翌日(9/16)から期日
    { subject_id: '2C', round: 1, question_no: 5, is_correct: false, confidence: 'high', recorded_on: '2026-09-15' },
    // 自信なしの誤答は対象外（2周目の範囲で拾う）
    { subject_id: '2C', round: 1, question_no: 6, is_correct: false, confidence: 'low',  recorded_on: '2026-09-15' },
    // 正解は対象外
    { subject_id: '2C', round: 1, question_no: 7, is_correct: true,  confidence: 'high', recorded_on: '2026-09-15' },
    // 解いた日が無ければ期日を置けない
    { subject_id: '2C', round: 1, question_no: 8, is_correct: false, confidence: 'high', recorded_on: null }
  ];
  eq('解いた当日には出ない', W.dueRetests(recs, '2026-09-15').length, 0);
  const d1 = W.dueRetests(recs, '2026-09-16');
  eq('翌日から出る', d1.length, 1);
  eq('その問題', d1[0].question_no, 5);
  eq('翌日の回', d1[0].stage, 0);
  eq('まだ遅れていない', d1[0].overdueDays, 0);
})();

// ご指定①: 期日を過ぎても消えない
(function retestSurvivesMissedDays() {
  const recs = [{ subject_id: '2C', round: 1, question_no: 5, is_correct: false,
                  confidence: 'high', recorded_on: '2026-09-15' }];
  // 期日は 9/16。放置して 9/25 に開いても残っている
  const late = W.dueRetests(recs, '2026-09-25');
  eq('消えずに残る', late.length, 1);
  eq('何日遅れか分かる', late[0].overdueDays, 9);
  eq('期日そのものは動かない', late[0].dueKey, '2026-09-16');
  // stage を持った記録でも同じ
  const staged = [{ subject_id: '2C', round: 1, question_no: 9, is_correct: false, confidence: 'high',
                    recorded_on: '2026-09-01', retest_stage: 1, retest_due_on: '2026-09-10', retest_log: [] }];
  eq('7日後ぶんも消えない', W.dueRetests(staged, '2026-10-01').length, 1);
  eq('遅れ日数', W.dueRetests(staged, '2026-10-01')[0].overdueDays, 21);
  // 完了したものは出ない
  const done = [{ subject_id: '2C', round: 1, question_no: 9, is_correct: false, confidence: 'high',
                  recorded_on: '2026-09-01', retest_stage: 2, retest_due_on: null, retest_log: [] }];
  eq('完了したものは出ない', W.dueRetests(done, '2026-10-01').length, 0);
})();

// ご指定②: 7日後ぶんの誤答で、もう一度7日後に期日が入る
(function retestWrongRepeatsSevenDays() {
  const rec = { subject_id: '2C', round: 1, question_no: 5, is_correct: false, confidence: 'high',
                recorded_on: '2026-09-15' };
  // 翌日ぶん（stage 0）: 正誤にかかわらず stage 1 へ。実施日の7日後が期日
  const afterD1Wrong = W.applyRetestResult(rec, false, '2026-09-16');
  eq('翌日ぶんは誤答でも次へ進む', afterD1Wrong.retest_stage, 1);
  eq('実施日の7日後', afterD1Wrong.retest_due_on, '2026-09-23');
  const afterD1Right = W.applyRetestResult(rec, true, '2026-09-16');
  eq('正解でも完了にはしない', afterD1Right.retest_stage, 1);
  eq('同じく7日後', afterD1Right.retest_due_on, '2026-09-23');

  // 7日後ぶん（stage 1）: 誤答ならもう一度7日後
  const atStage1 = Object.assign({}, rec, afterD1Wrong);
  const again = W.applyRetestResult(atStage1, false, '2026-09-23');
  eq('誤答なら stage 1 のまま', again.retest_stage, 1);
  eq('さらに7日後に置き直す', again.retest_due_on, '2026-09-30');
  eq('やり直した記録が積まれる', again.retest_log.length, 2);
  eq('最後は誤答', again.retest_log[1].correct, false);

  // 7日後ぶんが正解なら完了
  const cleared = W.applyRetestResult(atStage1, true, '2026-09-23');
  eq('正解で完了', cleared.retest_stage, 2);
  eq('期日は外れる', cleared.retest_due_on, null);

  // 遅れて実施したら、そこから数え直す
  const lateDone = W.applyRetestResult(atStage1, false, '2026-10-05');
  eq('実施日から7日後', lateDone.retest_due_on, '2026-10-12');
})();

// ご指定③: 1日に出す上限が守られる
(function retestRespectsDailyCap() {
  const many = [];
  for (let i = 1; i <= 35; i++) {
    many.push({ subject_id: '2C', round: 1, question_no: i, is_correct: false, confidence: 'high',
                recorded_on: '2026-09-01', retest_stage: 0,
                // 期日をばらけさせる。古いものから出るはず
                retest_due_on: W.shiftDateKey('2026-09-02', i), retest_log: [] });
  }
  const due = W.dueRetests(many, '2026-12-31');
  eq('上限で切る', due.length, RETEST_MAX);
  eq('期日の古い順', due[0].question_no, 1);
  eq('上限ぶんまで', due[RETEST_MAX - 1].question_no, RETEST_MAX);
  ok('溢れたぶんは消えていない（記録は35件のまま）', many.length, 35);
  // 上限以下ならそのまま
  eq('上限以下はそのまま', W.dueRetests(many.slice(0, 5), '2026-12-31').length, 5);
})();

// ---------- 混同の誤答をまとめて交互に ----------
(function confusedInterleaving() {
  const recs = [
    { subject_id: '2C', round: 1, question_no: 1, is_correct: false, error_type: 'confuse' },
    { subject_id: '2C', round: 1, question_no: 2, is_correct: false, error_type: 'confuse' },
    { subject_id: '2C', round: 1, question_no: 3, is_correct: false, error_type: 'confuse' },
    { subject_id: '2C', round: 1, question_no: 4, is_correct: false, error_type: 'confuse' },
    { subject_id: '2C', round: 1, question_no: 9, is_correct: false, error_type: 'unknown' },  // 混同ではない
    { subject_id: '2J', round: 1, question_no: 7, is_correct: false, error_type: 'confuse' },
    { subject_id: '2C', round: 2, question_no: 50, is_correct: false, error_type: 'confuse' }  // 別の周
  ];
  const g = W.interleaveConfused(recs, 1);
  eq('科目ごとにまとまる', Object.keys(g).sort(), ['2C', '2J']);
  // [1,2,3,4] → 前半[1,2] 後半[3,4] を交互 → [1,3,2,4]
  eq('本の並びのまま続けない', g['2C'], [1, 3, 2, 4]);
  eq('混同以外は入らない', g['2C'].includes(9), false);
  eq('別の周は入らない', g['2C'].includes(50), false);
  eq('1件だけならそのまま', g['2J'], [7]);

  eq('周を指定しなければ全周から集める',
     W.interleaveConfused(recs)['2C'].length, 5);
  eq('何度呼んでも同じ並び', JSON.stringify(W.interleaveConfused(recs, 1)), JSON.stringify(g));
  eq('空でも落ちない', W.interleaveConfused(null, 1), {});
})();

// ---------- 誤答のみモードのオンオフ ----------
(function wrongOnlyToggle() {
  const rounds = { '1': { total: 100, done: 100, correct: 90 }, '2': { total: 100, done: 0, correct: 0 } };
  eq('未設定なら正答率から決まる（0.9 → オン）', W.roundWrongOnly(rounds, 2, 0.9), true);
  eq('未設定で正答率が低ければオフ', W.roundWrongOnly(rounds, 2, 0.6), false);

  const on = W.setRoundWrongOnly({ '2Q': rounds }, '2Q', 2, false);
  eq('手で切ったらその値を覚える', W.roundWrongOnly(on['2Q'], 2, 0.9), false);
  eq('進捗そのものは壊さない', on['2Q']['1'].correct, 90);

  const back = W.setRoundWrongOnly(on, '2Q', 2, true);
  eq('戻せる', W.roundWrongOnly(back['2Q'], 2, 0.1), true);

  const fresh = W.setRoundWrongOnly({}, '2J', 3, true);
  eq('無い周にも置ける', fresh['2J']['3'].wrong_only, true);
  eq('進捗の枠も用意される', fresh['2J']['3'].done, 0);

  // 元のオブジェクトを書き換えない（保存前の状態と比べられなくなるため）
  const src = { '2Q': { '1': { total: 10, done: 10, correct: 9 } } };
  W.setRoundWrongOnly(src, '2Q', 1, true);
  eq('元は変えない', src['2Q']['1'].wrong_only, undefined);
})();

// ---------- 絞り込んだ範囲が予定の量に効くこと ----------
(function scopeReachesTheSchedule() {
  const mkState = (id, sid, round, vol) => ({
    plan: plan({ id, subject_id: sid, unit: 'q', target_round: round, total_volume: vol,
                 start_date: '2026-09-01', due_date: '2026-12-31' }),
    mine: round === 1
      ? [{ id: id + '-t', due_date: '2026-09-06', target_amount: vol, done_amount: vol, completed: true }]
      : [],
    canAuto: round !== 1
  });
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 600;

  // 1周目を 200問中 190問正解（95%）→ 誤答のみが既定でオン
  const qb = { '2Q': { '1': { total: 200, done: 200, correct: 190 } } };
  const est = W.buildPlanSequence(
    [mkState('s1', '2Q', 1, 200), mkState('s2', '2Q', 2, 200)],
    '2026-09-06', { hasQuestion: true, minPerQuestion: 2 }, null, 0, { qb, records: [] });
  const sc = est.byPlan['s2'].scope;
  eq('記録が無いので推定', sc.mode, 'estimated');
  eq('推定フラグ', sc.estimated, true);
  ok('200問まるごとではない', sc.count < 200, sc.count);
  const placed = est.byPlan['s2'].items.reduce((a, i) => a + i.targetAmount, 0);
  eq('予定に置かれた量も絞られたぶん', placed, sc.count);

  // 記録を入れると、その件数そのものになる
  const records = [
    { subject_id: '2Q', round: 1, question_no: 3,  is_correct: false, confidence: 'high' },
    { subject_id: '2Q', round: 1, question_no: 7,  is_correct: false, confidence: 'low'  },
    { subject_id: '2Q', round: 1, question_no: 12, is_correct: true,  confidence: 'low'  },
    { subject_id: '2Q', round: 1, question_no: 40, is_correct: true,  confidence: 'high' }
  ];
  const rec = W.buildPlanSequence(
    [mkState('r1', '2Q', 1, 200), mkState('r2', '2Q', 2, 200)],
    '2026-09-06', { hasQuestion: true, minPerQuestion: 2 }, null, 0, { qb, records });
  const rs = rec.byPlan['r2'].scope;
  eq('記録から出した', rs.mode, 'recorded');
  eq('推定ではない', rs.estimated, false);
  eq('誤答2問 + 自信なしの正答1問', rs.count, 3);
  eq('番号も持つ', rs.questions, [3, 7, 12]);
  eq('予定の量もその3問', rec.byPlan['r2'].items.reduce((a, i) => a + i.targetAmount, 0), 3);

  // 正答率が低い教材は絞らない（全問やる）
  const weakQb = { '2J': { '1': { total: 200, done: 200, correct: 100 } } };
  const weak = W.buildPlanSequence(
    [mkState('w1', '2J', 1, 200), mkState('w2', '2J', 2, 200)],
    '2026-09-06', { hasQuestion: true, minPerQuestion: 2 }, null, 0, { qb: weakQb, records: [] });
  eq('誤答のみはオフなので範囲は出ない', weak.byPlan['w2'].scope, null);
  eq('全問ぶん置かれる', weak.byPlan['w2'].items.reduce((a, i) => a + i.targetAmount, 0), 200);

  // 1周目は絞らない（絞る根拠になる前の周が無い）
  eq('1周目に範囲は出ない', est.byPlan['s1'], undefined);
  W.planGoalMinutesOf = goalWas;
})();

// 全問正解でもプランが消えないこと（推定は0問に丸めない）
(function perfectRoundStillLeavesSomething() {
  const r = W.roundScope({ total: 30, minPerQuestion: 2, prevRound: 1, p: 1.0, records: [], wrongOnly: true });
  eq('0問にはしない', r.count, 1);
  eq('推定だと分かる', r.estimated, true);
})();

// ---------- 範囲の説明（推定だと分かること） ----------
(function scopeNote() {
  const p2 = plan({ id: 'z', unit: 'q', target_round: 2, subject_id: '2Q' });
  eq('全問なら何も出さない', W.planScopeNoteHTML(p2, { scope: { mode: 'full' } }), '');
  eq('範囲が無ければ何も出さない', W.planScopeNoteHTML(p2, {}), '');

  const rec = W.planScopeNoteHTML(p2, { scope: { mode: 'recorded', count: 3, estimated: false } });
  ok('件数を出す', rec.includes('誤答のみ 3問'), rec);
  ok('推定とは言わない', !rec.includes('推定'), rec);
  ok('全問に戻せる', rec.includes('data-scope-off'), rec);

  const est = W.planScopeNoteHTML(p2, { scope: { mode: 'estimated', count: 20, estimated: true } });
  ok('推定だと分かる', est.includes('推定'), est);
  ok('およその件数', est.includes('約20問'), est);
  ok('どうすれば実測になるか書く', est.includes('誤答の番号を入れる'), est);
})();

// ---------- 再テストの表示 ----------
(function retestBlock() {
  const was = W.window ? null : null;
  eq('対象が無ければ何も出さない', W.retestBlockHTML('2026-09-10'), '');
})();

// ==================== Phase 3: 1分あたりの期待上乗せ ====================
//   priority = W × G × L / C
//   R_pred = p × decay(t)、decay(t) = (1 + t/(9S))^-1、S = 10日
//   G = max(0, R* − R_pred)、R* = 0.90
//   L = 4p(1−p) + ε、ε = clamp(試験までの日数/60, 0.1, 0.5)、試験日なしは 0.3
//   C = 1問あたりの分

(function decayAndGain() {
  ok('t=0 なら減衰しない', Math.abs(W.recallDecay(0) - 1) < 1e-9);
  // decay(90) = (1 + 90/90)^-1 = 0.5
  ok('S=10 なら90日で半分', Math.abs(W.recallDecay(90) - 0.5) < 1e-9, W.recallDecay(90));
  ok('先になるほど小さい', W.recallDecay(180) < W.recallDecay(90));
  ok('負の日数は0扱い', Math.abs(W.recallDecay(-5) - 1) < 1e-9);
})();

(function learnabilityEpsilon() {
  eq('試験日が無ければ 0.3', W.learnabilityEpsilon(null), 0.3);
  // 120日先 → 120/60 = 2 → 上限0.5
  eq('遠い試験は上限0.5', W.learnabilityEpsilon(120), 0.5);
  // 12日先 → 0.2
  ok('近づくと小さくなる', Math.abs(W.learnabilityEpsilon(12) - 0.2) < 1e-9, W.learnabilityEpsilon(12));
  eq('目前なら下限0.1', W.learnabilityEpsilon(0), 0.1);

  // L = 4p(1−p) + ε。中間帯がいちばん高い
  const L = (p, days) => W.learnability(p, days);
  ok('p=0.5 が最大', L(0.5, null) > L(0.2, null) && L(0.5, null) > L(0.9, null));
  ok('p=0.5 なら 4×0.25+0.3 = 1.3', Math.abs(L(0.5, null) - 1.3) < 1e-9, L(0.5, null));
  ok('p=1.0 なら ε だけ', Math.abs(L(1, null) - 0.3) < 1e-9, L(1, null));
  ok('端でも0にはならない', L(0, null) > 0 && L(1, null) > 0);
})();

// ---------- スコア本体 ----------
const PRIO = { minPerQuestion: 3, hasQuestion: true, minPerVideo: 40, hasVideo: true,
               video: { kokushi: { minPerVideo: 40, has: true }, cbt: { minPerVideo: 7, has: true } } };
const prio3 = (o) => W.buildSubjectPriority(Object.assign({ unitCost: PRIO, todayKey: '2026-09-15' }, o));

(function weakSubjectOutranksStrongOne() {
  // 2Q: 1周目 200問中120問正解（60%）／ 2J: 200問中180問正解（90%）
  const qb = { '2Q': { '1': { total: 200, done: 200, correct: 120 } },
               '2J': { '1': { total: 200, done: 200, correct: 180 } } };
  const r = prio3({ qb, lastTouched: { '2Q': '2026-09-15', '2J': '2026-09-15' },
                    targetRoundBy: { '2q': 2, '2j': 2 } });
  ok('出来が悪い科目が上', r.bySubject['2Q'].score > r.bySubject['2J'].score,
     { '2Q': r.bySubject['2Q'].score, '2J': r.bySubject['2J'].score });
  eq('順位でも先頭', r.ranked[0].id, '2Q');
})();

(function volumeDoesNotBuyRank() {
  // 2J の残りを大きくしても 2Q を抜かない（量はスコアに掛けない）
  const qb = { '2Q': { '1': { total: 200, done: 200, correct: 120 } },
               '2J': { '1': { total: 5000, done: 5000, correct: 4500 } } };
  const r = prio3({ qb, lastTouched: { '2Q': '2026-09-15', '2J': '2026-09-15' },
                    targetRoundBy: { '2q': 2, '2j': 2 } });
  ok('2J の残り時間のほうが桁違いに大きい',
     r.bySubject['2J'].remainMin > r.bySubject['2Q'].remainMin * 10,
     { '2J': r.bySubject['2J'].remainMin, '2Q': r.bySubject['2Q'].remainMin });
  ok('それでも順位は変わらない', r.bySubject['2Q'].score > r.bySubject['2J'].score,
     { '2Q': r.bySubject['2Q'].score, '2J': r.bySubject['2J'].score });
})();

(function worksWithDefaultsOnly() {
  // W・C・試験日がどれも無くても計算できる
  const r = W.buildSubjectPriority({ qb: { '2Q': { '1': { total: 100, done: 100, correct: 60 } } },
                                     todayKey: '2026-09-15', targetRoundBy: { '2q': 2 } });
  const row = r.bySubject['2Q'];
  ok('スコアが出る', Number.isFinite(row.score) && row.score > 0, row.score);
  eq('出題重みは既定の中立', Math.round(row.examWeight * 1000) / 1000 > 0, true);
  ok('1問あたりの分は仮の単価に落ちる', row.minPerQuestion > 0, row.minPerQuestion);
  eq('試験日が無ければ ε は 0.3', Math.round(row.epsilon * 100) / 100, 0.3);
  eq('試験日が無ければ減衰しない', row.decay, 1);
})();

(function unknownAccuracyUsesNeutral() {
  // 正答数が未入力 → p は p0（データが無ければ 0.5）で計算し、印を残す
  const r = prio3({ qb: { '2Q': { '1': { total: 100, done: 50 } } } });
  const row = r.bySubject['2Q'];
  eq('正答率未入力の印', row.hasAccuracy, false);
  eq('中立値で計算する', row.p, 0.5);
  ok('スコアは出る', row.score > 0, row.score);
  // p=0.5 → G = 0.9 - 0.5 = 0.4、L = 1.3
  ok('G は R* − 0.5', Math.abs(row.gain - 0.4) < 1e-9, row.gain);
})();

(function targetRoundStillZeroesFinished() {
  // 目標周回まで終わっている科目は残りが0 → スコア0（従来どおり）
  const qb = { '2Q': { '1': { total: 100, done: 100, correct: 60 } } };
  const r = prio3({ qb, targetRoundBy: { '2q': 1 } });
  eq('残り時間0', r.bySubject['2Q'].remainMin, 0);
  eq('スコアも0', r.bySubject['2Q'].score, 0);
})();

(function examDatePullsScoreDown() {
  // 試験が遠いほど、試験日時点の想起率が下がる → 伸びしろ G が大きい
  const qb = { '2Q': { '1': { total: 100, done: 100, correct: 80 } } };
  const near = prio3({ qb, targetRoundBy: { '2q': 2 }, examKey: '2026-09-20' });
  const far  = prio3({ qb, targetRoundBy: { '2q': 2 }, examKey: '2027-03-15' });
  ok('遠い試験のほうが減衰する', far.bySubject['2Q'].decay < near.bySubject['2Q'].decay,
     { near: near.bySubject['2Q'].decay, far: far.bySubject['2Q'].decay });
  ok('伸びしろも大きい', far.bySubject['2Q'].gain > near.bySubject['2Q'].gain);
})();

(function costDividesScore() {
  // 1問に時間がかかる科目ほど、1分あたりの効きは小さい
  const qb = { '2Q': { '1': { total: 100, done: 100, correct: 60 } } };
  const cheap = W.buildSubjectPriority({ qb, todayKey: '2026-09-15', targetRoundBy: { '2q': 2 },
    unitCost: { hasQuestion: true, minPerQuestion: 1 } });
  const dear = W.buildSubjectPriority({ qb, todayKey: '2026-09-15', targetRoundBy: { '2q': 2 },
    unitCost: { hasQuestion: true, minPerQuestion: 6 } });
  ok('1問6分の科目はスコアが下がる', dear.bySubject['2Q'].score < cheap.bySubject['2Q'].score,
     { cheap: cheap.bySubject['2Q'].score, dear: dear.bySubject['2Q'].score });
  ok('おおむね反比例', Math.abs(cheap.bySubject['2Q'].score / dear.bySubject['2Q'].score - 6) < 0.01);
})();

// ---------- 試験日の取り出し ----------
(function nextExam() {
  const cds = [{ exam_date: '2026-08-01' }, { exam_date: '2026-11-20' }, { exam_date: '2027-02-01' }];
  eq('いちばん近い先の試験', W.nextExamKey(cds, '2026-09-15'), '2026-11-20');
  eq('過ぎた試験は見ない', W.nextExamKey([{ exam_date: '2026-01-01' }], '2026-09-15'), null);
  eq('登録が無ければ null', W.nextExamKey([], '2026-09-15'), null);
  eq('存在しない日を作らない', W.nextExamKey(null, '2026-09-15'), null);
})();

// ---------- 締切優先枠と、同点時のタイブレーク ----------
(function deadlineLaneAndTiebreak() {
  const mk = (id, sid, due) => plan({ id, subject_id: sid, unit: 'q', due_date: due });
  // スコアでは 2J が上でも、締切に余裕の無い 2C が先に出る
  const scoreOf = sid => (String(sid).toUpperCase() === '2J' ? 100 : 1);
  const ordered = W.planPriorityOrder(
    [mk('j', '2J', '2026-12-31'), mk('c', '2C', '2026-09-20')],
    { scoreOf, todayKey: '2026-09-15', deadlineFirst: new Set(['2c']) });
  eq('締切優先枠がスコアを上回る', ordered.map(p => p.id), ['c', 'j']);

  // 枠に入っていなければスコア順
  const normal = W.planPriorityOrder(
    [mk('j', '2J', '2026-12-31'), mk('c', '2C', '2026-09-20')],
    { scoreOf, todayKey: '2026-09-15', deadlineFirst: new Set() });
  eq('枠が空ならスコア順', normal.map(p => p.id), ['j', 'c']);

  // スコアも締切も同じなら、残り時間が多いほうが先
  const flat = sid => 1;
  const tie = W.planPriorityOrder(
    [mk('small', '2J', '2026-10-01'), mk('big', '2C', '2026-10-01')],
    { scoreOf: flat, todayKey: '2026-09-15', deadlineFirst: new Set(),
      remainMinOf: g => (g === '2c' ? 900 : 100) });
  eq('同点なら残りが多いほうが先', tie.map(p => p.id), ['big', 'small']);

  // 締切のほうが残り時間より優先
  const dueFirst = W.planPriorityOrder(
    [mk('later', '2C', '2026-12-01'), mk('sooner', '2J', '2026-10-01')],
    { scoreOf: flat, todayKey: '2026-09-15', deadlineFirst: new Set(),
      remainMinOf: g => (g === '2c' ? 9000 : 10) });
  eq('残りが多くても締切が近いほうが先', dueFirst.map(p => p.id), ['sooner', 'later']);
})();

// 締切優先枠が順番詰めまで通ること
(function deadlineLaneReachesTheSchedule() {
  const st = (id, sid, vol, due) => ({
    plan: plan({ id, subject_id: sid, unit: 'q', target_round: 1, total_volume: vol,
                 start_date: '2026-09-01', due_date: due }),
    mine: [], canAuto: true
  });
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 120;   // 1日120分 = 60問
  // 2C: 100問(200分)、締切まで3日 → 要2日、余裕 3-2=1 ≦ bufferDays(1) → 優先枠
  // 2J: 100問、締切は遠い
  const res = W.buildPlanSequence(
    [st('c', '2C', 100, '2026-09-18'), st('j', '2J', 100, '2026-12-31')],
    '2026-09-15', { hasQuestion: true, minPerQuestion: 2 },
    { bySubject: { '2C': { score: 1 }, '2J': { score: 100 } } }, 0, { bufferDays: 1 });
  eq('締切の近い科目が先に置かれる', res.order[0], 'c');
  ok('初日から進む', res.byPlan['c'].items[0].dateKey === '2026-09-15', res.byPlan['c'].items);
  W.planGoalMinutesOf = goalWas;
})();

// ==================== Phase 4: 後の時点で測った間隔の効き ====================
(function laterGainUsesRoundKPlus2() {
  // 2C: 1周目60% → 2周目(9日後) → 3周目85%。伸びは 85 − 60 = +25pt
  const qb = { '2C': {
    '1': { total: 100, done: 100, correct: 60, completed_at: '2026-06-01' },
    '2': { total: 100, done: 100, correct: 80, completed_at: '2026-06-10' },
    '3': { total: 100, done: 100, correct: 85 }
  } };
  const r = W.buildLaterRoundGain(qb, null, []);
  eq('1件取れる', r.rows.length, 1);
  const row = r.rows[0];
  eq('間隔は完了日の差', row.gap, 9);
  eq('実測の間隔だと分かる', row.gapExact, true);
  eq('起点は周回 k の正答率', row.accFrom, 60);
  eq('後の時点は周回 k+2', row.later, 85);
  eq('伸びは後の時点 − k', row.gain, 25);
  eq('出どころ', row.source, 'round');
  eq('重みは k+2 の解答数', row.weight, 100);
  // 2周目の最中の正答率(80%)ではなく3周目(85%)で測っている
  ok('直後の正答率では測らない', row.later !== 80);
})();

(function laterGainFallsBackToMock() {
  // 3周目が無い場合、2周目を終えたあとの模試を使う
  const qb = { '2C': {
    '1': { total: 100, done: 100, correct: 60, completed_at: '2026-06-01' },
    '2': { total: 100, done: 100, correct: 80, completed_at: '2026-06-10' }
  } };
  const mocks = [
    { subject_id: '2C', taken_on: '2026-05-01', correct_questions: 10, total_questions: 50 },  // 前なので無視
    { subject_id: '2C', taken_on: '2026-06-20', correct_questions: 36, total_questions: 40 },  // 90%
    { subject_id: '2C', taken_on: '2026-07-20', correct_questions: 20, total_questions: 40 }   // 後ろすぎ
  ];
  const r = W.buildLaterRoundGain(qb, null, mocks);
  eq('1件', r.rows.length, 1);
  eq('完了後の最初の模試を使う', r.rows[0].later, 90);
  eq('出どころは模試', r.rows[0].source, 'mock');
  eq('重みは模試の問題数', r.rows[0].weight, 40);
  eq('伸びは 90 − 60', r.rows[0].gain, 30);

  // 模試も3周目も無ければサンプルにしない
  eq('後の時点が無ければ使わない', W.buildLaterRoundGain(qb, null, []).rows.length, 0);
  eq('データ無し', W.buildLaterRoundGain(qb, null, []).hasData, false);
})();

(function laterGainApproximatesGapWithoutDates() {
  // 完了日が無い古いデータは、触った日の間隔の中央値で代用する
  const qb = { '2C': {
    '1': { total: 100, done: 100, correct: 60 },
    '2': { total: 100, done: 100, correct: 80 },
    '3': { total: 100, done: 100, correct: 85 }
  } };
  const reviewStats = { visits: [
    { subject: '2C 循環器', gapDays: null }, { subject: '2C 循環器', gapDays: 5 },
    { subject: '2C 循環器', gapDays: 5 },    { subject: '2C 循環器', gapDays: 11 }
  ] };
  const r = W.buildLaterRoundGain(qb, reviewStats, []);
  eq('中央値で代用', r.rows[0].gap, 5);
  eq('近似だと分かる', r.rows[0].gapExact, false);
  eq('実測の件数は0', r.exactCount, 0);
})();

(function binShrinkage() {
  // ビンの値 = (n·ビン平均 + k·全ビン平均) / (n + k)、k = 5
  // 〜3日 に1件 +40pt(重み10)、8〜14日 に3件 +10pt(重み計300)
  const qb = {
    'A1': { '1': { total: 10, done: 10, correct: 5, completed_at: '2026-06-01' },
            '2': { total: 10, done: 10, correct: 5, completed_at: '2026-06-02' },
            '3': { total: 10, done: 10, correct: 9 } },
    'A2': { '1': { total: 100, done: 100, correct: 50, completed_at: '2026-06-01' },
            '2': { total: 100, done: 100, correct: 50, completed_at: '2026-06-11' },
            '3': { total: 100, done: 100, correct: 60 } },
    'A3': { '1': { total: 100, done: 100, correct: 50, completed_at: '2026-06-01' },
            '2': { total: 100, done: 100, correct: 50, completed_at: '2026-06-12' },
            '3': { total: 100, done: 100, correct: 60 } },
    'A4': { '1': { total: 100, done: 100, correct: 50, completed_at: '2026-06-01' },
            '2': { total: 100, done: 100, correct: 50, completed_at: '2026-06-13' },
            '3': { total: 100, done: 100, correct: 60 } }
  };
  const r = W.buildLaterRoundGain(qb, null, []);
  const short = r.bins.find(b => b.days === 2);
  const long = r.bins.find(b => b.days === 11);
  eq('短いビンは1件', short.count, 1);
  eq('長いビンは3件', long.count, 3);
  eq('短いビンの素の平均', short.avgGain, 40);
  eq('長いビンの素の平均', long.avgGain, 10);
  ok('縮小で短いビンは全体平均へ引き寄せられる', short.shrunkGain < short.avgGain, short.shrunkGain);
  ok('サンプルの多い長いビンはあまり動かない',
     Math.abs(long.shrunkGain - long.avgGain) < Math.abs(short.shrunkGain - short.avgGain),
     { short: short.shrunkGain, long: long.shrunkGain });

  // 1件のビンはそもそも候補にならない（2科目以上）ので、選ばれるのは長いほう
  eq('サンプルの少ない極端な値で選ばない', W.roundGapBaseDays(r), 11);
})();

(function laterGainWeightsByQuestionCount() {
  // 20問の+30pt と 200問の+5pt。問題数で重みづけするので、平均は5pt寄りになる
  const qb = {
    'B1': { '1': { total: 20, done: 20, correct: 10, completed_at: '2026-06-01' },
            '2': { total: 20, done: 20, correct: 10, completed_at: '2026-06-06' },
            '3': { total: 20, done: 20, correct: 16 } },
    'B2': { '1': { total: 200, done: 200, correct: 100, completed_at: '2026-06-01' },
            '2': { total: 200, done: 200, correct: 100, completed_at: '2026-06-06' },
            '3': { total: 200, done: 200, correct: 110 } }
  };
  const r = W.buildLaterRoundGain(qb, null, []);
  const bin = r.bins.find(b => b.days === 6);
  eq('2件とも同じビン', bin.count, 2);
  // 単純平均なら (30+5)/2 = 17.5、重みづけなら (20×30 + 200×5)/220 = 7.27
  ok('小さいサンプルに引っぱられない', bin.avgGain < 10, bin.avgGain);
})();

// ---------- 2周目の対象番号の並び ----------
(function scopeOrderInterleavesConfused() {
  const rec = (no, type) => ({ subject_id: '2C', round: 1, question_no: no, is_correct: false, error_type: type });
  // 混同4問 + それ以外4問
  const records = [rec(1,'confuse'), rec(2,'confuse'), rec(3,'confuse'), rec(4,'confuse'),
                   rec(10,'unknown'), rec(11,'unknown'), rec(12,'misread'), rec(13,null)];
  const nums = [1,2,3,4,10,11,12,13];
  const r = W.orderScopeQuestions(nums, records, 1, '2026-09-15');
  eq('並べ替えた印', r.interleaved, true);
  eq('混同の件数', r.confusedCount, 4);
  eq('問題は落ちも増えもしない', r.order.slice().sort((a,b)=>a-b), nums);

  // 混同どうしが隣り合わない
  const isConf = n => n <= 4;
  let adjacent = 0;
  for (let i = 1; i < r.order.length; i++) if (isConf(r.order[i]) && isConf(r.order[i-1])) adjacent++;
  eq('混同が連続しない', adjacent, 0);

  // 混同でない問題は番号順のまま
  eq('混同以外は番号順', r.order.filter(n => !isConf(n)), [10, 11, 12, 13]);

  // 同じ日なら何度呼んでも同じ
  eq('同じ日は同じ並び',
     JSON.stringify(W.orderScopeQuestions(nums, records, 1, '2026-09-15').order), JSON.stringify(r.order));
  // 日が変わると先頭が変わる
  const other = W.orderScopeQuestions(nums, records, 1, '2026-09-16');
  ok('日が変わると並びが変わる', JSON.stringify(other.order) !== JSON.stringify(r.order),
     { '9/15': r.order, '9/16': other.order });
})();

(function scopeOrderKeepsNumberOrderWhenFew() {
  const rec = (no, type) => ({ subject_id: '2C', round: 1, question_no: no, is_correct: false, error_type: type });
  // 混同が2問しかない → 並べ替えない
  const records = [rec(5,'confuse'), rec(9,'confuse'), rec(1,'unknown'), rec(3,'misread')];
  const r = W.orderScopeQuestions([9,5,3,1], records, 1, '2026-09-15');
  eq('並べ替えない', r.interleaved, false);
  eq('番号順のまま', r.order, [1, 3, 5, 9]);
  eq('混同の件数は数える', r.confusedCount, 2);

  // 混同が無い場合も番号順
  eq('混同なしも番号順',
     W.orderScopeQuestions([7,2,5], [rec(7,'unknown')], 1, '2026-09-15').order, [2, 5, 7]);
  // 別の周の混同は数えない
  const otherRound = [{ subject_id:'2C', round: 2, question_no: 1, is_correct:false, error_type:'confuse' },
                      { subject_id:'2C', round: 2, question_no: 2, is_correct:false, error_type:'confuse' },
                      { subject_id:'2C', round: 2, question_no: 3, is_correct:false, error_type:'confuse' }];
  eq('別の周の混同は効かない', W.orderScopeQuestions([1,2,3], otherRound, 1, '2026-09-15').interleaved, false);
  eq('空でも落ちない', W.orderScopeQuestions(null, null, 1, '2026-09-15').order, []);
})();

// 並び順がプランの表示まで通ること
(function scopeOrderReachesTheCard() {
  const p2 = plan({ id: 'z', unit: 'q', target_round: 2, subject_id: '2C' });
  const withOrder = W.planScopeNoteHTML(p2, { scope: {
    mode: 'recorded', count: 8, estimated: false, questions: [1,2,3,4,10,11,12,13],
    order: { order: [1,3,10,2,4,11,12,13], interleaved: true, confusedCount: 4 } } });
  ok('並べ替えの断り書きを出す', withOrder.includes('混同しやすい問題を交互に並べています'), withOrder);
  ok('番号を出す', withOrder.includes('>1<') && withOrder.includes('>13<'), withOrder);

  const plain = W.planScopeNoteHTML(p2, { scope: {
    mode: 'recorded', count: 3, estimated: false, questions: [3,7,12],
    order: { order: [3,7,12], interleaved: false, confusedCount: 1 } } });
  ok('並べ替えていなければ断り書きは出さない', !plain.includes('交互に並べています'), plain);
  ok('番号は出す', plain.includes('>3<'), plain);

  // 推定モードには番号が無い
  const est = W.planScopeNoteHTML(p2, { scope: { mode: 'estimated', count: 20, estimated: true } });
  ok('推定に番号リストは出さない', !est.includes('plan-scope-order"'), est);
})();

// buildPlanSequence から並び順まで通ること
(function scopeOrderFlowsFromSequence() {
  const mkState = (id, round) => ({
    plan: plan({ id, subject_id: '2C', unit: 'q', target_round: round, total_volume: 200,
                 start_date: '2026-09-01', due_date: '2026-12-31' }),
    mine: round === 1 ? [{ id: id + 't', due_date: '2026-09-06', target_amount: 200, done_amount: 200, completed: true }] : [],
    canAuto: round !== 1
  });
  const qb = { '2C': { '1': { total: 200, done: 200, correct: 190 } } };
  const rec = (no, type) => ({ subject_id: '2C', round: 1, question_no: no, is_correct: false, error_type: type });
  const records = [rec(1,'confuse'), rec(2,'confuse'), rec(3,'confuse'),
                   rec(20,'unknown'), rec(21,'misread'), rec(22,'unknown')];
  const goalWas = W.planGoalMinutesOf;
  W.planGoalMinutesOf = () => 600;
  const res = W.buildPlanSequence([mkState('a', 1), mkState('b', 2)], '2026-09-06',
    { hasQuestion: true, minPerQuestion: 2 }, null, 0, { qb, records });
  W.planGoalMinutesOf = goalWas;
  const sc = res.byPlan['b'].scope;
  eq('記録から出した', sc.mode, 'recorded');
  eq('並び順も持つ', !!sc.order, true);
  eq('混同3問なので並べ替える', sc.order.interleaved, true);
  eq('対象は6問', sc.order.order.slice().sort((a,b)=>a-b), [1,2,3,20,21,22]);
  let adj = 0;
  for (let i = 1; i < sc.order.order.length; i++) {
    if (sc.order.order[i] <= 3 && sc.order.order[i-1] <= 3) adj++;
  }
  eq('混同が連続しない', adj, 0);
})();

console.log();
if (failures.length) {
  console.log('--- 失敗 ---');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
