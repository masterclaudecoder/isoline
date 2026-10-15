// Shell: routes between the home page and the tools (#/, #/studio, #/palettes) and makes each change a
// seamless transition. The top bar stays put, the old page slides away as the new one arrives, and a tool's
// preview on the home page morphs into the tool itself (View Transitions where available, a short
// slide otherwise).
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ORDER = { home: 0, studio: 1, palettes: 2, components: 3 };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const parse = (h) => (h.startsWith("#/palettes") ? "palettes" : h.startsWith("#/studio") ? "studio" : h.startsWith("#/components") ? "components" : "home");
  const hashFor = (r) => (r === "home" ? "#/" : "#/" + r);
  let route = null;

  // inVT: the page is arriving inside a view transition, which already pulls the bars up, so their own
  // entrance is skipped (it would restart and play a second time once the transition ends).
  function show(r, inVT = false) {
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
    if (r === "home") paintHome();
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
  function go(r, push = true) {
    if (r === (want ?? route)) return;
    want = r;
    if (push) history.pushState(null, "", hashFor(r));
    const from = route; Shell.from = from;
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
  async function paintHome() {
    const pal = root.Palettes?.colors() || [], w = root.Palettes?.weights?.() || [];
    $("homePalette").innerHTML = pal.map((c, i) => `<i style="background:${c};flex-grow:${w[i] || 1}"></i>`).join("");
    root.Components?.preview($("homeComponents"));
    const host = $("homeStudio");
    const r = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const cw = Math.round((r.width || 560) * dpr), ch = Math.round((r.height || 350) * dpr);
    // Drawing the card is a full render of the design, the slowest thing on the home page. The last one is
    // kept in the browser with a fingerprint of the design and size, so an unchanged design shows at once;
    // a changed one is drawn after the entrance has played, keeping the first second smooth.
    const key = hashStr(JSON.stringify(root.Studio?.state?.() || "") + cw + "x" + ch), seq = ++homeSeq;
    let kept = null;
    try { kept = JSON.parse(localStorage.getItem(SNAP) || "null"); } catch (e) {}
    if (kept?.url && !host.firstElementChild) { const img = new Image(); img.src = kept.url; img.alt = ""; host.appendChild(img); }
    if (kept?.k === key) return;
    await root.introDone;
    if (seq !== homeSeq) return;
    const c = await root.Studio?.snapshot(cw, ch);
    if (!c || seq !== homeSeq) return;
    host.innerHTML = ""; host.appendChild(c);
    try { localStorage.setItem(SNAP, JSON.stringify({ k: key, url: c.toDataURL("image/jpeg", 0.85) })); } catch (e) {}
  }
  const SNAP = "isoline.homeSnap";
  let homeSeq = 0;
  const hashStr = (s) => { let a = 0x811c9dc5; for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 16777619); return (a >>> 0).toString(36) + s.length; };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#/']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    go(parse(a.getAttribute("href")));
  });
  addEventListener("popstate", () => go(parse(location.hash), false));
  addEventListener("palette-change", () => { if (route === "home") paintHome(); });

  const Shell = { go, route: null };
  root.Shell = Shell;
  show(parse(location.hash));
  // First load: the page stays out of sight until its fonts are in (or a moment has passed), then the
  // top bar settles and the page's panels rise in one after another, so nothing flashes or shifts.
  // The entrance ends when its animations do, not on a timer, so a busy first second can't cut it short.
  // Heavy start-up work (compiling every shader, drawing thumbnails) waits on introDone to keep the
  // main thread free while it plays.
  const done = () => root.__introDone?.();
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
  const firstLook = route === "studio" ? root.firstPaint : null;
  Promise.race([Promise.all([document.fonts?.ready || Promise.resolve(), firstLook]), new Promise((r) => setTimeout(r, firstLook ? 4000 : 700))]).then(() => requestAnimationFrame(() => requestAnimationFrame(reveal)));
})(window);
