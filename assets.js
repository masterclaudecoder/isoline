// Assets: a logo maker. The mark is built like a Studio design, from parts that combine freely: a shape
// (what holds it), a pattern (what fills it) and an accent (the one thing in the accent color). Each
// part has its own settings, so there's no end of marks, and Shuffle rolls any part or all of them.
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

  // ---------- the parts ----------
  // [id, name, what it is]. Bounded patterns keep inside the board on their own; the others are cut to
  // a circle when there's no shape around them.
  const FRAMES = [
    ["none", "None", "No shape, the pattern on its own"], ["circle", "Circle", "A round badge"], ["square", "Rounded", "A rounded square, like an app icon"],
    ["arch", "Arch", "Round on top, flat at the base"], ["pill", "Pill", "A tall capsule"], ["hex", "Hexagon", "Six sides"], ["leaf", "Leaf", "Two curves meeting at a point"],
  ];
  const BODIES = [
    ["rings", "Rings", "The rings of a small contour map", true], ["lens", "Lens", "Lines bending around a point", false],
    ["waves", "Waves", "Stacked waves", false], ["bloom", "Bloom", "Petals turning around a center", true],
    ["orbit", "Orbit", "A planet and its ring", true], ["dots", "Dots", "A grid of dots, larger toward the light", true],
    ["rays", "Rays", "Lines from a center, like a sunburst", true], ["arcs", "Arcs", "Nested arches", true],
    ["bars", "Bars", "A row of rounded bars", true], ["spiral", "Spiral", "A line winding out from the middle", true],
    ["letter", "Letter", "Your name's first letter", true],
  ];
  const ACCENTS = [["none", "None", "No accent, one color"], ["line", "Line", "One part of the pattern in the accent"], ["dot", "Dot", "A dot in the accent"], ["ring", "Ring", "An open ring around the mark, ending in a dot"]];
  const FILLS = [["clip", "Cut", "The pattern cut to the shape"], ["outline", "Outline", "The shape drawn as a line around the pattern"], ["solid", "Solid", "A solid shape with the pattern cut out of it"]];
  const BOUNDED = Object.fromEntries(BODIES.map((b) => [b[0], b[3]]));
  // Patterns that look the same at any angle don't need turning when rolled.
  const TURNS = new Set(["lens", "waves", "orbit", "arcs", "bars", "rays", "bloom", "dots"]);
  const MDEF = { frame: "circle", fill: "clip", body: "rings", dens: 0.5, twist: 0.3, weight: 0.45, turn: 0, solid: false, accent: "line", spot: 0.15, reach: 0.6, seed: 7 };
  const ENUMS = { frame: FRAMES, fill: FILLS, body: BODIES, accent: ACCENTS };
  const UNIT = ["dens", "twist", "weight", "spot", "reach"];
  // A mark from anywhere (storage, a saved look, a script) made safe to draw.
  function norm(m) {
    const o = { ...MDEF };
    if (!m || typeof m !== "object") return o;
    for (const [k, list] of Object.entries(ENUMS)) if (list.some((x) => x[0] === m[k])) o[k] = m[k];
    for (const k of UNIT) if (Number.isFinite(m[k])) o[k] = clamp(m[k], 0, 1);
    if (Number.isFinite(m.turn)) o.turn = ((Math.round(m.turn) % 360) + 360) % 360;
    if (Number.isFinite(m.seed)) o.seed = Math.round(m.seed);
    o.solid = !!m.solid;
    return o;
  }

  // ---------- state ----------
  const KEY = "isoline.logo";
  const DEF = { name: "Margin", layout: "side", font: "kit", weight: 600, case: "as", track: -0.02, color: "kit", kit: false };
  // The first prototype kept one of seven fixed styles; those map onto the parts that drew them.
  const OLD = { contour: { body: "rings", frame: "circle" }, lens: { body: "lens", frame: "circle", accent: "dot", spot: 0.25, reach: 0.15 }, orbit: { body: "orbit", frame: "none", accent: "line" }, strata: { body: "waves", frame: "arch" }, bloom: { body: "bloom", frame: "none", accent: "dot", reach: 0, solid: true }, peaks: { body: "rings" }, monogram: { body: "letter", frame: "none", accent: "ring" } };
  let L = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    const o = { ...DEF, ...s };
    o.mark = norm(s.mark || (s.style ? { ...MDEF, ...OLD[s.style], seed: s.seed } : MDEF));
    delete o.style; delete o.seed;
    return o;
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const newSeed = () => 1 + Math.floor(Math.random() * 99999);

  // ---------- drawing ----------
  // Marks are drawn on a 100 x 100 board with color slots filled in wherever they're shown: INK (the
  // main color), ACC (the accent) and BGC (the surface behind, for cut-outs). While a mark is put
  // together, BODY is the pattern's color (ink, or the surface when it's cut out of a solid shape) and
  // HALO the color right behind the pattern.
  const BASE = {
    seed: 7, scale: 100, octaves: 1, warp: 0, angle: 0, features: 0, bump: 0, bumpSize: 50, usePoints: true, falloff: 1,
    levels: 6, gap: 10, bias: 0, weight: 1, swell: 0, swellSize: 100, taper: 0, indexEvery: 0, indexWeight: 1,
    smooth: 0.5, res: 2, minLen: 0, line: "#1c1c1e", line2: "#1c1c1e", gradient: false, bg: "#fff", transparent: true, opacity: 1, mode: "lines",
  };
  const contourPaths = (o, opts) => (T.buildSVG({ ...BASE, ...o, w: 100, h: 100 }, opts).svg.match(/<path[^>]*\/>/g) || []).map((p) => p.replace(/#1c1c1e/g, "BODY"));
  let uidN = 0;
  const uid = () => "lg" + (++uidN).toString(36);
  const initial = (name) => ([...String(name).trim()][0] || "A");
  const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const hexPath = () => { let d = ""; for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; d += `${i ? "L" : "M"}${f1(50 + 47 * Math.cos(a))} ${f1(50 + 47 * Math.sin(a))}`; } return d + "Z"; };
  const FRAME_D = { circle: "M4 50a46 46 0 1 0 92 0a46 46 0 1 0-92 0Z", square: rr(5, 5, 90, 90, 26), arch: "M7 95V50a43 43 0 0 1 86 0v45Z", pill: rr(23, 4, 54, 92, 27), hex: hexPath(), leaf: "M8 92C8 40 40 8 92 8C92 60 60 92 8 92Z" };
  const around = (s) => `translate(50 50) scale(${s}) translate(-50 -50)`;

  // Each pattern returns its parts (SVG elements colored BODY) and which parts go together when one is
  // picked out in the accent (an orbit's ring is one part drawn in two halves).
  const sw = (m) => 1.6 + m.weight * 7;
  const PATTERNS = {
    rings(m, r) {
      for (let tries = 0; tries < 6; tries++) {
        const pts = [{ x: 0.45 + r() * 0.1, y: 0.45 + r() * 0.1, r: 1, s: 1 }];
        if (m.twist > 0.45 && r() < 0.6) pts.push({ x: 0.3 + r() * 0.4, y: 0.3 + r() * 0.4, r: 1, s: 0.2 + r() * 0.25 });
        const els = contourPaths({ pattern: "rings", seed: 1 + Math.floor(r() * 9999), warp: m.twist * 0.28, gap: lerp(13, 5.5, m.dens), weight: sw(m) * 0.8, smooth: 0.7, points: pts, minLen: 12 }, { closedOnly: true });
        if (els.length >= 2) return { els: els.map((e) => `<g transform="${around(1.12)}">${e}</g>`) };
      }
      return { els: [`<circle cx="50" cy="50" r="30" fill="none" stroke="BODY" stroke-width="${sw(m)}"/>`, `<circle cx="50" cy="50" r="12" fill="BODY"/>`] };
    },
    lens(m, r) {
      const y = 0.42 + r() * 0.12;
      return { els: contourPaths({ pattern: "lines", angle: Math.round(r() * 30 - 15), gap: lerp(19, 8, m.dens), weight: sw(m) * 0.85, smooth: 0.6, falloff: 1.2, points: [{ x: 0.5, y, r: 24 + r() * 10, s: 0.5 + m.twist * 1.6 }], minLen: 8 }) };
    },
    waves(m, r) {
      const n = Math.round(lerp(3, 9, m.dens)), A = 1 + m.twist * 9, f = 0.8 + r() * 1.2, ph = r() * 6.28, skew = 0.3 + r() * 0.6, w = Math.min(sw(m), (74 / n) * 0.62);
      const els = [];
      for (let i = 0; i < n; i++) {
        const y0 = 13 + (i * 74) / Math.max(1, n - 1);
        let d = "";
        for (let x = -6; x <= 106; x += 4) d += `${d ? "L" : "M"}${x} ${f1(y0 + A * Math.sin((2 * Math.PI * f * x) / 100 + ph + i * skew))}`;
        els.push(`<path d="${d}" fill="none" stroke="BODY" stroke-width="${f1(w)}" stroke-linecap="round"/>`);
      }
      return { els };
    },
    bloom(m, r) {
      const n = Math.round(lerp(3, 12, m.dens)), Lp = 36 + r() * 9, wp = 6 + m.twist * 14;
      const petal = `M50 50C${f1(50 + wp)} ${f1(50 - Lp * 0.35)} ${f1(50 + wp * 0.6)} ${f1(50 - Lp * 0.85)} 50 ${f1(50 - Lp)}C${f1(50 - wp * 0.6)} ${f1(50 - Lp * 0.85)} ${f1(50 - wp)} ${f1(50 - Lp * 0.35)} 50 50Z`;
      const els = [];
      for (let i = 0; i < n; i++) els.push(`<path d="${petal}" transform="rotate(${f1((360 / n) * i)} 50 50)" ${m.solid ? `fill="BODY"${i % 2 && n % 2 === 0 ? ' opacity=".72"' : ""}` : `fill="none" stroke="BODY" stroke-width="${f1(sw(m) * 0.6)}" stroke-linejoin="round"`}/>`);
      return { els };
    },
    orbit(m, r) {
      const R = lerp(16, 30, m.dens), rx = Math.min(48, R * (1.55 + r() * 0.2)), ry = rx * (0.16 + m.twist * 0.3), w = f1(sw(m) * 0.7);
      const back = `M${f1(50 - rx)} 50A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(50 + rx)} 50`, fwd = `M${f1(50 - rx)} 50A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(50 + rx)} 50`, tilt = Math.round(-30 + r() * 20);
      return {
        els: [
          `<path d="${back}" transform="rotate(${tilt} 50 50)" fill="none" stroke="BODY" stroke-width="${w}" stroke-linecap="round"/>`,
          m.solid ? `<circle cx="50" cy="50" r="${f1(R)}" fill="BODY"/>` : `<circle cx="50" cy="50" r="${f1(R)}" fill="HALO" stroke="BODY" stroke-width="${w}"/>`,
          `<path d="${fwd}" transform="rotate(${tilt} 50 50)" fill="none" stroke="HALO" stroke-width="${f1(w * 2.2)}" stroke-linecap="round"/>`,
          `<path d="${fwd}" transform="rotate(${tilt} 50 50)" fill="none" stroke="BODY" stroke-width="${w}" stroke-linecap="round"/>`,
        ],
        groups: [[0, 3], [1]],
      };
    },
    dots(m, r) {
      const k = Math.round(lerp(4, 10, m.dens)), cell = 92 / k, lx = 28 + r() * 44, ly = 28 + r() * 44, els = [];
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
        const x = 4 + cell * (i + 0.5), y = 4 + cell * (j + 0.5);
        if (Math.hypot(x - 50, y - 50) > 46 - cell * 0.2) continue;
        const near = 1 - Math.hypot(x - lx, y - ly) / 92, rad = cell * 0.46 * clamp(lerp(1, near * 1.25, m.twist), 0.12, 1);
        els.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="BODY"/>`);
      }
      return { els };
    },
    rays(m, r) {
      const n = Math.round(lerp(6, 26, m.dens)), r0 = 8 + m.twist * 24, alt = r() < 0.5, w = f1(Math.min(sw(m) * 0.75, (2 * Math.PI * (r0 + 6)) / n * 0.7)), els = [];
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n, r1 = alt && i % 2 ? 34 : 45;
        els.push(`<path d="M${f1(50 + r0 * Math.cos(a))} ${f1(50 + r0 * Math.sin(a))}L${f1(50 + r1 * Math.cos(a))} ${f1(50 + r1 * Math.sin(a))}" stroke="BODY" stroke-width="${w}" stroke-linecap="round"/>`);
      }
      return { els };
    },
    arcs(m, r) {
      const n = Math.round(lerp(2, 7, m.dens)), w = Math.min(sw(m), (40 / n) * 0.6), cy = 72, els = [];
      for (let i = 0; i < n; i++) {
        const R = 42 - (i * 36) / Math.max(1, n - 1 || 1), off = (i * m.twist * 22 * Math.PI) / 180, a0 = Math.PI + off, a1 = 2 * Math.PI - off * 0.4;
        els.push(`<path d="M${f1(50 + R * Math.cos(a0))} ${f1(cy + R * Math.sin(a0))}A${f1(R)} ${f1(R)} 0 0 1 ${f1(50 + R * Math.cos(a1))} ${f1(cy + R * Math.sin(a1))}" fill="none" stroke="BODY" stroke-width="${f1(w)}" stroke-linecap="round"/>`);
      }
      return { els };
    },
    bars(m, r) {
      const n = Math.round(lerp(3, 9, m.dens)), gap = 80 / n, bw = gap * 0.62, base = 86, els = [];
      for (let i = 0; i < n; i++) {
        const even = 26 + (54 * (i + 1)) / n, wild = 18 + r() * 64, h = lerp(even, wild, m.twist), x = 10 + gap * i + (gap - bw) / 2;
        els.push(m.solid ? `<rect x="${f1(x)}" y="${f1(base - h)}" width="${f1(bw)}" height="${f1(h)}" rx="${f1(bw / 2)}" fill="BODY"/>` : `<path d="M${f1(x + bw / 2)} ${base - 2}V${f1(base - h + 2)}" stroke="BODY" stroke-width="${f1(Math.min(sw(m), bw * 0.9))}" stroke-linecap="round"/>`);
      }
      return { els };
    },
    spiral(m, r) {
      const turns = lerp(1.6, 5.5, m.dens), steps = Math.round(turns * 48), wob = m.twist * 5, lobes = 3 + Math.floor(r() * 4), out = [];
      let a = "", b = "";
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, th = t * turns * 2 * Math.PI, rad = 3 + t * 41 + wob * Math.sin(th * lobes) * t;
        const pt = `${f1(50 + rad * Math.cos(th))} ${f1(50 + rad * Math.sin(th))}`;
        if (t <= 0.55) a += `${a ? "L" : "M"}${pt}`;
        if (t >= 0.55) b += `${b ? "L" : "M"}${pt}`;
      }
      for (const d of [a, b]) out.push(`<path d="${d}" fill="none" stroke="BODY" stroke-width="${f1(Math.min(sw(m), (41 / turns) * 0.55))}" stroke-linecap="round" stroke-linejoin="round"/>`);
      return { els: out };
    },
    letter(m, r, f) {
      const ch = esc(applyCase(initial(L.name), f.case === "lower" ? "lower" : "upper"));
      return { els: [`<text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="'${esc(f.font)}', system-ui, sans-serif" font-weight="${f.weight}" font-size="${f1(lerp(40, 70, m.dens))}" fill="BODY">${ch}</text>`] };
    },
  };

  // The whole mark from its parts: the pattern (turned, cut to the shape), the shape drawn around it as
  // set, and the accent on top.
  function build(m, f) {
    const pat = (PATTERNS[m.body] || PATTERNS.rings)(m, T.mulberry32(m.seed * 7919 + m.body.length * 31), f);
    const solid = m.frame !== "none" && m.fill === "solid", outline = m.frame !== "none" && m.fill === "outline";
    const bodyColor = solid ? "BGC" : "INK", halo = solid ? "INK" : "BGC";
    const groups = pat.groups || pat.els.map((_, i) => [i]);
    let pick = -1;
    if (m.accent === "line" && groups.length) pick = Math.floor(m.spot * groups.length) % groups.length;
    const accentSet = new Set(pick >= 0 ? groups[pick] : []);
    const els = pat.els.map((e, i) => e.replace(/BODY/g, accentSet.has(i) ? "ACC" : bodyColor).replace(/HALO/g, halo)).join("");
    const turn = m.turn ? `<g transform="rotate(${m.turn} 50 50)">${els}</g>` : els;
    // With no shape, patterns that run to the board's edge (or bars and arcs once turned) are cut to a circle.
    const fd = FRAME_D[m.frame], spill = !BOUNDED[m.body] || (m.turn && (m.body === "bars" || m.body === "arcs")), clipD = fd || (spill ? FRAME_D.circle : "");
    let out = "";
    if (clipD) {
      const id = uid(), inset = solid ? 0.84 : outline ? 0.8 : 1;
      if (solid) out += `<path d="${fd}" fill="INK"/>`;
      out += `<defs><clipPath id="${id}"><path d="${clipD}" transform="${around(inset)}"/></clipPath></defs><g clip-path="url(#${id})">${turn}</g>`;
      if (outline) out += `<path d="${fd}" fill="none" stroke="INK" stroke-width="${f1(Math.max(2.4, sw(m) * 0.7))}" stroke-linejoin="round"/>`;
    } else out = turn;
    if (m.accent === "dot") {
      const a = m.spot * 2 * Math.PI - Math.PI / 2, R = m.reach * 40;
      out += `<circle cx="${f1(50 + R * Math.cos(a))}" cy="${f1(50 + R * Math.sin(a))}" r="${f1(4.5 + m.weight * 4)}" fill="ACC" stroke="${m.reach < 0.5 && solid ? "INK" : "BGC"}" stroke-width="3"/>`;
    }
    if (m.accent === "ring") {
      // The mark steps in to make room for an open ring around it, which ends in a dot.
      const a0 = m.spot * 360, span = 300 - m.reach * 120, R = 45, rad = (d) => (d * Math.PI) / 180, p = (d) => [50 + R * Math.cos(rad(d)), 50 + R * Math.sin(rad(d))];
      const [x0, y0] = p(a0), [x1, y1] = p(a0 + span);
      out = `<g transform="${around(0.7)}">${out}</g><path d="M${f1(x0)} ${f1(y0)}A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="INK" stroke-width="${f1(Math.max(3, sw(m) * 0.75))}" stroke-linecap="round"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="5.5" fill="ACC" stroke="BGC" stroke-width="2.5"/>`;
    }
    return out;
  }
  // Marks are kept by everything that shapes them, so repaints are free.
  const markCache = new Map();
  function markSVG(m, f) {
    const k = JSON.stringify(m) + (m.body === "letter" ? `|${initial(L.name)}|${f.font}|${f.weight}|${f.case}` : "");
    if (!markCache.has(k)) { if (markCache.size > 400) markCache.clear(); markCache.set(k, build(m, f)); }
    return markCache.get(k);
  }
  const paint = (body, c) => body.replace(/INK/g, c.ink).replace(/ACC/g, c.acc).replace(/BGC/g, c.bg);

  // ---------- rolling ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const pickW = (w) => { const e = Object.entries(w), t = e.reduce((s, [, v]) => s + v, 0); let x = Math.random() * t; for (const [k, v] of e) if ((x -= v) < 0) return k; return e[0][0]; };
  // A new take on one part (or all of them), keeping the rest. Each roll stays in ranges that read well
  // at small sizes.
  function rollPart(m, part) {
    const o = { ...m };
    if (!part || part === "frame") { o.frame = pickW({ none: 4, circle: 3, square: 2, arch: 1, pill: 1, hex: 1, leaf: 1 }); o.fill = pickW({ clip: 4, outline: 2, solid: 2 }); }
    if (!part || part === "body") {
      o.body = pick(BODIES.filter((b) => b[0] !== m.body || part !== "body"))[0];
      o.dens = +(0.15 + Math.random() * 0.75).toFixed(2); o.twist = +(Math.random() * 0.85).toFixed(2); o.weight = +(0.2 + Math.random() * 0.55).toFixed(2);
      o.turn = TURNS.has(o.body) && Math.random() < 0.6 ? Math.round(Math.random() * 24) * 15 : 0; o.solid = Math.random() < 0.5; o.seed = newSeed();
    }
    if (!part || part === "accent") { o.accent = pickW({ none: 1, line: 3, dot: 3, ring: 1 }); o.spot = +Math.random().toFixed(2); o.reach = +(0.25 + Math.random() * 0.75).toFixed(2); }
    if (part === "seed") o.seed = newSeed();
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
    const css = layout === "mark" && L.mark.body !== "letter" ? "" : await embedFont(f.font, f.weight);
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
  const setMark = (p) => { L.mark = norm({ ...L.mark, ...p }); };
  function seg(host, opts, get, set) {
    const el = document.createElement("div"); el.className = "seg sm";
    el.innerHTML = opts.map(([v, l, t]) => `<button data-v="${v}"${t ? ` data-tip="${esc(t)}"` : ""}>${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(isNaN(+b.dataset.v) || b.dataset.v === "" ? b.dataset.v : +b.dataset.v); changed(); };
    el.sync = () => { for (const x of el.querySelectorAll("button")) x.classList.toggle("on", String(get()) === x.dataset.v); };
    el.sync(); syncers.push(el.sync);
    host.appendChild(el); return el;
  }
  function slider(host, label, key, tip, fmt = (v) => Math.round(v * 100) + "%", max = 1, step = 0.01) {
    host.insertAdjacentHTML("beforeend", `<div class="ctrl"><div class="label-row"><span class="label"${tip ? ` data-tip="${esc(tip)}"` : ""}>${label}</span><span class="val-static mono"></span></div><input type="range" min="0" max="${max}" step="${step}" aria-label="${label}"></div>`);
    const row = host.lastElementChild, r = row.querySelector("input"), out = row.querySelector(".val-static");
    const sync = () => { const v = L.mark[key]; r.value = v; r.style.setProperty("--p", (v / max) * 100 + "%"); out.textContent = fmt(v); };
    r.oninput = () => { setMark({ [key]: +r.value }); sync(); live(); };
    r.onchange = () => changed();
    sync(); syncers.push(sync);
  }
  const syncers = [];
  const syncAll = () => { for (const s of syncers) s(); };
  // A section heading with a die that rolls just that part.
  const head = (host, t, part, tip) => host.insertAdjacentHTML("beforeend", `<div class="sub-head as-head"><h3 class="sub">${t}</h3>${part ? `<button class="ib xs" data-roll="${part}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"><svg class="ic"><use href="#i-dice"/></svg></button>` : ""}</div>`);
  function chips(host, id, list, key) {
    const g = document.createElement("div"); g.className = "as-chips"; g.id = id; g.dataset.key = key; host.appendChild(g);
    g.onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; setMark({ [key]: b.dataset.v }); syncAll(); changed(); };
    return g;
  }
  function buildPage() {
    built = true;
    const page = $("assetsPage");
    page.innerHTML = `<aside class="options as-panel" aria-label="Logo settings"><h2 class="col-title">Logo</h2><p class="lede">A mark and a name for your project, in your kit's font and colors.</p><div id="asOpts"></div></aside>
      <section class="as-stage" aria-label="Logo preview"><div class="as-scroll" id="asStage"></div>
        <div class="as-bar glass" role="toolbar" aria-label="Logo"><button class="bar-btn surprise" id="asShuffle" title="A new mark, every part rolled">Shuffle<kbd>R</kbd></button><button class="bar-btn" id="asVary" title="The same parts, drawn again">Variation<kbd><svg class="ic kbd-ic"><use href="#i-shift"/></svg>R</kbd></button><span class="bar-sep"></span><button class="bar-btn" id="asSvg">SVG</button><button class="bar-btn" id="asPng">PNG</button><button class="bar-btn" id="asCopy">Copy SVG</button></div></section>`;
    const o = $("asOpts");
    o.insertAdjacentHTML("beforeend", `<h3 class="sub first">Name</h3><input class="field as-name" id="asName" maxlength="40" spellcheck="false" autocomplete="off" aria-label="Name">`);
    const nm = $("asName"); nm.value = L.name;
    nm.oninput = () => { L.name = nm.value; save(); render(); clearTimeout(nm._t); nm._t = setTimeout(() => { syncKit(); homePreview(); }, 250); };

    head(o, "Shape", "frame", "A new shape");
    chips(o, "asFrames", FRAMES, "frame");
    const fill = seg(o, FILLS, () => L.mark.fill, (v) => setMark({ fill: v })); fill.classList.add("as-fill"); fill.id = "asFill";

    head(o, "Pattern", "body", "A new pattern");
    chips(o, "asBodies", BODIES, "body");
    const pw = document.createElement("div"); pw.className = "as-sliders"; o.appendChild(pw);
    slider(pw, "Density", "dens", "How many rings, lines, petals or dots");
    slider(pw, "Twist", "twist", "How far the pattern bends away from even");
    slider(pw, "Weight", "weight", "Line thickness");
    slider(pw, "Turn", "turn", "Turns the pattern", (v) => Math.round(v) + "°", 360, 5);
    seg(o, [["0", "Lines", "Drawn in lines"], ["1", "Shapes", "Petals, bars and planets filled in"]], () => (L.mark.solid ? "1" : "0"), (v) => setMark({ solid: v === 1 || v === "1" })).classList.add("as-solid");

    head(o, "Accent", "accent", "A new accent");
    chips(o, "asAccents", ACCENTS, "accent");
    const aw = document.createElement("div"); aw.className = "as-sliders"; o.appendChild(aw);
    slider(aw, "Spot", "spot", "Which part takes the accent, or where it sits around the mark");
    slider(aw, "Reach", "reach", "How far from the middle the dot sits, or how open the ring is");

    head(o, "Layout");
    seg(o, [["side", "Side"], ["stack", "Stacked"], ["mark", "Mark", "The mark alone, as for an app icon"], ["name", "Name", "The name alone, as a wordmark"]], () => L.layout, (v) => (L.layout = v));
    head(o, "Type");
    const sel = document.createElement("select"); sel.className = "field as-font"; sel.id = "asFont"; sel.setAttribute("aria-label", "Font");
    o.appendChild(sel);
    sel.onchange = () => { L.font = sel.value; changed(); };
    seg(o, [[400, "Regular"], [500, "Medium"], [600, "Semibold"], [700, "Bold"]], () => L.weight, (v) => (L.weight = v)).classList.add("as-row2");
    seg(o, [["as", "As typed"], ["lower", "lowercase"], ["upper", "UPPER"]], () => L.case, (v) => (L.case = v)).classList.add("as-case");
    o.insertAdjacentHTML("beforeend", `<div class="ctrl"><div class="label-row"><span class="label">Letter spacing</span><span class="val-static mono" id="asTrackV"></span></div><input type="range" id="asTrack" min="-0.08" max="0.2" step="0.005" aria-label="Letter spacing"></div>`);
    const tr = $("asTrack");
    const paintTrack = () => { tr.value = L.track; tr.style.setProperty("--p", ((L.track + 0.08) / 0.28) * 100 + "%"); $("asTrackV").textContent = (L.track >= 0 ? "+" : "") + Math.round(L.track * 1000) / 10 + "%"; };
    tr.oninput = () => { L.track = +tr.value; paintTrack(); live(); };
    tr.onchange = () => changed();
    paintTrack();
    head(o, "Color");
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
  // Every option shows what the mark would be with it, the rest of the mark kept as it is.
  function renderChips() {
    const f = face(), c = colors(), m = L.mark;
    const fill = (id, list, key) => { $(id).innerHTML = list.map(([v, name, tip]) => `<button class="as-chip${m[key] === v ? " on" : ""}" data-v="${v}" data-tip="${esc(tip)}">${markOnly(norm({ ...m, [key]: v }), c, f)}<span>${name}</span></button>`).join(""); };
    fill("asFrames", FRAMES, "frame"); fill("asBodies", BODIES, "body"); fill("asAccents", ACCENTS, "accent");
    $("asFill").classList.toggle("off", m.frame === "none");
  }
  function renderFonts() {
    const sel = $("asFont"), t = kitTokens(), kitF = t?.font.heading || "Instrument Sans";
    sel.innerHTML = `<option value="kit">Kit font (${esc(kitF)})</option>` + FONTS.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
    sel.value = L.font === "kit" || FONTS.includes(L.font) ? L.font : "kit";
  }
  // Alternatives under the previews: four with one part changed, four rolled whole.
  function rollVars() { vars = [rollPart(L.mark, "body"), rollPart(L.mark, "frame"), rollPart(L.mark, "accent"), rollPart(L.mark, "seed"), rollPart(L.mark), rollPart(L.mark), rollPart(L.mark), rollPart(L.mark)]; }
  function render() {
    if (!built || root.Shell?.route !== "assets") return;
    const c = colors(), d = onDark(c), a = onAccent(c), f = face();
    renderChips();
    if (!vars.length) rollVars();
    const icon = (n, cc) => `<span class="as-icon" style="--n:${n}px;background:${cc.bg}">${markOnly(L.mark, cc, f)}</span>`;
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
      <div class="as-vars">${vars.map((v, i) => `<button class="as-var" data-var="${i}" style="background:${c.bg}">${logoHTML(c, { mark: v, layout: "mark" })}</button>`).join("")}</div>`;
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
  const look = () => ({ mark: { ...L.mark }, layout: L.layout });
  function setLook(l) {
    if (!l || typeof l !== "object") return;
    // Looks saved by the first prototype carry a style and seed instead of parts.
    if (l.mark) L.mark = norm(l.mark); else if (OLD[l.style]) L.mark = norm({ ...MDEF, ...OLD[l.style], seed: l.seed });
    if (["side", "stack", "mark", "name"].includes(l.layout)) L.layout = l.layout;
    save(); rollVars(); syncAll(); render(); syncKit(); homePreview();
  }
  function remix() { L.mark = rollPart(L.mark); save(); rollVars(); syncAll(); render(); syncKit(); }

  root.Assets = {
    onShow, preview: homePreview, look, setLook, remix, kitBrand, kitKey,
    // For agents and scripts.
    state: () => JSON.parse(JSON.stringify(L)),
    set: (p) => { const { mark, ...rest } = p || {}; Object.assign(L, rest); if (mark) setMark(mark); syncAll(); changed(); return JSON.parse(JSON.stringify(L)); },
    parts: () => ({ shapes: FRAMES.map(([id, name, what]) => ({ id, name, what })), patterns: BODIES.map(([id, name, what]) => ({ id, name, what })), accents: ACCENTS.map(([id, name, what]) => ({ id, name, what })), fills: FILLS.map(([id, name]) => ({ id, name })) }),
    roll: (part) => { L.mark = rollPart(L.mark, part); syncAll(); changed(); return { ...L.mark }; },
    svg: () => exportSVG(), png: (scale) => exportPNG(scale),
  };
})(window);
