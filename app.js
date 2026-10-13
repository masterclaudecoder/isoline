(() => {
  "use strict";
  const T = window.Topo;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ACCENT = "#e8572a";

  // ---------- state ----------
  const DEFAULTS = {
    w: 1440, h: 900, pattern: "blobs",
    scale: 700, octaves: 2, warp: 0.3, seed: 4821, angle: 0, features: 5, bump: 2.4, bumpSize: 90,
    points: [{ x: 0.3, y: 0.42, r: 300, s: 1 }, { x: 0.63, y: 0.6, r: 240, s: 1 }, { x: 0.8, y: 0.28, r: 160, s: 0.8 }],
    usePoints: true, showPoints: true, falloff: 1.2,
    levels: 18, gap: 18, bias: 0, weight: 1.5, swell: 0, swellSize: 260, taper: 0,
    indexEvery: 0, indexWeight: 2, smooth: 0.6, res: 4, minLen: 12,
    line: "#1c1c1e", line2: "#e8572a", gradient: false, bg: "#ffffff", transparent: false, opacity: 1,
    fmt: "svg", pngScale: 2,
  };
  const STORE = "topographic-v2";
  let S = { ...structuredClone(DEFAULTS) };
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) {}
  if (!T.PATTERNS.some((p) => p.id === S.pattern)) S.pattern = DEFAULTS.pattern;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
  let sel = null; // selected point index

  const UNIFORM = { swell: 0, taper: 0, indexEvery: 0 };
  const LOOKS = {
    Soft: { ...UNIFORM, pattern: "terrain", usePoints: false, scale: 1100, octaves: 1, warp: 0.35, levels: 14, bias: 0, weight: 1.25, smooth: 0.8, line: "#1c1c1e", gradient: false, bg: "#ffffff", transparent: false, opacity: 0.6 },
    Bold: { ...UNIFORM, pattern: "blobs", usePoints: true, falloff: 1, warp: 0.2, octaves: 1, levels: 8, bias: 0, weight: 9, smooth: 0.85, line: "#1c1c1e", gradient: false, bg: "#f3f1ec", transparent: false, opacity: 1 },
    Orbit: { ...UNIFORM, pattern: "rings", usePoints: true, warp: 0.08, gap: 22, weight: 1.5, smooth: 0.6, line: "#1c1c1e", gradient: false, bg: "#ffffff", transparent: false, opacity: 1 },
    Night: { swell: 0, taper: 0, pattern: "terrain", usePoints: false, scale: 800, octaves: 2, warp: 0.5, levels: 32, bias: 0, weight: 1, indexEvery: 5, indexWeight: 2.2, smooth: 0.55, line: "#ffffff", gradient: false, bg: "#0f1b33", transparent: false, opacity: 0.4 },
    Stripes: { ...UNIFORM, pattern: "lines", usePoints: false, angle: 35, warp: 0, gap: 28, weight: 7, smooth: 0.5, line: "#1c1c1e", gradient: false, bg: "#ffffff", transparent: false, opacity: 1 },
    Strata: { ...UNIFORM, pattern: "strata", usePoints: false, angle: 0, scale: 1000, octaves: 2, warp: 0.05, features: 4, bump: 2.6, bumpSize: 85, gap: 14, weight: 1.3, smooth: 0.6, line: "#1c1c1e", gradient: false, bg: "#ffffff", transparent: false, opacity: 1 },
    Swell: { pattern: "blobs", usePoints: true, falloff: 1.2, warp: 0.3, levels: 16, weight: 2.4, swell: 0.7, swellSize: 260, taper: 160, indexEvery: 0, smooth: 0.7, line: "#1c1c1e", gradient: false, bg: "#ffffff", transparent: false, opacity: 1 },
    Spectrum: { ...UNIFORM, pattern: "flow", usePoints: false, angle: 20, scale: 700, octaves: 2, warp: 0.4, levels: 40, bias: 0, weight: 1.6, smooth: 0.6, line: "#e8572a", line2: "#3a5bd9", gradient: true, bg: "#101114", transparent: false, opacity: 1 },
  };
  const PALETTES = [
    ["#1c1c1e", "#e8572a", "#ffffff"], ["#ffffff", "#7a9cff", "#0f1b33"], ["#e8572a", "#e0a21b", "#16171a"],
    ["#3a5bd9", "#1f9e78", "#f4f6fb"], ["#1d2b24", "#1f9e78", "#eef3ee"], ["#d9487a", "#3a5bd9", "#fff6f9"],
    ["#b9b6ae", "#1c1c1e", "#ffffff"], ["#ffffff", "#ffd2c2", "#e8572a"], ["#1c1c1e", "#8d8b85", "#f3f1ec"],
  ];
  const LINE_COLORS = ["#1c1c1e", "#8d8b85", "#e8572a", "#3a5bd9", "#1f9e78", "#e0a21b", "#d9487a", "#ffffff"];
  const BG_COLORS = ["#ffffff", "#f3f1ec", "#efe4da", "#e9eef5", "#16171a", "#0f1b33", "#e8572a"];
  const SIZES = [
    ["Desktop", [["Desktop", 1440, 900], ["Full HD", 1920, 1080], ["QHD", 2560, 1440], ["MacBook Air", 1512, 982]]],
    ["Mobile", [["iPhone", 393, 852], ["iPhone Pro Max", 430, 932], ["Android", 412, 917]]],
    ["Social", [["Square", 1080, 1080], ["Portrait 4:5", 1080, 1350], ["Story", 1080, 1920], ["Open Graph", 1200, 630], ["X header", 1500, 500], ["LinkedIn banner", 1584, 396]]],
    ["Print 300 dpi", [["A4", 2480, 3508], ["Letter", 2550, 3300]]],
  ];

  // ---------- helpers ----------
  const icons = () => { try { window.lucide?.createIcons({ attrs: { "stroke-width": 1.75 } }); } catch (e) {} };
  const linear = () => T.LINEAR.has(S.pattern);
  const activePoints = () => S.usePoints && S.points.length > 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1800); };

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

  // ---------- sliders ----------
  const selPoint = () => (sel != null ? S.points[sel] : null);
  const SLIDERS = {
    points: [
      { key: "r", label: "Radius", min: 10, max: 1400, step: 1, log: true, fmt: (v) => v + "px", rand: [80, 420], when: () => !!selPoint(), get: () => selPoint()?.r ?? 100, set: (v) => (selPoint().r = v) },
      { key: "s", label: "Strength", min: -3, max: 3, step: 0.05, fmt: (v) => (v > 0 ? "+" : "") + v.toFixed(2), rand: [-1, 2], when: () => !!selPoint(), get: () => selPoint()?.s ?? 1, set: (v) => (selPoint().s = v) },
      { key: "falloff", label: "Falloff", min: 0.3, max: 6, step: 0.05, log: true, fmt: (v) => v.toFixed(2), rand: [0.6, 3] },
    ],
    shape: [
      { key: "scale", label: "Scale", min: 80, max: 1600, step: 10, log: true, fmt: (v) => v + "px", rand: [250, 1200] },
      { key: "octaves", label: "Detail", min: 1, max: 6, step: 1, rand: [1, 4] },
      { key: "warp", label: "Warp", min: 0, max: 2, step: 0.01, fmt: (v) => v.toFixed(2), rand: [0, 0.9] },
      { key: "angle", label: "Angle", min: 0, max: 180, step: 1, fmt: (v) => v + "°", when: () => T.ANGLED.has(S.pattern) },
      { key: "features", label: "Features", min: 0, max: 20, step: 1, rand: [2, 9], when: () => S.pattern === "strata" || (["blobs", "rings"].includes(S.pattern) && !activePoints()) },
      { key: "bump", label: "Bulge", min: 0, max: 4, step: 0.05, fmt: (v) => v.toFixed(2), rand: [0.5, 3], when: () => ["strata", "waves", "dunes"].includes(S.pattern) },
      { key: "bumpSize", label: "Bulge size", min: 20, max: 400, step: 5, fmt: (v) => v + "px", rand: [50, 200], when: () => S.pattern === "strata" },
    ],
    lines: [
      { key: "levels", label: "Count", min: 2, max: 120, step: 1, rand: [6, 40], when: () => !linear() },
      { key: "gap", label: "Gap", min: 2, max: 200, step: 0.5, log: true, fmt: (v) => v + "px", rand: [8, 48], when: linear },
      { key: "bias", label: "Bias", min: -2, max: 2, step: 0.05, fmt: (v) => (v === 0 ? "Even" : v.toFixed(2)), rand: [-1, 1], when: () => !linear() },
      { key: "weight", label: "Weight", min: 0.25, max: 40, step: 0.05, log: true, fmt: (v) => v.toFixed(2) + "px", rand: [0.75, 8] },
      { key: "swell", label: "Swell", min: 0, max: 1, step: 0.01, fmt: (v) => (v ? Math.round(v * 100) + "%" : "Off"), rand: [0, 0.8] },
      { key: "swellSize", label: "Swell size", min: 20, max: 900, step: 5, log: true, fmt: (v) => v + "px", rand: [120, 500], when: () => S.swell > 0 },
      { key: "taper", label: "Taper", min: 0, max: 600, step: 5, fmt: (v) => (v ? v + "px" : "Off"), rand: [0, 250] },
      { key: "indexEvery", label: "Accent every", min: 0, max: 12, step: 1, fmt: (v) => (v ? v : "Off"), rand: [0, 8] },
      { key: "indexWeight", label: "Accent weight", min: 1, max: 5, step: 0.1, fmt: (v) => v.toFixed(1) + "×", rand: [1.5, 3], when: () => S.indexEvery > 0 },
      { key: "smooth", label: "Smooth", min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2), rand: [0.35, 0.9] },
      { key: "res", label: "Grid", min: 2, max: 12, step: 1, fmt: (v) => v + "px", rand: [3, 5] },
      { key: "minLen", label: "Clean", min: 0, max: 300, step: 1, fmt: (v) => (v ? v + "px" : "Off"), rand: [0, 60] },
    ],
    color: [{ key: "opacity", label: "Opacity", min: 0.05, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + "%", rand: [0.3, 1] }],
  };
  const hosts = { points: "pointCtrls", shape: "shape", lines: "lines", color: "color" };
  const roundStep = (v, c) => +clamp(Math.round(v / c.step) * c.step, c.min, c.max).toFixed(4);
  const sliders = [];

  function randomValue(c) {
    const [a, b] = c.rand || [c.min, c.max];
    return roundStep(c.log && a > 0 ? a * Math.pow(b / a, Math.random()) : rnd(a, b), c);
  }

  for (const [group, list] of Object.entries(SLIDERS)) {
    for (const c of list) {
      c.get ||= () => S[c.key];
      c.set ||= (v) => (S[c.key] = v);
      c.fmt ||= (v) => String(v);
      const id = `s-${group}-${c.key}`;
      const row = document.createElement("div");
      row.className = "ctrl";
      row.innerHTML = `<div class="label-row"><label class="label" for="${id}">${c.label}</label><span class="val"></span><button class="ib xs" title="Randomize ${c.label.toLowerCase()}" aria-label="Randomize ${c.label.toLowerCase()}"><i data-lucide="dice-5"></i></button></div><input id="${id}" type="range">`;
      const input = row.querySelector("input"), val = row.querySelector(".val");
      const L = Math.log(c.max / c.min);
      const toVal = (x) => (c.log ? roundStep(c.min * Math.exp((x / 1000) * L), c) : +x);
      const fromVal = (v) => (c.log ? (1000 * Math.log(Math.max(v, c.min) / c.min)) / L : v);
      if (c.log) { input.min = 0; input.max = 1000; input.step = 1; } else { input.min = c.min; input.max = c.max; input.step = c.step; }
      const paint = (v) => {
        input.style.setProperty("--p", ((input.value - input.min) / (input.max - input.min)) * 100 + "%");
        val.textContent = c.fmt(v);
      };
      input.addEventListener("input", () => { const v = toVal(input.value); c.set(v); paint(v); update(); });
      row.querySelector("button").onclick = () => { if (c.when && !c.when()) return; c.set(randomValue(c)); update(); };
      c.sync = () => {
        const vis = !c.when || c.when();
        row.hidden = !vis;
        if (!vis) return;
        const v = c.get();
        input.value = fromVal(v); paint(v);
      };
      c.group = group;
      sliders.push(c);
      $(hosts[group]).appendChild(row);
    }
  }
  const randomizeGroup = (group) => {
    for (const c of sliders) if (c.group === group && (!c.when || c.when()) && c.key !== "res") c.set(randomValue(c));
  };

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
  const lookBtns = {};
  for (const name of Object.keys(LOOKS)) {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = name;
    b.onclick = () => {
      Object.assign(S, LOOKS[name]);
      if (LOOKS[name].usePoints && !S.points.length) S.points = structuredClone(DEFAULTS.points);
      update();
    };
    $("looks").appendChild(b);
    lookBtns[name] = b;
  }
  const lookMatches = (look) => Object.entries(look).every(([k, v]) => S[k] === v);

  let thumbKey = "";
  function drawThumbs() {
    const key = JSON.stringify([S.seed, S.warp, S.octaves, S.scale, S.w, S.h, S.angle, S.features, S.bump, S.bumpSize, S.gap, S.falloff, S.usePoints, S.points]);
    if (key === thumbKey) return;
    thumbKey = key;
    for (const p of T.PATTERNS) {
      const ts = { ...S, pattern: p.id, levels: 11, bias: 0, swell: 0, taper: 0, gradient: false, transparent: false, bg: "#ffffff", line: "#47463f", weight: 2.2, indexEvery: 0, opacity: 1, smooth: 0.5, gap: S.w / 13 };
      patBtns[p.id].querySelector(".th").innerHTML = T.buildSVG(ts, { w: 120, h: 80, res: 2, minLen: 40 }).svg;
    }
  }

  // ---------- section tools ----------
  const dice = (title, fn) => {
    const b = document.createElement("button");
    b.className = "ib"; b.title = title; b.setAttribute("aria-label", title);
    b.innerHTML = `<i data-lucide="dice-5"></i>`;
    b.onclick = fn;
    return b;
  };
  const tools = (g) => document.querySelector(`[data-group="${g}"] .gh-tools`);
  tools("pattern").append(dice("Random pattern", () => { S.pattern = pick(T.PATTERNS.filter((p) => p.id !== S.pattern)).id; update(); }));
  tools("points").append(dice("Scatter points", () => scatter()));
  tools("shape").append(dice("Randomize shape", () => { randomizeGroup("shape"); update(); }));
  tools("lines").append(dice("Randomize lines", () => { randomizeGroup("lines"); update(); }));
  tools("color").append(dice("Random palette", () => { randomPalette(); update(); }));

  function randomPalette() {
    const [a, b, bg] = pick(PALETTES);
    Object.assign(S, { line: a, line2: b, bg, transparent: false, gradient: Math.random() < 0.4 });
  }

  // ---------- swatches ----------
  function swatchRow(host, colors, key) {
    const el = $(host);
    const btns = colors.map((c) => {
      const b = document.createElement("button");
      b.className = "sw"; b.style.background = c; b.title = c; b.setAttribute("aria-label", c);
      b.onclick = () => { S[key] = c; if (key === "bg") S.transparent = false; update(); };
      el.appendChild(b);
      return b;
    });
    const custom = document.createElement("label");
    custom.className = "sw custom"; custom.title = "Custom color";
    custom.innerHTML = `<input type="color" aria-label="Custom color">`;
    const ci = custom.querySelector("input");
    ci.addEventListener("input", () => { S[key] = ci.value; if (key === "bg") S.transparent = false; update(); });
    el.appendChild(custom);
    return () => {
      const none = key === "bg" && S.transparent;
      let hit = false;
      btns.forEach((b, i) => { const on = colors[i] === S[key] && !none; b.classList.toggle("on", on); hit ||= on; });
      custom.classList.toggle("on", !hit && !none);
      ci.value = S[key];
    };
  }
  const swatchSync = [swatchRow("lineSw", LINE_COLORS, "line"), swatchRow("line2Sw", LINE_COLORS, "line2"), swatchRow("bgSw", BG_COLORS, "bg")];
  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  $("seed").onchange = (e) => { S.seed = clamp(Math.floor(+e.target.value || 0), 0, 999999); update(); };

  // ---------- points ----------
  $("usePoints").onchange = (e) => { S.usePoints = e.target.checked; if (S.usePoints && !S.points.length) S.points = structuredClone(DEFAULTS.points); update(); };
  $("showPoints").onclick = () => { S.showPoints = !S.showPoints; update({ commit: false }); };
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

  // ---------- canvas overlay (point handles) ----------
  const art = $("art"), artSvg = $("artSvg"), ov = $("ov"), wrap = $("wrap");
  function drawOverlay() {
    ov.setAttribute("viewBox", `0 0 ${S.w} ${S.h}`);
    const show = S.usePoints && S.showPoints;
    ov.classList.toggle("off", !show);
    if (!show) { ov.innerHTML = ""; return; }
    const u = S.w / Math.max(1, art.clientWidth);
    const ns = 'vector-effect="non-scaling-stroke"';
    let out = "";
    S.points.forEach((p, i) => {
      const x = p.x * S.w, y = p.y * S.h, on = i === sel;
      out += `<circle cx="${x}" cy="${y}" r="${p.r}" fill="none" stroke="${on ? ACCENT : "rgba(120,120,120,.55)"}" stroke-width="1" stroke-dasharray="3 4" ${ns} pointer-events="none"/>`;
      if (on) out += `<line x1="${x}" y1="${y}" x2="${x + p.r}" y2="${y}" stroke="${ACCENT}" stroke-width="1" ${ns} pointer-events="none"/><circle class="rs" data-i="${i}" cx="${x + p.r}" cy="${y}" r="${6 * u}" fill="#fff" stroke="${ACCENT}" stroke-width="1.5" ${ns}/>`;
      out += `<circle cx="${x}" cy="${y}" r="${8 * u}" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width="1" ${ns} pointer-events="none"/>`;
      out += `<circle cx="${x}" cy="${y}" r="${4.5 * u}" fill="${p.s < 0 ? "#fff" : on ? ACCENT : "#1c1c1e"}" stroke="${on ? ACCENT : "#1c1c1e"}" stroke-width="1.5" ${ns} pointer-events="none"/>`;
      out += `<circle class="pt" data-i="${i}" cx="${x}" cy="${y}" r="${14 * u}" fill="transparent"/>`;
    });
    ov.innerHTML = out;
  }
  const toArt = (e) => { const r = ov.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * S.w, ((e.clientY - r.top) / r.height) * S.h]; };
  let drag = null;
  ov.addEventListener("pointerdown", (e) => {
    const t = e.target, i = t.dataset?.i;
    if (i == null) { if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    sel = +i;
    const p = S.points[sel], [x, y] = toArt(e);
    drag = t.classList.contains("rs") ? { mode: "r" } : { mode: "m", dx: p.x * S.w - x, dy: p.y * S.h - y };
    ov.setPointerCapture(e.pointerId); ov.classList.add("dragging");
    syncUI(); drawOverlay(); e.preventDefault();
  });
  ov.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = S.points[sel], [x, y] = toArt(e);
    if (drag.mode === "m") { p.x = +clamp((x + drag.dx) / S.w, -0.3, 1.3).toFixed(4); p.y = +clamp((y + drag.dy) / S.h, -0.3, 1.3).toFixed(4); }
    else p.r = Math.round(clamp(Math.hypot(x - p.x * S.w, y - p.y * S.h), 10, 1400));
    drawOverlay(); syncUI(); render(true);
  });
  const endDrag = () => { if (!drag) return; drag = null; ov.classList.remove("dragging"); update(); };
  ov.addEventListener("pointerup", endDrag);
  ov.addEventListener("pointercancel", endDrag);
  ov.addEventListener("dblclick", (e) => {
    const i = e.target.dataset?.i;
    if (i != null) { const p = S.points[+i]; p.s = -p.s; sel = +i; update(); return; }
    const [x, y] = toArt(e);
    addPoint(x / S.w, y / S.h);
  });
  let wheelT = 0;
  ov.addEventListener("wheel", (e) => {
    const i = e.target.dataset?.i;
    if (i == null) return;
    e.preventDefault();
    sel = +i;
    const p = S.points[sel];
    p.r = Math.round(clamp(p.r * Math.exp(-e.deltaY * 0.0015), 10, 1400));
    drawOverlay(); syncUI(); render(true);
    clearTimeout(wheelT); wheelT = setTimeout(() => update(), 180);
  }, { passive: false });

  // ---------- size ----------
  const clampDim = (v) => clamp(Math.round(+v || 0), 64, 8000);
  for (const k of ["w", "h"]) {
    $(k).onchange = (e) => { S[k] = clampDim(e.target.value); update(); };
    $(k).onkeydown = (e) => { if (e.key === "Enter") e.target.blur(); };
  }
  $("swap").onclick = () => { [S.w, S.h] = [S.h, S.w]; update(); };
  const sizeMenu = $("sizeMenu");
  sizeMenu.innerHTML = SIZES.map(([g, list]) => `<h3>${g}</h3>` + list.map(([n, w, h]) => `<button class="opt" data-w="${w}" data-h="${h}"><span>${n}</span><span class="mono">${w}×${h}</span></button>`).join("")).join("");
  sizeMenu.onclick = (e) => {
    const b = e.target.closest(".opt");
    if (!b) return;
    S.w = +b.dataset.w; S.h = +b.dataset.h; closeMenus(); update();
  };
  const presetName = () => { for (const [, list] of SIZES) for (const [n, w, h] of list) if (w === S.w && h === S.h) return n; return "Custom"; };

  // ---------- menus ----------
  const menus = { sizeBtn: sizeMenu, exportBtn: $("exportMenu") };
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

  // ---------- export ----------
  let saver = null;
  window.claude?.use?.("downloads").then((d) => (saver = d)).catch(() => {});
  async function download(blob, name, done) {
    if (saver) {
      try { await saver.save({ filename: name, data: blob }); toast(done); }
      catch (e) { if (e?.code !== "declined") toast("Couldn't save here. Use Copy SVG instead."); }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(done);
  }
  const autoName = () => `topographic-${S.pattern}-${S.w}x${S.h}-${S.seed}`;
  const fmtBytes = (n) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB");
  function pngBlob() {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(new Blob([current.svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const scale = Math.min(S.pngScale, 16000 / Math.max(S.w, S.h));
        const c = document.createElement("canvas");
        c.width = Math.round(S.w * scale); c.height = Math.round(S.h * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject()), "image/png");
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  let pngCache = null, exportTok = 0;
  function refreshExport() {
    for (const b of $("fmt").children) b.classList.toggle("on", b.dataset.v === S.fmt);
    for (const b of $("pngScale").children) b.classList.toggle("on", +b.dataset.v === S.pngScale);
    $("pngScale").hidden = S.fmt !== "png";
    if (!$("fname").dataset.edited) $("fname").value = autoName();
    const dims = S.fmt === "png" ? `${S.w * S.pngScale} × ${S.h * S.pngScale}` : `${S.w} × ${S.h}`;
    const facts = (size) => ($("facts").innerHTML = `<dt>Dimensions</dt><dd>${dims}</dd><dt>File size</dt><dd>${size}</dd>`);
    if (S.fmt === "svg") { facts(fmtBytes(new Blob([current.svg]).size)); return; }
    facts("…");
    const tok = ++exportTok;
    pngBlob().then((b) => { if (tok !== exportTok) return; pngCache = { key: current.svg + S.pngScale, blob: b }; facts(fmtBytes(b.size)); }).catch(() => facts("—"));
  }
  $("fname").oninput = (e) => { e.target.dataset.edited = e.target.value ? "1" : ""; };
  $("fmt").onclick = (e) => { const v = e.target.dataset?.v; if (v) { S.fmt = v; save(); refreshExport(); } };
  $("pngScale").onclick = (e) => { const v = e.target.dataset?.v; if (v) { S.pngScale = +v; save(); refreshExport(); } };
  const fileName = () => ($("fname").value.trim() || autoName()).replace(/\.(svg|png)$/i, "");
  $("download").onclick = async () => {
    if (S.fmt === "svg") return download(new Blob([current.svg], { type: "image/svg+xml" }), fileName() + ".svg", "SVG saved");
    const blob = pngCache?.key === current.svg + S.pngScale ? pngCache.blob : await pngBlob();
    download(blob, fileName() + ".png", "PNG saved");
  };
  async function copySVG() {
    try { await navigator.clipboard.writeText(current.svg); toast("Copied. Paste into Figma with ⌘V"); }
    catch (e) { toast("Clipboard is blocked here. Use Download."); }
  }
  $("copy").onclick = copySVG;

  // ---------- randomize ----------
  function reseed() { S.seed = Math.floor(Math.random() * 999999); update(); }
  function shuffleAll() {
    S.pattern = pick(T.PATTERNS).id;
    if (Math.random() < 0.6) scatterPoints(); else S.usePoints = false;
    randomizeGroup("shape"); randomizeGroup("lines");
    S.angle = pick([0, 0, 15, 30, 45, 90, 135, Math.round(rnd(0, 180))]);
    S.weight = roundStep(0.8 * Math.pow(10, Math.random()), sliders.find((c) => c.key === "weight"));
    S.swell = Math.random() < 0.3 ? +rnd(0.3, 0.8).toFixed(2) : 0;
    S.taper = Math.random() < 0.3 ? Math.round(rnd(60, 240)) : 0;
    S.indexEvery = Math.random() < 0.3 ? Math.round(rnd(3, 6)) : 0;
    S.opacity = 1; S.res = 4;
    randomPalette();
    S.seed = Math.floor(Math.random() * 999999);
    update();
  }
  $("randomize").onclick = reseed;
  $("shuffle").onclick = shuffleAll;
  $("undo").onclick = () => travel(-1);
  $("redo").onclick = () => travel(1);

  document.addEventListener("keydown", (e) => {
    const typing = e.target.matches("input:not([type=range]):not([type=checkbox]), textarea");
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); travel(e.shiftKey ? 1 : -1); return; }
    if (e.key === "Escape") { closeMenus(); if (sel != null) { sel = null; syncUI(); drawOverlay(); } return; }
    if (typing || mod || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "r") { e.preventDefault(); e.shiftKey ? shuffleAll() : reseed(); }
    else if (k === "c") copySVG();
    else if (k === "e") $("exportBtn").click();
    else if ((e.key === "Delete" || e.key === "Backspace") && sel != null) { e.preventDefault(); S.points.splice(sel, 1); sel = null; update(); }
  });

  // ---------- smooth wheel scrolling for the control rail ----------
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

  // ---------- render ----------
  let current = { svg: "" }, raf = 0;
  function fit() {
    const cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) * 2, ah = wrap.clientHeight - parseFloat(cs.paddingTop) * 2;
    const k = Math.min(aw / S.w, ah / S.h);
    art.style.width = Math.max(40, S.w * k) + "px";
    art.style.height = Math.max(40, S.h * k) + "px";
  }
  new ResizeObserver(() => { fit(); drawOverlay(); }).observe(wrap);

  function render(draft = false) {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const t0 = performance.now();
      const r = T.buildSVG(S, draft ? { res: Math.max(S.res * 2, 7) } : {});
      artSvg.innerHTML = r.svg;
      art.classList.toggle("clear", S.transparent);
      if (!draft) current = r;
      $("ms").textContent = `${Math.round(performance.now() - t0)} ms`;
      fit(); drawOverlay();
      if (!draft) drawThumbs();
    });
  }

  const mirror = document.createElement("span");
  mirror.className = "dim";
  mirror.style.cssText = "position:absolute;visibility:hidden;width:auto;padding:0;white-space:pre;left:-9999px";
  document.body.appendChild(mirror);
  const measure = (text) => { mirror.style.fontSize = getComputedStyle($("w")).fontSize; mirror.textContent = text; return Math.ceil(mirror.getBoundingClientRect().width); };

  function syncUI() {
    sliders.forEach((c) => c.sync());
    for (const [id, b] of Object.entries(patBtns)) b.classList.toggle("on", id === S.pattern);
    for (const [n, b] of Object.entries(lookBtns)) b.classList.toggle("on", lookMatches(LOOKS[n]));
    swatchSync.forEach((f) => f());
    $("line2Sw").classList.toggle("off", !S.gradient);
    $("gradient").checked = S.gradient;
    $("transparent").checked = S.transparent;
    $("usePoints").checked = S.usePoints;
    const eye = S.showPoints ? "eye" : "eye-off";
    if ($("showPoints").dataset.icon !== eye) { $("showPoints").dataset.icon = eye; $("showPoints").innerHTML = `<i data-lucide="${eye}"></i>`; }
    $("seed").value = S.seed;
    $("ptHint").textContent = sel != null ? "Double-click a point to flip it. Delete removes it." : "Double-click canvas to add. Drag to move. Scroll to resize.";
    for (const k of ["w", "h"]) { const el = $(k); el.value = S[k]; el.style.width = measure(String(S[k])) + 10 + "px"; }
    $("sizeName").textContent = presetName();
    syncHistory();
    icons();
  }
  document.fonts?.ready.then(() => syncUI());

  function update({ draft = false, commit: doCommit = true } = {}) {
    if (sel != null && !S.points[sel]) sel = null;
    syncUI(); save(); render(draft);
    if (doCommit && !draft) commit();
  }

  window.TopoBrand?.mount($("brand"));
  update({ commit: false });
})();
