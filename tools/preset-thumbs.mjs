import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const url = process.argv[2] || "http://localhost:8765/", W = 288, H = 180, COLS = 6;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await pg.route(/previews\/presets\./, (r) => r.abort());
await pg.addInitScript(() => { localStorage.setItem("isoline.perfMode", "off"); caches.delete("isoline-thumbs"); });
await pg.goto(url);
await pg.waitForFunction(() => window.Shell); await pg.evaluate(() => Shell.go("studio"));
await pg.waitForFunction(() => { const a = [...document.querySelectorAll("#presetGrid .th")]; return a.length && a.every((e) => e.childElementCount); }, null, { timeout: 300000, polling: 500 });
await pg.waitForTimeout(800);
const out = await pg.evaluate(async ({ W, H, COLS }) => {
  const looks = Studio.presetLooks(), cards = [...document.querySelectorAll("#presetGrid .card")];
  const rows = Math.ceil(looks.length / COLS), c = document.createElement("canvas");
  c.width = W * COLS; c.height = H * rows;
  const x = c.getContext("2d"), items = {};
  for (const [i, [name, hash]] of looks.entries()) {
    const card = cards.find((k) => k.querySelector(".th") && k.textContent.trim().startsWith(name));
    const n = card?.querySelector(".th")?.lastElementChild;
    if (!n) continue;
    let src = n;
    if (n.tagName.toLowerCase() === "svg") { src = new Image(); src.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(n)); await src.decode(); }
    x.drawImage(src, (i % COLS) * W, Math.floor(i / COLS) * H, W, H);
    items[name] = [i, hash];
  }
  const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.86));
  const bytes = [...new Uint8Array(await blob.arrayBuffer())];
  return { bytes, json: { v: Date.now().toString(36), w: W, h: H, cols: COLS, items } };
}, { W, H, COLS });
writeFileSync("previews/presets.webp", Buffer.from(out.bytes));
writeFileSync("previews/presets.json", JSON.stringify(out.json) + "\n");
console.log(Object.keys(out.json.items).length, "presets,", Math.round(out.bytes.length / 1024), "KB");
await b.close();
