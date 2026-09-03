// カレンダー & 逆算プランの純関数テスト。
//   node test_planning.cjs
// app.js を jsdom 上で eval して window に生えた関数を直接叩く
// （test_render_insights.cjs と同じ方式。app.js に import 文を足すとここが壊れる）。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="page-container"></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost' }
);
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
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

// ---------- 日付キー ----------
eq('parseDateKey: ローカル0時になる（UTCずれ無し）',
  (() => { const d = W.parseDateKey('2026-09-14'); return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]; })(),
  [2026, 8, 14, 0]);
eq('parseDateKey: タイムスタンプ付きも先頭10文字で解釈', W.toLocalDateKey(W.parseDateKey('2026-09-14T22:00:00+09:00')), '2026-09-14');
eq('parseDateKey: 不正な入力は null', [W.parseDateKey(''), W.parseDateKey('2026/09/14'), W.parseDateKey(null)], [null, null, null]);
eq('shiftDateKey: 月をまたぐ', W.shiftDateKey('2026-09-30', 1), '2026-10-01');
eq('shiftDateKey: 年をまたいで戻る', W.shiftDateKey('2026-01-01', -1), '2025-12-31');
eq('diffDateKeys: 差は日数', W.diffDateKeys('2026-09-14', '2026-09-01'), 13);
eq('diffDateKeys: 逆向きは負', W.diffDateKeys('2026-09-01', '2026-09-14'), -13);

// ---------- planWorkingDays ----------
eq('planWorkingDays: 除外なしは全日', W.planWorkingDays('2026-09-01', '2026-09-07', []).length, 7);
eq('planWorkingDays: 単日', W.planWorkingDays('2026-09-14', '2026-09-14', []), ['2026-09-14']);
// 2026-09-01 は火曜。1週間から土(6)日(0)を抜くと5日
eq('planWorkingDays: 土日を除外', W.planWorkingDays('2026-09-01', '2026-09-07', [0, 6]).length, 5);
ok('planWorkingDays: 除外した曜日が残っていない',
  W.planWorkingDays('2026-09-01', '2026-09-30', [0, 6]).every(k => ![0, 6].includes(W.parseDateKey(k).getDay())));
eq('planWorkingDays: 全曜日除外は空', W.planWorkingDays('2026-09-01', '2026-09-30', [0,1,2,3,4,5,6]), []);
eq('planWorkingDays: 開始 > 終了 は空', W.planWorkingDays('2026-09-30', '2026-09-01', []), []);

// ---------- distributeVolume ----------
ok('distributeVolume: 合計が総量に一致する（端数あり）',
  W.distributeVolume(100, 30).reduce((a, b) => a + b, 0) === 100);
eq('distributeVolume: 割り切れる', W.distributeVolume(30, 3), [10, 10, 10]);
eq('distributeVolume: 日数0は空', W.distributeVolume(50, 0), []);
eq('distributeVolume: 総量0は全て0', W.distributeVolume(0, 3), [0, 0, 0]);
(() => {
  // 総量 < 日数 のとき、先頭に固めず期間全体へ散る
  const a = W.distributeVolume(10, 30);
  eq('distributeVolume: 総量<日数でも合計一致', a.reduce((x, y) => x + y, 0), 10);
  eq('distributeVolume: 総量<日数の長さ', a.length, 30);
  ok('distributeVolume: 総量<日数で後半にも配分がある', a.slice(20).some(v => v > 0), a);
  ok('distributeVolume: 1日あたり0か1に収まる', a.every(v => v === 0 || v === 1), a);
})();
ok('distributeVolume: 大きい端数でも合計一致',
  [7, 13, 101, 999, 1234].every(t => W.distributeVolume(t, 31).reduce((a, b) => a + b, 0) === t));

// ---------- buildMilestones ----------
(() => {
  const days = W.planWorkingDays('2026-09-01', '2026-09-30', []);
  const ms = W.buildMilestones(days, 4);
  eq('buildMilestones: 4分割', ms.length, 4);
  eq('buildMilestones: 最後は最終日', ms[ms.length - 1].dateKey, '2026-09-30');
  eq('buildMilestones: 割合', ms.map(m => m.pct), [25, 50, 75, 100]);
  eq('buildMilestones: 稼働日0なら空', W.buildMilestones([], 4), []);
  // 稼働日2日に4分割 → 同じ日に重ならないよう間引かれる
  eq('buildMilestones: 期間が短いと間引く', W.buildMilestones(['2026-09-01', '2026-09-02'], 4).length, 2);
})();

// ---------- buildPlanSchedule ----------
const TODAY = '2026-09-14';
(() => {
  const s = W.buildPlanSchedule({
    title: '循環器 QB 2周目', startDate: '2026-09-14', dueDate: '2026-09-30',
    totalVolume: 340, unit: 'q', excludeWeekdays: [], todayKey: TODAY
  });
  ok('buildPlanSchedule/quota: ok', s.ok, s.error);
  eq('buildPlanSchedule/quota: モード', s.mode, 'quota');
  eq('buildPlanSchedule/quota: 稼働日数', s.workingDayCount, 17);
  eq('buildPlanSchedule/quota: 割り振り合計が総量に一致',
    s.items.reduce((a, i) => a + i.targetAmount, 0), 340);
  eq('buildPlanSchedule/quota: 最初の日は開始日', s.items[0].dateKey, '2026-09-14');
  eq('buildPlanSchedule/quota: 最後の日は締切日', s.items[s.items.length - 1].dateKey, '2026-09-30');
  ok('buildPlanSchedule/quota: seq が1始まりの連番',
    s.items.every((i, idx) => i.seq === idx + 1));
  eq('buildPlanSchedule/quota: 1日あたり', Math.round(s.perDay * 10) / 10, 20);
})();
(() => {
  const s = W.buildPlanSchedule({
    title: '国試演習', startDate: '2026-09-14', dueDate: '2026-09-30',
    totalVolume: 100, excludeWeekdays: [0, 6], todayKey: TODAY
  });
  eq('buildPlanSchedule: 土日除外で稼働日が減る', s.workingDayCount, 13);
  ok('buildPlanSchedule: 土日にノルマが置かれない',
    s.items.every(i => ![0, 6].includes(W.parseDateKey(i.dateKey).getDay())));
  eq('buildPlanSchedule: 土日除外でも合計一致', s.items.reduce((a, i) => a + i.targetAmount, 0), 100);
})();
(() => {
  const s = W.buildPlanSchedule({
    title: 'First Aid 通読', startDate: '2026-09-14', dueDate: '2026-12-14',
    totalVolume: null, milestoneCount: 4, todayKey: TODAY
  });
  eq('buildPlanSchedule/milestone: モード', s.mode, 'milestone');
  eq('buildPlanSchedule/milestone: 件数', s.items.length, 4);
  eq('buildPlanSchedule/milestone: kind', s.items[0].kind, 'milestone');
  eq('buildPlanSchedule/milestone: 最後は締切日', s.items[3].dateKey, '2026-12-14');
  ok('buildPlanSchedule/milestone: タイトルに割合が入る', /100%/.test(s.items[3].title), s.items[3].title);
})();
(() => {
  eq('buildPlanSchedule: 締切なしはエラー',
    W.buildPlanSchedule({ startDate: TODAY, todayKey: TODAY }).error, 'no-due');
  eq('buildPlanSchedule: 締切が開始より前はエラー',
    W.buildPlanSchedule({ startDate: '2026-09-20', dueDate: '2026-09-10', todayKey: TODAY }).error, 'invalid-range');
  eq('buildPlanSchedule: 締切が過去はエラー',
    W.buildPlanSchedule({ startDate: '2026-09-01', dueDate: '2026-09-10', todayKey: TODAY }).error, 'past-due');
  eq('buildPlanSchedule: 全曜日除外はエラー',
    W.buildPlanSchedule({ startDate: TODAY, dueDate: '2026-09-30', excludeWeekdays: [0,1,2,3,4,5,6], todayKey: TODAY }).error, 'all-excluded');
  const s = W.buildPlanSchedule({ startDate: '2026-09-01', dueDate: '2026-09-30', totalVolume: 100, todayKey: TODAY });
  eq('buildPlanSchedule: 過去の開始日は今日に寄せる', s.startKey, TODAY);
  ok('buildPlanSchedule: 寄せたことが warnings に出る', s.warnings.includes('start-clamped'), s.warnings);
  const single = W.buildPlanSchedule({ startDate: TODAY, dueDate: TODAY, totalVolume: 40, todayKey: TODAY });
  eq('buildPlanSchedule: 締切=今日は1日に全量', single.items, [{ seq: 1, dateKey: TODAY, kind: 'quota', targetAmount: 40, pct: null, title: 'プラン' }]);
})();

// ---------- rebuildPlanSchedule ----------
(() => {
  const plan = { title: 'QB', start_date: '2026-09-10', due_date: '2026-09-30', total_volume: 340, unit: 'q', exclude_weekdays: [] };
  const tasks = [
    { due_date: '2026-09-10', target_amount: 20, done_amount: 20, completed: true },
    { due_date: '2026-09-11', target_amount: 20, done_amount: 20, completed: true },
    { due_date: '2026-09-12', target_amount: 20, done_amount: 5,  completed: false },
    { due_date: '2026-09-13', target_amount: 20, done_amount: 0,  completed: false }
  ];
  const r = W.rebuildPlanSchedule(plan, tasks, TODAY);
  eq('rebuildPlanSchedule: 消化量', r.doneAmount, 45);
  eq('rebuildPlanSchedule: 残量', r.remaining, 295);
  eq('rebuildPlanSchedule: 残量を配り直して合計一致', r.items.reduce((a, i) => a + i.targetAmount, 0), 295);
  eq('rebuildPlanSchedule: 今日から始まる', r.items[0].dateKey, TODAY);
  // 当初は 9/10〜9/30 の21日で340問。9/14 時点で45問しか終わっていないので、
  // 残り295問を17日で割ると1日あたりは当初より重くなる。
  const original = W.buildPlanSchedule({
    startDate: plan.start_date, dueDate: plan.due_date,
    totalVolume: plan.total_volume, todayKey: plan.start_date
  });
  ok('rebuildPlanSchedule: 遅れたぶん1日の量が増える',
    r.perDay > original.perDay, { before: original.perDay, after: r.perDay });

  // 開始日が未来のプランは今日からではなく開始日から配る（作成直後の自動再配分で開始日が今日に化けていた）
  const future = W.rebuildPlanSchedule({ title: 'x', start_date: '2026-09-16', due_date: '2026-09-30', total_volume: 100, exclude_weekdays: [] }, [], TODAY);
  eq('rebuildPlanSchedule: 開始日が未来ならそこから', future.items[0].dateKey, '2026-09-16');
  eq('rebuildPlanSchedule: 未来開始は差分なし', W.planScheduleDiffers(
    future.items.map(i => ({ due_date: i.dateKey, kind: i.kind, target_amount: i.targetAmount })), future, TODAY), false);

  const doneAll = W.rebuildPlanSchedule(plan, [{ due_date: '2026-09-10', target_amount: 340, done_amount: 340, completed: true }], TODAY);
  eq('rebuildPlanSchedule: 完了済みなら complete', doneAll.mode, 'complete');
  eq('rebuildPlanSchedule: 完了済みはタスクを作らない', doneAll.items, []);
})();

// ---------- planProgress ----------
(() => {
  const plan = { due_date: '2026-09-30', total_volume: 100 };
  const behind = W.planProgress(plan, [
    { due_date: '2026-09-12', target_amount: 20, done_amount: 20, completed: true },
    { due_date: '2026-09-13', target_amount: 20, done_amount: 0,  completed: false },
    { due_date: '2026-09-14', target_amount: 20, done_amount: 5,  completed: false },
    { due_date: '2026-09-20', target_amount: 40, done_amount: 0,  completed: false }
  ], TODAY);
  eq('planProgress: 消化量', behind.done, 25);
  eq('planProgress: 昨日までの予定量', behind.plannedByToday, 40);
  eq('planProgress: 遅れは昨日までぶん', behind.behind, 15);
  eq('planProgress: 期限切れ未完の件数', behind.overdueCount, 1);
  eq('planProgress: 今日の目標/実績', [behind.todayTarget, behind.todayDone], [20, 5]);
  eq('planProgress: 残り日数', behind.daysLeft, 16);
  eq('planProgress: ステータス', behind.status, 'behind');

  const done = W.planProgress(plan, [{ due_date: '2026-09-12', target_amount: 100, done_amount: 100, completed: true }], TODAY);
  eq('planProgress: 完了', done.status, 'done');
  eq('planProgress: 進捗率', Math.round(done.pct), 100);

  const ontrack = W.planProgress(plan, [
    { due_date: '2026-09-14', target_amount: 20, done_amount: 20, completed: true },
    { due_date: '2026-09-20', target_amount: 80, done_amount: 0,  completed: false }
  ], TODAY);
  eq('planProgress: 予定どおり', ontrack.status, 'ontrack');
  eq('planProgress: ボリューム無しなら pct は null', W.planProgress({ due_date: '2026-09-30' }, [], TODAY).pct, null);
})();

// ---------- buildCalendarRange ----------
(() => {
  // 2026-09-01 は火曜。日曜始まりなので 8/30 から。9/30 まで含めて5週。
  const m = W.buildCalendarRange('2026-09-14', 'month');
  eq('buildCalendarRange/month: 開始は日曜', m.startKey, '2026-08-30');
  eq('buildCalendarRange/month: 週数', m.weeks.length, 5);
  eq('buildCalendarRange/month: 各週7日', m.weeks.every(w => w.length === 7), true);
  eq('buildCalendarRange/month: 終了日', m.endKey, '2026-10-03');
  // 2026-11-01 は日曜、30日。ぴったり5週に収まる
  eq('buildCalendarRange/month: ぴったり収まる月は5週', W.buildCalendarRange('2026-11-10', 'month').weeks.length, 5);
  // 2026-08-01 は土曜、31日 → 7/26 開始で6週必要
  eq('buildCalendarRange/month: はみ出す月は6週', W.buildCalendarRange('2026-08-10', 'month').weeks.length, 6);
  const w = W.buildCalendarRange('2026-09-14', 'week');
  eq('buildCalendarRange/week: 1週だけ', w.weeks.length, 1);
  eq('buildCalendarRange/week: 月曜を含む週は前日の日曜から', w.startKey, '2026-09-13');
  eq('buildCalendarRange: 不正なキーは null', W.buildCalendarRange('nope', 'month'), null);
})();

// ---------- buildCalendarModel ----------
(() => {
  const plansById = { p1: { id: 'p1', title: 'QB 循環器', subject_id: '2C', color: '#45B7D1', unit: 'q' } };
  const model = W.buildCalendarModel('2026-09-14', 'month', {
    todayKey: TODAY,
    plansById,
    events: [
      { id: 'e1', title: '循環器 講義', start_date: '2026-09-15', end_date: null, subject_id: '2C' },
      { id: 'e2', title: '実習週間', start_date: '2026-09-21', end_date: '2026-09-25' }
    ],
    tasks: [
      { id: 't1', plan_id: 'p1', due_date: '2026-09-12', kind: 'quota', target_amount: 20, done_amount: 0,  completed: false },
      { id: 't2', plan_id: 'p1', due_date: '2026-09-13', kind: 'quota', target_amount: 20, done_amount: 20, completed: true  },
      { id: 't3', plan_id: 'p1', due_date: '2026-09-14', kind: 'quota', target_amount: 20, done_amount: 0,  completed: false },
      { id: 't4', plan_id: 'p1', due_date: '2026-09-30', kind: 'milestone', title: 'QB 100%地点', completed: false }
    ],
    countdowns: [{ id: 'c1', name: 'CBT', exam_date: '2026-09-28' }]
  });
  const cells = {};
  model.weeks.forEach(w => w.forEach(c => { cells[c.dateKey] = c; }));

  eq('buildCalendarModel: 期限切れ未完は overdue', cells['2026-09-12'].items[0].state, 'overdue');
  eq('buildCalendarModel: 完了は done', cells['2026-09-13'].items[0].state, 'done');
  eq('buildCalendarModel: 今日ぶんは todo', cells['2026-09-14'].items[0].state, 'todo');
  eq('buildCalendarModel: 今日フラグ', cells['2026-09-14'].isToday, true);
  eq('buildCalendarModel: 過去フラグ', cells['2026-09-13'].isPast, true);
  eq('buildCalendarModel: overdue をセルが持つ', cells['2026-09-12'].hasOverdue, true);
  eq('buildCalendarModel: 完了カウント', [cells['2026-09-13'].taskCount, cells['2026-09-13'].doneCount], [1, 1]);
  eq('buildCalendarModel: 科目をプランから引き継ぐ', cells['2026-09-14'].items[0].subjectId, '2C');
  eq('buildCalendarModel: 単日イベント', cells['2026-09-15'].items.map(i => i.kind), ['event']);
  eq('buildCalendarModel: 期間イベントは各日に展開',
    ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'].map(k => cells[k].items.length), [1,1,1,1,1]);
  eq('buildCalendarModel: 期間イベントの前後には出ない',
    [cells['2026-09-20'].items.length, cells['2026-09-26'].items.length], [0, 0]);
  eq('buildCalendarModel: 期間の位置が分かる', cells['2026-09-23'].items[0].spanIndex, 2);
  eq('buildCalendarModel: 試験カウントダウン', cells['2026-09-28'].items[0].kind, 'exam');
  eq('buildCalendarModel: 月外の日は inMonth=false', cells['2026-08-30'].inMonth, false);
  eq('buildCalendarModel: 表示範囲外のデータは落とす',
    W.buildCalendarModel('2026-09-14', 'month', {
      todayKey: TODAY, events: [{ id: 'x', title: '来年', start_date: '2027-05-01' }]
    }).weeks.flat().reduce((a, c) => a + c.items.length, 0), 0);

  // 並び順: 試験 → 節目 → 予定 → ノルマ
  const mixed = W.buildCalendarModel('2026-09-14', 'week', {
    todayKey: TODAY, plansById,
    events: [{ id: 'e', title: 'イベント', start_date: TODAY }],
    tasks: [
      { id: 'q', plan_id: 'p1', due_date: TODAY, kind: 'quota', target_amount: 10 },
      { id: 'm', plan_id: 'p1', due_date: TODAY, kind: 'milestone', title: '節目' }
    ],
    countdowns: [{ id: 'c', name: '試験', exam_date: TODAY }]
  });
  const todayCell = mixed.weeks[0].find(c => c.dateKey === TODAY);
  eq('buildCalendarModel: チップの並び順', todayCell.items.map(i => i.kind), ['exam', 'milestone', 'event', 'quota']);

  // 時刻付きの予定（講義など）は時刻順に並び、終日の予定はその後ろ
  const timed = W.buildCalendarModel(TODAY, 'week', {
    todayKey: TODAY,
    events: [
      { id: 'a', title: '午後の実習', start_date: TODAY, all_day: false, start_time: '13:00:00', end_time: '17:00:00' },
      { id: 'b', title: '終日の予定',  start_date: TODAY },
      { id: 'c', title: '朝の講義',    start_date: TODAY, all_day: false, start_time: '09:00:00', end_time: '10:30:00' }
    ]
  }).weeks[0].find(c => c.dateKey === TODAY);
  eq('buildCalendarModel: 時刻順に並ぶ（終日は後ろ）', timed.items.map(i => i.title), ['朝の講義', '午後の実習', '終日の予定']);
  eq('buildCalendarModel: 時刻は HH:MM に丸める', [timed.items[0].startTime, timed.items[0].endTime], ['09:00', '10:30']);
  eq('buildCalendarModel: 終日の予定は時刻を持たない', timed.items[2].startTime, null);
  eq('buildCalendarModel: all_day が立っていれば時刻は無視',
    W.buildCalendarModel(TODAY, 'week', { todayKey: TODAY,
      events: [{ id: 'd', title: 'x', start_date: TODAY, all_day: true, start_time: '09:00:00' }]
    }).weeks[0].find(c => c.dateKey === TODAY).items[0].startTime, null);
})();

// ---------- buildCalendarModel: 学習ログの日別集計 ----------
(() => {
  const at = (key, h, m) => new Date(2026, Number(key.slice(5,7)) - 1, Number(key.slice(8,10)), h, m).toISOString();
  const model = W.buildCalendarModel('2026-09-14', 'month', {
    todayKey: TODAY,
    logs: [
      { subject_name: '2C 循環器', duration_minutes: 90, started_at: at('2026-09-14', 10, 0) },
      { subject_name: '2C 循環器', duration_minutes: 60, started_at: at('2026-09-14', 14, 0) },
      { subject_name: '1C 生理学', duration_minutes: 30, started_at: at('2026-09-14', 20, 0) },
      // 3時境界より前の勉強は前日ぶんとして数える
      { subject_name: '2J 神経',   duration_minutes: 45, started_at: at('2026-09-16',  1, 30) },
      { subject_name: '無視',      duration_minutes: 0,  started_at: at('2026-09-17', 10, 0) },
      { subject_name: '範囲外',    duration_minutes: 60, started_at: at('2027-01-05', 10, 0) }
    ]
  });
  const cells = {};
  model.weeks.forEach(w => w.forEach(c => { cells[c.dateKey] = c; }));
  eq('buildCalendarModel/logs: 合計分数', cells['2026-09-14'].studyMinutes, 180);
  eq('buildCalendarModel/logs: 科目別を多い順に', cells['2026-09-14'].studyBySubject,
    [{ subjectId: '2C 循環器', minutes: 150 }, { subjectId: '1C 生理学', minutes: 30 }]);
  eq('buildCalendarModel/logs: 深夜は前日に寄る',
    [cells['2026-09-15'].studyMinutes, cells['2026-09-16'].studyMinutes], [45, 0]);
  eq('buildCalendarModel/logs: 0分は数えない', cells['2026-09-17'].studyBySubject, []);
  eq('buildCalendarModel/logs: 範囲外は落とす',
    model.weeks.flat().reduce((a, c) => a + c.studyMinutes, 0), 225);
  eq('buildCalendarModel/logs: ログ無しは0', cells['2026-09-20'].studyMinutes, 0);
})();

// ---------- filterCalendarSources / normalizeCalendarEvent ----------
(() => {
  const src = {
    plansById: { p1: { subject_id: '2C' }, p2: { subject_id: '1C' } },
    events: [{ id: 'a', subject_id: '2C' }, { id: 'b', subject_id: null }, { id: 'c', subject_id: '3D' }],
    tasks: [{ id: 't1', plan_id: 'p1' }, { id: 't2', plan_id: 'p2' }, { id: 't3', plan_id: 'nope' }],
    countdowns: [{ id: 'x' }],
    logs: [{ subject_name: '2C 循環器' }, { subject_name: '自由入力' }]
  };
  eq('subjectCategoryOf: id / 名前 / 未知', [W.subjectCategoryOf('2C'), W.subjectCategoryOf('1C 生理学'), W.subjectCategoryOf('zzz'), W.subjectCategoryOf(null)],
    ['cat-vol2', 'cat-vol1', null, null]);
  const all = W.filterCalendarSources(src, { kinds: {}, categories: [] });
  eq('filter: 絞り込みなしは全件', [all.events.length, all.tasks.length, all.countdowns.length, all.logs.length], [3, 3, 1, 2]);
  const vol2 = W.filterCalendarSources(src, { categories: ['cat-vol2'] });
  eq('filter: カテゴリで絞ると科目なしは消える', vol2.events.map(e => e.id), ['a']);
  eq('filter: ノルマはプランの科目で絞る', vol2.tasks.map(t => t.id), ['t1']);
  eq('filter: 試験は科目で絞らない', vol2.countdowns.length, 1);
  eq('filter: 実績は subject_name で絞る', vol2.logs.length, 1);
  const noEv = W.filterCalendarSources(src, { kinds: { event: false, exam: false } });
  eq('filter: 種類 off', [noEv.events.length, noEv.countdowns.length, noEv.tasks.length], [0, 0, 3]);

  eq('normalizeEvent: タイトル必須', !!W.normalizeCalendarEvent({ start_date: TODAY }).error, true);
  eq('normalizeEvent: 開始日必須', !!W.normalizeCalendarEvent({ title: 'x' }).error, true);
  eq('normalizeEvent: 終了 < 開始 はエラー', !!W.normalizeCalendarEvent({ title: 'x', start_date: '2026-09-10', end_date: '2026-09-09' }).error, true);
  eq('normalizeEvent: 終了 = 開始 は単日扱い', W.normalizeCalendarEvent({ title: 'x', start_date: TODAY, end_date: TODAY }).value.end_date, null);
  const timed = W.normalizeCalendarEvent({ title: ' 講義 ', start_date: TODAY, all_day: false, start_time: '09:00', end_time: '10:30', memo: '  ' }).value;
  eq('normalizeEvent: 時刻付き', [timed.title, timed.all_day, timed.start_time, timed.end_time, timed.memo, timed.category], ['講義', false, '09:00', '10:30', null, 'other']);
  eq('normalizeEvent: 単日で終了時刻 < 開始時刻はエラー', !!W.normalizeCalendarEvent({ title: 'x', start_date: TODAY, all_day: false, start_time: '10:00', end_time: '09:00' }).error, true);
  eq('normalizeEvent: 終日チェックなら時刻は捨てる', W.normalizeCalendarEvent({ title: 'x', start_date: TODAY, all_day: true, start_time: '10:00' }).value.start_time, null);
  eq('normalizeEvent: 時刻が空なら終日に戻す', W.normalizeCalendarEvent({ title: 'x', start_date: TODAY, all_day: false }).value.all_day, true);
})();

// ---------- 実績（ログ）との突合 ----------
(() => {
  const plan = { id: 'p1', subject_id: '2C', unit: 'q', start_date: '2026-09-10', due_date: '2026-09-30', total_volume: 340 };
  const at = (key, h) => new Date(2026, Number(key.slice(5,7)) - 1, Number(key.slice(8,10)), h, 0).toISOString();
  const logs = [
    { subject_name: '2C 循環器', started_at: at('2026-09-12', 10), questions_solved: 20 },
    { subject_name: '2C',        started_at: at('2026-09-12', 20), questions_solved: 5 },     // id 表記でも一致
    { subject_name: '2C 循環器', started_at: at('2026-09-14', 1),  questions_solved: 30 },    // 深夜 → 9/13 ぶん
    { subject_name: '2C 循環器', started_at: at('2026-09-09', 10), questions_solved: 99 },    // 開始日より前
    { subject_name: '1C 生理学', started_at: at('2026-09-12', 10), questions_solved: 50 },    // 別科目
    { subject_name: '2C 循環器', started_at: at('2026-09-14', 10), videos_watched: 3 }        // 単位違い
  ];
  const byDay = W.planDoneByDayFromLogs(plan, logs);
  eq('doneByDay: 科目一致を日別に合計', byDay, { '2026-09-12': 25, '2026-09-13': 30 });
  eq('doneByDay: 動画プランは videos_watched', W.planDoneByDayFromLogs(Object.assign({}, plan, { unit: 'video' }), logs), { '2026-09-14': 3 });
  eq('doneByDay: 科目なしは空', W.planDoneByDayFromLogs({ unit: 'q' }, logs), {});

  const tasks = [
    { id: 't1', plan_id: 'p1', due_date: '2026-09-12', kind: 'quota', target_amount: 20, done_amount: 0, completed: false, seq: 1 },
    { id: 'm1', plan_id: 'p1', due_date: '2026-09-12', kind: 'milestone', title: '節目', seq: 2 },
    { id: 't2', plan_id: 'p1', due_date: '2026-09-14', kind: 'quota', target_amount: 20, done_amount: 8, completed: false, seq: 3 },
    { id: 't3', plan_id: 'p1', due_date: '2026-09-15', kind: 'quota', target_amount: 20, done_amount: 0, completed: true,  seq: 4 }
  ];
  const ap = W.planApplyLogs(plan, tasks, byDay);
  const f = id => ap.find(t => t.id === id);
  eq('applyLogs: 量に達したら完了', [f('t1').done_amount, f('t1').completed], [25, true]);
  eq('applyLogs: 同じ日の節目にはログを二重に付けない', f('m1').log_amount, 0);
  eq('applyLogs: 手入力のほうが多ければそちら', f('t2').done_amount, 8);
  eq('applyLogs: 手動完了は維持', f('t3').completed, true);
  const extra = ap.find(t => t.extra);
  eq('applyLogs: タスクの無い日のログは仮タスクに', [extra.due_date, extra.done_amount, extra.target_amount], ['2026-09-13', 30, 0]);
  eq('applyLogs: 元の配列は変えない', tasks[0].done_amount, 0);

  // 残量は 340 - (25 + 30 + 8 + 20) = 257
  const rb = W.rebuildPlanSchedule(plan, ap, '2026-09-14');
  eq('rebuild: 実績込みの残量', rb.remaining, 257);

  eq('scheduleDiffers: 同じなら false', W.planScheduleDiffers(
    [{ due_date: '2026-09-14', kind: 'quota', target_amount: 10 }, { due_date: '2026-09-13', kind: 'quota', target_amount: 99 }],
    { items: [{ dateKey: '2026-09-14', kind: 'quota', targetAmount: 10 }] }, '2026-09-14'), false);
  eq('scheduleDiffers: 量が変わったら true', W.planScheduleDiffers(
    [{ due_date: '2026-09-14', kind: 'quota', target_amount: 10 }],
    { items: [{ dateKey: '2026-09-14', kind: 'quota', targetAmount: 12 }] }, '2026-09-14'), true);
  eq('scheduleDiffers: 仮タスクは無視', W.planScheduleDiffers(
    [{ due_date: '2026-09-14', kind: 'quota', target_amount: 0, extra: true }], { items: [] }, '2026-09-14'), false);
})();

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\n--- failures ---\n' + failures.join('\n')); process.exit(1); }
