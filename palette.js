// Palettes: a column-per-color palette generator. Space generates new colors for every unlocked column, in
// OKLCH so lightness and chroma stay even. Columns show the nearest color name and contrast, can be locked,
// edited with the shared picker, swapped for a tint or shade, reordered, saved and sent to the studio.
(function (root) {
  "use strict";
  const C = root.Color, picker = root.ColorPicker;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const KEY = "isoline-palette", SAVED = "isoline-saved-palettes";
  // Harmonies: [id, name, what it does].
  const MODES = [
    ["auto", "Auto", "A different harmony every time you generate"],
    ["analogous", "Analogous", "Neighboring hues that blend calmly"],
    ["mono", "Monochrome", "One hue in steps from light to dark"],
    ["complement", "Complement", "A hue and its opposite, for strong contrast"],
    ["triad", "Triad", "Three hues spaced evenly around the wheel"],
    ["split", "Split", "A hue plus the two either side of its opposite"],
    ["pastel", "Pastel", "Light and soft, low in chroma"],
    ["vivid", "Vivid", "Saturated colors with punch"],
    ["earth", "Earthy", "Muted ochres, clays and olives"],
  ];

  let st = { cols: [], mode: "auto" };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(SAVED) || "[]"); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const saveLib = () => { try { localStorage.setItem(SAVED, JSON.stringify(saved)); } catch (e) {} root.dispatchEvent(new Event("palettes-saved")); };
  let hist = [], hi = -1;
  const snap = () => { hist = hist.slice(0, hi + 1); hist.push(JSON.stringify(st.cols)); if (hist.length > 100) hist.shift(); hi = hist.length - 1; syncBar(); };
  const travel = (d) => { const n = hi + d; if (n < 0 || n >= hist.length) return; hi = n; st.cols = JSON.parse(hist[hi]); glide(() => render(true)); save(); syncBar(); };

  // Generation: pick a base hue (from the first locked color, if any), lay hues out by the harmony,
  // and spread lightness evenly so the palette always has a dark, a light and steps between.
  // rand is swappable so the mode menu can draw stable samples of each harmony.
  function makePalette(mode, n, base, rand = Math.random) {
    const r = (a, b) => a + rand() * (b - a);
    const H = base[2], spread = r(14, 32), flip = rand() < 0.5;
    const hueAt = (i) => {
      const k = i - (n - 1) / 2;
      switch (mode) {
        case "analogous": return H + k * spread;
        case "mono": return H + r(-4, 4);
        case "complement": return H + (i % 2 ? 180 : 0) + r(-8, 8);
        case "triad": return H + (i % 3) * 120;
        case "split": return H + [0, 150, 210][i % 3];
        case "earth": return r(25, 95);
        default: return H + k * spread * 1.4;
      }
    };
    const [Llo, Lhi] = mode === "pastel" ? [0.72, 0.96] : mode === "vivid" ? [0.42, 0.85] : [0.22 + r(0, 0.08), 0.93 + r(0, 0.04)];
    const Cb = mode === "pastel" ? r(0.04, 0.09) : mode === "vivid" ? r(0.16, 0.24) : mode === "earth" ? r(0.03, 0.09) : mode === "mono" ? r(0.05, 0.14) : r(0.07, 0.16);
    const out = Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1), L = Llo + (Lhi - Llo) * (flip ? 1 - t : t) + r(-0.03, 0.03);
      const edge = 1 - Math.abs(t - 0.5) * 0.9; // ends carry less chroma, like real palettes
      return C.fromOklch(L, Cb * (0.55 + 0.6 * edge) * r(0.85, 1.15), (hueAt(i) + 360) % 360);
    });
    if (!flip) out.sort((a, b) => C.toOklch(a)[0] - C.toOklch(b)[0]);
    return out;
  }
  function generate() {
    const n = st.cols.length, locked = st.cols.filter((c) => c.lock);
    const mode = st.mode === "auto" ? MODES[1 + Math.floor(Math.random() * (MODES.length - 1))][0] : st.mode;
    const base = locked.length ? C.toOklch(locked[0].hex) : [0.6, rnd(0.08, 0.17), rnd(0, 360)];
    const fresh = makePalette(mode, n, base);
    let j = 0;
    morph(st.cols.map((c) => (c.lock ? c : { hex: fresh[j++], lock: false })));
  }
  // Samples for the mode menu: the same harmony from the current palette's hue, seeded so they hold still.
  const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function sampleOf(mode) {
    if (mode === "auto") return [0, 72, 144, 216, 288].map((h, i) => C.fromOklch(0.62 + (i % 2) * 0.12, 0.13, (h + 20) % 360));
    const lead = st.cols.find((c) => c.lock) || st.cols[Math.floor(st.cols.length / 2)];
    const base = lead ? C.toOklch(lead.hex) : [0.6, 0.12, 30];
    return makePalette(mode, 5, [0.6, 0.12, Math.round(base[2] / 10) * 10], seeded(MODES.findIndex((m) => m[0] === mode) * 97 + 7)).sort((a, b) => C.toOklch(b)[0] - C.toOklch(a)[0]);
  }
  const dots = (hexes) => hexes.map((h) => `<i style="background:${h}"></i>`).join("");
  // Vary: nudge every unlocked color a little in hue, lightness and chroma, keeping the palette's character.
  function vary() {
    morph(st.cols.map((c) => {
      if (c.lock) return c;
      const [L, Ch, H] = C.toOklch(c.hex);
      return { hex: C.fromOklch(clamp(L + rnd(-0.05, 0.05), 0.12, 0.98), Ch * rnd(0.85, 1.15), (H + rnd(-14, 14) + 360) % 360), lock: false };
    }));
  }
  // New colors sweep across the columns as a wave: each column blends to its new color in OKLab while
  // its hex rolls through the in-between values, then the name settles.
  let morphing = 0;
  function morph(next) {
    const prev = st.cols.map((c) => c.hex);
    st.cols = next; snap(); save();
    const els = [...colsEl.children];
    if (els.length !== next.length || matchMedia("(prefers-reduced-motion: reduce)").matches) { render(true); return; }
    const tok = ++morphing, t0 = performance.now(), dur = 560, gap = 70;
    els.forEach((el, i) => { if (prev[i] !== next[i].hex) el.classList.add("morphing"); });
    const step = (now) => {
      if (tok !== morphing) return;
      let busy = false;
      els.forEach((el, i) => {
        if (prev[i] === next[i].hex) return;
        const t = clamp((now - t0 - i * gap) / dur, 0, 1), e = 1 - Math.pow(1 - t, 3);
        if (t < 1) busy = true;
        paintCol(el, t >= 1 ? next[i].hex : C.mixOklab(prev[i], next[i].hex, e), t >= 1);
      });
      if (busy) requestAnimationFrame(step); else { render(true); }
    };
    requestAnimationFrame(step);
    toneBar(next.map((c) => c.hex));
  }
  function paintCol(el, hex, final) {
    const on = textOn(hex);
    el.style.setProperty("--c", hex); el.style.setProperty("--on", on);
    el.querySelector(".pt-hex").textContent = hex.slice(1).toUpperCase();
    if (final) { el.querySelector(".pt-name").textContent = C.name(hex); el.querySelector(".pt-ratio").textContent = `Contrast ${C.contrast(hex, on).toFixed(1)}`; el.classList.remove("morphing"); }
  }
  // ---------- columns ----------
  const colsEl = $("ptCols");
  const textOn = (hex) => (C.contrast(hex, "#ffffff") >= C.contrast(hex, "#111111") ? "#ffffff" : "#111111");
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.22,1,.36,1)";
  let shadesFor = -1;
  function colHTML(c, i) {
    const on = textOn(c.hex), ratio = C.contrast(c.hex, on);
    const shades = shadesFor === i ? `<div class="pt-shades">${shadeList(c.hex).map((h) => `<button data-shade="${h}" style="background:${h}" aria-label="${h}"${h === c.hex ? ' class="on"' : ""}></button>`).join("")}</div>` : "";
    return `<div class="pt-col${c.lock ? " locked" : ""}" data-i="${i}" style="--c:${c.hex};--on:${on}">
      ${shades}
      <div class="pt-tools">
        <button class="pt-t" data-a="lock" title="${c.lock ? "Unlock" : "Lock"}">${ic(c.lock ? "lock" : "unlock")}</button>
        <button class="pt-t" data-a="edit" title="Edit">${ic("sliders")}</button>
        <button class="pt-t" data-a="shades" title="Tints and shades">${ic("shades")}</button>
        <button class="pt-t" data-a="copy" title="Copy hex">${ic("copy")}</button>
        <span class="pt-t grip" data-a="drag" title="Drag to reorder">${ic("grip")}</span>
        ${st.cols.length > 2 ? `<button class="pt-t" data-a="remove" title="Remove">${ic("x")}</button>` : ""}
      </div>
      <div class="pt-info"><b class="pt-hex">${c.hex.slice(1).toUpperCase()}</b><span class="pt-name">${C.name(c.hex)}</span><span class="pt-ratio">Contrast ${ratio.toFixed(1)}</span></div>
      ${st.cols.length < 10 ? `<button class="pt-add" data-a="add" title="Add a color here">${ic("plus")}</button>` : ""}
    </div>`;
  }
  const shadeList = (hex) => { const [, c, h] = C.toOklch(hex); return [0.96, 0.88, 0.79, 0.7, 0.6, 0.5, 0.41, 0.32, 0.23].map((L) => C.fromOklch(L, c * (1 - Math.abs(L - 0.6) * 0.9), h)); };
  // Keys follow each color through reorders (repeats of one hex count up), so moves can glide.
  const keysOf = () => { const n = {}; return st.cols.map((c) => c.hex + ":" + (n[c.hex] = (n[c.hex] || 0) + 1)); };
  // Only colors that changed repaint, so a generate reads as a wave rather than a blink.
  function render(all) {
    const have = [...colsEl.children];
    if (all || have.length !== st.cols.length) colsEl.innerHTML = st.cols.map(colHTML).join("");
    else st.cols.forEach((c, i) => { const el = have[i]; if (el.dataset.hex === c.hex && el.dataset.lock === String(c.lock) && shadesFor !== i && !el.querySelector(".pt-shades")) return; const n = document.createRange().createContextualFragment(colHTML(c, i)).firstElementChild; n.style.setProperty("--delay", i * 40 + "ms"); n.classList.add("swap"); el.replaceWith(n); });
    const keys = keysOf();
    [...colsEl.children].forEach((el, i) => { el.dataset.hex = st.cols[i].hex; el.dataset.lock = String(st.cols[i].lock); el.dataset.key = keys[i]; el.style.flexGrow = st.weighted ? weightOf(i, st.cols.length) : ""; });
    toneBar(st.cols.map((c) => c.hex));
    syncBar(); root.dispatchEvent(new Event("palette-change"));
  }
  // Reorders (sort, undo, loading) glide each column to its new place.
  const glide = (fn) => (root.UI ? root.UI.flip(colsEl, fn, { sel: ".pt-col" }) : fn());
  // A column grows in from nothing, or folds away, while its neighbors make room.
  function growIn(i) {
    const el = colsEl.children[i]; if (!el || reduce()) return;
    const g = st.weighted ? weightOf(i, st.cols.length) : 1;
    el.animate([{ flexGrow: 0.0001, opacity: 0 }, { flexGrow: g, opacity: 1 }], { duration: 460, easing: EASE });
  }
  function foldOut(el, done) {
    if (reduce()) { done(); return; }
    el.style.minWidth = "0"; el.style.overflow = "hidden";
    el.animate([{ flexGrow: getComputedStyle(el).flexGrow, opacity: 1 }, { flexGrow: 0.0001, opacity: 0 }], { duration: 380, easing: EASE, fill: "forwards" }).onfinish = done;
  }
  colsEl.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a], [data-shade]"); if (!b) return;
    const el = b.closest(".pt-col"), i = +el.dataset.i, c = st.cols[i];
    if (b.dataset.shade) { c.hex = b.dataset.shade; closeShades(() => { snap(); render(true); save(); }); return; }
    const a = b.dataset.a;
    if (a === "lock") {
      // Patched in place: the icon flips and the other tools fade, without repainting the column.
      c.lock = !c.lock; save();
      el.classList.toggle("locked", c.lock); el.dataset.lock = String(c.lock);
      b.dataset.tip = c.lock ? "Unlock" : "Lock"; b.setAttribute("aria-label", b.dataset.tip);
      b.querySelector("use").setAttribute("href", c.lock ? "#i-lock" : "#i-unlock");
      if (!reduce()) b.querySelector("svg").animate([{ transform: "scale(.6) rotate(-12deg)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.34,1.5,.5,1)" });
      syncBar();
    }
    else if (a === "copy") { try { await navigator.clipboard.writeText(c.hex); root.toastMsg?.(`Copied ${c.hex}`); } catch (err) { root.toastMsg?.("Clipboard is blocked here"); } }
    else if (a === "remove") { shadesFor = -1; foldOut(el, () => { st.cols.splice(i, 1); snap(); render(true); save(); }); }
    else if (a === "shades") { if (shadesFor === i) closeShades(() => render(true)); else { shadesFor = i; render(true); } }
    else if (a === "add") {
      const next = st.cols[i + 1]?.hex;
      st.cols.splice(i + 1, 0, { hex: next ? C.mixOklab(c.hex, next, 0.5) : C.fromOklch(...((l) => [clamp(l[0] + 0.12, 0, 0.97), l[1], l[2]])(C.toOklch(c.hex))), lock: false });
      snap(); render(true); save(); growIn(i + 1);
    } else if (a === "edit") {
      picker.open(b, c.hex, (v) => { c.hex = v; el.style.setProperty("--c", v); el.style.setProperty("--on", textOn(v)); el.querySelector(".pt-hex").textContent = v.slice(1).toUpperCase(); el.querySelector(".pt-name").textContent = C.name(v); toneBar(st.cols.map((x) => x.hex)); }, () => { snap(); render(); save(); }, [["Palette", st.cols.map((x) => x.hex)], ["Shades", shadeList(c.hex).filter((_, k) => k % 2 === 0)]]);
    }
  });
  // Tints and shades fold back up before the column repaints.
  function closeShades(done) {
    const sh = colsEl.querySelector(".pt-shades"); shadesFor = -1;
    if (!sh || reduce()) { done(); return; }
    sh.animate([{ opacity: 1, clipPath: "inset(0 0 0 0)" }, { opacity: 0.6, clipPath: "inset(0 0 100% 0)" }], { duration: 260, easing: EASE, fill: "forwards" }).onfinish = done;
  }
  colsEl.addEventListener("click", (e) => { if (e.target.closest(".pt-hex")) { const i = +e.target.closest(".pt-col").dataset.i; navigator.clipboard?.writeText(st.cols[i].hex).then(() => root.toastMsg?.(`Copied ${st.cols[i].hex}`)).catch(() => {}); } });
  // Drag a column's grip sideways (or vertically on phones) to reorder. The column follows the pointer,
  // its neighbors slide aside to open a gap, and on release it settles into the gap.
  colsEl.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".grip"); if (!g || e.button > 0) return;
    e.preventDefault();
    const el = g.closest(".pt-col"), items = [...colsEl.children], from = items.indexOf(el);
    if (from < 0) return;
    const vert = getComputedStyle(colsEl).flexDirection === "column";
    const rects = items.map((it) => it.getBoundingClientRect());
    const len = (r) => (vert ? r.height : r.width), lead = (r) => (vert ? r.top : r.left);
    const size = len(rects[from]), start = vert ? e.clientY : e.clientX, T = (v) => (vert ? `translateY(${v}px)` : `translateX(${v}px)`);
    const lo = lead(rects[0]) - lead(rects[from]), hi = lead(rects[rects.length - 1]) + len(rects[rects.length - 1]) - (lead(rects[from]) + size);
    let to = from, d = 0;
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
    colsEl.classList.add("sorting"); el.classList.add("dragging");
    const move = (ev) => {
      d = clamp((vert ? ev.clientY : ev.clientX) - start, lo, hi);
      el.style.transform = T(d);
      const mid = lead(rects[from]) + size / 2 + d;
      let t = 0;
      rects.forEach((r, k) => { if (k !== from && mid > lead(r) + len(r) / 2) t++; });
      if (t === to) return;
      to = t;
      items.forEach((it, k) => {
        if (k === from) return;
        const s = from < to && k > from && k <= to ? -size : from > to && k >= to && k < from ? size : 0;
        it.style.transform = s ? T(s) : "";
      });
    };
    const up = () => {
      g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); g.removeEventListener("pointercancel", up);
      // Where the column lands: past the neighbors it displaced.
      let off = 0;
      if (to > from) for (let k = from + 1; k <= to; k++) off += len(rects[k]);
      else for (let k = to; k < from; k++) off -= len(rects[k]);
      el.classList.remove("dragging"); el.classList.add("settling");
      el.style.transform = T(off);
      const done = (ev) => {
        if (ev && (ev.target !== el || ev.propertyName !== "transform")) return;
        el.removeEventListener("transitionend", done); clearTimeout(tm);
        colsEl.classList.remove("sorting");
        if (to !== from) { const [c] = st.cols.splice(from, 1); st.cols.splice(to, 0, c); snap(); save(); }
        colsEl.classList.add("still"); render(true); void colsEl.offsetWidth; colsEl.classList.remove("still");
      };
      const tm = setTimeout(() => done(), reduce() || Math.abs(off - d) < 1 ? 0 : 420);
      if (!reduce() && Math.abs(off - d) >= 1) el.addEventListener("transitionend", done);
    };
    g.addEventListener("pointermove", move); g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
  });

  // Proportions: size columns by a 60-30-10 style split, the first color dominant and the last an accent.
  function weightOf(i, n) { const w = [60, 30, 10].concat(Array(8).fill(6)); if (n <= 3) return w[i]; const base = [44, 22, 12]; return i < 3 ? base[i] : 22 / (n - 3); }

  // The glass bar takes no tint, so its ink follows the colors beneath it. Each control reads the column
  // under its own center and takes whichever of light or dark ink reads better there, like text on
  // real glass over a busy backdrop.
  const bar = document.querySelector(".pt-bar");
  const DARK = "#141414", inkOn = (hex) => (C.contrast(hex, "#ffffff") > C.contrast(hex, DARK) ? "#ffffff" : DARK);
  function toneBar(hexes) {
    const els = [...colsEl.children];
    if (!bar.offsetWidth || els.length !== hexes.length) return;
    const rects = els.map((el) => el.getBoundingClientRect());
    for (const c of bar.children) {
      if (c.classList.contains("primary")) continue;
      const r = c.getBoundingClientRect(), x = r.left + r.width / 2;
      let k = rects.findIndex((q) => x >= q.left && x < q.right);
      if (k < 0) k = x < rects[0].left ? 0 : rects.length - 1;
      c.style.setProperty("--glass-ink", inkOn(hexes[k]));
    }
  }
  new ResizeObserver(() => toneBar(st.cols.map((c) => c.hex))).observe(colsEl);

  // ---------- bar ----------
  // Harmony picker: the trigger shows the chosen harmony as color dots; the menu lists every harmony
  // with a sample drawn from the current palette's hue, and a tooltip saying what each one does.
  function renderModes() {
    $("ptModeMenu").innerHTML = `<h3>Harmony</h3>` + MODES.map(([k, l, tip]) => `<button class="opt pt-mode${k === st.mode ? " on" : ""}" data-m="${k}" data-tip="${tip}" data-tip-pos="right"><span>${l}</span><span class="pt-dots">${dots(sampleOf(k))}</span></button>`).join("");
  }
  $("ptModeMenu").onclick = (e) => { const b = e.target.closest("[data-m]"); if (!b) return; st.mode = b.dataset.m; $("ptModeMenu").hidden = true; root.UI?.tip.hide(); save(); syncBar(); generate(); };
  $("ptGen").onclick = generate;
  $("ptVary").onclick = vary;
  $("ptWeights").onclick = () => { st.weighted = !st.weighted; save(); [...colsEl.children].forEach((el, i) => (el.style.flexGrow = st.weighted ? weightOf(i, st.cols.length) : "")); syncBar(); setTimeout(() => toneBar(st.cols.map((c) => c.hex)), 320); };
  $("ptUndo").onclick = () => travel(-1);
  $("ptRedo").onclick = () => travel(1);
  $("ptSort").onclick = () => { st.cols.sort((a, b) => C.toOklch(a.hex)[0] - C.toOklch(b.hex)[0]); snap(); glide(() => render(true)); save(); };
  $("ptUse").onclick = () => { root.Studio?.usePalette(st.cols.map((c) => c.hex)); root.Shell?.go("studio"); };
  let dotsKey = "";
  function syncBar() {
    const m = MODES.find((x) => x[0] === st.mode) || MODES[0], sample = sampleOf(m[0]), key = m[0] + sample.join();
    const tb = $("ptModeBtn");
    tb.dataset.tip = `Harmony: ${m[1]}`; tb.setAttribute("aria-label", tb.dataset.tip);
    if (key !== dotsKey) {
      const host = $("ptDots");
      if (host.children.length === sample.length) [...host.children].forEach((d, i) => (d.style.background = sample[i]));
      else host.innerHTML = dots(sample);
      dotsKey = key;
    }
    for (const b of $("ptModeMenu").querySelectorAll("[data-m]")) b.classList.toggle("on", b.dataset.m === st.mode);
    $("ptUndo").disabled = hi <= 0; $("ptRedo").disabled = hi >= hist.length - 1;
    const isSaved = saved.some((p) => p.colors.join() === st.cols.map((c) => c.hex).join());
    $("ptSavedBtn").classList.toggle("on", isSaved);
    $("ptWeights").classList.toggle("on", !!st.weighted);
  }
  function renderSaved() {
    const cur = st.cols.map((c) => c.hex).join();
    const isSaved = saved.some((p) => p.colors.join() === cur);
    $("ptSavedMenu").innerHTML = `<button class="opt" data-s="toggle"><span>${ic("heart")}${isSaved ? "Remove this palette" : "Save this palette"}</span></button>` + (saved.length ? `<div class="set-sep"></div>` + saved.map((p, i) => `<div class="pt-saved-row"><button class="pt-strip" data-s="load" data-i="${i}" aria-label="Load ${p.name}">${p.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</button><span>${p.name}</span><button class="ib xs" data-s="del" data-i="${i}" aria-label="Delete ${p.name}">${ic("x")}</button></div>`).join("") : `<p class="note pt-empty">Saved palettes also show up in the studio's Colors panel.</p>`);
  }
  $("ptSavedMenu").onclick = (e) => {
    const b = e.target.closest("[data-s]"); if (!b) return;
    const cur = st.cols.map((c) => c.hex);
    if (b.dataset.s === "toggle") {
      const i = saved.findIndex((p) => p.colors.join() === cur.join());
      if (i >= 0) saved.splice(i, 1); else saved.unshift({ name: C.name(cur[Math.floor(cur.length / 2)]), colors: cur });
      saveLib(); renderSaved(); syncBar();
    } else if (b.dataset.s === "load") { st.cols = saved[+b.dataset.i].colors.map((hex) => ({ hex, lock: false })); snap(); render(true); save(); $("ptSavedMenu").hidden = true; }
    else if (b.dataset.s === "del") { saved.splice(+b.dataset.i, 1); saveLib(); renderSaved(); syncBar(); }
  };
  async function exportAs(kind) {
    const hexes = st.cols.map((c) => c.hex), names = st.cols.map((c) => C.name(c.hex));
    const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let text = "";
    if (kind === "hex") text = hexes.join("\n");
    else if (kind === "css") text = ":root {\n" + hexes.map((h, i) => `  --${slug(names[i]) || "color-" + (i + 1)}: ${h};`).join("\n") + "\n}";
    else if (kind === "json") text = JSON.stringify(hexes.map((h, i) => ({ name: names[i], hex: h })), null, 2);
    else if (kind === "link") text = location.href.split("#")[0] + "#/palettes/" + hexes.map((h) => h.slice(1)).join("-");
    else if (kind === "png") {
      const W = 1600, H = 900, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const x = cv.getContext("2d"), w = W / hexes.length;
      hexes.forEach((h, i) => { x.fillStyle = h; x.fillRect(Math.floor(i * w), 0, Math.ceil(w), H); x.fillStyle = textOn(h); x.font = "600 30px 'Instrument Sans', sans-serif"; x.fillText(h.slice(1).toUpperCase(), i * w + 28, H - 70); x.font = "500 20px 'Instrument Sans', sans-serif"; x.globalAlpha = 0.75; x.fillText(names[i], i * w + 28, H - 38); x.globalAlpha = 1; });
      cv.toBlob((b) => root.downloadBlob?.(b, `palette-${hexes.map((h) => h.slice(1)).join("-")}.png`, "Palette saved"));
      return;
    }
    try { await navigator.clipboard.writeText(text); root.toastMsg?.("Copied"); } catch (e) { root.toastMsg?.("Clipboard is blocked here"); }
  }
  $("ptExportMenu").onclick = (e) => { const b = e.target.closest("[data-ex]"); if (!b) return; $("ptExportMenu").hidden = true; exportAs(b.dataset.ex); };
  for (const [btn, menu] of [["ptModeBtn", "ptModeMenu"], ["ptSavedBtn", "ptSavedMenu"], ["ptExportBtn", "ptExportMenu"]]) {
    $(btn).addEventListener("click", (e) => { e.stopPropagation(); const m = $(menu), open = m.hidden; for (const id of ["ptModeMenu", "ptSavedMenu", "ptExportMenu"]) $(id).hidden = true; if (menu === "ptSavedMenu" && open) renderSaved(); if (menu === "ptModeMenu" && open) renderModes(); m.hidden = !open; });
  }
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".pt-bar .menu-wrap")) for (const id of ["ptModeMenu", "ptSavedMenu", "ptExportMenu"]) $(id).hidden = true; });

  // Keyboard, only while the palette page is open.
  document.addEventListener("keydown", (e) => {
    if (root.Shell?.route !== "palettes" || e.target.matches("input, textarea")) return;
    if (e.code === "Space") { e.preventDefault(); generate(); }
    else if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey) vary();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); travel(e.shiftKey ? 1 : -1); }
  });

  // A palette in the URL (#/palettes/2f6fdb-6a9f7a-...) wins over the stored one.
  function fromHash(h) {
    const m = h.match(/^#\/palettes\/([0-9a-f-]+)$/i);
    if (!m) return false;
    const hexes = m[1].split("-").map((x) => C.parseHex(x)).filter(Boolean).slice(0, 10);
    if (hexes.length < 2) return false;
    st.cols = hexes.map((hex) => ({ hex, lock: false })); return true;
  }
  if (!fromHash(location.hash) && st.cols.length < 2) { st.cols = Array.from({ length: 5 }, () => ({ hex: "#888888", lock: false })); generate(); }
  else { snap(); render(true); }

  root.Palettes = {
    colors: () => st.cols.map((c) => c.hex),
    saved: () => saved.slice(),
    generate(mode) { if (mode && MODES.some((m) => m[0] === mode)) st.mode = mode; generate(); return st.cols.map((c) => c.hex); },
    vary() { vary(); return st.cols.map((c) => c.hex); },
    lock(i, on = true) { if (st.cols[i]) { st.cols[i].lock = on; render(true); save(); } },
    modes: () => MODES.map((m) => m[0]),
    load(hexes) { st.cols = hexes.slice(0, 10).map((hex) => ({ hex, lock: false })); snap(); render(true); save(); },
    onShow(hash) { if (fromHash(hash)) { snap(); render(true); save(); } },
  };
})(window);
