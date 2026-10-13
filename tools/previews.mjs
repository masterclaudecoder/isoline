// Captures a preview image for every library in libs.js, for the Components page's window panes.
// Each library gets its own OpenGraph image when the site has one, else a screenshot of the page,
// resized to 640 by 336 JPEG in previews/. Images already captured are kept, so a run only fetches
// what's new. Writes previews/index.json and prints a report of what worked.
//
// Run with: npm i --no-save sharp playwright && npx playwright install chromium && node tools/previews.mjs
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "previews");
const W = 640, H = 336;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

const ctx = {};
vm.runInNewContext(await fs.readFile(path.join(ROOT, "libs.js"), "utf8"), ctx);
const { ISO_LIBS: LIBS, ISO_SLUG: slug } = ctx;
await fs.mkdir(OUT, { recursive: true });

const old = JSON.parse(await fs.readFile(path.join(OUT, "index.json"), "utf8").catch(() => "{}"));
const index = {}, report = { og: [], shot: [], kept: [], failed: [] };
const exists = (f) => fs.access(f).then(() => true, () => false);

async function get(url, ms = 15000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { signal: ac.signal, redirect: "follow", headers: { "user-agent": UA, accept: "text/html,image/*,*/*" } }); }
  finally { clearTimeout(t); }
}
// The page's own social image, from the usual meta tags, resolved against the final URL.
async function ogImage(url) {
  let r = await get(url);
  // Rate limited: wait and try again a couple of times before falling back to a screenshot.
  for (let i = 0; r.status === 429 && i < 2; i++) { await new Promise((ok) => setTimeout(ok, 6000 * (i + 1))); r = await get(url); }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = (await r.text()).slice(0, 400000);
  for (const key of ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"), tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (content) return new URL(content.replace(/&amp;/g, "&"), r.url).href;
  }
  return null;
}
async function save(buf, file) {
  await sharp(buf, { failOn: "none" }).resize(W, H, { fit: "cover", position: "top" }).flatten({ background: "#ffffff" }).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
}

let browser = null;
async function screenshot(url, file) {
  if (!browser) { const { chromium } = await import("playwright"); browser = await chromium.launch(); }
  const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    // Bot checks (Cloudflare, Vercel) make a useless preview: better none, and the drawn pane shows.
    const title = await page.title(), text = (await page.evaluate(() => document.body?.innerText || "")).slice(0, 2000);
    if (/just a moment|attention required|access denied|verify you are human|security checkpoint|failed to verify your browser/i.test(title + " " + text)) throw new Error(`blocked by a bot check`);
    await save(await page.screenshot({ type: "png" }), file);
  } finally { await page.close(); }
}

for (const [name, url] of LIBS) {
  const s = slug(name), file = path.join(OUT, `${s}.jpg`), src = `previews/${s}.jpg`;
  if (old[s] && (await exists(file))) { index[s] = old[s]; report.kept.push(name); continue; }
  try {
    const img = await ogImage(url).catch((e) => { throw new Error(`page: ${e.message}`); });
    if (img) {
      const r = await get(img);
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && buf.length > 4000) { await save(buf, file); index[s] = { src, kind: "og" }; report.og.push(name); continue; }
    }
  } catch (e) { if (/^page:/.test(e.message)) console.log(`  ${name}: ${e.message}`); }
  try { await screenshot(url, file); index[s] = { src, kind: "shot" }; report.shot.push(name); }
  catch (e) { report.failed.push(`${name} (${url}): ${e.message.split("\n")[0]}`); }
}
await browser?.close();
await fs.writeFile(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
console.log(`OpenGraph images: ${report.og.length}\nScreenshots: ${report.shot.length}\nKept from cache: ${report.kept.length}\nNo preview: ${report.failed.length}`);
for (const f of report.failed) console.log(`  ${f}`);
