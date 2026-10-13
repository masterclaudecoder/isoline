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
  // [name, url, what it is, frameworks, category]. "Any" means framework-agnostic (plain JS, CSS or HTML).
  const R = "React", V = "Vue", SV = "Svelte", NG = "Angular", SO = "Solid", WC = "Web components", ANY = "Any";
  const LIBS = [
    ["shadcn/ui", "https://ui.shadcn.com", "Copy-in components built on Radix and Tailwind", [R], "Components"],
    ["Kibo UI", "https://www.kibo-ui.com", "Composable components for the shadcn/ui registry", [R], "Components", 1],
    ["Vanta UI", "https://www.vantaui.com/explore/components", "Component collection to browse and copy", [R], "Components", 1],
    ["UI Arc", "https://uiarc.dev", "Interface component collection", [R], "Components", 1],
    ["shadcn-vue", "https://www.shadcn-vue.com", "The shadcn/ui approach for Vue", [V], "Components"],
    ["shadcn-svelte", "https://www.shadcn-svelte.com", "The shadcn/ui approach for Svelte", [SV], "Components"],
    ["Solid UI", "https://www.solid-ui.com", "The shadcn/ui approach for Solid", [SO], "Components"],
    ["Spartan", "https://www.spartan.ng", "The shadcn/ui approach for Angular", [NG], "Components"],
    ["MUI", "https://mui.com", "Material Design components and Joy UI", [R], "Components"],
    ["Mantine", "https://mantine.dev", "Full component library with hooks and forms", [R], "Components"],
    ["Chakra UI", "https://chakra-ui.com", "Accessible, themeable component system", [R], "Components"],
    ["Ant Design", "https://ant.design", "Enterprise component library", [R], "Components"],
    ["HeroUI", "https://www.heroui.com", "Tailwind components, formerly NextUI", [R], "Components"],
    ["Park UI", "https://park-ui.com", "Styled components on Ark UI and Panda", [R, V, SO], "Components"],
    ["Magic UI", "https://magicui.design", "Animated components for landing pages", [R], "Components"],
    ["Aceternity UI", "https://ui.aceternity.com", "Showy animated sections and effects", [R], "Components"],
    ["Tailwind Plus", "https://tailwindcss.com/plus", "Official Tailwind components and templates", [R, V, ANY], "Components"],
    ["daisyUI", "https://daisyui.com", "Component classes for Tailwind", [ANY], "Components"],
    ["Flowbite", "https://flowbite.com", "Tailwind components with framework ports", [ANY, R, V, SV], "Components"],
    ["Preline UI", "https://preline.co", "Tailwind components and examples", [ANY], "Components"],
    ["Bootstrap", "https://getbootstrap.com", "The classic responsive toolkit", [ANY], "Components"],
    ["Bulma", "https://bulma.io", "Modern CSS framework, no JavaScript", [ANY], "Components"],
    ["Pico CSS", "https://picocss.com", "Minimal styles for semantic HTML", [ANY], "Components"],
    ["Vuetify", "https://vuetifyjs.com", "Material components for Vue", [V], "Components"],
    ["Quasar", "https://quasar.dev", "Vue framework for web, mobile and desktop", [V], "Components"],
    ["PrimeVue", "https://primevue.org", "Large Vue component suite", [V], "Components"],
    ["PrimeReact", "https://primereact.org", "Large React component suite", [R], "Components"],
    ["PrimeNG", "https://primeng.org", "Large Angular component suite", [NG], "Components"],
    ["Element Plus", "https://element-plus.org", "Desktop-first Vue 3 components", [V], "Components"],
    ["Naive UI", "https://www.naiveui.com", "Themeable Vue 3 components in TypeScript", [V], "Components"],
    ["Nuxt UI", "https://ui.nuxt.com", "Components for Nuxt and Vue", [V], "Components"],
    ["Skeleton", "https://www.skeleton.dev", "Design system for Svelte and Tailwind", [SV], "Components"],
    ["Flowbite Svelte", "https://flowbite-svelte.com", "Flowbite components for Svelte", [SV], "Components"],
    ["Angular Material", "https://material.angular.io", "Material Design for Angular", [NG], "Components"],
    ["Taiga UI", "https://taiga-ui.dev", "Angular components and tools", [NG], "Components"],
    ["Ionic", "https://ionicframework.com", "Mobile-first UI for web and native apps", [ANY, R, V, NG], "Components"],
    ["Fluent UI", "https://react.fluentui.dev", "Microsoft's design system components", [R, WC], "Components"],
    ["Carbon", "https://carbondesignsystem.com", "IBM's design system", [R, V, SV, NG, WC], "Components"],
    ["Material Web", "https://material-web.dev", "Material 3 as web components", [WC], "Components"],
    ["Web Awesome", "https://webawesome.com", "Web components from the makers of Shoelace", [WC], "Components"],
    ["Shoelace", "https://shoelace.style", "Framework-agnostic web components", [WC], "Components"],
    ["Spectrum Web Components", "https://opensource.adobe.com/spectrum-web-components", "Adobe Spectrum as web components", [WC], "Components"],
    ["Primer", "https://primer.style", "GitHub's design system", [R], "Components"],
    ["Polaris", "https://polaris.shopify.com", "Shopify's design system", [R, WC], "Components"],
    ["Atlassian Design System", "https://atlassian.design", "Atlassian's components and guidelines", [R], "Components"],
    ["Radix Primitives", "https://www.radix-ui.com/primitives", "Unstyled, accessible building blocks", [R], "Headless"],
    ["Base UI", "https://base-ui.com", "Unstyled components from the Radix and MUI teams", [R], "Headless"],
    ["React Aria", "https://react-spectrum.adobe.com/react-aria", "Adobe's accessible hooks and components", [R], "Headless"],
    ["Headless UI", "https://headlessui.com", "Unstyled components from Tailwind Labs", [R, V], "Headless"],
    ["Ark UI", "https://ark-ui.com", "Headless components on state machines", [R, V, SO, SV], "Headless"],
    ["Reka UI", "https://reka-ui.com", "Headless Vue components, formerly Radix Vue", [V], "Headless"],
    ["Bits UI", "https://www.bits-ui.com", "Headless Svelte components", [SV], "Headless", 1],
    ["Melt UI", "https://melt-ui.com", "Headless builders for Svelte", [SV], "Headless"],
    ["Kobalte", "https://kobalte.dev", "Headless, accessible Solid components", [SO], "Headless"],
    ["Zag", "https://zagjs.com", "UI state machines for any framework", [ANY, R, V, SO, SV], "Headless"],
    ["Floating UI", "https://floating-ui.com", "Positioning for tooltips and popovers", [ANY, R, V], "Headless"],
    ["cmdk", "https://cmdk.paco.me", "Fast, composable command menu", [R], "Headless"],
    ["Vaul", "https://vaul.emilkowal.ski", "Drawer component", [R], "Headless"],
    ["Sonner", "https://sonner.emilkowal.ski", "Opinionated toast notifications", [R], "Headless"],
    ["Embla Carousel", "https://www.embla-carousel.com", "Lightweight carousels with great swipe", [ANY, R, V, SV, SO], "Headless"],
    ["Swiper", "https://swiperjs.com", "Touch slider for web and mobile", [ANY, R, V, WC], "Headless"],
    ["Motion", "https://motion.dev", "Animation for React, JavaScript and Vue", [R, V, ANY], "Animation"],
    ["GSAP", "https://gsap.com", "Professional animation platform", [ANY], "Animation"],
    ["React Spring", "https://www.react-spring.dev", "Spring-physics animation", [R], "Animation"],
    ["Anime.js", "https://animejs.com", "Lightweight animation engine", [ANY], "Animation"],
    ["AutoAnimate", "https://auto-animate.formkit.com", "Drop-in list and layout animation", [ANY, R, V, SV, SO, NG], "Animation"],
    ["Lottie", "https://airbnb.io/lottie", "Render After Effects animations", [ANY], "Animation"],
    ["Rive", "https://rive.app", "Interactive vector animation and state machines", [ANY, R], "Animation"],
    ["Theatre.js", "https://www.theatrejs.com", "Motion design editor for the web", [ANY, R], "Animation"],
    ["Lenis", "https://lenis.darkroom.engineering", "Smooth scrolling", [ANY], "Animation"],
    ["Barba.js", "https://barba.js.org", "Seamless page transitions", [ANY], "Animation"],
    ["Swup", "https://swup.js.org", "Page transitions for server-rendered sites", [ANY], "Animation"],
    ["Lucide", "https://lucide.dev", "Clean, consistent open-source icons", [ANY, R, V, SV, SO, NG], "Icons"],
    ["Phosphor", "https://phosphoricons.com", "Flexible icon family in six weights", [ANY, R, V], "Icons"],
    ["Heroicons", "https://heroicons.com", "Icons from the makers of Tailwind", [ANY, R, V], "Icons"],
    ["Tabler Icons", "https://tabler.io/icons", "Thousands of open-source icons", [ANY, R, V, SV], "Icons"],
    ["Radix Icons", "https://www.radix-ui.com/icons", "Crisp 15px icons", [ANY, R], "Icons"],
    ["Remix Icon", "https://remixicon.com", "Neutral open-source icons", [ANY, R, V], "Icons"],
    ["Material Symbols", "https://fonts.google.com/icons", "Google's variable icon font", [ANY], "Icons"],
    ["Iconify", "https://iconify.design", "One API for 200,000+ icons", [ANY, R, V, SV, SO], "Icons"],
    ["Recharts", "https://recharts.org", "Composable charts for React", [R], "Charts"],
    ["visx", "https://airbnb.io/visx", "Low-level chart primitives for React", [R], "Charts"],
    ["Nivo", "https://nivo.rocks", "Rich, animated charts for React", [R], "Charts"],
    ["Tremor", "https://www.tremor.so", "Dashboard components and charts", [R], "Charts"],
    ["Chart.js", "https://www.chartjs.org", "Simple, flexible canvas charts", [ANY], "Charts"],
    ["Apache ECharts", "https://echarts.apache.org", "Powerful interactive charts", [ANY], "Charts"],
    ["D3", "https://d3js.org", "Data-driven documents, the foundation", [ANY], "Charts"],
    ["Observable Plot", "https://observablehq.com/plot", "Concise exploratory charts", [ANY], "Charts"],
    ["React Hook Form", "https://react-hook-form.com", "Performant forms with easy validation", [R], "Forms and data"],
    ["TanStack Form", "https://tanstack.com/form", "Type-safe forms for any framework", [R, V, SV, SO, NG], "Forms and data"],
    ["TanStack Table", "https://tanstack.com/table", "Headless tables and data grids", [R, V, SV, SO, NG], "Forms and data"],
    ["TanStack Query", "https://tanstack.com/query", "Server state, caching and fetching", [R, V, SV, SO, NG], "Forms and data"],
    ["AG Grid", "https://www.ag-grid.com", "Feature-rich data grid", [ANY, R, V, NG], "Forms and data"],
    ["Zod", "https://zod.dev", "Schema validation for TypeScript", [ANY], "Forms and data"],
    ["three.js", "https://threejs.org", "3D on the web", [ANY], "3D and canvas"],
    ["React Three Fiber", "https://r3f.docs.pmnd.rs", "React renderer for three.js", [R], "3D and canvas"],
    ["PixiJS", "https://pixijs.com", "Fast 2D WebGL rendering", [ANY], "3D and canvas"],
    ["p5.js", "https://p5js.org", "Creative coding", [ANY], "3D and canvas"],
    ["Matter.js", "https://brm.io/matter-js", "2D physics engine", [ANY], "3D and canvas"],
    ["Paper Shaders", "https://shaders.paper.design", "Ready-made WebGL shader effects", [ANY, R], "Effects", 1],
    ["Shaders", "https://shaders.com", "Composable WebGPU shader components", [R, V, SV, SO, ANY], "Effects"],
    ["React Bits", "https://reactbits.dev", "Animated components, text effects and backgrounds", [R], "Effects", 1],
    ["Canvas UI", "https://canvasui.dev/components", "Canvas-rendered components with WebGL effects over live HTML", [R, V, SV, SO, ANY], "Effects", 1],
    ["Vanta.js", "https://www.vantajs.com", "Animated 3D backgrounds in a few lines", [ANY], "Effects"],
    ["Unicorn Studio", "https://www.unicorn.studio", "No-code WebGL effects and scenes", [ANY], "Effects"],
    ["ShaderGradient", "https://shadergradient.co", "Moving 3D gradients", [R, ANY], "Effects"],
    ["Plasticity", "https://www.plasticity.xyz/product", "3D modeling for concept artists", [ANY], "3D assets", 1],
    ["Spline", "https://spline.design", "3D design tool with web embeds", [ANY, R], "3D assets"],
    ["Poly Haven", "https://polyhaven.com", "Free HDRIs, textures and models", [ANY], "3D assets"],
    ["Tailwind CSS", "https://tailwindcss.com", "Utility-first CSS", [ANY], "Styling"],
    ["UnoCSS", "https://unocss.dev", "Instant on-demand atomic CSS", [ANY], "Styling"],
    ["Panda CSS", "https://panda-css.com", "Build-time CSS-in-JS with tokens", [R, V, SV, SO], "Styling"],
    ["vanilla-extract", "https://vanilla-extract.style", "Type-safe, zero-runtime stylesheets", [ANY], "Styling"],
    ["Open Props", "https://open-props.style", "Ready-made CSS custom properties", [ANY], "Styling"],
    ["Radix Colors", "https://www.radix-ui.com/colors", "Accessible color scales", [ANY], "Styling"],
    ["Google Fonts", "https://fonts.google.com", "Free, open-source font library", [ANY], "Fonts"],
    ["Fontshare", "https://www.fontshare.com", "Free quality fonts from Indian Type Foundry", [ANY], "Fonts"],
    ["Uncut", "https://uncut.wtf", "Curated free typefaces", [ANY], "Fonts"],
  ].map(([name, url, desc, fw, cat, pick]) => ({ name, url, desc, fw, cat, pick: !!pick }));
  const FRAMEWORKS = [R, V, SV, NG, SO, WC, ANY];
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
    mode: "libraries", fw: "All", cat: "All", q: "", slot: "type", view: "components", layout: "hero", dark: false,
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
  // Color roles from the palette: background is the lightest (or darkest in dark mode), text the opposite,
  // the accent the chosen swatch, and surface, border and muted text mixed between them.
  function roles() {
    const cols = K.colors.slice(), byL = cols.slice().sort((a, b) => C.toOklch(a)[0] - C.toOklch(b)[0]);
    let bg = byL[byL.length - 1], text = byL[0];
    if (K.dark) [bg, text] = [text, bg];
    const accent = cols[clamp(K.accent, 0, cols.length - 1)];
    const onAccent = C.contrast(accent, "#ffffff") >= C.contrast(accent, "#111111") ? "#ffffff" : "#111111";
    return { bg, text, accent, onAccent, surface: C.mixOklab(bg, text, 0.035), border: C.mixOklab(bg, text, 0.13), muted: C.mixOklab(bg, text, 0.58), contrast: C.contrast(text, bg) };
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
  const COMPONENTS = `
    <div class="k-grid">
      <div class="k-card k-span2">
        <h2 class="k-h">Plan the launch</h2>
        <p class="k-p">Invite the team, set the date and share one page everyone works from.</p>
        <div class="k-row"><button class="k-btn">Get started</button><button class="k-btn k-sec">Preview</button><button class="k-btn k-ghost">Later</button></div>
      </div>
      <div class="k-card">
        <label class="k-label" for="k-email">Email</label>
        <input class="k-input" id="k-email" placeholder="you@studio.com">
        <label class="k-label" for="k-role">Role</label>
        <div class="k-select" id="k-role">Designer<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></div>
        <label class="k-check"><span class="k-box on"></span>Send me the weekly digest</label>
      </div>
      <div class="k-card">
        <div class="k-tabs"><span class="on">Overview</span><span>Activity</span><span>Files</span></div>
        <div class="k-row k-between"><span class="k-p">Notifications</span><span class="k-switch on"><i></i></span></div>
        <div class="k-row k-between"><span class="k-p">Auto-save</span><span class="k-switch"><i></i></span></div>
        <div class="k-row"><span class="k-badge">New</span><span class="k-badge k-soft">Draft</span><span class="k-badge k-line">Archived</span></div>
      </div>
      <div class="k-card">
        <div class="k-alert"><b>Saved</b><span>Your changes are live.</span></div>
        <div class="k-row k-people"><i></i><i></i><i></i><span class="k-p">Ada, Lin and 4 others</span></div>
        <div class="k-progress"><i></i></div>
      </div>
      <div class="k-card k-span2 k-table">
        <div class="k-tr k-th"><span>Project</span><span>Owner</span><span>Status</span></div>
        <div class="k-tr"><span>Website refresh</span><span>Ada</span><span class="k-badge k-soft">In review</span></div>
        <div class="k-tr"><span>Brand book</span><span>Lin</span><span class="k-badge">Live</span></div>
      </div>
    </div>`;
  const LAYOUTS = {
    hero: ["Hero", `<nav class="k-nav"><b>Northwind</b><span>Product</span><span>Pricing</span><span>Docs</span><button class="k-btn k-sm">Sign in</button></nav>
      <section class="k-hero"><div><h1 class="k-h1">Ship pages your team is proud of</h1><p class="k-lead">Plan, write and publish in one place, with review built in.</p><div class="k-row"><button class="k-btn">Start free</button><button class="k-btn k-ghost">Watch the tour</button></div></div><div class="k-shot"><i></i><i></i><i></i></div></section>`],
    centered: ["Centered", `<nav class="k-nav"><b>Northwind</b><span>Product</span><span>Pricing</span><span>Docs</span><button class="k-btn k-sm">Sign in</button></nav>
      <section class="k-center"><h1 class="k-h1">Every launch in one calm place</h1><p class="k-lead">Briefs, assets and approvals together, so nothing slips.</p><div class="k-row k-mid"><button class="k-btn">Start free</button><button class="k-btn k-sec">Book a demo</button></div><div class="k-shot k-wide"><i></i><i></i><i></i></div></section>`],
    features: ["Features", `<section class="k-center k-tight"><h2 class="k-h2">Built for small teams</h2></section>
      <section class="k-feats">${["Shared briefs", "Fast review", "One source of truth", "Version history", "Smart reminders", "Exports that work"].map((t, i) => `<div class="k-card"><span class="k-dot" style="--i:${i}"></span><h3 class="k-h3">${t}</h3><p class="k-p">Short, clear copy that says what this does and why it matters.</p></div>`).join("")}</section>`],
    pricing: ["Pricing", `<section class="k-center k-tight"><h2 class="k-h2">Simple pricing</h2></section>
      <section class="k-prices">${[["Starter", "0", ["3 projects", "Basic review"]], ["Team", "24", ["Unlimited projects", "Review and approvals", "Version history"]], ["Studio", "64", ["Everything in Team", "Roles and SSO", "Priority support"]]].map(([n, p, f], i) => `<div class="k-card${i === 1 ? " k-pop" : ""}"><h3 class="k-h3">${n}</h3><div class="k-price"><b>$${p}</b><span>per month</span></div>${f.map((x) => `<p class="k-p k-tick">${x}</p>`).join("")}<button class="k-btn${i === 1 ? "" : " k-sec"}">Choose ${n}</button></div>`).join("")}</section>`],
  };
  function previewHTML() { return K.view === "components" ? COMPONENTS : `<div class="k-page">${LAYOUTS[K.layout][1]}</div>`; }
  // Small preview for the home page card.
  function preview(el) {
    if (!el) return;
    el.innerHTML = `<div class="kit k-mini">${COMPONENTS}</div>`;
    vars(el.firstChild);
  }

  // ---------- libraries view ----------
  // Each library is a window onto its site: its OpenGraph banner, else a screenshot of the page, else a
  // pane drawn from its icon. Names, descriptions and framework lists of any length fit the same card.
  const hostOf = (u) => new URL(u).host.replace(/^www\./, "");
  const enc = encodeURIComponent;
  const shots = (l) => [`https://v1.opengraph.11ty.dev/${enc(l.url)}/small/`, `https://v1.screenshot.11ty.dev/${enc(l.url)}/opengraph/`];
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
    if (l && step < 2) { img.dataset.step = step; img.src = shots(l)[step]; } else img.remove();
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
    color: () => { const r = roles(); return [C.name(r.accent), `${K.colors.length} colors, ${r.contrast.toFixed(1)}:1 text`]; },
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
      row.innerHTML = K.colors.map((c, k) => `<div class="stop" data-k="${k}"><button class="sw" style="background:${c}" aria-label="Edit color ${k + 1}"></button>${K.colors.length > 2 ? `<button class="x" aria-label="Remove color">${ic("x")}</button>` : ""}<button class="cp-acc${K.accent === k ? " on" : ""}" data-acc="${k}">${K.accent === k ? "Accent" : "Use"}</button></div>`).join("") + (K.colors.length < 8 ? `<button class="stop-add" aria-label="Add color">${ic("plus")}</button>` : "");
      row.onclick = (e) => {
        const k = +e.target.closest("[data-k]")?.dataset.k;
        if (e.target.closest("[data-acc]")) { K.accent = +e.target.closest("[data-acc]").dataset.acc; changed(true); }
        else if (e.target.closest(".x")) { const st = e.target.closest(".stop"); const go = () => { K.colors.splice(k, 1); K.accent = clamp(K.accent, 0, K.colors.length - 1); changed(true); }; if (root.UI?.reduce.matches) go(); else st.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.6)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).onfinish = go; }
        else if (e.target.closest(".stop-add")) { K.colors.push(C.mixOklab(K.colors[K.colors.length - 1], K.colors[0], 0.5)); changed(true); $("cpOpts").querySelector(`.stop[data-k="${K.colors.length - 1}"]`)?.classList.add("fresh-stop"); }
        else if (e.target.closest(".sw")) { const sw = e.target.closest(".sw"); picker.open(sw, K.colors[k], (v) => { K.colors[k] = v; sw.style.background = v; changed(); paintContrast(); }, () => save(), [["Palette", K.colors]]); }
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
        g.onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; K.colors = list[+b.dataset.p][1].slice(0, 8); const ch = K.colors.map((c) => C.toOklch(c)[1]); K.accent = ch.indexOf(Math.max(...ch)); changed(true); };
        o.appendChild(g);
      }
      sub(o, "Mode");
      seg(o, [["0", "Light"], ["1", "Dark"]], () => (K.dark ? 1 : 0), (v) => { K.dark = !!v; paintContrast(); renderStageSegs(); });
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
    for (const [id, v] of [["cpView", K.view], ["cpLayout", K.layout], ["cpTheme", K.dark ? "dark" : "light"]]) for (const b of $(id).querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === v);
    $("cpLayout").hidden = K.view !== "landing";
  }
  function renderStage() {
    const kit = $("kit");
    kit.className = "kit" + (K.view === "landing" ? " k-landing" : "");
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
    let out = `# ${kind === "design" ? "Design brief" : "Build brief"}\n\nFollow these rules on every screen:\n${rules}\n\n## Type\n- Headings: ${t.font.heading}, weight ${t.font.headingWeight}, tracking ${t.font.tracking}em\n- Body: ${t.font.body}, ${t.size.base}px base, scale ratio ${K.scale}\n- Load from Google Fonts: ${fontsLink()}\n${own.length ? `- Self-hosted fonts (files supplied separately): ${[...new Set(own)].join(", ")}\n` : ""}\n## Color (${K.dark ? "dark" : "light"} mode)\n- Background ${named(r.bg)}, surface ${r.surface}, border ${r.border}\n- Text ${named(r.text)}, muted text ${r.muted}; text on background is ${r.contrast.toFixed(1)}:1\n- Accent ${named(r.accent)} with ${r.onAccent} text on it\n- Full palette: ${K.colors.join(", ")}\n\n## Shape and space\n- Spacing scale (px): ${Object.values(t.space).join(", ")}\n- Corner radius ${t.radius.base}px, buttons ${K.pill ? "fully rounded" : t.radius.base + "px"}\n- Elevation: ${K.elevation} (${t.shadow})\n\n## Motion\n- ${t.motion.duration}ms with ${t.motion.easing}\n- Vary timing slightly between elements and honor prefers-reduced-motion\n`;
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
