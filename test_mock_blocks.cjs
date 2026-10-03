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

  // ---------- 5. 学習ログの編集フォーム ----------
  // B3 を 20分で押し間違えて、残り 35分が B4 になった回
  const mis = { id: 21, block_seconds: [3000, 3300, 1200, 2100, 3000], block_questions: [60, 60, 20, 40, null], block_correct: [50, 48, 15, 30, null] };
  const attr = W.blockDataAttr(mis);
  ok('data-blocks: 本番模試以外は空', W.blockDataAttr({ id: 1 }) === '');
  const mkModal = () => {
    const m = W.document.createElement('div');
    // data-* に入れたあと dataset で読む流れを通す
    const holder = W.document.createElement('div');
    holder.innerHTML = `<button data-blocks="${attr}"></button>`;
    m.innerHTML = `<input id="edit-log-duration" value="210" /><input id="edit-log-end-time" value="13:30" />` +
      W.editBlocksFieldHtml(holder.firstChild.dataset.blocks);
    W.document.body.appendChild(m);
    W.bindEditBlocks(m);
    return m;
  };
  let m = mkModal();
  const rows = () => [...m.querySelectorAll('.edit-block-row')];
  eq('編集: 行が出る', rows().map(r => r.querySelector('.edit-block-label').textContent), ['B1', 'B2', 'B3', 'B4', 'B5']);
  eq('編集: 触らなければそのまま', W.readEditBlocks(m).seconds, [3000, 3300, 1200, 2100, 3000]);
  eq('編集: 開いただけでは学習時間は動かない', m.querySelector('#edit-log-duration').value, '210');
  // B4 を B3 に合わせる
  rows()[3].querySelector('.edit-block-merge').click();
  let r = W.readEditBlocks(m);
  eq('合わせる: 時間を足す', r.seconds, [3000, 3300, 3300, 3000]);
  eq('合わせる: 問題数と正解数も足す', [r.questions, r.correct], [[60, 60, 60, null], [50, 48, 45, null]]);
  eq('合わせる: 合計は同じなので学習時間はそのまま', m.querySelector('#edit-log-duration').value, '210');
  eq('合わせる: 番号を振り直す', rows().map(x => x.querySelector('.edit-block-label').textContent), ['B1', 'B2', 'B3', 'B4']);
  // B4 の時間を 50分 → 60分 に直す
  const minEl = rows()[3].querySelector('.edit-block-min');
  minEl.value = '60'; minEl.dispatchEvent(new W.Event('input', { bubbles: true }));
  eq('分を直す: 秒に直して保存', W.readEditBlocks(m).seconds[3], 3600);
  eq('分を直す: 学習時間が10分増える', m.querySelector('#edit-log-duration').value, '220');
  eq('分を直す: 終了時刻も10分後ろへ', m.querySelector('#edit-log-end-time').value, '13:40');
  // 消す
  rows()[3].querySelector('.edit-block-del').click();
  eq('消す: 行が減って学習時間も減る', [rows().length, m.querySelector('#edit-log-duration').value], [3, '160']);
  // 正解数だけ入れたらエラー
  rows()[0].querySelector('.edit-block-q').value = '';
  ok('入力の誤り: 問題数なしはエラー', /ブロック1/.test(W.readEditBlocks(m).error || ''));
  m.remove();
  ok('ブロック欄の無い記録は null（列に触らない）', W.readEditBlocks(W.document.createElement('div')) === null);

  // 更新で送る列
  const upd = [];
  const sbU = { from() { const ch = { update(p) { upd.push(p); return ch; }, eq() { return Promise.resolve({ error: null }); } }; return ch; } };
  W.__setEnv(sbU, ses); W.__reset();
  await G(`updateStudyLog(21, '模試', 160, '2026-09-20T01:00:00.000Z', '', 3, '自宅', null, 'other', null, null, null, null, { seconds: [3000, 3300, 3300], questions: [60, 60, 60], correct: [50, 48, 45] })`);
  eq('更新: ブロックの列も送る', [upd[0].block_seconds, upd[0].block_questions, upd[0].block_correct, upd[0].duration_minutes],
     [[3000, 3300, 3300], [60, 60, 60], [50, 48, 45], 160]);
  await G(`updateStudyLog(22, '2C', 30, '2026-09-20T01:00:00.000Z', '', 3, '自宅')`);
  ok('更新: 本番模試以外はブロックの列に触らない', !Object.keys(upd[1]).some(k => k.startsWith('block_')), upd[1]);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('\n--- failures ---\n' + failures.join('\n')); process.exit(1); }
})();
