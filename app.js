(() => {
  "use strict";
  const T = window.Topo;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ACCENT = "#e8572a";
  const HEX = /^#[0-9a-f]{6}$/i;
  const FX_ORDER = window.TopoFX.ORDER;

  // ---------- defaults ----------
  const FX_DEFAULTS = {
    liquify: { on: false, amount: 0.5, scale: 220 },
    glass: { on: false, width: 44, angle: 90, strength: 0.9, shine: 0.5 },
    mesh: { on: false, cell: 90, strength: 0.7, bevel: 0.6 },
    pixel: { on: false, size: 16, bevel: 0.6 },
    halftone: { on: false, size: 12, angle: 45, mono: true },
    ascii: { on: false, cell: 14, set: "ascii", custom: "", mono: true, invert: false },
    dither: { on: false, matrix: 4, levels: 2, mono: true, pix: 2 },
    chroma: { on: false, amount: 6 },
    grain: { on: false, amount: 0.16, size: 1.5, mono: true },
  };
  const GRAD_PALETTES = [
    ["#ff6b3d", "#ffb4a2", "#5b5bd6", "#1c1c3a", "#f3f1ec"],
    ["#0f1b33", "#3a5bd9", "#7ae0c3", "#f4f6fb"],
    ["#e8572a", "#e0a21b", "#fff3d6", "#d9487a"],
    ["#16171a", "#3a3a44", "#e8572a", "#efe4da"],
    ["#b8f2e6", "#aed9e0", "#5e6472", "#ffa69e", "#faf3dd"],
    ["#2d1b69", "#8b5cf6", "#f472b6", "#fde68a"],
    ["#0b3d2e", "#1f9e78", "#c7f0d8", "#f3f1ec"],
    ["#101114", "#ef2b52", "#ff9a76", "#f3f1ec"],
  ];
  const DEFAULTS = {
    source: "contours",
    w: 1440, h: 900, pattern: "blobs",
    scale: 700, octaves: 2, warp: 0.3, liquify: 0, liqScale: 1.5, seed: 4821, angle: 0, features: 5, bump: 2.4, bumpSize: 90,
    points: [{ x: 0.3, y: 0.42, r: 300, s: 1 }, { x: 0.63, y: 0.6, r: 240, s: 1 }, { x: 0.8, y: 0.28, r: 160, s: 0.8 }],
    usePoints: true, showPoints: true, falloff: 1.2,
    mode: "lines", band: 0.5,
    levels: 18, gap: 18, bias: 0, weight: 1.5, swell: 0, swellSize: 260, taper: 0,
    indexEvery: 0, indexWeight: 2, smooth: 0.6, res: 4, minLen: 12,
    line: "#1c1c1e", line2: "#e8572a", gradient: false, bg: "#ffffff", transparent: false, opacity: 1,
    grad: { type: "mesh", colors: GRAD_PALETTES[0].slice(), points: [{ x: 0.18, y: 0.22 }, { x: 0.8, y: 0.2 }, { x: 0.72, y: 0.8 }, { x: 0.2, y: 0.84 }, { x: 0.48, y: 0.5 }], angle: 35, warp: 0.5, warpScale: 1.6, soft: 1.6 },
    fx: clone(FX_DEFAULTS), ink: "#1c1c1e", paper: "#f3f1ec",
    fmt: "svg", pngScale: 2,
  };
  const STORE = "topographic-v2", PREFS = "isoline-prefs";

  // Fill in anything missing (older saves, imported files) without dropping what's there.
  function withDefaults(src) {
    const out = clone(DEFAULTS);
    if (!src || typeof src !== "object") return out;
    for (const key of Object.keys(out)) {
      if (!(key in src)) continue;
      if (key === "fx") { for (const id of FX_ORDER) out.fx[id] = { ...FX_DEFAULTS[id], ...(src.fx?.[id] || {}) }; }
      else if (key === "grad") out.grad = { ...out.grad, ...src.grad };
      else out[key] = src[key];
    }
    if (!T.PATTERNS.some((p) => p.id === out.pattern)) out.pattern = DEFAULTS.pattern;
    if (!Array.isArray(out.points)) out.points = [];
    const g = out.grad;
    if (!Array.isArray(g.colors) || g.colors.length < 2) g.colors = DEFAULTS.grad.colors.slice();
    g.colors = g.colors.slice(0, 8);
    g.points = (Array.isArray(g.points) ? g.points : []).slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push({ x: Math.random(), y: Math.random() });
    return out;
  }
  let S = withDefaults((() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } })());
  let P = { safe: true, unlock: false };
  try { Object.assign(P, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(P)); } catch (e) {} };
  let sel = null;

  // ---------- helpers ----------
  const icons = () => { try { window.lucide?.createIcons({ attrs: { "stroke-width": 1.75 } }); } catch (e) {} };
  const linear = () => T.LINEAR.has(S.pattern);
  const activePoints = () => S.usePoints && S.points.length > 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2000); };
  const px = (v) => v + "px", deg = (v) => v + "°", f2 = (v) => (+v).toFixed(2), pct = (v) => Math.round(v * 100) + "%";
  const isRaster = (st) => st.source === "gradient" || FX_ORDER.some((id) => st.fx[id].on);

  // ---------- looks ----------
  const offFx = () => clone(FX_DEFAULTS);
  const BASE = { source: "contours", mode: "lines", liquify: 0, swell: 0, taper: 0, indexEvery: 0, gradient: false, transparent: false, opacity: 1 };
  const withFx = (on) => { const f = offFx(); for (const [id, v] of Object.entries(on)) f[id] = { ...f[id], ...v, on: true }; return f; };
  const LOOKS = [
    ["Lines", {
      Soft: { pattern: "terrain", usePoints: false, scale: 1100, octaves: 1, warp: 0.35, levels: 14, bias: 0, weight: 1.25, smooth: 0.8, line: "#1c1c1e", bg: "#ffffff", opacity: 0.6 },
      Bold: { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.2, octaves: 1, levels: 8, bias: 0, weight: 9, smooth: 0.85, line: "#1c1c1e", bg: "#f3f1ec" },
      Orbit: { pattern: "rings", usePoints: true, warp: 0.08, gap: 22, weight: 1.5, smooth: 0.6, line: "#1c1c1e", bg: "#ffffff" },
      Stripes: { pattern: "lines", usePoints: false, angle: 35, warp: 0, gap: 28, weight: 7, smooth: 0.5, line: "#1c1c1e", bg: "#ffffff" },
      Strata: { pattern: "strata", usePoints: false, angle: 0, scale: 1000, octaves: 2, warp: 0.05, features: 4, bump: 2.6, bumpSize: 85, gap: 14, weight: 1.3, smooth: 0.6, line: "#1c1c1e", bg: "#ffffff" },
      Swell: { pattern: "blobs", usePoints: true, falloff: 1.2, warp: 0.3, levels: 16, weight: 2.4, swell: 0.7, swellSize: 260, taper: 160, smooth: 0.7, line: "#1c1c1e", bg: "#ffffff" },
      Night: { pattern: "terrain", usePoints: false, scale: 800, octaves: 2, warp: 0.5, levels: 32, bias: 0, weight: 1, indexEvery: 5, indexWeight: 2.2, smooth: 0.55, line: "#ffffff", bg: "#0f1b33", opacity: 0.4 },
      Spectrum: { pattern: "flow", usePoints: false, angle: 20, scale: 700, octaves: 2, warp: 0.4, levels: 40, bias: 0, weight: 1.6, smooth: 0.6, line: "#e8572a", line2: "#3a5bd9", gradient: true, bg: "#101114" },
    }],
    ["Fills", {
      Liquid: { pattern: "lines", usePoints: false, angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", bg: "#ef2b52" },
      Zebra: { pattern: "flow", usePoints: false, angle: 20, scale: 900, octaves: 2, warp: 0.6, levels: 24, bias: 0, mode: "bands", band: 0.5, smooth: 0.6, line: "#111111", bg: "#ffffff" },
      Marble: { pattern: "lines", usePoints: false, angle: 30, scale: 400, octaves: 2, warp: 0.2, liquify: 2.2, liqScale: 1.4, gap: 16, mode: "bands", band: 0.42, smooth: 0.5, line: "#1c1c1e", bg: "#f3f1ec" },
      Terrace: { pattern: "terrain", usePoints: false, scale: 900, octaves: 3, warp: 0.3, levels: 10, bias: 0, mode: "layers", smooth: 0.6, line: "#1d2b24", line2: "#e8efe2", bg: "#1d2b24" },
      Dune: { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.35, octaves: 2, levels: 12, bias: 0.3, mode: "layers", smooth: 0.7, line: "#e8572a", line2: "#fff3d6", bg: "#e8572a" },
    }],
    ["Effects", {
      Aurora: { source: "gradient", grad: { type: "mesh", colors: GRAD_PALETTES[1].slice(), warp: 0.7, warpScale: 1.4, soft: 1.8 }, fx: withFx({ grain: { amount: 0.14 } }) },
      Fluted: { source: "gradient", grad: { type: "mesh", colors: GRAD_PALETTES[0].slice(), warp: 0.5, warpScale: 1.6, soft: 1.6 }, fx: withFx({ glass: { width: 46, angle: 90, strength: 1, shine: 0.5 }, grain: { amount: 0.08 } }) },
      Frosted: { source: "gradient", grad: { type: "mesh", colors: GRAD_PALETTES[5].slice(), warp: 0.6, warpScale: 1.2, soft: 1.5 }, fx: withFx({ mesh: { cell: 96, strength: 0.8, bevel: 0.6 }, grain: { amount: 0.1 } }) },
      Dither: { pattern: "terrain", usePoints: false, scale: 900, octaves: 3, warp: 0.3, levels: 10, mode: "layers", smooth: 0.6, line: "#1c1c1e", line2: "#f3f1ec", bg: "#1c1c1e", fx: withFx({ dither: { matrix: 4, levels: 2, mono: true, pix: 3 } }), ink: "#1c1c1e", paper: "#f3f1ec" },
      ASCII: { source: "gradient", grad: { type: "mesh", colors: GRAD_PALETTES[7].slice(), warp: 0.6, warpScale: 1.5, soft: 1.6 }, fx: withFx({ ascii: { cell: 12, set: "ascii", mono: false, invert: true } }), paper: "#101114" },
      Halftone: { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1c1c1e", line2: "#f3f1ec", bg: "#1c1c1e", fx: withFx({ halftone: { size: 11, angle: 45, mono: true } }), ink: "#1c1c1e", paper: "#f3f1ec" },
      Pixels: { source: "gradient", grad: { type: "conic", colors: GRAD_PALETTES[2].slice(), angle: 40, warp: 0.4, warpScale: 1.4 }, fx: withFx({ pixel: { size: 28, bevel: 0.7 } }) },
      Glitch: { pattern: "lines", usePoints: false, angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", bg: "#ef2b52", fx: withFx({ chroma: { amount: 10 }, liquify: { amount: 0.35, scale: 260 }, grain: { amount: 0.12 } }) },
    }],
  ];
  function applyLook(look) {
    const next = { ...S, ...BASE, ...clone(look) };
    next.fx = look.fx ? clone(look.fx) : offFx();
    next.grad = { ...S.grad, ...(look.grad ? clone(look.grad) : {}) };
    const g = next.grad;
    g.points = g.points.slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push({ x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3) });
    if (next.usePoints && !next.points.length) next.points = clone(DEFAULTS.points);
    S = next; sel = null;
    update();
  }
  const lookMatches = (look) => Object.entries(look).every(([key, v]) => {
    if (key === "fx") return FX_ORDER.every((id) => S.fx[id].on === v[id].on);
    if (key === "grad") return S.grad.type === v.type && JSON.stringify(S.grad.colors) === JSON.stringify(v.colors);
    return JSON.stringify(S[key]) === JSON.stringify(v);
  });

  const PALETTES = [
    ["#1c1c1e", "#e8572a", "#ffffff"], ["#ffffff", "#7a9cff", "#0f1b33"], ["#e8572a", "#e0a21b", "#16171a"],
    ["#3a5bd9", "#1f9e78", "#f4f6fb"], ["#1d2b24", "#1f9e78", "#eef3ee"], ["#d9487a", "#3a5bd9", "#fff6f9"],
    ["#b9b6ae", "#1c1c1e", "#ffffff"], ["#ffffff", "#ffd2c2", "#e8572a"], ["#111111", "#8d8b85", "#ef2b52"],
  ];
  const LINE_COLORS = ["#1c1c1e", "#8d8b85", "#e8572a", "#ef2b52", "#3a5bd9", "#1f9e78", "#e0a21b", "#ffffff"];
  const BG_COLORS = ["#ffffff", "#f3f1ec", "#efe4da", "#e9eef5", "#16171a", "#0f1b33", "#ef2b52"];
  const SIZES = [
    ["Desktop", [["Desktop", 1440, 900], ["Full HD", 1920, 1080], ["QHD", 2560, 1440], ["MacBook Air", 1512, 982]]],
    ["Mobile", [["iPhone", 393, 852], ["iPhone Pro Max", 430, 932], ["Android", 412, 917]]],
    ["Social", [["Square", 1080, 1080], ["Portrait 4:5", 1080, 1350], ["Story", 1080, 1920], ["Open Graph", 1200, 630], ["X header", 1500, 500], ["LinkedIn banner", 1584, 396]]],
    ["Print 300 dpi", [["A4", 2480, 3508], ["Letter", 2550, 3300]]],
  ];

  // ---------- history ----------
  let hist = [JSON.stringify(S)], hi = 0, histT = 0;
  function commit() {
    clearTimeout(histT);
    histT = setTimeout(() => {
      const j = JSON.stringify(S);
      if (j === hist[hi]) return;
      hist = hist.slice(0, hi + 1); hist.push(j);
      if (hist.length > 120) hist.shift();
      hi = hist.length - 1; syncHistory();
    }, 350);
  }
  function travel(dir) {
    clearTimeout(histT);
    const j = JSON.stringify(S);
    if (j !== hist[hi]) { hist = hist.slice(0, hi + 1); hist.push(j); hi = hist.length - 1; }
    const n = hi + dir;
    if (n < 0 || n >= hist.length) return;
    hi = n; S = JSON.parse(hist[hi]); sel = null;
    update({ commit: false });
  }
  const syncHistory = () => { $("undo").disabled = hi <= 0; $("redo").disabled = hi >= hist.length - 1; };

  // ---------- controls ----------
  const syncers = [];
  const sliders = [];
  const roundStep = (v, c, lo = c.min, hi = c.max) => +clamp(Math.round(v / c.step) * c.step, lo, hi).toFixed(4);
  const hardRange = (c) => c.hard || [c.min > 0 ? c.min / 20 : c.min === 0 ? 0 : c.min * 20, c.max * 25];
  function randomValue(c) {
    const [a, b] = P.safe && c.rand ? c.rand : [c.min, c.max];
    return roundStep(c.log && a > 0 ? a * Math.pow(b / a, Math.random()) : rnd(a, b), c);
  }

  // Slider row with a typed value field and a randomize button.
  function makeSlider(host, c) {
    c.fmt ||= (v) => String(v);
    const id = "s-" + Math.random().toString(36).slice(2, 8);
    const row = document.createElement("div");
    row.className = "ctrl";
    row.innerHTML = `<div class="label-row"><label class="label" for="${id}">${c.label}</label><input class="val" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" aria-label="${c.label} value"><button class="ib xs" title="Randomize ${c.label.toLowerCase()}" aria-label="Randomize ${c.label.toLowerCase()}"><i data-lucide="dice-5"></i></button></div><input id="${id}" type="range">`;
    const input = row.querySelector("input[type=range]"), val = row.querySelector(".val");
    const L = Math.log(c.max / c.min);
    const toVal = (x) => (c.log ? roundStep(c.min * Math.exp((x / 1000) * L), c) : +x);
    const fromVal = (v) => (c.log ? (1000 * Math.log(clamp(v, c.min, c.max) / c.min)) / L : clamp(v, c.min, c.max));
    if (c.log) { input.min = 0; input.max = 1000; input.step = 1; } else { input.min = c.min; input.max = c.max; input.step = c.step; }
    const paint = (v) => {
      input.style.setProperty("--p", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
      row.classList.toggle("over", v > c.max || v < c.min);
      if (document.activeElement !== val) val.value = c.fmt(v);
    };
    input.addEventListener("input", () => { const v = toVal(input.value); c.set(v); paint(v); update({ instant: true }); });
    const commitTyped = () => {
      const txt = val.value.trim().toLowerCase();
      let n = /^(off|even|none)$/.test(txt) ? 0 : parseFloat(txt.replace(/[^0-9.+\-e]/g, ""));
      if (!Number.isFinite(n)) { val.value = c.fmt(c.get()); return; }
      if (c.pct) n /= 100;
      const [lo, hi] = P.unlock ? hardRange(c) : [c.min, c.max];
      c.set(roundStep(n, c, lo, hi)); update();
      val.value = c.fmt(c.get());
    };
    val.addEventListener("focus", () => requestAnimationFrame(() => val.select()));
    val.addEventListener("change", commitTyped);
    val.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); val.blur(); }
      else if (e.key === "Escape") { val.value = c.fmt(c.get()); val.blur(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const step = (c.pct ? 0.01 : c.step) * (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
        const [lo, hi] = P.unlock ? hardRange(c) : [c.min, c.max];
        c.set(roundStep(c.get() + step, c, lo, hi)); update({ instant: true });
        val.value = c.fmt(c.get()); val.select();
      }
    });
    row.querySelector("button").onclick = () => { c.set(randomValue(c)); if (P.safe) safeFix(); update(); };
    c.sync = () => {
      const vis = !c.when || c.when();
      row.hidden = !vis;
      if (!vis) return;
      const v = c.get();
      input.value = fromVal(v); paint(v);
    };
    c.visible = () => !c.when || c.when();
    sliders.push(c); syncers.push(c.sync);
    host.appendChild(row);
    return c;
  }
  const bindKey = (obj, key) => ({ get: () => obj()[key], set: (v) => (obj()[key] = v) });

  function makeSeg(el, get, set) {
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b || b.disabled) return;
      const v = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
      if (v === get()) return;
      set(v); update();
    });
    syncers.push(() => { for (const b of el.children) b.classList.toggle("on", String(get()) === b.dataset.v); });
  }
  function makeSwitch(host, label, get, set) {
    const row = document.createElement("label");
    row.className = "label-row switch-row";
    row.innerHTML = `<span class="label">${label}</span><span class="switch"><input type="checkbox"><span></span></span>`;
    const cb = row.querySelector("input");
    cb.onchange = () => { set(cb.checked); update(); };
    syncers.push(() => (cb.checked = !!get()));
    host.appendChild(row);
  }
  function swatchRow(host, colors, get, set, isNone) {
    const el = $(host);
    const btns = colors.map((c) => {
      const b = document.createElement("button");
      b.className = "sw"; b.style.background = c; b.title = c; b.setAttribute("aria-label", c);
      b.onclick = () => { set(c); update(); };
      el.appendChild(b);
      return b;
    });
    const custom = document.createElement("label");
    custom.className = "sw custom"; custom.title = "Custom color";
    custom.innerHTML = `<input type="color" aria-label="Custom color">`;
    const ci = custom.querySelector("input");
    ci.addEventListener("input", () => { set(ci.value); update({ instant: true }); });
    ci.addEventListener("change", () => commit());
    el.appendChild(custom);
    syncers.push(() => {
      const none = isNone && isNone();
      let hit = false;
      btns.forEach((b, i) => { const on = colors[i] === get() && !none; b.classList.toggle("on", on); hit ||= on; });
      custom.classList.toggle("on", !hit && !none);
      ci.value = get();
    });
  }
  function bindHex(id, get, set, isNone) {
    const el = $(id);
    el.addEventListener("focus", () => requestAnimationFrame(() => el.select()));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") el.blur(); if (e.key === "Escape") { el.value = get(); el.blur(); } });
    el.addEventListener("change", () => {
      let v = el.value.trim().replace(/^#?/, "#").toLowerCase();
      if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map((ch) => ch + ch).join("");
      if (!HEX.test(v)) { el.value = get(); return; }
      set(v); update();
    });
    syncers.push(() => { if (document.activeElement !== el) el.value = isNone && isNone() ? "none" : get(); });
  }
  const dice = (title, fn) => {
    const b = document.createElement("button");
    b.className = "ib"; b.title = title; b.setAttribute("aria-label", title);
    b.innerHTML = `<i data-lucide="dice-5"></i>`;
    b.onclick = fn;
    return b;
  };
  const tools = (g) => document.querySelector(`[data-group="${g}"] .gh-tools`);

  // ---------- contour controls ----------
  const selPoint = () => (S.source === "contours" && sel != null ? S.points[sel] : null);
  const k = (key) => bindKey(() => S, key);
  const lineMode = () => S.mode === "lines";
  [
    { label: "Radius", min: 10, max: 1400, step: 1, log: true, fmt: px, rand: [80, 420], when: () => !!selPoint(), get: () => selPoint()?.r ?? 100, set: (v) => (selPoint().r = v) },
    { label: "Strength", min: -3, max: 3, step: 0.05, fmt: (v) => (v > 0 ? "+" : "") + (+v).toFixed(2), rand: [-1, 2], when: () => !!selPoint(), get: () => selPoint()?.s ?? 1, set: (v) => (selPoint().s = v) },
    { label: "Falloff", ...k("falloff"), min: 0.3, max: 6, step: 0.05, log: true, fmt: f2, rand: [0.6, 3] },
  ].forEach((c) => makeSlider($("pointCtrls"), { group: "points", ...c }));
  [
    { label: "Scale", ...k("scale"), min: 80, max: 1600, step: 10, log: true, fmt: px, rand: [250, 1200] },
    { label: "Detail", ...k("octaves"), min: 1, max: 6, step: 1, rand: [1, 4], hard: [1, 10] },
    { label: "Warp", ...k("warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0, 0.9] },
    { label: "Liquify", ...k("liquify"), min: 0, max: 4, step: 0.01, fmt: (v) => (v ? f2(v) : "Off"), rand: [0, 1.5] },
    { label: "Liquify size", ...k("liqScale"), min: 0.3, max: 4, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [0.8, 2.2], when: () => S.liquify > 0 },
    { label: "Angle", ...k("angle"), min: 0, max: 180, step: 1, fmt: deg, when: () => T.ANGLED.has(S.pattern) },
    { label: "Features", ...k("features"), min: 0, max: 20, step: 1, rand: [2, 9], hard: [0, 24], when: () => S.pattern === "strata" || (["blobs", "rings"].includes(S.pattern) && !activePoints()) },
    { label: "Bulge", ...k("bump"), min: 0, max: 4, step: 0.05, fmt: f2, rand: [0.5, 3], when: () => ["strata", "waves", "dunes"].includes(S.pattern) },
    { label: "Bulge size", ...k("bumpSize"), min: 20, max: 400, step: 5, fmt: px, rand: [50, 200], when: () => S.pattern === "strata" },
  ].forEach((c) => makeSlider($("shape"), { group: "shape", ...c }));
  [
    { label: "Count", ...k("levels"), min: 2, max: 120, step: 1, rand: [6, 36], hard: [1, 4000], when: () => !linear() },
    { label: "Gap", ...k("gap"), min: 2, max: 200, step: 0.5, log: true, fmt: px, rand: [10, 48], hard: [0.5, 5000], when: linear },
    { label: "Bias", ...k("bias"), min: -2, max: 2, step: 0.05, fmt: (v) => (v === 0 ? "Even" : f2(v)), rand: [-1, 1], when: () => !linear() },
    { label: "Thickness", ...k("band"), pct: true, min: 0.02, max: 0.98, step: 0.01, fmt: pct, rand: [0.3, 0.6], hard: [0.01, 0.99], when: () => S.mode === "bands" },
    { label: "Weight", ...k("weight"), min: 0.25, max: 40, step: 0.05, log: true, fmt: (v) => f2(v) + "px", rand: [0.75, 6], when: lineMode },
    { label: "Swell", ...k("swell"), pct: true, min: 0, max: 1, step: 0.01, fmt: (v) => (v ? pct(v) : "Off"), rand: [0, 0.8], when: lineMode },
    { label: "Swell size", ...k("swellSize"), min: 20, max: 900, step: 5, log: true, fmt: px, rand: [120, 500], when: () => lineMode() && S.swell > 0 },
    { label: "Taper", ...k("taper"), min: 0, max: 600, step: 5, fmt: (v) => (v ? v + "px" : "Off"), rand: [0, 250], when: lineMode },
    { label: "Accent every", ...k("indexEvery"), min: 0, max: 12, step: 1, fmt: (v) => (v ? v : "Off"), rand: [0, 8], hard: [0, 100], when: lineMode },
    { label: "Accent weight", ...k("indexWeight"), min: 1, max: 5, step: 0.1, fmt: (v) => (+v).toFixed(1) + "×", rand: [1.5, 3], when: () => lineMode() && S.indexEvery > 0 },
    { label: "Smooth", ...k("smooth"), min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.4, 0.85], hard: [0, 4] },
    { label: "Grid", ...k("res"), min: 2, max: 12, step: 1, fmt: px, rand: [3, 5], hard: [1, 64] },
    { label: "Clean", ...k("minLen"), min: 0, max: 300, step: 1, fmt: (v) => (v ? v + "px" : "Off"), rand: [4, 60] },
  ].forEach((c) => makeSlider($("lines"), { group: "lines", ...c }));
  makeSlider($("color"), { group: "color", label: "Opacity", ...k("opacity"), pct: true, min: 0.05, max: 1, step: 0.01, fmt: pct, rand: [0.4, 1], hard: [0, 1] });
  makeSeg($("mode"), () => S.mode, (v) => (S.mode = v));

  // ---------- gradient controls ----------
  const g = () => S.grad;
  makeSeg($("gradType"), () => S.grad.type, (v) => (S.grad.type = v));
  [
    { label: "Angle", ...bindKey(g, "angle"), min: 0, max: 360, step: 1, fmt: deg, when: () => ["linear", "conic"].includes(S.grad.type) },
    { label: "Softness", ...bindKey(g, "soft"), min: 0.5, max: 4, step: 0.05, fmt: f2, rand: [1, 2.6], when: () => S.grad.type === "mesh" },
    { label: "Warp", ...bindKey(g, "warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1] },
    { label: "Warp size", ...bindKey(g, "warpScale"), min: 0.2, max: 8, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [0.8, 3], when: () => S.grad.warp > 0 },
  ].forEach((c) => makeSlider($("gradCtrls"), { group: "gradient", ...c }));
  function renderStops() {
    const el = $("stops");
    el.innerHTML = "";
    S.grad.colors.forEach((c, i) => {
      const item = document.createElement("div");
      item.className = "stop" + (S.source === "gradient" && sel === i ? " on" : "");
      item.innerHTML = `<label class="sw" style="background:${c}" title="${c}"><input type="color" value="${c}" aria-label="Color ${i + 1}"></label>${S.grad.colors.length > 2 ? `<button class="x" aria-label="Remove color ${i + 1}"><i data-lucide="x"></i></button>` : ""}`;
      const ci = item.querySelector("input");
      ci.addEventListener("input", () => { S.grad.colors[i] = ci.value; item.querySelector(".sw").style.background = ci.value; update({ instant: true }); });
      ci.addEventListener("change", () => commit());
      item.querySelector(".x")?.addEventListener("click", () => { S.grad.colors.splice(i, 1); S.grad.points.splice(i, 1); sel = null; update(); });
      el.appendChild(item);
    });
    if (S.grad.colors.length < 8) {
      const add = document.createElement("button");
      add.className = "stop-add"; add.title = "Add color"; add.setAttribute("aria-label", "Add color");
      add.innerHTML = `<i data-lucide="plus"></i>`;
      add.onclick = () => addStop(rnd(0.15, 0.85), rnd(0.15, 0.85));
      el.appendChild(add);
    }
    $("stopCount").textContent = `${S.grad.colors.length} / 8`;
    icons();
  }
  function addStop(x, y) {
    if (S.grad.colors.length >= 8) return toast("Up to 8 colors");
    S.grad.colors.push(pick(pick(GRAD_PALETTES)));
    S.grad.points.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
    sel = S.grad.colors.length - 1;
    update();
  }
  function randomGradient() {
    const pal = pick(GRAD_PALETTES).slice();
    S.grad.colors = pal;
    S.grad.points = pal.map(() => ({ x: +rnd(0.08, 0.92).toFixed(3), y: +rnd(0.08, 0.92).toFixed(3) }));
    S.grad.warp = +rnd(0.2, 0.9).toFixed(2);
    S.grad.warpScale = +rnd(0.9, 2.5).toFixed(2);
    S.grad.soft = +rnd(1.2, 2.2).toFixed(2);
    S.grad.angle = Math.round(rnd(0, 360));
    sel = null;
  }

  // ---------- effects ----------
  const FX_UI = {
    liquify: ["Liquify", [{ k: "amount", label: "Amount", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1] }, { k: "scale", label: "Size", min: 20, max: 1200, step: 5, log: true, fmt: px, rand: [80, 500] }]],
    glass: ["Fluted glass", [{ k: "width", label: "Rib width", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [18, 90] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.4, 1.6] }, { k: "shine", label: "Shine", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    mesh: ["Glass grid", [{ k: "cell", label: "Cell", min: 8, max: 400, step: 1, log: true, fmt: px, rand: [40, 160] }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    pixel: ["Pixels", [{ k: "size", label: "Size", min: 2, max: 160, step: 1, log: true, fmt: px, rand: [8, 40] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    halftone: ["Halftone", [{ k: "size", label: "Dot size", min: 3, max: 80, step: 0.5, log: true, fmt: px, rand: [6, 24] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ascii: ["ASCII", [{ seg: "set", options: [["ascii", "ASCII"], ["blocks", "Blocks"], ["dots", "Dots"], ["binary", "01"], ["custom", "Custom"]] }, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [8, 24] }, { sw: "mono", label: "Ink only" }, { sw: "invert", label: "Invert" }]],
    dither: ["Dither", [{ seg: "matrix", options: [[2, "2×2"], [4, "4×4"], [8, "8×8"]] }, { k: "levels", label: "Levels", min: 2, max: 8, step: 1, hard: [2, 32] }, { k: "pix", label: "Pixel", min: 1, max: 16, step: 1, fmt: px, rand: [1, 4], hard: [1, 128] }, { sw: "mono", label: "Ink only" }]],
    chroma: ["Chromatic", [{ k: "amount", label: "Shift", min: 0, max: 60, step: 0.5, fmt: px, rand: [2, 14] }]],
    grain: ["Grain", [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.06, 0.3] }, { k: "size", label: "Size", min: 1, max: 8, step: 0.5, fmt: px, rand: [1, 2.5] }, { sw: "mono", label: "Mono" }]],
  };
  for (const id of FX_ORDER) {
    const [name, params] = FX_UI[id];
    const e = () => S.fx[id];
    const item = document.createElement("div");
    item.className = "fx-item";
    item.innerHTML = `<div class="fx-head"><span class="fx-name">${name}</span><button class="ib xs fx-dice" title="Randomize ${name.toLowerCase()}" aria-label="Randomize ${name.toLowerCase()}"><i data-lucide="dice-5"></i></button><label class="switch"><input type="checkbox" aria-label="${name}"><span></span></label></div><div class="fx-body"></div>`;
    const body = item.querySelector(".fx-body"), cb = item.querySelector("input");
    cb.onchange = () => { e().on = cb.checked; update(); };
    const sliderCfgs = [];
    for (const p of params) {
      if (p.seg) {
        const seg = document.createElement("div");
        seg.className = "seg sm";
        seg.innerHTML = p.options.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join("");
        body.appendChild(seg);
        makeSeg(seg, () => e()[p.seg], (v) => (e()[p.seg] = v));
      } else if (p.sw) {
        makeSwitch(body, p.label, () => e()[p.sw], (v) => (e()[p.sw] = v));
      } else if (p.text) {
        const row = document.createElement("div");
        row.className = "ctrl";
        row.innerHTML = `<input class="field mono" placeholder="${p.label}" aria-label="${p.label}" spellcheck="false" maxlength="24">`;
        const inp = row.querySelector("input");
        inp.addEventListener("change", () => { e()[p.text] = inp.value; update(); });
        syncers.push(() => { row.hidden = !p.when(e()); if (document.activeElement !== inp) inp.value = e()[p.text] || ""; });
        body.appendChild(row);
      } else {
        sliderCfgs.push(makeSlider(body, { group: "fx-" + id, label: p.label, min: p.min, max: p.max, step: p.step, log: p.log, fmt: p.fmt, rand: p.rand, hard: p.hard, get: () => e()[p.k], set: (v) => (e()[p.k] = v) }));
      }
    }
    item.querySelector(".fx-dice").onclick = () => { for (const c of sliderCfgs) c.set(randomValue(c)); e().on = true; if (P.safe) safeFix(); update(); };
    syncers.push(() => { cb.checked = e().on; item.classList.toggle("on", e().on); body.hidden = !e().on; });
    $("fxList").appendChild(item);
  }
  syncers.push(() => {
    const f = S.fx;
    $("inkPaper").hidden = !((f.halftone.on && f.halftone.mono) || f.ascii.on || (f.dither.on && f.dither.mono));
  });
  tools("effects").append(dice("Random effects", () => { randomEffects(); update(); }));
  function randomEffects() {
    for (const id of FX_ORDER) S.fx[id].on = false;
    const pool = ["glass", "mesh", "grain", "dither", "halftone", "pixel", "chroma", "ascii", "liquify"];
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const id = pick(pool);
      S.fx[id].on = true;
      for (const c of sliders) if (c.group === "fx-" + id) c.set(randomValue(c));
    }
    if (Math.random() < 0.5) S.fx.grain.on = true;
    if (P.safe) safeFix();
  }
  const INK = ["#1c1c1e", "#e8572a", "#3a5bd9", "#1f9e78", "#ef2b52", "#ffffff"];
  const PAPER = ["#f3f1ec", "#ffffff", "#efe4da", "#101114", "#0f1b33", "#ef2b52"];
  swatchRow("inkSw", INK, () => S.ink, (v) => (S.ink = v));
  swatchRow("paperSw", PAPER, () => S.paper, (v) => (S.paper = v));
  bindHex("inkHex", () => S.ink, (v) => (S.ink = v));
  bindHex("paperHex", () => S.paper, (v) => (S.paper = v));

  // ---------- patterns + looks ----------
  const patBtns = {};
  for (const p of T.PATTERNS) {
    const b = document.createElement("button");
    b.className = "pat";
    b.innerHTML = `<div class="th"></div><span>${p.label}</span>`;
    b.onclick = () => { S.pattern = p.id; update(); };
    $("patterns").appendChild(b);
    patBtns[p.id] = b;
  }
  const lookBtns = [];
  for (const [group, looks] of LOOKS) {
    const h = document.createElement("div");
    h.className = "look-group";
    h.innerHTML = `<span class="look-label">${group}</span>`;
    const row = document.createElement("div");
    row.className = "chips";
    for (const [name, look] of Object.entries(looks)) {
      const b = document.createElement("button");
      b.className = "chip"; b.textContent = name;
      b.onclick = () => applyLook(look);
      row.appendChild(b);
      lookBtns.push([b, { ...BASE, fx: offFx(), ...look }]);
    }
    h.appendChild(row);
    $("looks").appendChild(h);
  }
  syncers.push(() => { for (const [b, look] of lookBtns) b.classList.toggle("on", lookMatches(look)); });

  let thumbKey = "";
  function drawThumbs() {
    if (S.source !== "contours") return;
    const key = JSON.stringify([S.seed, S.warp, S.liquify, S.liqScale, S.octaves, S.scale, S.w, S.h, S.angle, S.features, S.bump, S.bumpSize, S.falloff, S.usePoints, S.points]);
    if (key === thumbKey) return;
    thumbKey = key;
    for (const p of T.PATTERNS) {
      const ts = { ...S, pattern: p.id, mode: "lines", levels: 11, bias: 0, swell: 0, taper: 0, gradient: false, transparent: false, bg: "#ffffff", line: "#47463f", weight: 2.2, indexEvery: 0, opacity: 1, smooth: 0.5, gap: S.w / 13 };
      patBtns[p.id].querySelector(".th").innerHTML = T.buildSVG(ts, { w: 120, h: 80, res: 2, minLen: 40 }).svg;
    }
  }

  // ---------- section tools ----------
  tools("looks").append(dice("Random look", () => applyLook(pick(LOOKS.flatMap(([, l]) => Object.values(l))))));
  tools("pattern").append(dice("Random pattern", () => { S.pattern = pick(T.PATTERNS.filter((p) => p.id !== S.pattern)).id; update(); }));
  tools("points").append(dice("Scatter points", () => scatter()));
  tools("shape").append(dice("Randomize shape", () => { randomizeGroup("shape"); update(); }));
  tools("lines").append(dice("Randomize lines", () => { randomizeGroup("lines"); update(); }));
  tools("color").append(dice("Random palette", () => { randomPalette(); update(); }));
  tools("gradient").append(dice("Random gradient", () => { randomGradient(); update(); }));
  function randomizeGroup(group) {
    for (const c of sliders) if (c.group === group && c.visible() && c.label !== "Grid") c.set(randomValue(c));
    if (P.safe) safeFix();
  }
  function randomPalette() {
    const [a, b, bg] = pick(PALETTES);
    Object.assign(S, { line: a, line2: b, bg, transparent: false, gradient: Math.random() < 0.4 });
  }

  // Keeps randomized output away from settings that turn into solid fills or stall rendering.
  function safeFix(st = S) {
    const lin = T.LINEAR.has(st.pattern);
    if (lin) st.gap = Math.max(st.gap, st.mode === "lines" ? 8 : 10);
    else st.levels = Math.min(st.levels, 40);
    const spacing = lin ? st.gap : Math.max(3, (0.5 * st.scale) / Math.max(1, st.levels));
    if (st.mode === "lines") st.weight = +Math.min(st.weight, Math.max(0.5, spacing * 0.45)).toFixed(2);
    st.octaves = Math.min(st.octaves, 4); st.warp = Math.min(st.warp, 1.2); st.liquify = Math.min(st.liquify, 2);
    st.res = Math.max(st.res, 3); st.minLen = Math.max(st.minLen, 4); st.band = clamp(st.band, 0.25, 0.75);
    const f = st.fx;
    f.pixel.size = Math.max(f.pixel.size, 5); f.ascii.cell = Math.max(f.ascii.cell, 8); f.halftone.size = Math.max(f.halftone.size, 5);
    f.glass.width = Math.max(f.glass.width, 12); f.mesh.cell = Math.max(f.mesh.cell, 24); f.grain.amount = Math.min(f.grain.amount, 0.35);
    f.chroma.amount = Math.min(f.chroma.amount, 16); f.liquify.amount = Math.min(f.liquify.amount, 1.2);
  }

  // ---------- swatches ----------
  swatchRow("lineSw", LINE_COLORS, () => S.line, (v) => (S.line = v));
  swatchRow("line2Sw", LINE_COLORS, () => S.line2, (v) => (S.line2 = v));
  swatchRow("bgSw", BG_COLORS, () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  bindHex("lineHex", () => S.line, (v) => (S.line = v));
  bindHex("line2Hex", () => S.line2, (v) => (S.line2 = v));
  bindHex("bgHex", () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  $("seed").onchange = (e) => { S.seed = clamp(Math.floor(+e.target.value || 0), 0, 999999); update(); };

  // ---------- tabs ----------
  makeSeg($("tabs"), () => S.source, (v) => { S.source = v; sel = null; });

  // ---------- points ----------
  $("usePoints").onchange = (e) => { S.usePoints = e.target.checked; if (S.usePoints && !S.points.length) S.points = clone(DEFAULTS.points); update(); };
  $("showPoints").onclick = () => { S.showPoints = !S.showPoints; update({ commit: false, instant: true }); };
  $("addPoint").onclick = () => addPoint(rnd(0.2, 0.8), rnd(0.2, 0.8));
  $("clearPoints").onclick = () => { S.points = []; sel = null; update(); };
  $("scatter").onclick = () => scatter();
  function addPoint(x, y) {
    S.points.push({ x: +x.toFixed(4), y: +y.toFixed(4), r: Math.round(Math.min(S.w, S.h) * rnd(0.12, 0.25)), s: 1 });
    sel = S.points.length - 1; S.usePoints = true; S.showPoints = true;
    update();
  }
  function scatterPoints() {
    const n = 2 + Math.floor(Math.random() * 4);
    S.points = Array.from({ length: n }, () => ({
      x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3),
      r: Math.round(Math.min(S.w, S.h) * rnd(0.1, 0.3)), s: +(Math.random() < 0.2 ? rnd(-1, -0.4) : rnd(0.6, 1.4)).toFixed(2),
    }));
    S.usePoints = true; sel = null;
  }
  function scatter() { scatterPoints(); update(); }

  // ---------- canvas overlay: point handles and gradient color handles ----------
  const art = $("art"), artSvg = $("artSvg"), fxCanvas = $("fx"), ov = $("ov"), wrap = $("wrap");
  const handleList = () => (S.source === "gradient" ? (S.grad.type === "mesh" ? S.grad.points : null) : S.usePoints && S.showPoints ? S.points : null);
  function drawOverlay(st = S) {
    ov.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    const grad = st.source === "gradient";
    const list = grad ? (st.grad.type === "mesh" ? st.grad.points : null) : st.usePoints && st.showPoints ? st.points : null;
    ov.classList.toggle("off", !list);
    if (!list) { ov.innerHTML = ""; return; }
    const u = S.w / Math.max(1, art.clientWidth);
    const ns = 'vector-effect="non-scaling-stroke"';
    let out = "";
    list.forEach((p, i) => {
      const x = p.x * S.w, y = p.y * S.h, on = i === sel;
      if (grad) {
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 13 : 11) * u}" fill="${on ? ACCENT : "rgba(0,0,0,.28)"}" ${ns} pointer-events="none"/>`;
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 11 : 9.5) * u}" fill="#fff" ${ns} pointer-events="none"/>`;
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 8.5 : 7) * u}" fill="${st.grad.colors[i]}" ${ns} pointer-events="none"/>`;
      } else {
        out += `<circle cx="${x}" cy="${y}" r="${p.r}" fill="none" stroke="${on ? ACCENT : "rgba(120,120,120,.55)"}" stroke-width="1" stroke-dasharray="3 4" ${ns} pointer-events="none"/>`;
        if (on) out += `<line x1="${x}" y1="${y}" x2="${x + p.r}" y2="${y}" stroke="${ACCENT}" stroke-width="1" ${ns} pointer-events="none"/><circle class="rs" data-i="${i}" cx="${x + p.r}" cy="${y}" r="${6 * u}" fill="#fff" stroke="${ACCENT}" stroke-width="1.5" ${ns}/>`;
        out += `<circle cx="${x}" cy="${y}" r="${8 * u}" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width="1" ${ns} pointer-events="none"/>`;
        out += `<circle cx="${x}" cy="${y}" r="${4.5 * u}" fill="${p.s < 0 ? "#fff" : on ? ACCENT : "#1c1c1e"}" stroke="${on ? ACCENT : "#1c1c1e"}" stroke-width="1.5" ${ns} pointer-events="none"/>`;
      }
      out += `<circle class="pt" data-i="${i}" cx="${x}" cy="${y}" r="${14 * u}" fill="transparent"/>`;
    });
    ov.innerHTML = out;
  }
  const toArt = (e) => { const r = ov.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * S.w, ((e.clientY - r.top) / r.height) * S.h]; };
  let drag = null;
  ov.addEventListener("pointerdown", (e) => {
    const t = e.target, i = t.dataset?.i, list = handleList();
    if (i == null || !list) { if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    sel = +i;
    const p = list[sel], [x, y] = toArt(e);
    drag = t.classList.contains("rs") ? { mode: "r" } : { mode: "m", dx: p.x * S.w - x, dy: p.y * S.h - y };
    ov.setPointerCapture(e.pointerId); ov.classList.add("dragging");
    syncUI(); drawOverlay(); e.preventDefault();
  });
  ov.addEventListener("pointermove", (e) => {
    const list = handleList();
    if (!drag || !list) return;
    const p = list[sel], [x, y] = toArt(e);
    if (drag.mode === "m") { p.x = +clamp((x + drag.dx) / S.w, -0.3, 1.3).toFixed(4); p.y = +clamp((y + drag.dy) / S.h, -0.3, 1.3).toFixed(4); }
    else p.r = Math.round(clamp(Math.hypot(x - p.x * S.w, y - p.y * S.h), 10, 1400));
    drawOverlay(); syncUI(); render(true);
  });
  const endDrag = () => { if (!drag) return; drag = null; ov.classList.remove("dragging"); update({ instant: true }); };
  ov.addEventListener("pointerup", endDrag);
  ov.addEventListener("pointercancel", endDrag);
  ov.addEventListener("dblclick", (e) => {
    const i = e.target.dataset?.i;
    const [x, y] = toArt(e);
    if (S.source === "gradient") { if (i == null && S.grad.type === "mesh") addStop(x / S.w, y / S.h); return; }
    if (i != null) { const p = S.points[+i]; p.s = -p.s; sel = +i; update(); return; }
    addPoint(x / S.w, y / S.h);
  });
  let wheelT = 0;
  ov.addEventListener("wheel", (e) => {
    const i = e.target.dataset?.i;
    if (i == null || S.source !== "contours") return;
    e.preventDefault();
    sel = +i;
    const p = S.points[sel];
    p.r = Math.round(clamp(p.r * Math.exp(-e.deltaY * 0.0015), 10, 1400));
    drawOverlay(); syncUI(); render(true);
    clearTimeout(wheelT); wheelT = setTimeout(() => update({ instant: true }), 180);
  }, { passive: false });

  // ---------- size ----------
  const clampDim = (v) => clamp(Math.round(+v || 0), 64, P.unlock ? 16000 : 8000);
  for (const key of ["w", "h"]) {
    $(key).onchange = (e) => { S[key] = clampDim(e.target.value); update(); };
    $(key).onkeydown = (e) => { if (e.key === "Enter") e.target.blur(); };
  }
  $("swap").onclick = () => { [S.w, S.h] = [S.h, S.w]; update(); };
  const sizeMenu = $("sizeMenu");
  sizeMenu.innerHTML = SIZES.map(([grp, list]) => `<h3>${grp}</h3>` + list.map(([n, w, h]) => `<button class="opt" data-w="${w}" data-h="${h}"><span>${n}</span><span class="mono">${w}×${h}</span></button>`).join("")).join("");
  sizeMenu.onclick = (e) => {
    const b = e.target.closest(".opt");
    if (!b) return;
    S.w = +b.dataset.w; S.h = +b.dataset.h; closeMenus(); update();
  };
  const presetName = () => { for (const [, list] of SIZES) for (const [n, w, h] of list) if (w === S.w && h === S.h) return n; return "Custom"; };

  // ---------- menus + modals ----------
  const menus = { sizeBtn: sizeMenu, exportBtn: $("exportMenu"), settingsBtn: $("settingsMenu") };
  function closeMenus() { Object.values(menus).forEach((m) => (m.hidden = true)); }
  for (const [btn, menu] of Object.entries(menus)) {
    $(btn).onclick = (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      if (open && menu === sizeMenu) for (const o of sizeMenu.querySelectorAll(".opt")) o.classList.toggle("on", +o.dataset.w === S.w && +o.dataset.h === S.h);
      if (open && menu.id === "exportMenu") refreshExport();
    };
  }
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".menu-wrap")) closeMenus(); });
  const openModal = (id) => { $(id).hidden = false; $(id).querySelector("button.primary")?.focus(); };
  const closeModal = (id) => ($(id).hidden = true);
  for (const m of document.querySelectorAll(".modal")) m.addEventListener("pointerdown", (e) => { if (e.target === m) m.hidden = true; });

  // ---------- settings ----------
  $("safe").onchange = (e) => { P.safe = e.target.checked; savePrefs(); toast(P.safe ? "Safe values on" : "Safe values off. Randomize uses full ranges."); };
  $("unlock").onchange = (e) => {
    if (e.target.checked) { e.target.checked = false; closeMenus(); openModal("unlockModal"); return; }
    P.unlock = false; savePrefs(); toast("Values locked to slider ranges");
  };
  $("unlockCancel").onclick = () => closeModal("unlockModal");
  $("unlockOk").onclick = () => { P.unlock = true; savePrefs(); $("unlock").checked = true; closeModal("unlockModal"); toast("Values unlocked"); };
  const settingsJSON = () => JSON.stringify({ app: "isoline", version: 3, settings: S }, null, 2);
  $("exportSettings").onclick = () => { closeMenus(); download(new Blob([settingsJSON()], { type: "application/json" }), `isoline-settings-${S.seed}.json`, "Settings saved"); };
  $("copySettings").onclick = async () => {
    closeMenus();
    try { await navigator.clipboard.writeText(settingsJSON()); toast("Settings copied"); } catch (e) { toast("Clipboard is blocked here. Use Download settings."); }
  };
  $("importSettings").onclick = () => { closeMenus(); $("importErr").hidden = true; $("importText").value = ""; openModal("importModal"); $("importText").focus(); };
  $("importCancel").onclick = () => closeModal("importModal");
  $("importFile").onchange = async (e) => { const f = e.target.files?.[0]; if (f) $("importText").value = await f.text(); e.target.value = ""; };
  $("importOk").onclick = () => {
    try {
      const data = JSON.parse($("importText").value);
      const src = data && data.settings ? data.settings : data;
      if (!src || typeof src !== "object" || !("pattern" in src || "grad" in src)) throw new Error("not settings");
      S = withDefaults(src); sel = null;
      closeModal("importModal"); update(); toast("Settings imported");
    } catch (err) {
      $("importErr").textContent = "That isn't an Isoline settings file. Paste the JSON from Copy settings or choose a downloaded .json.";
      $("importErr").hidden = false;
    }
  };
  $("resetAll").onclick = () => { closeMenus(); S = withDefaults(null); sel = null; update(); toast("Reset. Undo with ⌘Z"); };

  // ---------- export ----------
  let saver = null;
  window.claude?.use?.("downloads").then((d) => (saver = d)).catch(() => {});
  async function download(blob, name, done) {
    if (saver) {
      try { await saver.save({ filename: name, data: blob }); toast(done); }
      catch (e) { if (e?.code !== "declined") toast("Couldn't save here. Use Copy instead."); }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(done);
  }
  const autoName = () => `isoline-${S.source === "gradient" ? "gradient-" + S.grad.type : S.pattern}-${S.w}x${S.h}-${S.seed}`;
  const fmtBytes = (n) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB");
  const exportFmt = () => (isRaster(S) ? "png" : S.fmt);
  function svgPng(scale) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([current.svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const sc = Math.min(scale, 16000 / Math.max(S.w, S.h));
        const c = document.createElement("canvas");
        c.width = Math.round(S.w * sc); c.height = Math.round(S.h * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject()), "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  async function rasterPng(scale) {
    if (!FXR) throw new Error("no webgl");
    const sc = Math.min(scale, FXR.maxSize / Math.max(S.w, S.h));
    const w = Math.round(S.w * sc), h = Math.round(S.h * sc);
    const image = S.source === "contours" ? await rasterize(current.svg, w, h) : null;
    FXR.render(job(S, w, h, image));
    const blob = await new Promise((r) => fxCanvas.toBlob(r, "image/png"));
    render(false);
    return blob;
  }
  const pngBlob = (scale) => (isRaster(S) ? rasterPng(scale) : svgPng(scale));
  let pngCache = null, exportTok = 0;
  function refreshExport() {
    const raster = isRaster(S), fmt = exportFmt();
    for (const b of $("fmt").children) { b.classList.toggle("on", b.dataset.v === fmt); b.disabled = raster && b.dataset.v === "svg"; }
    $("rasterNote").hidden = !raster;
    for (const b of $("pngScale").children) b.classList.toggle("on", +b.dataset.v === S.pngScale);
    $("pngScale").hidden = fmt !== "png";
    $("copyLbl").textContent = raster ? "Copy PNG" : "Copy SVG";
    if (!$("fname").dataset.edited) $("fname").value = autoName();
    const dims = fmt === "png" ? `${S.w * S.pngScale} × ${S.h * S.pngScale}` : `${S.w} × ${S.h}`;
    const facts = (size) => ($("facts").innerHTML = `<dt>Dimensions</dt><dd>${dims}</dd><dt>File size</dt><dd>${size}</dd>`);
    if (fmt === "svg") { facts(fmtBytes(new Blob([current.svg]).size)); return; }
    facts("…");
    const tok = ++exportTok, key = JSON.stringify(S);
    pngBlob(S.pngScale).then((b) => { if (tok !== exportTok) return; pngCache = { key, blob: b }; facts(fmtBytes(b.size)); }).catch(() => facts("—"));
  }
  $("fname").oninput = (e) => { e.target.dataset.edited = e.target.value ? "1" : ""; };
  $("fmt").onclick = (e) => { const b = e.target.closest("button"); if (b && !b.disabled) { S.fmt = b.dataset.v; save(); refreshExport(); } };
  $("pngScale").onclick = (e) => { const v = e.target.closest("button")?.dataset.v; if (v) { S.pngScale = +v; save(); refreshExport(); } };
  const fileName = () => ($("fname").value.trim() || autoName()).replace(/\.(svg|png)$/i, "");
  $("download").onclick = async () => {
    if (exportFmt() === "svg") return download(new Blob([current.svg], { type: "image/svg+xml" }), fileName() + ".svg", "SVG saved");
    const blob = pngCache?.key === JSON.stringify(S) ? pngCache.blob : await pngBlob(S.pngScale);
    download(blob, fileName() + ".png", "PNG saved");
  };
  async function copyOut() {
    if (!isRaster(S)) {
      try { await navigator.clipboard.writeText(current.svg); toast("Copied. Paste into Figma with ⌘V"); }
      catch (e) { toast("Clipboard is blocked here. Use Download."); }
      return;
    }
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(1) })]); toast("PNG copied. Paste into Figma with ⌘V"); }
    catch (e) { toast("Clipboard is blocked here. Use Download."); }
  }
  $("copy").onclick = copyOut;

  // ---------- randomize ----------
  function reseed() { S.seed = Math.floor(Math.random() * 999999); update(); }
  function shuffleAll() {
    S.source = Math.random() < 0.72 ? "contours" : "gradient";
    for (const id of FX_ORDER) S.fx[id].on = false;
    if (S.source === "contours") {
      S.pattern = pick(T.PATTERNS).id;
      if (Math.random() < 0.55) scatterPoints(); else S.usePoints = false;
      const m = Math.random();
      S.mode = m < 0.5 ? "lines" : m < 0.8 ? "bands" : "layers";
      randomizeGroup("shape"); randomizeGroup("lines");
      S.angle = pick([0, 0, 15, 30, 45, 90, 135, 165, Math.round(rnd(0, 180))]);
      S.liquify = Math.random() < 0.3 ? +rnd(0.4, 2).toFixed(2) : 0;
      S.weight = roundStep(0.8 * Math.pow(10, Math.random() * (P.safe ? 0.9 : 1.3)), sliders.find((c) => c.label === "Weight"));
      S.swell = S.mode === "lines" && Math.random() < 0.3 ? +rnd(0.3, 0.8).toFixed(2) : 0;
      S.taper = S.mode === "lines" && Math.random() < 0.3 ? Math.round(rnd(60, 240)) : 0;
      S.indexEvery = S.mode === "lines" && Math.random() < 0.3 ? Math.round(rnd(3, 6)) : 0;
      S.opacity = 1; S.res = 4;
      randomPalette();
      if (Math.random() < 0.3) randomEffects();
    } else {
      S.grad.type = pick(["mesh", "mesh", "mesh", "linear", "radial", "conic"]);
      randomGradient();
      if (Math.random() < 0.75) randomEffects();
    }
    S.seed = Math.floor(Math.random() * 999999);
    sel = null;
    if (P.safe) safeFix();
    update();
  }
  $("randomize").onclick = reseed;
  $("shuffle").onclick = shuffleAll;
  $("undo").onclick = () => travel(-1);
  $("redo").onclick = () => travel(1);

  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches("input:not([type=range]):not([type=checkbox]), textarea");
    const mod = e.metaKey || e.ctrlKey;
    const modalOpen = !!document.querySelector(".modal:not([hidden])");
    if (e.key === "Escape") {
      closeMenus();
      for (const m of document.querySelectorAll(".modal")) m.hidden = true;
      if (sel != null) { sel = null; syncUI(); drawOverlay(); }
      return;
    }
    if (modalOpen) return;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (typing || mod || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "r") { e.preventDefault(); e.shiftKey ? shuffleAll() : reseed(); }
    else if (key === "c") copyOut();
    else if (key === "e") $("exportBtn").click();
    else if ((e.key === "Delete" || e.key === "Backspace") && sel != null) {
      e.preventDefault();
      if (S.source === "gradient") { if (S.grad.colors.length > 2) { S.grad.colors.splice(sel, 1); S.grad.points.splice(sel, 1); } }
      else S.points.splice(sel, 1);
      sel = null; update();
    }
  });

  // ---------- smooth wheel scrolling ----------
  function smoothWheel(el) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = 0, anim = 0;
    const step = () => {
      const d = target - el.scrollTop;
      if (Math.abs(d) < 0.5) { el.scrollTop = target; anim = 0; return; }
      const before = el.scrollTop;
      el.scrollTop = before + d * 0.18;
      if (el.scrollTop === before) { el.scrollTop = target; anim = 0; return; }
      anim = requestAnimationFrame(step);
    };
    el.addEventListener("wheel", (e) => {
      if (e.ctrlKey) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;
      if (!anim) target = el.scrollTop;
      const unit = e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? el.clientHeight : 1;
      target = clamp(target + e.deltaY * unit, 0, max);
      e.preventDefault();
      if (!anim) anim = requestAnimationFrame(step);
    }, { passive: false });
  }
  smoothWheel($("panel"));
  smoothWheel(sizeMenu);

  // ---------- rendering ----------
  let FXR = null;
  try { FXR = window.TopoFX.createFX(fxCanvas); } catch (e) { FXR = null; }
  let current = { svg: "", raster: false }, raf = 0, anim = 0, painted = null, paintTok = 0, fxWarned = false;
  const rasterCanvas = document.createElement("canvas");
  function rasterize(svg, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => {
        rasterCanvas.width = w; rasterCanvas.height = h;
        const x = rasterCanvas.getContext("2d");
        x.clearRect(0, 0, w, h);
        x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(rasterCanvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  const job = (st, w, h, image) => ({ w, h, k: w / st.w, seed: st.seed, image, grad: st.source === "gradient" ? st.grad : null, fx: st.fx, ink: st.ink, paper: st.paper });
  function fit() {
    const cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) * 2, ah = wrap.clientHeight - parseFloat(cs.paddingTop) * 2;
    const sc = Math.min(aw / S.w, ah / S.h);
    art.style.width = Math.max(40, S.w * sc) + "px";
    art.style.height = Math.max(40, S.h * sc) + "px";
  }
  function previewDims(st) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = Math.max(64, Math.round(art.clientWidth * dpr)), h = Math.round((w * st.h) / st.w);
    const cap = 2200, m = Math.max(w, h);
    if (m > cap) { w = Math.round((w * cap) / m); h = Math.round((h * cap) / m); }
    return { w, h };
  }
  async function paint(st, draft) {
    const tok = ++paintTok, t0 = performance.now();
    fit();
    let raster = isRaster(st);
    if (raster && !FXR) { raster = false; if (!fxWarned) { fxWarned = true; toast("This browser can't run WebGL2, so effects and gradients are off."); } }
    let svg = "";
    if (st.source === "contours") svg = T.buildSVG(st, draft ? { res: Math.max(st.res * 2, 7) } : {}).svg;
    if (raster) {
      const { w, h } = previewDims(st);
      let image = null;
      if (st.source === "contours") { image = await rasterize(svg, w, h); if (tok !== paintTok) return null; }
      FXR.render(job(st, w, h, image));
    } else {
      artSvg.innerHTML = svg;
    }
    fxCanvas.hidden = !raster; artSvg.hidden = raster;
    art.classList.toggle("clear", st.source === "contours" && st.transparent);
    $("ms").textContent = `${Math.round(performance.now() - t0)} ms`;
    $("kind").textContent = raster ? "PNG" : "SVG";
    painted = clone(st);
    drawOverlay(st);
    return { svg, raster };
  }
  function render(draft = false) {
    cancelAnimationFrame(raf); cancelAnimationFrame(anim); anim = 0;
    return new Promise((resolve) => {
      raf = requestAnimationFrame(async () => {
        const r = await paint(S, draft);
        if (r && !draft) { current = r; drawThumbs(); updateMini(); }
        resolve(r);
      });
    });
  }

  // ---------- animated changes ----------
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const INT_KEYS = new Set(["levels", "octaves", "indexEvery", "features", "matrix", "pix"]);
  const hexMix = (a, b, t) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, "0")).join("");
  function tween(a, b, e, key) {
    if (typeof a === "number" && typeof b === "number") return INT_KEYS.has(key) ? Math.round(a + (b - a) * e) : a + (b - a) * e;
    if (typeof a === "string" && typeof b === "string" && HEX.test(a) && HEX.test(b)) return hexMix(a, b, e);
    if (Array.isArray(b)) return b.map((v, i) => (Array.isArray(a) && a[i] !== undefined ? tween(a[i], v, e, key) : v));
    if (b && typeof b === "object") { const o = {}; for (const kk in b) o[kk] = kk === "res" ? b[kk] : tween(a ? a[kk] : undefined, b[kk], e, kk); return o; }
    return b;
  }
  // Anything that isn't a number or a color can't be in-betweened, so it crossfades instead.
  function discrete(a, b) {
    if (typeof a === "number" && typeof b === "number") return false;
    if (typeof a === "string" && typeof b === "string" && HEX.test(a) && HEX.test(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) return a.length !== b.length || a.some((v, i) => discrete(v, b[i]));
    if (a && b && typeof a === "object" && typeof b === "object") return Object.keys(b).some((kk) => kk !== "fmt" && kk !== "pngScale" && discrete(a[kk], b[kk]));
    return a !== b;
  }
  function crossfade(done) {
    const ghost = document.createElement("div");
    ghost.className = "art-ghost";
    if (!fxCanvas.hidden) {
      const c = document.createElement("canvas");
      c.width = fxCanvas.width; c.height = fxCanvas.height;
      c.getContext("2d").drawImage(fxCanvas, 0, 0);
      ghost.appendChild(c);
    } else ghost.innerHTML = artSvg.innerHTML;
    art.insertBefore(ghost, ov);
    done.then(() => requestAnimationFrame(() => (ghost.style.opacity = "0")));
    setTimeout(() => ghost.remove(), 1600);
  }
  function animateFrom(from) {
    const to = clone(S);
    if (!from || reduceMotion.matches) return render();
    if (discrete(from, to) || (isRaster(to) && to.source === "contours")) { crossfade(render()); return; }
    cancelAnimationFrame(raf); cancelAnimationFrame(anim);
    const t0 = performance.now(), dur = 420;
    let busy = false;
    const step = async (now) => {
      const t = Math.min(1, (now - t0) / dur);
      if (t >= 1) { anim = 0; render(); return; }
      anim = requestAnimationFrame(step);
      if (busy) return;
      busy = true;
      await paint(tween(from, to, 1 - Math.pow(1 - t, 3)), true);
      busy = false;
    };
    anim = requestAnimationFrame(step);
  }

  // ---------- floating preview on narrow screens ----------
  const mini = $("mini"), miniIn = $("miniIn"), narrow = matchMedia("(max-width: 900px)");
  let miniShown = false;
  function updateMini() {
    if (!miniShown) return;
    mini.style.aspectRatio = `${S.w} / ${S.h}`;
    if (current.raster) {
      let c = miniIn.querySelector("canvas");
      if (!c) { miniIn.innerHTML = ""; c = document.createElement("canvas"); miniIn.appendChild(c); }
      c.width = 280; c.height = Math.round((280 * S.h) / S.w);
      c.getContext("2d").drawImage(fxCanvas, 0, 0, c.width, c.height);
    } else miniIn.innerHTML = current.svg;
  }
  new IntersectionObserver(([en]) => {
    const show = narrow.matches && !en.isIntersecting;
    if (show === miniShown) return;
    miniShown = show;
    if (show) updateMini();
    mini.classList.toggle("show", show);
  }, { threshold: 0.08 }).observe(wrap);
  mini.onclick = () => wrap.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });

  // ---------- sync ----------
  const mirror = document.createElement("span");
  mirror.className = "dim";
  mirror.style.cssText = "position:absolute;visibility:hidden;width:auto;padding:0;white-space:pre;left:-9999px";
  document.body.appendChild(mirror);
  const measure = (text) => { mirror.style.fontSize = getComputedStyle($("w")).fontSize; mirror.textContent = text; return Math.ceil(mirror.getBoundingClientRect().width); };
  let stopsKey = "";
  function syncUI() {
    for (const s of document.querySelectorAll("[data-source]")) s.hidden = s.dataset.source !== S.source;
    syncers.forEach((f) => f());
    for (const [id, b] of Object.entries(patBtns)) b.classList.toggle("on", id === S.pattern);
    $("line2Sw").classList.toggle("off", !S.gradient && S.mode !== "layers");
    $("lineLbl").textContent = S.mode === "lines" ? "Stroke" : S.mode === "bands" ? "Bands" : "From";
    $("gradient").checked = S.gradient || S.mode === "layers";
    $("gradient").disabled = S.mode === "layers";
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    const eye = S.showPoints ? "eye" : "eye-off";
    if ($("showPoints").dataset.icon !== eye) { $("showPoints").dataset.icon = eye; $("showPoints").innerHTML = `<i data-lucide="${eye}"></i>`; }
    $("seed").value = S.seed;
    $("ptHint").textContent = selPoint() ? "Double-click a point to flip it. Delete removes it." : "Double-click canvas to add. Drag to move. Scroll to resize.";
    $("gradHint").hidden = S.grad.type !== "mesh";
    const sk = JSON.stringify([S.grad.colors, S.source === "gradient" ? sel : null]);
    if (sk !== stopsKey) { stopsKey = sk; renderStops(); }
    for (const key of ["w", "h"]) { const el = $(key); el.value = S[key]; el.style.width = measure(String(S[key])) + 10 + "px"; }
    $("sizeName").textContent = presetName();
    $("safe").checked = P.safe; $("unlock").checked = P.unlock;
    syncHistory();
    icons();
  }
  document.fonts?.ready.then(() => { syncUI(); if (isRaster(S)) render(); });

  function update({ draft = false, commit: doCommit = true, instant = false } = {}) {
    if (sel != null && !(S.source === "gradient" ? S.grad.points[sel] : S.points[sel])) sel = null;
    syncUI(); save();
    if (draft || instant || !painted) render(draft); else animateFrom(painted);
    if (doCommit && !draft) commit();
  }
  let lastWrap = "";
  new ResizeObserver(() => { const key = wrap.clientWidth + "x" + wrap.clientHeight; if (painted && key !== lastWrap) { lastWrap = key; render(); } }).observe(wrap);

  window.TopoBrand?.mount($("brand"), "isoline");
  update({ commit: false });
})();
