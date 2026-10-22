
const REPO = "masterclaudecoder/isoline";
const ORIGINS = ["https://masterclaudecoder.github.io", "http://localhost:8765"];
const LABELS = { bug: "bug", idea: "enhancement", other: "feedback" };
const NAMES = { bug: "Bug", idea: "Idea", other: "Feedback" };
const WINDOW = 10 * 60 * 1000, PER_WINDOW = 5;
const seen = new Map();

const cors = (origin) => ({
  "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
});
const reply = (status, data, origin) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
const clean = (s, n) => String(s || "").replace(/\r/g, "").slice(0, n).trim();

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (req.method !== "POST") return reply(405, { error: "POST only" }, origin);
    if (!ORIGINS.includes(origin)) return reply(403, { error: "Unknown origin" }, origin);

    const ip = req.headers.get("CF-Connecting-IP") || "unknown", now = Date.now();
    const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW);
    if (hits.length >= PER_WINDOW) return reply(429, { error: "Too many reports. Try again in a few minutes." }, origin);

    let data;
    try { data = await req.json(); } catch { return reply(400, { error: "Send JSON" }, origin); }
    if (data.website) return reply(200, { url: null }, origin);
    const kind = LABELS[data.kind] ? data.kind : "other";
    const title = clean(data.title, 120), body = clean(data.body, 6000), details = clean(data.details, 3000);
    if (!title && !body) return reply(400, { error: "Write a title or some details" }, origin);
    hits.push(now); seen.set(ip, hits);

    const text = (body || "_No details given._") + (details ? `\n\n<details><summary>Page details</summary>\n\n${details}\n</details>` : "") + "\n\n_Sent from the feedback form in Isoline._";
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "isoline-feedback", "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${NAMES[kind]}: ${title || body.split("\n")[0].slice(0, 80)}`, body: text, labels: [LABELS[kind]] }),
    });
    if (!res.ok) return reply(502, { error: "GitHub didn't take the issue" }, origin);
    const issue = await res.json();
    return reply(201, { url: issue.html_url }, origin);
  },
};
