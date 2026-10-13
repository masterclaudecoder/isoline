(() => {
  "use strict";
  document.body.classList.add("boot");
  const T = window.Topo;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ACCENT = "#e8572a";
  const HEX = /^#[0-9a-f]{6}$/i;
  const px = (v) => v + "px", deg = (v) => v + "°", f2 = (v) => (+v).toFixed(2), pct = (v) => Math.round(v * 100) + "%";
  const ic = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  // ---------- effect catalog: [id, name, category, defaults, params] ----------
  const FXC = [
    ["liquify", "Liquify", "Distort", { amount: 0.5, scale: 220 }, [{ k: "amount", label: "Amount", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.9] }, { k: "scale", label: "Size", min: 20, max: 1200, step: 5, log: true, fmt: px, rand: [120, 500] }]],
    ["wave", "Waves", "Distort", { amp: 14, length: 220, angle: 0 }, [{ k: "amp", label: "Amplitude", min: 0, max: 160, step: 0.5, fmt: px, rand: [6, 30] }, { k: "length", label: "Wavelength", min: 10, max: 1200, step: 5, log: true, fmt: px, rand: [120, 400] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }]],
    ["swirl", "Twirl", "Distort", { amount: 3, radius: 0.55, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Turn", min: -12, max: 12, step: 0.05, fmt: f2, rand: [-5, 5] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.35, 0.9] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["kaleido", "Kaleidoscope", "Distort", { segments: 6, rotate: 0, zoom: 1 }, [{ k: "segments", label: "Segments", min: 2, max: 16, step: 1, hard: [2, 64], rand: [4, 10] }, { k: "rotate", label: "Rotate", min: 0, max: 360, step: 1, fmt: deg }, { k: "zoom", label: "Zoom", min: 0.3, max: 3, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.7, 1.6] }]],
    ["glass", "Fluted glass", "Glass", { width: 44, angle: 90, strength: 0.9, frost: 0.2, light: 0.4 }, [{ k: "width", label: "Rib width", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [24, 90] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.4] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.5] }, { k: "light", label: "Highlight", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.3, 0.7] }]],
    ["mesh", "Glass blocks", "Glass", { cell: 120, strength: 0.7, frost: 0.25, grout: 1, rim: 0.6, disp: 0.5 }, [{ k: "cell", label: "Block size", min: 12, max: 400, step: 1, log: true, fmt: px, rand: [70, 180] }, { k: "strength", label: "Refraction", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.4, 1.1] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.1, 0.5] }, { k: "grout", label: "Gap", min: 0, max: 4, step: 0.05, fmt: f2, rand: [0.5, 1.5] }, { k: "rim", label: "Highlight", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.8] }, { k: "disp", label: "Dispersion", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    ["lens", "Liquid glass", "Glass", { shape: "pill", size: 0.42, x: 0.5, y: 0.5, refraction: 0.9, frost: 0.2, rim: 0.6, disp: 0.5 }, [{ seg: "shape", options: [["circle", "Circle"], ["pill", "Pill"], ["square", "Square"]] }, { k: "size", label: "Size", min: 0.1, max: 1.2, step: 0.01, fmt: f2, rand: [0.3, 0.6] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "refraction", label: "Refraction", min: 0, max: 2.5, step: 0.01, fmt: f2, rand: [0.6, 1.3] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.4] }, { k: "rim", label: "Highlight", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.8] }, { k: "disp", label: "Dispersion", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    ["blur", "Progressive blur", "Light", { amount: 32, dir: "bottom", start: 0.35 }, [{ seg: "dir", options: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["center", "Edges"], ["even", "Even"]] }, { k: "amount", label: "Blur", min: 0, max: 200, step: 0.5, fmt: px, rand: [16, 60] }, { k: "start", label: "Starts at", min: 0, max: 0.95, step: 0.01, fmt: pct, pct: true, rand: [0.25, 0.6] }]],
    ["bloom", "Glow", "Light", { threshold: 0.55, radius: 30, intensity: 0.9 }, [{ k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.35, 0.75] }, { k: "radius", label: "Radius", min: 2, max: 200, step: 1, log: true, fmt: px, rand: [16, 50] }, { k: "intensity", label: "Intensity", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.2] }]],
    ["emboss", "Relief", "Light", { strength: 1.2, angle: 135, depth: 2 }, [{ k: "strength", label: "Strength", min: 0, max: 5, step: 0.01, fmt: f2, rand: [0.8, 2.2] }, { k: "angle", label: "Light angle", min: 0, max: 360, step: 1, fmt: deg }, { k: "depth", label: "Depth", min: 0.5, max: 16, step: 0.5, fmt: px, rand: [1.5, 4] }]],
    ["vignette", "Vignette", "Light", { amount: 0.4, softness: 0.5 }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.55] }, { k: "softness", label: "Softness", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["gradmap", "Gradient map", "Color", { c1: "#15123a", c2: "#4b3fd1", c3: "#f4f1ff", mix: 1 }, [{ color: "c1", label: "Shadows" }, { color: "c2", label: "Midtones" }, { color: "c3", label: "Highlights" }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["posterize", "Posterize", "Color", { levels: 5 }, [{ k: "levels", label: "Levels", min: 2, max: 16, step: 1, hard: [2, 64], rand: [3, 7] }]],
    ["halftone", "Halftone", "Print", { size: 10, angle: 45, mono: true }, [{ k: "size", label: "Dot size", min: 3, max: 80, step: 0.5, log: true, fmt: px, rand: [6, 18] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["linescreen", "Engrave", "Print", { spacing: 7, angle: 30, mono: true }, [{ k: "spacing", label: "Line spacing", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [5, 12] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["riso", "Risograph", "Print", { size: 7, offset: 4, grain: 0.3, inkA: "#ff48b0", inkB: "#0078bf", paper: "#f3efe6" }, [{ color: "inkA", label: "Ink 1" }, { color: "inkB", label: "Ink 2" }, { color: "paper", label: "Paper" }, { k: "size", label: "Dot size", min: 3, max: 40, step: 0.5, log: true, fmt: px, rand: [5, 10] }, { k: "offset", label: "Misregister", min: 0, max: 30, step: 0.5, fmt: px, rand: [1, 6] }, { k: "grain", label: "Grain", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["dither", "Dither", "Print", { matrix: 4, levels: 2, mono: true, pix: 2 }, [{ seg: "matrix", options: [[2, "2×2"], [4, "4×4"], [8, "8×8"]] }, { k: "levels", label: "Levels", min: 2, max: 8, step: 1, hard: [2, 32] }, { k: "pix", label: "Pixel", min: 1, max: 16, step: 1, fmt: px, rand: [2, 4], hard: [1, 128] }, { sw: "mono", label: "Ink only" }]],
    ["pixel", "Pixels", "Stylize", { size: 16, bevel: 0.5 }, [{ k: "size", label: "Size", min: 2, max: 160, step: 1, log: true, fmt: px, rand: [10, 36] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["voronoi", "Crystallize", "Stylize", { cell: 42, edge: 0.06 }, [{ k: "cell", label: "Cell", min: 6, max: 300, step: 1, log: true, fmt: px, rand: [24, 80] }, { k: "edge", label: "Edges", min: 0, max: 0.5, step: 0.01, fmt: f2 }]],
    ["ascii", "ASCII", "Stylize", { cell: 14, set: "ascii", custom: "", mono: true, invert: false }, [{ seg: "set", options: [["ascii", "ASCII"], ["blocks", "Blocks"], ["dots", "Dots"], ["binary", "01"], ["custom", "Custom"]] }, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [10, 20] }, { sw: "mono", label: "Ink only" }, { sw: "invert", label: "Invert" }]],
    ["scan", "Scanlines", "Stylize", { spacing: 4, strength: 0.25 }, [{ k: "spacing", label: "Spacing", min: 2, max: 40, step: 0.5, fmt: px, rand: [3, 7] }, { k: "strength", label: "Strength", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.15, 0.4] }]],
    ["chroma", "Chromatic", "Stylize", { amount: 6 }, [{ k: "amount", label: "Shift", min: 0, max: 60, step: 0.5, fmt: px, rand: [2, 10] }]],
    ["grain", "Grain", "Texture", { amount: 0.12, size: 1.2, mono: true, soft: true }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.06, 0.2] }, { k: "size", label: "Size", min: 1, max: 8, step: 0.1, fmt: px, rand: [1, 2] }, { sw: "soft", label: "Film grain" }, { sw: "mono", label: "Monochrome" }]],
  ];
  const FXI = Object.fromEntries(FXC.map(([id, name, cat, d, p]) => [id, { id, name, cat, d, p }]));
  const FX_IDS = FXC.map((f) => f[0]);
  const FX_DEFAULTS = Object.fromEntries(FXC.map(([id, , , d]) => [id, { on: false, ...d }]));
  const FX_CATS = [...new Set(FXC.map((f) => f[2]))];

  // ---------- generators + palettes ----------
  const GENS = [
    ["contours", "Contours", "Topographic bands"],
    ["mesh", "Mesh", "Blended color points"],
    ["flow", "Flow", "Warped, flowing color"],
    ["noise", "Noise", "Clouds, ridges, cells"],
    ["linear", "Linear", "Straight gradient"],
    ["radial", "Radial", "From the center out"],
    ["conic", "Conic", "Around the center"],
  ];
  const GEN_LABEL = Object.fromEntries(GENS.map((g) => [g[0], g[1]]));
  const NOISE_TYPES = [["clouds", "Clouds"], ["ridges", "Ridges"], ["billow", "Billow"], ["cells", "Cells"], ["veins", "Veins"], ["marble", "Marble"]];
  const NOISE_LABEL = Object.fromEntries(NOISE_TYPES);
  // Palettes: [name, colors dark to light, contour roles [lines, blend, background] when they differ from the default pick]
  const CURATED = [
    ["Paper", ["#2c2a26", "#6f6a60", "#b9b2a5", "#faf8f3"], ["#2c2a26", "#b9b2a5", "#faf8f3"]],
    ["Bone", ["#1b1b1b", "#4a4640", "#8a8378", "#f1ede4"], ["#1b1b1b", "#8a8378", "#f1ede4"]],
    ["Graphite", ["#1c1d1f", "#3b3d41", "#7d7a74", "#d9d4ca"], ["#d9d4ca", "#7d7a74", "#1c1d1f"]],
    ["Prism", ["#3557d6", "#7d5bd0", "#e0679a", "#f39a6b", "#f6d27a"], ["#3557d6", "#e0679a", "#fbf4ea"]],
    ["Dusk", ["#1b1530", "#5b3b8c", "#e07a5f", "#f2cc8f"], ["#f2cc8f", "#e07a5f", "#1b1530"]],
    ["Glacier", ["#0b1d2e", "#2e5e7e", "#9cc3d5", "#eef3f5"], ["#0b1d2e", "#9cc3d5", "#eef3f5"]],
    ["Midnight", ["#0e1424", "#2a365c", "#5b6b9a", "#aab8dc"], ["#aab8dc", "#5b6b9a", "#0e1424"]],
    ["Ember", ["#20120e", "#8c2f17", "#f26b3a", "#ffd2a8"], ["#f26b3a", "#ffd2a8", "#20120e"]],
    ["Peach", ["#5a2a3c", "#e1665b", "#f3a683", "#f7e3d4"], ["#5a2a3c", "#e1665b", "#f7e3d4"]],
    ["Sage", ["#1f2d24", "#34493b", "#8fa98b", "#e6eadf"], ["#34493b", "#8fa98b", "#e6eadf"]],
    ["Clay", ["#4a2316", "#7d3f2a", "#d9a07f", "#efe2d3"], ["#7d3f2a", "#d9a07f", "#efe2d3"]],
    ["Ocean", ["#0d2433", "#24506b", "#6fa3c0", "#e9f1f5"], ["#e9f1f5", "#6fa3c0", "#0d2433"]],
    ["Iris", ["#15123a", "#4b3fd1", "#b8a8ff", "#f4f1ff"], ["#4b3fd1", "#b8a8ff", "#f4f1ff"]],
    ["Signal", ["#111111", "#5a0f1f", "#ef2b52", "#ffd9de"], ["#111111", "#5a0f1f", "#ef2b52"]],
    ["Citrus", ["#2b1d0e", "#c8551f", "#f0a830", "#fbe9c6"], ["#c8551f", "#f0a830", "#fbe9c6"]],
    ["Moss", ["#101a14", "#2f4a37", "#8fa98b", "#e3e7d6"], ["#e3e7d6", "#8fa98b", "#101a14"]],
    ["Lagoon", ["#05232b", "#0f6b6b", "#3fb6a8", "#d6f1e8"], ["#d6f1e8", "#3fb6a8", "#05232b"]],
    ["Rose", ["#3b1f2b", "#a24d6b", "#e8a6b5", "#fbecef"], ["#3b1f2b", "#e8a6b5", "#fbecef"]],
    ["Sand", ["#3d2f22", "#8b6f4e", "#d6bf98", "#f6efe2"], ["#3d2f22", "#d6bf98", "#f6efe2"]],
    ["Aurora", ["#071a2f", "#1b6f8a", "#46c2a0", "#d7f59a"], ["#d7f59a", "#46c2a0", "#071a2f"]],
    ["Plum", ["#1d0f24", "#552a6b", "#b8789f", "#f3dfe6"], ["#f3dfe6", "#b8789f", "#1d0f24"]],
    ["Cobalt", ["#0a1640", "#1f3fbf", "#6f8cff", "#e6ebff"], ["#1f3fbf", "#6f8cff", "#e6ebff"]],
    ["Terracotta", ["#2a1410", "#a3472d", "#e38b5d", "#f7dcc4"], ["#a3472d", "#e38b5d", "#f7dcc4"]],
    ["Ink", ["#0d0d0f", "#3a3a40", "#a9a6a0", "#f1ede4"], ["#0d0d0f", "#a9a6a0", "#f1ede4"]],
  ];
  const BRANDS = [
    ["Caddis", ["#2f6fdb", "#6a9f7a", "#d8a51f", "#e2632a", "#c9302c"], ["#2f6fdb", "#e2632a", "#f7f4ee"]],
    ["Stripe", ["#0a2540", "#635bff", "#ef008f", "#ffba27", "#6ec3f4"], ["#635bff", "#6ec3f4", "#f6f9fc"]],
    ["Figma", ["#a259ff", "#1abcfe", "#0acf83", "#ff7262", "#f24e1e"], ["#1e1e1e", "#a259ff", "#ffffff"]],
    ["Slack", ["#4a154b", "#36c5f0", "#2eb67d", "#ecb22e", "#e01e5a"], ["#4a154b", "#36c5f0", "#ffffff"]],
    ["Spotify", ["#121212", "#1a3d2a", "#1db954", "#1ed760"], ["#1db954", "#1a3d2a", "#121212"]],
    ["Linear", ["#08090a", "#26283b", "#5e6ad2", "#b4bcd0", "#f7f8f8"], ["#b4bcd0", "#5e6ad2", "#08090a"]],
    ["Discord", ["#23272a", "#5865f2", "#eb459e", "#fee75c", "#57f287"], ["#5865f2", "#eb459e", "#23272a"]],
    ["Mailchimp", ["#241c15", "#007c89", "#ffe01b", "#fbeee0"], ["#241c15", "#007c89", "#ffe01b"]],
    ["Airbnb", ["#92174d", "#bd1e59", "#d70466", "#e61e4d", "#ff385c"], ["#ff385c", "#bd1e59", "#ffffff"]],
    ["Notion", ["#191919", "#37352f", "#9b9a97", "#f7f6f3"], ["#37352f", "#9b9a97", "#ffffff"]],
    ["Dropbox", ["#1e1919", "#0061fe", "#c8dbfe", "#f7f5f2"], ["#0061fe", "#c8dbfe", "#f7f5f2"]],
    ["Instagram", ["#405de6", "#833ab4", "#c13584", "#fd1d1d", "#fcaf45"], ["#c13584", "#fcaf45", "#ffffff"]],
  ];
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  // Lines take the darkest color, the blend a middle one and the background the lightest.
  const rolesOf = (cols) => { const o = cols.slice().sort((a, b) => lum(a) - lum(b)); return [o[0], o[Math.floor(o.length / 2)], o[o.length - 1]]; };
  const PAL_GROUPS = [["Curated", CURATED], ["Brands", BRANDS]];
  const PALS = PAL_GROUPS.flatMap(([group, list]) => list.map(([name, colors, roles]) => ({ name, group, colors, roles: roles || rolesOf(colors) })));
  const PAL_BY = Object.fromEntries(PALS.map((p) => [p.name, p]));
  const ramp = (n) => PAL_BY[n].colors.slice();
  const palState = (n) => { const [line, line2, bg] = PAL_BY[n].roles; return { line, line2, bg }; };

  // ---------- defaults ----------
  const DEFAULTS = {
    source: "contours",
    w: 1440, h: 900, pattern: "terrain",
    scale: 900, octaves: 2, warp: 0.35, liquify: 0, liqScale: 1.5, seed: 4821, angle: 0, features: 5, bump: 2.4, bumpSize: 90,
    points: [{ x: 0.3, y: 0.42, r: 300, s: 1 }, { x: 0.63, y: 0.6, r: 240, s: 1 }, { x: 0.8, y: 0.28, r: 160, s: 0.8 }],
    usePoints: false, showPoints: true, falloff: 1.2,
    mode: "lines", band: 0.5,
    levels: 20, gap: 18, bias: 0, weight: 1.2, swell: 0, swellSize: 260, taper: 0,
    indexEvery: 0, indexWeight: 2, smooth: 0.7, res: 4, minLen: 12,
    ...palState("Paper"), gradient: false, transparent: false, opacity: 1,
    grad: { type: "flow", colors: ramp("Prism"), points: [{ x: 0.18, y: 0.22 }, { x: 0.8, y: 0.2 }, { x: 0.72, y: 0.8 }, { x: 0.2, y: 0.84 }, { x: 0.48, y: 0.5 }], angle: -25, warp: 0.5, warpScale: 1.6, soft: 1.6, scale: 0.45, detail: 2, stretch: 1.8, contrast: 1, noise: "clouds" },
    fx: clone(FX_DEFAULTS), fxOrder: [], ink: "#1b1b1b", paper: "#f1ede4",
    fmt: "svg", pngScale: 2,
  };
  const STORE = "isoline-v4", PREFS = "isoline-prefs-v4";
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
    if (!GENS.some((x) => x[0] === g.type && x[0] !== "contours")) g.type = "mesh";
    if (!Array.isArray(g.colors) || g.colors.length < 2) g.colors = DEFAULTS.grad.colors.slice();
    g.colors = g.colors.slice(0, 8);
    g.points = (Array.isArray(g.points) ? g.points : []).slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push({ x: +(0.15 + 0.7 * ((g.points.length * 0.37) % 1)).toFixed(3), y: +(0.2 + 0.6 * ((g.points.length * 0.61) % 1)).toFixed(3) });
    const order = (Array.isArray(src.fxOrder) ? src.fxOrder : []).filter((id) => FXI[id] && out.fx[id].on);
    for (const id of FX_IDS) if (out.fx[id].on && !order.includes(id)) order.push(id);
    out.fxOrder = order;
    return out;
  }
  let S = withDefaults((() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; } })());
  let P = { safe: true, unlock: false, slot: "preset", take: { shape: true, style: true, color: true, effects: true }, filter: "All" };
  try { Object.assign(P, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(P)); } catch (e) {} };
  let sel = null;

  // ---------- helpers ----------
  const gen = (st = S) => (st.source === "contours" ? "contours" : st.grad.type);
  // Coming from a gradient, contours start as bands in that gradient's colors, as their preview shows.
  const asContours = (st) => { if (st.source === "contours") return st; const own = PALS.find((p) => sameCols(p.colors, st.grad.colors)), [line, line2, bg] = own ? own.roles : rolesOf(st.grad.colors); return { ...st, source: "contours", mode: "bands", band: clamp(st.band, 0.35, 0.6), line, line2, bg, gradient: false, transparent: false, opacity: 1 }; };
  function setGen(id) { if (id === "contours") Object.assign(S, asContours(S)); else { S.source = "gradient"; S.grad.type = id; } sel = null; }
  const linear = () => T.LINEAR.has(S.pattern);
  const activePoints = () => S.usePoints && S.points.length > 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newSeed = () => Math.floor(Math.random() * 999999);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2000); };
  const isRaster = (st) => st.source === "gradient" || st.fxOrder.some((id) => st.fx[id]?.on);
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const patLabel = (id) => T.PATTERNS.find((p) => p.id === id)?.label || id;
  // New effects go before a trailing grain so the grain stays on top, the way film grain would.
  function addFx(id, params) {
    S.fx[id] = { ...S.fx[id], ...(params || {}), on: true };
    if (S.fxOrder.includes(id)) return;
    const gi = S.fxOrder.indexOf("grain");
    if (id !== "grain" && gi === S.fxOrder.length - 1 && gi >= 0) S.fxOrder.splice(gi, 0, id); else S.fxOrder.push(id);
  }
  function removeFx(id) { S.fx[id].on = false; S.fxOrder = S.fxOrder.filter((x) => x !== id); }

  // ---------- presets ----------
  const BASE = { source: "contours", mode: "lines", liquify: 0, swell: 0, taper: 0, indexEvery: 0, gradient: false, transparent: false, opacity: 1, usePoints: false, ink: "#1b1b1b", paper: "#f1ede4" };
  const G = (type, colors, extra = {}) => ({ source: "gradient", grad: { type, colors: ramp(colors), ...extra } });
  const PRESETS = [
    ["Lines", "Topo", { pattern: "terrain", scale: 900, octaves: 2, warp: 0.35, levels: 20, weight: 1.2, smooth: 0.7, ...palState("Paper") }],
    ["Lines", "Orbit", { pattern: "rings", usePoints: true, warp: 0.08, gap: 20, weight: 1.2, smooth: 0.6, ...palState("Bone") }],
    ["Lines", "Strata", { pattern: "strata", angle: 0, scale: 1000, octaves: 2, warp: 0.05, features: 4, bump: 2.6, bumpSize: 85, gap: 13, weight: 1.1, smooth: 0.6, ...palState("Paper") }],
    ["Lines", "Swell", { pattern: "blobs", usePoints: true, falloff: 1.2, warp: 0.3, levels: 16, weight: 2.2, swell: 0.7, swellSize: 260, taper: 160, smooth: 0.7, ...palState("Bone") }],
    ["Lines", "Survey", { pattern: "terrain", scale: 800, octaves: 3, warp: 0.4, levels: 34, weight: 0.9, indexEvery: 5, indexWeight: 2.2, smooth: 0.6, ...palState("Midnight") }],
    ["Lines", "Ember", { pattern: "flow", angle: 20, scale: 700, octaves: 2, warp: 0.4, levels: 32, weight: 1.2, smooth: 0.6, ...palState("Ember"), gradient: true }],
    ["Fills", "Liquid", { pattern: "lines", angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, ...palState("Signal") }],
    ["Fills", "Zebra", { pattern: "flow", angle: 20, scale: 900, octaves: 2, warp: 0.6, levels: 22, mode: "bands", band: 0.5, smooth: 0.6, ...palState("Bone") }],
    ["Fills", "Marble", { pattern: "lines", angle: 30, scale: 460, octaves: 2, warp: 0.2, liquify: 1.6, liqScale: 1.5, gap: 22, mode: "bands", band: 0.42, smooth: 0.5, ...palState("Graphite") }],
    ["Fills", "Terrace", { pattern: "terrain", scale: 900, octaves: 3, warp: 0.3, levels: 10, mode: "layers", smooth: 0.6, line: "#26382c", line2: "#e6eadf", bg: "#26382c" }],
    ["Fills", "Dune", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.35, octaves: 2, levels: 12, bias: 0.3, mode: "layers", smooth: 0.7, line: "#7d3f2a", line2: "#efe2d3", bg: "#7d3f2a" }],
    ["Gradients", "Prism", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25, contrast: 1 }), fx: { grain: { amount: 0.12, size: 1.2, soft: true } } }],
    ["Gradients", "Glacier", { ...G("flow", "Glacier", { scale: 0.4, detail: 3, warp: 0.4, stretch: 2.4, angle: 10, contrast: 1 }), fx: { grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Gradients", "Dusk", { ...G("mesh", "Dusk", { warp: 0.6, warpScale: 1.3, soft: 1.8 }), fx: { grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Gradients", "Peach", { ...G("flow", "Peach", { scale: 0.55, detail: 2, warp: 0.6, stretch: 1.2, angle: 30, contrast: 0.9 }), fx: { blur: { amount: 36, dir: "top", start: 0.4 }, grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Noise", "Ridges", { ...G("noise", "Ink", { noise: "ridges", scale: 1.2, detail: 5, warp: 0.2, stretch: 1, contrast: 1, angle: 0 }) }],
    ["Noise", "Cells", { ...G("noise", "Moss", { noise: "cells", scale: 2.2, detail: 2, warp: 0.3, stretch: 1, contrast: 1, angle: 0 }) }],
    ["Noise", "Veins", { ...G("noise", "Ink", { noise: "veins", scale: 1.6, detail: 2, warp: 0.4, stretch: 1, contrast: 1.1, angle: 0 }) }],
    ["Noise", "Stone", { ...G("noise", "Peach", { noise: "marble", scale: 0.6, detail: 3, warp: 0.5, stretch: 1, contrast: 1, angle: 15 }) }],
    ["Noise", "Clouds", { ...G("noise", "Glacier", { noise: "clouds", scale: 1, detail: 5, warp: 0.3, stretch: 1.4, contrast: 1.1, angle: 0 }), fx: { grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Effects", "Fluted", { ...G("mesh", "Dusk", { warp: 0.6, warpScale: 1.3, soft: 1.8 }), fx: { glass: { width: 48, angle: 90, strength: 1, frost: 0.25, light: 0.5 }, grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Glass blocks", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25, contrast: 1 }), fx: { mesh: { cell: 130, strength: 0.7, frost: 0.25, grout: 1, rim: 0.6, disp: 0.5 } } }],
    ["Effects", "Liquid glass", { pattern: "terrain", scale: 800, octaves: 2, warp: 0.35, levels: 22, weight: 1.6, smooth: 0.7, ...palState("Midnight"), fx: { lens: { shape: "pill", size: 0.42, refraction: 1.1, frost: 0.1, rim: 0.7, disp: 0.6 } } }],
    ["Effects", "Riso", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1b1b1b", line2: "#ffffff", bg: "#1b1b1b", fx: { riso: { size: 7, offset: 4, grain: 0.3 } } }],
    ["Effects", "Engraved", { pattern: "terrain", scale: 900, octaves: 3, warp: 0.3, levels: 12, mode: "layers", smooth: 0.6, line: "#1b1b1b", line2: "#f1ede4", bg: "#1b1b1b", fx: { linescreen: { spacing: 7, angle: 30, mono: true } } }],
    ["Effects", "Relief", { pattern: "terrain", scale: 900, octaves: 3, warp: 0.3, levels: 12, mode: "layers", smooth: 0.6, line: "#b9b2a5", line2: "#faf8f3", bg: "#b9b2a5", fx: { emboss: { strength: 2.2, angle: 135, depth: 3 } } }],
    ["Effects", "Halftone", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25 }), fx: { halftone: { size: 10, angle: 30, mono: false } }, paper: "#f1ede4" }],
    ["Effects", "Duotone", { pattern: "lines", angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", line2: "#5a0f1f", bg: "#f1ede4", fx: { gradmap: { c1: "#15123a", c2: "#4b3fd1", c3: "#f4f1ff", mix: 1 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
  ];
  const resolved = new Map();
  function resolveLook(look) {
    if (resolved.has(look)) return resolved.get(look);
    const st = withDefaults(null);
    const { fx, grad, ...rest } = look;
    Object.assign(st, BASE, clone(rest));
    st.grad = { ...st.grad, ...(grad ? clone(grad) : {}) };
    st.grad.points = st.grad.points.slice(0, st.grad.colors.length);
    while (st.grad.points.length < st.grad.colors.length) st.grad.points.push(clone(DEFAULTS.grad.points[st.grad.points.length % 5]));
    st.fx = clone(FX_DEFAULTS); st.fxOrder = [];
    for (const [id, v] of Object.entries(fx || {})) { st.fx[id] = { ...st.fx[id], ...v, on: true }; st.fxOrder.push(id); }
    resolved.set(look, st);
    return st;
  }
  const LAYERS = {
    shape: ["source", "pattern", "scale", "octaves", "warp", "liquify", "liqScale", "angle", "features", "bump", "bumpSize", "usePoints", "falloff", "grad.type", "grad.warp", "grad.warpScale", "grad.soft", "grad.angle", "grad.scale", "grad.detail", "grad.stretch", "grad.contrast", "grad.noise"],
    style: ["mode", "band", "levels", "gap", "bias", "weight", "swell", "swellSize", "taper", "indexEvery", "indexWeight", "smooth"],
    color: ["line", "line2", "gradient", "bg", "transparent", "opacity", "grad.colors", "ink", "paper"],
    effects: ["fx", "fxOrder"],
  };
  const LAYER_NAMES = { shape: "Shape", style: "Lines", color: "Colors", effects: "Effects" };
  function applyLook(look, layers = Object.keys(LAYERS)) {
    const src = resolveLook(look);
    for (const L of layers) for (const key of LAYERS[L]) setPath(S, key, clone(getPath(src, key)));
    const g = S.grad;
    g.points = g.points.slice(0, g.colors.length);
    while (g.points.length < g.colors.length) g.points.push(clone(src.grad.points[g.points.length] || { x: rnd(0.15, 0.85), y: rnd(0.15, 0.85) }));
    if (S.usePoints && !S.points.length) S.points = clone(DEFAULTS.points);
    sel = null;
  }
  const lookMatches = (look) => {
    const src = resolveLook(look);
    return Object.values(LAYERS).every((keys) => keys.every((key) => JSON.stringify(getPath(S, key)) === JSON.stringify(getPath(src, key))));
  };
  const currentPreset = () => PRESETS.find((p) => lookMatches(p[2]));

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

  // ---------- color math (OKLCH) ----------
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function toOklch(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
    return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
  }
  // Out-of-gamut colors keep their lightness and hue and lose chroma until they fit.
  function fromOklch(L, C, H) {
    L = clamp(L, 0, 1);
    const hr = (H * Math.PI) / 180;
    for (let c = Math.max(0, C); ; c = Math.max(0, c - 0.004)) {
      const a = c * Math.cos(hr), b = c * Math.sin(hr);
      const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), q = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
      const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q];
      if (c === 0 || rgb.every((v) => v > -0.0005 && v < 1.0005)) return "#" + rgb.map((v) => Math.round(clamp(toGam(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, "0")).join("");
    }
  }
  const hsvToHex = (h, s, v) => { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join(""); };
  function hexToHsv(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
  }

  // ---------- color picker ----------
  // One shared popover: a saturation/brightness field, a hue strip, hex entry, palette swatches and, where supported, an eyedropper.
  const picker = (() => {
    const el = document.createElement("div");
    el.className = "picker"; el.hidden = true;
    el.innerHTML = `<div class="pk-sv"><i class="pk-knob"></i></div><div class="pk-hue"><i class="pk-knob"></i></div><div class="pk-row"><span class="pk-now"></span><input class="field mono pk-hex" spellcheck="false" aria-label="Hex"><button class="ib pk-drop" title="Pick from screen" aria-label="Pick from screen">${ic("pipette")}</button></div><div class="pk-sw"></div>`;
    document.body.appendChild(el);
    const sv = el.querySelector(".pk-sv"), hue = el.querySelector(".pk-hue"), hexIn = el.querySelector(".pk-hex"), now = el.querySelector(".pk-now"), swEl = el.querySelector(".pk-sw"), drop = el.querySelector(".pk-drop");
    if (!window.EyeDropper) drop.hidden = true;
    let hsv = [0, 0, 0], cur = null, anchor = null;
    const paint = (fromHex) => {
      const hex = hsvToHex(...hsv);
      sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hsv[0], 1, 1)})`;
      sv.firstChild.style.cssText = `left:${hsv[1] * 100}%;top:${(1 - hsv[2]) * 100}%;background:${hex}`;
      hue.firstChild.style.cssText = `left:${(hsv[0] / 360) * 100}%;background:${hsvToHex(hsv[0], 1, 1)}`;
      now.style.background = hex;
      if (!fromHex && document.activeElement !== hexIn) hexIn.value = hex;
      return hex;
    };
    const emit = () => cur && cur.onInput(paint());
    const dragOn = (area, fn) => area.addEventListener("pointerdown", (e) => {
      e.preventDefault(); area.setPointerCapture(e.pointerId);
      const move = (ev) => { const r = area.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); emit(); };
      move(e);
      area.onpointermove = move;
      area.onpointerup = area.onpointercancel = () => { area.onpointermove = null; cur?.onDone?.(); };
    });
    dragOn(sv, (x, y) => { hsv[1] = x; hsv[2] = 1 - y; });
    dragOn(hue, (x) => { hsv[0] = Math.min(359.9, x * 360); });
    hexIn.addEventListener("input", () => { const v = parseHex(hexIn.value); if (v) { hsv = hexToHsv(v); paint(true); cur?.onInput(v); } });
    hexIn.addEventListener("keydown", (e) => { if (e.key === "Enter") close(); });
    swEl.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; hsv = hexToHsv(b.dataset.c); emit(); cur?.onDone?.(); });
    drop.onclick = async () => { try { const r = await new window.EyeDropper().open(); hsv = hexToHsv(r.sRGBHex.slice(0, 7)); emit(); cur?.onDone?.(); } catch (e) {} };
    function place() {
      const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
      if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
      el.style.left = clamp(x, 8, innerWidth - w - 8) + "px"; el.style.top = y + "px";
    }
    function open(a, value, onInput, onDone, swatches = []) {
      if (cur && anchor === a) { close(); return; }
      close();
      anchor = a; cur = { onInput, onDone };
      hsv = hexToHsv(parseHex(value) || "#000000");
      swEl.innerHTML = [...new Set(swatches)].slice(0, 10).map((c) => `<button class="sw xs" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");
      swEl.hidden = !swatches.length;
      el.hidden = false; paint(); place();
      el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
      a.classList.add("picking");
    }
    function close() { if (!cur) return; const d = cur.onDone; cur = null; el.hidden = true; anchor?.classList.remove("picking"); anchor = null; d?.(); }
    document.addEventListener("pointerdown", (e) => { if (cur && !el.contains(e.target) && !anchor.contains(e.target)) close(); }, true);
    addEventListener("resize", () => cur && place());
    return { open, close, isOpen: () => !!cur };
  })();
  // Colors already in play, offered as quick picks in the picker.
  const inPlay = () => [...(S.source === "contours" ? [S.line, S.line2, S.bg] : S.grad.colors), S.ink, S.paper];

  // ---------- control factories ----------
  const syncers = [], sliders = [];
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
    row.innerHTML = `<div class="label-row"><label class="label" for="${id}">${c.label}</label><input class="val" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" aria-label="${c.label} value"><button class="ib xs" title="Randomize ${c.label.toLowerCase()}" aria-label="Randomize ${c.label.toLowerCase()}">${ic("dice")}</button></div><input id="${id}" type="range">`;
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
  const parseHex = (s) => { let v = s.trim().replace(/^#?/, "#").toLowerCase(); if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map((ch) => ch + ch).join(""); return HEX.test(v) ? v : null; };
  function makeColor(host, label, get, set) {
    const row = document.createElement("div");
    row.className = "label-row color-row";
    const id = "c-" + Math.random().toString(36).slice(2, 8);
    row.innerHTML = `<label class="label" for="${id}">${label}</label><input class="hex mono" id="${id}" spellcheck="false" autocomplete="off"><button class="sw sm" title="${label}" aria-label="Pick ${label.toLowerCase()}"></button>`;
    const hex = row.querySelector(".hex"), sw = row.querySelector(".sw");
    sw.onclick = () => picker.open(sw, get(), (v) => { set(v); sw.style.background = v; update({ instant: true }); }, () => commit(), inPlay());
    hex.addEventListener("change", () => { const v = parseHex(hex.value); if (!v) { hex.value = get(); return; } set(v); update(); });
    hex.addEventListener("keydown", (e) => { if (e.key === "Enter") hex.blur(); });
    syncers.push(() => { const v = get(); sw.style.background = v; if (document.activeElement !== hex) hex.value = v; });
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
    const custom = document.createElement("button");
    custom.className = "sw custom"; custom.title = "Custom color"; custom.setAttribute("aria-label", "Custom color");
    custom.onclick = () => picker.open(custom, get(), (v) => { set(v); update({ instant: true }); }, () => commit(), inPlay());
    el.appendChild(custom);
    syncers.push(() => {
      const none = isNone && isNone();
      let hit = false;
      btns.forEach((b, i) => { const on = colors[i] === get() && !none; b.classList.toggle("on", on); hit ||= on; });
      custom.classList.toggle("on", !hit && !none);
      custom.style.setProperty("--c", get());
    });
  }
  function bindHex(id, get, set, isNone) {
    const el = $(id);
    el.addEventListener("focus", () => requestAnimationFrame(() => el.select()));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") el.blur(); if (e.key === "Escape") { el.value = get(); el.blur(); } });
    el.addEventListener("change", () => { const v = parseHex(el.value); if (!v) { el.value = get(); return; } set(v); update(); });
    syncers.push(() => { if (document.activeElement !== el) el.value = isNone && isNone() ? "none" : get(); });
  }
  function card(label, onClick, sub = "") {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<div class="th"></div><span class="card-label">${label}</span>${sub ? `<span class="card-sub">${sub}</span>` : ""}`;
    b.onclick = onClick;
    return b;
  }

  // ---------- slots (left column) ----------
  // Each layer of the design is a slot showing its current pick. Clicking opens its choices.
  const slotWhen = { lines: () => gen() === "contours" };
  function slotInfo(id) {
    const g = gen();
    if (id === "preset") { const p = currentPreset(); return [p ? p[1] : "Custom", p ? p[0] : "Edited"]; }
    if (id === "generator") return [GEN_LABEL[g], GENS.find((x) => x[0] === g)[2]];
    if (id === "shape") {
      if (g === "contours") return [patLabel(S.pattern), activePoints() ? `${S.points.length} points · seed ${S.seed}` : `Seed ${S.seed}`];
      if (g === "noise") return [NOISE_LABEL[S.grad.noise], `Seed ${S.seed}`];
      if (g === "mesh") return [`${S.grad.colors.length} color points`, `Warp ${f2(S.grad.warp)}`];
      return [`${GEN_LABEL[g]} form`, `Seed ${S.seed}`];
    }
    if (id === "lines") return S.mode === "lines" ? ["Lines", `${f2(S.weight).replace(/\.?0+$/, "")}px · ${linear() ? S.gap + "px gap" : S.levels + " lines"}`] : S.mode === "bands" ? ["Bands", `${pct(S.band)} thick`] : ["Layers", `${linear() ? "Every " + S.gap + "px" : S.levels + " layers"}`];
    if (id === "colors") {
      const p = currentPal();
      return [p ? p.name : "Custom", g === "contours" ? (S.gradient || S.mode === "layers" ? "Blended" : "Two colors") : `${S.grad.colors.length} colors`];
    }
    return ["", ""];
  }
  const slotColors = () => (gen() === "contours" ? (S.gradient || S.mode === "layers" ? [S.bg, S.line, S.line2] : [S.bg, S.line]) : S.grad.colors);
  let slotKey = "";
  const slotThumbs = {};
  function renderSlots() {
    const key = JSON.stringify([gen(), S.fxOrder, P.slot, ...["preset", "generator", "shape", "lines", "colors"].map(slotInfo), slotColors()]);
    if (key === slotKey) return;
    slotKey = key;
    const el = $("slotList");
    const tile = (id, [title, sub], thumb) => `<button class="tile${P.slot === id ? " on" : ""}" data-slot="${id}"><span class="tile-th" data-th="${id}">${thumb || ""}</span><span class="tile-text"><b>${title}</b><small>${sub}</small></span>${ic("next", "go")}</button>`;
    const sw = (cols) => `<span class="tile-sw">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
    let html = "";
    for (const [id, label] of [["preset", "Preset"], ["generator", "Generator"], ["shape", "Shape"], ["lines", "Lines"], ["colors", "Colors"]]) {
      if (slotWhen[id] && !slotWhen[id]()) continue;
      html += `<div class="slot"><div class="slot-label">${label}</div>${tile(id, slotInfo(id), id === "colors" ? sw(slotColors()) : "")}</div>`;
    }
    html += `<div class="slot"><div class="slot-label">Effects${S.fxOrder.length ? `<span class="count">${S.fxOrder.length}</span>` : ""}</div><div class="fx-tiles" id="fxTiles">`;
    S.fxOrder.forEach((id) => {
      const on = P.slot === "fx:" + id;
      html += `<div class="tile fx${on ? " on" : ""}" data-fx="${id}"><span class="grip" title="Drag to reorder" aria-label="Drag to reorder ${FXI[id].name}">${ic("grip")}</span><button class="tile-main" data-slot="fx:${id}"><span class="tile-th" data-th="fx:${id}"></span><span class="tile-text"><b>${FXI[id].name}</b><small>${FXI[id].cat}</small></span></button><button class="ib xs" data-remove="${id}" aria-label="Remove ${FXI[id].name}" title="Remove">${ic("x")}</button></div>`;
    });
    html += `<button class="tile add${P.slot === "addfx" ? " on" : ""}" data-slot="addfx"><span class="tile-plus">${ic("plus")}</span><span class="tile-text"><b>Add effect</b><small>${S.fxOrder.length ? "Stack another" : "Glass, grain, print and more"}</small></span></button></div></div>`;
    // FLIP: tiles that move glide to their new place; new ones grow in.
    const keyOf = (n) => n.dataset.fx ? "fx:" + n.dataset.fx : n.dataset.slot;
    const before = new Map([...el.querySelectorAll(".tile")].map((n) => [keyOf(n), n.getBoundingClientRect().top]));
    el.innerHTML = html;
    for (const [k, v] of Object.entries(slotThumbs)) { const t = el.querySelector(`[data-th="${k}"]`); if (t && v) t.appendChild(v.cloneNode(true)); }
    if (before.size && !reduceMotion.matches) for (const n of el.querySelectorAll(".tile")) {
      const top = before.get(keyOf(n)), now = n.getBoundingClientRect().top;
      if (top == null) n.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
      else if (Math.abs(top - now) > 1 && !n.classList.contains("dragging")) n.animate([{ transform: `translateY(${top - now}px)` }, { transform: "none" }], { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    schedulePreviews(120);
  }
  $("slotList").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { const id = rm.dataset.remove; removeFx(id); if (P.slot === "fx:" + id) P.slot = "addfx"; update(); return; }
    const t = e.target.closest("[data-slot]");
    if (t) setSlot(t.dataset.slot);
  });
  // Drag an effect's grip to reorder the stack.
  $("slotList").addEventListener("pointerdown", (e) => {
    const grip = e.target.closest(".grip");
    if (!grip) return;
    e.preventDefault();
    const id = grip.closest("[data-fx]").dataset.fx;
    const mark = () => $("slotList").querySelector(`[data-fx="${id}"]`)?.classList.add("dragging");
    mark();
    const move = (ev) => {
      const items = [...$("slotList").querySelectorAll("[data-fx]")];
      let idx = items.findIndex((it) => { const r = it.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (idx < 0) idx = items.length;
      const cur = S.fxOrder.indexOf(id);
      if (idx > cur) idx--;
      if (idx !== cur) { S.fxOrder.splice(cur, 1); S.fxOrder.splice(idx, 0, id); slotKey = ""; renderSlots(); mark(); update({ instant: true, commit: false }); }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); $("slotList").querySelector(".dragging")?.classList.remove("dragging"); commit(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });

  const PANEL_TITLE = { preset: "Preset", generator: "Generator", shape: "Shape", lines: "Lines", colors: "Colors", addfx: "Add effect" };
  function setSlot(id) {
    picker.close();
    if (id === "colors" && P.slot !== "colors") revealPalette();
    P.slot = id; savePrefs();
    syncUI();
    $("options").scrollTop = 0;
    if (window.matchMedia("(max-width: 900px)").matches) $("options").scrollIntoView({ behavior: "smooth", block: "start" });
    schedulePreviews(0);
  }
  function panelOf(slot) { return slot.startsWith("fx:") ? "effect" : slot; }
  const fxOf = () => (P.slot.startsWith("fx:") ? P.slot.slice(3) : null);

  // Dice in the options header randomizes whatever the open panel controls.
  const optDice = document.createElement("button");
  optDice.className = "ib"; optDice.innerHTML = ic("dice");
  optDice.onclick = () => {
    const p = panelOf(P.slot), g = gen();
    if (p === "preset") { surprise(); return; }
    if (p === "generator") setGen(pick(GENS.filter((x) => x[0] !== g))[0]);
    else if (p === "shape") { if (g === "contours") randomizeGroup("shape"); else { randomizeGroup("gradient"); if (g === "mesh") scatterGrad(); } S.seed = newSeed(); }
    else if (p === "lines") { S.mode = pick(["lines", "lines", "bands", "layers"]); Object.assign(S, readable(S)); randomizeGroup("lines"); }
    else if (p === "colors") randomPalette();
    else if (p === "effect") { randomizeFx(fxOf()); }
    else if (p === "addfx") { randomEffects(); }
    if (P.safe) safeFix();
    update({ fade: true });
  };
  $("optTools").appendChild(optDice);

  // ---------- preset panel ----------
  const takeRow = $("takeRow");
  takeRow.innerHTML = `<span class="take-label">Apply</span><div class="multi" role="group" aria-label="Parts to apply">` + Object.keys(LAYERS).map((L) => `<button class="tog" data-l="${L}" aria-pressed="true"><span class="tick">${ic("check")}</span>${LAYER_NAMES[L]}</button>`).join("") + `</div>`;
  takeRow.onclick = (e) => {
    const b = e.target.closest("[data-l]");
    if (!b) return;
    P.take[b.dataset.l] = !P.take[b.dataset.l];
    if (!Object.values(P.take).some(Boolean)) P.take[b.dataset.l] = true;
    savePrefs(); syncUI();
  };
  const filters = ["All", ...new Set(PRESETS.map((p) => p[0]))];
  $("presetFilter").innerHTML = filters.map((f) => `<button data-v="${f}">${f}</button>`).join("");
  $("presetFilter").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; P.filter = b.dataset.v; savePrefs(); syncUI(); schedulePreviews(0); };
  const presetCards = PRESETS.map(([group, name, look]) => {
    const c = card(name, () => {
      const layers = Object.keys(LAYERS).filter((L) => P.take[L]);
      applyLook(look, layers);
      update({ fade: true });
      if (layers.length < 4) toast(`Took ${layers.map((l) => LAYER_NAMES[l].toLowerCase()).join(", ")} from ${name}`);
    }, group);
    $("presetGrid").appendChild(c);
    return { el: c, group, name, look, done: false };
  });

  // ---------- generator panel ----------
  const genCards = {};
  for (const [id, label, sub] of GENS) {
    const c = card(label, () => { if (gen() !== id) { setGen(id); update({ fade: true }); } }, sub);
    $("genGrid").appendChild(c); genCards[id] = c;
  }

  // ---------- shape panel ----------
  const selPoint = () => (S.source === "contours" && sel != null ? S.points[sel] : null);
  const k = (key) => bindKey(() => S, key);
  const patCards = {};
  for (const p of T.PATTERNS) { const c = card(p.label, () => { S.pattern = p.id; update({ fade: true }); }); $("patterns").appendChild(c); patCards[p.id] = c; }
  const noiseCards = {};
  for (const [id, label] of NOISE_TYPES) { const c = card(label, () => { S.grad.noise = id; update({ fade: true }); }); $("noiseTypes").appendChild(c); noiseCards[id] = c; }
  const varCards = [];
  for (let i = 0; i < 6; i++) { const c = card("", () => { S.seed = c._seed; update({ fade: true }); }); c.classList.add("var"); $("variations").appendChild(c); varCards.push(c); }
  [
    { label: "Scale", ...k("scale"), min: 80, max: 1600, step: 10, log: true, fmt: px, rand: [400, 1200] },
    { label: "Detail", ...k("octaves"), min: 1, max: 6, step: 1, rand: [1, 3], hard: [1, 10] },
    { label: "Warp", ...k("warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.1, 0.7] },
    { label: "Liquify", ...k("liquify"), min: 0, max: 4, step: 0.01, fmt: (v) => (v ? f2(v) : "Off"), rand: [0, 1.2] },
    { label: "Liquify size", ...k("liqScale"), min: 0.3, max: 4, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [1, 2], when: () => S.liquify > 0 },
    { label: "Angle", ...k("angle"), min: 0, max: 180, step: 1, fmt: deg, when: () => T.ANGLED.has(S.pattern) },
    { label: "Features", ...k("features"), min: 0, max: 20, step: 1, rand: [3, 8], hard: [0, 24], when: () => S.pattern === "strata" || (["blobs", "rings"].includes(S.pattern) && !activePoints()) },
    { label: "Bulge", ...k("bump"), min: 0, max: 4, step: 0.05, fmt: f2, rand: [1, 2.8], when: () => ["strata", "waves", "dunes"].includes(S.pattern) },
    { label: "Bulge size", ...k("bumpSize"), min: 20, max: 400, step: 5, fmt: px, rand: [60, 160], when: () => S.pattern === "strata" },
  ].forEach((c) => makeSlider($("shape"), { group: "shape", ...c }));
  [
    { label: "Radius", min: 10, max: 1400, step: 1, log: true, fmt: px, rand: [120, 380], when: () => !!selPoint(), get: () => selPoint()?.r ?? 100, set: (v) => (selPoint().r = v) },
    { label: "Strength", min: -3, max: 3, step: 0.05, fmt: (v) => (v > 0 ? "+" : "") + (+v).toFixed(2), rand: [-0.8, 1.6], when: () => !!selPoint(), get: () => selPoint()?.s ?? 1, set: (v) => (selPoint().s = v) },
    { label: "Falloff", ...k("falloff"), min: 0.3, max: 6, step: 0.05, log: true, fmt: f2, rand: [0.8, 2.5] },
  ].forEach((c) => makeSlider($("pointCtrls"), { group: "points", ...c }));
  const gr = () => S.grad;
  const isG = (...t) => () => t.includes(gen());
  [
    { label: "Scale", ...bindKey(gr, "scale"), min: 0.1, max: 6, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.35, 1.2], when: isG("flow", "noise") },
    { label: "Detail", ...bindKey(gr, "detail"), min: 1, max: 8, step: 1, rand: [2, 4], when: isG("flow", "noise") },
    { label: "Softness", ...bindKey(gr, "soft"), min: 0.5, max: 4, step: 0.05, fmt: f2, rand: [1.3, 2.2], when: isG("mesh") },
    { label: "Warp", ...bindKey(gr, "warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 0.8] },
    { label: "Warp size", ...bindKey(gr, "warpScale"), min: 0.2, max: 8, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [1, 2.5], when: () => isG("mesh", "linear", "radial", "conic")() && S.grad.warp > 0 },
    { label: "Stretch", ...bindKey(gr, "stretch"), min: 0.3, max: 5, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [1, 2.4], when: isG("flow", "noise") },
    { label: "Angle", ...bindKey(gr, "angle"), min: -180, max: 180, step: 1, fmt: deg, when: isG("linear", "conic", "flow", "noise") },
    { label: "Contrast", ...bindKey(gr, "contrast"), min: 0.3, max: 3, step: 0.01, fmt: f2, rand: [0.8, 1.3], when: isG("flow", "noise") },
  ].forEach((c) => makeSlider($("gradCtrls"), { group: "gradient", ...c }));
  $("seed").onchange = (e) => { S.seed = clamp(Math.floor(+e.target.value || 0), 0, 999999); update({ fade: true }); };
  const variationSeed = (i) => (S.seed * 31 + (i + 1) * 7919) % 999999;

  // ---------- lines panel ----------
  const modeCards = {};
  for (const [id, label, sub] of [["lines", "Lines", "Strokes"], ["bands", "Bands", "Filled stripes"], ["layers", "Layers", "Stacked fills"]]) {
    const c = card(label, () => { S.mode = id; if (S.line && S.bg) Object.assign(S, readable(S)); update({ fade: true }); }, sub);
    $("modes").appendChild(c); modeCards[id] = c;
  }
  const lineMode = () => S.mode === "lines";
  [
    { label: "Count", ...k("levels"), min: 2, max: 120, step: 1, rand: [10, 30], hard: [1, 4000], when: () => !linear() },
    { label: "Gap", ...k("gap"), min: 2, max: 200, step: 0.5, log: true, fmt: px, rand: [12, 36], hard: [0.5, 5000], when: linear },
    { label: "Bias", ...k("bias"), min: -2, max: 2, step: 0.05, fmt: (v) => (v === 0 ? "Even" : f2(v)), rand: [-0.6, 0.6], when: () => !linear() },
    { label: "Thickness", ...k("band"), pct: true, min: 0.02, max: 0.98, step: 0.01, fmt: pct, rand: [0.35, 0.6], hard: [0.01, 0.99], when: () => S.mode === "bands" },
    { label: "Weight", ...k("weight"), min: 0.25, max: 40, step: 0.05, log: true, fmt: (v) => f2(v) + "px", rand: [0.8, 3], when: lineMode },
    { label: "Swell", ...k("swell"), pct: true, min: 0, max: 1, step: 0.01, fmt: (v) => (v ? pct(v) : "Off"), rand: [0, 0.7], when: lineMode },
    { label: "Swell size", ...k("swellSize"), min: 20, max: 900, step: 5, log: true, fmt: px, rand: [160, 420], when: () => lineMode() && S.swell > 0 },
    { label: "Taper", ...k("taper"), min: 0, max: 600, step: 5, fmt: (v) => (v ? v + "px" : "Off"), rand: [0, 200], when: lineMode },
    { label: "Accent every", ...k("indexEvery"), min: 0, max: 12, step: 1, fmt: (v) => (v ? v : "Off"), rand: [0, 6], hard: [0, 100], when: lineMode },
    { label: "Accent weight", ...k("indexWeight"), min: 1, max: 5, step: 0.1, fmt: (v) => (+v).toFixed(1) + "×", rand: [1.6, 2.6], when: () => lineMode() && S.indexEvery > 0 },
    { label: "Smooth", ...k("smooth"), min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.5, 0.8], hard: [0, 4] },
    { label: "Grid", ...k("res"), min: 2, max: 12, step: 1, fmt: px, rand: [3, 5], hard: [1, 64] },
    { label: "Clean", ...k("minLen"), min: 0, max: 300, step: 1, fmt: (v) => (v ? v + "px" : "Off"), rand: [8, 40] },
  ].forEach((c) => makeSlider($("lines"), { group: "lines", ...c }));

  // ---------- colors panel ----------
  const PER_PAGE = 9;
  const sameCols = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
  const palMatches = (p) => (gen() === "contours" ? S.line === p.roles[0] && S.bg === p.roles[2] : sameCols(S.grad.colors, p.colors));
  const currentPal = () => PALS.find(palMatches);
  function applyPal(cols, roles = rolesOf(cols)) {
    if (gen() === "contours") Object.assign(S, { line: roles[0], line2: roles[1], bg: roles[2], transparent: false });
    else setGradColors(cols.slice());
  }
  const palEl = $("palettes");
  $("palTabs").innerHTML = PAL_GROUPS.map(([g]) => `<button data-v="${g}">${g}</button>`).join("");
  P.palTab ||= "Curated"; P.palPage ||= 0;
  const palList = () => PALS.filter((p) => p.group === P.palTab);
  const pageCount = () => Math.ceil(palList().length / PER_PAGE);
  let palKey = "";
  function renderPalettes(dir = 0) {
    const page = clamp(P.palPage, 0, pageCount() - 1), contours = gen() === "contours";
    const key = [P.palTab, page, contours].join("|");
    if (key !== palKey) {
      palKey = key;
      palEl.innerHTML = palList().slice(page * PER_PAGE, (page + 1) * PER_PAGE).map((p) => {
        const sw = contours ? `<span class="pal-sw" style="background:${p.roles[2]}"><i style="background:${p.roles[0]}"></i><i style="background:${p.roles[1]}"></i></span>` : `<span class="pal-bar" style="background:linear-gradient(90deg,${p.colors.join(",")})"></span>`;
        return `<button class="pal" data-name="${p.name}">${sw}<span>${p.name}</span></button>`;
      }).join("");
      if (dir) { palEl.classList.remove("from-l", "from-r"); void palEl.offsetWidth; palEl.classList.add(dir > 0 ? "from-r" : "from-l"); }
    }
    for (const b of palEl.children) b.classList.toggle("on", palMatches(PAL_BY[b.dataset.name]));
    $("palDots").innerHTML = Array.from({ length: pageCount() }, (_, i) => `<i class="${i === page ? "on" : ""}"></i>`).join("");
    $("palPrev").disabled = page <= 0; $("palNext").disabled = page >= pageCount() - 1;
    for (const b of $("palTabs").children) b.classList.toggle("on", b.dataset.v === P.palTab);
  }
  palEl.onclick = (e) => { const b = e.target.closest("[data-name]"); if (!b) return; const p = PAL_BY[b.dataset.name]; applyPal(p.colors, p.roles); update(); };
  const turnPage = (d) => { const n = clamp(P.palPage + d, 0, pageCount() - 1); if (n === P.palPage) return; P.palPage = n; savePrefs(); renderPalettes(d); };
  $("palPrev").onclick = () => turnPage(-1);
  $("palNext").onclick = () => turnPage(1);
  $("palTabs").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b || b.dataset.v === P.palTab) return; const d = b.dataset.v === "Brands" ? 1 : -1; P.palTab = b.dataset.v; P.palPage = 0; savePrefs(); renderPalettes(d); };
  // Opening Colors shows the page holding the palette in use.
  function revealPalette() { const p = currentPal(); if (!p) return; P.palTab = p.group; P.palPage = Math.floor(palList().indexOf(p) / PER_PAGE); }

  // Palette builder: harmonies grown from the strongest color in play, plus the closest library palettes.
  function suggestions() {
    const cols = gen() === "contours" ? [S.line, S.line2, S.bg] : S.grad.colors;
    const lch = cols.map(toOklch), [, C0, H] = lch.reduce((a, b) => (b[1] > a[1] ? b : a));
    const C = Math.max(C0, 0.05), mk = (rows) => rows.map(([l, c, h]) => fromOklch(l, c, (h + 360) % 360));
    const out = [
      ["Tonal", mk([[0.24, C * 0.6, H], [0.42, C, H], [0.62, C, H], [0.8, C * 0.6, H], [0.95, C * 0.2, H]])],
      ["Analogous", mk([[0.26, C * 0.8, H - 40], [0.46, C, H - 20], [0.64, C, H], [0.78, C * 0.9, H + 20], [0.93, C * 0.4, H + 40]])],
      ["Opposite", mk([[0.24, C * 0.7, H], [0.5, C, H], [0.95, C * 0.15, H + 90], [0.66, C, H + 180], [0.84, C * 0.6, H + 180]])],
      ["Triad", mk([[0.22, C * 0.4, H], [0.55, C, H], [0.68, C, H + 120], [0.76, C, H + 240], [0.96, C * 0.15, H]])],
      ["Split", mk([[0.25, C * 0.6, H], [0.58, C, H], [0.7, C, H + 150], [0.8, C, H + 210], [0.95, C * 0.15, H]])],
      ["Muted", mk([[0.22, C * 0.25, H], [0.42, C * 0.35, H + 10], [0.62, C * 0.4, H - 10], [0.8, C * 0.3, H], [0.94, C * 0.1, H]])],
    ];
    // Distance between palettes: each color's nearest match in the other, in OKLab.
    const lab = (h) => { const [l, c, hh] = toOklch(h); return [l, c * Math.cos((hh * Math.PI) / 180), c * Math.sin((hh * Math.PI) / 180)]; };
    const mine = cols.map(lab), dist = (p) => p.colors.map(lab).reduce((a, x) => a + Math.min(...mine.map((y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]))), 0) / p.colors.length;
    for (const p of PALS.filter((p) => !palMatches(p)).sort((a, b) => dist(a) - dist(b)).slice(0, 2)) out.push([p.name, p.colors, p.roles]);
    return out;
  }
  let sugKey = "", sugList = [], sugT = 0;
  function renderSuggest() {
    const key = JSON.stringify([gen() === "contours", gen() === "contours" ? [S.line, S.line2, S.bg] : S.grad.colors]);
    if (key === sugKey) return;
    sugKey = key; sugList = suggestions();
    const contours = gen() === "contours";
    $("suggest").innerHTML = sugList.map(([name, cols, roles], i) => {
      const r = roles || rolesOf(cols);
      const sw = contours ? `<span class="sug-sw" style="background:${r[2]}"><i style="background:${r[0]}"></i><i style="background:${r[1]}"></i></span>` : `<span class="sug-sw">${cols.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
      return `<button class="sug" data-i="${i}" style="--i:${i}">${sw}<span>${name}</span></button>`;
    }).join("");
    if (contours) { $("addSug").innerHTML = ""; return; }
    const base = toOklch(S.grad.colors[sel != null && S.grad.colors[sel] ? sel : S.grad.colors.length - 1]);
    const adds = [[base[0] + 0.16, base[1] * 0.7, base[2]], [base[0] - 0.18, base[1], base[2]], [base[0], base[1], base[2] + 30], [base[0], base[1], base[2] - 30], [base[0], Math.max(base[1], 0.08), base[2] + 180], [0.95, 0.02, base[2]]].map(([l, c, h]) => fromOklch(clamp(l, 0.12, 0.97), c, (h + 360) % 360));
    $("addSug").innerHTML = [...new Set(adds)].map((c) => `<button class="sw xs" data-c="${c}" style="background:${c}" title="Add ${c}" aria-label="Add ${c}"></button>`).join("");
  }
  $("suggest").onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; const [, cols, roles] = sugList[+b.dataset.i]; applyPal(cols, roles); update(); };
  $("addSug").onclick = (e) => { const b = e.target.closest("[data-c]"); if (b) addStop(rnd(0.15, 0.85), rnd(0.15, 0.85), b.dataset.c); };

  function setGradColors(cols) {
    S.grad.colors = cols.slice(0, 8);
    while (S.grad.points.length < S.grad.colors.length) S.grad.points.push({ x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3) });
    S.grad.points = S.grad.points.slice(0, S.grad.colors.length);
  }
  const LINE_COLORS = ["#1b1b1b", "#2c2a26", "#8a8378", "#f26b3a", "#ef2b52", "#34493b", "#5b6b9a", "#f1ede4"];
  const BG_COLORS = ["#faf8f3", "#f1ede4", "#e6eadf", "#efe2d3", "#1c1d1f", "#0e1424", "#ef2b52"];
  swatchRow("lineSw", LINE_COLORS, () => S.line, (v) => (S.line = v));
  swatchRow("line2Sw", LINE_COLORS, () => S.line2, (v) => (S.line2 = v));
  swatchRow("bgSw", BG_COLORS, () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  bindHex("lineHex", () => S.line, (v) => (S.line = v));
  bindHex("line2Hex", () => S.line2, (v) => (S.line2 = v));
  bindHex("bgHex", () => S.bg, (v) => { S.bg = v; S.transparent = false; }, () => S.transparent);
  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  makeSlider($("color"), { group: "color", label: "Opacity", ...k("opacity"), pct: true, min: 0.05, max: 1, step: 0.01, fmt: pct, rand: [0.5, 1], hard: [0, 1] });
  swatchRow("inkSw", ["#1b1b1b", "#2c2a26", "#f26b3a", "#4b3fd1", "#34493b", "#ffffff"], () => S.ink, (v) => (S.ink = v));
  swatchRow("paperSw", ["#f1ede4", "#faf8f3", "#efe2d3", "#e6eadf", "#1c1d1f", "#0e1424"], () => S.paper, (v) => (S.paper = v));
  bindHex("inkHex", () => S.ink, (v) => (S.ink = v));
  bindHex("paperHex", () => S.paper, (v) => (S.paper = v));
  function randomPalette() {
    const p = pick(PALS.filter((p) => !palMatches(p)));
    applyPal(p.colors, p.roles);
  }
  // Stops update in place when only their colors change, so swatches ease to the new color.
  function renderStops() {
    const el = $("stops"), cols = S.grad.colors, items = [...el.querySelectorAll(".stop")];
    const canAdd = cols.length < 8, hasAdd = !!el.querySelector(".stop-add");
    if (items.length === cols.length && canAdd === hasAdd && items.every((it) => it.querySelector(".x") ? cols.length > 2 : cols.length <= 2)) {
      items.forEach((it, i) => { it.querySelector(".sw").style.background = cols[i]; it.classList.toggle("on", gen() === "mesh" && sel === i); });
    } else {
      const before = items.length;
      el.innerHTML = "";
      cols.forEach((c, i) => {
        const item = document.createElement("div");
        item.className = "stop" + (gen() === "mesh" && sel === i ? " on" : "") + (before && i >= before ? " fresh" : "");
        item.innerHTML = `<button class="sw" style="background:${c}" aria-label="Edit color ${i + 1}"></button>${cols.length > 2 ? `<button class="x" aria-label="Remove color ${i + 1}">${ic("x")}</button>` : ""}`;
        const sw = item.querySelector(".sw");
        sw.onclick = () => picker.open(sw, S.grad.colors[i], (v) => { S.grad.colors[i] = v; sw.style.background = v; update({ instant: true }); }, () => commit(), inPlay());
        item.querySelector(".x")?.addEventListener("click", () => { picker.close(); S.grad.colors.splice(i, 1); S.grad.points.splice(i, 1); sel = null; update(); });
        el.appendChild(item);
      });
      if (canAdd) {
        const add = document.createElement("button");
        add.className = "stop-add"; add.title = "Add color"; add.setAttribute("aria-label", "Add color");
        add.innerHTML = ic("plus");
        add.onclick = () => addStop(rnd(0.15, 0.85), rnd(0.15, 0.85));
        el.appendChild(add);
      }
    }
    $("stopCount").textContent = `${cols.length} of 8`;
  }
  function addStop(x, y, color) {
    if (S.grad.colors.length >= 8) return toast("Up to 8 colors");
    S.grad.colors.push(color || pick(pick(PALS).colors));
    S.grad.points.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
    sel = S.grad.colors.length - 1;
    update();
  }
  function scatterGrad() { S.grad.points = S.grad.colors.map(() => ({ x: +rnd(0.08, 0.92).toFixed(3), y: +rnd(0.08, 0.92).toFixed(3) })); }

  // ---------- effect panels ----------
  const fxBodies = {}, fxSliders = {};
  for (const [id, , , , params] of FXC) {
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
  let swapping = null;
  $("fxRemove").onclick = () => { const id = fxOf(); if (!id) return; removeFx(id); P.slot = S.fxOrder.length ? "fx:" + S.fxOrder[S.fxOrder.length - 1] : "addfx"; update(); };
  $("fxSwap").onclick = () => { swapping = fxOf(); setSlot("addfx"); };
  const fxCards = {};
  for (const cat of FX_CATS) {
    const h = document.createElement("div");
    h.className = "sub-head";
    h.innerHTML = `<h3 class="sub">${cat}</h3>`;
    const grid = document.createElement("div");
    grid.className = "cards";
    for (const f of FXC.filter((x) => x[2] === cat)) {
      const id = f[0];
      const c = card(f[1], () => {
        if (swapping && swapping !== id) { const i = S.fxOrder.indexOf(swapping); removeFx(swapping); S.fx[id].on = true; if (!S.fxOrder.includes(id)) S.fxOrder.splice(Math.max(0, i), 0, id); }
        else if (!S.fx[id].on) addFx(id);
        swapping = null;
        P.slot = "fx:" + id;
        update();
      });
      c.classList.add("fx-card");
      c.insertAdjacentHTML("beforeend", `<span class="added" aria-hidden="true">${ic("check")}</span>`);
      grid.appendChild(c); fxCards[id] = c;
    }
    $("fxGallery").append(h, grid);
  }
  function randomEffects() {
    for (const id of [...S.fxOrder]) removeFx(id);
    // Curated pairings read better than any two effects at random.
    const combos = [["glass", "grain"], ["mesh"], ["lens", "grain"], ["blur", "grain"], ["halftone"], ["riso"], ["linescreen"], ["emboss"], ["gradmap", "grain"], ["bloom", "vignette"], ["wave", "chroma", "scan"], ["voronoi"], ["dither"], ["pixel"]];
    for (const id of pick(combos)) { addFx(id); randomizeFx(id); }
    if (P.safe) safeFix();
  }

  // ---------- randomizing ----------
  function randomizeGroup(group) {
    for (const c of sliders) if (c.group === group && c.visible() && c.label !== "Grid") c.set(randomValue(c));
    if (P.safe) safeFix();
  }
  // Keeps randomized output away from settings that turn into solid fills or stall rendering.
  function safeFix(st = S) {
    const lin = T.LINEAR.has(st.pattern);
    if (lin) st.gap = Math.max(st.gap, (st.mode === "lines" ? 10 : 12) + st.liquify * 4);
    else st.levels = clamp(st.levels, 4, 36);
    const spacing = lin ? st.gap : Math.max(3, (0.5 * st.scale) / Math.max(1, st.levels));
    if (st.mode === "lines") st.weight = +Math.min(st.weight, Math.max(0.6, spacing * 0.35)).toFixed(2);
    st.octaves = Math.min(st.octaves, 3); st.warp = Math.min(st.warp, 1); st.liquify = Math.min(st.liquify, 1.8);
    st.res = Math.max(st.res, 3); st.minLen = Math.max(st.minLen, 6); st.band = clamp(st.band, 0.3, 0.7);
    st.scale = Math.max(st.scale, 250);
    const g = st.grad;
    g.scale = clamp(g.scale, 0.25, 2.5); g.detail = Math.min(g.detail, 5); g.warp = Math.min(g.warp, 1);
    const f = st.fx;
    f.pixel.size = Math.max(f.pixel.size, 8); f.ascii.cell = Math.max(f.ascii.cell, 9); f.halftone.size = Math.max(f.halftone.size, 6);
    f.glass.width = Math.max(f.glass.width, 18); f.mesh.cell = Math.max(f.mesh.cell, 40); f.grain.amount = Math.min(f.grain.amount, 0.25);
    f.chroma.amount = Math.min(f.chroma.amount, 12); f.liquify.amount = Math.min(f.liquify.amount, 1);
    f.blur.amount = Math.min(f.blur.amount, 70); f.bloom.intensity = Math.min(f.bloom.intensity, 1.3); f.voronoi.cell = Math.max(f.voronoi.cell, 18);
    f.linescreen.spacing = Math.max(f.linescreen.spacing, 4.5); f.wave.amp = Math.min(f.wave.amp, 36); f.emboss.strength = Math.min(f.emboss.strength, 2.5);
    f.dither.pix = Math.max(f.dither.pix, 2); f.kaleido.segments = clamp(f.kaleido.segments, 3, 12);
  }
  // A variation keeps the look and moves the details: new seed plus small nudges.
  function variation() {
    const nudge = (v, r) => v * (1 + rnd(-r, r));
    S.seed = newSeed();
    if (gen() === "contours") {
      S.scale = Math.round(nudge(S.scale, 0.12));
      S.warp = +clamp(nudge(S.warp || 0.2, 0.2), 0, 2).toFixed(2);
      if (T.ANGLED.has(S.pattern)) S.angle = Math.round((S.angle + rnd(-10, 10) + 180) % 180);
      if (activePoints()) S.points = S.points.map((p) => ({ ...p, x: +clamp(p.x + rnd(-0.06, 0.06), 0.05, 0.95).toFixed(3), y: +clamp(p.y + rnd(-0.06, 0.06), 0.05, 0.95).toFixed(3) }));
    } else {
      if (gen() === "mesh") S.grad.points = S.grad.points.map((p) => ({ x: +clamp(p.x + rnd(-0.08, 0.08), 0.02, 0.98).toFixed(3), y: +clamp(p.y + rnd(-0.08, 0.08), 0.02, 0.98).toFixed(3) }));
      if (["flow", "noise", "linear", "conic"].includes(gen())) S.grad.angle = Math.round(S.grad.angle + rnd(-12, 12));
    }
    if (P.safe) safeFix();
  }
  function surprise() {
    applyLook(pick(PRESETS.filter((p) => !lookMatches(p[2])))[2]);
    variation();
    if (Math.random() < 0.3) randomPalette();
    update({ fade: true });
  }
  $("variation").onclick = () => { variation(); update({ fade: true }); };
  $("surprise").onclick = surprise;
  $("undo").onclick = () => travel(-1);
  $("redo").onclick = () => travel(1);

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
    S.points = Array.from({ length: n }, () => ({ x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3), r: Math.round(Math.min(S.w, S.h) * rnd(0.12, 0.3)), s: +(Math.random() < 0.2 ? rnd(-1, -0.4) : rnd(0.6, 1.4)).toFixed(2) }));
    S.usePoints = true; sel = null;
  }

  // ---------- canvas overlay ----------
  const art = $("art"), artSvg = $("artSvg"), fxCanvas = $("fx"), ov = $("ov"), wrap = $("wrap");
  const handleList = (st = S) => (st.source === "gradient" ? (st.grad.type === "mesh" ? st.grad.points : null) : st.usePoints && st.showPoints ? st.points : null);
  function drawOverlay(st = S) {
    ov.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    const grad = st.source === "gradient", list = handleList(st);
    ov.classList.toggle("off", !list);
    if (!list) { ov.innerHTML = ""; return; }
    const u = S.w / Math.max(1, art.clientWidth), ns = 'vector-effect="non-scaling-stroke"';
    let out = "";
    list.forEach((p, i) => {
      const x = p.x * S.w, y = p.y * S.h, on = i === sel;
      if (grad) {
        out += `<circle cx="${x}" cy="${y}" r="${(on ? 13 : 11) * u}" fill="${on ? ACCENT : "rgba(0,0,0,.28)"}" pointer-events="none"/><circle cx="${x}" cy="${y}" r="${(on ? 11 : 9.5) * u}" fill="#fff" pointer-events="none"/><circle cx="${x}" cy="${y}" r="${(on ? 8.5 : 7) * u}" fill="${st.grad.colors[i]}" pointer-events="none"/>`;
      } else {
        out += `<circle cx="${x}" cy="${y}" r="${p.r}" fill="none" stroke="${on ? ACCENT : "rgba(120,120,120,.55)"}" stroke-width="1" stroke-dasharray="3 4" ${ns} pointer-events="none"/>`;
        if (on) out += `<line x1="${x}" y1="${y}" x2="${x + p.r}" y2="${y}" stroke="${ACCENT}" stroke-width="1" ${ns} pointer-events="none"/><circle class="rs" data-i="${i}" cx="${x + p.r}" cy="${y}" r="${6 * u}" fill="#fff" stroke="${ACCENT}" stroke-width="1.5" ${ns}/>`;
        out += `<circle cx="${x}" cy="${y}" r="${8 * u}" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width="1" ${ns} pointer-events="none"/><circle cx="${x}" cy="${y}" r="${4.5 * u}" fill="${p.s < 0 ? "#fff" : on ? ACCENT : "#1c1c1e"}" stroke="${on ? ACCENT : "#1c1c1e"}" stroke-width="1.5" ${ns} pointer-events="none"/>`;
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
    const i = e.target.dataset?.i, [x, y] = toArt(e);
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
  sizeMenu.onclick = (e) => { const b = e.target.closest(".opt"); if (!b) return; S.w = +b.dataset.w; S.h = +b.dataset.h; closeMenus(); update(); };
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
  $("safe").onchange = (e) => { P.safe = e.target.checked; savePrefs(); toast(P.safe ? "Safe values on" : "Safe values off. Randomizing uses the full ranges."); };
  $("unlock").onchange = (e) => {
    if (e.target.checked) { e.target.checked = false; closeMenus(); openModal("unlockModal"); return; }
    P.unlock = false; savePrefs(); toast("Values locked to slider ranges");
  };
  $("unlockCancel").onclick = () => closeModal("unlockModal");
  $("unlockOk").onclick = () => { P.unlock = true; savePrefs(); $("unlock").checked = true; closeModal("unlockModal"); toast("Values unlocked"); };
  const settingsJSON = () => JSON.stringify({ app: "isoline", version: 5, settings: S }, null, 2);
  $("exportSettings").onclick = () => { closeMenus(); download(new Blob([settingsJSON()], { type: "application/json" }), `isoline-settings-${S.seed}.json`, "Settings saved"); };
  $("copySettings").onclick = async () => { closeMenus(); try { await navigator.clipboard.writeText(settingsJSON()); toast("Settings copied"); } catch (e) { toast("Clipboard is blocked here. Use Download settings."); } };
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
  $("resetAll").onclick = () => { closeMenus(); S = withDefaults(null); sel = null; P.slot = "preset"; update(); toast("Reset. Undo with ⌘Z"); };

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
  const autoName = () => `isoline-${gen() === "contours" ? S.pattern : gen()}-${S.w}x${S.h}-${S.seed}`;
  const fmtBytes = (n) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB");
  const exportFmt = () => (isRaster(S) ? "png" : S.fmt);
  function svgPng(scale) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([current.svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const sc = Math.min(scale, 16000 / Math.max(S.w, S.h)), c = document.createElement("canvas");
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
    const sc = Math.min(scale, FXR.maxSize / Math.max(S.w, S.h)), w = Math.round(S.w * sc), h = Math.round(S.h * sc);
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
      try { await navigator.clipboard.writeText(current.svg); toast("Copied. Paste into Figma with ⌘V"); } catch (e) { toast("Clipboard is blocked here. Use Download."); }
      return;
    }
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(1) })]); toast("PNG copied. Paste into Figma with ⌘V"); } catch (e) { toast("Clipboard is blocked here. Use Download."); }
  }
  $("copy").onclick = copyOut;

  // ---------- keyboard ----------
  const SLOT_KEYS = ["preset", "generator", "shape", "lines", "colors", "addfx"];
  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches("input:not([type=range]):not([type=checkbox]), textarea");
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape") { picker.close(); closeMenus(); for (const m of document.querySelectorAll(".modal")) m.hidden = true; if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    if (document.querySelector(".modal:not([hidden])")) return;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (typing || mod || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "r") { e.preventDefault(); if (e.shiftKey) surprise(); else { variation(); update({ fade: true }); } }
    else if (key === "c") copyOut();
    else if (key === "e") $("exportBtn").click();
    else if (/^[1-6]$/.test(key)) { const s = SLOT_KEYS[+key - 1]; if (s !== "lines" || gen() === "contours") setSlot(s); }
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
  for (const el of [$("slots"), $("options"), sizeMenu]) smoothWheel(el);

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
      img.onload = () => { target.width = w; target.height = h; const x = target.getContext("2d"); x.clearRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); resolve(target); };
      img.onerror = reject;
      img.src = url;
    });
  }
  const job = (st, w, h, image) => ({ w, h, k: w / st.w, seed: st.seed, image, grad: st.source === "gradient" ? st.grad : null, fx: st.fx, order: st.fxOrder, ink: st.ink, paper: st.paper });
  function fit() {
    const cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
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
    if (raster && !FXR) { raster = false; if (!fxWarned) { fxWarned = true; toast("This browser can't run WebGL2, so gradients and effects are off."); } }
    let svg = "";
    if (st.source === "contours") svg = T.buildSVG(st, draft ? { res: Math.max(st.res * 2, 7) } : {}).svg;
    if (raster) {
      const { w, h } = previewDims(st);
      let image = null;
      if (st.source === "contours") { image = await rasterize(rasterCanvas, svg, w, h); if (tok !== paintTok) return null; }
      FXR.render(job(st, w, h, image));
    } else artSvg.innerHTML = svg;
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
  let queue = [], pumping = false, previewT = 0;
  function enqueue(jobs) { queue = jobs; if (!pumping) pump(); }
  async function pump() {
    pumping = true;
    while (queue.length) { const j = queue.shift(); try { await j(); } catch (e) {} await new Promise((r) => setTimeout(r, 0)); }
    pumping = false;
  }
  // New thumbnails fade in over the old ones, which leave once the fade is done.
  function swapIn(slot, node) {
    const old = [...slot.children];
    node.classList.add("fresh");
    slot.appendChild(node);
    const drop = () => old.forEach((o) => o.remove());
    if (!old.length || reduceMotion.matches) drop();
    else { node.addEventListener("animationend", drop, { once: true }); setTimeout(drop, 700); }
    return node;
  }
  function putCanvas(slot, src, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, 0, 0, w, h);
    return swapIn(slot, c);
  }
  const svgNode = (markup) => { const t = document.createElement("template"); t.innerHTML = markup.trim(); return t.content.firstChild; };
  // Render a state into a thumbnail slot at a 16:10 frame.
  // Contour previews zoom into the center so individual lines stay readable at thumbnail size.
  async function thumb(slot, st, w = 200) {
    const h = Math.round(w * 0.625), s = { ...st, h: Math.round(st.w * 0.625) };
    if (!isRaster(s) || !TFX) {
      if (s.source !== "contours") { slot.innerHTML = ""; return null; }
      const z = 2, W = w * z, H = h * z;
      return swapIn(slot, svgNode(T.buildSVG(s, { w: W, h: H, res: 2.5 * z, minLen: 8 }).svg.replace(/^<svg([^>]*?) width="\d+" height="\d+" viewBox="[^"]*"/, `<svg$1 width="${w}" height="${h}" viewBox="${(W - w) / 2} ${(H - h) / 2} ${w} ${h}"`)));
    }
    const W = w * 2, H = h * 2;
    const image = s.source === "contours" ? await rasterize(thumbRaster, T.buildSVG(s, { w: W, h: H, res: 2.5 }).svg, W, H) : null;
    TFX.render(job(s, W, H, image));
    return putCanvas(slot, thumbCanvas, W, H);
  }
  const slotOf = (c) => c.querySelector(".th");
  const noFx = (st) => ({ ...st, fxOrder: [] });
  const mono = (st) => (st.source === "contours" ? { ...st, line: "#2c2a26", line2: "#2c2a26", bg: "#faf8f3", gradient: false, mode: "lines", transparent: false, opacity: 1 } : st);
  // Stroke modes need ink that stands off the paper; layered looks often share them.
  const hexDist = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const readable = (st) => (st.mode !== "layers" && /^#[0-9a-f]{12}$/i.test(st.line + st.bg.slice(1)) && hexDist(st.line, st.bg) < 60 ? { ...st, line: st.line2, line2: st.line } : st);
  const lightLines = (st) => ({ ...st, gap: Math.max(st.gap, st.w / 18), levels: Math.min(st.levels, 12), weight: Math.max(st.weight, 2.4) });
  function schedulePreviews(delay = 260) { clearTimeout(previewT); previewT = setTimeout(buildPreviews, delay); }
  async function effectBase(W, H) {
    if (current.raster) {
      baseCanvas.width = W; baseCanvas.height = H;
      const x = baseCanvas.getContext("2d"), sw = fxCanvas.width, sh = Math.min(fxCanvas.height, sw * 0.625);
      x.drawImage(fxCanvas, 0, (fxCanvas.height - sh) / 2, sw, sh, 0, 0, W, H);
    } else await rasterize(baseCanvas, T.buildSVG({ ...S, h: Math.round(S.w * 0.625) }, { w: W, h: H, res: 2.5 }).svg, W, H);
  }
  const fxThumb = (id, W, H) => { TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: { [id]: { ...S.fx[id], on: true } }, order: [id], ink: S.ink, paper: S.paper }); return thumbCanvas; };
  function buildPreviews() {
    if (drag) return;
    const jobs = [];
    // Slot tile thumbnails first: they're always on screen.
    const tileJob = (key, st) => jobs.push(async () => { const el = $("slotList").querySelector(`[data-th="${key}"]`); if (!el) return; const c = await thumb(el, st, 64); slotThumbs[key] = c ? c.cloneNode(true) : null; if (c) slotThumbs[key].classList.remove("fresh"); if (c && c.tagName === "CANVAS") { slotThumbs[key].getContext("2d").drawImage(c, 0, 0); } });
    tileJob("preset", S);
    tileJob("generator", lightLines(noFx(S)));
    tileJob("shape", lightLines(mono(noFx(S))));
    if (gen() === "contours") tileJob("lines", lightLines(noFx(S)));
    if (TFX && S.fxOrder.length) jobs.push(async () => {
      await effectBase(128, 80);
      for (const id of S.fxOrder) { const el = $("slotList").querySelector(`[data-th="fx:${id}"]`); if (!el) continue; const c = putCanvas(el, fxThumb(id, 128, 80), 128, 80); const copy = document.createElement("canvas"); copy.width = 128; copy.height = 80; copy.getContext("2d").drawImage(c, 0, 0); slotThumbs["fx:" + id] = copy; }
    });
    const p = panelOf(P.slot);
    if (p === "preset") for (const pc of presetCards) { if (!pc.done && !pc.el.hidden) jobs.push(async () => { await thumb(slotOf(pc.el), resolveLook(pc.look), 220); pc.done = true; }); }
    if (p === "generator") for (const [id] of GENS) jobs.push(() => { let st = clone(noFx(S)); if (id === "contours") st = asContours(st); else { st.source = "gradient"; st.grad.type = id; } return thumb(slotOf(genCards[id]), lightLines(st), 200); });
    if (p === "shape") {
      if (gen() === "contours") for (const pt of T.PATTERNS) jobs.push(() => thumb(slotOf(patCards[pt.id]), lightLines(mono({ ...noFx(S), pattern: pt.id })), 130));
      if (gen() === "noise") for (const [id] of NOISE_TYPES) jobs.push(() => thumb(slotOf(noiseCards[id]), { ...noFx(S), grad: { ...S.grad, noise: id } }, 130));
      varCards.forEach((c, i) => { c._seed = variationSeed(i); jobs.push(() => thumb(slotOf(c), { ...S, seed: c._seed }, 130)); });
    }
    if (p === "lines" && gen() === "contours") for (const m of Object.keys(modeCards)) jobs.push(() => thumb(slotOf(modeCards[m]), lightLines(readable({ ...noFx(S), mode: m })), 130));
    if (p === "addfx" && TFX) {
      jobs.push(() => effectBase(260, 163));
      for (const id of FX_IDS) jobs.push(() => putCanvas(slotOf(fxCards[id]), fxThumb(id, 260, 163), 260, 163));
    }
    enqueue(jobs);
  }

  // ---------- animated changes ----------
  const INT_KEYS = new Set(["levels", "octaves", "indexEvery", "features", "matrix", "pix", "segments", "detail"]);
  const hexMix = (a, b, t) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, "0")).join("");
  function tween(a, b, e, key) {
    if (typeof a === "number" && typeof b === "number") return INT_KEYS.has(key) ? Math.round(a + (b - a) * e) : a + (b - a) * e;
    if (typeof a === "string" && typeof b === "string" && HEX.test(a) && HEX.test(b)) return hexMix(a, b, e);
    if (Array.isArray(b)) return b.map((v, i) => (Array.isArray(a) && a[i] !== undefined ? tween(a[i], v, e, key) : v));
    if (b && typeof b === "object") { const o = {}; for (const kk in b) o[kk] = kk === "res" ? b[kk] : tween(a ? a[kk] : undefined, b[kk], e, kk); return o; }
    return b;
  }
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
    if (!fxCanvas.hidden) { const c = document.createElement("canvas"); c.width = fxCanvas.width; c.height = fxCanvas.height; c.getContext("2d").drawImage(fxCanvas, 0, 0); ghost.appendChild(c); }
    else ghost.innerHTML = artSvg.innerHTML;
    art.insertBefore(ghost, ov);
    done.then(() => requestAnimationFrame(() => (ghost.style.opacity = "0")));
    setTimeout(() => ghost.remove(), 1600);
  }
  // Small edits morph; big jumps (presets, variations, new generators) cross-fade so nothing flails mid-way.
  function animateFrom(from, fade) {
    const to = clone(S);
    if (!from || reduceMotion.matches) return render();
    if (fade || discrete(from, to) || (isRaster(to) && to.source === "contours")) { crossfade(render()); return; }
    cancelAnimationFrame(raf); cancelAnimationFrame(anim);
    const t0 = performance.now(), dur = 380;
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
  let stopsKey = "", bodyFor = null, shownSlot = null;
  // Opening a panel: the title and sections rise in, and cards follow in a short stagger.
  function enterPanel(sec) {
    if (!sec || reduceMotion.matches) return;
    for (const el of [$("optHead"), sec]) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
    [...sec.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 8)));
    for (const grid of sec.querySelectorAll(".cards, .palettes, .suggest")) [...grid.children].filter((c) => !c.hidden).forEach((c, i) => c.style.setProperty("--j", Math.min(i, 14)));
  }
  function syncUI() {
    const g = gen();
    if (P.slot === "lines" && g !== "contours") P.slot = "shape";
    if (P.slot.startsWith("fx:") && !S.fxOrder.includes(fxOf())) P.slot = "addfx";
    const panel = panelOf(P.slot);
    for (const s of document.querySelectorAll(".panel-sec")) s.hidden = s.dataset.panel !== panel;
    if (P.slot !== shownSlot) { shownSlot = P.slot; enterPanel(document.querySelector(`.panel-sec[data-panel="${panel}"]`)); }
    for (const s of document.querySelectorAll("[data-gen]")) s.hidden = s.dataset.gen === "raster" ? g === "contours" : s.dataset.gen !== g;
    const fid = fxOf();
    $("optTitle").textContent = fid ? FXI[fid].name : swapping && panel === "addfx" ? `Swap ${FXI[swapping].name}` : PANEL_TITLE[panel];
    optDice.title = optDice.ariaLabel = panel === "preset" ? "Surprise me" : `Randomize ${$("optTitle").textContent.toLowerCase()}`;
    if (fid !== bodyFor) { $("fxBodyHost").innerHTML = ""; if (fid) $("fxBodyHost").appendChild(fxBodies[fid]); bodyFor = fid; }
    if (fid) $("fxLede").textContent = `${FXI[fid].cat} · ${S.fxOrder.indexOf(fid) + 1} of ${S.fxOrder.length}`;
    if (panel !== "addfx") swapping = null;
    syncers.forEach((f) => f());
    for (const b of takeRow.querySelectorAll("[data-l]")) { b.classList.toggle("on", !!P.take[b.dataset.l]); b.setAttribute("aria-pressed", !!P.take[b.dataset.l]); }
    for (const b of $("presetFilter").children) b.classList.toggle("on", b.dataset.v === P.filter);
    $("presetGrid").classList.toggle("filtered", P.filter !== "All");
    for (const pc of presetCards) { pc.el.hidden = P.filter !== "All" && pc.group !== P.filter; pc.el.classList.toggle("on", lookMatches(pc.look)); }
    for (const [id, c] of Object.entries(genCards)) c.classList.toggle("on", id === g);
    for (const [id, c] of Object.entries(patCards)) c.classList.toggle("on", id === S.pattern);
    for (const [id, c] of Object.entries(noiseCards)) c.classList.toggle("on", id === S.grad.noise);
    for (const [id, c] of Object.entries(modeCards)) c.classList.toggle("on", id === S.mode);
    for (const [id, c] of Object.entries(fxCards)) c.classList.toggle("added", S.fxOrder.includes(id));
    varCards.forEach((c) => c.classList.toggle("on", c._seed === S.seed));
    if (panel === "colors") { renderPalettes(); clearTimeout(sugT); sugT = setTimeout(renderSuggest, sugKey ? 220 : 0); }
    $("line2Sw").classList.toggle("off", !S.gradient && S.mode !== "layers");
    $("lineLbl").textContent = S.mode === "lines" ? "Lines" : S.mode === "bands" ? "Bands" : "From";
    $("gradient").checked = S.gradient || S.mode === "layers";
    $("gradient").disabled = S.mode === "layers";
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    $("showPoints").innerHTML = ic(S.showPoints ? "eye" : "eyeoff");
    $("seed").value = S.seed;
    $("ptHint").textContent = selPoint() ? "Double-click to flip into a dip. Delete removes." : "Double-click the canvas to add a peak. Drag to move, scroll to resize.";
    $("gradHint").hidden = g !== "mesh";
    const sk = JSON.stringify([S.grad.colors, g === "mesh" ? sel : null]);
    if (sk !== stopsKey) { stopsKey = sk; renderStops(); }
    renderSlots();
    for (const key of ["w", "h"]) { const el = $(key); el.value = S[key]; el.style.width = measure(String(S[key])) + 8 + "px"; }
    $("sizeName").textContent = presetName();
    $("safe").checked = P.safe; $("unlock").checked = P.unlock;
    syncHistory();
  }
  document.fonts?.ready.then(() => { syncUI(); if (isRaster(S)) render(); });

  function update({ draft = false, commit: doCommit = true, instant = false, fade = false } = {}) {
    if (sel != null && !(S.source === "gradient" ? S.grad.points[sel] : S.points[sel])) sel = null;
    syncUI(); save(); savePrefs();
    if (draft || instant || !painted) render(draft); else animateFrom(painted, fade);
    if (doCommit && !draft) commit();
  }
  let lastWrap = "";
  new ResizeObserver(() => { const key = wrap.clientWidth + "x" + wrap.clientHeight; if (painted && key !== lastWrap) { lastWrap = key; render(); } }).observe(wrap);

  window.TopoBrand?.mount($("brand"), "isoline");
  // First visit opens on a curated preset rather than an empty default.
  let firstVisit = true;
  try { firstVisit = !localStorage.getItem(STORE); } catch (e) {}
  if (firstVisit) applyLook(PRESETS.find((p) => p[1] === "Prism")[2]);
  update({ commit: false });
  setTimeout(() => document.body.classList.remove("boot"), 900);
})();
