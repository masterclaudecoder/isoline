(() => {
  "use strict";
  document.body.classList.add("boot");
  const T = window.Topo;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const accentNow = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e8572a";
  const HEX = /^#[0-9a-f]{6}$/i;
  const px = (v) => v + "px", deg = (v) => v + "°", f2 = (v) => (+v).toFixed(2), pct = (v) => Math.round(v * 100) + "%";
  const ic = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  // ---------- effect catalog: [id, name, category, defaults, params] ----------
  const FXC = [
    ["liquify", "Liquify", "Distort", { amount: 0.5, scale: 220 }, [{ k: "amount", label: "Amount", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.9] }, { k: "scale", label: "Size", min: 20, max: 1200, step: 5, log: true, fmt: px, rand: [120, 500] }]],
    ["wave", "Waves", "Distort", { amp: 14, length: 220, angle: 0 }, [{ k: "amp", label: "Amplitude", min: 0, max: 160, step: 0.5, fmt: px, rand: [6, 30] }, { k: "length", label: "Wavelength", min: 10, max: 1200, step: 5, log: true, fmt: px, rand: [120, 400] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }]],
    ["swirl", "Twirl", "Distort", { amount: 3, radius: 0.55, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Turn", min: -12, max: 12, step: 0.05, fmt: f2, rand: [-5, 5] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.35, 0.9] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["bulge", "Bulge", "Distort", { amount: 0.6, radius: 0.45, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Amount", min: -1, max: 0.95, step: 0.01, fmt: f2, rand: [-0.5, 0.8] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.3, 0.7] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["ripple", "Ripples", "Distort", { amp: 10, length: 60, decay: 0.6, shade: 1, x: 0.5, y: 0.5 }, [{ k: "amp", label: "Amplitude", min: 0, max: 60, step: 0.5, fmt: px, rand: [4, 16] }, { k: "length", label: "Wavelength", min: 8, max: 400, step: 1, log: true, fmt: px, rand: [30, 120] }, { k: "decay", label: "Reach", min: 0.05, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "shade", label: "Light", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.5] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["water", "Water", "Distort", { amount: 1, scale: 320, caustic: 0.6 }, [{ k: "amount", label: "Refraction", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.5, 1.6] }, { k: "scale", label: "Size", min: 40, max: 1200, step: 5, log: true, fmt: px, rand: [180, 520] }, { k: "caustic", label: "Caustics", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1] }]],
    ["kaleido", "Kaleidoscope", "Distort", { segments: 6, rotate: 0, zoom: 1 }, [{ k: "segments", label: "Segments", min: 2, max: 16, step: 1, hard: [2, 64], rand: [4, 10] }, { k: "rotate", label: "Rotate", min: 0, max: 360, step: 1, fmt: deg }, { k: "zoom", label: "Zoom", min: 0.3, max: 3, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.7, 1.6] }]],
    ["glass", "Fluted glass", "Glass", { width: 44, angle: 90, strength: 0.9, frost: 0.2, light: 0.4 }, [{ k: "width", label: "Rib width", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [24, 90] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "strength", label: "Refraction", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.4] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.5] }, { k: "light", label: "Highlight", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.3, 0.7] }]],
    ["mesh", "Glass blocks", "Glass", { cell: 120, radius: 0.25, strength: 0.7, frost: 0.25, grout: 1, rim: 0.6, disp: 0.5 }, [{ k: "cell", label: "Block size", min: 12, max: 400, step: 1, log: true, fmt: px, rand: [70, 180] }, { k: "radius", label: "Corner radius", min: 0, max: 0.5, step: 0.01, fmt: pct, pct: true, rand: [0.12, 0.35] }, { k: "strength", label: "Refraction", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.4, 1.1] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.1, 0.5] }, { k: "grout", label: "Gap", min: 0, max: 4, step: 0.05, fmt: f2, rand: [0.5, 1.5] }, { k: "rim", label: "Highlight", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.8] }, { k: "disp", label: "Dispersion", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    ["lens", "Liquid glass", "Glass", { shape: "pill", size: 0.42, x: 0.5, y: 0.5, refraction: 0.9, frost: 0.2, rim: 0.6, disp: 0.5 }, [{ seg: "shape", options: [["circle", "Circle"], ["pill", "Pill"], ["square", "Square"]] }, { k: "size", label: "Size", min: 0.1, max: 1.2, step: 0.01, fmt: f2, rand: [0.3, 0.6] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "refraction", label: "Refraction", min: 0, max: 2.5, step: 0.01, fmt: f2, rand: [0.6, 1.3] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.4] }, { k: "rim", label: "Highlight", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.8] }, { k: "disp", label: "Dispersion", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.8] }]],
    ["blur", "Progressive blur", "Light", { amount: 32, dir: "bottom", start: 0.35 }, [{ seg: "dir", options: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["center", "Edges"], ["even", "Even"]] }, { k: "amount", label: "Blur", min: 0, max: 200, step: 0.5, fmt: px, rand: [16, 60] }, { k: "start", label: "Starts at", min: 0, max: 0.95, step: 0.01, fmt: pct, pct: true, rand: [0.25, 0.6] }]],
    ["bloom", "Glow", "Light", { threshold: 0.55, radius: 30, intensity: 0.9 }, [{ k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.35, 0.75] }, { k: "radius", label: "Radius", min: 2, max: 200, step: 1, log: true, fmt: px, rand: [16, 50] }, { k: "intensity", label: "Intensity", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.2] }]],
    ["emboss", "Relief", "Light", { strength: 1.2, angle: 135, depth: 2 }, [{ k: "strength", label: "Strength", min: 0, max: 5, step: 0.01, fmt: f2, rand: [0.8, 2.2] }, { k: "angle", label: "Light angle", min: 0, max: 360, step: 1, fmt: deg }, { k: "depth", label: "Depth", min: 0.5, max: 16, step: 0.5, fmt: px, rand: [1.5, 4] }]],
    ["rays", "God rays", "Light", { length: 0.5, threshold: 0.5, intensity: 1.6, x: 0.5, y: 0.15 }, [{ k: "length", label: "Length", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.4, 0.7] }, { k: "intensity", label: "Intensity", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.8, 1.6] }, { k: "x", label: "Light X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.2, 0.8] }, { k: "y", label: "Light Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4] }]],
    ["vignette", "Vignette", "Light", { amount: 0.4, softness: 0.5 }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.55] }, { k: "softness", label: "Softness", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["gradmap", "Gradient map", "Color", { c1: "#15123a", c2: "#4b3fd1", c3: "#f4f1ff", mix: 1 }, [{ color: "c1", label: "Shadows" }, { color: "c2", label: "Midtones" }, { color: "c3", label: "Highlights" }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["posterize", "Posterize", "Color", { levels: 5 }, [{ k: "levels", label: "Levels", min: 2, max: 16, step: 1, hard: [2, 64], rand: [3, 7] }]],
    ["heatmap", "Heatmap", "Color", { glow: 12, mix: 1, invert: false }, [{ k: "glow", label: "Glow", min: 0, max: 80, step: 0.5, fmt: px, rand: [4, 24] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }, { sw: "invert", label: "Invert" }]],
    ["chrome", "Liquid metal", "Color", { strength: 1, bands: 2.2, soft: 6, tint: "#d9dde3", mix: 1 }, [{ color: "tint", label: "Tint" }, { k: "strength", label: "Depth", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.6, 1.6] }, { k: "bands", label: "Reflections", min: 0.5, max: 6, step: 0.05, fmt: f2, rand: [1.4, 3.2] }, { k: "soft", label: "Softness", min: 1, max: 40, step: 0.5, fmt: px, rand: [3, 12] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["halftone", "Halftone", "Print", { size: 10, angle: 45, mono: true }, [{ k: "size", label: "Dot size", min: 3, max: 80, step: 0.5, log: true, fmt: px, rand: [6, 18] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["cmyk", "CMYK halftone", "Print", { size: 9, angle: 0 }, [{ k: "size", label: "Dot size", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [6, 14] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }]],
    ["linescreen", "Engrave", "Print", { spacing: 7, angle: 30, mono: true }, [{ k: "spacing", label: "Line spacing", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [5, 12] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { sw: "mono", label: "Ink only" }]],
    ["riso", "Risograph", "Print", { size: 7, offset: 4, grain: 0.3, inkA: "#ff48b0", inkB: "#0078bf", paper: "#f3efe6" }, [{ color: "inkA", label: "Ink 1" }, { color: "inkB", label: "Ink 2" }, { color: "paper", label: "Paper" }, { k: "size", label: "Dot size", min: 3, max: 40, step: 0.5, log: true, fmt: px, rand: [5, 10] }, { k: "offset", label: "Misregister", min: 0, max: 30, step: 0.5, fmt: px, rand: [1, 6] }, { k: "grain", label: "Grain", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["dither", "Dither", "Print", { matrix: 4, levels: 2, mono: true, pix: 2 }, [{ seg: "matrix", options: [[2, "2×2"], [4, "4×4"], [8, "8×8"]] }, { k: "levels", label: "Levels", min: 2, max: 8, step: 1, hard: [2, 32] }, { k: "pix", label: "Pixel", min: 1, max: 16, step: 1, fmt: px, rand: [2, 4], hard: [1, 128] }, { sw: "mono", label: "Ink only" }]],
    ["pixel", "Pixels", "Stylize", { size: 16, bevel: 0.5 }, [{ k: "size", label: "Size", min: 2, max: 160, step: 1, log: true, fmt: px, rand: [10, 36] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["voronoi", "Crystallize", "Stylize", { cell: 42, edge: 0.06 }, [{ k: "cell", label: "Cell", min: 6, max: 300, step: 1, log: true, fmt: px, rand: [24, 80] }, { k: "edge", label: "Edges", min: 0, max: 0.5, step: 0.01, fmt: f2 }]],
    ["ascii", "ASCII", "Stylize", { cell: 14, set: "ascii", custom: "", mono: true, invert: false }, [{ seg: "set", options: [["ascii", "ASCII"], ["blocks", "Blocks"], ["dots", "Dots"], ["binary", "01"], ["custom", "Custom"]] }, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [10, 20] }, { sw: "mono", label: "Ink only" }, { sw: "invert", label: "Invert" }]],
    ["scan", "Scanlines", "Stylize", { spacing: 4, strength: 0.25 }, [{ k: "spacing", label: "Spacing", min: 2, max: 40, step: 0.5, fmt: px, rand: [3, 7] }, { k: "strength", label: "Strength", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.15, 0.4] }]],
    ["chroma", "Chromatic", "Stylize", { amount: 6 }, [{ k: "amount", label: "Shift", min: 0, max: 60, step: 0.5, fmt: px, rand: [2, 10] }]],
    ["paper", "Paper", "Texture", { crumple: 0.3, fiber: 0.6, scale: 420 }, [{ k: "crumple", label: "Crumple", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "fiber", label: "Fibres", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1] }, { k: "scale", label: "Size", min: 40, max: 1200, step: 5, log: true, fmt: px, rand: [160, 480] }]],
    ["grain", "Grain", "Texture", { amount: 0.12, size: 1.2, mono: true, soft: true }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.06, 0.2] }, { k: "size", label: "Size", min: 1, max: 8, step: 0.1, fmt: px, rand: [1, 2] }, { sw: "soft", label: "Film grain" }, { sw: "mono", label: "Monochrome" }]],
  ];
  const FXI = Object.fromEntries(FXC.map(([id, name, cat, d, p]) => [id, { id, name, cat, d, p }]));
  const FX_IDS = FXC.map((f) => f[0]);
  // Effects with randomness get their own seed; 0 follows the design's seed.
  const SEEDED = new Set(["liquify", "voronoi", "grain", "water", "paper", "riso", "rays"]);
  const FX_DEFAULTS = Object.fromEntries(FXC.map(([id, , , d]) => [id, { on: false, ...d, ...(SEEDED.has(id) ? { seed: 0 } : {}) }]));
  const FX_CATS = [...new Set(FXC.map((f) => f[2]))];

  // ---------- generators + palettes ----------
  const GENS = [
    ["contours", "Contours", "Lines and bands"],
    ["mesh", "Mesh", "Soft color points"],
    ["flow", "Flow", "Warped color fields"],
    ["noise", "Noise", "Clouds, ridges and cells"],
    ["linear", "Linear", "Straight blend"],
    ["radial", "Radial", "Blend from the center"],
    ["conic", "Conic", "Blend around a point"],
  ];
  const GEN_LABEL = Object.fromEntries(GENS.map((g) => [g[0], g[1]]));
  const NOISE_TYPES = [["clouds", "Clouds"], ["ridges", "Ridges"], ["billow", "Billow"], ["cells", "Cells"], ["veins", "Veins"], ["marble", "Marble"], ["neuro", "Neuro"], ["ring", "Smoke ring"]];
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
  // Brand palettes, from each company's brand pages where published (Slack, Spotify, Discord, Dropbox) and
  // otherwise from the values design references agree on (Figma, Stripe, Linear, Mailchimp, Airbnb).
  const BRANDS = [
    ["Caddis", ["#2f6fdb", "#6a9f7a", "#d8a51f", "#e2632a", "#c9302c"], ["#2f6fdb", "#e2632a", "#f7f4ee"]],
    ["Slack", ["#4a154b", "#36c5f0", "#2eb67d", "#ecb22e", "#e01e5a"], ["#4a154b", "#36c5f0", "#f4ede4"]],
    ["Figma", ["#a259ff", "#1abcfe", "#0acf83", "#ff7262", "#f24e1e"], ["#1e1e1e", "#a259ff", "#ffffff"]],
    ["Spotify", ["#191414", "#1ed760", "#ffffff"], ["#1ed760", "#ffffff", "#191414"]],
    ["Discord", ["#000000", "#5865f2", "#e0e3ff"], ["#5865f2", "#e0e3ff", "#000000"]],
    ["Dropbox", ["#1e1919", "#0061fe", "#f7f5f2"], ["#0061fe", "#1e1919", "#f7f5f2"]],
    ["Stripe", ["#0a2540", "#635bff", "#f6f9fc"], ["#635bff", "#0a2540", "#f6f9fc"]],
    ["Linear", ["#08090a", "#5e6ad2", "#f7f8f8"], ["#5e6ad2", "#f7f8f8", "#08090a"]],
    ["Mailchimp", ["#241c15", "#ffe01b", "#ffffff"], ["#241c15", "#ffffff", "#ffe01b"]],
    ["Airbnb", ["#222222", "#484848", "#ff385c", "#ffffff"], ["#ff385c", "#222222", "#ffffff"]],
  ];
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  // Lines take the darkest color, the blend a middle one and the background the lightest.
  const rolesOf = (cols) => { const o = cols.slice().sort((a, b) => lum(a) - lum(b)); return [o[0], o[Math.floor(o.length / 2)], o[o.length - 1]]; };
  const PAL_GROUPS = [["Curated", CURATED], ["Brands", BRANDS]];
  // Palettes are ordered by background: light ones first, neutrals before tints, then around the hue wheel.
  const bgKey = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const light = lum(hex) > 150, neutral = d < 0.08;
    return (light ? 0 : 2000) + (neutral ? (light ? 0 : 0) + (255 - lum(hex)) : 400 + ((h * 60 + 360) % 360));
  };
  const PALS = PAL_GROUPS.flatMap(([group, list]) => list.map(([name, colors, roles]) => ({ name, group, colors, roles: roles || rolesOf(colors) })).sort((a, b) => bgKey(a.roles[2]) - bgKey(b.roles[2])));
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
    mode: "lines", band: 0.5, mids: [],
    levels: 20, gap: 18, bias: 0, weight: 1.2, swell: 0, swellSize: 260, taper: 0,
    indexEvery: 0, indexWeight: 2, smooth: 0.7, res: 4, minLen: 12,
    ...palState("Paper"), gradient: false, transparent: false, opacity: 1,
    grad: { type: "flow", colors: ramp("Prism"), points: [{ x: 0.18, y: 0.22 }, { x: 0.8, y: 0.2 }, { x: 0.72, y: 0.8 }, { x: 0.2, y: 0.84 }, { x: 0.48, y: 0.5 }], angle: -25, warp: 0.5, warpScale: 1.6, soft: 1.6, scale: 0.45, detail: 2, stretch: 1.8, contrast: 1, noise: "clouds" },
    fx: clone(FX_DEFAULTS), fxOrder: [], ink: "#1b1b1b", paper: "#f1ede4",
    fmt: "svg", pngScale: 2,
    motion: { type: "still", dur: 6, amt: 0.5, mode: "loop", dir: 1, ease: "linear", bez: [0.42, 0, 0.58, 1], seed: 0 }, vid: { size: 1080, fps: 30, loops: 1 }, gif: { size: 480, fps: 20 },
  };
  const STORE = "isoline-v4", PREFS = "isoline-prefs-v4";
  function withDefaults(src) {
    const out = clone(DEFAULTS);
    if (!src || typeof src !== "object") return out;
    for (const key of Object.keys(out)) {
      if (!(key in src)) continue;
      if (key === "fx") { for (const id of FX_IDS) out.fx[id] = { ...FX_DEFAULTS[id], ...(src.fx?.[id] || {}) }; }
      else if (key === "grad") out.grad = { ...out.grad, ...src.grad };
      else if (key === "motion" || key === "vid" || key === "gif") out[key] = { ...out[key], ...src[key] };
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
  const asContours = (st) => { if (st.source === "contours") return st; const own = PALS.find((p) => sameCols(p.colors, st.grad.colors)), [line, line2, bg] = own ? own.roles : rolesOf(st.grad.colors); // Every color of the gradient carries over: the background, then the rest as inks in order.
    const inks = st.grad.colors.filter((c) => c !== bg).slice(0, 6), many = inks.length >= 3;
    return { ...st, source: "contours", mode: "bands", band: clamp(st.band, 0.35, 0.6), line: many ? inks[0] : line, line2: many ? inks[inks.length - 1] : line2, mids: many ? inks.slice(1, -1) : [], bg, gradient: false, transparent: false, opacity: 1 }; };
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
    ["Noise", "Neuro", { ...G("noise", "Iris", { noise: "neuro", scale: 1, detail: 3, warp: 0.2, stretch: 1, contrast: 1.1, angle: 0 }), fx: { grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Noise", "Halo", { ...G("noise", "Dusk", { noise: "ring", scale: 0.8, detail: 3, warp: 0.6, stretch: 1, contrast: 1, angle: 0 }), fx: { grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Effects", "Chrome", { pattern: "blobs", usePoints: true, falloff: 1.1, warp: 0.3, octaves: 2, levels: 14, mode: "layers", smooth: 0.7, line: "#1b1b1b", line2: "#f1ede4", bg: "#1b1b1b", fx: { chrome: { strength: 1.2, bands: 2.4, soft: 8, tint: "#d9dde3", mix: 1 } } }],
    ["Effects", "Thermal", { ...G("noise", "Ink", { noise: "clouds", scale: 0.9, detail: 4, warp: 0.4, stretch: 1.2, contrast: 1.1, angle: 0 }), fx: { heatmap: { glow: 14, mix: 1 } } }],
    ["Effects", "Press", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25 }), fx: { cmyk: { size: 9, angle: 0 }, paper: { crumple: 0.35, fiber: 0.7, scale: 420 } }, paper: "#f4efe4" }],
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
    color: ["line", "line2", "mids", "gradient", "bg", "transparent", "opacity", "grad.colors", "ink", "paper"],
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

  // ---------- color ----------
  const { toOklch, fromOklch } = window.Color;
  const picker = window.ColorPicker;
  // Colors already in play, offered as quick picks in the picker.
  const inPlay = () => (S.source === "contours" ? [S.bg, S.line, ...(S.mids || []), S.line2] : S.grad.colors);
  // Colors that sit well next to one: lighter, darker, its neighbours on the wheel, its opposite and a soft near-white.
  const variants = (hex) => { const [l, c, h] = toOklch(hex); return [[l + 0.16, c * 0.7, h], [l - 0.18, c, h], [l, c, h + 30], [l, c, h - 30], [l, Math.max(c, 0.08), h + 180], [0.95, 0.02, h]].map(([a, b, d]) => fromOklch(clamp(a, 0.12, 0.97), b, (d + 360) % 360)); };
  const swatchesFor = (hex) => [["In use", inPlay()], ["Try", variants(parseHex(hex) || "#808080")]];

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
    sw.onclick = () => picker.open(sw, get(), (v) => { set(v); sw.style.background = v; update({ instant: true }); }, () => commit(), swatchesFor(get()));
    hex.addEventListener("change", () => { const v = parseHex(hex.value); if (!v) { hex.value = get(); return; } set(v); update(); });
    hex.addEventListener("keydown", (e) => { if (e.key === "Enter") hex.blur(); });
    syncers.push(() => { const v = get(); sw.style.background = v; if (document.activeElement !== hex) hex.value = v; });
    host.appendChild(row);
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
  // Tile copy: the title names what is chosen; the subtitle lists its key settings as plain facts.
  const PRESET_KIND = { Lines: "Line preset", Fills: "Fill preset", Gradients: "Gradient preset", Noise: "Noise preset", Effects: "Effect preset" };
  function slotInfo(id) {
    const g = gen(), gr = S.grad, sc = (v) => f2(v) + "×";
    if (id === "preset") { const p = currentPreset(); return p ? [p[1], PRESET_KIND[p[0]]] : ["Custom", "Your own settings"]; }
    if (id === "generator") return [GEN_LABEL[g], g === "contours" ? "Vector, SVG output" : "Raster, PNG output"];
    if (id === "shape") {
      if (g === "contours") return [patLabel(S.pattern), activePoints() ? `${S.points.length} points, seed ${S.seed}` : `Scale ${S.scale}px, seed ${S.seed}`];
      if (g === "noise") return [NOISE_LABEL[gr.noise], `Scale ${sc(gr.scale)}, seed ${S.seed}`];
      if (g === "flow") return ["Flow field", `Scale ${sc(gr.scale)}, seed ${S.seed}`];
      if (g === "mesh") return ["Mesh", `${gr.colors.length} points, softness ${f2(gr.soft)}`];
      if (g === "radial") return ["Radial", `Warp ${f2(gr.warp)}`];
      return [GEN_LABEL[g], `Angle ${gr.angle}°, warp ${f2(gr.warp)}`];
    }
    if (id === "lines") return S.mode === "lines" ? ["Lines", `${f2(S.weight).replace(/\.?0+$/, "")}px weight, ${linear() ? S.gap + "px gap" : S.levels + " lines"}`] : S.mode === "bands" ? ["Bands", `${pct(S.band)} thick, ${linear() ? S.gap + "px gap" : S.levels + " bands"}`] : ["Layers", linear() ? `${S.gap}px gap` : `${S.levels} layers`];
    if (id === "colors") {
      const p = currentPal(), n = inksOf().length;
      return [p ? p.name : "Custom", g === "contours" ? `${n} colors${S.gradient || S.mode === "layers" ? ", blended" : ""}` : `${n} colors`];
    }
    return ["", ""];
  }
  // An effect tile's subtitle is its first setting and value, like "Rib width 44px".
  function fxFact(id) { const p = FXI[id].p.find((q) => q.k); if (!p) return FXI[id].cat; const v = S.fx[id][p.k]; return `${p.label} ${p.fmt ? p.fmt(v) : v}`; }
  const slotColors = () => (gen() === "contours" ? (S.gradient || S.mode === "layers" || S.mids.length ? [S.bg, S.line, ...S.mids, S.line2] : [S.bg, S.line]) : S.grad.colors);
  // The build column is built once and patched in place, so selection, text and colors can transition.
  let slotKey = "";
  const SLOT_DEFS = [["preset", "Preset"], ["generator", "Generator"], ["shape", "Shape"], ["lines", "Lines"], ["colors", "Colors"]];
  const slotEls = {};
  const slotList = $("slotList");
  for (const [id, label] of SLOT_DEFS) {
    const wrap = document.createElement("div");
    wrap.className = "slot";
    wrap.innerHTML = `<div class="slot-label">${label}</div><button class="tile" data-slot="${id}"><span class="tile-th" data-th="${id}">${id === "colors" ? `<span class="tile-sw"></span>` : ""}</span><span class="tile-text"><b></b><small></small></span>${ic("next", "go")}</button>`;
    slotList.appendChild(wrap); slotEls[id] = wrap;
  }
  const fxSlot = document.createElement("div");
  fxSlot.className = "slot";
  fxSlot.innerHTML = `<div class="slot-label">Effects<span class="count" hidden></span></div><div class="fx-tiles" id="fxTiles"><button class="tile add" data-slot="addfx"><span class="tile-plus">${ic("plus")}</span><span class="tile-text"><b>Add effect</b><small></small></span></button></div>`;
  slotList.appendChild(fxSlot);
  const fxTiles = fxSlot.querySelector(".fx-tiles"), addTile = fxSlot.querySelector(".tile.add"), countEl = fxSlot.querySelector(".count");
  const motionSlot = document.createElement("div");
  motionSlot.className = "slot";
  motionSlot.innerHTML = `<div class="slot-label">Motion</div><button class="tile" data-slot="motion"><span class="tile-th" data-th="motion"></span><span class="tile-text"><b></b><small></small></span>${ic("next", "go")}</button>`;
  slotList.appendChild(motionSlot);
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const animOK = () => !reduceMotion.matches && !document.body.classList.contains("boot");
  // Text that changes fades in rather than snapping.
  function setText(el, v) { if (el.textContent === v) return; el.textContent = v; if (animOK()) el.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 200 + Math.random() * 90, easing: EASE }); }
  function fxTile(id) {
    const t = document.createElement("div");
    t.className = "tile fx"; t.dataset.fx = id;
    t.innerHTML = `<span class="grip" title="Drag to reorder" aria-label="Drag to reorder ${FXI[id].name}">${ic("grip")}</span><button class="tile-main" data-slot="fx:${id}"><span class="tile-th" data-th="fx:${id}"></span><span class="tile-text"><b>${FXI[id].name}</b><small></small></span></button><button class="ib xs" data-remove="${id}" aria-label="Remove ${FXI[id].name}" title="Remove">${ic("x")}</button>`;
    return t;
  }
  function renderSlots() {
    const key = JSON.stringify([gen(), S.fxOrder, P.slot, ...SLOT_DEFS.map(([id]) => slotInfo(id)), slotColors(), S.motion, S.fxOrder.map(fxFact)]);
    if (key === slotKey) return;
    slotKey = key;
    const tiles = () => [...slotList.querySelectorAll(".tile")];
    const keyOf = (n) => (n.dataset.fx ? "fx:" + n.dataset.fx : n.dataset.slot);
    const before = new Map(tiles().map((n) => [keyOf(n), n.getBoundingClientRect().top]));
    for (const [id] of SLOT_DEFS) {
      const wrap = slotEls[id], t = wrap.querySelector(".tile"), [title, sub] = slotInfo(id);
      const show = !slotWhen[id] || slotWhen[id]();
      if (wrap.hidden === show) wrap.hidden = !show; // folds open and closed in CSS
      t.classList.toggle("on", P.slot === id);
      setText(t.querySelector("b"), title); setText(t.querySelector("small"), sub);
    }
    // Color tile: same number of colors eases each one; a new count rebuilds the strip.
    const sw = slotEls.colors.querySelector(".tile-sw"), cols = slotColors();
    if (sw.children.length === cols.length) [...sw.children].forEach((i, n) => (i.style.background = cols[n]));
    else sw.innerHTML = cols.map((c) => `<i style="background:${c}"></i>`).join("");
    // Effects: keep existing tiles, add new ones, let removed ones collapse out.
    const have = new Map([...fxTiles.querySelectorAll("[data-fx]")].filter((n) => !n.classList.contains("leaving")).map((n) => [n.dataset.fx, n]));
    const fresh = new Set();
    for (const id of S.fxOrder) { let t = have.get(id); if (!t) { t = fxTile(id); fresh.add(id); } fxTiles.insertBefore(t, addTile); t.classList.toggle("on", P.slot === "fx:" + id); have.delete(id); }
    for (const t of have.values()) {
      if (!animOK()) { t.remove(); continue; }
      t.classList.add("leaving");
      fxTiles.appendChild(t);
      t.style.position = "absolute"; t.style.width = fxTiles.clientWidth + "px"; t.style.top = (before.get("fx:" + t.dataset.fx) - fxTiles.getBoundingClientRect().top) + "px";
      t.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.95)" }], { duration: 200, easing: EASE }).onfinish = () => t.remove();
    }
    addTile.classList.toggle("on", P.slot === "addfx");
    { const t = motionSlot.querySelector(".tile"), m = S.motion; t.classList.toggle("on", P.slot === "motion"); setText(t.querySelector("b"), MOTION_NAME[m.type]); setText(t.querySelector("small"), m.type === "still" ? "No motion" : `${m.dur}s, ${{ loop: "looping", pingpong: "ping-pong", once: "once" }[m.mode]}`); }
    setText(addTile.querySelector("small"), S.fxOrder.length ? `${S.fxOrder.length} applied` : "None applied");
    for (const t of fxTiles.querySelectorAll("[data-fx]")) setText(t.querySelector("small"), fxFact(t.dataset.fx));
    const n = String(S.fxOrder.length);
    countEl.hidden = !S.fxOrder.length;
    if (countEl.textContent !== n) { countEl.textContent = n; if (animOK()) countEl.animate([{ transform: "scale(.4)" }, { transform: "scale(1.15)" }, { transform: "none" }], { duration: 320, easing: EASE }); }
    // FLIP: tiles that moved glide to their new place; new ones grow in.
    if (animOK()) for (const t of tiles()) {
      if (t.classList.contains("leaving") || t.offsetParent === null) continue;
      const k = keyOf(t), top = before.get(k), now = t.getBoundingClientRect().top;
      if (fresh.has(t.dataset.fx)) t.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 250 + Math.random() * 90, easing: EASE });
      else if (top != null && Math.abs(top - now) > 1 && !t.classList.contains("dragging")) t.animate([{ transform: `translateY(${top - now}px)` }, { transform: "none" }], { duration: 260 + Math.random() * 90, easing: EASE });
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
      if (idx !== cur) { S.fxOrder.splice(cur, 1); S.fxOrder.splice(idx, 0, id); renderSlots(); update({ instant: true, commit: false }); }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); $("slotList").querySelector(".dragging")?.classList.remove("dragging"); commit(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });

  const PANEL_TITLE = { preset: "Preset", generator: "Generator", shape: "Shape", lines: "Lines", colors: "Colors", addfx: "Add effect", motion: "Motion" };
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
    else if (p === "motion") {
      // A new motion: a moving type, then its sliders, playback, direction and easing.
      if (S.motion.type === "still" || Math.random() < 0.6) S.motion.type = pick(["drift", "flow", "breathe"].filter((x) => x !== S.motion.type));
      randomizeGroup("motion");
      S.motion.mode = pick(["loop", "loop", "pingpong"]); S.motion.ease = pick(["linear", "ease", "inout", "linear"]);
      if (P.safe) safeFix();
      update(); if (playing) playT0 = performance.now(); else startPlay();
      return;
    }
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
  // One color model for both kinds of generator: contours have a background plus inks (lines, any middle
  // colors, blend); gradients have their color stops. Palettes resample to however many colors you have.
  const PER_PAGE = 6;
  const sameCols = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
  const inksOf = (st = S) => (st.source === "contours" ? [st.line, ...(st.mids || []), st.line2] : st.grad.colors);
  function setInks(arr) {
    if (gen() === "contours") { S.line = arr[0]; S.line2 = arr[arr.length - 1]; S.mids = arr.slice(1, -1); }
    else setGradColors(arr);
  }
  const toLab = (h) => { const [l, c, hh] = toOklch(h); return [l, c * Math.cos((hh * Math.PI) / 180), c * Math.sin((hh * Math.PI) / 180)]; };
  const fromLab = ([l, a, b]) => fromOklch(l, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360);
  // n colors from a list: evenly picked when there are enough, otherwise blended between neighbours in OKLab.
  function sampleN(list, n) {
    if (list.length === n) return list.slice();
    if (n === 1) return [list[0]];
    if (list.length > n) return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]);
    const labs = list.map(toLab);
    return Array.from({ length: n }, (_, i) => {
      const f = (i * (labs.length - 1)) / (n - 1), k = Math.min(labs.length - 2, Math.floor(f)), t = f - k;
      return i === 0 ? list[0] : i === n - 1 ? list[list.length - 1] : fromLab(labs[k].map((v, j) => v + (labs[k + 1][j] - v) * t));
    });
  }
  // A palette fitted to the current design: { bg, inks } for contours, { inks } for gradients.
  function fitPal(p, n = inksOf().length) {
    if (gen() !== "contours") return { inks: sampleN(p.colors, n) };
    const roles = p.roles || rolesOf(p.colors), bg = roles[2];
    if (n === 2) return { bg, inks: [roles[0], roles[1]] };
    const d = (h) => Math.abs(lum(h) - lum(bg));
    const rest = [...new Set(p.colors.filter((c) => c !== bg))].sort((a, b) => d(b) - d(a));
    if (!rest.includes(roles[0])) rest.unshift(roles[0]);
    return { bg, inks: sampleN(rest, n) };
  }
  const palMatches = (p) => { const f = fitPal(p); return sameCols(f.inks, inksOf()) && (!f.bg || f.bg === S.bg); };
  const currentPal = () => PALS.find(palMatches);
  function applyPal(p) {
    const f = fitPal(p);
    if (f.bg) { S.bg = f.bg; S.transparent = false; }
    setInks(f.inks);
  }
  // Harmonies grown from the strongest color in play, plus the closest library palettes.
  function suggestions() {
    const cols = gen() === "contours" ? [S.bg, ...inksOf()] : inksOf();
    const lch = cols.map(toOklch), [, C0, H] = lch.reduce((a, b) => (b[1] > a[1] ? b : a));
    const C = Math.max(C0, 0.05), mk = (rows) => rows.map(([l, c, h]) => fromOklch(l, c, (h + 360) % 360));
    const out = [
      ["Tonal", mk([[0.24, C * 0.6, H], [0.42, C, H], [0.62, C, H], [0.8, C * 0.6, H], [0.95, C * 0.2, H]])],
      ["Analogous", mk([[0.26, C * 0.8, H - 40], [0.46, C, H - 20], [0.64, C, H], [0.78, C * 0.9, H + 20], [0.93, C * 0.4, H + 40]])],
      ["Opposite", mk([[0.24, C * 0.7, H], [0.5, C, H], [0.66, C, H + 180], [0.84, C * 0.6, H + 180], [0.95, C * 0.15, H + 90]])],
      ["Triad", mk([[0.22, C * 0.4, H], [0.55, C, H], [0.68, C, H + 120], [0.76, C, H + 240], [0.96, C * 0.15, H]])],
      ["Muted", mk([[0.22, C * 0.25, H], [0.42, C * 0.35, H + 10], [0.62, C * 0.4, H - 10], [0.8, C * 0.3, H], [0.94, C * 0.1, H]])],
    ].map(([name, colors]) => ({ name, colors, group: "Suggested" }));
    const mine = cols.map(toLab), dist = (p) => p.colors.map(toLab).reduce((a, x) => a + Math.min(...mine.map((y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]))), 0) / p.colors.length;
    for (const p of PALS.filter((p) => !palMatches(p)).sort((a, b) => dist(a) - dist(b)).slice(0, 1)) out.push({ ...p, group: "Suggested" });
    return out;
  }
  const palEl = $("palettes");
  // Palettes saved in the palette tool get their own tab.
  const savedPals = () => (window.Palettes?.saved() || []).map((p) => ({ name: p.name, colors: p.colors, group: "Saved" }));
  const tabs = () => ["Suggested", ...PAL_GROUPS.map(([g]) => g), ...(savedPals().length ? ["Saved"] : [])];
  function renderTabs() { $("palTabs").innerHTML = tabs().map((g) => `<button data-v="${g}">${g}</button>`).join(""); if (!tabs().includes(P.palTab)) P.palTab = "Curated"; palKey = ""; }
  addEventListener("palettes-saved", () => { renderTabs(); if (panelOf(P.slot) === "colors") renderPalettes(); });
  P.palTab ||= "Curated"; P.palPage ||= 0;
  let sugList = [];
  const palList = () => (P.palTab === "Suggested" ? sugList : P.palTab === "Saved" ? savedPals() : PALS.filter((p) => p.group === P.palTab));
  const pageCount = () => Math.max(1, Math.ceil(palList().length / PER_PAGE));
  let palKey = "", shown = [];
  renderTabs();
  function renderPalettes(dir = 0) {
    const page = clamp(P.palPage, 0, pageCount() - 1), contours = gen() === "contours";
    const key = JSON.stringify([P.palTab, page, contours, inksOf().length, P.palTab === "Suggested" ? sugList.map((p) => p.colors) : 0]);
    if (key !== palKey) {
      palKey = key;
      shown = palList().slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      palEl.innerHTML = shown.map((p, i) => {
        const f = fitPal(p);
        const sw = contours ? `<span class="pal-sw" style="background:${f.bg}">${f.inks.map((c) => `<i style="background:${c}"></i>`).join("")}</span>` : `<span class="pal-bar" style="background:linear-gradient(90deg,${f.inks.join(",")})"></span>`;
        return `<button class="pal" data-i="${i}">${sw}<span>${p.name}</span></button>`;
      }).join("");
      if (dir) { palEl.classList.remove("from-l", "from-r"); void palEl.offsetWidth; palEl.classList.add(dir > 0 ? "from-r" : "from-l"); }
    }
    [...palEl.children].forEach((b, i) => b.classList.toggle("on", !!shown[i] && palMatches(shown[i])));
    $("palDots").innerHTML = Array.from({ length: pageCount() }, (_, i) => `<i class="${i === page ? "on" : ""}"></i>`).join("");
    $("palPrev").disabled = page <= 0; $("palNext").disabled = page >= pageCount() - 1;
    $("palDots").parentElement.style.visibility = pageCount() > 1 ? "" : "hidden";
    for (const b of $("palTabs").children) b.classList.toggle("on", b.dataset.v === P.palTab);
  }
  palEl.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; applyPal(shown[+b.dataset.i]); update(); };
  const turnPage = (d) => { const n = clamp(P.palPage + d, 0, pageCount() - 1); if (n === P.palPage) return; P.palPage = n; savePrefs(); renderPalettes(d); };
  $("palPrev").onclick = () => turnPage(-1);
  $("palNext").onclick = () => turnPage(1);
  $("palTabs").onclick = (e) => {
    const b = e.target.closest("[data-v]"); if (!b || b.dataset.v === P.palTab) return;
    const d = tabs().indexOf(b.dataset.v) > tabs().indexOf(P.palTab) ? 1 : -1;
    if (b.dataset.v === "Suggested") sugList = suggestions();
    P.palTab = b.dataset.v; P.palPage = 0; savePrefs(); renderPalettes(d);
  };
  // Opening Colors shows the page holding the palette in use, and fresh suggestions.
  function revealPalette() {
    renderTabs();
    sugList = suggestions();
    const p = currentPal(); if (!p) return;
    P.palTab = p.group; P.palPage = Math.floor(palList().indexOf(p) / PER_PAGE);
  }

  function setGradColors(cols) {
    S.grad.colors = cols.slice(0, 8);
    while (S.grad.points.length < S.grad.colors.length) S.grad.points.push({ x: +rnd(0.1, 0.9).toFixed(3), y: +rnd(0.1, 0.9).toFixed(3) });
    S.grad.points = S.grad.points.slice(0, S.grad.colors.length);
  }
  // Your colors: a background circle (contours) and a circle per ink or stop. Circles update in place
  // when only their colors change, so they ease to the new color; adding or removing rebuilds the row.
  const MAX_INKS = () => (gen() === "contours" ? 6 : 8);
  function renderMine() {
    const el = $("mine"), contours = gen() === "contours", inks = inksOf();
    const shape = JSON.stringify([contours, inks.length, MAX_INKS()]);
    const blendOff = contours && inks.length === 2 && !S.gradient && S.mode !== "layers";
    if (el.dataset.shape === shape) {
      if (contours) el.querySelector('[data-k="bg"] .sw').style.background = S.bg;
      el.querySelectorAll("[data-ink]").forEach((it) => { const i = +it.dataset.ink; it.querySelector(".sw").style.background = inks[i]; it.classList.toggle("on", gen() === "mesh" && sel === i); it.classList.toggle("off", blendOff && i === 1); });
      el.querySelector('[data-k="bg"]')?.classList.toggle("off", S.transparent);
    } else {
      const before = el.dataset.shape ? el.querySelectorAll("[data-ink]").length : inks.length;
      el.dataset.shape = shape;
      // Two labeled groups: the background on its own, then the inks (or stops) in order, which you
      // can drag to reorder.
      let html = contours ? `<div class="mine-grp mine-bg"><div class="stop bgc" data-k="bg"><button class="sw" style="background:${S.bg}" aria-label="Background color"></button></div><span class="mine-l">Background</span></div><span class="mine-sep"></span>` : "";
      html += `<div class="mine-grp mine-main"><div class="mine-inks">` + inks.map((c, i) => `<div class="stop${i >= before ? " fresh" : ""}" data-ink="${i}"><button class="sw" style="background:${c}" aria-label="Edit color ${i + 1}" title="Click to edit, drag to reorder"></button>${inks.length > 2 ? `<button class="x" aria-label="Remove color ${i + 1}">${ic("x")}</button>` : ""}</div>`).join("");
      if (inks.length < MAX_INKS()) html += `<button class="stop-add" title="Add color" aria-label="Add color">${ic("plus")}</button>`;
      html += `</div><span class="mine-l">${contours ? "Lines, first to last" : "Color stops"}</span></div>`;
      el.innerHTML = html;
      renderMine();
    }
    fitMine();
    $("stopCount").textContent = contours ? `${inks.length} ${inks.length === 1 ? "color" : "colors"} + background` : `${inks.length} of 8`;
  }
  // When the row runs out of room the circles slide together and overlap. Only when even a deep overlap
  // can't fit them do they wrap onto another line.
  const SW = 40, GAP = 8, MAX_OV = 24;
  function fitMine() {
    const row = $("mine").querySelector(".mine-inks"); if (!row) return;
    const n = row.children.length, avail = row.parentElement.clientWidth;
    if (!avail) return;
    const need = n * SW + (n - 1) * GAP, ov = n > 1 ? Math.max(0, (need - avail) / (n - 1)) : 0;
    row.classList.toggle("wrap", ov > MAX_OV);
    row.style.setProperty("--ov", (ov > MAX_OV ? 0 : Math.ceil(ov)) + "px");
    row.classList.toggle("tight", ov > 0 && ov <= MAX_OV);
  }
  new ResizeObserver(fitMine).observe($("mine"));
  // Drag to reorder: the circle follows the pointer and the others step aside into its old place.
  let mineDrag = null, mineDragged = false;
  $("mine").addEventListener("pointerdown", (e) => {
    const sw = e.target.closest("[data-ink] > .sw"); if (!sw || e.button) return;
    const stops = [...$("mine").querySelectorAll("[data-ink]")];
    mineDrag = { el: sw.parentElement, from: +sw.parentElement.dataset.ink, x0: e.clientX, y0: e.clientY, stops, rects: stops.map((s) => s.getBoundingClientRect()), on: false, to: +sw.parentElement.dataset.ink, id: e.pointerId };
  });
  addEventListener("pointermove", (e) => {
    const d = mineDrag; if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.on) { if (Math.hypot(dx, dy) < 5) return; d.on = true; picker.close(); d.el.classList.add("dragging"); $("mine").classList.add("sorting"); d.el.setPointerCapture?.(e.pointerId); }
    d.el.style.translate = `${dx}px ${dy}px`;
    const c = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    let to = 0, best = Infinity;
    d.rects.forEach((r, k) => { const [cx, cy] = c(r), dist = Math.hypot(e.clientX - cx, (e.clientY - cy) * 1.6); if (dist < best) { best = dist; to = k; } });
    d.to = to;
    d.stops.forEach((s, k) => {
      if (k === d.from) return;
      const shift = d.from < to ? (k > d.from && k <= to ? -1 : 0) : (k < d.from && k >= to ? 1 : 0);
      const r = d.rects[k + shift] || d.rects[k];
      s.style.translate = shift ? `${r.left - d.rects[k].left}px ${r.top - d.rects[k].top}px` : "";
    });
  });
  const endMineDrag = (e) => {
    const d = mineDrag; if (!d || e.pointerId !== d.id) return;
    mineDrag = null;
    if (!d.on) return;
    mineDragged = true; setTimeout(() => (mineDragged = false), 0);
    const r = d.rects[d.to], r0 = d.rects[d.from];
    // Settle into the new slot, then rebuild in the new order.
    d.el.classList.remove("dragging"); d.el.classList.add("settling");
    d.el.style.translate = `${r.left - r0.left}px ${r.top - r0.top}px`;
    setTimeout(() => {
      $("mine").classList.remove("sorting");
      for (const s of d.stops) { s.style.translate = ""; s.classList.remove("settling"); }
      if (d.to === d.from) return;
      const a = inksOf().slice(), [c] = a.splice(d.from, 1); a.splice(d.to, 0, c);
      if (gen() === "contours") setInks(a); else S.grad.colors = a;
      $("mine").dataset.shape = ""; renderMine(); update();
    }, root_reduce() ? 0 : 220);
  };
  const root_reduce = () => !!window.UI?.reduce.matches;
  addEventListener("pointerup", endMineDrag);
  addEventListener("pointercancel", endMineDrag);
  $("mine").addEventListener("click", (e) => {
    if (mineDragged) return;
    const bg = e.target.closest('[data-k="bg"] .sw');
    if (bg) return picker.open(bg, S.bg, (v) => { S.bg = v; S.transparent = false; bg.style.background = v; update({ instant: true }); }, () => commit(), swatchesFor(S.bg));
    const x = e.target.closest(".x");
    if (x) { picker.close(); const i = +x.closest("[data-ink]").dataset.ink; if (gen() === "contours") { const a = inksOf(); a.splice(i, 1); setInks(a); } else { S.grad.colors.splice(i, 1); S.grad.points.splice(i, 1); } sel = null; update(); return; }
    if (e.target.closest(".stop-add")) {
      const a = inksOf();
      if (gen() === "contours") {
        // A new ink lands between the last two, or beside the first when they match.
        const [p, q] = a.slice(-2), mid = p === q ? variants(a[0])[2] : sampleN([p, q], 3)[1];
        a.splice(a.length - 1, 0, mid); setInks(a); update();
      }
      else addStop(rnd(0.15, 0.85), rnd(0.15, 0.85), variants(a[a.length - 1])[2]);
      return;
    }
    const sw = e.target.closest("[data-ink] .sw");
    if (sw) { const i = +sw.parentElement.dataset.ink; picker.open(sw, inksOf()[i], (v) => { const a = inksOf(); a[i] = v; setInks(a); sw.style.background = v; update({ instant: true }); }, () => commit(), swatchesFor(inksOf()[i])); }
  });
  // The palette tool opens with these colors, background first, and its "Use" button brings them back.
  $("toPalettes").onclick = () => { window.Palettes?.load(gen() === "contours" ? [S.bg, ...inksOf()] : inksOf(), "studio"); window.Shell?.go("palettes"); };
  function roleRow(host, roles) {
    const el = $(host);
    el.innerHTML = roles.map(([key, label]) => `<div class="role" data-k="${key}"><button class="sw lg" aria-label="${label} color"></button><span>${label}</span></div>`).join("");
    for (const [key] of roles) {
      const sw = el.querySelector(`[data-k="${key}"] .sw`);
      sw.onclick = () => picker.open(sw, S[key], (v) => { S[key] = v; sw.style.background = v; update({ instant: true }); }, () => commit(), swatchesFor(S[key]));
    }
    syncers.push(() => { for (const [key] of roles) el.querySelector(`[data-k="${key}"] .sw`).style.background = S[key]; });
  }
  roleRow("inks", [["ink", "Ink"], ["paper", "Paper"]]);
  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  makeSlider($("color"), { group: "color", label: "Opacity", ...k("opacity"), pct: true, min: 0.05, max: 1, step: 0.01, fmt: pct, rand: [0.5, 1], hard: [0, 1] });
  function randomPalette() { applyPal(pick(PALS.filter((p) => !palMatches(p)))); }
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
    if (SEEDED.has(id)) fxSliders[id].push(makeSlider(body, { group: "fx-" + id, label: "Seed", min: 0, max: 9999, step: 1, fmt: (v) => (v ? String(v) : "Design"), rand: [1, 9999], get: () => e().seed || 0, set: (v) => (e().seed = v) }));
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
    const combos = [["glass", "grain"], ["mesh"], ["lens", "grain"], ["blur", "grain"], ["halftone"], ["riso"], ["linescreen"], ["emboss"], ["gradmap", "grain"], ["bloom", "vignette"], ["wave", "chroma", "scan"], ["voronoi"], ["dither"], ["pixel"], ["chrome"], ["cmyk", "paper"], ["water"], ["bulge", "grain"], ["heatmap"], ["rays", "grain"], ["ripple"], ["paper", "grain"]];
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
    f.ripple.amp = Math.min(f.ripple.amp, 30); f.water.amount = Math.min(f.water.amount, 2); f.rays.intensity = Math.min(f.rays.intensity, 2); f.cmyk.size = Math.max(f.cmyk.size, 5); f.bulge.amount = clamp(f.bulge.amount, -0.8, 0.85);
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
  // Surprise: half the time a whole preset; otherwise the shape and lines of one preset, a random palette
  // and the effects of another (or none). Then a variation on top, so repeats still differ.
  const NO_FX = {};
  function surprise() {
    const others = PRESETS.filter((p) => !lookMatches(p[2]));
    const a = pick(others)[2];
    if (Math.random() < 0.5) { applyLook(a); if (Math.random() < 0.25) randomPalette(); }
    else {
      applyLook(a, ["shape", "style"]);
      randomPalette();
      const r = Math.random();
      if (r < 0.25) applyLook(NO_FX, ["effects"]);
      else if (r < 0.6) applyLook(pick(others.filter((p) => p[2].fx))[2], ["effects"]);
      else randomEffects();
    }
    variation();
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

  // ---------- next step ----------
  // Each panel ends with a way on to the next layer; the last step opens Export.
  const STEP_ORDER = () => ["preset", "generator", "shape", ...(gen() === "contours" ? ["lines"] : []), "colors", "addfx", "motion"];
  function nextOf(slot) {
    const p = panelOf(slot) === "effect" ? "addfx" : slot, order = STEP_ORDER(), i = order.indexOf(p);
    return i < 0 || i === order.length - 1 ? "export" : order[i + 1];
  }
  $("nextBtn").onclick = () => { const n = nextOf(P.slot); if (n === "export") { closeMenus(); $("exportBtn").click(); } else setSlot(n); };
  function syncNext() {
    const n = nextOf(P.slot);
    setText($("nextKicker"), n === "export" ? "Finish" : "Continue");
    setText($("nextLbl"), n === "export" ? "Export" : PANEL_TITLE[n]);
    setText($("nextSub"), n === "addfx" || n === "motion" ? "Optional" : "");
  }

  // ---------- motion ----------
  // Every motion loops: drift moves the field round a circle, flow slides the contour levels (or sways a
  // gradient's colors) by whole steps, breathe morphs the shape round a loop that never reverses.
  const MOTION_NAME = { still: "Still", drift: "Drift", flow: "Flow", breathe: "Breathe" };
  const MOTION_HINT = { still: "Pick a motion to make a loop.", drift: "The pattern glides round in a loop.", flow: "Lines flow outward and gradient colors sway.", breathe: "The shape keeps morphing and flows back into itself." };
  // Time shaping: ping-pong runs forward then back, reverse flips direction, and the easing curve
  // (a preset or your own cubic bezier) sets the pace inside each pass.
  const EASES = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], in: [0.42, 0, 1, 1], out: [0, 0, 0.58, 1], inout: [0.42, 0, 0.58, 1] };
  function bezier(x, [x1, y1, x2, y2]) {
    const B = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (B(t, x1, x2) < x) lo = t; else hi = t; }
    return B(t, y1, y2);
  }
  function motionT(raw, m = S.motion) {
    let u = m.mode === "pingpong" ? 1 - Math.abs(1 - 2 * raw) : raw;
    u = bezier(u, m.ease === "custom" ? m.bez : EASES[m.ease] || EASES.linear);
    return m.dir < 0 ? 1 - u : u;
  }
  const seedFrac = (n) => (n ? (n * 0.6180339887) % 1 : 0);
  function motionState(st, t) {
    const m = st.motion;
    if (!m || m.type === "still") return st;
    const off = seedFrac(m.seed), o = { ...st, _t: (t + off) % 1 }, tw = 2 * Math.PI * t, a = m.amt, a0 = off * 2 * Math.PI;
    if (st.source === "contours") {
      if (m.type === "drift") { const R = a * st.scale * 0.5; o.driftX = R * Math.cos(tw + a0); o.driftY = R * Math.sin(tw + a0); }
      // Cycling inks need a whole cycle of steps per loop, or the colors would jump at the seam.
      else if (m.type === "flow") { const cyc = st.mids?.length && !st.gradient && st.mode !== "layers" ? st.mids.length + 2 : 1; o.phase = t * cyc * Math.max(1, Math.round(a * 4)); }
      // Breathe zooms gently and lets the warp swell a little; changing the warp hard would rebuild the shape every frame.
      // Breathe reads the warp from points travelling round a loop, so the shape morphs forward the
      // whole time and only meets its first frame again at the end, with a slow swell on top.
      else { const w = Math.sin(tw + a0); o.loopX = 1.4 * a * Math.cos(tw + a0); o.loopY = 1.4 * a * Math.sin(tw + a0); o.warp = Math.max(st.warp, 0.6 * a) * (1 + 0.15 * a * w); o.scale = st.scale * (1 + 0.04 * a * w); }
    }
    return o;
  }
  makeSeg($("motionType"), () => S.motion.type, (v) => { S.motion.type = v; if (v === "still") stopPlay(); });
  const moving = () => S.motion.type !== "still";
  [
    { label: "Loop length", ...bindKey(() => S.motion, "dur"), min: 1, max: 30, step: 0.5, fmt: (v) => v + "s", rand: [4, 10], when: moving },
    { label: "Amplitude", ...bindKey(() => S.motion, "amt"), min: 0.05, max: 1, step: 0.01, fmt: f2, rand: [0.3, 0.7], when: moving },
    { label: "Seed", ...bindKey(() => S.motion, "seed"), min: 0, max: 9999, step: 1, fmt: (v) => (v ? String(v) : "Off"), rand: [1, 9999], when: moving },
  ].forEach((c) => makeSlider($("motionCtrls"), { group: "motion", ...c }));
  makeSeg($("motionMode"), () => S.motion.mode, (v) => (S.motion.mode = v));
  makeSeg($("motionDir"), () => S.motion.dir, (v) => (S.motion.dir = v));
  makeSeg($("motionEase"), () => S.motion.ease, (v) => (S.motion.ease = v));
  // Custom easing: drag the two handles of the cubic bezier.
  const bz = $("bezier");
  function drawBezier() {
    const [x1, y1, x2, y2] = S.motion.ease === "custom" ? S.motion.bez : EASES[S.motion.ease] || EASES.linear;
    const X = (v) => 12 + v * 136, Y = (v) => 108 - v * 96;
    bz.innerHTML = `<rect x="12" y="12" width="136" height="96" rx="6" class="bz-box"/><path d="M${X(0)} ${Y(0)}L${X(x1)} ${Y(y1)}M${X(1)} ${Y(1)}L${X(x2)} ${Y(y2)}" class="bz-arm"/><path d="M${X(0)} ${Y(0)}C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}" class="bz-curve"/><circle cx="${X(x1)}" cy="${Y(y1)}" r="6" class="bz-h" data-h="0"/><circle cx="${X(x2)}" cy="${Y(y2)}" r="6" class="bz-h" data-h="1"/>`;
    $("bezVals").textContent = `cubic-bezier(${[x1, y1, x2, y2].map((v) => +v.toFixed(2)).join(", ")})`;
  }
  bz.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".bz-h"); if (!h) return;
    e.preventDefault();
    if (S.motion.ease !== "custom") { S.motion.bez = (EASES[S.motion.ease] || EASES.linear).slice(); S.motion.ease = "custom"; }
    const k = +h.dataset.h, move = (ev) => {
      const r = bz.getBoundingClientRect(), x = clamp((((ev.clientX - r.left) / r.width) * 160 - 12) / 136, 0, 1), y = clamp((108 - ((ev.clientY - r.top) / r.height) * 120) / 96, -0.5, 1.5);
      S.motion.bez[k * 2] = +x.toFixed(3); S.motion.bez[k * 2 + 1] = +y.toFixed(3); drawBezier(); syncUI();
    };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); update({ instant: true }); };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  });
  syncers.push(() => { $("motionMore").hidden = !moving(); if (moving()) drawBezier(); });
  makeSeg($("vidSize"), () => S.vid.size, (v) => (S.vid.size = v));
  makeSeg($("vidFps"), () => S.vid.fps, (v) => (S.vid.fps = v));
  makeSeg($("vidLoops"), () => S.vid.loops, (v) => (S.vid.loops = v));
  makeSeg($("gifSize"), () => S.gif.size, (v) => (S.gif.size = v));
  makeSeg($("gifFps"), () => S.gif.fps, (v) => (S.gif.fps = v));
  makeSeg($("gifLoops"), () => S.vid.loops, (v) => (S.vid.loops = v));
  let playing = false, playRaf = 0, playT0 = 0, playBusy = false, playSlow = false;
  function playFrame(now) {
    if (!playing) return;
    playRaf = requestAnimationFrame(playFrame);
    if (playBusy) return;
    playBusy = true;
    const raw = (((now - playT0) / 1000) % S.motion.dur) / S.motion.dur, t0 = performance.now();
    // Full detail while it keeps up; a lighter grid only when frames get slow.
    paint(motionState(S, motionT(raw)), playSlow && S.source === "contours").then(() => { const ms = performance.now() - t0; playSlow = ms > 110; playBusy = false; watchPerf(now); });
  }
  function startPlay() { perfTimes = []; lowRes = false; startPlay0(); }
  function startPlay0() { if (S.motion.type === "still") { S.motion.type = "drift"; update(); } playing = true; playT0 = performance.now(); cancelAnimationFrame(playRaf); playRaf = requestAnimationFrame(playFrame); syncPlay(); }
  // Slow playback: after a few seconds under about 18 frames a second, offer to drop the expensive
  // parts (effects and motion). Raster frames also render smaller while it's slow.
  let perfTimes = [], perfWarned = false;
  function watchPerf(now) {
    perfTimes.push(now); if (perfTimes.length > 40) perfTimes.shift();
    if (perfWarned || perfTimes.length < 40 || now - playT0 < 3000) return;
    const fps = 1000 / ((perfTimes[perfTimes.length - 1] - perfTimes[0]) / (perfTimes.length - 1));
    lowRes = fps < 24;
    if (fps < 18) { perfWarned = true; $("perfNote").hidden = false; $("perfFx").hidden = !S.fxOrder.length; }
  }
  $("perfFx").onclick = () => { S.fxOrder = []; $("perfNote").hidden = true; update(); toast("Effects removed. Undo brings them back."); };
  $("perfStop").onclick = () => { stopPlay(); S.motion.type = "still"; $("perfNote").hidden = true; update(); };
  $("perfX").onclick = () => { $("perfNote").hidden = true; };
  function stopPlay() { if (!playing) return; playing = false; cancelAnimationFrame(playRaf); syncPlay(); render(); }
  function syncPlay() {
    for (const b of [$("playBtn"), $("barPlay")]) b.querySelector("use").setAttribute("href", playing ? "#i-pause" : "#i-play");
    $("playBtn").querySelector("span").textContent = playing ? "Pause" : "Play";
    $("barPlay").title = playing ? "Pause motion" : "Play motion";
    $("barPlay").hidden = S.motion.type === "still";
  }
  $("playBtn").onclick = $("barPlay").onclick = () => (playing ? stopPlay() : startPlay());

  // Video export renders every frame at an exact timestamp. Browsers with WebCodecs get an H.264 MP4;
  // others record a WebM in real time.
  // Draws frame i of an animation into a canvas of the export size, at an exact point in the loop.
  function framer(W, H, frames, fps) {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = W; frameCanvas.height = H;
    const fctx = frameCanvas.getContext("2d", { willReadFrequently: true });
    async function drawFrame(i) {
      const st = motionState(S, motionT(S.motion.mode === "once" ? Math.min(1, i / Math.max(1, frames - 1)) : (i / fps / S.motion.dur) % 1));
      if (isRaster(st) && FXR) {
        const image = st.source === "contours" ? await rasterize(rasterCanvas, T.buildSVG(st, { w: W, h: H }).svg, W, H) : null;
        FXR.render(job(st, W, H, image));
        fctx.clearRect(0, 0, W, H); fctx.drawImage(fxCanvas, 0, 0, W, H);
      } else await rasterize(frameCanvas, T.buildSVG(st, { w: W, h: H }).svg, W, H);
      return fctx;
    }
    return { frameCanvas, drawFrame };
  }
  // GIF: a palette chosen from a few frames spread across the loop, then every frame indexed and
  // compressed in turn. Delays are in hundredths of a second, spread so the loop keeps its length.
  async function exportGif() {
    if (exporting) return;
    if (S.motion.type === "still") { S.motion.type = "drift"; update(); }
    stopPlay();
    const [W, H] = gifDims(), fps = S.gif.fps, frames = Math.round(S.motion.dur * S.vid.loops * fps);
    const job0 = { cancel: false }; exporting = job0;
    setProg("Choosing colors", 0); $("exCancel").hidden = false; $("download").disabled = true;
    const { drawFrame } = framer(W, H, frames, fps);
    const pixels = async (i) => (await drawFrame(i)).getImageData(0, 0, W, H).data;
    try {
      const samples = [];
      for (let k = 0; k < 5 && !job0.cancel; k++) samples.push(await pixels(Math.floor((k * frames) / 5)));
      const gif = new window.GifEncoder(W, H, samples, { dither: isRaster(S) });
      let t = 0;
      for (let i = 0; i < frames && !job0.cancel; i++) {
        const next = Math.round(((i + 1) * 100) / fps), delay = Math.max(2, next - t); t = next;
        gif.add(await pixels(i), delay);
        setProg(`Frame ${i + 1} of ${frames}`, 0.05 + ((i + 1) / frames) * 0.9);
        if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
      }
      if (job0.cancel) toast("Export cancelled");
      else { setProg("Saving", 1); await download(gif.finish(), `${fileName()}.gif`, "GIF saved"); }
    } catch (e) {
      toast("Couldn't make the GIF. Try a smaller size.");
    } finally {
      exporting = null;
      hideProg(); $("exCancel").hidden = true; $("download").disabled = false;
      render();
    }
  }
  let exporting = null;
  const canMp4 = () => typeof window.VideoEncoder === "function" && window.Mp4Muxer;
  async function exportVideo() {
    if (exporting) return;
    if (S.motion.type === "still") { S.motion.type = "drift"; update(); }
    stopPlay();
    const [W, H] = vidDims(), fps = S.vid.fps, frames = Math.round(S.motion.dur * S.vid.loops * fps);
    const job0 = { cancel: false }; exporting = job0;
    setProg("Preparing", 0); $("exCancel").hidden = false; $("download").disabled = true;
    const { frameCanvas, drawFrame: draw } = framer(W, H, frames, fps);
    const drawFrame = async (i) => { await draw(i); setProg(`Frame ${i + 1} of ${frames}`, ((i + 1) / frames) * 0.96); };
    try {
      let blob;
      if (canMp4()) {
        // H.264 first (plays everywhere, Figma included), then VP9 in MP4 where H.264 encoding is missing.
        const base = { width: W, height: H, bitrate: Math.round(W * H * fps * 0.12), framerate: fps };
        let pick = null;
        for (const [codec, mux] of [["avc1.640033", "avc"], ["avc1.4d0033", "avc"], ["vp09.00.40.08", "vp9"]]) {
          try { if ((await VideoEncoder.isConfigSupported({ ...base, codec })).supported) { pick = [codec, mux]; break; } } catch (e) {}
        }
        if (!pick) throw new Error("no encoder");
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: pick[1], width: W, height: H, frameRate: fps }, fastStart: "in-memory" });
        let failed = null;
        const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failed = e) });
        enc.configure({ ...base, codec: pick[0] });
        for (let i = 0; i < frames; i++) {
          if (job0.cancel || failed) break;
          await drawFrame(i);
          const vf = new VideoFrame(frameCanvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
          enc.encode(vf, { keyFrame: i % (fps * 2) === 0 });
          vf.close();
          while (enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 5));
        }
        if (failed) throw failed;
        if (!job0.cancel) { setProg("Finishing the file", 0.98); await enc.flush(); muxer.finalize(); blob = new Blob([muxer.target.buffer], { type: "video/mp4" }); }
        enc.close();
      } else {
        const stream = frameCanvas.captureStream(0), track = stream.getVideoTracks()[0], chunks = [];
        const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm", videoBitsPerSecond: 12e6 });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        const done = new Promise((r) => (rec.onstop = r));
        rec.start();
        let next = performance.now();
        for (let i = 0; i < frames && !job0.cancel; i++) {
          await drawFrame(i); track.requestFrame();
          next += 1000 / fps; await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
        }
        setProg("Finishing the file", 0.98); rec.stop(); await done;
        if (!job0.cancel) blob = new Blob(chunks, { type: "video/webm" });
      }
      if (blob) { setProg("Saving", 1); await download(blob, `${fileName()}.${blob.type === "video/mp4" ? "mp4" : "webm"}`, "Video saved"); }
      else if (job0.cancel) toast("Export cancelled");
    } catch (e) {
      toast("This browser couldn't encode the video. Try a smaller size.");
    } finally {
      exporting = null;
      hideProg(); $("exCancel").hidden = true; $("download").disabled = false;
      render();
    }
  }
  $("exCancel").onclick = () => exporting && (exporting.cancel = true);

  // ---------- canvas overlay ----------
  const art = $("art"), artSvg = $("artSvg"), fxCanvas = $("fx"), ov = $("ov"), wrap = $("wrap");
  const handleList = (st = S) => (st.source === "gradient" ? (st.grad.type === "mesh" ? st.grad.points : null) : st.usePoints && st.showPoints ? st.points : null);
  function drawOverlay(st = S) {
    ov.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    const grad = st.source === "gradient", list = handleList(st);
    ov.classList.toggle("off", !list);
    if (!list) { ov.innerHTML = ""; return; }
    const u = S.w / Math.max(1, art.clientWidth), ns = 'vector-effect="non-scaling-stroke"', ACCENT = accentNow();
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
  // The size control drives whichever tool is open: the studio canvas, or the page in the Components
  // builder, which also offers a size that follows the window.
  const studioSize = { get: () => [S.w, S.h], set: (w, h) => { S.w = w; S.h = h; update(); } };
  const sizer = () => (window.Shell?.route === "components" && window.Components?.sizer) || studioSize;
  for (const key of ["w", "h"]) {
    $(key).onchange = (e) => { const [w, h] = sizer().get(), v = clampDim(e.target.value); sizer().set(key === "w" ? v : w, key === "h" ? v : h); syncSize(); };
    $(key).onkeydown = (e) => { if (e.key === "Enter") e.target.blur(); };
  }
  $("swap").onclick = () => { const [w, h] = sizer().get(); sizer().set(h, w); syncSize(); };
  const sizeMenu = $("sizeMenu");
  sizeMenu.innerHTML = `<button class="opt fit-opt" data-fit><span>Fit the window</span><span class="mono">Auto</span></button>` + SIZES.map(([grp, list]) => `<h3>${grp}</h3>` + list.map(([n, w, h]) => `<button class="opt" data-w="${w}" data-h="${h}"><span>${n}</span><span class="mono">${w}×${h}</span></button>`).join("")).join("");
  sizeMenu.onclick = (e) => { const b = e.target.closest(".opt"); if (!b) return; if (b.hasAttribute("data-fit")) sizer().fit?.(); else sizer().set(+b.dataset.w, +b.dataset.h); closeMenus(); syncSize(); };
  const presetName = (w, h) => { if (sizer().fitting?.()) return "Fit"; for (const [, list] of SIZES) for (const [n, pw, ph] of list) if (pw === w && ph === h) return n; return "Custom"; };
  function syncSize() {
    const [w, h] = sizer().get();
    // Where the browser can size a field to its content, CSS does it; otherwise measure the digits.
    for (const [key, v] of [["w", w], ["h", h]]) { const el = $(key); if (document.activeElement !== el) el.value = v; if (!fieldSizing) el.style.width = Math.max(24, measure(String(v))) + 8 + "px"; }
    $("sizeName").textContent = presetName(w, h);
    sizeMenu.querySelector(".fit-opt").hidden = !sizer().fit;
  }
  window.syncSize = syncSize;

  // ---------- menus + modals ----------
  const menus = { sizeBtn: sizeMenu, exportBtn: $("exportMenu"), settingsBtn: $("settingsMenu") };
  function closeMenus() { Object.values(menus).forEach((m) => (m.hidden = true)); }
  for (const [btn, menu] of Object.entries(menus)) {
    $(btn).onclick = (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      if (open && menu === sizeMenu) { const [w, h] = sizer().get(), fitting = !!sizer().fitting?.(); for (const o of sizeMenu.querySelectorAll(".opt")) o.classList.toggle("on", o.hasAttribute("data-fit") ? fitting : !fitting && +o.dataset.w === w && +o.dataset.h === h); }
      if (open && menu.id === "exportMenu") refreshExport();
    };
  }
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".menu-wrap")) closeMenus(); });
  const openModal = (id) => { $(id).hidden = false; $(id).querySelector("button.primary")?.focus(); };
  const closeModal = (id) => ($(id).hidden = true);
  for (const m of document.querySelectorAll(".modal")) m.addEventListener("pointerdown", (e) => { if (e.target === m) m.hidden = true; });

  // ---------- theme + accent ----------
  const ACCENTS = ["#e8572a", "#3557d6", "#6d4ce0", "#2f7d5b", "#d6457a", "#c08a2b"];
  P.theme ||= "system"; P.accent ||= ACCENTS[0];
  function applyTheme() {
    const r = document.documentElement;
    if (P.theme === "system") delete r.dataset.theme; else r.dataset.theme = P.theme;
    r.style.setProperty("--accent", P.accent);
    r.style.setProperty("--on-accent", window.Color.contrast(P.accent, "#ffffff") < 2.6 ? "#1c1c1e" : "#ffffff");
    window.TopoBrand?.favicon(P.accent);
    for (const b of $("theme").children) b.classList.toggle("on", b.dataset.v === P.theme);
    for (const b of $("accents").querySelectorAll("[data-c]")) b.classList.toggle("on", b.dataset.c === P.accent);
    $("accents").querySelector(".custom").classList.toggle("on", !ACCENTS.includes(P.accent));
    $("accents").querySelector(".custom").style.setProperty("--c", P.accent);
    if (painted) drawOverlay();
    window.dispatchEvent(new Event("theme-change"));
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => window.dispatchEvent(new Event("theme-change")));
  $("accents").innerHTML = ACCENTS.map((c) => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="Accent ${c}"></button>`).join("") + `<button class="sw custom" aria-label="Custom accent"></button>`;
  $("accents").onclick = (e) => {
    const b = e.target.closest("[data-c]");
    if (b) { P.accent = b.dataset.c; savePrefs(); window.UI ? UI.swap(applyTheme) : applyTheme(); return; }
    const c = e.target.closest(".custom");
    if (c) picker.open(c, P.accent, (v) => { P.accent = v; applyTheme(); }, () => savePrefs(), [["Palette", inPlay()]]);
  };
  $("theme").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; P.theme = b.dataset.v; savePrefs(); window.UI ? UI.swap(applyTheme) : applyTheme(); };

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
  // Feedback becomes a GitHub issue: the form fills in a new-issue page, which the person posts with
  // their own account, so the site needs no server or token.
  const ISSUES = "https://github.com/masterclaudecoder/isoline/issues/new";
  const FB_KIND = { bug: ["Bug", "bug"], idea: ["Idea", "enhancement"], other: ["Feedback", "feedback"] };
  let fbKind = "bug";
  const pageInfo = () => {
    const route = window.Shell?.route || "home", ua = (["Edg", "Firefox", "Chrome", "Version"].map((n) => navigator.userAgent.match(new RegExp(n + "/[\\d.]+"))?.[0]).find(Boolean) || "unknown browser").replace("Version", "Safari");
    const rows = [["Page", route], ["Browser", ua], ["Window", `${innerWidth}×${innerHeight}`], ["Theme", document.documentElement.dataset.theme || "auto"]];
    if (route === "studio") rows.push(["Design", window.Studio.describe()]);
    if (route === "components") rows.push(["Kit", window.Components.summary?.() || ""]);
    return rows;
  };
  const syncFb = () => { $("fbOk").disabled = !$("fbSubject").value.trim() && !$("fbText").value.trim(); };
  $("feedbackBtn").onclick = () => {
    closeMenus(); openModal("feedbackModal");
    const r = pageInfo(); $("fbInfoSum").textContent = `${r[0][1][0].toUpperCase() + r[0][1].slice(1)}, ${r[1][1]}, ${r[2][1]}`;
    syncFb(); $("fbSubject").focus();
  };
  $("fbKind").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; fbKind = b.dataset.v; for (const x of $("fbKind").querySelectorAll("button")) x.classList.toggle("on", x === b); $("fbText").placeholder = { bug: "What happened, and what did you expect?", idea: "What would you like to do?", other: "Tell us anything" }[fbKind]; };
  $("fbSubject").oninput = syncFb;
  $("fbText").oninput = (e) => { syncFb(); window.UI?.autosize(e.target); };
  $("fbCancel").onclick = () => closeModal("feedbackModal");
  // With an endpoint (worker/feedback.js) the issue is created directly; without one, or if it fails,
  // the person finishes on GitHub.
  const FEEDBACK_URL = "";
  $("fbOk").onclick = async () => {
    const [name, label] = FB_KIND[fbKind], text = $("fbText").value.trim(), subj = $("fbSubject").value.trim() || text.split("\n")[0].slice(0, 80);
    const details = $("fbInfo").checked ? pageInfo().map(([k, v]) => `- **${k}:** ${v}`).join("\n") : "";
    const done = (msg) => { closeModal("feedbackModal"); $("fbSubject").value = $("fbText").value = ""; $("fbOk").disabled = true; toast(msg); };
    if (FEEDBACK_URL) {
      $("fbOk").disabled = true; $("fbOk").lastChild.textContent = "Sending";
      try {
        const r = await fetch(FEEDBACK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: fbKind, title: $("fbSubject").value.trim(), body: text, details, website: $("fbHp").value }) });
        if (r.ok) { $("fbOk").lastChild.textContent = "Send"; return done("Sent. Thanks for the feedback."); }
      } catch (e) {}
      $("fbOk").lastChild.textContent = "Send"; $("fbOk").disabled = false;
      toast("Couldn't send it here. Opening GitHub instead.");
    }
    let body = text || "_No details given._";
    if (details) body += "\n\n<details><summary>Page details</summary>\n\n" + details + "\n</details>";
    window.open(`${ISSUES}?title=${encodeURIComponent(`${name}: ${subj}`)}&labels=${label}&body=${encodeURIComponent(body.slice(0, 6000))}`, "_blank", "noopener");
    done("Thanks. Post it on the GitHub page that opened.");
  };
  if (FEEDBACK_URL) { $("fbOk").lastChild.textContent = "Send"; $("fbOk").querySelector("svg").remove(); $("feedbackModal").querySelector(".note").textContent = "Goes straight to the team as a GitHub issue."; }
  // ---------- version ----------
  // The deploy stamps the build and its date in here; the site also publishes version.json so an open
  // or cached copy can tell when a newer build is live.
  const VERSION = "1.6", BUILD = "__BUILD__", BUILT = "__DATE__", stamped = !BUILD.startsWith("__");
  $("verLine").textContent = `Version ${VERSION}${stamped ? `, build ${BUILD} from ${BUILT}` : ", local copy"}`;
  $("verReload").onclick = () => location.reload();
  let updateSeen = false;
  const checkVersion = () => { if (!stamped || updateSeen || location.protocol === "file:") return; fetch("version.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((v) => { if (v?.build && v.build !== BUILD) { updateSeen = true; $("verLine").textContent = `Version ${VERSION}, a newer build is out`; $("verReload").hidden = false; toast("A new version of Isoline is out. Reload to get it."); } }).catch(() => {}); };
  checkVersion();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkVersion(); });
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
  const exportFmt = () => (S.fmt === "video" || S.fmt === "gif" ? S.fmt : isRaster(S) ? "png" : S.fmt);
  const animFmt = (f) => f === "video" || f === "gif";
  // Progress: every export reports what it is doing and how far along it is.
  function setProg(label, f) {
    $("exProg").hidden = false;
    $("exProg").querySelector("i").style.width = Math.round(f * 100) + "%";
    $("exProgLbl").textContent = label; $("exProgPct").textContent = Math.round(f * 100) + "%";
  }
  const hideProg = () => { $("exProg").hidden = true; $("exProg").querySelector("i").style.width = "0"; };
  const step = (on, label, f) => { on?.(label, f); return new Promise((r) => requestAnimationFrame(() => r())); };
  async function svgPng(scale, on) {
    await step(on, "Drawing the pattern", 0.15);
    const sc = Math.min(scale, 16000 / Math.max(S.w, S.h)), c = document.createElement("canvas");
    await rasterize(c, current.svg, Math.round(S.w * sc), Math.round(S.h * sc));
    await step(on, "Compressing the PNG", 0.6);
    const b = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!b) throw new Error("png");
    return b;
  }
  async function rasterPng(scale, on) {
    if (!FXR) throw new Error("no webgl");
    const sc = Math.min(scale, FXR.maxSize / Math.max(S.w, S.h)), w = Math.round(S.w * sc), h = Math.round(S.h * sc);
    await step(on, "Drawing the pattern", 0.1);
    const image = S.source === "contours" ? await rasterize(rasterCanvas, current.svg, w, h) : null;
    await step(on, S.fxOrder.length ? `Applying ${S.fxOrder.length === 1 ? "the effect" : S.fxOrder.length + " effects"}` : "Rendering", 0.35);
    FXR.render(job(S, w, h, image));
    await step(on, "Compressing the PNG", 0.65);
    const blob = await new Promise((r) => fxCanvas.toBlob(r, "image/png"));
    render(false);
    return blob;
  }
  const pngBlob = (scale, on) => (isRaster(S) ? rasterPng(scale, on) : svgPng(scale, on));
  let pngCache = null, exportTok = 0;
  const gifDims = () => { const sc = Math.min(S.gif.size / Math.min(S.w, S.h), 1600 / Math.max(S.w, S.h)); return [Math.round(S.w * sc), Math.round(S.h * sc)]; };
  const vidDims = () => { const even = (v) => Math.max(2, Math.round(v / 2) * 2), sc = Math.min(S.vid.size / Math.min(S.w, S.h), 3840 / Math.max(S.w, S.h)); return [even(S.w * sc), even(S.h * sc)]; };
  function refreshExport() {
    const raster = isRaster(S), fmt = exportFmt();
    exportTok++;
    for (const b of $("fmt").children) { b.classList.toggle("on", b.dataset.v === fmt); b.disabled = raster && b.dataset.v === "svg"; }
    $("rasterNote").hidden = !raster || animFmt(fmt);
    for (const b of $("pngScale").children) b.classList.toggle("on", +b.dataset.v === S.pngScale);
    $("pngScale").hidden = fmt !== "png";
    $("vidOpts").hidden = fmt !== "video";
    $("gifOpts").hidden = fmt !== "gif";
    $("vidNote").hidden = !animFmt(fmt) || S.motion.type !== "still";
    $("copy").hidden = animFmt(fmt);
    $("copyLbl").textContent = raster ? "Copy PNG" : "Copy SVG";
    $("dlLbl").textContent = fmt === "video" ? (canMp4() ? "Export MP4" : "Export WebM") : fmt === "gif" ? "Export GIF" : "Download";
    if (!$("fname").dataset.edited) $("fname").value = autoName();
    let dims = fmt === "png" ? `${S.w * S.pngScale} × ${S.h * S.pngScale}` : `${S.w} × ${S.h}`;
    const facts = (rows) => ($("facts").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(""));
    if (fmt === "video") {
      const [W, H] = vidDims(), secs = S.motion.dur * S.vid.loops, mb = (W * H * S.vid.fps * 0.12 * secs) / 8 / 1048576;
      facts([["Dimensions", `${W} × ${H}`], ["Length", `${secs}s, ${Math.round(secs * S.vid.fps)} frames`], ["File size", `About ${mb < 1 ? mb.toFixed(1) : Math.round(mb)} MB`]]);
      return;
    }
    if (fmt === "gif") {
      const [W, H] = gifDims(), secs = S.motion.dur * S.vid.loops, n = Math.round(secs * S.gif.fps), mb = (W * H * n * 0.32) / 1048576;
      facts([["Dimensions", `${W} × ${H}`], ["Length", `${secs}s, ${n} frames`], ["File size", `About ${mb < 1 ? mb.toFixed(1) : Math.round(mb)} MB`]]);
      return;
    }
    if (fmt === "svg") { facts([["Dimensions", dims], ["File size", fmtBytes(new Blob([current.svg]).size)]]); return; }
    facts([["Dimensions", dims], ["File size", "Measuring"]]);
    const tok = ++exportTok, key = JSON.stringify(S);
    pngBlob(S.pngScale).then((b) => { if (tok !== exportTok) return; pngCache = { key, blob: b }; facts([["Dimensions", dims], ["File size", fmtBytes(b.size)]]); }).catch(() => facts([["Dimensions", dims], ["File size", "Unknown"]]));
  }
  $("fname").oninput = (e) => { e.target.dataset.edited = e.target.value ? "1" : ""; };
  $("fmt").onclick = (e) => { const b = e.target.closest("button"); if (b && !b.disabled) { S.fmt = b.dataset.v; save(); refreshExport(); } };
  $("pngScale").onclick = (e) => { const v = e.target.closest("button")?.dataset.v; if (v) { S.pngScale = +v; save(); refreshExport(); } };
  for (const id of ["vidSize", "vidFps", "vidLoops", "gifSize", "gifFps", "gifLoops"]) $(id).addEventListener("click", () => setTimeout(refreshExport));
  const fileName = () => ($("fname").value.trim() || autoName()).replace(/\.(svg|png|mp4|webm|gif)$/i, "");
  $("download").onclick = async () => {
    const fmt = exportFmt();
    if (fmt === "video") return exportVideo();
    if (fmt === "gif") return exportGif();
    if (fmt === "svg") { setProg("Saving", 1); await download(new Blob([current.svg], { type: "image/svg+xml" }), fileName() + ".svg", "SVG saved"); setTimeout(hideProg, 600); return; }
    $("download").disabled = true;
    try {
      const blob = pngCache?.key === JSON.stringify(S) ? (setProg("Ready", 0.9), pngCache.blob) : await pngBlob(S.pngScale, setProg);
      setProg("Saving", 1);
      await download(blob, fileName() + ".png", "PNG saved");
    } catch (e) { toast("Couldn't make the PNG. Try a smaller scale."); }
    $("download").disabled = false; setTimeout(hideProg, 600);
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
  const SLOT_KEYS = ["preset", "generator", "shape", "lines", "colors", "addfx", "motion"];
  document.addEventListener("keydown", (e) => {
    const typing = !!e.target.matches?.("input:not([type=range]):not([type=checkbox]), textarea");
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape") { picker.close(); closeMenus(); for (const m of document.querySelectorAll(".modal")) m.hidden = true; if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    if (document.querySelector(".modal:not([hidden])")) return;
    if (window.Shell && window.Shell.route !== "studio") return;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (typing || mod || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "r") { e.preventDefault(); if (e.shiftKey) surprise(); else { variation(); update({ fade: true }); } }
    else if (key === "c") copyOut();
    else if (key === "e") $("exportBtn").click();
    else if (/^[1-7]$/.test(key)) { const s = SLOT_KEYS[+key - 1]; if (s !== "lines" || gen() === "contours") setSlot(s); }
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
  const job = (st, w, h, image) => ({ w, h, k: w / st.w, seed: st.seed, image, grad: st.source === "gradient" ? st.grad : null, fx: st.fx, order: st.fxOrder, ink: st.ink, paper: st.paper, time: st._t || 0, motion: st._t != null ? st.motion.type : "still", motionAmt: st.motion?.amt });
  // While a resize handle is held the scale stays put, so the edge tracks the pointer.
  let rzScale = 0, lowRes = false;
  const room = () => { const cs = getComputedStyle(wrap); return [wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)]; };
  window.UI?.resizable(art, {
    get: () => [S.w, S.h], scale: () => art.clientWidth / S.w, room, min: 64, max: () => (P.unlock ? 16000 : 8000),
    start() { rzScale = art.clientWidth / S.w; picker.close?.(); },
    set(w, h) { S.w = w; S.h = h; update({ draft: true, commit: false }); },
    end() { rzScale = 0; update(); },
  });
  function fit() {
    const cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const sc = rzScale || Math.min(aw / S.w, ah / S.h);
    art.style.width = Math.max(40, S.w * sc) + "px";
    art.style.height = Math.max(40, S.h * sc) + "px";
  }
  function previewDims(st) {
    const dpr = lowRes && playing ? 1 : Math.min(2, window.devicePixelRatio || 1);
    let w = Math.max(64, Math.round(art.clientWidth * dpr)), h = Math.round((w * st.h) / st.w);
    const cap = lowRes && playing ? 1200 : 2200, m = Math.max(w, h);
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
  // Shape previews: strokes in the design's own colors, so the pattern reads without the fills.
  const strokes = (st) => (st.source === "contours" ? readable({ ...st, gradient: false, mode: "lines", transparent: false, opacity: 1, swell: 0, taper: 0, indexEvery: 0 }) : st);
  // Stroke modes need ink that stands off the paper; layered looks often share them.
  const hexDist = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const readable = (st) => (st.mode !== "layers" && /^#[0-9a-f]{12}$/i.test(st.line + st.bg.slice(1)) && hexDist(st.line, st.bg) < 60 ? { ...st, line: st.line2, line2: st.line } : st);
  const lightLines = (st) => ({ ...st, gap: Math.max(st.gap, st.w / 18), levels: Math.min(st.levels, 12), weight: Math.max(st.weight, 2.4) });
  function schedulePreviews(delay = 260) { clearTimeout(previewT); previewT = setTimeout(buildPreviews, delay); }
  // Effect previews need a base image: the finished design (to preview adding one more effect),
  // or the design before any effects (so each effect tile shows the stack up to that step).
  async function effectBase(W, H, final = true) {
    baseCanvas.width = W; baseCanvas.height = H;
    const x = baseCanvas.getContext("2d");
    if (final && current.raster) {
      const sw = fxCanvas.width, sh = Math.min(fxCanvas.height, sw * 0.625);
      x.drawImage(fxCanvas, 0, (fxCanvas.height - sh) / 2, sw, sh, 0, 0, W, H);
    } else if (S.source === "gradient") {
      TFX.render(job({ ...noFx(S), h: Math.round(S.w * 0.625) }, W, H, null));
      x.drawImage(thumbCanvas, 0, 0, W, H);
    } else await rasterize(baseCanvas, T.buildSVG({ ...S, h: Math.round(S.w * 0.625) }, { w: W, h: H, res: 2.5 }).svg, W, H);
  }
  const fxThumb = (id, W, H) => { TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: { [id]: { ...S.fx[id], on: true } }, order: [id], ink: S.ink, paper: S.paper }); return thumbCanvas; };
  const fxUpTo = (id, W, H) => { TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: S.fx, order: S.fxOrder.slice(0, S.fxOrder.indexOf(id) + 1), ink: S.ink, paper: S.paper }); return thumbCanvas; };
  // The generator tile shows the bare generator: default shape settings, the design's colors, no effects.
  function baseOf(st) {
    const b = clone(noFx(st));
    for (const key of LAYERS.shape) if (key !== "source" && key !== "grad.type" && key !== "pattern") setPath(b, key, clone(getPath(DEFAULTS, key)));
    b.seed = st.seed; b.usePoints = false;
    return b;
  }
  function buildPreviews() {
    if (drag) return;
    const jobs = [];
    // Slot tile thumbnails first: they're always on screen.
    const tileJob = (key, st) => jobs.push(async () => { const el = $("slotList").querySelector(`[data-th="${key}"]`); if (!el) return; await thumb(el, st, 64); });
    // The build column reads as layers: the bare generator, then the tuned shape, then line style,
    // then each effect stacked on what came before; the preset tile shows the finished result.
    tileJob("preset", S);
    tileJob("generator", lightLines(strokes(baseOf(S))));
    tileJob("shape", lightLines(strokes(noFx(S))));
    if (gen() === "contours") tileJob("lines", lightLines(noFx(S)));
    jobs.push(motionThumb);
    if (TFX && S.fxOrder.length) jobs.push(async () => {
      await effectBase(128, 80, false);
      for (const id of S.fxOrder) { const el = $("slotList").querySelector(`[data-th="fx:${id}"]`); if (!el) continue; putCanvas(el, fxUpTo(id, 128, 80), 128, 80); }
    });
    const p = panelOf(P.slot);
    if (p === "preset") for (const pc of presetCards) { if (!pc.done && !pc.el.hidden) jobs.push(async () => { await thumb(slotOf(pc.el), resolveLook(pc.look), 220); pc.done = true; }); }
    if (p === "generator") for (const [id] of GENS) jobs.push(() => { let st = clone(noFx(S)); if (id === "contours") st = asContours(st); else { st.source = "gradient"; st.grad.type = id; } return thumb(slotOf(genCards[id]), lightLines(st), 200); });
    if (p === "shape") {
      if (gen() === "contours") for (const pt of T.PATTERNS) jobs.push(() => thumb(slotOf(patCards[pt.id]), lightLines(strokes({ ...noFx(S), pattern: pt.id })), 130));
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

  // Motion tile: the finished design playing its loop, like every other tile shows its layer. A short
  // run of small frames is rendered once per change and cycled; a still design shows as a still.
  const thumbSVG = (s, w, h) => { const z = 2, W = w * z, H = h * z; return T.buildSVG(s, { w: W, h: H, res: 2.5 * z, minLen: 8 }).svg.replace(/^<svg([^>]*?) width="\d+" height="\d+" viewBox="[^"]*"/, `<svg$1 width="${w}" height="${h}" viewBox="${(W - w) / 2} ${(H - h) / 2} ${w} ${h}"`); };
  let motionKey = "", motionTok = 0;
  async function motionThumb() {
    const el = $("slotList").querySelector('[data-th="motion"]'); if (!el) return;
    const key = JSON.stringify(S);
    if (key === motionKey && el.children.length) return;
    motionKey = key;
    const tok = ++motionTok;
    if (S.motion.type === "still" || reduceMotion.matches) { await thumb(el, S, 64); return; }
    const N = 24, w = 64, h = 40, W = 128, H = 80, frames = [];
    for (let k = 0; k < N; k++) {
      const st = { ...motionState(S, motionT(k / N)), h: Math.round(S.w * 0.625) };
      const f = document.createElement("canvas"); f.width = W; f.height = H;
      if (!isRaster(st) || !TFX) await rasterize(f, thumbSVG(st, w, h), W, H);
      else {
        const image = st.source === "contours" ? await rasterize(thumbRaster, T.buildSVG(st, { w: W, h: H, res: 2.5 }).svg, W, H) : null;
        TFX.render(job(st, W, H, image)); f.getContext("2d").drawImage(thumbCanvas, 0, 0);
      }
      frames.push(f);
      if (tok !== motionTok) return;
      await new Promise((r) => setTimeout(r, 0));
    }
    const view = document.createElement("canvas"); view.width = W; view.height = H;
    const x = view.getContext("2d"), L = Math.min(4, Math.max(1.6, S.motion.dur)) * 1000;
    let last = -1;
    const tick = (now) => {
      if (tok !== motionTok || !view.isConnected) return;
      requestAnimationFrame(tick);
      if (document.body.dataset.route !== "studio") return;
      const i = Math.floor(((now % L) / L) * N);
      if (i !== last) { last = i; x.drawImage(frames[i], 0, 0); }
    };
    x.drawImage(frames[0], 0, 0);
    swapIn(el, view);
    requestAnimationFrame(tick);
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
    const show = narrow.matches && !en.isIntersecting && document.body.dataset.route === "studio";
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
  const fieldSizing = CSS.supports?.("field-sizing", "content");
  const measure = (text) => { mirror.style.fontSize = getComputedStyle($("w")).fontSize; mirror.textContent = text; return Math.ceil(mirror.getBoundingClientRect().width); };
  let stopsKey = "", bodyFor = null, shownSlot = null;
  // Opening a panel: the title and sections rise in, and cards follow in a short stagger.
  const jitter = (el) => { el.style.setProperty("--y", (5 + Math.random() * 7).toFixed(1) + "px"); el.style.setProperty("--d", (0.85 + Math.random() * 0.35).toFixed(2)); el.style.setProperty("--jit", Math.round(Math.random() * 45) + "ms"); el.style.setProperty("--s", (0.985 + Math.random() * 0.015).toFixed(3)); };
  function enterPanel(sec) {
    if (!sec || reduceMotion.matches) return;
    for (const el of [$("optHead"), sec]) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
    [...sec.children].forEach((c, i) => { c.style.setProperty("--i", Math.min(i, 8)); jitter(c); });
    for (const grid of sec.querySelectorAll(".cards, .palettes, .suggest")) [...grid.children].filter((c) => !c.hidden).forEach((c, i) => { c.style.setProperty("--j", Math.min(i, 14)); jitter(c); });
  }
  function syncUI() {
    const g = gen();
    if (P.slot === "lines" && g !== "contours") P.slot = "shape";
    if (P.slot.startsWith("fx:") && !S.fxOrder.includes(fxOf())) P.slot = "addfx";
    const panel = panelOf(P.slot);
    for (const s of document.querySelectorAll(".panel-sec")) s.hidden = s.dataset.panel !== panel;
    if (P.slot !== shownSlot) { shownSlot = P.slot; enterPanel(document.querySelector(`.panel-sec[data-panel="${panel}"]`)); }
    for (const s of document.querySelectorAll("[data-gen]")) s.hidden = s.dataset.gen === "raster" ? g === "contours" : s.dataset.gen !== g;
    for (const sec of document.querySelectorAll(".panel-sec")) { for (const c of sec.children) c.classList.remove("lead"); [...sec.children].find((c) => !c.hidden)?.classList.add("lead"); }
    const fid = fxOf();
    $("optTitle").textContent = fid ? FXI[fid].name : swapping && panel === "addfx" ? `Swap ${FXI[swapping].name}` : PANEL_TITLE[panel];
    optDice.title = optDice.ariaLabel = panel === "preset" ? "Surprise me" : `Randomize ${$("optTitle").textContent.toLowerCase()}`;
    if (fid !== bodyFor) { $("fxBodyHost").innerHTML = ""; if (fid) $("fxBodyHost").appendChild(fxBodies[fid]); bodyFor = fid; }
    if (fid) $("fxLede").innerHTML = `<span>${FXI[fid].cat}</span><span>Step ${S.fxOrder.indexOf(fid) + 1} of ${S.fxOrder.length}</span>`;
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
    if (panel === "colors") { renderPalettes(); renderMine(); }
    $("inkSec").hidden = !S.fxOrder.some((id) => ["halftone", "linescreen", "ascii", "dither"].includes(id) && S.fx[id].mono);
    $("gradient").checked = S.gradient || S.mode === "layers";
    $("gradient").disabled = S.mode === "layers";
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    $("showPoints").innerHTML = ic(S.showPoints ? "eye" : "eyeoff");
    $("seed").value = S.seed;
    $("ptHint").textContent = selPoint() ? "Double-click to flip into a dip. Delete removes." : "Double-click the canvas to add a peak. Drag to move, scroll to resize.";
    $("gradHint").hidden = g !== "mesh";
    renderSlots();
    if (window.Shell?.route !== "components") syncSize();
    $("safe").checked = P.safe; $("unlock").checked = P.unlock;
    $("motionHint").textContent = MOTION_HINT[S.motion.type];
    syncNext();
    syncPlay();
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
  // A hidden studio has no size: skip it, or the preview would re-render at the 64px minimum.
  new ResizeObserver(() => { if (!wrap.clientWidth || !wrap.clientHeight) return; const key = wrap.clientWidth + "x" + wrap.clientHeight; if (painted && key !== lastWrap) { lastWrap = key; render(); } }).observe(wrap);

  window.TopoBrand?.mount($("brand"), "isoline");
  applyTheme();
  // First visit opens on a curated preset rather than an empty default.
  let firstVisit = true;
  try { firstVisit = !localStorage.getItem(STORE); } catch (e) {}
  if (firstVisit) applyLook(PRESETS.find((p) => p[1] === "Prism")[2]);
  update({ commit: false });
  setTimeout(() => document.body.classList.remove("boot"), 900);

  // ---------- links to the shell and the palette tool ----------
  window.toastMsg = toast;
  window.downloadBlob = download;
  window.Studio = {
    // A palette from the palette tool: its lightest color becomes the background for contours and the rest
    // become inks, strongest contrast first; gradients take the colors as they are.
    usePalette(hexes) {
      if (gen() === "contours") {
        const byLum = hexes.slice().sort((a, b) => lum(b) - lum(a)), bg = byLum[0];
        const inks = hexes.filter((h) => h !== bg).sort((a, b) => Math.abs(lum(b) - lum(bg)) - Math.abs(lum(a) - lum(bg))).slice(0, 6);
        S.bg = bg; S.transparent = false; setInks(inks.length > 1 ? inks : [inks[0] || "#111111", inks[0] || "#111111"]);
      } else setGradColors(hexes);
      P.slot = "colors";
      update({ fade: true });
    },
    // The current design cropped to fill w x h, like object-fit: cover.
    // Rendered fresh at the requested size, so it stays sharp whatever the studio canvas last drew.
    async snapshot(w, h) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"), sc = Math.max(w / S.w, h / S.h), dw = Math.round(S.w * sc), dh = Math.round(S.h * sc);
      let src;
      if (isRaster(S) && TFX) {
        const image = S.source === "contours" ? await rasterize(document.createElement("canvas"), T.buildSVG(S, { w: dw, h: dh }).svg, dw, dh) : null;
        TFX.render(job(S, dw, dh, image)); src = thumbCanvas;
      } else src = await rasterize(document.createElement("canvas"), current.svg || T.buildSVG(S).svg, dw, dh);
      x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return c;
    },
    onShow() { lastWrap = ""; fit(); render(); },
    // A contour drawing from default settings plus overrides, as SVG markup. The Components kit uses it
    // for its map pictures, colored with the kit's own tokens.
    contour(over = {}, w = 800, h = 500) { const st = withDefaults({ ...clone(DEFAULTS), fxOrder: [], ...over }); return T.buildSVG({ ...st, w, h }, { w, h }).svg; },
    // For agents and scripts: read and change the design, and get its exports.
    state: () => clone(S),
    apply(partial) { S = withDefaults({ ...clone(S), ...partial, grad: { ...S.grad, ...(partial?.grad || {}) }, fx: { ...S.fx, ...(partial?.fx || {}) } }); sel = null; update({ fade: true }); return clone(S); },
    presets: () => PRESETS.map(([group, name]) => ({ group, name })),
    usePreset(name) { const p = PRESETS.find((x) => x[1].toLowerCase() === String(name).toLowerCase()); if (!p) return false; applyLook(p[2]); update({ fade: true }); return true; },
    variation() { variation(); update({ fade: true }); },
    surprise,
    svg: () => current.svg,
    png: (scale = 1) => pngBlob(scale),
    generators: () => GENS.map(([id, name, what]) => ({ id, name, what })),
    effects: () => FXC.map(([id, name, cat, d]) => ({ id, name, category: cat, defaults: d })),
    describe() {
      const g = gen(), cols = gen() === "contours" ? [S.bg, ...inksOf()] : inksOf();
      const named = cols.map((c) => `${c} (${window.Color.name(c)})`).join(", ");
      const fx = S.fxOrder.map((id) => `${FXI[id].name} (${fxFact(id)})`).join(", ") || "none";
      return `${S.w} by ${S.h}px. ${GEN_LABEL[g]} generator${g === "contours" ? `, ${patLabel(S.pattern)} pattern drawn as ${S.mode}` : g === "noise" ? `, ${NOISE_LABEL[S.grad.noise]} noise` : ""}. Colors: ${named}. Effects: ${fx}. Motion: ${S.motion.type === "still" ? "none" : `${S.motion.type}, ${S.motion.dur}s ${S.motion.mode}`}.`;
    },
  };
})();
