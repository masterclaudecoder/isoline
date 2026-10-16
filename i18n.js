// Interface language. The markup and scripts are written in English; in Russian the dictionary in
// ru.js is applied to the page as it renders (text, tooltips, labels and placeholders), so nothing
// else has to know about languages. Names (presets, palettes, fonts, brands) and the kit preview stay
// as they are. A string with no entry stays English rather than breaking.
(function (root) {
  const KEY = "isoline.lang";
  let pref = "auto";
  try { pref = localStorage.getItem(KEY) || "auto"; } catch (e) {}
  const auto = /^ru\b/i.test(navigator.language || "") ? "ru" : "en";
  const lang = pref === "ru" || pref === "en" ? pref : auto;
  const I18N = { lang, pref, t: (s) => s, missing: new Set() };
  root.I18N = I18N;
  const D = lang === "ru" ? root.I18N_RU || {} : null;
  if (!D) return;
  document.documentElement.lang = "ru";
  document.documentElement.classList.add("lang-ru");

  // Entries are exact strings, or patterns where {n} stands for a number and {s} for a phrase that is
  // translated on its own. {n:один|два|пять} picks the Russian plural for the number before it.
  const exact = new Map(), lower = new Map(), pats = [];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [k, v] of Object.entries(D)) {
    if (/\{[ns]\}/.test(k)) {
      const kinds = [...k.matchAll(/\{([ns])\}/g)].map((m) => m[1]);
      const re = new RegExp("^" + esc(k).replace(/\\\{n\\\}/g, "(-?\\d+(?:[.,]\\d+)?)").replace(/\\\{s\\\}/g, "(.+?)") + "$");
      pats.push([re, kinds, v]);
    } else { exact.set(k, v); lower.set(k.toLowerCase(), v); }
  }
  const plural = (n, forms) => {
    const [one, few, many] = forms.split("|"), a = Math.abs(Math.trunc(n)), d = a % 10, h = a % 100;
    if (n % 1) return few;
    return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
  };
  // A phrase inside a pattern ("Randomize {s}") is looked up whatever its case and takes the case it came in.
  const phrase = (s) => {
    const v = exact.get(s) ?? lower.get(s.toLowerCase()) ?? tr(s);
    if (v == null) return s;
    return s[0] === s[0].toLowerCase() && s[0] !== s[0].toUpperCase() ? v[0].toLowerCase() + v.slice(1) : v;
  };
  function tr(s) {
    const hit = exact.get(s);
    if (hit != null) return hit;
    for (const [re, kinds, v] of pats) {
      const m = s.match(re);
      if (!m) continue;
      const nums = [], strs = [];
      kinds.forEach((k, i) => (k === "n" ? nums : strs).push(m[i + 1]));
      let ni = 0, si = 0, last = 0;
      return v.replace(/\{n(?::([^}]+))?\}|\{s\}|\{p:([^}]+)\}/g, (all, forms, pforms) => {
        if (all === "{s}") return phrase(strs[si++]);
        if (pforms) return plural(parseFloat(String(last).replace(",", ".")), pforms);
        last = nums[ni++];
        return forms ? last + " " + plural(parseFloat(String(last).replace(",", ".")), forms) : last;
      });
    }
    return null;
  }
  const LATIN = /[A-Za-z]{2}/, CYR = /[А-Яа-яЁё]/;
  const cache = new Map();
  function t(s) {
    if (!s || !LATIN.test(s) || CYR.test(s)) return s;
    const core = s.trim();
    let v = cache.get(core);
    if (v === undefined) {
      v = tr(core);
      cache.set(core, v);
      if (v == null) I18N.missing.add(core);
    }
    return v == null ? s : core === s ? v : s.replace(core, v);
  }
  I18N.t = t;

  // Left alone: the kit preview (a made-up product shown in your fonts), names of presets, palettes,
  // colors and fonts, code, and anything marked translate="no".
  const SKIP = '[translate="no"], .kit, .cps, .pt-name, .pt-hex, .cp-grid .lib, #presetGrid .card b, .ff-list, .ff-trigger span, .cp-pairs small, .pair-t small, .dz-text, .lg-word, pre, code, script, style, svg';
  const ATTRS = ["title", "aria-label", "placeholder", "data-tip", "alt"];
  const skipped = (el) => !!el?.closest?.(SKIP);
  function text(n) { const v = n.nodeValue, r = t(v); if (r !== v) n.nodeValue = r; }
  function attrs(el) { for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const r = t(v); if (r !== v) el.setAttribute(a, r); } } }
  function walk(node) {
    if (node.nodeType === 3) { if (!skipped(node.parentElement)) text(node); return; }
    if (node.nodeType !== 1 || skipped(node)) return;
    attrs(node);
    const w = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n; (n = w.nextNode()); ) n.nodeType === 3 ? text(n) : attrs(n);
  }
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "childList") m.addedNodes.forEach(walk);
      else if (m.type === "characterData") { if (!skipped(m.target.parentElement)) text(m.target); }
      else if (!skipped(m.target)) { const v = m.target.getAttribute(m.attributeName); if (v) { const r = t(v); if (r !== v) m.target.setAttribute(m.attributeName, r); } }
    }
  });
  const start = () => {
    walk(document.body);
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.title = t(document.title);
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})(window);

// The language switch in Settings saves the choice and reloads, so every part starts in that language.
document.addEventListener("DOMContentLoaded", () => {
  const seg = document.getElementById("lang");
  if (!seg) return;
  const cur = I18N.pref === "ru" || I18N.pref === "en" ? I18N.pref : "auto";
  for (const b of seg.querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === cur);
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b || b.dataset.v === cur) return;
    try { localStorage.setItem("isoline.lang", b.dataset.v); } catch (err) {}
    location.reload();
  });
});
