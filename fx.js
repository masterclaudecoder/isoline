// WebGL2 raster pipeline: a source (rasterized contours or a gradient) followed by an effect stack.
(function (root) {
  "use strict";

  const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const HEAD = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uK; uniform float uSeed;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); float s = uSeed * 0.013;
  return mix(mix(hash(i + s), hash(i + vec2(1, 0) + s), u.x), mix(hash(i + vec2(0, 1) + s), hash(i + vec2(1, 1) + s), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 4; i++) { r += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return r; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec2 dp() { return vUv * uRes / uK; }
vec2 toUv(vec2 d) { return d * uK / uRes; }
vec4 tex(vec2 uv) { return texture(uTex, clamp(uv, vec2(0.0), vec2(1.0))); }
`;

  const SHADERS = {
    copy: `void main() { o = tex(vUv); }`,

    gradient: `
uniform int uType; uniform int uN; uniform vec3 uCol[8]; uniform vec2 uPt[8];
uniform float uWarp; uniform float uWarpScale; uniform float uSoft; uniform float uAngle;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 toLab(vec3 c) {
  float l = pow(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b, 1.0 / 3.0);
  float m = pow(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b, 1.0 / 3.0);
  float s = pow(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b, 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 fromLab(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * float(uN - 1);
  int i = min(int(floor(t)), uN - 2); float f = t - float(i); f = f * f * (3.0 - 2.0 * f);
  return mix(toLab(lin(uCol[i])), toLab(lin(uCol[i + 1])), f);
}
void main() {
  vec2 a = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  if (uWarp > 0.0) { vec2 q = p * a * uWarpScale; p += uWarp * 0.3 * (vec2(fbm(q + vec2(1.7, 9.2)), fbm(q + vec2(8.3, 2.8))) - 0.5); }
  vec3 lab;
  if (uType == 0) {
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int i = 0; i < 8; i++) { if (i >= uN) break; vec2 d = (p - uPt[i]) * a; float w = 1.0 / pow(dot(d, d) + 0.0004, uSoft); acc += toLab(lin(uCol[i])) * w; ws += w; }
    lab = acc / ws;
  } else {
    vec2 c = (p - 0.5) * a; float t;
    if (uType == 1) { vec2 dir = vec2(cos(uAngle), sin(uAngle)); float ext = abs(dir.x) * a.x * 0.5 + abs(dir.y) * 0.5; t = dot(c, dir) / ext * 0.5 + 0.5; }
    else if (uType == 2) t = length(c) / length(a * 0.5);
    else t = abs(fract(atan(c.y, c.x) / 6.2831853 + uAngle / 6.2831853) * 2.0 - 1.0);
    lab = ramp(t);
  }
  o = vec4(srgb(fromLab(lab)), 1.0);
}`,

    liquify: `uniform float uAmt; uniform float uScale;
void main() {
  vec2 q = dp() / uScale;
  vec2 w = vec2(fbm(q + vec2(3.1, 7.7)), fbm(q + vec2(9.4, 1.2)));
  vec2 off = (vec2(fbm(q + 2.5 * w + vec2(1.3, 4.1)), fbm(q + 2.5 * w + vec2(6.2, 8.8))) - 0.5) * 2.0;
  o = tex(vUv + toUv(off * uAmt * uScale * 0.5));
}`,

    glass: `uniform float uWidth; uniform float uAngle; uniform float uStr; uniform float uShine;
void main() {
  vec2 dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  float x = dot(dp(), nrm) / uWidth, l = fract(x) - 0.5;
  vec4 c = tex(vUv + toUv(nrm * l * uStr * uWidth));
  float e = abs(l * 2.0);
  c.rgb *= 1.0 - 0.28 * uShine * pow(e, 3.0);
  c.rgb += uShine * 0.35 * pow(clamp(1.0 - abs(l + 0.22) * 5.0, 0.0, 1.0), 2.0);
  c.rgb += uShine * 0.12 * smoothstep(0.42, 0.5, e);
  o = c;
}`,

    mesh: `uniform float uCell; uniform float uStr; uniform float uBevel;
void main() {
  vec2 d = dp() / uCell, l = fract(d) - 0.5;
  vec4 c = tex(vUv - toUv(l * uStr * uCell * 0.6));
  float e = max(abs(l.x), abs(l.y)), bev = smoothstep(0.34, 0.5, e);
  float light = dot(normalize(l + 1e-5), normalize(vec2(-1.0, 1.0)));
  c.rgb += bev * uBevel * light * 0.3;
  c.rgb += uBevel * 0.18 * pow(clamp(1.0 - length(l - vec2(-0.18, 0.18)) * 3.0, 0.0, 1.0), 3.0);
  o = c;
}`,

    pixel: `uniform float uSize; uniform float uBevel;
void main() {
  vec2 d = dp(), cell = floor(d / uSize), l = fract(d / uSize);
  vec4 c = tex(toUv((cell + 0.5) * uSize));
  if (uBevel > 0.0) {
    float w = 0.14;
    float hi = max(step(l.x, w), step(1.0 - w, l.y)), lo = max(step(1.0 - w, l.x), step(l.y, w));
    c.rgb *= 1.0 + uBevel * (0.3 * hi - 0.3 * lo);
  }
  o = c;
}`,

    halftone: `uniform float uSize; uniform float uAngle; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  float ca = cos(uAngle), sa = sin(uAngle);
  mat2 R = mat2(ca, -sa, sa, ca);
  vec2 r = R * dp() / uSize, cell = floor(r) + 0.5;
  vec4 c = tex(toUv(transpose(R) * (cell * uSize)));
  float dark = uMono > 0.5 ? 1.0 - luma(c.rgb) : 0.25 + 0.75 * (1.0 - luma(c.rgb) * 0.6);
  float rad = sqrt(clamp(dark, 0.0, 1.0)) * 0.72, dist = length(fract(r) - 0.5), aa = fwidth(dist);
  float m = 1.0 - smoothstep(rad - aa, rad + aa, dist);
  o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, m), 1.0);
}`,

    ascii: `uniform sampler2D uAtlas; uniform float uCell; uniform float uCount; uniform float uMono; uniform float uInvert; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  vec2 d = dp(), cell = floor(d / uCell);
  vec4 c = tex(toUv((cell + 0.5) * uCell));
  float v = luma(c.rgb); if (uInvert < 0.5) v = 1.0 - v;
  float idx = floor(clamp(v, 0.0, 0.999) * uCount);
  vec2 l = fract(d / uCell); l.y = 1.0 - l.y;
  float g = texture(uAtlas, vec2((idx + l.x) / uCount, l.y)).r;
  o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, g), 1.0);
}`,

    dither: `uniform float uMat; uniform float uLevels; uniform float uMono; uniform float uPix; uniform vec3 uInk; uniform vec3 uPaper;
float b2(vec2 a) { a = floor(mod(a, 2.0)); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float b4(vec2 a) { return b2(0.5 * a) * 0.25 + b2(a); }
float b8(vec2 a) { return b4(0.5 * a) * 0.25 + b2(a); }
void main() {
  // Snap cells to whole device pixels so the pattern has no seams.
  float cell = max(1.0, floor(uPix * uK + 0.5));
  vec2 d = floor(vUv * uRes / cell);
  vec4 c = tex((d + 0.5) * cell / uRes);
  float th = (uMat < 3.0 ? b2(d) : uMat < 6.0 ? b4(d) : b8(d)) - 0.5;
  float L = max(uLevels - 1.0, 1.0);
  if (uMono > 0.5) { float q = floor(clamp(luma(c.rgb) + th / L, 0.0, 1.0) * L + 0.5) / L; o = vec4(mix(uInk, uPaper, q), 1.0); }
  else o = vec4(floor(clamp(c.rgb + th / L, 0.0, 1.0) * L + 0.5) / L, 1.0);
}`,

    chroma: `uniform float uAmt;
void main() {
  vec2 off = (vUv - 0.5) * 2.0 * uAmt * uK / uRes;
  vec4 c = tex(vUv);
  o = vec4(tex(vUv + off).r, c.g, tex(vUv - off).b, c.a);
}`,

    grain: `uniform float uAmt; uniform float uSize; uniform float uMono;
void main() {
  vec4 c = tex(vUv);
  vec2 g = floor(dp() / uSize) + uSeed * 0.37;
  float n = hash(g) - 0.5;
  vec3 nn = uMono > 0.5 ? vec3(n) : vec3(n, hash(g + 7.1) - 0.5, hash(g + 3.3) - 0.5);
  c.rgb += nn * uAmt * 0.7;
  o = c;
}`,
  };

  const ORDER = ["liquify", "glass", "mesh", "pixel", "halftone", "ascii", "dither", "chroma", "grain"];
  const CHARSETS = { ascii: " .:-=+*#%@", blocks: " ░▒▓█", dots: " ·•●", binary: " 01", lines: " ─═│╬" };

  const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const rad = (d) => (d * Math.PI) / 180;

  function createFX(canvas) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true });
    if (!gl) return null;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const progs = {};
    function program(name) {
      if (progs[name]) return progs[name];
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(name + ": " + gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HEAD + SHADERS[name]));
      gl.bindAttribLocation(p, 0, "aPos");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ": " + gl.getProgramInfoLog(p));
      const locs = {};
      progs[name] = { p, loc: (u) => (u in locs ? locs[u] : (locs[u] = gl.getUniformLocation(p, u))) };
      return progs[name];
    }

    const newTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const srcTex = newTex(), atlasTex = newTex();
    let targets = null, atlasKey = "", atlasN = 1;

    function ensureTargets(w, h) {
      if (targets && targets.w === w && targets.h === h) return;
      if (targets) targets.list.forEach(({ t, f }) => { gl.deleteTexture(t); gl.deleteFramebuffer(f); });
      const list = [0, 1].map(() => {
        const t = newTex();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { t, f };
      });
      targets = { w, h, list };
    }

    function atlas(chars) {
      const key = chars + (document.fonts?.check('16px "Geist Mono"') ? "|font" : "");
      if (key === atlasKey) return;
      atlasKey = key;
      const glyphs = [...chars];
      atlasN = Math.max(1, glyphs.length);
      const cs = 64, c = document.createElement("canvas");
      c.width = cs * atlasN; c.height = cs;
      const x = c.getContext("2d");
      x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = `500 ${cs * 0.96}px "Geist Mono", ui-monospace, Menlo, monospace`;
      x.lineWidth = cs * 0.035; x.strokeStyle = "#fff";
      glyphs.forEach((g, i) => { x.fillText(g, i * cs + cs / 2, cs * 0.54); x.strokeText(g, i * cs + cs / 2, cs * 0.54); });
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    }

    function draw(name, input, output, uniforms, w, h, k, seed) {
      const { p, loc } = program(name);
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, output);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, input);
      gl.uniform1i(loc("uTex"), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(loc("uAtlas"), 1);
      gl.uniform2f(loc("uRes"), w, h);
      gl.uniform1f(loc("uK"), k);
      gl.uniform1f(loc("uSeed"), seed % 1000);
      for (const [u, v] of Object.entries(uniforms)) {
        const l = loc(u);
        if (l == null) continue;
        if (u === "uType" || u === "uN") gl.uniform1i(l, v);
        else if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 3 && typeof v[0] === "number") gl.uniform3fv(l, v);
        else if (u === "uCol") gl.uniform3fv(l, v.flat());
        else if (u === "uPt") gl.uniform2fv(l, v.flat());
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function effectUniforms(id, e, ink, paper) {
      switch (id) {
        case "liquify": return { uAmt: e.amount, uScale: e.scale };
        case "glass": return { uWidth: e.width, uAngle: rad(e.angle), uStr: e.strength, uShine: e.shine };
        case "mesh": return { uCell: e.cell, uStr: e.strength, uBevel: e.bevel };
        case "pixel": return { uSize: e.size, uBevel: e.bevel };
        case "halftone": return { uSize: e.size, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "ascii": {
          const set = e.set === "custom" ? " " + (e.custom || "#") : CHARSETS[e.set] || CHARSETS.ascii;
          atlas(set);
          return { uCell: e.cell, uCount: atlasN, uMono: e.mono ? 1 : 0, uInvert: e.invert ? 1 : 0, uInk: ink, uPaper: paper };
        }
        case "dither": return { uMat: e.matrix, uLevels: e.levels, uMono: e.mono ? 1 : 0, uPix: e.pix, uInk: ink, uPaper: paper };
        case "chroma": return { uAmt: e.amount };
        case "grain": return { uAmt: e.amount, uSize: e.size, uMono: e.mono ? 1 : 0 };
      }
      return {};
    }

    // job: { w, h, k, seed, image?: canvas, grad?: {...}, fx: {...}, ink, paper }
    function render(job) {
      const w = Math.min(maxSize, Math.max(1, Math.round(job.w))), h = Math.min(maxSize, Math.max(1, Math.round(job.h)));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ensureTargets(w, h);
      const k = job.k * (w / job.w);
      let input, ping = 0;
      if (job.grad) {
        const g = job.grad, n = Math.min(8, g.colors.length);
        draw("gradient", srcTex, targets.list[0].f, {
          uType: ["mesh", "linear", "radial", "conic"].indexOf(g.type), uN: n,
          uCol: g.colors.slice(0, 8).map(hex3), uPt: g.points.slice(0, 8).map((p) => [p.x, p.y]),
          uWarp: g.warp, uWarpScale: g.warpScale, uSoft: g.soft, uAngle: rad(g.angle),
        }, w, h, k, job.seed);
        input = targets.list[0].t; ping = 1;
      } else {
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, job.image);
        input = srcTex;
      }
      const ink = hex3(job.ink), paper = hex3(job.paper);
      for (const id of ORDER) {
        const e = job.fx[id];
        if (!e || !e.on) continue;
        const out = targets.list[ping];
        draw(id, input, out.f, effectUniforms(id, e, ink, paper), w, h, k, job.seed);
        input = out.t; ping = 1 - ping;
      }
      draw("copy", input, null, {}, w, h, k, job.seed);
      return { w, h };
    }

    return { render, maxSize };
  }

  root.TopoFX = { createFX, ORDER, CHARSETS };
})(window);
