// Liquid glass for floating bars: an SVG displacement filter applied as a backdrop filter, so whatever is
// behind the bar bends at its rounded edges, as with the canvas liquid-glass effect. Chromium supports SVG
// filters in backdrop-filter; other browsers keep the frosted fallback from the stylesheet. The bar adds
// no color of its own, so its ink is set from what lies beneath (see --glass-ink).
(function (root) {
  "use strict";
  const ok = !!(navigator.userAgentData?.brands || []).some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand));
  const NS = "http://www.w3.org/2000/svg";
  let defs = null, n = 0;
  function host() {
    if (defs) return defs;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
    defs = document.createElementNS(NS, "defs"); svg.appendChild(defs); document.body.appendChild(svg);
    return defs;
  }
  // Displacement map: red and green hold the x and y push, 128 is none. Inside the bezel the push points
  // outward and grows toward the edge, so the bar samples what lies just beyond its rim.
  function map(w, h, r, bezel) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), img = x.createImageData(w, h), d = img.data;
    const hx = w / 2, hy = h / 2, sd = (px, py) => { const qx = Math.abs(px - hx) - (hx - r), qy = Math.abs(py - hy) - (hy - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const px = i + 0.5, py = j + 0.5, s = sd(px, py), k = (j * w + i) * 4;
      let rx = 128, gy = 128;
      if (s < 0 && s > -bezel) {
        const nx = sd(px + 1, py) - sd(px - 1, py), ny = sd(px, py + 1) - sd(px, py - 1), l = Math.hypot(nx, ny) || 1;
        const t = 1 + s / bezel, bend = t * t * t;
        rx = 128 + (nx / l) * bend * 127; gy = 128 + (ny / l) * bend * 127;
      }
      d[k] = rx; d[k + 1] = gy; d[k + 2] = 128; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // Encoded off the main thread, so a bar appearing (the first visit to a page) doesn't stall the switch.
    return new Promise((done) => c.toBlob((b) => done(b ? URL.createObjectURL(b) : c.toDataURL()), "image/png"));
  }
  // Bars of the same size share their map.
  const maps = new Map();
  const mapFor = (w, h, r, bezel) => { const k = [w, h, r, bezel].join(); if (!maps.has(k)) maps.set(k, map(w, h, r, bezel)); return maps.get(k); };
  function attach(el, { bezel = 14, scale = 38 } = {}) {
    if (!ok) return;
    const id = "glass-" + ++n;
    const f = document.createElementNS(NS, "filter");
    f.setAttribute("id", id); f.setAttribute("filterUnits", "userSpaceOnUse"); f.setAttribute("color-interpolation-filters", "sRGB");
    f.innerHTML = `<feImage result="map" preserveAspectRatio="none"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="soft"/><feDisplacementMap in="soft" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
    host().appendChild(f);
    let key = "";
    const fit = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || key === w + "x" + h) return;
      key = w + "x" + h;
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 14;
      for (const a of ["x", "y"]) f.setAttribute(a, "0");
      f.setAttribute("width", w); f.setAttribute("height", h);
      const im = f.querySelector("feImage"), want = key;
      im.setAttribute("width", w); im.setAttribute("height", h);
      mapFor(w, h, Math.min(r, h / 2), Math.min(bezel, h / 2)).then((url) => { if (key === want) im.setAttribute("href", url); });
      // Refraction with no saturation boost. A frosted bar (data-frost, in px) blurs first so the rim
      // still bends the frosted image; otherwise just enough blur to soften the bent pixels.
      const frost = parseFloat(el.dataset.frost) || 0;
      el.style.backdropFilter = el.style.webkitBackdropFilter = frost ? `blur(${frost}px) url(#${id})` : `url(#${id}) blur(0.6px)`;
      el.classList.add("glass-live");
    };
    // A resize redraws the map once things settle, rather than inside the frame that resized the bar.
    const idle = root.requestIdleCallback || ((f) => setTimeout(f, 50));
    let pend = 0;
    new ResizeObserver(() => { if (!pend) pend = idle(() => { pend = 0; fit(); }, { timeout: 400 }); }).observe(el);
    fit();
  }
  root.Glass = { attach, supported: ok };
  addEventListener("DOMContentLoaded", () => document.querySelectorAll(".glass").forEach((el) => attach(el)));
  if (document.readyState !== "loading") document.querySelectorAll(".glass").forEach((el) => attach(el));
})(window);
