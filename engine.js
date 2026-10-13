// Topographic engine: scalar field -> contour lines -> SVG. No DOM; also runs in Node.
(function (root) {
  "use strict";

  const PATTERNS = [
    { id: "blobs", label: "Blobs" }, { id: "terrain", label: "Terrain" }, { id: "flow", label: "Flow" },
    { id: "rings", label: "Rings", linear: true }, { id: "ridges", label: "Ridges" }, { id: "dunes", label: "Dunes" },
    { id: "lines", label: "Lines", linear: true }, { id: "strata", label: "Strata", linear: true }, { id: "waves", label: "Waves", linear: true },
  ];
  // Linear patterns are measured in pixels, so lines are spaced by a fixed gap instead of a count.
  const LINEAR = new Set(PATTERNS.filter((p) => p.linear).map((p) => p.id));
  const ANGLED = new Set(["flow", "dunes", "lines", "strata", "waves"]);

  // ---------- noise ----------
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise(seed) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const gx = [1, -1, 1, -1, 1, -1, 0, 0], gy = [1, 1, -1, -1, 0, 0, 1, -1];
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    return (xin, yin) => {
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s), j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t), y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const ii = i & 255, jj = j & 255;
      let n = 0, tt, g;
      tt = 0.5 - x0 * x0 - y0 * y0;
      if (tt > 0) { g = perm[ii + perm[jj]] & 7; tt *= tt; n += tt * tt * (gx[g] * x0 + gy[g] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1;
      if (tt > 0) { g = perm[ii + i1 + perm[jj + j1]] & 7; tt *= tt; n += tt * tt * (gx[g] * x1 + gy[g] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2;
      if (tt > 0) { g = perm[ii + 1 + perm[jj + 1]] & 7; tt *= tt; n += tt * tt * (gx[g] * x2 + gy[g] * y2); }
      return 70 * n;
    };
  }

  // ---------- scalar field ----------
  function buildField(s, w, h, res) {
    const cols = Math.max(2, Math.round(w / res)), rows = Math.max(2, Math.round(h / res));
    const sx = w / cols, sy = h / rows, nx = cols + 1, ny = rows + 1;
    const f = new Float32Array(nx * ny);
    const k = w / s.w, sc = Math.max(4, s.scale * k), oct = s.octaves;
    const noise = makeNoise(s.seed);
    const rand = mulberry32(s.seed ^ 0x9e3779b9);
    const fbm = (x, y, o) => {
      let a = 1, q = 1, sum = 0, norm = 0;
      for (let i = 0; i < o; i++) { sum += a * noise(x * q, y * q); norm += a; a *= 0.5; q *= 2.03; }
      return sum / norm;
    };
    const ridged = (x, y, o) => {
      let a = 1, q = 1, sum = 0, norm = 0;
      for (let i = 0; i < o; i++) { const r = 1 - Math.abs(noise(x * q, y * q)); sum += a * r * r; norm += a; a *= 0.5; q *= 2.03; }
      return sum / norm;
    };

    // Seeded bumps (strata) and seeded blobs (used when no points are placed).
    const feats = [], auto = [];
    for (let i = 0; i < 24; i++) {
      const r = s.bumpSize * k * (0.6 + rand() * 0.8);
      feats.push({ x: rand() * w, y: rand() * h, R: r, s: (0.7 + rand() * 0.6) * (rand() < 0.3 ? -1 : 1) });
      auto.push({ x: (0.08 + rand() * 0.84) * w, y: (0.08 + rand() * 0.84) * h, R: (0.25 + rand() * 0.45) * sc, s: 0.6 + rand() * 0.6 });
    }
    feats.length = Math.min(feats.length, s.features);
    auto.length = Math.min(auto.length, Math.max(1, s.features));

    const pts = s.usePoints && s.points ? s.points.map((p) => ({ x: p.x * w, y: p.y * h, R: Math.max(2, p.r * k), s: p.s })) : [];
    const src = pts.length ? pts : auto;
    const P = Math.max(0.3, s.falloff);
    // Rational falloff: long metaball-like tails at low P, approaches a Gaussian as P grows.
    const fall = (d2, R) => Math.pow(1 + d2 / (R * R * P), -P);
    const pointSum = (x, y, list, px) => {
      let v = 0;
      for (const p of list) { const dx = x - p.x, dy = y - p.y; v += p.s * (px ? p.R : 1) * fall(dx * dx + dy * dy, p.R); }
      return v;
    };
    const ang = ((s.angle + 90) * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    // Motion: the whole field can be offset (drift), in output pixels scaled to this render.
    const driftX = (s.driftX || 0) * k, driftY = (s.driftY || 0) * k;
    const smk = 40 * k;

    let min = Infinity, max = -Infinity;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let px = i * sx + driftX, py = j * sy + driftY;
        if (s.liquify > 0) {
          // Two-level domain warp: the noise is itself displaced by noise, which gives the liquid swirls.
          const ls = Math.max(4, sc * (s.liqScale || 1)), u0 = px / ls, v0 = py / ls;
          const qx = noise(u0 + 1.3, v0 + 7.1), qy = noise(u0 + 8.2, v0 + 2.8);
          px += s.liquify * ls * 0.06 * noise(u0 + 1.2 * qx + 4.7, v0 + 1.2 * qy + 1.9);
          py += s.liquify * ls * 0.06 * noise(u0 + 1.2 * qx + 9.2, v0 + 1.2 * qy + 5.3);
        }
        if (s.warp > 0) {
          const u0 = px / sc, v0 = py / sc;
          px += s.warp * sc * 0.5 * fbm(u0 + 5.2, v0 + 1.3, 2);
          py += s.warp * sc * 0.5 * fbm(u0 + 1.7, v0 + 9.2, 2);
        }
        const u = px / sc, v = py / sc;
        let val;
        switch (s.pattern) {
          case "blobs":
            val = pointSum(px, py, src, false) + (oct > 1 ? 0.06 * fbm(u, v, oct - 1) : 0);
            break;
          case "terrain": val = fbm(u, v, oct) + 0.8 * pointSum(px, py, pts, false); break;
          case "ridges": val = ridged(u, v, oct) + 0.6 * pointSum(px, py, pts, false); break;
          case "flow":
            val = Math.sin((u * ca + v * sa) * 2.4 + fbm(u * 0.45, v * 0.45, oct) * 2.2) + pointSum(px, py, pts, false);
            break;
          case "dunes":
            val = 1 - Math.abs(Math.sin((u * ca + v * sa) * 1.6 + s.bump * 1.2 * fbm(u * 0.4, v * 0.4, oct))) + 0.6 * pointSum(px, py, pts, false);
            break;
          case "lines": val = px * ca + py * sa + pointSum(px, py, pts, true); break;
          case "strata": {
            val = px * ca + py * sa + pointSum(px, py, pts, true);
            for (const ft of feats) {
              const dx = px - ft.x, dy = py - ft.y;
              val += s.bump * ft.s * ft.R * Math.exp(-(dx * dx + dy * dy) / (2 * ft.R * ft.R));
            }
            break;
          }
          case "waves": val = px * ca + py * sa + s.bump * sc * 0.35 * fbm(u * 0.5, v * 0.5, oct) + pointSum(px, py, pts, true); break;
          case "rings": {
            // Smooth minimum of distances: evenly spaced rings that merge where points meet.
            let acc = 0;
            for (const p of src) acc += Math.exp(-Math.hypot(px - p.x, py - p.y) / Math.max(0.15, Math.abs(p.s)) / smk);
            val = -smk * Math.log(acc + 1e-300);
            break;
          }
          default: val = fbm(u, v, oct);
        }
        f[j * nx + i] = val;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    return { f, nx, ny, cols, rows, sx, sy, min, max };
  }

  // ---------- marching squares -> polylines ----------
  function contour(field, t) {
    const { f, nx, cols, rows, sx, sy, ox = 0, oy = 0 } = field;
    const pts = new Map(), adj = new Map();
    const lerp = (a, b) => (b === a ? 0.5 : (t - a) / (b - a));
    const hKey = (i, j) => (j * nx + i) * 2, vKey = (i, j) => (j * nx + i) * 2 + 1;
    const link = (a, b) => {
      let la = adj.get(a); if (!la) adj.set(a, (la = [])); la.push(b);
      let lb = adj.get(b); if (!lb) adj.set(b, (lb = [])); lb.push(a);
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const tl = f[j * nx + i], tr = f[j * nx + i + 1], br = f[(j + 1) * nx + i + 1], bl = f[(j + 1) * nx + i];
        const c = (tl > t ? 8 : 0) | (tr > t ? 4 : 0) | (br > t ? 2 : 0) | (bl > t ? 1 : 0);
        if (c === 0 || c === 15) continue;
        const x0 = i * sx + ox, y0 = j * sy + oy;
        const T = () => { const k = hKey(i, j); if (!pts.has(k)) pts.set(k, [x0 + sx * lerp(tl, tr), y0]); return k; };
        const B = () => { const k = hKey(i, j + 1); if (!pts.has(k)) pts.set(k, [x0 + sx * lerp(bl, br), y0 + sy]); return k; };
        const L = () => { const k = vKey(i, j); if (!pts.has(k)) pts.set(k, [x0, y0 + sy * lerp(tl, bl)]); return k; };
        const R = () => { const k = vKey(i + 1, j); if (!pts.has(k)) pts.set(k, [x0 + sx, y0 + sy * lerp(tr, br)]); return k; };
        switch (c) {
          case 1: case 14: link(L(), B()); break;
          case 2: case 13: link(B(), R()); break;
          case 3: case 12: link(L(), R()); break;
          case 4: case 11: link(T(), R()); break;
          case 6: case 9: link(T(), B()); break;
          case 7: case 8: link(L(), T()); break;
          case 5: {
            if ((tl + tr + br + bl) / 4 > t) { link(L(), T()); link(B(), R()); } else { link(T(), R()); link(L(), B()); }
            break;
          }
          case 10: {
            if ((tl + tr + br + bl) / 4 > t) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(B(), R()); }
            break;
          }
        }
      }
    }
    const seen = new Set(), lines = [];
    const walk = (start) => {
      const out = [pts.get(start)];
      seen.add(start);
      let prev = -1, cur = start, closed = false;
      for (;;) {
        const nb = adj.get(cur);
        let next = -1;
        for (const n of nb) if (n !== prev && !seen.has(n)) { next = n; break; }
        if (next === -1) { if (nb.length > 1 && nb.includes(start) && out.length > 2) closed = true; break; }
        out.push(pts.get(next)); seen.add(next); prev = cur; cur = next;
      }
      return { p: out, closed };
    };
    for (const [k, nb] of adj) if (nb.length === 1 && !seen.has(k)) lines.push(walk(k));
    for (const k of adj.keys()) if (!seen.has(k)) lines.push(walk(k));
    return lines;
  }

  // ---------- geometry ----------
  function length(p, closed) {
    let L = 0;
    for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (closed && p.length > 1) L += Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]);
    return L;
  }

  // Points every `ds` along the line (closed lines do not repeat the start).
  function resampleUniform(p, closed, ds) {
    const n = p.length, segs = closed ? n : n - 1, out = [p[0]];
    let carry = 0;
    for (let i = 0; i < segs; i++) {
      const a = p[i], b = p[(i + 1) % n];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let d = ds - carry;
      while (d <= L) { const t = d / L; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += ds; }
      carry = L - (d - ds);
    }
    if (closed) { if (out.length > 2 && carry < ds * 0.5) out.pop(); }
    else if (carry > 1e-6) out.push(p[n - 1]);
    return out;
  }

  // Three box-blur passes approximate a Gaussian of `sigma` samples. Open ends are point-reflected so
  // they stay put (lines that leave the canvas keep meeting the edge); closed lines wrap around.
  function blurLine(q, closed, sigma) {
    const n = q.length;
    if (n < 4 || sigma < 0.5) return q;
    const r = Math.max(1, Math.min(Math.round(Math.sqrt(sigma * sigma + 1) - 0.5), closed ? Math.floor((n - 1) / 2) : n - 2));
    let xs = Float64Array.from(q, (v) => v[0]), ys = Float64Array.from(q, (v) => v[1]);
    const at = (arr, i) => {
      if (closed) return arr[((i % n) + n) % n];
      if (i < 0) return 2 * arr[0] - arr[-i];
      if (i >= n) return 2 * arr[n - 1] - arr[2 * n - 2 - i];
      return arr[i];
    };
    const pass = (arr) => {
      const out = new Float64Array(n), win = 2 * r + 1;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += at(arr, i);
      for (let i = 0; i < n; i++) { out[i] = sum / win; sum += at(arr, i + r + 1) - at(arr, i - r); }
      return out;
    };
    for (let k = 0; k < 3; k++) { xs = pass(xs); ys = pass(ys); }
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = [xs[i], ys[i]];
    if (!closed) { out[0] = q[0]; out[n - 1] = q[n - 1]; }
    return out;
  }

  function smoothLine(p, closed, sigmaPx) {
    if (sigmaPx <= 0.3) return p;
    const ds = Math.max(0.6, Math.min(4, sigmaPx / 5));
    const q = resampleUniform(p, closed, ds);
    return blurLine(q, closed, sigmaPx / ds / Math.sqrt(3));
  }

  // Ramer–Douglas–Peucker
  function simplify(p, eps) {
    if (p.length < 3) return p;
    const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
    const stack = [[0, p.length - 1]], e2 = eps * eps;
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = p[a], [bx, by] = p[b];
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      let md = 0, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const [px, py] = p[i];
        let d;
        if (len === 0) d = (px - ax) ** 2 + (py - ay) ** 2;
        else { const c = dx * (py - ay) - dy * (px - ax); d = (c * c) / len; }
        if (d > md) { md = d; mi = i; }
      }
      if (md > e2) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return p.filter((_, i) => keep[i]);
  }

  const n1 = (v) => Math.round(v * 10) / 10;
  // Catmull-Rom through the points, written as cubic Béziers.
  function toPath(p, closed) {
    const n = p.length;
    if (n < 2) return "";
    let d = `M${n1(p[0][0])} ${n1(p[0][1])}`;
    if (n < 3) return d + `L${n1(p[1][0])} ${n1(p[1][1])}`;
    const segs = closed ? n : n - 1;
    const at = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)} ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }

  // Field with a one-cell border far below every level, so each contour of {field > t} closes on itself.
  function padField(field) {
    const { f, nx, ny, sx, sy, min, max } = field;
    const NX = nx + 2, NY = ny + 2, g = new Float32Array(NX * NY).fill(min - 1000 * (max - min || 1));
    for (let j = 0; j < ny; j++) g.set(f.subarray(j * nx, j * nx + nx), (j + 1) * NX + 1);
    return { ...field, f: g, nx: NX, ny: NY, cols: NX - 1, rows: NY - 1, ox: -sx, oy: -sy };
  }

  // Smooth a closed region outline but keep the stretches that run along the canvas edge exact.
  function regionLine(p, sigma, w, h, eps) {
    const out = (q) => q[0] < 0.01 || q[1] < 0.01 || q[0] > w - 0.01 || q[1] > h - 0.01;
    const clampPt = (q) => [Math.min(w, Math.max(0, q[0])), Math.min(h, Math.max(0, q[1]))];
    let q = p;
    if (sigma > 0.3) {
      const ds = Math.max(0.6, Math.min(4, sigma / 5));
      const r = resampleUniform(p, true, ds);
      const b = blurLine(r, true, sigma / ds / Math.sqrt(3));
      q = b.map((v, i) => (out(r[i]) ? r[i] : v));
    }
    q = simplify(q.map(clampPt), eps);
    const n = q.length;
    if (n < 3) return "";
    const edge = (a, b) => (a[0] === 0 && b[0] === 0) || (a[0] === w && b[0] === w) || (a[1] === 0 && b[1] === 0) || (a[1] === h && b[1] === h);
    const at = (i) => q[(i + n) % n];
    let d = `M${n1(q[0][0])} ${n1(q[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      if (edge(p1, p2)) { d += `L${n1(p2[0])} ${n1(p2[1])}`; continue; }
      // Next to an edge run, aim the tangent along the edge instead of across it.
      const a0 = edge(p0, p1) ? p1 : p0, a3 = edge(p2, p3) ? p2 : p3;
      d += `C${n1(p1[0] + (p2[0] - a0[0]) / 6)} ${n1(p1[1] + (p2[1] - a0[1]) / 6)} ${n1(p2[0] - (a3[0] - p1[0]) / 6)} ${n1(p2[1] - (a3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`;
    }
    return d + "Z";
  }

  // Variable-width line as a filled outline. widthAt(x, y, distFromStart, distFromEnd) -> px.
  function outlinePath(p, closed, widthAt) {
    const n = p.length;
    if (n < 2) return "";
    const len = [0];
    for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const total = len[n - 1];
    const Lp = [], Rp = [], tan = [];
    for (let i = 0; i < n; i++) {
      const a = closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)];
      const b = closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const hw = Math.max(0.04, widthAt(p[i][0], p[i][1], len[i], total - len[i])) / 2;
      Lp.push([p[i][0] - ty * hw, p[i][1] + tx * hw]);
      Rp.push([p[i][0] + ty * hw, p[i][1] - tx * hw]);
      tan.push([tx, ty, hw]);
    }
    if (closed) return toPath(Lp, true) + toPath(Rp.reverse(), true);
    const [sx, sy, sh] = tan[0], [ex, ey, eh] = tan[n - 1];
    return toPath([...Lp, [p[n - 1][0] + ex * eh, p[n - 1][1] + ey * eh], ...Rp.reverse(), [p[0][0] - sx * sh, p[0][1] - sy * sh]], true);
  }

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  // Contour colors: lines, any middle colors, then the blend color. With middle colors, blended looks
  // run a smooth ramp through all of them and plain strokes cycle through them level by level.
  function inkFor(s, pos, i, blend) {
    const inks = [s.line, ...(s.mids || []), s.line2];
    const t = Math.min(1, Math.max(0, pos));
    if (inks.length === 2) return blend ? mix(s.line, s.line2, t) : s.line;
    if (!blend) return inks[((i % inks.length) + inks.length) % inks.length];
    const f = t * (inks.length - 1), k = Math.min(inks.length - 2, Math.floor(f));
    return mix(inks[k], inks[k + 1], f - k);
  }

  // ---------- render ----------
  function buildSVG(s, opts = {}) {
    const w = opts.w || s.w, h = opts.h || s.h, k = w / s.w;
    const field = buildField(s, w, h, opts.res || s.res);
    const span = field.max - field.min || 1;
    const lin = LINEAR.has(s.pattern);
    const levels = [];
    if (lin) {
      const gap = Math.max(0.5, s.gap * k);
      // phase slides every level up by that many steps; at a whole number the set of lines matches phase 0.
      const ph = s.phase || 0;
      for (let i = Math.floor(field.min / gap - ph); (i + ph) * gap < field.max && levels.length < 900; i++) {
        const t = (i + ph) * gap;
        if (t <= field.min) continue;
        levels.push({ t, idx: i, pos: (t - field.min) / span });
      }
    } else {
      const g = Math.pow(2, s.bias), ph = s.phase || 0;
      for (let L = ph ? -Math.ceil(ph) : 0; L < s.levels; L++) {
        const tn = Math.pow((L + 1 + ph) / (s.levels + 1), g);
        if (tn <= 0 || tn >= 1) continue;
        levels.push({ t: field.min + tn * span, idx: L + 1, pos: tn });
      }
    }

    const filled = s.swell > 0 || s.taper > 0;
    const swellNoise = makeNoise(s.seed + 7919);
    const swellLen = Math.max(4, s.swellSize * k), taperLen = s.taper * k;
    const onEdge = ([x, y]) => x < 0.5 || y < 0.5 || x > w - 0.5 || y > h - 0.5;
    const sigma = Math.pow(s.smooth, 1.5) * 48 * k;
    const minLen = (opts.minLen ?? s.minLen) * k;
    const every = s.indexEvery;
    let body = "", count = 0;

    const mode = s.mode || "lines";
    if (mode !== "lines") {
      // Filled modes: bands between pairs of contours, or stacked layers above each contour.
      const padded = padField(field);
      const ringsAt = (t) => {
        let d = "";
        for (const ln of contour(padded, t)) {
          if (length(ln.p, true) < Math.max(minLen, 2)) continue;
          d += regionLine(ln.p, sigma, w, h, 0.3 * Math.max(k, 0.3));
        }
        return d;
      };
      const band = Math.max(0.02, Math.min(0.98, s.band ?? 0.5));
      levels.forEach((lv, i) => {
        const next = levels[i + 1] ? levels[i + 1].t : lv.t + (i > 0 ? lv.t - levels[i - 1].t : span / 10);
        const color = inkFor(s, lv.pos, i, mode === "layers" || s.gradient);
        const d = mode === "layers" ? ringsAt(lv.t) : ringsAt(lv.t) + ringsAt(lv.t + band * (next - lv.t));
        if (d) { body += `<path d="${d}" fill="${color}" fill-rule="evenodd"/>`; count++; }
      });
      levels.length = 0;
    }

    for (const lv of levels) {
      const isIndex = every > 0 && ((lv.idx % every) + every) % every === 0;
      const sw = Math.round(s.weight * (isIndex ? s.indexWeight : 1) * Math.max(k, 0.35) * 100) / 100;
      let d = "";
      for (const ln of contour(field, lv.t)) {
        if (opts.closedOnly && !ln.closed) continue;
        if (length(ln.p, ln.closed) < Math.max(minLen, 2)) continue;
        const sm = simplify(smoothLine(ln.p, ln.closed, sigma), 0.3 * Math.max(k, 0.3));
        if (sm.length < 2) continue;
        if (filled) {
          const tapA = !ln.closed && !onEdge(ln.p[0]), tapB = !ln.closed && !onEdge(ln.p[ln.p.length - 1]);
          d += outlinePath(resampleUniform(sm, ln.closed, Math.max(1.5, swellLen / 10)), ln.closed, (x, y, d0, d1) => {
            let f = 1;
            if (s.swell > 0) {
              const m = Math.min(1, Math.max(0, 0.5 + 0.8 * swellNoise(x / swellLen, y / swellLen)));
              f = 1 + s.swell * (0.2 + 3.2 * m * m * m - 1);
            }
            if (taperLen > 0) {
              const e = Math.min(tapA ? d0 : Infinity, tapB ? d1 : Infinity) / taperLen;
              if (e < 1) f *= e * e * (3 - 2 * e);
            }
            return sw * f;
          });
        } else {
          d += toPath(sm, ln.closed);
        }
        count++;
      }
      if (!d) continue;
      const color = inkFor(s, lv.pos, lv.idx - 1, s.gradient);
      body += filled ? `<path d="${d}" fill="${color}"/>` : `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
    }
    const bg = s.transparent ? "" : `<rect width="${w}" height="${h}" fill="${s.bg}"/>`;
    const op = s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}<g stroke-linecap="round" stroke-linejoin="round"${op}>${body}</g></svg>`;
    return { svg, count };
  }

  root.Topo = { PATTERNS, LINEAR, ANGLED, buildSVG, mulberry32, makeNoise };
})(typeof window !== "undefined" ? window : globalThis);
