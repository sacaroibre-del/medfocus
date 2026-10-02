// 「間違えた問題のみ」の回（復習セッション）のテスト。
//   node test_review_session.cjs
// is_review / review_wrong_numbers の保存・古い行の読み方・周回の間違いリストを
// 変えないこと・インサイトの正答率が通常の回だけで出ることを確かめる。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="app"><aside id="sidebar"></aside><main id="main-content"><div id="page-container"></div></main></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost/' }
);
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
window.requestAnimationFrame = (cb) => cb();

let code = fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/import\.meta\.env/g, '({})');
code += "\nwindow.__setEnv = (sb, ses) => { supabase = sb; session = ses; isDemoMode = false; };";
code += "\nwindow.__reset = () => { invalidateCache(); _planSyncAt = 0; reviewColumnsMissing = false; };";
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

// supabase の偽物。触ったテーブルと insert した行を記録する。
// select は rows を返す（学習ログの読み込みと、保存後の取り直しに使われる）。
function fakeSupabase(opts = {}) {
  const calls = { tables: [], inserts: [] };
  const sb = {
    calls,
    from(table) {
      calls.tables.push(table);
      const result = { data: table === 'study_logs' ? (opts.rows || []) : [], error: null, count: null };
      const chain = {
        select() { return chain; }, eq() { return chain; }, order() { return chain; },
        range() { return chain; }, delete() { return chain; }, in() { return chain; },
        upsert() { return chain; }, update() { return chain; }, single() { return chain; },
        insert(rows) {
          calls.inserts.push({ table, rows: JSON.parse(JSON.stringify(rows)) });
          if (opts.missingReview && rows.some(r => 'is_review' in r)) {
            return Promise.resolve({ error: { message: "Could not find the 'is_review' column of 'study_logs' in the schema cache" } });
          }
          const done = Promise.resolve({ data: rows, error: null });
          return Object.assign(done, { select: () => done });
        },
        then(res, rej) { return Promise.resolve(Object.assign({}, result, { count: result.data.length })).then(res, rej); }
      };
      return chain;
    }
  };
  return sb;
}
const ses = { user: { id: 'u1' } };
const tick = () => new Promise(r => setImmediate(r));
const progress = () => JSON.parse(window.localStorage.getItem('medfocus_qb_progress') || '{}');

(async () => {
  // ---------- 1. 保存する列 ----------
  eq('reviewLogFields: オフなら false / null', W.__eval('reviewLogFields(null)'),
     { is_review: false, review_wrong_numbers: null });
  eq('reviewLogFields: オンで番号あり', W.__eval('reviewLogFields({ wrongNumbers: [3, 7] })'),
     { is_review: true, review_wrong_numbers: [3, 7] });
  eq('reviewLogFields: オンで番号なしは null', W.__eval('reviewLogFields({ wrongNumbers: [] })'),
     { is_review: true, review_wrong_numbers: null });

  // ---------- 2. saveStudyLog が is_review を正しく入れる ----------
  const base = { '7D': { '1': { done: 15, total: 15, correct: 10 }, '2': { done: 3, total: 15, correct: 2 } } };

  // 通常の回
  window.localStorage.setItem('medfocus_qb_progress', JSON.stringify(base));
  let sb = fakeSupabase();
  W.__setEnv(sb, ses); W.__reset();
  let okSave = await G(`saveStudyLog('7D', 30, '', 3, '自宅', null, null, null, 'cbt', 'qb', 5, 4, null, null, { wrong: [2], unsure: [], any: true }, null)`);
  await tick(); await tick();
  const normalRow = sb.calls.inserts.find(i => i.table === 'study_logs').rows[0];
  ok('通常の回: 保存できる', okSave === true);
  eq('通常の回: is_review=false / 番号なし', [normalRow.is_review, normalRow.review_wrong_numbers], [false, null]);
  eq('通常の回: 周回は進む', progress()['7D']['2'].done, 8);
  ok('通常の回: 番号は周回の間違いリストに書く（対照）', sb.calls.tables.includes('qb_question_records'), sb.calls.tables);

  // 復習の回
  window.localStorage.setItem('medfocus_qb_progress', JSON.stringify(base));
  sb = fakeSupabase();
  W.__setEnv(sb, ses); W.__reset();
  okSave = await G(`saveStudyLog('7D', 30, '', 3, '自宅', null, null, null, 'cbt', 'qb', 5, 3, null, null, { wrong: [2], unsure: [], any: true }, { wrongNumbers: [4, 9] })`);
  await tick(); await tick();
  const reviewRow = sb.calls.inserts.find(i => i.table === 'study_logs').rows[0];
  ok('復習の回: 保存できる', okSave === true);
  eq('復習の回: is_review=true / まだ間違えた番号', [reviewRow.is_review, reviewRow.review_wrong_numbers], [true, [4, 9]]);
  eq('復習の回: 問題数と正解数はログに残す', [reviewRow.questions_solved, reviewRow.questions_correct], [5, 3]);
  eq('復習の回: 周回の進捗は変わらない', progress()['7D'], base['7D']);
  ok('復習の回: 周回の間違いリスト（qb_question_records）に触らない',
     !sb.calls.tables.includes('qb_question_records'), sb.calls.tables);

  // 列が未作成の環境: 印を落として保存は通す
  sb = fakeSupabase({ missingReview: true });
  W.__setEnv(sb, ses); W.__reset();
  okSave = await G(`saveStudyLog('7D', 30, '', 3, '自宅', null, null, null, 'cbt', 'qb', 5, 3, null, null, null, { wrongNumbers: [4] })`);
  const tries = sb.calls.inserts.filter(i => i.table === 'study_logs');
  ok('列が未作成: 保存は成功する', okSave === true);
  eq('列が未作成: 2回目は復習の列なしで送る', tries.map(t => 'is_review' in t.rows[0]), [true, false]);

  // ---------- 3. 古いデータは false として読む ----------
  const oldRow = W.__eval(`normalizeStudyLogRow({ id: 1, questions_solved: 10 })`);
  eq('古い行: is_review=false / 番号 null', [oldRow.is_review, oldRow.review_wrong_numbers], [false, null]);
  eq('古い行: isReviewLog は false', W.__eval('isReviewLog({ id: 1 })'), false);
  eq('null の is_review も false', W.__eval('normalizeStudyLogRow({ is_review: null }).is_review'), false);
  eq('番号の配列はそのまま読む', W.__eval('normalizeStudyLogRow({ is_review: true, review_wrong_numbers: [3, "7"] }).review_wrong_numbers'), [3, 7]);

  sb = fakeSupabase({ rows: [
    { id: 1, user_id: 'u1', subject_name: '7D', duration_minutes: 30, started_at: '2026-10-01T01:00:00Z' },
    { id: 2, user_id: 'u1', subject_name: '7D', duration_minutes: 30, started_at: '2026-10-01T02:00:00Z', is_review: true, review_wrong_numbers: [5] }
  ] });
  W.__setEnv(sb, ses); W.__reset();
  const fetched = await G('fetchStudyLogs()');
  eq('読み込み: 列の無い行は false、ある行はそのまま',
     fetched.map(l => [l.id, l.is_review, l.review_wrong_numbers]), [[1, false, null], [2, true, [5]]]);

  // ---------- 4. 記録フォーム ----------
  G(`selectedActivity = 'qb'`);
  const wrap = document.createElement('div');
  wrap.innerHTML = G(`qbCountFieldsHtml('-t')`);
  document.body.appendChild(wrap);
  G(`wireQbCountFields(document, '-t')`);
  const $ = id => document.getElementById(id);
  ok('フォーム: 最初はオフ・まだ間違えた番号の欄は隠れている', $('qb-review-wrong-row-t').hidden && !$('qb-mark-rows-t').hidden);
  $('qb-wrong-only-t').click();
  ok('フォーム: オンでまだ間違えた番号の欄が出て、周回用の番号欄は隠れる', !$('qb-review-wrong-row-t').hidden && $('qb-mark-rows-t').hidden);
  $('qb-solved-t').value = '8'; $('qb-correct-t').value = '5';
  $('qb-review-wrong-t').value = '３、7，12-14';   // 既存の番号欄と同じ書き方を受ける
  $('qb-wrong-t').value = '1,2';                  // 隠れた欄の値は使わない
  const counts = G(`readQbCounts('-t')`);
  eq('フォーム: まだ間違えた番号を既存と同じ形式で読む', counts.review, { wrongNumbers: [3, 7, 12, 13, 14] });
  eq('フォーム: 復習の回は周回用の番号を返さない', G(`readQbMarks('-t')`).any, false);
  $('qb-solved-t').value = ''; $('qb-correct-t').value = '';
  ok('フォーム: 問題数が空でも復習の印は返す', G(`readQbCounts('-t')`).review !== null);
  $('qb-wrong-only-t').click();
  eq('フォーム: オフに戻すと review は null', G(`readQbCounts('-t')`).review, null);
  wrap.remove();

  // ---------- 5. インサイトの正答率は通常の回だけ ----------
  const today = new Date(2026, 9, 2, 12);
  const at = (d, h) => new Date(2026, 9, d, h).toISOString();
  const log = (id, d, solved, correct, review) => W.__eval(`normalizeStudyLogRow(${JSON.stringify({
    id, subject_name: '7D', duration_minutes: 60, started_at: at(d, 10), ended_at: at(d, 11),
    activity: 'qb', questions_solved: solved, questions_correct: correct, is_review: review
  })})`);
  const logs = [log(1, 1, 20, 16, false), log(2, 1, 10, 2, true), log(3, 2, 20, 14, false), log(4, 2, 10, 4, true)];
  W.__logs = logs; W.__today = today;
  const trend = G('buildAccuracyTrend(window.__logs, window.__today)');
  const wk = trend.buckets[trend.buckets.length - 1];
  eq('推移: 通常の回だけで正答率（30/40=75%）', [wk.solved, wk.correct, wk.accuracy], [40, 30, 75]);
  eq('推移: 復習正答率は別に出す（6/20=30%）', [wk.reviewSolved, wk.reviewCorrect, wk.reviewAccuracy], [20, 6, 30]);
  eq('推移: 期間通算の復習正答率', [trend.review.solved, trend.review.correct, trend.review.sessions], [20, 6, 2]);
  eq('qbSessionsOf: 既定は通常の回だけ', G('qbSessionsOf(window.__logs)').map(x => x.log.id), [1, 3]);
  eq('qbSessionsOf: review で復習の回だけ', G('qbSessionsOf(window.__logs, { review: true })').map(x => x.log.id), [2, 4]);
  const q = G('buildQbQualityStats(accuracyLogsOf(window.__logs), {})');
  eq('条件別の正答率: 通常の回だけ', [q.solved, q.correct], [40, 30]);
  eq('accuracyLogsOf: 時間は残す', G('accuracyLogsOf(window.__logs)').map(l => l.duration_minutes), [60, 60, 60, 60]);
  eq('古いデータだけなら全部通常の回として数える',
     G(`buildAccuracyTrend([{ subject_name: '7D', duration_minutes: 60, started_at: '${at(1, 10)}', ended_at: '${at(1, 11)}', questions_solved: 20, questions_correct: 10 }], window.__today)`).buckets.slice(-1)[0].solved, 20);

  // ---------- 6. 教材進捗の「復習」の行 ----------
  const rlog = (id, subject, solved, correct, review) => ({
    id, user_id: 'u1', subject_name: subject, duration_minutes: 30, activity: 'qb',
    started_at: new Date(2026, 9, 1, 8 + id).toISOString(),
    questions_solved: solved, questions_correct: correct, is_review: review
  });
  // 2C は表示名でも ID でも引けること（学習ログには両方入りうる）
  const name2C = W.__eval(`normalizeSubjectName('2C')`);
  const reviewLogs = [
    rlog(1, '2C', 10, 6, true), rlog(2, name2C, 20, 12, true),   // 2C: 30問中18問 → 60%
    rlog(3, '2C', 40, 30, false),                                  // 通常の回は数えない
    rlog(4, '1D', 5, null, true),                                  // 正解数なし → 正答率は出さない
    rlog(5, '3D', 15, 10, false)                                   // 3D は復習なし
  ];
  W.__rl = reviewLogs;
  const totals = G('buildReviewTotals(window.__rl.map(l => normalizeStudyLogRow(Object.assign({}, l))))');
  eq('集計: 2C は復習の回だけ・ID と表示名をまとめる', [totals['2C'].solved, totals['2C'].correct, totals['2C'].accPct, totals['2C'].sessions], [30, 18, 60, 2]);
  eq('集計: 正解数なしの回は問題数だけ', [totals['1D'].solved, totals['1D'].accPct], [5, null]);
  ok('集計: 復習の無い教材は入らない', !('3D' in totals), Object.keys(totals));
  ok('行: 「復習：累計30問（正答率60%）」の中身', /累計30問（正答率60%）/.test(G(`qbReviewRowHtml('2C', ${JSON.stringify(totals)})`)));
  eq('行: 復習の無い教材は空', G(`qbReviewRowHtml('3D', ${JSON.stringify(totals)})`), '');

  // 実際の教材進捗ページを描画する。復習ログの有無で周回の値が変わらないことも見る
  const qbBase = {
    '2C': { '1': { done: 40, total: 100, correct: 30 } },
    '3D': { '1': { done: 15, total: 50, correct: 10 } }
  };
  const renderTracker = async (rows) => {
    window.localStorage.setItem('medfocus_qb_progress', JSON.stringify(qbBase));
    const sb = fakeSupabase({ rows: rows.map(r => Object.assign({}, r)) });
    W.__setEnv(sb, ses); W.__reset();
    G('qbProgressLoaded = false; videoProgressLoaded = false;');
    await G('renderQBProgress()');
    await tick();
    const ct = document.getElementById('page-container');
    const rounds = {};
    ct.querySelectorAll('.qb-done').forEach(el => { rounds[el.dataset.sub + '|' + el.dataset.round] = [el.value, ct.querySelector(`.qb-total[data-sub="${el.dataset.sub}"][data-round="${el.dataset.round}"]`).value]; });
    return {
      rows: [...ct.querySelectorAll('[data-review-row]')].map(el => [el.dataset.reviewRow, el.textContent.replace(/\s+/g, '')]),
      rounds, progress: progress(), tables: sb.calls.tables
    };
  };
  const withReview = await renderTracker(reviewLogs);
  const byId = list => list.slice().sort((a, b) => a[0].localeCompare(b[0]));
  eq('描画: 復習ログのある教材だけに行が出る', byId(withReview.rows), [['1D', '復習累計5問'], ['2C', '復習累計30問（正答率60%）']]);
  const without = await renderTracker(reviewLogs.filter(l => !l.is_review));
  eq('描画: 復習ログが無ければ行は1つも出ない', without.rows, []);
  eq('描画: 周回の進捗（保存値）は復習ログの有無で同じ', withReview.progress, without.progress);
  eq('描画: 画面の○周目の値も復習ログの有無で同じ', withReview.rounds, without.rounds);
  eq('描画: 2C 1周目は登録どおり', withReview.rounds['2C|1'], ['40', '100']);
  ok('描画: 周回の進捗の保存値は元のまま',
     withReview.progress['2C']['1'].done === 40 && withReview.progress['2C']['1'].correct === 30, withReview.progress['2C']);

  // ---------- 7. その日の勉強分析 ----------
  {
    const day = (h, solved, correct, review) => ({ subject_name: '2C', duration_minutes: 30, activity: 'qb',
      started_at: new Date(2026, 9, 2, h).toISOString(), questions_solved: solved, questions_correct: correct, is_review: review });
    W.__day = [day(9, 30, 24, false), day(11, 10, 3, true), day(13, 20, null, false)];
    const agg = G('aggregateReviewDay(window.__day)');
    eq('その日: 問題数は復習込みの合計と内訳', [agg.solved, agg.reviewSolved], [60, 10]);
    eq('その日: 正答率は通常の回だけ（24/30）', [agg.correct, agg.accSolved, Math.round(agg.accuracy)], [24, 30, 80]);
    eq('その日: 復習正答率は別（3/10）', [agg.reviewCorrect, agg.reviewAccSolved, Math.round(agg.reviewAccuracy)], [3, 10, 30]);
    const rv = G('buildDailyReview(window.__day, new Date(2026, 9, 2, 12))');
    eq('その日: 画面に渡す値も同じ', [rv.qb.solved, rv.qb.reviewSolved, Math.round(rv.qb.accuracy), Math.round(rv.qb.reviewAccuracy)], [60, 10, 80, 30]);
    W.__day = [day(9, 30, 24, false)];
    const plain = G('aggregateReviewDay(window.__day)');
    eq('その日: 復習が無ければ内訳 0・復習正答率なし', [plain.reviewSolved, plain.reviewAccuracy], [0, null]);
  }

  // ---------- 8. 逆算プランのノルマ ----------
  {
    const plan = { id: 'p1', subject_id: '2C', unit: 'q', start_date: '2026-09-28', due_date: '2026-10-10', total_volume: 200 };
    const atD = (d, h) => new Date(2026, 9, d, h).toISOString();
    const normal = [
      { subject_name: '2C', started_at: atD(1, 10), questions_solved: 20 },
      { subject_name: '2C', started_at: atD(2, 10), questions_solved: 15 }
    ];
    const review = [
      { subject_name: '2C', started_at: atD(2, 14), questions_solved: 12, is_review: true },
      { subject_name: '2C', started_at: atD(1, 14), questions_solved: 8, is_review: true }
    ];
    const tasks = [
      { id: 't1', plan_id: 'p1', due_date: '2026-10-01', kind: 'quota', target_amount: 20, done_amount: 0, completed: false, seq: 1 },
      { id: 't2', plan_id: 'p1', due_date: '2026-10-02', kind: 'quota', target_amount: 20, done_amount: 0, completed: false, seq: 2 }
    ];
    W.__plan = plan; W.__tasks = tasks;
    const run = logs => { W.__pl = logs; return G(`(() => {
      const byDay = planDoneByDayFromLogs(window.__plan, window.__pl);
      const ap = planApplyLogs(window.__plan, window.__tasks, byDay);
      const prog = planProgress(window.__plan, ap, '2026-10-02');
      const rb = rebuildPlanSchedule(window.__plan, ap, '2026-10-02');
      return { byDay, todayDone: prog.todayDone, done: prog.done, remaining: rb.remaining, perDay: rb.perDay };
    })()`); };
    const without = run(normal);
    const withR = run(normal.concat(review));
    eq('ノルマ: 消化量は通常の回だけ', withR.byDay, { '2026-10-01': 20, '2026-10-02': 15 });
    eq('ノルマ: 復習を足しても今日の実績・残り・1日あたりが同じ',
       [withR.todayDone, withR.done, withR.remaining, withR.perDay], [without.todayDone, without.done, without.remaining, without.perDay]);
    eq('ノルマ: 今日の復習は別に数える', G(`planReviewOnDay(window.__plan, ${JSON.stringify(normal.concat(review))}, '2026-10-02')`), 12);
    eq('ノルマ: 復習の無い日は 0', G(`planReviewOnDay(window.__plan, ${JSON.stringify(normal)}, '2026-10-02')`), 0);
    eq('ノルマ: 動画のプランでは数えない', G(`planReviewOnDay(Object.assign({}, window.__plan, { unit: 'video' }), ${JSON.stringify(review)}, '2026-10-02')`), 0);
    eq('ノルマ: 0問なら表示しない', G('planReviewTodayHTML(0)'), '');
    ok('ノルマ: 「今日の復習：12問」', /今日の復習：12問/.test(G('planReviewTodayHTML(12)')));
  }

  // ---------- 9. カレンダー ----------
  {
    const T = '2026-10-02';
    const cal = logs => { W.__cl = logs; return G(`buildCalendarModel('${T}', 'week', { todayKey: '${T}', plansById: {}, logs: window.__cl })`)
      .weeks[0].find(c => c.dateKey === T).items.find(i => i.logKind === 'qb'); };
    const base = [
      { subject_name: '2C', activity: 'qb', duration_minutes: 30, questions_solved: 20, questions_correct: 15, started_at: T + 'T09:00:00' }
    ];
    const rv = { subject_name: '2C', activity: 'qb', duration_minutes: 30, questions_solved: 10, questions_correct: 2, is_review: true, started_at: T + 'T11:00:00' };
    const plain = cal(base), mixed = cal(base.concat([rv]));
    eq('カレンダー: 問題数は復習込みで内訳付き', mixed.title, 'qb30問（うち復習10）');
    ok('カレンダー: 吹き出しにも内訳', mixed.tooltip.startsWith('問題演習 30問（うち復習10）'), mixed.tooltip);
    const pct = t => (t.match(/(\d+)%/) || [])[1];
    eq('カレンダー: 復習を足しても正答率は同じ（通常の回 15/20）', [pct(plain.tooltip), pct(mixed.tooltip)], ['75', '75']);
    eq('カレンダー: 復習が無い日は今までどおり', [plain.title, plain.tooltip], ['qb20問', '問題演習 20問（15問正解 75%）']);
  }

  // ---------- 10. 試験逆算ペースメーター（直近7日の問/日） ----------
  {
    const now = new Date();
    const ago = d => { const x = new Date(now); x.setDate(x.getDate() - d); x.setHours(12, 0, 0, 0); return x.toISOString(); };
    const base = [{ questions_solved: 40, started_at: ago(1) }, { questions_solved: 30, started_at: ago(3) }];
    const withRv = base.concat([{ questions_solved: 50, started_at: ago(2), is_review: true }]);
    W.__p1 = base; W.__p2 = withRv;
    const p1 = G('recentQuestionPace(window.__p1, [], 7)'), p2 = G('recentQuestionPace(window.__p2, [], 7)');
    eq('ペース: 復習を足しても問/日は同じ', [p2.total, p2.perDay, p2.source], [p1.total, p1.perDay, 'session']);
    eq('ペース: 通常の回だけの合計', p1.total, 70);
    W.__p3 = [{ questions_solved: 50, started_at: ago(2), is_review: true }];
    W.__snap = [{ date: G('toLocalDateKey(getLogicalDate(new Date()))'), qbDone: 14 }];
    const p3 = G('recentQuestionPace(window.__p3, window.__snap, 7)');
    eq('ペース: 復習の回しか無ければ今までどおりスナップショットへ', [p3.source, p3.total], ['snapshot', 14]);
  }

  // ---------- 11. 1問あたりの時間 ----------
  {
    // 通常の回: 2C を 60分で40問 → 1.5分/問。1D は復習の回しかない
    const base = [
      { subject_name: '2C', activity: 'qb', duration_minutes: 60, questions_solved: 40 },
      { subject_name: '2C', activity: 'qb', duration_minutes: 30, questions_solved: 20 },
      { subject_name: '3D', activity: 'qb', duration_minutes: 90, questions_solved: 60 }
    ];
    const reviews = [
      { subject_name: '2C', activity: 'qb', duration_minutes: 60, questions_solved: 10, is_review: true },
      { subject_name: '1D', activity: 'qb', duration_minutes: 90, questions_solved: 30, is_review: true }
    ];
    W.__u1 = base; W.__u2 = base.concat(reviews);
    const u1 = G('buildUnitCost(window.__u1)'), u2 = G('buildUnitCost(window.__u2)');
    eq('単価: 復習を足しても全体の1問あたりは同じ', [u2.minPerQuestion, u2.questionSamples], [u1.minPerQuestion, u1.questionSamples]);
    eq('単価: 通常の回だけ（180分/120問）', u1.minPerQuestion, 1.5);
    const s1 = G('buildUnitCostBySubject(window.__u1)'), s2 = G('buildUnitCostBySubject(window.__u2)');
    eq('科目別: 復習を足しても 2C は同じ', s2['2c'], s1['2c']);
    ok('科目別: 復習の回しかない科目は実測を持たない', !('1d' in s2), Object.keys(s2));
    eq('フォールバック: 復習だけの科目は全体の実測（1.5分）',
       G('minutesPerQuestionFor("1D", buildUnitCost(window.__u2), buildUnitCostBySubject(window.__u2))'), 1.5);
    W.__u3 = reviews;
    const u3 = G('buildUnitCost(window.__u3)');
    eq('フォールバック: 通常の回が1つも無ければ実測なし（0除算しない）', [u3.minPerQuestion, u3.hasQuestion], [null, false]);
    eq('フォールバック: そのときは仮の単価', G('minutesPerQuestionFor("1D", buildUnitCost(window.__u3), buildUnitCostBySubject(window.__u3))'),
       G('PLAN_FALLBACK_MIN_PER_QUESTION'));
    // 優先順位・順番詰めは minutesPerQuestionFor 経由。複数科目の配分も同じ2関数を使う
    eq('複数科目の配分: 同じ単価を使う', G('(() => { const c = { unit: buildUnitCost(window.__u2), bySubject: buildUnitCostBySubject(window.__u2) }; return minutesPerQuestionFor("2C", c.unit, c.bySubject); })()'),
       G('minutesPerQuestionFor("2C", buildUnitCost(window.__u1), buildUnitCostBySubject(window.__u1))'));
  }

  console.log();
  if (failures.length) {
    console.log('--- 失敗 ---');
    failures.forEach(f => console.log('  ✗ ' + f));
    console.log();
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
