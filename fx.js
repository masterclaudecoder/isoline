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
// Halftone dot shapes, sized so the darkest dots just meet their neighbors.
float sdTri(vec2 p, float r) { const float k = 1.7320508; p.y = -p.y - r * 0.25; p.x = abs(p.x) - r; p.y += r / k; if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0; p.x -= clamp(p.x, -2.0 * r, 0.0); return -length(p) * sign(p.y); }
float sdStar(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994, -0.587785252), k2 = vec2(-0.809016994, -0.587785252);
  p.y = -p.y; p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float dotSD(vec2 f, float r, float shape) {
  if (shape < 0.5) return length(f) - r;
  if (shape < 1.5) return max(abs(f.x), abs(f.y)) - r * 0.7;
  if (shape < 2.5) return sdTri(f, r * 0.82);
  return sdStar(f, r * 1.05, 0.45);
}
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Frosted sample: n blur taps on a golden spiral, rotated and spread per pixel so the blur reads as frost
// rather than ghosted copies, with red and blue pulled apart along disp.
vec3 frostDisp(vec2 uv, float rad, vec2 disp, int n) {
  vec3 c = vec3(0.0);
  float j = hash(gl_FragCoord.xy) * 6.2831853;
  for (int i = 0; i < n; i++) {
    float a = float(i) * 2.39996 + j, r = n > 1 ? sqrt((float(i) + hash(gl_FragCoord.xy + float(i) * 7.13)) / float(n)) * rad : 0.0;
    vec2 q = uv + toUv(vec2(cos(a), sin(a)) * r);
    c += vec3(tex(q + disp).r, tex(q).g, tex(q - disp).b);
  }
  return c / float(n);
}
// Liquid glass inside a shape. sd < 0 inside (in px), n is the outward normal, bez the bezel width.
// The bezel samples from further out, so what sits just past the edge wraps into the rim.
vec3 liquid(vec2 uv, float sd, vec2 n, float bez, float refr, float frost, float rim, float disp) {
  float x = 1.0 - clamp(-sd / bez, 0.0, 1.0), bend = x * x * x * (1.0 + x);
  float blur = frost + bend * refr * bez * 0.12;
  vec2 off = n * bend * refr * bez * 0.8;
  vec3 c = frostDisp(uv + toUv(off), blur, toUv(off * 0.16 * disp + n * bend * disp * bez * 0.04), blur > 0.5 ? 16 : 1);
  float l = luma(c);
  c = clamp(mix(vec3(l), c, 1.12), 0.0, 1.0);
  c = mix(c, vec3(1.0), 0.05);
  float facing = pow(abs(dot(n, normalize(vec2(-0.6, 0.8)))), 2.0), hair = max(1.1, 0.9 / uK);
  c += rim * (0.85 * exp(sd / hair) * (0.2 + 0.8 * facing) + 0.1 * x * x * x * facing);
  c *= 1.0 - 0.05 * x * x * (1.0 - facing);
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
uniform vec3 uCol[8]; uniform int uN; uniform sampler2D uTex2; uniform int uHasTex;
uniform float uTime; uniform int uMotion; uniform float uMotAmt;
uniform float uRefr; uniform float uFrost; uniform float uDisp; uniform float uRim; uniform vec3 uTint; uniform float uTintAmt;
float gPh = 0.0;
mat3 rotY(float t) { float c = cos(t), s = sin(t); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float t) { float c = cos(t), s = sin(t); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * float(uN - 1);
  int i = min(int(floor(t)), uN - 2); float f = t - float(i); f = f * f * (3.0 - 2.0 * f);
  return mix(toLab(lin(uCol[i])), toLab(lin(uCol[i + 1])), f);
}
float sd(vec3 p) {
  float d;
  if (uKind == 0) d = length(p) - 1.0;
  else if (uKind == 1) d = length(vec2(length(p.xz) - 0.72, p.y)) - 0.3;
  else if (uKind == 2) { vec3 q = abs(p) - vec3(0.6); d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.16; }
  else if (uKind == 3) { vec3 q = p; q.y -= clamp(q.y, -0.55, 0.55); d = length(q) - 0.44; }
  else if (uKind == 6) { vec3 q = abs(p) - vec3(0.78, 0.22, 0.02); d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.2; }
  else d = length(p) - 0.95 + 0.14 * sin(2.6 * p.x + gPh) * sin(2.6 * p.y + gPh * 2.0) * sin(2.6 * p.z - gPh);
  d += uRipple * 0.045 * sin(7.0 * p.x + gPh) * sin(7.0 * p.y - gPh) * sin(7.0 * p.z);
  return d * 0.8;
}
vec2 toPx(vec2 l) { float c = cos(uRot), s = sin(uRot); return uC + mat2(c, s, -s, c) * vec2(l.x, -l.y) * uSz; }
vec4 texAt(vec2 px) { return tex(vec2(px.x / uRes.x, 1.0 - px.y / uRes.y)); }
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
    float lit = 0.88 + 0.12 * dot(n * sign(n.z), L), sp = pow(max(0.0, dot(reflect(rd, n * sign(n.z)), L)), 40.0);
    col = col * lit + uShine * 0.5 * sp;
    o = vec4(mix(base.rgb, clamp(col, 0.0, 1.0), cov), base.a); return;
  }
  float t = 0.0, md = 1e9, mt = 0.0;
  for (int i = 0; i < 80; i++) { float d = sd(Ri * (ro + rd * t)); if (d < md) { md = d; mt = t; } if (d < 0.0005 || t > 6.0) break; t += d; }
  float cov = 1.0 - smoothstep(0.0, 1.5 * px, md);
  if (cov <= 0.0) { o = base; return; }
  vec3 pos = ro + rd * mt; vec2 e = vec2(1.0, -1.0) * 0.0015;
  vec3 n = normalize(e.xyy * sd(Ri * (pos + e.xyy)) + e.yyx * sd(Ri * (pos + e.yyx)) + e.yxy * sd(Ri * (pos + e.yxy)) + e.xxx * sd(Ri * (pos + e.xxx)));
  float wrap = dot(n, L) * 0.5 + 0.5, fr = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0), sp = pow(clamp(dot(reflect(rd, n), L), 0.0, 1.0), 32.0);
  vec3 col;
  if (uMat == 0) {
    vec3 lab = ramp(clamp(0.12 + 0.8 * wrap * wrap + 0.22 * fr, 0.0, 1.0));
    lab.x += 0.3 * sp * uShine;
    col = srgb(fromLab(lab));
  } else if (uMat == 3) {
    // Glass: what's behind bends through the form, most at the edges where the surface turns away, as
    // in a liquid glass pill. Frost blurs it, dispersion splits red from blue along the bend, the rim
    // catches light on the edge facing it, and a tint colors the body.
    vec2 off = n.xy * vec2(1.0, -1.0) * S * 0.45 * uRefr * (0.25 + fr * 1.5);
    vec2 bp = pp + mat2(c, s, -s, c) * off, sx = mat2(c, s, -s, c) * normalize(off + 1e-4) * (0.5 + 6.0 * uDisp) * (0.2 + fr) * S * 0.02;
    float fr2 = uFrost * S * 0.12; vec3 acc = vec3(0.0);
    for (int k = 0; k < 8; k++) {
      float a = float(k) * 2.39996, r = fr2 * sqrt((float(k) + 0.5) / 8.0); vec2 j = r * vec2(cos(a), sin(a));
      acc += vec3(texAt(bp + j + sx).r, texAt(bp + j).g, texAt(bp + j - sx).b);
    }
    col = acc / 8.0;
    col = mix(col, col * uTint, uTintAmt);
    float rim = pow(1.0 - abs(n.z), 4.0), face = clamp(dot(n.xy, vec2(-0.6, 0.8)), 0.0, 1.0);
    col = mix(col, vec3(1.0), 0.04 + 0.28 * fr) + uRim * rim * (0.25 + 0.75 * face) * 0.7 + uShine * 0.8 * sp;
  } else {
    vec3 sp3 = Ri * pos, alb;
    if (uMat == 1 || uHasTex == 0) alb = texAt(toPx(sp3.xy * 0.95)).rgb;
    else {
      // Triplanar: the preset is projected from three sides and blended by the surface direction, so
      // there's no seam or pinched pole on any form.
      vec3 nl = Ri * n, w = pow(abs(nl), vec3(4.0)); w /= w.x + w.y + w.z;
      vec3 tp = sp3 * 0.5 + 0.5;
      alb = texture(uTex2, tp.zy).rgb * w.x + texture(uTex2, tp.xz).rgb * w.y + texture(uTex2, tp.xy).rgb * w.z;
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

    // Separable Gaussian on the field grid: the GPU stand-in for smoothing each contour line.
    fblur: `
uniform vec2 uDir2; uniform float uSigma; uniform ivec2 uIn;
void main() {
  ivec2 c = ivec2(floor(gl_FragCoord.xy)); int r = int(min(64.0, ceil(uSigma * 3.0)));
  float s = 0.0, wsum = 0.0;
  for (int i = -64; i <= 64; i++) {
    if (i < -r || i > r) continue;
    ivec2 q = clamp(c + ivec2(uDir2) * i, ivec2(0), uIn - 1);
    float w = exp(-float(i * i) / (2.0 * uSigma * uSigma)); s += w * texelFetch(uTex, q, 0).r; wsum += w;
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
uniform sampler2D uTex2; uniform vec2 uCell; uniform ivec2 uIn; uniform vec2 uDesign;
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
  float r = rOf(field(dp / uCell));
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
        } else col = ink(id, rg.x, uBlend > 0.5);
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
uniform float uTime; uniform int uMotion; uniform float uMotAmt;
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
  if (uMotion == 2) t += 0.22 * uMotAmt * sin(6.2831853 * uTime);
  t = clamp(t, 0.0, 1.0) * float(uN - 1);
  int i = min(int(floor(t)), uN - 2); float f = t - float(i); f = f * f * (3.0 - 2.0 * f);
  return mix(toLab(lin(uCol[i])), toLab(lin(uCol[i + 1])), f);
}
void main() {
  vec2 a = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  float tw = 6.2831853 * uTime;
  vec2 drift = uMotion == 1 ? uMotAmt * vec2(cos(tw), sin(tw)) : vec2(0.0);
  // Breathe: the warp is read from points travelling round two loops (whole turns only), so the field
  // morphs forward the whole time and lands back on its first frame without reversing.
  bool br = uMotion == 3;
  // Pulse: four soft beats per loop push the field out from the center, while it morphs a little.
  float beat = uMotion == 4 ? pow(0.5 - 0.5 * cos(tw * 4.0), 3.0) : 0.0, lm = br ? 1.0 : uMotion == 4 ? 0.4 : 0.0;
  vec2 L1 = lm * 1.5 * uMotAmt * vec2(cos(tw), sin(tw));
  // Both read points travel at a constant speed, so the morph never hurries through part of the loop.
  vec2 L2 = lm * 1.5 * uMotAmt * vec2(sin(tw + 1.3), -cos(tw + 1.3));
  p = 0.5 + (p - 0.5) * (1.0 - 0.07 * uMotAmt * beat);
  if (uType == 6) {
    // Aura, after the reactive background of Yandex Music's My Wave: a soft body of color over a dark
    // ground, its outline wobbling in a few lobes, with smooth light lines winding through it. The
    // lines are isolines of a slowly warped field, so motion moves the lines themselves. No glow is
    // baked in: bloom or god rays go on top as effects.
    float ca = cos(uAngle), sa = sin(uAngle);
    vec2 c = (p - 0.5) * a;
    if (uMotion == 1) { float r0 = tw; c = mat2(cos(r0), -sin(r0), sin(r0), cos(r0)) * c; }
    float r = length(c), th = atan(c.y, c.x);
    vec2 dv = vec2(cos(th), sin(th));
    float R = 0.4 * clamp(uScale, 0.1, 6.0) * (1.0 + 0.1 * uMotAmt * beat);
    float lob = snoise(dv * 0.7 + uSeed * vec2(0.37, 0.71) + L1 * 0.35) * 0.75 + snoise(dv * 1.4 + uSeed * vec2(1.3, 0.2) + L2 * 0.35) * 0.25;
    float Rb = R * (1.0 + 0.32 * uWarp * lob);
    float edge = 0.2 + 0.25 * clamp(uSoft, 0.3, 5.0);
    float body = 1.0 - smoothstep(Rb * (1.0 - edge * 0.8), Rb * (1.0 + edge), r);
    // Color: lighter toward the middle, turning through the palette round the body.
    vec2 cr = mat2(ca, -sa, sa, ca) * c / max(R, 0.05);
    float swirl = 0.5 + 0.5 * snoise(cr * 0.55 + uSeed * vec2(0.9, 0.4) + L2 * 0.25);
    float t = 0.28 + 0.72 * clamp(0.55 * body + 0.45 * swirl, 0.0, 1.0);
    vec3 fill = ramp(t), bg = ramp(0.0);
    // Light lines: isolines of a warped field, a fixed width on screen, brightest inside the body.
    vec2 q = c / max(R, 0.05) * 0.6 + uSeed * vec2(0.13, 0.29);
    vec2 wq = vec2(snoise(q * 0.7 + vec2(3.1, 7.7) + L1 * 0.5), snoise(q * 0.7 + vec2(9.4, 1.2) + L2 * 0.5));
    float n = snoise(q * 0.5 + wq * 0.45) * 0.8 + snoise(q * 0.9 - wq * 0.3 + 4.2) * 0.2;
    float K = 0.6 + 0.45 * uDetail, ph = n * K - (uMotion == 2 ? uTime * 2.0 : 0.0);
    float dn = abs(fract(ph + 0.5) - 0.5) / max(fwidth(ph), 1e-4);
    float wpx = (5.0 + 12.0 * uStretch) * uRes.y / 900.0;
    float line = (exp(-dn * dn / (wpx * wpx)) * 0.7 + exp(-dn / (wpx * 3.0)) * 0.3) * body * smoothstep(0.05, 0.5, body);
    vec3 lab2 = mix(bg, fill, body);
    lab2.x += line * 0.13 * uContrast * (1.0 + 0.5 * uMotAmt * beat);
    lab2.yz *= 1.0 - line * 0.18 * min(uContrast, 1.5);
    o = vec4(srgb(fromLab(lab2)), 1.0); return;
  }
  float warp = br ? max(uWarp, 0.7 * uMotAmt) : uWarp;
  if (uType >= 1 && uType <= 3) p += drift * 0.03;
  if (warp > 0.0) { vec2 q = p * a * uWarpScale + drift * 0.6; p += warp * 0.3 * (vec2(fbm(q + vec2(1.7, 9.2) + L1), fbm(q + vec2(8.3, 2.8) + L2)) - 0.5); }
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
      q += warp * vec2(sfbm(q + vec2(3.1, 7.7) + L1), sfbm(q + vec2(9.4, 1.2) + L2));
      if (uNoise == 0) v = sfbm(q) * 0.6 + 0.5;
      else if (uNoise == 1) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; float n = 1.0 - abs(snoise(pp)); r += am * n * n; pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.1; }
      else if (uNoise == 2) { float am = 0.5, r = 0.0; vec2 pp = q; for (int i = 0; i < 8; i++) { if (float(i) >= uDetail) break; r += am * abs(snoise(pp)); pp = pp * 2.02 + 17.0; am *= 0.5; } v = r * 1.6; }
      else if (uNoise == 3) v = worley(q * 1.5).x;
      else if (uNoise == 4) { vec2 w = worley(q * 1.5); v = 1.0 - smoothstep(0.0, 0.35, w.y - w.x); }
      else if (uNoise == 5) v = 0.5 + 0.5 * sin(q.x * 4.0 + sfbm(q) * 5.0);
      else if (uNoise == 6) { float nn = neuro(q * 0.5); v = clamp(1.2 * pow(nn, 3.0) + pow(nn, 10.0) - 0.1, 0.0, 1.0); }
      else { vec2 c = (p - 0.5) * a; float ang = atan(c.y, c.x), r = length(c) / 0.36; float n = snoise(vec2(cos(ang), sin(ang)) * 0.9 / max(uScale, 0.1) + uSeed * 0.37) * (0.2 + warp * 0.3) + 0.08 * snoise(vec2(cos(ang), sin(ang)) * 2.4 + uSeed); v = exp(-pow((r - 1.0 - n) / (0.1 + 0.12 / max(uStretch, 0.3)), 2.0)) * (0.85 + 0.15 * sfbm(q * 2.0)); }
    }
    lab = ramp(clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0));
  } else if (uType == 0) {
    vec3 acc = vec3(0.0); float ws = 0.0;
    for (int i = 0; i < 8; i++) { if (i >= uN) break; vec2 orb = uMotion == 1 ? 0.07 * uMotAmt * vec2(cos(tw + float(i) * 2.1), sin(tw + float(i) * 1.3)) : br ? 0.16 * uMotAmt * vec2(sin(tw + float(i) * 2.1), cos(tw + float(i) * 2.1)) : vec2(0.0); vec2 d = (p - uPt[i] - orb) * a; float w = 1.0 / pow(dot(d, d) + 0.0004, uSoft); acc += toLab(lin(uCol[i])) * w; ws += w; }
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
// Each rib is a half-cylinder lens. Four sub-pixel samples across the rib edge remove the stair-stepping;
// a hairline catches the light on each rib's leading edge, and red and blue split slightly as they bend.
void main() {
  vec2 dir = vec2(cos(uAngle), sin(uAngle)), nrm = vec2(-dir.y, dir.x);
  int n = uFrost > 0.01 ? 8 : 1;
  vec3 acc = vec3(0.0);
  for (int s = 0; s < 4; s++) {
    vec2 d = dp() + nrm * ((float(s) - 1.5) * 0.25 / uK);
    float l = fract(dot(d, nrm) / uWidth) - 0.5, bend = sin(l * 3.14159);
    vec2 uv = vUv + toUv(nrm * bend * uStr * uWidth * 0.5);
    vec3 c = frostDisp(uv, uFrost * uWidth * 0.3, toUv(nrm * bend * uStr * uWidth * 0.035), n);
    float edge = (0.5 - abs(l)) * uWidth, hair = max(0.9, 0.9 / uK);
    c *= 1.0 - 0.07 * uLight * l;
    c += uLight * 0.22 * exp(-edge / hair) * (l < 0.0 ? 1.0 : 0.25);
    acc += c;
  }
  o = vec4(clamp(acc / 4.0, 0.0, 1.0), tex(vUv).a);
}`,

    mesh: `uniform float uCell; uniform float uStr; uniform float uFrost; uniform float uGrout; uniform float uRim; uniform float uDisp; uniform float uRad;
// Glass blocks: a grid of rounded liquid-glass tiles, each magnifying its own patch, separated by a small gap.
void main() {
  vec2 d = dp(), id = floor(d / uCell), c = (id + 0.5) * uCell, p = d - c;
  float gap = uGrout * uCell * 0.035;
  vec2 hb = vec2(uCell * 0.5 - gap * 0.5);
  float rad = clamp(uRad, 0.0, 0.5) * 2.0 * hb.x;
  float sd = sdBox(p, hb, rad);
  vec2 n = normalize(vec2(sdBox(p + vec2(0.5, 0.0), hb, rad) - sdBox(p - vec2(0.5, 0.0), hb, rad), sdBox(p + vec2(0.0, 0.5), hb, rad) - sdBox(p - vec2(0.0, 0.5), hb, rad)) + 1e-6);
  vec2 src = c + p * (1.0 - 0.16 * uStr);
  vec3 inside = liquid(toUv(src), sd, n, uCell * 0.2, uStr, uFrost * uCell * 0.09, uRim, uDisp);
  vec4 base = tex(vUv);
  float shadow = 0.22 * exp(-max(sdBox(p + vec2(0.0, uCell * 0.02), hb, rad), 0.0) / (uCell * 0.05));
  vec3 outside = base.rgb * (1.0 - shadow);
  float aa = 0.75 / uK;
  o = vec4(mix(outside, inside, smoothstep(aa, -aa, sd)), base.a);
}`,

    bulge: `uniform float uAmt; uniform float uRad; uniform vec2 uC;
// Bulge or pinch: inside the radius the image is magnified (or shrunk), easing back to 1:1 at the edge.
void main() {
  vec2 res = uRes / uK, c = uC * res, d = dp() - c;
  float R = max(1.0, uRad * min(res.x, res.y)), r = length(d) / R;
  float k = r < 1.0 ? max(0.05, 1.0 - uAmt * (1.0 - r * r) * (1.0 - r * r)) : 1.0;
  o = tex(toUv(c + d * k));
}`,

    ripple: `uniform float uAmp; uniform float uLen; uniform float uDecay; uniform float uShade; uniform vec2 uC;
// Concentric water ripples from a point, fading with distance, with a soft light on each crest.
void main() {
  vec2 res = uRes / uK, d = dp() - uC * res; float r = length(d), m = min(res.x, res.y);
  float ph = r / uLen * 6.2831853, fade = exp(-r / max(1.0, uDecay * m));
  vec2 dir = d / max(r, 1e-3);
  vec4 c = tex(vUv + toUv(dir * sin(ph) * uAmp * fade));
  o = vec4(c.rgb * (1.0 + uShade * 0.18 * cos(ph) * fade), c.a);
}`,

    water: `uniform float uAmt; uniform float uScale; uniform float uCaustic;
// Pool water: a rolling surface (long swells plus finer chop) bends the floor seen through it, and the
// light it focuses lands on the floor as the bright, web-like caustic network of a sunny pool.
float H(vec2 q) { return 0.6 * sin(q.x * 1.3 + 1.7 * sin(q.y * 0.7)) * 0.25 + fbm(q) + 0.5 * fbm(q * 2.1 + vec2(4.7, 1.9)); }
float causticNet(vec2 p, float t0) {
  vec2 i = p; float c = 1.0;
  for (int n = 0; n < 5; n++) {
    float t = t0 * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
  }
  c /= 5.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 7.0);
}
void main() {
  vec2 q = dp() / uScale; float e = 0.12;
  vec2 g = vec2(H(q + vec2(e, 0.0)) - H(q - vec2(e, 0.0)), H(q + vec2(0.0, e)) - H(q - vec2(0.0, e))) / (2.0 * e);
  vec2 bend = toUv(g * uAmt * uScale * 0.05);
  vec4 c = tex(vUv + bend);
  // Caustics follow the same surface, so the web wobbles with the refraction; a hair of color split
  // gives the faint rainbow edge real pool light has.
  vec2 cp = q * 8.0 + g * 0.9 - 250.0 + uSeed * 0.71; float t0 = uSeed * 0.13 + 1.0;
  float cr = causticNet(cp + vec2(0.012, 0.0), t0), cg = causticNet(cp, t0), cb = causticNet(cp - vec2(0.012, 0.0), t0);
  vec3 light = clamp(vec3(cr, cg, cb) * uCaustic * 0.85, 0.0, 1.0);
  // The surface itself: troughs a touch darker, crests a touch brighter, facing the light from the top left.
  float face = clamp(-dot(g, vec2(0.6, -0.8)) * 0.12 * min(uAmt, 2.0), -0.12, 0.12);
  vec3 col = c.rgb * (1.0 + face);
  o = vec4(1.0 - (1.0 - clamp(col, 0.0, 1.0)) * (1.0 - light), c.a);
}`,

    cmyk: `uniform float uSize; uniform float uAngle; uniform vec3 uPaper; uniform float uShape;
// Four-color halftone: cyan, magenta, yellow and black screens at their classic angles, overprinted on paper.
float screenDot(vec2 d, float ang, int ch) {
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 g = R * d / uSize, cell = floor(g) + 0.5, f = g - cell;
  vec3 rgb = tex(toUv(transpose(R) * cell * uSize)).rgb;
  float k = 1.0 - max(rgb.r, max(rgb.g, rgb.b)), den = max(1e-4, 1.0 - k);
  float v = ch == 0 ? (1.0 - rgb.r - k) / den : ch == 1 ? (1.0 - rgb.g - k) / den : ch == 2 ? (1.0 - rgb.b - k) / den : k;
  float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.62, aa = 0.8 / (uSize * uK);
  return rad < 0.004 ? 0.0 : smoothstep(aa, -aa, dotSD(f, rad, uShape));
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
  vec2 dir = (vUv - uC) * uLen / 48.0, uv = vUv; vec3 acc = vec3(0.0); float w = 1.0, ws = 0.0;
  float j = hash(gl_FragCoord.xy);
  uv -= dir * j;
  for (int i = 0; i < 48; i++) { uv -= dir; vec3 s = tex(uv).rgb; acc += max(s - uThr, 0.0) / max(1.0 - uThr, 0.05) * w; ws += w; w *= 0.965; }
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

    halftone: `uniform float uSize; uniform float uAngle; uniform float uMono; uniform vec3 uInk; uniform vec3 uPaper; uniform float uShape;
void main() {
  float ca = cos(uAngle), sa = sin(uAngle);
  mat2 R = mat2(ca, -sa, sa, ca);
  vec2 r = R * dp() / uSize, cell = floor(r) + 0.5;
  vec4 c = tex(toUv(transpose(R) * (cell * uSize)));
  float dark = uMono > 0.5 ? 1.0 - luma(c.rgb) : 0.25 + 0.75 * (1.0 - luma(c.rgb) * 0.6);
  float rad = sqrt(clamp(dark, 0.0, 1.0)) * 0.72, sd = dotSD(fract(r) - 0.5, rad, uShape), aa = max(fwidth(sd), 1e-4);
  float m = rad < 0.004 ? 0.0 : 1.0 - smoothstep(-aa, aa, sd);
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

    lens: `uniform float uShape; uniform float uSize; uniform float uRefr; uniform float uFrost; uniform float uRim; uniform float uDisp; uniform vec2 uC;
// Liquid glass: a flat pane whose rounded bezel bends what's behind it, with a frosted body,
// a hairline highlight on the edges facing the light and a soft contact shadow.
void main() {
  vec2 res = uRes / uK; float m = min(res.x, res.y);
  vec2 p = dp() - uC * res, hb; float rad;
  if (uShape < 0.5) { hb = vec2(uSize * m * 0.5); rad = hb.x; }
  else if (uShape < 1.5) { hb = vec2(uSize * m * 0.95, uSize * m * 0.3); rad = hb.y; }
  else { hb = vec2(uSize * m * 0.5); rad = uSize * m * 0.16; }
  float sd = sdBox(p, hb, rad);
  vec2 n = normalize(vec2(sdBox(p + vec2(0.5, 0.0), hb, rad) - sdBox(p - vec2(0.5, 0.0), hb, rad), sdBox(p + vec2(0.0, 0.5), hb, rad) - sdBox(p - vec2(0.0, 0.5), hb, rad)) + 1e-6);
  float bez = min(min(hb.x, hb.y) * 0.6, m * 0.085);
  vec4 base = tex(vUv);
  float shadow = 0.16 * exp(-max(sdBox(p + vec2(0.0, m * 0.014), hb, rad), 0.0) / (m * 0.03));
  vec3 outside = base.rgb * (1.0 - shadow);
  vec3 inside = liquid(vUv, sd, n, bez, uRefr, uFrost * m * 0.03, uRim, uDisp);
  float aa = 0.75 / uK;
  o = vec4(mix(outside, inside, smoothstep(aa, -aa, sd)), base.a);
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
  const ORDER = ["liquify", "wave", "swirl", "bulge", "ripple", "water", "kaleido", "glass", "mesh", "lens", "rays", "chrome", "heatmap", "paper", "cmyk", "blur", "bloom", "emboss", "gradmap", "posterize", "pixel", "voronoi", "halftone", "linescreen", "riso", "ascii", "dither", "scan", "chroma", "vignette", "grain"];
  const CHARSETS = { ascii: " .:-=+*#%@", blocks: " ░▒▓█", dots: " ·•●", binary: " 01", lines: " ─═│╬" };

  const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const rad = (d) => (d * Math.PI) / 180;

  const OBJ_KINDS = ["sphere", "torus", "cube", "capsule", "blob", "image", "pill"];
  const INTS = new Set(["uKind", "uMat", "uHasTex", "uType", "uN", "uNoise", "uMotion", "uPattern", "uOct", "uNPts", "uUser", "uNFeat", "uFirst", "uMode", "uNInk", "uHasH"]);
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
        if (INTS.has(u)) gl.uniform1i(l, v);
        else if (u === "uIn") gl.uniform2i(l, v[0], v[1]);
        else if (u === "uTex2") { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, 2); }
        else if ((u === "uPts" || u === "uFeat") && v.length) gl.uniform4fv(l, v.flat());
        else if (u === "uInk" && v.length) gl.uniform3fv(l, v.flat());
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

    // ---------- contours on the GPU ----------
    // Rendering to float textures needs EXT_color_buffer_float. Without it contours stay on the SVG path.
    const floatOK = !!gl.getExtension("EXT_color_buffer_float"), floatLinear = !!gl.getExtension("OES_texture_float_linear");
    const permTex = gl.createTexture(), fbos = new Map();
    let permSeed = null;
    // Float render targets, kept by size and role so a playing animation allocates nothing per frame.
    function floatTarget(role, w, h, fmt) {
      const key = role, have = fbos.get(key);
      if (have && have.w === w && have.h === h) return have;
      if (have) { gl.deleteTexture(have.t); gl.deleteFramebuffer(have.f); }
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      const filt = fmt === "half" ? gl.LINEAR : gl.NEAREST;
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filt], [gl.TEXTURE_MAG_FILTER, filt], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (fmt === "half") { if (floatLinear) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null); }
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
      const fld = floatTarget("field", c.nx, c.ny);
      draw("field", null, fld.f, {
        uTex2: permTex, uPattern: c.pattern, uSc: c.sc, uOct: c.oct, uP: c.P, uBump: c.bump, uLiq: c.liquify, uLiqScale: c.liqScale,
        uWarpA: c.warp, uLoop: c.loop, uDrift: c.drift, uDir: c.dir, uCell: [c.sx, c.sy],
        uPts: c.pts, uNPts: c.pts.length, uUser: c.user, uFeat: c.feats.length ? c.feats : [[0, 0, 1, 0]], uNFeat: c.feats.length,
      }, c.nx, c.ny, 1, 0);
      // Min and max come from the raw field, as on the CPU, so levels land in the same places.
      let src = fld, iw = c.nx, ih = c.ny, n = 0;
      while (iw > 1 || ih > 1 || n === 0) {
        const ow = Math.max(1, Math.ceil(iw / 4)), oh = Math.max(1, Math.ceil(ih / 4)), dst = floatTarget("mm" + n, ow, oh, "rg");
        draw("fminmax", src.t, dst.f, { uFirst: n === 0 ? 1 : 0, uIn: [iw, ih] }, ow, oh, 1, 0);
        src = dst; iw = ow; ih = oh; n++;
      }
      const mm = src;
      let fieldTex = fld.t;
      const sg = c.sigma / Math.max(c.sx, c.sy);
      if (sg > 0.3) {
        const b1 = floatTarget("blurA", c.nx, c.ny), b2 = floatTarget("blurB", c.nx, c.ny);
        draw("fblur", fld.t, b1.f, { uDir2: [1, 0], uSigma: sg, uIn: [c.nx, c.ny] }, c.nx, c.ny, 1, 0);
        draw("fblur", b1.t, b2.f, { uDir2: [0, 1], uSigma: sg, uIn: [c.nx, c.ny] }, c.nx, c.ny, 1, 0);
        fieldTex = b2.t;
      }
      draw("contours", fieldTex, output, {
        uTex2: mm.t, uCell: [c.sx, c.sy], uIn: [c.nx, c.ny], uDesign: [c.w, c.h],
        uMode: c.mode, uLin: c.lin ? 1 : 0, uGap: c.gap, uPh: c.phase, uLevels: c.levels, uG: c.g,
        uWeight: c.weight, uEvery: c.every, uIdxW: c.indexWeight, uBand: c.band, uBlend: c.blend,
        uInk: c.inks.map(hex3), uNInk: c.inks.length, uBg: hex3(c.bg), uClear: c.clear, uOpacity: c.opacity, uAng: c.angle,
      }, w, h, 1, 0);
    }

    function effectUniforms(id, e, ink, paper) {
      switch (id) {
        case "liquify": return { uAmt: e.amount, uScale: e.scale };
        case "glass": return { uWidth: e.width, uAngle: rad(e.angle), uStr: e.strength, uFrost: e.frost ?? 0.2, uLight: e.light ?? 0.5 };
        case "mesh": return { uCell: e.cell, uStr: e.strength, uFrost: e.frost ?? 0.3, uGrout: e.grout ?? 1, uRim: e.rim ?? 0.6, uDisp: e.disp ?? 0.5, uRad: e.radius ?? 0.25 };
        case "pixel": return { uSize: e.size, uBevel: e.bevel };
        case "halftone": return { uSize: e.size, uAngle: rad(e.angle), uMono: e.mono ? 1 : 0, uInk: ink, uPaper: paper, uShape: Math.max(0, ["circle", "square", "triangle", "star"].indexOf(e.shape)) };
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
        case "lens": return { uShape: ["circle", "pill", "square"].indexOf(e.shape), uSize: e.size, uRefr: e.refraction, uFrost: e.frost, uRim: e.rim, uDisp: e.disp ?? 0.5, uC: [e.x, 1 - e.y] };
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
        case "bulge": return { uAmt: e.amount, uRad: e.radius, uC: [e.x, 1 - e.y] };
        case "ripple": return { uAmp: e.amp, uLen: e.length, uDecay: e.decay, uShade: e.shade, uC: [e.x, 1 - e.y] };
        case "water": return { uAmt: e.amount, uScale: e.scale, uCaustic: e.caustic };
        case "cmyk": return { uSize: e.size, uAngle: rad(e.angle), uPaper: paper, uShape: Math.max(0, ["circle", "square", "triangle", "star"].indexOf(e.shape)) };
        case "paper": return { uCrumple: e.crumple, uFiber: e.fiber, uScale: e.scale };
        case "heatmap": return { uGlow: e.glow, uMix: e.mix, uInvert: e.invert ? 1 : 0 };
        case "chrome": return { uStr: e.strength, uBands: e.bands, uSoft: e.soft, uTint: hex3(e.tint), uMix: e.mix };
        case "rays": return { uLen: e.length, uThr: e.threshold, uInt: e.intensity, uC: [e.x, 1 - e.y] };
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
          uType: ["mesh", "linear", "radial", "conic", "flow", "noise", "aura"].indexOf(g.type), uN: n,
          uScale: g.scale ?? 1.2, uDetail: g.detail ?? 3, uStretch: g.stretch ?? 1, uContrast: g.contrast ?? 1,
          uNoise: ["clouds", "ridges", "billow", "cells", "veins", "marble", "neuro", "ring", "aura"].indexOf(g.noise || "clouds"),
          uCol: g.colors.slice(0, 8).map(hex3), uPt: g.points.slice(0, 8).map((p) => [p.x, p.y]),
          uWarp: g.warp, uWarpScale: g.warpScale, uSoft: g.soft, uAngle: rad(g.angle),
          uTime: job.time || 0, uMotion: ["still", "drift", "flow", "breathe", "pulse"].indexOf(job.motion || "still"), uMotAmt: job.motionAmt ?? 0.5,
        }, w, h, k, job.seed);
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
      const drawObjects = (list) => {
        for (const ob of list) {
          const out = targets.list[ping], tx = ob.tex ? objTex(ob.texKey, ob.tex) : null, sp = ob.speed ?? 1, t = (job.time || 0) * sp;
          draw("object", input, out.f, {
            uKind: OBJ_KINDS.indexOf(ob.kind), uC: [ob.x * w, ob.y * h], uSz: Math.max(1, ob.size * sz * 0.5), uRot: rad(ob.rot || 0), uTilt: rad(ob.tilt || 0), uSpin: rad(ob.spin || 0),
            uMat: ["shaded", "design", "preset", "glass", "palette", "photo"].indexOf(ob.mat), uShine: ob.shine ?? 0.6, uRipple: ob.ripple || 0, uShadow: ob.shadow ?? 0.4, uAsp: ob.asp || 1, uRound: ob.round ?? 0.2,
            uRefr: ob.refract ?? 1, uFrost: ob.frost || 0, uDisp: ob.disp ?? 0.3, uRim: ob.rim ?? 0.5, uTint: hex3(ob.tint || "#ffffff"), uTintAmt: ob.tintAmt || 0,
            uCol: cols, uN: cols.length, uTex2: tx || srcTex, uHasTex: tx ? 1 : 0,
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

  root.TopoFX = { createFX, ORDER, CHARSETS, OBJ_KINDS };
})(window);
