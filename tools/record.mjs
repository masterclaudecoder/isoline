// Records the short clips shown inside tooltips (and, later, tutorial steps) as animated WebP.
//
// Clips drive the real UI with a scripted pointer and draw a cursor over it: the cursor follows its
// waypoints on a damped spring, so paths curve and settle like a hand instead of jumping in straight
// lines, and presses show a small ripple. Motion previews don't need clips: tooltips render those live.
//
// Writes previews/tips/<name>.webp and tips.js (the same clips as data URLs, so the single-file build
// carries them too).
//
// Run with the site served locally:
//   python3 -m http.server 8765 &
//   npm i --no-save sharp playwright && node tools/record.mjs [http://localhost:8765] [clip names...]
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "previews", "tips");
const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:8765";
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("http"));
// Clips are 1.6x the tooltip's 220 by 138 frame, sharp on most screens and still small.
const W = 352, H = 220;

const require = createRequire(import.meta.url);
const load = (name) => { try { return require(name); } catch (e) { return require(path.join(require("node:child_process").execSync("npm root -g").toString().trim(), name)); } };
const pw = load("playwright"), sharp = load("sharp");
const browser = await pw.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

// ---------- encoding ----------
async function encode(frames, delay) {
  const sized = await Promise.all(frames.map((f) => sharp(f).resize(W, H, { fit: "cover" }).png().toBuffer()));
  return sharp(sized, { join: { animated: true } }).webp({ quality: 90, smartSubsample: true, effort: 6, loop: 0, delay: sized.map(() => delay) }).toBuffer();
}

// ---------- cursor ----------
const CURSOR = `(() => {
  const el = document.createElement("div");
  el.id = "rec-cursor";
  el.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M4 2.5v15.2l4.1-3.9 2.6 6 2.7-1.2-2.6-5.9h5.7Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg><i></i>';
  const css = document.createElement("style");
  css.textContent = "#rec-cursor{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));transform-origin:4px 3px}#rec-cursor svg{display:block}#rec-cursor i{position:absolute;left:4px;top:3px;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 0 1.5px rgba(0,0,0,.25);opacity:0;scale:.3}";
  document.head.appendChild(css); document.body.appendChild(el);
  window.__cur = (x, y, press, ring) => { el.style.translate = (x - 4) + "px " + (y - 3) + "px"; el.style.scale = String((window.__curK || 1) * (press ? 0.86 : 1)); const r = el.querySelector("i"); r.style.opacity = ring > 0 ? String(ring) : "0"; r.style.scale = String(0.3 + (1 - ring) * 0.9); };
})()`;

// A scripted pointer: waypoints are targets, and the drawn position chases them on a critically damped
// spring, sampled once per frame. Real mouse events follow the same path so the app reacts as if used.
function pointer(page, clip, frames) {
  let x = clip.x + clip.width + 40, y = clip.y + clip.height * 0.8, vx = 0, vy = 0, down = false, ring = 0;
  const shot = async () => {
    await page.evaluate(([x, y, down, ring]) => window.__cur(x, y, down, ring), [x, y, down, ring]);
    // Long enough for the app to finish the frame it is drawing, so no half-rendered frame is captured.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(90);
    frames.push(await page.screenshot({ clip, type: "png" }));
  };
  const step = async (tx, ty, k = 0.16) => {
    // Spring toward the target: stiffness k, damping 2*sqrt(k), no overshoot.
    const d = 2 * Math.sqrt(k);
    vx += (tx - x) * k - vx * d; vy += (ty - y) * k - vy * d; x += vx; y += vy;
    if (ring > 0) ring = Math.max(0, ring - 0.16);
    await page.mouse.move(x, y);
    await shot();
  };
  return {
    async to(tx, ty, n = 14, k) { for (let i = 0; i < n; i++) await step(tx, ty, k); },
    async hold(n = 6) { for (let i = 0; i < n; i++) await step(x, y); },
    async press() { down = true; ring = 1; await page.mouse.down(); await shot(); },
    async release() { down = false; await page.mouse.up(); await shot(); },
    async dbl() { await page.mouse.dblclick(x, y); ring = 1; await shot(); ring = 0.84; await shot(); },
    async leave() { await this.to(clip.x + clip.width + 40, clip.y + clip.height * 0.85, 12, 0.12); },
  };
}

async function studio(look) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 });
  await page.goto(BASE + "/#/studio");
  await page.waitForFunction(() => window.Studio?.apply);
  await page.waitForTimeout(800);
  await page.evaluate((look) => { if (look.preset) window.Studio.usePreset(look.preset); if (look.apply) window.Studio.apply(look.apply); }, look);
  await page.waitForTimeout(1500);
  return page;
}

// ---------- clips ----------
const CLIPS = {
  // Dragging a mesh dot, then double-clicking to add one.
  "mesh-drag": async () => {
    const page = await studio({ preset: "Dusk", apply: { fxOrder: [] } });
    await page.evaluate(CURSOR);
    const art = await (await page.$("#art")).boundingBox();
    // The clip is the canvas at the tooltip's shape, centered.
    const ch = Math.min(art.height, art.width * (H / W)), cw = ch * (W / H);
    const clip = { x: art.x + (art.width - cw) / 2, y: art.y + (art.height - ch) / 2, width: cw, height: ch };
    // The clip is scaled down to W, so the cursor is drawn larger to land at a normal size.
    await page.evaluate((k) => (window.__curK = k), Math.max(1, (clip.width / W) * 0.85));
    const pts = await page.evaluate(() => window.Studio.state().grad.points);
    const at = (p) => [art.x + p.x * art.width, art.y + p.y * art.height];
    const frames = [], ptr = pointer(page, clip, frames);
    const [ax, ay] = at(pts[4] || pts[0]);
    await ptr.hold(3);
    await ptr.to(ax, ay, 18);
    await ptr.press();
    await ptr.to(ax + clip.width * 0.2, ay - clip.height * 0.18, 16, 0.1);
    await ptr.to(ax - clip.width * 0.12, ay + clip.height * 0.1, 16, 0.1);
    await ptr.release();
    await ptr.to(clip.x + clip.width * 0.24, clip.y + clip.height * 0.3, 14);
    await ptr.dbl();
    await ptr.hold(10);
    await ptr.leave();
    await page.close();
    return { frames, delay: 50 };
  },
};

await fs.mkdir(OUT, { recursive: true });
const media = {};
const prev = await fs.readFile(path.join(ROOT, "tips.js"), "utf8").catch(() => "");
for (const m of prev.matchAll(/"([\w-]+)": "(data:image\/webp;base64,[^"]+)"/g)) if (CLIPS[m[1]]) media[m[1]] = m[2];
for (const [name, make] of Object.entries(CLIPS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const t0 = Date.now();
  const { frames, delay } = await make();
  const buf = await encode(frames, delay);
  await fs.writeFile(path.join(OUT, name + ".webp"), buf);
  media[name] = "data:image/webp;base64," + buf.toString("base64");
  console.log(`${name}: ${frames.length} frames, ${Math.round(buf.length / 1024)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await fs.writeFile(path.join(ROOT, "tips.js"), `// Tooltip clips recorded by tools/record.mjs. Regenerate them there rather than editing this file.\nwindow.TIP_MEDIA = {\n${Object.entries(media).map(([k, v]) => `  "${k}": "${v}",`).join("\n")}\n};\n`);
await browser.close();
