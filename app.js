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

  const FONT_SEG = { seg: "font", label: "Font", options: [["geist", "Geist Mono"], ["ui", "Interface"], ["mono", "System mono"]] };
  const FXC = [
    ["liquify", "Liquify", "Distort", { amount: 0.5, scale: 220 }, [{ k: "amount", label: "Amount", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.9] }, { k: "scale", label: "Size", min: 20, max: 1200, step: 5, log: true, fmt: px, rand: [120, 500] }]],
    ["wave", "Waves", "Distort", { amp: 14, length: 220, angle: 0 }, [{ k: "amp", label: "Amplitude", min: 0, max: 160, step: 0.5, fmt: px, rand: [6, 30] }, { k: "length", label: "Wavelength", min: 10, max: 1200, step: 5, log: true, fmt: px, rand: [120, 400] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }]],
    ["smear", "Smear", "Distort", { length: 140, angle: 0, band: 6, amount: 0.6, jitter: 0.7, threshold: 0 }, [{ k: "length", label: "Length", min: 4, max: 600, step: 1, log: true, fmt: px, rand: [60, 260] }, { k: "angle", label: "Angle", min: 0, max: 360, step: 1, fmt: deg, rand: [0, 360] }, { k: "band", label: "Strip", min: 1, max: 80, step: 0.5, log: true, fmt: px, rand: [2, 14] }, { k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.9] }, { k: "jitter", label: "Variation", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.4, 0.95] }, { k: "threshold", label: "Brighter than", min: 0, max: 0.95, step: 0.01, fmt: (v) => (v ? f2(v) : "All"), rand: [0, 0] }]],
    ["glitch", "Glitch", "Distort", { slices: 40, shift: 60, amount: 0.25, block: 48, blocks: 0.6, split: 6, speed: 0 }, [{ k: "slices", label: "Strips", min: 2, max: 200, step: 1, log: true, rand: [12, 80] }, { k: "shift", label: "Tear", min: 0, max: 400, step: 1, fmt: px, rand: [20, 120] }, { k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.1, 0.45] }, { k: "block", label: "Block size", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [16, 90] }, { k: "blocks", label: "Blocks", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0, 1] }, { k: "split", label: "Color split", min: 0, max: 40, step: 0.5, fmt: px, rand: [2, 12] }, { k: "speed", label: "Re-roll", min: 0, max: 24, step: 1, fmt: (v) => (v ? v + "× per loop" : "Off"), hard: [0, 120] }]],
    ["pixsort", "Pixel sort", "Distort", { mode: "sort", threshold: 0.45, length: 220, angle: 90, pos: 0.6, bands: 0 }, [{ seg: "mode", options: [["sort", "Sort"], ["stretch", "Stretch"]] }, { k: "threshold", label: "Brighter than", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.3, 0.6], when: (e) => e.mode !== "stretch" }, { k: "length", label: "Length", min: 8, max: 800, step: 1, log: true, fmt: px, rand: [80, 360], when: (e) => e.mode !== "stretch" }, { k: "angle", label: "Angle", min: 0, max: 360, step: 1, fmt: deg, rand: [0, 360] }, { k: "pos", label: "Start", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.8], when: (e) => e.mode === "stretch" }, { k: "bands", label: "Bands", min: 0, max: 120, step: 1, fmt: (v) => (v ? v + "px" : "Off"), rand: [0, 40], when: (e) => e.mode === "stretch" }]],
    ["feedback", "Echo", "Distort", { copies: 12, zoom: 1.12, rotate: 8, decay: 0.85, hue: 10, blend: "lighten", anim: false, x: 0.5, y: 0.5 }, [{ seg: "blend", options: [["lighten", "Lighten"], ["add", "Additive"]] }, { k: "copies", label: "Copies", min: 1, max: 24, step: 1, rand: [6, 18] }, { k: "zoom", label: "Zoom", min: 0.7, max: 1.6, step: 0.005, fmt: (v) => f2(v) + "×", rand: [1.04, 1.25] }, { k: "rotate", label: "Turn", min: -45, max: 45, step: 0.5, fmt: deg, rand: [-15, 15] }, { k: "decay", label: "Fade", min: 0.3, max: 1, step: 0.01, fmt: f2, rand: [0.7, 0.92] }, { k: "hue", label: "Hue drift", min: -90, max: 90, step: 1, fmt: deg, rand: [-30, 30] }, { sw: "anim", label: "Animate" }]],
    ["swirl", "Twirl", "Distort", { amount: 3, radius: 0.55, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Turn", min: -12, max: 12, step: 0.05, fmt: f2, rand: [-5, 5] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.35, 0.9] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["bulge", "Bulge", "Distort", { amount: 0.6, radius: 0.45, x: 0.5, y: 0.5 }, [{ k: "amount", label: "Amount", min: -1, max: 0.95, step: 0.01, fmt: f2, rand: [-0.5, 0.8] }, { k: "radius", label: "Radius", min: 0.05, max: 1.5, step: 0.01, fmt: f2, rand: [0.3, 0.7] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }]],
    ["ripple", "Ripples", "Distort", { amp: 10, length: 60, decay: 0.6, shade: 1, x: 0.5, y: 0.5, anim: false, speed: 3 }, [{ k: "amp", label: "Amplitude", min: 0, max: 60, step: 0.5, fmt: px, rand: [4, 16] }, { k: "length", label: "Wavelength", min: 8, max: 400, step: 1, log: true, fmt: px, rand: [30, 120] }, { k: "decay", label: "Reach", min: 0.05, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "shade", label: "Light", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.5] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { sw: "anim", label: "Animate" }, { k: "speed", label: "Speed", min: 1, max: 12, step: 1, fmt: (v) => v + " rings per loop", hard: [1, 60], when: (e) => e.anim }]],
    ["sea", "Water", "Distort", { amount: 0.9, scale: 360, caustic: 0.6, chop: 0.5, depth: 0.15, speed: 1 }, [{ k: "amount", label: "Refraction", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.5, 1.6] }, { k: "scale", label: "Wave size", min: 40, max: 1200, step: 5, log: true, fmt: px, rand: [200, 600] }, { k: "caustic", label: "Light", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.4, 1.1] }, { k: "chop", label: "Chop", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 0.9] }, { k: "depth", label: "Depth tint", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { k: "speed", label: "Speed", min: 0, max: 4, step: 1, fmt: (v) => v + "× per loop", hard: [0, 12] }]],
    ["water", "Caustic web", "Distort", { amount: 1, scale: 320, caustic: 0.33, anim: false }, [{ k: "amount", label: "Refraction", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.5, 1.6] }, { k: "scale", label: "Size", min: 40, max: 1200, step: 5, log: true, fmt: px, rand: [180, 520] }, { k: "caustic", label: "Caustics", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1] }, { sw: "anim", label: "Animate" }]],
    ["kaleido", "Kaleidoscope", "Distort", { segments: 6, rotate: 0, zoom: 1 }, [{ k: "segments", label: "Segments", min: 2, max: 16, step: 1, hard: [2, 64], rand: [4, 10] }, { k: "rotate", label: "Rotate", min: 0, max: 360, step: 1, fmt: deg }, { k: "zoom", label: "Zoom", min: 0.3, max: 3, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.7, 1.6] }]],
    ["glass", "Fluted glass", "Glass", { width: 44, angle: 90, round: 1, thick: 0.6, frost: 0.2, tint: 0, blend: 0, texture: 0, light: 0.5 }, [{ k: "width", label: "Rib width", min: 4, max: 300, step: 1, log: true, fmt: px, rand: [24, 90] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "round", label: "Roundness", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.5, 1] }, { k: "thick", label: "Thickness", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.6] }, { k: "tint", label: "Tint", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4] }, { k: "blend", label: "Blend", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { k: "texture", label: "Texture", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3] }, { k: "light", label: "Shine", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.9] }]],
    ["mesh", "Glass blocks", "Glass", { layout: "grid", cell: 120, gap: 1, radius: 0.2, round: 0.4, thick: 0.6, frost: 0.25, tint: 0, blend: 0, texture: 0, stretch: 1, light: 0.6, fade: 0, fadeAngle: 45, merge: 0, checker: false }, [{ seg: "layout", options: [["grid", "Square"], ["hex", "Hex"]] }, { sw: "checker", label: "Checkerboard" }, { k: "cell", label: "Block size", min: 8, max: 400, step: 1, log: true, fmt: px, rand: [40, 180] }, { k: "gap", label: "Gap", min: 0, max: 4, step: 0.05, fmt: f2, rand: [0.3, 1.5] }, { k: "radius", label: "Corner radius", min: 0, max: 0.5, step: 0.01, fmt: pct, pct: true, rand: [0.1, 0.35] }, { k: "merge", label: "Merge", min: 0, max: 1, step: 0.01, fmt: (v) => (v ? pct(v) : "Off"), pct: true, rand: [0, 0] }, { k: "stretch", label: "Stretch", min: 0.5, max: 3, step: 0.01, log: true, fmt: (v) => v.toFixed(2) + "×", rand: [1, 1] }, { k: "round", label: "Roundness", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.2, 1] }, { k: "thick", label: "Thickness", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.6] }, { k: "tint", label: "Tint", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4] }, { k: "blend", label: "Blend", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { k: "texture", label: "Texture", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3] }, { k: "light", label: "Shine", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.9] }, { k: "fade", label: "Fade", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0] }, { k: "fadeAngle", label: "Fade angle", min: 0, max: 360, step: 1, fmt: deg, when: (e) => e.fade > 0 }]],
    ["lens", "Liquid glass", "Glass", { shape: "pill", size: 0.42, x: 0.5, y: 0.5, round: 0.6, thick: 0.8, frost: 0.2, tint: 0, blend: 0, texture: 0, light: 0.6 }, [{ seg: "shape", options: [["circle", "Circle"], ["pill", "Pill"], ["square", "Square"]] }, { k: "size", label: "Size", min: 0.1, max: 1.2, step: 0.01, fmt: f2, rand: [0.3, 0.6] }, { k: "x", label: "Center X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "y", label: "Center Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.65] }, { k: "round", label: "Roundness", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.9] }, { k: "thick", label: "Thickness", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "frost", label: "Frost", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 0.6] }, { k: "tint", label: "Tint", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4] }, { k: "blend", label: "Blend", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { k: "texture", label: "Texture", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3] }, { k: "light", label: "Shine", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0.4, 0.9] }]],
    ["dof", "Depth of field", "Light", { amount: 28, x: 0.5, y: 0.5, focus: 0.12, falloff: 0.35, shape: "point", angle: 0, bokeh: 0.4 }, [{ seg: "shape", options: [["point", "Point"], ["band", "Band"]] }, { k: "amount", label: "Blur", min: 0, max: 160, step: 0.5, fmt: px, rand: [14, 48] }, { k: "x", label: "Focus left to right", min: 0, max: 1, step: 0.005, pct: true, fmt: pct, rand: [0.3, 0.7] }, { k: "y", label: "Focus top to bottom", min: 0, max: 1, step: 0.005, pct: true, fmt: pct, rand: [0.3, 0.7] }, { k: "focus", label: "In focus", min: 0, max: 0.8, step: 0.005, fmt: pct, pct: true, rand: [0.05, 0.25] }, { k: "falloff", label: "Falloff", min: 0.02, max: 1.2, step: 0.01, fmt: f2, rand: [0.2, 0.6] }, { k: "angle", label: "Band angle", min: -90, max: 90, step: 1, fmt: deg, when: (e) => e.shape === "band" }, { k: "bokeh", label: "Bokeh", min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0.2, 0.7] }]],
    ["blur", "Progressive blur", "Light", { amount: 32, dir: "bottom", start: 0.35 }, [{ seg: "dir", options: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"], ["center", "Edges"], ["even", "Even"]] }, { k: "amount", label: "Blur", min: 0, max: 200, step: 0.5, fmt: px, rand: [16, 60] }, { k: "start", label: "Starts at", min: 0, max: 0.95, step: 0.01, fmt: pct, pct: true, rand: [0.25, 0.6] }]],
    ["bloom", "Glow", "Light", { threshold: 0.55, radius: 30, intensity: 0.9 }, [{ k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.35, 0.75] }, { k: "radius", label: "Radius", min: 2, max: 200, step: 1, log: true, fmt: px, rand: [16, 50] }, { k: "intensity", label: "Intensity", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.2] }]],
    ["streaks", "Light streaks", "Light", { threshold: 0.78, length: 220, angle: 0, points: 4, intensity: 0.45, chroma: 0.5 }, [{ k: "threshold", label: "Threshold", min: 0, max: 0.98, step: 0.01, fmt: f2, rand: [0.65, 0.9] }, { k: "length", label: "Length", min: 10, max: 900, step: 1, log: true, fmt: px, rand: [80, 400] }, { k: "points", label: "Points", min: 2, max: 8, step: 2, rand: [2, 8] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg, rand: [0, 180] }, { k: "intensity", label: "Intensity", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.3, 1] }, { k: "chroma", label: "Color fringe", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0, 1] }]],
    ["glowlines", "Glow lines", "Light", { levels: 4, width: 22, glow: 1.2, dim: 0.72, core: 0.5, side: 0, anim: false }, [{ k: "levels", label: "Lines", min: 1, max: 30, step: 1, rand: [3, 9] }, { k: "width", label: "Glow", min: 1, max: 120, step: 0.5, log: true, fmt: px, rand: [10, 40] }, { k: "glow", label: "Brightness", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.7, 1.6] }, { k: "dim", label: "Darken", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.4, 0.85] }, { k: "core", label: "Core line", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.8] }, { k: "side", label: "One side", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 1] }, { sw: "anim", label: "Animate" }]],
    ["emboss", "Relief", "Light", { strength: 1.2, angle: 135, depth: 2 }, [{ k: "strength", label: "Strength", min: 0, max: 5, step: 0.01, fmt: f2, rand: [0.8, 2.2] }, { k: "angle", label: "Light angle", min: 0, max: 360, step: 1, fmt: deg }, { k: "depth", label: "Depth", min: 0.5, max: 16, step: 0.5, fmt: px, rand: [1.5, 4] }]],
    ["rays", "God rays", "Light", { length: 0.5, threshold: 0.5, intensity: 1.6, x: 0.5, y: 0.15 }, [{ k: "length", label: "Length", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.7] }, { k: "threshold", label: "Threshold", min: 0, max: 0.95, step: 0.01, fmt: f2, rand: [0.4, 0.7] }, { k: "intensity", label: "Intensity", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.8, 1.6] }, { k: "x", label: "Light X", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.2, 0.8] }, { k: "y", label: "Light Y", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4] }]],
    ["vignette", "Vignette", "Light", { amount: 0.4, softness: 0.5 }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.2, 0.55] }, { k: "softness", label: "Softness", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["gradmap", "Gradient map", "Color", { c1: "#15123a", c2: "#4b3fd1", c3: "#f4f1ff", mix: 1 }, [{ color: "c1", label: "Shadows" }, { color: "c2", label: "Midtones" }, { color: "c3", label: "Highlights" }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["film", "Thin film", "Color", { kind: "film", thin: 0, thick: 900, index: 1.47, base: 1.33, gain: 5, vivid: 0.4, mix: 1, mid: 0, anim: false }, [{ seg: "kind", options: [["film", "Film"], ["foil", "Foil"]] }, { k: "thin", label: "Thinnest", min: 0, max: 1500, step: 1, fmt: (v) => Math.round(v) + " nm", rand: [0, 200], when: (e) => e.kind !== "foil" }, { k: "thick", label: "Thickest", min: 50, max: 3000, step: 1, log: true, fmt: (v) => Math.round(v) + " nm", rand: [500, 1400] }, { k: "index", label: "Film index", min: 1.1, max: 2.5, step: 0.01, fmt: f2, rand: [1.3, 1.6], when: (e) => e.kind !== "foil" }, { k: "base", label: "Base index", min: 1, max: 4, step: 0.01, fmt: f2, rand: [1.2, 2.5], when: (e) => e.kind !== "foil" }, { k: "gain", label: "Brightness", min: 0.5, max: 20, step: 0.1, log: true, fmt: f2, rand: [3, 8] }, { k: "vivid", label: "Vivid", min: 0, max: 2, step: 0.01, fmt: pct, pct: true, rand: [0, 0.8] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }, { k: "mid", label: "Midtones only", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0] }, { sw: "anim", label: "Animate" }]],
    ["irid", "Iridescence", "Color", { bands: 2.2, shift: 0, mix: 0.85, pearl: 0.3, source: "tone", anim: false }, [{ seg: "source", options: [["tone", "Tone"], ["slope", "Slope"]] }, { k: "bands", label: "Bands", min: 0.2, max: 12, step: 0.01, log: true, fmt: f2, rand: [1, 4] }, { k: "shift", label: "Shift", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0, 1] }, { k: "pearl", label: "Pearl", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.6] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.6, 1] }, { k: "mid", label: "Midtones only", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 1] }, { sw: "anim", label: "Animate" }]],
    ["posterize", "Posterize", "Color", { levels: 5 }, [{ k: "levels", label: "Levels", min: 2, max: 16, step: 1, hard: [2, 64], rand: [3, 7] }]],
    ["heatmap", "Heatmap", "Color", { glow: 12, mix: 1, invert: false }, [{ k: "glow", label: "Glow", min: 0, max: 80, step: 0.5, fmt: px, rand: [4, 24] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }, { sw: "invert", label: "Invert" }]],
    ["chrome", "Liquid metal", "Color", { strength: 1, bands: 2.2, soft: 6, tint: "#d9dde3", mix: 1 }, [{ color: "tint", label: "Tint" }, { k: "strength", label: "Depth", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.6, 1.6] }, { k: "bands", label: "Reflections", min: 0.5, max: 6, step: 0.05, fmt: f2, rand: [1.4, 3.2] }, { k: "soft", label: "Softness", min: 1, max: 40, step: 0.5, fmt: px, rand: [3, 12] }, { k: "mix", label: "Mix", min: 0, max: 1, step: 0.01, fmt: pct, pct: true }]],
    ["halftone", "Halftone", "Print", { shape: "circle", size: 10, angle: 45, mono: true, grid: "square", turn: false, tone: false, even: false, merge: true, classic: false }, [{ seg: "shape", options: [["circle", "Circle"], ["square", "Square"], ["triangle", "Triangle"], ["star", "Star"]] }, { seg: "grid", label: "Grid", options: [["square", "Square"], ["hex", "Hex"]], when: (e) => e.shape !== "triangle" || e.turn }, { k: "size", label: "Dot size", min: 3, max: 80, step: 0.5, log: true, fmt: px, rand: [6, 18] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }, { sw: "turn", label: "Random turn", when: (e) => e.shape !== "circle" }, { sw: "mono", label: "Ink only" }, { sw: "tone", label: "Size by tone", when: (e) => !e.mono }, { sw: "classic", label: "One-way triangles", when: (e) => e.shape === "triangle" && !e.turn }, { sw: "even", label: "Even sizes", when: (e) => e.shape !== "triangle" || e.turn }, { sw: "merge", label: "Merge when dark", when: (e) => e.shape !== "triangle" || e.turn }]],
    ["cmyk", "CMYK halftone", "Print", { shape: "circle", size: 9, angle: 0 }, [{ seg: "shape", options: [["circle", "Circle"], ["square", "Square"], ["triangle", "Triangle"], ["star", "Star"]] }, { k: "size", label: "Dot size", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [6, 14] }, { k: "angle", label: "Angle", min: 0, max: 90, step: 1, fmt: deg }]],
    ["linescreen", "Engrave", "Print", { spacing: 7, angle: 30, mono: true, flow: 0, flowSize: 300, dash: 0, dashLen: 24, invert: false, ripple: 0, ripLen: 40, x: 0.15, y: 0.9, x2: 0.85, y2: 0.9, steps: 0, hair: 0 }, [{ k: "spacing", label: "Line spacing", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [5, 12] }, { k: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: deg }, { k: "flow", label: "Flow", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0, 1.2] }, { k: "flowSize", label: "Flow size", min: 40, max: 1500, step: 5, log: true, fmt: px, rand: [150, 600], when: (e) => e.flow > 0 }, { k: "ripple", label: "Ripples", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0, 0] }, { k: "ripLen", label: "Ripple size", min: 6, max: 300, step: 1, log: true, fmt: px, rand: [20, 80], when: (e) => e.ripple > 0 }, { k: "steps", label: "Steps", min: 0, max: 8, step: 1, fmt: (v) => (v ? String(v) : "Off"), rand: [0, 0] }, { k: "hair", label: "Hairline", min: 0, max: 4, step: 0.1, fmt: px, rand: [0, 0] }, { k: "dash", label: "Dashes", min: 0, max: 0.9, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { k: "dashLen", label: "Dash length", min: 2, max: 300, step: 1, log: true, fmt: px, rand: [10, 60], when: (e) => e.dash > 0 }, { sw: "invert", label: "Thick in light" }, { sw: "mono", label: "Ink only" }]],
    ["riso", "Risograph", "Print", { size: 7, offset: 4, grain: 0.3, inkA: "#ff48b0", inkB: "#0078bf", paper: "#f3efe6" }, [{ color: "inkA", label: "Ink 1" }, { color: "inkB", label: "Ink 2" }, { color: "paper", label: "Paper" }, { k: "size", label: "Dot size", min: 3, max: 40, step: 0.5, log: true, fmt: px, rand: [5, 10] }, { k: "offset", label: "Misregister", min: 0, max: 30, step: 0.5, fmt: px, rand: [1, 6] }, { k: "grain", label: "Grain", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["guilloche", "Guilloche", "Print", { mode: "rings", spacing: 9, width: 1.2, count: 3, tone: 0.6, over: 0, mono: false, x: 0.5, y: 0.5 }, [{ seg: "mode", options: [["rings", "Rings"], ["rosette", "Rosette"], ["waves", "Waves"]] }, { k: "spacing", label: "Line spacing", min: 2, max: 60, step: 0.5, log: true, fmt: px, rand: [5, 14] }, { k: "width", label: "Line width", min: 0.3, max: 8, step: 0.1, fmt: px, rand: [0.8, 2] }, { k: "count", label: "Centers", min: 1, max: 6, step: 1, rand: [1, 4], when: (e) => e.mode === "rings" }, { k: "count", label: "Petals", min: 2, max: 24, step: 1, rand: [5, 14], when: (e) => e.mode === "rosette" }, { k: "count", label: "Waves", min: 1, max: 12, step: 1, rand: [2, 6], when: (e) => e.mode === "waves" }, { k: "tone", label: "Picture", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1] }, { k: "over", label: "Background", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.6] }, { sw: "mono", label: "Ink only" }]],
    ["ridge", "Ridge lines", "Print", { spacing: 10, height: 120, width: 1.5, noise: 0.3, fill: 0, mono: false }, [{ k: "spacing", label: "Line spacing", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [6, 16] }, { k: "height", label: "Height", min: 0, max: 500, step: 1, fmt: px, rand: [60, 220] }, { k: "width", label: "Line width", min: 0.3, max: 8, step: 0.1, fmt: px, rand: [1, 2.5] }, { k: "noise", label: "Noise", min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0, 0.6] }, { k: "fill", label: "Fill", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.5] }, { sw: "mono", label: "Ink only" }]],
    ["dither", "Dither", "Print", { matrix: 4, levels: 2, mono: true, pix: 2, palette: false, gap: 0 }, [{ seg: "matrix", options: [[2, "2×2"], [4, "4×4"], [8, "8×8"]] }, { k: "levels", label: "Levels", min: 2, max: 8, step: 1, hard: [2, 32], when: (e) => !e.palette }, { k: "pix", label: "Pixel", min: 1, max: 16, step: 1, fmt: px, rand: [2, 4], hard: [1, 128] }, { k: "gap", label: "Gap", min: 0, max: 0.8, step: 0.01, fmt: pct, pct: true, when: (e) => e.palette }, { sw: "palette", label: "Design colors" }, { sw: "mono", label: "Ink only", when: (e) => !e.palette }]],
    ["led", "LED board", "Stylize", { pitch: 9, size: 0.72, glow: 0.7, off: 0.05, contrast: 1.6, bytone: false, shape: "round" }, [{ seg: "shape", options: [["round", "Round"], ["square", "Square"], ["rgb", "RGB"]] }, { k: "pitch", label: "Pitch", min: 3, max: 60, step: 0.5, log: true, fmt: px, rand: [6, 16] }, { k: "size", label: "Dot size", min: 0.2, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.55, 0.9] }, { k: "glow", label: "Glow", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1] }, { k: "contrast", label: "Contrast", min: 0.5, max: 4, step: 0.01, log: true, fmt: f2, rand: [1.2, 2.4] }, { k: "off", label: "Unlit dots", min: 0, max: 0.3, step: 0.01, fmt: f2, rand: [0.02, 0.12] }, { sw: "bytone", label: "Size by tone" }]],
    ["pixel", "Pixels", "Stylize", { size: 16, bevel: 0.5 }, [{ k: "size", label: "Size", min: 2, max: 160, step: 1, log: true, fmt: px, rand: [10, 36] }, { k: "bevel", label: "Bevel", min: 0, max: 1, step: 0.01, fmt: f2 }]],
    ["dissolve", "Pixel dissolve", "Stylize", { cell: 22, shape: "square", amount: 0.45, edge: 0.2, gap: 0.08, tint: 0.12, dots: 0.4, keep: "dark" }, [{ seg: "shape", options: [["square", "Square"], ["circle", "Circle"], ["tile", "Tile"]] }, { seg: "keep", options: [["dark", "Keep dark"], ["light", "Keep light"]] }, { k: "cell", label: "Cell", min: 4, max: 160, step: 1, log: true, fmt: px, rand: [12, 40] }, { k: "amount", label: "Core", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.3, 0.6] }, { k: "edge", label: "Edge", min: 0, max: 0.6, step: 0.01, fmt: f2, rand: [0.1, 0.35] }, { k: "gap", label: "Gap", min: 0, max: 0.6, step: 0.01, fmt: pct, pct: true, rand: [0, 0.2] }, { k: "tint", label: "Tint spread", min: 0, max: 0.5, step: 0.01, fmt: f2, rand: [0, 0.25] }, { k: "dots", label: "Dot grid", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.6] }]],
    ["grid", "Grid", "Stylize", { mode: "grid", cell: 160, depth: 4, threshold: 0.12, stroke: 2, radius: 0.1, mono: false }, [{ seg: "mode", options: [["grid", "Split grid"], ["truchet", "Truchet"]] }, { k: "cell", label: "Cell", min: 6, max: 400, step: 1, log: true, fmt: px, rand: [60, 220] }, { k: "depth", label: "Splits", min: 1, max: 6, step: 1, rand: [3, 6], when: (e) => e.mode !== "truchet" }, { k: "threshold", label: "Detail", min: 0.01, max: 0.6, step: 0.01, fmt: f2, rand: [0.05, 0.2], when: (e) => e.mode !== "truchet" }, { k: "stroke", label: "Line width", min: 0, max: 24, step: 0.25, fmt: px, rand: [1, 4] }, { k: "radius", label: "Corner radius", min: 0, max: 0.5, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3], when: (e) => e.mode !== "truchet" }, { sw: "mono", label: "Ink only" }]],
    ["outline", "Outline", "Stylize", { mode: "neon", threshold: 0.12, width: 1.5, glow: 0.6, keep: 0.2, mono: false }, [{ seg: "mode", options: [["neon", "Neon"], ["ink", "Ink"], ["solarize", "Solarize"]] }, { k: "threshold", label: "Threshold", min: 0.01, max: 0.95, step: 0.01, fmt: f2, rand: [0.06, 0.3] }, { k: "width", label: "Line width", min: 0.5, max: 8, step: 0.1, fmt: px, rand: [1, 3], when: (e) => e.mode !== "solarize" }, { k: "glow", label: "Glow", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.2, 1], when: (e) => e.mode !== "solarize" }, { k: "keep", label: "Picture", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.4], when: (e) => e.mode !== "solarize" }, { sw: "mono", label: "Ink only", when: (e) => e.mode !== "solarize" }]],
    ["voronoi", "Crystallize", "Stylize", { cell: 42, edge: 0.06 }, [{ k: "cell", label: "Cell", min: 6, max: 300, step: 1, log: true, fmt: px, rand: [24, 80] }, { k: "edge", label: "Edges", min: 0, max: 0.5, step: 0.01, fmt: f2 }]],
    ["ascii", "ASCII", "Stylize", { cell: 14, set: "ascii", custom: "", font: "geist", mono: true, invert: false }, [{ seg: "set", options: [["ascii", "ASCII"], ["blocks", "Blocks"], ["dots", "Dots"], ["binary", "01"], ["custom", "Custom"]] }, FONT_SEG, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [10, 20] }, { sw: "mono", label: "Ink only" }, { sw: "invert", label: "Invert" }]],
    ["touch", "Click ripples", "Interactive", { amp: 14, length: 46, speed: 420, life: 2.2, shade: 1 }, [{ k: "amp", label: "Strength", min: 0, max: 60, step: 0.5, fmt: px, rand: [6, 24] }, { k: "length", label: "Wavelength", min: 8, max: 300, step: 1, log: true, fmt: px, rand: [24, 90] }, { k: "speed", label: "Speed", min: 40, max: 2000, step: 10, log: true, fmt: (v) => v + " px/s", rand: [200, 800] }, { k: "life", label: "Lasts", min: 0.3, max: 8, step: 0.1, fmt: (v) => f2(v) + "s", rand: [1.2, 3.5] }, { k: "shade", label: "Light", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.5, 1.5] }]],
    ["trail", "Drag trails", "Interactive", { mode: "smear", size: 90, strength: 1, life: 1.6, swirl: 0.6, color: "#ffffff" }, [{ seg: "mode", options: [["smear", "Fluid"], ["smoke", "Smoke"]] }, { color: "color", label: "Smoke color" }, { k: "size", label: "Brush", min: 10, max: 400, step: 1, log: true, fmt: px, rand: [50, 160] }, { k: "strength", label: "Push", min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.6, 1.6] }, { k: "swirl", label: "Swirl", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.2, 1.2] }, { k: "life", label: "Lasts", min: 0.2, max: 6, step: 0.1, fmt: (v) => f2(v) + "s", rand: [0.8, 2.5] }]],
    ["glyphs", "Glyph field", "Stylize", { cell: 12, set: "alnum", custom: "", font: "geist", contrast: 1.2, change: 2, back: 0, mono: false, keep: true }, [{ seg: "set", options: [["alnum", "Letters"], ["hex", "Hex"], ["binary", "01"], ["symbols", "Symbols"], ["kana", "Kana"], ["custom", "Custom"]] }, { text: "custom", label: "Characters", when: (e) => e.set === "custom" }, FONT_SEG, { k: "cell", label: "Cell", min: 4, max: 80, step: 1, log: true, fmt: px, rand: [8, 18] }, { k: "contrast", label: "Contrast", min: 0.3, max: 4, step: 0.01, log: true, fmt: f2, rand: [0.8, 2] }, { k: "change", label: "Shuffle", min: 0, max: 12, step: 1, fmt: (v) => (v ? v + "× per loop" : "Off"), hard: [0, 60] }, { k: "back", label: "Backdrop", min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3] }, { sw: "keep", label: "Keep new letters" }, { sw: "mono", label: "Ink only" }]],
    ["scan", "Scanlines", "Stylize", { spacing: 4, strength: 0.25 }, [{ k: "spacing", label: "Spacing", min: 2, max: 40, step: 0.5, fmt: px, rand: [3, 7] }, { k: "strength", label: "Strength", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.15, 0.4] }]],
    ["chroma", "Chromatic", "Stylize", { amount: 6 }, [{ k: "amount", label: "Shift", min: 0, max: 60, step: 0.5, fmt: px, rand: [2, 10] }]],
    ["paper", "Paper", "Texture", { crumple: 0.3, fiber: 0.6, scale: 420 }, [{ k: "crumple", label: "Crumple", min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.3, 1.2] }, { k: "fiber", label: "Fibres", min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1] }, { k: "scale", label: "Size", min: 40, max: 1200, step: 5, log: true, fmt: px, rand: [160, 480] }]],
    ["grain", "Grain", "Texture", { amount: 0.12, size: 1.2, mono: true, soft: true, anim: false }, [{ k: "amount", label: "Amount", min: 0, max: 1, step: 0.01, fmt: f2, rand: [0.06, 0.2] }, { k: "size", label: "Size", min: 1, max: 8, step: 0.1, fmt: px, rand: [1, 2] }, { sw: "soft", label: "Film grain" }, { sw: "mono", label: "Monochrome" }, { sw: "anim", label: "Animate" }]],
  ];
  const FXI = Object.fromEntries(FXC.map(([id, name, cat, d, p]) => [id, { id, name, cat, d, p }]));
  const FX_IDS = FXC.map((f) => f[0]);
  const SEEDED = new Set(["dissolve", "smear", "glitch", "grid", "ridge", "liquify", "voronoi", "grain", "water", "sea", "glyphs", "paper", "riso", "rays"]);
  const FX_DEFAULTS = Object.fromEntries(FXC.map(([id, , , d]) => [id, { on: false, ...d, ...(SEEDED.has(id) ? { seed: 0 } : {}) }]));
  const FX_CATS = [...new Set(FXC.map((f) => f[2]))];

  const GENS = [
    ["contours", "Contours", "Lines and bands"],
    ["mesh", "Mesh", "Soft color points"],
    ["flow", "Flow", "Warped color fields"],
    ["noise", "Noise", "Clouds, ridges and cells"],
    ["linear", "Linear", "Straight blend"],
    ["radial", "Radial", "Blend from the center"],
    ["conic", "Conic", "Blend around a point"],
    ["aura", "Aura", "A glowing body of light"],
    ["wavegrad", "Wave", "Folding bands of color"],
    ["paint", "Paint", "Marbled swirls of color"],
    ["folds", "Folds", "Sheets of glass with lit edges"],
    ["image", "Image", "Your own picture"],
  ];
  const GEN_LABEL = Object.fromEntries(GENS.map((g) => [g[0], g[1]]));
  const NOISE_TYPES = [["clouds", "Clouds"], ["ridges", "Ridges"], ["billow", "Billow"], ["cells", "Cells"], ["veins", "Veins"], ["marble", "Marble"], ["neuro", "Neuro"], ["ring", "Smoke ring"], ["smoke", "Smoke"], ["caustic", "Caustics"]];
  const OBJ_KINDS = [["sphere", "Sphere"], ["torus", "Torus"], ["cube", "Cube"], ["capsule", "Capsule"], ["blob", "Blob"], ["pyramid", "Pyramid"], ["diamond", "Diamond"], ["cursor", "Cursor"], ["image", "Picture"]];
  const OBJ_LABEL = Object.fromEntries(OBJ_KINDS);
  const OBJ_MATS = [["shaded", "Shaded", "Lit in your palette"], ["design", "Design", "Wrapped in the design underneath"], ["preset", "Preset", "Wrapped in a preset of your choice"], ["glass", "Glass", "Bends what's behind it"], ["vanta", "Vantablack", "Flat black that swallows the light"]];
  const PIC_MATS = [["photo", "Photo", "The picture as it is"], ["palette", "Palette", "The picture in your colors"]];
  const MAT_LABEL = Object.fromEntries([...OBJ_MATS, ...PIC_MATS].map(([k, l]) => [k, l]));
  const OBJ_DEFAULT = { kind: "sphere", x: 0.5, y: 0.5, size: 0.5, rot: 0, tilt: 20, spin: 30, mat: "shaded", preset: "Prism", shine: 0.6, ripple: 0, round: 0.15, shadow: 0.4, image: "", layer: "under", anim: true, speed: 1, refract: 1, body: false, frost: 0, disp: 0.3, rim: 0.5, tint: "#ffffff", tintAmt: 0, merge: 0 };
  const objId = () => "o" + Math.random().toString(36).slice(2, 8);
  const NOISE_LABEL = Object.fromEntries(NOISE_TYPES);
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
    ["Iris", ["#15123a", "#4b3fd1", "#b8a8ff", "#f4f1ff"], ["#4b3fd1", "#b8a8ff", "#f4f1ff"]],
    ["Signal", ["#111111", "#5a0f1f", "#ef2b52", "#ffd9de"], ["#111111", "#5a0f1f", "#ef2b52"]],
    ["Citrus", ["#2b1d0e", "#c8551f", "#f0a830", "#fbe9c6"], ["#c8551f", "#f0a830", "#fbe9c6"]],
    ["Lagoon", ["#05232b", "#0f6b6b", "#3fb6a8", "#d6f1e8"], ["#d6f1e8", "#3fb6a8", "#05232b"]],
    ["Rose", ["#3b1f2b", "#a24d6b", "#e8a6b5", "#fbecef"], ["#3b1f2b", "#e8a6b5", "#fbecef"]],
    ["Sand", ["#3d2f22", "#8b6f4e", "#d6bf98", "#f6efe2"], ["#3d2f22", "#d6bf98", "#f6efe2"]],
    ["Aurora", ["#071a2f", "#1b6f8a", "#46c2a0", "#d7f59a"], ["#d7f59a", "#46c2a0", "#071a2f"]],
    ["Plum", ["#1d0f24", "#552a6b", "#b8789f", "#f3dfe6"], ["#f3dfe6", "#b8789f", "#1d0f24"]],
    ["Cobalt", ["#0a1640", "#1f3fbf", "#6f8cff", "#e6ebff"], ["#1f3fbf", "#6f8cff", "#e6ebff"]],
    ["Terracotta", ["#2a1410", "#a3472d", "#e38b5d", "#f7dcc4"], ["#a3472d", "#e38b5d", "#f7dcc4"]],
    ["Orchid", ["#2a0f2e", "#8a2d8f", "#e07ad6", "#fbe6f7"]],
    ["Rust", ["#1f120c", "#6e2b14", "#c4622d", "#f2d6bf"]],
    ["Mint", ["#0f2a22", "#1f7a5c", "#7fd6b0", "#effaf4"]],
    ["Haze", ["#262333", "#615a7a", "#b9b0d0", "#f4f1f8"]],
    ["Neon", ["#0a0a12", "#ff2e88", "#29e6ff", "#f6ff3d"]],
    ["Olive", ["#1d1c10", "#5b5a2a", "#a8a35a", "#f1eedb"]],
    ["Tide", ["#06141f", "#0e4c6e", "#3aa0c8", "#cfeef7"]],
    ["Blush", ["#3a2226", "#b0636b", "#efb7b3", "#fdf3f0"]],
    ["Slate", ["#14181d", "#3c4652", "#8a96a3", "#e8ecef"]],
    ["Bauhaus", ["#111111", "#1d4e89", "#d62828", "#f7c548", "#f2eee3"], ["#111111", "#d62828", "#f2eee3"]],
    ["Candy", ["#2d1e2f", "#ff8fab", "#9be3c4", "#fff3b0"], ["#2d1e2f", "#ff8fab", "#fff3b0"]],
    ["Retro", ["#1f2b2e", "#2a7f7a", "#d9572b", "#e8a33d", "#f4ead5"], ["#1f2b2e", "#d9572b", "#f4ead5"]],
    ["Patina", ["#16262a", "#b8733f", "#5fa39a", "#e9e1d3"], ["#5fa39a", "#b8733f", "#16262a"]],
    ["Acid", ["#0f0a1f", "#5b2bff", "#c6ff3d", "#f2f2f2"], ["#c6ff3d", "#5b2bff", "#0f0a1f"]],
    ["Reef", ["#082b3a", "#43bccd", "#ff6f59", "#ffd1a6"], ["#ff6f59", "#43bccd", "#082b3a"]],
  ];
  const BRANDS = [
    ["Caddis", ["#2f6fdb", "#6a9f7a", "#d8a51f", "#e2632a", "#c9302c"], ["#2f6fdb", "#e2632a", "#f7f4ee"]],
    ["Slack", ["#4a154b", "#36c5f0", "#2eb67d", "#ecb22e", "#e01e5a"], ["#4a154b", "#36c5f0", "#f4ede4"]],
    ["Figma", ["#a259ff", "#1abcfe", "#0acf83", "#ff7262", "#f24e1e"], ["#1e1e1e", "#a259ff", "#ffffff"]],
    ["Spotify", ["#191414", "#1ed760", "#ffffff"], ["#1ed760", "#ffffff", "#191414"]],
    ["Discord", ["#000000", "#5865f2", "#e0e3ff"], ["#5865f2", "#e0e3ff", "#000000"]],
    ["Stripe", ["#0a2540", "#635bff", "#f6f9fc"], ["#635bff", "#0a2540", "#f6f9fc"]],
    ["Linear", ["#08090a", "#5e6ad2", "#f7f8f8"], ["#5e6ad2", "#f7f8f8", "#08090a"]],
    ["Airbnb", ["#222222", "#484848", "#ff385c", "#ffffff"], ["#ff385c", "#222222", "#ffffff"]],
    ["GitHub", ["#0d1117", "#238636", "#1f6feb", "#f6f8fa"]],
    ["Notion", ["#000000", "#191919", "#787774", "#f7f6f3", "#ffffff"]],
    ["Twitch", ["#0e0e10", "#9146ff", "#efeff1"]],
    ["Shopify", ["#002e25", "#008060", "#95bf47", "#f6f6f1"]],
    ["Google", ["#4285f4", "#ea4335", "#fbbc05", "#34a853", "#ffffff"]],
    ["Instagram", ["#4f5bd5", "#962fbf", "#d62976", "#fa7e1e", "#feda75"], ["#4f5bd5", "#d62976", "#fff8ef"]],
    ["IKEA", ["#0058a3", "#ffdb00", "#ffffff"], ["#0058a3", "#ffffff", "#ffdb00"]],
    ["Tiffany", ["#0a0a0a", "#81d8d0", "#ffffff"], ["#0a0a0a", "#ffffff", "#81d8d0"]],
    ["Starbucks", ["#1e3932", "#00704a", "#d4e9e2", "#f2f0eb"], ["#1e3932", "#00704a", "#f2f0eb"]],
    ["Mastercard", ["#1a1a1a", "#eb001b", "#ff5f00", "#f79e1b", "#ffffff"], ["#eb001b", "#f79e1b", "#1a1a1a"]],
    ["LEGO", ["#000000", "#d01012", "#ffcf00", "#ffffff"], ["#d01012", "#000000", "#ffcf00"]],
    ["Yandex Neo", ["#050407", "#7a0f5c", "#e0336f", "#f2a81d", "#f4e04d"], ["#e0336f", "#f4e04d", "#050407"]],
    ["Yandex", ["#000000", "#fc3f1d", "#ffffff"], ["#fc3f1d", "#000000", "#ffffff"]],
    ["Netflix", ["#000000", "#e30613", "#ffffff"], ["#e30613", "#000000", "#ffffff"]],
    ["Yandex Go", ["#21201f", "#fce000", "#ffffff", "#f5f4f2"], ["#21201f", "#ffffff", "#fce000"]],
    ["Yandex Intel", ["#120a2e", "#6335e0", "#7a55ff", "#a88cff", "#f3efff"], ["#6335e0", "#a88cff", "#120a2e"]],
    ["Sber", ["#f2e913", "#a3cd39", "#21a038", "#0fa8e0", "#0291eb", "#ffffff"], ["#21a038", "#0291eb", "#ffffff"]],
    ["VTB", ["#0a2973", "#009fdf", "#ffffff"], ["#0a2973", "#009fdf", "#ffffff"]],
    ["Ozon", ["#001a34", "#005bff", "#f91155", "#ffffff"], ["#005bff", "#f91155", "#ffffff"]],
    ["Wildberries", ["#2b0a3d", "#e313bf", "#f7d4f1"], ["#e313bf", "#2b0a3d", "#f7d4f1"]],
    ["Dropbox", ["#19191a", "#0077ff", "#ffffff"], ["#0077ff", "#19191a", "#ffffff"]],
    ["Avito", ["#00aaff", "#97cf26", "#ff6163", "#a169f7", "#ffffff"], ["#a169f7", "#00aaff", "#ffffff"]],
    ["Kaspersky", ["#1d1d1b", "#00a88e", "#ffffff"], ["#00a88e", "#1d1d1b", "#ffffff"]],
  ];
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const rolesOf = (cols) => { const o = cols.slice().sort((a, b) => lum(a) - lum(b)); return [o[0], o[Math.floor(o.length / 2)], o[o.length - 1]]; };
  const PAL_GROUPS = [["Curated", CURATED], ["Brands", BRANDS]];
  const bgKey = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const light = lum(hex) > 150, neutral = d < 0.08;
    return (light ? 0 : 2000) + (neutral ? (light ? 0 : 0) + (255 - lum(hex)) : 400 + ((h * 60 + 360) % 360));
  };
  const PALS = PAL_GROUPS.flatMap(([group, list]) => list.map(([name, colors, roles]) => ({ name, group, colors, roles: roles || rolesOf(colors) })).sort((a, b) => bgKey(a.roles[2]) - bgKey(b.roles[2])));
  const PAL_BY = Object.fromEntries(PALS.map((p) => [p.name, p]));
  const ramp = (n) => (Array.isArray(n) ? n.slice() : PAL_BY[n].colors.slice());
  const palState = (n) => { const [line, line2, bg] = PAL_BY[n].roles; return { line, line2, bg }; };

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
    grad: { type: "flow", colors: ramp("Prism"), points: [{ x: 0.18, y: 0.22 }, { x: 0.8, y: 0.2 }, { x: 0.72, y: 0.8 }, { x: 0.2, y: 0.84 }, { x: 0.48, y: 0.5 }], angle: -25, warp: 0.5, warpScale: 1.6, soft: 1.6, scale: 0.45, detail: 2, stretch: 1.8, contrast: 1, noise: "clouds", cells: 0, image: "" },
    fx: clone(FX_DEFAULTS), fxOrder: [], objects: [], ink: "#1b1b1b", paper: "#f1ede4",
    fmt: "svg", pngScale: 2,
    motion: { type: "still", dur: 6, amt: 0.5, mode: "loop", dir: 1, ease: "linear", bez: [0.42, 0, 0.58, 1], seed: 0, path: "glide", angle: 30 }, vid: { size: 1080, fps: 30, loops: 1 }, gif: { size: 480, fps: 20, webp: false },
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
    if (g.type === "solid") {
      const sz = 0.35 + 0.6 * clamp(+src.grad.scale || 0.6, 0.1, 2);
      if (!Array.isArray(src.objects) || !src.objects.length) out.objects = [{ ...OBJ_DEFAULT, id: objId(), kind: OBJ_LABEL[src.grad.solid] ? src.grad.solid : "sphere", size: +(sz * 0.95).toFixed(3), tilt: 29, spin: +src.grad.angle || 0, shine: clamp((+src.grad.soft || 1.6) / 2.6, 0, 1), ripple: +src.grad.ripple || 0 }];
      g.type = "radial"; g.warp = 0;
    }
    delete g.solid; delete g.ripple;
    if (g.type === "noise" && g.noise === "aura") { g.type = "aura"; g.noise = "clouds"; g.scale = 1; g.warp = 0.6; g.detail = 3; g.stretch = 1; g.soft = 1.6; g.contrast = 0.1; }
    out.objects = (Array.isArray(out.objects) ? out.objects : []).map((o) => (o?.kind === "pill" ? { ...o, kind: "capsule" } : o)).filter((o) => o && OBJ_LABEL[o.kind]).slice(0, 8).map((o) => ({ ...OBJ_DEFAULT, ...o, id: typeof o.id === "string" ? o.id : objId() }));
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

  const gen = (st = S) => (st.source === "contours" ? "contours" : st.grad.type);
  const asContours = (st) => { if (st.source === "contours") return st; const own = PALS.find((p) => sameCols(p.colors, st.grad.colors)), [line, line2, bg] = own ? own.roles : rolesOf(st.grad.colors);
    const inks = st.grad.colors.filter((c) => c !== bg).slice(0, 6), many = inks.length >= 3;
    return { ...st, source: "contours", mode: "bands", band: clamp(st.band, 0.35, 0.6), line: many ? inks[0] : line, line2: many ? inks[inks.length - 1] : line2, mids: many ? inks.slice(1, -1) : [], bg, gradient: false, transparent: false, opacity: 1 }; };
  const AURA_BASE = { scale: 1.25, detail: 3, stretch: 1, soft: 1.6, warp: 0.7, contrast: 0.1 };
  const WAVE_BASE = { scale: 0.9, stretch: 6, warp: 2.1, soft: 0.74, contrast: 0.54, angle: 105 };
  const PAINT_BASE = { scale: 1, warp: 2.2, detail: 5, stretch: 4, soft: 0.3, contrast: 0.5, warpScale: 0.7, angle: 30, cells: 0 };
  const FOLDS_BASE = { scale: 1.6, warp: 0.6, warpScale: 0.8, stretch: 1.4, detail: 1, soft: 0.45, contrast: 0.8, prism: 0.4, angle: 20 };
  const GEN_BASE = { aura: AURA_BASE, wavegrad: WAVE_BASE, paint: PAINT_BASE, folds: FOLDS_BASE };
  const asGradient = (st, type) => { const g = { ...st, source: "gradient", grad: { ...st.grad, type } };
    if (type === "aura" && st.grad?.type !== "aura") Object.assign(g.grad, AURA_BASE, { colors: [...st.grad.colors].sort((x, y) => lum(x) - lum(y)) });
    if (type === "wavegrad" && st.grad?.type !== "wavegrad") Object.assign(g.grad, WAVE_BASE);
    if (type === "paint" && st.grad?.type !== "paint") Object.assign(g.grad, PAINT_BASE);
    if (type === "folds" && st.grad?.type !== "folds") Object.assign(g.grad, FOLDS_BASE);
    const from = GEN_BASE[st.grad?.type];
    if (from && type !== st.grad?.type) for (const k of Object.keys(from)) g.grad[k] = DEFAULTS.grad[k];
    if (st.source !== "contours") return g;
    const inks = [...new Set([st.bg, st.line, ...(st.mids || []), st.line2].filter(Boolean))].slice(0, 8), same = inks.length === st.grad.colors.length && inks.every((c) => st.grad.colors.includes(c));
    if (same) return g; g.grad.colors = inks; g.grad.points = inks.map((_, i) => clone(st.grad.points[i] || DEFAULTS.grad.points[i % 5])); return g; };
  function setGen(id) { if (id === "contours") Object.assign(S, asContours(S)); else Object.assign(S, asGradient(S, id)); sel = null; }
  const linear = () => T.LINEAR.has(S.pattern);
  const activePoints = () => S.usePoints && S.points.length > 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const newSeed = () => Math.floor(Math.random() * 999999);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const toast = (msg, opt = {}) => {
    const host = $("toasts");
    const same = [...host.children].find((n) => !n.classList.contains("out") && n.dataset.msg === msg && !opt.action);
    if (same) { same._arm(); same.animate([{ transform: "scale(1.03)" }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }); return; }
    const n = document.createElement("div");
    n.className = "note-t"; n.dataset.msg = msg; n.setAttribute("role", "status");
    n.innerHTML = `<span class="note-msg"></span>${opt.action ? `<button class="note-act"></button>` : ""}<button class="note-x" aria-label="Dismiss">${ic("x")}</button>`;
    n.querySelector(".note-msg").textContent = msg;
    const leave = () => {
      if (n.classList.contains("out")) return;
      clearTimeout(n._h); n.classList.add("out");
      const h = n.offsetHeight;
      n.animate([{ opacity: 1, transform: "none", marginTop: "0px", height: h + "px" }, { opacity: 0, transform: "translateX(24px) scale(.97)", marginTop: "-8px", height: "0px" }], { duration: 260, easing: "cubic-bezier(.4,0,.2,1)" }).onfinish = () => n.remove();
    };
    n._arm = () => { clearTimeout(n._h); n._h = setTimeout(leave, opt.action ? 6000 : 2800); };
    if (opt.action) { const b = n.querySelector(".note-act"); b.textContent = opt.action; b.onclick = () => { leave(); opt.onAction?.(); }; }
    n.querySelector(".note-x").onclick = leave;
    n.addEventListener("pointerenter", () => clearTimeout(n._h));
    n.addEventListener("pointerleave", () => n._arm());
    host.appendChild(n);
    const live = [...host.children].filter((x) => !x.classList.contains("out"));
    if (live.length > 3) live[0].querySelector(".note-x").click();
    n._arm();
  };
  const isRaster = (st) => st.source === "gradient" || st.fxOrder.some((id) => st.fx[id]?.on) || !!st.objects?.length;
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const patLabel = (id) => T.PATTERNS.find((p) => p.id === id)?.label || id;
  function addFx(id, params) {
    S.fx[id] = { ...S.fx[id], ...(params || {}), on: true };
    if (S.fxOrder.includes(id)) return;
    const gi = S.fxOrder.indexOf("grain");
    if (id !== "grain" && gi === S.fxOrder.length - 1 && gi >= 0) S.fxOrder.splice(gi, 0, id); else S.fxOrder.push(id);
  }
  function removeFx(id) { S.fx[id].on = false; S.fxOrder = S.fxOrder.filter((x) => x !== id); }

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
    ["Noise", "Ridges", { ...G("noise", ["#0d0d0f", "#3a3a40", "#a9a6a0", "#f1ede4"], { noise: "ridges", scale: 1.2, detail: 5, warp: 0.2, stretch: 1, contrast: 1, angle: 0 }) }],
    ["Noise", "Cells", { ...G("noise", ["#101a14", "#2f4a37", "#8fa98b", "#e3e7d6"], { noise: "cells", scale: 2.2, detail: 2, warp: 0.3, stretch: 1, contrast: 1, angle: 0 }) }],
    ["Noise", "Veins", { ...G("noise", ["#0d0d0f", "#3a3a40", "#a9a6a0", "#f1ede4"], { noise: "veins", scale: 1.6, detail: 2, warp: 0.4, stretch: 1, contrast: 1.1, angle: 0 }) }],
    ["Noise", "Stone", { ...G("noise", "Peach", { noise: "marble", scale: 0.6, detail: 3, warp: 0.5, stretch: 1, contrast: 1, angle: 15 }) }],
    ["Noise", "Clouds", { ...G("noise", "Glacier", { noise: "clouds", scale: 1, detail: 5, warp: 0.3, stretch: 1.4, contrast: 1.1, angle: 0 }), fx: { grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Noise", "Neuro", { ...G("noise", "Iris", { noise: "neuro", scale: 1, detail: 3, warp: 0.2, stretch: 1, contrast: 1.1, angle: 0 }), fx: { grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Noise", "Halo", { ...G("noise", "Dusk", { noise: "ring", scale: 0.8, detail: 3, warp: 0.6, stretch: 1, contrast: 1, angle: 0 }), fx: { grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Noise", "Aura", { ...G("aura", "Yandex Neo", { scale: 1.2, detail: 3, warp: 0.55, stretch: 1.2, soft: 1.3, contrast: 0, angle: 20 }), fx: { grain: { amount: 0.05, size: 1.2, soft: true } }, motion: { type: "breathe", dur: 14, amt: 0.6 } }],
    ["Gradients", "Caddis", { ...G("wavegrad", ["#ff3624", "#92c198", "#ffae00", "#598dfd"], { angle: 105, scale: 0.9, stretch: 6, warp: 2.1, soft: 0.74, contrast: 0.54 }), seed: 32, fx: { grain: { amount: 0.14, size: 1.2, soft: true } }, motion: { type: "drift", dur: 10, amt: 0.5 } }],
    ["Gradients", "Marbling", { ...G("paint", ["#16122e", "#3b5bdb", "#f4efe6", "#ff7a45", "#ffd166"], { scale: 1, warp: 2.4, detail: 6, stretch: 4, soft: 0.3, contrast: 0.6, warpScale: 0.8, angle: 30 }), seed: 7, fx: { grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Noise", "Smoke", { ...G("noise", ["#060608", "#1d1d22", "#5b5b66", "#c9c9d1", "#ffffff"], { noise: "smoke", scale: 1.4, detail: 4, warp: 0.3, stretch: 1.2, contrast: 1.1, angle: 25 }), fx: { glyphs: { cell: 11, set: "alnum", font: "geist", contrast: 1.3, change: 2, back: 0, mono: false } }, motion: { type: "breathe", dur: 10, amt: 0.5 } }],
    ["Noise", "Lagoon", { ...G("aura", ["#02161c", "#05607a", "#0fb5d0", "#3fe3ef", "#b8fbff"], { scale: 2.2, detail: 3, warp: 0.6, stretch: 0.8, soft: 2.4, contrast: 0.25, angle: -30 }), motion: { type: "breathe", dur: 12, amt: 0.6 } }],
    ["Gradients", "Alfa", { ...G("linear", ["#da2618", "#ef3124", "#f5473a"], { angle: 115, warp: 0.15, soft: 1 }), objects: [{ kind: "image", x: 0.6, y: 0.6, size: 0.52, rot: -6, tilt: 16, spin: -14, mat: "vanta", shine: 0.4, ripple: 0, round: 0.2, shadow: 0.35, image: "" }, { kind: "capsule", x: 0.18, y: 0.3, size: 0.34, rot: 38, tilt: 10, spin: 20, mat: "vanta", shine: 0.4, ripple: 0, round: 0.15, shadow: 0.3, image: "" }, { kind: "sphere", x: 0.86, y: 0.2, size: 0.18, rot: 0, tilt: 0, spin: 0, mat: "vanta", shine: 0.4, ripple: 0, round: 0.15, shadow: 0.25, image: "" }] }],
    ["Gradients", "Yandex Go", { ...G("linear", ["#f2d200", "#fce000", "#ffe94a"], { angle: 125, warp: 0.12, soft: 1 }), objects: [{ kind: "capsule", x: 0.36, y: 0.56, size: 0.5, rot: -28, tilt: 12, spin: 24, mat: "vanta", shine: 0.4, shadow: 0.35 }, { kind: "sphere", x: 0.72, y: 0.36, size: 0.3, tilt: 20, spin: 30, mat: "glass", shine: 0.8, shadow: 0.3, frost: 0.55, tint: "#ffffff", tintAmt: 0.75, rim: 0.7 }, { kind: "torus", x: 0.8, y: 0.76, size: 0.26, rot: 20, tilt: 40, spin: -30, mat: "vanta", shine: 0.4, shadow: 0.3 }] }],
    ["Gradients", "Orb", { ...G("radial", "Dusk", { warp: 0.2, soft: 1.6 }), objects: [{ kind: "blob", x: 0.5, y: 0.5, size: 0.62, tilt: 29, spin: 25, mat: "shaded", shine: 0.6, ripple: 0.3, shadow: 0.35 }], fx: { grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Gradients", "Ring", { ...G("radial", "Glacier", { warp: 0, soft: 2 }), objects: [{ kind: "torus", x: 0.5, y: 0.5, size: 0.66, tilt: 29, spin: -30, mat: "shaded", shine: 0.8, shadow: 0.3 }], fx: { grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Gradients", "Glass orbs", { ...G("flow", "Prism", { warp: 0.6, scale: 0.45 }), objects: [{ kind: "sphere", x: 0.34, y: 0.42, size: 0.44, mat: "glass", shine: 0.9, shadow: 0.25 }, { kind: "capsule", x: 0.7, y: 0.58, size: 0.4, rot: -30, tilt: 10, spin: 60, mat: "glass", shine: 0.9, shadow: 0.25 }] }],
    ["Effects", "Chrome", { pattern: "blobs", usePoints: true, falloff: 1.1, warp: 0.3, octaves: 2, levels: 14, mode: "layers", smooth: 0.7, line: "#1b1b1b", line2: "#f1ede4", bg: "#1b1b1b", fx: { chrome: { strength: 1.2, bands: 2.4, soft: 8, tint: "#d9dde3", mix: 1 } } }],
    ["Effects", "Thermal", { ...G("noise", ["#0d0d0f", "#3a3a40", "#a9a6a0", "#f1ede4"], { noise: "clouds", scale: 0.9, detail: 4, warp: 0.4, stretch: 1.2, contrast: 1.1, angle: 0 }), fx: { heatmap: { glow: 14, mix: 1 } } }],
    ["Effects", "Press", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25 }), fx: { cmyk: { size: 9, angle: 0 }, paper: { crumple: 0.35, fiber: 0.7, scale: 420 } }, paper: "#f4efe4" }],
    ["Effects", "Fluted", { ...G("mesh", "Dusk", { warp: 0.6, warpScale: 1.3, soft: 1.8 }), fx: { glass: { width: 48, angle: 90, round: 1, thick: 0.6, frost: 0.25, light: 0.5 }, grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Glass blocks", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25, contrast: 1 }), fx: { mesh: { cell: 120, gap: 0.3, radius: 0, round: 0.21, thick: 3, frost: 1, blend: 0.58, texture: 0.71, light: 0.34 } } }],
    ["Effects", "Liquid glass", { pattern: "terrain", scale: 800, octaves: 2, warp: 0.35, levels: 22, weight: 1.6, smooth: 0.7, ...palState("Midnight"), fx: { lens: { shape: "pill", size: 0.42, round: 0.6, thick: 0.9, frost: 0.1, light: 0.7 } } }],
    ["Effects", "Riso", { pattern: "blobs", usePoints: true, falloff: 1, warp: 0.3, levels: 12, mode: "layers", smooth: 0.7, line: "#1b1b1b", line2: "#ffffff", bg: "#1b1b1b", fx: { riso: { size: 7, offset: 4, grain: 0.3 } } }],
    ["Effects", "Engraved", { pattern: "terrain", scale: 900, octaves: 3, warp: 0.3, levels: 12, mode: "layers", smooth: 0.6, line: "#1b1b1b", line2: "#f1ede4", bg: "#1b1b1b", fx: { linescreen: { spacing: 7, angle: 30, mono: true } } }],
    ["Effects", "Relief", { pattern: "terrain", scale: 900, octaves: 3, warp: 0.3, levels: 12, mode: "layers", smooth: 0.6, line: "#b9b2a5", line2: "#faf8f3", bg: "#b9b2a5", fx: { emboss: { strength: 2.2, angle: 135, depth: 3 } } }],
    ["Effects", "Halftone", { ...G("flow", "Prism", { scale: 0.45, detail: 2, warp: 0.5, stretch: 1.8, angle: -25 }), fx: { halftone: { size: 10, angle: 30, mono: false } }, paper: "#f1ede4" }],
    ["Effects", "Duotone", { pattern: "lines", angle: 165, scale: 500, octaves: 2, warp: 0.4, gap: 28, mode: "bands", band: 0.5, smooth: 0.5, line: "#111111", line2: "#5a0f1f", bg: "#f1ede4", fx: { gradmap: { c1: "#15123a", c2: "#4b3fd1", c3: "#f4f1ff", mix: 1 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Effects", "Pixel tide", { ...G("linear", ["#15123a", "#15123a", "#4b3fd1", "#b8a8ff", "#f4f1ff"], { angle: 90 }), fx: { wave: { amp: 70, length: 700, angle: 0 }, dissolve: { cell: 20, shape: "square", amount: 0.5, edge: 0.3, gap: 0.12, tint: 0.1, dots: 0.5, keep: "dark" } } }],
    ["Effects", "Pink mosaic", { ...G("aura", ["#2a1018", "#a24d6b", "#e8a6b5", "#fbecef"], { scale: 1.1, detail: 3, warp: 0.3, stretch: 0, soft: 2.5, contrast: 0, angle: 0 }), fx: { mesh: { cell: 150, gap: 0.3, round: 0.06, thick: 3, frost: 1, tint: 0.23, blend: 0.45, texture: 0.07, light: 0 }, grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Bar field", { ...G("flow", ["#8a9ee0", "#d3d8f2", "#f6d5c6", "#f3a683", "#8a9ee0"], { scale: 0.5, detail: 3, warp: 0.5, stretch: 1.6, angle: 10, contrast: 1 }), fx: { glass: { width: 26, angle: 90, round: 1, thick: 1.4, frost: 0.05, light: 0.8 } } }],
    ["Effects", "Dot matrix", { ...G("flow", ["#1c1d1f", "#3b3d41", "#d9d4ca", "#2a365c", "#1c1d1f"], { scale: 0.3, detail: 2, warp: 0.3, stretch: 3, angle: -35, contrast: 1.1 }), fx: { led: { pitch: 14, size: 0.7, glow: 0.4, off: 0.03, contrast: 1.5, shape: "round" } } }],
    ["Effects", "Green glass", { ...G("flow", ["#1a2414", "#46642a", "#a9c95a", "#e6f2a8", "#26341c"], { scale: 0.4, detail: 3, warp: 0.6, stretch: 1.5, angle: 60, contrast: 1 }), fx: { mesh: { cell: 28, gap: 0.3, radius: 0, round: 0.21, thick: 3, frost: 1, blend: 0.58, texture: 0.71, light: 0.34 } } }],
    ["Effects", "Glass squares", { ...G("aura", ["#15123a", "#4b3fd1", "#d7f59a", "#f4f1ff"], { scale: 1.1, detail: 3, warp: 0.3, stretch: 0, soft: 2.5, contrast: 0, angle: 0 }), fx: { mesh: { cell: 190, gap: 0.3, round: 0.06, thick: 3, frost: 1, tint: 0.23, blend: 0.45, texture: 0.07, light: 0 } } }],
    ["Gradients", "Chrome folds", { ...G("folds", ["#1c1d1f", "#2a2b2e", "#7d7a74", "#d9d4ca", "#faf8f3"], { scale: 1.2, warp: 0.35, warpScale: 1.2, stretch: 2, detail: 1, soft: 0.35, contrast: 1, prism: 0.9, angle: 15 }), fx: { grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Holo swirl", { ...G("wavegrad", ["#faf8f3", "#2a365c", "#faf8f3", "#2a365c"], { angle: 115, scale: 0.9, stretch: 4, warp: 1.6, soft: 0.9, contrast: 0.3 }), fx: { film: { kind: "foil", thick: 1600, gain: 1.3, vivid: 0, mix: 0.6, mid: 1 }, grain: { amount: 0.12, size: 1.4, soft: true } } }],
    ["Effects", "Glyph bloom", { ...G("aura", ["#9cc3d5", "#f3a683", "#e1665b", "#f7e3d4"], { scale: 1.6, detail: 3, warp: 0.7, stretch: 0.6, soft: 2, contrast: 0, angle: 0 }), fx: { glyphs: { cell: 16, set: "binary", font: "geist", contrast: 1.6, change: 2, back: 0.65, mono: false } } }],
    ["Effects", "Dimple glow", { ...G("aura", ["#0d1512", "#1f2d24", "#3fb6a8", "#d7f59a"], { scale: 1.4, detail: 3, warp: 0.4, stretch: 0.3, soft: 1.2, contrast: 0, angle: 0 }), fx: { mesh: { cell: 24, radius: 0.5, stretch: 2, round: 1, thick: 3, frost: 0.1, gap: 0, light: 0.1 }, grain: { amount: 0.1, size: 1.2, soft: true } } }],
    ["Effects", "Halftone ridges", { ...G("folds", ["#f3efe6", "#f3efe6", "#8a8378", "#1b1b1b"], { scale: 0.9, warp: 0.5, warpScale: 0, stretch: 0.5, detail: 5, soft: 0.6, contrast: 1.2, prism: 0, angle: 90 }), ink: "#1b1b1b", paper: "#f3efe6", fx: { halftone: { size: 9, angle: 45, mono: true } } }],
    ["Effects", "Pearl liquid", { ...G("paint", ["#f3dfe6", "#cbbad6", "#faf8f3", "#b1c3d8", "#e8cad8"], { scale: 0.8, warp: 2, detail: 5, stretch: 2, soft: 0.9, contrast: 0.3, warpScale: 0.4, angle: 30 }), fx: { chrome: { strength: 0.8, bands: 1.6, soft: 12, tint: "#f6e6ef", mix: 0.55 }, irid: { bands: 2, mix: 0.3, pearl: 0.7, source: "slope" } } }],
    ["Effects", "Oil slick", { ...G("flow", ["#000000", "#000000", "#000000", "#3b3d41", "#8a8378", "#f1ede4"], { scale: 0.35, detail: 2, warp: 0.9, stretch: 2.2, angle: 70, contrast: 1 }), fx: { film: { thin: 0, thick: 900, index: 1.47, base: 1.33, gain: 6, vivid: 2, mix: 1 } } }],
    ["Gradients", "Ember flow", { ...G("flow", ["#05232b", "#05232b", "#0f4a4f", "#f26b3a", "#e1452a", "#05232b"], { scale: 0.35, detail: 2, warp: 0.9, stretch: 1.5, angle: 30, contrast: 1 }), fx: { blur: { amount: 30, dir: "even", start: 0 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Effects", "Hex lenses", { ...G("flow", ["#0e1424", "#141c30", "#5b6b9a", "#aab8dc", "#0e1424"], { scale: 0.35, detail: 2, warp: 0.4, stretch: 3, angle: 70, contrast: 1.1 }), fx: { mesh: { layout: "hex", cell: 26, radius: 0.5, round: 1, thick: 2, frost: 0, gap: 0.6, light: 1 }, vignette: { amount: 0.5, softness: 0.5 } } }],
    ["Gradients", "Soft ribbon", { pattern: "lines", angle: 60, scale: 600, octaves: 2, warp: 0.7, gap: 420, mode: "bands", band: 0.12, smooth: 0.8, line: "#f1ede4", line2: "#f1ede4", bg: "#1b1b1b", fx: { blur: { amount: 60, dir: "even", start: 0 }, grain: { amount: 0.16, size: 1.4, soft: true } } }],
    ["Effects", "Prism shards", { ...G("paint", ["#15123a", "#15123a", "#3b2a5e", "#e0679a", "#f6d27a", "#9cc3d5", "#15123a"], { scale: 1.2, warp: 1.6, detail: 4, stretch: 3, soft: 0.8, contrast: 0.4, warpScale: 0.4, angle: 60 }), fx: { glass: { width: 140, angle: 60, round: 1, thick: 1.6, frost: 0.1, light: 0.8 }, chroma: { amount: 6 }, bloom: { threshold: 0.6, radius: 24, intensity: 0.6 } } }],
    ["Effects", "Smear columns", { ...G("noise", ["#1b1b1b", "#1b1b1b", "#f1ede4", "#f1ede4"], { noise: "clouds", scale: 1.6, detail: 3, warp: 0.3, stretch: 1, contrast: 1.6, angle: 0 }), fx: { smear: { length: 600, angle: 90, band: 12, amount: 1, jitter: 1, threshold: 0 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Effects", "Flow engraving", { ...G("noise", ["#1b1b1b", "#1b1b1b", "#f1ede4"], { noise: "clouds", scale: 0.7, detail: 3, warp: 0.4, stretch: 1, contrast: 1.4, angle: 0 }), ink: "#f1ede4", paper: "#1b1b1b", fx: { linescreen: { spacing: 10, angle: 30, flow: 0.3, flowSize: 700, mono: true, invert: true } } }],
    ["Gradients", "Acrylic pour", { ...G("paint", ["#20120e", "#8c2f17", "#e1452a", "#f0a830", "#f6f1e7", "#9a958c", "#3b3d41"], { scale: 0.9, warp: 1.6, detail: 6, stretch: 1.2, soft: 0.45, contrast: 0.15, warpScale: 0.5, angle: 40, cells: 0.85 }), seed: 11, fx: { grain: { amount: 0.05, size: 1.2, soft: true } } }],
    ["Gradients", "Mystic swirl", { ...G("paint", ["#1a0b10", "#5a0f1f", "#a3243b", "#0e1424", "#3fb6a8"], { scale: 1, warp: 2.2, detail: 5, stretch: 2.5, soft: 0.7, contrast: 0.4, warpScale: 0.6, angle: 30 }), fx: { bloom: { threshold: 0.5, radius: 24, intensity: 0.8 }, grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Noise", "Carnage", { ...G("noise", ["#111111", "#111111", "#111111", "#111111", "#c8203f", "#ef2b52"], { noise: "marble", scale: 2.4, detail: 5, warp: 0.8, stretch: 1, contrast: 3, angle: 0 }), fx: { grain: { amount: 0.08, size: 1.2, soft: true } }, motion: { type: "breathe", dur: 8, amt: 0.7, path: "glide", angle: 90 } }],
    ["Effects", "Wave traffic", { ...G("linear", ["#76749c", "#8482aa"], { angle: 90 }), ink: "#5b6b9a", paper: "#0e1424", fx: { linescreen: { spacing: 28, angle: 12, flow: 0.1, flowSize: 600, ripple: 0.5, ripLen: 30, x: -0.2, y: 1.15, x2: 1.25, y2: 0.7, mono: true } } }],
    ["Gradients", "Glass fold", { ...G("folds", ["#070d26", "#0a1640", "#1f3fbf", "#6f8cff", "#e6ebff"], { scale: 0.5, warp: 0.9, warpScale: 0.3, stretch: 1.4, detail: 1, soft: 0.7, contrast: 1, prism: 0, angle: -30 }), fx: { grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Halftone wave", { ...G("linear", ["#15123a", "#c8325f", "#f07a9a"], { angle: 90, warp: 0.5, warpScale: 1.6, soft: 1 }), fx: { dither: { matrix: 4, pix: 12, palette: true, gap: 0.18 } } }],
    ["Effects", "Neural pink", { ...G("noise", ["#0f0608", "#3b1f2b", "#c2304f", "#ef6f8a", "#fbecef"], { noise: "caustic", scale: 2.2, detail: 6, warp: 0.15, stretch: 1, contrast: 1, angle: -28 }), fx: { bloom: { threshold: 0.6, radius: 18, intensity: 0.8 }, grain: { amount: 0.06, size: 1.2, soft: true } } }],
    ["Effects", "Green smear", { ...G("flow", ["#10201a", "#34683a", "#6fb0e0", "#10201a"], { scale: 0.5, detail: 2, warp: 0.5, stretch: 1.4, angle: 20, contrast: 1 }), fx: { smear: { length: 300, angle: 60, band: 8, amount: 0.8, jitter: 0.7, threshold: 0 }, blur: { amount: 10, dir: "even", start: 0 }, grain: { amount: 0.14, size: 1.3, soft: true } } }],
    ["Effects", "Crimson veil", { ...G("noise", ["#2a1018", "#6a2338", "#d09aa6", "#fbecef"], { noise: "clouds", scale: 1.2, detail: 4, warp: 0.3, stretch: 1, contrast: 1.4, angle: 0 }), fx: { smear: { length: 500, angle: 90, band: 4, amount: 1, jitter: 0.7, threshold: 0 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Gradients", "Parallel waves", { pattern: "lines", angle: 130, scale: 700, octaves: 2, warp: 0.3, gap: 260, mode: "bands", band: 0.35, smooth: 0.8, line: "#f1ede4", line2: "#f1ede4", bg: "#1b1b1b", fx: { blur: { amount: 40, dir: "even", start: 0 }, gradmap: { c1: "#05232b", c2: "#3fb6a8", c3: "#f6efc9", mix: 1 }, grain: { amount: 0.08, size: 1.2, soft: true } } }],
    ["Effects", "Vertical bars", { ...G("noise", ["#f3efe6", "#f3efe6", "#8a8378", "#8a8378"], { noise: "clouds", scale: 0.6, detail: 1, warp: 0.4, stretch: 1, contrast: 1.4, angle: 0 }), ink: "#1b1b1b", paper: "#f3efe6", fx: { linescreen: { spacing: 32, angle: 90, mono: true, steps: 3, hair: 1.5 } } }],
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
    st.objects = (rest.objects || []).map((o, i) => ({ ...OBJ_DEFAULT, ...o, id: "p" + i }));
    resolved.set(look, st);
    return st;
  }
  const LAYERS = {
    shape: ["source", "pattern", "scale", "octaves", "warp", "liquify", "liqScale", "angle", "features", "bump", "bumpSize", "usePoints", "falloff", "grad.type", "grad.warp", "grad.warpScale", "grad.soft", "grad.angle", "grad.scale", "grad.detail", "grad.stretch", "grad.contrast", "grad.noise", "grad.cells"],
    style: ["mode", "band", "levels", "gap", "bias", "weight", "swell", "swellSize", "taper", "indexEvery", "indexWeight", "smooth"],
    color: ["line", "line2", "mids", "gradient", "bg", "transparent", "opacity", "grad.colors", "ink", "paper"],
    objects: ["objects"],
    effects: ["fx", "fxOrder"],
  };
  const LAYER_NAMES = { shape: "Shape", style: "Lines", color: "Colors", objects: "Objects", effects: "Effects" };
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

  let hist = [JSON.stringify(S)], hi = 0, histT = 0;
  let histPend = null;
  function commit(now = false) {
    clearTimeout(histT);
    const push = (j) => { if (j === hist[hi]) return; hist = hist.slice(0, hi + 1); hist.push(j); if (hist.length > 120) hist.shift(); hi = hist.length - 1; };
    if (now) { if (histPend) push(histPend); histPend = null; push(JSON.stringify(S)); syncHistory(); return; }
    histPend = JSON.stringify(S);
    histT = setTimeout(() => { if (histPend) push(histPend); histPend = null; syncHistory(); }, 350);
  }
  function travel(dir) {
    clearTimeout(histT); histPend = null;
    const j = JSON.stringify(S);
    if (j !== hist[hi]) { hist = hist.slice(0, hi + 1); hist.push(j); hi = hist.length - 1; }
    const n = hi + dir;
    if (n < 0 || n >= hist.length) return;
    hi = n; S = JSON.parse(hist[hi]); sel = null;
    update({ commit: false });
  }
  const syncHistory = () => { $("undo").disabled = hi <= 0; $("redo").disabled = hi >= hist.length - 1; };

  const { toOklch, fromOklch } = window.Color;
  const picker = window.ColorPicker;
  const inPlay = () => (S.source === "contours" ? [S.bg, S.line, ...(S.mids || []), S.line2] : S.grad.colors);
  const variants = (hex) => { const [l, c, h] = toOklch(hex); return [[l + 0.16, c * 0.7, h], [l - 0.18, c, h], [l, c, h + 30], [l, c, h - 30], [l, Math.max(c, 0.08), h + 180], [0.95, 0.02, h]].map(([a, b, d]) => fromOklch(clamp(a, 0.12, 0.97), b, (d + 360) % 360)); };
  const swatchesFor = (hex) => [["In use", inPlay()], ["Try", variants(parseHex(hex) || "#808080")]];

  const syncers = [], sliders = [];
  const roundStep = (v, c, lo = c.min, hi = c.max) => +clamp(Math.round(v / c.step) * c.step, lo, hi).toFixed(4);
  const hardRange = (c) => c.hard || [c.min > 0 ? c.min / 20 : c.min === 0 ? 0 : c.min * 20, c.max * 25];
  function randomValue(c) {
    const [a, b] = P.safe && c.rand ? c.rand : [c.min, c.max];
    return roundStep(c.log && a > 0 ? a * Math.pow(b / a, Math.random()) : rnd(a, b), c);
  }
  const SLIDER_TIP = {
    Scale: "How large the pattern is drawn", Detail: "Layers of finer detail on top of the main shape", Warp: "Bends the pattern with a slow, smooth push",
    "Warp size": "How broad the bends are", Liquify: "Swirls the pattern like stirred paint", "Liquify size": "How broad the swirls are", Cells: "Round spots of other colors in dark rims, like an acrylic pour",
    Features: "How many hills and dips the shape has", Bulge: "Swells the middle outward or pinches it in", "Bulge size": "How far the bulge reaches",
    Falloff: "How quickly a point fades into its surroundings", Strength: "How high the point lifts, or how deep it sinks",
    Count: "How many lines are drawn", Gap: "Space between neighboring lines", Bias: "Bunches lines toward the low or the high ground",
    Thickness: "Width of each band", Weight: "Line thickness", Swell: "Lines thicken toward the peaks", "Swell size": "How far the thickening spreads",
    Taper: "Lines thin out toward their ends", "Accent every": "Draws every nth line heavier, like index lines on a map", "Accent weight": "Thickness of the heavier lines",
    Smooth: "Rounds off small kinks in the lines", Grid: "Tracing grid. Smaller follows the shape more closely", Clean: "Drops short scraps of line",
    Softness: "How gently neighboring colors blend", Stretch: "Pulls the pattern out along its angle", Angle: "Turns the pattern",
    Contrast: "Pushes colors apart toward the ends of the palette", Size: "How large the body of light is", Wobble: "How far its outline bends",
    Edge: "How softly the body fades into the background", Lines: "How many rings sit inside the body", "Line width": "Thickness of the rings",
    "Line light": "How bright the rings glow", "Color turn": "Turns the colors round the body",
    Opacity: "See-through amount", Refraction: "How strongly it bends what's behind it", Frost: "Blurs what's seen through the glass",
    Dispersion: "Splits colors at the edges like a prism", Highlight: "Brightness of the light caught on the rim", Shine: "Strength of the highlight",
    Ripple: "Ripples running over the surface", Tilt: "Leans it toward or away from you", Spin: "Turns it round its own axis", Rotate: "Turns it flat on the canvas",
    Speed: "Its own pace within the loop. Negative runs backward", Amplitude: "How far things move", "Loop length": "Seconds before the motion repeats",
    Caustics: "The bright web of light a pool casts on its floor", Grain: "Fine film grain", Intensity: "How strong the effect is",
  };
  const INFO_I = `<svg class="info-i" aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.2v3.8M8 5h.01"/></svg>`;
  const FX_TIP = {
    "halftone.tone": "Sizes dots by lightness, even in color",
    "halftone.classic": "Triangles point one way, like a print",
    "halftone.even": "Every shape reads the same tone",
    "halftone.merge": "Dark dots grow into each other",
    "wave.length": "Distance between wave crests", "swirl.amount": "Turns at the center. Negative twists back",
    "swirl.radius": "How far from the center the twist reaches", "bulge.amount": "Positive swells it outward, negative pinches it in",
    "bulge.radius": "How far from the center the bulge reaches", "ripple.length": "Distance between rings", "ripple.decay": "How far the rings travel before fading",
    "ripple.shade": "Light and shadow on the ring slopes", "sea.scale": "Size of the swells", "sea.caustic": "The sunlight patterns on the floor",
    "sea.chop": "Small choppy waves on top of the swells", "sea.depth": "Tints the picture like deep water", "kaleido.segments": "How many mirrored slices",
    "glass.width": "Width of each glass rib", "mesh.cell": "Size of each glass block", "mesh.merge": "Blocks melt into each other", "mesh.checker": "Every other block", "mesh.radius": "Rounding of the block corners", "mesh.round": "How far each block rounds over", "glass.round": "How far each rib rounds over from its edges", "lens.round": "How far the pane rounds over from its edges", "glass.thick": "How deep the glass is. Thicker glass bends the picture more", "mesh.thick": "Thicker glass bends more", "lens.thick": "How deep the glass is. Thicker glass bends the picture more", "glass.tint": "Frosts the glass milky, like sea glass, with lighter edges", "mesh.tint": "Frosts the glass milky, like sea glass, with lighter edges", "lens.tint": "Frosts the glass milky, like sea glass, with lighter edges", "glass.blend": "Pulls each piece toward one color", "mesh.blend": "Pulls each piece toward one color", "lens.blend": "Pulls each piece toward one color", "mesh.stretch": "Widens each block into an oval or a bar", "glass.texture": "Dimples the surface with small bumps, like patterned glass", "mesh.texture": "Dimples the surface with small bumps, like patterned glass", "lens.texture": "Dimples the surface with small bumps, like patterned glass",
    "dof.amount": "How blurry the parts out of focus get", "dof.focus": "Size of the area that stays sharp", "dof.falloff": "How gradually it softens past the sharp area",
    "dof.angle": "Turns the band of focus, like tilting a tilt-shift lens", "dof.bokeh": "Opens bright spots into soft discs, as a camera lens does",
    "blur.amount": "Blur at the softest end", "blur.start": "Where the blur begins to build",
    "bloom.threshold": "Only parts brighter than this glow", "bloom.radius": "How far the glow spreads", "emboss.angle": "Where the light comes from",
    "emboss.depth": "How deep the relief looks", "rays.length": "How far the beams reach from the light", "rays.threshold": "Only parts brighter than this cast beams",
    "gradmap.mix": "Blends the recolored picture with the original", "posterize.levels": "Steps of tone in each color", "heatmap.glow": "Bloom on the hottest areas",
    "chrome.strength": "How deep the metal surface looks", "chrome.bands": "How many reflections run across it", "riso.offset": "How far the ink layers slip out of register",
    "dither.levels": "Steps of tone before dots take over", "dither.pix": "Size of each dot of the pattern", "pixel.bevel": "Raised edges on each pixel",
    "voronoi.edge": "Lines between the cells", "mesh.fade": "Tiles thin out across the canvas", "mesh.fadeAngle": "The direction the tiles fade toward", "touch.life": "How long a ripple lasts", "trail.strength": "How hard a drag pushes the picture",
    "trail.swirl": "How much the trail curls", "trail.life": "How long a trail lasts", "glyphs.change": "How often characters change during the loop", "glyphs.keep": "Changed letters stay changed",
    "glyphs.back": "A dark backdrop behind the characters", "chroma.amount": "How far red and blue slip apart", "paper.crumple": "Creases and folds", "paper.fiber": "Fibres in the paper",
    "dissolve.amount": "Where the solid core ends: tones past it stay whole", "dissolve.edge": "How far past the core cells scatter before they're gone", "dissolve.tint": "How much each cell's color varies",
    "dissolve.dots": "A faint dot grid where cells are gone", "irid.bands": "How many color bands run across the tones", "linescreen.steps": "Snaps line weight to a few steps", "linescreen.hair": "The thinnest a line gets, so every line stays visible", "film.thin": "Film thickness in the darks", "film.thick": "Film thickness in the lights. More gives more rings", "film.kind": "Oil film or holographic foil", "film.index": "How strongly the film bends light", "film.base": "What lies under the film. Higher is bolder", "film.gain": "Brightens the film", "film.vivid": "Saturates the colors past what a real film shows", "irid.pearl": "A soft, milky sheen", "led.off": "How bright the dots stay where the picture is dark",
    "smear.amount": "Share of strips that smear", "smear.jitter": "How much strip lengths differ", "smear.threshold": "Only parts brighter than this smear", "glowlines.dim": "How dark the picture under the lines gets", "guilloche.tone": "How much the picture bends the lines", "linescreen.flow": "How far the lines bend and stream round", "linescreen.dash": "How much of each line is gap between strokes", "guilloche.over": "Shows the picture behind the lines", "ridge.height": "How high bright parts lift each line", "ridge.fill": "Shows the picture under each line", "feedback.decay": "How quickly the copies fade", "feedback.zoom": "How much smaller each copy is", "glitch.speed": "How many times per loop the damage changes", "glitch.amount": "Share of strips and blocks that break", "pixsort.threshold": "Only runs brighter than this sort", "streaks.threshold": "Only parts brighter than this flare", "outline.keep": "How much of the picture stays under the lines", "grid.threshold": "How much change inside a tile makes it split", "glowlines.core": "A sharp line in the middle of each glow",
  };
  const SWEEP_GROUPS = new Set(["shape", "lines", "gradient"]), sweeps = [];
  function makeSlider(host, c) {
    c.fmt ||= (v) => String(v);
    const id = "s-" + Math.random().toString(36).slice(2, 8);
    const row = document.createElement("div");
    row.className = "ctrl";
    row.innerHTML = `<div class="label-row"><label class="label" for="${id}">${c.label}</label><input class="val" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" aria-label="${c.label} value"><button class="ib xs" title="Randomize ${c.label.toLowerCase()}" aria-label="Randomize ${c.label.toLowerCase()}">${ic("dice")}</button></div><input id="${id}" type="range">`;
    const input = row.querySelector("input[type=range]"), val = row.querySelector(".val");
    const tipText = c.tip || SLIDER_TIP[c.label];
    if (tipText) {
      const lab = row.querySelector(".label"); lab.dataset.tip = tipText;
      lab.insertAdjacentHTML("beforeend", INFO_I);
      if (SWEEP_GROUPS.has(c.group) && !c.noSweep) { c._sweep = sweeps.length; lab.dataset.tipPreview = "sweep:" + c._sweep; sweeps.push(c); }
    }
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
      const na = c.na?.() || "";
      row.classList.toggle("na", !!na); input.disabled = val.disabled = !!na;
      if (na) row.dataset.tip = na; else delete row.dataset.tip;
      const lab = row.querySelector(".label");
      if (tipText) { if (na) { lab.dataset.tip = na; delete lab.dataset.tipPreview; } else { lab.dataset.tip = tipText; if (c._sweep != null) lab.dataset.tipPreview = "sweep:" + c._sweep; } }
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
  function makeSwitch(host, label, get, set, tip) {
    const row = document.createElement("label");
    row.className = "label-row switch-row";
    row.innerHTML = `<span class="label"${tip ? ` data-tip="${tip}"` : ""}>${label}${tip ? INFO_I : ""}</span><span class="switch"><input type="checkbox"><span></span></span>`;
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

  const slotWhen = { lines: () => gen() === "contours" };
  const PRESET_KIND = { Lines: "Line preset", Fills: "Fill preset", Gradients: "Gradient preset", Noise: "Noise preset", Effects: "Effect preset" };
  function slotInfo(id) {
    const g = gen(), gr = S.grad, sc = (v) => f2(v) + "×";
    if (id === "preset") { const p = currentPreset(); return p ? [p[1], PRESET_KIND[p[0]]] : ["Custom", "No preset"]; }
    if (id === "generator") return [GEN_LABEL[g], g === "contours" ? "Vector, SVG output" : "Raster, PNG output"];
    if (id === "shape") {
      if (g === "contours") return [patLabel(S.pattern), activePoints() ? `${S.points.length} points, seed ${S.seed}` : `Scale ${S.scale}px, seed ${S.seed}`];
      if (g === "noise") return [NOISE_LABEL[gr.noise], `Scale ${sc(gr.scale)}, seed ${S.seed}`];
      if (g === "aura") return ["Aura", `Size ${sc(gr.scale)}, ${gr.detail} layers`];
      if (g === "wavegrad") return ["Wave", `Twist ${f2(gr.warp)}, blend ${Math.round(gr.contrast * 100)}%`];
      if (g === "paint") return ["Paint", `${gr.detail} steps, swirl ${f2(gr.warp)}`];
      if (g === "folds") return ["Folds", `${f2(gr.scale)}× sheets, wave ${f2(gr.warp)}`];
      if (g === "image") return IMG ? ["Image", `${IMG.el.naturalWidth}×${IMG.el.naturalHeight}px`] : ["Image", "No picture yet"];
      if (g === "flow") return ["Flow field", `Scale ${sc(gr.scale)}, seed ${S.seed}`];
      if (g === "mesh") return ["Mesh", `${gr.colors.length} points, softness ${f2(gr.soft)}`];
      if (g === "radial") return ["Radial", `Warp ${f2(gr.warp)}`];
      return [GEN_LABEL[g], `Angle ${gr.angle}°, warp ${f2(gr.warp)}`];
    }
    if (id === "lines") return S.mode === "lines" ? ["Lines", `${f2(S.weight).replace(/\.?0+$/, "")}px weight, ${linear() ? S.gap + "px gap" : S.levels + " lines"}`] : S.mode === "bands" || S.mode === "shaded" ? [S.mode === "bands" ? "Bands" : "Gradient bands", `${pct(S.band)} thick, ${linear() ? S.gap + "px gap" : S.levels + " bands"}`] : ["Layers", linear() ? `${S.gap}px gap` : `${S.levels} layers`];
    if (id === "colors") {
      const p = currentPal(), n = inksOf().length;
      return [p ? p.name : "Custom", g === "contours" ? `${n} colors${S.gradient || S.mode === "layers" || S.mode === "shaded" ? ", blended" : ""}` : `${n} colors`];
    }
    return ["", ""];
  }
  function fxFact(id) { const p = FXI[id].p.find((q) => q.k); if (!p) return FXI[id].cat; const v = S.fx[id][p.k]; return `${window.I18N?.t(p.label) ?? p.label} ${p.fmt ? p.fmt(v) : v}`; }
  const slotColors = () => (gen() === "contours" ? (S.gradient || S.mode === "layers" || S.mode === "shaded" || S.mids.length ? [S.bg, S.line, ...S.mids, S.line2] : [S.bg, S.line]) : S.grad.colors);
  let slotKey = "";
  const SLOT_DEFS = [["preset", "Preset"], ["generator", "Generator"], ["shape", "Shape"], ["lines", "Lines"], ["colors", "Colors"]];
  const slotEls = {};
  const slotList = $("slotList");
  SLOT_DEFS.forEach(([id, label]) => {
    const wrap = document.createElement("div");
    wrap.className = "slot slot-" + id;
    wrap.innerHTML = `<div class="slot-label">${label}</div><button class="tile" data-slot="${id}"><span class="tile-th" data-th="${id}">${id === "colors" ? `<span class="tile-sw"></span>` : ""}</span><span class="tile-text"><b></b><small></small></span>${ic("next", "go")}</button>`;
    slotList.appendChild(wrap); slotEls[id] = wrap;
  });
  const objSlot = document.createElement("div");
  objSlot.className = "slot slot-fx slot-obj";
  objSlot.innerHTML = `<div class="slot-label">Objects<span class="count" hidden></span></div><div class="fx-tiles" id="objTiles"><button class="tile add" data-slot="addobj"><span class="tile-plus">${ic("plus")}</span><span class="tile-text"><b>Add object</b><small>Optional</small></span></button></div>`;
  slotList.appendChild(objSlot);
  const countText = (n) => (n > 99 ? "∞" : String(n));
  const objTiles = objSlot.querySelector(".fx-tiles"), objAdd = objSlot.querySelector(".tile.add"), objCount = objSlot.querySelector(".count");
  const objOf = () => (P.slot.startsWith("obj:") ? S.objects.find((o) => o.id === P.slot.slice(4)) : null);
  const objName = (o) => { const same = S.objects.filter((x) => x.kind === o.kind); return OBJ_LABEL[o.kind] + (same.length > 1 ? " " + (same.indexOf(o) + 1) : ""); };
  const objFact = (o) => `${MAT_LABEL[o.mat] || "Shaded"}, ${Math.round(o.size * 100)}% wide`;
  const rowBtns = (k) => `<span class="row-tools"><button class="ib xs row-eye" data-eye="${k}" aria-label="Hide" title="Hide">${ic("eye")}</button><button class="ib xs row-copy" data-copy="${k}" aria-label="Copy" title="Copy">${ic("copy")}</button></span>`;
  const gone = new Map();
  const cloneThumb = (n) => { if (n.tagName !== "CANVAS") return n.cloneNode(true); const c = document.createElement("canvas"); c.width = n.width; c.height = n.height; c.getContext("2d").drawImage(n, 0, 0); return c; };
  let clip = null;
  function toggleHidden(k) {
    const it = k.startsWith("fx:") ? S.fx[k.slice(3)] : S.objects.find((o) => o.id === k.slice(4));
    if (!it) return;
    if (it.hidden) delete it.hidden; else it.hidden = true;
    update();
  }
  function copyItem(k) {
    if (k.startsWith("fx:")) { const id = k.slice(3); const { on, hidden, ...v } = S.fx[id]; clip = { k: "fx", id, v: clone(v), name: FXI[id].name }; }
    else { const o = S.objects.find((x) => x.id === k.slice(4)); if (!o) return; const { id, hidden, ...v } = o; clip = { k: "obj", v: clone(v), name: objName(o) }; }
    toast(`${window.I18N?.t("Copied") ?? "Copied"} ${window.I18N?.t(clip.name) ?? clip.name}`);
    slotKey = ""; renderSlots();
  }
  function pasteItem(kind) {
    if (!clip || clip.k !== kind) return;
    if (kind === "fx") { delete S.fx[clip.id].hidden; addFx(clip.id, clone(clip.v)); P.slot = "fx:" + clip.id; }
    else {
      if (S.objects.length >= 8) { toast("Up to 8 objects"); return; }
      const o = { ...OBJ_DEFAULT, ...clone(clip.v), id: objId() };
      while (S.objects.some((x) => Math.hypot(x.x - o.x, x.y - o.y) < 0.02)) { o.x = +Math.min(0.95, o.x + 0.05).toFixed(3); o.y = +Math.min(0.95, o.y + 0.05).toFixed(3); if (o.x >= 0.95 && o.y >= 0.95) break; }
      S.objects.push(o); P.slot = "obj:" + o.id;
    }
    update(); schedulePreviews(0);
  }
  function syncPaste() {
    for (const [kind, slot] of [["fx", fxSlot], ["obj", objSlot]]) {
      const b = slot.querySelector(".row-paste"), on = clip?.k === kind;
      if (b.hidden === !on && (!on || b.dataset.name === clip.name)) continue;
      b.hidden = !on;
      if (on) { b.dataset.name = clip.name; b.title = `${window.I18N?.t("Paste") ?? "Paste"} ${window.I18N?.t(clip.name) ?? clip.name}`; if (animOK()) b.animate([{ opacity: 0, transform: "translateX(-4px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: EASE }); }
    }
  }
  function reuseThumb(t, k) { const g = gone.get(k); if (!g) return; gone.delete(k); g.forEach((n) => n.classList.remove("fresh")); t.querySelector(".tile-th").replaceChildren(...g); }
  const isHidden = (k) => (k.startsWith("fx:") ? !!S.fx[k.slice(3)]?.hidden : !!S.objects.find((o) => o.id === k.slice(4))?.hidden);
  function syncEye(t, k) {
    const h = isHidden(k), b = t.querySelector(".row-eye");
    t.classList.toggle("off", h);
    if (b.dataset.h === String(h)) return;
    b.dataset.h = String(h); b.innerHTML = ic(h ? "eyeoff" : "eye");
    const l = window.I18N?.t(h ? "Show" : "Hide") ?? (h ? "Show" : "Hide"); b.title = l; b.setAttribute("aria-label", l);
  }
  function objTile(o) {
    const t = document.createElement("div");
    t.className = "tile fx obj"; t.dataset.obj = o.id;
    t.innerHTML = `<span class="grip" aria-label="Drag to reorder. Lower ones draw on top">${ic("grip")}</span><button class="tile-main" data-slot="obj:${o.id}"><span class="tile-th" data-th="obj:${o.id}"></span><span class="tile-text"><b></b><small></small></span></button>${rowBtns("obj:" + o.id)}<button class="ib xs" data-remove-obj="${o.id}" aria-label="Remove" title="Remove">${ic("x")}</button>`;
    reuseThumb(t, "obj:" + o.id);
    try { t.querySelector(".tile-th").style.setProperty("--ph", phOf(S)); } catch (e) {}
    return t;
  }
  function renderObjTiles() {
    const have = new Map([...objTiles.querySelectorAll("[data-obj]:not(.leaving)")].map((n) => [n.dataset.obj, n]));
    for (const o of S.objects) {
      let t = have.get(o.id);
      if (!t) { t = objTile(o); fresh.add(t); }
      objTiles.insertBefore(t, objAdd); have.delete(o.id);
      t.classList.toggle("on", P.slot === "obj:" + o.id);
      setText(t.querySelector("b"), objName(o)); setText(t.querySelector("small"), o.hidden ? "Hidden" : objFact(o)); syncEye(t, "obj:" + o.id);
    }
    for (const t of have.values()) leave(t);
    objAdd.classList.toggle("on", P.slot === "addobj");
    objCount.hidden = !S.objects.length; objCount.textContent = countText(S.objects.length);
  }
  const fxSlot = document.createElement("div");
  fxSlot.className = "slot slot-fx";
  fxSlot.innerHTML = `<div class="slot-label">Effects<span class="count" hidden></span></div><div class="fx-tiles" id="fxTiles"><button class="tile add" data-slot="addfx"><span class="tile-plus">${ic("plus")}</span><span class="tile-text"><b>Add effect</b><small></small></span></button></div>`;
  slotList.appendChild(fxSlot);
  const fxTiles = fxSlot.querySelector(".fx-tiles"), addTile = fxSlot.querySelector(".tile.add"), countEl = fxSlot.querySelector(".count");
  const motionSlot = document.createElement("div");
  motionSlot.className = "slot slot-motion";
  motionSlot.innerHTML = `<div class="slot-label">Motion</div><button class="tile" data-slot="motion"><span class="tile-th" data-th="motion"></span><span class="tile-text"><b></b><small></small></span>${ic("next", "go")}</button>`;
  slotList.appendChild(motionSlot);
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  const stackOpen = { fx: false, obj: false };
  for (const [k, slot] of [["fx", fxSlot], ["obj", objSlot]]) {
    const sum = document.createElement("span"); sum.className = "stack-sum"; sum.setAttribute("aria-hidden", "true");
    slot.querySelector(".fx-tiles").insertBefore(sum, slot.querySelector(".tile.add"));
    const pb = document.createElement("button"); pb.className = "stack-fold row-paste"; pb.dataset.kind = k; pb.textContent = "Paste"; pb.hidden = true;
    slot.querySelector(".slot-label").appendChild(pb);
    const b = document.createElement("button"); b.className = "stack-fold"; b.textContent = "Fold"; b.hidden = true;
    b.onclick = () => { stackOpen[k] = false; slotKey = ""; renderSlots(); };
    slot.querySelector(".slot-label").appendChild(b);
    slot.addEventListener("click", (e) => {
      if (!slot.classList.contains("folded")) return;
      const card = e.target.closest(".tile.fx");
      if (!card && !e.target.closest(".stack-sum")) return;
      e.stopPropagation(); stackOpen[k] = true; slotKey = "";
      if (card) setSlot(card.dataset.fx ? "fx:" + card.dataset.fx : "obj:" + card.dataset.obj); else renderSlots();
    }, true);
  }
  function spread(slot) {
    const open = !slot.classList.contains("folded");
    [...slot.querySelectorAll(".tile.fx:not(.leaving), .stack-sum, .tile.add")].forEach((t, i) => t.animate(open ? [{ opacity: 0, transform: "translateY(-10px) scale(.97)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0, transform: "translateX(-12px)" }, { opacity: getComputedStyle(t).opacity }], { duration: 300, delay: i * 40, easing: EASE, fill: "backwards", composite: "replace" }));
  }
  function syncStacks() {
    for (const [k, slot, n] of [["fx", fxSlot, S.fxOrder.length], ["obj", objSlot, S.objects.length]]) {
      const deck = n >= 2;
      if (!deck) stackOpen[k] = false;
      const names = (k === "fx" ? S.fxOrder.map((id) => FXI[id].name) : S.objects.map(objName)).map((x) => window.I18N?.t(x) ?? x);
      slot.querySelector(".stack-sum").innerHTML = `<b>${names.join(", ")}</b><small>${names.length} ${k === "fx" ? "effects" : "objects"}</small>`;
      slot.style.setProperty("--n", n);
      slot.classList.toggle("fx-stack", deck); slot.classList.toggle("folded", deck && !stackOpen[k]);
      slot.querySelector(".stack-fold").hidden = !(deck && stackOpen[k]);
      [...slot.querySelectorAll(".tile.fx:not(.leaving)")].forEach((t, i) => t.style.setProperty("--i", i));
    }
  }
  const animOK = () => !reduceMotion.matches && !document.body.classList.contains("boot");
  function setText(el, v) { if (window.I18N && !el.closest('[translate="no"]')) v = I18N.t(v); if (el.textContent === v) return; el.textContent = v; if (animOK()) el.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 200 + Math.random() * 90, easing: EASE }); }
  function fxTile(id) {
    const t = document.createElement("div");
    t.className = "tile fx"; t.dataset.fx = id;
    t.innerHTML = `<span class="grip" aria-label="Drag to reorder ${FXI[id].name}">${ic("grip")}</span><button class="tile-main" data-slot="fx:${id}"><span class="tile-th" data-th="fx:${id}"></span><span class="tile-text"><b>${FXI[id].name}</b><small></small></span></button>${rowBtns("fx:" + id)}<button class="ib xs" data-remove="${id}" aria-label="Remove ${FXI[id].name}" title="Remove">${ic("x")}</button>`;
    reuseThumb(t, "fx:" + id);
    try { t.querySelector(".tile-th").style.setProperty("--ph", phOf(S)); } catch (e) {}
    return t;
  }
  const fresh = new Set();
  let before = new Map();
  const tileKey = (n) => (n.dataset.fx ? "fx:" + n.dataset.fx : n.dataset.obj ? "obj:" + n.dataset.obj : n.dataset.slot);
  const rel = (n) => { const r = n.getBoundingClientRect(), s = n.closest(".slot").getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
  function leave(t) {
    const b = before.get(tileKey(t)), th = t.querySelector(".tile-th");
    if (th?.children.length) gone.set(tileKey(t), [...th.children].map(cloneThumb));
    if (!animOK() || !b) { t.remove(); return; }
    const box = t.parentNode, c = rel(box);
    t.classList.add("leaving"); box.appendChild(t);
    Object.assign(t.style, { position: "absolute", margin: "0", left: b.x - c.x + "px", top: b.y - c.y + "px", width: b.w + "px", height: b.h + "px", pointerEvents: "none" });
    t.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 260, easing: EASE, fill: "forwards" }).onfinish = () => t.remove();
  }
  function renderSlots() {
    const key = JSON.stringify([gen(), S.fxOrder, P.slot, ...SLOT_DEFS.map(([id]) => slotInfo(id)), slotColors(), S.motion, S.fxOrder.map(fxFact), S.fxOrder.map((id) => !!S.fx[id].hidden), S.objects.map((o) => [o.id, objName(o), objFact(o), !!o.hidden]), clip?.k]);
    if (key === slotKey) return;
    slotKey = key;
    const tiles = () => [...slotList.querySelectorAll(".tile:not(.leaving)")];
    const anim = animOK(), decks = [objSlot, fxSlot];
    before = anim ? new Map(tiles().filter((n) => n.offsetParent).map((n) => [tileKey(n), rel(n)])) : new Map();
    const below = [objSlot, fxSlot, motionSlot], topOf = (s) => s.getBoundingClientRect().top - slotList.getBoundingClientRect().top;
    const yBefore = anim ? below.map(topOf) : [], modeBefore = decks.map((s) => s.classList.contains("fx-stack") + "" + s.classList.contains("folded"));
    fresh.clear();
    for (const [id] of SLOT_DEFS) {
      const wrap = slotEls[id], t = wrap.querySelector(".tile"), [title, sub] = slotInfo(id);
      const show = !slotWhen[id] || slotWhen[id]();
      if (wrap.hidden === show) wrap.hidden = !show;
      t.classList.toggle("on", P.slot === id);
      const nb = t.querySelector("b");
      if (id === "colors" || (id === "preset" && currentPreset())) nb.setAttribute("translate", "no"); else nb.removeAttribute("translate");
      setText(nb, title); setText(t.querySelector("small"), sub);
    }
    const sw = slotEls.colors.querySelector(".tile-sw"), cols = slotColors();
    if (sw.children.length === cols.length) [...sw.children].forEach((i, n) => (i.style.background = cols[n]));
    else sw.innerHTML = cols.map((c) => `<i style="background:${c}"></i>`).join("");
    const have = new Map([...fxTiles.querySelectorAll("[data-fx]")].filter((n) => !n.classList.contains("leaving")).map((n) => [n.dataset.fx, n]));
    for (const id of S.fxOrder) { let t = have.get(id); if (!t) { t = fxTile(id); fresh.add(t); } fxTiles.insertBefore(t, addTile); t.classList.toggle("on", P.slot === "fx:" + id); have.delete(id); }
    for (const t of have.values()) leave(t);
    addTile.classList.toggle("on", P.slot === "addfx");
    renderObjTiles();
    syncStacks();
    { const t = motionSlot.querySelector(".tile"), m = S.motion; t.classList.toggle("on", P.slot === "motion"); setText(t.querySelector("b"), MOTION_NAME[m.type]); t.classList.toggle("still", m.type === "still"); setText(t.querySelector("small"), m.type === "still" ? "No motion yet" : `${m.dur}s, ${{ loop: "looping", pingpong: "ping-pong", once: "once" }[m.mode]}`); }
    setText(addTile.querySelector("small"), "Optional");
    for (const t of fxTiles.querySelectorAll("[data-fx]:not(.leaving)")) { setText(t.querySelector("small"), S.fx[t.dataset.fx].hidden ? "Hidden" : fxFact(t.dataset.fx)); syncEye(t, "fx:" + t.dataset.fx); }
    syncPaste();
    const n = countText(S.fxOrder.length);
    countEl.hidden = !S.fxOrder.length;
    if (countEl.textContent !== n) { countEl.textContent = n; if (animOK()) countEl.animate([{ transform: "scale(.4)" }, { transform: "scale(1.15)" }, { transform: "none" }], { duration: 320, easing: EASE }); }
    if (anim) {
      const redealt = decks.filter((s, i) => modeBefore[i] !== s.classList.contains("fx-stack") + "" + s.classList.contains("folded"));
      redealt.forEach(spread);
      let n = 0;
      for (const t of tiles()) {
        if (t.offsetParent === null || redealt.includes(t.closest(".slot"))) continue;
        const b = before.get(tileKey(t));
        if (fresh.has(t)) t.animate([{ opacity: 0, transform: "translateY(-6px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: 60 * n++, easing: EASE, fill: "backwards" });
        else if (b && !t.classList.contains("dragging")) { const a = rel(t), dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > 1 || Math.abs(dy) > 1) t.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 300, easing: EASE }); }
      }
      below.forEach((s, i) => { const dy = yBefore[i] - topOf(s); if (Math.abs(dy) > 1 && !s.hidden) s.animate([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: 320, easing: EASE }); });
    }
    schedulePreviews(anim && (fresh.size || slotList.querySelector(".leaving")) ? 360 : 120);
  }
  $("slotList").addEventListener("click", (e) => {
    const eye = e.target.closest("[data-eye]");
    if (eye) { toggleHidden(eye.dataset.eye); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) { copyItem(cp.dataset.copy); return; }
    if (e.target.closest(".row-paste")) { pasteItem(e.target.closest(".row-paste").dataset.kind); return; }
    const ro = e.target.closest("[data-remove-obj]");
    if (ro) { const id = ro.dataset.removeObj; S.objects = S.objects.filter((o) => o.id !== id); if (P.slot === "obj:" + id) P.slot = "addobj"; update(); return; }
    const rm = e.target.closest("[data-remove]");
    if (rm) { const id = rm.dataset.remove; removeFx(id); if (P.slot === "fx:" + id) P.slot = "addfx"; update(); return; }
    const t = e.target.closest("[data-slot]");
    if (t) setSlot(t.dataset.slot);
  });
  $("slotList").addEventListener("pointerdown", (e) => {
    const grip = e.target.closest(".grip");
    if (!grip || grip.closest(".fx-stack.folded")) return;
    e.preventDefault();
    const tile = grip.closest("[data-fx], [data-obj]"), isObj = !!tile.dataset.obj, attr = isObj ? "data-obj" : "data-fx";
    const id = isObj ? tile.dataset.obj : tile.dataset.fx;
    const list = () => (isObj ? S.objects : S.fxOrder), at = (i) => (isObj ? list()[i].id : list()[i]);
    $("slotList").querySelector(`[${attr}="${id}"]`)?.classList.add("dragging");
    const move = (ev) => {
      const items = [...$("slotList").querySelectorAll(`[${attr}]:not(.leaving)`)];
      let idx = items.findIndex((it) => { const r = it.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (idx < 0) idx = items.length;
      const cur = list().findIndex((_, i) => at(i) === id);
      if (idx > cur) idx--;
      if (idx !== cur) { const [x] = list().splice(cur, 1); list().splice(idx, 0, x); renderSlots(); update({ instant: true, commit: false }); }
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); $("slotList").querySelector(".dragging")?.classList.remove("dragging"); commit(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });

  const PANEL_TITLE = { preset: "Preset", generator: "Generator", shape: "Shape", lines: "Lines", colors: "Colors", addobj: "Add object", object: "Object", addfx: "Add effect", motion: "Motion" };
  function setSlot(id) {
    picker.close();
    if (id === "colors" && P.slot !== "colors") revealPalette();
    P.slot = id; savePrefs();
    syncUI(); drawOverlay();
    $("options").scrollTop = 0;
    if (window.matchMedia("(max-width: 900px)").matches) $("options").scrollIntoView({ behavior: "smooth", block: "start" });
    schedulePreviews(0);
  }
  function panelOf(slot) { return slot.startsWith("fx:") ? "effect" : slot.startsWith("obj:") ? "object" : slot; }
  const fxOf = () => (P.slot.startsWith("fx:") ? P.slot.slice(3) : null);

  const optDice = document.createElement("button");
  optDice.className = "ib"; optDice.innerHTML = ic("dice");
  optDice.onclick = () => {
    const p = panelOf(P.slot), g = gen();
    if (p === "preset") { surprise(); return; }
    if (p === "generator") setGen(pick(GENS.filter((x) => x[0] !== g && (x[0] !== "image" || IMG)))[0]);
    else if (p === "shape") { if (g === "contours") randomizeGroup("shape"); else { randomizeGroup("gradient"); if (g === "mesh") scatterGrad(); } S.seed = newSeed(); }
    else if (p === "lines") { S.mode = pick(["lines", "lines", "bands", "layers", "shaded"]); Object.assign(S, readable(S)); randomizeGroup("lines"); }
    else if (p === "colors") randomPalette();
    else if (p === "effect") { randomizeFx(fxOf()); }
    else if (p === "addfx") { randomEffects(); }
    else if (p === "addobj") { addObject(pick(OBJ_KINDS.filter(([k]) => k !== "image"))[0]); return; }
    else if (p === "object") {
      const o = objOf();
      if (o) Object.assign(o, { rot: Math.round(rnd(-35, 35)), tilt: Math.round(rnd(-30, 45)), spin: Math.round(rnd(-90, 90)), shine: +rnd(0.3, 0.9).toFixed(2), ...(o.kind === "image" ? { mat: pick(["photo", "palette"]) } : { kind: pick(OBJ_KINDS.filter(([k]) => k !== "image"))[0], mat: pick(["shaded", "shaded", "design", "glass", "preset"]), preset: pick(PRESETS)[1] }) });
    }
    else if (p === "motion") {
      if (S.motion.type === "still" || Math.random() < 0.6) S.motion.type = pick(["drift", "flow", "breathe", "pulse"].filter((x) => x !== S.motion.type));
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
    c.querySelector(".card-label").setAttribute("translate", "no");
    $("presetGrid").appendChild(c);
    return { el: c, group, name, look, done: false };
  });

  const IMG_KEY = "isoline.image";
  let IMG = null;
  const imgCache = new Map();
  function loadImg(url, id, then) {
    const el = new Image();
    el.onload = () => { IMG = { id, url, el }; imgCache.clear(); then?.(); if (gen() === "image") update({ fade: true }); else buildPreviews(); };
    el.src = url;
  }
  try { const v = JSON.parse(localStorage.getItem(IMG_KEY) || "null"); if (v?.url) loadImg(v.url, v.id); } catch (e) {}
  function imageCanvas(st, w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const key = `${IMG?.id || st.grad.colors.join()}|${w}x${h}`;
    if (imgCache.has(key)) return imgCache.get(key);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    if (IMG) { const iw = IMG.el.naturalWidth, ih = IMG.el.naturalHeight, sc = Math.max(w / iw, h / ih); x.drawImage(IMG.el, (w - iw * sc) / 2, (h - ih * sc) / 2, iw * sc, ih * sc); }
    else {
      const cols = st.grad.colors, g = x.createLinearGradient(0, 0, w, h);
      cols.forEach((col, i) => g.addColorStop(i / Math.max(1, cols.length - 1), col)); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const u = Math.min(w, h) / 10; x.fillStyle = "rgba(255,255,255,.55)";
      x.beginPath(); x.arc(w / 2 + u * 1.4, h / 2 - u * 1.2, u * 0.8, 0, 7); x.fill();
      x.beginPath(); x.moveTo(w / 2 - u * 3, h / 2 + u * 2); x.lineTo(w / 2 - u * 0.8, h / 2 - u * 0.6); x.lineTo(w / 2 + u * 0.6, h / 2 + u); x.lineTo(w / 2 + u * 1.6, h / 2); x.lineTo(w / 2 + u * 3, h / 2 + u * 2); x.closePath(); x.fill();
    }
    if (imgCache.size > 8) imgCache.delete(imgCache.keys().next().value);
    imgCache.set(key, c);
    return c;
  }
  function pickImage() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const raw = new Image();
        raw.onload = () => {
          const sc = Math.min(1, 2400 / Math.max(raw.naturalWidth, raw.naturalHeight)), c = document.createElement("canvas");
          c.width = Math.round(raw.naturalWidth * sc); c.height = Math.round(raw.naturalHeight * sc);
          c.getContext("2d").drawImage(raw, 0, 0, c.width, c.height);
          const url = f.type === "image/png" && f.size < 1.5e6 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9), id = Date.now().toString(36);
          try { localStorage.setItem(IMG_KEY, JSON.stringify({ id, url })); } catch (e) { toast("Too large to keep after a reload"); }
          loadImg(url, id, () => { S.source = "gradient"; S.grad.type = "image"; S.grad.image = id; sel = null; });
        };
        raw.onerror = () => toast("Couldn't read that image");
        raw.src = r.result;
      };
      r.readAsDataURL(f);
    };
    inp.click();
  }

  const genCards = {};
  for (const [id, label, sub] of GENS) {
    const c = card(label, () => { if (id === "image" && !IMG) return pickImage(); if (gen() !== id) { setGen(id); update({ fade: true }); } }, sub);
    if (id === "mesh") { c.dataset.tip = "Drag the dots on the canvas to move colors. Double-click to add one"; c.dataset.tipMedia = "mesh-drag"; }
    $("genGrid").appendChild(c); genCards[id] = c;
  }

  const selPoint = () => (S.source === "contours" && sel != null ? S.points[sel] : null);
  const k = (key) => bindKey(() => S, key);
  const patCards = {};
  for (const p of T.PATTERNS) { const c = card(p.label, () => { S.pattern = p.id; update({ fade: true }); }); $("patterns").appendChild(c); patCards[p.id] = c; }
  const noiseCards = {};
  const NOISE_TIP = { clouds: "Soft, billowing noise", ridges: "Sharp crests like mountain ridges", billow: "Puffy, rounded swells", cells: "Stone-like cells", veins: "Thin lines between cells", marble: "Banded, swirling stone", neuro: "Knotted, glowing filaments", ring: "A soft ring of smoke", smoke: "Curling veils of smoke" };
  for (const [id, label] of NOISE_TYPES) { const c = card(label, () => { S.grad.noise = id; update({ fade: true }); }); c.dataset.tip = NOISE_TIP[id]; $("noiseTypes").appendChild(c); noiseCards[id] = c; }
  $("imgReplace").onclick = () => pickImage();
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
    { label: "Size", ...bindKey(gr, "scale"), min: 0.3, max: 4, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.8, 2.2], when: isG("aura") },
    { label: "Wobble", ...bindKey(gr, "warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 1.1], when: isG("aura") },
    { label: "Edge", ...bindKey(gr, "soft"), min: 0.5, max: 4, step: 0.05, fmt: f2, rand: [1, 2.6], when: isG("aura") },
    { label: "Layers", ...bindKey(gr, "detail"), min: 1, max: 4, step: 1, rand: [2, 4], when: isG("aura") },
    { label: "Rays", ...bindKey(gr, "stretch"), min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.4, 1.6], when: isG("aura") },
    { label: "Outline", ...bindKey(gr, "contrast"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0.3], when: isG("aura") },
    { label: "Color turn", ...bindKey(gr, "angle"), min: -180, max: 180, step: 1, fmt: deg, when: isG("aura") },
    { label: "Angle", ...bindKey(gr, "angle"), min: -180, max: 180, step: 1, fmt: deg, when: isG("wavegrad", "paint", "folds") },
    { label: "Scale", ...bindKey(gr, "scale"), min: 0.2, max: 5, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.6, 1.8], when: isG("paint") },
    { label: "Swirl", ...bindKey(gr, "warp"), min: 0, max: 4, step: 0.01, fmt: f2, rand: [0.8, 2.4], when: isG("paint") },
    { label: "Flow steps", ...bindKey(gr, "detail"), min: 1, max: 8, step: 1, rand: [3, 7], when: isG("paint") },
    { label: "Bands", ...bindKey(gr, "stretch"), min: 0.5, max: 12, step: 0.05, log: true, fmt: f2, rand: [1.5, 5], when: isG("paint") },
    { label: "Softness", ...bindKey(gr, "soft"), min: 0.02, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.15, 0.8], when: isG("paint") },
    { label: "Chaos", ...bindKey(gr, "warpScale"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 1], when: isG("paint") },
    { label: "Veins", ...bindKey(gr, "contrast"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.2, 0.9], when: isG("paint") },
    { label: "Cells", ...bindKey(gr, "cells"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0, 0], when: isG("paint") },
    { label: "Sheets", ...bindKey(gr, "scale"), min: 0.3, max: 6, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.8, 3], when: isG("folds") },
    { label: "Curve", ...bindKey(gr, "warpScale"), min: -2, max: 2, step: 0.01, fmt: f2, rand: [-1.2, 1.2], when: isG("folds") },
    { label: "Wave", ...bindKey(gr, "warp"), min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.2, 1.2], when: isG("folds") },
    { label: "Wavelength", ...bindKey(gr, "stretch"), min: 0.2, max: 6, step: 0.01, log: true, fmt: f2, rand: [0.6, 2.5], when: isG("folds") },
    { label: "Jag", ...bindKey(gr, "detail"), min: 1, max: 6, step: 1, rand: [1, 2], when: isG("folds") },
    { label: "Softness", ...bindKey(gr, "soft"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.2, 0.8], when: isG("folds") },
    { label: "Rim", ...bindKey(gr, "contrast"), min: 0, max: 1.5, step: 0.01, fmt: pct, pct: true, rand: [0.4, 1.2], when: isG("folds") },
    { label: "Prism", ...bindKey(gr, "prism"), min: 0, max: 1.5, step: 0.01, fmt: f2, rand: [0, 0.8], when: isG("folds") },
    { label: "Frequency", ...bindKey(gr, "scale"), min: 0.1, max: 6, step: 0.01, fmt: f2, rand: [0.5, 2], when: isG("wavegrad") },
    { label: "Ripples", ...bindKey(gr, "stretch"), min: 0.1, max: 8, step: 0.05, fmt: f2, rand: [2, 7], when: isG("wavegrad") },
    { label: "Twist", ...bindKey(gr, "warp"), min: 0, max: 4, step: 0.01, fmt: f2, rand: [1.2, 2.8], when: isG("wavegrad") },
    { label: "Softness", ...bindKey(gr, "soft"), min: 0.01, max: 2, step: 0.01, fmt: f2, rand: [0.4, 1.2], when: isG("wavegrad") },
    { label: "Blend", ...bindKey(gr, "contrast"), min: 0, max: 1, step: 0.01, fmt: pct, pct: true, rand: [0.35, 0.8], when: isG("wavegrad") },
    { label: "Detail", ...bindKey(gr, "detail"), min: 1, max: 8, step: 1, rand: [2, 4], when: isG("flow", "noise"), na: () => (gen() === "noise" && ["cells", "veins", "neuro", "ring"].includes(S.grad.noise) ? `${NOISE_LABEL[S.grad.noise]} has no detail setting` : "") },
    { label: "Softness", ...bindKey(gr, "soft"), min: 0.5, max: 4, step: 0.05, fmt: f2, rand: [1.3, 2.2], when: isG("mesh") },
    { label: "Warp", ...bindKey(gr, "warp"), min: 0, max: 2, step: 0.01, fmt: f2, rand: [0.3, 0.8], when: () => !["image", "aura", "wavegrad", "paint", "folds"].includes(gen()) },
    { label: "Warp size", ...bindKey(gr, "warpScale"), min: 0.2, max: 8, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [1, 2.5], when: () => isG("mesh", "linear", "radial", "conic")() && S.grad.warp > 0 },
    { label: "Stretch", ...bindKey(gr, "stretch"), min: 0.3, max: 5, step: 0.05, log: true, fmt: (v) => f2(v) + "×", rand: [1, 2.4], when: isG("flow", "noise") },
    { label: "Angle", ...bindKey(gr, "angle"), min: -180, max: 180, step: 1, fmt: deg, when: isG("linear", "conic", "flow", "noise"), na: () => (gen() === "noise" && S.grad.noise === "ring" ? "A smoke ring looks the same at any angle" : "") },
    { label: "Contrast", ...bindKey(gr, "contrast"), min: 0.3, max: 3, step: 0.01, fmt: f2, rand: [0.8, 1.3], when: isG("flow", "noise") },
  ].forEach((c) => makeSlider($("gradCtrls"), { group: "gradient", ...c }));
  $("seed").onchange = (e) => { S.seed = clamp(Math.floor(+e.target.value || 0), 0, 999999); update({ fade: true }); };
  const variationSeed = (i) => (S.seed * 31 + (i + 1) * 7919) % 999999;

  const modeCards = {};
  for (const [id, label, sub] of [["lines", "Lines", "Strokes"], ["bands", "Bands", "Filled stripes"], ["layers", "Layers", "Stacked fills"], ["shaded", "Gradient", "Shaded stripes"]]) {
    const c = card(label, () => { S.mode = id; if (S.line && S.bg) Object.assign(S, readable(S)); update({ fade: true }); }, sub);
    $("modes").appendChild(c); modeCards[id] = c;
  }
  const lineMode = () => S.mode === "lines";
  [
    { label: "Count", ...k("levels"), min: 2, max: 120, step: 1, rand: [10, 30], hard: [1, 4000], when: () => !linear() },
    { label: "Gap", ...k("gap"), min: 2, max: 200, step: 0.5, log: true, fmt: px, rand: [12, 36], hard: [0.5, 5000], when: linear },
    { label: "Bias", ...k("bias"), min: -2, max: 2, step: 0.05, fmt: (v) => (v === 0 ? "Even" : f2(v)), rand: [-0.6, 0.6], when: () => !linear() },
    { label: "Thickness", ...k("band"), pct: true, min: 0.02, max: 0.98, step: 0.01, fmt: pct, rand: [0.35, 0.6], hard: [0.01, 0.99], when: () => S.mode === "bands" || S.mode === "shaded" },
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

  const PER_PAGE = 9;
  const sameCols = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
  const inksOf = (st = S) => (st.source === "contours" ? [st.line, ...(st.mids || []), st.line2] : st.grad.colors);
  function setInks(arr) {
    if (gen() === "contours") { S.line = arr[0]; S.line2 = arr[arr.length - 1]; S.mids = arr.slice(1, -1); }
    else setGradColors(arr);
  }
  const toLab = (h) => { const [l, c, hh] = toOklch(h); return [l, c * Math.cos((hh * Math.PI) / 180), c * Math.sin((hh * Math.PI) / 180)]; };
  const fromLab = ([l, a, b]) => fromOklch(l, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360);
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
    ].map(([name, colors]) => ({ name: window.I18N?.t(name) ?? name, colors, group: "Suggested" }));
    const mine = cols.map(toLab), dist = (p) => p.colors.map(toLab).reduce((a, x) => a + Math.min(...mine.map((y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]))), 0) / p.colors.length;
    for (const p of PALS.filter((p) => !palMatches(p)).sort((a, b) => dist(a) - dist(b)).slice(0, 1)) out.push({ ...p, group: "Suggested" });
    return out;
  }
  const palEl = $("palettes");
  const savedPals = () => (window.Palettes?.saved() || []).map((p) => ({ name: p.name, colors: p.colors, group: "Saved" }));
  const tabs = () => ["Suggested", ...PAL_GROUPS.map(([g]) => g), "Saved"];
  const TAB_TIP = { Suggested: "Built from the colors you have", Curated: "Hand-picked palettes", Brands: "Colors from well-known brands", Saved: "Saved in the palette tool" };
  function renderTabs() { $("palTabs").innerHTML = tabs().map((g) => `<button data-v="${g}" data-tip="${TAB_TIP[g] || g}">${g}</button>`).join(""); if (!tabs().includes(P.palTab)) P.palTab = "Curated"; palKey = ""; }
  addEventListener("palettes-saved", () => { renderTabs(); if (panelOf(P.slot) === "colors") renderPalettes(); });
  P.palTab ||= "Curated"; P.palPage ||= 0;
  let sugList = [];
  const hueKey = (p) => {
    const best = p.colors.map((hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [d, (h * 60 + 360) % 360]; }).reduce((a, x) => (x[0] > a[0] ? x : a));
    return best[0] < 0.12 ? -1 + best[0] : best[1];
  };
  const sorted = (list) => P.palSort === "name" ? list.slice().sort((a, b) => a.name.localeCompare(b.name)) : P.palTab === "Saved" ? list.slice().sort((a, b) => hueKey(a) - hueKey(b)) : list;
  const COLOR_ORDER = new Map(PALS.slice().sort((a, b) => hueKey(a) - hueKey(b)).map((p, i) => [p, i]));
  const palList = () => (P.palTab === "Suggested" ? sugList : sorted(P.palTab === "Saved" ? savedPals() : PALS.filter((p) => p.group === P.palTab).sort((a, b) => COLOR_ORDER.get(a) - COLOR_ORDER.get(b))));
  const syncSort = () => { $("palSort").querySelector("span").textContent = P.palSort === "name" ? "Name" : "Color"; $("palSort").hidden = P.palTab === "Suggested"; };
  $("palSort").onclick = () => { P.palSort = P.palSort === "name" ? "color" : "name"; const p = currentPal(); P.palPage = p && palList().includes(p) ? Math.floor(palList().indexOf(p) / PER_PAGE) : 0; savePrefs(); palKey = ""; syncSort(); renderPalettes(1); };
  const pageCount = () => Math.max(1, Math.ceil(palList().length / PER_PAGE));
  let palKey = "", shown = [];
  renderTabs();
  function renderPalettes(dir = 0) {
    const page = clamp(P.palPage, 0, pageCount() - 1), contours = gen() === "contours";
    syncSort();
    const key = JSON.stringify([P.palTab, P.palSort, page, contours, inksOf().length, P.palTab === "Suggested" ? sugList.map((p) => p.colors) : 0]);
    if (key !== palKey) {
      palKey = key;
      shown = palList().slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      palEl.classList.toggle("empty", !shown.length);
      if (!shown.length) palEl.innerHTML = `<div class="pal-empty"><p>Palettes you save in the palette tool show up here.</p><button class="btn sm" data-go-pal>${ic("palette")}Open Palettes</button></div>`;
      else palEl.innerHTML = shown.map((p, i) => {
        const f = fitPal(p);
        const sw = contours ? `<span class="pal-sw" style="background:${f.bg}">${f.inks.map((c) => `<i style="background:${c}"></i>`).join("")}</span>` : `<span class="pal-bar" style="background:linear-gradient(90deg,${f.inks.join(",")})"></span>`;
        return `<button class="pal" data-i="${i}">${sw}<span translate="no">${p.name}</span></button>`;
      }).join("");
      if (dir) { palEl.classList.remove("from-l", "from-r"); void palEl.offsetWidth; palEl.classList.add(dir > 0 ? "from-r" : "from-l"); }
    }
    [...palEl.children].forEach((b, i) => b.classList.toggle("on", !!shown[i] && palMatches(shown[i])));
    $("palDots").innerHTML = Array.from({ length: pageCount() }, (_, i) => `<i class="${i === page ? "on" : ""}"></i>`).join("");
    $("palPrev").disabled = page <= 0; $("palNext").disabled = page >= pageCount() - 1;
    $("palDots").parentElement.classList.toggle("off", pageCount() <= 1);
    for (const b of $("palTabs").children) b.classList.toggle("on", b.dataset.v === P.palTab);
  }
  palEl.onclick = (e) => { if (e.target.closest("[data-go-pal]")) { $("toPalettes").click(); return; } const b = e.target.closest("[data-i]"); if (!b) return; applyPal(shown[+b.dataset.i]); update(); };
  const turnPage = (d) => { const n = clamp(P.palPage + d, 0, pageCount() - 1); if (n === P.palPage) return; P.palPage = n; savePrefs(); renderPalettes(d); };
  $("palPrev").onclick = () => turnPage(-1);
  $("palNext").onclick = () => turnPage(1);
  $("palTabs").onclick = (e) => {
    const b = e.target.closest("[data-v]"); if (!b || b.dataset.v === P.palTab) return;
    const d = tabs().indexOf(b.dataset.v) > tabs().indexOf(P.palTab) ? 1 : -1;
    if (b.dataset.v === "Suggested") sugList = suggestions();
    P.palTab = b.dataset.v; P.palPage = 0; savePrefs(); renderPalettes(d);
  };
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
  const MAX_INKS = () => (gen() === "contours" ? 6 : 8);
  function renderMine() {
    const el = $("mine"), contours = gen() === "contours", inks = inksOf();
    const shape = JSON.stringify([contours, inks.length, MAX_INKS()]);
    const blendOff = contours && inks.length === 2 && !S.gradient && S.mode !== "layers" && S.mode !== "shaded";
    if (el.dataset.shape === shape) {
      if (contours) el.querySelector('[data-k="bg"] .sw').style.background = S.bg;
      el.querySelectorAll("[data-ink]").forEach((it) => { const i = +it.dataset.ink; it.querySelector(".sw").style.background = inks[i]; it.classList.toggle("on", gen() === "mesh" && sel === i); it.classList.toggle("off", blendOff && i === 1); });
      el.querySelector('[data-k="bg"]')?.classList.toggle("off", S.transparent);
    } else {
      const before = el.dataset.shape ? el.querySelectorAll("[data-ink]").length : inks.length;
      el.dataset.shape = shape;
      let html = contours ? `<div class="mine-grp mine-bg"><div class="stop bgc" data-k="bg"><button class="sw" style="background:${S.bg}" aria-label="Background color"></button></div><span class="mine-l">Background</span></div><span class="mine-sep"></span>` : "";
      html += `<div class="mine-grp mine-main"><div class="mine-inks">` + inks.map((c, i) => `<div class="stop${i >= before ? " fresh" : ""}" data-ink="${i}"><button class="sw" style="background:${c}" aria-label="Edit color ${i + 1}" title="Click to edit, drag to reorder"></button>${inks.length > 2 ? `<button class="x" aria-label="Remove color ${i + 1}">${ic("x")}</button>` : ""}</div>`).join("");
      if (inks.length < MAX_INKS()) html += `<button class="stop-add" title="Add color" aria-label="Add color">${ic("plus")}</button>`;
      html += `</div>${contours ? `<span class="mine-l">Lines, first to last</span>` : ""}</div>`;
      el.innerHTML = html;
      el.querySelectorAll(".sw").forEach((sw, i) => (sw.dataset.pc = i + 1));
      renderMine();
    }
    fitMine();
    $("stopCount").textContent = contours ? `${inks.length} ${inks.length === 1 ? "color" : "colors"} + background` : `${inks.length} of 8`;
  }
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
        const [p, q] = a.slice(-2), mid = p === q ? variants(a[0])[2] : sampleN([p, q], 3)[1];
        a.splice(a.length - 1, 0, mid); setInks(a); update();
      }
      else addStop(rnd(0.15, 0.85), rnd(0.15, 0.85), variants(a[a.length - 1])[2]);
      return;
    }
    const sw = e.target.closest("[data-ink] .sw");
    if (sw) { const i = +sw.parentElement.dataset.ink; picker.open(sw, inksOf()[i], (v) => { const a = inksOf(); a[i] = v; setInks(a); sw.style.background = v; update({ instant: true }); }, () => commit(), swatchesFor(inksOf()[i])); }
  });
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
        if (p.label) { const lb = document.createElement("div"); lb.className = "label fx-seg-label"; lb.textContent = p.label; body.appendChild(lb); }
        body.appendChild(seg);
        makeSeg(seg, () => e()[p.seg], (v) => (e()[p.seg] = v));
        if (p.when) { const lb = p.label ? seg.previousElementSibling : null; syncers.push(() => { seg.hidden = !p.when(e()); if (lb) lb.hidden = seg.hidden; }); }
      } else if (p.sw) {
        makeSwitch(body, p.label, () => e()[p.sw], (v) => (e()[p.sw] = v), FX_TIP[id + "." + p.sw]);
        if (p.when) { const row = body.lastElementChild; syncers.push(() => (row.hidden = !p.when(e()))); }
      }
      else if (p.color) makeColor(body, p.label, () => e()[p.color], (v) => (e()[p.color] = v));
      else if (p.text) {
        const row = document.createElement("div");
        row.className = "ctrl";
        row.innerHTML = `<input class="field mono" placeholder="${p.label}" aria-label="${p.label}" spellcheck="false" maxlength="24">`;
        const inp = row.querySelector("input");
        inp.addEventListener("change", () => { e()[p.text] = inp.value; update(); });
        syncers.push(() => { row.hidden = !p.when(e()); if (document.activeElement !== inp) inp.value = e()[p.text] || ""; });
        body.appendChild(row);
      } else fxSliders[id].push(makeSlider(body, { group: "fx-" + id, label: p.label, tip: p.tip || FX_TIP[id + "." + p.k], min: p.min, max: p.max, step: p.step, log: p.log, fmt: p.fmt, pct: p.pct, rand: p.rand, hard: p.hard, when: p.when ? () => p.when(e()) : undefined, get: () => e()[p.k], set: (v) => (e()[p.k] = v) }));
    }
    if (SEEDED.has(id)) fxSliders[id].push(makeSlider(body, { group: "fx-" + id, label: "Seed", min: 0, max: 9999, step: 1, fmt: (v) => (v ? String(v) : "Design"), rand: [1, 9999], get: () => e().seed || 0, set: (v) => (e().seed = v) }));
    fxBodies[id] = body;
  }
  const randomizeFx = (id) => { for (const c of fxSliders[id]) c.set(randomValue(c)); };
  let swapping = null;
  $("fxRemove").onclick = () => { const id = fxOf(); if (!id) return; removeFx(id); P.slot = S.fxOrder.length ? "fx:" + S.fxOrder[S.fxOrder.length - 1] : "addfx"; update(); };
  $("fxSwap").onclick = () => { swapping = fxOf(); setSlot("addfx"); };
  let presetQ = "", fxQ = "";
  const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hits = (q, text) => !q || norm(q).split(/\s+/).filter(Boolean).every((w) => norm(text).includes(w));
  function showCard(el, on) {
    if (el.hidden === !on) return;
    el.hidden = !on;
    if (on && !reduceMotion.matches) el.animate([{ opacity: 0, transform: "scale(.94) translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
  }
  function noMatch(el, empty, q, what, inOther) {
    const was = el.hidden;
    el.hidden = !empty;
    if (!empty) return;
    const msg = q ? `No ${what} match “${esc(q)}”` : `No ${what} here`;
    el.innerHTML = `<svg class="ic"><use href="#i-search"/></svg><b>${msg}</b><span>${inOther ? "Some match in another group." : "Try a shorter word, or a kind of look like glass, print or light."}</span><button class="btn sm" data-clear>${inOther ? "Show all groups" : "Clear search"}</button>`;
    if (was && !reduceMotion.matches) el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" });
  }
  const FX_WORDS = { film: "oil slick soap bubble rainbow holographic iridescent", dof: "focus bokeh tilt shift blur", blur: "soft focus", bloom: "glow light bright", rays: "light sun beams", lens: "glass refraction bubble", mesh: "glass tiles hex honeycomb lenses", glass: "reeded ribbed", grain: "noise film", paper: "texture fibre", halftone: "dots comic print", cmyk: "dots print", riso: "print ink", dither: "pixel bitmap", pixel: "mosaic blocks", voronoi: "cells crystal", ascii: "text letters", glyphs: "text letters matrix", chroma: "rgb split aberration", scan: "crt tv lines", vignette: "dark edges", gradmap: "recolor duotone", chrome: "metal reflective", sea: "water ocean caustics", water: "caustics pool", swirl: "twist", wave: "warp", liquify: "warp smudge", kaleido: "mirror symmetry", touch: "click interactive", trail: "drag fluid smoke", emboss: "relief bevel 3d", heatmap: "thermal", posterize: "flat bands", dissolve: "pixel mosaic scatter dots", irid: "holographic rainbow oil film pearl", led: "dot matrix display screen", smear: "streak slit scan glitch drag", glowlines: "neon contour glow lines", guilloche: "banknote moire interference lines rings", ridge: "unknown pleasures joy division lines terrain", feedback: "echo trails spiral repeat", glitch: "slices blocks tear rgb vhs", pixsort: "pixel sort stretch melt streak", streaks: "flare glint anamorphic sparkle star", outline: "edges neon tron solarize sketch", grid: "quadtree mondrian truchet tiles maze", beam: "neon ring arch glow light" };
  const fxText = (f) => `${f[1]} ${f[2]} ${f[0]} ${FX_WORDS[f[0]] || ""}`;
  function filterFx() {
    for (const f of FXC) showCard(fxCards[f[0]], hits(fxQ, fxText(f)));
    for (const grid of $("fxGallery").querySelectorAll(".cards")) { const any = [...grid.children].some((c) => !c.hidden); grid.hidden = !any; grid.previousElementSibling.hidden = !any; }
    noMatch($("fxNone"), FXC.every((f) => fxCards[f[0]].hidden), fxQ, "effects");
    schedulePreviews(0);
  }
  $("fxQ").addEventListener("input", (e) => { fxQ = e.target.value.trim(); filterFx(); });
  $("presetQ").addEventListener("input", (e) => { presetQ = e.target.value.trim(); syncUI(); schedulePreviews(0); });
  $("fxNone").onclick = (e) => { if (e.target.closest("[data-clear]")) { $("fxQ").value = fxQ = ""; filterFx(); $("fxQ").focus(); } };
  $("presetNone").onclick = (e) => { if (!e.target.closest("[data-clear]")) return; if (presetQ && presetCards.some((pc) => hits(presetQ, pc.name + " " + pc.group)) && P.filter !== "All") P.filter = "All"; else $("presetQ").value = presetQ = ""; savePrefs(); syncUI(); schedulePreviews(0); };
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
    const combos = [["guilloche"], ["ridge"], ["feedback", "grain"], ["glitch", "scan"], ["pixsort"], ["streaks", "bloom"], ["outline"], ["grid"], ["dissolve"], ["irid", "grain"], ["led"], ["smear", "grain"], ["glowlines", "grain"], ["glass", "grain"], ["mesh"], ["lens", "grain"], ["blur", "grain"], ["halftone"], ["riso"], ["linescreen"], ["emboss"], ["bloom", "vignette"], ["wave", "chroma", "scan"], ["voronoi"], ["dither"], ["pixel"], ["chrome"], ["cmyk", "paper"], ["water"], ["bulge", "grain"], ["heatmap"], ["rays", "grain"], ["ripple"], ["paper", "grain"]];
    for (const id of pick(combos)) { addFx(id); randomizeFx(id); }
    if (P.safe) safeFix();
  }

  function randomizeGroup(group) {
    for (const c of sliders) if (c.group === group && c.visible() && c.label !== "Grid") c.set(randomValue(c));
    if (P.safe) safeFix();
  }
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
    f.pixel.size = Math.max(f.pixel.size, 8); f.ascii.cell = Math.max(f.ascii.cell, 9); f.glyphs.cell = Math.max(f.glyphs.cell, 8); f.sea.amount = Math.min(f.sea.amount, 2); f.halftone.size = Math.max(f.halftone.size, 6);
    f.glass.width = Math.max(f.glass.width, 18); f.mesh.cell = Math.max(f.mesh.cell, 40); f.grain.amount = Math.min(f.grain.amount, 0.25);
    f.chroma.amount = Math.min(f.chroma.amount, 12); f.liquify.amount = Math.min(f.liquify.amount, 1);
    f.blur.amount = Math.min(f.blur.amount, 70); f.bloom.intensity = Math.min(f.bloom.intensity, 1.3); f.voronoi.cell = Math.max(f.voronoi.cell, 18); f.dissolve.cell = Math.max(f.dissolve.cell, 8); f.ridge.spacing = Math.max(f.ridge.spacing, 4); f.grid.cell = Math.max(f.grid.cell, 12); f.guilloche.spacing = Math.max(f.guilloche.spacing, 3); f.led.pitch = Math.max(f.led.pitch, 5);
    f.linescreen.spacing = Math.max(f.linescreen.spacing, 4.5); f.wave.amp = Math.min(f.wave.amp, 36); f.emboss.strength = Math.min(f.emboss.strength, 2.5);
    f.ripple.amp = Math.min(f.ripple.amp, 30); f.water.amount = Math.min(f.water.amount, 2); f.rays.intensity = Math.min(f.rays.intensity, 2); f.cmyk.size = Math.max(f.cmyk.size, 5); f.bulge.amount = clamp(f.bulge.amount, -0.8, 0.85);
    f.dither.pix = Math.max(f.dither.pix, 2); f.kaleido.segments = clamp(f.kaleido.segments, 3, 12);
  }
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
      if (["flow", "noise", "aura", "wavegrad", "paint", "folds", "linear", "conic"].includes(gen())) S.grad.angle = Math.round(S.grad.angle + rnd(-12, 12));
    }
    if (P.safe) safeFix();
  }
  const NO_FX = {};
  const SLOW_MS = 1500;
  const rollLimit = (k) => 1000 * (P[k] ?? 6);
  window.rollLimit = (where) => rollLimit(where === "home" ? "rollHome" : "rollStudio");
  window.rollRejected = (el) => { if (el && !reduceMotion.matches) el.animate([{ translate: "0" }, { translate: "-3px" }, { translate: "3px" }, { translate: "-2px" }, { translate: "2px" }, { translate: "0" }], { duration: 420, easing: "ease-in-out" }); };
  let surpriseTok = 0;
  async function surprise(limited = true) {
    const tok = ++surpriseTok, was = S, t0 = performance.now(), lim = limited ? rollLimit("rollStudio") : 0, btn = $("surprise");
    let best = null;
    btn.classList.add("busy");
    try {
      for (let i = 0; i < 5 && performance.now() - t0 < 1000; i++) {
        if (i) { await new Promise((r) => setTimeout(r, 0)); if (tok !== surpriseTok || S !== was) return; }
        S = clone(was); roll(); const cand = S; S = was;
        const ms = await drawCost(cand);
        if (tok !== surpriseTok || S !== was) return;
        if (!best || ms < best.ms) best = { st: cand, ms };
        if (ms <= SLOW_MS) break;
      }
    } finally { if (tok === surpriseTok) btn.classList.remove("busy"); }
    if (lim && performance.now() - t0 + best.ms > lim) { rollRejected(btn.querySelector(".spark") || btn); toast("That look would take too long to draw, so it was skipped"); return; }
    S = best.st;
    update({ fade: true });
  }
  const probeCanvas = document.createElement("canvas");
  async function drawCost(st) {
    const raster = isRaster(st) && TFX, k = 4;
    const { w, h } = previewDims(st, false);
    const once = async () => {
      const jb = raster ? await fxJob(TFX, st, Math.max(32, Math.round(w / k)), Math.max(20, Math.round(h / k)), probeCanvas) : null, t0 = performance.now();
      if (raster) { TFX.render(jb); await TFX.sync(); }
      else T.buildSVG(st, { res: st.res * 2 });
      return (performance.now() - t0) * (raster ? k * k : 4);
    };
    try {
      const ms = await once();
      return ms > SLOW_MS ? await once() : ms;
    } catch (e) { return Infinity; }
  }
  function roll() {
    const others = PRESETS.filter((p) => !lookMatches(p[2]) && !p[2].fx?.gradmap);
    const a = pick(others)[2], roll = Math.random();
    if (roll < 0.3) { applyLook(a); if (Math.random() < 0.25) randomPalette(); }
    else if (roll < 0.62) {
      applyLook(a, ["shape", "style"]);
      randomPalette();
      const r = Math.random();
      if (r < 0.25) applyLook(NO_FX, ["effects"]);
      else if (r < 0.6) applyLook(pick(others.filter((p) => p[2].fx))[2], ["effects"]);
      else randomEffects();
    } else {
      applyLook(NO_FX, ["effects"]);
      setGen(pick(GENS.filter(([id]) => id !== "image"))[0]);
      const g = gen();
      if (g === "contours") { S.pattern = pick(T.PATTERNS).id; S.mode = pick(["lines", "lines", "bands", "layers", "shaded"]); randomizeGroup("shape"); randomizeGroup("lines"); Object.assign(S, readable(S)); }
      else { randomizeGroup("gradient"); if (g === "noise") S.grad.noise = pick(NOISE_TYPES)[0]; if (g === "mesh") scatterGrad(); }
      randomPalette();
      if (g === "aura") S.grad.colors.sort((x, y) => lum(x) - lum(y));
      if (Math.random() < 0.55) randomEffects();
    }
    S.objects = [];
    if (Math.random() < 0.18) {
      const n = Math.random() < 0.7 ? 1 : 2;
      for (let i = 0; i < n; i++) S.objects.push({ ...OBJ_DEFAULT, id: objId(), kind: pick(OBJ_KINDS.filter(([k]) => k !== "image"))[0], mat: pick(["shaded", "glass", "design", "shaded"]), x: n === 1 ? 0.5 : [0.36, 0.64][i], y: n === 1 ? 0.5 : [0.42, 0.58][i], size: n === 1 ? +rnd(0.42, 0.62).toFixed(2) : +rnd(0.3, 0.42).toFixed(2), tilt: Math.round(rnd(-25, 40)), spin: Math.round(rnd(-80, 80)), rot: Math.round(rnd(-20, 20)) });
    }
    if (S.fx.gradmap.on) removeFx("gradmap");
    if (P.safe) safeFix();
    variation();
  }
  $("variation").onclick = () => { variation(); update({ fade: true }); };
  function setStudioWide(on) {
    P.wide = on; savePrefs();
    document.querySelector(".app").classList.toggle("wide", on);
    const b = $("stWide"); b.classList.toggle("on", on); b.dataset.tip = on ? "Show the sidebars" : "Hide the sidebars"; b.setAttribute("aria-label", b.dataset.tip);
  }
  $("stWide").onclick = () => { window.UI?.tip?.hide?.(); setStudioWide(!P.wide); };
  setStudioWide(!!P.wide);
  const stageEl = $("stFull").closest(".stage");
  function setFull(on) {
    if (!on) setFill(false);
    stageEl.classList.toggle("full", on); $("stFull").classList.toggle("on", on);
    $("stFull").dataset.tip = on ? "Exit full screen (Esc)" : "Full screen (F)";
    if (on && !document.fullscreenElement) stageEl.requestFullscreen?.().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
  $("stFull").onclick = () => { window.UI?.tip?.hide?.(); setFull(!stageEl.classList.contains("full")); };
  let fillIdle = 0;
  const fillRest = () => { stageEl.classList.remove("idle"); clearTimeout(fillIdle); if (stageEl.classList.contains("fill")) fillIdle = setTimeout(() => stageEl.classList.add("idle"), 1800); };
  function setFill(on) {
    if (on === stageEl.classList.contains("fill")) return;
    if (on && !stageEl.classList.contains("full")) setFull(true);
    window.UI?.tip?.hide?.();
    stageEl.classList.toggle("fill", on);
    stageEl.querySelector(".fill-hint")?.remove();
    if (on) {
      const hint = document.createElement("div");
      hint.className = "fill-hint"; hint.textContent = "Double-click to show the controls. Esc to leave";
      stageEl.appendChild(hint);
      setTimeout(() => hint.classList.add("out"), 2400); setTimeout(() => hint.remove(), 3200);
    }
    fillRest();
    fit(); if (!playing) render();
  }
  $("stFill").onclick = () => setFill(true);
  stageEl.addEventListener("dblclick", (e) => { if (stageEl.classList.contains("fill")) { e.preventDefault(); setFill(false); } });
  stageEl.addEventListener("pointermove", () => { if (stageEl.classList.contains("fill")) fillRest(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && stageEl.classList.contains("full")) setFull(false); });
  addEventListener("keydown", (e) => {
    if (document.body.dataset.route !== "studio" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (keyOf(e) === "f") { e.preventDefault(); setFull(!stageEl.classList.contains("full")); }
    else if (keyOf(e) === "w") { e.preventDefault(); setFill(!stageEl.classList.contains("fill")); }
    else if (e.key === "Escape" && stageEl.classList.contains("full")) setFull(false);
  });
  $("surprise").onclick = () => { burst($("surprise")); surprise(); };
  function burst(btn) { const r = btn.getBoundingClientRect(); sparks(r.left + 22, r.top + r.height / 2); }
  function sparks(cx, cy) {
    if (reduceMotion.matches) return;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("i"), a = (i / 9) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 26, z = 5 + Math.random() * 6;
      s.className = "spark-bit"; s.style.cssText = `left:${cx}px;top:${cy}px;width:${z}px;height:${z}px`;
      document.body.appendChild(s);
      s.animate([{ transform: "translate(-50%,-50%) scale(.2) rotate(0deg)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(90deg)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.3}px), calc(-50% + ${Math.sin(a) * d * 1.3}px)) scale(0) rotate(160deg)`, opacity: 0 }], { duration: 640 + Math.random() * 200, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => s.remove();
    }
  }
  window.sparks = sparks;
  $("undo").onclick = () => travel(-1);
  $("redo").onclick = () => travel(1);

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

  const STEP_ORDER = () => ["preset", "generator", "shape", ...(gen() === "contours" ? ["lines"] : []), "colors", "addobj", "addfx", "motion"];
  function nextOf(slot) {
    const p = panelOf(slot) === "effect" ? "addfx" : panelOf(slot) === "object" ? "addobj" : slot, order = STEP_ORDER(), i = order.indexOf(p);
    return i < 0 || i === order.length - 1 ? "export" : order[i + 1];
  }
  $("nextBtn").onclick = () => { const n = nextOf(P.slot); if (n === "export") { closeMenus(); $("exportBtn").click(); } else setSlot(n); };
  function syncNext() {
    const n = nextOf(P.slot);
    setText($("nextKicker"), n === "export" ? "Finish" : "Continue");
    setText($("nextLbl"), n === "export" ? "Export" : n === "addobj" ? "Objects" : n === "addfx" ? "Effects" : PANEL_TITLE[n]);
    setText($("nextSub"), n === "addfx" || n === "addobj" || n === "motion" ? "Optional" : "");
  }

  const MOTION_NAME = { still: "Still", drift: "Drift", breathe: "Flow", flow: "Breathe", pulse: "Pulse" };
  const EASES = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], in: [0.42, 0, 1, 1], out: [0, 0, 0.58, 1], inout: [0.42, 0, 0.58, 1] };
  function bezier(x, [x1, y1, x2, y2]) {
    const B = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (B(t, x1, x2) < x) lo = t; else hi = t; }
    return B(t, y1, y2);
  }
  const endless = (m = S.motion) => !!m?.endless && m.type === "breathe";
  const unbound = (m = S.motion) => endless(m) && !!m.unbound;
  function motionT(raw, m = S.motion) {
    if (endless(m)) { const n = Math.floor(raw), u = n + bezier(raw - n, m.ease === "custom" ? m.bez : EASES[m.ease] || EASES.linear); return m.dir < 0 ? -u : u; }
    let u = m.mode === "pingpong" ? 1 - Math.abs(1 - 2 * raw) : raw;
    u = bezier(u, m.ease === "custom" ? m.bez : EASES[m.ease] || EASES.linear);
    return m.dir < 0 ? 1 - u : u;
  }
  const seedFrac = (n) => (n ? (n * 0.6180339887) % 1 : 0);
  function motionState(st, t) {
    const m = st.motion;
    if (!m || m.type === "still") return st;
    const off = seedFrac(m.seed), o = { ...st, _t: endless(m) ? t + off : (t + off) % 1 }, tw = 2 * Math.PI * t, a = m.amt, a0 = off * 2 * Math.PI;
    if (st.source === "contours") {
      const path = endless(m) ? "orbit" : m.path || "orbit", th = ((m.angle ?? 30) * Math.PI) / 180, dx = -Math.cos(th), dy = Math.sin(th);
      const lin = (o._t % 1 + 1) % 1, P = (ph, l = lin) => (path === "sway" ? [dx * Math.sin(tw + a0 + ph), dy * Math.sin(tw + a0 + ph)] : path === "glide" ? [dx * 2 * l, dy * 2 * l] : [Math.cos(tw + a0 + ph), Math.sin(tw + a0 + ph)]);
      const glide = path === "glide" && ["drift", "breathe", "pulse"].includes(m.type);
      if (glide) o.glideW = lin;
      if (m.type === "drift") {
        const R = a * st.scale * 0.5, [x, y] = P(0); o.driftX = R * x; o.driftY = R * y; o.driftR = glide ? 2 * R : R;
        if (glide) { const [x2, y2] = P(0, lin - 1); o.driftX2 = R * x2; o.driftY2 = R * y2; }
      }
      else if (m.type === "flow") { const cyc = st.mids?.length && !st.gradient && st.mode !== "layers" && st.mode !== "shaded" ? st.mids.length + 2 : 1; o.phase = t * cyc * Math.max(1, Math.round(a * 4)); }
      else if (m.type === "pulse") {
        const beat = Math.pow(0.5 - 0.5 * Math.cos(tw * 4), 3), [x, y] = P(0); o.loopX = 0.5 * a * x; o.loopY = 0.5 * a * y; o.scale = st.scale * (1 + 0.08 * a * beat);
        if (glide) { const [x2, y2] = P(0, lin - 1); o.loopX2 = 0.5 * a * x2; o.loopY2 = 0.5 * a * y2; }
      }
      else if (endless(m)) {
        const R = 0.45 * a, dr = unbound(m) ? 1.3 * R * tw : 0;
        o.loopX = R * (Math.cos(tw + a0) + 0.5 * Math.cos(tw * 0.618 + 1.3) + 0.3 * Math.cos(tw * 0.414 + 2.1)) + dr * 0.8;
        o.loopY = R * (Math.sin(tw + a0) + 0.5 * Math.sin(tw * 0.618 + 0.7) + 0.3 * Math.sin(tw * 0.414 + 0.4)) + dr * 0.6;
        o.warp = Math.max(st.warp, 0.4 * a);
      }
      else {
        const [x, y] = P(0); o.loopX = 0.45 * a * x; o.loopY = 0.45 * a * y; o.warp = Math.max(st.warp, 0.4 * a);
        if (glide) { const [x2, y2] = P(0, lin - 1); o.loopX2 = 0.45 * a * x2; o.loopY2 = 0.45 * a * y2; }
      }
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
  {
    const pathed = () => ["drift", "breathe", "pulse"].includes(S.motion.type) && !endless();
    const host = document.createElement("div"); $("motionCtrls").appendChild(host);
    host.innerHTML = `<span class="label">Path</span><div class="seg sm"><button data-v="glide" data-tip="Travels on in one direction">Glide</button><button data-v="sway" data-tip="Goes back and forth along a line">Sway</button><button data-v="orbit" data-tip="Goes round in a circle">Orbit</button></div>`;
    makeSeg(host.lastElementChild, () => S.motion.path || "orbit", (v) => (S.motion.path = v));
    makeSlider($("motionCtrls"), { group: "motion", label: "Angle", ...bindKey(() => S.motion, "angle"), min: 0, max: 360, step: 1, fmt: deg, rand: [0, 360], when: () => pathed() && S.motion.path !== "orbit" });
    syncers.push(() => (host.hidden = !pathed()));
  }
  makeSeg($("motionMode"), () => S.motion.mode, (v) => (S.motion.mode = v));
  {
    const host = document.createElement("div"); $("motionCtrls").appendChild(host);
    makeSwitch(host, "Endless (no loop)", () => S.motion.endless, (v) => { S.motion.endless = v; if (v) S.motion.mode = "once"; });
    host.lastElementChild.dataset.tip = "Keeps morphing and never repeats. Exports run the full length without looping back";
    makeSwitch(host, "Unbound", () => S.motion.unbound, (v) => (S.motion.unbound = v));
    const ub = host.lastElementChild; ub.dataset.tip = "Keeps traveling through the pattern and never revisits a shape";
    syncers.push(() => { const on = endless(); ub.classList.toggle("off", !on); ub.querySelector("input").disabled = !on; });
    syncers.push(() => {
      host.hidden = S.motion.type !== "breathe";
      const on = endless();
      for (const b of $("motionMode").children) if (b.dataset.v) b.disabled = on && b.dataset.v !== "once";

    });
  }
  makeSeg($("motionDir"), () => S.motion.dir, (v) => (S.motion.dir = v));
  makeSeg($("motionEase"), () => S.motion.ease, (v) => (S.motion.ease = v));
  window.UI?.dropdown($("motionEase"), { label: "Easing" });
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
  const canWebp = !!window.WebPAnim?.supported();
  const useWebp = () => canWebp && !!S.gif.webp;
  $("gifWebpL").hidden = $("gifWebpS").hidden = !canWebp;
  $("gifWebp").onchange = (e) => { S.gif.webp = e.target.checked; save(); refreshExport(); };
  syncers.push(() => ($("gifWebp").checked = !!S.gif.webp));
  let playing = false, playRaf = 0, playT0 = 0, playBusy = false, playSlow = false, playFade = false;
  function playFrame(now) {
    if (!playing || held) return;
    playRaf = requestAnimationFrame(playFrame);
    if (playBusy) return;
    playBusy = true;
    const secs = (now - playT0) / 1000, raw = endless() ? secs / S.motion.dur : (secs % S.motion.dur) / S.motion.dur;
    const t0 = performance.now();
    if (lastDrawn && t0 - lastDrawn < 500) watchPerf(t0 - lastDrawn);
    lastDrawn = t0;
    let fadeDone = null;
    if (playFade) { playFade = false; crossfade(new Promise((r) => (fadeDone = r))); }
    paint(motionState(S, motionT(raw)), false, true).then((r) => { playBusy = false; fadeDone?.(); if (r) (r.raster && FXR?.sync ? FXR.sync() : Promise.resolve()).then(() => { const c = performance.now() - t0; $("ms").textContent = `${Math.round(c)} ms`; }); });
  }
  let playRes = 0;
  const pickPlayRes = (coarse = 1) => { const shown = Math.max(1, art.clientWidth) / S.w; playRes = Math.max(S.res, (2.4 / shown) * coarse); };
  function startPlay() { perfTimes = []; lastDrawn = 0; lowRes = 0; perfSkip = 8; pickPlayRes(); startPlay0(); }
  function startPlay0() { if (S.motion.type === "still") { S.motion.type = "drift"; update(); } playing = true; held = false; playFade = true; playT0 = performance.now(); cancelAnimationFrame(playRaf); playRaf = requestAnimationFrame(playFrame); syncPlay(); }
  let held = false, holdT = 0, ptrDown = false;
  addEventListener("pointerdown", () => (ptrDown = true), true);
  addEventListener("pointerup", () => (ptrDown = false), true);
  addEventListener("pointercancel", () => (ptrDown = false), true);
  function holdPlay() {
    if (!playing) return;
    held = true; cancelAnimationFrame(playRaf);
    clearTimeout(holdT); holdT = setTimeout(resumePlay, 900);
  }
  function resumePlay() {
    if (!playing || !held) return;
    if (ptrDown) { holdT = setTimeout(resumePlay, 300); return; }
    held = false; cancelAnimationFrame(raf); cancelAnimationFrame(anim); anim = 0; ++paintTok;
    lowRes = 0; pickPlayRes(); perfSkip = 8;
    crossfade(paint(motionState(S, motionT(0)), false, true));
    perfTimes = []; lastDrawn = 0; playT0 = performance.now();
    playRaf = requestAnimationFrame(playFrame);
  }
  let resumeOnShow = false;
  let perfTimes = [], perfSkip = 0, perfSig = "", perfShownFor = "", lastDrawn = 0;
  const perfQuiet = new Set();
  const lookSig = (st = S) => [st.source === "gradient" ? "gradient:" + st.grad.type : "contours:" + st.pattern + ":" + st.mode, st.fxOrder.filter((id) => st.fx[id]?.on).join("+") || "no effects", st.objects?.length ? st.objects.map((o) => o.kind + ":" + o.mat).join("+") : "", "motion:" + st.motion.type].filter(Boolean).join(" | ");
  document.addEventListener("visibilitychange", () => (perfTimes = []));
  function watchPerf(cost) {
    if (document.hidden || document.body.dataset.route !== "studio") return;
    const sig = lookSig();
    if (sig !== perfSig) { perfSig = sig; perfTimes = []; perfSkip = Math.max(perfSkip, 8); }
    if (perfSkip > 0) { perfSkip--; return; }
    perfTimes.push(cost); if (perfTimes.length > 45) perfTimes.shift();
    const n = perfTimes.length;
    if (n < 12 || (n < 45 && perfTimes.reduce((a, b) => a + b, 0) < 2500)) return;
    const sorted = perfTimes.slice().sort((a, b) => a - b), mid = sorted[n >> 1];
    perfLog(sig, sorted);
    perfTimes = perfTimes.slice(-Math.floor(n / 3));
    const fps = P.perfFps ?? 60;
    if (fps && mid > 1080 / fps && !perfQuiet.has(sig) && $("perfNote").hidden) {
      perfShownFor = sig;
      $("perfRate").textContent = `${Math.max(1, Math.round(1000 / mid))} fps.`;
      $("perfNote").hidden = false; $("perfFx").hidden = !S.fxOrder.some((id) => S.fx[id]?.on); $("perfOff").checked = false;
    }
  }
  function closePerf() {
    $("perfNote").hidden = true; perfQuiet.add(perfShownFor);
    if ($("perfOff").checked) { P.perfFps = 0; savePrefs(); syncPerfSet(); toast("Lag warnings off. Turn them on in Settings"); }
  }
  $("perfFx").onclick = () => { closePerf(); S.fxOrder = []; update(); toast("Effects removed", { action: "Undo", onAction: () => travel(-1) }); };
  $("perfStop").onclick = () => { closePerf(); stopPlay(); S.motion.type = "still"; update(); };
  $("perfX").onclick = closePerf;
  function syncPerfMode() {
    const L = window.Lite; if (!L) return;
    for (const b of $("perfMode").children) b.classList.toggle("on", b.dataset.v === L.pref);
    $("perfModeNote").textContent = L.pref === "auto" ? (L.on ? "Auto: on for this device" : "Auto: off for this device") : "Lighter drawing for built-in graphics";
    $("perfSum").textContent = L.on ? "On" : "";
  }
  $("perfMode").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; window.Lite.set(b.dataset.v); syncPerfMode(); syncQuality(); };
  $("perfOpen").onclick = () => { closeMenus(); syncPerfMode(); syncPerfSet(); syncQuality(); openModal("perfModal"); };
  $("perfDone").onclick = () => closeModal("perfModal");
  $("perfModal").addEventListener("pointerdown", (e) => { if (e.target === $("perfModal")) closeModal("perfModal"); });
  const syncMs = () => { $("ms").hidden = P.showMs === false; $("showMs").checked = P.showMs !== false; };
  $("showMs").onchange = (e) => { P.showMs = e.target.checked; savePrefs(); syncMs(); };
  syncMs();
  const QKEY = "isoline.quality", QLV = { rays: [24, 48, 96], taps: [24, 48, 96], bloom: [20, 40, 80], frost: [4, 8, 24], steps: [48, 80, 160] };
  const QIDS = { rays: "qRays", taps: "qTaps", bloom: "qBloom", frost: "qFrost", steps: "qSteps" };
  let QP = {};
  try { QP = JSON.parse(localStorage.getItem(QKEY) || "{}") || {}; } catch (e) {}
  function applyQuality() {
    const lite = !!window.Lite?.on, q = {};
    for (const [k, lv] of Object.entries(QLV)) { const v = QP[k] || "auto"; q[k] = lv[v === "low" ? 0 : v === "high" ? 2 : v === "mid" ? 1 : lite ? 0 : 1]; }
    window.TopoFX?.setQuality?.(q);
  }
  function syncQuality() { for (const [k, id] of Object.entries(QIDS)) { const v = QP[k] || "auto"; for (const b of $(id).children) b.classList.toggle("on", b.dataset.v === v); } }
  for (const [k, id] of Object.entries(QIDS)) $(id).onclick = (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    QP[k] = b.dataset.v; try { localStorage.setItem(QKEY, JSON.stringify(QP)); } catch (err) {}
    applyQuality(); syncQuality(); update({ commit: false }); schedulePreviews(0);
  };
  applyQuality();
  addEventListener("lite-change", applyQuality);
  syncPerfMode();
  function syncPerfSet() {
    const v = String(P.perfFps ?? 60); for (const b of $("perfFps").children) if (b.dataset.v) b.classList.toggle("on", b.dataset.v === v);
    for (const b of $("perfPrio").children) b.classList.toggle("on", b.dataset.v === (P.priority || "load"));
    for (const k of ["rollHome", "rollStudio"]) for (const b of $(k).children) b.classList.toggle("on", +b.dataset.v === (P[k] ?? 6));
  }
  const preferFps = () => P.priority === "fps";
  window.preferFps = preferFps;
  for (const k of ["rollHome", "rollStudio"]) $(k).onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; P[k] = +b.dataset.v; savePrefs(); syncPerfSet(); };
  $("perfPrio").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; P.priority = b.dataset.v; savePrefs(); syncPerfSet(); };
  $("perfFps").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; P.perfFps = +b.dataset.v; perfQuiet.clear(); savePrefs(); syncPerfSet(); };
  syncPerfSet();

  const PERF_LOG = "isoline.perfLog";
  let perfEntries = [];
  try { perfEntries = JSON.parse(localStorage.getItem(PERF_LOG) || "[]"); } catch (e) {}
  let perfSaveT = 0;
  function perfLog(sig, sorted, kind = "play") {
    const n = sorted.length, q = (f) => +sorted[Math.min(n - 1, Math.floor(f * n))].toFixed(1);
    const { w, h } = previewDims(S, false);
    perfEntries.push({ at: new Date().toISOString(), kind, look: sig, ...(kind === "play" ? { fps: Math.round(1000 / Math.max(0.1, q(0.5))), ms: { median: q(0.5), p90: q(0.9), max: q(1) }, frames: n } : { ms: q(0.5) }), size: `${S.w}x${S.h}`, drawn: kind === "play" && playRes ? "reduced" : `${w}x${h}`, fx: Object.fromEntries(S.fxOrder.filter((id) => S.fx[id]?.on).map((id) => [id, S.fx[id]])) });
    if (perfEntries.length > 300) perfEntries = perfEntries.slice(-300);
    clearTimeout(perfSaveT); perfSaveT = setTimeout(() => { try { localStorage.setItem(PERF_LOG, JSON.stringify(perfEntries)); } catch (e) {} }, 1000);
  }
  window.perfEvent = (kind, look, data) => {
    perfEntries.push({ at: new Date().toISOString(), kind, look, ...data });
    if (perfEntries.length > 300) perfEntries = perfEntries.slice(-300);
    clearTimeout(perfSaveT); perfSaveT = setTimeout(() => { try { localStorage.setItem(PERF_LOG, JSON.stringify(perfEntries)); } catch (e) {} }, 1000);
  };
  function gpuName() {
    try { const gl = document.createElement("canvas").getContext("webgl2"), x = gl?.getExtension("WEBGL_debug_renderer_info"); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) || "none"; } catch (e) { return "unknown"; }
  }
  $("exportLogs").onclick = () => {
    closeMenus();
    const by = {};
    for (const e of perfEntries) if (e.fps) { const k = e.kind + " | " + e.look; (by[k] ||= []).push(e.fps); }
    const summary = Object.entries(by).map(([look, f]) => ({ look, runs: f.length, fps: { median: f.sort((a, b) => a - b)[f.length >> 1], min: f[0], max: f[f.length - 1] } })).sort((a, b) => a.fps.median - b.fps.median);
    const out = { app: `Isoline ${VERSION} (${BUILD})`, exported: new Date().toISOString(), device: { userAgent: navigator.userAgent, gpu: gpuName(), dpr: devicePixelRatio, screen: `${screen.width}x${screen.height}`, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory }, threshold: P.perfFps ?? 60, summary, entries: perfEntries };
    download(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }), `isoline-performance-${new Date().toISOString().slice(0, 10)}.json`);
    toast(perfEntries.length ? `Exported ${perfEntries.length} entries` : "No entries yet. Play some motion first");
  };
  function stopPlay() { if (!playing) return; playing = false; held = false; clearTimeout(holdT); cancelAnimationFrame(playRaf); syncPlay(); crossfade(render()); }
  function syncPlay() {
    for (const b of [$("playBtn"), $("barPlay")]) b.querySelector("use").setAttribute("href", playing ? "#i-pause" : "#i-play");
    $("playBtn").querySelector("span").textContent = playing ? "Pause" : "Play";
    $("barPlay").title = playing ? "Pause motion" : "Play motion";
    $("barPlay").hidden = S.motion.type === "still";
  }
  $("playBtn").onclick = $("barPlay").onclick = () => (playing ? stopPlay() : startPlay());

  function framer(W, H, frames, fps) {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = W; frameCanvas.height = H;
    const fctx = frameCanvas.getContext("2d", { willReadFrequently: true });
    async function drawFrame(i) {
      const st = motionState(S, motionT(endless() ? i / fps / S.motion.dur : S.motion.mode === "once" ? Math.min(1, i / Math.max(1, frames - 1)) : (i / fps / S.motion.dur) % 1));
      if ((isRaster(st) || (st.source === "contours" && FXR?.floatOK && T.gpuSpec(st, st.res))) && FXR) {
        FXR.render(await fxJob(FXR, st, W, H));
        fctx.clearRect(0, 0, W, H); fctx.drawImage(fxCanvas, 0, 0, W, H);
      } else await rasterize(frameCanvas, T.buildSVG(st, { w: W, h: H }).svg, W, H);
      return fctx;
    }
    return { frameCanvas, drawFrame };
  }
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
      if (useWebp()) {
        const anim = new window.WebPAnim(W, H, 0);
        let t = 0;
        for (let i = 0; i < frames && !job0.cancel; i++) {
          const next = ((i + 1) * 1000) / fps, ms = Math.round(next) - Math.round(t); t = next;
          await anim.add((await drawFrame(i)).canvas, ms, 0.9);
          setProg(`Frame ${i + 1} of ${frames}`, 0.02 + ((i + 1) / frames) * 0.93);
          if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0));
        }
        if (job0.cancel) toast("Export cancelled");
        else { setProg("Saving", 1); await download(anim.finish(), `${fileName()}.webp`, "WebP saved"); }
        return;
      }
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
      toast(useWebp() ? "WebP failed. Try a smaller size" : "GIF failed. Try a smaller size");
    } finally {
      exporting = null;
      hideProg(); $("exCancel").hidden = true; $("download").disabled = false;
      render();
    }
  }
  let exporting = null;
  const loaded = {};
  const loadScript = (name) => (loaded[name] ||= new Promise((res, rej) => { const el = document.createElement("script"); el.src = name + (stamped ? "?v=" + BUILD : ""); el.onload = res; el.onerror = () => { delete loaded[name]; rej(new Error(name)); }; document.head.appendChild(el); }));
  const canMp4 = () => typeof window.VideoEncoder === "function";
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
      if (canMp4()) await loadScript("mp4-muxer.js").catch(() => {});
      if (canMp4() && window.Mp4Muxer) {
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
      toast("Video failed. Try a smaller size");
    } finally {
      exporting = null;
      hideProg(); $("exCancel").hidden = true; $("download").disabled = false;
      render();
    }
  }
  $("exCancel").onclick = () => exporting && (exporting.cancel = true);

  const art = $("art"), artSvg = $("artSvg"), fxCanvas = $("fx"), ov = $("ov"), wrap = $("wrap");
  const handleList = (st = S) => (st.source === "gradient" ? (st.grad.type === "mesh" ? st.grad.points : null) : st.usePoints && st.showPoints ? st.points : null);
  const RINGS = [["obz", "#3e8cf0", "Rotate"], ["obx", "#e5484d", "Tilt"], ["oby", "#2fb36d", "Spin"]];
  function objOverlay(st, o) {
    const u = S.w / Math.max(1, art.clientWidth), ns = 'vector-effect="non-scaling-stroke"', A = accentNow();
    const x = o.x * S.w, y = o.y * S.h, r = (o.size * Math.min(S.w, S.h)) / 2, R = r + 10 * u, deg = o.rot || 0, a = (deg * Math.PI) / 180;
    const rx = x + Math.cos(a) * R, ry = y + Math.sin(a) * R, on = drag?.obj;
    const rings = [[R, R], [R * 0.3, R], [R, R * 0.3]].map(([ex, ey], i) => {
      const [cls, col, tip] = RINGS[i], hot = on === cls, sw = hot ? 2.5 : 1.5;
      return `<g transform="rotate(${deg} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${ex}" ry="${ey}" fill="none" stroke="${col}" stroke-opacity="${!on || hot ? 0.95 : 0.3}" stroke-width="${sw}" ${ns} pointer-events="none"/>`
        + `<ellipse class="obr ${cls}" cx="${x}" cy="${y}" rx="${ex}" ry="${ey}" fill="none" stroke="transparent" stroke-width="14" ${ns}><title>${tip}</title></ellipse></g>`;
    }).join("");
    return `<circle class="ob" cx="${x}" cy="${y}" r="${r}" fill="transparent"/>` + rings
      + `<circle class="obs" cx="${rx}" cy="${ry}" r="${6 * u}" fill="#fff" stroke="${A}" stroke-width="1.5" ${ns}><title>Size</title></circle>`
      + `<circle cx="${x}" cy="${y}" r="${4 * u}" fill="${A}" stroke="#fff" stroke-width="1.5" ${ns} pointer-events="none"/>`;
  }
  const FX_PT = new Set(["rays", "lens", "dof", "swirl", "bulge", "ripple", "feedback", "guilloche", "linescreen"]);
  const fxPt = () => { const id = fxOf(); return id && FX_PT.has(id) && S.fx[id] && (id !== "linescreen" || S.fx[id].ripple > 0) ? id : null; };
  function fxGeo(id, e) {
    const x = (e.x ?? 0.5) * S.w, y = (e.y ?? 0.5) * S.h, m = Math.min(S.w, S.h), out = { x, y };
    if (id === "swirl" || id === "bulge") { out.r = e.radius * m; out.fr = [x + out.r, y]; }
    else if (id === "lens") {
      const hw = e.shape === "pill" ? e.size * m * 0.95 : e.size * m * 0.5, hh = e.shape === "pill" ? e.size * m * 0.3 : hw;
      out.box = [hw, hh, e.shape === "circle" ? hw : e.shape === "pill" ? hh : e.size * m * 0.16]; out.fr = [x + hw, y];
    } else if (id === "dof") {
      const f = (e.focus ?? 0.12) * S.h, g = f + (e.falloff ?? 0.35) * S.h;
      if (e.shape === "band") {
        const a = ((e.angle || 0) * Math.PI) / 180, n = [-Math.sin(a), Math.cos(a)], t = [Math.cos(a), Math.sin(a)];
        Object.assign(out, { n, t, f, g, fr: [x + n[0] * f, y + n[1] * f], ff: [x + n[0] * g, y + n[1] * g], fa: [x + t[0] * Math.max(40, f + 24), y + t[1] * Math.max(40, f + 24)] });
      } else Object.assign(out, { f, g, fr: [x + f, y], ff: [x + g, y] });
    }
    return out;
  }
  function fxOverlay(st, id) {
    const e = st.fx[id] || S.fx[id], u = S.w / Math.max(1, art.clientWidth), ns = 'vector-effect="non-scaling-stroke"', A = accentNow(), G = fxGeo(id, e), { x, y } = G;
    const line = (d, dash) => `<path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3" ${ns} pointer-events="none"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.5" ${dash ? 'stroke-dasharray="4 5"' : ""} ${ns} pointer-events="none"/>`;
    const circ = (r, dash) => line(`M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`, dash);
    const knob = (cls, [hx, hy], tip) => `<circle class="${cls}" cx="${hx}" cy="${hy}" r="${6 * u}" fill="#fff" stroke="${A}" stroke-width="1.5" ${ns}><title>${tip}</title></circle>`;
    let out = `<rect class="fbg" x="0" y="0" width="${S.w}" height="${S.h}" fill="transparent"/>`;
    if (G.r) out += circ(G.r, true) + knob("fr", G.fr, "Radius");
    if (G.box) { const [hw, hh, rr] = G.box; out += line(`M${x - hw + rr} ${y - hh}h${2 * (hw - rr)}a${rr} ${rr} 0 0 1 ${rr} ${rr}v${2 * (hh - rr)}a${rr} ${rr} 0 0 1 ${-rr} ${rr}h${-2 * (hw - rr)}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}v${-2 * (hh - rr)}a${rr} ${rr} 0 0 1 ${rr} ${-rr}z`, true) + knob("fr", G.fr, "Size"); }
    if (id === "dof") {
      if (G.n) {
        const L = Math.hypot(S.w, S.h), [nx, ny] = G.n, [tx, ty] = G.t;
        for (const [d, dash] of [[G.f, false], [-G.f, false], [G.g, true], [-G.g, true]]) out += line(`M${x + nx * d - tx * L} ${y + ny * d - ty * L}L${x + nx * d + tx * L} ${y + ny * d + ty * L}`, dash);
        out += line(`M${x} ${y}L${G.fa[0]} ${G.fa[1]}`) + knob("fa", G.fa, "Angle");
      } else out += circ(Math.max(1, G.f), false) + circ(G.g, true);
      out += knob("fr", G.fr, "In focus") + knob("ff", G.ff, "Falloff");
    }
    const c = drag?.fx === "c";
    if (id === "rays") out += [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180, c0 = Math.cos(r), s0 = Math.sin(r); return line(`M${x + c0 * 12 * u} ${y + s0 * 12 * u}L${x + c0 * 18 * u} ${y + s0 * 18 * u}`); }).join("");
    if (id === "dof") out += line(`M${x - 14 * u} ${y}h${8 * u}M${x + 6 * u} ${y}h${8 * u}M${x} ${y - 14 * u}v${8 * u}M${x} ${y + 6 * u}v${8 * u}`);
    if (id === "linescreen") { const x2 = (e.x2 ?? 0.85) * S.w, y2 = (e.y2 ?? 0.9) * S.h; out += `<circle cx="${x2}" cy="${y2}" r="${8 * u}" fill="#fff" stroke="rgba(0,0,0,.2)" stroke-width="1" ${ns} pointer-events="none"/><circle cx="${x2}" cy="${y2}" r="${4.5 * u}" fill="${A}" ${ns} pointer-events="none"/><circle class="fc2" cx="${x2}" cy="${y2}" r="${14 * u}" fill="transparent"><title>Drag to move</title></circle>`; }
    out += `<circle cx="${x}" cy="${y}" r="${(c ? 10 : 8) * u}" fill="#fff" stroke="rgba(0,0,0,.2)" stroke-width="1" ${ns} pointer-events="none"/><circle cx="${x}" cy="${y}" r="${4.5 * u}" fill="${A}" ${ns} pointer-events="none"/>`;
    return out + `<circle class="fc" cx="${x}" cy="${y}" r="${14 * u}" fill="transparent"><title>Drag to move</title></circle>`;
  }
  function drawOverlay(st = S) {
    ov.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    const o = objOf(), so = o && (st.objects || []).find((x) => x.id === o.id);
    if (so) { ov.classList.remove("off"); ov.innerHTML = objOverlay(st, so); return; }
    const fid = fxPt();
    if (fid) { ov.classList.remove("off"); ov.innerHTML = fxOverlay(st, fid); return; }
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
  const liveDraw = () => { if (!playing || held) render(true); };
  const toArt = (e) => { const r = ov.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * S.w, ((e.clientY - r.top) / r.height) * S.h]; };
  let drag = null;
  ov.addEventListener("pointerdown", (e) => {
    const t = e.target, o = objOf();
    const ring = RINGS.find(([c]) => t.classList?.contains(c))?.[0];
    if (o && (ring || t.classList?.contains("ob") || t.classList?.contains("obs"))) {
      const [x, y] = toArt(e);
      drag = { obj: ring || (t.classList.contains("obs") ? "size" : "move"), dx: o.x * S.w - x, dy: o.y * S.h - y, x0: x, y0: y, tilt: o.tilt || 0, spin: o.spin || 0, a0: (Math.atan2(y - o.y * S.h, x - o.x * S.w) * 180) / Math.PI - (o.rot || 0) };
      ov.setPointerCapture(e.pointerId); ov.classList.add("dragging"); e.preventDefault();
      return;
    }
    if (o) return;
    const fid = fxPt();
    if (fid) {
      const fe = S.fx[fid], [x, y] = toArt(e), k = ["fr", "ff", "fa", "fc2"].find((c) => t.classList?.contains(c)) || "c";
      if (k === "fc2") { drag = { fx: "c2", dx: (fe.x2 ?? 0.85) * S.w - x, dy: (fe.y2 ?? 0.9) * S.h - y }; ov.setPointerCapture(e.pointerId); ov.classList.add("dragging"); e.preventDefault(); return; }
      if (k === "c" && !t.classList?.contains("fc")) { fe.x = +clamp(x / S.w, 0, 1).toFixed(4); fe.y = +clamp(y / S.h, 0, 1).toFixed(4); }
      drag = { fx: k, dx: (fe.x ?? 0.5) * S.w - x, dy: (fe.y ?? 0.5) * S.h - y };
      ov.setPointerCapture(e.pointerId); ov.classList.add("dragging");
      drawOverlay(); syncUI(); liveDraw(); e.preventDefault();
      return;
    }
    const i = t.dataset?.i, list = handleList();
    if (i == null || !list) { if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    sel = +i;
    const p = list[sel], [x, y] = toArt(e);
    drag = t.classList.contains("rs") ? { mode: "r" } : { mode: "m", dx: p.x * S.w - x, dy: p.y * S.h - y };
    ov.setPointerCapture(e.pointerId); ov.classList.add("dragging");
    syncUI(); drawOverlay(); e.preventDefault();
  });
  ov.addEventListener("pointermove", (e) => {
    if (drag?.fx) {
      const fid = fxPt(); if (!fid) return;
      const fe = S.fx[fid], [x, y] = toArt(e), cx = (fe.x ?? 0.5) * S.w, cy = (fe.y ?? 0.5) * S.h, m = Math.min(S.w, S.h);
      if (drag.fx === "c") { fe.x = +clamp((x + drag.dx) / S.w, 0, 1).toFixed(4); fe.y = +clamp((y + drag.dy) / S.h, 0, 1).toFixed(4); }
      else if (drag.fx === "c2") { fe.x2 = +clamp((x + drag.dx) / S.w, 0, 1).toFixed(4); fe.y2 = +clamp((y + drag.dy) / S.h, 0, 1).toFixed(4); }
      else if (drag.fx === "fa") { let a = Math.round((Math.atan2(y - cy, x - cx) * 180) / Math.PI); if (e.shiftKey) a = Math.round(a / 15) * 15; fe.angle = ((a + 450) % 180) - 90; }
      else {
        const G = fxGeo(fid, fe), d = G.n ? Math.abs((x - cx) * G.n[0] + (y - cy) * G.n[1]) : Math.hypot(x - cx, y - cy);
        if (fid === "swirl" || fid === "bulge") fe.radius = +clamp(d / m, 0.05, 1.5).toFixed(3);
        else if (fid === "lens") fe.size = +clamp(d / (m * (fe.shape === "pill" ? 0.95 : 0.5)), 0.1, 1.2).toFixed(3);
        else if (drag.fx === "fr") fe.focus = +clamp(d / S.h, 0, 0.8).toFixed(3);
        else fe.falloff = +clamp(d / S.h - (fe.focus ?? 0.12), 0.02, 1.2).toFixed(3);
      }
      drawOverlay(); syncUI(); liveDraw();
      return;
    }
    if (drag?.obj) {
      const o = objOf(); if (!o) return;
      const [x, y] = toArt(e);
      if (drag.obj === "move") { o.x = +clamp((x + drag.dx) / S.w, -0.2, 1.2).toFixed(4); o.y = +clamp((y + drag.dy) / S.h, -0.2, 1.2).toFixed(4); }
      else if (drag.obj === "size") o.size = +clamp((2 * Math.hypot(x - o.x * S.w, y - o.y * S.h)) / Math.min(S.w, S.h), 0.05, 2).toFixed(3);
      else if (drag.obj === "obz") { let a = Math.round((Math.atan2(y - o.y * S.h, x - o.x * S.w) * 180) / Math.PI - drag.a0); if (e.shiftKey) a = Math.round(a / 15) * 15; o.rot = ((a + 540) % 360) - 180; }
      else {
        const a = ((o.rot || 0) * Math.PI) / 180, ddx = x - drag.x0, ddy = y - drag.y0, k = 90 / Math.max(8, (o.size * Math.min(S.w, S.h)) / 2);
        const lx = ddx * Math.cos(a) + ddy * Math.sin(a), ly = -ddx * Math.sin(a) + ddy * Math.cos(a), snap = (v) => (e.shiftKey ? Math.round(v / 15) * 15 : Math.round(v));
        if (drag.obj === "obx") o.tilt = clamp(snap(drag.tilt + ly * k), -90, 90);
        else o.spin = ((snap(drag.spin + lx * k) + 540) % 360) - 180;
      }
      drawOverlay(); syncUI(); liveDraw();
      return;
    }
    const list = handleList();
    if (!drag || !list) return;
    const p = list[sel], [x, y] = toArt(e);
    if (drag.mode === "m") { p.x = +clamp((x + drag.dx) / S.w, -0.3, 1.3).toFixed(4); p.y = +clamp((y + drag.dy) / S.h, -0.3, 1.3).toFixed(4); }
    else p.r = Math.round(clamp(Math.hypot(x - p.x * S.w, y - p.y * S.h), 10, 1400));
    drawOverlay(); syncUI(); liveDraw();
  });
  const endDrag = () => { if (!drag) return; drag = null; ov.classList.remove("dragging"); update({ instant: true }); };
  ov.addEventListener("pointerup", endDrag);
  ov.addEventListener("pointercancel", endDrag);
  ov.addEventListener("dblclick", (e) => {
    if (fxPt()) return;
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
    drawOverlay(); syncUI(); liveDraw();
    clearTimeout(wheelT); wheelT = setTimeout(() => update({ instant: true }), 180);
  }, { passive: false });

  const clampDim = (v) => clamp(Math.round(+v || 0), 64, P.unlock ? 16000 : 8000);
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
    for (const [key, v] of [["w", w], ["h", h]]) { const el = $(key); if (document.activeElement !== el) el.value = v; if (!fieldSizing) el.style.width = Math.max(24, measure(String(v))) + 8 + "px"; }
    $("sizeName").textContent = presetName(w, h);
    sizeMenu.querySelector(".fit-opt").hidden = !sizer().fit;
  }
  window.syncSize = syncSize;

  $("tourBtn").onclick = () => { closeMenus(); window.Tour?.show(window.Shell?.route); };
  const menus = { sizeBtn: sizeMenu, exportBtn: $("exportMenu"), settingsBtn: $("settingsMenu"), designsBtn: $("designsMenu"), shareBtn: $("shareMenu"), looksBtn: $("looksMenu") };
  const SCRIMMED = ["exportMenu", "designsMenu", "shareMenu", "cpExportMenu", "looksMenu"];
  const syncScrim = () => document.body.classList.toggle("scrimmed", SCRIMMED.some((id) => $(id) && !$(id).hidden));
  window.syncScrim = syncScrim;
  function closeMenus() { Object.values(menus).forEach((m) => (m.hidden = true)); syncScrim(); }
  for (const [btn, menu] of Object.entries(menus)) {
    $(btn).onclick = (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeMenus();
      menu.hidden = !open;
      if (open && menu === sizeMenu) { const [w, h] = sizer().get(), fitting = !!sizer().fitting?.(); for (const o of sizeMenu.querySelectorAll(".opt")) o.classList.toggle("on", o.hasAttribute("data-fit") ? fitting : !fitting && +o.dataset.w === w && +o.dataset.h === h); }
      if (open && menu.id === "exportMenu") refreshExport();
      if (open && menu.id === "designsMenu") dzSync();
      if (open && menu.id === "looksMenu") window.Shell?.looks();
      syncScrim();
    };
  }
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".menu-wrap")) closeMenus(); });
  const openModal = (id) => { $(id).hidden = false; $(id).querySelector("button.primary")?.focus({ preventScroll: true }); };
  const closeModal = (id) => ($(id).hidden = true);
  for (const m of document.querySelectorAll(".modal")) m.addEventListener("pointerdown", (e) => { if (e.target === m) m.hidden = true; });

  const ACCENTS = ["#e8572a", "#3557d6", "#6d4ce0", "#2f7d5b", "#d6457a", "#c08a2b"];
  P.theme ||= "system"; P.accent ||= ACCENTS[0];
  const darkMQ = matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() {
    const r = document.documentElement;
    if (P.theme === "system") delete r.dataset.theme; else r.dataset.theme = P.theme;
    r.style.setProperty("--accent", P.accent);
    r.style.setProperty("--on-accent", window.Color.contrast(P.accent, "#ffffff") < 2.6 ? "#1c1c1e" : "#ffffff");
    window.TopoBrand?.favicon(P.accent);
    const shown = P.theme === "system" ? (darkMQ.matches ? "dark" : "light") : P.theme;
    for (const b of $("theme").children) b.classList.toggle("on", b.dataset.v === shown);
    for (const b of $("accents").querySelectorAll("[data-c]")) b.classList.toggle("on", b.dataset.c === P.accent);
    $("accents").querySelector(".custom").classList.toggle("on", !ACCENTS.includes(P.accent));
    $("accents").querySelector(".custom").style.setProperty("--c", P.accent);
    if (painted) drawOverlay();
    window.dispatchEvent(new Event("theme-change"));
  }
  darkMQ.addEventListener("change", () => { if (P.theme === "system") applyTheme(); else window.dispatchEvent(new Event("theme-change")); });
  $("accents").innerHTML = ACCENTS.map((c) => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="Accent ${c}"></button>`).join("") + `<button class="sw custom" aria-label="Custom accent"></button>`;
  $("accents").onclick = (e) => {
    const b = e.target.closest("[data-c]");
    if (b) { P.accent = b.dataset.c; savePrefs(); window.UI ? UI.swap(applyTheme) : applyTheme(); return; }
    const c = e.target.closest(".custom");
    if (c) picker.open(c, P.accent, (v) => { P.accent = v; applyTheme(); }, () => savePrefs(), [["Palette", inPlay()]]);
  };
  $("theme").onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b || b.classList.contains("on")) return; P.theme = b.dataset.v; savePrefs(); window.UI ? UI.swap(applyTheme) : applyTheme(); };

  $("safe").onchange = (e) => { P.safe = e.target.checked; savePrefs(); toast(P.safe ? "Safe values on" : "Safe values off. Randomize uses full ranges"); };
  $("unlock").onchange = (e) => {
    if (e.target.checked) { e.target.checked = false; closeMenus(); openModal("unlockModal"); return; }
    P.unlock = false; savePrefs(); toast("Values locked to slider ranges");
  };
  $("unlockCancel").onclick = () => closeModal("unlockModal");
  $("unlockOk").onclick = () => { P.unlock = true; savePrefs(); $("unlock").checked = true; closeModal("unlockModal"); toast("Values unlocked"); };
  const settingsJSON = () => JSON.stringify({ app: "isoline", version: 5, appVersion: VERSION, settings: S }, null, 2);
  $("exportSettings").onclick = () => { closeMenus(); download(new Blob([settingsJSON()], { type: "application/json" }), `isoline-settings-${S.seed}.json`, "Settings saved"); };
  $("copySettings").onclick = async () => { closeMenus(); try { await navigator.clipboard.writeText(settingsJSON()); toast("Settings copied"); } catch (e) { toast("Clipboard blocked. Use Download"); } };
  $("importSettings").onclick = () => { closeMenus(); $("importErr").hidden = true; $("importText").value = ""; openModal("importModal"); $("importText").focus(); };
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
      toast("Opening GitHub instead");
    }
    let body = text || "_No details given._";
    if (details) body += "\n\n<details><summary>Page details</summary>\n\n" + details + "\n</details>";
    window.open(`${ISSUES}?title=${encodeURIComponent(`${name}: ${subj}`)}&labels=${label}&body=${encodeURIComponent(body.slice(0, 6000))}`, "_blank", "noopener");
    done("Thanks. Post it on the GitHub page that opened.");
  };
  if (FEEDBACK_URL) { $("fbOk").lastChild.textContent = "Send"; $("fbOk").querySelector("svg").remove(); $("feedbackModal").querySelector(".note").textContent = "Goes straight to the team as a GitHub issue."; }
  const LOG = window.CHANGELOG || [], VERSION = LOG[0]?.v || "2.0.0", BUILD = "__BUILD__", stamped = !BUILD.startsWith("__");
  const logDate = (at) => new Date(at).toLocaleString(I18N.lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  $("verLine").textContent = stamped && LOG[0] ? `Version ${VERSION} from ${logDate(LOG[0].at)}` : `Version ${VERSION}, local copy`;
  if (stamped) $("verLine").title = `Build ${BUILD}`;
  $("changelogVer").textContent = VERSION;
  const LOG_KINDS = [["feat", "Added"], ["fix", "Fixed"], ["perf", "Faster"], ["", "Changed"]];
  const renderLog = () => {
    const box = $("logList");
    if (box.childElementCount) return;
    box.innerHTML = LOG.map((e) => {
      const groups = LOG_KINDS.map(([k, name]) => [name, e.items.filter(([t]) => (k ? t === k : !LOG_KINDS.some(([kk]) => kk && kk === t)))]).filter(([, l]) => l.length);
      return `<section class="log-entry"><div class="log-meta"><b>${esc(e.title)}</b><span class="mono" translate="no">${esc(e.v)}</span><time datetime="${esc(e.at)}">${esc(logDate(e.at))}</time></div>${e.media ? `<img class="log-media" src="${esc(e.media)}" alt="" loading="lazy">` : ""}${groups.map(([name, l]) => `<div class="log-group"><small>${name}</small><ul>${l.map(([, s]) => `<li>${esc(s)}</li>`).join("")}</ul></div>`).join("")}</section>`;
    }).join("");
  };
  $("changelogBtn").onclick = () => { closeMenus(); renderLog(); openModal("changelogModal"); $("logList").scrollTop = 0; };
  $("logClose").onclick = () => closeModal("changelogModal");
  $("verReload").onclick = () => location.reload();
  let updateSeen = false;
  const checkVersion = () => { if (!stamped || updateSeen || location.protocol === "file:") return; fetch("version.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((v) => { if (v?.build && v.build !== BUILD) { updateSeen = true; $("verLine").textContent = `Version ${VERSION}, a newer build is out`; $("verReload").hidden = false; toast("New version out. Reload to update"); } }).catch(() => {}); };
  checkVersion();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkVersion(); });
  $("importCancel").onclick = () => closeModal("importModal");
  $("importFile").onchange = async (e) => { const f = e.target.files?.[0]; if (f) $("importText").value = await f.text(); e.target.value = ""; };
  $("importOk").onclick = () => {
    try {
      const data = JSON.parse($("importText").value);
      importData(data);
      closeModal("importModal");
    } catch (err) {
      $("importErr").textContent = "That isn't an Isoline settings file. Paste the JSON from Copy settings or choose a downloaded .json.";
      $("importErr").hidden = false;
    }
  };
  const SCHEMA = 6, LIB = "isoline-designs-v1", MAX_VERSIONS = 30;
  let lib = (() => { try { const v = JSON.parse(localStorage.getItem(LIB) || "null"); return Array.isArray(v?.items) ? v.items : []; } catch (e) { return []; } })();
  const saveLib = () => {
    try { localStorage.setItem(LIB, JSON.stringify({ schema: 1, items: lib })); return true; }
    catch (e) { toast("Storage full. Delete or export designs"); return false; }
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const libItem = (id) => lib.find((d) => d.id === id);
  const latest = (d) => d.versions[d.versions.length - 1];
  const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ago = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 50) return "just now";
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    const d = new Date(t);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  };
  const when = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  async function thumbURL() {
    try { const c = await window.Studio.snapshot(160, 100); return c.toDataURL("image/jpeg", 0.82); } catch (e) { return ""; }
  }
  function compat(src, meta = {}) {
    const notes = [], names = (ids) => ids.map((x) => `"${x}"`).join(", ");
    if (meta.schema > SCHEMA) notes.push(`It was saved with a newer Isoline${meta.app ? ` (${meta.app})` : ""}, so settings this version doesn't know are left out.`);
    else { const extra = Object.keys(src).filter((k) => !(k in DEFAULTS) && !k.startsWith("_")); if (extra.length) notes.push(`${extra.length === 1 ? "One setting isn't" : `${extra.length} settings aren't`} known to this version and ${extra.length === 1 ? "is" : "are"} left out.`); }
    if (src.pattern && !T.PATTERNS.some((p) => p.id === src.pattern)) notes.push(`The ${names([src.pattern])} pattern isn't available, so Terrain stands in.`);
    const g = src.grad || {};
    if (g.type && !GENS.some((x) => x[0] === g.type)) notes.push(`The ${names([g.type])} generator isn't available, so Mesh stands in.`);
    if (g.noise && !NOISE_TYPES.some((x) => x[0] === g.noise)) notes.push(`The ${names([g.noise])} noise isn't available.`);
    const fx = (src.fxOrder || []).filter((id) => !FX_IDS.includes(id));
    if (fx.length) notes.push(`${fx.length === 1 ? "The effect" : "The effects"} ${names(fx)} ${fx.length === 1 ? "isn't" : "aren't"} available and ${fx.length === 1 ? "is" : "are"} left out.`);
    if (src.source === "gradient" && g.type === "image" && g.image && g.image !== IMG?.id) notes.push("Its picture isn't stored in this browser, so a placeholder shows until you add one.");
    return notes;
  }
  let pending = null;
  function openState(src, meta, then, boot = false) {
    const notes = compat(src, meta);
    const go = () => { S = withDefaults(src); sel = null; if (boot && !notes.length) { bootShared = false; update({ instant: true }); } else update({ fade: true }); then?.(); };
    if (!notes.length) return go();
    pending = go;
    $("compatList").innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join("");
    openModal("compatModal");
  }
  $("compatOk").onclick = () => { closeModal("compatModal"); const f = pending; pending = null; f?.(); };
  $("compatCancel").onclick = () => { pending = null; closeModal("compatModal"); };

  function dzSync() {
    const cur = libItem(P.designId);
    if (!cur && P.designId) { P.designId = null; savePrefs(); }
    const dirty = cur && !sameState(latest(cur).state, S);
    if (document.activeElement !== $("dzName")) $("dzName").value = cur?.name || "";
    $("dzState").textContent = !cur ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved";
    $("dzState").classList.toggle("dirty", !!dirty);
    $("dzVersion").hidden = !cur; $("dzVersion").disabled = !dirty; if (cur) $("dzVersionOf").textContent = cur.name;
    $("dzExportAll").disabled = !lib.length;
    const list = $("dzList");
    if (!lib.length) { list.innerHTML = `<p class="dz-empty">No saved designs yet.</p>`; return; }
    const open = list.dataset.open || "";
    list.innerHTML = lib.slice().sort((a, b) => b.updated - a.updated).map((d) => `
      <div class="dz-item${d.id === P.designId ? " on" : ""}${d.id === open ? " open" : ""}" data-id="${d.id}">
        <button class="dz-main" data-act="open" title="Open the latest version">
          <span class="dz-thumb">${d.thumb ? `<img src="${d.thumb}" alt="">` : ""}</span>
          <span class="dz-text"><b>${esc(d.name || "Untitled design")}</b><small>${ago(d.updated)}${d.versions.length > 1 ? `, ${d.versions.length} versions` : ""}</small></span>
        </button>
        <button class="ib xs" data-act="versions" title="Earlier versions" aria-label="Earlier versions"${d.versions.length > 1 ? "" : " hidden"}><svg class="ic"><use href="#i-history"/></svg></button>
        <button class="ib xs" data-act="download" title="Download .json" aria-label="Download"><svg class="ic"><use href="#i-down"/></svg></button>
        <button class="ib xs" data-act="delete" title="Delete" aria-label="Delete"><svg class="ic"><use href="#i-trash"/></svg></button>
        <div class="dz-vers"><div>${d.versions.map((v, i) => ({ v, i })).reverse().map(({ v, i }) => `<button class="opt" data-act="restore" data-v="${i}"><span>Version ${i + 1}</span><span class="mono">${when(v.at)}</span></button>`).join("")}</div></div>
      </div>`).join("");
  }
  const freeName = (name) => { const taken = new Set(lib.map((d) => d.name)); if (!taken.has(name)) return name; const base = name.replace(/ \d+$/, ""); let n = 2; while (taken.has(`${base} ${n}`)) n++; return `${base} ${n}`; };
  async function saveDesign(asVersion = false) {
    const open = libItem(P.designId);
    let cur = asVersion ? open : null;
    const name = $("dzName").value.trim() || open?.name || `Design ${lib.length + 1}`;
    if (open && sameState(latest(open).state, S) && open.name === name) { toast(`${open.name} is already saved`); return; }
    const thumb = await thumbURL(), now = Date.now(), version = { at: now, schema: SCHEMA, app: VERSION, state: clone(S) };
    if (cur && sameState(latest(cur).state, S)) { cur.name = name; cur.updated = now; }
    else if (cur) { cur.name = name; cur.versions.push(version); if (cur.versions.length > MAX_VERSIONS) cur.versions.splice(0, cur.versions.length - MAX_VERSIONS); cur.thumb = thumb || cur.thumb; cur.updated = now; }
    else { cur = { id: uid(), name: freeName(name), created: now, updated: now, thumb, versions: [version] }; lib.push(cur); }
    if (!saveLib()) return;
    P.designId = cur.id; savePrefs(); dzSync();
    toast(asVersion ? `Saved version ${cur.versions.length} of ${cur.name}` : `Saved ${cur.name}`);
  }
  $("dzSave").onclick = () => saveDesign();
  $("dzVersion").onclick = () => saveDesign(true);
  $("dzName").onkeydown = (e) => { if (e.key === "Enter") saveDesign(); };
  $("dzList").onclick = (e) => {
    const b = e.target.closest("[data-act]"), item = e.target.closest(".dz-item");
    if (!b || !item) return;
    const d = libItem(item.dataset.id); if (!d) return;
    const act = b.dataset.act;
    if (act === "versions") { const list = $("dzList"); list.dataset.open = list.dataset.open === d.id ? "" : d.id; item.classList.toggle("open"); for (const x of list.querySelectorAll(".dz-item.open")) if (x !== item) x.classList.remove("open"); return; }
    if (act === "download") { download(new Blob([JSON.stringify({ app: "isoline", kind: "design", ...d }, null, 2)], { type: "application/json" }), `${(d.name || "design").replace(/[^\w-]+/g, "-").toLowerCase()}.isoline.json`, "Design saved"); return; }
    if (act === "delete") {
      lib = lib.filter((x) => x !== d); saveLib();
      if (P.designId === d.id) { P.designId = null; savePrefs(); }
      item.classList.add("leaving"); setTimeout(dzSync, 220);
      toastUndo(`Deleted ${d.name}`, () => { lib.push(d); saveLib(); dzSync(); });
      return;
    }
    const v = act === "restore" ? d.versions[+b.dataset.v] : latest(d);
    closeMenus();
    openState(v.state, v, () => { P.designId = d.id; savePrefs(); toast(act === "restore" ? `Opened version ${+b.dataset.v + 1} of ${d.name}` : `Opened ${d.name}`); });
  };
  const toastUndo = (msg, undo) => toast(msg, { action: "Undo", onAction: undo });
  $("dzExportAll").onclick = () => download(new Blob([JSON.stringify({ app: "isoline", kind: "designs", schema: 1, items: lib }, null, 2)], { type: "application/json" }), "isoline-designs.json", `${lib.length === 1 ? "1 design" : lib.length + " designs"} saved`);
  function importData(data) {
    const items = data?.kind === "designs" ? data.items : data?.kind === "design" ? [data] : null;
    if (items) {
      const ok = items.filter((d) => Array.isArray(d?.versions) && d.versions.length && d.versions.every((v) => v && typeof v.state === "object"));
      if (!ok.length) throw new Error("empty");
      for (const d of ok) { const copy = { id: libItem(d.id) ? uid() : d.id || uid(), name: String(d.name || "Imported design").slice(0, 60), created: d.created || Date.now(), updated: Date.now(), thumb: typeof d.thumb === "string" && d.thumb.startsWith("data:image/") ? d.thumb : "", versions: d.versions.slice(-MAX_VERSIONS) }; lib.push(copy); }
      if (!saveLib()) return;
      dzSync();
      const first = lib[lib.length - ok.length], v = latest(first);
      openState(v.state, v, () => { P.designId = first.id; savePrefs(); });
      toast(ok.length === 1 ? `Imported ${first.name}` : `Imported ${ok.length} designs`);
      return true;
    }
    const src = data && data.settings ? data.settings : data;
    if (!src || typeof src !== "object" || !("pattern" in src || "grad" in src)) throw new Error("not settings");
    openState(src, { schema: data.version, app: data.appVersion }, () => toast("Settings imported"));
    return true;
  }
  $("dzImport").onchange = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    closeMenus();
    try { importData(JSON.parse(await f.text())); } catch (err) { toast("Not an Isoline file"); }
  };

  function diffOf(a, d) {
    if (typeof a !== "object" || a === null || Array.isArray(a) || typeof d !== "object" || d === null || Array.isArray(d)) return JSON.stringify(a) === JSON.stringify(d) ? undefined : a;
    const out = {};
    for (const k of Object.keys(a)) { const v = diffOf(a[k], d[k]); if (v !== undefined) out[k] = v; }
    return Object.keys(out).length ? out : undefined;
  }
  function mergeInto(base, over) {
    for (const [k, v] of Object.entries(over || {})) base[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? mergeInto(base[k], v) : v;
    return base;
  }
  const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function pipe(bytes, Stream, mode) { const out = new Response(new Blob([bytes]).stream().pipeThrough(new Stream(mode))); return new Uint8Array(await out.arrayBuffer()); }
  async function shareCode(st) {
    const body = JSON.stringify({ s: SCHEMA, a: VERSION, d: diffOf(st, DEFAULTS) || {} }), raw = new TextEncoder().encode(body);
    if (window.CompressionStream) { try { return "z" + b64u(await pipe(raw, CompressionStream, "deflate-raw")); } catch (e) {} }
    return "j" + b64u(raw);
  }
  async function readCode(code) {
    const bytes = unb64u(code.slice(1));
    const raw = code[0] === "z" ? await pipe(bytes, DecompressionStream, "deflate-raw") : bytes;
    const v = JSON.parse(new TextDecoder().decode(raw));
    return { state: mergeInto(clone(DEFAULTS), v.d), meta: { schema: v.s, app: v.a } };
  }
  $("dzShare").onclick = async () => {
    const st = clone(S); delete st.fmt; delete st.pngScale;
    const url = `${location.origin}${location.pathname}#/studio?d=${await shareCode(st)}`;
    closeMenus();
    const pic = (S.source === "gradient" && S.grad.type === "image") || S.objects.some((o) => o.kind === "image") ? ", without pictures" : "";
    try { await navigator.clipboard.writeText(url); toast(`Link copied${pic}`); }
    catch (e) { history.replaceState(null, "", url); toast(`Link is in the address bar${pic}`); }
  };
  async function openShared() {
    const m = location.hash.match(/[?&]d=([\w-]+)/);
    if (!m) { if (bootShared) firstPainted(); return; }
    history.replaceState(null, "", location.pathname + location.search + "#/studio");
    try {
      const { state, meta } = await readCode(m[1]);
      const boot = bootShared;
      openState(state, meta, () => { P.designId = null; savePrefs(); toast("Shared design opened"); }, boot);
      if (boot && bootShared) firstPainted();
    } catch (e) { firstPainted(); toast("That link is broken"); }
  }
  addEventListener("hashchange", openShared);
  setTimeout(openShared, 0);
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && keyOf(e) === "s" && window.Shell?.route === "studio") { e.preventDefault(); saveDesign(); }
  });

  $("resetAll").onclick = () => { closeMenus(); S = withDefaults(null); sel = null; P.slot = "preset"; update(); toast("Reset", { action: "Undo", onAction: () => travel(-1) }); };

  let saver = null;
  window.claude?.use?.("downloads").then((d) => (saver = d)).catch(() => {});
  async function download(blob, name, done) {
    if (saver) {
      try { await saver.save({ filename: name, data: blob }); toast(done); }
      catch (e) { if (e?.code !== "declined") toast("Couldn't save. Use Copy"); }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(done);
  }
  const autoName = () => `isoline-${gen() === "contours" ? S.pattern : gen()}-${S.w}x${S.h}-${S.seed}`;
  const fmtBytes = (n) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB");
  const exportFmt = () => (S.fmt === "video" || S.fmt === "gif" || S.fmt === "html" ? S.fmt : isRaster(S) ? "png" : S.fmt);
  const animFmt = (f) => f === "video" || f === "gif";
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
    const jb = await fxJob(FXR, S, w, h);
    await step(on, S.fxOrder.length ? `Applying ${S.fxOrder.length === 1 ? "the effect" : S.fxOrder.length + " effects"}` : "Rendering", 0.35);
    FXR.render(jb);
    await step(on, "Compressing the PNG", 0.65);
    const blob = await new Promise((r) => fxCanvas.toBlob(r, "image/png"));
    render(false);
    return blob;
  }
  const pngBlob = (scale, on) => (isRaster(S) ? rasterPng(scale, on) : svgPng(scale, on));
  let exportTok = 0;
  const gifDims = () => { const sc = Math.min(S.gif.size / Math.min(S.w, S.h), 1600 / Math.max(S.w, S.h)); return [Math.round(S.w * sc), Math.round(S.h * sc)]; };
  const vidDims = () => { const even = (v) => Math.max(2, Math.round(v / 2) * 2), sc = Math.min(S.vid.size / Math.min(S.w, S.h), 3840 / Math.max(S.w, S.h)); return [even(S.w * sc), even(S.h * sc)]; };
  function refreshExport() {
    const raster = isRaster(S), fmt = exportFmt();
    exportTok++;
    for (const b of $("fmt").children) { b.classList.toggle("on", b.dataset.v === fmt); b.disabled = raster && b.dataset.v === "svg"; }
    $("rasterNote").hidden = !raster || animFmt(fmt) || fmt === "html";
    for (const b of $("pngScale").children) b.classList.toggle("on", +b.dataset.v === S.pngScale);
    $("pngScale").hidden = fmt !== "png";
    $("vidOpts").hidden = fmt !== "video";
    $("gifOpts").hidden = fmt !== "gif";
    $("vidNote").hidden = !animFmt(fmt) || S.motion.type !== "still";
    $("copy").hidden = animFmt(fmt) || fmt === "html";
    $("copyLbl").textContent = raster ? "Copy PNG" : "Copy SVG";
    $("dlLbl").textContent = fmt === "html" ? "Export HTML" : fmt === "video" ? (canMp4() ? "Export MP4" : "Export WebM") : fmt === "gif" ? (useWebp() ? "Export WebP" : "Export GIF") : "Download";
    if (!$("fname").dataset.edited) $("fname").value = autoName();
    let dims = fmt === "png" ? `${S.w * S.pngScale} × ${S.h * S.pngScale}` : `${S.w} × ${S.h}`;
    const facts = (rows) => ($("facts").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(""));
    if (fmt === "video") {
      const [W, H] = vidDims(), secs = S.motion.dur * S.vid.loops, mb = (W * H * S.vid.fps * 0.12 * secs) / 8 / 1048576;
      facts([["Dimensions", `${W} × ${H}`], ["Length", `${secs}s, ${Math.round(secs * S.vid.fps)} frames`], ["File size", `About ${mb < 1 ? mb.toFixed(1) : Math.round(mb)} MB`]]);
      return;
    }
    if (fmt === "gif") {
      const [W, H] = gifDims(), secs = S.motion.dur * S.vid.loops, n = Math.round(secs * S.gif.fps), mb = (W * H * n * (useWebp() ? 0.09 : 0.32)) / 1048576;
      facts([["Dimensions", `${W} × ${H}`], ["Length", `${secs}s, ${n} frames`], ["File size", `About ${mb < 1 ? mb.toFixed(1) : Math.round(mb)} MB`]]);
      return;
    }
    if (fmt === "svg") { facts([["Dimensions", dims], ["File size", fmtBytes(new Blob([current.svg]).size)]]); return; }
    if (fmt === "html") {
      const plays = [S.motion.type !== "still" && `${MOTION_NAME[S.motion.type]} loop`, ["touch", "trail"].some((id) => S.fxOrder.includes(id) && S.fx[id].on) && "Interactive"].filter(Boolean).join(", ");
      facts([["Fills", "The whole window"], ["Plays", plays || "A still frame"]]);
      return;
    }
    const tok = ++exportTok;
    facts([["Dimensions", dims], ["File size", "Measuring"]]);
    setTimeout(() => { if (tok !== exportTok || $("exportMenu").hidden) return; measure(); }, 420);
    const measure = async () => {
      try {
        const full = S.w * S.pngScale * S.h * S.pngScale;
        let src = fxCanvas;
        if (!isRaster(S)) { const k = Math.min(1, Math.sqrt(360000 / (S.w * S.h))); src = await rasterize(document.createElement("canvas"), current.svg, Math.round(S.w * k), Math.round(S.h * k)); }
        const b = await new Promise((r) => src.toBlob(r, "image/png"));
        if (tok !== exportTok || !b) return;
        const est = (b.size * full) / (src.width * src.height);
        facts([["Dimensions", dims], ["File size", "About " + fmtBytes(est)]]);
      } catch (e) { facts([["Dimensions", dims], ["File size", "Unknown"]]); }
    };
  }
  $("fname").oninput = (e) => { e.target.dataset.edited = e.target.value ? "1" : ""; };
  $("fmt").onclick = (e) => { const b = e.target.closest("button"); if (b && !b.disabled) { S.fmt = b.dataset.v; save(); refreshExport(); } };
  $("pngScale").onclick = (e) => { const v = e.target.closest("button")?.dataset.v; if (v) { S.pngScale = +v; save(); refreshExport(); } };
  for (const id of ["vidSize", "vidFps", "vidLoops", "gifSize", "gifFps", "gifLoops"]) $(id).addEventListener("click", () => setTimeout(refreshExport));
  const fileName = () => ($("fname").value.trim() || autoName()).replace(/\.(svg|png|mp4|webm|gif|webp|html)$/i, "");
  $("download").onclick = async () => {
    const fmt = exportFmt();
    if (fmt === "video") return exportVideo();
    if (fmt === "gif") return exportGif();
    if (fmt === "html") {
      setProg("Packing the page", 0.5);
      try { await download(await htmlExport(), fileName() + ".html", "HTML saved"); } catch (e) { toast("HTML export failed"); }
      setTimeout(hideProg, 600); return;
    }
    if (fmt === "svg") { setProg("Saving", 1); await download(new Blob([current.svg], { type: "image/svg+xml" }), fileName() + ".svg", "SVG saved"); setTimeout(hideProg, 600); return; }
    $("download").disabled = true;
    try {
      const blob = await pngBlob(S.pngScale, setProg);
      setProg("Saving", 1);
      await download(blob, fileName() + ".png", "PNG saved");
    } catch (e) { toast("PNG failed. Try a smaller scale"); }
    $("download").disabled = false; setTimeout(hideProg, 600);
  };
  async function copyOut() {
    if (!isRaster(S)) {
      try { await navigator.clipboard.writeText(current.svg); toast("Copied for Figma"); } catch (e) { toast("Clipboard blocked. Use Download"); }
      return;
    }
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(1) })]); toast("PNG copied"); } catch (e) { toast("Clipboard blocked. Use Download"); }
  }
  $("copy").onclick = copyOut;

  function groupOf(nodes, title, { open = true, hint, tip } = {}) {
    const g = UI.wrapGroup(nodes, title, { key: "studio-" + title, open, hint: hint ? "1" : "" });
    if (!g) return null;
    if (tip) g.querySelector(".grp-t").dataset.tip = tip;
    syncers.push(() => {
      g.hidden = ![...g.body.children].some((c) => !c.hidden);
      if (hint) g.setHint(hint());
    });
    return g;
  }
  const rowsOf = (host, labels) => [...host.children].filter((r) => labels.includes(r.querySelector(".label")?.textContent));
  const facts = (...xs) => xs.filter(Boolean).join(", ");
  groupOf([...rowsOf($("shape"), ["Scale", "Detail", "Angle", "Features", "Bulge", "Bulge size"]), document.querySelector(".seed-row")], "Scale and detail", { tip: "Shape size, fine detail and the seed that places them", hint: () => facts(px(S.scale), `seed ${S.seed}`) });
  groupOf(rowsOf($("shape"), ["Warp", "Liquify", "Liquify size"]), "Distortion", { tip: "Bends and swirls the pattern after it is made", hint: () => facts(`warp ${f2(S.warp)}`, S.liquify ? `liquify ${f2(S.liquify)}` : "") });
  groupOf([document.querySelector(".pts-head"), document.querySelector(".pt-actions"), $("ptHint"), $("pointCtrls")], "Points", { tip: "Hills and dips you place by hand. The lines flow around them", open: false, hint: () => (S.usePoints ? `${S.points.length} in use` : "Off") });
  groupOf([$("gradCtrls"), $("gradHint")], "Fine-tune", { tip: "Settings for this generator", hint: () => (gen() === "aura" ? facts(`size ${f2(S.grad.scale)}×`, `${S.grad.detail} layers`) : facts(`warp ${f2(S.grad.warp)}`)) });
  groupOf(rowsOf($("lines"), ["Count", "Gap", "Bias", "Thickness"]), "Spacing", { tip: "How many lines, and how they spread over the shape", hint: () => (linear() ? px(S.gap) + " gap" : S.levels + " levels") });
  groupOf(rowsOf($("lines"), ["Weight", "Swell", "Swell size", "Taper"]), "Stroke", { tip: "How each line is drawn", hint: () => facts(f2(S.weight) + "px", S.swell ? "swell" : "", S.taper ? "taper" : "") });
  groupOf(rowsOf($("lines"), ["Accent every", "Accent weight"]), "Accent lines", { tip: "Every few lines drawn heavier, like index contours on a map", open: false, hint: () => (S.indexEvery ? `every ${S.indexEvery}` : "Off") });
  groupOf(rowsOf($("lines"), ["Smooth", "Grid", "Clean"]), "Detail", { tip: "How finely the lines follow the shape", open: false, hint: () => facts(`smooth ${f2(S.smooth)}`, `grid ${px(S.res)}`) });
  { const sec = document.querySelector('.panel-sec[data-panel="colors"] [data-gen="contours"]'); groupOf([...sec.children], "Fine-tune", { tip: "How the colors fill the lines and the space between them", hint: () => facts(S.gradient || S.mode !== "lines" ? "blended" : "", S.transparent ? "transparent" : "", S.opacity < 1 ? pct(S.opacity) : "") }); }
  groupOf([$("motionMore")], "Timing", { tip: "Repeat, back and forth or once, and the easing", open: false, hint: () => facts({ loop: "loop", pingpong: "ping-pong", once: "once" }[S.motion.mode], S.motion.ease === "linear" ? "linear" : S.motion.ease) });

  const SPOTS = [[0.5, 0.5], [0.32, 0.4], [0.68, 0.6], [0.66, 0.34], [0.34, 0.66], [0.5, 0.3], [0.5, 0.7], [0.22, 0.5]];
  function addObject(kind, image = "") {
    if (S.objects.length >= 8) { toast("Up to 8 objects"); return; }
    const [x, y] = SPOTS.find(([a, b]) => !S.objects.some((o) => Math.hypot(o.x - a, o.y - b) < 0.08)) || [rnd(0.25, 0.75), rnd(0.25, 0.75)];
    const o = { ...OBJ_DEFAULT, id: objId(), kind, x, y, image, size: S.objects.length ? 0.36 : 0.5, mat: kind === "image" ? "photo" : "shaded", spin: kind === "image" ? 0 : 30, tilt: kind === "image" ? 0 : 20, shadow: kind === "image" ? 0.3 : 0.4 };
    S.objects.push(o);
    P.slot = "obj:" + o.id;
    update(); schedulePreviews(0);
  }
  const objKindCards = {};
  for (const [id, label] of OBJ_KINDS) {
    const c = card(label, () => (id === "image" ? pickPicture((pid) => addObject("image", pid)) : addObject(id)), id === "image" ? "From your files" : "");
    $("objKinds").appendChild(c); objKindCards[id] = c;
  }
  const objFormCards = {};
  for (const [id, label] of OBJ_KINDS.filter(([k]) => k !== "image")) {
    const c = card(label, () => { const o = objOf(); if (!o || o.kind === id) return; o.kind = id; update(); });
    $("objForms").appendChild(c); objFormCards[id] = c;
  }
  $("objPicReplace").onclick = () => pickPicture((pid) => { const o = objOf(); if (o) { o.image = pid; update(); } });
  $("objDup").onclick = () => { const o = objOf(); if (!o || S.objects.length >= 8) return toast("Up to 8 objects"); const c = { ...clone(o), id: objId(), x: clamp(o.x + 0.06, 0, 1), y: clamp(o.y + 0.06, 0, 1) }; S.objects.push(c); P.slot = "obj:" + c.id; update(); };
  $("objRemove").onclick = () => { const o = objOf(); if (!o) return; S.objects = S.objects.filter((x) => x !== o); P.slot = S.objects.length ? "obj:" + S.objects[S.objects.length - 1].id : "addobj"; update(); };
  const TEX_DEFAULT = { proj: "wrap", texScale: 1, texRot: 0, texX: 0, texY: 0, blend: 0 };
  const ob = (key) => ({ get: () => objOf()?.[key] ?? OBJ_DEFAULT[key] ?? TEX_DEFAULT[key], set: (v) => { const o = objOf(); if (o) o[key] = v; } });
  const isPic = () => objOf()?.kind === "image";
  {
    const host = $("objGroups"), groups = {}, G = (title, open = true) => { const g = UI.group(title, { key: "obj-" + title, open }); host.appendChild(g); groups[title] = g; return g.body; };
    const mat = G("Material");
    const seg = document.createElement("div"); seg.className = "seg sm grid2"; seg.id = "objMat";
    seg.innerHTML = [...OBJ_MATS, ...PIC_MATS].map(([v, l, tip]) => `<button data-v="${v}" data-tip="${tip}">${l}</button>`).join("");
    mat.appendChild(seg);
    makeSeg(seg, () => { const o = objOf(); return o?.mat === "vanta" && !isPic() ? "preset" : o?.mat; }, (v) => { const o = objOf(); if (o) o.mat = v; });
    syncers.push(() => { const pic = isPic(); for (const b of seg.children) if (b.dataset.v) b.hidden = b.dataset.v === "vanta" ? !pic : pic !== PIC_MATS.some(([k]) => k === b.dataset.v); });
    const pr = document.createElement("div"); pr.className = "label-row obj-preset";
    pr.innerHTML = `<span class="label">Preset</span>`;
    const pseg = document.createElement("div"); pseg.className = "seg"; pseg.innerHTML = [`<button data-v="Vantablack" data-tip="Flat black that swallows the light">Vantablack</button>`, ...PRESETS.map(([, n]) => `<button data-v="${n}">${n}</button>`)].join("");
    pr.appendChild(pseg); mat.appendChild(pr);
    makeSeg(pseg, () => (objOf()?.mat === "vanta" ? "Vantablack" : objOf()?.preset), (v) => { const o = objOf(); if (!o) return; if (v === "Vantablack") o.mat = "vanta"; else { o.mat = "preset"; o.preset = v; } });
    UI.dropdown(pseg, { label: "Preset" });
    syncers.push(() => (pr.hidden = isPic() || !["preset", "vanta"].includes(objOf()?.mat)));
    const pct = (v) => Math.round(v * 100) + "%";
    const tex = G("Texture");
    const tseg = document.createElement("div"); tseg.className = "seg sm"; tseg.id = "objProj";
    tseg.innerHTML = `<button data-v="wrap" data-tip="One copy on each side">Wrap</button><button data-v="front" data-tip="Projected straight through from the front">Front</button><button data-v="sphere" data-tip="Wrapped around like a map on a globe">Globe</button>`;
    tex.appendChild(tseg);
    makeSeg(tseg, () => objOf()?.proj || "wrap", (v) => { const o = objOf(); if (o) o.proj = v; });
    makeSlider(tex, { label: "Scale", ...ob("texScale"), tip: "Size of the picture on the surface. Smaller repeats it", min: 0.1, max: 6, step: 0.01, log: true, fmt: (v) => f2(v) + "×", rand: [0.5, 2] });
    makeSlider(tex, { label: "Rotate", ...ob("texRot"), tip: "Turns the picture on the surface", min: -180, max: 180, step: 1, fmt: deg, rand: [-45, 45] });
    makeSlider(tex, { label: "Shift left to right", ...ob("texX"), tip: "Slides the picture across the surface", min: -1, max: 1, step: 0.005, pct: true, fmt: pct, rand: [-0.5, 0.5] });
    makeSlider(tex, { label: "Shift top to bottom", ...ob("texY"), tip: "Slides the picture up or down the surface", min: -1, max: 1, step: 0.005, pct: true, fmt: pct, rand: [-0.5, 0.5] });
    makeSlider(tex, { label: "Edge blend", ...ob("blend"), tip: "How softly the sides blend where they meet. Sharp gives each side its own copy", min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Sharp"), rand: [0, 0.6], when: () => (objOf()?.proj || "wrap") === "wrap" && !["pyramid", "diamond"].includes(objOf()?.kind) });
    syncers.push(() => (groups.Texture.hidden = isPic() || !["design", "preset"].includes(objOf()?.mat)));
    const place = G("Placement");
    makeSlider(place, { label: "Left to right", ...ob("x"), min: 0, max: 1, step: 0.001, pct: true, fmt: pct, rand: [0.2, 0.8] });
    makeSlider(place, { label: "Top to bottom", ...ob("y"), min: 0, max: 1, step: 0.001, pct: true, fmt: pct, rand: [0.2, 0.8] });
    makeSlider(place, { label: "Size", ...ob("size"), min: 0.05, max: 1.5, step: 0.005, pct: true, fmt: pct, rand: [0.25, 0.7] });
    makeSlider(place, { label: "Rotate", ...ob("rot"), min: -180, max: 180, step: 1, fmt: deg, rand: [-40, 40] });
    const turn = G("Orientation");
    makeSlider(turn, { label: "Tilt", ...ob("tilt"), min: -90, max: 90, step: 1, fmt: deg, rand: [-35, 45] });
    makeSlider(turn, { label: "Spin", ...ob("spin"), min: -180, max: 180, step: 1, fmt: deg, rand: [-90, 90] });
    const glass = G("Glass");
    const bseg = document.createElement("div"); bseg.className = "seg sm"; bseg.id = "objBody";
    bseg.innerHTML = `<button data-v="surface" data-tip="Bends what's behind by the slope of the surface">Surface</button><button data-v="body" data-tip="Light goes in, across and out again, like real glass">Through the body</button>`;
    glass.appendChild(bseg);
    makeSeg(bseg, () => (objOf()?.body ? "body" : "surface"), (v) => { const o = objOf(); if (o) o.body = v === "body"; });
    makeSlider(glass, { label: "Refraction", ...ob("refract"), min: 0, max: 3, step: 0.01, fmt: f2, rand: [0.6, 1.8] });
    makeSlider(glass, { label: "Frost", ...ob("frost"), min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0, 0.5] });
    makeSlider(glass, { label: "Dispersion", ...ob("disp"), min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0.1, 0.6] });
    makeSlider(glass, { label: "Rim light", ...ob("rim"), min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0.3, 0.8] });
    makeColor(glass, "Tint", () => objOf()?.tint || "#ffffff", (v) => { const o = objOf(); if (o) o.tint = v; });
    makeSlider(glass, { label: "Tint amount", ...ob("tintAmt"), min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0, 0.5] });
    syncers.push(() => (groups.Glass.hidden = isPic() || objOf()?.mat !== "glass"));
    const lay = G("Layer and motion");
    const lseg = document.createElement("div"); lseg.className = "seg sm"; lseg.id = "objLayer";
    lseg.innerHTML = `<button data-v="under" data-tip="Effects apply to it">Under effects</button><button data-v="over" data-tip="Sits on top, untouched by effects">Over effects</button>`;
    lay.appendChild(lseg);
    makeSeg(lseg, () => objOf()?.layer || "under", (v) => { const o = objOf(); if (o) o.layer = v; });
    makeSwitch(lay, "Moves with the motion", () => objOf()?.anim !== false, (v) => { const o = objOf(); if (o) o.anim = v; });
    makeSlider(lay, { label: "Speed", ...ob("speed"), min: -5, max: 5, step: 1, fmt: (v) => (v === 1 ? "1× in sync" : v === 0 ? "Still" : v + "×"), rand: [-3, 3], when: () => objOf()?.anim !== false, na: () => (S.motion.type === "still" ? "Turn on motion to see objects move" : "") });
    const surf = G("Surface", false);
    makeSlider(surf, { label: "Shine", ...ob("shine"), min: 0, max: 1, step: 0.01, pct: true, fmt: pct, rand: [0.3, 0.9] });
    makeSlider(surf, { label: "Merge", ...ob("merge"), tip: "Melts into other objects with Merge on", min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0, 0], when: () => !isPic() });
    makeSlider(surf, { label: "Ripple", ...ob("ripple"), min: 0, max: 2, step: 0.01, fmt: (v) => (v ? f2(v) : "Off"), rand: [0, 0.6], when: () => !isPic() });
    makeSlider(surf, { label: "Corners", ...ob("round"), min: 0, max: 1, step: 0.01, pct: true, fmt: pct, rand: [0, 0.5], when: isPic });
    makeSlider(surf, { label: "Shadow", ...ob("shadow"), min: 0, max: 1, step: 0.01, pct: true, fmt: (v) => (v ? pct(v) : "Off"), rand: [0.2, 0.6] });
    syncers.push(() => {
      const o = objOf(); if (!o) return;
      $("objForms").hidden = isPic(); $("objPicRow").hidden = !isPic();
      for (const [id, c] of Object.entries(objFormCards)) c.classList.toggle("on", id === o.kind);
    });
  }

  const keyOf = (e) => (/^Key[A-Z]$/.test(e.code) ? e.code[3].toLowerCase() : /^Digit\d$/.test(e.code) ? e.code[5] : (e.key || "").toLowerCase());
  const SLOT_KEYS = ["preset", "generator", "shape", "lines", "colors", "addfx", "motion"];
  document.addEventListener("keydown", (e) => {
    const typing = !!e.target.matches?.("input:not([type=range]):not([type=checkbox]), textarea");
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Escape") { picker.close(); closeMenus(); for (const m of document.querySelectorAll(".modal")) m.hidden = true; if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    if (document.querySelector(".modal:not([hidden])")) return;
    if (window.Shell && window.Shell.route !== "studio") return;
    if (mod && keyOf(e) === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (mod && !typing && !e.shiftKey && !e.altKey && !String(getSelection()).length) {
      const k = keyOf(e), cur = P.slot.startsWith("fx:") || P.slot.startsWith("obj:") ? P.slot : "";
      if (k === "c" && cur) { e.preventDefault(); copyItem(cur); return; }
      if (k === "v" && clip) { e.preventDefault(); pasteItem(clip.k); return; }
    }
    if (typing || mod || e.altKey) return;
    const key = keyOf(e);
    if (key === "r") { e.preventDefault(); if (e.shiftKey) surprise(); else { variation(); update({ fade: true }); } }
    else if (key === "c") copyOut();
    else if (key === "h" && (P.slot.startsWith("fx:") || P.slot.startsWith("obj:"))) toggleHidden(P.slot);
    else if (key === "e") $("exportBtn").click();
    else if (/^[1-7]$/.test(key)) { const s = SLOT_KEYS[+key - 1]; if (s !== "lines" || gen() === "contours") setSlot(s); }
    else if ((e.key === "Delete" || e.key === "Backspace") && objOf()) { e.preventDefault(); $("objRemove").click(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && sel != null) {
      e.preventDefault();
      if (S.source === "gradient") { if (S.grad.colors.length > 2) { S.grad.colors.splice(sel, 1); S.grad.points.splice(sel, 1); } }
      else S.points.splice(sel, 1);
      sel = null; update();
    }
  });

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

  let FXR = null, TFX = null;
  const thumbCanvas = document.createElement("canvas");
  try { FXR = window.TopoFX.createFX(fxCanvas); } catch (e) { FXR = null; }
  try { TFX = window.TopoFX.createFX(thumbCanvas); } catch (e) { TFX = null; }
  let showT = 0;
  let rolling = null;
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
  const isImg = (st) => st.source === "gradient" && st.grad.type === "image";
  const job = (st, w, h, image) => ({ w, h, k: w / st.w, seed: st.seed, image: isImg(st) ? imageCanvas(st, w, h) : image, grad: st.source === "gradient" && !isImg(st) ? st.grad : null, fx: st.fx, order: st.fxOrder, ink: st.ink, paper: st.paper, time: st._t || 0, motion: st._t != null ? st.motion.type : "still", motionAmt: st.motion?.amt, endless: st._t != null ? (unbound(st.motion) ? 2 : endless(st.motion) ? 1 : 0) : 0, path: st.motion?.path, mangle: st.motion?.angle, objects: objectsFor(st), palette: paletteOf(st) });
  const paletteOf = (st) => (st.source === "gradient" ? st.grad.colors : [st.bg, st.line, ...(st.mids || []), st.line2]).slice().sort((a, b) => lum(a) - lum(b));
  function objectsFor(st) {
    return (st.objects || []).filter((o) => !o.hidden).map((o) => {
      const t = o.kind === "image" ? picTex(o.image) : o.mat === "preset" ? presetTex(o.preset) : null;
      return { ...o, asp: t?.asp || 1, tex: t?.el || null, texKey: t?.key };
    });
  }

  const PICS_KEY = "isoline.pictures", PICS = new Map();
  const picTex = (id) => { const p = PICS.get(id); return p ? { el: p.el, key: "pic:" + id, asp: p.el.naturalWidth / Math.max(1, p.el.naturalHeight) } : null; };
  function loadPic(id, url) {
    const el = new Image();
    el.onload = () => { PICS.set(id, { el, url }); if (S.objects.some((o) => o.image === id)) { render(); schedulePreviews(); } };
    el.src = url;
  }
  try { for (const [id, url] of Object.entries(JSON.parse(localStorage.getItem(PICS_KEY) || "{}"))) loadPic(id, url); } catch (e) {}
  function storePics() {
    const used = new Set([...S.objects.map((o) => o.image), ...lib.flatMap((d) => d.versions.flatMap((v) => (v.state.objects || []).map((o) => o.image)))]);
    const keep = {};
    for (const [id, p] of PICS) if (used.has(id)) keep[id] = p.url;
    try { localStorage.setItem(PICS_KEY, JSON.stringify(keep)); return true; } catch (e) { return false; }
  }
  function pickPicture(then) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const url0 = URL.createObjectURL(f), el = new Image();
      el.onload = () => {
        const sc = Math.min(1, 1400 / Math.max(el.naturalWidth, el.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(el.naturalWidth * sc)); c.height = Math.max(1, Math.round(el.naturalHeight * sc));
        c.getContext("2d").drawImage(el, 0, 0, c.width, c.height); URL.revokeObjectURL(url0);
        const url = /png|webp|gif|svg/.test(f.type) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86), id = "i" + Date.now().toString(36);
        const img = new Image();
        img.onload = () => { PICS.set(id, { el: img, url }); then(id); if (!storePics()) toast("Too big to keep after a reload"); };
        img.src = url;
      };
      el.onerror = () => toast("Couldn't read that picture");
      el.src = url0;
    };
    inp.click();
  }
  const presetTexs = new Map();
  function presetTex(name) {
    const have = presetTexs.get(name);
    if (have instanceof HTMLCanvasElement) return { el: have, key: "pre:" + name, asp: 1.6 };
    if (!have && TFX) {
      presetTexs.set(name, "pending");
      setTimeout(async () => {
        const p = PRESETS.find((x) => x[1] === name); if (!p) return;
        const st = { ...resolveLook(p[2]), objects: [] }, W = 512, H = 320, c = document.createElement("canvas");
        c.width = W; c.height = H;
        if (isRaster(st)) { TFX.render(await fxJob(TFX, st, W, H, document.createElement("canvas"))); c.getContext("2d").drawImage(thumbCanvas, 0, 0); }
        else await rasterize(c, T.buildSVG({ ...st, w: W, h: H }, { w: W, h: H }).svg, W, H);
        presetTexs.set(name, c); render(); schedulePreviews();
      }, 0);
    }
    return null;
  }
  async function fxJob(R, st, w, h, canvas = rasterCanvas, res) {
    const gpu = st.source === "contours" && R?.floatOK ? T.gpuSpec(st, Math.max(st.res, res ? (res * st.w) / w : 0)) : null;
    const j = gpu || st.source !== "contours" ? { ...job(st, w, h, null), contours: gpu } : job(st, w, h, await rasterize(canvas, T.buildSVG(st, { w, h, ...(res ? { res } : {}) }).svg, w, h));
    await R?.prepare?.(j);
    return j;
  }
  let rzScale = 0, lowRes = 0, fitWH = "", glideUntil = 0;
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
    const sc = rzScale || (wrap.parentElement.classList.contains("fill") ? Math.max : Math.min)(aw / S.w, ah / S.h), key = S.w + "x" + S.h;
    const now = performance.now();
    if (!rzScale && fitWH && key !== fitWH) { art.style.transition = "width .48s var(--ease), height .48s var(--ease)"; glideUntil = now + 520; }
    else if (rzScale || now > glideUntil) art.style.transition = "none";
    fitWH = key;
    const W = Math.max(40, S.w * sc) + "px", H = Math.max(40, S.h * sc) + "px";
    if (art.style.width !== W) art.style.width = W;
    if (art.style.height !== H) art.style.height = H;
  }
  function previewDims(st, draft) {
    const dpr = Math.min(window.Lite?.on ? (playing || draft ? 1 : 1.25) : playing ? 1.5 : draft ? 1.25 : 2, window.devicePixelRatio || 1);
    let w = Math.max(64, Math.round((parseFloat(art.style.width) || art.clientWidth) * dpr)), h = Math.round((w * st.h) / st.w);
    const cap = playing ? 1600 : draft ? 1400 : 2200, m = Math.max(w, h);
    if (m > cap) { w = Math.round((w * cap) / m); h = Math.round((h * cap) / m); }
    return { w, h };
  }
  async function paint(st, draft, play = false) {
    const tok = ++paintTok, t0 = performance.now();
    fit();
    let raster = isRaster(st);
    if (raster && !FXR) { raster = false; if (!fxWarned) { fxWarned = true; toast("No WebGL2 here, so gradients and effects are off"); } }
    let svg = "";
    const gpu = st.source === "contours" && (play || draft || raster) && FXR?.floatOK ? T.gpuSpec(st, Math.max(st.res, 1.6 / Math.max(0.05, art.clientWidth / st.w))) : null;
    if (gpu) raster = true;
    else if (st.source === "contours") svg = T.buildSVG(st, play && playRes ? { res: playRes } : draft ? { res: Math.max(st.res * 2, 7) } : {}).svg;
    if (raster) {
      const { w, h } = previewDims(st, draft);
      let image = null;
      if (svg) { image = await rasterize(rasterCanvas, svg, w, h); if (tok !== paintTok) return null; }
      const jb = { ...job(st, w, h, image), contours: gpu, pointer: livePointer(st) };
      await FXR.prepare(jb); if (tok !== paintTok) return null;
      FXR.render(jb);
    } else { artSvg.innerHTML = svg; artSvg.firstElementChild?.setAttribute("preserveAspectRatio", "xMidYMid slice"); }
    fxCanvas.hidden = !raster; artSvg.hidden = raster;
    art.classList.toggle("clear", st.source === "contours" && st.transparent);
    $("ms").textContent = `${Math.round(performance.now() - t0)} ms`;
    $("kind").textContent = raster ? "PNG" : "SVG";
    painted = clone(play ? S : st);
    drawOverlay(st);
    return { svg, raster };
  }
  let bootShared = /[?&]d=/.test(location.hash), firstDone = null;
  window.firstPaint = new Promise((r) => (firstDone = r));
  const firstPainted = () => { bootShared = false; firstDone?.(); firstDone = null; };
  let renderWait = [];
  const offStudio = () => (window.Shell?.route ? window.Shell.route !== "studio" : !location.hash.startsWith("#/studio"));
  function render(draft = false) {
    cancelAnimationFrame(raf); cancelAnimationFrame(anim); anim = 0;
    if (offStudio() && isRaster(S) && !bootShared) return Promise.resolve(null);
    return new Promise((resolve) => {
      renderWait.push(resolve);
      raf = requestAnimationFrame(async () => {
        const mine = renderWait; renderWait = [];
        const t0 = performance.now(), r = await paint(S, draft);
        if (r && !draft) logStill(t0, r);
        if (r && !draft && !bootShared) firstPainted();
        if (r && !draft) { current = { ...r, of: JSON.stringify(painted) }; updateMini(); schedulePreviews(); }
        if (!r && renderWait.length) renderWait.push(...mine); else for (const f of mine) f(r);
      });
    });
  }

  const stillSeen = new Set();
  function logStill(t0, r) {
    const sig = lookSig();
    if (stillSeen.has(sig)) return;
    stillSeen.add(sig);
    (r.raster && FXR?.sync ? FXR.sync() : Promise.resolve()).then(() => perfLog(sig, [performance.now() - t0], "still"));
  }
  let queue = [], pumping = false, previewT = 0, quietUntil = 0;
  const quiet = (ms = 500) => (quietUntil = Math.max(quietUntil, performance.now() + ms));
  document.addEventListener("pointerdown", (e) => { quiet(e.target.closest(".top button, .dd-btn, .bar-btn, .tile") ? 500 : 250); }, true);
  for (const t of ["wheel", "keydown"]) document.addEventListener(t, () => quiet(160), { capture: true, passive: true });
  document.addEventListener("scroll", () => quiet(200), { capture: true, passive: true });
  document.addEventListener("transitionrun", () => quiet(350), true);
  const afterFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  async function calm() {
    while (window.Shell?.route !== "studio" || document.documentElement.classList.contains("vt") || document.hidden) await new Promise((r) => setTimeout(r, 250));
    for (const t0 = performance.now(); ; ) {
      const late = performance.now() - t0 > 1000 || !preferFps();
      if (!late && performance.now() < quietUntil) { await new Promise((r) => setTimeout(r, Math.min(250, quietUntil - performance.now() + 10))); continue; }
      await afterFrame();
      if (late || performance.now() >= quietUntil) return performance.now();
    }
  }
  function enqueue(jobs) { queue = jobs; if (!pumping) pump(); }
  async function pump() {
    pumping = true;
    await window.introDone;
    const next = () => { const i = queue.findIndex((j) => !j.at || inView(j.at())); return i < 0 ? 0 : i; };
    while (queue.length) {
      for (let n = 0; queue.length && !queue[next()].cheap && TFX?.ready && !TFX.ready() && n < 60; n++) await new Promise((r) => setTimeout(r, 50));
      const t = await calm();
      do {
        if (!queue.length) break;
        const j = queue.splice(next(), 1)[0], j0 = performance.now();
        try { await j(); } catch (e) {}
        if (j.full) { const d = performance.now() - j0; thumbMs = thumbMs ? thumbMs * 0.7 + d * 0.3 : d; }
      } while (queue.length && (preferFps() ? performance.now() - t < 6 && performance.now() >= quietUntil : performance.now() - t < 24));
    }
    pumping = false;
  }
  let revealAt = 0;
  function swapIn(slot, node) {
    const old = [...slot.children], now = performance.now();
    revealAt = Math.min(now + 480, Math.max(now, revealAt + 40));
    const wait = reduceMotion.matches || !preferFps() ? 0 : revealAt - now;
    node.classList.add("fresh");
    if (wait) node.style.animationDelay = wait + "ms";
    slot.appendChild(node);
    const drop = () => old.forEach((o) => o.remove());
    if (!old.length || reduceMotion.matches) drop();
    else { node.addEventListener("animationend", drop, { once: true }); setTimeout(drop, 700 + wait); }
    return node;
  }
  function putCanvas(slot, src, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, 0, 0, w, h);
    return swapIn(slot, c);
  }
  let TH_DPR = 1;
  const thDpr = () => { TH_DPR = window.Lite?.on ? 1 : Math.min(2, Math.max(1, devicePixelRatio || 1)); };
  thDpr();
  addEventListener("lite-change", () => { thDpr(); for (const pc of presetCards) pc.done = false; schedulePreviews(0); render(); });
  const svgNode = (markup) => { const t = document.createElement("template"); t.innerHTML = markup.trim(); return t.content.firstChild; };
  async function thumb(slot, st, w = 200, ar = 0.625, lq = false) {
    const h = Math.round(w * ar), s = { ...st, h: Math.round(st.w * ar) };
    const key = JSON.stringify(s.fxOrder?.length ? s : { ...s, fx: null, motion: null }) + w + ":" + TH_DPR, have = slot.lastElementChild;
    if (slot._thk === key && have && !have.classList.contains("lqip")) return have;
    const n = await drawThumb(slot, s, w, h, lq);
    if (!lq) slot._thk = n ? key : "";
    return n;
  }
  async function drawThumb(slot, s, w, h, lq) {
    if (!isRaster(s) || !TFX) {
      if (s.source !== "contours") { slot.innerHTML = ""; return null; }
      const z = 2, W = w * z, H = h * z;
      const n = svgNode(T.buildSVG(s, { w: W, h: H, res: 2.5 * z * (lq ? 4 : 1), minLen: 8 }).svg.replace(/^<svg([^>]*?) width="\d+" height="\d+" viewBox="[^"]*"/, `<svg$1 width="${w}" height="${h}" viewBox="${(W - w) / 2} ${(H - h) / 2} ${w} ${h}"`));
      if (lq) n.classList.add("lqip");
      return swapIn(slot, n);
    }
    const k = lq ? 1 / 6 : TH_DPR, W = Math.max(16, Math.round(w * k)), H = Math.max(10, Math.round(h * k));
    TFX.render(await fxJob(TFX, s, W, H, thumbRaster, 2.5));
    if (lq) { const n = soften(thumbCanvas, W, H, w, h); n.classList.add("lqip"); return swapIn(slot, n); }
    return putCanvas(slot, thumbCanvas, W, H);
  }
  function soften(src, sw, sh, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), b = Math.max(2, w / 22);
    x.imageSmoothingQuality = "high";
    if ("filter" in x) x.filter = `blur(${b}px)`;
    x.drawImage(src, 0, 0, sw, sh, -b * 2, -b * 2, w + b * 4, h + b * 4);
    return c;
  }
  let thumbMs = 0;
  const slowThumbs = () => thumbMs > 25 || (!thumbMs && !!window.Lite?.on);
  function inView(el) {
    if (!el?.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    const box = el.closest("#options, #slots")?.getBoundingClientRect();
    return !box || (r.bottom > box.top && r.top < box.bottom);
  }
  const thumbDir = () => `thumbs/${stamped ? BUILD : "dev"}/${TH_DPR}/`;
  const thumbCache = window.caches && isSecureContext ? caches.open("isoline-thumbs").catch(() => null) : Promise.resolve(null);
  thumbCache.then((c) => c?.keys().then((ks) => { for (const k of ks) if (!k.url.includes("/" + thumbDir())) c.delete(k); })).catch(() => {});
  async function cachedThumb(slot, name) {
    try {
      const r = await (await thumbCache)?.match(thumbDir() + encodeURIComponent(name));
      if (!r) return false;
      const blob = await r.blob();
      if (blob.type === "image/svg+xml") { swapIn(slot, svgNode(await blob.text())); return true; }
      const img = new Image(), url = URL.createObjectURL(blob);
      img.src = url; await img.decode(); URL.revokeObjectURL(url);
      swapIn(slot, img); return true;
    } catch (e) { return false; }
  }
  const lookHash = (look) => { const t = JSON.stringify(look); let a = 0x811c9dc5; for (let i = 0; i < t.length; i++) a = Math.imul(a ^ t.charCodeAt(i), 16777619); return (a >>> 0).toString(36); };
  let sheet = null;
  const presetSheet = () => (sheet ||= fetch("previews/presets.json", { priority: "low" }).then((r) => (r.ok ? r.json() : null)).then(async (m) => {
    if (!m) return null;
    const img = new Image(); img.src = "previews/presets.webp" + (m.v ? "?v=" + m.v : ""); await img.decode();
    return { m, img };
  }).catch(() => null));
  async function sheetThumb(slot, pc) {
    const s = await presetSheet(), it = s?.m.items[pc.name];
    if (!it || it[1] !== lookHash(pc.look)) return false;
    const { w, h, cols } = s.m, c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(s.img, (it[0] % cols) * w, Math.floor(it[0] / cols) * h, w, h, 0, 0, w, h);
    swapIn(slot, c); return true;
  }
  const phOf = (st) => `linear-gradient(135deg, ${st.source === "contours" ? `${st.bg} 30%, color-mix(in oklab, ${st.bg} 70%, ${st.line})` : st.grad.colors.join(", ")})`;
  Promise.resolve().then(() => {
    for (const pc of presetCards) try { slotOf(pc.el).style.setProperty("--ph", phOf(resolveLook(pc.look))); } catch (e) {}
    return presetSheet();
  }).then(() => Promise.all(presetCards.map(async (pc) => { if (!pc.done && (await sheetThumb(slotOf(pc.el), pc))) pc.done = true; }))).catch(() => {});
  function keepThumb(name, node) {
    const put = (c, body, type) => c.put(thumbDir() + encodeURIComponent(name), new Response(body, { headers: { "content-type": type } })).catch(() => {});
    thumbCache.then((c) => {
      if (!c || !node) return;
      if (node instanceof HTMLCanvasElement) node.toBlob((b) => b && put(c, b, b.type), "image/webp", 0.92);
      else put(c, node.outerHTML, "image/svg+xml");
    });
  }
  const slotOf = (c) => c.querySelector(".th");
  const noFx = (st) => ({ ...st, fxOrder: [], objects: [] });
  const strokes = (st) => (st.source === "contours" ? readable({ ...st, gradient: false, mode: "lines", transparent: false, opacity: 1, swell: 0, taper: 0, indexEvery: 0 }) : st);
  const hexDist = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const readable = (st) => (st.mode !== "layers" && /^#[0-9a-f]{12}$/i.test(st.line + st.bg.slice(1)) && hexDist(st.line, st.bg) < 60 ? { ...st, line: st.line2, line2: st.line } : st);
  const lightLines = (st) => ({ ...st, gap: Math.max(st.gap, st.w / 18), levels: Math.min(st.levels, 12), weight: Math.max(st.weight, 2.4) });
  function schedulePreviews(delay = 260) { clearTimeout(previewT); previewT = setTimeout(buildPreviews, preferFps() ? delay : Math.min(delay, 60)); }
  async function effectBase(W, H, final = true) {
    baseCanvas.width = W; baseCanvas.height = H;
    const x = baseCanvas.getContext("2d");
    if (final && current.raster) {
      const sw = fxCanvas.width, sh = Math.min(fxCanvas.height, sw * 0.625);
      x.drawImage(fxCanvas, 0, (fxCanvas.height - sh) / 2, sw, sh, 0, 0, W, H);
    } else if (S.source === "gradient" || S.objects.length) {
      TFX.render(await fxJob(TFX, { ...S, fxOrder: [], h: Math.round(S.w * 0.625) }, W, H, document.createElement("canvas"), 2.5));
      x.drawImage(thumbCanvas, 0, 0, W, H);
    } else await rasterize(baseCanvas, T.buildSVG({ ...S, h: Math.round(S.w * 0.625) }, { w: W, h: H, res: 2.5 }).svg, W, H);
  }
  const fxThumb = (id, W, H) => { TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: { [id]: { ...S.fx[id], on: true } }, order: [id], ink: S.ink, paper: S.paper, pointer: demoPointer() }); return thumbCanvas; };
  const fxUpTo = (id, W, H) => { TFX.render({ w: W, h: H, k: W / S.w, seed: S.seed, image: baseCanvas, grad: null, fx: { ...S.fx, [id]: { ...S.fx[id], hidden: false } }, order: S.fxOrder.slice(0, S.fxOrder.indexOf(id) + 1), ink: S.ink, paper: S.paper }); return thumbCanvas; };
  function baseOf(st) {
    const b = clone(noFx(st));
    for (const key of LAYERS.shape) if (key !== "source" && key !== "grad.type" && key !== "pattern" && key !== "grad.image") setPath(b, key, clone(getPath(DEFAULTS, key)));
    b.seed = st.seed; b.usePoints = false;
    return b;
  }
  function buildPreviews() {
    if (drag) return;
    try { document.querySelector('[data-page="studio"]').style.setProperty("--ph", phOf(S)); } catch (e) {}
    const jobs = [];
    const tileJob = (key, st) => jobs.push(async () => { const el = $("slotList").querySelector(`[data-th="${key}"]`); if (!el) return; await thumb(el, st, 64); });
    tileJob("preset", S);
    const gb = baseOf(S); if (GEN_BASE[gen()]) Object.assign(gb.grad, GEN_BASE[gen()]);
    tileJob("generator", lightLines(strokes(gb)));
    tileJob("shape", lightLines(strokes(noFx(S))));
    if (gen() === "contours") tileJob("lines", lightLines(noFx(S)));
    if (TFX && S.fxOrder.length) jobs.push(async () => {
      await effectBase(128, 80, false);
      for (const id of S.fxOrder) { const el = $("slotList").querySelector(`[data-th="fx:${id}"]`); if (!el) continue; putCanvas(el, fxUpTo(id, 128, 80), 128, 80); }
    });
    const p = panelOf(P.slot);
    const quick = [], lq = slowThumbs();
    const card = (el, st, w, skip, done) => {
      const at = () => (el.isConnected ? el : null), get = () => (typeof st === "function" ? st() : st);
      const f = async () => { if (skip?.()) return; const n = await thumb(el, get(), w); done?.(n); };
      f.at = at; f.full = true; jobs.push(f);
      if (lq) { const q = () => (skip?.() ? null : thumb(el, get(), w, 0.625, true)); q.at = at; quick.push(q); }
    };
    if (p === "preset") {
      const todo = presetCards.filter((pc) => !pc.done && !pc.el.hidden);
      const kept = async () => { await Promise.all(todo.map(async (pc) => { if ((await sheetThumb(slotOf(pc.el), pc)) || (await cachedThumb(slotOf(pc.el), pc.name))) pc.done = true; })); };
      kept.cheap = true; quick.unshift(kept);
      for (const pc of todo) card(slotOf(pc.el), () => resolveLook(pc.look), 220, () => pc.done, (n) => { keepThumb(pc.name, n); pc.done = true; });
    }
    if (p === "generator") for (const [id] of GENS) card(slotOf(genCards[id]), () => { const b = baseOf(S), st = id === "contours" ? asContours(b) : asGradient(b, id); if (GEN_BASE[id]) Object.assign(st.grad, GEN_BASE[id]); return lightLines(st); }, 200);
    if (p === "shape") {
      if (gen() === "contours") for (const pt of T.PATTERNS) card(slotOf(patCards[pt.id]), () => lightLines(strokes({ ...noFx(S), pattern: pt.id })), 130);
      if (gen() === "noise") for (const [id] of NOISE_TYPES) card(slotOf(noiseCards[id]), () => ({ ...noFx(S), grad: { ...S.grad, noise: id } }), 130);
      varCards.forEach((c, i) => { c._seed = variationSeed(i); card(slotOf(c), { ...S, seed: c._seed }, 130); });
    }
    for (const o of S.objects) tileJob("obj:" + o.id, { ...noFx(S), objects: [{ ...o, hidden: false, x: 0.5, y: 0.5, size: Math.min(0.9, Math.max(0.6, o.size)) }] });
    if (p === "addobj") for (const [id] of OBJ_KINDS) if (id !== "image" || [...PICS.keys()].length) card(slotOf(objKindCards[id]), () => ({ ...noFx(S), objects: [{ ...OBJ_DEFAULT, kind: id, image: [...PICS.keys()].pop() || "", mat: id === "image" ? "photo" : "shaded", size: 0.62, tilt: id === "image" ? 0 : 20 }] }), 130);
    if (p === "object" && objOf() && !isPic()) { const o = objOf(); for (const id of Object.keys(objFormCards)) card(slotOf(objFormCards[id]), { ...noFx(S), objects: [{ ...o, kind: id, x: 0.5, y: 0.5, size: 0.62 }] }, 130); }
    if (p === "lines" && gen() === "contours") for (const m of Object.keys(modeCards)) card(slotOf(modeCards[m]), () => lightLines(readable({ ...noFx(S), mode: m })), 130);
    if (p === "addfx" && TFX) {
      jobs.push(() => effectBase(260, 163));
      for (const id of FX_IDS) { const el = slotOf(fxCards[id]), f = () => putCanvas(el, fxThumb(id, 260, 163), 260, 163); f.at = () => el; jobs.push(f); }
    }
    jobs.push(motionThumb);
    enqueue([...quick, ...jobs]);
  }

  const thumbSVG = (s, w, h) => { const z = 2, W = w * z, H = h * z; return T.buildSVG(s, { w: W, h: H, res: 2.5 * z, minLen: 8 }).svg.replace(/^<svg([^>]*?) width="\d+" height="\d+" viewBox="[^"]*"/, `<svg$1 width="${w}" height="${h}" viewBox="${(W - w) / 2} ${(H - h) / 2} ${w} ${h}"`); };
  let motionKey = "", motionTok = 0, motionRun = null;
  async function motionThumb() {
    const el = $("slotList").querySelector('[data-th="motion"]'); if (!el) return;
    const key = JSON.stringify(S);
    if (key === motionKey && el.children.length && !motionRun) return;
    if (key !== motionKey || !motionRun) {
      motionKey = key; motionTok++;
      if (reduceMotion.matches) { motionRun = null; await thumb(el, S, 64); return; }
      const still = S.motion.type === "still", M = still ? { ...S.motion, type: "drift", amt: 0.45, mode: "loop", dir: 1, ease: "linear", seed: 0 } : S.motion;
      motionRun = { M, base: still ? { ...S, motion: M } : S, frames: [] };
    }
    const tok = motionTok, { M, base, frames } = motionRun;
    const N = window.Lite?.on ? 12 : 24, w = 64, h = 40, W = 128, H = 80;
    const k = frames.length, st = { ...motionState(base, motionT(k / N, M)), h: Math.round(S.w * 0.625) };
    const f = document.createElement("canvas"); f.width = W; f.height = H;
    if (!isRaster(st) || !TFX) await rasterize(f, thumbSVG(st, w, h), W, H);
    else { TFX.render(await fxJob(TFX, st, W, H, thumbRaster, 2.5)); f.getContext("2d").drawImage(thumbCanvas, 0, 0); }
    if (tok !== motionTok) return;
    frames.push(f);
    if (k === 0) { const c = document.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d").drawImage(f, 0, 0); swapIn(el, c); }
    if (frames.length < N) { queue.push(motionThumb); if (!pumping) pump(); return; }
    motionRun = null;
    const view = document.createElement("canvas"); view.width = W; view.height = H;
    const x = view.getContext("2d"), L = Math.min(4, Math.max(1.6, S.motion.dur)) * 1000;
    let last = -1;
    const tick = () => {
      if (tok !== motionTok || !view.isConnected) return;
      setTimeout(() => requestAnimationFrame(tick), L / N);
      if (document.body.dataset.route !== "studio") return;
      const i = Math.floor(((performance.now() % L) / L) * N);
      if (i !== last) { last = i; x.drawImage(frames[i], 0, 0); }
    };
    x.drawImage(frames[0], 0, 0);
    swapIn(el, view);
    requestAnimationFrame(tick);
  }

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
  function animateFrom(from, fade) {
    const to = clone(S);
    if (!from || reduceMotion.matches) return render();
    if (fade || discrete(from, to) || (isRaster(to) && to.source === "contours" && !FXR?.floatOK)) { crossfade(render()); return; }
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

  const mirror = document.createElement("span");
  mirror.className = "dim";
  mirror.style.cssText = "position:absolute;visibility:hidden;width:auto;padding:0;white-space:pre;left:-9999px";
  document.body.appendChild(mirror);
  const fieldSizing = CSS.supports?.("field-sizing", "content");
  const measure = (text) => { mirror.style.fontSize = getComputedStyle($("w")).fontSize; mirror.textContent = text; return Math.ceil(mirror.getBoundingClientRect().width); };
  let stopsKey = "", bodyFor = null, shownSlot = null;
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
    if (P.slot.startsWith("obj:") && !objOf()) P.slot = "addobj";
    const panel = panelOf(P.slot);
    for (const s of document.querySelectorAll(".panel-sec")) s.hidden = s.dataset.panel !== panel;
    if (P.slot !== shownSlot) { shownSlot = P.slot; enterPanel(document.querySelector(`.panel-sec[data-panel="${panel}"]`)); }
    for (const s of document.querySelectorAll("[data-gen]")) s.hidden = s.dataset.gen === "raster" ? g === "contours" || g === "image" : s.dataset.gen !== g;
    for (const el of [$("variations"), $("variations").previousElementSibling]) el.hidden = g === "image";
    for (const sec of document.querySelectorAll(".panel-sec")) { for (const c of sec.children) c.classList.remove("lead"); [...sec.children].find((c) => !c.hidden)?.classList.add("lead"); }
    const fid = fxOf();
    $("optTitle").textContent = fid ? FXI[fid].name : panel === "object" ? objName(objOf()) : swapping && panel === "addfx" ? `Swap ${FXI[swapping].name}` : PANEL_TITLE[panel];
    optDice.title = optDice.ariaLabel = panel === "preset" ? "Surprise me" : `Randomize ${$("optTitle").textContent.toLowerCase()}`;
    if (fid !== bodyFor) { $("fxBodyHost").innerHTML = ""; if (fid) $("fxBodyHost").appendChild(fxBodies[fid]); bodyFor = fid; }
    if (fid) $("fxLede").innerHTML = `<span>${FXI[fid].cat}</span><span>Step ${S.fxOrder.indexOf(fid) + 1} of ${S.fxOrder.length}</span>`;
    if (panel !== "addfx") swapping = null;
    syncers.forEach((f) => f());
    for (const b of takeRow.querySelectorAll("[data-l]")) { b.classList.toggle("on", !!P.take[b.dataset.l]); b.setAttribute("aria-pressed", !!P.take[b.dataset.l]); }
    for (const b of $("presetFilter").children) b.classList.toggle("on", b.dataset.v === P.filter);
    $("presetGrid").classList.toggle("filtered", P.filter !== "All");
    for (const pc of presetCards) { showCard(pc.el, (P.filter === "All" || pc.group === P.filter) && hits(presetQ, pc.name + " " + pc.group)); pc.el.classList.toggle("on", lookMatches(pc.look)); }
    noMatch($("presetNone"), presetCards.every((pc) => pc.el.hidden), presetQ, "presets", P.filter !== "All" && presetCards.some((pc) => hits(presetQ, pc.name + " " + pc.group)));
    for (const [id, c] of Object.entries(genCards)) c.classList.toggle("on", id === g);
    for (const [id, c] of Object.entries(patCards)) c.classList.toggle("on", id === S.pattern);
    for (const [id, c] of Object.entries(noiseCards)) c.classList.toggle("on", id === S.grad.noise);
    for (const [id, c] of Object.entries(modeCards)) c.classList.toggle("on", id === S.mode);
    for (const [id, c] of Object.entries(fxCards)) c.classList.toggle("added", S.fxOrder.includes(id));
    varCards.forEach((c) => c.classList.toggle("on", c._seed === S.seed));
    if (panel === "colors") { renderPalettes(); renderMine(); }
    $("inkSec").hidden = !S.fxOrder.some((id) => ["halftone", "linescreen", "ascii", "glyphs", "dither", "guilloche", "ridge", "outline", "grid"].includes(id) && S.fx[id].mono);
    $("gradient").checked = S.gradient || S.mode === "layers" || S.mode === "shaded";
    $("gradient").disabled = S.mode === "layers" || S.mode === "shaded";
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    $("showPoints").innerHTML = ic(S.showPoints ? "eye" : "eyeoff");
    $("seed").value = S.seed;
    $("ptHint").textContent = selPoint() ? "Double-click to flip into a dip. Delete removes." : "Double-click the canvas to add a peak. Drag to move, scroll to resize.";
    $("gradHint").hidden = g !== "mesh";
    renderSlots();
    if (window.Shell?.route !== "components") syncSize();
    $("safe").checked = P.safe; $("unlock").checked = P.unlock;
    syncNext();
    syncPlay();
    syncHistory();
  }
  document.fonts?.ready.then(() => { syncUI(); if (isRaster(S)) render(); });

  let stillT = 0;
  function syncStill() { current = { svg: S.source === "contours" && !isRaster(S) ? T.buildSVG(S).svg : "", raster: isRaster(S), of: JSON.stringify(S) }; updateMini(); schedulePreviews(); }
  let wasCaddis = false;
  function caddisCheck() {
    const look = PRESETS.find((p) => p[1] === "Caddis"), on = !!look && lookMatches(look[2]);
    if (on && !wasCaddis) window.firstPaint.then(() => setTimeout(() => toast("Caddis is the gradient from caddis.app", { action: "Visit", onAction: () => window.open("https://caddis.app", "_blank", "noopener") }), 500));
    wasCaddis = on;
  }
  function update({ draft = false, commit: doCommit = true, instant = false, fade = false } = {}) {
    if (!draft) caddisCheck();
    if (sel != null && !(S.source === "gradient" ? S.grad.points[sel] : S.points[sel])) sel = null;
    syncUI(); save(); savePrefs();
    if (playing && !held) {
      if (!draft && !instant) playFade = true;
      if (!draft) { clearTimeout(stillT); stillT = setTimeout(syncStill, 400); }
      if (doCommit && !draft) commit(fade);
      return;
    }
    if (draft || instant || !painted) render(draft); else animateFrom(painted, fade);
    if (doCommit && !draft) commit(fade);
  }

  const IX = { touch: [], trail: [] };
  const ixOn = (id, st = S) => st.fxOrder.includes(id) && st.fx[id]?.on;
  function livePointer(st) {
    if (!ixOn("touch", st) && !ixOn("trail", st)) return null;
    const now = performance.now() / 1000, life = st.fx.touch?.life || 2;
    IX.touch = IX.touch.filter((e) => now - e[2] < life);
    IX.trail = IX.trail.filter((e) => now - e[2] < 1);
    return { now, touch: IX.touch.map((e) => [e[0], e[1], now - e[2]]), trail: IX.trail.slice() };
  }
  const ixLive = () => { const now = performance.now() / 1000; return IX.touch.length > 0 || (ixOn("trail") && now - ixLastT < (S.fx.trail?.life || 1.6) + 0.6); };
  function demoPointer() {
    const w = S.w, h = S.h;
    return { demo: true, now: 0, touch: [[w * 0.42, h * 0.5, 0.5], [w * 0.7, h * 0.35, 0.25]], trail: Array.from({ length: 18 }, (_, i) => { const t = i / 17; return [w * (0.12 + 0.76 * t), h * (0.5 + 0.18 * Math.sin(t * 6)), t * 0.3 + 0.001, w * 2.5, h * 0.18 * 6 * Math.cos(t * 6) * 3.3]; }) };
  }
  const designPt = (e) => { const r = art.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * S.w, (1 - (e.clientY - r.top) / r.height) * S.h]; };
  let ixRaf = 0, ixLast = null, ixLastT = -9;
  function ixKick() {
    if (playing || ixRaf) return;
    const step = async () => {
      ixRaf = 0;
      if (playing) return;
      await paint(S, false);
      if (ixLive()) ixRaf = requestAnimationFrame(step); else render();
    };
    ixRaf = requestAnimationFrame(step);
  }
  art.addEventListener("pointerdown", (e) => {
    if (!ixOn("touch") && !ixOn("trail")) return;
    const [x, y] = designPt(e), t = performance.now() / 1000;
    if (ixOn("touch")) { IX.touch.push([x, y, t]); if (IX.touch.length > 8) IX.touch.shift(); }
    ixLast = [x, y, t];
    ixKick();
  });
  art.addEventListener("pointermove", (e) => {
    if (!ixOn("trail") || !(e.buttons & 1) || !ixLast) return;
    const [x, y] = designPt(e), t = performance.now() / 1000, dt = Math.max(1 / 240, t - ixLast[2]);
    if (Math.hypot(x - ixLast[0], y - ixLast[1]) < S.w / 300) return;
    IX.trail.push([x, y, t, (x - ixLast[0]) / dt, (y - ixLast[1]) / dt]);
    ixLast = [x, y, t]; ixLastT = t;
    ixKick();
  });
  addEventListener("pointerup", () => (ixLast = null));

  async function htmlExport() {
    const srcs = await Promise.all(["fx.js", "engine.js"].map((f) => fetch(f).then((r) => r.text())));
    const toData = (el, max = 2048) => { const iw = el.naturalWidth || el.width, ih = el.naturalHeight || el.height, sc = Math.min(1, max / Math.max(iw, ih)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(iw * sc)); c.height = Math.max(1, Math.round(ih * sc)); c.getContext("2d").drawImage(el, 0, 0, c.width, c.height); return c.toDataURL("image/png"); };
    const st = clone(S);
    const objects = objectsFor(st).map((o) => ({ ...o, tex: null, texData: o.tex ? toData(o.tex) : null }));
    const data = { st, palette: paletteOf(st), objects, image: isImg(st) ? toData(imageCanvas(st, Math.min(2048, st.w), Math.min(2048, st.w) * st.h / st.w)) : null, svg: st.source === "contours" ? T.buildSVG(st).svg : "" };
    const lib = `const EASES = ${JSON.stringify(EASES)};\nconst seedFrac = ${seedFrac.toString()};\nconst endless = ${endless.toString()};\nconst unbound = ${unbound.toString()};\n${bezier.toString()}\n${motionT.toString()}\n${motionState.toString()}`;
    const run = `(${htmlRuntime.toString()})(${JSON.stringify(data).replace(/</g, "\\u003c")});`;
    const title = fileName().replace(/[<&]/g, "");
    return new Blob([`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:${/^#[0-9a-f]{6}$/i.test(st.bg || "") ? st.bg : "#000"};overflow:hidden}canvas,svg{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;display:block;touch-action:none}</style></head>
<body><canvas id="c"></canvas>
<script>${srcs[1]}<\/script>
<script>${srcs[0]}<\/script>
<script>${lib}\n${run}<\/script>
<!-- Made with Isoline -->
</body></html>`], { type: "text/html" });
  }
  function htmlRuntime(D) {
    const st = D.st, cv = document.getElementById("c"), FX = window.TopoFX && TopoFX.createFX(cv);
    const contours = st.source === "contours";
    if (!FX || (contours && !FX.floatOK)) { cv.remove(); if (D.svg) { document.body.insertAdjacentHTML("beforeend", D.svg); const s = document.querySelector("svg"); s && s.setAttribute("preserveAspectRatio", "xMidYMid slice"); } return; }
    const load = (url) => new Promise((r) => { if (!url) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = url; });
    const fxOn = (id) => st.fxOrder.includes(id) && st.fx[id] && st.fx[id].on;
    const moving = st.motion && st.motion.type !== "still", inter = fxOn("touch") || fxOn("trail");
    const animFx = (fxOn("ripple") && st.fx.ripple.anim) || (fxOn("grain") && st.fx.grain.anim) || fxOn("glyphs") && st.fx.glyphs.change > 0 || fxOn("sea") || (fxOn("irid") && st.fx.irid.anim) || (fxOn("film") && st.fx.film.anim) || (fxOn("glowlines") && st.fx.glowlines.anim) || (fxOn("feedback") && st.fx.feedback.anim) || (fxOn("glitch") && st.fx.glitch.speed > 0);
    const IX = { touch: [], trail: [] };
    let image = null, objects = [], last = null, W = 0, H = 0, sc = 1, ox = 0, oy = 0, t0 = performance.now();
    function size() {
      const dpr = Math.min(2, devicePixelRatio || 1); sc = Math.max(innerWidth / st.w, innerHeight / st.h);
      const k = Math.min(dpr * sc, 2400 / Math.max(st.w, st.h)); W = Math.round(st.w * k); H = Math.round(st.h * k);
      ox = (innerWidth - st.w * sc) / 2; oy = (innerHeight - st.h * sc) / 2;
    }
    let lastT = -9;
    function pointer(now) {
      if (!inter) return null;
      const life = (st.fx.touch && st.fx.touch.life) || 2;
      IX.touch = IX.touch.filter((e) => now - e[2] < life); IX.trail = IX.trail.filter((e) => now - e[2] < 1);
      return { now, touch: IX.touch.map((e) => [e[0], e[1], now - e[2]]), trail: IX.trail.slice() };
    }
    function frame(nowMs) {
      const now = nowMs / 1000, secs = (nowMs - t0) / 1000, raw = !moving ? 0 : endless(st.motion) ? secs / st.motion.dur : (secs % st.motion.dur) / st.motion.dur;
      const sf = moving ? motionState(st, motionT(raw, st.motion)) : st;
      const spec = contours ? Topo.gpuSpec(sf, Math.max(sf.res || 1, 1.6 / Math.max(0.05, (W / st.w)))) : null;
      FX.render({ w: W, h: H, k: W / st.w, seed: st.seed, image, grad: st.source === "gradient" && !image ? sf.grad : null, fx: st.fx, order: st.fxOrder, ink: st.ink, paper: st.paper,
        time: sf._t || (animFx && !moving ? (now / 8) % 1 : 0), motion: sf._t != null ? st.motion.type : "still", motionAmt: st.motion && st.motion.amt, endless: sf._t != null ? (unbound(st.motion) ? 2 : endless(st.motion) ? 1 : 0) : 0, path: st.motion && st.motion.path, mangle: st.motion && st.motion.angle, objects, palette: D.palette, contours: spec, pointer: pointer(now) });
    }
    let raf = 0;
    const live = () => moving || animFx || IX.touch.length || (fxOn("trail") && performance.now() / 1000 - lastT < ((st.fx.trail && st.fx.trail.life) || 1.6) + 0.6);
    function loop(ms) { raf = 0; frame(ms); if (live()) raf = requestAnimationFrame(loop); }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const pt = (e) => [(e.clientX - ox) / sc, st.h - (e.clientY - oy) / sc];
    addEventListener("pointerdown", (e) => { if (!inter) return; const [x, y] = pt(e), t = performance.now() / 1000; if (fxOn("touch")) { IX.touch.push([x, y, t]); if (IX.touch.length > 8) IX.touch.shift(); } last = [x, y, t]; kick(); });
    addEventListener("pointermove", (e) => {
      if (!fxOn("trail") || !last || !(e.buttons & 1 || e.pointerType === "touch")) return;
      const [x, y] = pt(e), t = performance.now() / 1000, dt = Math.max(1 / 240, t - last[2]);
      if (Math.hypot(x - last[0], y - last[1]) < st.w / 300) return;
      IX.trail.push([x, y, t, (x - last[0]) / dt, (y - last[1]) / dt]); last = [x, y, t]; lastT = t; kick();
    });
    addEventListener("pointerup", () => (last = null));
    addEventListener("resize", () => { size(); kick(); });
    Promise.all([load(D.image), ...D.objects.map((o) => load(o.texData))]).then(([img, ...texs]) => {
      if (img) { image = document.createElement("canvas"); image.width = img.width; image.height = img.height; image.getContext("2d").drawImage(img, 0, 0); }
      objects = D.objects.map((o, i) => ({ ...o, tex: texs[i], texKey: o.texKey }));
      size(); kick();
    });
  }

  let lastWrap = "";
  new ResizeObserver(() => { if (!wrap.clientWidth || !wrap.clientHeight) return; const key = wrap.clientWidth + "x" + wrap.clientHeight; if (painted && key !== lastWrap) { lastWrap = key; render(); } }).observe(wrap);

  window.TopoBrand?.mount($("brand"), "isoline");
  applyTheme();
  let firstVisit = true;
  try { firstVisit = !localStorage.getItem(STORE); } catch (e) {}
  if (firstVisit) applyLook(PRESETS.find((p) => p[1] === "Prism")[2]);
  const GUARD = "isoline.loadGuard";
  let crashed = false;
  try { crashed = localStorage.getItem(GUARD) === "1"; localStorage.setItem(GUARD, "1"); } catch (e) {}
  setTimeout(() => { try { localStorage.removeItem(GUARD); } catch (e) {} }, 5000);
  const heavy = (st) => st.fxOrder.some((id) => st.fx[id]?.on) || st.objects.length > 0;
  function safeOpen(why) {
    const keep = clone(S);
    S.fxOrder = []; S.objects = [];
    window.firstPaint.then(() => setTimeout(() => toast(why, { action: "Restore", onAction: () => { S = keep; update({ fade: true }); } }), 1400));
  }
  let bootDone;
  window.studioBoot = new Promise((r) => (bootDone = r));
  const boot = () => { update({ commit: false }); bootDone(); };
  if (crashed && heavy(S)) { safeOpen("The last design stalled this device, so it opened without effects"); boot(); }
  else if (heavy(S) && TFX && !/[?&]d=/.test(location.hash)) drawCost(S).then((ms) => { if (ms > SLOW_MS * 4) safeOpen("Opened without effects to keep it smooth"); boot(); });
  else boot();
  setTimeout(() => document.body.classList.remove("boot"), 900);

  window.toastMsg = toast;
  window.downloadBlob = download;
  async function loopFrame(st0, t, c) {
    const { width: w, height: h } = c, st = { ...motionState(st0, motionT(t, st0.motion)), w: st0.w, h: st0.h };
    const sc = Math.max(w / st.w, h / st.h), dw = Math.round(st.w * sc), dh = Math.round(st.h * sc);
    let src;
    if (isRaster(st) && TFX) { TFX.render(await fxJob(TFX, st, dw, dh, document.createElement("canvas"), 2.5)); src = thumbCanvas; }
    else src = await rasterize(document.createElement("canvas"), T.buildSVG(st, { w: dw, h: dh, res: 2.5 }).svg, dw, dh);
    c.getContext("2d").drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  window.UI?.tipPreview("motion", (type) => {
    const c = document.createElement("canvas"); c.width = 330; c.height = 206;
    const st = { ...clone(S), motion: { ...S.motion, type, amt: Math.max(0.45, S.motion.amt), mode: "loop", dir: 1, ease: "linear", seed: 0 } }, N = 36, frames = [];
    const x = c.getContext("2d"), t0 = performance.now();
    (async function tick() {
      if ((!c.isConnected || c.closest(".tip")?.hidden) && performance.now() - t0 > 100) return;
      const i = Math.floor(((performance.now() - t0) / 3000) * N) % N;
      if (!frames[i]) { const f = document.createElement("canvas"); f.width = c.width; f.height = c.height; await loopFrame(st, i / N, f); frames[i] = f; }
      x.drawImage(frames[i], 0, 0);
      requestAnimationFrame(tick);
    })();
    return c;
  });
  const sweepCache = new Map();
  let sweepBusy = Promise.resolve();
  window.UI?.tipPreview("sweep", (v) => {
    const c = sweeps[+v], fig = document.createElement("div"); fig.className = "sweep";
    if (!c || c.when?.() === false || c.na?.()) return null;
    const lo = c.rand && !c.log ? Math.min(c.rand[0], c.min + (c.max - c.min) * 0.1) : c.min, hi = c.max;
    const vals = [0.08, 0.3, 0.52, 0.74, 0.96].map((f) => roundStep(c.log ? lo * Math.pow(hi / lo, f) : lo + (hi - lo) * f, c));
    const key = JSON.stringify([noFx(S), c.label, vals]);
    const frames = sweepCache.get(key);
    const play = (nodes) => {
      fig.replaceChildren(...nodes);
      let i = 0; nodes[0]?.classList.add("on");
      const id = setInterval(() => {
        if (!fig.isConnected) return clearInterval(id);
        nodes[i].classList.remove("on"); i = (i + 1) % nodes.length; nodes[i].classList.add("on");
      }, 620);
    };
    if (frames) { play(frames.map((n) => (n.tagName === "CANVAS" ? copyCanvas(n) : n.cloneNode(true)))); return fig; }
    const keep = c.get(), states = vals.map((x) => { c.set(x); return clone(noFx(S)); });
    c.set(keep);
    sweepBusy = sweepBusy.then(async () => {
      const out = [];
      for (const st of states) {
        const slot = document.createElement("div");
        const n = await thumb(slot, st.source === "contours" ? lightLines(st) : st, 160);
        if (!n) return;
        if (n.tagName === "CANVAS") { const cp = document.createElement("canvas"); cp.width = n.width; cp.height = n.height; cp.getContext("2d").drawImage(n, 0, 0); out.push(cp); } else out.push(n);
        n.classList.remove("fresh");
      }
      if (sweepCache.size > 12) sweepCache.delete(sweepCache.keys().next().value);
      sweepCache.set(key, out);
      if (fig.isConnected) play(out.map((n) => (n.tagName === "CANVAS" ? copyCanvas(n) : n.cloneNode(true))));
    }).catch(() => {});
    return fig;
  });
  const copyCanvas = (n) => { const c = document.createElement("canvas"); c.width = n.width; c.height = n.height; c.getContext("2d").drawImage(n, 0, 0); return c; };
  window.UI?.tipPreview("timing", (v) => {
    const [k, val] = v.split("."), c = document.createElement("canvas"); c.width = 330; c.height = 96;
    const m = { ...S.motion, [k]: k === "dir" ? +val : val }, x = c.getContext("2d"), t0 = performance.now(), L = 2600;
    const css = getComputedStyle(document.body), acc = css.getPropertyValue("--accent").trim() || "#e8572a", ink = css.getPropertyValue("--ink").trim() || "#222";
    (function tick() {
      if ((!c.isConnected || c.closest(".tip")?.hidden) && performance.now() - t0 > 100) return;
      const raw = ((performance.now() - t0) % L) / L, u = m.mode === "once" ? Math.min(1, ((performance.now() - t0) % (L * 1.4)) / L) : raw;
      const t = motionT(u, m), X = 28 + t * (c.width - 56);
      x.clearRect(0, 0, c.width, c.height);
      x.globalAlpha = 0.14; x.fillStyle = ink; x.beginPath(); x.roundRect(28, 44, c.width - 56, 8, 4); x.fill();
      x.globalAlpha = 1; x.fillStyle = acc; x.beginPath(); x.roundRect(28, 44, Math.max(8, X - 28 + 4), 8, 4); x.fill();
      x.beginPath(); x.arc(X, 48, 11, 0, Math.PI * 2); x.fill();
      requestAnimationFrame(tick);
    })();
    return c;
  });
  window.Studio = {
    usePalette(hexes) {
      if (gen() === "contours") {
        const byLum = hexes.slice().sort((a, b) => lum(b) - lum(a)), bg = byLum[0];
        const inks = hexes.filter((h) => h !== bg).sort((a, b) => Math.abs(lum(b) - lum(bg)) - Math.abs(lum(a) - lum(bg))).slice(0, 6);
        S.bg = bg; S.transparent = false; setInks(inks.length > 1 ? inks : [inks[0] || "#111111", inks[0] || "#111111"]);
      } else setGradColors(hexes);
      P.slot = "colors";
      update({ fade: true });
    },
    async snapshot(w, h, preset) {
      const look = preset && PRESETS.find((p) => p[1].toLowerCase() === String(preset).toLowerCase());
      const st = look ? { ...resolveLook(look[2]), w: S.w, h: S.h } : S;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"), sc = Math.max(w / st.w, h / st.h), dw = Math.round(st.w * sc), dh = Math.round(st.h * sc);
      let src;
      if (isRaster(st) && TFX) {
        TFX.render(await fxJob(TFX, st, dw, dh, document.createElement("canvas"))); src = thumbCanvas;
      } else src = await rasterize(document.createElement("canvas"), (!look && current.svg && current.of === JSON.stringify(S) && current.svg) || T.buildSVG(st).svg, dw, dh);
      x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return c;
    },
    presetLooks: () => PRESETS.map((p) => [p[1], lookHash(p[2])]),
    async frameAt(t, w = 440, h = 275) { const c = document.createElement("canvas"); c.width = w; c.height = h; await loopFrame(S, t, c); return c; },
    onShow() {
      lastWrap = ""; fit(); if (playing) return; quiet(1100); clearTimeout(showT);
      const later = document.documentElement.classList.contains("vt") ? 680 : 0;
      if (rolling || JSON.stringify(painted) !== JSON.stringify(S)) {
        const resume = resumeOnShow; resumeOnShow = false;
        for (const g of art.querySelectorAll(".art-ghost")) g.remove();
        art.classList.add("stale");
        const blank = (ph) => { for (const t of document.querySelectorAll('#slotList .tile-th:not([data-th="colors"]), #options .th')) { if (t.closest("#presetGrid")) continue; t._thk = ""; t.replaceChildren(); if (ph) t.style.setProperty("--ph", ph); else t.style.removeProperty("--ph"); } };
        blank(rolling ? "" : phOf(S));
        const show = () => { blank(phOf(S)); schedulePreviews(0); return render().then(() => requestAnimationFrame(() => { art.classList.remove("stale"); if (resume && !playing) startPlay(); })); };
        if (rolling) rolling.finally(show); else show();
        return;
      }
      if (resumeOnShow) { resumeOnShow = false; showT = setTimeout(() => { if (!playing) startPlay(); }, later); return; }
      showT = setTimeout(() => crossfade(render()), later);
    },
    hold(p) { const r = (rolling = p.catch(() => {})); r.then(() => { if (rolling === r) rolling = null; }); },
    onLeave() { if (!playing) return; resumeOnShow = true; playing = false; held = false; clearTimeout(holdT); cancelAnimationFrame(playRaf); syncPlay(); },
    contour(over = {}, w = 800, h = 500) { const st = withDefaults({ ...clone(DEFAULTS), fxOrder: [], ...over }); return T.buildSVG({ ...st, w, h }, { w, h }).svg; },
    state: () => clone(S),
    apply(partial) { S = withDefaults({ ...clone(S), ...partial, grad: { ...S.grad, ...(partial?.grad || {}) }, fx: { ...S.fx, ...(partial?.fx || {}) } }); sel = null; update({ fade: true }); return clone(S); },
    presets: () => PRESETS.map(([group, name]) => ({ group, name })),
    usePreset(name) { const p = PRESETS.find((x) => x[1].toLowerCase() === String(name).toLowerCase()); if (!p) return false; applyLook(p[2]); update({ fade: true }); return true; },
    variation() { variation(); update({ fade: true }); },
    surprise: () => surprise(false),
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
