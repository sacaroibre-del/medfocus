// 自動生成ファイル: scripts/build-themes.mjs が書き出す。手で編集しない。
// カラーテーマの一覧・適用・永続化。window.MedFocusTheme として公開する。
(function () {
  var STORAGE_KEY = 'medfocus-color-theme';
  var DEFAULT_ID = 'default';
  var THEMES = [
    {
      "id": "denim",
      "name": "Denim",
      "nameJa": "デニム",
      "tags": [
        "クール"
      ],
      "chips": [
        "#CCE6FF",
        "#78AAE9",
        "#4574B7",
        "#2D3B56"
      ],
      "contrast": 8.73,
      "corrected": false
    },
    {
      "id": "fresh-green",
      "name": "Fresh Green",
      "nameJa": "若葉",
      "tags": [
        "ナチュラル"
      ],
      "chips": [
        "#DCE1CF",
        "#B7E8A3",
        "#9ECF8A",
        "#334258"
      ],
      "contrast": 7.62,
      "corrected": false
    },
    {
      "id": "rose-vase",
      "name": "Rose Vase",
      "nameJa": "薔薇",
      "tags": [
        "モダン",
        "ロマンチック"
      ],
      "chips": [
        "#FCECEB",
        "#FFCBC8",
        "#D38D8B",
        "#333D54"
      ],
      "contrast": 9.47,
      "corrected": false
    },
    {
      "id": "bamboo",
      "name": "Bamboo",
      "nameJa": "竹林",
      "tags": [
        "ナチュラル",
        "モダン"
      ],
      "chips": [
        "#D5DE69",
        "#9EB85D",
        "#60782C",
        "#191F11"
      ],
      "contrast": 11.63,
      "corrected": false
    },
    {
      "id": "garnet",
      "name": "Garnet",
      "nameJa": "ガーネット",
      "tags": [
        "モダン"
      ],
      "chips": [
        "#F6F5F0",
        "#962141",
        "#48484A",
        "#1F1F27"
      ],
      "contrast": 14.99,
      "corrected": false
    },
    {
      "id": "navy-blazer",
      "name": "Navy Blazer",
      "nameJa": "紺ブレザー",
      "tags": [
        "カジュアル"
      ],
      "chips": [
        "#C0B3A7",
        "#C99D43",
        "#343F7B",
        "#212023"
      ],
      "contrast": 7.91,
      "corrected": false
    }
  ];
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
    var m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    return m[1].split(/[ ,\/]+/).filter(Boolean).slice(0, 3).map(Number);
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
    if (r < 4.5) {
      // 最後の砦: 文字色を背景に応じて黒か白へ倒す
      console.warn('[theme] ' + id + ': --color-bg / --color-text のコントラスト比 ' + r.toFixed(2) + ':1 が WCAG AA (4.5:1) 未満のため文字色を補正します');
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
