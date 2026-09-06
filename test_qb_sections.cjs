// vol.4（多肢選択問題 / 4連問）の純関数テスト。
//   node test_qb_sections.cjs
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
// applyQbSessionToProgress は localStorage を読み書きする。
// app.js は jsdom の window.localStorage を見るので、そちらを使う。
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

// eval したコードの const は window に生えないので、定数はアクセサ関数から取る
// （関数宣言は window のプロパティになるので W.xxx で直接呼べる）。

// ---------- 科目マスタ ----------
// vol.1〜3 は 10 + 24 + 4 = 38 科目。vol.4 はその2形式ぶん。
const BASE_COUNT = 38;
const multi  = W.subjectsOfCategory('cat-vol4-multi');
const linked = W.subjectsOfCategory('cat-vol4-linked');

eq('vol.4 は多肢選択問題と4連問の2部構成',
   [W.qbSectionOf('4A2C').name, W.qbSectionOf('4B2C').name],
   ['vol.4 多肢選択問題', 'vol.4 4連問']);
eq('多肢選択問題の科目数は vol.1〜3 と同じ', multi.length, BASE_COUNT);
eq('4連問の科目数は vol.1〜3 と同じ', linked.length, BASE_COUNT);
eq('多肢選択問題は 1A から 3D まで並ぶ（先頭と末尾）',
   [multi[0], multi[BASE_COUNT - 1]],
   [{ id: '4A1A', name: '多肢選択 1A 細胞生物学' },
    { id: '4A3D', name: '多肢選択 3D 公衆衛生' }]);
eq('4連問は 1A から 3D まで並ぶ（先頭と末尾）',
   [linked[0], linked[BASE_COUNT - 1]],
   [{ id: '4B1A', name: '4連問 1A 細胞生物学' },
    { id: '4B3D', name: '4連問 3D 公衆衛生' }]);
eq('科目IDは重複しない',
   new Set(multi.concat(linked).map(s => s.id)).size, BASE_COUNT * 2);

// ---------- 本に載っている全問題数 ----------
eq('多肢選択問題は全360問', W.qbSectionOf('4A2C').questionTotal, 360);
eq('4連問は全484問', W.qbSectionOf('4B2C').questionTotal, 484);

// ---------- 科目の解決 ----------
eq('科目IDからセクションを引ける', W.qbSectionOf('4B2C').short, '4連問');
eq('表示名からもセクションを引ける', W.qbSectionOf('4連問 2C 循環器').short, '4連問');
eq('多肢選択も同様', W.qbSectionOf('4A2C').short, '多肢選択');
eq('vol.1〜3 の科目は vol.4 ではない', W.qbSectionOf('2C'), null);
eq('自由入力は vol.4 ではない', W.qbSectionOf('自習室でまとめ'), null);
eq('空文字は vol.4 ではない', W.qbSectionOf(''), null);

eq('vol.4 の科目IDは元の科目へ畳める', W.baseSubjectIdOf('4B2C'), '2C');
eq('vol.4 の表示名も元の科目へ畳める', W.baseSubjectIdOf('多肢選択 2C 循環器'), '2C');
eq('vol.1〜3 の科目はそのまま', W.baseSubjectIdOf('2C'), '2C');
eq('vol.1〜3 の表示名も科目IDへ戻る', W.baseSubjectIdOf('2C 循環器'), '2C');
eq('自由入力は科目に落ちない', W.baseSubjectIdOf('自習室でまとめ'), null);

// ---------- 表示名は畳まない / 集計名は畳む ----------
eq('学習ログの表示は vol.4 のまま', W.normalizeSubjectName('4B2C'), '4連問 2C 循環器');
eq('多肢選択の表示名', W.normalizeSubjectName('4A2C'), '多肢選択 2C 循環器');
eq('表示名から科目IDへ戻せる（編集で保存し直しても壊れない）',
   W.subjectIdOfName('4連問 2C 循環器'), '4B2C');

eq('時間の集計は元の科目へ寄せる（4連問）', W.studySubjectName('4B2C'), '2C 循環器');
eq('時間の集計は元の科目へ寄せる（多肢選択・表示名）',
   W.studySubjectName('多肢選択 2C 循環器'), '2C 循環器');
eq('vol.1〜3 の科目は今までどおり', W.studySubjectName('2C'), '2C 循環器');
eq('自由入力はそのまま残る', W.studySubjectName('自習室でまとめ'), '自習室でまとめ');
eq('科目なしは未設定', W.studySubjectName(''), '未設定');

// ---------- 講義動画を持たない科目 ----------
ok('4連問は講義動画を持たない', W.isQbOnlySubject('4B2C') === true);
ok('多肢選択は講義動画を持たない', W.isQbOnlySubject('4A1A') === true);
ok('2C は講義動画を持つ', W.isQbOnlySubject('2C') === false);
eq('vol.4 のログでも版は元の科目で解く（基礎医学はCBT版）',
   W.logVideoEdition({ subject_name: '4A1A' }), 'cbt');
eq('vol.4 のログでも版は元の科目で解く（臨床は国試版）',
   W.logVideoEdition({ subject_name: '4B2C' }), 'kokushi');

// ---------- カテゴリ / 色 ----------
eq('4連問は vol.4 4連問のカテゴリ', W.subjectCategoryOf('4B2C'), 'cat-vol4-linked');
eq('多肢選択は vol.4 多肢選択問題のカテゴリ', W.subjectCategoryOf('4A2C'), 'cat-vol4-multi');
eq('元の科目のカテゴリは変わらない', W.subjectCategoryOf('2C'), 'cat-vol2');
ok('vol.4 は元の科目と違う色を持つ',
   W.subjectColorOf('4B2C') !== W.subjectColorOf('2C'));

// ---------- 問題数は vol.4 側に入る ----------
(function qbProgressGoesToSection() {
  // 4連問 2C に1周目40問を登録し、20問（16正解）解いたセッションを流す
  window.localStorage.setItem('medfocus_qb_progress', JSON.stringify({
    '2C':   { '1': { done: 0, total: 100, correct: 0 } },
    '4B2C': { '1': { done: 0, total: 40,  correct: 0 } }
  }));
  const res = W.applyQbSessionToProgress('4B2C', 20, 16);
  const qb = W.getQBProgress();
  eq('4連問の1周目が進む', qb['4B2C']['1'], { done: 20, total: 40, correct: 16 });
  eq('元の科目の問題数は動かない', qb['2C']['1'], { done: 0, total: 100, correct: 0 });
  eq('トーストは vol.4 の名前で出る',
     W.describeQbChanges(res), '4連問 2C 循環器 1周目 0→20/40問');
})();

(function qbProgressCarriesOverWithinSection() {
  window.localStorage.setItem('medfocus_qb_progress', JSON.stringify({
    '4A3D': { '1': { done: 8, total: 10, correct: 6 } }
  }));
  W.applyQbSessionToProgress('4A3D', 5, 5);
  const qb = W.getQBProgress();
  eq('1周目を埋めきる', qb['4A3D']['1'], { done: 10, total: 10, correct: 8 });
  eq('あふれた分は2周目へ繰り越す', qb['4A3D']['2'], { done: 3, total: 10, correct: 3 });
})();

// ---------- 逆算プラン ----------
(function planMatching() {
  const linkedLog = { subject_name: '4B2C', questions_solved: 10 };
  const baseLog   = { subject_name: '2C',   questions_solved: 10 };

  ok('4連問のログは 2C の問題数プランに入らない',
     W.planLogMatches({ subject_id: '2C', unit: 'q' }, linkedLog) === false);
  ok('4連問のログは 4連問 2C の問題数プランに入る',
     W.planLogMatches({ subject_id: '4B2C', unit: 'q' }, linkedLog) === true);
  ok('2C のログは 4連問 2C のプランに入らない',
     W.planLogMatches({ subject_id: '4B2C', unit: 'q' }, baseLog) === false);
  ok('2C のログは今までどおり 2C のプランに入る',
     W.planLogMatches({ subject_id: '2C', unit: 'q' }, baseLog) === true);
  ok('表示名で保存されたログでも同じ結論になる',
     W.planLogMatches({ subject_id: '4B2C', unit: 'q' },
                      { subject_name: '4連問 2C 循環器' }) === true);
})();

// ---------- vol.4 の vol 集計 ----------
(function volAggregate() {
  const cat = { id: 'cat-vol4-linked', masterTotal: 484,
                subjects: [{ id: '4B2C' }, { id: '4B2J' }] };
  const agg = W.volRoundAggregate(
    { '4B2C': { '1': { done: 20, total: 40, correct: 16 } },
      '4B2J': { '1': { done: 10, total: 60, correct: 5  } } },
    {}, cat);
  eq('分母は vol 全体の総数', agg.rounds[0].total, 100);
  eq('1周目の到達率', agg.rounds[0].pct, 30);
  eq('動画の母数は無い', agg.video, { done: 0, total: 0, pct: 0 });

  eq('登録済みの総数は科目ごとの合計', agg.registeredTotal, 100);
  eq('本の全問題数はマスタから来る', agg.masterTotal, 484);

  const html = W.volSummaryInnerHtml(agg, { showVideo: false });
  ok('vol.4 のカードに動画の行を出さない', html.indexOf('動画') < 0, html);
  ok('vol.4 のカードに周回の行は出る', html.indexOf('1周') >= 0, html);
  ok('周回の区切りが先頭に付かない', html.indexOf('>・') < 0, html);

  ok('まだ登録していない範囲があると分かる', html.indexOf('登録済み 100/484問') >= 0, html);
  ok('揃っていないうちは色を落とさない', html.indexOf('is-complete') < 0);

  const full = W.volRoundAggregate(
    { '4B2C': { '1': { done: 0, total: 484, correct: 0 } } }, {},
    { id: 'cat-vol4-linked', masterTotal: 484, subjects: [{ id: '4B2C' }] });
  ok('全問題数まで登録したら主張を弱める',
     W.volSummaryInnerHtml(full, { showVideo: false }).indexOf('is-complete') >= 0);

  const withVideo = W.volSummaryInnerHtml(agg);
  ok('vol.1〜3 のカードは今までどおり動画の行を出す', withVideo.indexOf('動画') >= 0);

  // vol.1〜3 は本の全問題数を持たないので、この行そのものを出さない
  const v2 = W.volRoundAggregate(
    { '2C': { '1': { done: 50, total: 100, correct: 40 } } }, {},
    { id: 'cat-vol2', subjects: [{ id: '2C' }] });
  eq('マスタが無い vol は全問題数を持たない', v2.masterTotal, null);
  ok('マスタが無い vol に登録済みの行は出ない',
     W.volSummaryInnerHtml(v2).indexOf('登録済み') < 0);
})();

// ---------- 迷い込んだ動画の記録は消さない ----------
(function strayVideoRecordStaysVisible() {
  window.localStorage.setItem('medfocus_qb_progress', JSON.stringify({
    '4B2C': { '1': { done: 0, total: 40, correct: 0 } }
  }));
  window.localStorage.removeItem('medfocus_video_progress');
  ok('vol.4 に動画の記録は普通は無い', W.hasVideoRecordFor('4B2C') === false);
  window.localStorage.setItem('medfocus_video_progress', JSON.stringify({
    '4B2C': { kokushi: { done: 2, total: 5 } }
  }));
  ok('間違って入った動画の記録は見つけられる', W.hasVideoRecordFor('4B2C') === true);
  ok('記録があれば編集できる行を出す',
     W.videoTrackerBlockHtml('4B2C').indexOf('vid-ed-row') >= 0);
  window.localStorage.removeItem('medfocus_video_progress');
})();

console.log();
if (failures.length) {
  console.log('--- 失敗 ---');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log();
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
