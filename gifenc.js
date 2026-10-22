(function (root) {
  "use strict";

  function palette(samples, size = 256) {
    let boxes = [samples];
    while (boxes.length < size) {
      let bi = -1, best = 0, ch = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        for (let c = 0; c < 3; c++) {
          let lo = 255, hi = 0;
          for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
          if (hi - lo > best) { best = hi - lo; bi = i; ch = c; }
        }
      });
      if (bi < 0) break;
      const b = boxes[bi].sort((x, y) => x[ch] - y[ch]), m = b.length >> 1;
      boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
    }
    const out = boxes.map((b) => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map((v) => Math.round(v / b.length)); });
    while (out.length < size) out.push([0, 0, 0]);
    return out;
  }
  function lookup(pal) {
    const lut = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const R = (r << 3) | 4, G = (g << 3) | 4, B = (b << 3) | 4;
      let bi = 0, bd = 1e9;
      for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - R) ** 2 * 0.3 + (p[1] - G) ** 2 * 0.59 + (p[2] - B) ** 2 * 0.11; if (d < bd) { bd = d; bi = i; } }
      lut[(r << 10) | (g << 5) | b] = bi;
    }
    return lut;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.47) * 10);
  function indexFrame(rgba, w, h, lut, dither) {
    const out = new Uint8Array(w * h);
    for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) {
      const d = dither ? BAYER[((y & 3) << 2) | (x & 3)] : 0, o = k * 4;
      const r = Math.max(0, Math.min(255, rgba[o] + d)) >> 3, g = Math.max(0, Math.min(255, rgba[o + 1] + d)) >> 3, b = Math.max(0, Math.min(255, rgba[o + 2] + d)) >> 3;
      out[k] = lut[(r << 10) | (g << 5) | b];
    }
    return out;
  }
  function lzw(indices, minSize, out) {
    const clear = 1 << minSize, eoi = clear + 1;
    let size = minSize + 1, next = eoi + 1, table = new Map(), cur = 0, shift = 0;
    const bytes = [];
    const emit = (code) => { cur |= code << shift; shift += size; while (shift >= 8) { bytes.push(cur & 255); cur >>>= 8; shift -= 8; } };
    emit(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = (prefix << 8) | k, hit = table.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next === 4096) { emit(clear); next = eoi + 1; size = minSize + 1; table = new Map(); }
      else { if (next >= 1 << size) size++; table.set(key, next++); }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (shift > 0) bytes.push(cur & 255);
    out.push(minSize);
    for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
    out.push(0);
  }
  const u16 = (v) => [v & 255, (v >> 8) & 255];

  class GifEncoder {
    constructor(w, h, samples, { dither = true } = {}) {
      this.w = w; this.h = h; this.dither = dither;
      const px = [], total = samples.length * (w * h), step = Math.max(1, Math.floor(total / 60000));
      let n = 0;
      for (const f of samples) for (let i = 0; i < w * h; i++, n++) if (n % step === 0) px.push([f[i * 4], f[i * 4 + 1], f[i * 4 + 2]]);
      this.pal = palette(px);
      this.lut = lookup(this.pal);
      this.parts = [];
      const head = [..."GIF89a"].map((c) => c.charCodeAt(0)).concat(u16(w), u16(h), [0xf7, 0, 0]);
      for (const p of this.pal) head.push(p[0], p[1], p[2]);
      head.push(0x21, 0xff, 0x0b, ...[..."NETSCAPE2.0"].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
      this.parts.push(new Uint8Array(head));
    }
    add(rgba, delay) {
      const out = [0x21, 0xf9, 4, 0x04, ...u16(delay), 0, 0, 0x2c, 0, 0, 0, 0, ...u16(this.w), ...u16(this.h), 0];
      lzw(indexFrame(rgba, this.w, this.h, this.lut, this.dither), 8, out);
      this.parts.push(new Uint8Array(out));
    }
    finish() { this.parts.push(new Uint8Array([0x3b])); return new Blob(this.parts, { type: "image/gif" }); }
  }
  root.GifEncoder = GifEncoder;
})(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  "use strict";
  const supported = () => { try { const c = document.createElement("canvas"); c.width = c.height = 1; return c.toDataURL("image/webp").startsWith("data:image/webp"); } catch (e) { return false; } };
  const u24 = (a, v) => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255);
  const u32 = (a, v) => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255);
  const tag = (a, s) => { for (let i = 0; i < 4; i++) a.push(s.charCodeAt(i)); };
  function imageChunks(bytes) {
    const out = []; let alpha = false;
    for (let p = 12; p + 8 <= bytes.length;) {
      const id = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
      const n = bytes[p + 4] | (bytes[p + 5] << 8) | (bytes[p + 6] << 16) | (bytes[p + 7] << 24), end = p + 8 + n + (n & 1);
      if (id === "ALPH" || id === "VP8 " || id === "VP8L") { out.push(bytes.subarray(p, end)); if (id !== "VP8 ") alpha = true; }
      p = end;
    }
    return { out, alpha };
  }
  class WebPAnim {
    constructor(w, h, loops = 0) { this.w = w; this.h = h; this.loops = loops; this.frames = []; this.alpha = false; }
    async add(canvas, ms, quality = 0.9) {
      const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", quality));
      if (!blob || blob.type !== "image/webp") throw new Error("WebP encoding unavailable");
      const { out, alpha } = imageChunks(new Uint8Array(await blob.arrayBuffer()));
      if (!out.length) throw new Error("Empty WebP frame");
      this.alpha ||= alpha;
      this.frames.push({ out, ms: Math.max(1, Math.round(ms)) });
    }
    finish() {
      const head = [];
      tag(head, "VP8X"); u32(head, 10); head.push(0x02 | (this.alpha ? 0x10 : 0), 0, 0, 0); u24(head, this.w - 1); u24(head, this.h - 1);
      tag(head, "ANIM"); u32(head, 6); u32(head, 0); head.push(this.loops & 255, (this.loops >> 8) & 255);
      const parts = [new Uint8Array(head)];
      for (const f of this.frames) {
        const size = 16 + f.out.reduce((s, c) => s + c.length, 0), h = [];
        tag(h, "ANMF"); u32(h, size); u24(h, 0); u24(h, 0); u24(h, this.w - 1); u24(h, this.h - 1); u24(h, f.ms);
        h.push(0x02);
        parts.push(new Uint8Array(h), ...f.out);
      }
      const body = parts.reduce((s, p) => s + p.length, 0), riff = [];
      tag(riff, "RIFF"); u32(riff, 4 + body); tag(riff, "WEBP");
      return new Blob([new Uint8Array(riff), ...parts], { type: "image/webp" });
    }
  }
  root.WebPAnim = WebPAnim;
  root.WebPAnim.supported = supported;
})(window);
