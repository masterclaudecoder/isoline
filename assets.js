// Assets: a logo maker. A mark and a wordmark built from the kit's fonts and colors (or the palette),
// in a few drawn styles. Each style is seeded, so Shuffle gives a fresh take on it. The logo can stand in
// for the made-up Margin logo in the Components preview, and the home page's roll rolls it too.
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const T = root.Topo, C = root.Color;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const STYLES = [
    ["contour", "Contour", "The rings of a small contour map"],
    ["lens", "Lens", "Lines bending around a point"],
    ["orbit", "Orbit", "A planet and its ring"],
    ["strata", "Strata", "Waves stacked inside a shape"],
    ["bloom", "Bloom", "Petals turning around a center"],
    ["peaks", "Peaks", "Summits under a sun"],
    ["monogram", "Monogram", "Your initial in an open ring"],
  ];
  const FONTS = ["Instrument Sans", "Inter Tight", "Geist", "Space Grotesk", "Sora", "Syne", "Bricolage Grotesque", "Unbounded", "Archivo", "Rubik", "Nunito", "Fraunces", "Playfair Display", "DM Serif Display", "Cormorant Garamond", "JetBrains Mono"];
  const KEY = "isoline.logo";
  const DEF = { name: "Margin", style: "contour", seed: 7, layout: "side", font: "kit", weight: 600, case: "as", track: -0.02, color: "kit", kit: false };
  let L = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) { return { ...DEF }; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const newSeed = () => 1 + Math.floor(Math.random() * 99999);

  // ---------- marks ----------
  // Every mark is drawn on a 100 x 100 board with three color slots, filled in for wherever it's shown:
  // INK (the main color), ACC (the accent) and BGC (the surface it sits on, for cut-outs).
  const BASE = {
    seed: 7, scale: 100, octaves: 1, warp: 0, angle: 0, features: 0, bump: 0, bumpSize: 50, usePoints: true, falloff: 1,
    levels: 6, gap: 10, bias: 0, weight: 1, swell: 0, swellSize: 100, taper: 0, indexEvery: 0, indexWeight: 1,
    smooth: 0.5, res: 2, minLen: 0, line: "#1c1c1e", line2: "#1c1c1e", gradient: false, bg: "#fff", transparent: true, opacity: 1, mode: "lines",
  };
  const inner = (svg) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const draw = (o, opts) => inner(T.buildSVG({ ...BASE, ...o, w: 100, h: 100 }, opts).svg).replace(/#1c1c1e/g, "INK");
  // Clip and gradient ids stay unique when many marks sit on one page.
  let uidN = 0;
  const uid = () => "lg" + (++uidN).toString(36);
  const initial = (name) => ([...String(name).trim()][0] || "A");

  function contourMark(r) {
    for (let tries = 0; tries < 6; tries++) {
      // The peak stays near the middle: rings that would run into the edge are dropped, so an
      // off-center peak leaves only a few small ones.
      const pts = [{ x: 0.45 + r() * 0.1, y: 0.45 + r() * 0.1, r: 1, s: 1 }];
      if (r() < 0.45) pts.push({ x: 0.3 + r() * 0.4, y: 0.3 + r() * 0.4, r: 1, s: 0.2 + r() * 0.25 });
      const body = draw({ pattern: "rings", seed: 1 + Math.floor(r() * 9999), warp: 0.05 + r() * 0.14, gap: 7 + r() * 2.5, weight: 3.4, smooth: 0.7, points: pts, minLen: 12 }, { closedOnly: true });
      const n = (body.match(/<path/g) || []).length;
      if (n < 2) continue;
      // One ring in the accent: the innermost or one partway out.
      let i = -1; const hit = r() < 0.5 ? 0 : Math.min(n - 1, 1 + Math.floor(r() * 2));
      const id = uid();
      return `<defs><clipPath id="${id}"><circle cx="50" cy="50" r="47"/></clipPath></defs><g clip-path="url(#${id})"><g transform="translate(50 50) scale(1.14) translate(-50 -50)">${body.replace(/stroke="INK"/g, (m) => (++i === hit ? 'stroke="ACC"' : m))}</g></g>`;
    }
    return `<circle cx="50" cy="50" r="30" fill="none" stroke="INK" stroke-width="5"/><circle cx="50" cy="50" r="12" fill="ACC"/>`;
  }
  function lensMark(r) {
    const y = 0.42 + r() * 0.12, id = uid();
    const body = draw({ pattern: "lines", angle: Math.round(r() * 40 - 20), gap: 13 + r() * 3.5, weight: 4, smooth: 0.6, falloff: 1.2, points: [{ x: 0.5, y, r: 24 + r() * 10, s: 0.9 + r() * 0.6 }], minLen: 8 });
    const cy = ((1 - y) * 100 + 4).toFixed(1);
    return `<defs><clipPath id="${id}"><circle cx="50" cy="50" r="46"/></clipPath></defs><g clip-path="url(#${id})">${body}</g><circle cx="50" cy="${cy}" r="7" fill="ACC" stroke="BGC" stroke-width="3"/>`;
  }
  function orbitMark(r) {
    const tilt = Math.round(-38 + r() * 76), R = 25 + r() * 6, rx = Math.min(48, R * (1.6 + r() * 0.2)), ry = rx * (0.24 + r() * 0.16);
    const a = r() * Math.PI * 2, sx = 50 + rx * Math.cos(a), sy = 50 + ry * Math.sin(a), front = Math.sin(a) > 0;
    const back = `M${50 - rx} 50A${rx} ${ry} 0 0 1 ${50 + rx} 50`, fwd = `M${50 - rx} 50A${rx} ${ry} 0 0 0 ${50 + rx} 50`;
    const sat = `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" fill="ACC" stroke="BGC" stroke-width="2.5"/>`;
    return `<g transform="rotate(${tilt} 50 50)"><path d="${back}" fill="none" stroke="ACC" stroke-width="4.5" stroke-linecap="round"/>${front ? "" : sat}</g>`
      + `<circle cx="50" cy="50" r="${R.toFixed(1)}" fill="INK"/>`
      + `<g transform="rotate(${tilt} 50 50)"><path d="${fwd}" fill="none" stroke="BGC" stroke-width="9" stroke-linecap="round"/><path d="${fwd}" fill="none" stroke="ACC" stroke-width="4.5" stroke-linecap="round"/>${front ? sat : ""}</g>`;
  }
  function strataMark(r) {
    const id = uid(), shape = Math.floor(r() * 3);
    const clip = shape === 0 ? `<circle cx="50" cy="50" r="47"/>` : shape === 1 ? `<path d="M6 94V50a44 44 0 0 1 88 0v44Z"/>` : `<rect x="5" y="5" width="90" height="90" rx="28"/>`;
    const n = 4 + Math.floor(r() * 3), A = 3 + r() * 5, f = 0.8 + r() * 1.4, ph = r() * 6.28, hit = Math.floor(r() * n), skew = 0.4 + r() * 0.6;
    let lines = "";
    for (let i = 0; i < n; i++) {
      const y0 = 14 + (i * 72) / (n - 1);
      let d = "";
      for (let x = -4; x <= 104; x += 4) d += `${d ? "L" : "M"}${x} ${(y0 + A * Math.sin((2 * Math.PI * f * x) / 100 + ph + i * skew)).toFixed(1)}`;
      lines += `<path d="${d}" fill="none" stroke="${i === hit ? "ACC" : "INK"}" stroke-width="${(56 / n / 1.9).toFixed(1)}" stroke-linecap="round"/>`;
    }
    return `<defs><clipPath id="${id}">${clip}</clipPath></defs><g clip-path="url(#${id})">${lines}</g>`;
  }
  function bloomMark(r) {
    const n = 5 + Math.floor(r() * 5), Lp = 38 + r() * 8, wp = 8 + r() * 9, turn = r() * 360, open = r() < 0.35;
    const petal = `M50 50C${50 + wp} ${50 - Lp * 0.35} ${50 + wp * 0.6} ${50 - Lp * 0.85} 50 ${50 - Lp}C${50 - wp * 0.6} ${50 - Lp * 0.85} ${50 - wp} ${50 - Lp * 0.35} 50 50Z`;
    let g = "";
    for (let i = 0; i < n; i++) g += `<path d="${petal}" transform="rotate(${(turn + (360 / n) * i).toFixed(1)} 50 50)" ${open ? 'fill="none" stroke="INK" stroke-width="3.6" stroke-linejoin="round"' : 'fill="INK"'}${!open && i % 2 ? ' opacity=".72"' : ""}/>`;
    return g + `<circle cx="50" cy="50" r="${open ? 8 : 9}" fill="ACC" stroke="BGC" stroke-width="3"/>`;
  }
  function peaksMark(r) {
    const base = 84, n = 2 + (r() < 0.5 ? 1 : 0), peaks = [];
    for (let i = 0; i < n; i++) { const x = n === 2 ? [36, 64][i] : [26, 50, 74][i]; peaks.push([x + (r() - 0.5) * 10, 26 + r() * 26, 24 + r() * 10]); }
    const front = peaks.reduce((b, p, i) => (p[1] < peaks[b][1] ? i : b), 0);
    const tri = ([x, y, w], fill, op) => `<path d="M${(x - w).toFixed(1)} ${base}L${x.toFixed(1)} ${y.toFixed(1)}L${(x + w).toFixed(1)} ${base}Z" fill="${fill}" stroke="${fill}" stroke-width="7" stroke-linejoin="round"${op ? ` opacity="${op}"` : ""}/>`;
    const sunX = r() < 0.5 ? 24 + r() * 10 : 66 + r() * 10, sunY = 18 + r() * 10;
    let g = `<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${(8 + r() * 4).toFixed(1)}" fill="ACC"/>`;
    peaks.forEach((p, i) => { if (i !== front) g += tri(p, "INK", ".5"); });
    g += tri(peaks[front], "INK");
    // A snow line across the highest summit, cut out of it.
    const [x, y, w] = peaks[front], t = 0.38, yy = y + (base - y) * t, dx = w * t;
    g += `<path d="M${(x - dx).toFixed(1)} ${yy.toFixed(1)}l${(dx * 0.5).toFixed(1)} 5l${(dx * 0.5).toFixed(1)} -5l${(dx * 0.5).toFixed(1)} 5l${(dx * 0.5).toFixed(1)} -5" fill="none" stroke="BGC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    return g;
  }
  function monogramMark(r, ctx) {
    const a0 = r() * 360, gap = 50 + r() * 40, R = 41, rad = (d) => (d * Math.PI) / 180;
    const a1 = a0 + 360 - gap, p = (d) => `${(50 + R * Math.cos(rad(d))).toFixed(1)} ${(50 + R * Math.sin(rad(d))).toFixed(1)}`;
    const end = p(a1).split(" ");
    const ch = esc(applyCase(initial(L.name), ctx.case === "lower" ? "lower" : "upper"));
    return `<path d="M${p(a0)}A${R} ${R} 0 1 1 ${p(a1)}" fill="none" stroke="INK" stroke-width="6" stroke-linecap="round"/><circle cx="${end[0]}" cy="${end[1]}" r="6.5" fill="ACC" stroke="BGC" stroke-width="3"/>`
      + `<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="'${esc(ctx.font)}', system-ui, sans-serif" font-weight="${ctx.weight}" font-size="46" fill="INK">${ch}</text>`;
  }
  const MAKERS = { contour: contourMark, lens: lensMark, orbit: orbitMark, strata: strataMark, bloom: bloomMark, peaks: peaksMark, monogram: monogramMark };
  // Marks are kept by style, seed and (for the monogram) the letter and its face, so repaints are free.
  const markCache = new Map();
  function markBody(style, seed, ctx) {
    const k = style + ":" + seed + (style === "monogram" ? `:${initial(L.name)}:${ctx.font}:${ctx.weight}:${ctx.case}` : "");
    if (!markCache.has(k)) { if (markCache.size > 200) markCache.clear(); markCache.set(k, (MAKERS[style] || contourMark)(T.mulberry32(seed * 7919 + style.length), ctx)); }
    return markCache.get(k);
  }
  const paint = (body, c) => body.replace(/INK/g, c.ink).replace(/ACC/g, c.acc).replace(/BGC/g, c.bg);

  // ---------- type and color ----------
  const applyCase = (t, cs) => (cs === "lower" ? t.toLowerCase() : cs === "upper" ? t.toUpperCase() : t);
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
    const f = face(), style = opts.style || L.style, seed = opts.seed ?? L.seed, layout = opts.layout || L.layout;
    loadFont(f.font);
    const mark = layout === "name" ? "" : `<svg class="lg-m" viewBox="0 0 100 100" aria-hidden="true">${paint(markBody(style, seed, f), c)}</svg>`;
    const name = layout === "mark" ? "" : `<span class="lg-w" style="font-family:'${esc(f.font)}',system-ui,sans-serif;font-weight:${f.weight};letter-spacing:${f.track}em;color:${c.ink}">${esc(word())}</span>`;
    return `<span class="lg lg-${layout}" role="img" aria-label="${esc(word())} logo">${mark}${name}</span>`;
  }
  // The finished logo as one standalone SVG, with the font embedded where it can be fetched, so it
  // renders the same anywhere (an SVG drawn as a picture can't reach the page's fonts).
  const fontCSS = new Map();
  async function embedFont(font, weight) {
    const k = font + weight;
    if (!fontCSS.has(k)) fontCSS.set(k, (async () => {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@${weight}&display=swap`)).text();
        // The Latin block is the last one listed; it covers names typed in Latin letters.
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
    const mark = layout === "name" ? "" : paint(markBody(L.style, L.seed, f), c);
    let w, h, body = "";
    const txt = (x, y, anchor) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="central" font-family="'${esc(f.font)}', system-ui, sans-serif" font-weight="${f.weight}" font-size="${fs}" letter-spacing="${(f.track * fs).toFixed(2)}" fill="${c.ink}">${esc(text)}</text>`;
    if (layout === "side") { w = H + H * 0.26 + tw; h = H; body = `<g>${mark}</g>` + txt(H * 1.26, H / 2 + 2, "start"); }
    else if (layout === "stack") { w = Math.max(H, tw); h = H + 18 + fs * 1.1; body = `<g transform="translate(${((w - H) / 2).toFixed(1)} 0)">${mark}</g>` + txt(w / 2, H + 18 + fs * 0.55, "middle"); }
    else if (layout === "mark") { w = H; h = H; body = mark; }
    else { w = tw; h = fs * 1.3; body = txt(0, h / 2, "start"); }
    const W = Math.ceil(w + pad * 2), Hh = Math.ceil(h + pad * 2);
    const css = layout === "mark" && L.style !== "monogram" ? "" : await embedFont(f.font, f.weight);
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
  const kitKey = () => (L.kit ? [L.style, L.seed, L.layout, L.name, L.case, L.weight].join("|") : "");
  function kitBrand() {
    if (!L.kit) return "";
    const f = face(), c = { ink: "var(--k-text)", acc: "var(--k-accent)", bg: "var(--k-surface)" };
    const mark = L.layout === "name" ? "" : `<svg class="k-mark-x" viewBox="0 0 100 100" aria-hidden="true">${paint(markBody(L.style, L.seed, f), c)}</svg>`;
    return `<span class="k-brand">${mark}${L.layout === "mark" ? "" : `<span class="k-word">${esc(word())}</span>`}</span>`;
  }
  const syncKit = () => root.Components?.brand?.();

  // ---------- the page ----------
  let built = false, artURL = "", artKey = "", varSeeds = [];
  const changed = (opts = {}) => { save(); render(); if (opts.kit !== false) syncKit(); if (opts.home !== false) homePreview(); };
  function seg(host, opts, get, set) {
    const el = document.createElement("div"); el.className = "seg sm";
    el.innerHTML = opts.map(([v, l, t]) => `<button data-v="${v}"${t ? ` data-tip="${esc(t)}"` : ""} class="${String(get()) === String(v) ? "on" : ""}">${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v); for (const x of el.querySelectorAll("button")) x.classList.toggle("on", x === b); changed(); };
    host.appendChild(el); return el;
  }
  const sub = (host, t) => host.insertAdjacentHTML("beforeend", `<h3 class="sub">${t}</h3>`);
  function build() {
    built = true;
    const page = $("assetsPage");
    page.innerHTML = `<aside class="options as-panel" aria-label="Logo settings"><h2 class="col-title">Logo</h2><p class="lede">A mark and a name for your project, in your kit's font and colors.</p><div id="asOpts"></div></aside>
      <section class="as-stage" aria-label="Logo preview"><div class="as-scroll" id="asStage"></div>
        <div class="as-bar glass" role="toolbar" aria-label="Logo"><button class="bar-btn surprise" id="asShuffle" title="A new take on this style">Shuffle<kbd>R</kbd></button><button class="bar-btn" id="asRoll" title="A different style">New style<kbd><svg class="ic kbd-ic"><use href="#i-shift"/></svg>R</kbd></button><span class="bar-sep"></span><button class="bar-btn" id="asSvg">SVG</button><button class="bar-btn" id="asPng">PNG</button><button class="bar-btn" id="asCopy">Copy SVG</button></div></section>`;
    const o = $("asOpts");
    o.insertAdjacentHTML("beforeend", `<h3 class="sub first">Name</h3><input class="field as-name" id="asName" maxlength="40" spellcheck="false" autocomplete="off" aria-label="Name">`);
    const nm = $("asName"); nm.value = L.name;
    nm.oninput = () => { L.name = nm.value; save(); render(); clearTimeout(nm._t); nm._t = setTimeout(() => { syncKit(); homePreview(); }, 250); };
    sub(o, "Mark");
    const grid = document.createElement("div"); grid.className = "as-styles"; grid.id = "asStyles"; o.appendChild(grid);
    grid.onclick = (e) => { const b = e.target.closest("[data-s]"); if (!b) return; L.style = b.dataset.s; changed(); };
    sub(o, "Layout");
    seg(o, [["side", "Side"], ["stack", "Stacked"], ["mark", "Mark", "The mark alone, as for an app icon"], ["name", "Name", "The name alone, as a wordmark"]], () => L.layout, (v) => (L.layout = v));
    sub(o, "Type");
    const sel = document.createElement("select"); sel.className = "field as-font"; sel.id = "asFont"; sel.setAttribute("aria-label", "Font");
    o.appendChild(sel);
    sel.onchange = () => { L.font = sel.value; changed(); };
    const row = document.createElement("div"); row.className = "as-row2"; o.appendChild(row);
    seg(row, [[400, "Regular"], [500, "Medium"], [600, "Semibold"], [700, "Bold"]], () => L.weight, (v) => (L.weight = v));
    seg(o, [["as", "As typed"], ["lower", "lowercase"], ["upper", "UPPER"]], () => L.case, (v) => (L.case = v)).classList.add("as-case");
    o.insertAdjacentHTML("beforeend", `<div class="ctrl"><div class="label-row"><span class="label">Letter spacing</span><span class="val-static mono" id="asTrackV"></span></div><input type="range" id="asTrack" min="-0.08" max="0.2" step="0.005" aria-label="Letter spacing"></div>`);
    const tr = $("asTrack");
    const paintTrack = () => { tr.value = L.track; tr.style.setProperty("--p", ((L.track + 0.08) / 0.28) * 100 + "%"); $("asTrackV").textContent = (L.track >= 0 ? "+" : "") + Math.round(L.track * 1000) / 10 + "%"; };
    tr.oninput = () => { L.track = +tr.value; paintTrack(); save(); render(); };
    tr.onchange = () => changed();
    paintTrack();
    sub(o, "Color");
    seg(o, [["kit", "Kit", "The kit's text and accent colors"], ["palette", "Palette", "Picked from the palette tool's colors"], ["mono", "One color", "Ink alone, no accent"]], () => L.color, (v) => (L.color = v));
    o.insertAdjacentHTML("beforeend", `<label class="set-row as-kit"><span><b>Use in Components</b><small>The kit's preview wears this logo instead of Margin's</small></span><span class="switch"><input type="checkbox" id="asKit"${L.kit ? " checked" : ""}><span></span></span></label>`);
    $("asKit").onchange = (e) => { L.kit = e.target.checked; changed(); };
    $("asShuffle").onclick = () => shuffle();
    $("asRoll").onclick = () => newStyle();
    $("asSvg").onclick = async () => root.downloadBlob?.(new Blob([await exportSVG()], { type: "image/svg+xml" }), fileBase() + ".svg", "Logo saved");
    $("asPng").onclick = async () => { const b = await exportPNG(); if (b) root.downloadBlob?.(b, fileBase() + ".png", "Logo saved"); };
    $("asCopy").onclick = async () => { try { await navigator.clipboard.writeText(await exportSVG()); root.toastMsg?.("Logo SVG copied"); } catch (e) { root.toastMsg?.("Couldn't copy"); } };
    $("asStage").onclick = (e) => {
      const v = e.target.closest("[data-var]"); if (!v) return;
      const [s, seed] = v.dataset.var.split(":"); L.style = s; L.seed = +seed; rollVars(); changed();
    };
  }
  function renderStyles() {
    const f = face(), c = colors();
    $("asStyles").innerHTML = STYLES.map(([id, name, tip]) => `<button class="as-style${L.style === id ? " on" : ""}" data-s="${id}" data-tip="${esc(tip)}"><svg viewBox="0 0 100 100" aria-hidden="true">${paint(markBody(id, id === L.style ? L.seed : 7, f), c)}</svg><span>${name}</span></button>`).join("");
  }
  function renderFonts() {
    const sel = $("asFont"), t = kitTokens(), kitF = t?.font.heading || "Instrument Sans";
    sel.innerHTML = `<option value="kit">Kit font (${esc(kitF)})</option>` + FONTS.map((f) => `<option value="${esc(f)}"${L.font === f ? " selected" : ""}>${esc(f)}</option>`).join("");
    sel.value = L.font === "kit" || FONTS.includes(L.font) ? L.font : "kit";
  }
  // Alternatives under the previews: four more of this style, then four other styles.
  function rollVars() {
    const others = STYLES.map(([id]) => id).filter((s) => s !== L.style).sort(() => Math.random() - 0.5).slice(0, 4);
    varSeeds = [...[0, 1, 2, 3].map(() => [L.style, newSeed()]), ...others.map((s) => [s, newSeed()])];
  }
  function render() {
    if (!built || root.Shell?.route !== "assets") return;
    const c = colors(), d = onDark(c), a = onAccent(c), f = face();
    renderStyles();
    if (!varSeeds.length) rollVars();
    const icon = (n, cc) => `<span class="as-icon" style="--n:${n}px;background:${cc.bg}"><svg viewBox="0 0 100 100" aria-hidden="true">${paint(markBody(L.style, L.seed, f), cc)}</svg></span>`;
    $("asStage").innerHTML = `
      <div class="as-hero" style="background:${c.bg}">${logoHTML(c)}</div>
      <div class="as-tiles">
        <div class="as-tile" style="background:${d.bg}">${logoHTML(d)}</div>
        <div class="as-tile" style="background:${a.bg}">${logoHTML(a)}</div>
        <div class="as-tile as-art" style="background-color:${d.bg}${artURL ? `;background-image:url('${artURL}')` : ""}">${logoHTML({ ink: "#ffffff", acc: "#ffffff", bg: "rgba(0,0,0,0)" })}</div>
      </div>
      <div class="as-icons">
        <div class="as-icon-row">${icon(112, c)}${icon(72, c)}${icon(44, d)}${icon(28, a)}</div>
        <div class="as-tab"><span class="as-tab-in"><svg viewBox="0 0 100 100" aria-hidden="true">${paint(markBody(L.style, L.seed, f), { ...c, bg: "#ffffff" })}</svg><span>${esc(word())}</span><i></i></span></div>
      </div>
      <h3 class="sub">More like this</h3>
      <div class="as-vars">${varSeeds.map(([s, seed]) => `<button class="as-var" data-var="${s}:${seed}" style="background:${c.bg}" title="${esc(STYLES.find((x) => x[0] === s)[1])}">${logoHTML(c, { style: s, seed, layout: "mark" })}</button>`).join("")}</div>`;
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
  function shuffle() { L.seed = newSeed(); rollVars(); changed(); }
  function newStyle() { const o = STYLES.map(([id]) => id).filter((s) => s !== L.style); L.style = o[Math.floor(Math.random() * o.length)]; L.seed = newSeed(); rollVars(); changed(); }
  function onShow() {
    if (!built) build();
    renderFonts();
    render();
    const p = document.querySelector(".page.as");
    if (p && !reduce.matches) { p.classList.remove("enter"); void p.offsetWidth; p.classList.add("enter"); clearTimeout(p._t); p._t = setTimeout(() => p.classList.remove("enter"), 900); }
  }
  addEventListener("keydown", (e) => {
    if (root.Shell?.route !== "assets" || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if ((e.key || "").toLowerCase() === "r" || e.code === "KeyR") { e.preventDefault(); e.shiftKey ? newStyle() : shuffle(); }
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
  const LOOK = ["style", "seed", "layout"];
  const look = () => Object.fromEntries(LOOK.map((k) => [k, L[k]]));
  const okLook = { style: (v) => v in MAKERS, seed: (v) => Number.isFinite(v), layout: (v) => ["side", "stack", "mark", "name"].includes(v) };
  function setLook(l) { if (!l || typeof l !== "object") return; for (const k of LOOK) if (okLook[k](l[k])) L[k] = l[k]; save(); rollVars(); render(); syncKit(); homePreview(); }
  function remix() { L.style = STYLES[Math.floor(Math.random() * STYLES.length)][0]; L.seed = newSeed(); save(); rollVars(); render(); syncKit(); }

  root.Assets = {
    onShow, preview: homePreview, look, setLook, remix, kitBrand, kitKey,
    // For agents and scripts.
    state: () => ({ ...L }), set: (p) => { Object.assign(L, p || {}); changed(); return { ...L }; }, styles: () => STYLES.map(([id, name, what]) => ({ id, name, what })),
    svg: () => exportSVG(), png: (scale) => exportPNG(scale),
  };
})(window);
