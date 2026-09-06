// 教材進捗トラッカーの描画テスト。
//   node test_render_tracker.cjs
// 版ごとの動画行を出すようになってから、進捗が画面から消える不具合が起きた。
// 「保存されている本数が必ずどこかの行に出る」ことを描画結果で確かめる。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="app"></div><div id="page-container"></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost' }
);
const window = dom.window;
global.window = window;
global.document = window.document;

// app.js の中の localStorage は window.localStorage を指すので、
// jsdom が持っている本物のほうへ書く（自前のオブジェクトを global に置いても見てくれない）。
const store = window.localStorage;
global.localStorage = store;
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

function setProgress(obj) { store.setItem('medfocus_video_progress', JSON.stringify(obj)); }
function setPrefs(obj) { store.setItem('medfocus_video_edition_prefs', JSON.stringify(obj)); }

// ---------- 科目1つぶんの動画ブロック ----------
function blockFor(sid) { return W.videoTrackerBlockHtml(sid); }

// 保存されている本数が、どれかの入力欄か固定表示に出ているか
function showsCount(html, n) {
  return html.includes(`value="${n}"`) || html.includes(`>${n}</span>`);
}

{
  // 臨床科目・国試版だけ記録あり。CBT版はまだ使っていない
  setPrefs({ default: 'cbt', primary: {} });
  setProgress({ '2C': { kokushi: { done: 3, total: 12 } } });
  const html = blockFor('2C');
  ok('国試版だけの科目: 視聴済み3本が出る', showsCount(html, 3), html.slice(0, 200));
  ok('国試版だけの科目: 総数12本が出る', showsCount(html, 12));
  ok('国試版だけの科目: 国試版の行が出る', html.includes('国試'));
  ok('国試版だけの科目: マスタから入れるボタンが出る', html.includes('data-enable-cbt="2C"'));
  // 主軸の既定はCBT版だが、記録があるのは国試版なのでピンは国試版に立つ
  ok('国試版だけの科目: ピンは記録のある版に立つ', html.indexOf('is-primary') < html.indexOf('CBT'));
}

{
  // 両方に記録がある科目
  setProgress({ '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4, total_sec: 10463 } } });
  const html = blockFor('2C');
  ok('両方ある科目: 国試版の3本が出る', showsCount(html, 3));
  ok('両方ある科目: CBT版の1本が出る', showsCount(html, 1));
  ok('両方ある科目: CBT版の総数はマスタ由来で固定表示', html.includes('vid-ed-total'));
  ok('両方ある科目: 合計時間が出る', html.includes('2.9h'), html);
  ok('両方ある科目: 行が2本ある', (html.match(/vid-ed-row/g) || []).length === 2);
}

{
  // 基礎医学。国試版は存在しないので、記録はCBT版として出る
  setProgress({ '1A': { cbt: { done: 2, total: 9 } } });
  const html = blockFor('1A');
  ok('基礎医学: 視聴済み2本が出る', showsCount(html, 2));
  ok('基礎医学: 総数9本が手入力で出る', html.includes('class="vid-total"'));
  ok('基礎医学: 国試版の行は出ない', !html.includes('>国試<'));
  ok('基礎医学: ピンは押せない（版が1つだけ）', html.includes('disabled'));
}

{
  // 存在しない版に記録が残っていても、読み込み時に移されて必ず出る
  setProgress({ '1A': { kokushi: { done: 5, total: 9 } } });
  const html = blockFor('1A');
  ok('救出: 国試版に入っていた基礎医学の5本が消えない', showsCount(html, 5), html);
}

{
  // CBT版で他科目にまとめられる科目
  setProgress({ '2A': { kokushi: { done: 4, total: 20 } } });
  const html = blockFor('2A');
  ok('含まれる科目: 国試版の4本は出る', showsCount(html, 4));
  ok('含まれる科目: 代表科目への案内が出る', html.includes('2B 肝・胆・膵'), html);
  ok('含まれる科目: CBT版の行は出ない', (html.match(/vid-ed-row/g) || []).length === 1);
}

{
  // 2A に残っていたCBT版の記録は 2B へ移るので、2B 側に出る
  setProgress({ '2A': { cbt: { done: 2, total: 3 } } });
  ok('割り当て変更: 2A のCBT版の2本は 2B に出る', showsCount(blockFor('2B'), 2), blockFor('2B'));
}

// ---------- ページ全体を描く ----------
async function renderPage() {
  setProgress({
    '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4, total_sec: 10463 } },
    '1A': { cbt: { done: 2, total: 9 } },
    '2A': { kokushi: { done: 4, total: 20 } }
  });
  store.setItem('medfocus_qb_progress', JSON.stringify({ '2C': { '1': { done: 10, total: 100, correct: 7 } } }));
  W.session = null;   // Supabase を叩かせない
  let err = null;
  try { await W.renderQBProgress(); } catch (e) { err = e; }
  ok('ページ全体: 例外なく描画できる', err === null, err && (err.stack || err.message));
  const page = document.getElementById('page-container').innerHTML;
  ok('ページ全体: 中身が出ている', page.length > 500, page.length);
  ok('ページ全体: 基礎医学の2本が出る', showsCount(page, 2));
  ok('ページ全体: 循環器の3本が出る', showsCount(page, 3));
  ok('ページ全体: 消化管はCBT版の行を持たない',
     !page.includes('data-vidfill="2A|cbt"'));
}

renderPage().then(() => {
  console.log('');
  if (failures.length) {
    console.log('--- 失敗 ---');
    failures.forEach(f => console.log('  ✗ ' + f));
    console.log('');
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
