# Isoline

Topographic patterns, palettes and design tokens. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

Live at **https://masterclaudecoder.github.io/isoline/**. Every push to the main branch deploys it through GitHub Actions (`.github/workflows/pages.yml`). The workflow also captures previews for new libraries and commits them to `previews/`. Pages has to be switched on once in the repository settings (Settings, Pages, Source: GitHub Actions).

## Pages
The home page (`#/`) shows three tools as large cards. Moving between pages is a seamless transition: the top bar stays put, pages crossfade, a tool's preview morphs into the tool, and floating bars pull up from the bottom once their page lands.
- **Studio** (`#/studio`): the pattern, gradient, effects and motion editor described below. An orange button pinned to the foot of each panel moves on to the next step.
- **Palettes** (`#/palettes`):
  - Space generates new colors for every unlocked column, using OKLCH harmonies (auto, analogous, monochrome, complement, triad, split, pastel, vivid, earthy).
  - New colors sweep across the columns as a wave, with the hex codes rolling through the in-between values.
  - The harmony button shows the chosen harmony as color dots. Its menu lists every harmony with a sample drawn from your palette's hue, and a tooltip says what each one does.
  - V (Vary) nudges colors instead of replacing them, and the proportions toggle sizes the columns 60-30-10.
  - Columns show their nearest name and contrast, and can be locked, edited, shaded, added or removed. Drag a grip to reorder: the column follows the pointer and the others slide aside. New columns grow in, removed ones fold away, and sorting or undo glides each color to its new place.
  - Export copies hex codes, CSS variables, JSON or a share link (`#/palettes/2f6fdb-...`), or downloads a PNG. **Use in Studio** applies the palette there.
  - The bar is smoked, frosted glass with white text, so it stays legible over any color. In Chromium browsers its rim also bends what's behind it.
- **Components** (`#/components`) has two modes:
  - **Libraries:** a directory of about 120 UI, headless, animation, effects, icon, chart, form, 3D, styling and font libraries, filterable by framework, category and search. Each card is a window onto the site. At deploy time `tools/previews.mjs` saves each library's own OpenGraph banner, or a screenshot of its page when it has none, into `previews/` (kept in the repository). Copies without those files (like the single-file build) fall back to the [11ty OpenGraph image service](https://www.11ty.dev/docs/services/opengraph/), then to a pane drawn from the site's icon. Picks come first, then one section per category.
  - **Builder:** design tokens for type, color, spacing, radius, elevation and motion, plus editable design rules. Fonts are picked from searchable menus that show each font in its own face, group a catalog by kind and suggest what pairs with the other font. You can also type any Google or installed font, or upload your own files. The preview is a made-up document review product, so every component shows real content: a comment thread, a command menu, a form, a documents table, a chart titled by what it says, notices and controls. Four pages are each built for one task: a home page led by a picture of the product, an article, an app settings page and a pricing comparison. They avoid template tells (no badge over the headline, no invented stats, logo strips or icon tiles, one picture per idea). The preview is a page of a real size: it fits the window by default, takes any size preset from the same size control as the Studio, or resizes by dragging its edges, and every page adapts from a phone to a wide display. Colors start from Isoline's own, the palette tool or a saved palette, mapped to page, surface, text and accent roles with a neutral, tinted or bold strength, and Edit in Palettes round-trips them. Artwork can bring in the Studio's current design behind the product picture and as the article cover. Motion covers duration, easing, and how things appear and disappear with a stagger, replayable on the preview. Until you change a color, the kit wears Isoline's own colors and follows the app's theme and accent, and the home page card shows the hero landing. Export copies CSS variables, a Tailwind v4 theme, JSON tokens, or a design or build brief for AI agents.

## Agents
**Copy for agents** in the top bar copies the agent guide. Page briefs with values and settings come from `Isoline.brief()` and from Export in Components. Agents can drive the whole app through `window.Isoline`: `studio`, `palettes`, `components`, `color`, `go` and `guide()`. The guide is also embedded in the page as `#isoline-agent-guide`.

## Interface
Everything animates: menus, popovers and dialogs fade in and out, rows and sections fold open and closed, segmented controls slide their selection, lists glide when they reorder, and theme changes crossfade. Every surface shares one hover. Tooltips are custom and appear after a short pause.

## How it works
The left column is the build, made of one slot per layer: **Preset, Generator, Shape, Lines, Colors, Effects, Motion**. Click a slot to open its options in the middle column; every choice there has a live preview of your current design. The Motion tile plays a small loop of your design when motion is on. Effects stack: `+ Add effect` adds another, the count badge shows how many there are, drag the grip to reorder them, and × removes one.

## Generators
- **Canvas:** drag the handles that appear near the canvas edges to resize it. Your colors overlap when they run out of room, wrap only when they truly don't fit, and drag to reorder. Edit in Palettes opens them in the palette tool, and its button brings them back.
- **Feedback:** Settings, Send feedback opens a filled-in GitHub issue (with optional page details) for you to post. To file issues straight from the app instead, deploy the small worker in `worker/` and set `FEEDBACK_URL` in `app.js`. It keeps the GitHub token on the server.
- **Contours** (vector, exports SVG; coming from a gradient, they start as bands in its colors): Blobs, Terrain, Flow, Rings, Ridges, Dunes, Lines, Strata, Waves. Scale, detail, warp, liquify, angle and metaball points. Double-click the canvas to add a peak, then drag to move it or scroll to resize it.
- **Mesh:** draggable color points blended in OKLab.
- **Flow:** domain-warped simplex noise for soft, flowing color fields. Pair it with Grain.
- **Noise:** clouds, ridges, billow, cells, veins, marble, neuro and smoke ring, with scale, detail, stretch, angle, warp and contrast.
- **Linear, Radial, Conic** gradients.

## Colors
**Your colors** come first: a background plus up to six inks for contours, or up to eight stops for gradients. With more than two inks, plain contours cycle through them level by level, and blended or layered contours run a smooth ramp through them. Below that are palette tabs: Suggested (harmonies from your strongest color, plus the closest library palette), Curated, Brands, and Saved. Every palette card is resampled to your number of colors and applies at that count.

The color picker has two modes: a color field, or sliders for the chosen format (HEX, RGB, HSL, HSB, OKLCH). Move toward its top-right corner to switch modes. It shows the nearest color name, from the "best of" list of [color-name-list](https://github.com/meodai/color-name-list) (MIT). You can paste any of those formats into its fields. Print inks only appear when an ink-only print effect is in the stack.

## Motion
The Motion slot makes the design loop seamlessly:
- **Drift:** the field glides round a circle.
- **Flow:** contour lines flow outward, or a gradient's colors sway.
- **Breathe:** the shape keeps morphing along a closed path through the noise, so it never visibly reverses and flows back into where it started.

Each motion has a loop length, amplitude and seed, plus loop, ping-pong or once playback, forward or reverse, and easing. The easing is a preset or a custom cubic bezier you drag. Effects with randomness have their own seed. Play previews the loop on the canvas. Playback draws contours at the size they appear on screen, and if it still runs slow the preview gets lighter once and a note offers to remove effects or stop motion. Exports always render every frame at full quality. Video is a format in the Export menu, alongside SVG and PNG, and every export shows its progress. **Export MP4** renders every frame at an exact timestamp using the browser's video encoder (H.264, or VP9 where H.264 isn't available) and [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Browsers without WebCodecs record a WebM in real time.

## Lines (contours only)
Lines (strokes), Bands (filled stripes, PewDiePie-style) or Layers (stacked fills). Count or gap, bias, weight, swell, taper, accent lines, smoothing and cleanup.

## Effects (WebGL2, run top to bottom)
- **Distort:** liquify, waves, twirl, bulge, ripples, water (with caustics), kaleidoscope
- **Glass** (iOS-style bezel refraction, frost, hairline highlights and slight dispersion, with rounded glass blocks): fluted glass, glass blocks, liquid glass
- **Light:** progressive blur, glow, relief, god rays, vignette
- **Color:** gradient map, posterize, heatmap, liquid metal
- **Print:** halftone, CMYK halftone, engrave, risograph, dither
- **Stylize:** pixels, crystallize, ASCII, scanlines, chromatic
- **Texture:** paper, film grain

## Workflow
- The bar under the canvas holds undo, redo, **Variation** (`R`: new seed and small nudges, same look) and **Surprise** (`⇧R`). Half the time Surprise applies a whole preset. Otherwise it takes one preset's shape and lines with a random palette, and another preset's effects or none. It always crossfades.
- A dice in each panel randomizes just that layer.
- Motion closes the build list as a wide tile playing the loop.
- **Safe values** (in settings): keeps everything in ranges that render cleanly. **Unlock values** lets you type past slider limits, after you confirm.
- Click any value to type it. Settings import and export as JSON. `⌘Z` / `⇧⌘Z` undo and redo.
- **Export:** SVG for contours, PNG 1–4× for everything, MP4 or GIF for motion, or `C` to copy for Figma.
- **Theme:** Auto, light or dark, plus an accent color, in settings.
- **Version:** the bottom of settings shows the version and build date. Each deploy stamps a build id and busts the cache, and the app checks for a newer build when you come back to the tab.
- **Builder motion:** appear and disappear play on load or on scroll. On scroll, the CSS export runs the same keyframes on a scroll timeline.

Files:
- `engine.js`: contour field, marching squares, smoothing and SVG output, with no DOM.
- `fx.js`: WebGL2 generators and effects.
- `color.js`: color conversions, parsing, names and contrast.
- `picker.js`: the color picker.
- `colornames.js`: color name data.
- `app.js`: the studio.
- `palette.js`: the palette tool.
- `shell.js`: pages and transitions.
- `components.js`: the library directory and token builder.
- `libs.js`: the library list.
- `tools/previews.mjs`: captures library preview images (run by the Pages workflow).
- `agent.js`: the agent API and briefs.
- `glass.js`: liquid glass bars.
- `brand.js`: the logo.
- `ui.js`: shared interface motion (tooltips, sliding segmented controls, list transitions).
- `mp4-muxer.js`: vendored MP4 muxer.
- `worker/feedback.js`: optional Cloudflare Worker that files feedback as GitHub issues.
- `og.jpg`, `favicon.svg`: the link preview banner and tab icon.

`logos.html` shows the logo concepts.
