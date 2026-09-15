// 逆算プランの「まとめて追加」の描画・作成テスト。
//   node test_plan_bulk.cjs
// 科目ごとの初期値（残り・登録済み・進捗なし）と、まとめて作ったときに
// プランとノルマが科目ぶんできることを確かめる。
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!DOCTYPE html><body><div id="app"></div><div id="page-container"></div><div id="toast-notif"></div></body>',
  { runScripts: 'outside-only', url: 'http://localhost' }
);
const window = dom.window;
global.window = window;
global.document = window.document;
const store = window.localStorage;
global.localStorage = store;
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
window.requestAnimationFrame = (cb) => cb();
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

// 2A は残り120問、2C は解き終わり、2D は進捗なし
store.setItem('medfocus_qb_progress', JSON.stringify({
  '2A': { '1': { done: 80, total: 200 } },
  '2C': { '1': { done: 150, total: 150 } }
}));
store.setItem('medfocus_video_progress', JSON.stringify({ '2A': { kokushi: { done: 1, total: 20 } } }));

// 作成ボタンの後片付け（close()）は await の続きなので、マイクロタスクを1回流す。
// 前のモーダルが残っていると id が重なって querySelector が効かなくなる。
const tick = () => new Promise(r => queueMicrotask(r));

const todayKey = W.todayPlanKey();
const shift = (n) => W.shiftDateKey(todayKey, n);
const closeAll = () => document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
const open = (plans) => {
  closeAll();
  const before = document.querySelectorAll('.modal-overlay').length;
  W.openBulkPlanWizard(() => {}, plans || []);
  const all = document.querySelectorAll('.modal-overlay');
  ok('モーダルが開く', all.length === before + 1);
  return all[all.length - 1];
};
const row = (modal, sid) => modal.querySelector(`[data-bw-sub="${sid}"]`).closest('.plan-bulk-row');

async function main() {
// ---------- 科目ごとの初期値 ----------
{
  const modal = open([{ id: 'p1', status: 'active', subject_id: '2B', unit: 'q', target_round: 1 }]);
  modal.querySelector('#bw-due').value = shift(30);

  ok('残りがある科目は選択済み', modal.querySelector('[data-bw-sub="2A"]').checked);
  eq('残りが総量の初期値になる', modal.querySelector('[data-bw-vol="2A"]').value, '120');
  ok('解き終わった科目は外れる', !modal.querySelector('[data-bw-sub="2C"]').checked);
  ok('解き終わった科目は理由が出る', row(modal, '2C').textContent.includes('消化済み'));
  ok('進捗のない科目は外れる', !modal.querySelector('[data-bw-sub="2D"]').checked);
  ok('進捗のない科目は理由が出る', row(modal, '2D').textContent.includes('教材進捗なし'));
  ok('登録済みの科目は選べない', modal.querySelector('[data-bw-sub="2B"]').disabled);
  ok('登録済みの科目は理由が出る', row(modal, '2B').textContent.includes('登録済み'));
  ok('登録済みの科目には総量欄が出ない', !modal.querySelector('[data-bw-vol="2B"]'));
  ok('選択件数が出る', modal.querySelector('#bw-count').textContent === '選択 1件', modal.querySelector('#bw-count').textContent);

  // 総量を入れたら、その科目は自動でチェックが入る
  const vol = modal.querySelector('[data-bw-vol="2D"]');
  vol.value = '60';
  vol.dispatchEvent(new window.Event('input', { bubbles: true }));
  ok('総量を入れると選択に入る', modal.querySelector('[data-bw-sub="2D"]').checked);
  ok('選択件数が増える', modal.querySelector('#bw-count').textContent === '選択 2件');

  // 全解除 → 何も選ばずに進むと止まる
  modal.querySelector('[data-bw-none]').click();
  ok('全解除で0件', modal.querySelector('#bw-count').textContent === '選択 0件');
  modal.querySelector('#bw-next').click();
  ok('0件では次へ進めない', modal.querySelector('#bw-step2').style.display === 'none');
  modal.querySelector('[data-bw-all]').click();
  ok('全選択では登録済みは除く', !modal.querySelector('[data-bw-sub="2B"]').checked);
  closeAll();
}

// ---------- 総量が空のまま進もうとしたとき ----------
{
  const modal = open([]);
  modal.querySelector('#bw-due').value = shift(30);
  modal.querySelector('[data-bw-none]').click();
  const box = modal.querySelector('[data-bw-sub="2D"]');   // 進捗なし＝総量は空
  box.checked = true;
  modal.querySelector('#bw-next').click();
  ok('総量が空なら進まない', modal.querySelector('#bw-step2').style.display === 'none');
  closeAll();
}

// ---------- 講義動画 ----------
{
  const modal = open([]);
  modal.querySelector('[data-bw-unit="video"]').click();
  ok('動画では周回が消える', modal.querySelector('#bw-round-field').style.display === 'none');
  ok('動画では版が出る', modal.querySelector('#bw-edition-field').style.display !== 'none');
  eq('動画の残りが総量の初期値になる', modal.querySelector('[data-bw-vol="2A"]').value, '19');
  // 国試版を明示すると、国試版の無い基礎医学は選べない
  modal.querySelector('#bw-edition').value = 'kokushi';
  modal.querySelector('#bw-edition').dispatchEvent(new window.Event('change'));
  ok('国試版の無い科目は選べない', modal.querySelector('[data-bw-sub="1A"]').disabled);
  ok('国試版のある科目は選べる', !modal.querySelector('[data-bw-sub="2A"]').disabled);
  closeAll();
}

// ---------- プレビューと作成 ----------
{
  store.setItem('medfocus_study_plans', '[]');
  store.setItem('medfocus_plan_tasks', '[]');
  const modal = open([]);
  modal.querySelector('#bw-due').value = shift(9);   // 今日を含めて10日
  modal.querySelector('[data-bw-none]').click();
  modal.querySelector('[data-bw-sub="2A"]').checked = true;
  modal.querySelector('[data-bw-vol="2A"]').value = '100';
  modal.querySelector('[data-bw-sub="2C"]').checked = true;
  modal.querySelector('[data-bw-vol="2C"]').value = '50';
  modal.querySelector('#bw-next').click();

  const pv = modal.querySelector('#bw-preview').textContent;
  ok('プレビューに件数が出る', pv.includes('2件'));
  ok('プレビューに合計が出る', pv.includes('150問'), pv);
  ok('プレビューに1日あたりが出る', pv.includes('1日 10問') && pv.includes('1日 5問'), pv);
  ok('作成ボタンが出る', modal.querySelector('#bw-create').style.display !== 'none');

  modal.querySelector('#bw-create').click();
  await tick();
  const plans = JSON.parse(store.getItem('medfocus_study_plans'));
  const tasks = JSON.parse(store.getItem('medfocus_plan_tasks'));
  ok('プランが2件できる', plans.length === 2, plans.map(p => p.title));
  ok('締切が揃う', plans.every(p => p.due_date === shift(9)));
  ok('タイトルに科目と周回が入る', plans[0].title.includes('2A') && plans[0].title.includes('1周目'), plans[0].title);
  eq('総量が入る', plans.map(p => p.total_volume).sort((a, b) => a - b), [50, 100]);
  ok('ノルマが日数ぶんできる', tasks.length === 20, tasks.length);
  ok('ノルマがプランに紐づく', tasks.every(t => plans.some(p => p.id === t.plan_id)));
  eq('2Aの1日あたり', tasks.filter(t => t.plan_id === plans[0].id).map(t => t.target_amount),
     new Array(10).fill(10));
  ok('作成したらモーダルが閉じる', !document.body.contains(modal));
}

// ---------- 件数の上限は無い ----------
{
  const modal = open([]);
  modal.querySelector('#bw-due').value = shift(4);   // 今日を含めて5日
  modal.querySelector('[data-bw-none]').click();
  const boxes = [...modal.querySelectorAll('[data-bw-sub]:not(:disabled)')].slice(0, 45);
  ok('科目は45件以上ある（vol.4 を含む）', boxes.length === 45);
  boxes.forEach(b => {
    b.checked = true;
    modal.querySelector(`[data-bw-vol="${b.dataset.bwSub}"]`).value = '10';
  });
  modal.querySelector('#bw-next').click();
  ok('40件を超えても進める', modal.querySelector('#bw-step2').style.display !== 'none');
  const pv = modal.querySelector('#bw-preview').textContent;
  ok('プレビューに件数が出る', pv.includes('45件'), pv.slice(0, 120));
  ok('作るノルマの行数が出る', pv.includes('ノルマ 225行'), pv.slice(0, 160));
  closeAll();
}

// ---------- 休みの曜日 ----------
{
  store.setItem('medfocus_study_plans', '[]');
  store.setItem('medfocus_plan_tasks', '[]');
  const modal = open([]);
  modal.querySelector('#bw-due').value = shift(13);   // 今日を含めて14日＝2週
  modal.querySelectorAll('[data-dow]').forEach(c => { if (Number(c.dataset.dow) === 0) c.checked = false; });
  modal.querySelector('[data-bw-none]').click();
  modal.querySelector('[data-bw-sub="2A"]').checked = true;
  modal.querySelector('[data-bw-vol="2A"]').value = '120';
  modal.querySelector('#bw-next').click();
  modal.querySelector('#bw-create').click();
  await tick();
  const plans = JSON.parse(store.getItem('medfocus_study_plans'));
  const tasks = JSON.parse(store.getItem('medfocus_plan_tasks'));
  eq('休みの曜日が保存される', plans[0].exclude_weekdays, [0]);
  ok('日曜にはノルマを置かない', tasks.every(t => W.parseDateKey(t.due_date).getDay() !== 0), tasks.map(t => t.due_date));
  ok('稼働日ぶんだけノルマができる', tasks.length === 12, tasks.length);
}

}

main().then(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('\n--- 失敗 ---'); failures.forEach(f => console.log('  ' + f)); process.exit(1); }
});
