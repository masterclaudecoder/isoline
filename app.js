(() => {
  "use strict";

  // ---------- state ----------
  const DEFAULTS = {
    w: 1440, h: 900, pattern: "terrain",
    scale: 620, octaves: 3, warp: 0.45, seed: 4821,
    levels: 20, weight: 1, indexEvery: 5, indexWeight: 2.2, smooth: 0.6, res: 4, minLen: 8,
    line: "#2b2b2b", line2: "#e8572a", gradient: false,
    bg: "#ffffff", transparent: false, opacity: 1,
  };
  let S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem("contour-studio") || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem("contour-studio", JSON.stringify(S)); } catch (e) {} };

  const PATTERNS = [
    ["terrain", "Terrain"], ["ridges", "Ridges"], ["flow", "Flow"],
    ["peaks", "Peaks"], ["islands", "Islands"], ["rings", "Rings"],
  ];
  const PRESETS = [[1440, 900], [1920, 1080], [1080, 1080], [1080, 1350], [390, 844], [2560, 1440]];
  const LINE_COLORS = ["#2b2b2b", "#8a8780", "#e8572a", "#3a5bd9", "#1f9e78", "#e0a21b", "#d9487a", "#ffffff"];
  const BG_COLORS = ["#ffffff", "#f4f1ea", "#efe4da", "#e9eef5", "#16171a", "#0f1b33", "#1d2b24"];

  // ---------- noise ----------
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(seed) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const gx = [1, -1, 1, -1, 1, -1, 0, 0], gy = [1, 1, -1, -1, 0, 0, 1, -1];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    return (xin, yin) => {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n = 0, tt, g;
      tt = 0.5 - x0 * x0 - y0 * y0;
      if (tt > 0) { g = perm[ii + perm[jj]] & 7; tt *= tt; n += tt * tt * (gx[g] * x0 + gy[g] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1;
      if (tt > 0) { g = perm[ii + i1 + perm[jj + j1]] & 7; tt *= tt; n += tt * tt * (gx[g] * x1 + gy[g] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2;
      if (tt > 0) { g = perm[ii + 1 + perm[jj + 1]] & 7; tt *= tt; n += tt * tt * (gx[g] * x2 + gy[g] * y2); }
      return 70 * n;
    };
  }

  // ---------- scalar field ----------
  function buildField(s, w, h, res) {
    const cols = Math.max(2, Math.round(w / res)), rows = Math.max(2, Math.round(h / res));
    const sx = w / cols, sy = h / rows, nx = cols + 1, ny = rows + 1;
    const f = new Float32Array(nx * ny);
    const noise = makeNoise(s.seed);
    const rand = mulberry32(s.seed ^ 0x9e3779b9);
    const oct = s.octaves, sc = s.scale * (w / s.w); // keep look consistent when thumbnails are scaled
    const fbm = (x, y, o) => {
      let a = 1, q = 1, sum = 0, norm = 0;
      for (let k = 0; k < o; k++) { sum += a * noise(x * q, y * q); norm += a; a *= 0.5; q *= 2.03; }
      return sum / norm;
    };
    const ridged = (x, y, o) => {
      let a = 1, q = 1, sum = 0, norm = 0;
      for (let k = 0; k < o; k++) { const r = 1 - Math.abs(noise(x * q, y * q)); sum += a * r * r; norm += a; a *= 0.5; q *= 2.03; }
      return sum / norm;
    };
    const peaks = [];
    const nPeaks = 6 + Math.floor(rand() * 8);
    for (let k = 0; k < nPeaks; k++) {
      peaks.push({ x: rand(), y: rand(), r: (0.5 + rand() * 1.1) * sc, a: (0.5 + rand() * 0.7) * (rand() < 0.2 ? -0.6 : 1) });
    }
    const ang = rand() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
    const cx = (0.3 + rand() * 0.4) * w, cy = (0.3 + rand() * 0.4) * h;
    const diag = Math.hypot(w, h) / 2;

    let min = Infinity, max = -Infinity;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = i * sx, y = j * sy;
        let u = x / sc, v = y / sc;
        if (s.warp > 0) {
          const wx = fbm(u + 5.2, v + 1.3, 3), wy = fbm(u + 1.7, v + 9.2, 3);
          u += s.warp * wx; v += s.warp * wy;
        }
        let val;
        switch (s.pattern) {
          case "ridges": val = ridged(u, v, oct); break;
          case "flow": {
            const d = u * ca + v * sa;
            val = Math.sin(d * 2.4 + fbm(u * 0.45, v * 0.45, oct) * 2.2);
            break;
          }
          case "peaks": {
            const px = u * sc, py = v * sc;
            val = 0;
            for (const p of peaks) {
              const dx = px - p.x * w, dy = py - p.y * h;
              val += p.a * Math.exp(-(dx * dx + dy * dy) / (2 * p.r * p.r));
            }
            val += 0.12 * fbm(u, v, oct);
            break;
          }
          case "islands": {
            const d = Math.hypot(u * sc - w / 2, v * sc - h / 2) / diag;
            val = fbm(u, v, oct) * 0.9 + 0.55 - d * 1.3;
            break;
          }
          case "rings": {
            const d = Math.hypot(u * sc - cx, v * sc - cy) / sc;
            val = Math.sin(d * 3.2) * 0.5 + 0.35 * fbm(u * 0.6, v * 0.6, oct) - d * 0.05;
            break;
          }
          default: val = fbm(u, v, oct);
        }
        f[j * nx + i] = val;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    const span = max - min || 1;
    for (let k = 0; k < f.length; k++) f[k] = (f[k] - min) / span;
    return { f, nx, ny, cols, rows, sx, sy };
  }

  // ---------- marching squares -> polylines ----------
  function contour(field, t) {
    const { f, nx, cols, rows, sx, sy } = field;
    const pts = new Map(), adj = new Map();
    const lerp = (a, b) => (b === a ? 0.5 : (t - a) / (b - a));
    const hKey = (i, j) => (j * nx + i) * 2, vKey = (i, j) => (j * nx + i) * 2 + 1;
    const link = (a, b) => {
      let la = adj.get(a); if (!la) adj.set(a, (la = [])); la.push(b);
      let lb = adj.get(b); if (!lb) adj.set(b, (lb = [])); lb.push(a);
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const tl = f[j * nx + i], tr = f[j * nx + i + 1], br = f[(j + 1) * nx + i + 1], bl = f[(j + 1) * nx + i];
        const c = (tl > t ? 8 : 0) | (tr > t ? 4 : 0) | (br > t ? 2 : 0) | (bl > t ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const x0 = i * sx, y0 = j * sy;
        const T = () => { const k = hKey(i, j); if (!pts.has(k)) pts.set(k, [x0 + sx * lerp(tl, tr), y0]); return k; };
        const B = () => { const k = hKey(i, j + 1); if (!pts.has(k)) pts.set(k, [x0 + sx * lerp(bl, br), y0 + sy]); return k; };
        const L = () => { const k = vKey(i, j); if (!pts.has(k)) pts.set(k, [x0, y0 + sy * lerp(tl, bl)]); return k; };
        const R = () => { const k = vKey(i + 1, j); if (!pts.has(k)) pts.set(k, [x0 + sx, y0 + sy * lerp(tr, br)]); return k; };
        switch (c) {
          case 1: case 14: link(L(), B()); break;
          case 2: case 13: link(B(), R()); break;
          case 3: case 12: link(L(), R()); break;
          case 4: case 11: link(T(), R()); break;
          case 6: case 9: link(T(), B()); break;
          case 7: case 8: link(L(), T()); break;
          case 5: {
            const mid = (tl + tr + br + bl) / 4 > t;
            if (mid) { link(L(), T()); link(B(), R()); } else { link(T(), R()); link(L(), B()); }
            break;
          }
          case 10: {
            const mid = (tl + tr + br + bl) / 4 > t;
            if (mid) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(B(), R()); }
            break;
          }
        }
      }
    }
    const seen = new Set(), lines = [];
    const walk = (start) => {
      const out = [pts.get(start)];
      seen.add(start);
      let prev = -1, cur = start, closed = false;
      for (;;) {
        const nb = adj.get(cur);
        let next = -1;
        for (const n of nb) if (n !== prev && !seen.has(n)) { next = n; break; }
        if (next === -1) { if (nb.length > 1 && nb.includes(start) && out.length > 2) closed = true; break; }
        out.push(pts.get(next)); seen.add(next); prev = cur; cur = next;
      }
      return { p: out, closed };
    };
    for (const [k, nb] of adj) if (nb.length === 1 && !seen.has(k)) lines.push(walk(k));
    for (const k of adj.keys()) if (!seen.has(k)) lines.push(walk(k));
    return lines;
  }

  // Ramer–Douglas–Peucker
  function simplify(p, eps) {
    if (p.length < 3) return p;
    const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
    const stack = [[0, p.length - 1]], e2 = eps * eps;
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = p[a], [bx, by] = p[b];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      let md = 0, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const [px, py] = p[i];
        let d;
        if (len === 0) d = (px - ax) ** 2 + (py - ay) ** 2;
        else { const c = dx * (py - ay) - dy * (px - ax); d = (c * c) / len; }
        if (d > md) { md = d; mi = i; }
      }
      if (md > e2) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return p.filter((_, i) => keep[i]);
  }

  const n1 = (v) => Math.round(v * 10) / 10;
  function toPath(p, closed, tension) {
    const n = p.length;
    let d = `M${n1(p[0][0])} ${n1(p[0][1])}`;
    if (tension <= 0 || n < 3) {
      for (let i = 1; i < n; i++) d += `L${n1(p[i][0])} ${n1(p[i][1])}`;
      return d + (closed ? "Z" : "");
    }
    const k = tension / 6, segs = closed ? n : n - 1;
    const at = (i) => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${n1(p1[0] + (p2[0] - p0[0]) * k)} ${n1(p1[1] + (p2[1] - p0[1]) * k)} ${n1(p2[0] - (p3[0] - p1[0]) * k)} ${n1(p2[1] - (p3[1] - p1[1]) * k)} ${n1(p2[0])} ${n1(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");

  // ---------- render ----------
  function buildSVG(s, opts = {}) {
    const w = opts.w || s.w, h = opts.h || s.h;
    const k = w / s.w;
    const field = buildField(s, w, h, opts.res || s.res);
    let body = "", paths = 0;
    for (let L = 0; L < s.levels; L++) {
      const t = (L + 1) / (s.levels + 1);
      const isIndex = s.indexEvery > 0 && (L + 1) % s.indexEvery === 0;
      const lines = contour(field, t);
      let d = "";
      for (const ln of lines) {
        if (ln.p.length < (opts.minLen ?? s.minLen)) continue;
        d += toPath(simplify(ln.p, 0.35 * Math.max(k, 0.3)), ln.closed, s.smooth);
        paths++;
      }
      if (!d) continue;
      const color = s.gradient ? mix(s.line, s.line2, s.levels > 1 ? L / (s.levels - 1) : 0) : s.line;
      const sw = Math.round(s.weight * (isIndex ? s.indexWeight : 1) * Math.max(k, 0.5) * 100) / 100;
      body += `<path d="${d}" stroke="${color}" stroke-width="${sw}"/>`;
    }
    const bg = s.transparent ? "" : `<rect width="${w}" height="${h}" fill="${s.bg}"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}<g fill="none" stroke-linecap="round" stroke-linejoin="round"${s.opacity < 1 ? ` stroke-opacity="${s.opacity}"` : ""}>${body}</g></svg>`;
    return { svg, paths };
  }

  // ---------- UI ----------
  const $ = (id) => document.getElementById(id);
  const art = $("art"), meta = $("meta");

  const SLIDERS = {
    shape: [
      ["scale", "Scale", 60, 1400, 10, (v) => v + "px"],
      ["octaves", "Detail", 1, 7, 1],
      ["warp", "Warp", 0, 3, 0.05, (v) => v.toFixed(2)],
    ],
    lines: [
      ["levels", "Count", 3, 90, 1],
      ["weight", "Weight", 0.25, 6, 0.05, (v) => v.toFixed(2)],
      ["indexEvery", "Bold every", 0, 12, 1, (v) => (v ? v : "Off")],
      ["indexWeight", "Bold weight", 1, 5, 0.1, (v) => v.toFixed(1) + "×"],
      ["smooth", "Smooth", 0, 1, 0.05, (v) => v.toFixed(2)],
      ["res", "Grid", 2, 14, 1, (v) => v + "px"],
      ["minLen", "Clean", 2, 80, 1],
    ],
    color: [["opacity", "Opacity", 0.1, 1, 0.05, (v) => Math.round(v * 100) + "%"]],
  };
  const sliderEls = {};
  for (const [host, list] of Object.entries(SLIDERS)) {
    for (const [key, label, min, max, step, fmt = (v) => v] of list) {
      const row = document.createElement("div");
      row.className = "ctrl";
      row.innerHTML = `<div class="label-row"><label class="label" for="s-${key}">${label}</label><span class="val"></span></div><input id="s-${key}" type="range" min="${min}" max="${max}" step="${step}">`;
      const input = row.querySelector("input"), val = row.querySelector(".val");
      const paint = () => { input.style.setProperty("--p", ((input.value - min) / (max - min)) * 100 + "%"); val.textContent = fmt(+input.value); };
      input.addEventListener("input", () => { S[key] = +input.value; paint(); update(); });
      sliderEls[key] = () => { input.value = S[key]; paint(); };
      $(host).appendChild(row);
    }
  }

  // patterns with live thumbnails
  const patBtns = {};
  for (const [id, label] of PATTERNS) {
    const b = document.createElement("button");
    b.className = "pat";
    b.innerHTML = `<div class="th"></div><span>${label}</span>`;
    b.onclick = () => { S.pattern = id; update(true); };
    $("patterns").appendChild(b);
    patBtns[id] = b;
  }
  let thumbKey = "";
  function drawThumbs() {
    const key = [S.seed, S.warp, S.octaves, S.scale, S.w, S.h].join();
    if (key === thumbKey) return;
    thumbKey = key;
    const tw = 120, th = 80;
    for (const [id] of PATTERNS) {
      const ts = { ...S, pattern: id, levels: 12, gradient: false, transparent: false, bg: "#ffffff", line: "#3a3936", weight: 0.9, indexEvery: 0, opacity: 1, smooth: 0.5 };
      patBtns[id].querySelector(".th").innerHTML = buildSVG(ts, { w: tw, h: th, res: 2, minLen: 3 }).svg;
    }
  }

  // swatches
  function swatchRow(host, colors, key) {
    const el = $(host);
    const btns = colors.map((c) => {
      const b = document.createElement("button");
      b.className = "sw"; b.style.background = c; b.title = c;
      b.onclick = () => { S[key] = c; if (key === "bg") S.transparent = false; update(); };
      el.appendChild(b);
      return b;
    });
    const custom = document.createElement("label");
    custom.className = "sw custom"; custom.title = "Custom";
    custom.innerHTML = `<input type="color">`;
    const ci = custom.querySelector("input");
    ci.addEventListener("input", () => { S[key] = ci.value; if (key === "bg") S.transparent = false; update(); });
    el.appendChild(custom);
    return () => {
      let hit = false;
      btns.forEach((b, i) => { const on = colors[i] === S[key]; b.classList.toggle("on", on); hit ||= on; });
      custom.classList.toggle("on", !hit);
      ci.value = S[key];
    };
  }
  const swatchSync = [swatchRow("lineSw", LINE_COLORS, "line"), swatchRow("line2Sw", LINE_COLORS, "line2"), swatchRow("bgSw", BG_COLORS, "bg")];

  $("gradient").onchange = (e) => { S.gradient = e.target.checked; update(); };
  $("transparent").onchange = (e) => { S.transparent = e.target.checked; update(); };
  $("seed").onchange = (e) => { S.seed = Math.max(0, Math.floor(+e.target.value || 0)); update(); };
  const reseed = () => { S.seed = Math.floor(Math.random() * 999999); update(); };
  $("dice").onclick = reseed;

  // size
  const clampDim = (v) => Math.max(64, Math.min(8000, Math.round(+v || 0)));
  for (const k of ["w", "h"]) {
    $(k).onchange = (e) => { S[k] = clampDim(e.target.value); update(); };
    $(k).onkeydown = (e) => { if (e.key === "Enter") e.target.blur(); };
  }
  const presetBtns = PRESETS.map(([w, h]) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = `${w}×${h}`;
    b.onclick = () => { S.w = w; S.h = h; update(); };
    $("presets").appendChild(b);
    return b;
  });

  const mirror = document.createElement("span");
  mirror.className = "dim";
  mirror.style.cssText = "position:absolute;visibility:hidden;width:auto;padding:0;white-space:pre";
  document.body.appendChild(mirror);
  const measure = (el, text) => { mirror.style.fontSize = getComputedStyle(el).fontSize; mirror.textContent = text; return Math.ceil(mirror.getBoundingClientRect().width); };
  document.fonts?.ready.then(() => syncUI());

  function syncUI() {
    Object.values(sliderEls).forEach((f) => f());
    for (const [id, b] of Object.entries(patBtns)) b.classList.toggle("on", id === S.pattern);
    swatchSync.forEach((f) => f());
    $("line2Sw").classList.toggle("off", !S.gradient);
    $("gradient").checked = S.gradient;
    $("transparent").checked = S.transparent;
    $("seed").value = S.seed;
    for (const k of ["w", "h"]) { const el = $(k); el.value = S[k]; el.style.width = measure(el, String(S[k])) + 10 + "px"; }
    presetBtns.forEach((b, i) => b.classList.toggle("on", PRESETS[i][0] === S.w && PRESETS[i][1] === S.h));
    $("s-indexWeight").disabled = !S.indexEvery;
  }

  // fit artboard to stage
  function fit() {
    const wrap = art.parentElement, pad = 56;
    const aw = wrap.clientWidth - pad, ah = wrap.clientHeight - pad;
    const k = Math.min(aw / S.w, ah / S.h);
    art.style.width = Math.max(40, S.w * k) + "px";
    art.style.height = Math.max(40, S.h * k) + "px";
  }
  new ResizeObserver(fit).observe(art.parentElement);

  let current = { svg: "", paths: 0 }, raf = 0;
  function update() {
    syncUI(); save();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const t0 = performance.now();
      current = buildSVG(S);
      art.innerHTML = current.svg;
      art.classList.toggle("clear", S.transparent);
      fit();
      const kb = (new Blob([current.svg]).size / 1024).toFixed(0);
      meta.innerHTML = `<span><b>${S.levels}</b> levels</span><span><b>${current.paths}</b> paths</span><span><b>${kb}</b> KB</span><span><b>${Math.round(performance.now() - t0)}</b> ms</span><span class="kbd">R — new seed</span>`;
      drawThumbs();
    });
  }

  // ---------- export ----------
  const toast = (html) => { const t = $("toast"); t.innerHTML = html; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1800); };
  const fname = (ext) => `topo-${S.pattern}-${S.w}x${S.h}-${S.seed}.${ext}`;
  const download = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

  $("copy").onclick = async () => {
    try { await navigator.clipboard.writeText(current.svg); toast("Copied. <i>⌘V</i> in Figma."); }
    catch (e) { download(new Blob([current.svg], { type: "image/svg+xml" }), fname("svg")); toast("Clipboard blocked. Saved SVG."); }
  };
  $("svg").onclick = () => { download(new Blob([current.svg], { type: "image/svg+xml" }), fname("svg")); toast("SVG saved."); };
  $("png").onclick = () => {
    const img = new Image(), url = URL.createObjectURL(new Blob([current.svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const scale = Math.min(2, 8000 / Math.max(S.w, S.h));
      const c = document.createElement("canvas");
      c.width = Math.round(S.w * scale); c.height = Math.round(S.h * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => { download(b, fname("png")); toast(`PNG saved at <i>${scale}×</i>.`); });
    };
    img.src = url;
  };

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input[type=number], input[type=color]") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "r" || e.key === "R") reseed();
  });

  update();
})();
