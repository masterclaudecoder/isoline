// Shell: routes between the home page and the tools (#/, #/studio, #/palettes) and makes each change a
// seamless transition. The top bar stays put, the old page slides away as the new one arrives, and a tool's
// preview on the home page morphs into the tool itself (View Transitions where available, a short
// slide otherwise).
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ORDER = { home: 0, studio: 1, palettes: 2 };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const parse = (h) => (h.startsWith("#/palettes") ? "palettes" : h.startsWith("#/studio") ? "studio" : "home");
  const hashFor = (r) => (r === "home" ? "#/" : "#/" + r);
  let route = null;

  function show(r) {
    route = r;
    Shell.route = r;
    for (const p of document.querySelectorAll(".page")) p.hidden = p.dataset.page !== r;
    for (const el of document.querySelectorAll("[data-for]")) el.hidden = el.dataset.for !== r;
    document.body.dataset.route = r;
    if (r === "studio") root.Studio?.onShow();
    if (r === "palettes") root.Palettes?.onShow(location.hash);
    if (r === "home") paintHome();
  }
  function go(r, push = true) {
    if (r === route) return;
    if (push) history.pushState(null, "", hashFor(r));
    const from = route, dir = ORDER[r] >= ORDER[from] ? "fwd" : "back";
    document.documentElement.dataset.dir = dir;
    if (reduce.matches || from == null) return show(r);
    if (document.startViewTransition) { document.startViewTransition(() => show(r)); return; }
    // Fallback: the old page eases out, then the new one eases in.
    const old = document.querySelector(`.page[data-page="${from}"]`);
    old.classList.add("leaving");
    setTimeout(() => { old.classList.remove("leaving"); show(r); const nu = document.querySelector(`.page[data-page="${r}"]`); nu.classList.add("arriving"); setTimeout(() => nu.classList.remove("arriving"), 460); }, 200);
  }

  // Home previews: the studio's current design and the palette tool's current colors.
  async function paintHome() {
    const pal = root.Palettes?.colors() || [];
    $("homePalette").innerHTML = pal.map((c) => `<i style="background:${c}"></i>`).join("");
    const host = $("homeStudio");
    const c = await root.Studio?.snapshot(560, 350);
    if (c) { host.innerHTML = ""; host.appendChild(c); }
  }

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
})(window);
