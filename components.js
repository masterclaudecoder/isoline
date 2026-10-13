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
  ];
  const KEY = "isoline-kit";
  const DEF = {
    mode: "libraries", fw: "All", cat: "All", q: "", slot: "type", view: "components", layout: "hero", dark: null, follow: true,
    pair: 0, head: "", body: "", scale: 1.25, base: 16, tracking: -0.02,
    colors: ["#1c1c1e", "#e8572a", "#faf8f3"], accent: 1,
    unit: 4, density: 1, radius: 10, pill: false, elevation: "soft", dur: 200, ease: "out",
    rules: RULES.map((t) => ({ t, on: true })),
  };
  let K = { ...DEF };
  try { K = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) {} };
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
  const cols = () => (K.follow ? [UI[isDark() ? "dark" : "light"].text, appAccent(), UI[isDark() ? "dark" : "light"].bg] : K.colors);
  const accentIndex = () => (K.follow ? 1 : clamp(K.accent, 0, K.colors.length - 1));
  // Editing any color takes the kit off the app's colors, starting from what it showed.
  function unfollow() { if (!K.follow) return; K.colors = cols().slice(); K.accent = 1; K.follow = false; }
  // Color roles from the palette: background is the lightest (or darkest in dark mode), text the opposite,
  // the accent the chosen swatch, and surface, border and muted text mixed between them.
  function roles() {
    const onOf = (a) => (C.contrast(a, "#ffffff") >= C.contrast(a, "#111111") ? "#ffffff" : "#111111");
    if (K.follow) {
      const u = UI[isDark() ? "dark" : "light"], accent = appAccent();
      return { bg: u.bg, text: u.text, accent, onAccent: onOf(accent), surface: u.surface, border: C.mixOklab(u.bg, u.text, 0.1), muted: u.muted, contrast: C.contrast(u.text, u.bg) };
    }
    const cs = K.colors.slice(), byL = cs.slice().sort((a, b) => C.toOklch(a)[0] - C.toOklch(b)[0]);
    let bg = byL[byL.length - 1], text = byL[0];
    if (isDark()) [bg, text] = [text, bg];
    const accent = cs[accentIndex()];
    return { bg, text, accent, onAccent: onOf(accent), surface: C.mixOklab(bg, text, 0.035), border: C.mixOklab(bg, text, 0.13), muted: C.mixOklab(bg, text, 0.58), contrast: C.contrast(text, bg) };
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
      motion: { duration: K.dur, easing: EASE[K.ease] },
    };
  }
  function vars(el) {
    const t = tokens();
    const v = { "--k-head": `"${t.font.heading}"`, "--k-body": `"${t.font.body}"`, "--k-hw": t.font.headingWeight, "--k-track": t.font.tracking + "em", "--k-bg": t.color.bg, "--k-surface": t.color.surface, "--k-text": t.color.text, "--k-muted": t.color.muted, "--k-border": t.color.border, "--k-accent": t.color.accent, "--k-on-accent": t.color.onAccent, "--k-r": t.radius.base + "px", "--k-rb": t.radius.button + "px", "--k-shadow": t.shadow, "--k-dur": t.motion.duration + "ms", "--k-ease": t.motion.easing };
    for (const [k, px] of Object.entries(t.size)) v["--k-" + k] = px + "px";
    for (const [k, px] of Object.entries(t.space)) v["--k-s" + k] = px + "px";
    for (const [k, val] of Object.entries(v)) el.style.setProperty(k, val);
    loadFont(t.font.heading); loadFont(t.font.body);
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
    chev: '<path d="m6 8 4 4 4-4"/>', quote: '<path d="M8 6.5C5.5 7.3 4.5 9 4.5 11.5v2h4v-4H6.3c.2-1.2.9-2 2.2-2.5ZM15 6.5c-2.5.8-3.5 2.5-3.5 5v2h4v-4h-2.2c.2-1.2.9-2 2.2-2.5Z"/>',
  };
  const ki = (n, cls = "") => `<svg class="k-ic ${cls}" viewBox="0 0 20 20" aria-hidden="true">${KI[n]}</svg>`;
  // A sparkline and a bar chart, drawn in the accent so they follow the palette.
  function spark(vals, w = 220, h = 56) {
    const max = Math.max(...vals), min = Math.min(...vals), X = (i) => (i / (vals.length - 1)) * w, Y = (v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 10);
    const line = vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
    return `<svg class="k-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="k-spark-fill" d="${line}L${w} ${h}L0 ${h}Z"/><path class="k-spark-line" d="${line}"/><circle class="k-spark-dot" cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3.2"/></svg>`;
  }
  const bars = (vals, labels, hi = -1) => `<div class="k-bars">${vals.map((v, i) => `<div class="k-bar${i === hi ? " on" : ""}"><i style="height:${v}%"></i>${labels ? `<span>${labels[i]}</span>` : ""}</div>`).join("")}</div>`;
  const av = (t, i) => `<span class="k-av" style="--i:${i}">${t}</span>`;
  const COMPONENTS = `
    <div class="k-sheet">
      <section class="k-card k-stat"><div class="k-row k-between"><span class="k-label">Revenue</span><span class="k-badge k-soft">+12.4%</span></div><b class="k-num">$48,210</b><span class="k-small">vs $42,880 last month</span>${spark([18, 22, 19, 26, 24, 30, 28, 34, 31, 36, 40, 38])}</section>
      <section class="k-card k-stat"><div class="k-row k-between"><span class="k-label">Active people</span><span class="k-badge k-soft">+3.1%</span></div><b class="k-num">2,418</b><span class="k-small">312 joined this week</span>${spark([30, 28, 31, 29, 33, 35, 34, 36, 35, 38, 37, 41])}</section>
      <section class="k-card k-stat"><div class="k-row k-between"><span class="k-label">Review time</span><span class="k-badge k-line">-18 min</span></div><b class="k-num">1h 42m</b><span class="k-small">Median across 86 reviews</span>${spark([40, 38, 39, 33, 34, 30, 31, 27, 28, 24, 25, 22])}</section>
      <section class="k-card k-chart k-span2">
        <div class="k-row k-between k-head"><div><h3 class="k-h3">Weekly activity</h3><span class="k-small">Pages published and reviewed</span></div><div class="k-tabs"><span class="on">Week</span><span>Month</span><span>Year</span></div></div>
        ${bars([42, 64, 55, 80, 72, 38, 30], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 3)}
      </section>
      <section class="k-card k-team">
        <div class="k-row k-between k-head"><h3 class="k-h3">Team</h3><button class="k-btn k-sm k-sec">${ki("plus")}Invite</button></div>
        ${[["AL", "Ada Lovelace", "Owner", "Online"], ["LW", "Lin Wei", "Editor", "Online"], ["SK", "Sam Kerr", "Reviewer", "Away"], ["MO", "Mo Okafor", "Viewer", "Offline"]].map(([i, n, r, st], k) => `<div class="k-person">${av(i, k)}<span class="k-who"><b>${n}</b><span>${r}</span></span><span class="k-status k-${st.toLowerCase()}">${st}</span></div>`).join("")}
      </section>
      <section class="k-card k-form">
        <h3 class="k-h3">New project</h3>
        <label class="k-label" for="k-name">Name</label><input class="k-input" id="k-name" value="Spring launch">
        <label class="k-label">Visibility</label><div class="k-select">${ki("lock")}<span>Team only</span>${ki("chev")}</div>
        <div class="k-row k-between k-opt"><span><b>Notifications</b><small>Email me when it ships</small></span><span class="k-switch on"><i></i></span></div>
        <div class="k-row k-between k-opt"><span><b>Auto-save</b><small>Every few seconds</small></span><span class="k-switch"><i></i></span></div>
        <div class="k-row k-end"><button class="k-btn k-ghost">Cancel</button><button class="k-btn">Create project</button></div>
      </section>
      <section class="k-card k-menu">
        <div class="k-cmd">${ki("search")}<span>Search or jump to</span><kbd>⌘K</kbd></div>
        <span class="k-small k-group">Suggestions</span>
        ${[["file", "New page", "N"], ["users", "Invite people", "I"], ["chart", "Open analytics", "A"], ["gear", "Settings", ","]].map(([icn, t, k], n) => `<div class="k-item${n === 0 ? " on" : ""}">${ki(icn)}<span>${t}</span><kbd>${k}</kbd></div>`).join("")}
      </section>
      <section class="k-card k-notes">
        <div class="k-alert">${ki("check")}<span><b>Published</b><small>Spring launch is live for everyone.</small></span></div>
        <div class="k-toast">${ki("bell")}<span>Lin left 3 comments</span><button class="k-btn k-sm k-ghost">View</button></div>
        <div class="k-row k-between k-small"><span>Uploading assets</span><span>64%</span></div>
        <div class="k-progress"><i></i></div>
        <div class="k-row k-people">${["AL", "LW", "SK"].map(av).join("")}<span class="k-small">Ada, Lin and 4 others are here</span></div>
      </section>
      <section class="k-card k-table k-span2">
        <div class="k-row k-between k-head k-pad"><h3 class="k-h3">Projects</h3><div class="k-row"><button class="k-btn k-sm k-ghost">Filter</button><button class="k-btn k-sm">${ki("plus")}New</button></div></div>
        <div class="k-tr k-th"><span>Project</span><span>Owner</span><span>Status</span><span>Due</span></div>
        ${[["Website refresh", "Ada", "In review", "k-soft", "Oct 18"], ["Brand book", "Lin", "Live", "", "Oct 02"], ["Spring launch", "Sam", "Draft", "k-line", "Nov 04"], ["Onboarding emails", "Mo", "In review", "k-soft", "Nov 11"]].map(([p, o, st, c, d], k) => `<div class="k-tr"><span class="k-proj"><i style="--i:${k}"></i>${p}</span><span>${o}</span><span><span class="k-badge ${c}">${st}</span></span><span class="k-muted">${d}</span></div>`).join("")}
      </section>
      <section class="k-card k-kit">
        <h3 class="k-h3">Buttons and badges</h3>
        <div class="k-row"><button class="k-btn">Primary</button><button class="k-btn k-sec">Secondary</button><button class="k-btn k-ghost">Ghost</button></div>
        <div class="k-row"><button class="k-btn k-sm">${ki("plus")}Small</button><button class="k-btn k-sm k-sec k-icon" aria-label="More">${ki("more")}</button><button class="k-btn k-sm k-sec k-icon" aria-label="Search">${ki("search")}</button></div>
        <div class="k-row"><span class="k-badge">New</span><span class="k-badge k-soft">Draft</span><span class="k-badge k-line">Archived</span><span class="k-chip">Design<i>×</i></span></div>
        <label class="k-check"><span class="k-box on"></span>Send me the weekly digest</label>
      </section>
    </div>`;
  // Landing building blocks: the product mock is made of the same components, so it restyles too.
  const NAV = `<nav class="k-nav"><b class="k-brand"><i class="k-logo"></i>Northwind</b><span>Product</span><span>Customers</span><span>Pricing</span><span>Docs</span><span class="k-grow"></span><span class="k-link">Sign in</span><button class="k-btn k-sm">Get started</button></nav>`;
  const MOCK = (wide) => `<div class="k-mock${wide ? " k-mock-wide" : ""}"><div class="k-mock-bar"><i></i><i></i><i></i><span>app.northwind.co</span></div><div class="k-mock-body">
      <aside class="k-mock-side"><b class="k-brand"><i class="k-logo"></i>Northwind</b>${[["home", "Overview", 1], ["folder", "Projects"], ["check", "Reviews"], ["layers", "Assets"], ["gear", "Settings"]].map(([icn, t, on]) => `<span class="${on ? "on" : ""}">${ki(icn)}${t}</span>`).join("")}</aside>
      <div class="k-mock-main"><div class="k-row k-between"><b class="k-h3">Overview</b><button class="k-btn k-sm">${ki("plus")}New project</button></div>
        <div class="k-mock-stats">${[["Published", "128", "+12%"], ["In review", "14", "-3"], ["Avg. review", "1h 42m", "-18m"]].map(([l, v, d]) => `<div class="k-card"><span class="k-small">${l}</span><b>${v}</b><span class="k-badge k-soft">${d}</span></div>`).join("")}</div>
        <div class="k-card k-mock-chart"><div class="k-row k-between"><span class="k-small">Activity</span><span class="k-small">Last 7 days</span></div>${bars([42, 64, 55, 80, 72, 50, 66], null, 3)}</div>
      </div></div></div>`;
  const LOGOS = `<div class="k-logos"><span class="k-small">Trusted by teams at</span>${["Acme", "Lumen", "Halcyon", "Parallel", "Fieldwork", "Orbit"].map((n, i) => `<b class="k-wordmark k-w${i}">${n}</b>`).join("")}</div>`;
  const FEATS = [["sync", "Everything in sync", "Briefs, assets and approvals live in one place, updated as you work."], ["check", "Reviews that move", "Comment in context and approve in a click. No more chasing threads."], ["clock", "Ship on schedule", "Deadlines, reminders and a calm view of what is due this week."], ["lock", "Private by default", "Roles, single sign-on and audit logs for teams that need them."], ["chart", "Know what works", "See which pages land and where readers drop off."], ["layers", "Reusable blocks", "Save sections once and drop them into any page."]];
  const feat = ([icn, t, d]) => `<div class="k-feat"><span class="k-feat-ic">${ki(icn)}</span><h3 class="k-h3">${t}</h3><p class="k-p">${d}</p></div>`;
  const QUOTE = `<figure class="k-quote">${ki("quote", "k-quote-ic")}<blockquote>We moved our whole launch process into Northwind in a week. Reviews that took days now take an afternoon.</blockquote><figcaption>${av("PR", 2)}<span><b>Priya Rao</b><span>Head of content, Lumen</span></span></figcaption></figure>`;
  const CTA = `<section class="k-cta"><div><h2 class="k-h2">Ready when your team is</h2><p class="k-p">Free for teams up to five. Upgrade when you grow.</p></div><div class="k-row"><button class="k-btn">Start free</button><button class="k-btn k-sec">Talk to us</button></div></section>`;
  const FOOT = `<footer class="k-foot"><div><b class="k-brand"><i class="k-logo"></i>Northwind</b><p class="k-small">Calm launches for small teams.</p></div>${[["Product", ["Overview", "Pricing", "Changelog"]], ["Company", ["About", "Careers", "Press"]], ["Help", ["Docs", "Status", "Contact"]]].map(([h, l]) => `<div><b>${h}</b>${l.map((x) => `<span>${x}</span>`).join("")}</div>`).join("")}</footer>`;
  const LAYOUTS = {
    hero: ["Hero", `${NAV}
      <section class="k-hero"><div><span class="k-pill"><span class="k-badge">New</span>Reviews now run in real time${ki("arrow")}</span><h1 class="k-h1">Ship pages your team is proud of</h1><p class="k-lead">Plan, write and publish in one place, with review built in.</p><div class="k-row"><button class="k-btn k-lg">Start free${ki("arrow")}</button><button class="k-btn k-lg k-ghost">Watch the tour</button></div><span class="k-small k-note">${ki("check")}Free for teams up to five</span></div>${MOCK()}</section>
      ${LOGOS}<section class="k-feats k-three">${FEATS.slice(0, 3).map(feat).join("")}</section>${CTA}${FOOT}`],
    centered: ["Centered", `${NAV}
      <section class="k-center"><span class="k-pill"><span class="k-badge">2.0</span>A calmer way to launch${ki("arrow")}</span><h1 class="k-h1">Every launch in one calm place</h1><p class="k-lead">Briefs, assets and approvals together, so nothing slips.</p><div class="k-row k-mid"><button class="k-btn k-lg">Start free</button><button class="k-btn k-lg k-sec">Book a demo</button></div></section>
      ${MOCK(true)}
      <section class="k-stats">${[["3x", "faster reviews"], ["40%", "fewer meetings"], ["12k", "teams shipping"]].map(([n, t]) => `<div><b>${n}</b><span class="k-p">${t}</span></div>`).join("")}</section>
      ${QUOTE}${FOOT}`],
    features: ["Features", `${NAV}
      <section class="k-center k-tight"><h2 class="k-h1">Built for small teams</h2><p class="k-lead">Everything you need to plan, review and publish, without the busywork.</p></section>
      <section class="k-bento">
        <div class="k-card k-b-big"><h3 class="k-h3">See every launch at a glance</h3><p class="k-p">One board for what is drafting, in review and live.</p>${bars([42, 64, 55, 80, 72, 50, 66, 58, 74], null, 3)}</div>
        <div class="k-card"><span class="k-feat-ic">${ki("check")}</span><h3 class="k-h3">Approve in a click</h3><p class="k-p">Reviewers sign off right on the page.</p></div>
        <div class="k-card"><span class="k-feat-ic">${ki("bell")}</span><h3 class="k-h3">Gentle reminders</h3><p class="k-p">Nudges before a deadline, never after.</p></div>
        <div class="k-card k-b-wide"><div><h3 class="k-h3">Work together, live</h3><p class="k-p">See who is editing and pick up where they left off.</p></div><div class="k-row k-people">${["AL", "LW", "SK", "MO"].map(av).join("")}</div></div>
      </section>
      <section class="k-feats k-three">${FEATS.slice(3).map(feat).join("")}</section>${CTA}${FOOT}`],
    pricing: ["Pricing", `${NAV}
      <section class="k-center k-tight"><h2 class="k-h1">Simple pricing</h2><p class="k-lead">Start free. Pay per team, not per seat.</p><div class="k-tabs k-billing"><span>Monthly</span><span class="on">Yearly<i class="k-badge k-soft">Save 20%</i></span></div></section>
      <section class="k-prices">${[["Starter", "0", "For trying it out", ["3 projects", "Basic review", "Community support"]], ["Team", "24", "For growing teams", ["Unlimited projects", "Review and approvals", "Version history", "Priority support"]], ["Studio", "64", "For agencies", ["Everything in Team", "Roles and SSO", "Audit log", "Dedicated help"]]].map(([n, p, w, f], i) => `<div class="k-card${i === 1 ? " k-pop" : ""}">${i === 1 ? `<span class="k-badge k-flag">Most popular</span>` : ""}<h3 class="k-h3">${n}</h3><p class="k-small">${w}</p><div class="k-price"><b>$${p}</b><span>per month</span></div><button class="k-btn${i === 1 ? "" : " k-sec"}">Choose ${n}</button><div class="k-ticks">${f.map((x) => `<span>${ki("check")}${x}</span>`).join("")}</div></div>`).join("")}</section>
      <section class="k-faq"><h2 class="k-h2">Questions</h2>${[["Can I change plans later?", "Yes. Switch at any time and we prorate the difference."], ["Do you offer discounts?", "Nonprofits and schools get half off any plan."], ["What happens to my data if I cancel?", "You can export everything for 90 days."]].map(([q, a], i) => `<div class="k-qa${i === 0 ? " open" : ""}"><b>${q}${ki("chev")}</b>${i === 0 ? `<p class="k-p">${a}</p>` : ""}</div>`).join("")}</section>${FOOT}`],
  };
  function previewHTML() { return K.view === "components" ? COMPONENTS : `<div class="k-page">${LAYOUTS[K.layout][1]}</div>`; }
  // Home card: the hero landing, drawn at desktop width and scaled to fit the card.
  const homeRO = new ResizeObserver((en) => { for (const e of en) { const k = e.target.firstElementChild; if (k) k.style.setProperty("--s", (e.contentRect.width / 1240).toFixed(4)); } });
  function preview(el) {
    if (!el) return;
    if (!el.firstElementChild?.classList.contains("k-home")) { el.innerHTML = `<div class="kit k-home k-landing"><div class="k-page">${LAYOUTS.hero[1]}</div></div>`; homeRO.observe(el); }
    vars(el.firstElementChild);
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
  const SITE = "https://masterclaudecoder.github.io/topographic/";
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
      <h2 class="col-title">Libraries</h2>
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
    if (e.target.closest("#cpClear")) { K.fw = "All"; K.cat = "All"; K.q = ""; $("cpQ").value = ""; save(); renderLibs(true); return; }
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
  const SLOTS = [["type", "Type", "type"], ["color", "Color", "palette"], ["spacing", "Spacing", "space"], ["radius", "Radius", "corner"], ["elevation", "Elevation", "layers"], ["motion", "Motion", "timing"], ["rules", "Design rules", "rules"]];
  build.innerHTML = `
    <aside class="slots scroll"><h2 class="col-title">Tokens</h2><div id="cpSlots"></div></aside>
    <aside class="options scroll"><div class="opt-head"><h2 class="col-title" id="cpOptTitle"></h2></div><div id="cpOpts"></div>
      <div class="next-step"><button class="btn primary next-btn" id="cpNext"><span id="cpNextLbl"></span>${ic("next")}</button></div></aside>
    <section class="cp-stage">
      <div class="cp-stage-top"><div class="seg sm" id="cpView"><button data-v="components">Components</button><button data-v="landing">Landing</button></div><div class="seg sm fold-x" id="cpLayout"></div><div class="seg sm" id="cpTheme"><button data-v="light">Light</button><button data-v="dark">Dark</button></div></div>
      <div class="kit-frame scroll"><div class="kit" id="kit"></div></div>
    </section>`;
  $("cpLayout").innerHTML = Object.entries(LAYOUTS).map(([k, [n]]) => `<button data-v="${k}">${n}</button>`).join("");
  // Tile copy follows the studio's rule: the title names the choice, the subtitle lists its facts.
  const EASE_NAME = { linear: "Linear", out: "Ease out", inout: "Ease in and out", spring: "Spring" };
  const ELEV_FACT = { none: "Flat surfaces", hairline: "1px outline", soft: "Soft drop shadow", crisp: "Tight shadow", lifted: "Deep shadow" };
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const slotInfo = {
    type: () => { const f = fonts(), p = PAIRS[K.pair]; return [!K.head && !K.body && p ? p[0] : "Custom", f.head === f.body ? f.head : `${f.head} and ${f.body}`]; },
    color: () => { const r = roles(); return [K.follow ? "Isoline" : C.name(r.accent), K.follow ? `App colors, ${r.contrast.toFixed(1)}:1 text` : `${K.colors.length} colors, ${r.contrast.toFixed(1)}:1 text`]; },
    spacing: () => [{ 0.8: "Compact", 1: "Regular", 1.25: "Roomy" }[K.density] || "Custom", `${K.unit}px unit`],
    radius: () => [K.radius === 0 ? "Square" : K.radius <= 6 ? "Subtle" : K.radius <= 14 ? "Rounded" : "Soft", `${K.radius}px${K.pill ? ", pill buttons" : ""}`],
    elevation: () => [cap(K.elevation), ELEV_FACT[K.elevation]],
    motion: () => [EASE_NAME[K.ease], `${K.dur}ms`],
    rules: () => { const on = K.rules.filter((r) => r.on && r.t.trim()).length, off = K.rules.length - on; return [on ? `${on} ${on === 1 ? "rule" : "rules"}` : "No rules", off ? `${off} switched off` : K.rules.length ? "All on" : "Add your own"]; },
  };
  // Built once and patched, so selection and text changes transition like the studio's build column.
  $("cpSlots").innerHTML = SLOTS.map(([id, label, icon]) => `<div class="slot"><div class="slot-label">${label}</div><button class="tile" data-s="${id}"><span class="tile-th tile-ic">${ic(icon)}</span><span class="tile-text"><b></b><small></small></span>${ic("next")}</button></div>`).join("");
  const setText = (el, v) => { if (el.textContent === v) return; el.textContent = v; if (!root.UI?.reduce.matches && !build.hidden) el.animate([{ opacity: 0, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }], { duration: 220 + Math.random() * 80, easing: "cubic-bezier(.22,1,.36,1)" }); };
  function renderSlots() {
    for (const t of $("cpSlots").querySelectorAll("[data-s]")) {
      const [title, fact] = slotInfo[t.dataset.s]();
      t.classList.toggle("on", K.slot === t.dataset.s);
      setText(t.querySelector("b"), title); setText(t.querySelector("small"), fact);
    }
  }
  $("cpSlots").addEventListener("click", (e) => { const t = e.target.closest("[data-s]"); if (t) setSlot(t.dataset.s); });
  function setSlot(id) { if (K.slot === id) return; K.slot = id; save(); renderSlots(); renderOpts(true); $("cpOpts").closest(".options").scrollTo({ top: 0 }); }
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
    el.innerHTML = opts.map(([v, l]) => `<button data-v="${v}" class="${String(get()) === String(v) ? "on" : ""}">${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; set(isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v); for (const x of el.querySelectorAll("button")) x.classList.toggle("on", x === b); changed(); };
    host.appendChild(el); return el;
  }
  const sub = (host, t) => host.insertAdjacentHTML("beforeend", `<h3 class="sub">${t}</h3>`);

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
    $("cpNextLbl").textContent = i === SLOTS.length - 1 ? "Export" : `Next: ${SLOTS[i + 1][1]}`;
    o.innerHTML = "";
    if (K.slot === "type") {
      const f = fonts();
      o.insertAdjacentHTML("beforeend", `<div class="ff-pair">${[["head", "Headings", f.head, f.weight], ["body", "Body", f.body, 400]].map(([role, label, name, w]) => `<button class="ff-trigger" data-role="${role}" aria-haspopup="listbox"><small>${label}</small><span style="font-family:'${esc(name)}', system-ui;font-weight:${w}">${esc(name)}</span><em>${kindOf(name)}</em>${ic("chev")}</button>`).join("")}</div>
        <p class="hint">Choose the body font first, for easy reading. Then pick a heading with some contrast, like a serif over a sans or a heavier weight.</p>`);
      o.querySelector(".ff-pair").onclick = (e) => { const b = e.target.closest(".ff-trigger"); if (!b) return; if (ff?.anchor === b) closeFF(); else fontPicker(b, b.dataset.role); };
      sub(o, "Pairings");
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
      sub(o, "Colors");
      const row = document.createElement("div"); row.className = "mine";
      const cs = cols(), ai = accentIndex();
      o.insertAdjacentHTML("beforeend", `<label class="label-row switch-row cp-follow"><span class="label">Match Isoline</span><span class="switch"><input type="checkbox" id="cpFollow"${K.follow ? " checked" : ""}><span></span></span></label>`);
      $("cpFollow").onchange = (e) => { if (e.target.checked) { K.follow = true; K.dark = null; } else unfollow(); changed(true); renderStageSegs(); };
      row.innerHTML = cs.map((c, k) => `<div class="stop" data-k="${k}"><button class="sw" style="background:${c}" aria-label="Edit color ${k + 1}"></button>${cs.length > 2 ? `<button class="x" aria-label="Remove color">${ic("x")}</button>` : ""}<button class="cp-acc${ai === k ? " on" : ""}" data-acc="${k}">${ai === k ? "Accent" : "Use"}</button></div>`).join("") + (cs.length < 8 ? `<button class="stop-add" aria-label="Add color">${ic("plus")}</button>` : "");
      row.onclick = (e) => {
        const k = +e.target.closest("[data-k]")?.dataset.k;
        if (e.target.closest("[data-acc], .x, .stop-add")) unfollow();
        if (e.target.closest("[data-acc]")) { K.accent = +e.target.closest("[data-acc]").dataset.acc; changed(true); }
        else if (e.target.closest(".x")) { const st = e.target.closest(".stop"); const go = () => { K.colors.splice(k, 1); K.accent = clamp(K.accent, 0, K.colors.length - 1); changed(true); }; if (root.UI?.reduce.matches) go(); else st.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.6)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).onfinish = go; }
        else if (e.target.closest(".stop-add")) { K.colors.push(C.mixOklab(K.colors[K.colors.length - 1], K.colors[0], 0.5)); changed(true); $("cpOpts").querySelector(`.stop[data-k="${K.colors.length - 1}"]`)?.classList.add("fresh-stop"); }
        else if (e.target.closest(".sw")) { const sw = e.target.closest(".sw"); picker.open(sw, cols()[k], (v) => { if (K.follow) { unfollow(); $("cpFollow").checked = false; } K.colors[k] = v; sw.style.background = v; changed(); paintContrast(); }, () => save(), [["Palette", cols()]]); }
      };
      o.appendChild(row);
      o.insertAdjacentHTML("beforeend", `<div class="cp-contrast"><span>Text contrast</span><b class="mono" id="cpRatio"></b><em id="cpLevel"></em></div>`);
      paintContrast();
      const pal = root.Palettes;
      if (pal) {
        sub(o, "From palettes");
        const list = [["Palette tool", pal.colors()], ...pal.saved().map((p) => [p.name, p.colors])];
        const g = document.createElement("div"); g.className = "cp-pals";
        g.innerHTML = list.map(([n, cols], k) => `<button class="sug" data-p="${k}"><span class="sug-sw">${cols.slice(0, 6).map((c) => `<i style="background:${c}"></i>`).join("")}</span><span>${esc(n)}</span></button>`).join("");
        g.onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; K.follow = false; K.colors = list[+b.dataset.p][1].slice(0, 8); const ch = K.colors.map((c) => C.toOklch(c)[1]); K.accent = ch.indexOf(Math.max(...ch)); changed(true); };
        o.appendChild(g);
      }
      sub(o, "Mode");
      seg(o, [["0", "Light"], ["1", "Dark"]], () => (isDark() ? 1 : 0), (v) => { K.dark = !!v; paintContrast(); renderStageSegs(); });
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
      sub(o, "Easing"); seg(o, [["linear", "Linear"], ["out", "Out"], ["inout", "In and out"], ["spring", "Spring"]], () => K.ease, (v) => (K.ease = v));
      o.insertAdjacentHTML("beforeend", `<button class="cp-demo" id="cpDemo"><i></i><span>Click to replay</span></button>`);
      const demo = $("cpDemo");
      demo.style.setProperty("--dur", K.dur + "ms"); demo.style.setProperty("--ease", EASE[K.ease]);
      demo.onclick = () => { demo.classList.remove("go"); void demo.offsetWidth; demo.classList.add("go"); };
    } else if (K.slot === "rules") {
      o.insertAdjacentHTML("beforeend", `<p class="hint">These go into the brief you copy for agents. Edit, switch off or add your own.</p>`);
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
  function paintContrast() {
    const el = $("cpRatio"); if (!el) return;
    const r = roles().contrast, [lv, cls] = level(r);
    el.textContent = `${r.toFixed(1)}:1`;
    const em = $("cpLevel"); if (em.textContent !== lv) { em.textContent = lv; em.className = "cp-badge " + cls; }
  }
  function paintScale() {
    const host = $("cpScale"); if (!host) return;
    [1, 2, 3, 4, 6, 8, 12, 16].forEach((n, k) => { const row = host.children[k]; row.querySelector("i").style.width = Math.min(space(n), 200) + "px"; row.lastElementChild.textContent = space(n) + "px"; });
  }
  function renderStageSegs() {
    for (const [id, v] of [["cpView", K.view], ["cpLayout", K.layout], ["cpTheme", isDark() ? "dark" : "light"]]) for (const b of $(id).querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === v);
    $("cpLayout").hidden = K.view !== "landing";
  }
  const fitKit = () => { const kit = $("kit"), f = kit?.parentElement; if (kit && f?.clientWidth) kit.style.setProperty("--z", Math.min(1, (f.clientWidth - 0.5) / 1240).toFixed(4)); };
  new ResizeObserver(fitKit).observe(build.querySelector(".kit-frame"));
  function renderStage() {
    const kit = $("kit");
    kit.className = "kit" + (K.view === "landing" ? " k-landing" : "");
    fitKit();
    kit.innerHTML = previewHTML();
    vars(kit);
    renderStageSegs();
  }
  const swapStage = () => (root.UI ? root.UI.swap(renderStage) : renderStage());
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
      `\n  --radius: ${t.radius.base}px;\n  --radius-button: ${t.radius.button}px;\n  --shadow: ${t.shadow};\n  --duration: ${t.motion.duration}ms;\n  --easing: ${t.motion.easing};\n}\n`;
  }
  function tailwind() {
    const t = tokens();
    return `/* Tailwind CSS v4. Fonts: ${fontsLink()} */\n@import "tailwindcss";\n\n@theme {\n  --font-heading: ${stack(t.font.heading, "system-ui, sans-serif")};\n  --font-body: ${stack(t.font.body, "system-ui, sans-serif")};\n` +
      Object.entries(t.color).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`).join("\n") +
      `\n  --spacing: ${space(1)}px;\n  --radius-base: ${t.radius.base}px;\n  --radius-button: ${t.radius.button}px;\n  --shadow-base: ${t.shadow};\n  --default-transition-duration: ${t.motion.duration}ms;\n  --default-transition-timing-function: ${t.motion.easing};\n}\n`;
  }
  const jsonTokens = () => JSON.stringify(tokens(), null, 2);
  // Briefs for AI agents: one for design work, one for building it.
  function brief(kind = "design") {
    const t = tokens(), r = roles(), rules = K.rules.filter((x) => x.on && x.t.trim()).map((x) => `- ${x.t.trim()}`).join("\n");
    const named = (h) => `${h} (${C.name(h)})`;
    const libs = LIBS.filter((l) => (K.fw === "All" || l.fw.includes(K.fw)) && ["Components", "Headless"].includes(l.cat)).slice(0, 6).map((l) => `- ${l.name}: ${l.url}`).join("\n");
    const own = [t.font.heading, t.font.body].filter((x) => custom.has(x));
    let out = `# ${kind === "design" ? "Design brief" : "Build brief"}\n\nFollow these rules on every screen:\n${rules}\n\n## Type\n- Headings: ${t.font.heading}, weight ${t.font.headingWeight}, tracking ${t.font.tracking}em\n- Body: ${t.font.body}, ${t.size.base}px base, scale ratio ${K.scale}\n- Load from Google Fonts: ${fontsLink()}\n${own.length ? `- Self-hosted fonts (files supplied separately): ${[...new Set(own)].join(", ")}\n` : ""}\n## Color (${isDark() ? "dark" : "light"} mode)\n- Background ${named(r.bg)}, surface ${r.surface}, border ${r.border}\n- Text ${named(r.text)}, muted text ${r.muted}\n- Text on background is ${r.contrast.toFixed(1)}:1\n- Accent ${named(r.accent)} with ${r.onAccent} text on it\n- Full palette: ${cols().join(", ")}\n\n## Shape and space\n- Spacing scale (px): ${Object.values(t.space).join(", ")}\n- Corner radius ${t.radius.base}px, buttons ${K.pill ? "fully rounded" : t.radius.base + "px"}\n- Elevation: ${K.elevation} (${t.shadow})\n\n## Motion\n- ${t.motion.duration}ms with ${t.motion.easing}\n- Vary timing slightly between elements and honor prefers-reduced-motion\n`;
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
    else { renderSlots(); renderOpts(true); renderStage(); }
  }
  $("cpMode").onclick = (e) => { const b = e.target.closest("button[data-v]"); if (b && b.dataset.v !== K.mode) { for (const x of $("cpMode").querySelectorAll("button")) x.classList.toggle("on", x === b); root.UI ? root.UI.swap(() => setMode(b.dataset.v)) : setMode(b.dataset.v); } };

  root.Components = { onShow: () => setMode(K.mode), preview, tokens, brief, cssVars, libraries: () => LIBS.slice(), state: () => JSON.parse(JSON.stringify(K)) };
})(window);
