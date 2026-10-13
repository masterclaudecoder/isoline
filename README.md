# Isoline

Topographic patterns, gradients and effects for Figma. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

## How it works
The left column is the build, made of one slot per layer: **Preset → Generator → Shape → Lines → Colors → Effects**. Click a slot to open its options in the middle column; every choice there has a live preview of your current design. Effects stack: `+ Add effect` adds another, the count badge shows how many there are, drag the grip to reorder them, and × removes one.

## Generators
- **Contours** (vector, exports SVG): Blobs, Terrain, Flow, Rings, Ridges, Dunes, Lines, Strata, Waves. Scale, detail, warp, liquify, angle and metaball points. Double-click the canvas to add a peak, then drag to move it or scroll to resize it.
- **Mesh:** draggable color points blended in OKLab.
- **Flow:** domain-warped simplex noise for soft, flowing color fields (Caddis-style). Pair it with Grain.
- **Noise:** clouds, ridges, billow, cells, veins and marble, with scale, detail, stretch, angle, warp and contrast.
- **Linear, Radial, Conic** gradients.

## Lines (contours only)
Lines (strokes), Bands (filled stripes, PewDiePie-style) or Layers (stacked fills). Count or gap, bias, weight, swell, taper, accent lines, smoothing and cleanup.

## Effects (WebGL2, run top to bottom)
- **Distort:** liquify, waves, twirl, kaleidoscope
- **Glass:** fluted glass (lens ribs with frost and a soft light, no gloss), glass blocks (refracting tiles with frost and seams), liquid glass
- **Light:** progressive blur, glow, relief, vignette
- **Color:** gradient map, posterize
- **Print:** halftone, engrave, risograph, dither
- **Stylize:** pixels, crystallize, ASCII, scanlines, chromatic
- **Texture:** film grain

## Workflow
- **Variation** (`R`): new seed and small nudges, keeping the look.
- **Surprise me** (`⇧R`): a curated preset, varied, with a crossfade.
- A dice in each panel randomizes just that layer.
- **Safe values** (in settings): keeps everything in ranges that render cleanly. **Unlock values** lets you type past slider limits; it asks you to confirm first.
- Click any value to type it. Settings import and export as JSON. `⌘Z` / `⇧⌘Z` undo and redo.
- **Export:** SVG for contours, PNG 1–4× for everything, or `C` to copy for Figma.

Files: `engine.js` (contour field, marching squares, smoothing, SVG; no DOM), `fx.js` (WebGL2 generators and effects), `brand.js` (logo), `app.js` (UI). `logos.html` shows the logo concepts.
