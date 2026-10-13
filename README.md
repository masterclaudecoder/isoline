# Isoline

Topographic patterns, gradients and effects for Figma. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

## Contours (vector, exports SVG)
- **Patterns:** Blobs, Terrain, Flow, Rings, Ridges, Dunes, Lines, Strata, Waves
- **Render modes:** Lines (strokes), Bands (filled stripes with a thickness %, like the PewDiePie banner), Layers (stacked tinted fills)
- **Shape:** scale, detail, warp, liquify (two-level domain warp), angle, bulges
- **Points:** double-click the canvas to add a peak, drag to move, scroll or drag the handle to resize, double-click to flip into a dip
- **Lines:** count or pixel gap, bias, weight, swell, taper, accent lines, smoothing, grid, cleanup

## Gradient (raster, exports PNG)
Mesh (drag color points on the canvas), linear, radial and conic, mixed in OKLab, with warp.

## Effects (WebGL2, apply to either source)
Liquify, fluted glass, glass grid, pixels (with bevel), halftone, ASCII / symbols, dither (Bayer 2/4/8), chromatic shift, grain.

## Workflow
- **Looks:** one-click presets in three groups: Lines, Fills, Effects
- **Randomize:** `R` new seed, `⇧R` everything, a dice on every control, section and effect
- **Safe values** (settings): keeps randomize in ranges that render cleanly. Off = full ranges.
- **Unlock values** (settings): type numbers past slider limits (asks first; extreme values can freeze the tab)
- **Settings import/export** as JSON
- **Exact values:** click any value to type it; ↑↓ nudge, ⇧ for ×10; hex fields for colors
- **Animation:** numeric changes morph; pattern/seed/size changes crossfade (off with reduced motion)
- **Export:** SVG for vector contours, PNG 1–4× for everything, or `C` to copy and paste into Figma
- `⌘Z` / `⇧⌘Z` undo and redo

Files: `engine.js` (contour field, marching squares, smoothing, SVG; no DOM), `fx.js` (WebGL2 gradient + effects), `brand.js` (logo concepts), `app.js` (UI). `logos.html` shows the logo concepts.
