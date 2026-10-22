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
  const accentNth = (body, n, color = ACCENT) => { let i = -1; return body.replace(/stroke="#1c1c1e"/g, (m) => (++i === n ? `stroke="${color}"` : m)); };
  function thinAbove(body, dotY, top) {
    const yAt = (d) => { let best = null; for (const m of d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) { const x = +m[1], y = +m[2]; if (!best || Math.abs(x - 60) < Math.abs(best[0] - 60)) best = [x, y]; } return best ? best[1] : 0; };
    const paths = [...body.matchAll(/<path[^>]*d="([^"]*)"[^>]*\/>/g)].map((m) => ({ m: m[0], y: yAt(m[1]) }));
    const above = paths.filter((p) => p.y < dotY).sort((a, b) => b.y - a.y).filter((p, i) => i % 2 === 0 && p.y > top);
    const below = paths.filter((p) => p.y >= dotY).filter((_, i) => i % 2 === 0);
    return `<g stroke-linecap="round" stroke-linejoin="round">${[...above, ...below].map((p) => p.m).join("")}</g>`;
  }
  const wordStyle = `font-family:'Instrument Sans',system-ui,sans-serif;font-weight:600;font-stretch:88%;letter-spacing:-0.02em`;

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
      note: "Alternative name: the cartographer's word for a contour line. Mark is a lens of lines bending around a point.",
      html: () => {
        const body = thinAbove(draw({ pattern: "lines", angle: 0, gap: 11, weight: 6, smooth: 0.6, falloff: 1.2, points: [{ x: 0.5, y: 0.44, r: 26, s: 1.9 }], minLen: 10 }, [120, 120]), 62.5, 8);
        return `<svg class="lg-mark" viewBox="0 0 120 120" aria-hidden="true"><defs><clipPath id="iso-lens"><circle cx="60" cy="60" r="56"/></clipPath></defs><g clip-path="url(#iso-lens)">${body}</g><circle cx="60" cy="70" r="7.5" fill="${ACCENT}" stroke="#fff" stroke-width="3"/></svg><span class="lg-word" style="${wordStyle}">isoline</span>`;
      },
    },
  ];

  function mount(el, id = "isoline") {
    const c = concepts.find((x) => x.id === id) || concepts[0];
    el.innerHTML = c.html().replace(/#1c1c1e/g, "currentColor").replace(/stroke="#fff"/g, 'style="stroke:var(--panel)"');
    el.dataset.logo = c.id;
  }
  let markSVG = "";
  function favicon(accent = ACCENT) {
    if (typeof document === "undefined") return;
    markSVG ||= (concepts.find((x) => x.id === "isoline").html().match(/<svg class="lg-mark"[\s\S]*?<\/svg>/) || [""])[0];
    if (!markSVG) return;
    const svg = markSVG.replace('<svg class="lg-mark"', '<svg xmlns="http://www.w3.org/2000/svg"').replace(' aria-hidden="true"', "")
      .replace("<defs>", "<style>path{stroke:#1c1c1e}@media (prefers-color-scheme:dark){path{stroke:#edece8}circle{stroke:#1c1c1e}}</style><defs>")
      .replace(`fill="${ACCENT}"`, `fill="${accent}"`);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; link.type = "image/svg+xml"; document.head.appendChild(link); }
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  root.TopoBrand = { concepts, mount, favicon };
})(typeof window !== "undefined" ? window : globalThis);
