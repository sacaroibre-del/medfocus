// 複数科目統合セッションのテスト。
//   node test_combined_session.cjs
// 時間配分・科目の切り替えと実績の積み方・保存する行・配分と実績の集計・
// 学習ページでの設定パネルと記録フォームを確かめる。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="app"><aside id="sidebar"></aside><main id="main-content"><div id="page-container"></div></main></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost/study' }
);
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
window.requestAnimationFrame = (cb) => cb();
window.confirm = () => true;

let code = fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/import\.meta\.env/g, '({})');
// モジュールの let を外から触るための口
code += "\nwindow.__setEnv = (sb, ses) => { supabase = sb; session = ses; isDemoMode = false; };";
code += "\nwindow.__noDB = () => { supabase = null; session = null; };";
code += "\nwindow.__reset = () => { invalidateCache(); _planSyncAt = 0; _planSyncResult = null; };";
// let の束縛は外側の eval から見えないので、同じスコープの直接 eval で読み書きする
code += "\nwindow.__eval = (s) => eval(s);";
window.eval(code);

const W = window;
const G = (expr) => W.__eval(expr);
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
const mins = arr => arr.map(x => x.plannedMin);

(async () => {
  // ---- 時間配分 ----
  eq('問題数の比で割り切れる', mins(W.allocateCombinedMinutes(60, [{ questions: 10 }, { questions: 20 }, { questions: 30 }])), [10, 20, 30]);
  eq('余りは問題数最多の科目へ', mins(W.allocateCombinedMinutes(100, [{ questions: 10 }, { questions: 25 }, { questions: 10 }])), [22, 56, 22]);
  eq('同数なら先の科目へ', mins(W.allocateCombinedMinutes(100, [{ questions: 1 }, { questions: 1 }, { questions: 1 }])), [34, 33, 33]);
  eq('問題数0の科目には配らない', mins(W.allocateCombinedMinutes(50, [{ questions: 0 }, { questions: 5 }])), [0, 50]);
  eq('合計0分なら全部0', mins(W.allocateCombinedMinutes(0, [{ questions: 5 }, { questions: 5 }])), [0, 0]);
  eq('問題数が無ければ全部0', mins(W.allocateCombinedMinutes(60, [{ questions: '' }])), [0]);
  const a = W.allocateCombinedMinutes(97, [{ questions: 7 }, { questions: 13 }, { questions: 29 }]);
  eq('配分の合計は合計時間と一致', a.reduce((s, x) => s + x.plannedMin, 0), 97);
  eq('元の項目は残す', W.allocateCombinedMinutes(10, [{ subjectId: '2A', questions: 1 }])[0].subjectId, '2A');

  // ---- 推奨時間 ----
  eq('推奨 = Σ問題数×1問あたり（切り上げ）',
    W.recommendedCombinedMinutes([{ subjectId: 'a', questions: 10 }, { subjectId: 'b', questions: 5 }, { subjectId: '', questions: 9 }],
      id => (id === 'a' ? 1.5 : 2.1)), 26);
  W.setMultiMinPerQOverride(3);
  eq('1問あたりの設定値が効く', W.multiMinPerQ('2A'), 3);
  W.setMultiMinPerQOverride(NaN);
  eq('設定を消すと実測（無ければ仮の単価）', W.multiMinPerQ('2A'), 2);

  // ---- 開始・切り替え・実績の積み方 ----
  G(`isMulti = true; elapsedSeconds = 0;
     multiSession = { id: null, totalMin: 90, current: 0, segBase: 0,
       segments: [newMultiSegment('2A', 20), newMultiSegment('2C', 40), newMultiSegment('', 5), newMultiSegment('2D', 0)] };`);
  eq('科目未選択・0問は開始時に外れる', W.multiStart(), null);
  const ms = G('multiSession');
  eq('残った科目', ms.segments.map(s => s.subjectId), ['2A', '2C']);
  eq('確定した配分', mins(ms.segments), [30, 60]);
  ok('IDが振られる', typeof ms.id === 'string' && ms.id.length >= 32, ms.id);
  ok('開始後はモード切り替えを止める', W.multiLocked());

  G(`multiOnStart('2026-09-28T01:00:00.000Z'); elapsedSeconds = 300;`);
  eq('経過中の実績', W.multiLiveSec(0), 300);
  G(`multiSwitchTo(1)`);
  eq('切り替えで前の科目に確定', G('multiSession.segments[0].actualSec'), 300);
  ok('次の科目の開始時刻が入る', !!G('multiSession.segments[1].startedAt'));
  G(`elapsedSeconds = 500; multiOnPause('2026-09-28T01:09:00.000Z'); multiOnStart('2026-09-28T01:12:00.000Z');`);
  eq('休憩は止めたときの科目に付く', G('multiSession.segments[1].breaks.length'), 1);
  ok('再開で休憩が閉じる', !!G('multiSession.segments[1].breaks[0].end'));
  G(`multiSwitchTo(0); elapsedSeconds = 600;`);
  eq('前の科目へ戻ると続きから積む', W.multiLiveSec(0), 400);
  eq('離れた科目は止まる', W.multiLiveSec(1), 200);
  G(`multiCommit(); multiCommit();`);
  eq('確定を2回呼んでも二重に積まない', [G('multiSession.segments[0].actualSec'), G('multiSession.segments[1].actualSec')], [400, 200]);
  G(`multiSwitchTo(5); multiSwitchTo(-1);`);
  eq('範囲外には移らない', G('multiSession.current'), 0);

  // 配分に届いたら1回だけ知らせる
  G(`multiSession.segments[0].plannedMin = 5; multiSession.segments[0].notified = false;`);
  W.multiTick();
  ok('配分超過で通知済みになる', G('multiSession.segments[0].notified') === true);

  // ---- 保存する行 ----
  // 科目を離れた時刻は実際の現在時刻で入るので、終了はそれより後にする
  const END = new Date(Date.now() + 3600e3).toISOString();
  G(`multiSession.segments.push(Object.assign(newMultiSegment('2E', 10), { plannedMin: 15 }));`);
  const rows = W.buildCombinedRows(G('multiSession'), [
    { index: 0, minutes: 7, solved: 20, correct: 15 },
    { index: 1, minutes: 3, solved: 5, correct: 4 },
    { index: 2, minutes: 0, solved: 0, correct: 0 }
  ], END);
  eq('行の並びと科目', rows.map(r => [r.subjectId, r.order, r.minutes]), [['2A', 0, 7], ['2C', 1, 3], ['2E', 2, 0]]);
  eq('いまの科目の終了はセッションの終了', rows[0].endedAt, END);
  ok('離れた科目の終了は離れた時刻', rows[1].endedAt < END, rows[1].endedAt);
  eq('手を付けなかった科目は終了時刻に0分で置く', [rows[2].startedAt, rows[2].endedAt, rows[2].minutes], [END, END, 0]);
  eq('予定問題数', rows.map(r => r.plannedQuestions), [20, 40, 10]);
  eq('閉じた休憩だけ残す', rows[1].breaks.length, 1);

  // ---- Supabase への保存 ----
  const inserted = [];
  let failMode = null;
  const fake = {
    from: (table) => ({
      insert: async (payloads) => {
        if (failMode === 'column' && payloads.some(p => 'combined_session_id' in p)) {
          return { error: { message: "Could not find the 'combined_session_id' column of 'study_logs' in the schema cache" } };
        }
        if (failMode === 'duration' && payloads.some(p => p.duration_minutes === 0)) {
          return { error: { code: '23514', message: 'new row for relation "study_logs" violates check constraint "study_logs_duration_minutes_check"' } };
        }
        inserted.push(...payloads.map(p => Object.assign({ table }, p)));
        return { error: null };
      },
      // 保存後の進捗スナップショットなどは中身を見ないので、何でも成功で返す
      ...Object.fromEntries(['select', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'limit', 'range', 'single', 'maybeSingle', 'update', 'upsert', 'delete']
        .map(m => [m, function () { return this; }])),
      then(res) { return Promise.resolve({ data: [], error: null, count: 0 }).then(res); }
    }),
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }
  };
  W.__setEnv(fake, { user: { id: 'u1' } });
  W.__reset();
  const common = { memo: 'まとめて', focusLevel: 3, location: '図書館', purpose: 'cbt' };
  const sid = G('multiSession.id');
  ok('保存できる', await W.saveCombinedStudyLogs(sid, rows, common));
  eq('1回で3行', inserted.length, 3);
  eq('全行が同じ統合ID', [...new Set(inserted.map(p => p.combined_session_id))], [sid]);
  eq('活動は問題演習', [...new Set(inserted.map(p => p.activity))], ['qb']);
  eq('配分・予定問題数・順番', inserted.map(p => [p.planned_minutes, p.planned_questions, p.segment_order]), [[5, 20, 0], [60, 40, 1], [15, 10, 2]]);
  eq('実績と解いた数', inserted.map(p => [p.subject_name, p.duration_minutes, p.questions_solved, p.questions_correct]),
    [['2A', 7, 20, 15], ['2C', 3, 5, 4], ['2E', 0, 0, 0]]);
  eq('共通の項目', [inserted[0].memo, inserted[0].location, inserted[0].focus_level, inserted[0].study_purpose], ['まとめて', '図書館', 3, 'cbt']);
  ok('休憩はその科目の行だけ', !inserted[0].breaks && typeof inserted[1].breaks === 'string');

  inserted.length = 0; failMode = 'duration';
  ok('0分を拒まれたら0分の行を外して保存', await W.saveCombinedStudyLogs(sid, rows, common));
  eq('0分の行を外した', inserted.map(p => p.subject_name), ['2A', '2C']);

  inserted.length = 0; failMode = 'column';
  ok('列が無ければ列なしで保存', await W.saveCombinedStudyLogs(sid, rows, common));
  ok('統合の列を落とした', inserted.length === 3 && inserted.every(p => !('combined_session_id' in p) && !('planned_minutes' in p)));
  failMode = null;

  // ---- 0分の行は普通の集計から外す ----
  const logs = [
    { id: 1, subject_name: '2A', duration_minutes: 30, combined_session_id: 'x', planned_minutes: 25, planned_questions: 10, segment_order: 0, started_at: '2026-09-20T01:00:00Z', questions_solved: 10 },
    { id: 2, subject_name: '2C', duration_minutes: 0, combined_session_id: 'x', planned_minutes: 35, planned_questions: 14, segment_order: 1, started_at: '2026-09-20T02:00:00Z' },
    { id: 3, subject_name: '2A', duration_minutes: 40, started_at: '2026-09-21T01:00:00Z' },
    { id: 4, subject_name: '2A', duration_minutes: 20, combined_session_id: 'y', planned_minutes: 15, planned_questions: 5, segment_order: 0, started_at: '2026-09-22T01:00:00Z', questions_solved: 5 },
    { id: 5, subject_name: '2C', duration_minutes: 30, combined_session_id: 'y', planned_minutes: 30, planned_questions: 10, segment_order: 1, started_at: '2026-09-22T01:20:00Z', questions_solved: 10 }
  ];
  ok('未着手の行の判定', W.isUntouchedSegmentLog(logs[1]) && !W.isUntouchedSegmentLog(logs[0]) && !W.isUntouchedSegmentLog(logs[2]));
  G(`window.__origAll = fetchStudyLogsAll;`);
  G(`fetchStudyLogsAll = async () => window.__testLogs;`);
  W.__testLogs = logs;
  eq('fetchStudyLogs は0分の統合行を外す', (await W.fetchStudyLogs()).map(l => l.id), [1, 3, 4, 5]);
  const plain = logs.filter(l => l.id !== 2);
  W.__testLogs = plain;
  ok('外すものが無ければ同じ配列を返す', (await W.fetchStudyLogs()) === plain);
  G(`fetchStudyLogsAll = window.__origAll;`);

  // ---- 配分と実績の集計 ----
  const st = W.buildCombinedSessionStats(logs);
  eq('セッション数（新しい順）', st.sessions.map(s => s.id), ['y', 'x']);
  eq('セッションの配分と実績', st.sessions.map(s => [s.planned, s.actual, s.diff, s.untouched]), [[45, 50, 5, 0], [60, 30, -30, 1]]);
  eq('全体の差', [st.planned, st.actual, Math.round(st.diffPct)], [105, 80, -24]);
  const s2a = st.bySubject.find(b => b.subjectId === '2A');
  eq('科目別（2A）', [s2a.count, s2a.planned, s2a.actual, s2a.over, s2a.untouched], [2, 40, 50, 2, 0]);
  eq('科目別の1問あたり', s2a.minPerQ.toFixed(2), (50 / 15).toFixed(2));
  eq('配分を超えがちな科目', st.worst && st.worst.subjectId, '2A');
  eq('手を付けなかった割合', Math.round(st.untouchedRate), 25);
  ok('統合でない行は集計しない', !W.buildCombinedSessionStats([logs[2]]).hasData);
  const html = W.insightsCombinedHTML({ combined: st });
  ok('インサイトのカードが出る', html.includes('統合セッション：配分と実績') && html.includes('最近のセッション'));
  ok('データが無いときの案内', W.insightsCombinedHTML({ combined: W.buildCombinedSessionStats([]) }).includes('複数科目'));

  // ---- 学習ページ ----
  W.__noDB();
  G(`resetSW(); isMulti = true; multiSession = { id: null, totalMin: 60, current: 0, segBase: 0, segments: [newMultiSegment('2A', 10), newMultiSegment('2C', 20)] };`);
  eq('リセット後は下書きが残る', G('multiSession.segments.map(s => s.subjectId)'), ['2A', '2C']);
  await W.renderStudy();
  ok('複数科目のタブが選ばれている', document.getElementById('mode-multi')?.classList.contains('active'));
  ok('通常の科目セレクタは出さない', !document.getElementById('study-subject'));
  eq('開始前は 00:00 から', document.getElementById('timer-display').textContent, '00:00');
  eq('設定パネルに科目の行', document.querySelectorAll('#multi-panel [data-multi-row]').length, 2);
  eq('配分のプレビュー', [...document.querySelectorAll('[data-multi-alloc]')].map(e => e.textContent), ['20分', '40分']);
  ok('推奨時間が出る', /推奨/.test(document.getElementById('multi-recommend').textContent));

  // 問題数を変えるとプレビューだけ変わる
  const q = document.querySelector('[data-multi-row="0"] .multi-questions');
  q.value = '40'; q.dispatchEvent(new W.Event('input'));
  eq('入力でプレビュー更新', [...document.querySelectorAll('[data-multi-alloc]')].map(e => e.textContent), ['40分', '20分']);
  document.getElementById('multi-add').click();
  eq('科目を追加', document.querySelectorAll('#multi-panel [data-multi-row]').length, 3);
  document.querySelector('[data-multi-remove="2"]').click();
  eq('科目を外す', document.querySelectorAll('#multi-panel [data-multi-row]').length, 2);

  // 開始 → 進捗表示
  document.getElementById('btn-toggle').click();
  await new Promise(r => setTimeout(r, 0));
  ok('開始するとIDが振られる', !!G('multiSession.id'));
  eq('進捗の行', document.querySelectorAll('[data-multi-seg]').length, 2);
  ok('今の科目が強調される', document.querySelector('[data-multi-seg="0"]').classList.contains('is-current'));
  document.getElementById('multi-next').click();
  ok('次の科目へ', G('multiSession.current') === 1 && document.querySelector('[data-multi-seg="1"]').classList.contains('is-current'));
  document.getElementById('mode-up').click();
  ok('セッション中はほかのモードへ移れない', G('isMulti') === true);

  // 終了 → 記録フォーム
  // 動いているタイマーは時計から経過を取り直すので、止めてから経過を入れる
  G(`pauseSW(); elapsedSeconds = 125;`);
  W.updateMultiDisplay();
  eq('いまの科目の経過をカウントアップで出す', document.getElementById('timer-display').textContent, '02:05');
  ok('状態欄に配分を出す', /配分 20分/.test(W.multiStatusText()), W.multiStatusText());
  G(`multiSession.segments[1].plannedMin = 1;`);
  W.updateMultiDisplay();
  ok('配分を超えたら表示を超過の色にする', document.getElementById('timer-display').classList.contains('is-overtime'));
  G(`multiSession.segments[1].plannedMin = 20;`);
  G(`finishSession(true)`);
  const ov = document.getElementById('multi-finish-overlay');
  ok('科目ごとの記録フォームが出る', !!ov);
  eq('フォームの行', ov.querySelectorAll('[data-multi-confirm]').length, 2);
  eq('手を付けなかった科目は0分・0問', [ov.querySelector('[data-multi-confirm="0"] .mc-min').value, ov.querySelector('[data-multi-confirm="0"] .mc-solved').value], ['0', '0']);
  eq('実績の初期値（分に丸め）', ov.querySelector('[data-multi-confirm="1"] .mc-min').value, '2');
  ov.querySelector('[data-multi-confirm="1"] .mc-correct').value = '99';
  eq('正解数が多すぎると止める', W.readMultiConfirm(ov).error, '正解数が問題数を超えています');
  ov.querySelector('[data-multi-confirm="1"] .mc-correct').value = '10';
  ov.querySelector('[data-multi-confirm="1"] .mc-min').value = '0';
  eq('全部0分なら止める', W.readMultiConfirm(ov).error, '実績時間が1分以上の科目がありません');
  ov.querySelector('[data-multi-confirm="1"] .mc-min').value = '2';
  ok('正しい入力は通る', !W.readMultiConfirm(ov).error);

  // 描き直しても記録フォームは出直す（リロード相当）
  await W.renderStudy();
  ok('描き直しでも記録フォームが出る', !!document.getElementById('multi-finish-overlay'));
  ok('単一科目の記録フォームは出さない', !document.getElementById('confirm-duration'));

  // デモ環境で保存 → リセット
  document.getElementById('btn-multi-save').click();
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
  ok('保存後は記録フォームが閉じる', !document.getElementById('multi-finish-overlay'));
  ok('保存後はセッションが終わる', !G('multiSession.id') && !G('isConfirmingLog'));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\n--- failures ---\n' + failures.join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
