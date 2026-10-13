// Shared interface motion: custom tooltips, a sliding indicator for segmented controls, keyed list
// transitions (FLIP) and auto-sizing text areas. Show and hide of menus, popovers and conditional rows is
// animated in the stylesheet (transitions on display with @starting-style).
(function (root) {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22,1,.36,1)";

  // ---------- tooltips ----------
  // Any element with a title (or data-tip) gets a custom tooltip after a short delay; moving between
  // targets while one is showing switches instantly. data-tip-pos="right" places it to the side.
  const tip = document.createElement("div");
  tip.className = "tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
  let target = null, timer = 0, lastHide = 0;
  const textOf = (el) => {
    const t = el.getAttribute("title");
    if (t) { el.dataset.tip = t; el.removeAttribute("title"); if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", t); }
    return el.dataset.tip || "";
  };
  function place(el) {
    const r = el.getBoundingClientRect(), side = el.dataset.tipPos || "auto";
    tip.style.left = tip.style.top = "0px";
    const w = tip.offsetWidth, h = tip.offsetHeight, m = 8, W = innerWidth, H = innerHeight;
    let x, y, dir;
    if (side === "right" && r.right + m + w < W - 8) { x = r.right + m; y = r.top + r.height / 2 - h / 2; dir = "right"; }
    else {
      x = r.left + r.width / 2 - w / 2;
      const up = side !== "below" && r.top - m - h > 8;
      y = up ? r.top - m - h : r.bottom + m; dir = up ? "up" : "down";
    }
    tip.style.left = Math.round(Math.max(8, Math.min(W - w - 8, x))) + "px";
    tip.style.top = Math.round(Math.max(8, Math.min(H - h - 8, y))) + "px";
    tip.dataset.dir = dir;
  }
  function show(el) {
    const t = textOf(el); if (!t) return;
    target = el; tip.textContent = t;
    if (!tip.isConnected) document.body.appendChild(tip);
    tip.hidden = false; place(el);
  }
  function hide() { clearTimeout(timer); if (!tip.hidden) lastHide = performance.now(); tip.hidden = true; target = null; }
  const tipTarget = (n) => n?.closest?.("[title], [data-tip]");
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch" || e.buttons) return;
    const el = tipTarget(e.target);
    if (el === target) return;
    clearTimeout(timer);
    if (!el) { hide(); return; }
    textOf(el);
    const warm = !tip.hidden || performance.now() - lastHide < 350;
    if (!tip.hidden) { tip.hidden = true; target = null; }
    timer = setTimeout(() => { if (el.isConnected && el.matches(":hover")) show(el); }, warm ? 0 : 480);
  });
  document.addEventListener("focusin", (e) => { const el = tipTarget(e.target); if (el && e.target.matches(":focus-visible")) { clearTimeout(timer); show(el); } });
  document.addEventListener("focusout", hide);
  for (const ev of ["pointerdown", "wheel", "keydown"]) document.addEventListener(ev, hide, { passive: true, capture: true });
  addEventListener("blur", hide);

  // ---------- segmented controls ----------
  // A single indicator slides to the selected button instead of the highlight jumping between them.
  const segs = new Set(), dirty = new Set();
  let rafId = 0;
  const SEG = ".seg, .pk-fmt";
  function placeInd(seg) {
    let ind = seg.querySelector(":scope > .seg-ind");
    const on = seg.querySelector(":scope > button.on");
    if (!ind) { ind = document.createElement("i"); ind.className = "seg-ind"; ind.setAttribute("aria-hidden", "true"); seg.prepend(ind); }
    if (!on || !on.offsetWidth) { ind.style.opacity = "0"; ind.dataset.placed = ""; return; }
    const first = !ind.dataset.placed || reduce.matches;
    if (first) ind.style.transition = "none";
    ind.style.opacity = "1";
    ind.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    ind.style.width = on.offsetWidth + "px"; ind.style.height = on.offsetHeight + "px";
    ind.dataset.placed = "1";
    if (first) { void ind.offsetWidth; ind.style.transition = ""; }
  }
  const ro = new ResizeObserver((entries) => { for (const en of entries) queue(en.target); });
  function adopt(seg) { if (segs.has(seg)) return; segs.add(seg); seg.classList.add("has-ind"); ro.observe(seg); queue(seg); }
  function queue(seg) { dirty.add(seg); if (!rafId) rafId = requestAnimationFrame(flush); }
  function flush() { rafId = 0; for (const s of dirty) if (s.isConnected) placeInd(s); dirty.clear(); }
  function scan(node) { if (node.nodeType !== 1) return; if (node.matches(SEG)) adopt(node); node.querySelectorAll?.(SEG).forEach(adopt); }
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "childList") { m.addedNodes.forEach(scan); const s = m.target.closest?.(SEG); if (s) { adopt(s); queue(s); } }
      else if (m.target.parentElement?.matches(SEG)) queue(m.target.parentElement);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  const boot = () => scan(document.body);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();

  // ---------- keyed list transitions ----------
  // flip(container, update): children with data-key glide from where they were to where they land,
  // new ones grow in, and removed ones fade out in place.
  function flip(container, update, { sel = "[data-key]", stagger = 14 } = {}) {
    if (reduce.matches || !container.isConnected) { update(); return; }
    const before = new Map();
    for (const el of container.querySelectorAll(sel)) before.set(el.dataset.key, { r: el.getBoundingClientRect(), el });
    update();
    let n = 0;
    const seen = new Set();
    for (const el of container.querySelectorAll(sel)) {
      const k = el.dataset.key, b = before.get(k); seen.add(k);
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      if (b) {
        const dx = b.r.left - r.left, dy = b.r.top - r.top, sx = b.r.width / (r.width || 1), sy = b.r.height / (r.height || 1);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01)
          el.animate([{ transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: "top left", transform: "none" }], { duration: 380 + (n % 5) * 18, easing: EASE });
      } else el.animate([{ opacity: 0, transform: "translateY(8px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: Math.min(n, 16) * stagger, easing: EASE, fill: "backwards" });
      n++;
    }
    // Leaving items: a ghost copy fades where the item used to be.
    for (const [k, { r, el }] of before) {
      if (seen.has(k) || r.bottom < 0 || r.top > innerHeight || el.isConnected) continue;
      const g = el.cloneNode(true);
      Object.assign(g.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: 0, pointerEvents: "none", zIndex: 4 });
      document.body.appendChild(g);
      g.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: 220, easing: EASE }).onfinish = () => g.remove();
    }
  }

  // ---------- view transitions ----------
  // Swap content with a short cross-fade where the browser supports it.
  function swap(update) {
    if (reduce.matches || !document.startViewTransition || document.documentElement.classList.contains("vt")) { update(); return; }
    const html = document.documentElement;
    html.classList.add("vt-local");
    document.startViewTransition(update).finished.finally(() => html.classList.remove("vt-local"));
  }

  // ---------- auto-sizing text areas ----------
  function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }
  document.addEventListener("input", (e) => { if (e.target.matches?.("textarea.autosize")) autosize(e.target); });

  // Collapse an element smoothly before running an update that removes it.
  function collapse(el, done) {
    if (reduce.matches || !el.isConnected) { done(); return; }
    const h = el.offsetHeight;
    el.style.overflow = "clip";
    el.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0, marginTop: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px" }], { duration: 240, easing: EASE, fill: "forwards" }).onfinish = done;
  }

  root.UI = { flip, swap, autosize, collapse, tip: { show, hide }, reduce };
})(window);
