// Components: a filterable directory of UI libraries, and a token builder (type, color, spacing, radius,
// elevation, motion and design rules) with live component and landing-page previews and exports for
// code and for AI agents.
(function (root) {
  "use strict";
  const C = root.Color, picker = root.ColorPicker;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- library directory ----------
  // The list itself lives in libs.js.
  const ANY = "Any";
  const LIBS = root.ISO_LIBS.map(([name, url, desc, fw, cat, pick]) => ({ name, url, desc, fw, cat, pick: !!pick }));
  const FRAMEWORKS = root.ISO_FRAMEWORKS;
  const CATS = ["Picks", ...new Set(LIBS.map((l) => l.cat))];

  // ---------- builder state ----------
  // Font pairings from Google Fonts: [name, heading, body, heading weight].
  const PAIRS = [
    ["Instrument", "Instrument Sans", "Instrument Sans", 600], ["Inter", "Inter Tight", "Inter", 600], ["Editorial", "Fraunces", "Inter", 600],
    ["Grotesk", "Space Grotesk", "IBM Plex Sans", 600], ["Classic", "Playfair Display", "Source Sans 3", 700], ["DM", "DM Serif Display", "DM Sans", 400],
    ["Bold", "Syne", "Manrope", 700], ["Friendly", "Bricolage Grotesque", "Figtree", 700], ["Newsroom", "Newsreader", "Inter", 600],
    ["Geometric", "Sora", "Plus Jakarta Sans", 600], ["Wide", "Unbounded", "Onest", 600], ["Archive", "Archivo", "Archivo", 700],
    ["Literary", "Libre Caslon Text", "Libre Franklin", 700], ["Developer", "JetBrains Mono", "Inter", 700], ["Geist", "Geist", "Geist", 600],
  ];
  const RULES = [
    "No separator glyphs between items (·, •, |, em dashes). Use spacing, layout or a comma.",
    "No ALL CAPS labels. Use sentence case for every label and heading.",
    "No eyebrow label above a headline with a subtitle below it. One strong heading, then compact copy.",
    "Keep copy short and direct. No filler, no marketing clichés.",
    "Use icons sparingly, from one consistent set. Never as decoration.",
    "No colored shadows. Shadows are soft and neutral.",
    "No logos made of a letter in a square, or just the name with no design to it.",
    "Animate state changes with slight variation between elements, and respect reduced motion.",
    "Text meets WCAG AA contrast: 4.5:1 for body text, 3:1 for large text.",
    "One thing leads on each screen. Make it larger or heavier and let the rest recede.",
    "Group with space and hairline rules before adding a card. Never put cards inside cards.",
    "Avoid a small label over a big number. Put figures in a sentence, a table or on the picture itself.",
    "Tag only what varies. A badge repeated on every row says nothing.",
    "No badge above a headline, no invented statistics, no logo walls or stock testimonials.",
    "Design for zero, one, a typical number and a thousand items, and for text of any length.",
    "Design the empty, loading and error states, not only the full one.",
    "Use one hover style everywhere. Nothing lifts, scales or slides on hover.",
    "Animate opening, closing, adding, removing and reordering. Motion explains a change and never decorates.",
    "Keep the accent for calls to action and selection, and give every control in a row the same height.",
    "Write headlines that say what the product does. If a line could sell any product, rewrite it.",
    "Left-align the hero and lead with a real picture of the product, not a centered slogan.",
    "No icon in a colored tile above every feature, no rows of three identical cards, no bento grids.",
    "No arrow or chevron on every button. Keep them for links that move you forward.",
    "No status dots or markers that never change state.",
    "No dark call-to-action band closing every page.",
    "Lay out each page for its task. Don't reuse one hero, features, stats and call-to-action skeleton everywhere.",
  ];
  const RULES_V = 3;
  const KEY = "isoline-kit";
  const DEF = {
    mode: "libraries", fw: "All", cat: "All", q: "", slot: "type", view: "components", layout: "home", dark: null, follow: true,
    fit: true, pw: 1440, ph: 900, tint: "tinted", src: null, art: "none", enter: "rise", exit: "fade", stagger: 50, trigger: "load",
    pair: 0, head: "", body: "", scale: 1.25, base: 16, tracking: -0.02,
    rc: null,
    unit: 4, density: 1, radius: 10, pill: false, elevation: "soft", dur: 200, ease: "out",
    rules: RULES.map((t) => ({ t, on: true })),
  };
  let K = { ...DEF };
  try { K = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) {} };
  if (K.view === "landing") K.view = "pages";
  // Rules added in later versions join a saved list once, after the rules already there.
  if ((K.rulesV || 1) < RULES_V) { const have = new Set(K.rules.map((r) => r.t)); for (const t of RULES) if (!have.has(t)) K.rules.push({ t, on: true }); K.rulesV = RULES_V; save(); }
  const fonts = () => { const p = PAIRS[K.pair] || PAIRS[0]; return { head: K.head || p[1], body: K.body || p[2], weight: p[3] }; };
  // Your own fonts: uploaded files live in IndexedDB and load through the FontFace API.
  const custom = new Set();
  const fontDB = () => new Promise((res) => { try { const r = indexedDB.open("isoline-fonts", 1); r.onupgradeneeded = () => r.result.createObjectStore("fonts", { keyPath: "name" }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  async function addFont(name, buf, store = true) {
    try { const face = new FontFace(name, buf); await face.load(); document.fonts.add(face); custom.add(name); } catch (e) { root.toastMsg?.(`Couldn't read ${name}`); return false; }
    if (store) { const db = await fontDB(); db?.transaction("fonts", "readwrite").objectStore("fonts").put({ name, buf }); }
    return true;
  }
  async function removeFont(name) { custom.delete(name); const db = await fontDB(); db?.transaction("fonts", "readwrite").objectStore("fonts").delete(name); }
  fontDB().then((db) => { if (!db) return; const q = db.transaction("fonts").objectStore("fonts").getAll(); q.onsuccess = async () => { for (const f of q.result || []) await addFont(f.name, f.buf, false); if (K.slot === "type" && !build.hidden) renderOpts(); renderStage?.(); }; });
  const loaded = new Set();
  function loadFont(f) {
    if (!f || loaded.has(f) || f === "Instrument Sans" || custom.has(f)) return;
    loaded.add(f);
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(l);
  }
  // Until you change a color, the kit wears Isoline's own colors: its paper, panels and ink in the
  // app's current light or dark theme, with the app's accent. dark: null means "same as the app".
  const UI = {
    light: { bg: "#efeeea", surface: "#fbfbf9", text: "#1c1c1e", muted: "#77756f" },
    dark: { bg: "#131312", surface: "#1c1c1a", text: "#edece8", muted: "#8f8d86" },
  };
  const appDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
  const isDark = () => (K.dark == null ? appDark() : K.dark);
  const appAccent = () => C.parseHex(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()) || "#e8572a";
  // Colors are named roles, one set for light and one for dark. Text on the accent is worked out.
  const ROLES = [["bg", "Page", "Behind everything"], ["surface", "Surface", "Cards, panels and inputs"], ["text", "Text", "Headings and body copy"], ["muted", "Muted text", "Captions, hints and meta"], ["border", "Border", "Lines and outlines"], ["accent", "Accent", "Buttons, links and selection"]];
  const onOf = (a) => (C.contrast(a, "#ffffff") >= C.contrast(a, "#111111") ? "#ffffff" : "#111111");
  // From a loose palette. The most colorful color (not too light or dark) becomes the accent. The page,
  // surface and text are near-neutrals in the palette's hue, so a bright palette doesn't flood the page:
  // "neutral" keeps them grey, "tinted" leans them toward the hue, "bold" uses the palette's own lightest
  // and darkest colors. The accent is nudged until it reads on the page.
  const lch = (c) => C.toOklch(c);
  function rolesFrom(cs, dark, tint = "tinted") {
    const byL = cs.slice().sort((a, b) => lch(a)[0] - lch(b)[0]);
    const score = (c) => { const [l, ch] = lch(c); return ch * (1 - Math.abs(l - 0.6)); };
    const acc0 = cs.slice().sort((a, b) => score(b) - score(a))[0];
    const [, ac, ah] = lch(acc0);
    const end = dark ? byL[0] : byL[byL.length - 1], [, ec, eh] = lch(end);
    const hue = ec > 0.025 ? eh : ah;
    let bg, surface, text;
    if (tint === "bold") {
      bg = end; text = dark ? byL[byL.length - 1] : byL[0];
      if (C.contrast(text, bg) < 7) text = dark ? "#f6f5f2" : "#141414";
      surface = C.mixOklab(bg, dark ? "#ffffff" : "#ffffff", dark ? 0.05 : 0.4);
    } else {
      const c = tint === "neutral" ? 0.004 : Math.min(0.032, Math.max(ec * 0.45, ac * 0.1));
      bg = C.fromOklch(dark ? 0.175 : 0.972, c, hue);
      surface = C.fromOklch(dark ? 0.215 : 0.993, c * 0.55, hue);
      text = C.fromOklch(dark ? 0.94 : 0.22, Math.min(c * 0.7, 0.02), hue);
    }
    let accent = acc0;
    for (let i = 0; i < 24 && C.contrast(accent, bg) < 3; i++) { const [l, ch, h] = lch(accent); accent = C.fromOklch(dark ? Math.min(0.92, l + 0.03) : Math.max(0.25, l - 0.03), ch, h); }
    return { bg, surface, text, muted: C.mixOklab(bg, text, 0.6), border: C.mixOklab(bg, text, dark ? 0.17 : 0.12), accent };
  }
  const fromSource = () => ({ light: rolesFrom(K.src, false, K.tint), dark: rolesFrom(K.src, true, K.tint) });
  // The strength options preview a small page in each tint, in the current mode.
  root.UI?.tipPreview("tint", (tint) => {
    if (!K.src) return "";
    const r = rolesFrom(K.src, isDark(), tint);
    return `<div class="tp-kit" style="background:${r.bg};color:${r.text}">Aa<i style="width:70px"></i><i style="width:52px;color:${r.muted}"></i><span class="tp-card" style="background:${r.surface};border-color:${r.border}"><i style="width:48px"></i><span class="tp-pill" style="background:${r.accent}"></span></span></div>`;
  });
  const appRoles = (dark) => { const u = UI[dark ? "dark" : "light"]; return { ...u, border: C.mixOklab(u.bg, u.text, 0.1), accent: appAccent() }; };
  // Older saves kept a loose list of colors; they become role sets once.
  if (!K.rc && Array.isArray(K.colors) && !K.follow) { K.src = K.colors; K.rc = fromSource(); }
  const mode = () => (isDark() ? "dark" : "light");
  // Editing any role takes the kit off the app's colors, starting from what it showed.
  function unfollow() { if (!K.follow) return; K.rc = { light: appRoles(false), dark: appRoles(true) }; K.follow = false; }
  function roles() {
    const r = K.follow || !K.rc ? appRoles(isDark()) : K.rc[mode()];
    const appOn = K.follow ? C.parseHex(getComputedStyle(document.documentElement).getPropertyValue("--on-accent").trim()) : null;
    return { ...r, onAccent: appOn || onOf(r.accent), contrast: C.contrast(r.text, r.bg) };
  }
  const SHADOWS = { none: "none", hairline: "0 0 0 1px var(--k-border)", soft: "0 1px 2px rgba(0,0,0,.05), 0 8px 24px -10px rgba(0,0,0,.14)", crisp: "0 1px 0 rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.08)", lifted: "0 18px 40px -16px rgba(0,0,0,.28)" };
  const EASE = { linear: "linear", out: "cubic-bezier(.22,1,.36,1)", inout: "cubic-bezier(.65,0,.35,1)", spring: "cubic-bezier(.34,1.56,.64,1)" };
  const space = (n) => Math.round(K.unit * n * K.density);
  function tokens() {
    const f = fonts(), r = roles(), sz = (n) => +(K.base * Math.pow(K.scale, n)).toFixed(1);
    return {
      font: { heading: f.head, body: f.body, headingWeight: f.weight, tracking: K.tracking },
      size: { sm: sz(-1), base: K.base, lg: sz(1), xl: sz(2), "2xl": sz(3), "3xl": sz(4), "4xl": sz(5) },
      color: { bg: r.bg, surface: r.surface, text: r.text, muted: r.muted, border: r.border, accent: r.accent, onAccent: r.onAccent },
      space: Object.fromEntries([1, 2, 3, 4, 6, 8, 12, 16].map((n) => [n, space(n)])),
      radius: { base: K.radius, button: K.pill ? 999 : K.radius },
      shadow: SHADOWS[K.elevation],
      motion: { duration: K.dur, easing: EASE[K.ease], appear: K.enter, disappear: K.exit, stagger: K.stagger, trigger: K.trigger === "scroll" ? "scroll" : "load" },
    };
  }
  function vars(el) {
    const t = tokens();
    const v = { "--k-head": `"${t.font.heading}"`, "--k-body": `"${t.font.body}"`, "--k-hw": t.font.headingWeight, "--k-track": t.font.tracking + "em", "--k-bg": t.color.bg, "--k-surface": t.color.surface, "--k-text": t.color.text, "--k-muted": t.color.muted, "--k-border": t.color.border, "--k-accent": t.color.accent, "--k-on-accent": t.color.onAccent, "--k-r": t.radius.base + "px", "--k-rb": t.radius.button + "px", "--k-shadow": t.shadow, "--k-dur": t.motion.duration + "ms", "--k-ease": t.motion.easing };
    for (const [k, px] of Object.entries(t.size)) v["--k-" + k] = px + "px";
    for (const [k, px] of Object.entries(t.space)) v["--k-s" + k] = px + "px";
    for (const [k, val] of Object.entries(v)) el.style.setProperty(k, val);
    loadFont(t.font.heading); loadFont(t.font.body);
    // The motion demo moves in exactly the chosen duration and easing, resting between moves.
    const dot = el.querySelector(".k-track i");
    if (dot && !root.UI?.reduce.matches) {
      const d = t.motion.duration, hold = 700, tot = 2 * d + 2 * hold, span = (dot.parentElement.clientWidth || 320) - 28, e = t.motion.easing;
      const key = d + e + span;
      if (dot._key !== key) {
        dot._anim?.cancel(); dot._key = key;
        dot._anim = dot.animate([{ translate: "0 0", offset: 0 }, { translate: "0 0", offset: hold / tot, easing: e }, { translate: `${span}px 0`, offset: (hold + d) / tot }, { translate: `${span}px 0`, offset: (2 * hold + d) / tot, easing: e }, { translate: "0 0", offset: 1 }], { duration: tot, iterations: Infinity });
      }
    }
    // Printed values in the specimen.
    const on = K.rules.filter((r) => r.on && r.t.trim());
    const tok = { elevation: `${K.elevation[0].toUpperCase() + K.elevation.slice(1)} shadow`, "motion.name": `${{ linear: "linear", out: "ease out", inout: "ease in and out", spring: "spring" }[K.ease]}, ${K.enter === "none" ? "no entrance" : MOVE_NAME[K.enter].toLowerCase() + " in"}, ${K.exit === "none" ? "no exit" : MOVE_NAME[K.exit].toLowerCase() + " out"}`, artwork: K.art === "studio" ? "Your Studio design, behind the product picture" : "None. Pages use plain backgrounds", "motion.duration": t.motion.duration + "ms", rules: on.length ? on.slice(0, 3).map((r) => `<span>${esc(r.t.trim())}</span>`).join("") + (on.length > 3 ? `<small>and ${on.length - 3} more in the brief</small>` : "") : "<small>No rules on</small>" };
    for (const n of el.querySelectorAll("[data-tok]")) {
      const key = n.dataset.tok, [a, b] = key.split(".");
      const val = key in tok ? tok[key] : a === "size" || a === "space" || a === "radius" ? (a === "radius" ? (b === "button" ? (K.pill ? "pill" : t.radius.button + "px") : t.radius.base + "px") : t[a][b] + "px") : a === "color" ? t.color[b === "bg" ? "bg" : b].toUpperCase() : "";
      if (key === "rules") n.innerHTML = val; else if (n.textContent !== val) n.textContent = val;
    }
  }

  // ---------- previews ----------
  // Everything in the preview reads the --k-* variables, so every token change shows up at once.
  // Icons are drawn on the same 20px grid as the app's own.
  const KI = {
    arrow: '<path d="M4.5 10h11M11 5.5l4.5 4.5-4.5 4.5"/>', check: '<path d="m5 10.5 3 3 7-7"/>', search: '<circle cx="9" cy="9" r="5"/><path d="m16 16-3.4-3.4"/>',
    users: '<circle cx="8" cy="7.5" r="2.8"/><path d="M3 16c.6-2.6 2.6-4 5-4s4.4 1.4 5 4"/><path d="M13.5 5a2.6 2.6 0 0 1 0 5M15 12.4c1.2.5 2 1.6 2.3 3.1"/>',
    clock: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>', bell: '<path d="M6 8a4 4 0 0 1 8 0c0 4.5 1.8 6 1.8 6H4.2S6 12.5 6 8Z"/><path d="M8.5 16.5a1.6 1.6 0 0 0 3 0"/>',
    lock: '<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>', file: '<path d="M11.5 3.5H6a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 6 16.5h8a1.5 1.5 0 0 0 1.5-1.5V7.5Z"/><path d="M11.5 3.5v4h4"/>',
    chart: '<path d="M4 16V9M8.5 16V5M13 16v-5M17 16V7"/>', sync: '<path d="M15.5 8.5A5.8 5.8 0 0 0 5 6.2L3.8 7.6"/><path d="M3.8 4.5v3.1h3.1"/><path d="M4.5 11.5A5.8 5.8 0 0 0 15 13.8l1.2-1.4"/><path d="M16.2 15.5v-3.1h-3.1"/>',
    layers: '<path d="m10 3.8 6.5 3.4L10 10.6 3.5 7.2Z"/><path d="m3.5 10.4 6.5 3.4 6.5-3.4"/><path d="m3.5 13.4 6.5 3.4 6.5-3.4"/>', plus: '<path d="M10 4.5v11M4.5 10h11"/>',
    home: '<path d="M4 9 10 4l6 5v6.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M8 16.5v-4h4v4"/>', folder: '<path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h3l1.5 1.8H15a1.5 1.5 0 0 1 1.5 1.5v6.2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z"/>',
    gear: '<circle cx="10" cy="10" r="2.4"/><path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M5.4 14.6l1.4-1.4M13.2 6.8l1.4-1.4"/>', more: '<circle cx="5" cy="10" r=".9"/><circle cx="10" cy="10" r=".9"/><circle cx="15" cy="10" r=".9"/>',
    chev: '<path d="m6 8 4 4 4-4"/>', menu: '<path d="M4 6.5h12M4 10h12M4 13.5h12"/>', quote: '<path d="M8 6.5C5.5 7.3 4.5 9 4.5 11.5v2h4v-4H6.3c.2-1.2.9-2 2.2-2.5ZM15 6.5c-2.5.8-3.5 2.5-3.5 5v2h4v-4h-2.2c.2-1.2.9-2 2.2-2.5Z"/>',
  };
  const ki = (n, cls = "") => `<svg class="k-ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${KI[n]}</svg>`;
  // A bar chart drawn in the accent, so it follows the palette.
  const bars = (vals, labels, hi = -1) => `<div class="k-bars">${vals.map((v, i) => `<div class="k-bar${i === hi ? " on" : ""}"><i style="height:${v}%"></i>${labels ? `<span>${labels[i]}</span>` : ""}</div>`).join("")}</div>`;
  const av = (t, i) => `<span class="k-av" style="--i:${i}">${t}</span>`;
  // The demo product is a document review tool, so the pages can show real content (drafts, comments,
  // sign-offs) instead of placeholder metrics. Each page is built for one task with one focal point.
  const LOGO = `<span class="k-brand"><svg class="k-mark" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24"/><path d="M8 5.5v13M12 8h5M12 12h5M12 16h3"/><circle cx="8" cy="12" r="2.4"/></svg>Margin</span>`;
  const NAV = (cta = "Start a document") => `<nav class="k-nav">${LOGO}<span class="k-nl">Product</span><span class="k-nl">Pricing</span><span class="k-nl">Changelog</span><span class="k-grow"></span><span class="k-link k-nl">Sign in</span><button class="k-btn k-sm">${cta}</button><button class="k-btn k-sm k-ghost k-icon k-burger" title="Menu">${ki("menu")}</button></nav>`;
  const FOOT = `<footer class="k-foot"><div class="k-foot-top"><div class="k-foot-brand">${LOGO}<p class="k-small">Write, review and sign off without the email chain.</p></div><div class="k-foot-cols">${[["Product", ["Review", "Sign-off", "Publishing", "Changelog"]], ["Company", ["About", "Careers", "Contact"]], ["Help", ["Guides", "Templates", "Status"]]].map(([h, l]) => `<div><b>${h}</b>${l.map((x) => `<span>${x}</span>`).join("")}</div>`).join("")}</div></div><div class="k-foot-base"><span>© 2026 Margin</span><span class="k-grow"></span><span>Privacy</span><span>Terms</span></div></footer>`;
  const thread = (open = true) => `<div class="k-thread">
      <div class="k-cmt">${av("LW", 1)}<div><b>Lin Wei</b><span class="k-small">10:42</span><p>Can we say what changes for existing customers here? The pricing page links to this line.</p></div></div>
      <div class="k-cmt">${av("AL", 0)}<div><b>Ada Lovelace</b><span class="k-small">10:51</span><p>Good catch. Added a sentence on renewals.</p></div></div>
      ${open ? `<div class="k-reply"><span>Reply</span><button class="k-btn k-sm">Resolve</button></div>` : ""}
    </div>`;
  const SUGGEST = `<div class="k-card k-pic k-suggest"><div class="k-cmt">${av("SK", 2)}<div><b>Sam Kerr</b><span class="k-small">suggested a change</span></div></div><p>From 1 April, the Team plan includes <del>ten</del> <ins>unlimited</ins> documents and five sign-off requests a month.</p><div class="k-row k-end"><button class="k-btn k-sm k-ghost">Reject</button><button class="k-btn k-sm">Accept</button></div></div>`;
  // The product picture: a draft open in the editor, with its comment thread beside the line it's about.
  const EDITOR = `<div class="k-shot"><div class="k-shot-bar"><span>Spring pricing update</span><span class="k-small">Draft 4, edited by Ada</span><span class="k-grow"></span><span class="k-faces">${["AL", "LW", "SK"].map(av).join("")}</span><button class="k-btn k-sm">Request sign-off</button></div>
      <div class="k-shot-body">
        <div class="k-doc"><h3 class="k-h3">What's changing in April</h3><p>From 1 April, the Team plan includes unlimited documents and five sign-off requests a month.</p><p><mark>Existing customers keep their current price until their next renewal</mark>, and can switch plans at any time from Settings.</p><p>Business adds single sign-on, audit history and a named contact.</p><p class="k-ghostline"></p><p class="k-ghostline k-short"></p></div>
        <div class="k-margin">${thread()}</div>
      </div></div>`;
  // The specimen at the top of the sheet shows every token on its own, so each setting on the left has
  // a direct demonstration. Values are filled in from the tokens (see vars).
  const SPEC = `<section class="k-card k-spec">
      <div class="k-spec-row" data-spec="type"><span class="k-spec-l">Type</span><div class="k-type">${["4xl", "3xl", "2xl", "xl", "lg", "base", "sm"].map((k, i) => `<span class="k-ts"><b class="${i < 4 ? "k-hd" : ""}" style="font-size:var(--k-${k})">Ag</b><small><span>${k}</span><span class="mono" data-tok="size.${k}"></span></small></span>`).join("")}</div></div>
      <div class="k-spec-row" data-spec="color"><span class="k-spec-l">Color</span><div class="k-swatches">${[["bg", "Page"], ["surface", "Surface"], ["text", "Text"], ["muted", "Muted"], ["border", "Border"], ["accent", "Accent"]].map(([k, n]) => `<span class="k-swatch"><i style="background:var(--k-${k === "bg" ? "bg" : k})"></i><small>${n}</small><small class="mono" data-tok="color.${k}"></small></span>`).join("")}</div></div>
      <div class="k-spec-row" data-spec="artwork"><span class="k-spec-l">Artwork</span><div class="k-art-spec"><i></i><small data-tok="artwork"></small></div></div>
      <div class="k-spec-row" data-spec="spacing"><span class="k-spec-l">Spacing</span><div class="k-spaces">${[1, 2, 3, 4, 6, 8, 12, 16].map((n) => `<span class="k-space"><i style="width:var(--k-s${n});height:var(--k-s${n})"></i><small class="mono" data-tok="space.${n}"></small></span>`).join("")}</div></div>
      <div class="k-spec-row" data-spec="radius"><span class="k-spec-l">Radius</span><div class="k-row k-radii"><span class="k-rad"><i style="border-radius:var(--k-r)"></i><small>Surfaces <span class="mono" data-tok="radius.base"></span></small></span><span class="k-rad"><button class="k-btn">Button</button><small>Buttons <span class="mono" data-tok="radius.button"></span></small></span><span class="k-rad"><span class="k-input">Field</span><small>Fields <span class="mono" data-tok="radius.base"></span></small></span></div></div>
      <div class="k-spec-row" data-spec="elevation"><span class="k-spec-l">Elevation</span><div class="k-row k-elevs"><span class="k-elev"><i></i><small data-tok="elevation"></small></span></div></div>
      <div class="k-spec-row" data-spec="motion"><span class="k-spec-l">Motion</span><div class="k-motion"><span class="k-track"><i></i></span><small><span class="mono" data-tok="motion.duration"></span> <span data-tok="motion.name"></span></small></div></div>
      <div class="k-spec-row" data-spec="rules"><span class="k-spec-l">Rules</span><div class="k-rules-spec" data-tok="rules"></div></div>
    </section>`;
  const COMPONENTS = `
    <div class="k-sheet">${SPEC}
      <section class="k-card k-span2 k-review">
        <div class="k-row k-between k-head"><h3 class="k-h3">Comments on “Spring pricing update”</h3><div class="k-tabs"><span class="on">Open</span><span>Resolved</span></div></div>
        <p class="k-doc-line"><mark>Existing customers keep their current price until their next renewal</mark>, and can switch plans at any time from Settings.</p>
        ${thread()}
      </section>
      <section class="k-card k-menu">
        <div class="k-cmd">${ki("search")}<span>Search or jump to</span><kbd>⌘K</kbd></div>
        <span class="k-small k-group">Suggestions</span>
        ${[["file", "New document", "N"], ["users", "Invite people", "I"], ["check", "Request sign-off", "S"], ["gear", "Settings", ","]].map(([icn, t, k], n) => `<div class="k-item${n === 0 ? " on" : ""}">${ki(icn)}<span>${t}</span><kbd>${k}</kbd></div>`).join("")}
      </section>
      <section class="k-card k-form">
        <h3 class="k-h3">New document</h3>
        <label class="k-label" for="k-name">Title</label><input class="k-input" id="k-name" value="Spring pricing update">
        <label class="k-label">Who can see it</label><div class="k-select">${ki("lock")}<span>People in Marketing</span>${ki("chev")}</div>
        <div class="k-row k-between k-opt"><span><b>Ask for sign-off</b><small>Ada and Lin approve before it publishes</small></span><span class="k-switch on"><i></i></span></div>
        <div class="k-row k-end"><button class="k-btn k-ghost">Cancel</button><button class="k-btn">Create</button></div>
      </section>
      <section class="k-card k-table k-span2">
        <div class="k-row k-between k-pad"><h3 class="k-h3">Documents</h3><div class="k-row"><button class="k-btn k-sm k-ghost">Filter</button><button class="k-btn k-sm">${ki("plus")}New</button></div></div>
        <div class="k-tr k-th"><span>Title</span><span>Owner</span><span>Comments</span><span>Updated</span></div>
        ${[["Spring pricing update", "Ada", "2 open", "10:51", "Needs sign-off"], ["Onboarding emails", "Lin", "None", "Yesterday"], ["Brand guidelines", "Sam", "5 open", "12 Oct"], ["Release notes 4.2", "Mo", "None", "9 Oct"]].map(([t, o, c, d, tag]) => `<div class="k-tr"><span class="k-title">${t}${tag ? `<span class="k-badge k-soft">${tag}</span>` : ""}</span><span>${o}</span><span class="k-muted">${c}</span><span class="k-muted">${d}</span></div>`).join("")}
      </section>
      <section class="k-card k-chart">
        <h3 class="k-h3">Comments resolved each day</h3><p class="k-small">Last week, most on Thursday</p>
        ${bars([42, 64, 55, 92, 72, 18, 10], ["M", "T", "W", "T", "F", "S", "S"], 3)}
      </section>
      <section class="k-card k-notes">
        <div class="k-alert">${ki("check")}<span><b>Published</b><small>Release notes 4.2 is live on your site.</small></span></div>
        <div class="k-toast">${ki("bell")}<span>Lin replied to your comment</span><button class="k-btn k-sm k-ghost">Open</button></div>
        <div><div class="k-row k-between k-small"><span>Importing 3 of 5 files</span><span>64%</span></div><div class="k-progress"><i></i></div></div>
      </section>
      <section class="k-card k-kit k-span2">
        <h3 class="k-h3">Buttons, tags and inputs</h3>
        <div class="k-row"><button class="k-btn">Publish</button><button class="k-btn k-sec">Preview</button><button class="k-btn k-ghost">Cancel</button></div>
        <div class="k-row"><button class="k-btn k-sm">${ki("plus")}Add</button><button class="k-btn k-sm k-sec k-icon" title="More">${ki("more")}</button><span class="k-chip">Marketing<i>×</i></span><span class="k-chip">Q2<i>×</i></span></div>
        <div class="k-kit-cols"><div><label class="k-check"><span class="k-box on"></span>Email me a summary each Friday</label><label class="k-check"><span class="k-box"></span>Notify me about mentions only</label></div>
        <div class="k-radios">${["Anyone with the link", "People in Marketing", "Only me"].map((t, n) => `<label class="k-radio"><span class="k-dot${n === 1 ? " on" : ""}"></span>${t}</label>`).join("")}</div></div>
      </section>
    </div>`;
  const LAYOUTS = {
    home: ["Home", `${NAV()}
      <section class="k-hero"><h1 class="k-h1">Review drafts where they're written</h1><div class="k-hero-side"><p class="k-lead">Comments sit in the margin beside the line they're about. Resolve them in place, then publish when everyone has signed off.</p><div class="k-row"><button class="k-btn k-lg">Start a document</button><span class="k-link k-under">See how review works</span></div><span class="k-small">Free for up to three editors</span></div></section>
      <div class="k-showcase">${EDITOR}</div>
      <section class="k-split"><div><h2 class="k-h2">Suggest a change instead of describing it</h2><p class="k-p">Type over the text and it becomes a suggestion. The author accepts or rejects it with one key, and the draft remembers who changed what.</p></div>${SUGGEST}</section>
      <section class="k-rows">${[["Mentions", "Type @ and a name to bring someone into a thread. They can reply from their email."], ["Sign-off", "Name the people who approve a draft. It publishes when the last one says yes."], ["Version history", "Compare any two drafts side by side, down to the word."], ["Publishing", "Send the final draft to your site, a help center or a PDF."]].map(([t, d]) => `<div><b>${t}</b><p class="k-p">${d}</p></div>`).join("")}</section>
      <section class="k-close"><h2 class="k-h2">Start with a draft you already have</h2><p class="k-p">Paste it in or import a Google Doc. Your team can comment in a minute.</p><div class="k-row"><button class="k-btn">Start a document</button><button class="k-btn k-ghost">Talk to us</button></div></section>
      ${FOOT}`],
    article: ["Article", `${NAV()}
      <div class="k-article">
        <article>
          <h1 class="k-h1">Why we moved comments into the margin</h1>
          <div class="k-byline">${av("LW", 1)}<span><b>Lin Wei</b><span class="k-small">12 October 2026, 6 min read</span></span></div>
          <div class="k-cover"></div>
          <p class="k-lead">Most review tools put comments in a list at the bottom of the page. By the time a draft has forty of them, nobody can tell which line each one is about.</p>
          <p>We tried three layouts before settling on the margin. The first kept a single list and highlighted the line when you hovered a comment. People stopped hovering after a day.</p>
          <h2 class="k-h2">What the margin changes</h2>
          <p>A comment in the margin is read in the same glance as its sentence. When the text moves, the thread moves with it, so an edit never strands a question.</p>
          <figure class="k-figure"><div class="k-card k-pic k-folded"><p>Existing customers keep their current price until their next renewal, and can switch plans at any time from Settings.</p><span class="k-marker">${ki("check")}2</span></div><figcaption class="k-small">A resolved thread folds into a mark beside its line, one click from reopening.</figcaption></figure>
          <blockquote>We stopped asking which comment people meant, because the answer was always next to it.</blockquote>
          <p>The cost is width. On a narrow screen the margin becomes a drawer, opened from a mark beside the line.</p>
        </article>
        <aside class="k-toc"><b>On this page</b><span class="on">The problem with lists</span><span>What the margin changes</span><span>Narrow screens</span><span>What's next</span></aside>
      </div>
      ${FOOT}`],
    app: ["App", `<div class="k-app">
      <aside class="k-side">${LOGO}${[["home", "Home"], ["file", "Documents", "24"], ["check", "Needs sign-off", "3"], ["users", "People"], ["gear", "Settings", "", 1]].map(([icn, t, n, on]) => `<span class="${on ? "on" : ""}">${ki(icn)}${t}${n ? `<em>${n}</em>` : ""}</span>`).join("")}</aside>
      <main class="k-main">
        <h1 class="k-h2">Settings</h1>
        <div class="k-tabs k-tabs-line"><span class="on">Workspace</span><span>People</span><span>Billing</span></div>
        <div class="k-set"><div><b>Workspace name</b><p class="k-small">Shown in invites and on published pages.</p></div><input class="k-input" value="Acme Marketing"></div>
        <div class="k-set"><div><b>Address</b><p class="k-small">Where published documents live.</p></div><div class="k-input k-prefix"><span>margin.app/</span>acme</div></div>
        <div class="k-set"><div><b>New documents are visible to</b></div><div class="k-radios">${["Everyone in the workspace", "Only the people invited", "Only the author"].map((t, n) => `<label class="k-radio"><span class="k-dot${n === 0 ? " on" : ""}"></span>${t}</label>`).join("")}</div></div>
        <div class="k-set"><div><b>Sign-off</b><p class="k-small">Require approval before anything publishes.</p></div><span class="k-switch on"><i></i></span></div>
        <div class="k-set"><div><b>People</b><p class="k-small">4 of 10 seats used.</p></div><div class="k-people-list">${[["AL", "Ada Lovelace", "Owner"], ["LW", "Lin Wei", "Editor"], ["SK", "Sam Kerr", "Editor"], ["MO", "mo@acme.co", "Invited"]].map(([i, n, r], k) => `<div class="k-person">${av(i, k)}<span>${n}</span>${r === "Invited" ? `<span class="k-badge k-line">Invited</span>` : `<span class="k-small">${r}</span>`}</div>`).join("")}</div></div>
        <div class="k-row k-end k-save"><button class="k-btn k-ghost">Discard</button><button class="k-btn">Save changes</button></div>
      </main></div>`],
    pricing: ["Pricing", `${NAV()}
      <section class="k-price-head"><div><h1 class="k-h1">Pricing</h1><p class="k-lead">Pay per workspace, not per reader. Everyone you invite to comment is free.</p></div><div class="k-tabs"><span>Monthly</span><span class="on">Yearly, 2 months free</span></div></section>
      <div class="k-compare"><div class="k-compare-in">
        <div class="k-cmp-row k-cmp-head"><span></span>${[["Free", "$0", "For trying it on one draft"], ["Team", "$24", "For a team that reviews every week", 1], ["Business", "$64", "For teams that need controls"]].map(([n, p, w, on]) => `<div class="${on ? "k-pick" : ""}"><b class="k-h3">${n}</b><span class="k-amount">${p}<small>a month</small></span><span class="k-small">${w}</span><button class="k-btn${on ? "" : " k-sec"}">${on ? "Start a 14-day trial" : n === "Free" ? "Start free" : "Contact sales"}</button></div>`).join("")}</div>
        ${[["Editors", "3", "Unlimited", "Unlimited"], ["Documents", "10", "Unlimited", "Unlimited"], ["Sign-off requests", "", "5 a month", "Unlimited"], ["Version history", "7 days", "1 year", "Forever"], ["Single sign-on", "", "", "yes"], ["Audit history", "", "", "yes"]].map(([f, ...v]) => `<div class="k-cmp-row"><span>${f}</span>${v.map((x, n) => `<span class="${n === 1 ? "k-pick" : ""}">${x === "yes" ? ki("check") : x || `<i class="k-none"></i>`}</span>`).join("")}</div>`).join("")}
      </div></div>
      <section class="k-faq">${[["Do commenters need a seat?", "No. Anyone you invite to comment or sign off is free on every plan."], ["What happens when a trial ends?", "You move to Free and keep everything. Drafts over the limit become read-only."], ["Can I pay by invoice?", "Yes, on yearly Business plans."]].map(([q, a], i) => `<div class="k-qa${i === 0 ? " open" : ""}"><b>${q}${ki("chev")}</b>${i === 0 ? `<p class="k-p">${a}</p>` : ""}</div>`).join("")}</section>
      ${FOOT}`],
  };
  if (!LAYOUTS[K.layout]) K.layout = "home";
  function previewHTML() { return K.view === "components" ? COMPONENTS : `<div class="k-page k-pg-${K.layout}">${LAYOUTS[K.layout][1]}</div>`; }
  if (K.view !== "components") K.view = "pages";
  // Home card: the hero landing, drawn at desktop width and scaled to fit the card.
  const homeRO = new ResizeObserver((en) => { for (const e of en) { const k = e.target.firstElementChild; if (k) k.style.setProperty("--s", (e.contentRect.width / 1240).toFixed(4)); } });
  function preview(el) {
    if (!el) return;
    if (!el.firstElementChild?.classList.contains("k-home")) { el.innerHTML = `<div class="kit k-home k-landing"><div class="k-page">${LAYOUTS.home[1]}</div></div>`; homeRO.observe(el); }
    vars(el.firstElementChild);
    el.firstElementChild.classList.toggle("k-has-art", !!artURL); el.firstElementChild.style.setProperty("--k-art", artURL ? `url("${artURL}")` : "none");
    el.firstElementChild.style.setProperty("--s", ((el.clientWidth || 600) / 1240).toFixed(4));
  }
  // The kit wears the app's colors until you change them, so it follows the app's theme and accent.
  root.addEventListener("theme-change", () => {
    if (!K.follow && K.dark != null) return;
    const kit = $("kit"); if (kit) vars(kit);
    const home = $("homeComponents"); if (home?.firstElementChild) vars(home.firstElementChild);
    if (!build.hidden) { renderSlots(); renderStageSegs(); if (K.slot === "color") renderOpts(); }
  });

  // ---------- libraries view ----------
  // Each library is a window onto its site: its OpenGraph banner, else a screenshot of the page, else a
  // pane drawn from its icon. Names, descriptions and framework lists of any length fit the same card.
  const hostOf = (u) => new URL(u).host.replace(/^www\./, "");
  const enc = encodeURIComponent;
  // Previews captured at deploy time (tools/previews.mjs) come first; the 11ty services are a fallback
  // for copies of the app that run without them, such as the single-file build.
  let local = {};
  const shots = (l) => [...(local[root.ISO_SLUG(l.name)] ? [local[root.ISO_SLUG(l.name)]] : []), `https://v1.opengraph.11ty.dev/${enc(l.url)}/small/`, `https://v1.screenshot.11ty.dev/${enc(l.url)}/opengraph/`];
  // Next to the page when served from the repo or GitHub Pages; from the published site otherwise.
  const SITE = "https://masterclaudecoder.github.io/isoline/";
  const loadIndex = (base) => fetch(base + "previews/index.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((m) => Object.fromEntries(Object.entries(m || {}).map(([k, v]) => [k, base + v.src])));
  loadIndex("").catch(() => loadIndex(SITE)).then((m) => { local = m; if (Object.keys(local).length && !lib.hidden && $("cpResults").children.length) renderLibs(); }).catch(() => {});
  const favicon = (l, sz = 64) => `https://www.google.com/s2/favicons?domain=${enc(hostOf(l.url))}&sz=${sz}`;
  const tintOf = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const fwText = (fw) => { const n = fw.map((f) => (f === ANY ? "Any framework" : f)); return n.length > 3 ? `${n.slice(0, 3).join(", ")} and ${n.length - 3} more` : n.join(", "); };
  function libCard(l) {
    const h = tintOf(l.name);
    return `<a class="lib${l.pick ? " pick" : ""}" href="${l.url}" target="_blank" rel="noopener" data-key="${esc(l.name)}" style="--h:${h}">
      <span class="lib-pane"><span class="lib-fallback"><img src="${favicon(l)}" alt="" loading="lazy" referrerpolicy="no-referrer"><b>${esc(l.name)}</b></span><img class="lib-shot" src="${shots(l)[0]}" data-step="0" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>
      <span class="lib-body">
        <span class="lib-top"><b class="lib-name" title="${esc(l.name)}">${esc(l.name)}</b>${l.pick ? `<em class="lib-pick">Pick</em>` : ""}</span>
        <span class="lib-desc">${esc(l.desc)}</span>
        <span class="lib-fw">${esc(fwText(l.fw))}</span>
        <span class="lib-host"><img src="${favicon(l, 32)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>${hostOf(l.url)}</span>${ic("out")}</span>
      </span>
    </a>`;
  }
  const lib = $("cpLib");
  lib.innerHTML = `
    <aside class="cp-filters scroll">
      <div class="opt-head cp-head"><h2 class="col-title">Libraries</h2><button class="btn sm ghost cp-reset" id="cpReset" hidden>${ic("reset")}Reset</button></div>
      <label class="cp-search">${ic("search")}<input class="field" id="cpQ" placeholder="Search" aria-label="Search libraries" spellcheck="false"></label>
      <h3 class="sub">Framework</h3><div class="cp-list" id="cpFw"></div>
      <h3 class="sub">Category</h3><div class="cp-list" id="cpCat"></div>
    </aside>
    <div class="cp-results scroll" id="cpResults"></div>`;
  // Previews step down: banner, then screenshot, then the drawn pane underneath.
  const shotFail = (img) => {
    const l = LIBS.find((x) => x.name === img.closest(".lib")?.dataset.key); const step = +img.dataset.step + 1;
    const list = l ? shots(l) : [];
    if (step < list.length) { img.dataset.step = step; img.src = list[step]; } else img.remove();
  };
  lib.addEventListener("error", (e) => { if (e.target.matches?.(".lib-shot")) shotFail(e.target); else if (e.target.matches?.(".lib-fallback img, .lib-host img")) e.target.style.display = "none"; }, true);
  lib.addEventListener("load", (e) => { const t = e.target; if (!t.matches?.(".lib-shot")) return; if (t.naturalWidth < 120) shotFail(t); else t.classList.add("in"); }, true);
  const matches = (l, fw = K.fw, cat = K.cat) => (fw === "All" || l.fw.includes(fw)) && (cat === "All" || (cat === "Picks" ? l.pick : l.cat === cat)) && (!K.q || (l.name + " " + l.desc + " " + l.cat + " " + hostOf(l.url)).toLowerCase().includes(K.q.toLowerCase()));
  function renderLibs(animate) {
    const row = (kind, v, n) => `<button data-${kind}="${esc(v)}" class="${(kind === "fw" ? K.fw : K.cat) === v ? "on" : ""}${n ? "" : " empty"}"><span>${v === ANY ? "Any framework" : v}</span><small class="mono">${n}</small></button>`;
    const paintList = (host, html) => { if (host.innerHTML !== html) host.innerHTML = html; };
    paintList($("cpFw"), ["All", ...FRAMEWORKS].map((f) => row("fw", f, LIBS.filter((l) => matches(l, f)).length)).join(""));
    paintList($("cpCat"), ["All", ...CATS].map((c) => row("cat", c, LIBS.filter((l) => matches(l, K.fw, c)).length)).join(""));
    $("cpReset").hidden = K.fw === "All" && K.cat === "All" && !K.q;
    const list = LIBS.filter((l) => matches(l));
    const sec = (title, items, cls = "") => `<section class="lib-sec ${cls}"><h3 class="lib-h" data-key="h:${esc(title)}">${esc(title)}<span class="mono">${items.length}</span></h3><div class="cp-grid">${items.map(libCard).join("")}</div></section>`;
    let html;
    if (!list.length) html = `<div class="cp-empty" data-key="empty"><b>No libraries match</b><p>${K.q ? `Nothing for “${esc(K.q)}”` : "Nothing in this combination"}${K.fw !== "All" ? ` with ${K.fw === ANY ? "any framework" : K.fw}` : ""}.</p><button class="btn sm" id="cpClear">${ic("reset")}Clear filters</button></div>`;
    // The full directory reads as sections, picks first; a filtered view is one list with picks on top.
    else if (K.cat === "All" && !K.q) html = sec("Picks", list.filter((l) => l.pick), "picks") + CATS.slice(1).map((c) => [c, list.filter((l) => l.cat === c)]).filter(([, v]) => v.length).map(([c, v]) => sec(c, v)).join("");
    else html = sec(K.cat === "All" ? `Results` : K.cat, list.slice().sort((a, b) => b.pick - a.pick), K.cat === "Picks" ? "picks" : "");
    const host = $("cpResults");
    const paint = () => { host.innerHTML = html; };
    if (animate && root.UI) root.UI.flip(host, paint, { sel: ".lib, .lib-h, .cp-empty" }); else paint();
  }
  lib.addEventListener("click", (e) => {
    if (e.target.closest("#cpClear, #cpReset")) { K.fw = "All"; K.cat = "All"; K.q = ""; $("cpQ").value = ""; save(); renderLibs(true); return; }
    const b = e.target.closest("[data-fw],[data-cat]"); if (!b) return;
    if (b.dataset.fw) K.fw = b.dataset.fw; else K.cat = b.dataset.cat;
    save(); renderLibs(true);
    $("cpResults").scrollTo({ top: 0, behavior: "smooth" });
  });
  $("cpQ").value = K.q;
  let qT = 0;
  $("cpQ").addEventListener("input", (e) => { K.q = e.target.value.trim(); save(); clearTimeout(qT); qT = setTimeout(() => renderLibs(true), 90); });

  // ---------- builder view ----------
  const build = $("cpBuild");
  const SLOTS = [["type", "Type", "type"], ["color", "Color", "palette"], ["artwork", "Artwork", "grid"], ["spacing", "Spacing", "space"], ["radius", "Radius", "corner"], ["elevation", "Elevation", "layers"], ["motion", "Motion", "timing"], ["rules", "Design rules", "rules"]];
  build.innerHTML = `
    <aside class="slots scroll"><h2 class="col-title">Tokens</h2><div id="cpSlots"></div></aside>
    <aside class="options scroll"><div class="opt-head"><h2 class="col-title" id="cpOptTitle"></h2></div><div id="cpOpts"></div>
      <div class="next-step"><button class="btn primary next-btn" id="cpNext"><span class="nx-text"><small id="cpNextKicker">Continue</small><b id="cpNextLbl"></b></span><span class="nx-end">${ic("next")}</span></button></div></aside>
    <section class="cp-stage">
      <div class="cp-stage-top">
        <div class="cp-st-l"><button class="ib cp-wide" id="cpWide" title="Hide the sidebar">${ic("panel")}</button><div class="seg sm" id="cpView"><button data-v="components">Components</button><button data-v="pages">Pages</button></div></div>
        <div class="seg sm fold-x" id="cpLayout"></div>
        <div class="cp-st-r"><span class="cp-size-slot" id="cpSizeSlot"></span><button class="ib" id="cpReplay" title="Replay the entrance">${ic("play")}</button><div class="seg sm" id="cpTheme"><button data-v="light">Light</button><button data-v="dark">Dark</button></div></div>
      </div>
      <div class="cp-canvas" id="cpCanvas"><div class="kit-frame scroll" id="kitFrame"><div class="kit" id="kit"></div></div></div>
    </section>`;
  $("cpLayout").innerHTML = Object.entries(LAYOUTS).map(([k, [n]]) => `<button data-v="${k}">${n}</button>`).join("");
  // Tile copy follows the studio's rule: the title names the choice, the subtitle lists its facts.
  const MOVE_NAME = { none: "None", fade: "Fade", rise: "Rise", sink: "Sink", scale: "Scale", blur: "Blur" };
  const EASE_NAME = { linear: "Linear", out: "Ease out", inout: "Ease in and out", spring: "Spring" };
  const ELEV_FACT = { none: "No shadow", hairline: "1px outline", soft: "24px blur, faint", crisp: "6px blur, close", lifted: "40px blur, deep" };
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const slotInfo = {
    type: () => { const f = fonts(), p = PAIRS[K.pair]; return [!K.head && !K.body && p ? p[0] : "Custom", f.head === f.body ? f.head : `${f.head} and ${f.body}`]; },
    color: () => { const r = roles(); return [K.follow ? "Isoline" : C.name(r.accent), `${isDark() ? "Dark" : "Light"}, ${r.contrast.toFixed(1)}:1 text`]; },
    artwork: () => (K.art === "studio" ? ["Studio design", "On the home and article pages"] : ["None", "Plain backgrounds"]),
    spacing: () => [{ 0.8: "Compact", 1: "Regular", 1.25: "Roomy" }[K.density] || "Custom", `${K.unit}px unit`],
    radius: () => [K.radius === 0 ? "Square" : K.radius <= 6 ? "Subtle" : K.radius <= 14 ? "Rounded" : "Soft", `${K.radius}px${K.pill ? ", pill buttons" : ""}`],
    elevation: () => [cap(K.elevation), ELEV_FACT[K.elevation]],
    motion: () => [EASE_NAME[K.ease], `${K.dur}ms, ${K.enter === "none" ? "no entrance" : MOVE_NAME[K.enter].toLowerCase() + " in"}`],
    rules: () => { const on = K.rules.filter((r) => r.on && r.t.trim()).length, off = K.rules.length - on; return [on ? `${on} ${on === 1 ? "rule" : "rules"}` : "No rules", off ? `${off} switched off` : K.rules.length ? "All on" : "Add your own"]; },
  };
  // Built once and patched, so selection and text changes transition like the studio's build column.
  // Each tile shows its token at work, drawn with the kit's own variables and cropped close: a heading,
  // a scrap of interface, a corner, a lifted card, a moving dot. They change as the tokens do, at the
  // token duration and easing.
  const TOK_TH = {
    type: `<span class="tt-ag"><span>Ag</span><span>Ag</span><span>Ag</span></span>`,
    color: `<span class="tt-ui"><i class="tt-l1"></i><i class="tt-l2"></i><i class="tt-pill"></i></span>`,
    artwork: `<span class="tt-art" id="cpArtTile"></span>`,
    spacing: `<span class="tt-space"><i></i><b></b><i></i><b></b><i></i></span>`,
    radius: `<span class="tt-corner"></span>`,
    elevation: `<span class="tt-card"></span>`,
    motion: `<span class="tt-move"><i></i></span>`,
    rules: `<span class="tt-rules"><i></i><i></i><i></i><i></i></span>`,
  };
  $("cpSlots").innerHTML = SLOTS.map(([id, label]) => `<div class="slot"><div class="slot-label">${label}</div><button class="tile" data-s="${id}"><span class="tile-th tok-th" data-tt="${id}">${TOK_TH[id]}</span><span class="tile-text"><b></b><small></small></span>${ic("next")}</button></div>`).join("");
  const setText = (el, v) => { if (el.textContent === v) return; el.textContent = v; if (!root.UI?.reduce.matches && !build.hidden) el.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 220 + Math.random() * 80, easing: "cubic-bezier(.22,1,.36,1)" }); };
  function renderSlots() {
    vars($("cpSlots"));
    for (const t of $("cpSlots").querySelectorAll("[data-s]")) {
      const [title, fact] = slotInfo[t.dataset.s]();
      t.classList.toggle("on", K.slot === t.dataset.s);
      setText(t.querySelector(".tile-text b"), title); setText(t.querySelector("small"), fact);
    }
  }
  $("cpSlots").addEventListener("click", (e) => { const t = e.target.closest("[data-s]"); if (t) setSlot(t.dataset.s); });
  function setSlot(id) { if (K.slot === id) return; K.slot = id; save(); renderSlots(); renderOpts(true); $("cpOpts").closest(".options").scrollTo({ top: 0 }); focusSpec(true); }
  // The specimen row for the open token is marked, and scrolled into view when you change token.
  function focusSpec(scroll) {
    const kit = $("kit"); if (!kit) return;
    for (const r of kit.querySelectorAll(".k-spec-row")) r.classList.toggle("focus", r.dataset.spec === K.slot);
    const row = kit.querySelector(`.k-spec-row[data-spec="${K.slot}"]`), f = kit.parentElement;
    if (scroll && row && f) { const top = row.getBoundingClientRect().top - f.getBoundingClientRect().top + f.scrollTop - 24; f.scrollTo({ top: Math.max(0, top), behavior: root.UI?.reduce.matches ? "auto" : "smooth" }); }
  }
  $("cpNext").onclick = () => { const i = SLOTS.findIndex((s) => s[0] === K.slot); if (i === SLOTS.length - 1) { $("cpExportBtn")?.click(); return; } setSlot(SLOTS[i + 1][0]); };

  // Option controls
  function slider(host, label, min, max, step, get, set, fmt = String) {
    const row = document.createElement("div"); row.className = "ctrl";
    row.innerHTML = `<div class="label-row"><span class="label">${label}</span><span class="val-static mono"></span></div><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;
    const r = row.querySelector("input"), out = row.querySelector(".val-static");
    const paint = () => { r.value = get(); r.style.setProperty("--p", ((get() - min) / (max - min)) * 100 + "%"); out.textContent = fmt(get()); };
    r.oninput = () => { set(+r.value); paint(); changed(); };
    paint(); host.appendChild(row);
  }
  function seg(host, opts, get, set, cls = "") {
    const el = document.createElement("div"); el.className = "seg sm " + cls;
    // An option can carry a tooltip, and a live preview for it: [value, label, tip, preview].
    el.innerHTML = opts.map(([v, l, t, pv]) => `<button data-v="${v}" class="${String(get()) === String(v) ? "on" : ""}"${t ? ` data-tip="${esc(t)}"` : ""}${pv ? ` data-tip-preview="${pv}"` : ""}>${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v); for (const x of el.querySelectorAll("button")) x.classList.toggle("on", x === b); changed(); };
    host.appendChild(el); return el;
  }
  const dd = (el, label) => (root.UI?.dropdown ? root.UI.dropdown(el, { label }) : el);
  const sub = (host, t, first) => host.insertAdjacentHTML("beforeend", `<h3 class="sub${first ? " first" : ""}">${t}</h3>`);
  const subHead = (host, t, right, first) => host.insertAdjacentHTML("beforeend", `<div class="sub-head${first ? " first" : ""}"><h3 class="sub">${t}</h3>${right}</div>`);

  // ---------- fonts ----------
  // A small catalog from Google Fonts, grouped by kind, so the picker can suggest rather than ask for a name.
  const CATALOG = {
    Sans: ["Inter", "Inter Tight", "Instrument Sans", "Geist", "DM Sans", "Manrope", "Figtree", "Plus Jakarta Sans", "Onest", "IBM Plex Sans", "Source Sans 3", "Libre Franklin", "Archivo", "Work Sans", "Outfit", "Lexend", "Rubik", "Nunito", "Public Sans", "Albert Sans", "Hanken Grotesk", "Schibsted Grotesk", "Red Hat Display", "Space Grotesk", "Sora", "Bricolage Grotesque", "Epilogue", "Urbanist"],
    Serif: ["Fraunces", "Newsreader", "Playfair Display", "DM Serif Display", "Instrument Serif", "Libre Caslon Text", "Lora", "Merriweather", "Source Serif 4", "Literata", "EB Garamond", "Cormorant Garamond", "Crimson Pro", "Young Serif", "Gloock"],
    Display: ["Syne", "Unbounded", "Bebas Neue", "Anton", "Archivo Black", "Big Shoulders Display", "Righteous"],
    Mono: ["JetBrains Mono", "Geist Mono", "IBM Plex Mono", "Space Mono", "DM Mono", "Fira Code"],
  };
  const kindOf = (f) => (custom.has(f) ? "Yours" : Object.keys(CATALOG).find((k) => CATALOG[k].includes(f)) || "Google Fonts");
  // Suggestions for one role given the other: the pairings that use it, then fonts of a contrasting kind.
  function suggest(role, other) {
    const fromPairs = PAIRS.filter((p) => p[role === "head" ? 2 : 1] === other).map((p) => p[role === "head" ? 1 : 2]);
    const ok = kindOf(other), contrast = role === "head" ? (ok === "Serif" ? ["Sans", "Display"] : ["Serif", "Display", "Sans"]) : ok === "Sans" ? ["Sans"] : ["Sans", "Serif"];
    const extra = contrast.flatMap((k) => CATALOG[k].slice(0, 4));
    return [...new Set([...fromPairs, ...extra])].filter((f) => f !== other || role === "body").slice(0, 6);
  }
  let ff = null; // the open font picker
  function fontPicker(anchor, role) {
    closeFF();
    const pop = document.createElement("div");
    pop.className = "pop ff scroll"; pop.hidden = true;
    pop.innerHTML = `<label class="ff-search">${ic("search")}<input class="field" placeholder="Search or type any Google font" spellcheck="false" aria-label="Search fonts"></label><div class="ff-list"></div>`;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    const pw = Math.max(280, Math.round(r.width));
    pop.style.width = pw + "px"; pop.style.left = Math.min(r.left, innerWidth - pw - 12) + "px";
    const below = innerHeight - r.bottom > 360;
    pop.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - 6 - 380)) + "px";
    pop.classList.toggle("above", !below);
    const input = pop.querySelector("input"), listEl = pop.querySelector(".ff-list");
    const f = fonts(), cur = role === "head" ? f.head : f.body, other = role === "head" ? f.body : f.head;
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { loadFont(e.target.dataset.f); io.unobserve(e.target); } }), { root: listEl });
    const rowHTML = (name) => `<button class="ff-row${name === cur ? " on" : ""}" data-f="${esc(name)}"><span style="font-family:'${esc(name)}', system-ui">${esc(name)}</span><small>${kindOf(name)}</small></button>`;
    const group = (title, names) => (names.length ? `<h3>${esc(title)}</h3>` + names.map(rowHTML).join("") : "");
    function paint() {
      const q = input.value.trim().toLowerCase(), hit = (n) => !q || n.toLowerCase().includes(q);
      const all = [...custom, ...Object.values(CATALOG).flat()];
      let html = "";
      if (q && !all.some((n) => n.toLowerCase() === q)) html += `<button class="ff-row use" data-f="${esc(input.value.trim())}"><span>Use “${esc(input.value.trim())}”</span><small>Google Fonts or installed</small></button>`;
      html += group("Your fonts", [...custom].filter(hit));
      if (!q) html += group(`Pairs with ${other}`, suggest(role, other));
      for (const [k, names] of Object.entries(CATALOG)) html += group(k, names.filter(hit));
      if (!html) html = `<p class="note ff-none">No fonts match.</p>`;
      listEl.innerHTML = html;
      for (const b of listEl.querySelectorAll("[data-f]")) if (!b.classList.contains("use")) io.observe(b);
    }
    paint();
    input.addEventListener("input", paint);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = listEl.querySelector("[data-f]"); if (b) choose(b.dataset.f); } else if (e.key === "Escape") closeFF(); });
    const choose = (name) => { K[role] = name; closeFF(); changed(); };
    listEl.addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) choose(b.dataset.f); });
    requestAnimationFrame(() => { pop.hidden = false; input.focus(); listEl.querySelector(".on")?.scrollIntoView({ block: "center" }); });
    anchor.classList.add("open");
    ff = { pop, anchor, io };
  }
  function closeFF() { if (!ff) return; const { pop, anchor, io } = ff; ff = null; io.disconnect(); anchor.classList.remove("open"); pop.hidden = true; setTimeout(() => pop.remove(), 300); }
  document.addEventListener("pointerdown", (e) => { if (ff && !e.target.closest(".ff, .ff-trigger")) closeFF(); });
  document.addEventListener("scroll", (e) => { if (ff && !ff.pop.contains(e.target)) closeFF(); }, true);

  // A contrast readout: the ratio, then the WCAG level it reaches.
  const level = (r) => (r >= 7 ? ["AAA", "ok"] : r >= 4.5 ? ["AA", "ok"] : r >= 3 ? ["Large text", "warn"] : ["Low", "bad"]);
  function renderOpts(enter) {
    const o = $("cpOpts");
    $("cpOptTitle").textContent = SLOTS.find((s) => s[0] === K.slot)[1];
    const i = SLOTS.findIndex((s) => s[0] === K.slot);
    setText($("cpNextKicker"), i === SLOTS.length - 1 ? "Finish" : "Continue");
    setText($("cpNextLbl"), i === SLOTS.length - 1 ? "Export" : SLOTS[i + 1][1]);
    o.innerHTML = "";
    if (K.slot === "type") {
      const f = fonts();
      o.insertAdjacentHTML("beforeend", `<div class="ff-pair">${[["head", "Headings", f.head, f.weight], ["body", "Body", f.body, 400]].map(([role, label, name, w]) => `<button class="ff-trigger" data-role="${role}" aria-haspopup="listbox"><small>${label}</small><span style="font-family:'${esc(name)}', system-ui;font-weight:${w}">${esc(name)}</span><em>${kindOf(name)}</em>${ic("chev")}</button>`).join("")}</div>
`);
      o.querySelector(".ff-pair").onclick = (e) => { const b = e.target.closest(".ff-trigger"); if (!b) return; if (ff?.anchor === b) closeFF(); else fontPicker(b, b.dataset.role); };
      o.insertAdjacentHTML("beforeend", `<h3 class="sub"><span class="tipped" data-tip="Pick the body font first, for reading. Then a heading with some contrast, like a serif over a sans or a heavier weight">Pairings</span></h3>`);
      const g = document.createElement("div"); g.className = "cp-pairs";
      const custom0 = K.head || K.body;
      g.innerHTML = PAIRS.map(([n, h, b, w], k) => { loadFont(h); loadFont(b); return `<button class="pair${K.pair === k && !custom0 ? " on" : ""}${k >= 6 ? " extra" : ""}" data-k="${k}" title="${h === b ? h : `${h} and ${b}`}"><span class="pair-aa" style="font-family:'${h}';font-weight:${w}">Aa</span><span class="pair-t"><b>${n}</b><small style="font-family:'${b}'">${h === b ? h : `${h}, ${b}`}</small></span></button>`; }).join("");
      g.onclick = (e) => { const b = e.target.closest("[data-k]"); if (!b) return; K.pair = +b.dataset.k; K.head = K.body = ""; changed(); };
      o.appendChild(g);
      if (PAIRS.length > 6) {
        o.insertAdjacentHTML("beforeend", `<button class="btn sm ghost cp-more" aria-expanded="${!!K.morePairs}">${K.morePairs ? "Show fewer" : `Show all ${PAIRS.length}`}</button>`);
        g.classList.toggle("all", !!K.morePairs);
        o.querySelector(".cp-more").onclick = (e) => { K.morePairs = !K.morePairs; save(); g.classList.toggle("all", K.morePairs); e.currentTarget.textContent = K.morePairs ? "Show fewer" : `Show all ${PAIRS.length}`; };
      }
      sub(o, "Your fonts");
      const mine = document.createElement("div"); mine.className = "cp-mine";
      mine.innerHTML = [...custom].map((f) => `<div class="cp-font" data-key="${esc(f)}" data-f="${esc(f)}"><span style="font-family:'${esc(f)}'">${esc(f)}</span><button class="btn sm ghost" data-use="head">Headings</button><button class="btn sm ghost" data-use="body">Body</button><button class="ib xs" data-del title="Remove ${esc(f)}">${ic("x")}</button></div>`).join("") +
        `<label class="btn sm cp-up">${ic("up")}Upload a font<input type="file" accept=".woff2,.woff,.ttf,.otf" multiple hidden></label>`;
      mine.onclick = async (e) => {
        const row = e.target.closest("[data-f]"); if (!row) return;
        const f = row.dataset.f;
        if (e.target.closest("[data-use]")) { K[e.target.closest("[data-use]").dataset.use === "head" ? "head" : "body"] = f; changed(true); }
        else if (e.target.closest("[data-del]")) { await removeFont(f); if (K.head === f) K.head = ""; if (K.body === f) K.body = ""; root.UI ? root.UI.collapse(row, () => changed(true)) : changed(true); }
      };
      mine.querySelector("input").onchange = async (e) => {
        for (const file of e.target.files) { const name = file.name.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[-_]+/g, " "); if (await addFont(name, await file.arrayBuffer())) root.toastMsg?.(`Added ${name}`); }
        renderOpts();
      };
      o.appendChild(mine);
      sub(o, "Scale");
      seg(o, [[1.125, "1.125"], [1.2, "1.2"], [1.25, "1.25"], [1.333, "1.333"], [1.414, "1.414"]], () => K.scale, (v) => (K.scale = v));
      slider(o, "Base size", 13, 20, 1, () => K.base, (v) => (K.base = v), (v) => v + "px");
      slider(o, "Heading tracking", -0.06, 0.04, 0.005, () => K.tracking, (v) => (K.tracking = v), (v) => (+v).toFixed(3) + "em");
    } else if (K.slot === "color") {
      // Where the colors come from, how strongly the page takes their hue, then every role in detail.
      const pal = root.Palettes;
      const app = appRoles(isDark()), appCs = [app.bg, app.surface, app.text, app.accent];
      const plist = [["isoline", "Isoline", appCs], ...(pal ? [["tool", "Palette tool", pal.colors()], ...pal.saved().map((p, k) => ["s" + k, p.name, p.colors])] : [])];
      const cur = K.follow ? "isoline" : K.srcKey || "";
      subHead(o, "Start from", pal ? `<button class="btn sm ghost" id="cpToPal">${ic("palette")}Edit in Palettes</button>` : "", true);
      const g = document.createElement("div"); g.className = "cp-pals";
      g.innerHTML = plist.map(([key, n, cs]) => `<button class="sug${key === cur ? " on" : ""}" data-p="${key}"><span class="sug-sw">${cs.slice(0, 6).map((c) => `<i style="background:${c}"></i>`).join("")}</span><span>${esc(n)}</span></button>`).join("");
      g.onclick = (e) => {
        const b = e.target.closest("[data-p]"); if (!b) return;
        const key = b.dataset.p;
        if (key === "isoline") { K.follow = true; K.dark = null; K.srcKey = "isoline"; }
        else { K.follow = false; K.srcKey = key; K.src = plist.find((x) => x[0] === key)[2].slice(); K.rc = fromSource(); }
        changed(true); renderStageSegs();
      };
      o.appendChild(g);
      if (pal) $("cpToPal").onclick = () => { const r = roles(); pal.load(K.src && !K.follow ? K.src : [r.bg, r.surface, r.muted, r.text, r.accent], "components"); root.Shell?.go("palettes"); };
      if (!K.follow && K.src) {
        sub(o, "Strength");
        seg(o, [["neutral", "Neutral", "Grey page and text. The palette shows only in the accent", "tint:neutral"], ["tinted", "Tinted", "Page and text lean toward the palette's hue", "tint:tinted"], ["bold", "Bold", "The palette's own lightest and darkest colors", "tint:bold"]], () => K.tint, (v) => { K.tint = v; K.rc = fromSource(); setTimeout(paintRoles, 0); });
      }
      sub(o, "Mode");
      seg(o, [["auto", "Match the app"], ["light", "Light"], ["dark", "Dark"]], () => (K.dark == null ? "auto" : K.dark ? "dark" : "light"), (v) => { K.dark = v === "auto" ? null : v === "dark"; renderStageSegs(); setTimeout(() => renderOpts(), 0); });
      subHead(o, `Roles in ${mode()} mode`, `<span class="val-static mono">${ROLES.length}</span>`);
      // Each role shows its color, what it is for, and how well the text roles read on what they sit on.
      const list = document.createElement("div"); list.className = "cp-roles";
      list.innerHTML = ROLES.map(([k, name, what]) => `<button class="cp-role" data-role="${k}"><span class="sw"></span><span class="cp-role-t"><b>${name}</b><small>${what}</small></span><span class="cp-role-v"><span class="mono"></span><em class="cp-badge"></em></span></button>`).join("");
      list.onclick = (e) => {
        const b = e.target.closest("[data-role]"); if (!b) return;
        const k = b.dataset.role, sw = b.querySelector(".sw");
        picker.open(sw, roles()[k], (v) => { if (K.follow) { unfollow(); for (const x of g.children) x.classList.remove("on"); } K.srcKey = ""; K.rc[mode()][k] = v; changed(); paintRoles(); }, () => save(), [["Roles", ROLES.map(([x]) => roles()[x])]]);
      };
      o.appendChild(list);
      paintRoles();
    } else if (K.slot === "artwork") {
      sub(o, "Picture", true);
      seg(o, [["none", "None", "Plain backgrounds"], ["studio", "Studio design", "Your Studio design as the backdrop. It refreshes each time you come back"]], () => K.art, (v) => { K.art = v; refreshArt(); setTimeout(() => renderOpts(), 0); });
      if (K.art === "studio") {
        o.insertAdjacentHTML("beforeend", `<div class="cp-art"><span class="cp-art-th" id="cpArtTh"></span><span class="cp-art-t"><b>Your Studio design</b><small>${esc((root.Studio?.describe?.() || "").split(". ").slice(0, 2).join(", ").replace(/ by /, "×").replace(/px,/, ","))}</small></span></div><p class="hint">Shows behind the product picture on the home page and as the article cover.</p><div class="pt-actions"><a class="btn sm" href="#/studio">${ic("grid")}Edit in Studio</a><button class="btn sm ghost" id="cpArtRe">${ic("reset")}Refresh</button></div>`);
        $("cpArtRe").onclick = () => refreshArt();
        paintArtThumb();
      }
    } else if (K.slot === "spacing") {
      sub(o, "Base unit"); seg(o, [[4, "4px"], [8, "8px"]], () => K.unit, (v) => { K.unit = v; paintScale(); });
      sub(o, "Density"); seg(o, [[0.8, "Compact"], [1, "Regular"], [1.25, "Roomy"]], () => K.density, (v) => { K.density = v; paintScale(); });
      sub(o, "Scale");
      o.insertAdjacentHTML("beforeend", `<div class="cp-scale" id="cpScale">${[1, 2, 3, 4, 6, 8, 12, 16].map((n) => `<div><span class="mono">${n}</span><i></i><span class="mono"></span></div>`).join("")}</div>`);
      paintScale();
    } else if (K.slot === "radius") {
      slider(o, "Corner radius", 0, 32, 1, () => K.radius, (v) => (K.radius = v), (v) => v + "px");
      o.insertAdjacentHTML("beforeend", `<label class="label-row switch-row"><span class="label">Pill buttons</span><span class="switch"><input type="checkbox" id="cpPill"${K.pill ? " checked" : ""}><span></span></span></label>`);
      $("cpPill").onchange = (e) => { K.pill = e.target.checked; changed(); };
    } else if (K.slot === "elevation") {
      const g = document.createElement("div"); g.className = "cards cp-elev";
      g.innerHTML = Object.entries(SHADOWS).map(([k, sh]) => `<button class="card${K.elevation === k ? " on" : ""}" data-e="${k}"><span class="th cp-e-th"><i style="box-shadow:${sh.replace(/var\(--k-border\)/, "rgba(0,0,0,.15)")}"></i></span><span class="card-label">${cap(k)}</span><span class="card-sub">${ELEV_FACT[k]}</span></button>`).join("");
      g.onclick = (e) => { const b = e.target.closest("[data-e]"); if (!b) return; K.elevation = b.dataset.e; for (const x of g.children) x.classList.toggle("on", x === b); changed(); };
      o.appendChild(g);
    } else if (K.slot === "motion") {
      slider(o, "Duration", 60, 700, 10, () => K.dur, (v) => (K.dur = v), (v) => v + "ms");
      sub(o, "Easing"); dd(seg(o, [["linear", "Linear"], ["out", "Out"], ["inout", "In and out"], ["spring", "Spring"]], () => K.ease, (v) => (K.ease = v)), "Easing");
      o.insertAdjacentHTML("beforeend", `<button class="cp-demo" id="cpDemo"><i></i><span>Click to replay</span></button>`);
      const demo = $("cpDemo");
      demo.style.setProperty("--dur", K.dur + "ms"); demo.style.setProperty("--ease", EASE[K.ease]);
      demo.onclick = () => { demo.classList.remove("go"); void demo.offsetWidth; demo.classList.add("go"); };
      // How things arrive and leave: menus, dialogs, toasts and page sections all use these.
      const pair = document.createElement("div"); pair.className = "dd-pair"; o.appendChild(pair);
      const colA = document.createElement("div"), colB = document.createElement("div"); pair.append(colA, colB);
      sub(colA, "Appear");
      dd(seg(colA, [["none", "None"], ["fade", "Fade"], ["rise", "Rise"], ["scale", "Scale"], ["blur", "Blur"]], () => K.enter, (v) => { K.enter = v; setTimeout(() => replay(false), 0); }), "Appear");
      sub(colB, "Disappear");
      dd(seg(colB, [["none", "None"], ["fade", "Fade"], ["sink", "Sink"], ["scale", "Scale"], ["blur", "Blur"]], () => K.exit, (v) => { K.exit = v; setTimeout(() => replay(true), 0); }), "Disappear");
      slider(o, "Stagger", 0, 120, 5, () => K.stagger, (v) => (K.stagger = v), (v) => (v ? v + "ms" : "Off"));
      // When it plays: once as the page loads, or as each section scrolls into view and back out.
      sub(o, "Plays");
      seg(o, [["load", "On load"], ["scroll", "On scroll"]], () => K.trigger, (v) => { K.trigger = v; setTimeout(() => replay(false), 0); });
      o.insertAdjacentHTML("beforeend", `<button class="btn sm cp-replay" id="cpReplayOpt">${ic("play")}Play out and back in</button>`);
      $("cpReplayOpt").onclick = () => replay(true);
    } else if (K.slot === "rules") {
      o.insertAdjacentHTML("beforeend", `<p class="hint">Agents get these with your tokens.</p>`);
      const list = document.createElement("div"); list.className = "cp-rules";
      K.rules.forEach((r) => (r.id ||= Math.random().toString(36).slice(2, 9)));
      list.innerHTML = K.rules.map((r, k) => `<div class="cp-rule${r.on ? "" : " off"}" data-k="${k}" data-key="${r.id}"><span class="switch"><input type="checkbox"${r.on ? " checked" : ""} aria-label="Use this rule"><span></span></span><textarea class="field autosize" rows="1" aria-label="Rule ${k + 1}" placeholder="Write a rule">${esc(r.t)}</textarea><button class="ib xs" title="Delete rule">${ic("x")}</button></div>`).join("") || `<p class="note cp-norules">No rules yet. Agents will follow only the tokens.</p>`;
      list.addEventListener("change", (e) => { const k = +e.target.closest("[data-k]").dataset.k; if (e.target.type === "checkbox") { K.rules[k].on = e.target.checked; e.target.closest(".cp-rule").classList.toggle("off", !e.target.checked); } save(); renderSlots(); });
      list.addEventListener("input", (e) => { if (e.target.matches("textarea")) { K.rules[+e.target.closest("[data-k]").dataset.k].t = e.target.value; save(); } });
      list.addEventListener("click", (e) => { const b = e.target.closest(".ib"); if (!b) return; const row = b.closest("[data-k]"); const go = () => { K.rules.splice(+row.dataset.k, 1); save(); renderOpts(); renderSlots(); }; root.UI ? root.UI.collapse(row, go) : go(); });
      o.appendChild(list);
      o.insertAdjacentHTML("beforeend", `<div class="pt-actions"><button class="btn sm" id="cpAddRule">${ic("plus")}Add a rule</button><button class="btn sm ghost" id="cpResetRules">${ic("reset")}Reset</button></div>`);
      $("cpAddRule").onclick = () => { K.rules.push({ t: "", on: true }); save(); const host = $("cpOpts").querySelector(".cp-rules"); root.UI ? root.UI.flip(host, () => renderOpts()) : renderOpts(); renderSlots(); $("cpOpts").querySelector(".cp-rule:last-child textarea")?.focus(); };
      $("cpResetRules").onclick = () => { K.rules = RULES.map((t) => ({ t, on: true })); save(); renderOpts(); renderSlots(); };
      requestAnimationFrame(() => o.querySelectorAll("textarea.autosize").forEach((t) => root.UI?.autosize(t)));
    }
    if (enter) { o.classList.remove("enter"); void o.offsetWidth; o.classList.add("enter"); }
  }
  // Type panel patches: the font triggers and the selected pairing follow the current fonts.
  function syncType() {
    const f = fonts(), o = $("cpOpts");
    for (const t of o.querySelectorAll(".ff-trigger")) {
      const head = t.dataset.role === "head", name = head ? f.head : f.body, sp = t.querySelector("span");
      if (sp.textContent !== name) { sp.textContent = name; sp.style.fontFamily = `'${name}', system-ui`; sp.style.fontWeight = head ? f.weight : 400; t.querySelector("em").textContent = kindOf(name); if (!root.UI?.reduce.matches) sp.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" }); }
    }
    const custom0 = K.head || K.body;
    for (const b of o.querySelectorAll(".pair")) b.classList.toggle("on", !custom0 && +b.dataset.k === K.pair);
  }
  function paintRoles() {
    const list = $("cpOpts").querySelector(".cp-roles"); if (!list) return;
    const r = roles();
    const ratio = { text: [r.text, r.bg], muted: [r.muted, r.bg], accent: [r.onAccent, r.accent] };
    for (const b of list.children) {
      const k = b.dataset.role, sw = b.querySelector(".sw"), hex = b.querySelector(".mono"), em = b.querySelector("em");
      sw.style.background = r[k]; hex.textContent = r[k].toUpperCase();
      if (ratio[k]) { const c = C.contrast(...ratio[k]), [lv, cls] = level(c); em.textContent = `${c.toFixed(1)}:1 ${lv}`; em.className = "cp-badge " + cls; em.hidden = false; }
      else em.hidden = true;
    }
  }
  function paintScale() {
    const host = $("cpScale"); if (!host) return;
    [1, 2, 3, 4, 6, 8, 12, 16].forEach((n, k) => { const row = host.children[k]; row.querySelector("i").style.width = Math.min(space(n), 200) + "px"; row.lastElementChild.textContent = space(n) + "px"; });
  }
  function renderStageSegs() {
    for (const [id, v] of [["cpView", K.view], ["cpLayout", K.layout], ["cpTheme", isDark() ? "dark" : "light"]]) for (const b of $(id).querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === v);
    $("cpLayout").hidden = K.view !== "pages";
  }
  // ---------- page size ----------
  // The preview is a page of a real size: the window's own room ("Fit"), or a preset or dragged size,
  // scaled down to fit when it is bigger than the room. Layouts respond to the page width.
  const canvas = $("cpCanvas"), frame = $("kitFrame");
  const roomOf = () => { const cs = getComputedStyle(canvas); return [Math.floor(canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), Math.floor(canvas.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))]; };
  const pageSize = () => (K.fit ? roomOf() : [K.pw, K.ph]);
  let zoom = 1, rzZoom = 0, fitKey = "";
  function fitKit() {
    const kit = $("kit"), [aw, ah] = roomOf(); if (!kit || aw < 40 || ah < 40) return;
    const [w, h] = pageSize();
    zoom = K.fit ? 1 : rzZoom || Math.min(1, aw / w, ah / h);
    // Picking a size glides the frame there; dragging or resizing the window tracks directly.
    const key = K.fit ? "fit" : K.pw + "x" + K.ph;
    frame.style.transition = !rzZoom && fitKey && key !== fitKey ? "width .42s var(--ease), height .42s var(--ease)" : "";
    fitKey = key;
    frame.style.width = Math.round(w * zoom) + "px"; frame.style.height = Math.round(h * zoom) + "px";
    // The page is as wide as the frame minus its vertical scrollbar, so it never scrolls sideways.
    const sb = frame.offsetWidth - frame.clientWidth;
    kit.style.width = (sb > 0 ? w - sb / zoom : w) + "px"; kit.style.minHeight = h + "px"; kit.style.setProperty("--z", zoom.toFixed(4));
    if (root.Shell?.route === "components") root.syncSize?.();
  }
  new ResizeObserver(() => { if (!build.hidden) fitKit(); }).observe(canvas);
  root.UI?.resizable(frame, {
    get: pageSize, scale: () => zoom, room: roomOf, min: 280, max: 4000, disabled: () => build.hidden,
    start() { const [w, h] = pageSize(); K.fit = false; K.pw = w; K.ph = h; rzZoom = zoom; },
    set(w, h) { K.pw = w; K.ph = h; fitKit(); },
    end() { rzZoom = 0; save(); fitKit(); },
  });
  const sizer = {
    get: pageSize, fitting: () => K.fit,
    set(w, h) { K.fit = false; K.pw = clamp(w, 280, 4000); K.ph = clamp(h, 280, 4000); save(); root.UI ? root.UI.swap(fitKit) : fitKit(); },
    fit() { K.fit = true; save(); root.UI ? root.UI.swap(fitKit) : fitKit(); },
  };
  function renderStage() {
    const kit = $("kit");
    kit.className = "kit" + (K.view === "pages" ? " k-landing" : "");
    kit.innerHTML = previewHTML();
    fitKit();
    vars(kit);
    renderStageSegs();
    focusSpec(false);
    applyArt();
  }
  // ---------- entrances and exits ----------
  // Page sections and sheet cards arrive in order with the chosen appear motion, and leave with the
  // disappear one, at the token duration and easing.
  const ENTER = { fade: [{ opacity: 0 }, { opacity: 1 }], rise: [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], scale: [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], blur: [{ opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0)" }] };
  const EXIT = { fade: [{ opacity: 1 }, { opacity: 0 }], sink: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(12px)" }], scale: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], blur: [{ opacity: 1, filter: "blur(0)" }, { opacity: 0, filter: "blur(10px)" }] };
  const partsOf = (kit) => [...kit.querySelectorAll(".k-sheet > *, .k-page > *:not(.k-app), .k-app > .k-side, .k-main > *")];
  let playTok = 0;
  // On scroll, the frame is the viewport: sections play their appear motion as they come into view and
  // their disappear motion as they leave, both ways, the way the exported scroll timeline does.
  let scrollIO = null;
  function armScroll(kit) {
    scrollIO?.disconnect(); scrollIO = null;
    if (K.trigger !== "scroll" || !kit) return;
    const frame = $("kitFrame"), els = partsOf(kit), seen = new WeakSet();
    for (const el of els) for (const a of el.getAnimations()) if (a.id === "kit") a.cancel();
    if (ENTER[K.enter]) for (const el of els) { const a = el.animate([ENTER[K.enter][0], ENTER[K.enter][0]], { duration: 1, fill: "forwards" }); a.id = "kit"; }
    scrollIO = new IntersectionObserver((list) => {
      let n = 0;
      for (const en of list) {
        const el = en.target, kill = () => { for (const a of el.getAnimations()) if (a.id === "kit") a.cancel(); };
        if (en.isIntersecting) {
          seen.add(el); kill();
          if (ENTER[K.enter]) { const a = el.animate(ENTER[K.enter], { duration: K.dur, easing: EASE[K.ease], delay: Math.min(n++, 8) * K.stagger, fill: "backwards" }); a.id = "kit"; }
        } else if (seen.has(el)) {
          kill();
          const frames = EXIT[K.exit] || (ENTER[K.enter] ? [ENTER[K.enter][1], ENTER[K.enter][0]] : null);
          if (frames) { const a = el.animate(frames, { duration: K.dur, easing: EASE[K.ease], fill: "forwards" }); a.id = "kit"; }
        }
      }
    }, { root: frame, threshold: 0.12 });
    els.forEach((el) => scrollIO.observe(el));
  }
  async function replay(exitFirst) {
    const kit = $("kit"); if (!kit || build.hidden || root.UI?.reduce.matches) return;
    if (K.trigger === "scroll") { if (exitFirst) $("kitFrame")?.scrollTo({ top: 0 }); armScroll(kit); return; }
    scrollIO?.disconnect(); scrollIO = null;
    const tok = ++playTok, els = partsOf(kit), opts = (i, back) => ({ duration: K.dur, easing: EASE[K.ease], delay: Math.min(back ? els.length - 1 - i : i, 12) * K.stagger * (back ? 0.5 : 1) });
    for (const el of els) for (const a of el.getAnimations()) if (a.id === "kit") a.cancel();
    if (exitFirst && EXIT[K.exit]) {
      const outs = els.map((el, i) => { const a = el.animate(EXIT[K.exit], { ...opts(i, true), fill: "forwards" }); a.id = "kit"; return a; });
      await Promise.all(outs.map((a) => a.finished.catch(() => {})));
      await new Promise((r) => setTimeout(r, 160));
      if (tok !== playTok) return;
      requestAnimationFrame(() => outs.forEach((a) => a.cancel()));
    }
    if (!ENTER[K.enter]) return;
    els.forEach((el, i) => { const a = el.animate(ENTER[K.enter], { ...opts(i), fill: "backwards" }); a.id = "kit"; });
  }
  $("cpReplay").onclick = () => replay(true);
  // ---------- artwork ----------
  // The studio's current design, captured as a picture for the pages.
  let artURL = "";
  async function refreshArt() {
    if (K.art !== "studio" || !root.Studio) { artURL = ""; applyArt(); return; }
    try { const c = await root.Studio.snapshot(1600, 1000); artURL = c.toDataURL("image/jpeg", 0.86); } catch (e) { artURL = ""; }
    applyArt();
  }
  function applyArt() {
    for (const el of [$("kit"), $("homeComponents")?.firstElementChild]) if (el) { el.classList.toggle("k-has-art", !!artURL); el.style.setProperty("--k-art", artURL ? `url("${artURL}")` : "none"); }
    paintArtThumb();
  }
  if (K.art === "studio") setTimeout(refreshArt, 1500);
  function paintArtThumb() { for (const th of [$("cpArtTh"), $("cpArtTile")]) if (th) th.style.backgroundImage = artURL ? `url("${artURL}")` : ""; }
  // Full width: the token columns fold away so the preview gets the whole page.
  function setWide(on) {
    K.wide = on; save();
    build.classList.toggle("wide", on);
    $("cpWide").dataset.tip = on ? "Show the sidebar" : "Hide the sidebar"; $("cpWide").setAttribute("aria-label", $("cpWide").dataset.tip);
    $("cpWide").classList.toggle("on", on);
  }
  $("cpWide").onclick = () => { root.UI?.tip.hide(); setWide(!K.wide); };
  setWide(!!K.wide);
  const swapStage = () => { const go = () => { renderStage(); replay(false); }; root.UI ? root.UI.swap(go) : go(); };
  $("cpView").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (b && K.view !== b.dataset.v) { K.view = b.dataset.v; save(); swapStage(); } };
  $("cpLayout").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (b && K.layout !== b.dataset.v) { K.layout = b.dataset.v; save(); swapStage(); } };
  $("cpTheme").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (b) { K.dark = b.dataset.v === "dark"; renderStageSegs(); changed(K.slot === "color"); } };
  let changeT = 0;
  function changed(rebuildOpts) {
    save();
    vars($("kit")); renderSlots();
    if (K.slot === "motion" && $("cpDemo")) { $("cpDemo").style.setProperty("--dur", K.dur + "ms"); $("cpDemo").style.setProperty("--ease", EASE[K.ease]); }
    if (rebuildOpts) renderOpts(); else if (K.slot === "type") syncType();
    clearTimeout(changeT); changeT = setTimeout(() => root.dispatchEvent(new Event("kit-change")), 150);
  }

  // ---------- exports ----------
  const stack = (f, fallback) => `"${f}", ${fallback}`;
  const fontsLink = () => { const f = fonts(), g = [...new Set([f.head, f.body])].filter((x) => !custom.has(x)); return g.length ? `https://fonts.googleapis.com/css2?${g.map((x) => `family=${x.replace(/ /g, "+")}:wght@400;500;600;700`).join("&")}&display=swap` : "none, your own font files"; };
  function cssVars() {
    const t = tokens();
    return `/* Fonts: ${fontsLink()} */\n:root {\n  --font-heading: ${stack(t.font.heading, "system-ui, sans-serif")};\n  --font-body: ${stack(t.font.body, "system-ui, sans-serif")};\n  --heading-weight: ${t.font.headingWeight};\n  --heading-tracking: ${t.font.tracking}em;\n` +
      Object.entries(t.size).map(([k, v]) => `  --text-${k}: ${v / 16}rem;`).join("\n") + "\n" +
      Object.entries(t.color).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`).join("\n") + "\n" +
      Object.entries(t.space).map(([k, v]) => `  --space-${k}: ${v}px;`).join("\n") +
      `\n  --radius: ${t.radius.base}px;\n  --radius-button: ${t.radius.button}px;\n  --shadow: ${t.shadow};\n  --duration: ${t.motion.duration}ms;\n  --easing: ${t.motion.easing};\n  --stagger: ${t.motion.stagger}ms;\n}\n` + motionCSS();
  }
  function tailwind() {
    const t = tokens();
    return `/* Tailwind CSS v4. Fonts: ${fontsLink()} */\n@import "tailwindcss";\n\n@theme {\n  --font-heading: ${stack(t.font.heading, "system-ui, sans-serif")};\n  --font-body: ${stack(t.font.body, "system-ui, sans-serif")};\n` +
      Object.entries(t.color).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`).join("\n") +
      `\n  --spacing: ${space(1)}px;\n  --radius-base: ${t.radius.base}px;\n  --radius-button: ${t.radius.button}px;\n  --shadow-base: ${t.shadow};\n  --default-transition-duration: ${t.motion.duration}ms;\n  --default-transition-timing-function: ${t.motion.easing};\n}\n`;
  }
  // Appear and disappear as keyframes, with a reduced-motion fallback.
  const KF = (frames) => frames.map((f, i) => `  ${i ? "to" : "from"} { ${Object.entries(f).map(([k, v]) => `${k}: ${v === "none" ? "none" : v};`).join(" ")} }`).join("\n");
  function motionCSS() {
    let out = "";
    if (ENTER[K.enter]) out += `\n@keyframes appear {\n${KF(ENTER[K.enter])}\n}\n.appear { animation: appear var(--duration) var(--easing) both; animation-delay: calc(var(--i, 0) * var(--stagger)); }\n`;
    if (EXIT[K.exit]) out += `\n@keyframes disappear {\n${KF(EXIT[K.exit])}\n}\n.disappear { animation: disappear var(--duration) var(--easing) both; }\n`;
    // On scroll: the same keyframes run on a view timeline, in as a section enters and out as it leaves.
    if (K.trigger === "scroll" && (ENTER[K.enter] || EXIT[K.exit])) {
      const names = [ENTER[K.enter] && "appear", EXIT[K.exit] && "disappear"].filter(Boolean);
      const ranges = [ENTER[K.enter] && "entry 0% entry 60%", EXIT[K.exit] && "exit 40% exit 100%"].filter(Boolean);
      out += `\n/* Scroll-driven: sections appear as they enter the viewport and disappear as they leave. */\n@supports (animation-timeline: view()) {\n  .on-scroll { animation: ${names.map((n) => `${n} linear both`).join(", ")}; animation-timeline: ${names.map(() => "view()").join(", ")}; animation-range: ${ranges.join(", ")}; }\n}\n`;
    }
    return out + (out ? `\n@media (prefers-reduced-motion: reduce) { .appear, .disappear, .on-scroll { animation: none; } }\n` : "");
  }
  const jsonTokens = () => JSON.stringify(tokens(), null, 2);
  // Briefs for AI agents: one for design work, one for building it.
  function brief(kind = "design") {
    const t = tokens(), r = roles(), rules = K.rules.filter((x) => x.on && x.t.trim()).map((x) => `- ${x.t.trim()}`).join("\n");
    const named = (h) => `${h} (${C.name(h)})`;
    const libs = LIBS.filter((l) => (K.fw === "All" || l.fw.includes(K.fw)) && ["Components", "Headless"].includes(l.cat)).slice(0, 6).map((l) => `- ${l.name}: ${l.url}`).join("\n");
    const own = [t.font.heading, t.font.body].filter((x) => custom.has(x));
    let out = `# ${kind === "design" ? "Design brief" : "Build brief"}\n\nFollow these rules on every screen:\n${rules}\n\n## Type\n- Headings: ${t.font.heading}, weight ${t.font.headingWeight}, tracking ${t.font.tracking}em\n- Body: ${t.font.body}, ${t.size.base}px base, scale ratio ${K.scale}\n- Load from Google Fonts: ${fontsLink()}\n${own.length ? `- Self-hosted fonts (files supplied separately): ${[...new Set(own)].join(", ")}\n` : ""}\n## Color (${isDark() ? "dark" : "light"} mode)\n- Background ${named(r.bg)}, surface ${r.surface}, border ${r.border}\n- Text ${named(r.text)}, muted text ${r.muted}\n- Text on background is ${r.contrast.toFixed(1)}:1\n- Accent ${named(r.accent)} with ${r.onAccent} text on it\n- Roles: ${ROLES.map(([k, n]) => `${n.toLowerCase()} ${r[k]}`).join(", ")}\n\n## Shape and space\n- Spacing scale (px): ${Object.values(t.space).join(", ")}\n- Corner radius ${t.radius.base}px, buttons ${K.pill ? "fully rounded" : t.radius.base + "px"}\n- Elevation: ${K.elevation} (${t.shadow})\n\n## Motion\n- ${t.motion.duration}ms with ${t.motion.easing}\n- Things appear with ${K.enter === "none" ? "no motion" : `a ${K.enter} (${t.motion.stagger}ms between items in a group)`} and disappear with ${K.exit === "none" ? "no motion" : `a ${K.exit}`}\n- ${K.trigger === "scroll" ? "Sections play these as they scroll into and out of view (class on-scroll in the CSS)" : "These play once when a view loads"}\n- Vary timing slightly between elements and honor prefers-reduced-motion\n`;
    if (kind === "dev") out += `\n## Tokens as CSS variables\n\`\`\`css\n${cssVars()}\`\`\`\n\n## Tailwind v4 theme\n\`\`\`css\n${tailwind()}\`\`\`\n` + (libs ? `\n## Suggested libraries${K.fw !== "All" ? " for " + K.fw : ""}\n${libs}\n` : "");
    return out;
  }
  // Export menu in the top bar.
  const exWrap = document.createElement("div");
  exWrap.className = "menu-wrap"; exWrap.dataset.for = "components";
  exWrap.innerHTML = `<button class="btn primary" id="cpExportBtn" aria-haspopup="true">Export${ic("chev")}</button><div class="pop" id="cpExportMenu" hidden>
    <h3>Tokens</h3>
    <button class="opt" data-x="css"><span>${ic("copy")}CSS variables</span></button>
    <button class="opt" data-x="tw"><span>${ic("copy")}Tailwind v4 theme</span></button>
    <button class="opt" data-x="json"><span>${ic("copy")}JSON tokens</span></button>
    <h3>For AI agents</h3>
    <button class="opt" data-x="design"><span>${ic("copy")}Design brief</span></button>
    <button class="opt" data-x="dev"><span>${ic("copy")}Build brief with tokens</span></button></div>`;
  document.querySelector(".top-right").insertBefore(exWrap, document.querySelector(".top-right").lastElementChild);
  $("cpExportBtn").onclick = (e) => { e.stopPropagation(); $("cpExportMenu").hidden = !$("cpExportMenu").hidden; };
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest("#cpExportMenu, #cpExportBtn")) $("cpExportMenu").hidden = true; });
  $("cpExportMenu").onclick = async (e) => {
    const b = e.target.closest("[data-x]"); if (!b) return;
    const text = { css: cssVars, tw: tailwind, json: jsonTokens, design: () => brief("design"), dev: () => brief("dev") }[b.dataset.x]();
    $("cpExportMenu").hidden = true;
    try { await navigator.clipboard.writeText(text); root.toastMsg?.("Copied"); } catch (err) { root.toastMsg?.("Clipboard is blocked here"); }
  };

  // ---------- mode ----------
  function setMode(m) {
    K.mode = m; save();
    lib.hidden = m !== "libraries"; build.hidden = m !== "builder";
    for (const b of $("cpMode").querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === m);
    if (m === "libraries") renderLibs();
    else { renderSlots(); renderOpts(true); renderStage(); refreshArt(); requestAnimationFrame(() => replay(false)); }
    document.body.dataset.cp = m;
  }
  $("cpMode").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (b && b.dataset.v !== K.mode) { for (const x of $("cpMode").querySelectorAll("button")) x.classList.toggle("on", x === b); root.UI ? root.UI.swap(() => setMode(b.dataset.v)) : setMode(b.dataset.v); } };

  // A palette sent back from the palette tool.
  function usePalette(hexes) { K.follow = false; K.src = hexes.slice(); K.srcKey = "tool"; K.rc = fromSource(); K.slot = "color"; K.mode = "builder"; save(); }
  const summary = () => `${K.mode}, ${K.mode === "builder" ? `${K.slot} token, ${K.view === "pages" ? LAYOUTS[K.layout][0] + " page" : "components"}, ${pageSize().join("×")}${K.fit ? " (fit)" : ""}` : `${K.fw} framework, ${K.cat} category`}`;
  root.Components = { onShow: () => setMode(K.mode), usePalette, summary, sizer, preview, tokens, brief, cssVars, libraries: () => LIBS.slice(), state: () => JSON.parse(JSON.stringify(K)) };
})(window);
