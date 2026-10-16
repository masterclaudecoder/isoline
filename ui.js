// Shared interface motion: custom tooltips, a sliding indicator for segmented controls, keyed list
// transitions (FLIP) and auto-sizing text areas. Show and hide of menus, popovers and conditional rows is
// animated in the stylesheet (transitions on display with @starting-style).
(function (root) {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22,1,.36,1)";

  // ---------- tooltips ----------
  // Any element with a title (or data-tip) gets a custom tooltip after a short delay; moving between
  // targets while one is showing switches instantly. It sits centered over its trigger (or over the info
  // icon inside it) with a nib pointing at it. data-tip-pos picks the side (top, bottom, left, right) and
  // data-tip-align the alignment along it (center, start, end); a side with no room flips to the other.
  const tip = document.createElement("div");
  tip.className = "tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
  let target = null, timer = 0, lastHide = 0, touchTip = false;
  const textOf = (el) => {
    const t = el.getAttribute("title");
    if (t) { el.dataset.tip = t; el.removeAttribute("title"); if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", t); }
    return el.dataset.tip || "";
  };
  const SIDES = { top: "up", below: "down", bottom: "down", left: "left", right: "right" };
  const FLIP = { up: "down", down: "up", left: "right", right: "left" };
  function place(el) {
    const r = (el.querySelector(":scope > .info-i") || el).getBoundingClientRect();
    const align = el.dataset.tipAlign || "center";
    tip.style.left = tip.style.top = "0px";
    const w = tip.offsetWidth, h = tip.offsetHeight, m = 10, e = 8, W = innerWidth, H = innerHeight;
    const fits = { up: r.top - m - h > e, down: r.bottom + m + h < H - e, left: r.left - m - w > e, right: r.right + m + w < W - e };
    let dir = SIDES[el.dataset.tipPos] || "up";
    if (!fits[dir]) dir = fits[FLIP[dir]] ? FLIP[dir] : fits.up || !fits.down ? "up" : "down";
    const along = (lo, size, len) => (align === "start" ? lo : align === "end" ? lo + size - len : lo + size / 2 - len / 2);
    let x, y;
    if (dir === "up" || dir === "down") { x = along(r.left, r.width, w); y = dir === "up" ? r.top - m - h : r.bottom + m; }
    else { y = along(r.top, r.height, h); x = dir === "left" ? r.left - m - w : r.right + m; }
    x = Math.round(Math.max(e, Math.min(W - w - e, x))); y = Math.round(Math.max(e, Math.min(H - h - e, y)));
    tip.style.left = x + "px"; tip.style.top = y + "px";
    // The nib points at the middle of the trigger, wherever the edge of the screen pushed the bubble.
    const r8 = tip.classList.contains("rich") ? 12 : 9;
    tip.style.setProperty("--nib", Math.round(dir === "up" || dir === "down" ? Math.max(r8, Math.min(w - r8, r.left + r.width / 2 - x)) : Math.max(r8, Math.min(h - r8, r.top + r.height / 2 - y))) + "px");
    tip.dataset.dir = dir;
  }
  // Rich tooltips: data-tip-media names a recorded clip in window.TIP_MEDIA, shown above the text;
  // data-tip-preview="name:value" draws a live preview with a function registered through UI.tipPreview.
  const previews = {};
  function show(el) {
    const t = textOf(el); if (!t) return;
    target = el;
    // Clips come from previews/tips/ as files; window.TIP_MEDIA (tips.js, inlined) is for single-file copies.
    const media = el.dataset.tipMedia && (window.TIP_MEDIA?.[el.dataset.tipMedia] || `previews/tips/${el.dataset.tipMedia}.webp`), [pn, pv] = (el.dataset.tipPreview || "").split(":"), draw = previews[pn];
    const out = !media && draw ? draw(pv, el) : null;
    if (media || out) {
      const fig = document.createElement("div"), cap = document.createElement("span");
      fig.className = "tip-fig"; cap.textContent = t;
      if (media) { const img = new Image(); img.alt = ""; img.onload = () => { if (target === el) place(el); }; img.src = media; fig.appendChild(img); }
      else if (typeof out === "string") fig.innerHTML = out; else fig.appendChild(out);
      tip.replaceChildren(fig, cap); tip.classList.add("rich");
    } else { tip.classList.remove("rich"); tip.textContent = t; }
    if (!tip.isConnected) document.body.appendChild(tip);
    tip.hidden = false; place(el);
  }
  // A held tip (tapped or clicked open) keeps its trigger lit in the accent color until it closes.
  function hold(el) { touchTip = true; textOf(el); if (target !== el || tip.hidden) show(el); el.classList.add("tip-held"); }
  function hide() { clearTimeout(timer); if (!tip.hidden) lastHide = performance.now(); target?.classList.remove("tip-held"); tip.hidden = true; target = null; touchTip = false; }
  const tipTarget = (n) => n?.closest?.("[title], [data-tip]");
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch" || e.buttons || touchTip) return;
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
  document.addEventListener("focusout", (e) => { if (!touchTip) hide(); });
  document.addEventListener("keydown", hide, { passive: true, capture: true });
  document.addEventListener("wheel", () => { if (!touchTip) hide(); }, { passive: true, capture: true });
  // A held tip follows its trigger while the page scrolls; a hover tip just goes.
  addEventListener("scroll", () => { if (tip.hidden) return; if (touchTip && target?.isConnected) place(target); else hide(); }, { passive: true, capture: true });
  // A tap or click on an info icon, a control's label, or a tip that isn't also a control holds it open until
  // the next tap or click on it (or anywhere else).
  // Controls (buttons, switches, links) show theirs on a long press, and that press doesn't act.
  const ACT = "button, a[href], input, select, textarea, label, summary, [role=button], [role=tab], [contenteditable]";
  let press = 0, pressed = false, px = 0, py = 0, lastType = "";
  const tapOnly = (el, t) => t.closest(".info-i") || el.matches(".label") || !el.closest(ACT);
  document.addEventListener("pointerdown", (e) => {
    clearTimeout(press); pressed = false; lastType = e.pointerType;
    const el = tipTarget(e.target);
    if (el !== target) hide();
    if (e.pointerType !== "touch") { if (el && !tapOnly(el, e.target)) hide(); return; }
    if (!el || tapOnly(el, e.target)) return;
    px = e.clientX; py = e.clientY;
    press = setTimeout(() => { pressed = true; hold(el); }, 450);
  }, { passive: true, capture: true });
  document.addEventListener("pointermove", (e) => { if (press && Math.hypot(e.clientX - px, e.clientY - py) > 8) clearTimeout(press); }, { passive: true, capture: true });
  for (const ev of ["pointerup", "pointercancel"]) document.addEventListener(ev, () => clearTimeout(press), { passive: true, capture: true });
  document.addEventListener("contextmenu", (e) => { if (pressed) e.preventDefault(); }, true);
  document.addEventListener("click", (e) => {
    if (pressed) { pressed = false; e.preventDefault(); e.stopPropagation(); return; }
    const el = tipTarget(e.target);
    if (!el || !tapOnly(el, e.target) || e.detail === 0) return;
    if ((e.pointerType || lastType) !== "touch" && !e.target.closest(".info-i") && !el.matches(".label")) return;
    if (el.closest(ACT)) { e.preventDefault(); e.stopPropagation(); }
    if (el === target && touchTip) { hide(); return; }
    hold(el);
  }, true);
  addEventListener("blur", hide);

  // Dice buttons tumble when pressed, so they read as a roll.
  document.addEventListener("click", (e) => {
    const d = e.target.closest?.("button")?.querySelector(':scope > svg.ic:has(> use[href="#i-dice"])');
    if (d && !reduce.matches) d.animate([{ rotate: "0deg", scale: 1 }, { rotate: "-20deg", scale: 0.82, offset: 0.25 }, { rotate: "360deg", scale: 1 }], { duration: 520, easing: "cubic-bezier(.3,1.25,.5,1)" });
  });

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

  // ---------- resize handles ----------
  // resizable(box, opts) puts handles on the edges and corners of a box that sits centered in its parent.
  // They fade in when the pointer comes near an edge. Dragging resizes around the center, so the edge you
  // hold stays under the pointer, and the new size shows below the box while you drag.
  // opts: get() [w, h] in the box's own units, scale() css px per unit, room() [w, h] in css px the box
  // may grow to, set(w, h) during the drag, start() and end() around it, min and max sizes in units.
  const CURSOR = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
  function resizable(box, o) {
    const host = box.parentElement, NEAR = 36;
    const layer = document.createElement("div");
    layer.className = "rz-layer"; layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = Object.keys(CURSOR).map((d) => `<i class="rz rz-${d}" data-d="${d}" style="cursor:${CURSOR[d]}"></i>`).join("") + `<span class="rz-size"></span>`;
    host.appendChild(layer);
    const label = layer.querySelector(".rz-size");
    let drag = null;
    const place = () => {
      const hr = host.getBoundingClientRect(), r = box.getBoundingClientRect();
      Object.assign(layer.style, { left: r.left - hr.left + host.scrollLeft + "px", top: r.top - hr.top + host.scrollTop + "px", width: r.width + "px", height: r.height + "px" });
    };
    const ro = new ResizeObserver(place); ro.observe(box); ro.observe(host);
    const showSize = (w, h) => { label.textContent = `${w} × ${h}`; };
    host.addEventListener("pointermove", (e) => {
      if (drag || e.pointerType === "touch") return;
      const r = box.getBoundingClientRect(), x = e.clientX, y = e.clientY;
      const inside = x > r.left - NEAR && x < r.right + NEAR && y > r.top - NEAR && y < r.bottom + NEAR;
      const near = inside && !o.disabled?.() && (Math.abs(x - r.left) < NEAR || Math.abs(x - r.right) < NEAR || Math.abs(y - r.top) < NEAR || Math.abs(y - r.bottom) < NEAR);
      if (near && !layer.classList.contains("near")) place();
      layer.classList.toggle("near", near);
    });
    host.addEventListener("pointerleave", () => { if (!drag) layer.classList.remove("near"); });
    layer.addEventListener("pointerdown", (e) => {
      const h = e.target.closest(".rz"); if (!h || e.button) return;
      e.preventDefault(); e.stopPropagation();
      const [w, hh] = o.get();
      drag = { d: h.dataset.d, x: e.clientX, y: e.clientY, w, h: hh, s: o.scale(), room: o.room ? o.room() : [host.clientWidth, host.clientHeight], id: e.pointerId };
      h.setPointerCapture(e.pointerId);
      layer.classList.add("dragging"); layer.dataset.d = drag.d; document.documentElement.style.cursor = CURSOR[drag.d];
      o.start?.(); showSize(w, hh);
    });
    layer.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag.d, dx = (e.clientX - drag.x) / drag.s, dy = (e.clientY - drag.y) / drag.s;
      const max = typeof o.max === "function" ? o.max() : o.max || 8000, min = o.min || 64;
      let w = drag.w, h = drag.h;
      if (d.includes("e")) w += 2 * dx; else if (d.includes("w")) w -= 2 * dx;
      if (d.includes("s")) h += 2 * dy; else if (d.includes("n")) h -= 2 * dy;
      w = Math.round(Math.max(min, Math.min(max, w, drag.room[0] / drag.s)));
      h = Math.round(Math.max(min, Math.min(max, h, drag.room[1] / drag.s)));
      showSize(w, h); o.set(w, h); place();
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; layer.classList.remove("dragging"); document.documentElement.style.cursor = "";
      o.end?.(); requestAnimationFrame(place);
    };
    layer.addEventListener("pointerup", end); layer.addEventListener("pointercancel", end);
    return { place };
  }

  // ---------- dropdowns ----------
  // Turns a segmented control into a compact dropdown. The option buttons move into the menu as they are,
  // so whatever already handles their clicks and marks the chosen one keeps working, and the trigger shows
  // the chosen label. The menu is placed against the viewport, so scrolling panels never clip it.
  let openDD = null;
  function dropdown(seg, { label = "" } = {}) {
    const wrap = document.createElement("div"), btn = document.createElement("button"), pop = document.createElement("div");
    wrap.className = "dd"; btn.type = "button"; btn.className = "dd-btn"; if (label) btn.setAttribute("aria-label", label);
    btn.innerHTML = `<span class="dd-v"></span><svg class="ic"><use href="#i-chev"/></svg>`;
    pop.className = "pop dd-pop"; pop.hidden = true; pop.setAttribute("role", "listbox");
    // The menu lives on the body: a transformed panel would otherwise trap its fixed position.
    for (const old of document.querySelectorAll("body > .dd-pop")) if (!old._wrap?.isConnected) old.remove();
    seg.replaceWith(wrap); wrap.append(btn); pop.appendChild(seg); pop._wrap = wrap; document.body.appendChild(pop);
    seg.querySelector(":scope > .seg-ind")?.remove();
    seg.classList.remove("seg", "has-ind", "sm", "wrap", "wrap4", "wrap5"); seg.classList.add("dd-list");
    segs.delete(seg); ro.unobserve(seg);
    for (const b of seg.querySelectorAll("button")) b.classList.add("opt");
    const val = btn.querySelector(".dd-v");
    const sync = () => { const on = seg.querySelector("button.on"); const t = on ? on.textContent.trim() : ""; if (val.textContent !== t) { val.textContent = t; if (!reduce.matches && wrap.isConnected) val.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.22,1,.36,1)" }); } };
    new MutationObserver(sync).observe(seg, { subtree: true, attributes: true, attributeFilter: ["class"] });
    sync();
    const close = () => { pop.hidden = true; btn.classList.remove("open"); if (openDD?.close === close) openDD = null; };
    const place = () => {
      const r = btn.getBoundingClientRect(), h = pop.offsetHeight, below = innerHeight - r.bottom - 8;
      pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + "px";
      pop.style.minWidth = r.width + "px";
      const up = below < h + 6 && r.top > below;
      pop.style.top = (up ? r.top - h - 6 : r.bottom + 6) + "px";
      pop.classList.toggle("above", up);
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!wrap.isConnected) return;
      if (!pop.hidden) { close(); return; }
      openDD?.close(); openDD = { close, wrap, pop };
      pop.hidden = false; btn.classList.add("open"); place();
    });
    seg.addEventListener("click", (e) => { if (e.target.closest("button")) requestAnimationFrame(close); });
    return wrap;
  }
  document.addEventListener("pointerdown", (e) => { if (openDD && !openDD.wrap.contains(e.target) && !openDD.pop.contains(e.target)) openDD.close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") openDD?.close(); });
  addEventListener("scroll", (e) => { if (openDD && !openDD.pop.contains(e.target)) openDD.close(); }, true);

  // ---------- option groups ----------
  // A titled group of related controls that folds open and closed. Each group remembers whether it was
  // left open, by its key, across visits. wrapGroup moves existing nodes inside, so their handlers stay.
  const GROUPS = "isoline.groups";
  let groupState = {};
  try { groupState = JSON.parse(localStorage.getItem(GROUPS) || "{}"); } catch (e) {}
  function group(title, { key = title, open = true, hint = "" } = {}) {
    const g = document.createElement("section"), isOpen = groupState[key] ?? open;
    g.className = "grp" + (isOpen ? " open" : "");
    g.innerHTML = `<button type="button" class="grp-h" aria-expanded="${isOpen}"><span class="grp-t">${title}</span>${hint ? `<span class="grp-hint"></span>` : ""}<svg class="ic"><use href="#i-chev"/></svg></button><div class="grp-b"><div class="grp-in"></div></div>`;
    const h = g.querySelector(".grp-h");
    h.onclick = () => {
      const now = !g.classList.contains("open");
      g.classList.toggle("open", now); h.setAttribute("aria-expanded", now);
      groupState[key] = now; try { localStorage.setItem(GROUPS, JSON.stringify(groupState)); } catch (e) {}
    };
    g.body = g.querySelector(".grp-in");
    g.setHint = (t) => { const el = g.querySelector(".grp-hint"); if (el && el.textContent !== t) el.textContent = t; };
    return g;
  }
  function wrapGroup(nodes, title, opts) {
    nodes = nodes.filter(Boolean);
    if (!nodes.length) return null;
    const g = group(title, opts);
    nodes[0].before(g);
    for (const n of nodes) g.body.appendChild(n);
    return g;
  }

  // ---------- performance mode ----------
  // Lighter rendering for weak devices: no live glass or backdrop blur, thumbnails and the canvas preview
  // at 1x, a calmer motion tile and a still home card. "auto" turns it on where the graphics are integrated
  // or software, or the device has few cores and little memory; the setting can force it either way.
  const LITE_KEY = "isoline.perfMode";
  function weakDevice() {
    try {
      const n = navigator, cpu = (n.hardwareConcurrency || 8) <= 4 && (n.deviceMemory || 8) <= 4;
      const gl = document.createElement("canvas").getContext("webgl"), x = gl?.getExtension("WEBGL_debug_renderer_info");
      const gpu = x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : "";
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return { weak: !gl || cpu || /swiftshader|llvmpipe|software|microsoft basic|mali|powervr|adreno \(tm\) [1-5]\d\d\b|intel.*\b(hd|uhd)\b/i.test(gpu), gpu };
    } catch (e) { return { weak: false, gpu: "" }; }
  }
  const device = weakDevice();
  const Lite = {
    pref: (() => { try { return localStorage.getItem(LITE_KEY) || "auto"; } catch (e) { return "auto"; } })(),
    weak: device.weak, on: false,
    set(v) { Lite.pref = v; try { localStorage.setItem(LITE_KEY, v); } catch (e) {} sync(); },
  };
  function sync() {
    const on = Lite.pref === "on" || (Lite.pref === "auto" && Lite.weak);
    document.documentElement.classList.toggle("lite", on);
    if (on !== Lite.on) { Lite.on = on; root.dispatchEvent(new CustomEvent("lite-change", { detail: on })); }
  }
  sync();
  root.Lite = Lite;

  root.UI = { flip, swap, autosize, collapse, resizable, dropdown, group, wrapGroup, tip: { show, hide }, tipPreview: (name, fn) => (previews[name] = fn), reduce };
})(window);
