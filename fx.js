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
// Quality (Settings, Performance): uQ = god ray steps, blur taps, bloom taps, glass frost taps; uQ2.x = object
// march steps. Zero means the standard amount. (Glass that refracts through its body is per object, uBody.)
uniform vec4 uQ; uniform vec4 uQ2;
// A mipmapped copy of the input, bound by the glass effects for frost and block color.
uniform sampler2D uMip;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// Quintic fade: its slope and curvature are both continuous across cell edges. With the plain smoothstep
// fade the curvature jumped at every edge, and effects that light by curvature (caustics, water) drew
// the noise grid as faint rectangles.
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); float s = uSeed * 0.013;
  return mix(mix(hash(i + s), hash(i + vec2(1, 0) + s), u.x), mix(hash(i + vec2(0, 1) + s), hash(i + vec2(1, 1) + s), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 4; i++) { r += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return r; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec2 dp() { return vUv * uRes / uK; }
vec2 toUv(vec2 d) { return d * uK / uRes; }
vec4 tex(vec2 uv) { return texture(uTex, clamp(uv, vec2(0.0), vec2(1.0))); }
// A disc blur of radius r (output pixels) over a mipmapped copy of the input. 48 taps on a golden spiral,
// turned per pixel; each reads the mip level that matches the spacing between taps, so the disc is filled
// evenly however large it gets. bokeh > 0 weights bright taps up, so highlights open into discs.
vec4 discBlur(sampler2D m, vec2 uv, float r, float bokeh) {
  if (r < 0.5) return texture(m, uv);
  float lod = log2(max(1.0, r * 0.3)), j = hash(gl_FragCoord.xy) * 6.2831853, n = uQ.y > 0.0 ? uQ.y : 48.0; vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= n) break;
    float fi = float(i), a = fi * 2.39996 + j, rr = sqrt((fi + 0.5) / n) * r;
    vec4 c = textureLod(m, clamp(uv + vec2(cos(a), sin(a)) * rr / uRes, vec2(0.0), vec2(1.0)), lod);
    float w = 1.0 + bokeh * 12.0 * pow(max(c.r, max(c.g, c.b)), 6.0);
    acc += c * w; ws += w;
  }
  return acc / ws;
}
// Halftone dot shapes. r is the radius of a circle with the same area, so every shape lays down the same
// ink for the same tone, and each shape is centred on its cell. Callers test the neighboring cells too,
// so a large dot spills into the next cell instead of being cut off at its edge.
float sdTri(vec2 p, float r) { const float k = 1.7320508; p.y = -p.y; p.x = abs(p.x) - r; p.y += r / k; if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0; p.x -= clamp(p.x, -2.0 * r, 0.0); return -length(p) * sign(p.y); }
float sdStar(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994, -0.587785252), k2 = vec2(-0.809016994, -0.587785252);
  p.y = -p.y; p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float dotSD(vec2 f, float r, float shape) {
  if (shape < 0.5) return length(f) - r;
  if (shape < 1.5) return max(abs(f.x), abs(f.y)) - r * 0.886;
  if (shape < 2.5) return sdTri(f, r * 1.345);
  return sdStar(f, r * 1.541, 0.45);
}
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Frosted sample: n blur taps on a golden spiral, rotated and spread per pixel so the blur reads as frost
// rather than ghosted copies, with red and blue pulled apart along disp.
// Each tap reads the mip level that matches the spacing between taps, so wide frost stays smooth.
vec3 frostDisp(vec2 uv, float rad, vec2 disp, int n) {
  vec3 c = vec3(0.0);
  float j = hash(gl_FragCoord.xy) * 6.2831853, lod = n > 1 ? log2(max(1.0, rad * uK * 1.8 / sqrt(float(n)))) : 0.0;
  for (int i = 0; i < n; i++) {
    float a = float(i) * 2.39996 + j, r = n > 1 ? sqrt((float(i) + hash(gl_FragCoord.xy + float(i) * 7.13)) / float(n)) * rad : 0.0;
    vec2 q = clamp(uv + toUv(vec2(cos(a), sin(a)) * r), vec2(0.0), vec2(1.0));
    c += vec3(textureLod(uMip, clamp(q + disp, 0.0, 1.0), lod).r, textureLod(uMip, q, lod).g, textureLod(uMip, clamp(q - disp, 0.0, 1.0), lod).b);
  }
  return c / float(n);
}
// Glass, shared by Fluted glass, Glass blocks and Liquid glass: the material of the glass objects on a
// pane lying over the picture. g is the slope of the pane's surface (height per px, rising inward) and sd
// the distance to its edge (px, < 0 inside). The view ray bends in through the surface, crosses the pane's
// thickness (px) and lands on the picture behind, so steep edges bend the most and a full dome turns its
// patch over. Frost blurs what shows through, tint fogs it milky like sea glass, and light sets the shading,
// the highlight and the hairline on the edges that face it (from the top left).
// Blend pulls each glass piece toward its own average color (gMean, set by the caller), down to a single
// color at full blend. Tint is sea glass: a frosted skin that fogs the pane milky and glows lighter over
// its rounded edges, where the frosted surface scatters the most light back. Texture dimples the surface
// with small bumps, like patterned or pebbled glass, so what shows through breaks up and shimmers.
vec3 gMean = vec3(0.0); float gBlend = 0.0, gBump = 0.0;
vec3 meanAt(vec2 uv, vec2 half_) {
  float lod = log2(max(1.0, max(half_.x, half_.y) * uK));
  vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) { vec2 s = vec2(i & 1, i >> 1) - 0.5; c += textureLod(uMip, clamp(uv + toUv(s * half_), 0.0, 1.0), lod).rgb; }
  return c * 0.25;
}
float glassSlope(float e, float b) { float x = 1.0 - clamp(e / max(b, 1e-3), 0.0, 1.0); return min(x / sqrt(max(1.0 - x * x, 0.0025)), 4.0); }
vec3 glassMat(vec2 uv, vec2 g, float sd, float thick, float frost, float tint, float light, int taps) {
  if (gBump > 0.0) {
    vec2 q = uv * uRes / uK / 3.5; const float e = 0.3;
    g += vec2(vnoise(q + vec2(e, 0.0)) - vnoise(q - vec2(e, 0.0)), vnoise(q + vec2(0.0, e)) - vnoise(q - vec2(0.0, e))) / (2.0 * e) * gBump * 0.7;
  }
  vec3 n = normalize(vec3(-g, 1.0)), r = refract(vec3(0.0, 0.0, -1.0), n, 1.0 / 1.5);
  vec2 off = r.xy / max(-r.z, 0.2) * thick;
  vec3 c = frostDisp(uv + toUv(off), frost, toUv(off * 0.06), frost > 0.5 ? taps : 1);
  c = mix(c, gMean, gBlend);
  vec3 L = normalize(vec3(-0.55, 0.65, 0.55));
  float sp = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), n), L), 0.0), 28.0), fr = pow(1.0 - n.z, 1.5), edge = clamp(1.0 - n.z * n.z, 0.0, 1.0);
  c = mix(c, mix(vec3(luma(c)), c, 0.8) * 0.75 + 0.27, tint);
  c = mix(c, c * 0.55 + 0.5, tint * smoothstep(0.0, 0.7, edge) * 0.7);
  float face = dot(normalize(n.xy + 1e-6), normalize(L.xy)), hair = max(1.0, 0.9 / uK);
  // Frosted glass is lit softly, so tint also eases the dark side of the shading.
  float sh = dot(n, L) - L.z;
  c *= 1.0 + light * 0.8 * (sh < 0.0 ? sh * (1.0 - 0.7 * tint) : sh);
  c += light * (0.7 * sp + 0.12 * fr + 0.55 * exp(min(sd, 0.0) / hair) * (0.25 + 0.75 * max(face, 0.0)));
  return clamp(c, 0.0, 1.0);
}
`;

  // Linear light and OKLab, shared by the shaders that mix palette colors.
  const COLOR = `
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
`;

  const SHADERS = {
    copy: `void main() { o = tex(vUv); }`,
    // Glide's fade from the frame a loop's travel behind into this one (see uGLin in the gradient).
    gmix: `uniform sampler2D uTex2; uniform float uW; void main() { o = mix(texture(uTex, vUv), texture(uTex2, vUv), uW); }`,

    // Contour field, a port of engine.js buildField: one texel per grid point, in design pixels.
    field: `
uniform sampler2D uTex2; uniform int uPattern; uniform float uSc; uniform int uOct; uniform float uP; uniform float uBump;
uniform float uLiq; uniform float uLiqScale; uniform float uWarpA; uniform vec2 uLoop; uniform vec2 uDrift; uniform vec2 uDir;
uniform vec2 uCell; uniform vec4 uPts[32]; uniform int uNPts; uniform int uUser; uniform vec4 uFeat[24]; uniform int uNFeat;
int perm(int i) { return int(texelFetch(uTex2, ivec2(i, 0), 0).r + 0.5); }
const float GX[8] = float[8](1., -1., 1., -1., 1., -1., 0., 0.);
const float GY[8] = float[8](1., 1., -1., -1., 0., 0., 1., -1.);
float sn(float xin, float yin) {
  const float F2 = 0.36602540378443865, G2 = 0.21132486540518713;
  float s = (xin + yin) * F2, fi = floor(xin + s), fj = floor(yin + s), t = (fi + fj) * G2;
  float x0 = xin - (fi - t), y0 = yin - (fj - t);
  int i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  float x1 = x0 - float(i1) + G2, y1 = y0 - float(j1) + G2, x2 = x0 - 1.0 + 2.0 * G2, y2 = y0 - 1.0 + 2.0 * G2;
  int ii = int(fi) & 255, jj = int(fj) & 255;
  float n = 0.0, tt; int g;
  tt = 0.5 - x0 * x0 - y0 * y0;
  if (tt > 0.0) { g = perm(ii + perm(jj)) & 7; tt *= tt; n += tt * tt * (GX[g] * x0 + GY[g] * y0); }
  tt = 0.5 - x1 * x1 - y1 * y1;
  if (tt > 0.0) { g = perm(ii + i1 + perm(jj + j1)) & 7; tt *= tt; n += tt * tt * (GX[g] * x1 + GY[g] * y1); }
  tt = 0.5 - x2 * x2 - y2 * y2;
  if (tt > 0.0) { g = perm(ii + 1 + perm(jj + 1)) & 7; tt *= tt; n += tt * tt * (GX[g] * x2 + GY[g] * y2); }
  return 70.0 * n;
}
float fbmS(float x, float y, int o) {
  float a = 1.0, q = 1.0, sum = 0.0, norm = 0.0;
  for (int i = 0; i < 12; i++) { if (i >= o) break; sum += a * sn(x * q, y * q); norm += a; a *= 0.5; q *= 2.03; }
  return sum / norm;
}
float ridgedS(float x, float y, int o) {
  float a = 1.0, q = 1.0, sum = 0.0, norm = 0.0;
  for (int i = 0; i < 12; i++) { if (i >= o) break; float r = 1.0 - abs(sn(x * q, y * q)); sum += a * r * r; norm += a; a *= 0.5; q *= 2.03; }
  return sum / norm;
}
float pointSum(vec2 p, bool userOnly, bool px) {
  if (userOnly && uUser == 0) return 0.0;
  float v = 0.0;
  for (int i = 0; i < 32; i++) {
    if (i >= uNPts) break;
    vec4 q = uPts[i]; vec2 d = p - q.xy;
    v += q.w * (px ? q.z : 1.0) * pow(1.0 + dot(d, d) / (q.z * q.z * uP), -uP);
  }
  return v;
}
void main() {
  vec2 ij = floor(gl_FragCoord.xy);
  float px = ij.x * uCell.x + uDrift.x, py = ij.y * uCell.y + uDrift.y;
  if (uLiq > 0.0) {
    float u0 = px / uLiqScale, v0 = py / uLiqScale;
    float qx = sn(u0 + 1.3, v0 + 7.1), qy = sn(u0 + 8.2, v0 + 2.8);
    px += uLiq * uLiqScale * 0.06 * sn(u0 + 1.2 * qx + 4.7, v0 + 1.2 * qy + 1.9);
    py += uLiq * uLiqScale * 0.06 * sn(u0 + 1.2 * qx + 9.2, v0 + 1.2 * qy + 5.3);
  }
  if (uWarpA > 0.0) {
    float u0 = px / uSc, v0 = py / uSc;
    float dx = uWarpA * uSc * 0.5 * fbmS(u0 + 5.2 + uLoop.x, v0 + 1.3 + uLoop.y, 2);
    float dy = uWarpA * uSc * 0.5 * fbmS(u0 + 1.7 - uLoop.y, v0 + 9.2 + uLoop.x, 2);
    px += dx; py += dy;
  }
  float u = px / uSc, v = py / uSc, val; vec2 p = vec2(px, py); float lin = px * uDir.x + py * uDir.y;
  if (uPattern == 0) val = pointSum(p, false, false) + (uOct > 1 ? 0.06 * fbmS(u, v, uOct - 1) : 0.0);
  else if (uPattern == 1) val = fbmS(u, v, uOct) + 0.8 * pointSum(p, true, false);
  else if (uPattern == 4) val = ridgedS(u, v, uOct) + 0.6 * pointSum(p, true, false);
  else if (uPattern == 2) val = sin((u * uDir.x + v * uDir.y) * 2.4 + fbmS(u * 0.45, v * 0.45, uOct) * 2.2) + pointSum(p, true, false);
  else if (uPattern == 5) val = 1.0 - abs(sin((u * uDir.x + v * uDir.y) * 1.6 + uBump * 1.2 * fbmS(u * 0.4, v * 0.4, uOct))) + 0.6 * pointSum(p, true, false);
  else if (uPattern == 6) val = lin + pointSum(p, true, true);
  else if (uPattern == 7) {
    val = lin + pointSum(p, true, true);
    for (int i = 0; i < 24; i++) { if (i >= uNFeat) break; vec4 f = uFeat[i]; vec2 d = p - f.xy; val += uBump * f.w * f.z * exp(-dot(d, d) / (2.0 * f.z * f.z)); }
  }
  else if (uPattern == 8) val = lin + uBump * uSc * 0.35 * fbmS(u * 0.5, v * 0.5, uOct) + pointSum(p, true, true);
  else if (uPattern == 3) {
    // Log-sum-exp form of the smooth minimum, so far points don't underflow in single precision.
    float smk = 40.0, m = 1e30;
    for (int i = 0; i < 32; i++) { if (i >= uNPts) break; m = min(m, length(p - uPts[i].xy) / max(0.15, abs(uPts[i].w)) / smk); }
    float acc = 0.0;
    for (int i = 0; i < 32; i++) { if (i >= uNPts) break; acc += exp(m - length(p - uPts[i].xy) / max(0.15, abs(uPts[i].w)) / smk); }
    val = smk * (m - log(acc));
  }
  else val = fbmS(u, v, uOct);
  o = vec4(val, 0.0, 0.0, 1.0);
}`,

    // One object over the picture so far: a lit 3D form or a picture card, placed, turned and tilted.
    // Forms are raymarched in their own unit space; materials read the palette, the design underneath
    // (wrapped onto the surface so it turns with the form), a texture (a preset or a picture), or
    // refract what's behind like glass. A soft contact shadow sits under each one.
    object: COLOR + `
uniform int uKind; uniform vec2 uC; uniform float uSz; uniform float uRot; uniform float uTilt; uniform float uSpin;
uniform int uMat; uniform float uShine; uniform float uRipple; uniform float uShadow; uniform float uAsp; uniform float uRound;
uniform vec3 uCol[8]; uniform int uN; uniform sampler2D uTex2; uniform int uHasTex; uniform sampler2D uDes;
uniform float uTime; uniform int uMotion; uniform float uMotAmt;
uniform float uRefr; uniform float uFrost; uniform float uDisp; uniform float uRim; uniform vec3 uTint; uniform float uTintAmt; uniform float uBody;
uniform int uProj; uniform float uTexSc; uniform float uTexRot; uniform vec2 uTexOff; uniform float uBlend;
float gPh = 0.0;
mat3 rotY(float t) { float c = cos(t), s = sin(t); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float t) { float c = cos(t), s = sin(t); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * float(uN - 1);
  int i = min(int(floor(t)), uN - 2); float f = t - float(i); f = f * f * (3.0 - 2.0 * f);
  return mix(toLab(lin(uCol[i])), toLab(lin(uCol[i + 1])), f);
}
// A square pyramid with its base on y = 0 and a base side of 1 (Inigo Quilez's exact distance).
float sdPyramid(vec3 p, float h) {
  float m2 = h * h + 0.25;
  p.xz = abs(p.xz); p.xz = (p.z > p.x) ? p.zx : p.xz; p.xz -= 0.5;
  vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
  float s = max(-q.x, 0.0), t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0.0, 1.0);
  float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y, b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);
  float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0.0 ? 0.0 : min(a, b);
  return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}
// An octahedron, squashed a little in y so it reads as a cut gem.
float sdOcta(vec3 p, float s) {
  p = abs(p); float m = p.x + p.y + p.z - s; vec3 q;
  if (3.0 * p.x < m) q = p.xyz; else if (3.0 * p.y < m) q = p.yzx; else if (3.0 * p.z < m) q = p.zxy; else return m * 0.57735027;
  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}
float smax(float a, float b, float k) { float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
float sd(vec3 p) {
  float d;
  if (uKind == 0) d = length(p) - 1.0;
  else if (uKind == 1) d = length(vec2(length(p.xz) - 0.72, p.y)) - 0.3;
  else if (uKind == 2) { vec3 q = abs(p) - vec3(0.6); d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.16; }
  else if (uKind == 3) { vec3 q = p; q.y -= clamp(q.y, -0.55, 0.55); d = length(q) - 0.44; }
  // The pyramid's distance only knows its slanted faces; capping it with the base plane keeps rays from
  // slipping through the bottom when it's seen from below.
  // The pyramid is four slanted faces and a base, joined with a smooth maximum so every edge rounds
  // off and the whole form shades as one continuous solid, the base included.
  else if (uKind == 6) {
    vec3 q = vec3(abs(p.x), p.y, abs(p.z));
    float a = 0.894 * q.x + 0.447 * q.y - 0.416, b = 0.894 * q.z + 0.447 * q.y - 0.416, c = -q.y - 0.62;
    d = smax(smax(a, b, 0.06), c, 0.06) - 0.02;
  }
  else if (uKind == 7) d = sdOcta(p * vec3(1.0, 0.82, 1.0), 1.0) - 0.03;
  else d = length(p) - 0.95 + 0.14 * sin(2.6 * p.x + gPh) * sin(2.6 * p.y + gPh * 2.0) * sin(2.6 * p.z - gPh);
  d += uRipple * 0.045 * sin(7.0 * p.x + gPh) * sin(7.0 * p.y - gPh) * sin(7.0 * p.z);
  return d * 0.8;
}
vec2 toPx(vec2 l) { float c = cos(uRot), s = sin(uRot); return uC + mat2(c, s, -s, c) * vec2(l.x, -l.y) * uSz; }
vec4 texAt(vec2 px) { return tex(vec2(px.x / uRes.x, 1.0 - px.y / uRes.y)); }
// The surface picture: the design as it was before any objects (so one never wears another), or the
// preset texture once it's ready.
// Scale, turn and shift the picture on the surface; past its edges it repeats mirrored, so tiles meet
// without a seam.
vec3 skin(vec2 uv) {
  float c = cos(uTexRot), s = sin(uTexRot);
  uv = mat2(c, s, -s, c) * (uv - 0.5) / max(0.05, uTexSc) + 0.5 + uTexOff;
  uv = 1.0 - abs(1.0 - fract(uv * 0.5) * 2.0);
  uv = clamp(uv, 0.002, 0.998); return uMat == 1 || uHasTex == 0 ? texture(uDes, uv).rgb : texture(uTex2, vec2(uv.x, 1.0 - uv.y)).rgb; }
void main() {
  float tw = 6.2831853 * uTime, beat = uMotion == 4 ? pow(0.5 - 0.5 * cos(tw * 4.0), 3.0) : 0.0;
  gPh = uMotion == 3 ? tw : 0.0;
  vec2 C = uC + (uMotion == 3 ? vec2(0.0, 0.04 * uMotAmt * uSz * sin(tw)) : vec2(0.0));
  float S = uSz * (1.0 + 0.08 * uMotAmt * beat), spin = uSpin + (uMotion == 1 ? tw : 0.0);
  vec2 pp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec4 base = tex(vUv);
  float c = cos(uRot), s = sin(uRot);
  vec2 q = mat2(c, -s, s, c) * (pp - C) / S; q.y = -q.y;
  // Contact shadow: a soft ellipse a little below the form, darkening what's underneath.
  vec2 sq = (pp - C - vec2(0.06, 0.95) * S) / (S * vec2(1.0, 0.26));
  base.rgb *= 1.0 - uShadow * 0.5 * exp(-dot(sq, sq) * 1.6);
  mat3 R = rotY(spin) * rotX(uTilt), Ri = transpose(R);
  vec3 ro = vec3(q, 3.0), rd = vec3(0.0, 0.0, -1.0), L = normalize(vec3(-0.6, 0.8, 0.7));
  float px = 1.0 / S;
  if (uKind == 5) {
    // Picture card: a rounded rectangle on a plane, hit by the view ray.
    vec3 n = R * vec3(0.0, 0.0, 1.0);
    if (abs(n.z) < 1e-3) { o = base; return; }
    float t = dot(n, -ro) / dot(n, rd); vec3 lp = Ri * (ro + rd * t);
    vec2 hb = uAsp >= 1.0 ? vec2(1.0, 1.0 / uAsp) : vec2(uAsp, 1.0);
    float rr = uRound * min(hb.x, hb.y) * 0.5, d = sdBox(lp.xy, hb, rr);
    float cov = clamp(0.5 - d / (px / max(0.2, abs(n.z))), 0.0, 1.0);
    if (cov <= 0.0) { o = base; return; }
    vec2 uv = lp.xy / hb * 0.5 + 0.5; if (n.z < 0.0) uv.x = 1.0 - uv.x;
    vec3 col = uHasTex == 1 ? texture(uTex2, vec2(uv.x, 1.0 - uv.y)).rgb : vec3(0.85);
    if (uMat == 4) col = srgb(fromLab(ramp(luma(col))));
    if (uMat == 6) { o = vec4(mix(base.rgb, vec3(0.008), cov), base.a); return; }
    float lit = 0.88 + 0.12 * dot(n * sign(n.z), L), sp = pow(max(0.0, dot(reflect(rd, n * sign(n.z)), L)), 40.0);
    col = col * lit + uShine * 0.5 * sp;
    o = vec4(mix(base.rgb, clamp(col, 0.0, 1.0), cov), base.a); return;
  }
  float t = 0.0, md = 1e9, mt = 0.0;
  float steps = uQ2.x > 0.0 ? uQ2.x : 80.0;
  for (int i = 0; i < 240; i++) { if (float(i) >= steps) break; float d = sd(Ri * (ro + rd * t)); if (d < md) { md = d; mt = t; } if (d < 0.0005 || t > 6.0) break; t += d; }
  float cov = 1.0 - smoothstep(0.0, 1.5 * px, md);
  if (cov <= 0.0) { o = base; return; }
  vec3 pos = ro + rd * mt; vec2 e = vec2(1.0, -1.0) * 0.0015;
  vec3 n = normalize(e.xyy * sd(Ri * (pos + e.xyy)) + e.yyx * sd(Ri * (pos + e.yyx)) + e.yxy * sd(Ri * (pos + e.yxy)) + e.xxx * sd(Ri * (pos + e.xxx)));
  float wrap = dot(n, L) * 0.5 + 0.5, fr = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0), sp = pow(clamp(dot(reflect(rd, n), L), 0.0, 1.0), 32.0);
  vec3 col;
  if (uMat == 0) {
    // A soft top-down falloff and a broad sheen as well as the sharp highlight, so flat faces shade with
    // the same gradient curved forms get instead of reading as single flat colors.
    vec3 lab = ramp(clamp(0.1 + 0.75 * wrap * wrap + 0.18 * fr + 0.1 * pos.y, 0.0, 1.0));
    lab.x += 0.3 * sp * uShine + 0.08 * uShine * pow(clamp(dot(reflect(rd, n), L), 0.0, 1.0), 4.0);
    col = srgb(fromLab(lab));
  } else if (uMat == 6) {
    // Vantablack: flat black that swallows the light, with only a hairline of sheen on the rim so the
    // silhouette holds against dark grounds.
    col = vec3(0.008) + vec3(0.06) * uShine * pow(fr, 3.0);
  } else if (uMat == 3) {
    // Glass: what's behind bends through the form, most at the edges where the surface turns away, as
    // in a liquid glass pill. Frost blurs it, dispersion splits red from blue along the bend, the rim
    // catches light on the edge facing it, and a tint colors the body.
    vec2 off = n.xy * vec2(1.0, -1.0) * S * 0.45 * uRefr * (0.25 + fr * 1.5);
    float tir = 0.0;
    if (uBody > 0.5) {
      // Through the body: the view ray bends entering the surface, crosses the inside to where it leaves,
      // bends again on the way out and lands on the picture a little behind the form. So a ball turns
      // what's behind it over, edges squeeze the most into a thin rim, and where the ray can't get out
      // (total internal reflection) the edge takes the light of the rim instead.
      // The index rises quickly at first and levels off toward real glass, so high settings stay readable.
      float ior = 1.0 + 0.45 * (1.0 - exp(-max(0.05, uRefr)));
      vec3 r1 = refract(rd, n, 1.0 / ior), pin = pos - n * 0.004; float ti = 0.0;
      float lo = 0.0;
      for (int i = 0; i < 64; i++) { float d = -sd(Ri * (pin + r1 * ti)); if (d < 0.0006) break; lo = ti; ti += max(d, 0.004); }
      // The last step can overshoot the far wall, so close in on it; a wider normal there keeps thin
      // parts and edges from scattering neighbouring pixels across the picture.
      for (int i = 0; i < 5; i++) { float m = 0.5 * (lo + ti); if (-sd(Ri * (pin + r1 * m)) < 0.0006) ti = m; else lo = m; }
      vec3 pe = pin + r1 * ti; vec2 e2 = e * 4.0;
      vec3 n2 = normalize(e2.xyy * sd(Ri * (pe + e2.xyy)) + e2.yyx * sd(Ri * (pe + e2.yyx)) + e2.yxy * sd(Ri * (pe + e2.yxy)) + e2.xxx * sd(Ri * (pe + e2.xxx)));
      // Near the critical angle the way out blends into the reflection over a short range instead of
      // switching, which flickered as the form turned.
      float cs = dot(r1, n2), kk = 1.0 - ior * ior * (1.0 - cs * cs);
      float wt = smoothstep(0.0, 0.12, kk); tir = 1.0 - wt;
      vec3 r2 = normalize(mix(reflect(r1, -n2), refract(r1, -n2, ior), wt));
      // The picture sits just behind the form. (A plane far behind it threw small bends across the whole
      // picture, which broke into flat patches and sparkle.)
      vec2 hit = pe.xy + r2.xy * ((-1.25 - pe.z) / min(r2.z, -0.3));
      off = vec2(hit.x - q.x, -(hit.y - q.y)) * S;
      // A soft limit on how far a ray can land, so nothing samples past the picture's edge.
      float ol = length(off), om = S * 0.6; off *= om * tanh(ol / om) / max(ol, 1e-4);
    }
    vec2 bp = pp + mat2(c, s, -s, c) * off, sx = mat2(c, s, -s, c) * normalize(off + 1e-4) * (0.5 + 6.0 * uDisp) * (0.2 + fr) * S * 0.02;
    // Where the body squeezes a wide stretch of the picture into one pixel, blur over that stretch so
    // fine lines behind it soften instead of breaking into sparkle.
    float fp = uBody > 0.5 ? min(length(dFdx(off)) + length(dFdy(off)), S * 0.08) : 0.0;
    float fr2 = max(uFrost * S * 0.12, fp * 0.6), fn = uQ.w > 0.0 ? uQ.w : 8.0; vec3 acc = vec3(0.0);
    for (int k = 0; k < 32; k++) {
      if (float(k) >= fn) break;
      float a = float(k) * 2.39996, r = fr2 * sqrt((float(k) + 0.5) / fn); vec2 j = r * vec2(cos(a), sin(a));
      acc += vec3(texAt(bp + j + sx).r, texAt(bp + j).g, texAt(bp + j - sx).b);
    }
    col = acc / fn;
    col = mix(col, vec3(1.0), tir * 0.35);
    col = mix(col, col * uTint, uTintAmt);
    float rim = pow(1.0 - abs(n.z), 4.0), face = clamp(dot(n.xy, vec2(-0.6, 0.8)), 0.0, 1.0);
    col = mix(col, vec3(1.0), 0.04 + 0.28 * fr) + uRim * rim * (0.25 + 0.75 * face) * 0.7 + uShine * 0.8 * sp;
  } else {
    // The design or the preset is wrapped onto the form, the whole picture across each side, so it turns
    // with the form and never lines up with what's behind it (which would read as a see-through window).
    vec3 sp3 = Ri * pos, nl = Ri * n, alb;
    if (uProj == 1) alb = skin(sp3.xy * 0.5 + 0.5);
    else if (uProj == 2) {
      // Around a globe: longitude mirrors at the front and back, so there's no seam where it closes.
      vec3 d = normalize(sp3);
      alb = skin(vec2(abs(atan(d.x, d.z)) / 3.14159265, 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265));
    } else if (uKind == 6 || uKind == 7) {
      // Faceted forms: their slanted faces sit between the three axes, where a triplanar blend would
      // stack three copies of the texture. Each face takes one projection along its own normal instead.
      vec3 up = abs(nl.y) < 0.97 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 tu = normalize(cross(up, nl)), tv = cross(nl, tu);
      alb = skin(vec2(dot(sp3, tu), dot(sp3, tv)) * 0.5 + 0.5);
    } else {
      // Triplanar with a sharp blend: each side shows one projection, mixing only across the rounded edges.
      vec3 w = pow(abs(nl), vec3(mix(16.0, 1.5, uBlend))); w /= w.x + w.y + w.z;
      vec3 tp = sp3 * 0.5 + 0.5;
      alb = skin(tp.zy) * w.x + skin(tp.xz) * w.y + skin(tp.xy) * w.z;
    }
    col = alb * (0.42 + 0.72 * wrap) + vec3(0.18 * fr) + uShine * 0.55 * sp;
  }
  o = vec4(mix(base.rgb, clamp(col, 0.0, 1.0), cov), base.a);
}`,

    // Min and max of the field, four by four texels per pass until one is left.
    fminmax: `
uniform int uFirst; uniform ivec2 uIn;
void main() {
  ivec2 b = ivec2(floor(gl_FragCoord.xy)) * 4; float lo = 1e30, hi = -1e30;
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
    ivec2 q = b + ivec2(i, j); if (q.x >= uIn.x || q.y >= uIn.y) continue;
    vec4 t = texelFetch(uTex, q, 0); lo = min(lo, t.r); hi = max(hi, uFirst == 1 ? t.r : t.g);
  }
  o = vec4(lo, hi, 0.0, 1.0);
}`,

    // The union of the level ranges sampled round the loop, padded a little on both sides.
    frange: `
uniform ivec2 uIn; uniform float uPad;
void main() {
  float lo = 1e30, hi = -1e30;
  for (int i = 0; i < 16; i++) { if (i >= uIn.x) break; vec4 t = texelFetch(uTex, ivec2(i, 0), 0); lo = min(lo, t.r); hi = max(hi, t.g); }
  float pad = (hi - lo) * uPad;
  o = vec4(lo - pad, hi + pad, 0.0, 1.0);
}`,

    // Glide: the field a loop's travel behind fades into the current one, so the loop lands on its first frame.
    fmix: `
// Two unrelated noise fields averaged are flatter than either, so noise patterns are stretched back out about
// the middle of their range (uDes) and the lines keep their spacing through the fade. Straight-line patterns
// are the same plane shifted, and a plain mix is already right for them.
uniform sampler2D uTex2; uniform sampler2D uDes; uniform float uW; uniform float uLin;
void main() {
  ivec2 c = ivec2(floor(gl_FragCoord.xy)); float v = mix(texelFetch(uTex, c, 0).r, texelFetch(uTex2, c, 0).r, uW);
  vec2 r = texelFetch(uDes, ivec2(0), 0).rg; float mid = 0.5 * (r.x + r.y);
  if (uLin < 0.5) v = mid + (v - mid) / sqrt((1.0 - uW) * (1.0 - uW) + uW * uW);
  o = vec4(v, 0.0, 0.0, 1.0);
}`,

    // Separable Gaussian on the field grid: the GPU stand-in for smoothing each contour line.
    fblur: `
uniform vec2 uDir2; uniform float uSigma; uniform ivec2 uIn;
void main() {
  ivec2 c = ivec2(floor(gl_FragCoord.xy)); int r = int(min(64.0, ceil(uSigma * 3.0)));
  float s = 0.0, wsum = 0.0;
  for (int i = -64; i <= 64; i++) {
    if (i < -r || i > r) continue;
    // Past the edge the field is point-reflected (2·edge − mirror), as the SVG smoothing does, so a
    // straight field stays straight to the edge instead of bending where it was clamped.
    ivec2 q = c + ivec2(uDir2) * i, e = clamp(q, ivec2(0), uIn - 1);
    float v = texelFetch(uTex, e, 0).r;
    if (q != e) v = 2.0 * v - texelFetch(uTex, clamp(2 * e - q, ivec2(0), uIn - 1), 0).r;
    float w = exp(-float(i * i) / (2.0 * uSigma * uSigma)); s += w * v; wsum += w;
  }
  o = vec4(s / wsum, 0.0, 0.0, 1.0);
}`,

    // Gaussian blur of brightness (first pass) or of the previous pass, for the liquid metal height.
    hblur: `
uniform vec2 uDir2; uniform float uSigma; uniform int uFirst;
void main() {
  int r = int(min(48.0, ceil(uSigma * 2.6))); float s = 0.0, wsum = 0.0; vec2 st = uDir2 / uRes;
  for (int i = -48; i <= 48; i++) {
    if (i < -r || i > r) continue;
    vec4 t = tex(vUv + st * float(i)); float w = exp(-float(i * i) / (2.0 * uSigma * uSigma));
    s += w * (uFirst == 1 ? luma(t.rgb) : t.r); wsum += w;
  }
  o = vec4(s / wsum, 0.0, 0.0, 1.0);
}`,

    // Contours shaded straight from the field: lines, bands, stacked layers or shaded bands, antialiased
    // by the field's own slope, with the canvas edge cutting regions cleanly.
    contours: `
uniform sampler2D uTex2; uniform vec2 uCell; uniform ivec2 uIn; uniform vec2 uDesign; uniform vec2 uShift;
uniform int uMode; uniform float uLin; uniform float uGap; uniform float uPh; uniform float uLevels; uniform float uG;
uniform float uWeight; uniform float uEvery; uniform float uIdxW; uniform float uBand; uniform float uBlend;
uniform vec3 uInk[8]; uniform int uNInk; uniform vec3 uBg; uniform float uClear; uniform float uOpacity; uniform float uAng;
float F(ivec2 q) { return texelFetch(uTex, clamp(q, ivec2(0), uIn - 1), 0).r; }
float cr(float a, float b, float c, float d, float t) { return b + 0.5 * t * (c - a + t * (2.0 * a - 5.0 * b + 4.0 * c - d + t * (3.0 * (b - c) + d - a))); }
float field(vec2 g) {
  vec2 i = floor(g), t = g - i; ivec2 b = ivec2(i);
  float r[4];
  for (int j = 0; j < 4; j++) r[j] = cr(F(b + ivec2(-1, j - 1)), F(b + ivec2(0, j - 1)), F(b + ivec2(1, j - 1)), F(b + ivec2(2, j - 1)), t.x);
  return cr(r[0], r[1], r[2], r[3], t.y);
}
float fmin, fmax, span;
float rOf(float v) {
  if (uLin > 0.5) return v / uGap - uPh;
  float tn = clamp((v - fmin) / span, 0.0, 1.0);
  return (uLevels + 1.0) * pow(tn, 1.0 / uG) - uPh;
}
float tOf(float idx) { return uLin > 0.5 ? (idx + uPh) * uGap : fmin + pow((idx + uPh) / (uLevels + 1.0), uG) * span; }
vec2 range() {
  if (uLin > 0.5) { float a = floor(fmin / uGap - uPh); if ((a + uPh) * uGap <= fmin) a += 1.0; float b = ceil(fmax / uGap - uPh); if ((b + uPh) * uGap >= fmax) b -= 1.0; return vec2(a, b); }
  float a = -ceil(uPh) + 1.0; if (a + uPh <= 0.0) a += 1.0;
  float b = uLevels; if (b + uPh >= uLevels + 1.0) b -= 1.0;
  return vec2(a, b);
}
vec3 ink(float idx, float i0, bool blend) {
  float pos = clamp((tOf(idx) - fmin) / span, 0.0, 1.0);
  if (uNInk == 2 && !blend) return uInk[0];
  if (!blend) { int k = int(mod(idx - i0, float(uNInk))); return uInk[k]; }
  float f = pos * float(uNInk - 1); int k = min(uNInk - 2, int(floor(f)));
  return mix(uInk[k], uInk[k + 1], f - float(k));
}
vec2 rg;
vec4 layer(float n) { return n < rg.x ? vec4(uBg, 0.0) : vec4(ink(min(n, rg.y), rg.x, true), 1.0); }
vec3 inkAt(float pos) {
  float f = clamp(pos, 0.0, 1.0) * float(uNInk - 1); int k = min(uNInk - 2, int(floor(f)));
  return mix(uInk[k], uInk[k + 1], f - float(k));
}
void main() {
  vec4 mm = texelFetch(uTex2, ivec2(0), 0); fmin = mm.r; fmax = mm.g; span = max(1e-9, fmax - fmin);
  vec2 dp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * uDesign / uRes;
  float r = rOf(field(dp / uCell + uShift));
  float gr = max(1e-6, length(vec2(dFdx(r), dFdy(r))));
  rg = range();
  vec3 col = uBg; float a = 0.0;
  if (uMode == 0) {
    float idx = floor(r + 0.5);
    if (idx >= rg.x && idx <= rg.y) {
      bool major = uEvery > 0.5 && mod(idx, uEvery) < 0.5;
      // Exact coverage of a one-pixel box by the stroke, so hairlines fade instead of breaking up.
      float sw = uWeight * (major ? uIdxW : 1.0) * uRes.x / uDesign.x, d = abs(r - idx) / gr;
      a = clamp(min(d + 0.5, sw * 0.5) - max(d - 0.5, -sw * 0.5), 0.0, 1.0);
      // Where lines crowd closer than a few pixels, each pixel would hit or miss one at random. Those
      // stretches fade to the share of the area the lines cover, which is what the eye sees anyway.
      a = mix(a, min(1.0, sw * gr), smoothstep(0.22, 0.5, gr));
      col = ink(idx, 1.0, uBlend > 0.5);
    }
  } else if (uMode == 2) {
    // Layers: each contour stacks its color on everything above it.
    float idx = floor(r), f = r - idx;
    vec4 c = mix(layer(idx - 1.0), layer(idx), clamp(f / gr + 0.5, 0.0, 1.0));
    c = mix(c, layer(idx + 1.0), clamp((f - 1.0) / gr + 0.5, 0.0, 1.0));
    col = c.rgb; a = c.a;
  } else {
    // Bands: from each contour part way to the next, measured on the field like the SVG renderer.
    float idx = floor(r);
    for (int k = 0; k <= 1; k++) {
      float id = idx + float(k);
      if (id < rg.x || id > rg.y) continue;
      float t0 = tOf(id), t1 = id + 1.0 <= rg.y ? tOf(id + 1.0) : 2.0 * t0 - tOf(id - 1.0);
      float top = rOf(t0 + uBand * (t1 - t0)) - id, fr = r - id;
      float cov = mix(clamp(min(fr, top - fr) / gr + 0.5, 0.0, 1.0), uBand, smoothstep(0.3, 0.7, gr));
      if (cov > a) {
        a = cov;
        if (uMode == 3) {
          float th = radians(-uAng + 90.0), x = dot(dp / uDesign - 0.5, vec2(cos(th), sin(th))) + 0.5;
          float dq = 1.5 / max(2.0, rg.y - rg.x + 1.0);
          col = inkAt((t0 - fmin) / span + dq * (2.0 * x - 1.0));
        } else {
          // Colors go by each level's own number, counted from the first level a still frame shows, so
          // as Breathe slides the levels the colors travel with them instead of all switching at once.
          float i0 = 1.0;
          if (uLin > 0.5) { i0 = floor(fmin / uGap); if (i0 * uGap <= fmin) i0 += 1.0; }
          col = ink(id, i0, uBlend > 0.5);
        }
      }
    }
  }
  a *= uOpacity;
  if (uClear > 0.5) o = vec4(col, a);
  else o = vec4(mix(uBg, col, a), 1.0);
}`,

    gradient: COLOR + `
uniform int uType; uniform int uN; uniform vec3 uCol[8]; uniform vec2 uPt[8];
uniform float uWarp; uniform float uWarpScale; uniform float uSoft; uniform float uAngle;
uniform float uScale; uniform float uDetail; uniform float uStretch; uniform float uContrast; uniform int uNoise;
// Motion (all loop over uTime 0..1): 1 drift, 2 color flow, 3 breathe, 4 pulse.
uniform float uTime; uniform int uMotion; uniform float uMotAmt; uniform float uEndless;
// Path (uPath): 0 orbit, the read points circling; 1 sway, back and forth along uMDir; 2 glide, travelling
// on along uMDir (uGLin, how far along). Glide never turns back, so render draws the frame twice, a loop's
// travel apart, and fades from one to the other over the loop: each frame is where the first was headed,
// and the last is the first. (Drawing both here would double the shader, and its compile time with it.)
uniform int uPath; uniform vec2 uMDir; uniform float uGLin;
// Flow and noise glide on their fields instead of their colors: stage 1 writes the field, and stage 2 blends
// the two fields (uTex, uTex2) with weight uGW and colors the blend. Their spread is kept up through the
// blend (as the contour engine does), so the pattern morphs across the loop instead of two pictures
// showing through each other.
uniform sampler2D uTex2; uniform int uGStage; uniform float uGW;
vec2 mloop(float tw, float ph) { return uPath == 1 ? uMDir * sin(tw + ph) : uPath == 2 ? uMDir * uGLin * 2.0 : vec2(cos(tw + ph), sin(tw + ph)); }
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
// A short simplex fbm for warping, about -1..1.
float wfbm(vec2 p) { return snoise(p) * 0.57 + snoise(p * 2.03 + vec2(17.3, 9.1)) * 0.29 + snoise(p * 4.1 + vec2(3.7, 41.2)) * 0.14; }
float sfbm(vec2 p) { float a = 0.5, r = 0.0; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; r += a * snoise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; } return r; }
// Neuro: rotated layers of summed sines that knot into glowing, web-like filaments.
float neuro(vec2 uv) {
  vec2 acc = vec2(0.0), res = vec2(0.0); float sc = 8.0; mat2 rot = mat2(0.5403, 0.8415, -0.8415, 0.5403);
  for (int j = 0; j < 15; j++) { uv = rot * uv; acc = rot * acc; vec2 layer = uv * sc + float(j) + acc; acc += sin(layer); res += (0.5 + 0.5 * cos(layer)) / sc; sc *= 1.2; }
  return res.x + res.y;
}
vec2 cellPt(vec2 c) { return vec2(hash(c), hash(c + 19.19)); }
vec2 worley(vec2 p) {
  vec2 i = floor(p), f = fract(p); float f1 = 8.0, f2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); float d = length(g + cellPt(i + g) - f); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
  return vec2(f1, f2);
}
vec3 ramp(float t) {
  // Breathe: the colors sway in and out along the ramp. Blends lean on it fully; noise and mesh only
  // a touch, since they breathe mostly by swelling (below), and a big sway there reads as flicker.
  if (uMotion == 2) t += (uType >= 1 && uType <= 3 ? 0.18 : 0.05) * uMotAmt * sin(6.2831853 * uTime);
  t = clamp(t, 0.0, 1.0) * float(uN - 1);
  int i = min(int(floor(t)), uN - 2); float f = t - float(i); f = f * f * (3.0 - 2.0 * f);
  return mix(toLab(lin(uCol[i])), toLab(lin(uCol[i + 1])), f);
}
// Paint's flow: the curl of two octaves of noise, so it swirls without bunching up. Chaos tightens the
// finer octave and gives it more weight.
vec2 paintVel(vec2 q, float ch, vec4 L) {
  const float e = 0.02;
  vec2 o1 = q * mix(0.45, 0.55, ch) + L.xy * 0.25, o2 = q * mix(0.95, 1.3, ch) + vec2(7.3, 2.1) + L.zw * 0.25;
  float n1 = snoise(o1), n2 = snoise(o2);
  vec2 g1 = vec2(snoise(o1 + vec2(e, 0.0)) - n1, snoise(o1 + vec2(0.0, e)) - n1) / e;
  vec2 g2 = vec2(snoise(o2 + vec2(e, 0.0)) - n2, snoise(o2 + vec2(0.0, e)) - n2) / e;
  return vec2(g1.y, -g1.x) + mix(0.3, 0.45, ch) * vec2(g2.y, -g2.x);
}
// Paint on the GPU path runs as a few passes, the way the drag trails move their smoke. Stage 1 lays
// the paint down as broad stripes in a texture a little larger than the frame (uPDom: its corner and
// size in frame units). Each later stage traces every pixel back a few steps through the flow and reads
// the paint there from the last pass, with smooth texture filtering, so paint squeezed finer than a
// pixel blends into its neighbours instead of breaking into noise. Stage 3 writes the frame itself.
uniform int uPStage; uniform vec4 uPDom; uniform float uPSub; uniform float uPAsp; uniform float uPCell; uniform float uPCellNow;
float paintCh() { return clamp(uWarpScale, 0.0, 1.0) * 0.7; }
float paintZoom() { return uScale * mix(1.0, 1.6, paintCh()); }
vec2 paintOff() { float s = mod(uSeed, 97.0); return vec2(sin(s * 3.1), cos(s * 1.7)) * 9.0; }
vec2 paintQ(vec2 p) { return (p - 0.5) * vec2(uPAsp, 1.0) * paintZoom() + paintOff(); }
vec2 paintP(vec2 q) { return (q - paintOff()) / (vec2(uPAsp, 1.0) * paintZoom()) + 0.5; }
// The flow eases to a stop across the margin, like the wall of a marbling bath, so no paint ever has to
// arrive from beyond the texture.
// It fades the flow's stream function rather than its speed, so the flow stays free of sources and sinks
// and paint never piles up against the wall.
// Moving, the paint is stirred further along this same flow and back again over each loop, the swirls
// winding in and easing out, so every frame carries the paint along its own path and the loop closes.
float paintPsi(vec2 q, float ch) {
  float s1 = mix(0.45, 0.55, ch), s2 = mix(0.95, 1.3, ch);
  vec2 p = paintP(q), out2 = max(max(-p, p - 1.0), 0.0);
  return (snoise(q * s1) / s1 + mix(0.3, 0.45, ch) * snoise(q * s2 + vec2(7.3, 2.1)) / s2) * smoothstep(-uPDom.x, 0.0, max(out2.x, out2.y));
}
vec2 paintFlow(vec2 q, float ch) {
  const float e = 0.01;
  float c = paintPsi(q, ch);
  return vec2(paintPsi(q + vec2(0.0, e), ch) - c, -(paintPsi(q + vec2(e, 0.0), ch) - c)) / e;
}
vec2 paintBack(vec2 q, float n) {
  float ch = paintCh(), st = uMotion != 0 && uMotion != 2 ? 1.0 + 0.7 * uMotAmt * (0.5 - 0.5 * cos(6.2831853 * uTime)) : 1.0;
  float dt = st * uWarp * mix(0.35, 0.9, ch) / floor(clamp(uDetail, 1.0, 8.0) * 4.0 + 0.5);
  for (int i = 0; i < 32; i++) {
    if (float(i) >= n) break;
    vec2 m = q - 0.5 * dt * paintFlow(q, ch);
    q -= dt * paintFlow(m, ch);
  }
  return q;
}
// Cells, like an acrylic pour: round spots of another color in a dark lacy rim, gathered in clusters,
// two sizes of them. They are dropped in late in the flow, so the rest of it stretches them
// into ovals and teardrops.
vec4 paintCells(vec2 q) {
  float dk = 1e3; vec3 dark = vec3(0.0);
  for (int i = 0; i < 8; i++) { if (i >= uN) break; vec3 l = toLab(lin(uCol[i])); if (l.x < dk) { dk = l.x; dark = l; } }
  float clus = smoothstep(-0.3, 0.5, snoise(q * 0.55 + 11.3)), px = length(fwidth(q)), best = 1e3, rimW = 0.0, core = 0.0, hc = 0.0; vec3 col = dark;
  for (int lv = 0; lv < 3; lv++) {
    float G = lv == 0 ? 0.13 : lv == 1 ? 0.065 : 0.032, den = uPCell * clus * (lv == 0 ? 0.8 : lv == 1 ? 1.0 : 1.2);
    vec2 id0 = floor(q / G);
    for (int j = 0; j < 9; j++) {
      vec2 id = id0 + vec2(j % 3 - 1, j / 3 - 1), hh = vec2(hash(id + float(lv) * 17.0), hash(id + 5.3 + float(lv) * 17.0));
      if (hash(id + 9.1 + float(lv) * 3.0) > den) continue;
      vec2 c = (id + 0.5 + (hh - 0.5) * 0.6) * G;
      float r = G * (0.18 + 0.24 * hh.x), d = length(q - c) - r;
      if (d < best) { best = d; rimW = r * 0.35; core = r; hc = hh.y; col = ramp(fract(hh.y * 7.31)); }
    }
  }
  // Some cells hold a smaller cell of another color inside them.
  if (hc > 0.55) col = mix(col, ramp(fract(hc * 13.7)), smoothstep(px, -px, best + core * 0.55));
  float inner = smoothstep(px, -px, best), rim = smoothstep(px, -px, best - rimW);
  return vec4(mix(dark, col, inner), rim);
}
// The paint as first laid down: broad bands of the palette with finer streaks inside them, in Lab.
// Moving, the bands slide a whole number of stripes per loop, so the paint flows along its veins.
vec3 paintSeed(vec2 q) {
  float ca = cos(uAngle), sa = sin(uAngle), mv = uMotion == 2 ? uTime * max(1.0, floor(uMotAmt * 2.0 + 0.5)) : 0.0;
  float d = dot(q, vec2(ca, sa)) * uStretch * 0.35 + 0.35 * snoise(q * 0.8 + 3.3) + mv;
  float df = d * 4.0 + 0.4 * snoise(q * 1.8), dv = d * 9.0 + 0.6 * snoise(q * 3.1 + 5.0), vc = clamp(uContrast, 0.0, 1.0);
  float tri = clamp(abs(fract(d) * 2.0 - 1.0) * (1.0 - 0.55 * vc) + abs(fract(df) * 2.0 - 1.0) * 0.35 * vc + abs(fract(dv) * 2.0 - 1.0) * 0.2 * vc, 0.0, 1.0);
  float N = float(uN - 1), x = tri * N, kk = min(floor(x), N - 1.0), f = x - kk, h = max(0.5 * clamp(uSoft, 0.02, 1.0), fwidth(x) * 0.75);
  return ramp((kk + smoothstep(0.5 - h, 0.5 + h, f)) / N);
}
// Folds. Every sheet's front edge sweeps in one shared curve toward a side (curve) and then strays from it
// on its own wave (wave, wavelength; jag adds finer, sharper wiggles), so neighbours overlap and cross.
uniform float uPrism; vec2 gL1 = vec2(0.0), gL2 = vec2(0.0);
float foldCurve(float y) { return uWarpScale * 0.6 * y * y; }
float foldEdge(float i, float y, float sp, float sd) {
  float h = hash(vec2(i, sd)), f = 1.2 / max(uStretch, 0.05), w = 0.0, amp = 1.0, q = 1.0;
  for (int k = 0; k < 6; k++) { if (float(k) >= clamp(uDetail, 1.0, 6.0)) break; w += amp * snoise(vec2(y * f * q * (0.8 + 0.4 * h) + i * 1.7 + gL1.x * 0.4, i * 0.31 + sd + float(k) * 3.1 + gL1.y * 0.4)); amp *= 0.5; q *= 2.3; }
  return i * sp + foldCurve(y) * (0.85 + 0.3 * h) + sp * (0.5 * (h - 0.5) + uWarp * 0.7 * w);
}
// A sheet's tone at x: across its width it bends like a shallow cylinder, so it reflects a strip of light
// that slides along its length; it shades darker into the shadow of the sheet over it and catches a thin
// rim on its own front edge (rim). Softness widens the light and the shadow. Prism splits the highlight
// into red and blue, so it comes out in three tones, one per channel.
vec3 foldTone(float i, float x, float y, float sp, float sd, float fw) {
  float u = x - foldEdge(i, y, sp, sd), dn = 1e3;
  for (int k = 1; k < 5; k++) dn = min(dn, foldEdge(i + float(k), y, sp, sd) - x);
  float sf = clamp(uSoft, 0.0, 1.0), t = u / (sp * 1.6), h = hash(vec2(i, sd + 7.0));
  float hp = 0.45 + 0.4 * snoise(vec2(y * 0.5 / max(uStretch, 0.05) + i * 0.37 + gL2.x * 0.5, sd + i * 0.11 + gL2.y * 0.5)), hw = mix(0.06, 0.32, sf), d = uPrism * 0.07;
  float lit = pow(0.55 + 0.45 * snoise(vec2(y * 0.35 + sd, i * 0.53)), 2.0) * 1.2;
  float base = (0.1 + 0.3 * h) * mix(1.0, 1.0 - clamp(t, 0.0, 1.0) * 0.7, 0.6 + 0.4 * sf);
  float shade = 1.0 - 0.85 * exp(-max(dn, 0.0) / (sp * mix(0.12, 0.5, sf)));
  float rim = clamp(uContrast, 0.0, 1.5) * 0.9 * exp(-max(u, 0.0) / max(fw * 1.5, sp * mix(0.012, 0.3, sf * sf)));
  vec3 hl = exp(-pow((vec3(t) - hp - vec3(d, 0.0, -d)) / hw, vec3(2.0)));
  return clamp((base + 0.95 * hl * lit) * shade + rim, 0.0, 1.0);
}
void gradMain() {
  if (uGStage == 2) {
    float w = uGW, v = 0.5 + (mix(texture(uTex, vUv).r, texture(uTex2, vUv).r, w) - 0.5) / length(vec2(1.0 - w, w));
    o = vec4(srgb(fromLab(ramp(clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0)))), 1.0); return;
  }
  if (uPStage > 0) {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y), p = uPStage == 3 ? uv : uPDom.xy + uv * uPDom.zw;
    if (uPStage == 1) { o = vec4(paintSeed(paintQ(p)), 1.0); return; }
    vec2 q = paintBack(paintQ(p), uPSub), pb = paintP(q), tu = (pb - uPDom.xy) / uPDom.zw;
    // Where the flow squeezes several texels of the last pass into this pixel, average over that patch, so
    // fine streaks blend instead of beating against the pixel grid.
    vec2 ts = vec2(textureSize(uTex, 0)), tv = vec2(tu.x, 1.0 - tu.y), jx = dFdx(tv), jy = dFdy(tv);
    float nx = clamp(ceil(length(jx * ts)), 1.0, 4.0), ny = clamp(ceil(length(jy * ts)), 1.0, 4.0);
    vec3 lab = vec3(0.0);
    for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
      if (float(i) >= nx || float(j) >= ny) continue;
      lab += texture(uTex, clamp(tv + jx * ((float(i) + 0.5) / nx - 0.5) + jy * ((float(j) + 0.5) / ny - 0.5), 0.0, 1.0)).rgb;
    }
    lab /= nx * ny;
    if (uPCellNow > 0.5 && uPCell > 0.0) { vec4 ce = paintCells(paintQ(p)); lab = mix(lab, ce.rgb, ce.a); }
    o = uPStage == 3 ? vec4(srgb(fromLab(lab)), 1.0) : vec4(lab, 1.0); return;
  }
  vec2 a = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  float tw = 6.2831853 * uTime;
  vec2 drift = uMotion == 1 ? uMotAmt * mloop(tw, 0.0) : vec2(0.0);
  // Breathe: the warp is read from points travelling round two loops (whole turns only), so the field
  // morphs forward the whole time and lands back on its first frame without reversing.
  bool br = uMotion == 3;
  // Pulse: four soft beats per loop push the field out from the center, while it morphs a little.
  // Flow's read points move slowly: at full amplitude the field still only morphs gently.
  float beat = uMotion == 4 ? pow(0.5 - 0.5 * cos(tw * 4.0), 3.0) : 0.0, lm = br ? 0.3 : uMotion == 4 ? 0.4 : 0.0;
  // Endless Flow adds turns at irrational rates, so the read points never close their path.
  // Its extra turns are slower than the main one so they never cancel it (no stalls); Unbound (2) also
  // travels steadily on through the noise, faster than it circles.
  float en = min(uEndless, 1.0), ub = uEndless > 1.5 ? 1.3 * tw : 0.0;
  vec2 L1 = lm * 1.5 * uMotAmt * (mloop(tw, 0.0) + en * (0.5 * vec2(cos(tw * 0.618 + 1.3), sin(tw * 0.618 + 0.7)) + 0.3 * vec2(cos(tw * 0.414 + 2.1), sin(tw * 0.414 + 0.4))) + ub * vec2(0.8, 0.6));
  // Both read points travel at a constant speed, so the morph never hurries through part of the loop.
  vec2 L2 = lm * 1.5 * uMotAmt * (mloop(tw, -0.2708) + en * (0.5 * vec2(sin(tw * 0.618 + 0.4), -cos(tw * 0.618 + 2.1)) + 0.3 * vec2(sin(tw * 0.414 + 1.1), -cos(tw * 0.414 + 0.3))) + ub * vec2(-0.6, 0.8));
  p = 0.5 + (p - 0.5) * (1.0 - 0.07 * uMotAmt * beat);
  gL1 = L1; gL2 = L2;
  if (uType == 7) {
    // Wave, after Framer's Wave Gradient shader (the background of caddis.app): four colors in two soft
    // crossing blends, read through a field that a sine wave twists, so broad bands of color fold and
    // ripple through each other. Frequency and ripples set the wave across and along its angle, twist
    // how far it turns the field, softness its edges, and blend how much of the twist shows. Moving, the
    // wave travels a whole number of periods per loop.
    float s = mod(uSeed, 100.0), wt = uMotion != 0 ? tw * max(1.0, floor(uMotAmt * 2.0 + 0.5)) : 0.0;
    vec2 tuv = p - 0.5;
    float deg = 0.5 + 0.5 * snoise(vec2(tuv.x * tuv.y, 0.0) + vec2(sin(s * 4.37), cos(s * 5.91)) * 10.0 + (uMotion != 0 ? 0.25 * uMotAmt * mloop(tw, 0.0) : vec2(0.0)));
    float rr = radians((deg - 0.5) * 720.0 + 180.0);
    tuv.y /= a.x; tuv = mat2(cos(rr), sin(rr), -sin(rr), cos(rr)) * tuv; tuv.y *= a.x;
    vec2 w = (2.0 * p - 1.0) * a / (a.x + 1.0) * 2.0;
    float pr = fract(sin(s * 5.63) * 173.29) * 6.2832;
    w = mat2(cos(pr), -sin(pr), sin(pr), cos(pr)) * w;
    float wa = uAngle + radians(sin(s * 2.73) * 30.0);
    vec2 r = mat2(cos(wa), -sin(wa), sin(wa), cos(wa)) * w;
    float fx = uScale * (1.0 + 0.5 * sin(s * 3.17 + uScale)), fy = uStretch * (1.0 + 0.5 * sin(s * 3.17 + uStretch));
    float px = fract(sin(s * 7.19) * 437.58) * 6.2832, py = fract(cos(s * 3.41) * 291.37) * 6.2832;
    float ww = fy * r.y - sin(r.x * fx + r.y - wt + px) + sin(s * 1.23) * 0.5 * sin(r.x * fx * 2.0 + r.y * 0.5 + wt + py);
    ww = smoothstep(cos(ww) * uSoft, sin(ww) * uSoft + 3.0, cos(ww - fy * r.y) - sin(ww - fx * r.x)) * uWarp;
    vec2 wv = (cos(ww) * w + sin(ww) * vec2(-w.y, w.x)) * 0.5;
    vec2 b = mix(tuv, wv, clamp(uContrast, 0.0, 1.0));
    float r1 = radians(-5.0 + sin(s * 1.83) * 20.0), r2 = radians(10.0 + cos(s * 2.47) * 20.0);
    // Four colors: the palette's own when it has exactly four, otherwise four steps along its ramp.
    vec3 c0, c1, c2, c3;
    if (uN == 4) { c0 = uCol[0]; c1 = uCol[1]; c2 = uCol[2]; c3 = uCol[3]; }
    else { c0 = srgb(fromLab(ramp(0.0))); c1 = srgb(fromLab(ramp(1.0 / 3.0))); c2 = srgb(fromLab(ramp(2.0 / 3.0))); c3 = srgb(fromLab(ramp(1.0))); }
    vec3 l1 = mix(c0, c2, smoothstep(-0.3, 0.3, (mat2(cos(r1), sin(r1), -sin(r1), cos(r1)) * b).x));
    vec3 l2 = mix(c3, c1, smoothstep(-0.3, 0.3, (mat2(cos(r2), sin(r2), -sin(r2), cos(r2)) * b).x));
    vec3 col = mix(l1, l2, smoothstep(0.3, -0.3, b.y));
    col = mix(col, col * col + 0.5 * sqrt(col), 0.3);
    o = vec4(clamp(col, 0.0, 1.0), 1.0); return;
  }
  if (uType == 8) {
    // Paint: marbled paint. Every point is traced back through a swirling flow (the curl of two octaves
    // of noise, so it never compresses, like the drag trails' fluid) to where its paint started. The paint
    // started as layered stripes of the palette, fine streaks inside broad bands, so the flow drags them
    // into thin, folded veins the way a comb drags ink across a marbling bath.
    float ca = cos(uAngle), sa = sin(uAngle), s = mod(uSeed, 97.0);
    // Chaos (uWarpScale, 0..1) tightens the flow and lets it run further, from calm swirls to dense marbling.
    // Its top end stops where the paint still resolves cleanly; past that, mixing finer than a pixel reads as noise.
    float ch = clamp(uWarpScale, 0.0, 1.0) * 0.7;
    vec2 q = ((p - 0.5) * a) * uScale * mix(1.0, 1.6, ch) + vec2(sin(s * 3.1), cos(s * 1.7)) * 9.0 + drift * 0.5;
    int steps = int(clamp(uDetail, 1.0, 8.0) * 4.0 + 0.5);
    float dt = uWarp * mix(0.35, 0.9, ch) / float(steps);
    // A second point a pixel away is traced through the same flow: how far apart the two land is how much
    // paint this pixel covers, so stripes squeezed finer than that can be averaged instead of aliasing.
    vec2 q2 = q + vec2(0.7071) * uScale * mix(1.0, 1.6, ch) / uRes.y;
    for (int i = 0; i < 32; i++) {
      if (i >= steps) break;
      q -= dt * paintVel(q, ch, vec4(L1, L2)); q2 -= dt * paintVel(q2, ch, vec4(L1, L2));
    }
    vec2 dir = vec2(ca, sa);
    float d = dot(q, dir) * uStretch * 0.35 + 0.35 * snoise(q * 0.8 + 3.3);
    // Stripes squeezed finer than a pixel or two fade to their average instead of turning to noise.
    // Veins (uContrast) sets how much two finer layers of streaks show inside the broad bands.
    float df = d * 3.7 + 0.4 * snoise(q * 1.8), dv = d * 9.3 + 0.6 * snoise(q * 3.1 + 5.0);
    float d2 = dot(q2, dir) * uStretch * 0.35 + 0.35 * snoise(q2 * 0.8 + 3.3), fp = max(abs(d2 - d), fwidth(d) * 1.4);
    float aB = smoothstep(0.15, 0.6, fp), aF = smoothstep(0.15, 0.6, fp * 3.7), aV = smoothstep(0.15, 0.6, fp * 9.3);
    float broad = mix(abs(fract(d) * 2.0 - 1.0), 0.5, aB), fine = mix(abs(fract(df) * 2.0 - 1.0), 0.5, aF), vein = mix(abs(fract(dv) * 2.0 - 1.0), 0.5, aV);
    float vc = clamp(uContrast, 0.0, 1.0);
    float tri = clamp(broad * (1.0 - 0.55 * vc) + fine * 0.35 * vc + vein * 0.2 * vc, 0.0, 1.0);
    float N = float(uN - 1), x = tri * N, kk = min(floor(x), N - 1.0), f = x - kk, h = 0.5 * clamp(uSoft, 0.02, 1.0);
    f = smoothstep(0.5 - h, 0.5 + h, f);
    // Where the stripes are already averaged out, the blend stays smooth: snapping an average to the
    // palette's steps would flip neighboring pixels between two colors and read as noise.
    float blur = smoothstep(0.15, 0.7, max(aB, aF * vc));
    o = vec4(srgb(fromLab(ramp(mix((kk + f) / N, tri, blur)))), 1.0); return;
  }
  if (uType == 9) {
    // Folds: curved sheets laid one over the next, like ribbons of chrome or glass (see foldTone).
    float ca = cos(uAngle), sa = sin(uAngle), sd = mod(uSeed, 89.0);
    vec2 r = mat2(ca, -sa, sa, ca) * ((p - 0.5) * a);
    float sp = 0.2 / max(uScale, 0.1), y = r.y + 0.5 * dot(drift, vec2(0.6, 0.8)), x = r.x, fw = fwidth(x);
    // The topmost sheet is the last one whose front edge lies before x. Edges stray at most a couple of
    // spacings from the shared curve, so only a few sheets round x can be it.
    float i0 = floor((x - foldCurve(y)) / sp), top = i0 - 3.0, under = i0 - 4.0;
    for (int k = 0; k < 6; k++) { float i = i0 + 2.0 - float(k); if (foldEdge(i, y, sp, sd) < x) { top = i; break; } }
    for (int k = 0; k < 6; k++) { float i = top - 1.0 - float(k); if (foldEdge(i, y, sp, sd) < x) { under = i; break; } }
    vec3 t = foldTone(top, x, y, sp, sd, fw), tu = foldTone(under, x, y, sp, sd, fw);
    // The front edge is antialiased over a pixel against the sheet it lies on.
    t = mix(tu, t, smoothstep(0.0, fw, x - foldEdge(top, y, sp, sd)));
    o = vec4(srgb(fromLab(ramp(t.r))).r, srgb(fromLab(ramp(t.g))).g, srgb(fromLab(ramp(t.b))).b, 1.0); return;
  }
  if (uType == 6) {
    // Aura, after the reactive background of Yandex Music's My Wave: two to four soft blobs of color
    // stacked over a dark ground, each smaller, lighter and a little off-centre from the one behind it.
    // Their outlines bulge and fold as they morph, light streams out from the back blob in soft rays,
    // and an optional faint rim traces each blob, as the real one shows when music plays.
    float ca = cos(uAngle), sa = sin(uAngle);
    vec2 c = (p - 0.5) * a;
    if (uMotion == 1) { if (uPath == 0) { float r0 = tw; c = mat2(cos(r0), -sin(r0), sin(r0), cos(r0)) * c; } else c -= drift * 0.35; }
    float R = 0.42 * clamp(uScale, 0.1, 6.0) * (1.0 + 0.1 * uMotAmt * beat) * (uMotion == 2 ? 1.0 + 0.07 * uMotAmt * sin(tw) : 1.0);
    int NL = int(clamp(uDetail, 1.0, 4.0) + 0.5);
    float edge = 0.1 + 0.16 * clamp(uSoft, 0.3, 5.0);
    vec2 cr = mat2(ca, -sa, sa, ca) * c / max(R, 0.05);
    vec3 lab2 = ramp(0.0);
    float f0 = 2.0, m0 = 0.0, rim = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= NL) break;
      float fi = float(i), k = NL > 1 ? fi / float(NL - 1) : 1.0;
      float Ri = R * (1.0 - 0.5 * k);
      vec2 sd2 = uSeed * vec2(0.37, 0.71) + fi * vec2(3.7, 1.9);
      // Each blob's own loop, so the layers morph out of step with each other.
      vec2 Lm = i == 0 ? L1 : i == 1 ? L2 : i == 2 ? -L1.yx : -L2.yx;
      vec2 ctr = R * 0.26 * k * vec2(snoise(sd2 + Lm * 0.3), snoise(sd2 + 7.1 - Lm * 0.3));
      vec2 q = (c - ctr) / max(Ri, 1e-3);
      vec2 wq = q * 0.5 + sd2;
      q += 0.3 * uWarp * vec2(snoise(wq + Lm * 0.35), snoise(wq + vec2(5.2, 1.3) - Lm.yx * 0.35)) * smoothstep(0.0, 1.2, length(q));
      float u = length(q); vec2 dv = q / max(u, 1e-4);
      float lob = snoise(dv * 0.8 + sd2 + Lm * 0.3) * 0.75 + snoise(dv * 1.3 + sd2 * 1.3 - Lm * 0.3) * 0.25;
      float f = u / (1.0 + 0.45 * uWarp * lob);
      float m = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, f);
      // One step up the palette per layer, lighter toward each blob's middle, with a slow hue sway.
      float t = clamp(0.32 + 0.6 * k + 0.1 * (1.0 - clamp(f, 0.0, 1.0)) + 0.08 * snoise(cr * 0.5 + sd2 + L2 * 0.2), 0.0, 1.0);
      lab2 = mix(lab2, ramp(t), m);
      if (i == 0) { f0 = f; m0 = m; }
      rim += exp(-pow((f - 1.0) / 0.03, 2.0)) * (0.5 + 0.5 * k);
    }
    // Rays: streaks of the back blob's light running outward, where angular noise lines up, curving a
    // touch as they go and fading with distance; a haze fills the dark between them.
    vec2 qb = c / max(R, 1e-3); float ub = length(qb), th = atan(qb.y, qb.x) + 0.04 * ub;
    vec2 dr = vec2(cos(th), sin(th));
    float ray = snoise(dr * 2.4 + uSeed * 0.13 + L1 * 0.5) * 0.65 + snoise(dr * 5.0 + uSeed * 0.29 - L2 * 0.5) * 0.35;
    ray = pow(clamp(0.4 + 0.7 * ray, 0.0, 1.0), 1.8);
    float out0 = max(f0 - 0.9, 0.0);
    float glow = exp(-out0 * 2.6 / clamp(uSoft, 0.5, 5.0)) * 0.3 + uStretch * ray * exp(-out0 * 1.6) * smoothstep(0.75, 1.0, f0) * 0.55;
    lab2 = mix(lab2, ramp(0.5), clamp(glow, 0.0, 1.0) * (1.0 - m0));
    lab2.x += uStretch * ray * 0.03 * m0 * smoothstep(0.55, 1.0, f0) + rim * clamp(uContrast, 0.0, 1.0) * 0.1;
    o = vec4(srgb(fromLab(lab2)), 1.0); return;
  }
  // Breathe on fields: a slow swell in and out from the middle, eased at both ends.
  if (uMotion == 2 && (uType == 0 || uType == 4 || uType == 5)) p = 0.5 + (p - 0.5) * (1.0 - 0.12 * uMotAmt * (0.5 - 0.5 * cos(tw)));
  // Flow on plain blends doesn't morph them: the colors stream along the blend instead (below).
  bool blend = uType >= 1 && uType <= 3;
  float warp = br && !blend ? max(uWarp, 0.7 * uMotAmt) : uWarp;
  if (uType >= 1 && uType <= 3) p += drift * 0.03;
  // Morphing reads each warp field twice, offset in opposite directions along the loop, so the field
  // churns in place instead of sliding across like a camera pan.
  // Simplex, not the value noise the effects use: value noise sits on a square grid, and a strong warp
  // under high contrast drew that grid out as faint rectangles.
  if (warp > 0.0) { vec2 q = p * a * uWarpScale + drift * 0.6; p += warp * 0.3 * 0.5 * 0.7071 * vec2(wfbm(q + vec2(1.7, 9.2) + L1) + wfbm(q + vec2(4.4, 3.1) - L1), wfbm(q + vec2(8.3, 2.8) + L2) + wfbm(q + vec2(2.9, 6.6) - L2)); }
  vec3 lab;
  if (uType == 4 || uType == 5) {
    // Flow and noise generators: a rotated, stretched simplex field mapped through the color ramp.
    float ca = cos(uAngle), sa = sin(uAngle);
    vec2 q = mat2(ca, -sa, sa, ca) * ((p - 0.5) * a);
    q.x /= max(uStretch, 0.05);
    q = q * uScale + uSeed * vec2(1.37, 2.91) + drift * 0.9;
    float v;
    if (uType == 4) {
      vec2 w1 = vec2(sfbm(q + L1), sfbm(q + vec2(5.2, 1.3) + L2));
      vec2 w2 = vec2(sfbm(q + warp * 1.2 * w1 + vec2(1.7, 9.2) - L2), sfbm(q + warp * 1.2 * w1 + vec2(8.3, 2.8) + L1.yx));
      v = sfbm(q + warp * 1.2 * w2) * 0.75 + 0.5;
    } else {
      if (uNoise != 9 && uNoise != 10) q += warp * vec2(sfbm(q + vec2(3.1, 7.7) + L1), sfbm(q + vec2(9.4, 1.2) + L2));
      if (uNoise == 0) v = sfbm(q) * 0.6 + 0.5;
      else if (uNoise == 1) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; float n = 1.0 - abs(snoise(pp)); r += am * n * n; pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.1; }
      else if (uNoise == 2) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; r += am * abs(snoise(pp)); pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.6; }
      else if (uNoise == 3) v = worley(q * 1.5).x;
      else if (uNoise == 4) { vec2 w = worley(q * 1.5); v = 1.0 - smoothstep(0.0, 0.35, w.y - w.x); }
      else if (uNoise == 5) v = 0.5 + 0.5 * sin(q.x * 4.0 + sfbm(q) * 5.0);
      else if (uNoise == 6) { float nn = neuro(q * 0.5); v = clamp(1.2 * pow(nn, 3.0) + pow(nn, 10.0) - 0.1, 0.0, 1.0); }
      else if (uNoise == 9) {
        // Smoke: thin veils that curl and fold, a ridge taken along a twice-warped field, thinning out
        // where the slow density field drops away.
        // Each warp is two reads moving opposite ways round the loop, so the smoke churns where it is.
        float ws = 0.5 + 1.8 * warp;
        vec2 w1 = 0.7071 * vec2(snoise(q * 0.45 + L1) + snoise(q * 0.45 + vec2(11.3, 4.7) - L1), snoise(q * 0.45 + vec2(5.2, 1.3) + L2) + snoise(q * 0.45 + vec2(2.1, 9.6) - L2));
        vec2 w2 = vec2(snoise(q * 0.8 + ws * w1 + vec2(1.7, 9.2)), snoise(q * 0.8 + ws * w1 + vec2(8.3, 2.8)));
        float r = 1.0 - abs(snoise(q * 0.55 + 0.9 * w2)), fine = 0.5 * snoise(q * 1.6 + 1.5 * w2);
        float dens = smoothstep(-0.9, 0.7, snoise(q * 0.3 + 0.6 * w1 + 4.4) + 0.35 * snoise(q * 0.7 + w2));
        v = clamp(dens * (0.3 + 0.85 * pow(r, 2.5)) * (0.85 + 0.3 * fine), 0.0, 1.0);
      }
      else if (uNoise == 10) {
        // Caustics: a beam of light split by a lens with a rippled face. Rays leave side by side across
        // the beam and a smooth field bends each off course; the light at a point is how many rays cross
        // there. Where neighbouring rays bunch up they fold into bright filaments that cross and split,
        // and where they fan out only a faint veil is left. Each pair of neighbouring rays spreads its
        // light evenly between them, measured over the pixel, so the filaments stay sharp but never alias.
        // The beam runs through the middle of the frame whatever the seed, which only reshapes the lens.
        vec2 qb = mat2(ca, -sa, sa, ca) * ((p - 0.5) * a); qb.x /= max(uStretch, 0.05); qb *= uScale; qb.y += uSeed * 0.731;
        int nr = int(clamp(uDetail * 12.0, 12.0, 96.0)); float px = fwidth(qb.x) + 1e-5, acc = 0.0, xa = 0.0, bw = 0.7 + 0.45 * snoise(vec2(qb.y * 0.3, 3.7) + L1);
        for (int i = 0; i <= 96; i++) {
          if (i > nr) break;
          float sr = float(i) / float(nr) - 0.5;
          float x = sr * bw + (0.25 + warp) * 0.5 * (snoise(vec2(sr * 2.3 + 1.1, qb.y * 0.5) + L1) + 0.5 * snoise(vec2(sr * 5.1 + 7.7, qb.y * 1.1) + L2)) + 0.3 * snoise(vec2(qb.y * 0.2, 9.1));
          if (i > 0) { float lo = min(xa, x), hi = max(xa, x), ov = max(0.0, min(hi, qb.x + px * 0.5) - max(lo, qb.x - px * 0.5)); acc += ov / max(hi - lo, 1e-6) / px / float(nr); }
          xa = x;
        }
        v = 1.0 - exp(-0.35 * acc);
      }
      else { vec2 c = (p - 0.5) * a; float ang = atan(c.y, c.x), r = length(c) / 0.36; float n = snoise(vec2(cos(ang), sin(ang)) * 0.9 / max(uScale, 0.1) + uSeed * 0.37) * (0.2 + warp * 0.3) + 0.08 * snoise(vec2(cos(ang), sin(ang)) * 2.4 + uSeed); v = exp(-pow((r - 1.0 - n) / (0.1 + 0.12 / max(uStretch, 0.3)), 2.0)) * (0.85 + 0.15 * sfbm(q * 2.0)); }
    }
    if (uGStage == 1) { o = vec4(v, 0.0, 0.0, 1.0); return; }
    lab = ramp(clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0));
  } else if (uType == 0) {
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int i = 0; i < 8; i++) { if (i >= uN) break; vec2 orb = uMotion == 1 ? (uPath == 0 ? 0.22 * uMotAmt * vec2(cos(tw * (1.0 + mod(float(i), 2.0)) + float(i) * 2.1), sin(tw * (1.0 + mod(float(i) + 1.0, 2.0)) + float(i) * 1.3)) : 0.22 * uMotAmt * mloop(tw, float(i) * 2.1)) : br ? 0.16 * uMotAmt * (uPath == 0 ? vec2(sin(tw + float(i) * 2.1), cos(tw + float(i) * 2.1)) : mloop(tw, float(i) * 2.1)) : vec2(0.0); vec2 d = (p - uPt[i] - orb) * a; float w = 1.0 / pow(dot(d, d) + 0.0004, uSoft); acc += toLab(lin(uCol[i])) * w; ws += w; }
    lab = acc / ws;
  } else {
    vec2 c = (p - 0.5) * a; float t;
    if (uType == 1) { vec2 dir = vec2(cos(uAngle), sin(uAngle)); float ext = abs(dir.x) * a.x * 0.5 + abs(dir.y) * 0.5; t = dot(c, dir) / ext * 0.5 + 0.5; }
    else if (uType == 2) t = length(c) / length(a * 0.5);
    else t = abs(fract(atan(c.y, c.x) / 6.2831853 + uAngle / 6.2831853) * 2.0 - 1.0);
    // Flow: the ramp is mirrored into an endless there-and-back band and slid one full period per loop,
    // so radial rings keep streaming outward (linear ones across, conic ones round) and the last frame
    // meets the first. The first frame is the still design.
    if (br) t = 1.0 - abs(fract((t - 2.0 * uTime) * 0.5) * 2.0 - 1.0);
    lab = ramp(t);
  }
  o = vec4(srgb(fromLab(lab)), 1.0);
}
void main() { gradMain(); }`,

    liquify: `uniform float uAmt; uniform float uScale;
void main() {
  vec2 q = dp() / uScale;
  vec2 w = vec2(fbm(q + vec2(3.1, 7.7)), fbm(q + vec2(9.4, 1.2)));
  vec2 off = (vec2(fbm(q + 2.5 * w + vec2(1.3, 4.1)), fbm(q + 2.5 * w + vec2(6.2, 8.8))) - 0.5) * 2.0;
  o = tex(vUv + toUv(off * uAmt * uScale * 0.5));
}`,

    glass: `uniform float uBump; uniform float uBlend; uniform float uWidth; uniform float uAngle; uniform float uRound; uniform float uThick; uniform float uFrost; uniform float uTint; uniform float uLight;
// Fluted glass: ribs of the shared glass, flat on top and rounded over toward each edge (a half-cylinder
// at full roundness). Four sub-pixel samples across the rib edge remove the stair-stepping.
void main() {
  gBlend = uBlend; gBump = uBump;
  vec2 dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  vec3 acc = vec3(0.0);
  for (int s = 0; s < 4; s++) {
    vec2 d = dp() + nrm * ((float(s) - 1.5) * 0.25 / uK);
    float l = fract(dot(d, nrm) / uWidth) - 0.5, e = (0.5 - abs(l)) * uWidth;
    vec2 g = -nrm * sign(l) * glassSlope(e, max(0.5 / uK, uRound * 0.5 * uWidth));
    if (s == 0) gMean = meanAt(toUv(d - nrm * l * uWidth), vec2(uWidth * 0.35));
    acc += glassMat(vUv, g, -e, uThick * uWidth * 0.5, uFrost * uWidth * 0.3, uTint, uLight, 8);
  }
  o = vec4(acc / 4.0, tex(vUv).a);
}`,

    mesh: `uniform float uCell; uniform float uGap; uniform float uRad; uniform float uRound; uniform float uThick; uniform float uFrost; uniform float uTint; uniform float uLight; uniform float uFade; uniform float uFadeAng; uniform float uHexT; uniform float uBlend; uniform float uAsp; uniform float uBump;
// Glass blocks: a grid of tiles of the shared glass, each rounded over toward its edges (a pillow at full
// roundness), separated by a gap. Hex lays the tiles out as a honeycomb of six-sided cells instead.
// Stretch widens every tile, like the oval dimples of patterned bathroom glass.
float sdHexT(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p); p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy; p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float tileSD(vec2 p, vec2 hb, float rad) { return uHexT > 0.5 ? sdHexT(p.yx, hb.x - rad) - rad : sdBox(p, hb, rad); }
void main() {
  // Tiles are a whole number of render pixels wide, so every tile and every gap meets the pixel grid the
  // same way (fractional sizes drew some gaps darker than others), and a gap is never thinner than a pixel.
  float cell = max(2.0, floor(uCell * uK + 0.5)) / uK;
  vec2 asp = vec2(max(uAsp, 0.2), 1.0), d = dp() / asp, id = floor(d / cell), c = (id + 0.5) * cell;
  if (uHexT > 0.5) {
    vec2 rr = vec2(1.0, 1.7320508), q = d / cell, ha = mod(q, rr) - rr * 0.5, hb2 = mod(q - rr * 0.5, rr) - rr * 0.5;
    c = d - (dot(ha, ha) < dot(hb2, hb2) ? ha : hb2) * cell;
  }
  vec2 p = d - c;
  float gap = uGap > 0.0 ? max(uGap * cell * 0.04, 1.0 / uK) : 0.0;
  vec2 hb = vec2(cell * 0.5 - gap * 0.5);
  float rad = clamp(uRad, 0.0, 0.5) * (uHexT > 0.5 ? 1.0 : 2.0) * hb.x;
  float sd = tileSD(p, hb, rad);
  vec2 n = normalize(vec2(tileSD(p + vec2(0.5, 0.0), hb, rad) - tileSD(p - vec2(0.5, 0.0), hb, rad), tileSD(p + vec2(0.0, 0.5), hb, rad) - tileSD(p - vec2(0.0, 0.5), hb, rad)) + 1e-6);
  vec2 g = -n * glassSlope(-sd, max(0.5 / uK, uRound * hb.x));
  gBlend = uBlend; gBump = uBump; if (uBlend > 0.0) gMean = meanAt(toUv(c * asp), hb * asp * 0.5);
  vec3 inside = glassMat(vUv, g, sd, uThick * hb.x, uFrost * cell * 0.15, uTint, uLight, 16);
  vec4 base = tex(vUv);
  float shadow = 0.22 * min(uLight, 1.0) * (1.0 - 0.6 * uTint) * exp(-max(tileSD(p + vec2(0.0, cell * 0.02), hb, rad), 0.0) / (cell * 0.05));
  vec3 outside = base.rgb * (1.0 - shadow);
  float aa = 0.6 / uK;
  // Fade: tiles thin out toward the fade angle (0° right, 90° up), a whole tile at a time.
  vec2 fd = vec2(cos(uFadeAng), sin(uFadeAng)), cu = toUv(c * asp) - 0.5;
  float keep = mix(1.0, smoothstep(0.55, -0.55, dot(cu * vec2(uRes.x / uRes.y, 1.0), fd)), uFade);
  o = vec4(mix(base.rgb, mix(outside, inside, smoothstep(aa, -aa, sd)), keep), base.a);
}`,

    bulge: `uniform float uAmt; uniform float uRad; uniform vec2 uC;
// Bulge or pinch: inside the radius the image is magnified (or shrunk), easing back to 1:1 at the edge.
void main() {
  vec2 res = uRes / uK, c = uC * res, d = dp() - c;
  float R = max(1.0, uRad * min(res.x, res.y)), r = length(d) / R;
  float k = r < 1.0 ? max(0.05, 1.0 - uAmt * (1.0 - r * r) * (1.0 - r * r)) : 1.0;
  o = tex(toUv(c + d * k));
}`,

    ripple: `uniform float uAmp; uniform float uLen; uniform float uDecay; uniform float uShade; uniform vec2 uC; uniform float uAnim; uniform float uTime;
// Concentric water ripples from a point, fading with distance, with a soft light on each crest.
void main() {
  vec2 res = uRes / uK, d = dp() - uC * res; float r = length(d), m = min(res.x, res.y);
  // Animated, the rings travel outward a whole number of wavelengths per loop, so it still loops.
  float ph = r / uLen * 6.2831853 - 6.2831853 * uTime * uAnim, fade = exp(-r / max(1.0, uDecay * m));
  vec2 dir = d / max(r, 1e-3);
  vec4 c = tex(vUv + toUv(dir * sin(ph) * uAmp * fade));
  o = vec4(c.rgb * (1.0 + uShade * 0.18 * cos(ph) * fade), c.a);
}`,

    sea: `uniform float uAmt; uniform float uScale; uniform float uCaustic; uniform float uChop; uniform float uDepth; uniform float uSpeed; uniform float uTime;
// Water: looking down through a sunlit, moving surface. Long swells and a finer chop bend what lies
// beneath, and the light the surface focuses slides over it in soft, shifting ribbons. Every wave and
// ribbon moves a whole number of turns per loop, so animations meet their first frame.
float T;
// The surface is a sum of travelling waves, so its slope and curvature come out exactly from each
// wave's sine and cosine: one of each per wave, instead of sampling the whole sum many times over.
void wave(vec2 q, vec2 d, float f, float amp, float tm, float ph, inout vec2 g, inout vec3 H) {
  vec2 k = d * f; float x = dot(q, k) + tm * T + ph, s = sin(x), c = cos(x);
  // Curvature grows with the square of frequency, so the finest ripples would rule the light and break
  // it into streaks; dividing by frequency lets the mid-size waves shape it instead.
  g += amp * c * k; H -= amp * s * vec3(k.x * k.x, k.x * k.y, k.y * k.y) / f;
}
void surf(vec2 q, out vec2 g, out vec3 H) {
  g = vec2(0.0); H = vec3(0.0); float ch = uChop;
  wave(q, vec2(0.83, 0.55), 1.0, 0.5, 1.0, 1.3, g, H);
  wave(q, vec2(-0.42, 0.91), 1.7, 0.32, -2.0, 0.7, g, H);
  wave(q, vec2(0.97, -0.24), 2.6, 0.22, 2.0, 2.1, g, H);
  wave(q, vec2(0.2, -0.98), 4.3, 0.2 * ch, -3.0, 4.0, g, H);
  wave(q, vec2(-0.77, -0.64), 6.1, 0.12 * ch, 4.0, 1.0, g, H);
  wave(q, vec2(0.6, 0.8), 8.7, 0.08 * ch, -5.0, 2.0, g, H);
  wave(q, vec2(0.31, 0.95), 5.3, 0.1 * ch, 3.0, 3.0, g, H);
  wave(q, vec2(-0.95, 0.31), 4.7, 0.09 * ch, -2.0, 5.0, g, H);
  wave(q, vec2(0.71, -0.71), 7.1, 0.08 * ch, 3.0, 0.5, g, H);
}
// Caustics from the surface itself: light through it bends by its slope, and where the bent rays
// bunch together the floor brightens. The bunching is the inverse of how much the bend stretches a
// patch (the determinant of its Jacobian, I + D·curvature), so the light follows these very waves.
float caustic(vec3 H, float D) {
  float det = (1.0 + D * H.x) * (1.0 + D * H.z) - D * D * H.y * H.y;
  return clamp(1.0 / max(abs(det), 0.1) - 0.8, 0.0, 3.0);
}
void main() {
  T = 6.2831853 * uTime * uSpeed;
  vec2 q = dp() / uScale * 6.0;
  // One slow, still warp so the swells never line up into stripes or repeat.
  q += 1.8 * vec2(fbm(q * 0.13 + 3.1), fbm(q * 0.13 + 7.7)) + 1.1 * vec2(fbm(q * 0.41 + 5.3), fbm(q * 0.41 + 1.9));
  vec2 g; vec3 H; surf(q, g, H);
  vec2 off = g * uAmt * uScale * 0.03, bend = toUv(off);
  // Red bends a touch less than blue, as through real water.
  vec3 col = vec3(tex(vUv + bend * 0.96).r, tex(vUv + bend).g, tex(vUv + bend * 1.05).b);
  col = mix(col, col * vec3(0.5, 0.82, 0.92) + vec3(0.0, 0.07, 0.1), clamp(uDepth, 0.0, 1.0));
  // A finer copy of the surface lights the floor, so the light web is smaller than the swells that
  // bend it, read where the floor is seen; it fades out before its cells get too small to draw cleanly.
  vec2 qc = (q + off / uScale * 6.0 * 0.6) * 1.35 + vec2(17.3, 5.9) + uSeed * vec2(0.37, 0.91);
  vec2 g2; vec3 H2; surf(qc, g2, H2);
  float px = uScale / 6.0 / 1.35 * uK, l = caustic(H2, 0.6) * smoothstep(8.0, 20.0, px * 6.2831853);
  l *= 0.55 + 0.45 * smoothstep(0.25, 0.75, vnoise(q * 0.2 + 11.0) + 0.1);
  float face = clamp(-dot(g, vec2(0.6, -0.8)) * 0.05 * min(uAmt, 2.0), -0.1, 0.1);
  col *= 1.0 + face;
  vec3 light = vec3(0.92, 1.0, 0.97) * smoothstep(0.0, 2.2, l) * uCaustic * 0.6;
  o = vec4(1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(light, 0.0, 1.0)), tex(vUv).a);
}`,

    touch: `uniform float uAmp; uniform float uLen; uniform float uSpeed; uniform float uLife; uniform float uShade; uniform vec4 uP[8]; uniform float uNP;
// Click ripples: each click (x, y in design pixels, its age in seconds) sends out a ring of waves that
// spreads at a steady speed and dies away over its life, bending and lighting what's beneath.
void main() {
  vec2 d0 = dp(), off = vec2(0.0); float lit = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uNP) break;
    vec4 P = uP[i]; vec2 d = d0 - P.xy; float r = length(d), age = P.z;
    float front = age * uSpeed, x = (r - front) / uLen;
    float env = exp(-x * x * 0.35) * clamp(1.0 - age / max(uLife, 0.05), 0.0, 1.0) * smoothstep(0.0, uLen, front + uLen * 0.5);
    float w = sin(x * 6.2831853) * env;
    off += d / max(r, 1e-3) * w * uAmp; lit += cos(x * 6.2831853) * env;
  }
  vec4 c = tex(vUv + toUv(off));
  o = vec4(c.rgb * (1.0 + uShade * 0.15 * lit), c.a);
}`,

    // Drag trails composite, over a real fluid simulation (below): Fluid mode draws the picture through
    // the sim's offset field, so it is carried by the flow like paint and relaxes back; Smoke mode leaves
    // the picture alone and lays the sim's smoke density over it.
    trail: `uniform sampler2D uTex2; uniform float uSmoke; uniform vec3 uCol;
void main() {
  vec4 d = texture(uTex2, vUv);
  if (uSmoke < 0.5) { o = tex(vUv + d.xy); return; }
  vec4 c = tex(vUv); float a = clamp(d.a, 0.0, 1.0);
  o = vec4(mix(c.rgb, uCol, a * a * (3.0 - 2.0 * a) * 0.92), c.a);
}`,

    // ---- fluid simulation (stable fluids, after Jos Stam and Pavel Dobryakov's WebGL version) ----
    // Velocity is in sim cells per second; cells are square in design space.
    f_splat: `uniform vec2 uPt; uniform float uRad; uniform vec4 uVal; uniform float uAsp;
void main() { vec2 d = vUv - uPt; d.x *= uAsp; o = texture(uTex, vUv) + uVal * exp(-dot(d, d) / uRad); }`,
    f_curl: `
void main() {
  vec2 t = 1.0 / uRes;
  float L = texture(uTex, vUv - vec2(t.x, 0.0)).y, R = texture(uTex, vUv + vec2(t.x, 0.0)).y, T = texture(uTex, vUv + vec2(0.0, t.y)).x, B = texture(uTex, vUv - vec2(0.0, t.y)).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
    f_vort: `uniform sampler2D uTex2; uniform float uCurl; uniform float uDt;
void main() {
  vec2 t = 1.0 / uRes;
  float L = texture(uTex2, vUv - vec2(t.x, 0.0)).x, R = texture(uTex2, vUv + vec2(t.x, 0.0)).x, T = texture(uTex2, vUv + vec2(0.0, t.y)).x, B = texture(uTex2, vUv - vec2(0.0, t.y)).x, C = texture(uTex2, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= uCurl * C; f.y = -f.y;
  // Swirl only where the fluid is really moving: confinement on the faint leftover flow everywhere else
  // kept the whole picture slowly twisting long after a trail had faded.
  vec2 v = texture(uTex, vUv).xy;
  f *= smoothstep(1.5, 14.0, length(v));
  o = vec4(clamp(v + f * uDt, -2000.0, 2000.0), 0.0, 1.0);
}`,
    f_div: `
void main() {
  vec2 t = 1.0 / uRes, C = texture(uTex, vUv).xy;
  float L = texture(uTex, vUv - vec2(t.x, 0.0)).x, R = texture(uTex, vUv + vec2(t.x, 0.0)).x, T = texture(uTex, vUv + vec2(0.0, t.y)).y, B = texture(uTex, vUv - vec2(0.0, t.y)).y;
  if (vUv.x - t.x < 0.0) L = -C.x; if (vUv.x + t.x > 1.0) R = -C.x; if (vUv.y + t.y > 1.0) T = -C.y; if (vUv.y - t.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
    f_press: `uniform sampler2D uTex2;
void main() {
  vec2 t = 1.0 / uRes;
  float L = texture(uTex, vUv - vec2(t.x, 0.0)).x, R = texture(uTex, vUv + vec2(t.x, 0.0)).x, T = texture(uTex, vUv + vec2(0.0, t.y)).x, B = texture(uTex, vUv - vec2(0.0, t.y)).x;
  o = vec4((L + R + B + T - texture(uTex2, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
    f_grad: `uniform sampler2D uTex2;
void main() {
  vec2 t = 1.0 / uRes;
  float L = texture(uTex2, vUv - vec2(t.x, 0.0)).x, R = texture(uTex2, vUv + vec2(t.x, 0.0)).x, T = texture(uTex2, vUv + vec2(0.0, t.y)).x, B = texture(uTex2, vUv - vec2(0.0, t.y)).x;
  o = vec4(texture(uTex, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
    // Advection reads back along the velocity. The offset field (Fluid mode) also gains the distance it was
    // carried, so each cell remembers where its paint came from; dissipation lets it all fade away.
    f_adv: `uniform sampler2D uTex2; uniform float uDt; uniform float uDiss; uniform vec2 uVelTexel; uniform float uOff;
void main() {
  vec2 coord = vUv - uDt * texture(uTex, vUv).xy * uVelTexel;
  vec4 r = texture(uTex2, coord);
  if (uOff > 0.5) r.xy += coord - vUv;
  o = r / (1.0 + uDiss * uDt);
}`,


    water: `uniform float uAmt; uniform float uScale; uniform float uCaustic; uniform float uAnim; uniform float uTime;
// Pool water: a rolling surface (long swells plus finer chop) bends the floor seen through it, and the
// light it focuses lands on the floor as the bright, web-like caustic network of a sunny pool.
float H(vec2 q) { return 0.6 * sin(q.x * 1.3 + 1.7 * sin(q.y * 0.7)) * 0.25 + fbm(q) + 0.5 * fbm(q * 2.1 + vec2(4.7, 1.9)); }
vec2 h2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
// Distance from p to the nearest edge between jittered cells, in cell units. The edges of a wobbled
// cell grid are the bright web a pool floor shows; the value is bounded, so the light never blows out.
float cellEdge(vec2 p) {
  vec2 n = floor(p), f = fract(p), mr = vec2(0.0), mg = vec2(0.0); float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), r = g + 0.5 + 0.38 * sin(6.2831 * h2(n + g) + uSeed * 0.37 + 6.2831853 * uTime * uAnim) - f;
    float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j)), r = g + 0.5 + 0.38 * sin(6.2831 * h2(n + g) + uSeed * 0.37 + 6.2831853 * uTime * uAnim) - f;
    if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}
float causticLayer(vec2 p) {
  float e = cellEdge(p), aa = fwidth(p.x) * 1.2;
  // A thin bright core inside a softer glow, both widened by a pixel so small sizes stay smooth.
  float core = 1.0 - smoothstep(0.0, 0.045 + aa, e), glow = exp(-e / (0.13 + aa));
  return clamp(0.7 * core + 0.45 * glow * glow, 0.0, 1.0);
}
void main() {
  vec2 q = dp() / uScale; float e = 0.12;
  vec2 g = vec2(H(q + vec2(e, 0.0)) - H(q - vec2(e, 0.0)), H(q + vec2(0.0, e)) - H(q - vec2(0.0, e))) / (2.0 * e);
  vec2 bend = toUv(g * uAmt * uScale * 0.05);
  vec4 c = tex(vUv + bend);
  // Caustics follow the same surface, so the web wobbles with the refraction. A second, finer web at an
  // angle fills the larger cells the way overlapping ripples do.
  vec2 cp = q * 2.2 + vec2(vnoise(q * 1.1 + 3.1), vnoise(q * 1.1 + 7.7)) * 1.3 + uSeed * 0.71;
  vec2 cq = mat2(0.8, -0.6, 0.6, 0.8) * cp * 1.6 + 11.3;
  float l = clamp(causticLayer(cp) + 0.45 * causticLayer(cq), 0.0, 1.0);
  // Cells under a dozen pixels across turn to noise, so the light fades out instead.
  float cellPx = uScale / 2.2 * uK; l *= smoothstep(5.0, 14.0, cellPx);
  vec3 light = vec3(1.0, 0.99, 0.95) * l * min(uCaustic, 2.0) * 0.55;
  // The surface itself: troughs a touch darker, crests a touch brighter, facing the light from the top left.
  float face = clamp(-dot(g, vec2(0.6, -0.8)) * 0.12 * min(uAmt, 2.0), -0.12, 0.12);
  vec3 col = c.rgb * (1.0 + face);
  o = vec4(1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - clamp(light, 0.0, 1.0)), c.a);
}`,

    cmyk: `uniform float uSize; uniform float uAngle; uniform vec3 uPaper; uniform float uShape;
// Four-color halftone: cyan, magenta, yellow and black screens at their classic angles, overprinted on paper.
float screenDot(vec2 d, float ang, int ch) {
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 g = R * d / uSize, base = floor(g) + 0.5; float aa = 0.8 / (uSize * uK), m = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 cell = base + vec2(float(i), float(j));
    vec3 rgb = tex(toUv(transpose(R) * cell * uSize)).rgb;
    float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b)), den = max(1e-4, 1.0 - k);
    float v = ch == 0 ? (1.0 - rgb.r - k) / den : ch == 1 ? (1.0 - rgb.g - k) / den : ch == 2 ? (1.0 - rgb.b - k) / den : k;
    float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.62;
    if (rad > 0.004) m = max(m, smoothstep(aa, -aa, dotSD(g - cell, rad, uShape)));
  }
  return m;
}
void main() {
  vec2 d = dp(); vec3 col = uPaper;
  col *= mix(vec3(1.0), vec3(0.0, 0.66, 0.92), screenDot(d, uAngle + 0.2618, 0));
  col *= mix(vec3(1.0), vec3(0.92, 0.1, 0.55), screenDot(d, uAngle + 1.309, 1));
  col *= mix(vec3(1.0), vec3(1.0, 0.92, 0.0), screenDot(d, uAngle, 2));
  col *= mix(vec3(1.0), vec3(0.12, 0.11, 0.12), screenDot(d, uAngle + 0.7854, 3));
  o = vec4(col, tex(vUv).a);
}`,

    paper: `uniform float uCrumple; uniform float uFiber; uniform float uScale;
// Paper: a crumpled height field lit from the top left, plus fine fibres and tooth.
float P(vec2 q) { return fbm(q) + 0.45 * fbm(q * 2.3 + 7.1) + 0.2 * fbm(q * 5.1 + 3.3); }
void main() {
  vec4 c = tex(vUv);
  vec2 q = dp() / uScale; float e = 0.01;
  vec2 g = vec2(P(q + vec2(e, 0.0)) - P(q - vec2(e, 0.0)), P(q + vec2(0.0, e)) - P(q - vec2(0.0, e))) / (2.0 * e);
  vec3 n = normalize(vec3(-g * uCrumple * 0.5, 1.0));
  float light = dot(n, normalize(vec3(-0.5, 0.6, 0.7))) - 0.7;
  vec2 fq = dp() * vec2(0.9, 0.06);
  float fiber = vnoise(fq) * vnoise(fq * 2.3 + 4.0), tooth = hash(floor(dp() * uK)) - 0.5;
  vec3 col = c.rgb * (1.0 + light * 0.5) - uFiber * (fiber * 0.09 - tooth * 0.03);
  o = vec4(clamp(col, 0.0, 1.0), c.a);
}`,

    heatmap: `uniform float uGlow; uniform float uMix; uniform float uInvert;
// Thermal camera: brightness, softened by a glow, mapped onto a heat ramp.
vec3 heat(float t) {
  vec3 a = vec3(0.02, 0.0, 0.12), b = vec3(0.35, 0.05, 0.6), c = vec3(0.9, 0.12, 0.25), d = vec3(1.0, 0.55, 0.05), e = vec3(1.0, 0.95, 0.6);
  return t < 0.25 ? mix(a, b, t / 0.25) : t < 0.5 ? mix(b, c, (t - 0.25) / 0.25) : t < 0.75 ? mix(c, d, (t - 0.5) / 0.25) : mix(d, e, (t - 0.75) / 0.25);
}
void main() {
  vec4 c = tex(vUv); float v = luma(c.rgb), acc = 0.0;
  for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 12.0) * uGlow; acc += luma(tex(vUv + toUv(vec2(cos(a), sin(a)) * r)).rgb); }
  v = mix(v, acc / 12.0, 0.6);
  if (uInvert > 0.5) v = 1.0 - v;
  o = vec4(mix(c.rgb, heat(clamp(v, 0.0, 1.0)), uMix), c.a);
}`,

    chrome: `uniform float uStr; uniform float uBands; uniform float uSoft; uniform vec3 uTint; uniform float uMix;
uniform sampler2D uTex2; uniform int uHasH;
// Liquid metal: brightness becomes a soft height field whose surface reflects a banded studio environment.
// The height is a true Gaussian blur of brightness made in two passes beforehand, so dense lines melt
// into smooth slopes instead of aliasing into smears. The ring average is the fallback without float targets.
float Lm(vec2 uv) {
  if (uHasH == 1) return texture(uTex2, clamp(uv, vec2(0.0), vec2(1.0))).r;
  float s = luma(tex(uv).rgb) * 0.5; for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; vec2 d = vec2(cos(a), sin(a)) * uSoft; s += luma(tex(uv + toUv(d * 0.55)).rgb) + 0.75 * luma(tex(uv + toUv(d.yx * vec2(1.0, -1.0) * 1.1)).rgb); } return s / 14.5;
}
void main() {
  vec4 c = tex(vUv); vec2 e = toUv(vec2(uSoft, 0.0)), f = toUv(vec2(0.0, uSoft));
  // With a blurred height the slope is read over one pixel and scaled to match: differences taken a whole
  // blur radius apart beat against fine ridges and made moire.
  if (uHasH == 1) { e = vec2(1.0 / uRes.x, 0.0); f = vec2(0.0, 1.0 / uRes.y); }
  vec2 g = vec2(Lm(vUv + e) - Lm(vUv - e), Lm(vUv + f) - Lm(vUv - f)) * (uHasH == 1 ? uSoft * uK : 1.0);
  vec3 n = normalize(vec3(-g * uStr * 6.0, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
  float t = R.y * 0.5 + 0.5 + Lm(vUv) * 0.35;
  float env = 0.5 + 0.42 * cos(t * uBands * 6.2831853 + 0.6) * (0.75 + 0.25 * R.x);
  env = 0.1 + 0.9 * mix(env, smoothstep(0.1, 0.95, env), 0.4) + pow(max(0.0, dot(R, normalize(vec3(-0.4, 0.6, 0.7)))), 24.0) * 0.6;
  vec3 metal = clamp(env * mix(vec3(1.0), uTint, 0.7), 0.0, 1.0);
  o = vec4(mix(c.rgb, metal, uMix), c.a);
}`,

    rays: `uniform float uLen; uniform float uThr; uniform float uInt; uniform vec2 uC;
// God rays: bright parts of the image are smeared outward from a light point, as through haze.
void main() {
  vec4 base = tex(vUv);
  float n = uQ.x > 0.0 ? uQ.x : 48.0, decay = pow(0.965, 48.0 / n);
  vec2 dir = (vUv - uC) * uLen / n, uv = vUv; vec3 acc = vec3(0.0); float w = 1.0, ws = 0.0;
  float j = hash(gl_FragCoord.xy);
  uv -= dir * j;
  for (int i = 0; i < 192; i++) { if (float(i) >= n) break; uv -= dir; vec3 s = tex(uv).rgb; acc += max(s - uThr, 0.0) / max(1.0 - uThr, 0.05) * w; ws += w; w *= decay; }
  o = vec4(clamp(base.rgb + acc / ws * uInt, 0.0, 1.0), base.a);
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

    halftone: `uniform float uSize; uniform float uAngle; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper; uniform float uShape; uniform float uHex; uniform float uTurn; uniform float uTone; uniform float uEven; uniform float uMerge; uniform float uClassic;
// Halftone: one dot per lattice point, sized by how dark the picture is there. Every shape grows by area
// from nothing at white, meets its neighbours at mid grey and closes into solid ink at black: circles
// touch at 50% and merge, squares stand on their corners so 50% is an exact checkerboard, and triangles
// alternate up and down so they tile the plane outright. The lattice is square or hexagonal.
// In color, dots normally stay large so the picture's colors carry; "size by tone" sizes them by lightness
// as ink only does.
float dark(vec3 c) { return uMono > 0.5 || uTone > 0.5 ? 1.0 - luma(c) : 0.25 + 0.75 * (1.0 - luma(c) * 0.6); }
// Size from darkness: area-proportional up to touching at 50%, then the gaps shrink by area to nothing.
float grow(float d, float touch, float full) { d = clamp(d, 0.0, 1.0); return d < 0.5 ? touch * sqrt(d * 2.0) : full - (full - touch) * sqrt(2.0 - d * 2.0); }
vec2 turn(vec2 f, vec2 id) { if (uTurn < 0.5 || uShape < 0.5) return f; float a = hash(id + 17.3) * 6.2831853, c = cos(a), s = sin(a); return mat2(c, -s, s, c) * f; }
// The size for darkness d. "Even sizes" makes every shape cover the same share of its cell for the same
// tone (k is the shape's area for size 1), so circles, squares, triangles and stars all read alike.
// With "merge" off, dots stop growing when they touch, so they keep their own shape and never squish.
float size(float d, float touch, float full, float k) {
  float s = uEven > 0.5 ? min(full, sqrt(clamp(d, 0.0, 1.0) * (uHex > 0.5 ? 0.8660254 : 1.0) / k)) : grow(d, touch, full);
  return uMerge > 0.5 ? s : min(s, touch);
}
// Signed distance of one dot (in lattice units) for a darkness d.
float dotAt(vec2 f, float d, vec2 id) {
  f = turn(f, id);
  bool hx = uHex > 0.5;
  if (uShape < 0.5) return length(f) - size(d, 0.5, hx ? 0.5774 : 0.7072, 3.14159);
  if (uShape < 1.5) return (abs(f.x) + abs(f.y)) * 0.7071 - size(d, 0.3536, hx ? 0.62 : 0.7072, 4.0);
  if (uShape < 2.5) return sdTri(f, size(d, 0.45, hx ? 1.05 : 1.25, 1.7320508));
  return sdStar(f, size(d, 0.62, 1.15, 1.3), 0.45);
}
void main() {
  float ca = cos(uAngle), sa = sin(uAngle);
  mat2 R = mat2(ca, -sa, sa, ca);
  vec2 r = R * dp() / uSize; float aa = 0.8 / (uSize * uK), sdm = 1e9; vec3 ink = uInk;
  if (uShape > 1.5 && uShape < 2.5 && uTurn < 0.5) {
    // Triangles tile the plane in rows of alternating up and down ones; each scales about its centre.
    const float H = 0.8660254;
    vec2 g = vec2(r.x - 0.5 * r.y / H, r.y / H), cell = floor(g), f = fract(g);
    bool up = f.x + f.y < 1.0;
    vec2 ck = cell + (up ? vec2(1.0 / 3.0) : vec2(2.0 / 3.0)), cen = vec2(ck.x + 0.5 * ck.y, ck.y * H);
    vec4 c = tex(toUv(transpose(R) * (cen * uSize)));
    float s = sqrt(clamp(dark(c.rgb), 0.0, 1.0));
    vec2 p = r - cen; if (!up) p.y = -p.y;
    float e = max(-p.y, max(dot(p, vec2(0.8660254, 0.5)), dot(p, vec2(-0.8660254, 0.5))));
    if (uClassic > 0.5) {
      // One-way triangles: ink grows in the upward triangles until they fill half the plane at 50%; past
      // that the downward ones fill in too, leaving shrinking paper triangles that point the other way.
      float dd = clamp(dark(c.rgb), 0.0, 1.0), m;
      if (up) m = dd < 0.004 ? 0.0 : smoothstep(aa, -aa, e - 0.2887 * min(1.0, sqrt(2.0 * dd)) - aa * step(0.5, dd));
      else m = dd <= 0.5 ? 0.0 : 1.0 - smoothstep(aa, -aa, e - 0.2887 * sqrt(max(0.0, 2.0 - 2.0 * dd)));
      o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, m), 1.0); return;
    }
    // Full triangles overlap by a hair, so solid ink shows no seams between them.
    float sd = e - 0.2887 * s - aa * smoothstep(0.9, 1.0, s);
    float m = s < 0.02 ? 0.0 : smoothstep(aa, -aa, sd);
    o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, m), 1.0); return;
  }
  if (uHex > 0.5) {
    // Hexagonal lattice: rows half a step apart, offset by half a dot.
    const float H = 0.8660254; float j0 = floor(r.y / H);
    for (int j = -1; j <= 2; j++) {
      float row = j0 + float(j), off = mod(row, 2.0) * 0.5, i0 = floor(r.x - off);
      for (int i = -1; i <= 1; i++) {
        vec2 id = vec2(i0 + float(i), row), cen = vec2(id.x + 0.5 + off, row * H + 0.5 * H);
        vec4 c = tex(toUv(transpose(R) * (cen * uSize)));
        float d = dark(c.rgb), sd = d < 0.004 ? 1e9 : dotAt(r - cen, d, id);
        if (sd < sdm) { sdm = sd; if (uMono < 0.5) ink = c.rgb; }
      }
    }
  } else {
    vec2 base = floor(r) + 0.5;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec4 c = tex(toUv(transpose(R) * (cell * uSize)));
      float d = dark(c.rgb), sd = d < 0.004 ? 1e9 : dotAt(r - cell, d, cell);
      if (sd < sdm) { sdm = sd; if (uMono < 0.5) ink = c.rgb; }
    }
  }
  o = vec4(mix(uPaper, ink, smoothstep(aa, -aa, sdm)), 1.0);
}`,

    ascii: `uniform sampler2D uAtlas; uniform float uCell; uniform float uCount; uniform float uMono; uniform float uInvert; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  vec2 d = dp(), cell = floor(d / uCell);
  vec4 c = tex(toUv((cell + 0.5) * uCell));
  float v = luma(c.rgb); if (uInvert < 0.5) v = 1.0 - v;
  float idx = floor(clamp(v, 0.0, 0.999) * uCount);
  vec2 g2 = d / uCell, l = fract(g2);
  // Gradients from the unwrapped position, so the mip level doesn't jump at every cell edge.
  vec2 sc = vec2(1.0 / uCount, 1.0);
  float g = textureGrad(uAtlas, vec2((idx + l.x) / uCount, l.y), dFdx(g2) * sc, dFdy(g2) * sc).r;
  o = vec4(mix(uPaper, uMono > 0.5 ? uInk : c.rgb, g), 1.0);
}`,

    glyphs: `uniform sampler2D uAtlas; uniform sampler2D uTex2; uniform float uMem; uniform float uCell; uniform float uCount; uniform float uMono; uniform float uGamma; uniform float uChange; uniform float uBack; uniform vec3 uInk; uniform vec3 uPaper; uniform float uTime;
// Glyph field: every cell holds a character whose opacity follows the brightness underneath, like a
// screen of text lit from behind. The character is read from what's under the cell (its brightness and
// hue, stepped), so a still picture keeps its letters and they change where the picture changes. Shuffle
// swaps them a whole number of times per loop, so the field still loops; when each cell swaps follows a
// slow noise field, so changes sweep across in drifting fronts and clusters rather than as even static.
void main() {
  vec2 d = dp(), g2 = d / uCell, cell = floor(g2);
  vec4 c = tex(toUv((cell + 0.5) * uCell));
  float v = pow(clamp(luma(c.rgb), 0.0, 1.0), uGamma);
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), hue = 0.0;
  if (mx - mn > 0.08) hue = mx == c.r ? mod((c.g - c.b) / (mx - mn), 6.0) : mx == c.g ? (c.b - c.r) / (mx - mn) + 2.0 : (c.r - c.g) / (mx - mn) + 4.0;
  vec2 look = vec2(floor(luma(c.rgb) * 7.0), floor(hue * 1.5));
  // With Keep on, the letter follows a per-cell count of color changes (glyphMem), so it never returns.
  if (uMem > 0.5) look = vec2(floor(texelFetch(uTex2, ivec2(cell), 0).b * 255.0 + 0.5), 0.5);
  float wave = fbm(cell * 0.06 + uSeed * 0.13) * 2.2 + hash(cell + uSeed * 0.731) * 0.18;
  float slot = uChange > 0.5 ? floor(fract(uTime + wave) * uChange) : 0.0;
  float idx = min(floor(hash(cell * 1.618 + look * vec2(5.17, 11.3) + vec2(slot * 7.31, slot * 3.17) + uSeed * 0.37) * uCount), uCount - 1.0);
  vec2 l = fract(g2);
  vec2 sc = vec2(1.0 / uCount, 1.0);
  float a = textureGrad(uAtlas, vec2((idx + l.x) / uCount, l.y), dFdx(g2) * sc, dFdy(g2) * sc).r * v;
  if (uMono > 0.5) { o = vec4(mix(uPaper, uInk, a), 1.0); return; }
  // In color, each glyph takes the hue underneath at full strength; its opacity carries the brightness.
  vec3 fg = mix(c.rgb, c.rgb / max(max(c.r, max(c.g, c.b)), 0.06), 0.75);
  o = vec4(mix(c.rgb * uBack, clamp(fg, 0.0, 1.0), a), 1.0);
}`,

    // Glyph field memory, one texel per cell: the color it last changed at and how many times it changed.
    // A cell counts a change only once its color has moved clearly away, so edges don't flicker.
    glyphMem: `uniform sampler2D uTex2; uniform float uCell; uniform vec2 uFull;
vec3 lh(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), hue = 0.0;
  if (mx - mn > 0.08) hue = mx == c.r ? mod((c.g - c.b) / (mx - mn), 6.0) : mx == c.g ? (c.b - c.r) / (mx - mn) + 2.0 : (c.r - c.g) / (mx - mn) + 4.0;
  return vec3(clamp(luma(c), 0.0, 1.0), mx - mn > 0.08 ? 0.1 + 0.9 * hue / 6.0 : 0.0, 0.0);
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec3 now = lh(tex((cell + 0.5) * uCell * uK / uFull).rgb);
  vec4 s = texelFetch(uTex2, ivec2(cell), 0);
  if (s.a < 0.5) { o = vec4(now.xy, 0.0, 1.0); return; }
  float dh = abs(now.y - s.g) / 0.9 * 6.0;
  bool moved = abs(now.x - s.r) > 0.14 || (now.y > 0.0) != (s.g > 0.0) || (now.y > 0.0 && min(dh, 6.0 - dh) > 0.7);
  o = moved ? vec4(now.xy, mod(floor(s.b * 255.0 + 0.5) + 1.0, 256.0) / 255.0, 1.0) : s;
}`,

    dither: `uniform float uMat; uniform float uLevels; uniform float uMono; uniform float uPix; uniform vec3 uInk; uniform vec3 uPaper; uniform float uPal; uniform vec3 uCol[8]; uniform int uN; uniform float uGap;
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
  if (uPal > 0.5) {
    // Design colors: the palette, darkest first, is a path through color; each cell finds the step of it
    // closest to its own color and takes one end or the other by the threshold, so blends between two
    // colors come out as checks and patterns of both.
    vec3 p1 = uCol[0], p2 = uCol[0]; float f = 0.0, best = 1e9;
    for (int i = 0; i < 7; i++) {
      if (i + 1 >= uN) break;
      vec3 a = uCol[i], dv = uCol[i + 1] - a; float t = clamp(dot(c.rgb - a, dv) / max(dot(dv, dv), 1e-5), 0.0, 1.0);
      vec3 e = c.rgb - a - dv * t; float dd = dot(e, e);
      if (dd < best) { best = dd; p1 = a; p2 = uCol[i + 1]; f = t; }
    }
    vec3 col = f > th + 0.5 ? p2 : p1;
    // Gap: the cells shrink to squares with the darkest color showing between them.
    vec2 g = fract(vUv * uRes / cell) - 0.5; float gp = 0.5 - 0.5 * uGap, aa = 0.5 / cell;
    o = vec4(mix(uCol[0], col, smoothstep(gp + aa, gp - aa, max(abs(g.x), abs(g.y)))), 1.0); return;
  }
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

    lens: `uniform float uBump; uniform float uBlend; uniform float uShape; uniform float uSize; uniform float uRound; uniform float uThick; uniform float uFrost; uniform float uTint; uniform float uLight; uniform vec2 uC;
// Liquid glass: one pane of the shared glass, rounded over toward its edges, with a soft contact shadow.
void main() {
  vec2 res = uRes / uK; float m = min(res.x, res.y);
  vec2 p = dp() - uC * res, hb; float rad;
  if (uShape < 0.5) { hb = vec2(uSize * m * 0.5); rad = hb.x; }
  else if (uShape < 1.5) { hb = vec2(uSize * m * 0.95, uSize * m * 0.3); rad = hb.y; }
  else { hb = vec2(uSize * m * 0.5); rad = uSize * m * 0.16; }
  float sd = sdBox(p, hb, rad);
  vec2 n = normalize(vec2(sdBox(p + vec2(0.5, 0.0), hb, rad) - sdBox(p - vec2(0.5, 0.0), hb, rad), sdBox(p + vec2(0.0, 0.5), hb, rad) - sdBox(p - vec2(0.0, 0.5), hb, rad)) + 1e-6);
  float hm = min(hb.x, hb.y);
  vec2 g = -n * glassSlope(-sd, max(0.5 / uK, uRound * hm));
  vec4 base = tex(vUv);
  float shadow = 0.16 * exp(-max(sdBox(p + vec2(0.0, m * 0.014), hb, rad), 0.0) / (m * 0.03));
  gBlend = uBlend; gBump = uBump; if (uBlend > 0.0) gMean = meanAt(toUv(uC * res), hb * 0.5);
  vec3 inside = glassMat(vUv, g, sd, uThick * hm * 0.5, uFrost * m * 0.03, uTint, uLight, 16);
  float aa = 0.75 / uK;
  o = vec4(mix(base.rgb * (1.0 - shadow), inside, smoothstep(aa, -aa, sd)), base.a);
}`,

    blur: `uniform float uAmt; uniform float uDir; uniform float uStart; uniform sampler2D uTex2;
// Progressive blur: a disc of taps whose radius grows across the picture. The taps read a mip level
// sized to the gap between them, so a wide blur averages smooth areas instead of stacking sharp copies of
// the lines (which is what split them at high values).
void main() {
  vec2 q = vec2(vUv.x, 1.0 - vUv.y); float t;
  if (uDir < 0.5) t = 1.0 - q.y; else if (uDir < 1.5) t = q.y; else if (uDir < 2.5) t = 1.0 - q.x; else if (uDir < 3.5) t = q.x;
  else if (uDir < 4.5) t = length((q - 0.5) * vec2(uRes.x / uRes.y, 1.0)) * 1.3; else t = 1.0;
  float m = uDir > 4.5 ? 1.0 : smoothstep(uStart, 1.0, t);
  o = discBlur(uTex2, vUv, uAmt * m * uK, 0.0);
}`,

    // Depth of field: the picture stays sharp around a focal point (or along a focal band through it, as
    // a tilt-shift lens does) and softens with distance from it. Bright spots open into soft discs, the
    // way out-of-focus highlights do through a real lens.
    dof: `uniform float uAmt; uniform vec2 uF; uniform float uFocus; uniform float uFall; uniform float uBand; uniform float uAngle; uniform float uBokeh; uniform sampler2D uTex2;
void main() {
  vec2 q = vec2(vUv.x, 1.0 - vUv.y), asp = vec2(uRes.x / uRes.y, 1.0), d = (q - uF) * asp;
  float dist = uBand > 0.5 ? abs(dot(d, vec2(-sin(uAngle), cos(uAngle)))) : length(d);
  float m = smoothstep(uFocus, uFocus + max(0.01, uFall), dist);
  o = discBlur(uTex2, vUv, uAmt * m * uK, uBokeh);
}`,

    bloom: `uniform float uThr; uniform float uRad; uniform float uInt;
void main() {
  vec4 c = tex(vUv); vec3 acc = vec3(0.0); float r = uRad * uK, n = uQ.z > 0.0 ? uQ.z : 40.0;
  for (int i = 0; i < 128; i++) { if (float(i) >= n) break; float fi = float(i), a = fi * 2.39996, rr = sqrt((fi + 0.5) / n) * r; vec3 s = tex(vUv + vec2(cos(a), sin(a)) * rr / uRes).rgb; acc += max(s - uThr, 0.0) / (1.0 - uThr + 0.001); }
  o = vec4(c.rgb + acc / n * uInt * 1.6, c.a);
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
uniform float uFlow; uniform float uFlowSize; uniform float uDash; uniform float uDashLen; uniform float uInv;
uniform float uRip; uniform float uRipLen; uniform vec2 uRA; uniform vec2 uRB; uniform float uTime; uniform float uSteps; uniform float uHair;
// Engrave: parallel lines whose thickness follows the picture's tone. Flow bends them along a smooth
// noise field, so they stream round like a currency engraving without ever crossing, and dashes break
// each line into strokes of the given length, every line starting at its own offset. Ripples spread
// rings from two centers through the lines; where the two sets meet they cross into beads and knots.
// Moving, the rings travel out one wavelength per loop. Steps snaps the thickness to a few weights, so a
// line jumps from hairline to bar where the picture crosses a tone, and hairline keeps every line visible.
void main() {
  vec2 nrm = vec2(-sin(uAngle), cos(uAngle)), tng = vec2(nrm.y, -nrm.x), d = dp();
  float bend = uFlow > 0.0 ? uFlow * (fbm(d / uFlowSize + 3.1) - 0.5) * 2.4 * uFlowSize / uSpace : 0.0, bead = 0.0;
  if (uRip > 0.0) {
    vec2 res = uRes / uK; float ph = 6.2831853 * uTime, k = 6.2831853 / max(uRipLen, 2.0);
    float w1 = length(d - uRA * res) * k - ph, w2 = length(d - uRB * res) * k - ph;
    bend += uRip * 0.45 * (sin(w1) + sin(w2)); bead = uRip * 0.8 * cos(w1) * cos(w2);
  }
  float y = dot(d, nrm) / uSpace + bend, f = fract(y) - 0.5;
  vec4 c = tex(toUv(d - nrm * f * uSpace * (uFlow > 0.0 ? 0.0 : 1.0)));
  float tone = luma(c.rgb), tw = uInv > 0.5 ? tone : 1.0 - tone;
  if (uSteps > 0.5) tw = floor(tw * uSteps + 0.5) / uSteps;
  float w = clamp(max(tw * 0.5 * (1.0 + bead), 0.5 * uHair / uSpace), 0.0, 0.5), aa = fwidth(y);
  float m = 1.0 - smoothstep(w - aa, w + aa, abs(f));
  if (uDash > 0.0) {
    float x = dot(d, tng) / uDashLen + hash(vec2(floor(y), 4.7)) * 9.0, ax = fwidth(x);
    float on = 1.0 - uDash * (0.6 + 0.4 * hash(vec2(floor(y), floor(x))));
    m *= smoothstep(on + ax, on - ax, fract(x)) * smoothstep(-ax, ax, fract(x));
  }
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
  // The nearest site, then the true distance to the nearest border (after Inigo Quilez). The difference
  // between the two nearest distances, used before, ran long dark wedges into cells whose sites sat close
  // together, turning them grey.
  vec2 d = dp() / uCell, i = floor(d), f = fract(d), mg = vec2(0.0), mr = vec2(0.0);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), r = g + h2(i + g) - f; float dd = dot(r, r);
    if (dd < md) { md = dd; mr = r; mg = g; }
  }
  md = 8.0;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 g = mg + vec2(float(x), float(y)), r = g + h2(i + g) - f;
    if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  vec4 c = tex(toUv((i + mg + h2(i + mg)) * uCell));
  float e = 1.0 - smoothstep(0.0, uEdge + 0.001, 2.0 * md);
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

    // Cells of the picture that fall away at random where its tone runs out, each a slightly different tint,
    // over the paper with a faint dot grid where cells are gone.
    dissolve: `uniform float uCell; uniform float uShape; uniform float uAmt; uniform float uEdge; uniform float uTint; uniform float uDots; uniform float uLight; uniform float uGap; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  vec2 d = dp(), cell = floor(d / uCell), l = fract(d / uCell) - 0.5;
  // Of five points in the cell, the one with the most of the kept tone, so thin lines aren't missed.
  vec4 c = vec4(0.0); float t = -1.0;
  for (int i = 0; i < 5; i++) {
    vec2 q = i == 0 ? vec2(0.5) : vec2(i == 1 || i == 3 ? 0.25 : 0.75, i < 3 ? 0.25 : 0.75);
    vec4 s = tex(toUv((cell + q) * uCell)); float v = uLight > 0.5 ? luma(s.rgb) : 1.0 - luma(s.rgb);
    if (v > t) { t = v; c = s; }
  }
  float h = hash(cell + uSeed * 0.71);
  // Solid where the kept tone reaches the threshold; below it, a band of Edge width where cells thin out,
  // densest next to the core.
  float on = t >= uAmt ? 1.0 : step(h, pow(clamp((t - uAmt + uEdge) / max(uEdge, 1e-3), 0.0, 1.0), 2.0));
  float r = 0.5 - uGap * 0.5, aa = 1.0 / uCell;
  float sd = uShape < 0.5 ? max(abs(l.x), abs(l.y)) - r : uShape < 1.5 ? length(l) - r : sdBox(l, vec2(r), r * 0.45);
  float m = on * (1.0 - smoothstep(-aa, aa, sd));
  vec3 col = c.rgb * (1.0 + (hash(cell * 1.37 + uSeed) - 0.5) * 2.0 * uTint) + (hash(cell * 2.91 + uSeed) - 0.5) * uTint * 0.25;
  if (uShape > 1.5) col *= 1.0 + 0.5 * (l.y - l.x) * smoothstep(-0.18, 0.0, sd);
  float dot0 = (1.0 - smoothstep(0.06 - aa, 0.06 + aa, length(l))) * uDots;
  vec3 bg = mix(uPaper, uInk, dot0 * 0.35);
  o = vec4(mix(bg, clamp(col, 0.0, 1.0), m), 1.0);
}`,

    // Thin-film color: tone (or slope) sets the film's thickness, and each channel interferes at its own
    // wavelength, so the picture runs through soap-bubble and oil-slick bands.
    irid: `uniform float uBands; uniform float uShift; uniform float uMix; uniform float uPearl; uniform float uSlope; uniform float uAnim; uniform float uTime; uniform float uMid;
// Midtones keeps the film to the tones between dark and light, so blacks and whites stay clean and only
// the soft edges between them turn to rainbow.
void main() {
  vec4 c = tex(vUv); float l = luma(c.rgb);
  vec2 e = toUv(vec2(2.0));
  float gx = luma(tex(vUv + vec2(e.x, 0.0)).rgb) - luma(tex(vUv - vec2(e.x, 0.0)).rgb), gy = luma(tex(vUv + vec2(0.0, e.y)).rgb) - luma(tex(vUv - vec2(0.0, e.y)).rgb);
  float th = mix(l, clamp(length(vec2(gx, gy)) * 4.0 + l * 0.35, 0.0, 1.0), uSlope) * uBands + uShift + uAnim * uTime;
  vec3 film = 0.5 + 0.5 * cos(6.2831853 * (th * vec3(1.0, 1.25, 1.42) + vec3(0.0, 0.1, 0.2)));
  vec3 r = mix(film * (0.3 + 0.85 * l), mix(film, vec3(1.0), 0.45), uPearl);
  o = vec4(mix(c.rgb, clamp(r, 0.0, 1.0), uMix * mix(1.0, pow(clamp(4.0 * l * (1.0 - l), 0.0, 1.0), 2.0), uMid)), c.a);
}`,

    // Thin film: the colors of a film of oil on water or a soap bubble, worked out from the physics. Light
    // reflects off the film's top and bottom faces; the two reflections add or cancel by wavelength, with a
    // path difference of 2nd (n the film's index, d its thickness), so each thickness keeps its own mix of
    // wavelengths. The spectrum reflected (Airy's formula for one layer) is weighed by the eye's color
    // matching curves (the analytic fit of Wyman, Sloan and Shirley, 2013) into XYZ, then sRGB. The picture's
    // tone sets the thickness, so its gradients turn into Newton's sequence of fringes: black where the film
    // is thinnest, then silver, gold, magenta, blue, green, and paler pinks and greens as it thickens.
    // Foil is holographic foil instead, a diffraction grating: its grooves (spacing d) send each wavelength
    // off at its own angle, sin(angle) = m * wavelength / d, so as the tone (standing in for the angle)
    // changes the foil runs through the pure spectrum, the higher orders m repeating it more tightly.
    film: `uniform float uFoil; uniform float uThin; uniform float uThick; uniform float uIdx; uniform float uSub; uniform float uGain; uniform float uVivid; uniform float uMix; uniform float uMid; uniform float uAnim; uniform float uTime;
float lobe(float l, float m, float a, float b) { float t = (l - m) * (l < m ? a : b); return exp(-0.5 * t * t); }
vec3 cmf(float l) {
  return vec3(1.056 * lobe(l, 599.8, 0.0264, 0.0323) + 0.362 * lobe(l, 442.0, 0.0625, 0.0375) - 0.065 * lobe(l, 501.1, 0.049, 0.0382),
              0.821 * lobe(l, 568.8, 0.0213, 0.0247) + 0.286 * lobe(l, 530.9, 0.0613, 0.0322),
              1.217 * lobe(l, 437.0, 0.0847, 0.0278) + 0.681 * lobe(l, 459.0, 0.0385, 0.0725));
}
void main() {
  vec4 c = tex(vUv); float l = clamp(luma(c.rgb), 0.0, 1.0);
  float d = mix(uThin, uThick, l) + uAnim * 120.0 * sin(6.2831853 * uTime);
  float r1 = (1.0 - uIdx) / (1.0 + uIdx), r2 = (uIdx - uSub) / (uIdx + uSub);
  vec3 xyz = vec3(0.0); float yw = 0.0;
  if (uFoil > 0.5) {
    // Real foil is a little rough, so each order spreads over a band of angles: three samples across it.
    for (int m = 1; m < 5; m++) for (int k = -1; k < 2; k++) { float lam = uThick * (l + float(k) * 0.02) / float(m); if (lam > 380.0 && lam < 720.0) xyz += cmf(lam) * 0.12; }
    yw = 1.0;
  } else for (int i = 0; i < 24; i++) {
    float lam = 390.0 + float(i) * 13.5, cs = cos(12.5663706 * uIdx * d / lam);
    float R = (r1 * r1 + r2 * r2 + 2.0 * r1 * r2 * cs) / (1.0 + r1 * r1 * r2 * r2 + 2.0 * r1 * r2 * cs);
    vec3 m = cmf(lam); xyz += R * m; yw += m.y;
  }
  xyz /= yw;
  vec3 rgb = mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz * uGain;
  rgb = max(mix(vec3(dot(rgb, vec3(0.2126, 0.7152, 0.0722))), rgb, 1.0 + uVivid), 0.0);
  rgb = pow(clamp(rgb, 0.0, 1.0), vec3(1.0 / 2.2));
  // Where the film thins away to nothing, the picture underneath shows through.
  o = vec4(mix(c.rgb, rgb, uMix * (uFoil > 0.5 ? 1.0 : smoothstep(0.0, 40.0, d)) * mix(1.0, pow(clamp(4.0 * l * (1.0 - l), 0.0, 1.0), 1.5), uMid)), c.a);
}`,

    // An LED board: fixed dots on black whose brightness follows the picture, with a soft glow between them.
    led: `uniform float uPitch; uniform float uSize; uniform float uGlow; uniform float uOff; uniform float uShape; uniform float uGamma; uniform float uByTone;
// Lit color of a cell: the picture with its contrast raised, so lit dots read bright against unlit ones.
vec3 lit(vec2 cell) { vec3 c = tex(toUv((cell + 0.5) * uPitch)).rgb; return pow(c, vec3(uGamma)) * (0.9 + 0.5 * uGamma); }
vec3 dotAt(vec2 cell, vec2 d) {
  vec3 c = lit(cell);
  vec2 l = d / uPitch - cell - 0.5; float r = uSize * 0.5 * mix(1.0, sqrt(clamp(luma(c), 0.04, 1.0)), uByTone), aa = 1.0 / uPitch;
  if (uShape > 1.5) {
    float k = floor(clamp((l.x + 0.5) * 3.0, 0.0, 2.99)); vec2 q = vec2(fract((l.x + 0.5) * 3.0) - 0.5, l.y * 1.0 / 1.5);
    vec3 ch = k < 0.5 ? vec3(c.r, 0.0, 0.0) : k < 1.5 ? vec3(0.0, c.g, 0.0) : vec3(0.0, 0.0, c.b);
    return max(ch, vec3(uOff) * vec3(k < 0.5, k > 0.5 && k < 1.5, k > 1.5)) * 2.4 * (1.0 - smoothstep(-aa * 3.0, aa * 3.0, max(abs(q.x) - uSize * 0.42, abs(q.y) - uSize * 0.32)));
  }
  float sd = uShape < 0.5 ? length(l) - r : max(abs(l.x), abs(l.y)) - r * 0.89;
  return max(c, vec3(uOff)) * (1.0 - smoothstep(-aa, aa, sd));
}
void main() {
  vec2 d = dp(), cell = floor(d / uPitch);
  vec3 col = dotAt(cell, d), g = vec3(0.0);
  if (uGlow > 0.0) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 q = cell + vec2(float(x), float(y)); vec2 l = d / uPitch - q - 0.5;
    g += lit(q) * exp(-dot(l, l) / (0.25 * uSize * uSize + 0.05));
  }
  o = vec4(clamp(vec3(0.012) + col + g * uGlow * 0.32, 0.0, 1.0), 1.0);
}`,

    // Streaks dragged out of the picture in strips: each strip gets its own length, some don't move at all.
    smear: `uniform float uLen; uniform float uAngle; uniform float uBand; uniform float uAmt; uniform float uJit; uniform float uThr;
void main() {
  vec2 d = dp(), dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  float row = floor(dot(d, nrm) / uBand), h = hash(vec2(row, 3.7) + uSeed);
  vec4 c = tex(vUv);
  if (h > uAmt) { o = c; return; }
  float L = uLen * (1.0 - uJit * hash(vec2(row, 11.1) + uSeed)) + 1.0, j = hash(gl_FragCoord.xy);
  vec3 acc = vec3(0.0); float ws = 0.0;
  for (int i = 0; i < 32; i++) {
    float f = (float(i) + j) / 32.0; vec3 s = tex(toUv(d - dir * f * L)).rgb;
    float w = (1.0 - f) * (uThr > 0.0 ? smoothstep(uThr - 0.05, uThr + 0.05, luma(s)) : 1.0);
    acc += s * w; ws += w;
  }
  o = vec4(ws > 0.01 ? mix(c.rgb, acc / ws, min(1.0, ws * 0.25)) : c.rgb, c.a);
}`,

    // Glowing lines at even steps of the picture's tone, over a darkened copy of it.
    glowlines: `uniform float uLevels; uniform float uWidth; uniform float uGlow; uniform float uDim; uniform float uCore; uniform float uAnim; uniform float uTime; uniform float uSide;
float tone(vec2 uv) { vec2 e = toUv(vec2(uWidth * 0.35)); return 0.25 * (luma(tex(uv + vec2(e.x, 0.0)).rgb) + luma(tex(uv - vec2(e.x, 0.0)).rgb) + luma(tex(uv + vec2(0.0, e.y)).rgb) + luma(tex(uv - vec2(0.0, e.y)).rgb)); }
void main() {
  vec4 c = tex(vUv);
  // Distance to the nearest line in design px: the tone's distance to the next level over its slope.
  float e = max(1.0, uWidth * 0.5), t = tone(vUv), v = t * uLevels + uAnim * uTime;
  vec2 o2 = toUv(vec2(e));
  float slope = length(vec2(tone(vUv + vec2(o2.x, 0.0)) - tone(vUv - vec2(o2.x, 0.0)), tone(vUv + vec2(0.0, o2.y)) - tone(vUv - vec2(0.0, o2.y)))) / (2.0 * e) * uLevels;
  float px = min(fract(v), 1.0 - fract(v)) / max(slope, 1e-5), pu = fract(v) / max(slope, 1e-5);
  // A wide halo and a tighter body, like light bleeding out of a tube. One side throws the halo off one
  // side of the line only, as light bent through a fold, with a hard edge on the other.
  float w = max(0.5, uWidth), g = (mix(exp(-px / w), exp(-pu / (w * 1.6)), uSide) * 0.55 + exp(-px / (w * mix(0.3, 0.08, uSide))) * 0.75) * uGlow, core = uCore * (1.0 - smoothstep(0.5, 1.5, px * uK));
  // The line's color is the picture's own hue at full strength, so it glows rather than greys out.
  float mx = max(c.r, max(c.g, c.b));
  vec3 hot = mix(c.rgb / max(mx, 0.08), vec3(1.0), 0.12) * 1.1;
  o = vec4(clamp(c.rgb * (1.0 - uDim) + hot * g + mix(hot, vec3(1.0), 0.5) * core, 0.0, 1.0), c.a);
}`,

    // Banknote line work: rings around several centers, a rosette, or crossing waves, each family drawn as
    // fine lines whose phase the picture's tone bends, so the picture shows through as engraving.
    guilloche: `uniform float uMd; uniform float uSpace; uniform float uWidth; uniform float uCount; uniform float uTone; uniform float uOver; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper; uniform vec2 uC;
float lineOf(float f, float w) { float px = min(fract(f), 1.0 - fract(f)) / max(fwidth(f), 1e-4); return 1.0 - smoothstep(w - 0.75, w + 0.75, px); }
void main() {
  vec4 c = tex(vUv); vec2 d = dp(), ds = uRes / uK, ctr = uC * ds; float m = min(ds.x, ds.y), tone = luma(c.rgb) * uTone * 2.0, w = uWidth * uK * 0.5, L = 0.0;
  if (uMd < 0.5) {
    for (int i = 0; i < 6; i++) { if (float(i) >= uCount) break; float a = 6.2831853 * float(i) / uCount + 0.4; vec2 e = ctr + vec2(cos(a), sin(a)) * m * 0.22 * step(1.5, uCount); L = max(L, lineOf(length(d - e) / uSpace + tone, w)); }
  } else if (uMd < 1.5) {
    vec2 q = d - ctr; float r = length(q), th = atan(q.y, q.x), amp = uSpace * 3.0;
    L = max(lineOf((r + amp * sin(uCount * th + r / uSpace * 0.15)) / uSpace + tone, w), lineOf((r + amp * sin(uCount * th - r / uSpace * 0.15 + 1.0)) / uSpace + tone, w));
  } else {
    float k = 6.2831853 * uCount / ds.x, amp = uSpace * 4.0;
    L = max(lineOf((d.y + amp * sin(d.x * k + d.y * 0.004)) / uSpace + tone, w), lineOf((d.y + amp * sin(d.x * k + 3.14159 + d.y * 0.004)) / uSpace + tone, w));
  }
  vec3 ink = uMono > 0.5 ? uInk : c.rgb * 0.8, bg = mix(uPaper, c.rgb, uOver);
  o = vec4(mix(bg, ink, L), c.a);
}`,

    // Ridge lines: stacked lines lifted by the picture's brightness, each filled below so it hides the
    // lines behind it, like a ridge plot.
    ridge: `uniform float uSpace; uniform float uHeight; uniform float uWidth; uniform float uRNoise; uniform float uFill; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper;
float lift(float x, float i) { float l = luma(tex(toUv(vec2(x, i * uSpace))).rgb); return l * (1.0 + uRNoise * (fbm(vec2(x * 0.03, i * 1.73)) - 0.5) * 2.0); }
void main() {
  vec2 d = dp(); float hm = uHeight * (1.0 + uRNoise), w = uWidth * 0.5, aa = 0.75 / uK;
  vec3 col = uPaper; float i = floor((d.y - hm) / uSpace) - 1.0;
  for (int k = 0; k < 160; k++) {
    float cv = i * uSpace + uHeight * lift(d.x, i);
    if (cv + w + aa >= d.y || i * uSpace > d.y) {
      vec3 pc = tex(toUv(vec2(d.x, i * uSpace))).rgb, ink = uMono > 0.5 ? uInk : pc;
      col = mix(mix(uPaper, pc * 0.35 + uPaper * 0.2, uFill), ink, 1.0 - smoothstep(w - aa, w + aa, abs(d.y - cv)));
      break;
    }
    i += 1.0;
  }
  o = vec4(col, 1.0);
}`,

    // Echo: copies of the picture, each smaller and turned a little further around a center, fading as
    // they go, so it trails off into a spiral. Animated, the copies slide one step along per loop.
    feedback: `uniform float uCopies; uniform float uZoom; uniform float uRot; uniform float uDecay; uniform float uHue; uniform float uAnim; uniform float uTime; uniform vec2 uC; uniform float uAdd;
vec3 hueRot(vec3 c, float a) { vec3 k = vec3(0.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }
void main() {
  vec4 c = tex(vUv); vec2 ds = uRes / uK, d = dp(), ctr = uC * ds; float t = uAnim > 0.5 ? fract(uTime) : 0.0;
  vec3 acc = c.rgb;
  for (int i = 1; i <= 24; i++) {
    float k = float(i); if (k > uCopies) break; float kt = k + t, a = uRot * kt;
    vec2 q = ctr + mat2(cos(a), -sin(a), sin(a), cos(a)) * (d - ctr) * pow(uZoom, kt), uv = q / ds;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
    // Copies fade out at their own edges rather than ending in a hard rectangle.
    vec2 ed = min(uv, 1.0 - uv); float soft = smoothstep(0.0, 0.08, min(ed.x, ed.y));
    float wgt = soft * pow(uDecay, kt) * (i == 1 ? max(t, 1.0 - uAnim) : 1.0) * (k == floor(uCopies) ? 1.0 - t : 1.0);
    vec3 s = hueRot(tex(uv).rgb, uHue * kt) * wgt;
    acc = uAdd > 0.5 ? acc + s * 0.5 : max(acc, s);
  }
  o = vec4(clamp(acc, 0.0, 1.0), c.a);
}`,

    // Glitch: strips of the picture torn sideways and blocks knocked out of place, with red and blue
    // pulled apart where it breaks. Speed re-rolls the damage a whole number of times per loop.
    glitch: `uniform float uSlices; uniform float uShift; uniform float uProb; uniform float uBlock; uniform float uBlockAmt; uniform float uSplit; uniform float uSpeed; uniform float uTime;
void main() {
  vec2 ds = uRes / uK, d = dp(); float fr = uSpeed > 0.0 ? floor(fract(uTime) * uSpeed) : 0.0, sd = uSeed * 0.37 + fr * 13.1;
  float sh = ds.y / max(uSlices, 1.0), row = floor(d.y / sh + hash(vec2(floor(d.y / (sh * 3.0)), sd)) * 0.999);
  vec2 off = vec2(0.0);
  if (hash(vec2(row, sd + 1.7)) < uProb) off.x = (hash(vec2(row, sd + 4.1)) - 0.5) * 2.0 * uShift;
  vec2 cell = floor(d / uBlock);
  if (uBlockAmt > 0.0 && hash(cell + sd * 1.3) < uProb * 0.4) off += (vec2(hash(cell + 7.7 + sd), hash(cell + 3.3 + sd)) - 0.5) * uBlock * 2.0 * uBlockAmt;
  float br = length(off) > 0.5 ? 1.0 : 0.0; vec2 sp = vec2(uSplit * br + uSplit * 0.15, 0.0);
  vec4 c = tex(toUv(d - off));
  o = vec4(tex(toUv(d - off + sp)).r, c.g, tex(toUv(d - off - sp)).b, c.a);
}`,

    // Pixel sort: runs of pixels brighter than the threshold are redrawn as a smooth run from one end's
    // color to the other's, so bright areas melt into streaks. Stretch drags one line across instead.
    pixsort: `uniform float uMd; uniform float uThr; uniform float uLen; uniform float uAngle; uniform float uPos; uniform float uBands;
void main() {
  vec2 d = dp(), dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x), ds = uRes / uK; vec4 c = tex(vUv);
  if (uMd > 0.5) {
    vec2 ctr = ds * 0.5; float u = dot(d - ctr, dir), v = dot(d - ctr, nrm), lim = (uPos - 0.5) * length(ds);
    if (u > lim) { if (uBands > 0.5) v = (floor(v / uBands) + 0.5) * uBands; c = tex(toUv(ctr + dir * lim + nrm * v)); }
    o = c; return;
  }
  if (luma(c.rgb) < uThr) { o = c; return; }
  float st = uLen / 48.0, a = 0.0, b = 0.0;
  for (int i = 1; i <= 48; i++) { if (luma(tex(toUv(d - dir * st * float(i))).rgb) < uThr) break; a = st * float(i); }
  for (int i = 1; i <= 48; i++) { if (luma(tex(toUv(d + dir * st * float(i))).rgb) < uThr) break; b = st * float(i); }
  // Each end is then found to a fraction of a pixel, so neighboring runs don't step and ripple.
  float ha = st * 0.5, hb = st * 0.5;
  for (int i = 0; i < 5; i++) {
    if (a < uLen && luma(tex(toUv(d - dir * (a + ha))).rgb) >= uThr) a += ha;
    if (b < uLen && luma(tex(toUv(d + dir * (b + hb))).rgb) >= uThr) b += hb;
    ha *= 0.5; hb *= 0.5;
  }
  vec3 c0 = tex(toUv(d - dir * a)).rgb, c1 = tex(toUv(d + dir * b)).rgb;
  if (luma(c0) > luma(c1)) { vec3 tt = c0; c0 = c1; c1 = tt; }
  o = vec4(mix(c0, c1, smoothstep(0.0, 1.0, a / max(a + b, 1e-3))), c.a);
}`,

    // Light streaks: bright parts of the picture smeared along 2 to 8 spokes, red and blue reaching a
    // little different lengths, so highlights flare into glints and stars.
    streaks: `uniform float uThr; uniform float uLen; uniform float uAngle; uniform float uPoints; uniform float uInt; uniform float uChroma;
vec3 bright(vec2 uv) { vec3 c = tex(uv).rgb; return max(c - uThr, 0.0) / max(1.0 - uThr, 0.05); }
void main() {
  vec4 c = tex(vUv); vec3 acc = vec3(0.0); float nd = max(1.0, floor(uPoints * 0.5 + 0.5)), ws = 0.0;
  for (int j = 0; j < 4; j++) {
    if (float(j) >= nd) break; float a = uAngle + 3.14159265 * float(j) / nd; vec2 dir = vec2(cos(a), sin(a));
    for (int k = 1; k <= 24; k++) {
      float f = float(k) / 24.0, w = (1.0 - f) * (1.0 - f), s = f * uLen;
      for (int sg = -1; sg <= 1; sg += 2) {
        vec2 o2 = dir * float(sg);
        acc += w * vec3(bright(vUv + toUv(o2 * s * (1.0 + uChroma * 0.2))).r, bright(vUv + toUv(o2 * s)).g, bright(vUv + toUv(o2 * s * (1.0 - uChroma * 0.2))).b);
        ws += w;
      }
    }
  }
  o = vec4(clamp(c.rgb + acc / max(ws, 1.0) * uInt * 6.0 * nd, 0.0, 1.0), c.a);
}`,

    // Outline: the picture's edges as glowing neon on dark, as ink lines on paper, or the picture solarized
    // (tones past the threshold flipped).
    outline: `uniform float uMd; uniform float uThr; uniform float uWidth; uniform float uGlow; uniform float uKeep; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper;
float sob(vec2 uv, float r) {
  vec2 e = toUv(vec2(r));
  float tl = luma(tex(uv + vec2(-e.x, e.y)).rgb), t = luma(tex(uv + vec2(0.0, e.y)).rgb), tr = luma(tex(uv + e).rgb);
  float l = luma(tex(uv - vec2(e.x, 0.0)).rgb), rr = luma(tex(uv + vec2(e.x, 0.0)).rgb);
  float bl = luma(tex(uv - e).rgb), b = luma(tex(uv - vec2(0.0, e.y)).rgb), br = luma(tex(uv + vec2(e.x, -e.y)).rgb);
  return length(vec2(tr + 2.0 * rr + br - tl - 2.0 * l - bl, tl + 2.0 * t + tr - bl - 2.0 * b - br));
}
void main() {
  vec4 c = tex(vUv);
  if (uMd > 1.5) { o = vec4(mix(c.rgb, 1.0 - c.rgb, smoothstep(uThr - 0.08, uThr + 0.08, luma(c.rgb))), c.a); return; }
  float e = smoothstep(uThr, uThr + 0.15, sob(vUv, uWidth)), g = smoothstep(uThr * 0.5, uThr + 0.3, sob(vUv, uWidth * 4.0)) * uGlow;
  float mx = max(c.r, max(c.g, c.b)); vec3 hue = uMono > 0.5 ? uInk : c.rgb / max(mx, 0.08);
  if (uMd < 0.5) o = vec4(clamp(c.rgb * uKeep * 0.6 + hue * (e + g * 0.5) + vec3(e * 0.25), 0.0, 1.0), c.a);
  else o = vec4(mix(mix(uPaper, c.rgb, uKeep), uMono > 0.5 ? uInk : c.rgb * 0.55, clamp(e + g * 0.3, 0.0, 1.0)), c.a);
}`,

    // Grid: tiles that split into four wherever the picture changes inside them, each filled with its
    // color and outlined; or Truchet, quarter arcs per cell that thicken where the picture is dark.
    grid: `uniform float uMd; uniform float uCell; uniform float uDepth; uniform float uThr; uniform float uStroke; uniform float uRad; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper;
void main() {
  vec2 d = dp(); vec4 c0 = tex(vUv); float aa = 0.75 / uK;
  if (uMd > 0.5) {
    vec2 id = floor(d / uCell), l = d / uCell - id; float S = uCell;
    if (hash(id + uSeed * 0.71) < 0.5) l.x = 1.0 - l.x;
    float r = min(abs(length(l) - 0.5), abs(length(l - 1.0) - 0.5)) * S;
    vec3 pc = tex(toUv((id + 0.5) * S)).rgb; float w = uStroke * (0.25 + 1.5 * (1.0 - luma(pc)));
    o = vec4(mix(uPaper, uMono > 0.5 ? uInk : pc, 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, r)), 1.0); return;
  }
  float S = uCell; vec2 id = floor(d / S);
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uDepth) break;
    id = floor(d / S); vec2 b = id * S;
    float l1 = luma(tex(toUv(b + S * vec2(0.25))).rgb), l2 = luma(tex(toUv(b + S * vec2(0.75, 0.25))).rgb), l3 = luma(tex(toUv(b + S * vec2(0.25, 0.75))).rgb), l4 = luma(tex(toUv(b + S * vec2(0.75))).rgb);
    if (max(max(l1, l2), max(l3, l4)) - min(min(l1, l2), min(l3, l4)) < uThr || S < 6.0) break;
    S *= 0.5;
  }
  id = floor(d / S); vec2 ctr = (id + 0.5) * S, p = d - ctr;
  vec3 fill = (tex(toUv(ctr)).rgb * 2.0 + tex(toUv(ctr + S * 0.25)).rgb + tex(toUv(ctr - S * 0.25)).rgb) * 0.25;
  float hb = S * 0.5 - uStroke * 0.5, sd = sdBox(p, vec2(hb), clamp(uRad, 0.0, 0.5) * hb * 2.0);
  vec3 line = uMono > 0.5 ? uInk : fill * 0.55;
  vec3 col = mix(line, fill, smoothstep(aa, -aa, sd + uStroke * 0.5));
  o = vec4(mix(uMono > 0.5 ? uPaper : line, col, smoothstep(aa, -aa, sd)), 1.0);
}`,

    // Beam: a glowing outline (ring, arch, rounded square or star) with a white-hot core and a spectral
    // fringe, optionally repeated inward.

    grain: `uniform float uAmt; uniform float uSize; uniform float uMono; uniform float uSoft; uniform float uAnim; uniform float uTime;
void main() {
  vec4 c = tex(vUv);
  // Animated grain draws a fresh pattern every frame, like film running through a gate.
  vec2 g = floor(dp() / uSize) + uSeed * 0.37 + (uAnim > 0.5 ? floor(uTime * 977.0) * vec2(13.7, 7.3) : vec2(0.0));
  // Film grain averages a few samples (softer, rounder clumps); fine grain is one hash per cell.
  float n = uSoft > 0.5 ? (hash(g) + hash(g + 0.5) + vnoise(dp() / uSize * 0.7 + (g - floor(dp() / uSize))) - 1.5) / 1.4 : hash(g) - 0.5;
  n *= 1.0 - 0.5 * abs(luma(c.rgb) - 0.5);
  vec3 nn = uMono > 0.5 ? vec3(n) : vec3(n, hash(g + 7.1) - 0.5, hash(g + 3.3) - 0.5);
  c.rgb += nn * uAmt * 0.7;
  o = c;
}`,
  };

  // Default pipeline order when effects are added; the app can reorder freely.
  const ORDER = ["liquify", "wave", "smear", "pixsort", "glitch", "swirl", "bulge", "ripple", "touch", "trail", "sea", "water", "kaleido", "glass", "mesh", "lens", "rays", "chrome", "heatmap", "paper", "cmyk", "blur", "dof", "feedback", "bloom", "streaks", "glowlines", "emboss", "irid", "film", "gradmap", "posterize", "pixel", "dissolve", "grid", "voronoi", "halftone", "linescreen", "riso", "guilloche", "ridge", "outline", "ascii", "glyphs", "dither", "led", "scan", "chroma", "vignette", "grain"];
  const CHARSETS = { ascii: " .:-=+*#%@", blocks: " ░▒▓█", dots: " ·•●", binary: " 01", lines: " ─═│╬" };
  // Glyph field sets: picked at random per cell, so order doesn't matter and there's no blank.
  const GLYPHSETS = {
    alnum: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    hex: "0123456789abcdef",
    binary: "01",
    symbols: "+-*/=<>#%&@$!?^~:;|{}[]()",
    kana: "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789",
  };

  const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const rad = (d) => (d * Math.PI) / 180;

  const OBJ_KINDS = ["sphere", "torus", "cube", "capsule", "blob", "image", "pyramid", "diamond"];
  const INTS = new Set(["uGStage", "uPStage", "uPath", "uKind", "uMat", "uProj", "uHasTex", "uType", "uN", "uNoise", "uMotion", "uPattern", "uOct", "uNPts", "uUser", "uNFeat", "uFirst", "uMode", "uNInk", "uHasH"]);
  function createFX(canvas) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true });
    if (!gl) return null;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    // Programs compile in the background where the browser can (KHR_parallel_shader_compile): warm()
    // starts every one without waiting, ready() reports whether they have all finished, and a program's
    // status is only read when it is first drawn with, so nothing stalls the page while shaders build.
    const par = gl.getExtension("KHR_parallel_shader_compile");
    const progs = {};
    function start(name) {
      if (progs[name]) return progs[name];
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram(), vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, HEAD + SHADERS[name]);
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, "aPos");
      gl.linkProgram(p);
      const locs = {};
      return (progs[name] = { p, vs, fs, checked: false, loc: (u) => (u in locs ? locs[u] : (locs[u] = gl.getUniformLocation(p, u))) });
    }
    function program(name) {
      const pr = start(name);
      if (!pr.checked) {
        pr.checked = true;
        if (!gl.getProgramParameter(pr.p, gl.LINK_STATUS)) {
          const why = gl.getShaderParameter(pr.fs, gl.COMPILE_STATUS) ? gl.getProgramInfoLog(pr.p) : gl.getShaderInfoLog(pr.fs);
          delete progs[name]; throw new Error(name + ": " + why);
        }
      }
      return pr;
    }
    const warm = () => { if (par) for (const name of Object.keys(SHADERS)) start(name); };
    // The programs every first frame needs start compiling in the background straight away, so the first
    // drawing waits on them less.
    if (par) for (const name of ["copy", "gradient", "grain"]) if (SHADERS[name]) start(name);
    const ready = () => !par || Object.values(progs).every((pr) => pr.checked || gl.getProgramParameter(pr.p, par.COMPLETION_STATUS_KHR));

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
    let targets = null;

    function ensureTargets(w, h) {
      if (targets && targets.w === w && targets.h === h) return;
      if (targets) targets.list.forEach(({ t, f }) => { gl.deleteTexture(t); gl.deleteFramebuffer(f); });
      // Two to ping-pong between, and a third that holds the design as it was before objects drew on it.
      const list = [0, 1, 2].map(() => {
        const t = newTex();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { t, f };
      });
      targets = { w, h, list };
    }

    // Glyph atlases, one row of square cells per character set and font, kept so two text effects in one
    // stack don't rebuild each other's every frame. Each glyph is drawn smaller than its cell and the
    // atlas is mipmapped, so letters stay legible when the cells are only a few pixels across.
    const FONTS = {
      geist: '"Geist Mono", ui-monospace, Menlo, Consolas, monospace',
      ui: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace',
    };
    const atlases = new Map(), fontAsked = new Set();
    let atlasTexCur = atlasTex;
    function atlas(chars, font = "geist", weight = 500) {
      const fam = FONTS[font] || FONTS.geist, spec = `${weight} 48px ${fam}`;
      // Web fonts load on first use; until then the fallback is drawn, and the atlas is redrawn once it lands.
      let ready = true;
      try { ready = font === "mono" || document.fonts.check(spec); if (!ready && !fontAsked.has(spec)) { fontAsked.add(spec); document.fonts.load(spec); } } catch (e) {}
      const key = chars + "|" + font + "|" + weight + (ready ? "|ok" : "");
      let a = atlases.get(key);
      if (!a) {
        if (atlases.size > 6) { for (const v of atlases.values()) gl.deleteTexture(v.t); atlases.clear(); }
        const glyphs = [...chars], n = Math.max(1, glyphs.length);
        const cs = Math.max(16, Math.min(64, Math.floor(maxSize / n))), c = document.createElement("canvas");
        c.width = cs * n; c.height = cs;
        const x = c.getContext("2d");
        x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
        x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "alphabetic";
        x.font = `${weight} ${Math.round(cs * 0.74)}px ${fam}`;
        // Centered on the ink of a capital, so letters, digits and symbols share one baseline.
        const m = x.measureText("H"), asc = m.actualBoundingBoxAscent || cs * 0.52, base = cs / 2 + asc / 2;
        glyphs.forEach((g, i) => x.fillText(g, i * cs + cs / 2, base));
        const t = newTex();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        a = { t, n };
        atlases.set(key, a);
      }
      atlasTexCur = a.t;
      return a.n;
    }

    function draw(name, input, output, uniforms, w, h, k, seed) {
      const { p, loc } = program(name);
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, output);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, input);
      gl.uniform1i(loc("uTex"), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlasTexCur);
      gl.uniform1i(loc("uAtlas"), 1);
      gl.uniform2f(loc("uRes"), w, h);
      gl.uniform1f(loc("uK"), k);
      gl.uniform1f(loc("uSeed"), seed % 1000);
      const lq = loc("uQ"), lq2 = loc("uQ2");
      if (lq != null) gl.uniform4f(lq, Q.rays, Q.taps, Q.bloom, Q.frost);
      if (lq2 != null) gl.uniform4f(lq2, Q.steps, Q.phys, 0, 0);
      for (const [u, v] of Object.entries(uniforms)) {
        const l = loc(u);
        if (l == null) continue;
        if (INTS.has(u)) gl.uniform1i(l, v);
        else if (u === "uIn") gl.uniform2i(l, v[0], v[1]);
        else if (u === "uTex2") { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, 2); }
        else if (u === "uMip") { gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, 4); }
        else if (u === "uDes") { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, 3); }
        else if ((u === "uPts" || u === "uFeat" || u === "uP" || u === "uV") && v.length) gl.uniform4fv(l, v.flat());
        else if (u === "uInk" && v.length) gl.uniform3fv(l, v.flat());
        else if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 3 && typeof v[0] === "number") gl.uniform3fv(l, v);
        else if (v.length === 2 && typeof v[0] === "number") gl.uniform2fv(l, v);
        else if (v.length === 4 && typeof v[0] === "number") gl.uniform4fv(l, v);
        else if (u === "uCol" && v.length) gl.uniform3fv(l, v.flat());
        else if (u === "uPt" && v.length) gl.uniform2fv(l, v.flat());
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // ---------- contours on the GPU ----------
    // Rendering to float textures needs EXT_color_buffer_float. Without it contours stay on the SVG path.
    const floatOK = !!gl.getExtension("EXT_color_buffer_float"), floatLinear = !!gl.getExtension("OES_texture_float_linear");
    const permTex = gl.createTexture(), fbos = new Map();
    let permSeed = null, rangeKey = "";
    // Float render targets, kept by size and role so a playing animation allocates nothing per frame.
    function floatTarget(role, w, h, fmt) {
      const key = role, have = fbos.get(key);
      if (have && have.w === w && have.h === h) return have;
      if (have) { gl.deleteTexture(have.t); gl.deleteFramebuffer(have.f); }
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      const filt = fmt === "half" || fmt === "rgba" ? gl.LINEAR : gl.NEAREST;
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filt], [gl.TEXTURE_MAG_FILTER, filt], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (fmt === "u8") gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      else if (fmt === "rgba") gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else if (fmt === "half") { if (floatLinear) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null); }
      else gl.texImage2D(gl.TEXTURE_2D, 0, fmt === "rg" ? gl.RG32F : gl.R32F, w, h, 0, fmt === "rg" ? gl.RG : gl.RED, gl.FLOAT, null);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      const out = { t, f, w, h };
      fbos.set(key, out);
      return out;
    }
    // Object textures (pictures and presets), uploaded once per key and kept while in use.
    const objTexs = new Map();
    function objTex(key, src) {
      let t = objTexs.get(key);
      if (t) return t;
      if (objTexs.size > 12) { for (const v of objTexs.values()) gl.deleteTexture(v); objTexs.clear(); }
      t = newTex();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // Mipmaps keep fine stripes in a preset from breaking into moiré when the form is small.
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      objTexs.set(key, t);
      return t;
    }
    function contourPass(c, output, w, h) {
      if (permSeed !== c.perm) {
        permSeed = c.perm;
        gl.bindTexture(gl.TEXTURE_2D, permTex);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 512, 1, 0, gl.RED, gl.FLOAT, c.perm);
      }
      // Drift moves the field under a fixed grid. Sampling the field at the drifted spot would move the grid
      // through the shape, and its interpolation error would shimmer from frame to frame. Instead the grid
      // snaps to whole cells of the field (so every node always reads the same spot of the shape) and the
      // leftover fraction of a cell is applied when the lines are drawn. One spare row and column covers it.
      const fs = { uTex2: permTex, uPattern: c.pattern, uSc: c.sc, uOct: c.oct, uP: c.P, uBump: c.bump, uLiq: c.liquify, uLiqScale: c.liqScale,
        uWarpA: c.warp, uLoop: c.loop, uDir: c.dir, uPts: c.pts, uNPts: c.pts.length, uUser: c.user, uFeat: c.feats.length ? c.feats : [[0, 0, 1, 0]], uNFeat: c.feats.length };
      // Glide reads two fields a loop's travel apart, which can't share one snap, so it reads them as they are.
      const glide = c.glideW != null, snap = glide ? c.drift : [Math.floor(c.drift[0] / c.sx) * c.sx, Math.floor(c.drift[1] / c.sy) * c.sy], shift = [(c.drift[0] - snap[0]) / c.sx, (c.drift[1] - snap[1]) / c.sy];
      const nx = c.nx + 1, ny = c.ny + 1;
      // The level range comes from the same coarse grid the CPU samples (the canvas plus a wide margin, at
      // points round the motion's loop; see rangeSpec in the engine), not from what this frame shows, so
      // levels never jump as the field morphs or a peak crosses the edge. It only changes with the design,
      // so it's kept until the design does.
      const rkey = JSON.stringify([fs.uPattern, fs.uSc, fs.uOct, fs.uP, fs.uBump, fs.uLiq, fs.uLiqScale, fs.uWarpA, fs.uDir, fs.uPts, fs.uUser, fs.uFeat, c.seed, c.w, c.h, c.rng]);
      const keep = floatTarget("mmKeep", 1, 1, "rg");
      if (rangeKey !== rkey) {
        rangeKey = rkey;
        const R = c.rng, all = floatTarget("fieldAll", R.mx, R.my), parts = floatTarget("mmParts", R.loops.length, 1, "rg");
        R.loops.forEach((lp, i) => {
          draw("field", null, all.f, { ...fs, uLoop: lp, uDrift: [-R.M, -R.M], uCell: [R.cx, R.cy] }, R.mx, R.my, 1, 0);
          let src = all, iw = R.mx, ih = R.my, n = 0;
          while (iw > 1 || ih > 1 || n === 0) {
            const ow = Math.max(1, Math.ceil(iw / 4)), oh = Math.max(1, Math.ceil(ih / 4)), dst = floatTarget("mm" + n, ow, oh, "rg");
            draw("fminmax", src.t, dst.f, { uFirst: n === 0 ? 1 : 0, uIn: [iw, ih] }, ow, oh, 1, 0);
            src = dst; iw = ow; ih = oh; n++;
          }
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, parts.f);
          gl.blitFramebuffer(0, 0, 1, 1, i, 0, i + 1, 1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        });
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        draw("frange", parts.t, keep.f, { uIn: [R.loops.length, 1], uPad: R.pad }, 1, 1, 1, 0);
      }
      const mm = keep;
      let fld = floatTarget("field", nx, ny);
      draw("field", null, fld.f, { ...fs, uDrift: snap, uCell: [c.sx, c.sy] }, nx, ny, 1, 0);
      if (glide) {
        const f2 = floatTarget("field2", nx, ny), fm = floatTarget("fieldMix", nx, ny), t = c.glideW;
        draw("field", null, f2.f, { ...fs, uLoop: c.loop2, uDrift: c.drift2, uCell: [c.sx, c.sy] }, nx, ny, 1, 0);
        draw("fmix", fld.t, fm.f, { uTex2: f2.t, uDes: mm.t, uW: t * t * (3 - 2 * t), uLin: c.lin ? 1 : 0 }, nx, ny, 1, 0);
        fld = fm;
      }
      let fieldTex = fld.t;
      const sg = c.sigma / Math.max(c.sx, c.sy);
      if (sg > 0.3) {
        const b1 = floatTarget("blurA", nx, ny), b2 = floatTarget("blurB", nx, ny);
        draw("fblur", fld.t, b1.f, { uDir2: [1, 0], uSigma: sg, uIn: [nx, ny] }, nx, ny, 1, 0);
        draw("fblur", b1.t, b2.f, { uDir2: [0, 1], uSigma: sg, uIn: [nx, ny] }, nx, ny, 1, 0);
        fieldTex = b2.t;
      }
      draw("contours", fieldTex, output, {
        uTex2: mm.t, uCell: [c.sx, c.sy], uIn: [nx, ny], uShift: shift, uDesign: [c.w, c.h],
        uMode: c.mode, uLin: c.lin ? 1 : 0, uGap: c.gap, uPh: c.phase, uLevels: c.levels, uG: c.g,
        uWeight: c.weight, uEvery: c.every, uIdxW: c.indexWeight, uBand: c.band, uBlend: c.blend,
        uInk: c.inks.map(hex3), uNInk: c.inks.length, uBg: hex3(c.bg), uClear: c.clear, uOpacity: c.opacity, uAng: c.angle,
      }, w, h, 1, 0);
    }

    function effectUniforms(id, e, ink, paper) {
      switch (id) {
        case "liquify": return { uAmt: e.amount, uScale: e.scale };
        case "glass": return { uWidth: e.width, uAngle: rad(e.angle), uRound: e.round ?? 1, uThick: e.thick ?? 0.6, uFrost: e.frost ?? 0.2, uTint: e.tint || 0, uLight: e.light ?? 0.5, uBlend: e.blend || 0, uBump: e.texture || 0 };
        case "mesh": return { uCell: e.cell, uGap: e.gap ?? 1, uRad: e.radius ?? 0.25, uRound: e.round ?? 0.4, uThick: e.thick ?? 0.6, uFrost: e.frost ?? 0.3, uTint: e.tint || 0, uLight: e.light ?? 0.6, uFade: e.fade || 0, uFadeAng: rad(e.fadeAngle ?? 45), uHexT: e.layout === "hex" ? 1 : 0, uBlend: e.blend || 0, uBump: e.texture || 0, uAsp: e.stretch ?? 1 };
        case "pixel": return { uSize: e.size, uBevel: e.bevel };
        case "halftone": return { uSize: e.size, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper, uShape: Math.max(0, ["circle", "square", "triangle", "star"].indexOf(e.shape)), uHex: e.grid === "hex" ? 1 : 0, uTurn: e.turn ? 1 : 0, uTone: e.tone ? 1 : 0, uEven: e.even ? 1 : 0, uMerge: e.merge === false ? 0 : 1, uClassic: e.classic ? 1 : 0 };
        case "ascii": {
          const set = e.set === "custom" ? " " + (e.custom || "#") : CHARSETS[e.set] || CHARSETS.ascii;
          return { uCell: e.cell, uMem: e.keep === false ? 0 : 1, uCount: atlas(set, e.font), uMono: e.mono ? 1 : 0, uInvert: e.invert ? 1 : 0, uInk: ink, uPaper: paper };
        }
        case "glyphs": {
          const set = e.set === "custom" ? [...new Set(e.custom || "")].filter((ch) => ch.trim()).join("") || "#" : GLYPHSETS[e.set] || GLYPHSETS.alnum;
          return { uCell: e.cell, uMem: e.keep === false ? 0 : 1, uCount: atlas(set, e.font), uMono: e.mono ? 1 : 0, uGamma: e.contrast ?? 1, uChange: Math.round(e.change ?? 0), uBack: e.back ?? 0, uInk: ink, uPaper: paper };
        }
        case "dither": return { uMat: e.matrix, uLevels: e.levels, uMono: e.mono ? 1 : 0, uPix: e.pix, uInk: ink, uPaper: paper, uPal: e.palette ? 1 : 0, uGap: e.gap || 0 };
        case "chroma": return { uAmt: e.amount };
        case "wave": return { uAmp: e.amp, uLen: e.length, uAngle: rad(e.angle) };
        case "swirl": return { uAmt: e.amount, uRad: e.radius, uC: [e.x, 1 - e.y] };
        case "kaleido": return { uSeg: e.segments, uRot: rad(e.rotate), uZoom: e.zoom };
        case "lens": return { uShape: ["circle", "pill", "square"].indexOf(e.shape), uSize: e.size, uRound: e.round ?? 0.6, uThick: e.thick ?? 0.8, uFrost: e.frost, uTint: e.tint || 0, uLight: e.light ?? 0.6, uC: [e.x, 1 - e.y], uBlend: e.blend || 0, uBump: e.texture || 0 };
        case "blur": return { uAmt: e.amount, uDir: ["top", "bottom", "left", "right", "center", "even"].indexOf(e.dir), uStart: e.start };
        case "dof": return { uAmt: e.amount, uF: [e.x ?? 0.5, e.y ?? 0.5], uFocus: e.focus ?? 0.12, uFall: e.falloff ?? 0.35, uBand: e.shape === "band" ? 1 : 0, uAngle: rad(e.angle || 0), uBokeh: e.bokeh ?? 0.4 };
        case "bloom": return { uThr: e.threshold, uRad: e.radius, uInt: e.intensity };
        case "emboss": return { uStr: e.strength, uAngle: rad(e.angle), uDepth: e.depth };
        case "vignette": return { uAmt: e.amount, uSoft: e.softness };
        case "gradmap": return { uC1: hex3(e.c1), uC2: hex3(e.c2), uC3: hex3(e.c3), uMix: e.mix };
        case "posterize": return { uLevels: e.levels };
        case "linescreen": return { uSpace: e.spacing, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper, uFlow: e.flow || 0, uFlowSize: e.flowSize || 300, uDash: e.dash || 0, uDashLen: e.dashLen || 24, uInv: e.invert ? 1 : 0, uRip: e.ripple || 0, uRipLen: e.ripLen || 40, uRA: [e.x ?? 0.15, 1 - (e.y ?? 0.9)], uRB: [e.x2 ?? 0.85, 1 - (e.y2 ?? 0.9)], uSteps: e.steps || 0, uHair: e.hair || 0 };
        case "riso": return { uSize: e.size, uOff: e.offset, uGrain: e.grain, uInkA: hex3(e.inkA), uInkB: hex3(e.inkB), uPaper: hex3(e.paper) };
        case "voronoi": return { uCell: e.cell, uEdge: e.edge };
        case "scan": return { uSpace: e.spacing, uStr: e.strength };
        case "guilloche": return { uMd: Math.max(0, ["rings", "rosette", "waves"].indexOf(e.mode)), uSpace: e.spacing, uWidth: e.width, uCount: e.count, uTone: e.tone, uOver: e.over, uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper, uC: [e.x ?? 0.5, 1 - (e.y ?? 0.5)] };
        case "ridge": return { uSpace: e.spacing, uHeight: e.height, uWidth: e.width, uRNoise: e.noise, uFill: e.fill, uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "feedback": return { uCopies: e.copies, uZoom: e.zoom, uRot: rad(e.rotate), uDecay: e.decay, uHue: rad(e.hue), uAnim: e.anim ? 1 : 0, uAdd: e.blend === "add" ? 1 : 0, uC: [e.x ?? 0.5, 1 - (e.y ?? 0.5)] };
        case "glitch": return { uSlices: e.slices, uShift: e.shift, uProb: e.amount, uBlock: e.block, uBlockAmt: e.blocks, uSplit: e.split, uSpeed: Math.round(e.speed || 0) };
        case "pixsort": return { uMd: e.mode === "stretch" ? 1 : 0, uThr: e.threshold, uLen: e.length, uAngle: rad(e.angle), uPos: e.pos, uBands: e.bands };
        case "streaks": return { uThr: e.threshold, uLen: e.length, uAngle: rad(e.angle), uPoints: e.points, uInt: e.intensity, uChroma: e.chroma };
        case "outline": return { uMd: Math.max(0, ["neon", "ink", "solarize"].indexOf(e.mode)), uThr: e.threshold, uWidth: e.width, uGlow: e.glow, uKeep: e.keep, uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "grid": return { uMd: e.mode === "truchet" ? 1 : 0, uCell: e.cell, uDepth: e.depth, uThr: e.threshold, uStroke: e.stroke, uRad: e.radius, uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper };
        case "dissolve": return { uCell: e.cell, uShape: Math.max(0, ["square", "circle", "tile"].indexOf(e.shape)), uAmt: e.amount, uEdge: e.edge, uTint: e.tint, uDots: e.dots, uLight: e.keep === "light" ? 1 : 0, uGap: e.gap, uInk: ink, uPaper: paper };
        case "film": return { uFoil: e.kind === "foil" ? 1 : 0, uThin: e.thin ?? 0, uThick: e.thick ?? 900, uIdx: e.index ?? 1.47, uSub: e.base ?? 1.33, uGain: e.gain ?? 5, uVivid: e.vivid ?? 0.4, uMix: e.mix ?? 1, uMid: e.mid || 0, uAnim: e.anim ? 1 : 0 };
        case "irid": return { uBands: e.bands, uShift: e.shift, uMix: e.mix, uPearl: e.pearl, uSlope: e.source === "slope" ? 1 : 0, uAnim: e.anim ? 1 : 0, uMid: e.mid || 0 };
        case "led": return { uPitch: e.pitch, uSize: e.size, uGlow: e.glow, uOff: e.off, uGamma: e.contrast ?? 1, uByTone: e.bytone ? 1 : 0, uShape: Math.max(0, ["round", "square", "rgb"].indexOf(e.shape)) };
        case "smear": return { uLen: e.length, uAngle: rad(e.angle), uBand: e.band, uAmt: e.amount, uJit: e.jitter, uThr: e.threshold };
        case "glowlines": return { uLevels: e.levels, uWidth: e.width, uGlow: e.glow, uDim: e.dim, uCore: e.core, uAnim: e.anim ? 1 : 0, uSide: e.side || 0 };
        case "bulge": return { uAmt: e.amount, uRad: e.radius, uC: [e.x, 1 - e.y] };
        case "ripple": return { uAmp: e.amp, uLen: e.length, uDecay: e.decay, uShade: e.shade, uC: [e.x, 1 - e.y], uAnim: e.anim ? Math.round(e.speed || 3) : 0 };
        case "water": return { uAmt: e.amount, uScale: e.scale, uCaustic: e.caustic, uAnim: e.anim ? 1 : 0 };
        case "sea": return { uAmt: e.amount, uScale: e.scale, uCaustic: e.caustic, uChop: e.chop ?? 0.5, uDepth: e.depth ?? 0.3, uSpeed: Math.round(e.speed ?? 1) };
        case "cmyk": return { uSize: e.size, uAngle: rad(e.angle), uPaper: paper, uShape: Math.max(0, ["circle", "square", "triangle", "star"].indexOf(e.shape)) };
        case "paper": return { uCrumple: e.crumple, uFiber: e.fiber, uScale: e.scale };
        case "heatmap": return { uGlow: e.glow, uMix: e.mix, uInvert: e.invert ? 1 : 0 };
        case "chrome": return { uStr: e.strength, uBands: e.bands, uSoft: e.soft, uTint: hex3(e.tint), uMix: e.mix };
        case "rays": return { uLen: e.length, uThr: e.threshold, uInt: e.intensity, uC: [e.x, 1 - e.y] };
        case "grain": return { uAmt: e.amount, uSize: e.size, uMono: e.mono ? 1 : 0, uSoft: e.soft ? 1 : 0, uAnim: e.anim ? 1 : 0 };
        case "touch": return { uAmp: e.amp, uLen: e.length, uSpeed: e.speed, uLife: e.life, uShade: e.shade };
        case "trail": return { uSmoke: e.mode === "smoke" ? 1 : 0, uCol: hex3(e.color || "#ffffff") };
      }
      return {};
    }

    // job: { w, h, k, seed, image?: canvas, grad?: {...}, fx: {...}, ink, paper }
    // ---------- fluid ----------
    // One simulation per pipeline, stepped once per frame by the time since the last, fed by pointer
    // events it hasn't seen yet. Velocity lives on a coarse grid of square cells; the smoke (or, in Fluid
    // mode, the offset field) on a finer one.
    let fluid = null;
    function fluidStep(job, e, w, h) {
      const dsW = job.w / job.k, dsH = job.h / job.k, asp = dsW / dsH, N = 112;
      const sw = Math.round(asp >= 1 ? N * asp : N), sh = Math.round(asp >= 1 ? N : N / asp);
      const dm = Math.min(640, Math.max(w, h)), dw = Math.round(asp >= 1 ? dm : dm * asp), dh = Math.round(asp >= 1 ? dm / asp : dm);
      const mode = e.mode === "smoke" ? 1 : 0, key = `${sw}x${sh}|${dw}x${dh}|${mode}`;
      const T = (r, ww, hh, f = "rgba") => floatTarget("fl" + r, ww, hh, f);
      const clear = (t) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.f); gl.viewport(0, 0, t.w, t.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); };
      const demo = !!job.pointer.demo;
      if (!fluid || fluid.key !== key || demo) {
        fluid = { key, v: [T("v0", sw, sh), T("v1", sw, sh)], d: [T("d0", dw, dh), T("d1", dw, dh)], p: [T("p0", sw, sh), T("p1", sw, sh)], dv: T("dv", sw, sh), cu: T("cu", sw, sh), lastT: -1, lastNow: -1, prev: null };
        [...fluid.v, ...fluid.d, ...fluid.p].forEach(clear);
      }
      const F = fluid, life = Math.max(0.2, e.life || 1.6), size = Math.max(4, e.size || 90), str = e.strength ?? 1;
      const swap = (k) => F[k].reverse();
      const run = (name, src, dst, un) => draw(name, src.t, dst.f, un, dst.w, dst.h, 1, 0);
      const splat = (x, y, vx, vy) => {
        const pt = [x / dsW, y / dsH], rad = Math.pow(size / dsH, 2) * 0.35;
        run("f_splat", F.v[0], F.v[1], { uPt: pt, uRad: rad, uVal: [vx * sw / dsW * str, vy * sh / dsH * str, 0, 0], uAsp: asp }); swap("v");
        if (mode) { run("f_splat", F.d[0], F.d[1], { uPt: pt, uRad: rad, uVal: [0, 0, 0, 0.45], uAsp: asp }); swap("d"); }
      };
      const feed = (ev) => {
        for (const p of ev) {
          if (p[2] <= F.lastT) continue;
          // Fast strokes are filled in between samples, so the trail is a line, not a string of beads.
          const q = F.prev && p[2] - F.prev[2] < 0.12 ? F.prev : null, n = q ? Math.min(8, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / (size * 0.4))) : 1;
          for (let i = 1; i <= n; i++) { const f = i / n; splat(q ? q[0] + (p[0] - q[0]) * f : p[0], q ? q[1] + (p[1] - q[1]) * f : p[1], p[3] || 0, p[4] || 0); }
          F.prev = p; F.lastT = p[2];
        }
      };
      const step = (dt) => {
        run("f_curl", F.v[0], F.cu, {});
        run("f_vort", F.v[0], F.v[1], { uTex2: F.cu.t, uCurl: (e.swirl ?? 0.6) * 28, uDt: dt }); swap("v");
        run("f_div", F.v[0], F.dv, {});
        clear(F.p[0]);
        for (let i = 0; i < 16; i++) { run("f_press", F.p[0], F.p[1], { uTex2: F.dv.t }); swap("p"); }
        run("f_grad", F.v[0], F.v[1], { uTex2: F.p[0].t }); swap("v");
        run("f_adv", F.v[0], F.v[1], { uTex2: F.v[0].t, uDt: dt, uDiss: 1.4 / life, uVelTexel: [1 / sw, 1 / sh], uOff: 0 }); swap("v");
        run("f_adv", F.v[0], F.d[1], { uTex2: F.d[0].t, uDt: dt, uDiss: (mode ? 1.1 : 1.6) / life, uVelTexel: [1 / sw, 1 / sh], uOff: mode ? 0 : 1 }); swap("d");
      };
      if (demo) {
        // Thumbnails: a stroke drawn across the frame, simulated for a moment, then frozen.
        const ev = job.pointer.trail || [];
        for (let f = 0; f < 36; f++) { feed(ev.filter((p) => p[2] <= f / 60)); step(1 / 60); }
      } else {
        const now = job.pointer.now || 0, dt = F.lastNow < 0 || now - F.lastNow > 0.5 ? 1 / 60 : Math.min(1 / 30, Math.max(0, now - F.lastNow));
        F.lastNow = now;
        feed(job.pointer.trail || []);
        if (dt > 0) step(dt);
      }
      return F.d[0];
    }

    function render(job) {
      const w = Math.min(maxSize, Math.max(1, Math.round(job.w))), h = Math.min(maxSize, Math.max(1, Math.round(job.h)));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ensureTargets(w, h);
      const k = job.k * (w / job.w);
      let input, ping = 0;
      if (job.grad) {
        const g = job.grad, n = Math.min(8, g.colors.length);
        const gu = {
          uType: ["mesh", "linear", "radial", "conic", "flow", "noise", "aura", "wavegrad", "paint", "folds"].indexOf(g.type), uN: n,
          uScale: g.scale ?? 1.2, uDetail: g.detail ?? 3, uStretch: g.stretch ?? 1, uContrast: g.contrast ?? 1,
          uNoise: ["clouds", "ridges", "billow", "cells", "veins", "marble", "neuro", "ring", "aura", "smoke", "caustic"].indexOf(g.noise || "clouds"),
          uCol: g.colors.slice(0, 8).map(hex3), uPt: g.points.slice(0, 8).map((p) => [p.x, p.y]),
          uWarp: g.warp, uWarpScale: g.warpScale, uPCell: g.cells || 0, uSoft: g.soft, uAngle: rad(g.angle), uPrism: g.prism ?? 0,
          uTime: job.time || 0, uMotion: ["still", "drift", "flow", "breathe", "pulse"].indexOf(job.motion || "still"), uMotAmt: job.motionAmt ?? 0.5, uEndless: +job.endless || 0,
          uPath: job.endless ? 0 : Math.max(0, ["orbit", "sway", "glide"].indexOf(job.path || "orbit")), uMDir: [-Math.cos(rad(job.mangle ?? 30)), Math.sin(rad(job.mangle ?? 30))], uGLin: 0,
          // A program keeps its uniforms between draws, so Paint's stage is cleared for every other generator.
          uPStage: 0, uGStage: 0,
        };
        if (g.type === "paint" && floatOK) {
          // Paint flows in passes over a texture with a margin round the frame (see paintSeed in the shader).
          const m = 0.3, dw = Math.round(w * (1 + 2 * m)), dh = Math.round(h * (1 + 2 * m)), dom = [-m, -m, 1 + 2 * m, 1 + 2 * m];
          const A = floatTarget("paintA", dw, dh, "rgba"), B = floatTarget("paintB", dw, dh, "rgba"), pu = { ...gu, uPDom: dom, uPAsp: w / h, uPath: gu.uPath === 2 ? 0 : gu.uPath }; // Paint can't fade between two runs, so glide goes round.
          const steps = Math.round(Math.min(8, Math.max(1, g.detail ?? 5)) * 4), passes = Math.ceil(steps / 2);
          draw("gradient", srcTex, A.f, { ...pu, uPStage: 1, uPCellNow: 0 }, dw, dh, k, job.seed);
          let src = A, dst = B, done = 0, celled = false;
          for (let i = 0; i < passes; i++) {
            const sub = Math.round((steps * (i + 1)) / passes) - done, last = i === passes - 1;
            // Cells go in at the first pass past 85% of the flow (see paintCells in the shader).
            const cellNow = !celled && (done + sub >= steps * 0.85 || last); celled ||= cellNow;
            draw("gradient", src.t, last ? targets.list[0].f : dst.f, { ...pu, uPStage: last ? 3 : 2, uPSub: sub, uPCellNow: cellNow ? 1 : 0 }, last ? w : dw, last ? h : dh, k, job.seed);
            done += sub; [src, dst] = [dst, src];
          }
        } else if (gu.uPath === 2 && [1, 3, 4].includes(gu.uMotion) && floatOK && (g.type === "flow" || g.type === "noise")) {
          const A = floatTarget("glideA", w, h, "rgba"), B = floatTarget("glideB", w, h, "rgba"), t = gu.uTime;
          draw("gradient", srcTex, A.f, { ...gu, uGLin: t, uGStage: 1 }, w, h, k, job.seed);
          draw("gradient", srcTex, B.f, { ...gu, uGLin: t - 1, uGStage: 1 }, w, h, k, job.seed);
          draw("gradient", A.t, targets.list[0].f, { ...gu, uTex2: B.t, uGW: t * t * (3 - 2 * t), uGStage: 2 }, w, h, k, job.seed);
        } else if (gu.uPath === 2 && [1, 3, 4].includes(gu.uMotion) && floatOK) {
          const B = floatTarget("glideB", w, h, "rgba"), t = gu.uTime;
          draw("gradient", srcTex, targets.list[1].f, { ...gu, uGLin: t }, w, h, k, job.seed);
          draw("gradient", srcTex, B.f, { ...gu, uGLin: t - 1 }, w, h, k, job.seed);
          draw("gmix", targets.list[1].t, targets.list[0].f, { uTex2: B.t, uW: t * t * (3 - 2 * t) }, w, h, k, job.seed);
        } else draw("gradient", srcTex, targets.list[0].f, { ...gu, uGLin: 0 }, w, h, k, job.seed);
        input = targets.list[0].t; ping = 1;
      } else if (job.contours) {
        contourPass(job.contours, targets.list[0].f, w, h);
        input = targets.list[0].t; ping = 1;
      } else {
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, job.image);
        input = srcTex;
      }
      // Objects draw under the effects unless set to sit over them. Each keeps its own motion: off, or
      // the design's loop run a whole number of times faster, slower or backwards, so it still loops.
      const cols = (job.palette || ["#222222", "#dddddd"]).slice(0, 8).map(hex3), sz = Math.min(w, h);
      // Objects that wear the design read it from a copy made before any of them drew, so none wears another.
      let des = srcTex;
      if ((job.objects || []).some((o) => o.kind !== "image" && (o.mat === "design" || (o.mat === "preset" && !o.tex)))) {
        draw("copy", input, targets.list[2].f, {}, w, h, k, job.seed); des = targets.list[2].t;
      }
      const drawObjects = (list) => {
        for (const ob of list) {
          const out = targets.list[ping], tx = ob.tex ? objTex(ob.texKey, ob.tex) : null, sp = ob.speed ?? 1, t = (job.time || 0) * sp;
          draw("object", input, out.f, {
            uKind: OBJ_KINDS.indexOf(ob.kind), uC: [ob.x * w, ob.y * h], uSz: Math.max(1, ob.size * sz * 0.5), uRot: rad(ob.rot || 0), uTilt: rad(ob.tilt || 0), uSpin: rad(ob.spin || 0),
            uMat: ["shaded", "design", "preset", "glass", "palette", "photo", "vanta"].indexOf(ob.mat), uShine: ob.shine ?? 0.6, uRipple: ob.ripple || 0, uShadow: ob.shadow ?? 0.4, uAsp: ob.asp || 1, uRound: ob.round ?? 0.2,
            uProj: Math.max(0, ["wrap", "front", "sphere"].indexOf(ob.proj)), uTexSc: ob.texScale ?? 1, uTexRot: rad(ob.texRot || 0), uTexOff: [ob.texX || 0, ob.texY || 0], uBlend: ob.blend || 0,
            uRefr: ob.refract ?? 1, uBody: ob.body ? 1 : 0, uFrost: ob.frost || 0, uDisp: ob.disp ?? 0.3, uRim: ob.rim ?? 0.5, uTint: hex3(ob.tint || "#ffffff"), uTintAmt: ob.tintAmt || 0,
            uCol: cols, uN: cols.length, uTex2: tx || srcTex, uHasTex: tx ? 1 : 0, uDes: des,
            uTime: t - Math.floor(t), uMotion: ob.anim === false || !sp ? 0 : ["still", "drift", "flow", "breathe", "pulse"].indexOf(job.motion || "still"), uMotAmt: job.motionAmt ?? 0.5,
          }, w, h, k, job.seed);
          input = out.t; ping = 1 - ping;
        }
      };
      drawObjects((job.objects || []).filter((o) => o.layer !== "over"));
      const ink = hex3(job.ink), paper = hex3(job.paper);
      for (const id of job.order || ORDER) {
        const e = job.fx[id];
        if (!e || !e.on || !SHADERS[id]) continue;
        const out = targets.list[ping];
        const un = effectUniforms(id, e, ink, paper);
        if (id === "dither" && e.palette) { const pl = [...new Set(job.palette || [])].slice(0, 8); un.uCol = pl.length ? pl.map(hex3) : [ink, paper]; un.uN = un.uCol.length; }
        un.uTime = job.time || 0;
        if (id === "touch") {
          // Click events: positions in design pixels, y up, with their age.
          const ev = (job.pointer?.touch || []).slice(-8);
          un.uNP = ev.length; un.uP = ev.map((p) => [p[0], p[1], p[2], 0]);
        }
        if (id === "trail") {
          // Without a pointer (exports, thumbnails of other effects) or float targets, trails draw nothing.
          if (!job.pointer || !floatOK) continue;
          un.uTex2 = fluidStep(job, e, w, h).t;
        }
        if (id === "glyphs" && un.uMem) {
          // Sized in cells of the design, so a lower-resolution preview frame keeps the same memory.
          const cw = Math.ceil(w / k / e.cell), ch = Math.ceil(h / k / e.cell), prev = floatTarget(memFlip ? "gmA" : "gmB", cw, ch, "u8"), next = floatTarget(memFlip ? "gmB" : "gmA", cw, ch, "u8");
          draw("glyphMem", input, next.f, { uTex2: prev.t, uCell: e.cell, uFull: [w, h] }, cw, ch, k, 0);
          un.uTex2 = next.t; memFlip = !memFlip;
        }
        if (id === "blur" || id === "dof") un.uTex2 = mipOf(input, w, h, k);
        if (id === "glass" || id === "mesh" || id === "lens") un.uMip = mipOf(input, w, h, k);
        if (id === "chrome" && floatOK) {
          const a = floatTarget("chA", w, h, "half"), b = floatTarget("chB", w, h, "half"), sg = Math.max(0.8, (e.soft || 8) * k * 0.7);
          draw("hblur", input, a.f, { uDir2: [1, 0], uSigma: sg, uFirst: 1 }, w, h, k, 0);
          draw("hblur", a.t, b.f, { uDir2: [0, 1], uSigma: sg, uFirst: 0 }, w, h, k, 0);
          un.uTex2 = b.t; un.uHasH = 1;
        }
        draw(id, input, out.f, un, w, h, k, e.seed ? e.seed : job.seed);
        input = out.t; ping = 1 - ping;
      }
      drawObjects((job.objects || []).filter((o) => o.layer === "over"));
      draw("copy", input, null, {}, w, h, k, job.seed);
      return { w, h };
    }

    // A copy of the picture so far with a full mip chain, for blurs wide enough to need prefiltering.
    let mipT = null, memFlip = false;
    function mipOf(src, w, h, k) {
      if (!mipT || mipT.w !== w || mipT.h !== h) {
        if (mipT) { gl.deleteTexture(mipT.t); gl.deleteFramebuffer(mipT.f); }
        const t = newTex();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        mipT = { t, f, w, h };
      }
      draw("copy", src, mipT.f, {}, w, h, k, 0);
      gl.bindTexture(gl.TEXTURE_2D, mipT.t); gl.generateMipmap(gl.TEXTURE_2D);
      return mipT.t;
    }

    // Resolves once the GPU has finished the work sent so far, so callers can time real frame cost.
    function sync() {
      const f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!f) return Promise.resolve();
      gl.flush();
      const t0 = performance.now();
      return new Promise((done) => {
        const poll = () => {
          const st = gl.getSyncParameter(f, gl.SYNC_STATUS);
          if (st === gl.SIGNALED || performance.now() - t0 > 1000) { gl.deleteSync(f); done(); } else setTimeout(poll, 1);
        };
        poll();
      });
    }
    return { render, maxSize, warm, ready, floatOK, sync };
  }

  // Effect quality, shared by every context (Settings, Performance). Zero keeps a shader's standard amount.
  const Q = { rays: 0, taps: 0, bloom: 0, frost: 0, steps: 0, phys: 0 };
  const setQuality = (q) => Object.assign(Q, q);
  root.TopoFX = { createFX, ORDER, CHARSETS, OBJ_KINDS, setQuality, quality: () => ({ ...Q }) };
})(window);
