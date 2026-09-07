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
  eq('教材量の割合も出る',
     size.ranked.map(r => Math.round(r.materialPct)), [89, 11]);

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

console.log();
if (failures.length) {
  console.log('--- 失敗 ---');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
