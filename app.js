(() => {
  "use strict";
  const T = window.Topo;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ACCENT = "#e8572a";
  const HEX = /^#[0-9a-f]{6}$/i;
  const px = (v) => v + "px", deg = (v) => v + "°", f2 = (v) => (+v).toFixed(2), pct = (v) => Math.round(v * 100) + "%";

  // ---------- effect catalog ----------
  // [id, name, category, defaults, params]
  const FXC = [
    ["liquify", "Liquify", "Distort", { amount: 0.5, scale: 220 }, [{ k: "amount", label: "Amount", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1] }, { k: "scale", label: "Size", min: 20, max: 1200, step: 5, log: true, fmt: px, rand: [80, 500] }]],
    ["wave", "Waves", "Distort", { amp: 18, length: 180, angle: 0 }, [{ k: "amp", label: "Amplitude", min: 0, max: 160, step: 0.5, fmt: px, rand: [6, 40] }, { k: "length", label: "Wavelength", min: 10, max: 1200, step: 5, log: true, fmt: px, rand: [80, 400] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }]],
    ["swirl", "Twirl", "Distort", { amount: 3, radius: 0.5, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Turn", min: -12, max: 12, step: 0.05, fmt: f2, rand: [-6, 6] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.3, 0.9] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["kaleido", "Kaleidoscope", "Distort", { segments: 6, rotate: 0, zoom: 1 }, [{ k: "segments", label: "Segments", min: 2, max: 16, step: 1, hard: [2, 64] }, { k: "rotate", label: "Rotate", min: 0, max: 360, step: 1, fmt: deg }, { k: "zoom", label: "Zoom", min: 0.3, max: 3, step: 0.01, log: true, fmt: (v) => f2(v) + "×" }]],
    ["glass", "Fluted glass", "Glass", { width: 44, angle: 90, strength: 0.9, shine: 0.5 }, [{ k: "width", label: "Rib width", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [18, 90] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.4, 1.6] }, { k: "shine", label: "Shine", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    ["mesh", "Glass grid", "Glass", { cell: 90, strength: 0.7, bevel: 0.6 }, [{ k: "cell", label: "Cell", min: 8, max: 400, step: 1, log: true, fmt: px, rand: [40, 160] }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["lens", "Liquid glass", "Glass", { shape: "pill", size: 0.42, x: 0.5, y: 0.5, refraction: 0.9, frost: 0.25, rim: 0.7 }, [{ seg: "shape", options: [["circle", "Circle"], ["pill", "Pill"], ["square", "Square"]] }, { k: "size", label: "Size", min: 0.1, max: 1.2, step: 0.01, fmt: f2, rand: [0.3, 0.7] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "refraction", label: "Refraction", min: 0, max: 2.5, step: 0.01, fmt: f2, rand: [0.5, 1.4] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.5] }, { k: "rim", label: "Rim light", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 1] }]],
    ["blur", "Progressive blur", "Light", { amount: 28, dir: "bottom", start: 0.35 }, [{ seg: "dir", options: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["center", "Edges"], ["even", "Even"]] }, { k: "amount", label: "Blur", min: 0, max: 200, step: 0.5, fmt: px, rand: [10, 60] }, { k: "start", label: "Starts at", min: 0, max: 0.95, step: 0.01, fmt: pct, pct: true, rand: [0.2, 0.6] }]],
    ["bloom", "Glow", "Light", { threshold: 0.55, radius: 30, intensity: 0.9 }, [{ k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.3, 0.75] }, { k: "radius", label: "Radius", min: 2, max: 200, step: 1, log: true, fmt: px, rand: [12, 60] }, { k: "intensity", label: "Intensity", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.5] }]],
    ["emboss", "Relief", "Light", { strength: 1.2, angle: 135, depth: 2 }, [{ k: "strength", label: "Strength", min: 0, max: 5, step: 0.01, fmt: f2, rand: [0.6, 2] }, { k: "angle", label: "Light", min: 0, max: 360, step: 1, fmt: deg }, { k: "depth", label: "Depth", min: 0.5, max: 16, step: 0.5, fmt: px, rand: [1, 4] }]],
    ["vignette", "Vignette", "Light", { amount: 0.45, softness: 0.5 }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.7] }, { k: "softness", label: "Softness", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["gradmap", "Gradient map", "Color", { c1: "#101114", c2: "#e8572a", c3: "#fff3d6", mix: 1 }, [{ color: "c1", label: "Shadows" }, { color: "c2", label: "Midtones" }, { color: "c3", label: "Highlights" }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["posterize", "Posterize", "Color", { levels: 5 }, [{ k: "levels", label: "Levels", min: 2, max: 16, step: 1, hard: [2, 64], rand: [3, 7] }]],
    ["halftone", "Halftone", "Print", { size: 12, angle: 45, mono: true }, [{ k: "size", label: "Dot size", min: 3, max: 80, step: 0.5, log: true, fmt: px, rand: [6, 24] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["linescreen", "Engrave", "Print", { spacing: 8, angle: 45, mono: true }, [{ k: "spacing", label: "Line spacing", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [5, 16] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["riso", "Risograph", "Print", { size: 7, offset: 4, grain: 0.3, inkA: "#ff48b0", inkB: "#0078bf", paper: "#f3efe6" }, [{ color: "inkA", label: "Ink 1" }, { color: "inkB", label: "Ink 2" }, { color: "paper", label: "Paper" }, { k: "size", label: "Dot size", min: 3, max: 40, step: 0.5, log: true, fmt: px, rand: [5, 12] }, { k: "offset", label: "Misregister", min: 0, max: 30, step: 0.5, fmt: px, rand: [1, 8] }, { k: "grain", label: "Grain", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["dither", "Dither", "Print", { matrix: 4, levels: 2, mono: true, pix: 2 }, [{ seg: "matrix", options: [[2, "2×2"], [4, "4×4"], [8, "8×8"]] }, { k: "levels", label: "Levels", min: 2, max: 8, step: 1, hard: [2, 32] }, { k: "pix", label: "Pixel", min: 1, max: 16, step: 1, fmt: px, rand: [1, 4], hard: [1, 128] }, { sw: "mono", label: "Ink only" }]],
    ["pixel", "Pixels", "Stylize", { size: 16, bevel: 0.6 }, [{ k: "size", label: "Size", min: 2, max: 160, step: 1, log: true, fmt: px, rand: [8, 40] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["voronoi", "Crystallize", "Stylize", { cell: 42, edge: 0.08 }, [{ k: "cell", label: "Cell", min: 6, max: 300, step: 1, log: true, fmt: px, rand: [20, 90] }, { k: "edge", label: "Edges", min: 0, max: 0.5, step: 0.01, fmt: f2 }]],
    ["ascii", "ASCII", "Stylize", { cell: 14, set: "ascii", custom: "", mono: true, invert: false }, [{ seg: "set", options: [["ascii", "ASCII"], ["blocks", "Blocks"], ["dots", "Dots"], ["binary", "01"], ["custom", "Custom"]] }, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [8, 24] }, { sw: "mono", label: "Ink only" }, { sw: "invert", label: "Invert" }]],
    ["scan", "Scanlines", "Stylize", { spacing: 4, strength: 0.3 }, [{ k: "spacing", label: "Spacing", min: 2, max: 40, step: 0.5, fmt: px, rand: [3, 8] }, { k: "strength", label: "Strength", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.15, 0.5] }]],
    ["chroma", "Chromatic", "Stylize", { amount: 6 }, [{ k: "amount", label: "Shift", min: 0, max: 60, step: 0.5, fmt: px, rand: [2, 14] }]],
    ["grain", "Grain", "Texture", { amount: 0.16, size: 1.5, mono: true }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.06, 0.3] }, { k: "size", label: "Size", min: 1, max: 8, step: 0.5, fmt: px, rand: [1, 2.5] }, { sw: "mono", label: "Mono" }]],
  ];
  const FXI = Object.fromEntries(FXC.map(([id, name, cat, d, p]) => [id, { id, name, cat, d, p }]));
  const FX_IDS = FXC.map((f) => f[0]);
  const FX_DEFAULTS = Object.fromEntries(FXC.map(([id, , , d]) => [id, { on: false, ...d }]));
  const FX_CATS = [...new Set(FXC.map((f) => f[2]))];

  // ---------- defaults ----------
  const GRAD_PALETTES = [
    ["Sunset", ["#ff6b3d", "#ffb4a2", "#5b5bd6", "#1c1c3a", "#f3f1ec"]],
    ["Aurora", ["#0f1b33", "#3a5bd9", "#7ae0c3", "#f4f6fb"]],
    ["Citrus", ["#e8572a", "#e0a21b", "#fff3d6", "#d9487a"]],
    ["Ember", ["#16171a", "#3a3a44", "#e8572a", "#efe4da"]],
    ["Pastel", ["#b8f2e6", "#aed9e0", "#5e6472", "#ffa69e", "#faf3dd"]],
    ["Ultraviolet", ["#2d1b69", "#8b5cf6", "#f472b6", "#fde68a"]],
    ["Forest", ["#0b3d2e", "#1f9e78", "#c7f0d8", "#f3f1ec"]],
    ["Signal", ["#101114", "#ef2b52", "#ff9a76", "#f3f1ec"]],
  ];
  const gp = (name) => GRAD_PALETTES.find((p) => p[0] === name)[1].slice();
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
    grad: { type: "mesh", colors: gp("Sunset"), points: [{ x: 0.18, y: 0.22 }, { x: 0.8, y: 0.2 }, { x: 0.72, y: 0.8 }, { x: 0.2, y: 0.84 }, { x: 0.48, y: 0.5 }], angle: 35, warp: 0.5, warpScale: 1.6, soft: 1.6 },
    fx: clone(FX_DEFAULTS), fxOrder: [], ink: "#1c1c1e", paper: "#f3f1ec",
    fmt: "svg", pngScale: 2,
  };
  const STORE = "topographic-v2", PREFS = "isoline-prefs";

  // Fill in anything missing (older saves, imported files) without dropping what's there.
  function withDefaults(src) {
    const out = clone(DEFAULTS);
    if (!src || typeof src !== "object") return out;
    for (const key of Object.keys(out)) {
      if (!(key in src)) continue;
      if (key === "fx") { for (const id of FX_IDS) out.fx[id] = { ...FX_DEFAULTS[id], ...(src.fx?.[id] || {}) }; }
      else if (key === "grad") out.grad = { ...out.grad, ...src.grad };
      else out[key] = src[key];
    }
    if (!T.PATTERNS.some((p) => p.id === out.pattern)) out.pattern = DEFAULTS.pattern;
    if (!Array.isArray(out.points)) out.points = [];
    const g = out.grad;
    if (!Array.isArray(g.colors) || g.colors.length < 2) g.colors = DEFAULTS.grad.colors.slice();
    g.colors = g.colors.slice(0, 8);
    g.points = (Array.isArray(g.points) ? g.points : []).slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push({ x: +Math.random().toFixed(3), y: +Math.random().toFixed(3) });
    // Effect order: keep the saved order, then any switched-on effect it doesn't list.
    const order = (Array.isArray(src.fxOrder) ? src.fxOrder : []).filter((id) => FXI[id] && out.fx[id].on);
    for (const id of FX_IDS) if (out.fx[id].on && !order.includes(id)) order.push(id);
    out.fxOrder = order;
    return out;
  }
  let S = withDefaults((() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } })());
  let P = { safe: true, unlock: false, tab: "presets" };
  try { Object.assign(P, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(P)); } catch (e) {} };
  let sel = null, openFx = null;

  // ---------- helpers ----------
  const icons = () => { try { window.lucide?.createIcons({ attrs: { "stroke-width": 1.75 } }); } catch (e) {} };
  const linear = () => T.LINEAR.has(S.pattern);
  const activePoints = () => S.usePoints && S.points.length > 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2000); };
  const isRaster = (st) => st.source === "gradient" || st.fxOrder.some((id) => st.fx[id]?.on);
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const patLabel = (id) => T.PATTERNS.find((p) => p.id === id)?.label || id;

  function addFx(id, params) {
    S.fx[id] = { ...S.fx[id], ...(params || {}), on: true };
    if (!S.fxOrder.includes(id)) S.fxOrder.push(id);
  }
  function removeFx(id) { S.fx[id].on = false; S.fxOrder = S.fxOrder.filter((x) => x !== id); if (openFx === id) openFx = null; }

  // ---------- presets ----------
  const BASE = { source: "contours", mode: "lines", liquify: 0, swell: 0, taper: 0, indexEvery: 0, gradient: false, transparent: false, opacity: 1 };
  const PRESETS = [
    ["Lines", "Soft", { pattern: "terrain", usePoints: false, scale: 1100, octaves: 1, warp: 0.35, levels: 14, bias: 0, weight: 1.25, smooth: 0.8, line: "#1c1c1e", bg: "#ffffff", opacity: 0.6 }],
    ["Lines", "Bold", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.2, octaves: 1, levels: 8, bias: 0, weight: 9, smooth: 0.85, line: "#1c1c1e", bg: "#f3f1ec" }],
    ["Lines", "Orbit", { pattern: "rings", usePoints: true, warp: 0.08, gap: 22, weight: 1.5, smooth: 0.6, line: "#1c1c1e", bg: "#ffffff" }],
    ["Lines", "Stripes", { pattern: "lines", usePoints: false, angle: 35, warp: 0, gap: 28, weight: 7, smooth: 0.5, line: "#1c1c1e", bg: "#ffffff" }],
    ["Lines", "Strata", { pattern: "strata", usePoints: false, angle: 0, scale: 1000, octaves: 2, warp: 0.05, features: 4, bump: 2.6, bumpSize: 85, gap: 14, weight: 1.3, smooth: 0.6, line: "#1c1c1e", bg: "#ffffff" }],
    ["Lines", "Swell", { pattern: "blobs", usePoints: true, falloff: 1.2, warp: 0.3, levels: 16, weight: 2.4, swell: 0.7, swellSize: 260, taper: 160, smooth: 0.7, line: "#1c1c1e", bg: "#ffffff" }],
    ["Lines", "Night", { pattern: "terrain", usePoints: false, scale: 800, octaves: 2, warp: 0.5, levels: 32, bias: 0, weight: 1, indexEvery: 5, indexWeight: 2.2, smooth: 0.55, line: "#ffffff", bg: "#0f1b33", opacity: 0.4 }],
    ["Lines", "Spectrum", { pattern: "flow", usePoints: false, angle: 20, scale: 700, octaves: 2, warp: 0.4, levels: 40, bias: 0, weight: 1.6, smooth: 0.6, line: "#e8572a", line2: "#3a5bd9", gradient: true, bg: "#101114" }],
    ["Fills", "Liquid", { pattern: "lines", usePoints: false, angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", bg: "#ef2b52" }],
    ["Fills", "Zebra", { pattern: "flow", usePoints: false, angle: 20, scale: 900, octaves: 2, warp: 0.6, levels: 24, bias: 0, mode: "bands", band: 0.5, smooth: 0.6, line: "#111111", bg: "#ffffff" }],
    ["Fills", "Marble", { pattern: "lines", usePoints: false, angle: 30, scale: 400, octaves: 2, warp: 0.2, liquify: 2.2, liqScale: 1.4, gap: 16, mode: "bands", band: 0.42, smooth: 0.5, line: "#1c1c1e", bg: "#f3f1ec" }],
    ["Fills", "Terrace", { pattern: "terrain", usePoints: false, scale: 900, octaves: 3, warp: 0.3, levels: 10, bias: 0, mode: "layers", smooth: 0.6, line: "#1d2b24", line2: "#e8efe2", bg: "#1d2b24" }],
    ["Fills", "Dune", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.35, octaves: 2, levels: 12, bias: 0.3, mode: "layers", smooth: 0.7, line: "#e8572a", line2: "#fff3d6", bg: "#e8572a" }],
    ["Gradients", "Aurora", { source: "gradient", grad: { type: "mesh", colors: gp("Aurora"), warp: 0.7, warpScale: 1.4, soft: 1.8 }, fx: { grain: { amount: 0.14 } } }],
    ["Gradients", "Dreamy", { source: "gradient", grad: { type: "mesh", colors: gp("Pastel"), warp: 0.9, warpScale: 1.2, soft: 2 }, fx: { blur: { amount: 40, dir: "bottom", start: 0.3 }, grain: { amount: 0.1 } } }],
    ["Gradients", "Fluted", { source: "gradient", grad: { type: "mesh", colors: gp("Sunset"), warp: 0.5, warpScale: 1.6, soft: 1.6 }, fx: { glass: { width: 46, angle: 90, strength: 1, shine: 0.5 }, grain: { amount: 0.08 } } }],
    ["Gradients", "Liquid glass", { source: "gradient", grad: { type: "mesh", colors: gp("Ultraviolet"), warp: 0.6, warpScale: 1.3, soft: 1.6 }, fx: { lens: { shape: "pill", size: 0.42, refraction: 1, frost: 0.2, rim: 0.8 }, grain: { amount: 0.06 } } }],
    ["Gradients", "Frosted", { source: "gradient", grad: { type: "mesh", colors: gp("Ultraviolet"), warp: 0.6, warpScale: 1.2, soft: 1.5 }, fx: { mesh: { cell: 96, strength: 0.8, bevel: 0.6 }, grain: { amount: 0.1 } } }],
    ["Gradients", "Crystal", { source: "gradient", grad: { type: "conic", colors: gp("Citrus"), angle: 30, warp: 0.5, warpScale: 1.5 }, fx: { voronoi: { cell: 48, edge: 0.06 } } }],
    ["Effects", "Riso", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1c1c1e", line2: "#ffffff", bg: "#1c1c1e", fx: { riso: { size: 7, offset: 5, grain: 0.35 } } }],
    ["Effects", "Duotone", { pattern: "lines", usePoints: false, angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", bg: "#ffffff", fx: { gradmap: { c1: "#1d1a4a", c2: "#8b5cf6", c3: "#ffd6e7", mix: 1 }, grain: { amount: 0.1 } } }],
    ["Effects", "Relief", { pattern: "terrain", usePoints: false, scale: 900, octaves: 3, warp: 0.3, levels: 12, bias: 0, mode: "layers", smooth: 0.6, line: "#c9c2b4", line2: "#f6f2ea", bg: "#c9c2b4", fx: { emboss: { strength: 2.4, angle: 135, depth: 3 } } }],
    ["Effects", "Engraved", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1c1c1e", line2: "#f3f1ec", bg: "#1c1c1e", fx: { linescreen: { spacing: 7, angle: 30, mono: true } }, ink: "#1c1c1e", paper: "#f3f1ec" }],
    ["Effects", "Neon", { pattern: "rings", usePoints: true, warp: 0.1, gap: 26, weight: 2, smooth: 0.6, line: "#ff48b0", line2: "#3a5bd9", gradient: true, bg: "#0b0b12", fx: { bloom: { threshold: 0.2, radius: 24, intensity: 1.4 }, vignette: { amount: 0.5 } } }],
    ["Effects", "Dither", { pattern: "terrain", usePoints: false, scale: 900, octaves: 3, warp: 0.3, levels: 10, mode: "layers", smooth: 0.6, line: "#1c1c1e", line2: "#f3f1ec", bg: "#1c1c1e", fx: { dither: { matrix: 4, levels: 2, mono: true, pix: 3 } }, ink: "#1c1c1e", paper: "#f3f1ec" }],
    ["Effects", "ASCII", { source: "gradient", grad: { type: "mesh", colors: gp("Signal"), warp: 0.6, warpScale: 1.5, soft: 1.6 }, fx: { ascii: { cell: 12, set: "ascii", mono: false, invert: true } }, paper: "#101114" }],
    ["Effects", "Halftone", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1c1c1e", line2: "#f3f1ec", bg: "#1c1c1e", fx: { halftone: { size: 11, angle: 45, mono: true } }, ink: "#1c1c1e", paper: "#f3f1ec" }],
    ["Effects", "Kaleido", { pattern: "flow", usePoints: false, angle: 20, scale: 500, octaves: 2, warp: 0.5, levels: 22, mode: "bands", band: 0.5, smooth: 0.6, line: "#e8572a", line2: "#3a5bd9", gradient: true, bg: "#fff3d6", fx: { kaleido: { segments: 8 } } }],
    ["Effects", "VHS", { pattern: "lines", usePoints: false, angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", bg: "#ef2b52", fx: { wave: { amp: 8, length: 90, angle: 90 }, chroma: { amount: 10 }, scan: { spacing: 4, strength: 0.3 }, grain: { amount: 0.12 } } }],
  ];
  const resolved = new Map();
  function resolveLook(look) {
    if (resolved.has(look)) return resolved.get(look);
    const st = withDefaults(null);
    const { fx, grad, ...rest } = look;
    Object.assign(st, BASE, clone(rest));
    st.grad = { ...st.grad, ...(grad ? clone(grad) : {}) };
    st.grad.points = st.grad.points.slice(0, st.grad.colors.length);
    while (st.grad.points.length < st.grad.colors.length) st.grad.points.push({ x: 0.15 + 0.7 * ((st.grad.points.length * 0.37) % 1), y: 0.2 + 0.6 * ((st.grad.points.length * 0.61) % 1) });
    st.fx = clone(FX_DEFAULTS); st.fxOrder = [];
    for (const [id, v] of Object.entries(fx || {})) { st.fx[id] = { ...st.fx[id], ...v, on: true }; st.fxOrder.push(id); }
    resolved.set(look, st);
    return st;
  }
  const LAYERS = {
    shape: ["source", "pattern", "scale", "octaves", "warp", "liquify", "liqScale", "angle", "features", "bump", "bumpSize", "usePoints", "falloff", "grad.type", "grad.warp", "grad.warpScale", "grad.soft", "grad.angle"],
    style: ["mode", "band", "levels", "gap", "bias", "weight", "swell", "swellSize", "taper", "indexEvery", "indexWeight", "smooth"],
    color: ["line", "line2", "gradient", "bg", "transparent", "opacity", "grad.colors", "ink", "paper"],
    effects: ["fx", "fxOrder"],
  };
  const LAYER_NAMES = { shape: "shape", style: "style", color: "colors", effects: "effects" };
  function applyLook(look, layers = Object.keys(LAYERS)) {
    const src = resolveLook(look);
    for (const L of layers) for (const key of LAYERS[L]) setPath(S, key, clone(getPath(src, key)));
    const g = S.grad;
    g.points = g.points.slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push(clone(src.grad.points[g.points.length] || { x: rnd(0.15, 0.85), y: rnd(0.15, 0.85) }));
    if (S.usePoints && !S.points.length) S.points = clone(DEFAULTS.points);
    sel = null; openFx = null;
    update();
  }
  const lookMatches = (look) => {
    const src = resolveLook(look);
    return Object.values(LAYERS).every((keys) => keys.every((key) => JSON.stringify(getPath(S, key)) === JSON.stringify(getPath(src, key))));
  };

  const PALETTES = [
    ["Ink", ["#1c1c1e", "#e8572a", "#ffffff"]], ["Midnight", ["#ffffff", "#7a9cff", "#0f1b33"]], ["Ember", ["#e8572a", "#e0a21b", "#16171a"]],
    ["Ocean", ["#3a5bd9", "#1f9e78", "#f4f6fb"]], ["Moss", ["#1d2b24", "#1f9e78", "#eef3ee"]], ["Bloom", ["#d9487a", "#3a5bd9", "#fff6f9"]],
    ["Fog", ["#b9b6ae", "#1c1c1e", "#ffffff"]], ["Coral", ["#ffffff", "#ffd2c2", "#e8572a"]], ["Signal", ["#111111", "#8d8b85", "#ef2b52"]],
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

  // ---------- control factories ----------
  const syncers = [];
  const sliders = [];
  const roundStep = (v, c, lo = c.min, hi = c.max) => +clamp(Math.round(v / c.step) * c.step, lo, hi).toFixed(4);
  const hardRange = (c) => c.hard || [c.min > 0 ? c.min / 20 : c.min === 0 ? 0 : c.min * 20, c.max * 25];
  function randomValue(c) {
    const [a, b] = P.safe && c.rand ? c.rand : [c.min, c.max];
    return roundStep(c.log && a > 0 ? a * Math.pow(b / a, Math.random()) : rnd(a, b), c);
  }
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
  function makeColor(host, label, get, set) {
    const row = document.createElement("div");
    row.className = "label-row color-row";
    const id = "c-" + Math.random().toString(36).slice(2, 8);
    row.innerHTML = `<label class="label" for="${id}">${label}</label><input class="hex mono" id="${id}" spellcheck="false" autocomplete="off"><label class="sw sm" title="${label}"><input type="color" aria-label="${label}"></label>`;
    const hex = row.querySelector(".hex"), ci = row.querySelector("input[type=color]"), sw = row.querySelector(".sw");
    ci.addEventListener("input", () => { set(ci.value); update({ instant: true }); });
    ci.addEventListener("change", () => commit());
    hex.addEventListener("change", () => {
      let v = hex.value.trim().replace(/^#?/, "#").toLowerCase();
      if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map((ch) => ch + ch).join("");
      if (!HEX.test(v)) { hex.value = get(); return; }
      set(v); update();
    });
    hex.addEventListener("keydown", (e) => { if (e.key === "Enter") hex.blur(); });
    syncers.push(() => { const v = get(); sw.style.background = v; ci.value = v; if (document.activeElement !== hex) hex.value = v; });
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
  const tools = (t) => document.querySelector(`[data-tools="${t}"]`);
  // Preview card: a thumbnail slot plus a label.
  function card(label, onClick, extra = "") {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<div class="th"></div><span class="card-label">${label}</span>${extra}`;
    b.onclick = onClick;
    return b;
  }

  // ---------- tabs ----------
  const TABS = ["presets", "source", "shape", "style", "color", "effects"];
  if (!TABS.includes(P.tab)) P.tab = "presets";
  function setTab(t) {
    P.tab = t; savePrefs();
    syncTabs();
    $("panel").scrollTop = 0;
    schedulePreviews(0);
  }
  $("rail").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) setTab(b.dataset.tab); });
  function syncTabs() {
    for (const b of $("rail").querySelectorAll("button[data-tab]")) { const on = b.dataset.tab === P.tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }
    for (const s of document.querySelectorAll(".tab")) s.hidden = s.dataset.tab !== P.tab;
  }

  // ---------- presets tab ----------
  let presetFilter = "All";
  const presetCards = [];
  const filterEl = $("presetFilter");
  for (const f of ["All", ...new Set(PRESETS.map((p) => p[0]))]) {
    const b = document.createElement("button");
    b.className = "chip sm"; b.textContent = f; b.dataset.f = f;
    b.onclick = () => { presetFilter = f; syncPresets(); schedulePreviews(0); };
    filterEl.appendChild(b);
  }
  for (const [group, name, look] of PRESETS) {
    const take = `<span class="take">${Object.keys(LAYERS).map((L) => `<span role="button" tabindex="0" class="take-btn" data-layer="${L}" title="Use only its ${LAYER_NAMES[L]}">${L === "color" ? "Colors" : L[0].toUpperCase() + L.slice(1)}</span>`).join("")}</span>`;
    const c = card(name, (e) => {
      const t = e.target.closest(".take-btn");
      if (t) { applyLook(look, [t.dataset.layer]); toast(`Took the ${LAYER_NAMES[t.dataset.layer]} from ${name}`); return; }
      applyLook(look);
    }, take);
    c.classList.add("preset");
    c.addEventListener("keydown", (e) => { const t = e.target.closest(".take-btn"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); t.click(); } });
    $("presetGrid").appendChild(c);
    presetCards.push({ el: c, group, name, look, done: false });
  }
  function syncPresets() {
    for (const b of filterEl.children) b.classList.toggle("on", b.dataset.f === presetFilter);
    for (const p of presetCards) { p.el.hidden = presetFilter !== "All" && p.group !== presetFilter; p.el.classList.toggle("on", lookMatches(p.look)); }
  }
  tools("presets").append(dice("Random preset", () => applyLook(pick(PRESETS)[2])));

  // ---------- source tab ----------
  const srcCards = {};
  for (const [id, label] of [["contours", "Contours"], ["gradient", "Gradient"]]) {
    const c = card(label, () => { if (S.source !== id) { S.source = id; sel = null; update(); } });
    $("srcCards").appendChild(c); srcCards[id] = c;
  }
  const patBtns = {};
  for (const p of T.PATTERNS) {
    const c = card(p.label, () => { S.pattern = p.id; update(); });
    $("patterns").appendChild(c); patBtns[p.id] = c;
  }
  const gradBtns = {};
  for (const [id, label] of [["mesh", "Mesh"], ["linear", "Linear"], ["radial", "Radial"], ["conic", "Conic"]]) {
    const c = card(label, () => { S.grad.type = id; update(); });
    $("gradTypes").appendChild(c); gradBtns[id] = c;
  }
  tools("source").append(dice("Random pattern", () => {
    if (S.source === "gradient") S.grad.type = pick(["mesh", "linear", "radial", "conic"].filter((t) => t !== S.grad.type));
    else S.pattern = pick(T.PATTERNS.filter((p) => p.id !== S.pattern)).id;
    update();
  }));

  // ---------- shape tab ----------
  const selPoint = () => (S.source === "contours" && sel != null ? S.points[sel] : null);
  const k = (key) => bindKey(() => S, key);
  const varCards = [];
  for (let i = 0; i < 6; i++) {
    const c = card("", () => { S.seed = c._seed; update(); });
    c.classList.add("var");
    $("variations").appendChild(c); varCards.push(c);
  }
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
    { label: "Radius", min: 10, max: 1400, step: 1, log: true, fmt: px, rand: [80, 420], when: () => !!selPoint(), get: () => selPoint()?.r ?? 100, set: (v) => (selPoint().r = v) },
    { label: "Strength", min: -3, max: 3, step: 0.05, fmt: (v) => (v > 0 ? "+" : "") + (+v).toFixed(2), rand: [-1, 2], when: () => !!selPoint(), get: () => selPoint()?.s ?? 1, set: (v) => (selPoint().s = v) },
    { label: "Falloff", ...k("falloff"), min: 0.3, max: 6, step: 0.05, log: true, fmt: f2, rand: [0.6, 3] },
  ].forEach((c) => makeSlider($("pointCtrls"), { group: "points", ...c }));
  const g = () => S.grad;
  [
    { label: "Angle", ...bindKey(g, "angle"), min: 0, max: 360, step: 1, fmt: deg, when: () => ["linear", "conic"].includes(S.grad.type) },
    { label: "Softness", ...bindKey(g, "soft"), min: 0.5, max: 4, step: 0.05, fmt: f2, rand: [1, 2.6], when: () => S.grad.type === "mesh" },
    { label: "Warp", ...bindKey(g, "warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1] },
    { label: "Warp size", ...bindKey(g, "warpScale"), min: 0.2, max: 8, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [0.8, 3], when: () => S.grad.warp > 0 },
  ].forEach((c) => makeSlider($("gradCtrls"), { group: "gradient", ...c }));
  tools("shape").append(dice("Randomize shape", () => { randomizeGroup(S.source === "gradient" ? "gradient" : "shape"); if (S.source === "gradient") scatterGrad(); update(); }));
  $("seed").onchange = (e) => { S.seed = clamp(Math.floor(+e.target.value || 0), 0, 999999); update(); };

  // ---------- style tab ----------
  const modeBtns = {};
  for (const [id, label] of [["lines", "Lines"], ["bands", "Bands"], ["layers", "Layers"]]) {
    const c = card(label, () => { S.mode = id; update(); });
    $("modes").appendChild(c); modeBtns[id] = c;
  }
  const lineMode = () => S.mode === "lines";
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
  tools("style").append(dice("Randomize style", () => { if (S.source !== "contours") return; S.mode = pick(["lines", "lines", "bands", "layers"]); randomizeGroup("lines"); update(); }));
  $("toContours").onclick = () => { S.source = "contours"; update(); };

  // ---------- color tab ----------
  const palEl = $("palettes");
  const palBtns = [];
  for (const [name, cols] of PALETTES) {
    const b = document.createElement("button");
    b.className = "pal"; b.dataset.src = "contours";
    b.innerHTML = `<span class="pal-sw" style="background:${cols[2]}"><i style="background:${cols[0]}"></i><i style="background:${cols[1]}"></i></span><span>${name}</span>`;
    b.onclick = () => { Object.assign(S, { line: cols[0], line2: cols[1], bg: cols[2], transparent: false }); update(); };
    palEl.appendChild(b); palBtns.push([b, () => S.source === "contours" && S.line === cols[0] && S.bg === cols[2]]);
  }
  for (const [name, cols] of GRAD_PALETTES) {
    const b = document.createElement("button");
    b.className = "pal"; b.dataset.src = "gradient";
    b.innerHTML = `<span class="pal-bar" style="background:linear-gradient(90deg,${cols.join(",")})"></span><span>${name}</span>`;
    b.onclick = () => { setGradColors(cols.slice()); update(); };
    palEl.appendChild(b); palBtns.push([b, () => S.source === "gradient" && JSON.stringify(S.grad.colors) === JSON.stringify(cols)]);
  }
  function setGradColors(cols) {
    S.grad.colors = cols.slice(0, 8);
    while (S.grad.points.length < S.grad.colors.length) S.grad.points.push({ x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3) });
    S.grad.points = S.grad.points.slice(0, S.grad.colors.length);
  }
  swatchRow("lineSw", LINE_COLORS, () => S.line, (v) => (S.line = v));
  swatchRow("line2Sw", LINE_COLORS, () => S.line2, (v) => (S.line2 = v));
  swatchRow("bgSw", BG_COLORS, () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  bindHex("lineHex", () => S.line, (v) => (S.line = v));
  bindHex("line2Hex", () => S.line2, (v) => (S.line2 = v));
  bindHex("bgHex", () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  makeSlider($("color"), { group: "color", label: "Opacity", ...k("opacity"), pct: true, min: 0.05, max: 1, step: 0.01, fmt: pct, rand: [0.4, 1], hard: [0, 1] });
  const INK = ["#1c1c1e", "#e8572a", "#3a5bd9", "#1f9e78", "#ef2b52", "#ffffff"];
  const PAPER = ["#f3f1ec", "#ffffff", "#efe4da", "#101114", "#0f1b33", "#ef2b52"];
  swatchRow("inkSw", INK, () => S.ink, (v) => (S.ink = v));
  swatchRow("paperSw", PAPER, () => S.paper, (v) => (S.paper = v));
  bindHex("inkHex", () => S.ink, (v) => (S.ink = v));
  bindHex("paperHex", () => S.paper, (v) => (S.paper = v));
  tools("color").append(dice("Random palette", () => { randomPalette(); update(); }));
  function randomPalette() {
    if (S.source === "gradient") { setGradColors(pick(GRAD_PALETTES)[1].slice()); return; }
    const [, [a, b, bg]] = pick(PALETTES);
    Object.assign(S, { line: a, line2: b, bg, transparent: false, gradient: Math.random() < 0.4 });
  }
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
    S.grad.colors.push(pick(pick(GRAD_PALETTES)[1]));
    S.grad.points.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
    sel = S.grad.colors.length - 1;
    update();
  }
  function scatterGrad() { S.grad.points = S.grad.colors.map(() => ({ x: +rnd(0.08, 0.92).toFixed(3), y: +rnd(0.08, 0.92).toFixed(3) })); }

  // ---------- effects tab ----------
  const fxBodies = {}, fxSliders = {};
  for (const f of FXC) {
    const [id, , , , params] = f;
    const e = () => S.fx[id];
    const body = document.createElement("div");
    body.className = "fx-body";
    fxSliders[id] = [];
    for (const p of params) {
      if (p.seg) {
        const seg = document.createElement("div");
        seg.className = "seg sm wrap";
        seg.innerHTML = p.options.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join("");
        body.appendChild(seg);
        makeSeg(seg, () => e()[p.seg], (v) => (e()[p.seg] = v));
      } else if (p.sw) makeSwitch(body, p.label, () => e()[p.sw], (v) => (e()[p.sw] = v));
      else if (p.color) makeColor(body, p.label, () => e()[p.color], (v) => (e()[p.color] = v));
      else if (p.text) {
        const row = document.createElement("div");
        row.className = "ctrl";
        row.innerHTML = `<input class="field mono" placeholder="${p.label}" aria-label="${p.label}" spellcheck="false" maxlength="24">`;
        const inp = row.querySelector("input");
        inp.addEventListener("change", () => { e()[p.text] = inp.value; update(); });
        syncers.push(() => { row.hidden = !p.when(e()); if (document.activeElement !== inp) inp.value = e()[p.text] || ""; });
        body.appendChild(row);
      } else fxSliders[id].push(makeSlider(body, { group: "fx-" + id, label: p.label, min: p.min, max: p.max, step: p.step, log: p.log, fmt: p.fmt, pct: p.pct, rand: p.rand, hard: p.hard, get: () => e()[p.k], set: (v) => (e()[p.k] = v) }));
    }
    fxBodies[id] = body;
  }
  const randomizeFx = (id) => { for (const c of fxSliders[id]) c.set(randomValue(c)); };
  // Gallery of effects, each previewed on the current design.
  const fxCards = {};
  for (const cat of FX_CATS) {
    const h = document.createElement("h3");
    h.className = "sub"; h.textContent = cat;
    const grid = document.createElement("div");
    grid.className = "cards three";
    for (const f of FXC.filter((x) => x[2] === cat)) {
      const id = f[0];
      const c = card(f[1], () => { if (!S.fx[id].on) addFx(id); openFx = id; update(); $("stack").scrollIntoView({ block: "nearest", behavior: "smooth" }); }, `<span class="added" aria-hidden="true"><i data-lucide="check"></i></span>`);
      c.classList.add("fx-card");
      grid.appendChild(c); fxCards[id] = c;
    }
    $("fxGallery").append(h, grid);
  }
  let stackKey = "";
  function renderStack() {
    const key = JSON.stringify([S.fxOrder, openFx]);
    if (key === stackKey) return;
    stackKey = key;
    const el = $("stack");
    for (const b of Object.values(fxBodies)) b.remove();
    el.innerHTML = "";
    S.fxOrder.forEach((id, i) => {
      const f = FXI[id];
      const item = document.createElement("div");
      item.className = "stack-item" + (openFx === id ? " open" : "");
      item.dataset.id = id;
      item.innerHTML = `<div class="stack-head"><span class="grip" title="Drag to reorder" aria-label="Drag to reorder ${f.name}"><i data-lucide="grip-vertical"></i></span><span class="stack-n mono">${i + 1}</span><button class="stack-name">${f.name}<small>${f.cat}</small></button><button class="ib xs" data-act="dice" title="Randomize ${f.name}" aria-label="Randomize ${f.name}"><i data-lucide="dice-5"></i></button><button class="ib xs" data-act="toggle" aria-label="${openFx === id ? "Collapse" : "Expand"} ${f.name}"><i data-lucide="${openFx === id ? "chevron-up" : "chevron-down"}"></i></button><button class="ib xs" data-act="remove" title="Remove" aria-label="Remove ${f.name}"><i data-lucide="x"></i></button></div>`;
      if (openFx === id) item.appendChild(fxBodies[id]);
      el.appendChild(item);
    });
    $("stackEmpty").hidden = S.fxOrder.length > 0;
    icons();
  }
  $("stack").addEventListener("click", (e) => {
    const item = e.target.closest(".stack-item");
    if (!item || e.target.closest(".fx-body")) return;
    const id = item.dataset.id, act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "remove") { removeFx(id); update(); return; }
    if (act === "dice") { randomizeFx(id); if (P.safe) safeFix(); openFx = id; update(); return; }
    if (e.target.closest(".stack-name") || act === "toggle") { openFx = openFx === id ? null : id; renderStack(); }
  });
  // Drag the grip to reorder; works with mouse and touch.
  $("stack").addEventListener("pointerdown", (e) => {
    const grip = e.target.closest(".grip");
    if (!grip) return;
    e.preventDefault();
    const item = grip.closest(".stack-item"), id = item.dataset.id, el = $("stack");
    item.classList.add("dragging");
    const move = (ev) => {
      const items = [...el.querySelectorAll(".stack-item")];
      let idx = items.findIndex((it) => { const r = it.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (idx < 0) idx = items.length;
      const cur = S.fxOrder.indexOf(id);
      if (idx > cur) idx--;
      if (idx !== cur) {
        S.fxOrder.splice(cur, 1); S.fxOrder.splice(idx, 0, id);
        stackKey = ""; renderStack();
        el.querySelector(`[data-id="${id}"]`)?.classList.add("dragging");
        update({ instant: true, commit: false });
      }
    };
    // Listen on the window: re-rendering the list replaces the grip under the pointer.
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); el.querySelector(".dragging")?.classList.remove("dragging"); commit(); syncRecipe(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });
  tools("effects").append(dice("Random effects", () => { randomEffects(); update(); }));
  function randomEffects() {
    for (const id of [...S.fxOrder]) removeFx(id);
    const pool = FX_IDS.filter((id) => !["grain", "vignette", "posterize"].includes(id));
    const n = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) { const id = pick(pool); addFx(id); randomizeFx(id); }
    if (Math.random() < 0.5) addFx("grain");
    if (P.safe) safeFix();
  }

  // ---------- recipe strip ----------
  $("recipe").addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    if (b.dataset.remove) { removeFx(b.dataset.remove); update(); return; }
    if (b.dataset.fx) openFx = b.dataset.fx;
    setTab(b.dataset.go);
    if (b.dataset.fx) renderStack();
  });
  let recipeKey = "";
  function syncRecipe() {
    const dots = (cols) => `<span class="dots">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
    const src = S.source === "gradient" ? `Gradient · ${S.grad.type[0].toUpperCase() + S.grad.type.slice(1)}` : `Contours · ${patLabel(S.pattern)}`;
    const style = S.source === "gradient" ? "" : S.mode === "lines" ? `Lines · ${f2(S.weight).replace(/\.?0+$/, "")}px` : S.mode === "bands" ? `Bands · ${pct(S.band)}` : `Layers · ${linear() ? "gap " + S.gap : S.levels}`;
    const cols = S.source === "gradient" ? S.grad.colors : S.gradient || S.mode === "layers" ? [S.line, S.line2, S.bg] : [S.line, S.bg];
    const html = [
      `<button class="rc" data-go="source"><i data-lucide="layers"></i>${src}</button>`,
      style ? `<button class="rc" data-go="style"><i data-lucide="pen-line"></i>${style}</button>` : "",
      `<button class="rc" data-go="color">${dots(cols)}Colors</button>`,
      ...S.fxOrder.map((id) => `<span class="rc fx"><button data-go="effects" data-fx="${id}">${FXI[id].name}</button><button class="rx" data-go="effects" data-remove="${id}" aria-label="Remove ${FXI[id].name}"><i data-lucide="x"></i></button></span>`),
      `<button class="rc add" data-go="effects"><i data-lucide="plus"></i>Effect</button>`,
    ].filter(Boolean).join(`<i data-lucide="chevron-right" class="sep"></i>`);
    if (html === recipeKey) return;
    recipeKey = html;
    $("recipe").innerHTML = html;
    icons();
  }

  // ---------- randomize helpers ----------
  function randomizeGroup(group) {
    for (const c of sliders) if (c.group === group && c.visible() && c.label !== "Grid") c.set(randomValue(c));
    if (P.safe) safeFix();
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
    f.blur.amount = Math.min(f.blur.amount, 80); f.bloom.intensity = Math.min(f.bloom.intensity, 1.6); f.voronoi.cell = Math.max(f.voronoi.cell, 14);
    f.linescreen.spacing = Math.max(f.linescreen.spacing, 4); f.wave.amp = Math.min(f.wave.amp, 50); f.emboss.strength = Math.min(f.emboss.strength, 3);
  }

  // ---------- points ----------
  $("usePoints").onchange = (e) => { S.usePoints = e.target.checked; if (S.usePoints && !S.points.length) S.points = clone(DEFAULTS.points); update(); };
  $("showPoints").onclick = () => { S.showPoints = !S.showPoints; update({ commit: false, instant: true }); };
  $("addPoint").onclick = () => addPoint(rnd(0.2, 0.8), rnd(0.2, 0.8));
  $("clearPoints").onclick = () => { S.points = []; sel = null; update(); };
  $("scatter").onclick = () => { scatterPoints(); update(); };
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
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 13 : 11) * u}" fill="${on ? ACCENT : "rgba(0,0,0,.28)"}" pointer-events="none"/>`;
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 11 : 9.5) * u}" fill="#fff" pointer-events="none"/>`;
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 8.5 : 7) * u}" fill="${st.grad.colors[i]}" pointer-events="none"/>`;
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
  const settingsJSON = () => JSON.stringify({ app: "isoline", version: 4, settings: S }, null, 2);
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
      S = withDefaults(src); sel = null; openFx = null;
      closeModal("importModal"); update(); toast("Settings imported");
    } catch (err) {
      $("importErr").textContent = "That isn't an Isoline settings file. Paste the JSON from Copy settings or choose a downloaded .json.";
      $("importErr").hidden = false;
    }
  };
  $("resetAll").onclick = () => { closeMenus(); S = withDefaults(null); sel = null; openFx = null; update(); toast("Reset. Undo with ⌘Z"); };

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
    const image = S.source === "contours" ? await rasterize(rasterCanvas, current.svg, w, h) : null;
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
    for (const id of [...S.fxOrder]) removeFx(id);
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
      if (Math.random() < 0.35) randomEffects();
    } else {
      S.grad.type = pick(["mesh", "mesh", "mesh", "linear", "radial", "conic"]);
      setGradColors(pick(GRAD_PALETTES)[1].slice()); scatterGrad();
      randomizeGroup("gradient");
      if (Math.random() < 0.75) randomEffects();
    }
    S.seed = Math.floor(Math.random() * 999999);
    sel = null; openFx = null;
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
    if (e.key === "Escape") {
      closeMenus();
      for (const m of document.querySelectorAll(".modal")) m.hidden = true;
      if (sel != null) { sel = null; syncUI(); drawOverlay(); }
      return;
    }
    if (document.querySelector(".modal:not([hidden])")) return;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (typing || mod || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "r") { e.preventDefault(); e.shiftKey ? shuffleAll() : reseed(); }
    else if (key === "c") copyOut();
    else if (key === "e") $("exportBtn").click();
    else if (/^[1-6]$/.test(key)) setTab(TABS[+key - 1]);
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
  let FXR = null, TFX = null;
  const thumbCanvas = document.createElement("canvas");
  try { FXR = window.TopoFX.createFX(fxCanvas); } catch (e) { FXR = null; }
  try { TFX = window.TopoFX.createFX(thumbCanvas); } catch (e) { TFX = null; }
  let current = { svg: "", raster: false }, raf = 0, anim = 0, painted = null, paintTok = 0, fxWarned = false;
  const rasterCanvas = document.createElement("canvas"), thumbRaster = document.createElement("canvas"), baseCanvas = document.createElement("canvas");
  function rasterize(target, svg, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => {
        target.width = w; target.height = h;
        const x = target.getContext("2d");
        x.clearRect(0, 0, w, h);
        x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(target);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  const job = (st, w, h, image) => ({ w, h, k: w / st.w, seed: st.seed, image, grad: st.source === "gradient" ? st.grad : null, fx: st.fx, order: st.fxOrder, ink: st.ink, paper: st.paper });
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
      if (st.source === "contours") { image = await rasterize(rasterCanvas, svg, w, h); if (tok !== paintTok) return null; }
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
        if (r && !draft) { current = r; updateMini(); schedulePreviews(); }
        resolve(r);
      });
    });
  }

  // ---------- previews ----------
  // One small renderer shared by every gallery; jobs run one at a time so the UI stays responsive.
  let queue = [], pumping = false, previewT = 0;
  function enqueue(jobs) { queue = jobs; if (!pumping) pump(); }
  async function pump() {
    pumping = true;
    while (queue.length) {
      const j = queue.shift();
      try { await j(); } catch (e) {}
      await new Promise((r) => setTimeout(r, 0));
    }
    pumping = false;
  }
  function putCanvas(slot, src, w, h) {
    let c = slot.querySelector("canvas");
    if (!c) { slot.innerHTML = ""; c = document.createElement("canvas"); slot.appendChild(c); }
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, 0, 0, w, h);
  }
  // Render a state into a card's thumbnail slot at a 16:10 frame.
  async function thumb(slot, st, w = 200) {
    const h = Math.round(w * 0.625), s = { ...st, h: Math.round(st.w * 0.625) };
    if (!isRaster(s) || !TFX) { slot.innerHTML = s.source === "contours" ? T.buildSVG(s, { w, h, res: 2.5, minLen: 8 }).svg : ""; return; }
    const W = w * 2, H = h * 2;
    const image = s.source === "contours" ? await rasterize(thumbRaster, T.buildSVG(s, { w: W, h: H, res: 2.5 }).svg, W, H) : null;
    TFX.render(job(s, W, H, image));
    putCanvas(slot, thumbCanvas, W, H);
  }
  const slotOf = (c) => c.querySelector(".th");
  const variationSeed = (i) => (S.seed * 31 + (i + 1) * 7919) % 999999;
  function schedulePreviews(delay = 260) {
    clearTimeout(previewT);
    previewT = setTimeout(buildPreviews, delay);
  }
  function buildPreviews() {
    if (drag) return;
    const jobs = [];
    const base = { ...S, fx: S.fx, fxOrder: S.fxOrder };
    if (P.tab === "presets") {
      for (const p of presetCards) if (!p.done && !p.el.hidden) jobs.push(async () => { await thumb(slotOf(p.el), resolveLook(p.look), 220); p.done = true; });
    } else if (P.tab === "source") {
      jobs.push(() => thumb(slotOf(srcCards.contours), { ...base, source: "contours", fxOrder: [] }, 200));
      jobs.push(() => thumb(slotOf(srcCards.gradient), { ...base, source: "gradient", fxOrder: [] }, 200));
      if (S.source === "contours") for (const p of T.PATTERNS) jobs.push(() => thumb(slotOf(patBtns[p.id]), { ...base, pattern: p.id, fxOrder: [], gap: Math.max(S.gap, S.w / 16), levels: Math.min(S.levels, 11), weight: Math.max(S.weight, 2.5) }, 130));
      else for (const t of Object.keys(gradBtns)) jobs.push(() => thumb(slotOf(gradBtns[t]), { ...base, grad: { ...S.grad, type: t }, fxOrder: [] }, 200));
    } else if (P.tab === "shape") {
      varCards.forEach((c, i) => { c._seed = variationSeed(i); jobs.push(() => thumb(slotOf(c), { ...base, seed: c._seed }, 130)); });
    } else if (P.tab === "style" && S.source === "contours") {
      for (const m of Object.keys(modeBtns)) jobs.push(() => thumb(slotOf(modeBtns[m]), { ...base, mode: m, fxOrder: [], gap: Math.max(S.gap, S.w / 22), levels: Math.min(S.levels, 14), weight: Math.max(S.weight, 2.5) }, 130));
    } else if (P.tab === "effects" && TFX) {
      // Each effect previewed on top of the current output.
      jobs.push(async () => {
        const W = 260, H = Math.round(W * 0.625);
        const bs = { ...S, h: Math.round(S.w * 0.625) };
        if (current.raster) { baseCanvas.width = W; baseCanvas.height = H; const x = baseCanvas.getContext("2d"); const sw = fxCanvas.width, sh = Math.min(fxCanvas.height, sw * 0.625); x.drawImage(fxCanvas, 0, (fxCanvas.height - sh) / 2, sw, sh, 0, 0, W, H); }
        else await rasterize(baseCanvas, T.buildSVG(bs, { w: W, h: H, res: 2.5 }).svg, W, H);
      });
      for (const id of FX_IDS) jobs.push(() => {
        const W = 260, H = Math.round(W * 0.625);
        TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: { [id]: { ...S.fx[id], on: true } }, order: [id], ink: S.ink, paper: S.paper });
        putCanvas(slotOf(fxCards[id]), thumbCanvas, W, H);
      });
    }
    enqueue(jobs);
  }

  // ---------- animated changes ----------
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const INT_KEYS = new Set(["levels", "octaves", "indexEvery", "features", "matrix", "pix", "segments"]);
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
    if (current.raster) putCanvas(miniIn, fxCanvas, 280, Math.round((280 * S.h) / S.w));
    else miniIn.innerHTML = current.svg;
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
    syncTabs();
    for (const s of document.querySelectorAll("[data-source]")) s.hidden = s.dataset.source !== S.source;
    for (const b of palEl.children) b.hidden = b.dataset.src !== S.source;
    syncers.forEach((f) => f());
    syncPresets();
    for (const [id, c] of Object.entries(srcCards)) c.classList.toggle("on", id === S.source);
    for (const [id, c] of Object.entries(patBtns)) c.classList.toggle("on", id === S.pattern);
    for (const [id, c] of Object.entries(gradBtns)) c.classList.toggle("on", id === S.grad.type);
    for (const [id, c] of Object.entries(modeBtns)) c.classList.toggle("on", id === S.mode);
    for (const [id, c] of Object.entries(fxCards)) c.classList.toggle("added", S.fxOrder.includes(id));
    varCards.forEach((c, i) => c.classList.toggle("on", c._seed === S.seed));
    for (const [b, is] of palBtns) b.classList.toggle("on", is());
    const n = S.fxOrder.length;
    $("fxCount").hidden = !n; $("fxCount").textContent = n;
    $("line2Sw").classList.toggle("off", !S.gradient && S.mode !== "layers");
    $("lineLbl").textContent = S.mode === "lines" ? "Stroke" : S.mode === "bands" ? "Bands" : "From";
    $("gradient").checked = S.gradient || S.mode === "layers";
    $("gradient").disabled = S.mode === "layers";
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    const eye = S.showPoints ? "eye" : "eye-off";
    if ($("showPoints").dataset.icon !== eye) { $("showPoints").dataset.icon = eye; $("showPoints").innerHTML = `<i data-lucide="${eye}"></i>`; }
    $("seed").value = S.seed;
    $("ptHint").textContent = selPoint() ? "Double-click a point to flip it into a dip. Delete removes it." : "Double-click the canvas to add a point. Drag to move, scroll to resize.";
    $("gradHint").hidden = S.grad.type !== "mesh";
    const sk = JSON.stringify([S.grad.colors, S.source === "gradient" ? sel : null]);
    if (sk !== stopsKey) { stopsKey = sk; renderStops(); }
    renderStack();
    syncRecipe();
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
