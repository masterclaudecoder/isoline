(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HEX = /^#[0-9a-f]{6}$/i;
  const toHex2 = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rgbHex = (r, g, b) => "#" + toHex2(r) + toHex2(g) + toHex2(b);
  function parseHex(s) {
    let v = String(s).trim().replace(/^#?/, "#").toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + [...v.slice(1)].map((c) => c + c).join("");
    return HEX.test(v) ? v : null;
  }

  const hsvToHex = (h, s, v) => { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return rgbHex(f(5) * 255, f(3) * 255, f(1) * 255); };
  function hexToHsv(hex) {
    const [r, g, b] = rgbOf(hex).map((x) => x / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
  }
  const hslToHex = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255); };
  function hexToHsl(hex) {
    const [h, s, v] = hexToHsv(hex), l = v * (1 - s / 2);
    return [h, l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l];
  }

  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function toOklab(hex) {
    const [r, g, b] = rgbOf(hex).map((x) => toLin(x / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
  }
  const toOklch = (hex) => { const [L, a, b] = toOklab(hex); return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]; };
  function fromOklch(L, C, H) {
    L = clamp(L, 0, 1);
    const hr = (H * Math.PI) / 180;
    for (let c = Math.max(0, C); ; c = Math.max(0, c - 0.004)) {
      const a = c * Math.cos(hr), b = c * Math.sin(hr);
      const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), q = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
      const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q];
      if (c === 0 || rgb.every((v) => v > -0.0005 && v < 1.0005)) return rgbHex(...rgb.map((v) => toGam(clamp(v, 0, 1)) * 255));
    }
  }
  const fromOklab = ([l, a, b]) => fromOklch(l, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360);
  const mixOklab = (x, y, t) => { const A = toOklab(x), B = toOklab(y); return fromOklab(A.map((v, i) => v + (B[i] - v) * t)); };

  const r1 = (v) => Math.round(v), r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
  const FORMATS = {
    hex: { label: "HEX" },
    rgb: { label: "RGB", ch: [["R", 0, 255, 1], ["G", 0, 255, 1], ["B", 0, 255, 1]], get: rgbOf, set: (v) => rgbHex(...v), str: (v) => `rgb(${v.map(r1).join(", ")})` },
    hsl: { label: "HSL", ch: [["H", 0, 360, 1], ["S", 0, 100, 1], ["L", 0, 100, 1]], get: (h) => { const [a, b, c] = hexToHsl(h); return [a, b * 100, c * 100]; }, set: ([a, b, c]) => hslToHex(a % 360, b / 100, c / 100), str: (v) => `hsl(${r1(v[0])} ${r1(v[1])}% ${r1(v[2])}%)` },
    hsb: { label: "HSB", ch: [["H", 0, 360, 1], ["S", 0, 100, 1], ["B", 0, 100, 1]], get: (h) => { const [a, b, c] = hexToHsv(h); return [a, b * 100, c * 100]; }, set: ([a, b, c]) => hsvToHex(a % 360, b / 100, c / 100), str: (v) => `hsb(${r1(v[0])} ${r1(v[1])}% ${r1(v[2])}%)` },
    oklch: { label: "OKLCH", ch: [["L", 0, 100, 0.1], ["C", 0, 0.37, 0.001], ["H", 0, 360, 1]], get: (h) => { const [l, c, hh] = toOklch(h); return [l * 100, c, hh]; }, set: ([l, c, h]) => fromOklch(l / 100, c, h), str: (v) => `oklch(${r2(v[0])}% ${r3(v[1])} ${r1(v[2])})` },
  };
  const format = (hex, f) => (f === "hex" || !FORMATS[f] ? hex : FORMATS[f].str(FORMATS[f].get(hex)));
  function parse(str) {
    const s = String(str).trim().toLowerCase();
    const hex = parseHex(s);
    if (hex) return hex;
    const m = s.match(/^(rgb|hsl|hsb|hsv|oklch)a?\(([^)]*)\)$/);
    if (!m) return null;
    const nums = m[2].split(/[\s,/]+/).filter(Boolean).map((t) => ({ v: parseFloat(t), pct: t.endsWith("%") }));
    if (nums.length < 3 || nums.slice(0, 3).some((n) => !Number.isFinite(n.v))) return null;
    const [a, b, c] = nums;
    if (m[1] === "rgb") return rgbHex(...[a, b, c].map((n) => (n.pct ? n.v * 2.55 : n.v)));
    if (m[1] === "hsl") return hslToHex(((a.v % 360) + 360) % 360, b.v / 100, c.v / 100);
    if (m[1] === "hsb" || m[1] === "hsv") return hsvToHex(((a.v % 360) + 360) % 360, b.v / 100, c.v / 100);
    return fromOklch(a.pct || a.v > 1 ? a.v / 100 : a.v, b.pct ? (b.v / 100) * 0.4 : b.v, c.v);
  }

  let names = null;
  function name(hex) {
    if (!root.COLOR_NAMES) return "";
    if (!names) names = root.COLOR_NAMES.split("\n").map((row) => ({ lab: toOklab("#" + row.slice(0, 6)), name: row.slice(6) }));
    const p = toOklab(hex);
    let best = null, bd = Infinity;
    for (const n of names) { const d = (n.lab[0] - p[0]) ** 2 + (n.lab[1] - p[1]) ** 2 + (n.lab[2] - p[2]) ** 2; if (d < bd) { bd = d; best = n; } }
    return best ? best.name : "";
  }

  const luminance = (hex) => { const [r, g, b] = rgbOf(hex).map((x) => toLin(x / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  root.Color = { parseHex, parse, format, FORMATS, rgbOf, rgbHex, hsvToHex, hexToHsv, hslToHex, hexToHsl, toOklab, toOklch, fromOklch, fromOklab, mixOklab, name, contrast, luminance };
})(window);
