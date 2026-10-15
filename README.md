# Isoline

Topographic patterns, palettes and design tokens. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

Live at **https://masterclaudecoder.github.io/isoline/**. Every push to the main branch deploys it through GitHub Actions (`.github/workflows/pages.yml`). The workflow also captures previews for new libraries and commits them to `previews/`. Pages has to be switched on once in the repository settings (Settings, Pages, Source: GitHub Actions).

## Pages
The home page (`#/`) shows three tools as large cards. Moving between pages is one continuous transition: the top bar stays put, pages crossfade, a tool's preview morphs into the tool (each stripe of the home palette travels and stretches into its own column), and floating bars pull up from the bottom once their page lands.
- **Studio** (`#/studio`): the pattern, gradient, effects and motion editor described below. An orange button pinned to the foot of each panel moves on to the next step.
- **Palettes** (`#/palettes`):
  - Space generates new colors for every unlocked column, using OKLCH harmonies (auto, analogous, monochrome, complement, triad, split, pastel, vivid, earthy).
  - New colors sweep across the columns as a wave, with the hex codes rolling through the in-between values.
  - The harmony button shows the chosen harmony as color dots. Its menu lists every harmony with a sample drawn from your palette's hue, and a tooltip says what each one does.
  - V (Vary) nudges colors instead of replacing them, and the proportions toggle sizes the columns 60-30-10.
  - Columns show their nearest name and contrast, and can be locked, edited, shaded, added or removed. Drag a grip to reorder: the column follows the pointer and the others slide aside. New columns grow in, removed ones fold away, and sorting or undo glides each color to its new place.
  - Export copies hex codes, CSS variables, JSON or a share link (`#/palettes/2f6fdb-...`), or downloads a PNG. **Use in Studio** applies the palette there, and its arrow offers **Use in Builder**.
  - The bar is smoked, frosted glass with white text, so it stays legible over any color. In Chromium browsers its rim also bends what's behind it.
- **Components** (`#/components`) has two modes:
  - **Libraries:** a directory of about 120 UI, headless, animation, effects, icon, chart, form, 3D, styling and font libraries, filterable by framework, category and search. Each card is a window onto the site. At deploy time `tools/previews.mjs` saves each library's own OpenGraph banner, or a screenshot of its page when it has none, into `previews/` (kept in the repository). Copies without those files (like the single-file build) fall back to the [11ty OpenGraph image service](https://www.11ty.dev/docs/services/opengraph/), then to a pane drawn from the site's icon. Picks come first, then one section per category.
  - **Builder:** design tokens for type, color, spacing, radius, elevation and motion, plus editable design rules. Each token tile rests on its value; hovering plays it as set, then less, then more. Fonts are picked from searchable menus that show each font in its own face, group a catalog by kind and suggest what pairs with the other font. You can also type any Google or installed font, or upload your own files. The preview is a made-up document review product, so every component shows real content: a comment thread, a command menu, a form, a documents table, a chart titled by what it says, notices and controls. Four pages are each built for one task: a home page led by a picture of the product, an article, an app settings page and a pricing comparison. They avoid template tells (no badge over the headline, no invented stats, logo strips or icon tiles, one picture per idea). The preview is a page of a real size: it fits the window by default, takes any size preset from the same size control as the Studio, or resizes by dragging its edges, and every page adapts from a phone to a wide display. Colors start from Isoline's own, the palette tool or a saved palette, mapped to page, surface, text and accent roles with a neutral, tinted or bold strength, and Edit in Palettes round-trips them. Artwork can bring in the Studio's current design behind the product picture and as the article cover. Motion covers duration, easing, and how things appear and disappear with a stagger, replayable on the preview. Until you change a color, the kit wears Isoline's own colors and follows the app's theme and accent, and the home page card shows the hero landing. Export copies CSS variables, a Tailwind v4 theme, JSON tokens, or a design or build brief for AI agents.

## Agents
**Copy for agents** in the top bar copies the agent guide. Page briefs with values and settings come from `Isoline.brief()` and from Export in Components. Agents can drive the whole app through `window.Isoline`: `studio`, `palettes`, `components`, `color`, `go` and `guide()`. The guide is also embedded in the page as `#isoline-agent-guide`.

## Interface
Everything animates: menus, popovers and dialogs fade in and out, rows and sections fold open and closed, segmented controls slide their selection, lists glide when they reorder, and theme changes crossfade. Every surface shares one hover. Tooltips are custom and appear after a short pause. In the studio, the canvas bar can fold the side columns away (as in the builder) or show the canvas full screen (`F`, `Esc` to leave).

## How it works
The left column is the build, made of one slot per layer: **Preset, Generator, Shape, Lines, Colors, Objects, Effects, Motion**. Click a slot to open its options in the middle column. On narrow screens, two or more effects or objects fold into a deck of cards; tap it to spread them out and reorder. every choice there has a live preview of your current design. Options are grouped into collapsible sections that remember whether you left them open, and a closed group shows a short summary of its values. Groups and settings explain themselves on hover, and shape, line and gradient settings also play a short loop of your design swept from low to high. Settings a generator ignores are hidden or dimmed with the reason. The Motion tile plays a small loop of your design when motion is on. Effects stack: `+ Add effect` adds another, the count badge shows how many there are, drag the grip to reorder them, and × removes one.

## Generators
- **Canvas:** drag the handles that appear near the canvas edges to resize it. Your colors overlap when they run out of room, wrap only when they truly don't fit, and drag to reorder. Edit in Palettes opens them in the palette tool, and its button brings them back.
- **Feedback:** Settings, Send feedback opens a filled-in GitHub issue (with optional page details) for you to post. To file issues straight from the app instead, deploy the small worker in `worker/` and set `FEEDBACK_URL` in `app.js`. It keeps the GitHub token on the server.
- **Contours** (vector, exports SVG; coming from a gradient, they start as bands in its colors): Blobs, Terrain, Flow, Rings, Ridges, Dunes, Lines, Strata, Waves. Scale, detail, warp, liquify, angle and metaball points. Double-click the canvas to add a peak, then drag to move it or scroll to resize it.
- **Mesh:** draggable color points blended in OKLab.
- **Flow:** domain-warped simplex noise for soft, flowing color fields. Pair it with Grain.
- **Noise:** clouds, ridges, billow, cells, veins, marble, neuro, smoke ring and smoke (curling veils, made to sit under the glyph field), with scale, detail, stretch, angle, warp and contrast. A setting a noise type ignores stays in place, dimmed, with a tooltip saying so.
- **Aura:** after the reactive background of Yandex Music's My Wave. Two to four soft blobs of color are stacked over your darkest color, each smaller, lighter and a little off-center from the one behind it, their outlines bulging and folding as they morph out of step with each other. Light streams out from the back blob in soft rays, and an optional faint outline traces each blob. Size, wobble, edge, layers, rays, outline and color turn.
- **Wave:** after Framer's Wave Gradient shader, the background of caddis.app. Four colors in two soft crossing blends are read through a field a sine wave twists, so broad ribbons of color fold through each other. Angle, frequency, ripples, twist, softness and blend; moving, the wave travels a whole number of periods per loop. The Caddis preset uses the settings and colors caddis.app does.
- **Linear, Radial, Conic** gradients.
- **Image:** your own picture, filling the canvas, as a base for effects. It is kept in the browser outside the design state (one at a time), so undo history and saved settings stay small.

## Objects
Objects sit on top of any generator. Add up to eight: a sphere, torus, cube, capsule, blob, pyramid or diamond, raymarched and lit from the upper left, or a picture card. Each sits under the effects (they apply to it) or over them, and drag their grips to change which draws on top. Each has its own material:
- **Shaded:** lit through your colors.
- **Design:** wraps your current design round the shape, so it inherits the generator, lines and colors.
- **Preset:** wraps a preset round it, projected from three sides so there's no seam (faceted forms take one projection per face, so nothing doubles up).
- **Glass:** bends what's behind it most at the edges, like a liquid glass pill, with refraction, frost, dispersion, rim light and a tint.
- **Vantablack:** flat black that swallows the light, with a hairline of sheen on the rim, like the black shapes in Alfa-Bank's ads. Picture cards take it too, as plain black cards.
- Pictures show as a photo or recolored through your palette.

Drag an object on the canvas to move it, its corner to resize and its top handle to rotate (hold Shift to snap). Placement, orientation (tilt and spin) and surface (shine, ripple, rounding, shadow) are in its panel, along with duplicate and remove. Drift turns objects, Flow bobs them and Pulse beats them. Each object can stay still, or follow the loop at its own pace, from 5 times slower in reverse to 5 times faster (whole steps, so it still loops). Designs made with the old 3D shape generator open as a gradient with the same shape as an object.

## Colors
**Your colors** come first: a background plus up to six inks for contours, or up to eight stops for gradients. With more than two inks, plain contours cycle through them level by level, and blended or layered contours run a smooth ramp through them. Below that are palette tabs: Suggested (harmonies from your strongest color, plus the closest library palette), Curated, Brands (including Russian ones: Yandex Neo, the My Wave glow; Yandex; Yandex Intel, the Alice AI violet; Alfa, Sber, VTB, T-Bank, Ozon, Wildberries, MTS, VK, Avito, MegaFon, Kaspersky), and Saved (from the palette tool). Colors that match a library palette show its name. Pages of nine cards turn from the pager underneath. Every palette card is resampled to your number of colors and applies at that count.

The color picker has two modes: a color field, or sliders for the chosen format (HEX, RGB, HSL, HSB, OKLCH). Move toward its top-right corner to switch modes. It shows the nearest color name, from the "best of" list of [color-name-list](https://github.com/meodai/color-name-list) (MIT). You can paste any of those formats into its fields. Print inks only appear when an ink-only print effect is in the stack.

## Motion
The Motion slot makes the design loop without a visible seam:
Contour levels are spread over a range sampled from the canvas plus a wide margin and, for Flow and Pulse, from points all round the loop. A peak growing or crossing the edge never re-spaces the whole map, and the still frame matches the playing ones. Breathe slides the levels, and each band keeps its color as it travels.
- **Drift:** the field glides round a circle; on Mesh, each color point wanders its own loop.
- **Flow:** the shape keeps morphing along a closed path through the noise at an even pace, so it never visibly reverses or hurries, and flows back into where it started. Linear, radial and conic blends stream instead: their colors run along the blend without end, so radial rings keep moving outward.
- **Breathe:** contour lines swell outward. Blends sway their colors in and out, and mesh, flow and noise fields swell gently from the middle.
- **Pulse:** four soft beats per loop push the field out from the center while it morphs a little.
- **Endless (Flow only):** the morph follows a path built from turns at irrational rates, slower than the main one so the pace never stalls, so it never closes and never repeats. Time runs on unbounded in the preview and through the whole length of an export, eased once per loop length by the easing curve. It doesn't loop, so only Once playback is offered while it's on.
- **Unbound (with Endless):** the path also travels steadily on through the pattern, faster than it circles, so the morph never even revisits similar shapes.

Hovering a motion type plays it on your own design in the tooltip, and hovering a playback, direction or easing shows its timing as a moving dot. Editing while it plays pauses the loop, lets the edit land, then crossfades the loop back in from its start.

Each motion has a loop length, amplitude and seed, plus loop, ping-pong or once playback, forward or reverse, and easing. The easing is a preset or a custom cubic bezier you drag. Effects with randomness have their own seed. Play previews the loop on the canvas. Playback draws contours at the size they appear on screen. Frames are timed by how long the GPU takes to draw them, so a background tab or a pause never counts as slow. If they really are slow the preview gets lighter twice, then a note offers to remove effects or stop motion, once per visit. Exports always render every frame at full quality. Video is a format in the Export menu, alongside SVG and PNG, and every export shows its progress. **Export MP4** renders every frame at an exact timestamp using the browser's video encoder (H.264, or VP9 where H.264 isn't available) and [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Browsers without WebCodecs record a WebM in real time. GIF export has an **Animated WebP** switch: every frame keeps its full color with no palette banding, usually in a smaller file. It shows wherever the browser can encode WebP.

## Lines (contours only)
Contours draw on the GPU while previewing and playing, so dense bands stay smooth in motion. While drifting, the grid snaps to whole cells of the field and the levels come from the whole area the loop travels over, so lines glide instead of shivering. Exports still use the vector path where it applies.

Lines (strokes), Bands (filled stripes, PewDiePie-style), Layers (stacked fills) or Gradient (bands shaded through the inks on either side of them). Count or gap, bias, weight, swell, taper, accent lines, smoothing and cleanup.

## Effects (WebGL2, run top to bottom)
- **Distort:** liquify, waves, twirl, bulge, ripples (optionally animated, rings travelling outward a whole number of times per loop), water (looking down through a moving, sunlit surface, computed exactly from its waves so it stays light: swells and chop bend what's beneath, light focused by those same waves slides over the floor, so it never repeats, and an optional depth tint; every wave moves a whole number of turns per loop), caustic web (the bright cell-edge web that used to be water, optionally animated), kaleidoscope
- **Glass** (iOS-style bezel refraction, frost, hairline highlights and slight dispersion, with rounded glass blocks): fluted glass, glass blocks, liquid glass
- **Light:** progressive blur, glow, relief, god rays, vignette
- **Color:** gradient map, posterize, heatmap, liquid metal (lit from a smoothed height map, so edges stay clean)
- **Print:** halftone and CMYK halftone (circle, square, triangle or star dots, each sized to lay down the same ink for the same tone and free to spill into the next cell instead of being cropped), engrave, risograph, dither
- **Stylize:** pixels, crystallize, ASCII, glyph field (a random character in every cell, its opacity following the brightness underneath, optionally reshuffling a whole number of times per loop), scanlines, chromatic. ASCII and the glyph field draw in Geist Mono, the interface font or the system monospace
- **Texture:** paper, film grain (optionally animated, a fresh pattern every frame)
- **Interactive:** click ripples (rings spread from where you click and die away) and drag trails, run on a real fluid simulation (stable fluids with vorticity): Fluid carries the picture along with the flow like paint and lets it settle back, Smoke leaves curling smoke without touching the picture. Trails have no length limit and fade by their life. They answer the pointer on the canvas and in HTML exports, and their tiles show a click and a drag frozen part-way

## Workflow
- The bar under the canvas holds undo, redo, **Variation** (`R`: new seed and small nudges, same look) and **Surprise** (`⇧R`). Surprise mixes recipes: a whole preset, a preset's shape in a random palette with another preset's effects, or a look built from scratch on any generator, now and then with an object or two on top. It always crossfades.
- **Notifications** stack in the bottom right (along the bottom on phones), pause while hovered, and carry an Undo where one helps.
- **First load** waits for the fonts, then the page rises in, so nothing flashes or shifts.
- A dice in each panel randomizes just that layer.
- Motion closes the build list as a wide tile playing the loop.
- **Safe values** (in settings): keeps everything in ranges that render cleanly. **Unlock values** lets you type past slider limits, after you confirm.
- **Designs** (top bar, `⌘S`): save designs to this browser, as many separate ones as you like (**Save as new design** starts another). Each keeps its earlier versions too, up to 30. Open, rename or delete one (with undo). Import or export one design or all of them as JSON. Every file carries the app version it was saved with, so files from an older or newer Isoline say what may look different before they open. **Copy link** puts the whole design in the URL, to bookmark or send.
- Click any value to type it. Settings import and export as JSON. `⌘Z` / `⇧⌘Z` undo and redo.
- **Export:** SVG for contours, PNG 1–4× for everything, MP4, GIF or animated WebP for motion, HTML (a standalone page that plays the design live, fills the window and answers clicks and drags), or `C` to copy for Figma.
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
- `tools/record.mjs`: records tooltip clips. It drives the real UI with a scripted pointer, draws a cursor that follows on a damped spring with click ripples, and writes animated WebP to `previews/tips/` and `tips.js`.
- `tips.js`: the recorded tooltip clips as data URLs.
- `agent.js`: the agent API and briefs.
- `glass.js`: liquid glass bars.
- `brand.js`: the logo.
- `ui.js`: shared interface motion (tooltips, sliding segmented controls, list transitions).
- `mp4-muxer.js`: vendored MP4 muxer.
- `worker/feedback.js`: optional Cloudflare Worker that files feedback as GitHub issues.
- `og.jpg`, `favicon.svg`: the link preview banner and tab icon.

`logos.html` shows the logo concepts.
