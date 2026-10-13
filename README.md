# Topographic

Topographic line patterns for Figma. Static site: open `index.html` or serve the folder (`python3 -m http.server`).

- **Patterns:** Blobs, Terrain, Flow, Rings, Ridges, Dunes, Lines, Strata, Waves
- **Looks:** Soft, Bold, Orbit, Night, Stripes, Strata, Swell, Spectrum
- **Points:** double-click the canvas to add a peak, drag to move, scroll or drag the handle to resize, double-click a point to turn it into a dip. Points shape every pattern; Blobs and Rings are built from them.
- **Lines:** count or pixel gap, bias, weight up to 40px, swell, taper, accent lines, smoothing, grid precision, cleanup
- **Randomize:** `R` new seed, `⇧R` everything, plus a dice on every control and section
- **Export:** SVG or PNG (1–4×) with file size, or `C` to copy SVG and paste into Figma
- `⌘Z` / `⇧⌘Z` undo and redo

`logos.html` shows the logo concepts. Files: `engine.js` (field, contours, smoothing, SVG; no DOM), `brand.js` (logo concepts), `app.js` (UI).
