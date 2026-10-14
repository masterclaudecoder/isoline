// Agent support: a scripting API on window.Isoline for AI agents and automation, plus "For AI" briefs that
// describe whatever page is open, ready to paste into an assistant for design or development work.
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const C = root.Color;
  const named = (h) => `${h} (${C.name(h)})`;

  const GUIDE = `# Isoline agent guide

Isoline is a single-page app with three tools. Everything is scriptable from the browser console or an
automation tool through window.Isoline. Routes: #/ (home), #/studio, #/palettes, #/components.
A palette can be passed in the URL: #/palettes/2f6fdb-6a9f7a-d8a51f.

## Navigation
- Isoline.go("studio" | "palettes" | "components" | "home")

## Studio (topographic patterns, gradients, effects, motion)
- Isoline.studio.state() returns the full settings object
- Isoline.studio.apply(partial) merges settings and re-renders, e.g. apply({ pattern: "rings", mode: "bands", line: "#1b1b1b", bg: "#f1ede4" })
- Isoline.studio.presets() lists presets, and usePreset("Prism") applies one
- Isoline.studio.generators() and effects() list what exists, with defaults
- Isoline.studio.variation() and surprise() randomize within safe ranges
- Isoline.studio.svg() returns the vector SVG (contours without effects)
- await Isoline.studio.png(2) returns a PNG Blob
- Isoline.studio.describe() returns a plain-language description
Key settings: source ("contours" or "gradient"), pattern, mode ("lines", "bands", "layers", "shaded" for gradient bands), levels, gap, weight,
line, line2, mids (extra inks), bg, grad.type ("mesh", "flow", "noise", "linear", "radial", "conic"), grad.colors,
fx.<id>.on with fxOrder for the effect stack, motion { type, dur, amt, mode, dir, ease }.

## Palettes
- Isoline.palettes.get() returns the hex colors, and set(["#..."]) loads colors
- Isoline.palettes.generate(mode) makes new colors, modes() lists the harmonies
- Isoline.palettes.vary() nudges the unlocked colors, lock(index) keeps one
- Isoline.palettes.saved() lists saved palettes
- Isoline.color.name(hex), Isoline.color.contrast(a, b), Isoline.color.format(hex, "oklch")

## Components
- Isoline.components.tokens() returns type, color, spacing, radius, elevation and motion tokens
- Isoline.components.css() returns them as CSS variables
- Isoline.components.brief("design" | "dev") returns the brief with the design rules
- Isoline.components.libraries() lists the UI library directory with links

## Design rules
Follow the rules in Isoline.components.brief("design"). The user edits them in Components, Builder, Design rules.
`;

  function studioBrief(kind) {
    const S = root.Studio, st = S.state();
    let out = `# Studio ${kind === "design" ? "design brief" : "build handoff"}\n\n${S.describe()}\n`;
    if (kind === "design") out += `\nUse it as a background or texture. Export from the Export menu as SVG (contours without effects), PNG at 1 to 4 times size, or MP4 when motion is on.\n`;
    else out += `\n## Use in code\n- Export the asset and set it as a background: background: url(pattern.svg) center / cover
- SVG keeps contours sharp and small, PNG suits gradients and effects, MP4 carries motion\n- To recreate or tweak it, load these settings with Isoline.studio.apply(settings) or Settings, Import settings.\n\n## Settings\n\`\`\`json\n${JSON.stringify(st, null, 2)}\n\`\`\`\n`;
    return out;
  }
  function paletteBrief(kind) {
    const hexes = root.Palettes.colors(), byL = hexes.slice().sort((a, b) => C.toOklch(a)[0] - C.toOklch(b)[0]);
    const bg = byL[byL.length - 1], text = byL[0];
    let out = `# Palette ${kind === "design" ? "design brief" : "build handoff"}\n\n${hexes.map((h) => `- ${named(h)}`).join("\n")}\n\nSuggested roles: background ${bg}, text ${text} (${C.contrast(text, bg).toFixed(1)}:1). Check contrast before putting text on any other pair.\n`;
    if (kind === "dev") out += `\n\`\`\`css\n:root {\n${hexes.map((h, i) => `  --color-${i + 1}: ${h}; /* ${C.name(h)} */`).join("\n")}\n}\n\`\`\`\n`;
    return out;
  }
  function brief(kind) {
    const r = root.Shell?.route;
    if (r === "studio") return studioBrief(kind);
    if (r === "palettes") return paletteBrief(kind);
    if (r === "components") return root.Components.brief(kind);
    return GUIDE;
  }

  root.Isoline = {
    version: 1,
    guide: () => GUIDE,
    go: (r) => root.Shell.go(r),
    studio: root.Studio,
    palettes: { get: () => root.Palettes.colors(), set: (h) => root.Palettes.load(h), generate: (m) => root.Palettes.generate(m), vary: () => root.Palettes.vary(), lock: (i, on) => root.Palettes.lock(i, on), modes: () => root.Palettes.modes(), saved: () => root.Palettes.saved() },
    components: { tokens: () => root.Components.tokens(), css: () => root.Components.cssVars(), brief: (k) => root.Components.brief(k), libraries: () => root.Components.libraries() },
    color: C,
    brief,
  };
  // Machine-readable pointer for browsing agents that read the DOM rather than run scripts.
  const meta = document.createElement("script");
  meta.type = "text/markdown"; meta.id = "isoline-agent-guide"; meta.textContent = GUIDE;
  document.head.appendChild(meta);

  // "Copy for agents" in the top bar: one click copies the agent guide. It shares a well with the
  // settings button, drawn like the size control, so the right side reads as one group.
  function forAgents() { return GUIDE; }
  const wrap = document.createElement("button");
  wrap.className = "tb"; wrap.id = "aiSplit"; wrap.title = "Copies the agent guide";
  wrap.innerHTML = `<span class="tb-ic" aria-hidden="true"><svg class="ic"><use href="#i-copy"/></svg><svg class="ic"><use href="#i-check"/></svg></span><span class="tb-l">Copy for agents</span>`;
  const right = document.querySelector(".top-right"), group = document.createElement("div");
  group.className = "top-group";
  group.append(wrap, $settingsWrap());
  right.insertBefore(group, right.firstChild);
  function $settingsWrap() { return document.getElementById("settingsBtn").closest(".menu-wrap"); }
  let doneT = 0;
  wrap.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(forAgents());
      wrap.classList.add("done"); clearTimeout(doneT); doneT = setTimeout(() => wrap.classList.remove("done"), 1600);
      root.toastMsg?.("Copied for your agent");
    } catch (err) { root.toastMsg?.("Clipboard is blocked here"); }
  });
})(window);
