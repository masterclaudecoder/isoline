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
uniform float uScale; uniform float uDetail; uniform float uStretch; uniform float uContrast; uniform int uNoise;
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)), x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0); m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0, h = abs(x) - 0.5, ox = floor(x + 0.5), a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float sfbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; r += a * snoise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; } return r; }
vec2 cellPt(vec2 c) { return vec2(hash(c), hash(c + 19.19)); }
vec2 worley(vec2 p) {
  vec2 i = floor(p), f = fract(p); float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); float d = length(g + cellPt(i + g) - f); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
  return vec2(f1, f2);
}
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
  if (uType >= 4) {
    // Flow and noise generators: a rotated, stretched simplex field mapped through the color ramp.
    float ca = cos(uAngle), sa = sin(uAngle);
    vec2 q = mat2(ca, -sa, sa, ca) * ((p - 0.5) * a);
    q.x /= max(uStretch, 0.05);
    q = q * uScale + uSeed * vec2(1.37, 2.91);
    float v;
    if (uType == 4) {
      vec2 w1 = vec2(sfbm(q), sfbm(q + vec2(5.2, 1.3)));
      vec2 w2 = vec2(sfbm(q + uWarp * 1.2 * w1 + vec2(1.7, 9.2)), sfbm(q + uWarp * 1.2 * w1 + vec2(8.3, 2.8)));
      v = sfbm(q + uWarp * 1.2 * w2) * 0.75 + 0.5;
    } else {
      q += uWarp * vec2(sfbm(q + vec2(3.1, 7.7)), sfbm(q + vec2(9.4, 1.2)));
      if (uNoise == 0) v = sfbm(q) * 0.6 + 0.5;
      else if (uNoise == 1) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; float n = 1.0 - abs(snoise(pp)); r += am * n * n; pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.1; }
      else if (uNoise == 2) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; r += am * abs(snoise(pp)); pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.6; }
      else if (uNoise == 3) v = worley(q * 1.5).x;
      else if (uNoise == 4) { vec2 w = worley(q * 1.5); v = 1.0 - smoothstep(0.0, 0.35, w.y - w.x); }
      else v = 0.5 + 0.5 * sin(q.x * 4.0 + sfbm(q) * 5.0);
    }
    lab = ramp(clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0));
  } else if (uType == 0) {
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

    glass: `uniform float uWidth; uniform float uAngle; uniform float uStr; uniform float uFrost; uniform float uLight;
// Each rib is a half-cylinder lens. Four sub-pixel samples across the rib edge remove the stair-stepping.
vec3 rib(vec2 d, vec2 nrm, out float l) {
  l = fract(dot(d, nrm) / uWidth) - 0.5;
  vec2 uv = vUv + toUv(nrm * sin(l * 3.14159) * uStr * uWidth * 0.5);
  float fr = uFrost * uWidth * 0.35; vec3 c = vec3(0.0);
  for (int i = 0; i < 6; i++) { float a = float(i) * 2.39996 + l * 7.0, r = sqrt((float(i) + 0.5) / 6.0) * fr; c += tex(uv + toUv(vec2(cos(a), sin(a)) * r)).rgb; }
  return c / 6.0;
}
void main() {
  vec2 dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  vec3 acc = vec3(0.0); float l = 0.0, shade = 0.0;
  for (int s = 0; s < 4; s++) {
    vec2 d = dp() + nrm * ((float(s) - 1.5) * 0.25 / uK);
    float li; acc += rib(d, nrm, li);
    shade += 1.0 - 0.18 * uLight * pow(abs(li * 2.0), 3.0) + 0.06 * uLight * (1.0 - smoothstep(0.0, 0.5, abs(li + 0.25)));
  }
  o = vec4(acc / 4.0 * (shade / 4.0), tex(vUv).a);
}`,

    mesh: `uniform float uCell; uniform float uStr; uniform float uFrost; uniform float uGrout;
// Glass blocks: each cell magnifies its own patch of the image, with a softly rounded rim and thin grout lines.
vec3 block(vec2 d, out float e) {
  vec2 c = d / uCell, id = floor(c), l = fract(c) - 0.5;
  e = max(abs(l.x), abs(l.y));
  vec2 rim = sign(l) * smoothstep(0.3, 0.5, abs(l)) * 0.18;
  vec2 src = (id + 0.5 + l * (1.0 - 0.45 * uStr) + rim * uStr) * uCell;
  float fr = uFrost * uCell * 0.12; vec3 col = vec3(0.0);
  for (int i = 0; i < 6; i++) { float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 6.0) * fr; col += tex(toUv(src + vec2(cos(a), sin(a)) * r)).rgb; }
  return col / 6.0;
}
void main() {
  vec3 acc = vec3(0.0); float edge = 0.0;
  for (int s = 0; s < 4; s++) {
    vec2 off = vec2(float(s & 1) - 0.5, float(s >> 1) - 0.5) * 0.5 / uK;
    float e; acc += block(dp() + off, e);
    edge += smoothstep(0.5 - uGrout * 0.04 - 0.004, 0.5, e);
  }
  vec3 col = acc / 4.0;
  col *= 1.0 - 0.24 * (edge / 4.0);
  o = vec4(col, tex(vUv).a);
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

    wave: `uniform float uAmp; uniform float uLen; uniform float uAngle;
void main() {
  vec2 dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  float ph = dot(dp(), dir) / uLen * 6.2831853;
  o = tex(vUv + toUv(nrm * sin(ph) * uAmp));
}`,

    swirl: `uniform float uAmt; uniform float uRad; uniform vec2 uC;
void main() {
  vec2 res = uRes / uK, c = uC * res, d = dp() - c;
  float R = max(1.0, uRad * min(res.x, res.y)), t = clamp(1.0 - length(d) / R, 0.0, 1.0), a = uAmt * t * t;
  float s = sin(a), co = cos(a);
  o = tex(toUv(vec2(co * d.x - s * d.y, s * d.x + co * d.y) + c));
}`,

    kaleido: `uniform float uSeg; uniform float uRot; uniform float uZoom;
void main() {
  vec2 res = uRes / uK, c = res * 0.5, d = (dp() - c) / uZoom;
  float r = length(d), seg = 6.2831853 / uSeg, a = mod(atan(d.y, d.x) + uRot, seg);
  a = abs(a - seg * 0.5);
  o = tex(toUv(c + r * vec2(cos(a), sin(a))));
}`,

    lens: `uniform float uShape; uniform float uSize; uniform float uRefr; uniform float uFrost; uniform float uRim; uniform vec2 uC;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 res = uRes / uK; float m = min(res.x, res.y);
  vec2 p = dp() - uC * res, hb; float rad;
  if (uShape < 0.5) { hb = vec2(uSize * m * 0.5); rad = hb.x; }
  else if (uShape < 1.5) { hb = vec2(uSize * m * 0.95, uSize * m * 0.3); rad = hb.y; }
  else { hb = vec2(uSize * m * 0.5); rad = uSize * m * 0.14; }
  float sd = box(p, hb, rad);
  vec4 base = tex(vUv);
  if (sd > 0.0) { float sh = exp(-sd / (m * 0.025)) * 0.16; o = vec4(base.rgb * (1.0 - sh), base.a); return; }
  float depth = clamp(-sd / (m * 0.1 * uSize + 1.0), 0.0, 1.0);
  vec2 g = vec2(box(p + vec2(1, 0), hb, rad) - box(p - vec2(1, 0), hb, rad), box(p + vec2(0, 1), hb, rad) - box(p - vec2(0, 1), hb, rad));
  vec2 n = normalize(g + 1e-6);
  float bend = pow(1.0 - depth, 2.5);
  vec2 uv = vUv + toUv(-n * bend * uRefr * m * 0.07 - p * uRefr * 0.05);
  float fr = uFrost * m * 0.025; vec3 col = vec3(0.0);
  for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996, rr = sqrt((float(i) + 0.5) / 12.0) * fr; col += tex(uv + toUv(vec2(cos(a), sin(a)) * rr)).rgb; }
  col = mix(col / 12.0, vec3(1.0), 0.05);
  float light = clamp(dot(n, normalize(vec2(-0.6, 0.8))), 0.0, 1.0);
  col += uRim * pow(1.0 - depth, 7.0) * (0.25 + 0.75 * light);
  o = vec4(col, 1.0);
}`,

    blur: `uniform float uAmt; uniform float uDir; uniform float uStart;
void main() {
  vec2 q = vec2(vUv.x, 1.0 - vUv.y); float t;
  if (uDir < 0.5) t = 1.0 - q.y; else if (uDir < 1.5) t = q.y; else if (uDir < 2.5) t = 1.0 - q.x; else if (uDir < 3.5) t = q.x;
  else if (uDir < 4.5) t = length((q - 0.5) * vec2(uRes.x / uRes.y, 1.0)) * 1.3; else t = 1.0;
  float m = uDir > 4.5 ? 1.0 : smoothstep(uStart, 1.0, t);
  float r = uAmt * m * uK; vec4 acc = vec4(0.0);
  for (int i = 0; i < 48; i++) { float fi = float(i), a = fi * 2.39996, rr = sqrt((fi + 0.5) / 48.0) * r; acc += tex(vUv + vec2(cos(a), sin(a)) * rr / uRes); }
  o = acc / 48.0;
}`,

    bloom: `uniform float uThr; uniform float uRad; uniform float uInt;
void main() {
  vec4 c = tex(vUv); vec3 acc = vec3(0.0); float r = uRad * uK;
  for (int i = 0; i < 40; i++) { float fi = float(i), a = fi * 2.39996, rr = sqrt((fi + 0.5) / 40.0) * r; vec3 s = tex(vUv + vec2(cos(a), sin(a)) * rr / uRes).rgb; acc += max(s - uThr, 0.0) / (1.0 - uThr + 0.001); }
  o = vec4(c.rgb + acc / 40.0 * uInt * 1.6, c.a);
}`,

    emboss: `uniform float uStr; uniform float uAngle; uniform float uDepth;
void main() {
  vec2 e = uDepth * uK / uRes;
  float l = luma(tex(vUv - vec2(e.x, 0.0)).rgb), r = luma(tex(vUv + vec2(e.x, 0.0)).rgb);
  float b = luma(tex(vUv - vec2(0.0, e.y)).rgb), t = luma(tex(vUv + vec2(0.0, e.y)).rgb);
  vec3 n = normalize(vec3((l - r) * uStr * 4.0, (b - t) * uStr * 4.0, 1.0)), L = normalize(vec3(cos(uAngle), sin(uAngle), 0.8));
  vec4 c = tex(vUv);
  o = vec4(c.rgb * clamp(dot(n, L) / L.z, 0.0, 1.8), c.a);
}`,

    vignette: `uniform float uAmt; uniform float uSoft;
void main() {
  vec2 a = vec2(uRes.x / uRes.y, 1.0), q = (vUv - 0.5) * a;
  float d = length(q) / length(a * 0.5), v = smoothstep(0.85 - uSoft * 0.7, 1.05, d);
  vec4 c = tex(vUv);
  o = vec4(c.rgb * (1.0 - v * uAmt), c.a);
}`,

    gradmap: `uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uMix;
void main() {
  vec4 c = tex(vUv); float l = luma(c.rgb);
  vec3 m = l < 0.5 ? mix(uC1, uC2, l * 2.0) : mix(uC2, uC3, (l - 0.5) * 2.0);
  o = vec4(mix(c.rgb, m, uMix), c.a);
}`,

    posterize: `uniform float uLevels;
void main() { vec4 c = tex(vUv); float L = max(uLevels - 1.0, 1.0); o = vec4(floor(c.rgb * L + 0.5) / L, c.a); }`,

    linescreen: `uniform float uSpace; uniform float uAngle; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  vec2 nrm = vec2(-sin(uAngle), cos(uAngle)), d = dp();
  float y = dot(d, nrm) / uSpace, f = fract(y) - 0.5;
  vec4 c = tex(toUv(d - nrm * f * uSpace));
  float w = (1.0 - luma(c.rgb)) * 0.5, aa = fwidth(y);
  float m = 1.0 - smoothstep(w - aa, w + aa, abs(f));
  o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, m), 1.0);
}`,

    riso: `uniform float uSize; uniform float uOff; uniform float uGrain; uniform vec3 uInkA; uniform vec3 uInkB; uniform vec3 uPaper;
float dots(vec2 d, float ang, float cov) {
  float ca = cos(ang), sa = sin(ang);
  vec2 r = mat2(ca, -sa, sa, ca) * d / uSize;
  float dist = length(fract(r) - 0.5), rad = sqrt(clamp(cov, 0.0, 1.0)) * 0.72, aa = fwidth(dist);
  return 1.0 - smoothstep(rad - aa, rad + aa, dist);
}
void main() {
  vec2 d = dp(), off = vec2(uOff, -uOff * 0.6);
  vec4 c = tex(vUv), c2 = tex(vUv + toUv(off));
  float sat = max(c2.r, max(c2.g, c2.b)) - min(c2.r, min(c2.g, c2.b));
  float a = dots(d, 0.26, smoothstep(0.12, 0.95, 1.0 - luma(c.rgb)));
  float b = dots(d + off, 1.31, smoothstep(0.05, 0.9, (1.0 - luma(c2.rgb)) * 0.55 + sat * 0.9));
  vec3 col = uPaper * mix(vec3(1.0), uInkA, a * 0.92) * mix(vec3(1.0), uInkB, b * 0.85);
  col += (hash(floor(d * uK) + uSeed) - 0.5) * uGrain * 0.3;
  o = vec4(col, 1.0);
}`,

    voronoi: `uniform float uCell; uniform float uEdge;
vec2 h2(vec2 p) { return vec2(hash(p + uSeed), hash(p + 19.19 + uSeed)); }
void main() {
  vec2 d = dp() / uCell, i = floor(d), f = fract(d), best = vec2(0.0);
  float m1 = 8.0, m2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), pt = g + h2(i + g); float dd = length(pt - f);
    if (dd < m1) { m2 = m1; m1 = dd; best = i + pt; } else if (dd < m2) m2 = dd;
  }
  vec4 c = tex(toUv(best * uCell));
  float e = 1.0 - smoothstep(0.0, uEdge + 0.001, m2 - m1);
  o = vec4(c.rgb * (1.0 - e * 0.65), c.a);
}`,

    scan: `uniform float uSpace; uniform float uStr;
void main() {
  vec4 c = tex(vUv); float s = 0.5 + 0.5 * cos(dp().y / uSpace * 6.2831853);
  o = vec4(c.rgb * (1.0 - uStr * s) + uStr * 0.08, c.a);
}`,

    chroma: `uniform float uAmt;
void main() {
  vec2 off = (vUv - 0.5) * 2.0 * uAmt * uK / uRes;
  vec4 c = tex(vUv);
  o = vec4(tex(vUv + off).r, c.g, tex(vUv - off).b, c.a);
}`,

    grain: `uniform float uAmt; uniform float uSize; uniform float uMono; uniform float uSoft;
void main() {
  vec4 c = tex(vUv);
  vec2 g = floor(dp() / uSize) + uSeed * 0.37;
  // Film grain averages a few samples (softer, rounder clumps); fine grain is one hash per cell.
  float n = uSoft > 0.5 ? (hash(g) + hash(g + 0.5) + vnoise(dp() / uSize * 0.7) - 1.5) / 1.4 : hash(g) - 0.5;
  n *= 1.0 - 0.5 * abs(luma(c.rgb) - 0.5);
  vec3 nn = uMono > 0.5 ? vec3(n) : vec3(n, hash(g + 7.1) - 0.5, hash(g + 3.3) - 0.5);
  c.rgb += nn * uAmt * 0.7;
  o = c;
}`,
  };

  // Default pipeline order when effects are added; the app can reorder freely.
  const ORDER = ["liquify", "wave", "swirl", "kaleido", "glass", "mesh", "lens", "blur", "bloom", "emboss", "gradmap", "posterize", "pixel", "voronoi", "halftone", "linescreen", "riso", "ascii", "dither", "scan", "chroma", "vignette", "grain"];
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
        if (u === "uType" || u === "uN" || u === "uNoise") gl.uniform1i(l, v);
        else if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 3 && typeof v[0] === "number") gl.uniform3fv(l, v);
        else if (v.length === 2 && typeof v[0] === "number") gl.uniform2fv(l, v);
        else if (u === "uCol" && v.length) gl.uniform3fv(l, v.flat());
        else if (u === "uPt" && v.length) gl.uniform2fv(l, v.flat());
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function effectUniforms(id, e, ink, paper) {
      switch (id) {
        case "liquify": return { uAmt: e.amount, uScale: e.scale };
        case "glass": return { uWidth: e.width, uAngle: rad(e.angle), uStr: e.strength, uFrost: e.frost ?? 0.2, uLight: e.light ?? 0.5 };
        case "mesh": return { uCell: e.cell, uStr: e.strength, uFrost: e.frost ?? 0.3, uGrout: e.grout ?? 1 };
        case "pixel": return { uSize: e.size, uBevel: e.bevel };
        case "halftone": return { uSize: e.size, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "ascii": {
          const set = e.set === "custom" ? " " + (e.custom || "#") : CHARSETS[e.set] || CHARSETS.ascii;
          atlas(set);
          return { uCell: e.cell, uCount: atlasN, uMono: e.mono ? 1 : 0, uInvert: e.invert ? 1 : 0, uInk: ink, uPaper: paper };
        }
        case "dither": return { uMat: e.matrix, uLevels: e.levels, uMono: e.mono ? 1 : 0, uPix: e.pix, uInk: ink, uPaper: paper };
        case "chroma": return { uAmt: e.amount };
        case "wave": return { uAmp: e.amp, uLen: e.length, uAngle: rad(e.angle) };
        case "swirl": return { uAmt: e.amount, uRad: e.radius, uC: [e.x, 1 - e.y] };
        case "kaleido": return { uSeg: e.segments, uRot: rad(e.rotate), uZoom: e.zoom };
        case "lens": return { uShape: ["circle", "pill", "square"].indexOf(e.shape), uSize: e.size, uRefr: e.refraction, uFrost: e.frost, uRim: e.rim, uC: [e.x, 1 - e.y] };
        case "blur": return { uAmt: e.amount, uDir: ["top", "bottom", "left", "right", "center", "even"].indexOf(e.dir), uStart: e.start };
        case "bloom": return { uThr: e.threshold, uRad: e.radius, uInt: e.intensity };
        case "emboss": return { uStr: e.strength, uAngle: rad(e.angle), uDepth: e.depth };
        case "vignette": return { uAmt: e.amount, uSoft: e.softness };
        case "gradmap": return { uC1: hex3(e.c1), uC2: hex3(e.c2), uC3: hex3(e.c3), uMix: e.mix };
        case "posterize": return { uLevels: e.levels };
        case "linescreen": return { uSpace: e.spacing, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "riso": return { uSize: e.size, uOff: e.offset, uGrain: e.grain, uInkA: hex3(e.inkA), uInkB: hex3(e.inkB), uPaper: hex3(e.paper) };
        case "voronoi": return { uCell: e.cell, uEdge: e.edge };
        case "scan": return { uSpace: e.spacing, uStr: e.strength };
        case "grain": return { uAmt: e.amount, uSize: e.size, uMono: e.mono ? 1 : 0, uSoft: e.soft ? 1 : 0 };
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
          uType: ["mesh", "linear", "radial", "conic", "flow", "noise"].indexOf(g.type), uN: n,
          uScale: g.scale ?? 1.2, uDetail: g.detail ?? 3, uStretch: g.stretch ?? 1, uContrast: g.contrast ?? 1,
          uNoise: ["clouds", "ridges", "billow", "cells", "veins", "marble"].indexOf(g.noise || "clouds"),
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
      for (const id of job.order || ORDER) {
        const e = job.fx[id];
        if (!e || !e.on || !SHADERS[id]) continue;
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
