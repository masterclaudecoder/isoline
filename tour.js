// The tutorial: a short pane of animated scenes on a miniature Studio, then, if you want it, a guided tour
// of the real one. Both are led by the app's own pointer, the orange dot with a white ring the canvas uses
// for its handles. It travels on gently curved paths and settles with a hint of overshoot, like a hand.
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const SEEN = "isoline.tour";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise(requestAnimationFrame);

  // ---------- the pointer ----------
  // Moves run on a spring curve: a quick start, a small overshoot and a settle. Set SPRING to false for
  // the earlier eased curve (cubic in and out).
  const SPRING = true;
  // An underdamped spring from 0 to 1, settled by t = 1 (damping 0.68, about 5% overshoot).
  function springEase(t) {
    if (t >= 1) return 1;
    const z = 0.68, w = 9.5, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  // Each move follows a quadratic curve bowed to one side, eased in and out over a time that grows with
  // the distance. The dot chases that moving goal on a slightly loose spring, so it lags a touch, leans
  // into the curve and overshoots a hair before settling.
  function pointer(el) {
    let x = 0, y = 0, vx = 0, vy = 0, gx = 0, gy = 0, raf = 0, last = 0, path = null, alive = true, done = null;
    const paint = () => (el.style.translate = `${x}px ${y}px`);
    const ease = SPRING ? springEase : (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now) => {
      raf = 0; if (!alive) return;
      const steps = Math.min(4, Math.max(1, Math.round((now - (last || now - 16.7)) / 16.7))); last = now;
      if (path) {
        const t = Math.min(1, (now - path.t0) / path.dur), e = ease(t), u = 1 - e;
        gx = u * u * path.x0 + 2 * u * e * path.cx + e * e * path.x1; gy = u * u * path.y0 + 2 * u * e * path.cy + e * e * path.y1;
        if (t >= 1) path = null;
      }
      for (let i = 0; i < steps; i++) { const k = 0.32, d = 2 * Math.sqrt(k) * 0.78; vx += (gx - x) * k - vx * d; vy += (gy - y) * k - vy * d; x += vx; y += vy; }
      paint();
      if (!path && Math.hypot(gx - x, gy - y) < 0.4 && Math.hypot(vx, vy) < 0.2) { x = gx; y = gy; paint(); last = 0; const r = done; done = null; r?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    return {
      el,
      place(px, py) { x = gx = px; y = gy = py; vx = vy = 0; path = null; paint(); },
      to(px, py, speed = 1) {
        if (reduce.matches) { this.place(px, py); return Promise.resolve(); }
        const dx = px - gx, dy = py - gy, dist = Math.hypot(dx, dy), bow = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.12);
        path = { x0: gx, y0: gy, x1: px, y1: py, cx: (gx + px) / 2 - dy * bow, cy: (gy + py) / 2 + dx * bow, t0: performance.now(), dur: Math.min(1200, 240 + 9 * Math.pow(dist, 0.8)) * (SPRING ? 1.25 : 1) / speed };
        done?.();
        return new Promise((r) => { done = r; kick(); setTimeout(() => { if (done === r) { done = null; r(); } }, path.dur + 900); });
      },
      // Free paths for flourishes: f(t) for t from 0 to 1 gives the goal.
      async along(f, dur) {
        if (reduce.matches) return;
        const t0 = performance.now(); path = null;
        while (alive) { const t = Math.min(1, (performance.now() - t0) / dur); [gx, gy] = f(t); kick(); if (t >= 1) break; await frame(); }
        await new Promise((r) => { done = r; kick(); setTimeout(r, 600); });
      },
      async click() {
        el.classList.add("down");
        const ring = document.createElement("i"); ring.className = "tp-ring"; el.appendChild(ring);
        ring.animate([{ opacity: 0.85, scale: 0.4 }, { opacity: 0, scale: 2.4 }], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => ring.remove();
        await wait(130); el.classList.remove("down"); await wait(60);
      },
      press(on) { el.classList.toggle("down", on); },
      get pos() { return [x, y]; },
      stop() { alive = false; cancelAnimationFrame(raf); done?.(); done = null; },
    };
  }

  // ---------- the pane ----------
  // Pictures in the mock are drawn by the Studio itself from four presets, once, when the pane first opens.
  const LOOKS = ["Prism", "Caddis", "Lagoon", "Orb"];
  const FALLBACK = ["linear-gradient(135deg,#f08a4b,#7b5cff 55%,#e85d9a)", "linear-gradient(120deg,#ff4d2e,#ffc93c 40%,#7fd1ff 75%,#3a7bff)", "radial-gradient(circle at 55% 50%,#c9fbff,#3fd6e6 45%,#0b5d73)", "radial-gradient(circle at 50% 50%,#6a3fd1 20%,#f2a36b 70%)"];
  let pics = null;
  const loadPics = () => (pics ||= Promise.all(LOOKS.map(async (n, i) => { try { const c = await root.Studio.snapshot(320, 200, n); return `url("${c.toDataURL("image/jpeg", 0.86)}")`; } catch (e) { return FALLBACK[i]; } })));
  const TILES = [["Preset", "Prism", "Gradient preset"], ["Generator", "Flow", "Raster, PNG output"], ["Colors", "Prism", "5 colors"], ["Effects", "Grain", "Amount 0.12"]];
  const MOCK = `<div class="tm" aria-hidden="true">
    <div class="tm-top"><span class="tm-logo"><i></i>isoline</span><span class="tm-size">1440 <em>×</em> 900</span><span class="tm-sp"></span><span class="tm-ib"></span><span class="tm-btn">Designs</span><span class="tm-btn">Share</span><span class="tm-exp">Export</span></div>
    <div class="tm-build"><b class="tm-h">Build</b>${TILES.map(([l, t, s], i) => `<span class="tm-l">${l}</span><span class="tm-tile${i === 0 ? " on" : ""}"><i class="tm-th"></i><span><b>${t}</b><small>${s}</small></span></span>`).join("")}</div>
    <div class="tm-opts"><b class="tm-h tm-title">Preset</b><div class="tm-seg"><i class="on">All</i><i>Lines</i><i>Gradients</i><i>Noise</i></div>
      <div class="tm-cards">${LOOKS.map((n, i) => `<span class="tm-card${i === 0 ? " on" : ""}"><i></i>${n}</span>`).join("")}</div>
      <div class="tm-ctrl"><span>Scale</span><em>1.00×</em><span class="tm-slider"><span class="tm-fill"></span><span class="tm-knob"></span></span></div>
      <div class="tm-ctrl"><span>Warp</span><em>0.40</em><span class="tm-slider s2"><span class="tm-fill"></span><span class="tm-knob"></span></span></div>
    </div>
    <div class="tm-stage"><div class="tm-board"><i class="tm-pic a"></i><i class="tm-pic b"></i><span class="tm-obj"><i class="r1"></i><i class="r2"></i><i class="r3"></i></span></div>
      <div class="tm-tools"><span>Variation</span><span class="tm-sur">Surprise</span></div></div>
    <div class="tm-menu"><span>PNG</span><span>SVG</span><span>Video</span><span>Copy link</span></div>
    <div class="tm-toast">Image saved</div>
    <div class="tp tm-dot"></div>
  </div>`;
  const STEPS = [
    { t: "Build in layers", p: "The left column is your design, one layer per tile: preset, generator, shape, colors, objects, effects and motion. Click a tile to open its options." },
    { t: "Every choice is a preview", p: "Options show your own design, so you see what you'll get before you pick. Sliders change it live, and the dice beside them roll a value." },
    { t: "Work on the canvas", p: "Drag points, objects and effect handles right on the canvas. Rings around an object turn it, and the canvas edges resize it." },
    { t: "Take it anywhere", p: "Export a PNG, SVG, video, GIF or a live HTML file. Share sends a link, or a brief your AI agent can build from." },
  ];
  let pane = null, run = 0;

  function buildPane() {
    const m = document.createElement("div");
    m.className = "modal tour-modal"; m.id = "tourModal"; m.hidden = true;
    m.innerHTML = `<div class="dialog tour-pane" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div class="tour-stage">${MOCK}</div>
      <div class="tour-copy"><span class="tour-kicker" id="tourKicker"></span><h3 id="tourTitle"></h3><p id="tourText"></p></div>
      <div class="tour-foot">
        <span class="tf-l"><button class="btn ghost" id="tourSkip">Skip</button><button class="btn" id="tourBack">Back</button></span>
        <span class="tf-c"><span class="tour-dots" id="tourDots">${STEPS.map((_, i) => `<button data-i="${i}" aria-label="Step ${i + 1}"></button>`).join("")}</span><button class="btn primary tour-go" id="tourGo" tabindex="-1">Show me around</button></span>
        <span class="tf-r"><button class="btn primary" id="tourNext">Next</button></span>
      </div>
    </div>`;
    document.body.appendChild(m);
    const cur = pointer(m.querySelector(".tm-dot"));
    let i = 0;
    const show = (n) => {
      i = Math.max(0, Math.min(STEPS.length - 1, n));
      const s = STEPS[i], last = i === STEPS.length - 1;
      $("tourKicker").textContent = `${i + 1} of ${STEPS.length}`;
      $("tourTitle").textContent = s.t; $("tourText").textContent = s.p;
      if (!reduce.matches) m.querySelectorAll(".tour-copy > *").forEach((el, k) => el.animate([{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 340, delay: k * 45, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
      [...$("tourDots").children].forEach((d, k) => d.classList.toggle("on", k === i));
      $("tourSkip").hidden = i > 0; $("tourBack").hidden = i === 0;
      $("tourNext").textContent = last ? "Start designing" : "Next";
      $("tourNext").classList.toggle("primary", !last);
      m.querySelector(".tour-foot").classList.remove("ready");
      $("tourGo").tabIndex = -1;
      play(m, cur, i, last ? () => { m.querySelector(".tour-foot").classList.add("ready"); $("tourGo").tabIndex = 0; } : null);
    };
    $("tourNext").onclick = () => (i < STEPS.length - 1 ? show(i + 1) : closePane());
    $("tourGo").onclick = () => { closePane(); setTimeout(startTour, 280); };
    $("tourBack").onclick = () => show(i - 1);
    $("tourSkip").onclick = closePane;
    $("tourDots").onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) show(+b.dataset.i); };
    m.addEventListener("click", (e) => { if (e.target === m) closePane(); });
    m.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); else if (e.key === "Escape") closePane(); });
    return { el: m, show, cur };
  }

  // Positions inside the mock come from layout offsets, not screen rectangles, so they stay right while
  // the pane is still scaling in.
  function spot(tm, el, fx = 0.5, fy = 0.5) {
    let x = 0, y = 0, n = el;
    while (n && n !== tm) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return [x + el.offsetWidth * fx, y + el.offsetHeight * fy];
  }

  // Each scene loops while its step is showing; a newer step (or closing) ends the old loop. once() runs
  // after the first full pass.
  async function play(m, cur, i, once) {
    const id = ++run, alive = () => id === run && !m.hidden;
    const tm = m.querySelector(".tm"), q = (s) => tm.querySelector(s), qa = (s) => [...tm.querySelectorAll(s)];
    const P = await loadPics();
    if (!alive()) return;
    qa(".tm-card i").forEach((c, k) => (c.style.backgroundImage = P[k]));
    let shown = 0, front = "a";
    const art = (k, instant) => {
      const back = front === "a" ? "b" : "a", el = q(".tm-pic." + back);
      el.style.backgroundImage = P[k]; tm.style.setProperty("--art", P[k]);
      if (instant) { q(".tm-pic." + front).style.backgroundImage = P[k]; return; }
      el.classList.add("on"); q(".tm-pic." + front).classList.remove("on"); front = back; shown = k;
    };
    const reset = () => {
      qa(".tm-tile").forEach((t, k) => t.classList.toggle("on", k === 0)); q(".tm-title").textContent = "Preset";
      qa(".tm-card").forEach((c, k) => c.classList.toggle("on", k === 0));
      tm.classList.remove("menu", "swap", "obj", "saved");
      q(".tm-pic.a").classList.add("on"); q(".tm-pic.b").classList.remove("on"); front = "a"; art(0, true);
      q(".tm-board").style.setProperty("--zoom", 1);
      tm.querySelectorAll(".tm-slider").forEach((s) => s.style.setProperty("--v", s.classList.contains("s2") ? 0.3 : 0.5));
      q(".tm-obj").style.cssText = "";
    };
    const goto = (el, fx, fy) => cur.to(...spot(tm, el, fx, fy));
    const click = async (el, fx, fy) => { await goto(el, fx, fy); if (!alive()) return false; await cur.click(); return alive(); };
    // Follows the pointer each frame while it travels to a point, calling f with its position.
    const dragTo = async (px, py, f) => { let fin = false; cur.to(px, py, 0.75).then(() => (fin = true)); cur.press(true); while (alive() && !fin) { f(...cur.pos); await frame(); } cur.press(false); return alive(); };
    reset();
    if (!cur.placed) { cur.place(tm.offsetWidth + 24, tm.offsetHeight * 0.75); cur.placed = true; }
    let first = true;
    while (alive()) {
      if (i === 0) {
        for (const k of [2, 3, 1, 0]) {
          if (!(await click(qa(".tm-tile")[k], 0.32, 0.5))) return;
          qa(".tm-tile").forEach((t, j) => t.classList.toggle("on", j === k));
          q(".tm-title").textContent = TILES[k][0];
          tm.classList.remove("swap"); void tm.offsetWidth; tm.classList.add("swap");
          await wait(750); if (!alive()) return;
        }
      } else if (i === 1) {
        for (const k of [1, 2, 3, 0]) {
          if (!(await click(qa(".tm-card")[k], 0.5, 0.4))) return;
          qa(".tm-card").forEach((c, j) => c.classList.toggle("on", j === k)); art(k);
          await wait(700); if (!alive()) return;
        }
        const s = q(".tm-slider"), [sx, sy] = spot(tm, s, 0, 0.5), w = s.offsetWidth;
        await goto(s.querySelector(".tm-knob")); if (!alive()) return;
        for (const v of [0.9, 0.2, 0.5]) {
          if (!(await dragTo(sx + w * v, sy, (x) => { const t = Math.max(0, Math.min(1, (x - sx) / w)); s.style.setProperty("--v", t); q(".tm-board").style.setProperty("--zoom", 0.7 + t * 0.6); s.previousElementSibling.textContent = (0.5 + t).toFixed(2) + "×"; }))) return;
          await wait(180);
        }
        await wait(500);
      } else if (i === 2) {
        const board = q(".tm-board"), obj = q(".tm-obj"), bw = board.offsetWidth, bh = board.offsetHeight, [bx, by] = spot(tm, board, 0, 0);
        tm.classList.add("obj");
        await wait(400);
        if (!(await goto(obj))) return; if (!alive()) return;
        await cur.click();
        for (const [fx, fy] of [[0.28, 0.32], [0.72, 0.62], [0.5, 0.5]]) {
          if (!(await dragTo(bx + bw * fx, by + bh * fy, (x, y) => { obj.style.left = ((x - bx) / bw) * 100 + "%"; obj.style.top = ((y - by) / bh) * 100 + "%"; }))) return;
          await wait(220);
        }
        // Then a turn on the blue ring.
        const [ox, oy] = spot(tm, obj, 0.5, 0.5), R = obj.offsetWidth * 0.62;
        await cur.to(ox + R, oy); if (!alive()) return;
        cur.press(true);
        const t0 = performance.now();
        while (alive() && performance.now() - t0 < 1100) { const a = ((performance.now() - t0) / 1100) * 1.4; cur.place(ox + Math.cos(a) * R, oy + Math.sin(a) * R); obj.style.rotate = a * 57.3 + "deg"; await frame(); }
        cur.press(false);
        await wait(700); if (!alive()) return;
      } else {
        if (!(await click(q(".tm-exp")))) return;
        tm.classList.add("menu"); await wait(450); if (!alive()) return;
        for (const it of qa(".tm-menu span").slice(0, 3)) { await goto(it, 0.3); if (!alive()) return; it.classList.add("hot"); await wait(260); it.classList.remove("hot"); }
        if (!(await click(qa(".tm-menu span")[0], 0.3))) return;
        tm.classList.remove("menu"); tm.classList.add("saved");
        await wait(1300); tm.classList.remove("saved"); await wait(500);
      }
      if (first && alive()) { first = false; once?.(); }
      reset();
      await wait(200);
    }
  }

  function openPane() {
    try { localStorage.setItem(SEEN, "1"); } catch (e) {}
    pane ||= buildPane();
    pane.el.hidden = false;
    root.UI?.tip?.hide?.();
    requestAnimationFrame(() => { pane.show(0); $("tourNext").focus({ preventScroll: true }); });
  }
  function closePane() { if (!pane) return; pane.el.hidden = true; run++; }

  // ---------- the guided tours ----------
  // A spotlight moves from part to part of the real page while the dot goes there first; steps that
  // open something click it for real, so you watch the page do it. Each page has its own short tour,
  // offered the first time you visit it. The home tour ends by walking you into the Studio, where the
  // tutorial pane takes over; the others end with the dot swirling into the settings button, where the
  // tutorials live, in a puff of sparks.
  const TOURS = {
    home: [
      { el: '.home [data-go="studio"]', t: "Studio", p: "Make patterns, gradients and effects, put them in motion, and export them anywhere." },
      { el: '.home [data-go="palettes"]', t: "Palettes", p: "Roll color palettes and check their names and contrast. Your colors travel to the other tools." },
      { el: '.home [data-go="components"]', t: "Components", p: "Browse UI libraries, or build a kit of tokens and pages in your colors." },
      { el: "#brand", inner: true, t: "Feeling lucky?", p: "Click the logo twice for a new palette, design and kit all at once." },
      { el: '.home [data-go="studio"]', t: "Let's begin", p: "Everything starts in the Studio. A short tutorial waits for you there.", done: "Open the Studio" },
    ],
    studio: [
      { el: ".app > .slots", t: "Your layers", p: "Your design, built up from the top. The tile with the ring is open now." },
      { act: '[data-slot="colors"]', el: ".app > .options", t: "Options", p: "Opening a layer shows its options here. Each card and palette previews your own design." },
      { act: '[data-slot="addfx"]', el: "#fxQ", t: "Find an effect", p: "Search by name or by the look you want: try glass, print or light." },
      { el: "#wrap", t: "The canvas", p: "Drag points, objects and effect handles here. Drag its edges to change the size." },
      { el: "#surprise", t: "Surprise", p: "Rolls a whole new look. Variation (R) reshuffles the one you have." },
      { el: "#exportBtn", t: "Export", p: "PNG, SVG, video, GIF or HTML. Share has a link and a brief for AI agents." },
      { el: "#settingsBtn", t: "Settings", p: "Theme, accent and safe values, and these tutorials again whenever you want them." },
    ],
    palettes: [
      { el: ".pt-col", t: "Your colors", p: "Each column is a color. Hover one for its tools: lock it, copy it, see its shades. Drag to reorder." },
      { el: ".pt-col .pt-info", t: "Names and contrast", p: "Every color has a name, and shows how well text reads on it." },
      { el: "#ptGen", t: "Generate", p: "Space rolls new colors for every unlocked column. Vary (V) nudges the ones you have." },
      { el: "#ptModeBtn", t: "Harmony", p: "Choose how the colors relate: analogous, complementary, triads and more." },
      { el: "#ptSavedBtn", t: "Saved", p: "Keep the palettes you like. They show up in the Studio as well." },
      { el: "#ptUse", t: "Use them", p: "Send the colors to the Studio, or to the Builder in Components." },
    ],
    components: [
      { el: "#cpMode", t: "Two modes", p: "Libraries collects UI kits to browse. Builder makes a kit of your own, in your colors." },
      { el: ".cp-filters", t: "Find a library", p: "Search, or narrow the list by framework and category." },
      { el: ".cp-grid .lib", t: "A library", p: "Each card opens onto the library's own site, with a link to its docs." },
      { act: '#cpMode [data-v="builder"]', el: "#cpBuild", t: "Builder", p: "Pick fonts, scale, radius and depth, and see them on real pages. Export the tokens as CSS or a brief." },
    ],
  };
  const KEY = (name) => (name === "studio" ? "isoline.tour.studio" : "isoline.tour." + name);
  const seen = (k) => { try { return !!localStorage.getItem(k); } catch (e) { return true; } };
  const mark = (k) => { try { localStorage.setItem(k, "1"); } catch (e) {} };

  // A step's box: the element's, or with "inner" just the part its contents fill (the logo's link
  // stretches across the bar).
  function boxOf(s) {
    const el = document.querySelector(s.el); if (!el) return null;
    if (!s.inner || !el.children.length) return el.getBoundingClientRect();
    const rs = [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r = Math.max(...rs.map((q) => q.right)), b = Math.max(...rs.map((q) => q.bottom));
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  let tour = null;
  function startTour(name = "studio") {
    if (tour) return;
    const STEPS = TOURS[name] || TOURS.studio;
    mark(KEY(name));
    // Started from another page, the first step waits for the page change to finish.
    const moving = root.Shell?.route !== name;
    if (moving) root.Shell?.go(name);
    const spotEl = document.createElement("div"), tip = document.createElement("div"), dot = document.createElement("div");
    spotEl.className = "tour-spot"; tip.className = "tour-tip"; dot.className = "tp tour-dot";
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
    document.body.append(spotEl, tip, dot);
    const cur = pointer(dot);
    cur.place(innerWidth / 2, innerHeight + 30);
    let i = -1, busy = false;
    const place = () => {
      const r = boxOf(STEPS[i]), pad = 6; if (!r) return;
      Object.assign(spotEl.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      const tw = tip.offsetWidth, th = tip.offsetHeight, m = 12;
      let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 14;
      if (y + th > innerHeight - m) y = r.top - th - 14;
      if (y < m) { y = Math.min(innerHeight - th - m, Math.max(m, r.top + r.height / 2 - th / 2)); x = r.right + 14 + tw < innerWidth - m ? r.right + 14 : r.left - tw - 14; }
      tip.style.translate = `${Math.max(m, Math.min(innerWidth - tw - m, x))}px ${Math.max(m, Math.min(innerHeight - th - m, y))}px`;
    };
    const go = async (n) => {
      if (busy || n < 0) return;
      if (n >= STEPS.length) return finish();
      busy = true; i = n;
      const s = STEPS[i], last = i === STEPS.length - 1;
      tip.classList.add("moving");
      if (s.act) {
        const b = document.querySelector(s.act);
        if (b) { b.scrollIntoView({ block: "nearest", behavior: "smooth" }); const r = b.getBoundingClientRect(); await cur.to(r.left + Math.min(40, r.width / 2), r.top + r.height / 2); await cur.click(); b.click(); await wait(380); }
      }
      const el = document.querySelector(s.el);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      await wait(60);
      tip.innerHTML = `<span class="tour-kicker">${i + 1} of ${STEPS.length}</span><b>${s.t}</b><p>${s.p}</p><div class="tour-acts"><button class="btn sm ghost" data-a="end">End tour</button><span class="grow"></span>${i ? `<button class="btn sm" data-a="back">Back</button>` : ""}<button class="btn sm primary" data-a="next">${last ? s.done || "Done" : "Next"}</button></div>`;
      place();
      if (el) { const r = boxOf(s); cur.to(r.left + r.width * 0.5, r.top + Math.min(r.height * 0.5, 40)); }
      tip.classList.remove("moving");
      tip.querySelector('[data-a="next"]').focus({ preventScroll: true });
      busy = false;
    };
    const cleanup = () => {
      removeEventListener("resize", place); removeEventListener("keydown", key, true);
      tour = null;
      for (const n of [spotEl, tip]) { n.classList.add("gone"); setTimeout(() => n.remove(), 320); }
    };
    const end = () => { cleanup(); cur.stop(); dot.classList.add("gone"); setTimeout(() => dot.remove(), 320); };
    const finish = async () => {
      if (busy) return; busy = true;
      cleanup();
      // Home hands over to the Studio: the dot clicks the Studio card and the Studio's tutorial follows.
      if (name === "home") {
        const c = document.querySelector('.home [data-go="studio"]'), r = c?.getBoundingClientRect();
        if (r) { await cur.to(r.left + r.width / 2, r.top + r.height / 2); await cur.click(); }
        dot.classList.add("gone"); setTimeout(() => { cur.stop(); dot.remove(); }, 320);
        root.Shell?.go("studio");
        return;
      }
      await swirlHome(cur, dot);
    };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } else if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); };
    tip.onclick = (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "next") go(i + 1); else if (a === "back") go(i - 1); else if (a === "end") end(); };
    addEventListener("resize", place); addEventListener("keydown", key, true);
    tour = { end };
    setTimeout(() => go(0), moving ? 760 : 120);
  }
  // Done: the dot spirals toward the settings button, the curl widening and then tightening as it
  // closes in, and slips inside in a puff of sparks.
  async function swirlHome(cur, dot) {
    const b = $("settingsBtn").getBoundingClientRect(), tx = b.left + b.width / 2, ty = b.top + b.height / 2;
    const [x0, y0] = cur.pos, dist = Math.hypot(tx - x0, ty - y0), R = Math.min(110, Math.max(40, dist * 0.22));
    // Turn the way that curls toward the screen's middle, so the loops stay on screen.
    const dir = x0 < tx ? 1 : -1, turns = 1.6, a0 = Math.atan2(ty - y0, tx - x0) + (Math.PI / 2) * dir;
    await cur.along((t) => {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const r = R * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 1.3), a = a0 + dir * turns * Math.PI * 2 * t;
      return [x0 + (tx - x0) * e + Math.cos(a) * r, y0 + (ty - y0) * e + Math.sin(a) * r];
    }, 1900);
    dot.animate([{ scale: 1, opacity: 1 }, { scale: 0.2, opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" });
    root.sparks?.(tx, ty);
    $("settingsBtn").animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 360, easing: "cubic-bezier(.3,1.5,.5,1)" });
    setTimeout(() => { cur.stop(); dot.remove(); }, 260);
  }

  // Settings, Show the tutorial: the Studio's pane in the Studio, the page's tour anywhere else.
  function showFor(r) { if (r === "studio" || !TOURS[r]) openPane(); else startTour(r); }

  // The first visit to each page (not from a shared link, and not under automation) offers its tutorial
  // once the entrance has played: the pane in the Studio, a tour on the other pages.
  const offered = new Set();
  function onRoute(r) {
    if (offered.has(r) || navigator.webdriver || /[?&]d=/.test(location.hash) || !TOURS[r]) return;
    const k = r === "studio" ? SEEN : KEY(r);
    if (seen(k)) return;
    offered.add(r);
    (root.introDone || Promise.resolve()).then(() => setTimeout(() => {
      if (root.Shell?.route !== r || tour || (pane && !pane.el.hidden) || document.querySelector(".modal:not([hidden])")) return;
      if (r === "studio") openPane(); else startTour(r);
    }, r === "home" ? 700 : 900));
  }
  root.Tour = { open: openPane, start: startTour, show: showFor, onRoute };
  if (root.Shell?.route) onRoute(root.Shell.route);
})(window);
