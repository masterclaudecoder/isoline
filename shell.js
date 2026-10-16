// Shell: routes between the home page and the tools (#/, #/studio, #/palettes) and makes each change a
// seamless transition. The top bar stays put, the old page slides away as the new one arrives, and a tool's
// preview on the home page morphs into the tool itself (View Transitions where available, a short
// slide otherwise).
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const keyOf = (e) => (/^Key[A-Z]$/.test(e.code) ? e.code[3].toLowerCase() : /^Digit\d$/.test(e.code) ? e.code[5] : (e.key || "").toLowerCase());
  const ORDER = { home: 0, studio: 1, palettes: 2, components: 3 };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const parse = (h) => (h.startsWith("#/palettes") ? "palettes" : h.startsWith("#/studio") ? "studio" : h.startsWith("#/components") ? "components" : "home");
  const hashFor = (r) => (r === "home" ? "#/" : "#/" + r);
  let route = null;

  // inVT: the page is arriving inside a view transition, which already pulls the bars up, so their own
  // entrance is skipped (it would restart and play a second time once the transition ends).
  function show(r, inVT = false) {
    if (route === "components" && r !== "components") root.Components?.onHide?.();
    route = r;
    Shell.route = r;
    for (const p of document.querySelectorAll(".page")) p.hidden = p.dataset.page !== r;
    for (const el of document.querySelectorAll("[data-for]")) el.hidden = !el.dataset.for.split(" ").includes(r);
    document.body.dataset.route = r;
    if (r === "studio") root.Studio?.onShow();
    if (r === "palettes") {
      if (Shell.from !== "studio" && Shell.from !== "components") root.Palettes?.returnTo("studio");
      root.Palettes?.onShow(location.hash);
      // Columns rise in one after another, then the bar pulls up beneath them.
      const pt = document.querySelector(".pt");
      [...pt.querySelectorAll(".pt-col")].forEach((c, i) => c.style.setProperty("--k", i));
      pt.style.setProperty("--n", pt.querySelectorAll(".pt-col").length);
      // Inside a view transition the home strip already stretches into the columns, so they only settle
      // their labels in afterwards. A second rise on top of the morph read as a stutter.
      pt.classList.remove("enter", "bar-enter", "vt-enter"); void pt.offsetWidth;
      pt.classList.add(inVT ? "vt-enter" : "enter");
      if (!inVT) pt.classList.add("bar-enter");
      clearTimeout(pt._t); pt._t = setTimeout(() => pt.classList.remove("enter", "bar-enter", "vt-enter"), 1600);
    }
    if (r === "home") paintHome(); else brandClicks = 0;
    root.Tour?.onRoute(r);
    // One size control: in the top bar for the studio, in the preview's own bar for the builder.
    const size = document.querySelector(".size"), slot = $("cpSizeSlot"), top = document.querySelector(".top");
    if (r === "components" && slot && size.parentElement !== slot) slot.appendChild(size);
    else if (r !== "components" && size.parentElement !== top) top.insertBefore(size, top.querySelector(".cp-top"));
    if (r === "components") root.Components?.onShow();
    root.syncSize?.();
  }
  // want is where the latest navigation is headed. A transition shows its page a frame or more after it
  // starts, so a second click in that window compares against want, not the page still on screen, and
  // a transition that lands on a page nobody wants any more is corrected straight away.
  let want = null;
  // Page switches go in the performance log: the longest gap between frames and how many frames were
  // missed over the second and a half after the switch, noting the first visit to each page.
  const visited = new Set();
  function watchSwitch(from, r) {
    if (!root.perfEvent || from == null) return;
    const first = !visited.has(r); visited.add(r);
    const t0 = performance.now();
    let last = t0, worst = 0, frames = 0;
    const tick = (now) => { worst = Math.max(worst, now - last); last = now; frames++; if (now - t0 < 1500) requestAnimationFrame(tick); else root.perfEvent("switch", `${from} to ${r}${first ? ", first visit" : ""}`, { worstFrameMs: Math.round(worst), frames, expected: Math.round((now - t0) / 16.7) }); };
    requestAnimationFrame(tick);
  }
  function go(r, push = true) {
    if (r === (want ?? route)) return;
    want = r;
    if (push) history.pushState(null, "", hashFor(r));
    const from = route; Shell.from = from;
    watchSwitch(from, r);
    // Motion pauses on its current frame before the Studio leaves, so the page change has the frames to itself.
    if (from === "studio") root.Studio?.onLeave?.();
    const dir = ORDER[r] >= ORDER[from] ? "fwd" : "back";
    document.documentElement.dataset.dir = dir;
    if (reduce.matches || from == null) { want = null; return show(r); }
    if (document.startViewTransition) {
      const html = document.documentElement;
      html.classList.add("vt");
      // Studio and Palettes share their colors: the circles in Studio turn into the palette's columns.
      html.classList.toggle("vt-pal", [from, r].sort().join() === "palettes,studio");
      // A busy main thread can hold the snapshot back; past a moment the page just switches.
      // Phones take longer to capture the page, so they get more time before giving up on the morph.
      const late = setTimeout(() => vt.skipTransition?.(), matchMedia("(pointer: coarse)").matches ? 1100 : 450);
      const vt = document.startViewTransition(() => { clearTimeout(late); if (want === r) show(r, true); });
      vt.updateCallbackDone.catch(() => {}).finally(() => { if (want === r && route !== r) show(r); });
      vt.finished.finally(() => { html.classList.remove("vt", "vt-pal"); if (want === r) want = null; });
      return;
    }
    // Fallback: the old page eases out, then the new one eases in.
    const old = document.querySelector(`.page[data-page="${from}"]`);
    old.classList.add("leaving");
    setTimeout(() => { old.classList.remove("leaving"); if (want !== r) return; want = null; show(r); const nu = document.querySelector(`.page[data-page="${r}"]`); nu.classList.add("arriving"); setTimeout(() => nu.classList.remove("arriving"), 460); }, 200);
  }

  // Home previews: the studio's current design and the palette tool's current colors.
  // fresh: the pictures were just rolled, so they cross-fade in.
  async function paintHome(fresh = false) {
    const pal = root.Palettes?.colors() || [], w = root.Palettes?.weights?.() || [];
    $("homePalette").innerHTML = pal.map((c, i) => `<i style="background:${c};flex-grow:${w[i] || 1}"></i>`).join("");
    root.Components?.preview($("homeComponents"));
    if (fresh && !reduce.matches) $("homeComponents").animate(root.Lite?.on ? [{ opacity: 0.2 }, { opacity: 1 }] : [{ opacity: 0.2, filter: "blur(6px)" }, { opacity: 1, filter: "none" }], { duration: 450, easing: "ease-out" });
    // The Studio decides first whether its saved design is safe to draw on this device.
    await root.studioBoot;
    const host = $("homeStudio");
    const r = host.getBoundingClientRect(), dpr = Math.min(root.Lite?.on ? 1 : 2, devicePixelRatio || 1);
    const cw = Math.round((r.width || 560) * dpr), ch = Math.round((r.height || 350) * dpr);
    // Drawing the card is a full render of the design, the slowest thing on the home page. The last one is
    // kept in the browser with a fingerprint of the design and size, so an unchanged design shows at once;
    // a changed one is drawn after the entrance has played, keeping the first second smooth.
    const key = hashStr(JSON.stringify(root.Studio?.state?.() || "") + cw + "x" + ch), seq = ++homeSeq;
    let kept = null;
    try { kept = JSON.parse(localStorage.getItem(SNAP) || "null"); } catch (e) {}
    if (kept?.url && !host.firstElementChild) { const img = new Image(); img.src = kept.url; img.alt = ""; host.appendChild(img); }
    if (kept?.k === key) return homeDone();
    // The kept picture is of an older design (or there is none yet): a tiny render of the current one,
    // blurred, stands in at once, so the card never shows the wrong picture or an empty frame while the
    // full one is drawn. A roll covers the card with its still copies anyway, so it skips this.
    if (!remixing) {
      const t = await root.Studio?.snapshot(Math.max(24, cw >> 4), Math.max(15, ch >> 4))?.catch(() => null);
      if (t && seq === homeSeq) { t.className = "lqip"; host.replaceChildren(t); }
    }
    // The first visit draws it while the loading screen is up, so the entrance plays on an idle page;
    // later changes wait for the entrance to finish.
    if (!document.documentElement.classList.contains("loading")) await root.introDone;
    if (seq !== homeSeq) return;
    const c = await root.Studio?.snapshot(cw, ch);
    if (!c || seq !== homeSeq) return;
    host.innerHTML = ""; host.appendChild(c); homeDone();
    if (fresh && !reduce.matches) c.animate(root.Lite?.on ? [{ opacity: 0, transform: "scale(1.03)" }, { opacity: 1, transform: "none" }] : [{ opacity: 0, transform: "scale(1.03)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "none" }], { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" });
    keepSnap(c, key);
  }
  // The picture is kept a moment later and encoded off the main thread (toDataURL took most of a second
  // on a weak device, and every roll waited on it); a quick run of rolls keeps only the last.
  let snapT = 0;
  function keepSnap(c, key) {
    clearTimeout(snapT);
    // Reading the picture back holds the page for a moment, so it waits out a roll rather than delaying its note.
    snapT = setTimeout(() => remixing ? keepSnap(c, key) : c.toBlob((b) => {
      if (!b) return;
      const fr = new FileReader();
      fr.onload = () => { try { localStorage.setItem(SNAP, JSON.stringify({ k: key, url: fr.result })); } catch (e) {} };
      fr.readAsDataURL(b);
    }, "image/jpeg", 0.85), 1500);
  }
  const SNAP = "isoline.homeSnap";
  let homeDone; const homeReady = new Promise((r) => (homeDone = r));
  let homeSeq = 0;
  const hashStr = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 16777619); return (a >>> 0).toString(36) + s.length; };

  // On the home page the logo rolls a new look for everything: a fresh palette, a new Studio design and a
  // new kit, both in that palette. The first click only nudges the logo, so a stray click changes nothing;
  // from the second on, every click rolls again.
  let brandClicks = 0, remixing = false;
  async function remixAll() {
    const mark = $("brand").querySelector("svg");
    // The safety click tips the logo to the right; the rolls after it tip it left.
    if (!reduce.matches) mark?.animate([{ transform: "rotate(0) scale(1)" }, { transform: `rotate(${brandClicks ? -14 : 14}deg) scale(.9)`, offset: 0.35 }, { transform: "rotate(0) scale(1)" }], { duration: 420, easing: "cubic-bezier(.3,1.4,.5,1)" });
    if (++brandClicks < 2 || remixing) return;
    // Every roll is kept, so undo brings back a look rolled past by accident and redo returns to it.
    if (homeAt < 0) { homeHist = [homeLook()]; homeAt = 0; }
    await homeChange(async () => {
      const pal = root.Palettes?.generate();
      if (!pal) return;
      // Surprise skips any look that would be slow to draw, so the new design is ready before the cards repaint.
      await root.Studio?.surprise?.(); root.Studio?.usePalette?.(pal);
      await root.Components?.remix?.(pal);
    });
    homeHist = homeHist.slice(0, homeAt + 1); homeHist.push(homeLook()); if (homeHist.length > 30) homeHist.shift();
    homeAt = homeHist.length - 1; syncHomeHist();
  }
  // ---------- saved looks ----------
  // The home page's three cards as one look (the Studio design, the palette and the kit), saved in this
  // browser, opened again in one go, and taken elsewhere as .json.
  const LOOKS = "isoline.looks";
  let looks = (() => { try { const v = JSON.parse(localStorage.getItem(LOOKS) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } })();
  const saveLooks = () => { try { localStorage.setItem(LOOKS, JSON.stringify(looks)); return true; } catch (e) { root.toastMsg?.("Browser storage is full. Export some looks, then delete them"); return false; } };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fileName = (n) => `${String(n || "look").replace(/[^\w-]+/g, "-").toLowerCase()}.isoline-look.json`;
  const validLook = (l) => l && Array.isArray(l.pal) && l.pal.every((h) => /^#[0-9a-f]{6}$/i.test(h)) && l.studio && typeof l.studio === "object" && l.kit && typeof l.kit === "object";
  // The thumbnail: the design, with the palette as a strip along the bottom.
  async function lookThumb(pal) {
    try {
      const c = await root.Studio.snapshot(192, 120), x = c.getContext("2d"), w = 192 / pal.length;
      pal.forEach((h, i) => { x.fillStyle = h; x.fillRect(Math.floor(i * w), 104, Math.ceil(w), 16); });
      return c.toDataURL("image/jpeg", 0.8);
    } catch (e) { return ""; }
  }
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString(); };
  function renderLooks() {
    const list = $("lkList");
    $("lkExportAll").disabled = !looks.length;
    list.innerHTML = looks.length ? looks.slice().sort((a, b) => b.at - a.at).map((l) => `
      <div class="dz-item" data-id="${l.id}">
        <button class="dz-main" data-act="open" title="Open this look"><span class="dz-thumb">${l.thumb ? `<img src="${l.thumb}" alt="">` : ""}</span><span class="dz-text"><b>${esc(l.name)}</b><small>${ago(l.at)}</small></span></button>
        <button class="ib xs" data-act="download" title="Download .json" aria-label="Download"><svg class="ic"><use href="#i-export"/></svg></button>
        <button class="ib xs" data-act="delete" title="Delete" aria-label="Delete"><svg class="ic"><use href="#i-trash"/></svg></button>
      </div>`).join("") : `<p class="dz-empty">Save the look on this page, the design, palette and kit together, to come back to it.</p>`;
  }
  async function saveLook() {
    const l = homeLook(), name = $("lkName").value.trim() || `Look ${looks.length + 1}`;
    looks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.slice(0, 60), at: Date.now(), thumb: await lookThumb(l.pal || []), ...l });
    if (!saveLooks()) { looks.pop(); return; }
    $("lkName").value = ""; renderLooks(); root.toastMsg?.(`Saved ${name}`);
  }
  async function openLook(l) {
    if (remixing) return;
    $("looksMenu").hidden = true; root.syncScrim?.();
    if (homeAt < 0) { homeHist = [homeLook()]; homeAt = 0; }
    await homeChange(async () => { root.Palettes?.load(l.pal); root.Studio?.apply(l.studio); await root.Components?.setLook?.(l.kit); }, "Opening the look");
    homeHist = homeHist.slice(0, homeAt + 1); homeHist.push(homeLook()); homeAt = homeHist.length - 1; syncHomeHist();
  }
  const download = (data, name) => root.downloadBlob?.(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), name, "Look saved");
  $("lkSave").onclick = saveLook;
  $("lkName").onkeydown = (e) => { if (e.key === "Enter") saveLook(); };
  $("lkList").onclick = (e) => {
    const b = e.target.closest("[data-act]"), id = e.target.closest(".dz-item")?.dataset.id, l = looks.find((x) => x.id === id);
    if (!b || !l) return;
    if (b.dataset.act === "open") openLook(l);
    else if (b.dataset.act === "download") download({ app: "isoline", kind: "look", ...l }, fileName(l.name));
    else if (b.dataset.act === "delete") {
      const i = looks.indexOf(l); looks.splice(i, 1); saveLooks(); renderLooks();
      root.toastMsg?.(`Deleted ${l.name}`, { action: "Undo", onAction: () => { looks.splice(i, 0, l); saveLooks(); renderLooks(); } });
    }
  };
  $("lkExportAll").onclick = () => download({ app: "isoline", kind: "looks", items: looks }, "isoline-looks.json");
  $("lkImport").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const d = JSON.parse(await f.text()), items = (d.kind === "looks" ? d.items : [d]).filter(validLook);
      if (!items.length) throw new Error("no looks");
      for (const l of items) looks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(l.name || "Imported look").slice(0, 60), at: Date.now(), thumb: typeof l.thumb === "string" && l.thumb.startsWith("data:image/") ? l.thumb : "", pal: l.pal, studio: l.studio, kit: l.kit });
      if (saveLooks()) { renderLooks(); root.toastMsg?.(items.length === 1 ? `Imported ${items[0].name || "a look"}` : `Imported ${items.length} looks`); }
    } catch (err) { root.toastMsg?.("That file has no Isoline looks in it"); }
  };

  // ---------- the logo's shine ----------
  // On the home page a soft band of dithered light crosses the logo now and then, as on Apple's hardware
  // pages, a hint that it does something. A copy of the logo in the light's color sits over it and shows
  // only inside the band (a gradient mask crossed with a dither pattern).
  let shineT = 0;
  function shineLater(ms = 8000 + Math.random() * 7000) { clearTimeout(shineT); shineT = setTimeout(shine, ms); }
  function shine() {
    const b = $("brand");
    const busy = route !== "home" || remixing || document.hidden || b.matches(":hover") || document.documentElement.classList.contains("loading") || document.querySelector(".tour-tip");
    if (reduce.matches) return;
    if (!busy) {
      let g = b.querySelector(".brand-shine");
      if (!g) { g = document.createElement("span"); g.className = "brand-shine"; g.setAttribute("aria-hidden", "true"); g.innerHTML = b.innerHTML; b.appendChild(g); }
      g.classList.remove("go"); void g.offsetWidth; g.classList.add("go");
    }
    shineLater();
  }
  // ---------- home undo and redo ----------
  let homeHist = [], homeAt = -1;
  const homeLook = () => ({ pal: root.Palettes?.colors(), studio: root.Studio?.state(), kit: root.Components?.look?.() });
  async function homeStep(d) {
    const n = homeAt + d;
    if (remixing || n < 0 || n >= homeHist.length) return;
    homeAt = n; syncHomeHist();
    const l = homeHist[n];
    await homeChange(async () => { if (l.pal) root.Palettes?.load(l.pal); if (l.studio) root.Studio?.apply(l.studio); await root.Components?.setLook?.(l.kit); }, "Going back to that look");
  }
  function syncHomeHist() {
    const b = $("brand"); $("homeHist").style.left = b.offsetLeft + b.offsetWidth + 8 + "px";
    $("homeUndo").disabled = homeAt <= 0; $("homeRedo").disabled = homeAt < 0 || homeAt >= homeHist.length - 1;
    $("homeHist").classList.toggle("on", homeHist.length > 1);
  }
  $("homeUndo").onclick = () => homeStep(-1);
  $("homeRedo").onclick = () => homeStep(1);
  addEventListener("keydown", (e) => {
    if (route !== "home" || !(e.metaKey || e.ctrlKey) || keyOf(e) !== "z" || e.target.closest?.("input, textarea, [contenteditable]")) return;
    e.preventDefault(); homeStep(e.shiftKey ? 1 : -1);
  });
  // As in the Studio when a look is applied: each card keeps a still copy of its old picture on top
  // while the new one is made underneath, and once all three are ready the copies fade out together,
  // so nothing flashes and the cards change as one. A small note by the logo shows it's working.
  let busyHide = 0;
  async function homeChange(work, label = "Rolling a new look") {
    remixing = true;
    const busy = $("remixBusy"), h = $("homeHist");
    const b = $("brand"), on = h.classList.contains("on");
    busy.style.left = (on ? h.offsetLeft + h.offsetWidth : b.offsetLeft + b.offsetWidth) + 8 + "px";
    // The note shows at once and reaches the screen before the work starts: the work holds the main
    // thread, so a note left to a timer or to the next frame would come late or not at all.
    clearTimeout(busyHide);
    busy.lastChild.textContent = label; busy.hidden = false;
    const shown = performance.now();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const ghosts = ["homeStudio", "homePalette", "homeComponents"].map((id) => ghostOver($(id)));
    try {
      await work();
      await paintHome(false);
      // New kit fonts get a moment to arrive, but a slow connection never holds the roll: they swap in late.
      await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 900))]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    } catch (err) { console.error("home change failed", err); } finally {
      remixing = false;
      // Kept up for a moment at least, so a quick roll doesn't blink it.
      busyHide = setTimeout(() => (busy.hidden = true), Math.max(0, 450 - (performance.now() - shown)));
      for (const g of ghosts) if (g) { g.style.opacity = "0"; setTimeout(() => g.remove(), 700); }
    }
  }
  // A still copy of a card's picture, laid over it (outside it, since the card's contents get replaced).
  function ghostOver(host) {
    if (!host || reduce.matches) return null;
    const g = document.createElement("div");
    g.className = "home-ghost"; g.setAttribute("aria-hidden", "true");
    g.style.cssText = host.style.cssText;
    Object.assign(g.style, { left: host.offsetLeft + "px", top: host.offsetTop + "px", width: host.offsetWidth + "px", height: host.offsetHeight + "px" });
    for (const n of host.children) {
      if (n.tagName === "CANVAS") { const c = document.createElement("canvas"); c.width = n.width; c.height = n.height; c.getContext("2d").drawImage(n, 0, 0); c.className = n.className; g.appendChild(c); }
      else g.appendChild(n.cloneNode(true));
    }
    g.classList.add(...[...host.classList].filter((c) => c !== "tool-prev"));
    host.parentElement.appendChild(g);
    return g;
  }

  document.addEventListener("click", (e) => {
    if (route === "home" && e.target.closest("#brand") && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); remixAll(); return; }
    const a = e.target.closest("a[href^='#/']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(parse(a.getAttribute("href")));
  });
  addEventListener("popstate", () => go(parse(location.hash), false));
  addEventListener("palette-change", () => { if (route === "home" && !remixing) paintHome(); });

  const Shell = { go, route: null, looks: () => renderLooks() };
  root.Shell = Shell;
  // A fresh visit (typed, a bookmark, the address bar filling in the last page) starts on the main menu.
  // A bare tool route carries nothing to open, so only reloads, back/forward and links holding a design
  // or a palette land straight in a tool.
  const nav = performance.getEntriesByType?.("navigation")[0]?.type;
  if (nav === "navigate" && /^#\/(studio|palettes|components)\/?$/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  visited.add(parse(location.hash));
  show(parse(location.hash));
  // First load: the page stays out of sight until its fonts are in (or a moment has passed), then the
  // top bar settles and the page's panels rise in one after another, so nothing flashes or shifts.
  // The entrance ends when its animations do, not on a timer, so a busy first second can't cut it short.
  // Heavy start-up work (compiling every shader, drawing thumbnails) waits on introDone to keep the
  // main thread free while it plays.
  const done = () => root.__introDone?.();
  root.introDone.then(() => shineLater(3500));
  const html = document.documentElement, reveal = () => {
    // The loading screen, if it got as far as showing, opens from its middle rather than cutting out.
    const sp = $("splash"), shown = sp && +getComputedStyle(sp).opacity > 0.05;
    if (shown) { sp.style.setProperty("--from", getComputedStyle(sp).opacity); sp.classList.add("out"); setTimeout(() => sp.remove(), 850); } else sp?.remove();
    html.classList.remove("loading");
    if (reduce.matches) return done();
    html.classList.add("intro");
    requestAnimationFrame(() => {
      const anims = document.getAnimations().filter((a) => /^intro/.test(a.animationName || ""));
      Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 4000))]).then(() => { html.classList.remove("intro"); done(); });
    });
  };
  // The studio also waits for its first drawing (and for a shared design, when the link holds one), so the
  // page doesn't appear empty and then pop; the loading screen covers the wait if it runs long.
  const firstLook = route === "studio" ? root.firstPaint : route === "home" ? homeReady : null;
  Promise.race([Promise.all([document.fonts?.ready || Promise.resolve(), firstLook]), new Promise((r) => setTimeout(r, firstLook ? 4000 : 700))]).then(() => requestAnimationFrame(() => requestAnimationFrame(reveal)));
})(window);
