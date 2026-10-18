// Assets: a logo maker. A mark is put together in steps, the way a Studio design is: a center shape
// and how it's painted, something around or beside it, a wrap that holds the whole, a finish cut into
// it, and which part takes the accent. Every step works with every other, so the same center can be
// a badge, a planet, a seal or a monogram. Shuffle rolls any step or all of them.
// The name is set in the kit's font and colors (or the palette's). The logo can stand in for the
// made-up Margin logo in the Components preview, and the home page's roll rolls it too.
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const T = root.Topo, C = root.Color;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = (v) => +v.toFixed(1);
  const P = (x, y) => `${f1(x)} ${f1(y)}`;
  const rad = (d) => (d * Math.PI) / 180;

  // ---------- the steps and their choices ----------
  // [id, name, what it is]
  const SHAPES = [
    ["circle", "Circle", "A plain circle"], ["poly", "Polygon", "Three to eight sides, with rounded corners"], ["star", "Star", "Points around a center"],
    ["petal", "Petal", "Two curves meeting at both ends"], ["blob", "Blob", "A soft, uneven round"], ["half", "Half", "Half a circle"],
    ["drop", "Drop", "A teardrop"], ["cross", "Cross", "A plus sign"], ["leaf", "Leaf", "Two curves meeting at opposite corners"],
    ["arch", "Arch", "Round on top, flat below"], ["letter", "Letter", "Your name's first letter"],
  ];
  const PIECES = SHAPES.filter((s) => s[0] !== "letter");
  const PAINTS = [["solid", "Solid", "Filled in"], ["outline", "Outline", "Drawn as a line"], ["lines", "Lines", "Hatched with parallel lines"], ["dots", "Dots", "Filled with a grid of dots"], ["rings", "Rings", "Nested copies of itself"], ["topo", "Topo", "Filled with contour rings"]];
  const AROUND = [
    ["none", "None", "The center on its own"], ["ring", "Ring", "A ring around the center"], ["echo", "Echo", "Copies of the center, growing outward"],
    ["orbit", "Orbit", "A tilted ring passing behind and in front"], ["repeat", "Repeat", "Pieces spaced all the way around"], ["satellite", "Satellite", "One piece beside the center"],
    ["offset", "Offset", "A second center overlapping the first"], ["pair", "Pair", "The center and a piece side by side"],
  ];
  const USES_PIECE = new Set(["repeat", "satellite", "pair", "orbit"]);
  const WRAPS = [
    ["none", "None", "Nothing around the mark"], ["circle", "Circle", "A round badge"], ["rounded", "Rounded", "A rounded square"], ["squircle", "Squircle", "A soft square, like an app icon"],
    ["hex", "Hexagon", "Six sides"], ["diamond", "Diamond", "A square on its point"], ["shield", "Shield", "A crest"], ["arch", "Arch", "Round on top, flat below"], ["pill", "Pill", "A tall capsule"],
  ];
  const WRAP_MODES = [["cut", "Cut", "The mark cut to the wrap's outline"], ["frame", "Frame", "The wrap drawn as a line around the mark"], ["badge", "Badge", "A solid wrap with the mark knocked out of it"]];
  const FINISHES = [
    ["none", "None", "No finish"], ["slice", "Slice", "A cut straight through"], ["stripes", "Stripes", "Lines cut across one side"],
    ["notch", "Notch", "A wedge taken out"], ["split", "Split", "One side in the accent"], ["shadow", "Shadow", "An offset copy behind, in the accent"],
  ];
  const ACCENTS = [["none", "None", "One color"], ["center", "Center", "The center in the accent"], ["around", "Around", "Everything around the center in the accent"], ["one", "One piece", "A single piece in the accent"], ["wrap", "Wrap", "The wrap in the accent (with a frame or badge)"]];

  const MDEF = {
    c: { shape: "circle", paint: "topo", size: 0.55, sides: 0.4, depth: 0.5, round: 0.35, turn: 0, detail: 0.5 },
    a: { kind: "none", piece: "circle", paint: "solid", count: 0.4, dist: 0.5, size: 0.4, spin: 0 },
    w: { shape: "circle", mode: "cut" },
    f: { kind: "none", amount: 0.4, angle: 0.15 },
    accent: "center", weight: 0.45, gap: 0.45, seed: 7,
  };
  const ENUM = { "c.shape": SHAPES, "c.paint": PAINTS, "a.kind": AROUND, "a.piece": PIECES, "a.paint": PAINTS, "w.shape": WRAPS, "w.mode": WRAP_MODES, "f.kind": FINISHES, accent: ACCENTS };
  const DEG = new Set(["c.turn", "a.spin"]);
  // A mark from anywhere (storage, a saved look, a script) made safe to draw.
  function norm(m) {
    const o = JSON.parse(JSON.stringify(MDEF));
    if (!m || typeof m !== "object") return o;
    for (const sec of ["c", "a", "w", "f"]) {
      const src = m[sec]; if (!src || typeof src !== "object") continue;
      for (const k of Object.keys(o[sec])) {
        const v = src[k], key = sec + "." + k;
        if (ENUM[key]) { if (ENUM[key].some((x) => x[0] === v)) o[sec][k] = v; }
        else if (Number.isFinite(v)) o[sec][k] = DEG.has(key) ? ((Math.round(v) % 360) + 360) % 360 : clamp(v, 0, 1);
      }
    }
    if (ACCENTS.some((x) => x[0] === m.accent)) o.accent = m.accent;
    for (const k of ["weight", "gap"]) if (Number.isFinite(m[k])) o[k] = clamp(m[k], 0, 1);
    if (Number.isFinite(m.seed)) o.seed = Math.round(m.seed);
    return o;
  }
  // Marks from the earlier prototypes (one pattern in a frame) open as the nearest steps.
  function fromOld(m) {
    const b = m.body || ({ contour: "rings", lens: "lens", orbit: "orbit", strata: "waves", bloom: "bloom", monogram: "letter" })[m.style] || "rings";
    const map = {
      rings: { c: { shape: "circle", paint: "topo" } }, lens: { c: { shape: "circle", paint: "lines" } }, waves: { c: { shape: "arch", paint: "lines" } },
      bloom: { c: { shape: "circle", paint: "solid", size: 0.2 }, a: { kind: "repeat", piece: "petal", count: 0.3 } }, orbit: { c: { shape: "circle", paint: "solid", size: 0.45 }, a: { kind: "orbit" } },
      dots: { c: { shape: "circle", paint: "dots" } }, rays: { c: { shape: "circle", paint: "solid", size: 0.2 }, a: { kind: "repeat", piece: "petal", count: 0.8, size: 0.2 } },
      arcs: { c: { shape: "half", paint: "rings" } }, bars: { c: { shape: "poly", paint: "lines" } }, spiral: { c: { shape: "circle", paint: "rings" } }, letter: { c: { shape: "letter", paint: "solid" }, a: { kind: "ring" } },
    }[b] || {};
    const frame = { circle: "circle", square: "rounded", arch: "arch", pill: "pill", hex: "hex", leaf: "circle" }[m.frame];
    return norm({ ...MDEF, c: { ...MDEF.c, ...map.c }, a: { ...MDEF.a, ...map.a }, w: { shape: frame || "none", mode: m.fill === "solid" ? "badge" : m.fill === "outline" ? "frame" : "cut" }, accent: map.a ? "around" : "center", seed: m.seed });
  }
  const isNew = (m) => m && typeof m === "object" && m.c && typeof m.c === "object";

  // ---------- state ----------
  const KEY = "isoline.logo";
  const DEF = { name: "Margin", layout: "side", font: "kit", weight: 600, case: "as", track: -0.02, color: "kit", kit: false };
  let L = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    const o = { ...DEF, ...s };
    o.mark = isNew(s.mark) ? norm(s.mark) : s.mark || s.style ? fromOld({ ...(s.mark || {}), style: s.style, seed: s.seed ?? s.mark?.seed }) : norm(MDEF);
    delete o.style; delete o.seed;
    return o;
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const newSeed = () => 1 + Math.floor(Math.random() * 99999);

  // ---------- shapes ----------
  // Every shape is drawn around the origin and placed with a transform, so the same outline can be
  // filled, stroked, used as a clip or copied at another size. Marks live on a 100 x 100 board.
  // Colors are slots filled in wherever the mark is shown: INK, ACC (the accent) and BGC (the surface
  // behind, for gaps and cut-outs).
  function roundPoly(pts, round) {
    const t = clamp(round, 0, 1) * 0.5, n = pts.length;
    if (t < 0.01) return "M" + pts.map(([x, y]) => P(x, y)).join("L") + "Z";
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = pts[(i + n - 1) % n], v = pts[i], q = pts[(i + 1) % n];
      d += `${i ? "L" : "M"}${P(v[0] + (p[0] - v[0]) * t, v[1] + (p[1] - v[1]) * t)}Q${P(v[0], v[1])} ${P(v[0] + (q[0] - v[0]) * t, v[1] + (q[1] - v[1]) * t)}`;
    }
    return d + "Z";
  }
  const around = (n, rf, a0 = -90) => Array.from({ length: n }, (_, i) => { const a = rad(a0 + (360 / n) * i), r = typeof rf === "function" ? rf(i) : rf; return [r * Math.cos(a), r * Math.sin(a)]; });
  const circleD = (r) => `M${f1(-r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
  // A closed curve through points (Catmull-Rom as cubic Béziers).
  function smoothClosed(pts) {
    const n = pts.length; let d = `M${P(...pts[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P(...p2)}`;
    }
    return d + "Z";
  }
  // o: sides, depth, round (0 to 1), seed. Returns a path around the origin with radius about r.
  function shapeD(kind, r, o) {
    const sides = 3 + Math.round(o.sides * 5);
    switch (kind) {
      case "poly": return roundPoly(around(sides, r), o.round);
      case "star": { const n = 4 + Math.round(o.sides * 6), inner = r * lerp(0.78, 0.32, o.depth); return roundPoly(around(n * 2, (i) => (i % 2 ? inner : r)), o.round * 0.7); }
      case "petal": { const w = r * lerp(0.35, 1.05, o.depth); return `M0 ${f1(-r)}Q${f1(w)} 0 0 ${f1(r)}Q${f1(-w)} 0 0 ${f1(-r)}Z`; }
      case "blob": { const g = T.mulberry32(o.seed * 13 + 5); return smoothClosed(around(7, () => r * (1 + (g() - 0.5) * lerp(0.15, 0.7, o.depth)))); }
      case "half": return `M${f1(-r)} ${f1(r * 0.3)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(r)} ${f1(r * 0.3)}Z`;
      case "drop": return `M0 ${f1(-r)}C${f1(r * 0.95)} ${f1(-r * 0.15)} ${f1(r * 0.8)} ${f1(r * 0.85)} 0 ${f1(r * 0.85)}C${f1(-r * 0.8)} ${f1(r * 0.85)} ${f1(-r * 0.95)} ${f1(-r * 0.15)} 0 ${f1(-r)}Z`;
      case "cross": { const a = r * lerp(0.16, 0.42, o.depth); return roundPoly([[-a, -r], [a, -r], [a, -a], [r, -a], [r, a], [a, a], [a, r], [-a, r], [-a, a], [-r, a], [-r, -a], [-a, -a]], o.round * 0.6); }
      case "leaf": { const k = r * 0.8, b = lerp(0.1, 0.75, o.depth) * r; return `M${f1(-k)} ${f1(k)}C${f1(-k)} ${f1(-b)} ${f1(b)} ${f1(-k)} ${f1(k)} ${f1(-k)}C${f1(k)} ${f1(b)} ${f1(-b)} ${f1(k)} ${f1(-k)} ${f1(k)}Z`; }
      case "arch": { const w = r * 0.78; return `M${f1(-w)} ${f1(r)}V${f1(-r + w)}A${f1(w)} ${f1(w)} 0 0 1 ${f1(w)} ${f1(-r + w)}V${f1(r)}Z`; }
      default: return circleD(r);
    }
  }
  const WRAP_D = {
    circle: circleD(47), rounded: roundPoly([[-46, -46], [46, -46], [46, 46], [-46, 46]], 0.55), squircle: roundPoly([[-47, -47], [47, -47], [47, 47], [-47, 47]], 0.92),
    hex: roundPoly(around(6, 48), 0.2), diamond: roundPoly(around(4, 49), 0.25), shield: `M0 -47C14 -40 28 -40 42 -42C44 4 30 32 0 47C-30 32 -44 4 -42 -42C-28 -40 -14 -40 0 -47Z`,
    arch: "M-40 47V-7A40 40 0 0 1 40 -7V47Z", pill: "M-27 -20A27 27 0 0 1 27 -20V20A27 27 0 0 1 -27 20Z",
  };
  // The pill's ends need the full radius; drawn as a rounded rectangle instead of the shorthand above.
  WRAP_D.pill = roundPoly([[-27, -47], [27, -47], [27, 47], [-27, 47]], 1);

  // ---------- painting ----------
  let uidN = 0;
  const uid = () => "lg" + (++uidN).toString(36);
  const initial = (name) => ([...String(name).trim()][0] || "A");
  const BASE = {
    seed: 7, scale: 100, octaves: 1, warp: 0, angle: 0, features: 0, bump: 0, bumpSize: 50, usePoints: true, falloff: 1,
    levels: 6, gap: 10, bias: 0, weight: 1, swell: 0, swellSize: 100, taper: 0, indexEvery: 0, indexWeight: 1,
    smooth: 0.5, res: 2, minLen: 0, line: "#1c1c1e", line2: "#1c1c1e", gradient: false, bg: "#fff", transparent: true, opacity: 1, mode: "lines",
  };
  // One shape, placed (x, y, size r, turn) and painted. Textures are cut to the shape's outline.
  // g: { sw (line width), detail, color, halo (gap color or ""), hw (gap width), seed, letter }
  function paintShape(kind, x, y, r, turn, paint, o, g) {
    const tf = `translate(${f1(x)} ${f1(y)}) rotate(${f1(turn)})`;
    const isText = kind === "letter";
    const fs = f1(r * 1.55);
    const node = (attrs, extraTf = "") => isText
      ? `<text transform="${tf}${extraTf}" x="0" y="${f1(r * 0.06)}" text-anchor="middle" dominant-baseline="central" font-family="'${esc(g.letter.font)}', system-ui, sans-serif" font-weight="${g.letter.weight}" font-size="${fs}" ${attrs}>${esc(g.letter.ch)}</text>`
      : `<path d="${shapeD(kind, r, o)}" transform="${tf}${extraTf}" ${attrs}/>`;
    const sw = f1(Math.min(g.sw, r * 0.5));
    let out = "";
    // A gap in the surface color under the shape, so it reads apart from whatever it overlaps.
    if (g.halo && g.hw > 0.2) out += node(paint === "outline" || paint === "rings" ? `fill="none" stroke="${g.halo}" stroke-width="${f1(+sw + g.hw * 2)}" stroke-linejoin="round"` : `fill="${g.halo}" stroke="${g.halo}" stroke-width="${f1(g.hw * 2)}" stroke-linejoin="round"`);
    const col = g.color;
    if (paint === "solid") return out + node(`fill="${col}"`);
    if (paint === "outline") return out + node(`fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"`);
    if (paint === "rings") {
      const n = Math.round(lerp(2, 6, g.detail));
      for (let k = n; k >= 1; k--) { const s = k / n; out += node(`fill="none" stroke="${col}" stroke-width="${f1(sw / s)}" stroke-linejoin="round"`, ` scale(${f1(s * 100) / 100})`); }
      return out;
    }
    const id = uid(), clip = `<clipPath id="${id}">${node("")}</clipPath>`;
    let tex = "";
    const s = lerp(9, 3.4, g.detail) * clamp(r / 30, 0.55, 1.2), R = r * 1.5;
    if (paint === "lines") {
      const a = rad(turn + 45 + g.seed % 4 * 45), nx = Math.cos(a), ny = Math.sin(a);
      for (let k = -Math.ceil(R / s); k <= Math.ceil(R / s); k++) { const cx = x + -ny * k * s, cy = y + nx * k * s; tex += `<path d="M${P(cx - nx * R, cy - ny * R)}L${P(cx + nx * R, cy + ny * R)}"/>`; }
      tex = `<g stroke="${col}" stroke-width="${f1(s * 0.48)}" stroke-linecap="round">${tex}</g>`;
    } else if (paint === "dots") {
      for (let i = -Math.ceil(R / s); i <= Math.ceil(R / s); i++) for (let j = -Math.ceil(R / s); j <= Math.ceil(R / s); j++) tex += `<circle cx="${f1(x + i * s)}" cy="${f1(y + j * s + (i % 2 ? s / 2 : 0))}" r="${f1(s * 0.32)}"/>`;
      tex = `<g fill="${col}">${tex}</g>`;
    } else {
      // Topo: contour rings drawn by the Studio's engine, peaked at the shape's middle.
      const gr = T.mulberry32(g.seed * 31 + 7);
      tex = (T.buildSVG({ ...BASE, pattern: "rings", seed: 1 + Math.floor(gr() * 9999), warp: 0.06 + gr() * 0.1, gap: lerp(9, 3.6, g.detail) * clamp(r / 30, 0.6, 1.2), weight: Math.max(1.2, +sw * 0.75), smooth: 0.7, points: [{ x: clamp(x / 100 + (gr() - 0.5) * 0.06, 0, 1), y: clamp(1 - y / 100 + (gr() - 0.5) * 0.06, 0, 1), r: 1, s: 1 }], minLen: 6, w: 100, h: 100 }, { closedOnly: true }).svg.match(/<path[^>]*\/>/g) || []).join("").replace(/#1c1c1e/g, col);
    }
    return out + `<defs>${clip}</defs><g clip-path="url(#${id})">${tex}</g>`;
  }

  // ---------- putting a mark together ----------
  const swOf = (m) => 1.6 + m.weight * 6.4;
  function build(m, f) {
    const g = T.mulberry32(m.seed * 7919 + 11), c = m.c, a = m.a, w = m.w;
    const sw = swOf(m), hw = m.gap * 4.5;
    const wrapOn = w.shape !== "none", badge = wrapOn && w.mode === "badge", frame = wrapOn && w.mode === "frame";
    const base = badge ? "BGC" : "INK", wrapCol = m.accent === "wrap" ? "ACC" : "INK", halo = badge ? wrapCol : "BGC";
    const cenCol = m.accent === "center" ? "ACC" : base, aroCol = m.accent === "around" ? "ACC" : base, oneCol = m.accent === "one" ? "ACC" : aroCol;
    const letter = { ch: applyCase(initial(L.name), f.case === "lower" ? "lower" : "upper"), font: f.font, weight: f.weight };
    const opt = (s) => ({ sides: s.sides ?? 0.4, depth: s.depth ?? 0.5, round: s.round ?? 0.35, seed: m.seed });
    const style = (color, haloOn) => ({ sw, detail: c.detail, color, halo: haloOn ? halo : "", hw, seed: m.seed, letter });
    let rc = lerp(14, 40, c.size), cx = 50, cy = 50, back = "", front = "", ext = rc;
    const pr = (s) => lerp(4, 20, s);
    // What goes around (or beside) the center.
    if (a.kind === "ring") {
      const R = rc + hw + 3 + a.dist * 16, thick = a.paint === "solid" ? sw * 1.8 : sw;
      front += `<circle cx="50" cy="50" r="${f1(R)}" fill="none" stroke="${oneCol}" stroke-width="${f1(thick)}"/>`;
      ext = R + thick / 2;
    } else if (a.kind === "echo") {
      const n = 1 + Math.round(a.count * 4), step = 4 + a.dist * 9 + sw * 0.5;
      for (let k = n; k >= 1; k--) {
        const s = (rc + k * step) / rc;
        back += `<path d="${shapeD(c.shape === "letter" ? "circle" : c.shape, rc, opt(c))}" transform="translate(50 50) rotate(${c.turn + k * a.spin * 0.25}) scale(${f1(s * 100) / 100})" fill="none" stroke="${k === n ? oneCol : aroCol}" stroke-width="${f1(sw / s)}" stroke-linejoin="round"/>`;
      }
      ext = rc + n * step + sw;
    } else if (a.kind === "orbit") {
      const rx = rc * lerp(1.3, 2, a.dist), ry = rx * lerp(0.16, 0.5, a.size), tilt = a.spin - 25, ow = f1(sw * 0.85);
      const arc = (sweep) => `M${P(50 - rx, 50)}A${f1(rx)} ${f1(ry)} 0 0 ${sweep} ${P(50 + rx, 50)}`;
      back += `<path d="${arc(1)}" transform="rotate(${tilt} 50 50)" fill="none" stroke="${aroCol}" stroke-width="${ow}" stroke-linecap="round"/>`;
      front += `<g transform="rotate(${tilt} 50 50)"><path d="${arc(0)}" fill="none" stroke="${halo}" stroke-width="${f1(+ow + hw * 2)}" stroke-linecap="round"/><path d="${arc(0)}" fill="none" stroke="${aroCol}" stroke-width="${ow}" stroke-linecap="round"/>`;
      if (a.count > 0.35) { const t = rad(lerp(20, 160, g())); front += paintShape(a.piece, 50 + rx * Math.cos(t), 50 + ry * Math.sin(t), lerp(4, 10, a.count), 0, a.paint === "outline" ? "outline" : "solid", opt(a), style(oneCol, true)); }
      front += "</g>";
      ext = rx + sw;
    } else if (a.kind === "repeat") {
      const n = 3 + Math.round(a.count * 13), s = pr(a.size) * clamp(8 / n, 0.45, 1.1), R = rc + hw + 2 + a.dist * 16 + s;
      for (let i = 0; i < n; i++) { const t = a.spin - 90 + (360 / n) * i; front += paintShape(a.piece, 50 + R * Math.cos(rad(t)), 50 + R * Math.sin(rad(t)), s, t + 90, a.paint, opt(a), style(i === 0 ? oneCol : aroCol, true)); }
      ext = R + s;
    } else if (a.kind === "satellite") {
      const s = pr(a.size) * 0.8, R = rc + a.dist * 14 + s * 0.4, t = rad(a.spin - 45);
      front += paintShape(a.piece, 50 + R * Math.cos(t), 50 + R * Math.sin(t), s, a.spin, a.paint, opt(a), style(oneCol, true));
      ext = R + s;
    } else if (a.kind === "offset") {
      const d = rc * lerp(0.25, 1, a.dist), t = rad(a.spin - 30), dx = d * Math.cos(t), dy = d * Math.sin(t);
      cx = 50 - dx / 2; cy = 50 - dy / 2;
      back += paintShape(c.shape, 50 + dx / 2, 50 + dy / 2, rc, c.turn, a.paint, opt(c), style(oneCol, false));
      ext = rc + d / 2;
    } else if (a.kind === "pair") {
      const s = rc * lerp(0.45, 1, a.size), gap = lerp(2, 14, a.dist) + hw;
      const span = rc + gap + s * 2 + rc;
      cx = 50 - span / 2 + rc;
      front += paintShape(a.piece, cx + rc + gap + s, 50, s, a.spin, a.paint, opt(a), style(oneCol, true));
      ext = span / 2 + 2;
    }
    const center = paintShape(c.shape, cx, cy, rc, c.turn, c.paint, opt(c), style(cenCol, a.kind === "offset"));
    // Everything is scaled to fit the board, then stepped in to sit inside a frame or badge.
    const fit = Math.min(1, 46 / Math.max(ext, 1)) * (frame || badge ? 0.78 : 1);
    let body = `<g transform="translate(50 50) scale(${f1(fit * 1000) / 1000}) translate(-50 -50)">${back}${center}${front}</g>`;
    let out = "";
    if (wrapOn) {
      const wd = WRAP_D[w.shape];
      if (badge) out = `<path d="${wd}" transform="translate(50 50)" fill="${wrapCol}"/>` + body;
      else if (frame) out = body + `<path d="${wd}" transform="translate(50 50) scale(.96)" fill="none" stroke="${wrapCol}" stroke-width="${f1(Math.max(2.4, sw * 0.8))}" stroke-linejoin="round"/>`;
      else { const id = uid(); out = `<defs><clipPath id="${id}"><path d="${wd}" transform="translate(50 50)"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`; }
    } else out = body;
    return finish(out, m);
  }
  // The finish cuts into the whole mark (with a mask, so it stays a real gap on any background) or
  // adds an accent copy.
  function finish(art, m) {
    const k = m.f.kind, amt = m.f.amount, ang = m.f.angle * 180;
    if (k === "none") return art;
    if (k === "shadow") { const d = lerp(2.5, 8, amt), t = rad(ang + 45); return `<g transform="translate(${f1(d * Math.cos(t))} ${f1(d * Math.sin(t))})">${art.replace(/INK/g, "ACC").replace(/id="(lg\w+)"/g, 'id="$1s"').replace(/url\(#(lg\w+)\)/g, "url(#$1s)")}</g>${art}`; }
    if (k === "split") {
      const id = uid(), half = `<path d="M-100 0H100V100H-100Z" transform="translate(50 50) rotate(${f1(ang)})"/>`;
      return art + `<defs><clipPath id="${id}">${half}</clipPath></defs><g clip-path="url(#${id})">${art.replace(/INK/g, "ACC").replace(/id="(lg\w+)"/g, 'id="$1h"').replace(/url\(#(lg\w+)\)/g, "url(#$1h)")}</g>`;
    }
    let cut = "";
    if (k === "slice") { const wdt = lerp(2, 9, amt); cut = `<path d="M-80 0H80" transform="translate(50 50) rotate(${f1(ang - 30)})" stroke="#000" stroke-width="${f1(wdt)}"/>`; }
    else if (k === "stripes") { const n = 2 + Math.round(amt * 4), gp = 34 / n; for (let i = 0; i < n; i++) cut += `<path d="M-80 ${f1(8 + i * gp + gp / 2)}H80" stroke="#000" stroke-width="${f1(gp * 0.42)}"/>`; cut = `<g transform="translate(50 50) rotate(${f1(ang)})">${cut}</g>`; }
    else if (k === "notch") { const half = lerp(14, 50, amt), a0 = ang - 90; cut = `<path d="M50 50L${P(50 + 80 * Math.cos(rad(a0 - half)), 50 + 80 * Math.sin(rad(a0 - half)))}L${P(50 + 80 * Math.cos(rad(a0 + half)), 50 + 80 * Math.sin(rad(a0 + half)))}Z" fill="#000"/>`; }
    const id = uid();
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${cut}</mask></defs><g mask="url(#${id})">${art}</g>`;
  }
  // Marks are kept by everything that shapes them, so repaints are free.
  const markCache = new Map();
  function markSVG(m, f) {
    const k = JSON.stringify(m) + (m.c.shape === "letter" ? `|${initial(L.name)}|${f.font}|${f.weight}|${f.case}` : "");
    if (!markCache.has(k)) { if (markCache.size > 600) markCache.clear(); markCache.set(k, build(m, f)); }
    return markCache.get(k);
  }
  // Each copy placed on the page gets its own clip and mask ids: a cached mark is shown in many places,
  // and an id that resolves to a copy on a hidden page draws nothing.
  let paintN = 0;
  const paint = (body, c) => { const k = (++paintN).toString(36); return body.replace(/INK/g, c.ink).replace(/ACC/g, c.acc).replace(/BGC/g, c.bg).replace(/(id="|url\(#)(lg\w+)/g, `$1$2_${k}`); };

  // ---------- rolling ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pickW = (w) => { const e = Object.entries(w), t = e.reduce((s, [, v]) => s + v, 0); let x = Math.random() * t; for (const [k, v] of e) if ((x -= v) < 0) return k; return e[0][0]; };
  const rnd = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);
  // A new take on one step (or all of them), keeping the rest, in ranges that read well when small.
  function rollPart(m, part) {
    const o = JSON.parse(JSON.stringify(m));
    if (!part || part === "c") o.c = { shape: pickW({ circle: 3, poly: 3, star: 2, petal: 1.5, blob: 1.5, half: 1, drop: 1, cross: 1, leaf: 1, arch: 1, letter: 2 }), paint: pickW({ solid: 4, outline: 2, lines: 1.5, dots: 1, rings: 1.5, topo: 1.5 }), size: rnd(0.3, 0.75), sides: rnd(0, 1), depth: rnd(0.15, 0.85), round: rnd(0.1, 0.7), turn: Math.random() < 0.5 ? 0 : Math.round(Math.random() * 24) * 15, detail: rnd(0.3, 0.8) };
    if (!part || part === "a") o.a = { kind: pickW({ none: 2, ring: 1.5, echo: 1.5, orbit: 1.5, repeat: 2, satellite: 1.5, offset: 1, pair: 1 }), piece: pick(PIECES)[0], paint: pickW({ solid: 3, outline: 2, lines: 0.5, rings: 0.5 }), count: rnd(0.1, 0.9), dist: rnd(0.1, 0.8), size: rnd(0.2, 0.8), spin: Math.round(Math.random() * 24) * 15 };
    if (!part || part === "w") o.w = { shape: pickW({ none: 4, circle: 2, rounded: 1.5, squircle: 1, hex: 1, diamond: 0.6, shield: 0.6, arch: 0.6, pill: 0.6 }), mode: pickW({ cut: 1.5, frame: 2, badge: 2 }) };
    if (!part || part === "f") o.f = { kind: pickW({ none: 5, slice: 1, stripes: 1, notch: 1, split: 1, shadow: 0.8 }), amount: rnd(0.2, 0.8), angle: rnd(0, 1) };
    if (!part || part === "x") { const wrapAcc = o.w.shape !== "none" && o.w.mode !== "cut"; o.accent = pickW({ none: 1, center: 2.5, around: o.a.kind === "none" ? 0 : 2.5, one: o.a.kind === "none" ? 0 : 2.5, wrap: wrapAcc ? 1.5 : 0 }); o.weight = rnd(0.25, 0.65); o.gap = rnd(0.2, 0.7); }
    if (!part || part === "seed") o.seed = newSeed();
    return norm(o);
  }

  // ---------- type and color ----------
  const applyCase = (t, cs) => (cs === "lower" ? t.toLowerCase() : cs === "upper" ? t.toUpperCase() : t);
  const FONTS = ["Instrument Sans", "Inter Tight", "Geist", "Space Grotesk", "Sora", "Syne", "Bricolage Grotesque", "Unbounded", "Archivo", "Rubik", "Nunito", "Fraunces", "Playfair Display", "DM Serif Display", "Cormorant Garamond", "JetBrains Mono"];
  const kitTokens = () => { try { return root.Components?.tokens?.(); } catch (e) { return null; } };
  function face() {
    const t = kitTokens();
    const font = L.font === "kit" ? t?.font.heading || "Instrument Sans" : L.font;
    return { font, weight: L.weight, case: L.case, track: L.track };
  }
  const loadedFonts = new Set(["Instrument Sans"]);
  function loadFont(f) {
    if (!f || loadedFonts.has(f)) return;
    loadedFonts.add(f);
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(l);
  }
  const lumOf = (h) => C.toOklch(h)[0], chromaOf = (h) => C.toOklch(h)[1];
  // The colors on the logo's home surface: the kit's text, accent and surface, or picked from the
  // palette (darkest as ink, the most colorful as accent, the lightest as surface), or ink alone.
  function colors() {
    if (L.color === "palette") {
      const p = root.Palettes?.colors?.() || [];
      if (p.length) {
        const byL = p.slice().sort((a, b) => lumOf(a) - lumOf(b)), bg = byL[byL.length - 1], ink = byL[0];
        let acc = p.filter((h) => h !== ink && h !== bg).sort((a, b) => chromaOf(b) * (1 - Math.abs(lumOf(b) - 0.6)) - chromaOf(a) * (1 - Math.abs(lumOf(a) - 0.6)))[0] || ink;
        if (C.contrast(acc, bg) < 2) acc = ink;
        return { ink, acc, bg: C.contrast(ink, bg) < 4 ? "#ffffff" : bg };
      }
    }
    const t = kitTokens();
    const ink = t?.color.text || "#1c1c1e", bg = t?.color.surface || "#fbfbf9";
    return { ink, acc: L.color === "mono" ? ink : t?.color.accent || "#e8572a", bg };
  }
  // The same logo on a dark surface, and knocked out of the accent.
  function onDark(c) {
    const bg = C.mixOklab ? C.mixOklab(c.ink, "#000000", 0.55) : "#161616";
    const ink = "#f4f3ef";
    let acc = c.acc;
    for (let i = 0; i < 10 && C.contrast(acc, bg) < 3; i++) acc = C.mixOklab(acc, "#ffffff", 0.15);
    return { ink, acc: L.color === "mono" ? ink : acc, bg: C.contrast(ink, bg) < 7 ? "#141414" : bg };
  }
  function onAccent(c) {
    const on = C.contrast(c.acc, "#ffffff") >= C.contrast(c.acc, "#111111") ? "#ffffff" : "#111111";
    return { ink: on, acc: on, bg: c.acc };
  }
  const word = () => applyCase(String(L.name || "").trim() || "Untitled", L.case);

  // ---------- rendering ----------
  // A logo as HTML for the page: the mark as inline SVG beside (or above) the name set in its face.
  function logoHTML(c, opts = {}) {
    const f = face(), m = opts.mark || L.mark, layout = opts.layout || L.layout;
    loadFont(f.font);
    const mark = layout === "name" ? "" : `<svg class="lg-m" viewBox="0 0 100 100" aria-hidden="true">${paint(markSVG(m, f), c)}</svg>`;
    const name = layout === "mark" ? "" : `<span class="lg-w" style="font-family:'${esc(f.font)}',system-ui,sans-serif;font-weight:${f.weight};letter-spacing:${f.track}em;color:${c.ink}">${esc(word())}</span>`;
    return `<span class="lg lg-${layout}" role="img" aria-label="${esc(word())} logo">${mark}${name}</span>`;
  }
  const markOnly = (m, c, f = face()) => `<svg viewBox="0 0 100 100" aria-hidden="true">${paint(markSVG(m, f), c)}</svg>`;
  // The finished logo as one standalone SVG, with the font embedded where it can be fetched, so it
  // renders the same anywhere (an SVG drawn as a picture can't reach the page's fonts).
  const fontCSS = new Map();
  async function embedFont(font, weight) {
    const k = font + weight;
    if (!fontCSS.has(k)) fontCSS.set(k, (async () => {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@${weight}&display=swap`)).text();
        // The Latin blocks come last; they cover names typed in Latin letters.
        const faces = [...css.matchAll(/@font-face\s*{[^}]*}/g)].map((m) => m[0]);
        const out = [];
        for (const fc of faces.slice(-2)) {
          const url = fc.match(/url\((https:[^)]+)\)/)?.[1]; if (!url) continue;
          const buf = await (await fetch(url)).arrayBuffer();
          let bin = ""; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          out.push(fc.replace(url, "data:font/woff2;base64," + btoa(bin)));
        }
        return out.join("");
      } catch (e) { return ""; }
    })());
    return fontCSS.get(k);
  }
  async function exportSVG(c = colors(), withBg = false) {
    const f = face(), text = word(), layout = L.layout;
    loadFont(f.font);
    try { await document.fonts.load(`${f.weight} 64px "${f.font}"`); } catch (e) {}
    const H = 100, pad = 14, fs = layout === "stack" ? 34 : 60;
    const cx = document.createElement("canvas").getContext("2d");
    cx.font = `${f.weight} ${fs}px "${f.font}", system-ui, sans-serif`;
    const chars = [...text].length, tw = layout === "mark" ? 0 : cx.measureText(text).width + f.track * fs * Math.max(0, chars - 1);
    const mark = layout === "name" ? "" : paint(markSVG(L.mark, f), c);
    let w, h, body = "";
    const txt = (x, y, anchor) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="central" font-family="'${esc(f.font)}', system-ui, sans-serif" font-weight="${f.weight}" font-size="${fs}" letter-spacing="${(f.track * fs).toFixed(2)}" fill="${c.ink}">${esc(text)}</text>`;
    if (layout === "side") { w = H + H * 0.26 + tw; h = H; body = `<g>${mark}</g>` + txt(H * 1.26, H / 2 + 2, "start"); }
    else if (layout === "stack") { w = Math.max(H, tw); h = H + 18 + fs * 1.1; body = `<g transform="translate(${((w - H) / 2).toFixed(1)} 0)">${mark}</g>` + txt(w / 2, H + 18 + fs * 0.55, "middle"); }
    else if (layout === "mark") { w = H; h = H; body = mark; }
    else { w = tw; h = fs * 1.3; body = txt(0, h / 2, "start"); }
    const W = Math.ceil(w + pad * 2), Hh = Math.ceil(h + pad * 2);
    const css = layout === "mark" && L.mark.c.shape !== "letter" ? "" : await embedFont(f.font, f.weight);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${css ? `<style>${css}</style>` : ""}${withBg ? `<rect width="100%" height="100%" fill="${c.bg}"/>` : ""}<g transform="translate(${pad} ${pad})">${body}</g></svg>`;
  }
  async function exportPNG(scale = 4) {
    const svg = await exportSVG(colors(), false);
    const W = +svg.match(/width="(\d+)"/)[1], H = +svg.match(/height="(\d+)"/)[1];
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement("canvas"); c.width = W * scale; c.height = H * scale;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, "image/png"));
  }
  const fileBase = () => (String(L.name || "logo").trim().replace(/[^\w-]+/g, "-").toLowerCase() || "logo") + "-logo";

  // ---------- the kit's logo ----------
  // With "Use in Components" on, the kit's brand (its nav, sidebar and footer) wears this logo in the
  // kit's own colors and font instead of Margin's.
  const kitKey = () => (L.kit ? JSON.stringify([L.mark, L.layout, L.name, L.case, L.weight]) : "");
  function kitBrand() {
    if (!L.kit) return "";
    const f = face(), c = { ink: "var(--k-text)", acc: "var(--k-accent)", bg: "var(--k-surface)" };
    const mark = L.layout === "name" ? "" : `<svg class="k-mark-x" viewBox="0 0 100 100" aria-hidden="true">${paint(markSVG(L.mark, f), c)}</svg>`;
    return `<span class="k-brand">${mark}${L.layout === "mark" ? "" : `<span class="k-word">${esc(word())}</span>`}</span>`;
  }
  const syncKit = () => root.Components?.brand?.();

  // ---------- the page ----------
  let built = false, artURL = "", artKey = "", vars = [];
  const changed = (opts = {}) => { save(); render(); if (opts.kit !== false) syncKit(); if (opts.home !== false) homePreview(); };
  // A light change while dragging: the previews follow, and the kit and home card catch up on release.
  const live = () => { save(); render(); };
  const getK = (path) => path.split(".").reduce((o, k) => o[k], L.mark);
  function setK(path, v) { const m = JSON.parse(JSON.stringify(L.mark)), ks = path.split("."); let o = m; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v; L.mark = norm(m); }
  const syncers = [];
  const syncAll = () => { for (const s of syncers) s(); };
  function seg(host, opts, get, set, cls = "") {
    const el = document.createElement("div"); el.className = "seg sm " + cls;
    el.innerHTML = opts.map(([v, l, t]) => `<button data-v="${v}"${t ? ` data-tip="${esc(t)}"` : ""}>${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v); syncAll(); changed(); };
    const sync = () => { for (const x of el.querySelectorAll("button")) x.classList.toggle("on", String(get()) === x.dataset.v); };
    sync(); syncers.push(sync);
    host.appendChild(el); return el;
  }
  // A slider on one of the mark's settings (0 to 1, or degrees).
  function slider(host, label, path, tip, deg = false) {
    const max = deg ? 360 : 1, step = deg ? 5 : 0.01;
    host.insertAdjacentHTML("beforeend", `<div class="ctrl" data-k="${path}"><div class="label-row"><span class="label"${tip ? ` data-tip="${esc(tip)}"` : ""}>${label}</span><span class="val-static mono"></span></div><input type="range" min="0" max="${max}" step="${step}" aria-label="${label}"></div>`);
    const row = host.lastElementChild, r = row.querySelector("input"), out = row.querySelector(".val-static");
    const sync = () => { const v = getK(path); r.value = v; r.style.setProperty("--p", (v / max) * 100 + "%"); out.textContent = deg ? Math.round(v) + "°" : Math.round(v * 100) + "%"; };
    r.oninput = () => { setK(path, +r.value); sync(); live(); };
    r.onchange = () => changed();
    sync(); syncers.push(sync);
    return row;
  }
  // A step: its heading with a die that rolls just that step, then its controls.
  function step(host, n, title, part, tip) {
    host.insertAdjacentHTML("beforeend", `<section class="as-step" data-step="${part}"><div class="sub-head as-head"><h3 class="sub"><span class="as-n">${n}</span>${title}</h3><button class="ib xs" data-roll="${part}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><svg class="ic"><use href="#i-dice"/></svg></button></div></section>`);
    return host.lastElementChild;
  }
  // Option cards: each shows the mark as it would be with that option.
  const chipSets = [];
  function chips(host, path, list, label, cols = 4) {
    if (label) host.insertAdjacentHTML("beforeend", `<div class="as-lbl">${label}</div>`);
    const g = document.createElement("div"); g.className = "as-chips"; g.style.setProperty("--cols", cols); host.appendChild(g);
    g.onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; setK(path, b.dataset.v); syncAll(); changed(); };
    chipSets.push({ g, path, list });
    return g;
  }
  function buildPage() {
    built = true;
    const page = $("assetsPage");
    page.innerHTML = `<aside class="options as-panel" aria-label="Logo settings"><h2 class="col-title">Logo</h2><p class="lede">Build a mark step by step, then set your project's name beside it.</p><div id="asOpts"></div></aside>
      <section class="as-stage" aria-label="Logo preview"><div class="as-scroll" id="asStage"></div>
        <div class="as-bar glass" role="toolbar" aria-label="Logo"><button class="bar-btn surprise" id="asShuffle" title="A new mark, every step rolled">Shuffle<kbd>R</kbd></button><button class="bar-btn" id="asVary" title="The same steps, drawn again">Variation<kbd><svg class="ic kbd-ic"><use href="#i-shift"/></svg>R</kbd></button><span class="bar-sep"></span><button class="bar-btn" id="asSvg">SVG</button><button class="bar-btn" id="asPng">PNG</button><button class="bar-btn" id="asCopy">Copy SVG</button></div></section>`;
    const o = $("asOpts");
    o.insertAdjacentHTML("beforeend", `<h3 class="sub first">Name</h3><input class="field as-name" id="asName" maxlength="40" spellcheck="false" autocomplete="off" aria-label="Name">`);
    const nm = $("asName"); nm.value = L.name;
    nm.oninput = () => { L.name = nm.value; save(); render(); clearTimeout(nm._t); nm._t = setTimeout(() => { syncKit(); homePreview(); }, 250); };

    let s = step(o, 1, "Center", "c", "A new center");
    chips(s, "c.shape", SHAPES);
    chips(s, "c.paint", PAINTS, "Paint", 3).classList.add("sm");
    slider(s, "Size", "c.size", "How large the center is");
    slider(s, "Corners", "c.sides", "Sides of a polygon, points of a star");
    slider(s, "Form", "c.depth", "How deep a star's points, how wide a petal, how uneven a blob");
    slider(s, "Round", "c.round", "Rounds the corners");
    slider(s, "Turn", "c.turn", "Turns the center", true);
    slider(s, "Detail", "c.detail", "How fine the lines, dots and rings inside it are");

    s = step(o, 2, "Around", "a", "Something new around the center");
    chips(s, "a.kind", AROUND);
    chips(s, "a.piece", PIECES, "Piece").classList.add("as-piece");
    chips(s, "a.paint", PAINTS, "Paint", 3).classList.add("sm");
    slider(s, "Count", "a.count", "How many pieces or echoes");
    slider(s, "Distance", "a.dist", "How far from the center");
    slider(s, "Size", "a.size", "How large each piece is (for an orbit, how open the ring is)");
    slider(s, "Spin", "a.spin", "Turns everything around the center", true);

    s = step(o, 3, "Wrap", "w", "A new wrap");
    chips(s, "w.shape", WRAPS);
    seg(s, WRAP_MODES, () => L.mark.w.mode, (v) => setK("w.mode", v), "as-mode");

    s = step(o, 4, "Finish", "f", "A new finish");
    chips(s, "f.kind", FINISHES, "", 3);
    slider(s, "Amount", "f.amount", "How wide the cut, how many stripes, how deep the notch");
    slider(s, "Angle", "f.angle", "Which way the finish runs");

    s = step(o, 5, "Accent and lines", "x", "A new accent and line weight");
    seg(s, ACCENTS.slice(0, 3), () => L.mark.accent, (v) => setK("accent", v));
    seg(s, ACCENTS.slice(3), () => L.mark.accent, (v) => setK("accent", v), "as-acc2");
    slider(s, "Weight", "weight", "Line thickness everywhere");
    slider(s, "Gap", "gap", "The space kept between parts that overlap");

    o.insertAdjacentHTML("beforeend", `<h3 class="sub">Layout</h3>`);
    seg(o, [["side", "Side"], ["stack", "Stacked"], ["mark", "Mark", "The mark alone, as for an app icon"], ["name", "Name", "The name alone, as a wordmark"]], () => L.layout, (v) => (L.layout = v));
    o.insertAdjacentHTML("beforeend", `<h3 class="sub">Type</h3>`);
    const sel = document.createElement("select"); sel.className = "field as-font"; sel.id = "asFont"; sel.setAttribute("aria-label", "Font");
    o.appendChild(sel);
    sel.onchange = () => { L.font = sel.value; changed(); };
    seg(o, [[400, "Regular"], [500, "Medium"], [600, "Semibold"], [700, "Bold"]], () => L.weight, (v) => (L.weight = v), "as-row2");
    seg(o, [["as", "As typed"], ["lower", "lowercase"], ["upper", "UPPER"]], () => L.case, (v) => (L.case = v), "as-case");
    o.insertAdjacentHTML("beforeend", `<div class="ctrl"><div class="label-row"><span class="label">Letter spacing</span><span class="val-static mono" id="asTrackV"></span></div><input type="range" id="asTrack" min="-0.08" max="0.2" step="0.005" aria-label="Letter spacing"></div>`);
    const tr = $("asTrack");
    const paintTrack = () => { tr.value = L.track; tr.style.setProperty("--p", ((L.track + 0.08) / 0.28) * 100 + "%"); $("asTrackV").textContent = (L.track >= 0 ? "+" : "") + Math.round(L.track * 1000) / 10 + "%"; };
    tr.oninput = () => { L.track = +tr.value; paintTrack(); live(); };
    tr.onchange = () => changed();
    paintTrack();
    o.insertAdjacentHTML("beforeend", `<h3 class="sub">Color</h3>`);
    seg(o, [["kit", "Kit", "The kit's text and accent colors"], ["palette", "Palette", "Picked from the palette tool's colors"], ["mono", "One color", "Ink alone, no accent"]], () => L.color, (v) => (L.color = v));
    o.insertAdjacentHTML("beforeend", `<label class="set-row as-kit"><span><b>Use in Components</b><small>The kit's preview wears this logo instead of Margin's</small></span><span class="switch"><input type="checkbox" id="asKit"${L.kit ? " checked" : ""}><span></span></span></label>`);
    $("asKit").onchange = (e) => { L.kit = e.target.checked; changed(); };
    o.addEventListener("click", (e) => { const b = e.target.closest("[data-roll]"); if (!b) return; L.mark = rollPart(L.mark, b.dataset.roll); rollVars(); syncAll(); changed(); });
    $("asShuffle").onclick = () => shuffle();
    $("asVary").onclick = () => vary();
    $("asSvg").onclick = async () => root.downloadBlob?.(new Blob([await exportSVG()], { type: "image/svg+xml" }), fileBase() + ".svg", "Logo saved");
    $("asPng").onclick = async () => { const b = await exportPNG(); if (b) root.downloadBlob?.(b, fileBase() + ".png", "Logo saved"); };
    $("asCopy").onclick = async () => { try { await navigator.clipboard.writeText(await exportSVG()); root.toastMsg?.("Logo SVG copied"); } catch (e) { root.toastMsg?.("Couldn't copy"); } };
    $("asStage").onclick = (e) => { const v = e.target.closest("[data-var]"); if (!v) return; L.mark = norm(vars[+v.dataset.var]); rollVars(); syncAll(); changed(); };
  }
  // Settings a choice doesn't use fade back, so it's clear what moves what.
  const USED = {
    "c.sides": (m) => m.c.shape === "poly" || m.c.shape === "star", "c.depth": (m) => ["star", "petal", "blob", "cross", "leaf"].includes(m.c.shape),
    "c.round": (m) => ["poly", "star", "cross"].includes(m.c.shape), "c.detail": (m) => ["lines", "dots", "rings", "topo"].includes(m.c.paint),
    "a.count": (m) => ["echo", "orbit", "repeat"].includes(m.a.kind), "a.dist": (m) => m.a.kind !== "none", "a.size": (m) => ["orbit", "repeat", "satellite", "pair"].includes(m.a.kind), "a.spin": (m) => m.a.kind !== "none" && m.a.kind !== "ring",
    "f.amount": (m) => !["none", "split"].includes(m.f.kind), "f.angle": (m) => m.f.kind !== "none",
  };
  function renderChips() {
    const f = face(), c = colors(), m = L.mark;
    for (const { g, path, list } of chipSets) {
      const cur = path.split(".").reduce((o, k) => o[k], m);
      g.innerHTML = list.map(([v, name, tip]) => {
        const t = JSON.parse(JSON.stringify(m)), ks = path.split(".");
        let o = t; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v;
        // A piece or its paint shows even while the arrangement doesn't use one.
        if (path.startsWith("a.") && path !== "a.kind" && t.a.kind === "none") t.a.kind = "satellite";
        if (path === "a.piece" && !USES_PIECE.has(t.a.kind)) t.a.kind = "satellite";
        return `<button class="as-chip${cur === v ? " on" : ""}" data-v="${v}" data-tip="${esc(tip)}">${markOnly(norm(t), c, f)}<span>${name}</span></button>`;
      }).join("");
    }
    for (const row of $("asOpts").querySelectorAll(".ctrl[data-k]")) row.classList.toggle("off", USED[row.dataset.k] ? !USED[row.dataset.k](m) : false);
    $("asOpts").querySelector(".as-piece").classList.toggle("off", !USES_PIECE.has(m.a.kind));
    $("asOpts").querySelector(".as-mode").classList.toggle("off", m.w.shape === "none");
  }
  function renderFonts() {
    const sel = $("asFont"), t = kitTokens(), kitF = t?.font.heading || "Instrument Sans";
    sel.innerHTML = `<option value="kit">Kit font (${esc(kitF)})</option>` + FONTS.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
    sel.value = L.font === "kit" || FONTS.includes(L.font) ? L.font : "kit";
  }
  // Alternatives under the previews: one step changed in each of the first five, then three rolled whole.
  function rollVars() { vars = [rollPart(L.mark, "c"), rollPart(L.mark, "a"), rollPart(L.mark, "w"), rollPart(L.mark, "f"), rollPart(L.mark, "x"), rollPart(L.mark), rollPart(L.mark), rollPart(L.mark)]; }
  function render() {
    if (!built || root.Shell?.route !== "assets") return;
    const c = colors(), d = onDark(c), a = onAccent(c), f = face();
    renderChips();
    if (!vars.length) rollVars();
    const icon = (n, cc) => `<span class="as-icon" style="--n:${n}px;background:${cc.bg}">${markOnly(L.mark, cc, f)}</span>`;
    const what = ["New center", "New surround", "New wrap", "New finish", "New accent", "All new", "All new", "All new"];
    $("asStage").innerHTML = `
      <div class="as-hero" style="background:${c.bg}">${logoHTML(c)}</div>
      <div class="as-tiles">
        <div class="as-tile" style="background:${d.bg}">${logoHTML(d)}</div>
        <div class="as-tile" style="background:${a.bg}">${logoHTML(a)}</div>
        <div class="as-tile as-art" style="background-color:${d.bg}${artURL ? `;background-image:url('${artURL}')` : ""}">${logoHTML({ ink: "#ffffff", acc: "#ffffff", bg: "rgba(0,0,0,0)" })}</div>
      </div>
      <div class="as-icons">
        <div class="as-icon-row">${icon(112, c)}${icon(72, c)}${icon(44, d)}${icon(28, a)}</div>
        <div class="as-tab"><span class="as-tab-in">${markOnly(L.mark, { ...c, bg: "#ffffff" }, f)}<span>${esc(word())}</span><i></i></span></div>
      </div>
      <div class="sub-head as-head"><h3 class="sub">More like this</h3><button class="ib xs" id="asMore" data-tip="Roll these again" aria-label="Roll these again"><svg class="ic"><use href="#i-dice"/></svg></button></div>
      <div class="as-vars">${vars.map((v, i) => `<button class="as-var" data-var="${i}" style="background:${c.bg}" title="${what[i]}">${logoHTML(c, { mark: v, layout: "mark" })}</button>`).join("")}</div>`;
    $("asMore").onclick = (e) => { e.stopPropagation(); rollVars(); render(); };
    paintArt();
  }
  // The Studio's design as a backdrop, redrawn only when the design changes.
  async function paintArt() {
    const key = JSON.stringify(root.Studio?.state?.() || "");
    if (key === artKey) return;
    artKey = key;
    try {
      const cv = await root.Studio.snapshot(640, 400);
      if (artKey !== key) return;
      artURL = cv.toDataURL("image/jpeg", 0.82);
      const el = document.querySelector(".as-art"); if (el) el.style.backgroundImage = `url('${artURL}')`;
    } catch (e) {}
  }
  function shuffle() { L.mark = rollPart(L.mark); rollVars(); syncAll(); changed(); }
  function vary() { L.mark = rollPart(L.mark, "seed"); syncAll(); changed(); }
  function onShow() {
    if (!built) buildPage();
    renderFonts(); syncAll();
    render();
    const p = document.querySelector(".page.as");
    if (p && !reduce.matches) { p.classList.remove("enter"); void p.offsetWidth; p.classList.add("enter"); clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove("enter"), 900); }
  }
  addEventListener("keydown", (e) => {
    if (root.Shell?.route !== "assets" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if ((e.key || "").toLowerCase() === "r" || e.code === "KeyR") { e.preventDefault(); e.shiftKey ? vary() : shuffle(); }
  });
  // The kit or palette can change elsewhere; the page catches up when it's next shown or repainted.
  addEventListener("palette-change", () => { if (L.color === "palette") { render(); homePreview(); } });
  addEventListener("theme-change", () => { render(); homePreview(); });

  // ---------- home card ----------
  function homePreview(host = $("homeAssets")) {
    if (!host) return;
    const c = colors();
    host.style.background = c.bg;
    host.innerHTML = `<span class="as-home">${logoHTML(c, { layout: L.layout === "name" || L.layout === "mark" ? L.layout : "stack" })}</span>`;
  }

  // ---------- the home page's roll ----------
  const look = () => ({ mark: JSON.parse(JSON.stringify(L.mark)), layout: L.layout });
  function setLook(l) {
    if (!l || typeof l !== "object") return;
    // Looks saved by the earlier prototypes carry a style or a single pattern instead of steps.
    if (isNew(l.mark)) L.mark = norm(l.mark); else if (l.mark || l.style) L.mark = fromOld({ ...(l.mark || {}), style: l.style, seed: l.seed ?? l.mark?.seed });
    if (["side", "stack", "mark", "name"].includes(l.layout)) L.layout = l.layout;
    save(); rollVars(); syncAll(); render(); syncKit(); homePreview();
  }
  function remix() { L.mark = rollPart(L.mark); save(); rollVars(); syncAll(); render(); syncKit(); }

  root.Assets = {
    onShow, preview: homePreview, look, setLook, remix, kitBrand, kitKey,
    // For agents and scripts.
    state: () => JSON.parse(JSON.stringify(L)),
    set: (p) => { const { mark, ...rest } = p || {}; Object.assign(L, rest); if (mark) L.mark = norm({ ...L.mark, ...mark, c: { ...L.mark.c, ...mark.c }, a: { ...L.mark.a, ...mark.a }, w: { ...L.mark.w, ...mark.w }, f: { ...L.mark.f, ...mark.f } }); syncAll(); changed(); return JSON.parse(JSON.stringify(L)); },
    steps: () => ({ center: SHAPES, paints: PAINTS, around: AROUND, pieces: PIECES, wraps: WRAPS, wrapModes: WRAP_MODES, finishes: FINISHES, accents: ACCENTS }),
    roll: (part) => { L.mark = rollPart(L.mark, part); syncAll(); changed(); return JSON.parse(JSON.stringify(L.mark)); },
    svg: () => exportSVG(), png: (scale) => exportPNG(scale),
  };
})(window);
