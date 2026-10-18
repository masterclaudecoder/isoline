// Assets: a logo maker. A mark is put together in steps, the way a Studio design is: a form, the style
// every part shares, a composition around it, a container and a finish. The steps follow what makes
// marks last: plain geometry, one visual language, two or three elements at most, negative space used
// on purpose, and lines and gaps that still read at 16 px. Any step works with any other, Shuffle
// stays within that budget, and a meter says when a mark is getting busy.
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
  const FORMS = [
    ["circle", "Circle", "Complete, calm, the safest form"], ["square", "Square", "Stable and solid, with rounded corners"], ["triangle", "Triangle", "Direction and energy"],
    ["diamond", "Diamond", "A square on its point, sharper"], ["hexagon", "Hexagon", "Structure, like a cell or a nut"], ["star", "Star", "Points around a center"],
    ["lens", "Lens", "Two arcs meeting at both ends"], ["half", "Half", "Half a circle, a sunrise"], ["quarter", "Quarter", "A quarter circle, a corner turned"],
    ["cross", "Cross", "A plus sign"], ["letter", "Letter", "Your name's first letter"],
  ];
  const PIECES = FORMS.filter((s) => s[0] !== "letter" && s[0] !== "cross");
  const STYLES = [["solid", "Solid", "Every part filled in"], ["line", "Line", "Every part drawn as a line of one weight"], ["mixed", "Mixed", "A solid form, with lines around it"]];
  const FILLS = [["plain", "Plain", "No texture"], ["hatch", "Hatch", "Parallel lines"], ["dots", "Dots", "A grid of dots"], ["contour", "Contour", "Contour rings, like a map"], ["rings", "Rings", "Nested copies of the form"]];
  const COMPOSE = [
    ["none", "None", "The form on its own"], ["ring", "Ring", "Enclosed by a ring"], ["echo", "Echo", "The form repeated outward, a rhythm"],
    ["orbit", "Orbit", "A tilted ring passing behind and in front"], ["radial", "Radial", "Pieces spaced evenly around it"], ["overlap", "Overlap", "Two forms overlapping"],
    ["bite", "Bite", "A piece cut out of the form, negative space"], ["satellite", "Satellite", "One small piece beside it"],
  ];
  const USES_PIECE = new Set(["radial", "bite", "satellite", "orbit"]);
  const CONTAINERS = [["none", "None", "Nothing around the mark"], ["circle", "Circle", "A round badge"], ["rounded", "Rounded", "A rounded square"], ["squircle", "Squircle", "A soft square, like an app icon"], ["hexagon", "Hexagon", "Six sides"], ["diamond", "Diamond", "A square on its point"]];
  const HOLDS = [["cut", "Cut", "The mark cut to the container's outline"], ["frame", "Frame", "The container drawn as a line around the mark"], ["badge", "Badge", "A solid container with the mark knocked out of it"]];
  const FINISHES = [["none", "None", "No finish"], ["slice", "Slice", "A clean cut straight through"], ["split", "Split", "One side in the accent"], ["shadow", "Shadow", "An offset copy behind, in the accent"]];
  const ACCENTS = [["none", "None", "One color"], ["form", "Form", "The form in the accent"], ["around", "Around", "The composition in the accent"], ["container", "Container", "The container in the accent (with a frame or badge)"]];

  const MDEF = {
    c: { form: "circle", size: 0.6, turn: 0, points: 0.4, round: 0.4 },
    s: { style: "solid", fill: "contour", detail: 0.45 },
    a: { kind: "none", piece: "circle", count: 0.4, dist: 0.5, size: 0.4, spin: 0 },
    w: { shape: "none", hold: "frame" },
    f: { kind: "none", angle: 0.15 },
    accent: "form", weight: 0.45, gap: 0.45, seed: 7,
  };
  const ENUM = { "c.form": FORMS, "s.style": STYLES, "s.fill": FILLS, "a.kind": COMPOSE, "a.piece": PIECES, "w.shape": CONTAINERS, "w.hold": HOLDS, "f.kind": FINISHES, accent: ACCENTS };
  const DEG = new Set(["c.turn", "a.spin"]);
  // Names from the second prototype, so its marks open close to how they looked.
  const ALIAS = {
    "c.form": { poly: "hexagon", petal: "lens", blob: "circle", drop: "circle", leaf: "lens", arch: "half" },
    "a.piece": { poly: "hexagon", petal: "lens", blob: "circle", drop: "circle", leaf: "lens", arch: "half", cross: "diamond" },
    "a.kind": { repeat: "radial", offset: "overlap", pair: "overlap" },
    "w.shape": { hex: "hexagon", shield: "rounded", arch: "rounded", pill: "rounded" },
    "f.kind": { stripes: "none", notch: "none" }, accent: { center: "form", one: "around", wrap: "container" },
  };
  // A mark from anywhere (storage, a saved look, a script) made safe to draw.
  function norm(m) {
    const o = JSON.parse(JSON.stringify(MDEF));
    if (!m || typeof m !== "object") return o;
    // The second prototype kept form and paint together and called the container a wrap.
    if (m.c && m.c.shape && !m.c.form) {
      m = JSON.parse(JSON.stringify(m));
      m.c.form = m.c.shape;
      const p = m.c.paint;
      m.s = { style: p === "outline" || p === "rings" ? "line" : "solid", fill: ({ lines: "hatch", dots: "dots", rings: "rings", topo: "contour" })[p] || "plain", detail: m.c.detail ?? 0.45 };
      m.c.points = m.c.sides;
      if (m.w) m.w.hold = m.w.mode;
      if (m.f?.amount != null && m.f.kind === "slice") m.f.angle = m.f.angle ?? 0.15;
    }
    for (const sec of ["c", "s", "a", "w", "f"]) {
      const src = m[sec]; if (!src || typeof src !== "object") continue;
      for (const k of Object.keys(o[sec])) {
        const key = sec + "." + k; let v = src[k];
        if (ENUM[key]) { v = ALIAS[key]?.[v] ?? v; if (ENUM[key].some((x) => x[0] === v)) o[sec][k] = v; }
        else if (Number.isFinite(v)) o[sec][k] = DEG.has(key) ? ((Math.round(v) % 360) + 360) % 360 : clamp(v, 0, 1);
      }
    }
    const acc = ALIAS.accent[m.accent] ?? m.accent;
    if (ACCENTS.some((x) => x[0] === acc)) o.accent = acc;
    for (const k of ["weight", "gap"]) if (Number.isFinite(m[k])) o[k] = clamp(m[k], 0, 1);
    if (Number.isFinite(m.seed)) o.seed = Math.round(m.seed);
    return o;
  }
  // Marks from the first prototype (one fixed style) open as the nearest steps.
  function fromOld(m) {
    const b = m.body || ({ contour: "rings", lens: "lens", orbit: "orbit", strata: "waves", bloom: "bloom", monogram: "letter" })[m.style] || "rings";
    const map = {
      rings: { s: { fill: "contour" } }, lens: { s: { fill: "hatch" } }, waves: { c: { form: "half" }, s: { fill: "hatch" } }, dots: { s: { fill: "dots" } },
      bloom: { c: { size: 0.3 }, s: { fill: "plain" }, a: { kind: "radial", piece: "lens", count: 0.3 } }, orbit: { c: { size: 0.45 }, s: { fill: "plain" }, a: { kind: "orbit" } },
      letter: { c: { form: "letter" }, s: { fill: "plain" }, a: { kind: "ring" } },
    }[b] || {};
    return norm({ ...MDEF, c: { ...MDEF.c, ...map.c }, s: { ...MDEF.s, ...map.s }, a: { ...MDEF.a, ...map.a }, seed: m.seed });
  }
  const isStepped = (m) => m && typeof m === "object" && m.c && typeof m.c === "object";

  // ---------- how busy a mark is ----------
  // Lasting marks usually hold one to three elements. Each step adds to a running count, which the
  // meter shows and Shuffle keeps under.
  const COST = { kind: { none: 0, ring: 0.5, echo: 1, orbit: 1, radial: 1, overlap: 0.7, bite: 0.5, satellite: 0.4 }, fill: { plain: 0, hatch: 0.8, dots: 0.8, contour: 1, rings: 0.7 }, hold: { cut: 0.2, frame: 0.5, badge: 0.4 }, finish: { none: 0, slice: 0.4, split: 0.5, shadow: 0.6 } };
  function busy(m) {
    let n = 1 + COST.kind[m.a.kind] + COST.fill[m.s.fill] + (m.w.shape === "none" ? 0 : COST.hold[m.w.hold]) + COST.finish[m.f.kind];
    if (m.a.kind === "radial" && m.a.count > 0.6) n += 0.3;
    if (m.a.kind === "echo" && m.a.count > 0.6) n += 0.3;
    if (m.c.form === "star" && m.c.points > 0.7) n += 0.2;
    return +n.toFixed(1);
  }
  const busyLabel = (n) => (n <= 1.6 ? ["Simple", "One idea, reads at any size"] : n <= 2.6 ? ["Balanced", "A clear form with one supporting idea"] : n <= 3.3 ? ["Detailed", "Several ideas; check it still reads small"] : ["Busy", "Likely too much to read at small sizes. Try removing a step"]);

  // ---------- state ----------
  const KEY = "isoline.logo";
  const DEF = { name: "Margin", layout: "side", font: "kit", weight: 600, case: "as", track: -0.02, color: "kit", kit: false };
  let L = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    const o = { ...DEF, ...s };
    o.mark = isStepped(s.mark) ? norm(s.mark) : s.mark || s.style ? fromOld({ ...(s.mark || {}), style: s.style, seed: s.seed ?? s.mark?.seed }) : norm(MDEF);
    delete o.style; delete o.seed;
    return o;
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const newSeed = () => 1 + Math.floor(Math.random() * 99999);

  // ---------- forms ----------
  // Every form is drawn around the origin and placed with a transform, so the same outline can be
  // filled, stroked, used as a clip or a cut-out, or copied at another size. Marks live on a 100 x 100
  // board. Colors are slots filled in where the mark is shown: INK, ACC (the accent) and BGC (the
  // surface behind, for gaps).
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
  const ring = (n, rf, a0 = -90) => Array.from({ length: n }, (_, i) => { const a = rad(a0 + (360 / n) * i), r = typeof rf === "function" ? rf(i) : rf; return [r * Math.cos(a), r * Math.sin(a)]; });
  const circleD = (r) => `M${f1(-r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`;
  // o: points, round (0 to 1). Each form is sized to look as large as a circle of radius r (optical
  // size), and sits where it looks centered, not where its box is.
  function formD(kind, r, o) {
    switch (kind) {
      case "square": { const s = r * 0.9; return roundPoly([[-s, -s], [s, -s], [s, s], [-s, s]], o.round * 0.8); }
      case "triangle": { const pts = ring(3, r * 1.12).map(([x, y]) => [x, y + r * 0.14]); return roundPoly(pts, o.round * 0.5); }
      case "diamond": return roundPoly(ring(4, r * 1.08), o.round * 0.5);
      case "hexagon": return roundPoly(ring(6, r * 1.03, -90), o.round * 0.4);
      case "star": { const n = 4 + Math.round(o.points * 4), inner = r * 1.08 * lerp(0.62, 0.42, o.points); return roundPoly(ring(n * 2, (i) => (i % 2 ? inner : r * 1.1)), o.round * 0.45); }
      case "lens": { const w = r * 0.62; return `M0 ${f1(-r * 1.05)}Q${f1(w * 2)} 0 0 ${f1(r * 1.05)}Q${f1(-w * 2)} 0 0 ${f1(-r * 1.05)}Z`; }
      case "half": { const k = r * 1.1; return `M${f1(-k)} ${f1(k * 0.32)}A${f1(k)} ${f1(k)} 0 0 1 ${f1(k)} ${f1(k * 0.32)}Z`; }
      case "quarter": { const k = r * 1.45, o0 = -k * 0.42; return `M${f1(o0)} ${f1(o0)}H${f1(o0 + k)}A${f1(k)} ${f1(k)} 0 0 1 ${f1(o0)} ${f1(o0 + k)}Z`; }
      case "cross": { const a = r * 0.34; return roundPoly([[-a, -r], [a, -r], [a, -a], [r, -a], [r, a], [a, a], [a, r], [-a, r], [-a, a], [-r, a], [-r, -a], [-a, -a]], o.round * 0.5); }
      default: return circleD(r);
    }
  }
  const CONT_D = {
    circle: circleD(47), rounded: roundPoly([[-46, -46], [46, -46], [46, 46], [-46, 46]], 0.5), squircle: roundPoly([[-47, -47], [47, -47], [47, 47], [-47, 47]], 0.92),
    hexagon: roundPoly(ring(6, 48.5), 0.18), diamond: roundPoly(ring(4, 49.5), 0.22),
  };

  // ---------- painting ----------
  let uidN = 0;
  const uid = () => "lg" + (++uidN).toString(36);
  const initial = (name) => ([...String(name).trim()][0] || "A");
  const BASE = {
    seed: 7, scale: 100, octaves: 1, warp: 0, angle: 0, features: 0, bump: 0, bumpSize: 50, usePoints: true, falloff: 1,
    levels: 6, gap: 10, bias: 0, weight: 1, swell: 0, swellSize: 100, taper: 0, indexEvery: 0, indexWeight: 1,
    smooth: 0.5, res: 2, minLen: 0, line: "#1c1c1e", line2: "#1c1c1e", gradient: false, bg: "#fff", transparent: true, opacity: 1, mode: "lines",
  };
  // One form, placed (x, y, size r, turn) and painted as a line or solid, with a texture inside if
  // asked. g: { sw, color, halo (gap color or ""), hw (gap width), fill, detail, seed, letter }
  function paintForm(kind, x, y, r, turn, line, o, g) {
    const tf = `translate(${f1(x)} ${f1(y)}) rotate(${f1(turn)})`;
    const node = (attrs, extraTf = "") => kind === "letter"
      ? `<text transform="${tf}${extraTf}" x="0" y="${f1(r * 0.06)}" text-anchor="middle" dominant-baseline="central" font-family="'${esc(g.letter.font)}', system-ui, sans-serif" font-weight="${g.letter.weight}" font-size="${f1(r * 1.6)}" ${attrs}>${esc(g.letter.ch)}</text>`
      : `<path d="${formD(kind, r, o)}" transform="${tf}${extraTf}" ${attrs}/>`;
    // Lines never get thicker than a third of the form, so small pieces keep their shape.
    const sw = f1(Math.min(g.sw, Math.max(1.8, r * 0.34)));
    const fill = g.fill || "plain";
    let out = "";
    // A gap in the surface color under the form, so it reads apart from whatever it overlaps.
    if (g.halo && g.hw > 0.2) out += node(line ? `fill="none" stroke="${g.halo}" stroke-width="${f1(+sw + g.hw * 2)}" stroke-linejoin="round"` : `fill="${g.halo}" stroke="${g.halo}" stroke-width="${f1(g.hw * 2)}" stroke-linejoin="round"`);
    const col = g.color, edge = line ? node(`fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"`) : "";
    if (fill === "plain") return out + (line ? edge : node(`fill="${col}"`));
    if (fill === "rings") {
      // Nested copies, each a constant line width, spaced so they never run together.
      const n = clamp(Math.round(lerp(2, 5, g.detail) * clamp(r / 30, 0.6, 1.2)), 2, 5);
      for (let k = n; k >= 1; k--) { const s = k / n; out += node(`fill="none" stroke="${col}" stroke-width="${f1(sw / s)}" stroke-linejoin="round"`, ` scale(${f1(s * 100) / 100})`); }
      if (!line) out += node(`fill="${col}"`, ` scale(${f1(50 / n) / 100})`);
      return out;
    }
    // Texture inside: never finer than about 5 board units, so it doesn't turn to grey when small.
    const id = uid(), clip = `<clipPath id="${id}">${node("")}</clipPath>`, s = lerp(10, 5.2, g.detail) * clamp(r / 32, 0.75, 1.15), R = r * 1.6;
    let tex = "";
    if (fill === "hatch") {
      const a = rad(45 + (g.seed % 2) * 90), nx = Math.cos(a), ny = Math.sin(a);
      for (let k = -Math.ceil(R / s); k <= Math.ceil(R / s); k++) { const cx = x - ny * k * s, cy = y + nx * k * s; tex += `<path d="M${P(cx - nx * R, cy - ny * R)}L${P(cx + nx * R, cy + ny * R)}"/>`; }
      tex = `<g stroke="${col}" stroke-width="${f1(s * 0.46)}" stroke-linecap="round">${tex}</g>`;
    } else if (fill === "dots") {
      for (let i = -Math.ceil(R / s); i <= Math.ceil(R / s); i++) for (let j = -Math.ceil(R / s); j <= Math.ceil(R / s); j++) tex += `<circle cx="${f1(x + i * s)}" cy="${f1(y + j * s + (i % 2 ? s / 2 : 0))}" r="${f1(s * 0.3)}"/>`;
      tex = `<g fill="${col}">${tex}</g>`;
    } else {
      // Contour rings drawn by the Studio's engine, peaked near the form's middle.
      const gr = T.mulberry32(g.seed * 31 + 7);
      tex = (T.buildSVG({ ...BASE, pattern: "rings", seed: 1 + Math.floor(gr() * 9999), warp: 0.05 + gr() * 0.08, gap: s, weight: Math.max(1.8, s * 0.4), smooth: 0.7, points: [{ x: clamp(x / 100 + (gr() - 0.5) * 0.06, 0, 1), y: clamp(1 - y / 100 + (gr() - 0.5) * 0.06, 0, 1), r: 1, s: 1 }], minLen: 8, w: 100, h: 100 }, { closedOnly: true }).svg.match(/<path[^>]*\/>/g) || []).join("").replace(/#1c1c1e/g, col);
    }
    return out + `<defs>${clip}</defs><g clip-path="url(#${id})">${tex}</g>` + edge;
  }

  // ---------- putting a mark together ----------
  // Lines run from 2.6 to 8 board units: at 32 px the thinnest is still close to a pixel.
  const swOf = (m) => 2.6 + m.weight * 5.4;
  function build(m, f) {
    const g = T.mulberry32(m.seed * 7919 + 11), c = m.c, st = m.s, a = m.a, w = m.w;
    const sw = swOf(m), hw = 1.2 + m.gap * 4;
    const contOn = w.shape !== "none", badge = contOn && w.hold === "badge", frame = contOn && w.hold === "frame";
    const base = badge ? "BGC" : "INK", contCol = m.accent === "container" ? "ACC" : "INK", halo = badge ? contCol : "BGC";
    const formCol = m.accent === "form" ? "ACC" : base, aroCol = m.accent === "around" ? "ACC" : base;
    // One visual language: the form and everything around it share a style.
    const formLine = st.style === "line", aroLine = st.style !== "solid";
    const letter = { ch: applyCase(initial(L.name), f.case === "lower" ? "lower" : "upper"), font: f.font, weight: f.weight };
    const opt = { points: c.points, round: c.round };
    const look = (color, line, haloOn, fill = "plain") => ({ sw, color, halo: haloOn ? halo : "", hw, fill, detail: st.detail, seed: m.seed, letter });
    let rc = lerp(18, 40, c.size), cx = 50, cy = 50, back = "", front = "", ext = rc, cut = "";
    const ps = (s) => lerp(5, 16, s);
    if (a.kind === "ring") {
      const R = rc + hw + sw * 0.5 + 2 + a.dist * 12;
      front += `<circle cx="50" cy="50" r="${f1(R)}" fill="none" stroke="${aroCol}" stroke-width="${f1(sw)}"/>`;
      ext = R + sw / 2;
    } else if (a.kind === "echo") {
      // Repetition reads as rhythm only with clear space between the copies.
      const n = 1 + Math.round(a.count * 3), step = sw + hw + 2 + a.dist * 6;
      const form = c.form === "letter" ? "circle" : c.form;
      for (let k = n; k >= 1; k--) {
        const s = (rc + k * step) / rc;
        back += `<path d="${formD(form, rc, opt)}" transform="translate(50 50) rotate(${c.turn + k * a.spin * 0.2}) scale(${f1(s * 1000) / 1000})" fill="none" stroke="${aroCol}" stroke-width="${f1(sw / s)}" stroke-linejoin="round"/>`;
      }
      ext = rc + n * step + sw;
    } else if (a.kind === "orbit") {
      const rx = rc * lerp(1.35, 1.9, a.dist), ry = rx * lerp(0.2, 0.42, a.size), tilt = a.spin - 25;
      const arc = (sweep) => `M${P(50 - rx, 50)}A${f1(rx)} ${f1(ry)} 0 0 ${sweep} ${P(50 + rx, 50)}`;
      back += `<path d="${arc(1)}" transform="rotate(${tilt} 50 50)" fill="none" stroke="${aroCol}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
      front += `<g transform="rotate(${tilt} 50 50)"><path d="${arc(0)}" fill="none" stroke="${halo}" stroke-width="${f1(sw + hw * 2)}" stroke-linecap="round"/><path d="${arc(0)}" fill="none" stroke="${aroCol}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
      if (a.count > 0.5) { const t = rad(lerp(25, 155, g())); front += paintForm(a.piece, 50 + rx * Math.cos(t), 50 + ry * Math.sin(t), lerp(4.5, 8, a.size), 0, false, opt, look(aroCol, false, true)); }
      front += "</g>";
      ext = rx + sw;
    } else if (a.kind === "radial") {
      // Fewer, larger pieces read better than many small ones; size shrinks only as far as needed.
      const n = 4 + Math.round(a.count * 8), R0 = rc + hw + 2 + a.dist * 12, s = Math.min(ps(a.size), (Math.PI * (R0 + 6)) / n * 0.42), R = R0 + s;
      for (let i = 0; i < n; i++) { const t = a.spin - 90 + (360 / n) * i; front += paintForm(a.piece, 50 + R * Math.cos(rad(t)), 50 + R * Math.sin(rad(t)), s, t + 90, aroLine, opt, look(aroCol, aroLine, true)); }
      ext = R + s;
    } else if (a.kind === "overlap") {
      const d = rc * lerp(0.45, 0.95, a.dist), t = rad(a.spin - 30), dx = d * Math.cos(t), dy = d * Math.sin(t);
      cx = 50 - dx / 2; cy = 50 - dy / 2;
      back += paintForm(c.form, 50 + dx / 2, 50 + dy / 2, rc, c.turn, aroLine, opt, look(aroCol, aroLine, false));
      ext = rc + d / 2;
    } else if (a.kind === "bite") {
      // Negative space: a piece cut out of the form at its edge, with the piece itself set just inside.
      const s = rc * lerp(0.3, 0.55, a.size), R = rc * lerp(0.55, 0.95, a.dist), t = rad(a.spin - 45), px = 50 + R * Math.cos(t), py = 50 + R * Math.sin(t);
      cut = `<path d="${formD(a.piece, s + hw, opt)}" transform="translate(${f1(px)} ${f1(py)}) rotate(${a.spin})" fill="#000"/>`;
      if (a.count > 0.5) front += paintForm(a.piece, px, py, s * 0.55, a.spin, aroLine, opt, look(aroCol, aroLine, false));
    } else if (a.kind === "satellite") {
      // Close enough to belong to the form, large enough to read as a second shape, not a speck.
      const s = Math.max(rc * 0.28, lerp(6.5, 13, a.size)), R = rc + hw + s * 0.9 + a.dist * 6, t = rad(a.spin - 45);
      front += paintForm(a.piece, 50 + R * Math.cos(t), 50 + R * Math.sin(t), s, a.spin, formLine, opt, look(aroCol, formLine, true));
      ext = Math.max(rc, R + s);
    }
    let form = paintForm(c.form, cx, cy, rc, c.turn, formLine, opt, look(formCol, formLine, a.kind === "overlap", st.fill));
    if (cut) { const id = uid(); form = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${cut}</mask></defs><g mask="url(#${id})">${form}</g>`; }
    // Everything is scaled to fit the board, then stepped in to sit inside a frame or badge with room.
    // A cut grows the mark past the container's edge so the container crops it.
    const fit = Math.min(1, 46 / Math.max(ext, 1)) * (frame ? 0.74 : badge ? 0.78 : contOn ? 1.32 : 1);
    const body = `<g transform="translate(50 50) scale(${f1(fit * 1000) / 1000}) translate(-50 -50)">${back}${form}${front}</g>`;
    let out = body;
    if (contOn) {
      const cd = CONT_D[w.shape];
      if (badge) out = `<path d="${cd}" transform="translate(50 50)" fill="${contCol}"/>` + body;
      else if (frame) out = body + `<path d="${cd}" transform="translate(50 50) scale(.95)" fill="none" stroke="${contCol}" stroke-width="${f1(Math.max(3, sw * 0.85))}" stroke-linejoin="round"/>`;
      else { const id = uid(); out = `<defs><clipPath id="${id}"><path d="${cd}" transform="translate(50 50)"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`; }
    }
    return finish(out, m, hw);
  }
  // The finish: a cut (a mask, so it stays a real gap on any background) or an accent copy.
  const reid = (s, k) => s.replace(/id="(lg\w+)"/g, `id="$1${k}"`).replace(/url\(#(lg\w+)\)/g, `url(#$1${k})`);
  function finish(art, m, hw) {
    const k = m.f.kind, ang = m.f.angle * 180;
    if (k === "none") return art;
    if (k === "shadow") { const d = 3 + hw, t = rad(ang + 45); return `<g transform="translate(${f1(d * Math.cos(t))} ${f1(d * Math.sin(t))})">${reid(art.replace(/INK/g, "ACC"), "s")}</g>${art}`; }
    if (k === "split") {
      const id = uid();
      return art + `<defs><clipPath id="${id}"><path d="M-100 0H100V100H-100Z" transform="translate(50 50) rotate(${f1(ang)})"/></clipPath></defs><g clip-path="url(#${id})">${reid(art.replace(/INK/g, "ACC"), "h")}</g>`;
    }
    const id = uid();
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/><path d="M-80 0H80" transform="translate(50 50) rotate(${f1(ang - 30)})" stroke="#000" stroke-width="${f1(2.5 + hw)}"/></mask></defs><g mask="url(#${id})">${art}</g>`;
  }
  // Marks are kept by everything that shapes them, so repaints are free.
  const markCache = new Map();
  function markSVG(m, f) {
    const k = JSON.stringify(m) + (m.c.form === "letter" ? `|${initial(L.name)}|${f.font}|${f.weight}|${f.case}` : "");
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
  const ROLL = {
    c: () => ({ form: pickW({ circle: 3, square: 2, triangle: 1.5, diamond: 1, hexagon: 1.5, star: 1, lens: 1, half: 1.2, quarter: 1, cross: 0.7, letter: 2 }), size: rnd(0.45, 0.8), turn: Math.random() < 0.7 ? 0 : Math.round(Math.random() * 8) * 45, points: rnd(0, 0.7), round: rnd(0.15, 0.6) }),
    s: () => ({ style: pickW({ solid: 4, line: 3, mixed: 2 }), fill: pickW({ plain: 6, hatch: 1, dots: 0.6, contour: 1.2, rings: 1 }), detail: rnd(0.25, 0.7) }),
    a: () => ({ kind: pickW({ none: 2.5, ring: 1.5, echo: 1.2, orbit: 1.2, radial: 1.5, overlap: 1, bite: 1.5, satellite: 1.2 }), piece: pickW({ circle: 4, square: 1, triangle: 1, diamond: 1, hexagon: 0.5, star: 0.6, lens: 1.2, half: 0.6, quarter: 0.6 }), count: rnd(0.1, 0.8), dist: rnd(0.1, 0.7), size: rnd(0.25, 0.75), spin: Math.round(Math.random() * 8) * 45 }),
    w: () => ({ shape: pickW({ none: 4, circle: 2, rounded: 1.5, squircle: 1.5, hexagon: 0.8, diamond: 0.5 }), hold: pickW({ cut: 1, frame: 2, badge: 2.5 }) }),
    f: () => ({ kind: pickW({ none: 6, slice: 1, split: 1, shadow: 0.8 }), angle: rnd(0, 1) }),
  };
  // A new take on one step (or all of them), keeping the rest. Rolls stay within the element budget,
  // and a few pairings that never read well are rolled again: texture inside a small form, a textured
  // form inside a badge with lines all around it, or two ideas competing for the edge.
  function sensible(m) {
    if (m.s.fill !== "plain" && (m.c.size < 0.5 || m.c.form === "letter" || m.a.kind === "radial")) return false;
    if (m.a.kind === "echo" && m.w.shape !== "none" && m.w.hold === "frame") return false;
    if (m.a.kind === "bite" && m.c.form === "letter") return false;
    if (m.f.kind !== "none" && m.a.kind !== "none" && m.s.fill !== "plain") return false;
    if (m.accent === "container" && (m.w.shape === "none" || m.w.hold === "cut")) return false;
    return true;
  }
  function rollPart(m, part) {
    const budget = part ? 3.3 : pickW({ 1.8: 3, 2.6: 4, 3.3: 2 });
    let best = null;
    for (let i = 0; i < 30; i++) {
      const o = JSON.parse(JSON.stringify(m));
      // The last step's die rolls its finish and its accent together.
      for (const k of part ? (part === "x" ? ["f"] : [part]) : ["c", "s", "a", "w", "f"]) if (ROLL[k]) o[k] = ROLL[k]();
      if (!part || part === "x") { o.accent = pickW({ none: 0.6, form: 2.5, around: o.a.kind === "none" ? 0 : 2, container: o.w.shape !== "none" && o.w.hold !== "cut" ? 1.2 : 0 }); o.weight = rnd(0.3, 0.65); o.gap = rnd(0.25, 0.65); }
      if (!part || part === "seed") o.seed = newSeed();
      const n = norm(o);
      if (sensible(n) && busy(n) <= budget) return n;
      if (!best || busy(n) < busy(best)) best = n;
    }
    return best;
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
    const css = layout === "mark" && L.mark.c.form !== "letter" ? "" : await embedFont(f.font, f.weight);
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
    g.onclick = (e) => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      // A container picked from none starts as a frame, the hold that shows it.
      if (path === "w.shape" && L.mark.w.shape === "none" && L.mark.w.hold === "cut") setK("w.hold", "frame");
      setK(path, b.dataset.v); syncAll(); changed();
    };
    chipSets.push({ g, path, list });
    return g;
  }
  function buildPage() {
    built = true;
    const page = $("assetsPage");
    page.innerHTML = `<aside class="options as-panel" aria-label="Logo settings"><h2 class="col-title">Logo</h2><p class="lede">Build a mark step by step, then set your project's name beside it. The meter on the preview says when it's getting busy.</p><div id="asOpts"></div></aside>
      <section class="as-stage" aria-label="Logo preview"><div class="as-scroll" id="asStage"></div>
        <div class="as-bar glass" role="toolbar" aria-label="Logo"><button class="bar-btn surprise" id="asShuffle" title="A new mark, every step rolled">Shuffle<kbd>R</kbd></button><button class="bar-btn" id="asVary" title="The same steps, drawn again">Variation<kbd><svg class="ic kbd-ic"><use href="#i-shift"/></svg>R</kbd></button><span class="bar-sep"></span><button class="bar-btn" id="asSvg">SVG</button><button class="bar-btn" id="asPng">PNG</button><button class="bar-btn" id="asCopy">Copy SVG</button></div></section>`;
    const o = $("asOpts");
    o.insertAdjacentHTML("beforeend", `<h3 class="sub first">Name</h3><input class="field as-name" id="asName" maxlength="40" spellcheck="false" autocomplete="off" aria-label="Name">`);
    const nm = $("asName"); nm.value = L.name;
    nm.oninput = () => { L.name = nm.value; save(); render(); clearTimeout(nm._t); nm._t = setTimeout(() => { syncKit(); homePreview(); }, 250); };

    let s = step(o, 1, "Form", "c", "A new form");
    chips(s, "c.form", FORMS);
    slider(s, "Size", "c.size", "How large the form is beside what's around it");
    slider(s, "Points", "c.points", "How many points a star has");
    slider(s, "Round", "c.round", "Rounds the corners");
    slider(s, "Turn", "c.turn", "Turns the form", true);

    s = step(o, 2, "Style", "s", "A new style");
    seg(s, STYLES, () => L.mark.s.style, (v) => setK("s.style", v), "as-style");
    chips(s, "s.fill", FILLS, "Inside the form", 5).classList.add("sm");
    slider(s, "Detail", "s.detail", "How fine the texture inside is. It never gets finer than reads at small sizes");

    s = step(o, 3, "Compose", "a", "A new composition");
    chips(s, "a.kind", COMPOSE);
    chips(s, "a.piece", PIECES, "Piece", 5).classList.add("as-piece", "sm");
    slider(s, "Count", "a.count", "How many pieces or echoes (for a bite, whether the piece sits in the gap)");
    slider(s, "Distance", "a.dist", "How far from the form");
    slider(s, "Size", "a.size", "How large the piece is (for an orbit, how open the ring is)");
    slider(s, "Spin", "a.spin", "Where around the form it sits", true);

    s = step(o, 4, "Container", "w", "A new container");
    chips(s, "w.shape", CONTAINERS, "", 3);
    seg(s, HOLDS, () => L.mark.w.hold, (v) => setK("w.hold", v), "as-mode");

    s = step(o, 5, "Finish and accent", "x", "A new accent and line weight");
    chips(s, "f.kind", FINISHES).classList.add("sm");
    slider(s, "Angle", "f.angle", "Which way the finish runs");
    s.insertAdjacentHTML("beforeend", `<div class="as-lbl">Accent</div>`);
    seg(s, ACCENTS, () => L.mark.accent, (v) => setK("accent", v), "as-acc");
    slider(s, "Weight", "weight", "One line weight for every part");
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
    "c.points": (m) => m.c.form === "star", "c.round": (m) => ["square", "triangle", "diamond", "hexagon", "star", "cross"].includes(m.c.form),
    "s.detail": (m) => m.s.fill !== "plain",
    "a.count": (m) => ["echo", "orbit", "radial", "bite"].includes(m.a.kind), "a.dist": (m) => m.a.kind !== "none", "a.size": (m) => ["orbit", "radial", "satellite", "bite"].includes(m.a.kind), "a.spin": (m) => m.a.kind !== "none" && m.a.kind !== "ring",
    "f.angle": (m) => m.f.kind !== "none",
  };
  function renderChips() {
    const f = face(), c = colors(), m = L.mark;
    for (const { g, path, list } of chipSets) {
      const cur = path.split(".").reduce((o, k) => o[k], m);
      g.innerHTML = list.map(([v, name, tip]) => {
        const t = JSON.parse(JSON.stringify(m)), ks = path.split(".");
        let o = t; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v;
        // A piece shows even while the composition doesn't use one.
        if (path === "a.piece" && !USES_PIECE.has(t.a.kind)) t.a.kind = "satellite";
        if (path === "w.shape" && m.w.shape === "none" && t.w.hold === "cut") t.w.hold = "frame";
        return `<button class="as-chip${cur === v ? " on" : ""}" data-v="${v}" data-tip="${esc(tip)}">${markOnly(norm(t), c, f)}<span>${name}</span></button>`;
      }).join("");
    }
    for (const row of $("asOpts").querySelectorAll(".ctrl[data-k]")) row.classList.toggle("off", USED[row.dataset.k] ? !USED[row.dataset.k](m) : false);
    $("asOpts").querySelector(".as-piece").classList.toggle("off", !USES_PIECE.has(m.a.kind));
    $("asOpts").querySelector(".as-mode").classList.toggle("off", m.w.shape === "none");
    $("asOpts").querySelector(".as-acc button[data-v=container]").disabled = m.w.shape === "none" || m.w.hold === "cut";
  }
  function renderFonts() {
    const sel = $("asFont"), t = kitTokens(), kitF = t?.font.heading || "Instrument Sans";
    sel.innerHTML = `<option value="kit">Kit font (${esc(kitF)})</option>` + FONTS.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
    sel.value = L.font === "kit" || FONTS.includes(L.font) ? L.font : "kit";
  }
  // Alternatives under the previews: one step changed in each of the first six, then two rolled whole.
  function rollVars() { vars = [rollPart(L.mark, "c"), rollPart(L.mark, "s"), rollPart(L.mark, "a"), rollPart(L.mark, "w"), rollPart(L.mark, "f"), rollPart(L.mark, "x"), rollPart(L.mark), rollPart(L.mark)]; }
  function render() {
    if (!built || root.Shell?.route !== "assets") return;
    const c = colors(), d = onDark(c), a = onAccent(c), f = face();
    renderChips();
    if (!vars.length) rollVars();
    const icon = (n, cc) => `<span class="as-icon" style="--n:${n}px;background:${cc.bg}">${markOnly(L.mark, cc, f)}</span>`;
    const what = ["New form", "New style", "New composition", "New container", "New finish", "New accent", "All new", "All new"];
    const n = busy(L.mark), [label, note] = busyLabel(n);
    $("asStage").innerHTML = `
      <div class="as-hero" style="background:${c.bg}">${logoHTML(c)}
        <div class="as-meter" data-tip="${esc(note)}. Lasting marks usually hold one to three elements"><span class="as-small" style="background:${c.bg}">${markOnly(L.mark, c, f)}</span><span class="as-bar-m"><i style="width:${Math.min(100, (n / 4) * 100)}%"></i></span><b>${label}</b></div></div>
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
    if (isStepped(l.mark)) L.mark = norm(l.mark); else if (l.mark || l.style) L.mark = fromOld({ ...(l.mark || {}), style: l.style, seed: l.seed ?? l.mark?.seed });
    if (["side", "stack", "mark", "name"].includes(l.layout)) L.layout = l.layout;
    save(); rollVars(); syncAll(); render(); syncKit(); homePreview();
  }
  function remix() { L.mark = rollPart(L.mark); save(); rollVars(); syncAll(); render(); syncKit(); }

  root.Assets = {
    onShow, preview: homePreview, look, setLook, remix, kitBrand, kitKey,
    // For agents and scripts.
    state: () => JSON.parse(JSON.stringify(L)),
    set: (p) => { const { mark, ...rest } = p || {}; Object.assign(L, rest); if (mark) L.mark = norm({ ...L.mark, ...mark, c: { ...L.mark.c, ...mark.c }, s: { ...L.mark.s, ...mark.s }, a: { ...L.mark.a, ...mark.a }, w: { ...L.mark.w, ...mark.w }, f: { ...L.mark.f, ...mark.f } }); syncAll(); changed(); return JSON.parse(JSON.stringify(L)); },
    steps: () => ({ forms: FORMS, styles: STYLES, fills: FILLS, compose: COMPOSE, pieces: PIECES, containers: CONTAINERS, holds: HOLDS, finishes: FINISHES, accents: ACCENTS }),
    busy: () => busy(L.mark),
    roll: (part) => { L.mark = rollPart(L.mark, part); syncAll(); changed(); return JSON.parse(JSON.stringify(L.mark)); },
    svg: () => exportSVG(), png: (scale) => exportPNG(scale),
  };
})(window);
