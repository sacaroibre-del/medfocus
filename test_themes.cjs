// カラーテーマ（scripts/build-themes.mjs と public/theme.js）のテスト。
//   node test_themes.cjs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

let pass = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) pass++; else failures.push(`${name}${detail !== undefined ? '  → ' + JSON.stringify(detail) : ''}`);
}

(async () => {
  const gen = await import(path.join(__dirname, 'scripts/build-themes.mjs'));
  const { PALETTES, buildTheme, assignRoles, hslLightness, contrast, AA } = gen;

  // ---- 生成物が最新か ----
  let fresh = true;
  try { execFileSync(process.execPath, [path.join(__dirname, 'scripts/build-themes.mjs'), '--check'], { stdio: 'pipe' }); }
  catch (e) { fresh = false; }
  check('themes.json / themes.css / public/theme.js が生成スクリプトと一致している', fresh);

  // ---- Step 1: 明度ソートで役割を割り当てる ----
  check('配色は6テーマ', PALETTES.length === 6, PALETTES.length);
  for (const p of PALETTES) {
    const r = assignRoles(p.colors);
    const L = [r.bg, r.accent, r.primary, r.text].map(hslLightness);
    check(`${p.id}: bg ≥ accent ≥ primary ≥ text（HSL 明度）`, L[0] >= L[1] && L[1] >= L[2] && L[2] >= L[3], L);
    check(`${p.id}: 4色すべてが役割に使われる`, [r.bg, r.accent, r.primary, r.text].sort().join() === [...p.colors].sort().join());
  }
  check('Garnet は #962141 が accent、#48484A が primary（明度順）', (() => {
    const r = assignRoles(PALETTES.find(p => p.id === 'garnet').colors);
    return r.accent === '#962141' && r.primary === '#48484A';
  })());

  const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'themes.json'), 'utf8'));
  check('themes.json にテーマ名・タグ・4色が入っている', json.themes.every(t => t.id && t.name && t.nameJa && t.tags.length && t.colors.length === 4), json.themes.map(t => t.id));

  // ---- Step 2: CSS 変数セット ----
  const css = fs.readFileSync(path.join(__dirname, 'themes.css'), 'utf8');
  for (const p of PALETTES) {
    const block = new RegExp(`:root\\[data-theme="${p.id}"\\] \\{([^}]*)\\}`).exec(css);
    check(`themes.css に :root[data-theme="${p.id}"] がある`, !!block);
    if (block) for (const k of ['bg', 'accent', 'primary', 'text', 'on-primary', 'primary-ink']) {
      check(`${p.id}: --color-${k} を定義`, block[1].includes(`--color-${k}:`));
    }
  }

  // ---- Step 6: コントラスト ----
  for (const p of PALETTES) {
    const t = buildTheme(p);
    const tk = t.tokens;
    check(`${p.id}: bg/text が AA`, contrast(tk.bg, tk.text) >= AA, contrast(tk.bg, tk.text));
    check(`${p.id}: primary の上の文字が AA`, contrast(tk['on-primary'], tk.primary) >= AA, contrast(tk['on-primary'], tk.primary));
    check(`${p.id}: primary-ink は面の上で AA`, [tk.bg, tk.surface, tk['surface-2']].every(s => contrast(tk['primary-ink'], s) >= AA));
    check(`${p.id}: text-muted は面の上で AA`, [tk.bg, tk.surface, tk['surface-2']].every(s => contrast(tk['text-muted'], s) >= AA));
    for (const k of ['success', 'warning', 'danger', 'violet', 'orange', 'info']) {
      check(`${p.id}: --color-${k} は背景上で AA`, contrast(tk[k], tk.bg) >= AA, contrast(tk[k], tk.bg));
    }
  }
  // AA を満たさない配色は文字色を補正し、警告を残す
  const bad = buildTheme({ id: 'bad', name: 'Bad', nameJa: '低コントラスト', tags: ['テスト'], colors: ['#FFFFFF', '#EEEEEE', '#CCCCCC', '#AAAAAA'] });
  check('低コントラスト配色: 元の bg/text は AA 未満と判定', bad.contrast.passesAA === false, bad.contrast);
  check('低コントラスト配色: 文字色を補正して AA を満たす', bad.contrast.corrected && contrast(bad.tokens.bg, bad.tokens.text) >= AA, bad.tokens.text);
  check('低コントラスト配色: 警告を出す', bad.warnings.length > 0);
  const darkBad = buildTheme({ id: 'dark-bad', name: 'Dark', nameJa: '暗', tags: ['テスト'], colors: ['#555555', '#333333', '#222222', '#111111'] });
  check('暗い背景の配色は文字色を白へ寄せる', contrast(darkBad.tokens.bg, darkBad.tokens.text) >= AA, darkBad.tokens);

  // ---- Step 5: styles.css に主要色のハードコードが残っていない ----
  const styles = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8').split('\n')
    .filter(l => !l.trim().startsWith('--'));   // 変数の定義行は対象外
  const leftovers = styles.filter(l => /#4ecdc4|#45b7d1|rgba\(\s*78\s*,\s*205\s*,\s*196/i.test(l));
  check('styles.css のコンポーネントは主要色を var(--color-*) で参照する', leftovers.length === 0, leftovers.slice(0, 3));

  // ---- Step 3/4: public/theme.js（切り替え・永続化・復元） ----
  const runtime = fs.readFileSync(path.join(__dirname, 'public/theme.js'), 'utf8');
  function boot(stored) {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
    if (stored) dom.window.localStorage.setItem('medfocus-color-theme', stored);
    dom.window.eval(runtime);
    return dom.window;
  }
  let w = boot(null);
  check('未設定なら data-theme なし（デフォルト）', w.document.documentElement.getAttribute('data-theme') === null && w.MedFocusTheme.current() === 'default');
  check('一覧は6テーマ・各4チップ', w.MedFocusTheme.themes.length === 6 && w.MedFocusTheme.themes.every(t => t.chips.length === 4));
  const seen = [];
  w.MedFocusTheme.onChange(id => seen.push(id));
  w.MedFocusTheme.apply('denim');
  check('apply で data-theme を付ける', w.document.documentElement.getAttribute('data-theme') === 'denim');
  check('apply で localStorage に保存する', w.localStorage.getItem('medfocus-color-theme') === 'denim');
  check('変更を通知する', seen.join() === 'denim', seen);
  w.MedFocusTheme.apply('default');
  check('default に戻すと data-theme と保存値を消す', w.document.documentElement.getAttribute('data-theme') === null && w.localStorage.getItem('medfocus-color-theme') === null);
  w = boot('navy-blazer');
  check('保存済みのテーマを読み込み時に復元する', w.document.documentElement.getAttribute('data-theme') === 'navy-blazer');
  w = boot('no-such-theme');
  check('知らないテーマ名はデフォルト扱い', w.document.documentElement.getAttribute('data-theme') === null);

  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length) { console.log('\n--- failures ---'); failures.forEach(f => console.log(f)); process.exit(1); }
})();
