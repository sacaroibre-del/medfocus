// 逆算プランを何日か回したときの挙動テスト。
//   node test_plan_lifecycle.cjs
// syncPlans を通して「日をまたぐ」「手でチェックする」「サボる」を再現する
// （純関数だけでは、保存済みタスクの作り直しで起きる不具合を捕まえられない）。
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
window.eval(fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/import\.meta\.env/g, '({})'));

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

const START = '2026-09-06';
let NOW = START;
W.todayPlanKey = () => NOW;   // 「今日」を動かす

let logs = [];
W.fetchStudyLogs = async () => logs;

// 1問2分・1本40分の実測を積んでおく
function seedLogs() {
  logs = [];
  for (let i = 0; i < 5; i++) logs.push({ subject_name: '2C', activity: 'qb', duration_minutes: 60,
    questions_solved: 30, questions_correct: 20, started_at: '2026-08-2' + i + 'T10:00:00Z' });
  for (let i = 0; i < 3; i++) logs.push({ subject_name: '2C', activity: 'video', duration_minutes: 80,
    videos_watched: 2, video_edition: 'kokushi', started_at: '2026-08-1' + i + 'T10:00:00Z' });
}

function setup(plans, opts) {
  NOW = (opts && opts.today) || START;
  seedLogs();
  W.localStorage.setItem('medfocus_weekly_goals', JSON.stringify([180, 180, 180, 180, 180, 180, 180]));
  W.localStorage.setItem('medfocus_video_progress', JSON.stringify({ '2B': { kokushi: { done: 0, total: 3 } } }));
  W.localStorage.setItem('medfocus_qb_progress', JSON.stringify({ '2B': { '1': { done: 0, total: 52, correct: 0 } } }));
  W.localStorage.setItem('medfocus_study_plans', JSON.stringify(plans));
  W.localStorage.setItem('medfocus_plan_tasks', JSON.stringify([]));
  W._planSyncAt = 0;
}
const P = (id, title, sid, unit, vol) => ({
  id, title, subject_id: sid, unit, video_edition: unit === 'video' ? 'kokushi' : null,
  target_round: unit === 'q' ? 1 : null, start_date: START, due_date: W.shiftDateKey(START, 30),
  total_volume: vol, exclude_weekdays: [], auto_redistribute: true, status: 'active'
});
const PLANS = () => [P('vid', '2B 動画', '2B', 'video', 3), P('qb', '2B QB', '2B', 'q', 52)];

const sync = async () => { W._planSyncAt = 0; return W.syncPlans(true); };
const rows = s => s.tasks.filter(t => t.kind === 'quota' && !t.extra)
  .map(t => `${String(t.due_date).slice(0, 10)}|${t.plan_id}|${t.target_amount}${t.completed ? '|✓' : ''}`);
const onDay = (s, key) => s.tasks.filter(t => !t.extra && String(t.due_date).slice(0, 10) === key)
  .map(t => t.plan_id + ':' + t.target_amount);

(async () => {
  // ---------- 手でチェックしても予定が点滅しない ----------
  setup(PLANS());
  let s = await sync();
  const before = rows(s);
  const todayTask = s.tasks.find(t => !t.extra && String(t.due_date).slice(0, 10) === NOW);
  ok('初日にタスクが出る', !!todayTask, before);
  await W.setTaskCompleted(todayTask, true);

  const after1 = rows(await sync());
  const after2 = rows(await sync());
  const after3 = rows(await sync());
  eq('チェック後、同期を繰り返しても予定が変わらない', after2, after1);
  eq('さらに同期しても変わらない', after3, after1);
  ok('チェックが残る', after1.some(r => r.endsWith('|✓')), after1);
  ok('チェックした日にタスクが増えない',
     onDay(await sync(), START).length === onDay(s, START).length,
     { 前: onDay(s, START), 後: onDay(await sync(), START) });

  // ---------- サボっても過去の未完了タスクが積み残らない ----------
  setup(PLANS());
  await sync();
  NOW = W.shiftDateKey(START, 3);   // 3日サボって日付だけ進む
  const skipped = await sync();
  const past = skipped.tasks.filter(t => !t.extra && String(t.due_date).slice(0, 10) < NOW && !t.completed);
  eq('過ぎた未完了タスクは残らない（同じ仕事が今日以降に載り直すため）', past.map(t => t.plan_id), []);
  ok('今日から予定が組み直される', onDay(skipped, NOW).length > 0, onDay(skipped, NOW));

  // ---------- 進めたぶんは前倒しされ、今日は増えない ----------
  setup(PLANS());
  const plain = await sync();
  const planEnd = s2 => rows(s2).map(r => r.slice(0, 10)).sort().pop();
  const endBefore = planEnd(plain);
  // 今日の予定（動画3本＝実測40分/本で120分）をこなす
  logs.push({ subject_name: '2B', activity: 'video', duration_minutes: 120, videos_watched: 3,
              video_edition: 'kokushi', started_at: NOW + 'T10:00:00Z' });
  const done = await sync();
  eq('今日の予定をこなしたら今日には足さない', onDay(done, NOW), []);
  ok('全体の終わりが早まる', planEnd(done) <= endBefore, { 前: endBefore, 後: planEnd(done) });
  const qbDay = done.tasks.filter(t => !t.extra && t.plan_id === 'qb').map(t => String(t.due_date).slice(0, 10))[0];
  ok('動画を見終わった翌日からQB', qbDay > NOW, qbDay);

  // ---------- プランが1件だけでも分割されない ----------
  setup([P('qb', '2B QB', '2B', 'q', 52)]);
  const solo = await sync();
  const soloRows = solo.tasks.filter(t => t.kind === 'quota' && !t.extra);
  eq('1件だけでも問題演習は1日にまとめる', soloRows.map(t => t.target_amount), [52]);

  // ---------- 過ぎた日の扱い ----------
  // 複数日にまたがるプランで、半端に進んだ日・手つかずの日がどうなるか。
  function bigPlan() {
    return [{ id: 'vid', title: '2P 動画', subject_id: '2P', unit: 'video', video_edition: 'cbt',
              start_date: START, due_date: W.shiftDateKey(START, 30), total_volume: 47,
              exclude_weekdays: [], auto_redistribute: true, status: 'active' }];
  }
  const taskRows = s => s.tasks.filter(t => !t.extra && t.plan_id === 'vid')
    .map(t => ({ day: String(t.due_date).slice(0, 10), n: t.target_amount, done: !!t.completed }));

  setup(bigPlan());
  W.localStorage.setItem('medfocus_video_progress', JSON.stringify({ '2P': { cbt: { done: 0, total: 47 } } }));
  let s2 = await sync();
  const firstDay = taskRows(s2).find(r => r.day === START);
  ok('初日にまとまった本数が乗る', firstDay && firstDay.n > 1, taskRows(s2));

  // 予定の一部（10本）だけ見て、翌日へ
  logs.push({ subject_name: '2P', activity: 'video', duration_minutes: 65, videos_watched: 10,
              video_edition: 'cbt', started_at: START + 'T10:00:00Z' });
  NOW = W.shiftDateKey(START, 1);
  s2 = await sync();
  const kept = taskRows(s2).filter(r => r.day < NOW);
  eq('やった日はノルマが消えず、実際にやった分で残る', kept, [{ day: START, n: 10, done: true }]);

  // 何もしない日は消える
  NOW = W.shiftDateKey(START, 2);
  s2 = await sync();
  const kept2 = taskRows(s2).filter(r => r.day < NOW);
  eq('手つかずの日は残さない（今日以降へ配り直されるため）',
     kept2, [{ day: START, n: 10, done: true }]);

  // 過去に残した分と、これからのノルマを足すと総量に一致する（二重計上しない）
  const total = taskRows(s2).reduce((m, r) => m + r.n, 0);
  eq('ノルマの合計が総本数と一致する', total, 47);

  console.log();
  if (failures.length) {
    console.log('--- 失敗 ---');
    failures.forEach(f => console.log('  ✗ ' + f));
    console.log();
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack || e); process.exit(1); });
