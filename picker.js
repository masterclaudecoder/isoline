(function (root) {
  "use strict";
  const C = root.Color;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ICON = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const PREF = "isoline-picker";
  let pref = { fmt: "hex", mode: "pick" };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF) || "{}")); } catch (e) {}
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} };

  const el = document.createElement("div");
  el.className = "picker"; el.hidden = true;
  el.innerHTML = `
    <div class="pk-area">
      <div class="pk-pick"><div class="pk-sv"><i class="pk-knob"></i></div><div class="pk-hue"><i class="pk-knob"></i></div></div>
      <div class="pk-sliders"></div>
      <button class="pk-flip" type="button"></button>
    </div>
    <div class="pk-row"><span class="pk-now"></span><div class="pk-fields"></div><button class="ib pk-drop" title="Pick from screen" aria-label="Pick from screen">${ICON("pipette")}</button></div>
    <div class="pk-meta"><span class="pk-name"></span><div class="pk-fmt">${Object.entries(C.FORMATS).map(([k, f]) => `<button type="button" data-f="${k}">${f.label}</button>`).join("")}</div></div>
    <div class="pk-sw"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const area = $(".pk-area"), sv = $(".pk-sv"), hue = $(".pk-hue"), sliders = $(".pk-sliders"), flip = $(".pk-flip");
  const fields = $(".pk-fields"), now = $(".pk-now"), nameEl = $(".pk-name"), swEl = $(".pk-sw"), drop = $(".pk-drop");
  if (!root.EyeDropper) drop.hidden = true;

  let hsv = [0, 0, 0], hex = "#000000", vals = null, cur = null, anchor = null, dragging = false, nameT = 0;
  const chFmt = () => (pref.fmt === "hex" ? "rgb" : pref.fmt);
  const valsOf = () => C.FORMATS[chFmt()].get(hex);

  function setHex(h, from) {
    hex = h;
    if (from !== "hsv") { const n = C.hexToHsv(h); hsv = n[1] === 0 || n[2] === 0 ? [hsv[0], n[1], n[2]] : n; }
    if (from !== "vals") vals = valsOf();
  }
  function paint(skipField) {
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${C.hsvToHex(hsv[0], 1, 1)})`;
    sv.firstChild.style.cssText = `left:${hsv[1] * 100}%;top:${(1 - hsv[2]) * 100}%;background:${hex}`;
    hue.firstChild.style.cssText = `left:${(hsv[0] / 360) * 100}%;background:${C.hsvToHex(hsv[0], 1, 1)}`;
    now.style.background = hex;
    paintSliders();
    if (!skipField) paintFields();
    clearTimeout(nameT); nameT = setTimeout(() => (nameEl.textContent = C.name(hex)), dragging ? 60 : 0);
  }
  function emit() { paint(); cur?.onInput(hex); }

  function buildFields() {
    const f = C.FORMATS[pref.fmt];
    fields.innerHTML = pref.fmt === "hex" ? `<input class="field mono" data-c="hex" spellcheck="false" aria-label="Hex">` : f.ch.map(([l], i) => `<label class="pk-ch"><span>${l}</span><input class="field mono" data-c="${i}" inputmode="decimal" aria-label="${l}"></label>`).join("");
    for (const b of el.querySelectorAll(".pk-fmt button")) b.classList.toggle("on", b.dataset.f === pref.fmt);
    buildSliders();
  }
  function paintFields() {
    const f = C.FORMATS[pref.fmt];
    for (const inp of fields.querySelectorAll("input")) {
      if (document.activeElement === inp) continue;
      if (inp.dataset.c === "hex") inp.value = hex;
      else { const i = +inp.dataset.c, step = f.ch[i][3]; inp.value = +(Math.round(vals[i] / step) * step).toFixed(3); }
    }
  }
  fields.addEventListener("input", (e) => {
    const inp = e.target;
    if (inp.dataset.c === "hex") { const v = C.parse(inp.value); if (v) { setHex(v); paint(true); cur?.onInput(hex); } return; }
    const n = parseFloat(inp.value);
    if (!Number.isFinite(n)) return;
    const f = C.FORMATS[pref.fmt], i = +inp.dataset.c;
    vals[i] = clamp(n, f.ch[i][1], f.ch[i][2]);
    setHex(f.set(vals), "vals"); paint(true); cur?.onInput(hex);
  });
  fields.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  fields.addEventListener("change", () => { paintFields(); cur?.onDone?.(); });
  fields.addEventListener("paste", (e) => { const v = C.parse(e.clipboardData.getData("text")); if (v) { e.preventDefault(); setHex(v); emit(); cur?.onDone?.(); } });

  function buildSliders() {
    const f = C.FORMATS[chFmt()];
    sliders.innerHTML = f.ch.map(([l], i) => `<div class="pk-sl" data-i="${i}"><span>${l}</span><div class="pk-track"><i class="pk-knob"></i></div></div>`).join("");
    for (const row of sliders.children) dragOn(row.querySelector(".pk-track"), (x) => { const i = +row.dataset.i, ch = f.ch[i]; vals[i] = ch[1] + x * (ch[2] - ch[1]); setHex(f.set(vals), "vals"); });
  }
  function paintSliders() {
    if (pref.mode !== "slide") return;
    const f = C.FORMATS[chFmt()];
    [...sliders.children].forEach((row, i) => {
      const [, lo, hi] = f.ch[i], n = f.ch[i][0] === "H" ? 13 : 7;
      const stops = Array.from({ length: n }, (_, k) => { const v = vals.slice(); v[i] = lo + ((hi - lo) * k) / (n - 1); return f.set(v); });
      const tr = row.querySelector(".pk-track");
      tr.style.background = `linear-gradient(90deg, ${stops.join(", ")})`;
      tr.firstChild.style.cssText = `left:${clamp((vals[i] - lo) / (hi - lo), 0, 1) * 100}%;background:${hex}`;
    });
  }

  function dragOn(target, fn) {
    target.addEventListener("pointerdown", (e) => {
      e.preventDefault(); target.setPointerCapture(e.pointerId); dragging = true; area.classList.remove("near");
      const move = (ev) => { const r = target.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); emit(); };
      move(e);
      target.onpointermove = move;
      target.onpointerup = target.onpointercancel = () => { target.onpointermove = null; dragging = false; cur?.onDone?.(); };
    });
  }
  dragOn(sv, (x, y) => { hsv[1] = x; hsv[2] = 1 - y; setHex(C.hsvToHex(...hsv), "hsv"); });
  dragOn(hue, (x) => { hsv[0] = Math.min(359.9, x * 360); setHex(C.hsvToHex(...hsv), "hsv"); });

  area.addEventListener("pointermove", (e) => {
    if (dragging) return;
    const r = area.getBoundingClientRect();
    area.classList.toggle("near", r.right - e.clientX < 64 && e.clientY - r.top < 52);
  });
  area.addEventListener("pointerleave", () => area.classList.remove("near"));
  function setMode(m) {
    pref.mode = m; savePref();
    area.dataset.mode = m;
    flip.innerHTML = m === "pick" ? `${ICON("sliders")}<span>Sliders</span>` : `${ICON("grid")}<span>Picker</span>`;
    flip.setAttribute("aria-label", m === "pick" ? "Show sliders" : "Show picker");
    paintSliders();
  }
  flip.onclick = () => setMode(pref.mode === "pick" ? "slide" : "pick");
  el.querySelector(".pk-fmt").onclick = (e) => { const b = e.target.closest("[data-f]"); if (!b) return; pref.fmt = b.dataset.f; savePref(); vals = valsOf(); buildFields(); paint(); };
  swEl.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; setHex(b.dataset.c); emit(); cur?.onDone?.(); });
  drop.onclick = async () => { try { const r = await new root.EyeDropper().open(); setHex(r.sRGBHex.slice(0, 7)); emit(); cur?.onDone?.(); } catch (e) {} };

  function place() {
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
    el.style.left = clamp(x, 8, innerWidth - w - 8) + "px"; el.style.top = y + "px";
  }
  function open(a, value, onInput, onDone, groups = []) {
    if (cur && anchor === a) { close(); return; }
    close();
    anchor = a; cur = { onInput, onDone };
    setHex(C.parseHex(value) || "#000000");
    hsv = C.hexToHsv(hex);
    swEl.innerHTML = groups.map(([label, cols]) => `<div class="pk-group"><span>${label}</span><div>${[...new Set(cols)].slice(0, 8).map((c) => `<button class="sw xs" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div></div>`).join("");
    swEl.hidden = !groups.length;
    buildFields(); setMode(pref.mode);
    el.hidden = false; paint(); place();
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    a.classList.add("picking");
  }
  function close() { if (!cur) return; const d = cur.onDone; cur = null; el.hidden = true; anchor?.classList.remove("picking"); anchor = null; d?.(); }
  document.addEventListener("pointerdown", (e) => { if (cur && !el.contains(e.target) && !anchor.contains(e.target)) close(); }, true);
  addEventListener("resize", () => cur && place());
  root.ColorPicker = { open, close, isOpen: () => !!cur };
})(window);
