// The tutorial: a short pane of animated scenes, then, if you want it, a guided tour of the real Studio.
// Both use the same pointer as the recorded tooltip clips: a cursor that chases its target on a critically
// damped spring, so it curves and settles like a hand, with a ring where it clicks.
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const SEEN = "isoline.tour";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const CURSOR = `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 2.5v15.2l4.1-3.9 2.6 6 2.7-1.2-2.6-5.9h5.7Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg><i></i>`;

  // A pointer on a spring. to() resolves once it has settled on the target; positions are in the
  // coordinates of whatever the cursor element is positioned in.
  function springCursor(el) {
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0, last = 0, settle = null, alive = true;
    const paint = () => (el.style.translate = `${x - 4}px ${y - 3}px`);
    const tick = (t) => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(3, last ? (t - last) / 16.67 : 1); last = t;
      // Stiffness k per 60fps frame, damping 2*sqrt(k): no overshoot, stepped in whole frames for stability.
      for (let i = 0; i < Math.round(dt) || i < 1; i++) { const k = 0.14, d = 2 * Math.sqrt(k); vx += (tx - x) * k - vx * d; vy += (ty - y) * k - vy * d; x += vx; y += vy; }
      paint();
      if (Math.hypot(tx - x, ty - y) < 0.6 && Math.hypot(vx, vy) < 0.3) { x = tx; y = ty; paint(); last = 0; const s = settle; settle = null; s?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    return {
      place(px, py) { x = tx = px; y = ty = py; vx = vy = 0; paint(); },
      to(px, py) {
        tx = px; ty = py;
        if (reduce.matches) { this.place(px, py); return Promise.resolve(); }
        return new Promise((r) => { settle?.(); settle = r; if (!raf) raf = requestAnimationFrame(tick); setTimeout(() => { if (settle === r) { settle = null; r(); } }, 1600); });
      },
      async click() {
        el.classList.add("down");
        const ring = el.querySelector("i");
        ring.getAnimations().forEach((a) => a.cancel());
        ring.animate([{ opacity: 0.9, scale: 0.3 }, { opacity: 0, scale: 1.25 }], { duration: 520, easing: "cubic-bezier(.2,.8,.3,1)" });
        await wait(140); el.classList.remove("down");
      },
      press(on) { el.classList.toggle("down", on); },
      get pos() { return [x, y]; },
      stop() { alive = false; cancelAnimationFrame(raf); settle?.(); settle = null; },
    };
  }

  // ---------- the pane ----------
  // A miniature Studio: layer tiles, an options column with cards and a slider, and a canvas with a point.
  const MOCK = `<div class="tm" aria-hidden="true">
    <div class="tm-build">${[0, 1, 2, 3, 4].map((i) => `<span class="tm-tile${i === 0 ? " on" : ""}"><i></i><b></b></span>`).join("")}</div>
    <div class="tm-opts">
      <div class="tm-cards">${[0, 1, 2, 3].map((i) => `<span class="tm-card c${i}${i === 0 ? " on" : ""}"></span>`).join("")}</div>
      <div class="tm-slider"><span class="tm-fill"></span><span class="tm-knob"></span></div>
      <div class="tm-slider s2"><span class="tm-fill"></span><span class="tm-knob"></span></div>
    </div>
    <div class="tm-canvas"><div class="tm-art"><i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="tm-pt"></span></div>
      <div class="tm-bar"><span class="tm-exp">Export</span></div>
      <div class="tm-menu"><span>PNG</span><span>SVG</span><span>Video</span><span>Link</span></div>
    </div>
    <div class="tm-cursor">${CURSOR}</div>
  </div>`;
  const PALS = [["#5b3fd6", "#f08a4b", "#e85d9a"], ["#0f7b6c", "#f2c14e", "#2b59c3"], ["#21201f", "#fce000", "#ffffff"], ["#e8572a", "#3e8cf0", "#f3e7d3"]];
  const STEPS = [
    { t: "Build in layers", p: "The left column is your design, one layer per tile: preset, generator, shape, colors, objects, effects and motion. Click a tile to open its options." },
    { t: "Every choice is a preview", p: "Options show your own design, so you see what you'll get before you pick. Sliders change it live, and the dice beside them roll a value." },
    { t: "Work on the canvas", p: "Drag points, objects and effect handles right on the canvas. Double-click to add a point, and drag its edges to resize it." },
    { t: "Take it anywhere", p: "Export a PNG, SVG, video, GIF or a live HTML file. Share sends a link, or a brief your AI agent can build from." },
  ];
  let pane = null, run = 0;

  function buildPane() {
    const m = document.createElement("div");
    m.className = "modal tour-modal"; m.id = "tourModal"; m.hidden = true;
    m.innerHTML = `<div class="dialog tour-pane" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div class="tour-stage">${MOCK}</div>
      <div class="tour-copy">
        <span class="tour-kicker" id="tourKicker"></span>
        <h3 id="tourTitle"></h3><p id="tourText"></p>
        <div class="tour-dots" id="tourDots">${STEPS.map((_, i) => `<button data-i="${i}" aria-label="Step ${i + 1}"></button>`).join("")}</div>
        <div class="dialog-actions"><button class="btn ghost" id="tourSkip">Skip</button><span class="grow"></span><button class="btn" id="tourBack">Back</button><button class="btn primary" id="tourNext">Next</button></div>
      </div>
    </div>`;
    document.body.appendChild(m);
    const cur = springCursor(m.querySelector(".tm-cursor"));
    let i = 0;
    const show = (n) => {
      i = Math.max(0, Math.min(STEPS.length - 1, n));
      const s = STEPS[i], last = i === STEPS.length - 1, copy = m.querySelector(".tour-copy");
      $("tourKicker").textContent = `${i + 1} of ${STEPS.length}`;
      $("tourTitle").textContent = s.t; $("tourText").textContent = s.p;
      if (!reduce.matches) copy.querySelectorAll("h3, p").forEach((el, k) => el.animate([{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 320, delay: k * 50, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
      [...$("tourDots").children].forEach((d, k) => d.classList.toggle("on", k === i));
      $("tourBack").hidden = i === 0;
      $("tourNext").textContent = last ? "Show me around" : "Next";
      $("tourSkip").textContent = last ? "Start designing" : "Skip";
      play(m, cur, i);
    };
    $("tourNext").onclick = () => (i < STEPS.length - 1 ? show(i + 1) : (closePane(), setTimeout(startTour, 260)));
    $("tourBack").onclick = () => show(i - 1);
    $("tourSkip").onclick = closePane;
    $("tourDots").onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) show(+b.dataset.i); };
    m.addEventListener("click", (e) => { if (e.target === m) closePane(); });
    m.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); });
    return { el: m, show, cur };
  }

  // Each scene loops while its step is showing; a newer step (or closing) ends the old loop.
  async function play(m, cur, i) {
    const id = ++run, alive = () => id === run && !m.hidden;
    const tm = m.querySelector(".tm"), box = tm.getBoundingClientRect();
    const at = (el, fx = 0.5, fy = 0.5) => { const r = el.getBoundingClientRect(); return [r.left - box.left + r.width * fx, r.top - box.top + r.height * fy]; };
    const q = (s) => tm.querySelector(s), qa = (s) => [...tm.querySelectorAll(s)];
    const reset = () => {
      qa(".tm-tile").forEach((t, k) => t.classList.toggle("on", k === 0));
      qa(".tm-card").forEach((c, k) => c.classList.toggle("on", k === 0));
      tm.classList.remove("menu", "swap");
      paint(0); q(".tm-pt").style.cssText = ""; q(".b1").style.cssText = "";
      tm.querySelectorAll(".tm-slider").forEach((s) => s.style.setProperty("--v", s.classList.contains("s2") ? 0.3 : 0.55));
    };
    const paint = (p) => { const [a, b, c] = PALS[p]; tm.style.setProperty("--c0", c); tm.style.setProperty("--c1", a); tm.style.setProperty("--c2", b); };
    const click = async (el, fx, fy) => { await cur.to(...at(el, fx, fy)); if (!alive()) return false; await cur.click(); return alive(); };
    reset();
    if (!cur.started) { cur.place(box.width + 20, box.height * 0.8); cur.started = true; }
    while (alive()) {
      if (i === 0) {
        for (const k of [2, 3, 1, 0]) {
          if (!(await click(qa(".tm-tile")[k]))) return;
          qa(".tm-tile").forEach((t, j) => t.classList.toggle("on", j === k));
          tm.classList.remove("swap"); void tm.offsetWidth; tm.classList.add("swap");
          await wait(700); if (!alive()) return;
        }
      } else if (i === 1) {
        for (const k of [1, 2, 3, 0]) {
          if (!(await click(qa(".tm-card")[k]))) return;
          qa(".tm-card").forEach((c, j) => c.classList.toggle("on", j === k)); paint(k);
          await wait(650); if (!alive()) return;
        }
        const s = q(".tm-slider"), knob = s.querySelector(".tm-knob");
        await cur.to(...at(knob)); if (!alive()) return;
        cur.press(true);
        const sr = s.getBoundingClientRect();
        for (const v of [0.85, 0.2, 0.55]) {
          const p = cur.to(sr.left - box.left + sr.width * v, sr.top - box.top + sr.height / 2);
          let done = false; p.then(() => (done = true));
          while (alive() && !done) { const [x] = cur.pos; s.style.setProperty("--v", Math.max(0, Math.min(1, (x - (sr.left - box.left)) / sr.width))); await new Promise(requestAnimationFrame); }
          if (!alive()) return;
        }
        cur.press(false);
        await wait(500);
      } else if (i === 2) {
        const pt = q(".tm-pt"), cv = q(".tm-art").getBoundingClientRect();
        await cur.to(...at(pt)); if (!alive()) return;
        await cur.click();
        for (const [fx, fy] of [[0.25, 0.3], [0.7, 0.65], [0.5, 0.45]]) {
          const p = cur.to(cv.left - box.left + cv.width * fx, cv.top - box.top + cv.height * fy);
          let done = false; p.then(() => (done = true));
          cur.press(true);
          while (alive()) {
            const [x, y] = cur.pos, lx = x - (cv.left - box.left), ly = y - (cv.top - box.top);
            pt.style.left = lx + "px"; pt.style.top = ly + "px";
            q(".b1").style.left = lx + "px"; q(".b1").style.top = ly + "px";
            if (done) break;
            await new Promise(requestAnimationFrame);
          }
          cur.press(false);
          if (!alive()) return;
          await wait(250);
        }
        await wait(600);
      } else {
        if (!(await click(q(".tm-exp")))) return;
        tm.classList.add("menu"); await wait(500); if (!alive()) return;
        for (const it of qa(".tm-menu span")) { await cur.to(...at(it, 0.3)); if (!alive()) return; it.classList.add("hot"); await wait(320); it.classList.remove("hot"); }
        await wait(400); tm.classList.remove("menu"); await wait(700);
      }
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

  // ---------- the guided tour ----------
  // A spotlight moves from part to part of the real Studio while the cursor goes there first; steps that
  // open something click it for real, so you watch the page do it.
  const TOUR = [
    { el: ".app > .slots", t: "Your layers", p: "Your design, built up from the top. The tile with the ring is open now." },
    { act: '[data-slot="colors"]', el: ".app > .options", t: "Options", p: "Opening a layer shows its options here. Each card and palette previews your own design." },
    { act: '[data-slot="addfx"]', el: "#fxQ", t: "Find an effect", p: "Search by name or by the look you want: try glass, print or light." },
    { el: "#wrap", t: "The canvas", p: "Drag points, objects and effect handles here. Drag its edges to change the size." },
    { el: "#surprise", t: "Surprise", p: "Rolls a whole new look. Variation (R) reshuffles the one you have." },
    { el: "#exportBtn", t: "Export", p: "PNG, SVG, video, GIF or HTML. Share has a link and a brief for AI agents." },
    { el: "#settingsBtn", t: "Settings", p: "Theme, accent and safe values, and this tutorial again whenever you want it." },
  ];
  let tour = null;
  function startTour() {
    if (tour) return;
    if (root.Shell?.route !== "studio") root.Shell?.go("studio");
    const spot = document.createElement("div"), tip = document.createElement("div"), cEl = document.createElement("div");
    spot.className = "tour-spot"; tip.className = "tour-tip"; cEl.className = "tm-cursor tour-cursor"; cEl.innerHTML = CURSOR;
    tip.setAttribute("role", "dialog"); tip.setAttribute("aria-live", "polite");
    document.body.append(spot, tip, cEl);
    const cur = springCursor(cEl);
    cur.place(innerWidth / 2, innerHeight + 30);
    let i = -1, busy = false;
    const place = () => {
      const s = TOUR[i], el = document.querySelector(s.el); if (!el) return;
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      const tw = tip.offsetWidth, th = tip.offsetHeight, m = 12;
      let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 14;
      if (y + th > innerHeight - m) y = r.top - th - 14;
      if (y < m) { y = Math.min(innerHeight - th - m, Math.max(m, r.top + r.height / 2 - th / 2)); x = r.right + 14 + tw < innerWidth - m ? r.right + 14 : r.left - tw - 14; }
      tip.style.translate = `${Math.max(m, Math.min(innerWidth - tw - m, x))}px ${Math.max(m, Math.min(innerHeight - th - m, y))}px`;
    };
    const go = async (n) => {
      if (busy || n < 0) return;
      if (n >= TOUR.length) return end();
      busy = true; i = n;
      const s = TOUR[i];
      tip.classList.add("moving");
      if (s.act) {
        const b = document.querySelector(s.act);
        if (b) { b.scrollIntoView({ block: "nearest", behavior: "smooth" }); const r = b.getBoundingClientRect(); await cur.to(r.left + Math.min(40, r.width / 2), r.top + r.height / 2); await cur.click(); b.click(); await wait(380); }
      }
      const el = document.querySelector(s.el);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      await wait(60);
      tip.innerHTML = `<span class="tour-kicker">${i + 1} of ${TOUR.length}</span><b>${s.t}</b><p>${s.p}</p><div class="tour-acts"><button class="btn sm ghost" data-a="end">End tour</button><span class="grow"></span>${i ? `<button class="btn sm" data-a="back">Back</button>` : ""}<button class="btn sm primary" data-a="next">${i === TOUR.length - 1 ? "Done" : "Next"}</button></div>`;
      place();
      if (el) { const r = el.getBoundingClientRect(); cur.to(r.left + r.width * 0.5, r.top + Math.min(r.height * 0.5, 40)); }
      tip.classList.remove("moving");
      tip.querySelector('[data-a="next"]').focus({ preventScroll: true });
      busy = false;
    };
    const end = () => {
      removeEventListener("resize", place); removeEventListener("keydown", key, true);
      cur.stop(); tour = null;
      for (const n of [spot, tip, cEl]) { n.classList.add("gone"); setTimeout(() => n.remove(), 320); }
    };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } else if (e.key === "ArrowRight") go(i + 1); else if (e.key === "ArrowLeft") go(i - 1); };
    tip.onclick = (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "next") go(i + 1); else if (a === "back") go(i - 1); else if (a === "end") end(); };
    addEventListener("resize", place); addEventListener("keydown", key, true);
    tour = { end };
    setTimeout(() => go(0), 120);
  }

  // The first time the Studio opens (not from a shared link, and not under automation), the pane
  // appears once the entrance has played.
  let offered = false;
  function onRoute(r) {
    if (offered || r !== "studio" || navigator.webdriver || /[?&]d=/.test(location.hash)) return;
    let seen = false; try { seen = !!localStorage.getItem(SEEN); } catch (e) {}
    if (seen) return;
    offered = true;
    (root.introDone || Promise.resolve()).then(() => setTimeout(() => { if (root.Shell?.route === "studio" && !document.querySelector(".modal:not([hidden])")) openPane(); }, 900));
  }
  root.Tour = { open: openPane, start: startTour, onRoute };
  if (root.Shell?.route) onRoute(root.Shell.route);
})(window);
