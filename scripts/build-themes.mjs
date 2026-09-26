// カラーテーマの生成スクリプト。
//   node scripts/build-themes.mjs          … themes.json / themes.css / public/theme.js を書き出す
//   node scripts/build-themes.mjs --check  … 書き出し済みのファイルが最新か確かめるだけ（差分があれば exit 1）
//
// 配色は色彩101®（shikisai101.com）の4色配色パターンを参考にしている。
// 4色は「HSL の明度」で並べ替えて役割を自動で割り当てる。
//   最も明るい色 → --color-bg / 2番目 → --color-accent / 3番目 → --color-primary / 最も暗い色 → --color-text
// そのうえで WCAG AA（4.5:1）を満たすか検査し、満たさない組み合わせは文字色側を寄せて自動補正する。
// 生成物は手で編集しない。配色を変えるときは PALETTES を直してこのスクリプトを流し直す。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PALETTES = [
  { id: 'denim',       name: 'Denim',       nameJa: 'デニム',     tags: ['クール'],                 colors: ['#CCE6FF', '#78AAE9', '#4574B7', '#2D3B56'] },
  { id: 'fresh-green', name: 'Fresh Green', nameJa: '若葉',       tags: ['ナチュラル'],             colors: ['#DCE1CF', '#B7E8A3', '#9ECF8A', '#334258'] },
  { id: 'rose-vase',   name: 'Rose Vase',   nameJa: '薔薇',       tags: ['モダン', 'ロマンチック'], colors: ['#FCECEB', '#FFCBC8', '#D38D8B', '#333D54'] },
  { id: 'bamboo',      name: 'Bamboo',      nameJa: '竹林',       tags: ['ナチュラル', 'モダン'],   colors: ['#D5DE69', '#9EB85D', '#60782C', '#191F11'] },
  { id: 'garnet',      name: 'Garnet',      nameJa: 'ガーネット', tags: ['モダン'],                 colors: ['#F6F5F0', '#962141', '#48484A', '#1F1F27'] },
  { id: 'navy-blazer', name: 'Navy Blazer', nameJa: '紺ブレザー', tags: ['カジュアル'],             colors: ['#C0B3A7', '#C99D43', '#343F7B', '#212023'] },
];

// 状態を表す色（成功・注意・危険など）の元の色。テーマの背景上で読める濃さまで自動で寄せる。
const STATUS_BASE = {
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  violet:  '#8b5cf6',
  orange:  '#f97316',
  info:    '#3b82f6',
};

export const AA = 4.5;       // WCAG AA 通常文字
const AA_SUBTLE = 3.0;       // 補助テキスト（プレースホルダー・注記）の下限

// ---------- 色の計算 ----------
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// HSL の L（0〜1）。max と min の平均
export function hslLightness(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}
// WCAG 2.x の相対輝度
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// CSS の color-mix(in srgb, a (1-t), b t) と同じ。t=0 で a、t=1 で b
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
const round2 = x => Math.round(x * 100) / 100;

// fg を toward（既定は黒か白のうちコントラストが上がる方）へ少しずつ寄せ、bg に対して min を満たす最初の色を返す
export function ensureContrast(fg, bg, min = AA, toward) {
  if (contrast(fg, bg) >= min) return fg;
  const target = toward || (contrast('#000000', bg) >= contrast('#FFFFFF', bg) ? '#000000' : '#FFFFFF');
  for (let t = 0.02; t <= 1.0001; t += 0.02) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  // toward に寄せきっても届かないときは白黒の強い方
  return contrast('#000000', bg) >= contrast('#FFFFFF', bg) ? '#000000' : '#FFFFFF';
}

// ---------- Step 1: 明度ソートによる役割の割り当て ----------
export function assignRoles(colors) {
  const sorted = [...colors].sort((a, b) =>
    hslLightness(b) - hslLightness(a) || luminance(b) - luminance(a));
  const [bg, accent, primary, text] = sorted;
  return { bg, accent, primary, text };
}

// 役割から、アプリで使う派生トークンを作る。ここで AA を検査・補正する
export function buildTheme(p) {
  const roles = assignRoles(p.colors);
  const warnings = [];

  // Step 6: 背景と文字色のコントラスト。足りなければ文字色を黒（背景が暗ければ白）へ寄せて補正する
  const bgTextRatio = contrast(roles.bg, roles.text);
  let text = roles.text;
  if (bgTextRatio < AA) {
    text = ensureContrast(roles.text, roles.bg, AA);
    warnings.push(`bg ${roles.bg} / text ${roles.text} = ${round2(bgTextRatio)}:1 < ${AA}:1 → text を ${text} に補正`);
  }

  // 面の色。明るい背景ならカードは背景より明るく（白を混ぜる）、暗い背景なら文字色を少し混ぜて浮かせる。
  // 入れ子の面（入力欄の枠内・タブ地など）は文字色を少し混ぜる
  const lightBg = luminance(roles.bg) > luminance(text);
  const surface = lightBg ? mix(roles.bg, '#FFFFFF', 0.55) : mix(roles.bg, text, 0.06);
  const surface2 = mix(roles.bg, text, 0.07);
  // 文字が載る面のうち最も文字色に近い（＝コントラストが一番低い）面
  const worst = [roles.bg, surface, surface2].reduce((w, s) => (contrast(text, s) < contrast(text, w) ? s : w));
  if (contrast(text, worst) < AA) text = ensureContrast(text, worst, AA);

  // 本文の次に使う文字色。背景色を混ぜられるだけ混ぜつつ AA を守る
  const fade = (min, maxT) => {
    let best = text;
    for (let t = 0.02; t <= maxT + 1e-9; t += 0.02) {
      const c = mix(text, roles.bg, t);
      if (contrast(c, worst) >= min) best = c; else break;
    }
    return best;
  };
  const textMuted = fade(AA, 0.4);
  const textSubtle = fade(AA_SUBTLE, 0.6);

  // 主要色を文字として使う場合（リンク、選択中のナビなど）は黒（暗い背景なら白）へ寄せて AA を満たす。
  // 文字色へ寄せると色相が濁るので、明度だけ下げて色味を残す
  const primaryInk = ensureContrast(roles.primary, worst, AA);

  // 主要色の上に載せる文字色（ボタンの文字など）。背景色・文字色・白のうち一番読める色を選び、足りなければ補正
  const onPrimaryBase = [roles.bg, text, '#FFFFFF'].reduce((b, c) => (contrast(c, roles.primary) > contrast(b, roles.primary) ? c : b));
  const onPrimary = ensureContrast(onPrimaryBase, roles.primary, AA);
  // ボタンのグラデーション終端。on-primary と反対側へ寄せるので、どこでも文字のコントラストは下がらない
  const primary2 = mix(roles.primary, luminance(onPrimary) > 0.5 ? text : '#FFFFFF', 0.18);
  if (contrast(onPrimary, primary2) < AA) warnings.push(`on-primary ${onPrimary} / primary-2 ${primary2} が AA 未満`);

  const status = Object.fromEntries(Object.entries(STATUS_BASE).map(([k, v]) => [k, ensureContrast(v, worst, AA)]));

  return {
    id: p.id,
    name: p.name,
    nameJa: p.nameJa,
    tags: p.tags,
    colors: p.colors,
    roles: { ...roles, text },
    tokens: {
      bg: roles.bg,
      accent: roles.accent,
      primary: roles.primary,
      text,
      'primary-2': primary2,
      'primary-ink': primaryInk,
      'on-primary': onPrimary,
      surface,
      'surface-2': surface2,
      'text-muted': textMuted,
      'text-subtle': textSubtle,
      ...status,
    },
    contrast: {
      bgText: round2(contrast(roles.bg, text)),
      bgTextOriginal: round2(bgTextRatio),
      passesAA: bgTextRatio >= AA,
      corrected: text !== roles.text,
      onPrimary: round2(contrast(onPrimary, roles.primary)),
      primaryInk: round2(contrast(primaryInk, worst)),
      textMuted: round2(contrast(textMuted, worst)),
    },
    warnings,
  };
}

// ---------- 出力 ----------
const HEADER = '自動生成ファイル: scripts/build-themes.mjs が書き出す。手で編集しない。';

function renderJson(themes) {
  return JSON.stringify({
    $comment: HEADER,
    source: '色彩101® (shikisai101.com) の4色配色パターンを参考',
    roleRule: 'HSL 明度の降順に bg / accent / primary / text',
    themes: themes.map(t => ({
      id: t.id, name: t.name, nameJa: t.nameJa, tags: t.tags, colors: t.colors,
      roles: t.roles, contrast: t.contrast, warnings: t.warnings,
    })),
  }, null, 2) + '\n';
}

// Step 2: テーマごとの CSS 変数セット。アプリ全体の変数への割り当ては styles.css 側で行う
function renderCss(themes) {
  const blocks = themes.map(t => {
    const lines = Object.entries(t.tokens).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');
    return `/* ${t.name}（${t.nameJa}）/ ${t.tags.join('・')} — bg/text ${t.contrast.bgText}:1${t.contrast.corrected ? '（補正済み）' : ''} */\n:root[data-theme="${t.id}"] {\n${lines}\n}`;
  });
  return `/* ${HEADER} */\n\n${blocks.join('\n\n')}\n`;
}

// ブラウザ側で使うテーマ一覧と切り替え処理。app.js は import を使えない（テストが eval で読む）ため、
// <head> で読む普通の script にする。ここで localStorage から復元するので初回描画から正しい色になる
function renderRuntime(themes) {
  const data = themes.map(t => ({
    id: t.id, name: t.name, nameJa: t.nameJa, tags: t.tags,
    // チップはパレットの明るい順（bg, accent, primary, text）で見せる
    chips: [t.roles.bg, t.roles.accent, t.roles.primary, t.roles.text],
    contrast: t.contrast.bgText, corrected: t.contrast.corrected,
  }));
  return `// ${HEADER}
// カラーテーマの一覧・適用・永続化。window.MedFocusTheme として公開する。
(function () {
  var STORAGE_KEY = 'medfocus-color-theme';
  var DEFAULT_ID = 'default';
  var THEMES = ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')};
  var listeners = [];

  function find(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }
  function read() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function current() {
    var id = document.documentElement.getAttribute('data-theme');
    return find(id) ? id : DEFAULT_ID;
  }

  // WCAG のコントラスト比。適用後に実際の計算値でも確かめる（CSS の上書き漏れで崩れていないかの保険）
  function parseRgb(s) {
    var m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    return m[1].split(/[ ,\\/]+/).filter(Boolean).slice(0, 3).map(Number);
  }
  function lum(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function verify(id) {
    if (!find(id) || typeof getComputedStyle !== 'function') return null;
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;background:var(--color-bg);color:var(--color-text)';
    (document.body || document.documentElement).appendChild(probe);
    var cs = getComputedStyle(probe);
    var bg = parseRgb(cs.backgroundColor), fg = parseRgb(cs.color);
    probe.remove();
    if (!bg || !fg) return null;
    var r = ratio(bg, fg);
    if (r < ${AA}) {
      // 最後の砦: 文字色を背景に応じて黒か白へ倒す
      console.warn('[theme] ' + id + ': --color-bg / --color-text のコントラスト比 ' + r.toFixed(2) + ':1 が WCAG AA (${AA}:1) 未満のため文字色を補正します');
      var dark = lum(bg) > 0.18;
      document.documentElement.style.setProperty('--color-text', dark ? '#000000' : '#FFFFFF');
    }
    return r;
  }

  function apply(id, opts) {
    opts = opts || {};
    var root = document.documentElement;
    var theme = find(id);
    root.style.removeProperty('--color-text');
    if (theme) root.setAttribute('data-theme', theme.id);
    else root.removeAttribute('data-theme');
    if (opts.persist !== false) {
      try {
        if (theme) localStorage.setItem(STORAGE_KEY, theme.id);
        else localStorage.removeItem(STORAGE_KEY);
      } catch (e) { /* プライベートモード等では保存できないだけ */ }
    }
    var applied = theme ? theme.id : DEFAULT_ID;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](applied); } catch (e) { console.error(e); }
    }
    return applied;
  }

  window.MedFocusTheme = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_ID: DEFAULT_ID,
    themes: THEMES,
    find: find,
    current: current,
    isPalette: function () { return current() !== DEFAULT_ID; },
    apply: apply,
    verify: verify,
    onChange: function (fn) { listeners.push(fn); },
  };

  // Step 4: 前回選んだテーマを最初の描画より前に復元する
  apply(read(), { persist: false });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { verify(current()); });
  } else {
    verify(current());
  }
})();
`;
}

const themes = PALETTES.map(buildTheme);
const outputs = {
  'themes.json': renderJson(themes),
  'themes.css': renderCss(themes),
  'public/theme.js': renderRuntime(themes),
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  let stale = [];
  for (const [rel, content] of Object.entries(outputs)) {
    const path = join(ROOT, rel);
    let prev = null;
    try { prev = readFileSync(path, 'utf8'); } catch { /* 未生成 */ }
    if (prev === content) continue;
    if (check) stale.push(rel); else writeFileSync(path, content);
  }
  for (const t of themes) {
    const c = t.contrast;
    const mark = c.passesAA ? 'OK ' : 'FIX';
    console.log(`${mark} ${t.id.padEnd(12)} bg ${t.roles.bg} text ${t.roles.text}  ${c.bgText}:1  on-primary ${c.onPrimary}:1  primary-ink ${c.primaryInk}:1  muted ${c.textMuted}:1`);
    for (const w of t.warnings) console.warn(`  ⚠ ${w}`);
  }
  if (check && stale.length) {
    console.error(`生成物が古い: ${stale.join(', ')}（node scripts/build-themes.mjs を実行）`);
    process.exit(1);
  }
}
