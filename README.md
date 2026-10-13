# Isoline

Topographic patterns, gradients and effects for Figma. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

## Pages
The home page (`#/`) links to two tools. Moving between pages is a seamless transition: the top bar stays put, and each tool's preview morphs into the tool.
- **Studio** (`#/studio`): the pattern, gradient and effects editor described below.
- **Palettes** (`#/palettes`): a palette generator. Space generates new colors for every unlocked column, using OKLCH harmonies (auto, analogous, monochrome, complement, triad, split, pastel, vivid, earthy). Each column shows its nearest color name and its contrast. You can lock a column, edit it, pick a tint or shade, drag it to reorder, add one between or remove one. You can also sort by lightness and undo. Export copies hex codes, CSS variables, JSON or a share link (`#/palettes/2f6fdb-...`), or downloads a PNG. **Use in Studio** applies the palette to the studio. Saved palettes also appear under a Saved tab in the studio's Colors panel.

## How it works
The left column is the build, made of one slot per layer: **Preset → Generator → Shape → Lines → Colors → Effects**. Click a slot to open its options in the middle column; every choice there has a live preview of your current design. Effects stack: `+ Add effect` adds another, the count badge shows how many there are, drag the grip to reorder them, and × removes one.

## Generators
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
- **Breathe:** the warp swells and settles.

Play previews the loop on the canvas. **Export MP4** renders every frame at an exact timestamp using the browser's video encoder (H.264, or VP9 where H.264 isn't available) and [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Browsers without WebCodecs record a WebM in real time.

## Lines (contours only)
Lines (strokes), Bands (filled stripes, PewDiePie-style) or Layers (stacked fills). Count or gap, bias, weight, swell, taper, accent lines, smoothing and cleanup.

## Effects (WebGL2, run top to bottom)
- **Distort:** liquify, waves, twirl, bulge, ripples, water (with caustics), kaleidoscope
- **Glass** (glass blocks have a corner radius; iOS-style: bezel refraction, frost, hairline highlights, slight dispersion): fluted glass, glass blocks, liquid glass
- **Light:** progressive blur, glow, relief, god rays, vignette
- **Color:** gradient map, posterize, heatmap, liquid metal
- **Print:** halftone, CMYK halftone, engrave, risograph, dither
- **Stylize:** pixels, crystallize, ASCII, scanlines, chromatic
- **Texture:** paper, film grain

## Workflow
- The bar under the canvas holds undo, redo, **Variation** (`R`: new seed and small nudges, same look) and **Surprise** (`⇧R`: half the time a whole preset; otherwise one preset's shape and lines with a random palette and another preset's effects, or none; always varied, with a crossfade).
- A dice in each panel randomizes just that layer.
- **Safe values** (in settings): keeps everything in ranges that render cleanly. **Unlock values** lets you type past slider limits; it asks you to confirm first.
- Click any value to type it. Settings import and export as JSON. `⌘Z` / `⇧⌘Z` undo and redo.
- **Export:** SVG for contours, PNG 1–4× for everything, or `C` to copy for Figma.
- **Theme:** Auto, light or dark, plus an accent color, in settings.

Files:
- `engine.js`: contour field, marching squares, smoothing and SVG output, with no DOM.
- `fx.js`: WebGL2 generators and effects.
- `color.js`: color conversions, parsing, names and contrast.
- `picker.js`: the color picker.
- `colornames.js`: color name data.
- `app.js`: the studio.
- `palette.js`: the palette tool.
- `shell.js`: pages and transitions.
- `brand.js`: the logo.
- `mp4-muxer.js`: vendored MP4 muxer.

`logos.html` shows the logo concepts.
