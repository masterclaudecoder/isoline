// Logo concepts for Topographic, drawn with the same contour engine the app uses.
(function (root) {
  "use strict";
  const T = root.Topo;
  const INK = "#1c1c1e", ACCENT = "#e8572a";

  const base = {
    seed: 7, scale: 400, octaves: 1, warp: 0, angle: 0, features: 0, bump: 0, bumpSize: 50, usePoints: true, falloff: 1,
    levels: 6, gap: 10, bias: 0, weight: 1, swell: 0, swellSize: 100, taper: 0, indexEvery: 0, indexWeight: 1,
    smooth: 0.5, res: 2, minLen: 0, line: INK, line2: INK, gradient: false, bg: "#fff", transparent: true, opacity: 1,
  };
  const inner = (svg) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const draw = (o, size, opts = {}) => inner(T.buildSVG({ ...base, ...o, w: size[0], h: size[1] }, opts).svg);
  // Color the n-th contour (0 = first drawn) with the accent.
  const accentNth = (body, n, color = ACCENT) => { let i = -1; return body.replace(/stroke="#1c1c1e"/g, (m) => (++i === n ? `stroke="${color}"` : m)); };
  const wordStyle = `font-family:'Instrument Sans',system-ui,sans-serif;font-weight:600;font-stretch:88%;letter-spacing:-0.02em`;

  // Organic concentric glyph sized to replace a lowercase "o".
  function ringGlyph(seed, accent) {
    let body = draw({ pattern: "rings", seed, warp: 0.06, scale: 60, gap: 8.6, weight: 4, smooth: 0.7, points: [{ x: 0.5, y: 0.5, r: 1, s: 1 }] }, [60, 60], { closedOnly: true });
    if (accent) body = body.replace(/stroke="#1c1c1e"/g, `stroke="${ACCENT}"`);
    return `<svg class="ring-o" viewBox="0 0 60 60" aria-hidden="true">${body}</svg>`;
  }

  const concepts = [
    {
      id: "isoline-o", name: "Contour O",
      note: "Both o's become little contour maps; the first one carries the accent. Holds up from nav bar to billboard.",
      html: () => `<span class="lg-word" style="${wordStyle}">t${ringGlyph(11, true)}p${ringGlyph(23, false)}graphic</span>`,
    },
    {
      id: "summit", name: "Summit",
      note: "A single landform with a highlighted summit line. The mark works alone as an app icon.",
      html: () => {
        const mark = accentNth(draw({ pattern: "rings", gap: 11.5, weight: 5, warp: 0.06, scale: 300, points: [{ x: 0.38, y: 0.42, r: 1, s: 1 }, { x: 0.64, y: 0.6, r: 1, s: 0.7 }], minLen: 20 }, [120, 120], { closedOnly: true }), 0);
        return `<svg class="lg-mark" viewBox="0 0 120 120" aria-hidden="true">${mark}</svg><span class="lg-word" style="${wordStyle}">topographic</span>`;
      },
    },
    {
      id: "offset", name: "Offset",
      note: "The word drawn as its own contour lines, like letters standing on a map.",
      html: () => {
        const t = `x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" style="${wordStyle};font-size:58px"`;
        const layers = [[17, INK], [12.5, "#fff"], [8, ACCENT], [4, "#fff"]];
        const strokes = layers.map(([w, c]) => `<text ${t} fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round">topographic</text>`).join("");
        return `<svg class="lg-svg" viewBox="0 0 420 110" role="img" aria-label="topographic">${strokes}<text ${t} fill="${INK}">topographic</text></svg>`;
      },
    },
    {
      id: "strata", name: "Strata",
      note: "Straight lines that rise around the name. Good as a wide header lockup.",
      html: () => {
        const lines = draw({ pattern: "lines", gap: 7, weight: 1.1, smooth: 0.6, falloff: 1.4, points: [{ x: 0.5, y: 0.55, r: 120, s: -0.55 }] }, [420, 120]);
        const t = `x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" style="${wordStyle};font-size:50px"`;
        return `<svg class="lg-svg" viewBox="0 0 420 120" role="img" aria-label="topographic"><defs><clipPath id="pill"><rect x="2" y="2" width="416" height="116" rx="58"/></clipPath></defs><g clip-path="url(#pill)">${lines}</g><text ${t} fill="#fff" stroke="#fff" stroke-width="14" stroke-linejoin="round">topographic</text><text ${t} fill="${INK}">topographic</text><circle cx="${210 + 118}" cy="34" r="4" fill="${ACCENT}"/></svg>`;
      },
    },
    {
      id: "profile", name: "Profile",
      note: "Letters ride an elevation profile, the side view of a contour map.",
      html: () => {
        const word = "topographic";
        const letters = [...word].map((ch, i) => {
          const x = (i - (word.length - 1) / 2) / (word.length / 2);
          const lift = Math.exp(-((x - 0.1) ** 2) / 0.12) * 0.32 + Math.exp(-((x + 0.55) ** 2) / 0.05) * 0.14;
          return `<span style="display:inline-block;transform:translateY(${(-lift).toFixed(3)}em)">${ch}</span>`;
        }).join("");
        let d = "";
        for (let i = 0; i <= 60; i++) {
          const x = (i / 60) * 2 - 1, y = Math.exp(-((x - 0.1) ** 2) / 0.12) * 0.32 + Math.exp(-((x + 0.55) ** 2) / 0.05) * 0.14;
          d += `${i ? "L" : "M"}${(i / 60) * 400} ${42 - (y / 0.46) * 38}`;
        }
        return `<span class="lg-stack"><span class="lg-word" style="${wordStyle}">${letters}</span><svg class="lg-profile" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></span>`;
      },
    },
    {
      id: "isoline", name: "Isoline",
      note: "Alternative name: the cartographer's word for a contour line. Lines part around a single point, mirrored so the point sits dead center.",
      html: () => {
        // Draw the top half, then mirror it: the lines open evenly above and below the dot.
        const body = draw({ pattern: "lines", angle: 0, gap: 12, weight: 4.2, smooth: 0.6, falloff: 1.2, points: [{ x: 0.5, y: 0.5, r: 22, s: 1.3 }], minLen: 14 }, [120, 120]);
        return `<svg class="lg-mark" viewBox="0 0 120 120" aria-hidden="true"><defs><clipPath id="iso-lens"><circle cx="60" cy="60" r="56"/></clipPath><clipPath id="iso-half"><rect width="120" height="60"/></clipPath></defs><g clip-path="url(#iso-lens)"><g clip-path="url(#iso-half)">${body}</g><g transform="matrix(1 0 0 -1 0 120)"><g clip-path="url(#iso-half)">${body}</g></g></g><circle cx="60" cy="60" r="7.5" fill="${ACCENT}" stroke="#fff" stroke-width="3"/></svg><span class="lg-word" style="${wordStyle}">isoline</span>`;
      },
    },
  ];

  function mount(el, id = "isoline") {
    const c = concepts.find((x) => x.id === id) || concepts[0];
    el.innerHTML = c.html();
    el.dataset.logo = c.id;
  }

  root.TopoBrand = { concepts, mount };
})(typeof window !== "undefined" ? window : globalThis);
