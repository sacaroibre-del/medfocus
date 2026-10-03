// 本番模試のブロック別（block_seconds / block_limit_min / block_questions / block_correct）のテスト。
//   node test_mock_blocks.cjs
// 集計・インサイトのカード・AI分析用エクスポート・保存する列を確かめる。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="page-container"></div><div id="toast-notif"></div></body>',
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
code += "\nwindow.__reset = () => { invalidateCache(); _planSyncAt = 0; blockSecondsColumnMissing = false; };";
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

// 60分×4ブロック。B1・B2 は余裕、B3 は時間切れ、B4 は採点済み。後半で落ちる
const s1 = {
  id: 11, subject_name: 'mock-exam', duration_minutes: 200, activity: 'other',
  started_at: '2026-09-20T01:00:00.000Z',
  block_seconds: [2400, 3000, 3590, 3000], block_limit_min: 60,
  block_questions: [60, 60, 60, 60], block_correct: [54, 51, 42, 39]
};
// 採点していない回（新しい）
const s2 = {
  id: 12, subject_name: 'mock-exam', duration_minutes: 100, activity: 'other',
  started_at: '2026-09-27T01:00:00.000Z',
  block_seconds: [3000, 3000], block_limit_min: 60, block_questions: null, block_correct: null
};
const plain = { id: 13, subject_name: '2C', duration_minutes: 30, started_at: '2026-09-27T05:00:00.000Z' };

(async () => {
  // ---------- 1. 集計 ----------
  const st = W.buildMockBlockStats([plain, s1, s2]);
  ok('本番模試の行だけを拾う', st.hasData && st.sessions.length === 2, st.sessions.length);
  eq('新しい順', st.sessions.map(x => x.id), [12, 11]);
  eq('採点していない回を数える', st.unscored, 1);
  eq('回の正答率', [st.sessions[1].totalC, st.sessions[1].totalQ, Math.round(st.sessions[1].acc)], [186, 240, 78]);
  eq('ブロック番号ごとの正答率', st.byIndex.map(x => x.acc === null ? null : Math.round(x.acc)), [90, 85, 70, 65]);
  eq('ブロック番号ごとの回数（採点なしの回も時間は数える）', st.byIndex.map(x => x.sessions), [2, 2, 1, 1]);
  eq('前半・後半', [Math.round(st.halves.first), Math.round(st.halves.last), Math.round(st.halves.diff)], [88, 68, -20]);
  eq('時間切れまで使ったブロック', [st.timeoutBlocks, st.limitedBlocks], [1, 6]);
  eq('1問あたりの秒数（採点済みのブロックだけ）', Math.round(st.secPerQ), Math.round(11990 / 240));
  ok('記録が無ければ hasData=false', W.buildMockBlockStats([plain]).hasData === false);
  // 古い行（持ち時間なし）でも落ちない
  const noLimit = W.buildMockBlockStats([{ id: 1, started_at: '2026-09-01T00:00:00Z', block_seconds: [100] }]);
  eq('持ち時間が無い行は余りを出さない', [noLimit.leftAvgSec, noLimit.limitedBlocks, noLimit.halves], [null, 0, null]);

  // ---------- 2. インサイトのカード ----------
  const html = W.mockBlockCardHTML(st);
  ok('カード: 後半の失速を言う', html.includes('後半で 20pt 落ちています'), html.slice(0, 200));
  ok('カード: 時間切れを言う', html.includes('1/6'));
  ok('カード: 採点していない回の案内', html.includes('正答数が入っていない回が 1回'));
  eq('カード: 記録が無ければ出さない', W.mockBlockCardHTML(W.buildMockBlockStats([plain])), '');

  // ---------- 3. AI分析用エクスポート ----------
  const md = W.buildAiExportMarkdown({ todayKey: '2026-10-02', logs: [plain, s1, s2] });
  ok('エクスポート: 見出しがある', md.includes('## 本番模試のブロック別'), md);
  ok('エクスポート: ブロックごとの時間と正答率', md.includes('B1 40分 54/60（90%）'), md);
  ok('エクスポート: 採点していないブロック', md.includes('B1 50分 正答数未入力'));
  ok('エクスポート: 前半と後半', md.includes('88% → 68%（-20ポイント）'));
  ok('エクスポート: 分析の依頼に入る', /\n\d+\. 「本番模試のブロック別」から/.test(md));
  const mdNone = W.buildAiExportMarkdown({ todayKey: '2026-10-02', logs: [plain] });
  ok('エクスポート: 記録が無ければ見出しも依頼も出さない',
     !mdNone.includes('本番模試のブロック別'));

  // ---------- 4. 保存する列 ----------
  function fakeSupabase(opts = {}) {
    const calls = { inserts: [] };
    return {
      calls,
      from(table) {
        const chain = {
          select() { return chain; }, eq() { return chain; }, order() { return chain; },
          range() { return chain; }, in() { return chain; }, update() { return chain; },
          insert(rows) {
            calls.inserts.push({ table, rows: JSON.parse(JSON.stringify(rows)) });
            if (opts.missing && rows.some(r => 'block_seconds' in r)) {
              return Promise.resolve({ error: { message: "Could not find the 'block_correct' column of 'study_logs' in the schema cache" } });
            }
            return Promise.resolve({ data: rows, error: null });
          },
          then(res, rej) { return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej); }
        };
        return chain;
      }
    };
  }
  const ses = { user: { id: 'u1' } };
  const blocks = `{ seconds: [3000, 2900], limitMin: 60, questions: [60, null], correct: [50, null] }`;

  let sb = fakeSupabase();
  W.__setEnv(sb, ses); W.__reset();
  let saved = await G(`saveStudyLog('mock-exam', 98, '', 3, '自宅', null, null, null, 'cbt', 'other', null, null, null, null, null, null, ${blocks})`);
  let row = sb.calls.inserts.find(i => i.table === 'study_logs').rows[0];
  ok('保存: 成功', saved === true);
  eq('保存: 4列', [row.block_seconds, row.block_limit_min, row.block_questions, row.block_correct],
     [[3000, 2900], 60, [60, null], [50, null]]);

  sb = fakeSupabase();
  W.__setEnv(sb, ses); W.__reset();
  await G(`saveStudyLog('mock-exam', 98, '', 3, '自宅', null, null, null, 'cbt', 'other', null, null, null, null, null, null, { seconds: [3000], limitMin: 60, questions: [null], correct: [null] })`);
  row = sb.calls.inserts.find(i => i.table === 'study_logs').rows[0];
  ok('保存: 正答数が1つも無ければ正答数の列は送らない', !('block_questions' in row) && row.block_seconds.length === 1, row);

  sb = fakeSupabase();
  W.__setEnv(sb, ses); W.__reset();
  await G(`saveStudyLog('2C', 30, '', 3, '自宅', null, null, null, 'cbt', 'qb', null, null, null, null, null, null, null)`);
  row = sb.calls.inserts.find(i => i.table === 'study_logs').rows[0];
  ok('保存: 本番模試以外はブロックの列を送らない', !Object.keys(row).some(k => k.startsWith('block_')), row);

  sb = fakeSupabase({ missing: true });
  W.__setEnv(sb, ses); W.__reset();
  saved = await G(`saveStudyLog('mock-exam', 98, '', 3, '自宅', null, null, null, 'cbt', 'other', null, null, null, null, null, null, ${blocks})`);
  const tries = sb.calls.inserts.filter(i => i.table === 'study_logs');
  ok('列が未作成: 保存は成功する', saved === true);
  eq('列が未作成: 2回目はブロックの列をすべて落とす', tries.map(t => Object.keys(t.rows[0]).filter(k => k.startsWith('block_')).length), [4, 0]);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\n--- failures ---\n' + failures.join('\n')); process.exit(1); }
})();
