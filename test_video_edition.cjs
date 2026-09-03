// 講義動画の版（国試版 / CBT版）の純関数テスト。
//   node test_video_edition.cjs
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
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.navigator = { userAgent: 'node.js' };
global.Chart = class Chart { constructor() {} destroy() {} };
global.requestAnimationFrame = (cb) => cb();
global.setTimeout = (cb) => cb();
global.clearTimeout = () => {};

const code = fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/import\.meta\.env/g, '({})');
window.eval(code);

const W = window;
// eval したコードの const は window に生えないので、定数はアクセサ関数から取る
// （関数宣言は window のプロパティになるので W.xxx で直接呼べる）。
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

// 主軸の既定は CBT版。テストは prefs を明示的に渡す
const PREFS_CBT = { default: 'cbt', primary: {} };
const PREFS_KOKUSHI = { default: 'kokushi', primary: {} };

// ---------- CBT版マスタ ----------
{
  const m = W.cbtVideoMasterRows();
  eq('マスタ: カテゴリ数', m.length, 16);
  eq('マスタ: 合計本数', m.reduce((s, r) => s + r.count, 0), 77);
  eq('マスタ: 合計秒数', m.reduce((s, r) => s + r.seconds, 0), 97682);

  eq('マスタ: 消化器系は 2A、2B を含む', W.cbtMasterFor('2A').covers, ['2B']);
  eq('マスタ: 産婦人科は 2P、2Q を含む', W.cbtMasterFor('2P').covers, ['2Q']);
  eq('マスタ: 腎・尿路系は 2E、2W を含む', W.cbtMasterFor('2E').covers, ['2W']);
  eq('マスタ: 含まれる側から代表科目を引ける', W.cbtCoveredBy('2Q'), '2P');
  eq('マスタ: 含まれない科目は null', W.cbtCoveredBy('2C'), null);
  eq('マスタ: CBT版に無い科目は null', W.cbtMasterFor('1A'), null);

  // 産婦人科は本数では6割だが時間では2割。本数で足すと壊れることの確認
  const ob = W.cbtMasterFor('2P');
  const total = m.reduce((s, r) => s + r.count, 0);
  const totalSec = m.reduce((s, r) => s + r.seconds, 0);
  ok('マスタ: 産婦人科は本数で6割超', ob.count / total > 0.6, ob.count / total);
  ok('マスタ: 産婦人科は時間では2割未満', ob.seconds / totalSec < 0.2, ob.seconds / totalSec);
}

// ---------- 旧形式の包み直し ----------
{
  const r = W.normalizeVideoProgress({ '2C': { done: 3, total: 12 } });
  eq('包み直し: 旧形式は国試版になる', r.data, { '2C': { kokushi: { done: 3, total: 12 } } });
  // 基礎医学の旧データは実際にはCBT版を見た記録なので、CBT版として包む
  eq('包み直し: 国試版が無い科目の旧データはCBT版になる',
     W.normalizeVideoProgress({ '1A': { done: 2, total: 9 } }).data,
     { '1A': { cbt: { done: 2, total: 9 } } });
  ok('包み直し: 変換したことを返す', r.changed === true);

  const v2 = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4, total_sec: 10463 } } };
  const r2 = W.normalizeVideoProgress(v2);
  eq('包み直し: v2 はそのまま通る', r2.data, v2);
  ok('包み直し: v2 は変換不要', r2.changed === false);

  eq('包み直し: 壊れた値は落とす', W.normalizeVideoProgress({ '2C': null, '2D': 5 }).data, {});
  eq('包み直し: 数値でない done は 0 に', W.normalizeVideoProgress({ '2C': { done: 'x', total: 12 } }).data,
     { '2C': { kokushi: { done: 0, total: 12 } } });
  eq('包み直し: 未知の版キーは無視する', W.normalizeVideoProgress({ '2C': { qassist: { done: 9, total: 9 } } }).data, {});
}

// ---------- 端末間のマージ ----------
{
  const remote = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 0, total: 4 } } };
  const local  = { '2C': { kokushi: { done: 5, total: 12 }, cbt: { done: 2, total: 4 } },
                   '2D': { kokushi: { done: 1, total: 3 } } };
  const m = W.mergeVideoProgress(remote, local);
  eq('マージ: 版ごとに多いほうを残す（国試）', m['2C'].kokushi.done, 5);
  eq('マージ: 版ごとに多いほうを残す（CBT）', m['2C'].cbt.done, 2);
  eq('マージ: 片方にしか無い科目は残す', m['2D'].kokushi.done, 1);

  const m2 = W.mergeVideoProgress({ '2C': { cbt: { done: 4, total: 4 } } },
                                  { '2C': { kokushi: { done: 9, total: 12 } } });
  eq('マージ: 版が食い違っても両方残る', Object.keys(m2['2C']).sort(), ['cbt', 'kokushi']);
}

// ---------- 主軸の解決 ----------
{
  eq('主軸: CBT版マスタのある科目は既定でCBT版', W.primaryEditionOf('2C', PREFS_CBT), 'cbt');
  // 基礎医学に国試版の動画は存在しない。マスタが未登録でもCBT版になる
  eq('主軸: 基礎医学はCBT版（国試版が存在しない）', W.primaryEditionOf('1A', PREFS_CBT), 'cbt');
  eq('主軸: 基礎医学は既定を国試版にしてもCBT版', W.primaryEditionOf('1J', PREFS_KOKUSHI), 'cbt');
  eq('主軸: 基礎医学は上書きしても国試版にはできない',
     W.primaryEditionOf('1C', { default: 'cbt', primary: { '1C': 'kokushi' } }), 'cbt');
  eq('主軸: 2K 中毒はマスタが無いだけなので既定どおりCBT版', W.primaryEditionOf('2K', PREFS_CBT), 'cbt');
  eq('主軸: 2K 中毒は国試版にも切り替えられる', W.primaryEditionOf('2K', PREFS_KOKUSHI), 'kokushi');
  eq('主軸: 他科目に含まれる科目は必ず国試版', W.primaryEditionOf('2Q', PREFS_CBT), 'kokushi');
  eq('主軸: 含まれる科目は上書きしても国試版',
     W.primaryEditionOf('2W', { default: 'cbt', primary: { '2W': 'cbt' } }), 'kokushi');

  eq('版の有無: 基礎医学に国試版は無い', W.availableVideoEditions('1A'), ['cbt']);
  eq('版の有無: 含まれる科目にCBT版は無い', W.availableVideoEditions('2B'), ['kokushi']);
  eq('版の有無: 臨床の科目は両方ある', W.availableVideoEditions('2C'), ['kokushi', 'cbt']);
  eq('版の有無: マスタが無い臨床科目も両方ある', W.availableVideoEditions('2K'), ['kokushi', 'cbt']);
  eq('主軸: 科目ごとの上書きが効く',
     W.primaryEditionOf('2C', { default: 'cbt', primary: { '2C': 'kokushi' } }), 'kokushi');
  eq('主軸: 既定を国試版にできる', W.primaryEditionOf('2C', PREFS_KOKUSHI), 'kokushi');
  eq('主軸: 不正な版は既定に落ちる',
     W.primaryEditionOf('2C', { default: 'cbt', primary: { '2C': 'qassist' } }), 'cbt');
}

// ---------- 実際に読む版（データが無い側には落ちない） ----------
{
  const onlyKokushi = { '2C': { kokushi: { done: 3, total: 12 } } };
  eq('解決: CBT版が未登録なら国試版を読む',
     W.resolvedVideoEditionOf('2C', onlyKokushi, PREFS_CBT), 'kokushi');

  const both = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 0, total: 4 } } };
  eq('解決: CBT版に総数が入れば主軸のCBT版を読む',
     W.resolvedVideoEditionOf('2C', both, PREFS_CBT), 'cbt');

  const emptyCbt = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 0, total: 0 } } };
  eq('解決: CBT版が0/0なら記録のある国試版へ落ちる',
     W.resolvedVideoEditionOf('2C', emptyCbt, PREFS_CBT), 'kokushi');

  eq('解決: どちらも記録が無ければ主軸をそのまま返す',
     W.resolvedVideoEditionOf('2C', {}, PREFS_CBT), 'cbt');
}

// ---------- 主軸だけを1段の形で返す ----------
{
  const raw = {
    '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4, total_sec: 10463 } },
    '2K': { kokushi: { done: 2, total: 5 } }
  };
  const p = W.primaryVideoProgress(raw, PREFS_CBT);
  eq('主軸の進捗: CBT版が主軸の科目', p['2C'], { done: 1, total: 4, total_sec: 10463, edition: 'cbt' });
  eq('主軸の進捗: マスタが無くCBT版が未登録なら国試版の数字が出る',
     p['2K'], { done: 2, total: 5, total_sec: null, edition: 'kokushi' });

  const pk = W.primaryVideoProgress(raw, { default: 'cbt', primary: { '2C': 'kokushi' } });
  eq('主軸の進捗: 主軸を国試版にすると国試版の数字が出る',
     pk['2C'], { done: 3, total: 12, total_sec: null, edition: 'kokushi' });
}

// ---------- ステップ1は無変化であること（いちばん大事な確認） ----------
{
  // 版を持たない旧データだけがある状態＝いまのユーザーのデータ
  const legacy = { '2C': { done: 3, total: 12 }, '2A': { done: 5, total: 20 }, '1A': { done: 1, total: 4 } };
  const wrapped = W.normalizeVideoProgress(legacy).data;
  const p = W.primaryVideoProgress(wrapped, PREFS_CBT);

  // 版を足しても数字は変わらない。臨床は国試版として、基礎医学はCBT版として
  // 包まれるが、どちらも「その科目に記録のある版」を読むので同じ値が出る
  const flat = {};
  Object.entries(p).forEach(([sid, v]) => { flat[sid] = { done: v.done, total: v.total }; });
  eq('無変化: 旧データは版を足しても同じ数字が出る', flat, legacy);
  eq('無変化: 臨床は国試版、基礎医学はCBT版として読む',
     [p['2C'].edition, p['2A'].edition, p['1A'].edition], ['kokushi', 'kokushi', 'cbt']);

  // 基礎医学は国試版の行が残っていてもCBT版で数える
  const withCbt = { '1A': { kokushi: { done: 1, total: 4 }, cbt: { done: 0, total: 9 } } };
  eq('基礎医学: 国試版の行があってもCBT版で数える',
     W.primaryVideoProgress(withCbt, PREFS_CBT)['1A'],
     { done: 0, total: 9, total_sec: null, edition: 'cbt' });
}

// ---------- 両方の版を並べて返す ----------
{
  const raw = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4 } } };
  const all = W.allVideoProgress(raw, PREFS_CBT);
  eq('両方: 主軸', all['2C'].primary, 'cbt');
  eq('両方: 実際に読む版', all['2C'].resolved, 'cbt');
  eq('両方: 版ごとの中身', all['2C'].byEdition,
     { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4 } });
}

// ---------- 1科目1版の読み出し ----------
{
  const raw = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4, total_sec: 10463 } } };
  eq('単体読み: CBT版', W.videoProgressFor('2C', 'cbt', raw), { done: 1, total: 4, total_sec: 10463 });
  eq('単体読み: 国試版', W.videoProgressFor('2C', 'kokushi', raw), { done: 3, total: 12, total_sec: null });
  eq('単体読み: 未登録は0', W.videoProgressFor('2Z', 'cbt', raw), { done: 0, total: 0, total_sec: null });
}

// ---------- ログの版（未設定は国試版として扱う） ----------
{
  eq('ログの版: 記録されていればそれ', W.logVideoEdition({ video_edition: 'cbt' }), 'cbt');
  eq('ログの版: 未設定は国試版', W.logVideoEdition({ video_edition: null, subject_name: '2C' }), 'kokushi');
  eq('ログの版: 不正な値も国試版', W.logVideoEdition({ video_edition: 'qassist', subject_name: '2C' }), 'kokushi');
  eq('ログの版: 基礎医学の未設定はCBT版',
     W.logVideoEdition({ video_edition: null, subject_name: '1A' }), 'cbt');
  eq('ログの版: 科目が分からなければ国試版', W.logVideoEdition({ video_edition: null }), 'kokushi');
}

// ---------- 1本あたりの所要分を版ごとに出す ----------
{
  // CBT版の産婦人科は47本で5時間ちょっと、循環器は4本で3時間近く。
  // 混ぜた実測でなく、版と科目に応じた単価が出ることを固定する。
  const logs = [
    // 国試版: 3本で120分 → 40分/本
    { activity: 'video', duration_minutes: 120, videos_watched: 3, video_edition: 'kokushi' },
    { activity: 'video', duration_minutes: 120, videos_watched: 3, video_edition: 'kokushi' },
    { activity: 'video', duration_minutes: 120, videos_watched: 3, video_edition: 'kokushi' },
    // CBT版: 20本で130分 → 6.5分/本
    { activity: 'video', duration_minutes: 130, videos_watched: 20, video_edition: 'cbt' }
  ];
  const unit = W.buildUnitCost(logs);

  eq('単価: 国試版の実測', Math.round(unit.video.kokushi.minPerVideo), 40);
  eq('単価: CBT版の実測', Math.round(unit.video.cbt.minPerVideo * 10) / 10, 6.5);
  ok('単価: 全体の実測は両方が混ざる',
     unit.minPerVideo > 6.5 && unit.minPerVideo < 40, unit.minPerVideo);

  // CBT版はマスタの合計時間を優先する（実測より母数が大きく安定しているため）
  eq('単価: CBT版の循環器はマスタ由来（2:54:23 ÷ 4本）',
     Math.round(W.minutesPerVideoFor('cbt', unit, '2C') * 10) / 10, 43.6);
  eq('単価: CBT版の産婦人科はマスタ由来（5:05:04 ÷ 47本）',
     Math.round(W.minutesPerVideoFor('cbt', unit, '2P') * 10) / 10, 6.5);
  eq('単価: 国試版は実測を使う',
     Math.round(W.minutesPerVideoFor('kokushi', unit, '2C')), 40);

  // 実測が足りない版は全体の実測に落ちる
  const thin = W.buildUnitCost([{ activity: 'video', duration_minutes: 300, videos_watched: 6, video_edition: 'kokushi' }]);
  eq('単価: サンプル不足の版は全体の実測に落ちる',
     Math.round(W.minutesPerVideoFor('kokushi', thin, '1A')), 50);

  // マスタが無い科目のCBT版は、臨床のマスタ平均ではなく実測を使う
  eq('単価: マスタが無いCBT版は実測（臨床の平均を当てない）',
     Math.round(W.minutesPerVideoFor('cbt', unit, '1A') * 10) / 10, 6.5);
}

// ---------- 残り時間は本数比ではなく時間比になる（時間ベース化の要） ----------
{
  // 産婦人科 47本/5.1h と 循環器 4本/2.9h。本数では産婦人科が圧倒的に多いが、
  // 時間ではむしろ循環器より少し短いくらい。残り時間がどちらに従うかを固定する。
  const rows = [
    { id: '2P', name: '2P', videoEdition: 'cbt', videoDone: 0, videoTotal: 47, qb1Done: 0, qb1Total: 100, laterDone: 0 },
    { id: '2C', name: '2C', videoEdition: 'cbt', videoDone: 0, videoTotal: 4,  qb1Done: 0, qb1Total: 100, laterDone: 0 }
  ];
  const unit = W.buildUnitCost([
    // QBの単価だけ実測で用意する（動画はマスタ由来になる）
    { activity: 'qb', duration_minutes: 100, questions_solved: 100 }
  ]);
  const qb = { '2P': { '1': { done: 0, total: 100, correct: 0 } }, '2C': { '1': { done: 0, total: 100, correct: 0 } } };
  const io = W.buildIOBaseline(unit, rows, qb, 1, null, []);

  ok('時間ベース: 動画の実測が無くてもCBT版なら計算できる', io.hasData === true);
  // 47本 + 4本 = 51本だが、時間は 5:05:04 + 2:54:23 = 7:59:27 = 479.45分
  eq('時間ベース: 動画の総時間はマスタ由来', Math.round(io.videoTotalMin), 479);
  eq('時間ベース: 残りも時間で出る', Math.round(io.remainVideoMin), 479);
  // 本数一律なら 51本 × 何かになるが、時間では産婦人科は全体の6割ではなく4割弱
  ok('時間ベース: 産婦人科は本数ほど重くない',
     (18304 / 60) / io.videoTotalMin < 0.7, (18304 / 60) / io.videoTotalMin);

  // 半分見終えていれば残りは半分に近づく
  const half = [
    { id: '2P', name: '2P', videoEdition: 'cbt', videoDone: 47, videoTotal: 47, qb1Done: 0, qb1Total: 100, laterDone: 0 },
    { id: '2C', name: '2C', videoEdition: 'cbt', videoDone: 0,  videoTotal: 4,  qb1Done: 0, qb1Total: 100, laterDone: 0 }
  ];
  const io2 = W.buildIOBaseline(unit, half, qb, 1, null, []);
  eq('時間ベース: 産婦人科を見終えると残りは循環器ぶんだけ',
     Math.round(io2.remainVideoMin), Math.round(10463 / 60));
}

// ---------- 補足視聴 ----------
{
  const today = new Date('2026-09-04T12:00:00');
  const iso = d => new Date(d).toISOString();
  const logs = [
    // 2C は主軸CBT版。CBT版を見た分は主軸ぶん
    { activity: 'video', subject_name: '2C', video_edition: 'cbt', duration_minutes: 60, started_at: iso('2026-09-03T10:00:00') },
    // 同じ 2C を国試版で深追い＝補足視聴
    { activity: 'video', subject_name: '2C', video_edition: 'kokushi', duration_minutes: 90, started_at: iso('2026-09-02T10:00:00') },
    // 1A も主軸はCBT版（基礎医学はCBT版で見る）。国試版で見た分は補足
    { activity: 'video', subject_name: '1A', video_edition: 'kokushi', duration_minutes: 30, started_at: iso('2026-09-01T10:00:00') },
    // 動画以外は数えない
    { activity: 'qb', subject_name: '2C', duration_minutes: 120, started_at: iso('2026-09-03T14:00:00') },
    // 期間外
    { activity: 'video', subject_name: '2C', video_edition: 'kokushi', duration_minutes: 300, started_at: iso('2026-01-01T10:00:00') }
  ];
  const sup = W.buildSupplementalVideo(logs, today, 30, { default: 'cbt', primary: {} });

  eq('補足視聴: 動画の合計時間', sup.totalMin, 180);
  eq('補足視聴: 主軸でない版の時間', sup.supplementalMin, 120);
  eq('補足視聴: 主軸の版の時間', sup.primaryMin, 60);
  eq('補足視聴: 割合', Math.round(sup.pct), 67);
  eq('補足視聴: 科目の内訳（多い順）', sup.rows.map(r => [r.name, r.min, r.edition]),
     [['2C 循環器', 90, 'kokushi'], ['1A 細胞生物学', 30, 'kokushi']]);

  // 主軸を国試版にすると、同じログでも補足の向きが逆になる
  const sup2 = W.buildSupplementalVideo(logs, today, 30, { default: 'cbt', primary: { '2C': 'kokushi' } });
  eq('補足視聴: 主軸を変えると入れ替わる', [sup2.supplementalMin, sup2.primaryMin], [90, 90]);
}

// ---------- CBT版の総数とマスタのズレ ----------
{
  const inSync = { '2C': { cbt: { done: 1, total: 4, total_sec: 10463 } } };
  eq('マスタ照合: 一致していれば何も出ない', W.cbtTotalsOutOfSync(inSync).length, 0);

  const off = { '2C': { cbt: { done: 1, total: 3, total_sec: 10463 } } };
  eq('マスタ照合: 本数のズレを拾う',
     W.cbtTotalsOutOfSync(off).map(x => [x.subjectId, x.from, x.to]), [['2C', 3, 4]]);

  const secOff = { '2C': { cbt: { done: 1, total: 4 } } };
  eq('マスタ照合: 合計時間が無い行も拾う', W.cbtTotalsOutOfSync(secOff).length, 1);

  const unused = { '2C': { kokushi: { done: 3, total: 12 } } };
  eq('マスタ照合: CBT版を使っていない科目は対象外', W.cbtTotalsOutOfSync(unused).length, 0);
}

// ---------- 逆算プランの版突合 ----------
{
  const plan = { subject_id: '2C', unit: 'video', video_edition: 'cbt' };
  ok('プラン: 同じ版のログは消化に数える',
     W.planLogMatches(plan, { subject_name: '2C', video_edition: 'cbt' }) === true);
  ok('プラン: 違う版のログは数えない',
     W.planLogMatches(plan, { subject_name: '2C', video_edition: 'kokushi' }) === false);
  ok('プラン: 版が未設定のログは国試版として扱う',
     W.planLogMatches(plan, { subject_name: '2C', video_edition: null }) === false);
  ok('プラン: 科目が違えば数えない',
     W.planLogMatches(plan, { subject_name: '2D', video_edition: 'cbt' }) === false);

  const kokushiPlan = { subject_id: '2C', unit: 'video', video_edition: 'kokushi' };
  ok('プラン: 国試版のプランは版未設定のログも数える',
     W.planLogMatches(kokushiPlan, { subject_name: '2C', video_edition: null }) === true);

  const legacy = { subject_id: '2C', unit: 'video', video_edition: null };
  ok('プラン: 版を持たないプランは版を問わない（従来どおり）',
     W.planLogMatches(legacy, { subject_name: '2C', video_edition: 'cbt' }) === true);

  const qbPlan = { subject_id: '2C', unit: 'q', video_edition: null };
  ok('プラン: QBのプランは版に影響されない',
     W.planLogMatches(qbPlan, { subject_name: '2C', video_edition: 'cbt' }) === true);

  // 表示名で保存されたログ（編集で保存すると科目名が入る）も突合できる
  ok('プラン: 科目名で保存されたログも突合できる',
     W.planLogMatches(kokushiPlan, { subject_name: '2C 循環器', video_edition: 'kokushi' }) === true);
}

// ---------- スナップショットの版ごと内訳 ----------
{
  const video = { '2C': { done: 1, total: 4, edition: 'cbt' } };
  const raw = { '2C': { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4 } } };
  const snap = W.summarizeProgress({}, video, raw);
  eq('スナップショット: 総数は主軸で数える', [snap.totals.videoDone, snap.totals.videoTotal], [1, 4]);
  eq('スナップショット: 版ごとの内訳を残す', snap.bySubject['2C'].video.by_edition,
     { kokushi: { done: 3, total: 12 }, cbt: { done: 1, total: 4 } });
  eq('スナップショット: どの版で数えたかも残す', snap.bySubject['2C'].video.edition, 'cbt');

  // 版の生データを渡さなければ今までどおりの形
  const plain = W.summarizeProgress({}, { '2C': { done: 3, total: 12 } });
  eq('スナップショット: 内訳が無ければ従来の形', plain.bySubject['2C'].video, { done: 3, total: 12 });
}

// ---------- 版の設定の正規化 ----------
{
  eq('設定: 空なら既定はCBT版', W.normalizeVideoEditionPrefs(null), { default: 'cbt', primary: {} });
  eq('設定: 不正な版は落とす',
     W.normalizeVideoEditionPrefs({ default: 'qassist', primary: { '2C': 'kokushi', '2D': 'x' } }),
     { default: 'cbt', primary: { '2C': 'kokushi' } });
}

console.log('');
if (failures.length) {
  console.log('--- 失敗 ---');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
