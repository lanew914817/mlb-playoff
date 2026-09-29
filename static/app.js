let mode = "prediction";
let teams = {};
let series = [];
let state = { wins: {}, games: [] };
// Records of the shown bracket, and of the real games (for 猜中 marks); see rules.js.
let bracket = {};
let actualBracket = {};
const HITS_KEY = "mlb2026-show-hits";
let showHits = true;
try {
  showHits = localStorage.getItem(HITS_KEY) !== "0";
} catch {}

// 猜中 per series the real games have decided (prediction mode only).
function hits() {
  return mode === "prediction" ? compareBrackets(bracket, actualBracket) : {};
}

// The slot a series winner moves into (the champion slot for the World Series).
function advancedSlot(sid, find = slotOf) {
  if (sid === "W_1") return find("W_1", "winner");
  const t = series.find((x) => x.from === sid || (Array.isArray(x.from) && x.from.includes(sid)));
  return find(t.id, t.from === sid || t.from[0] === sid ? "away" : "home");
}
// Owner (this machine) saves to the server; LAN visitors keep their own prediction in the browser.
let canEdit = false;
const LOCAL_KEY = "mlb2026-prediction-wins";

function editable() {
  return canEdit || mode === "prediction";
}

function readLocalWins() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

const $ = (id) => document.getElementById(id);

function zh(id) {
  return (teams[id] && teams[id].zh) || "待定";
}

function real(id) {
  return id != null && teams[id];
}

function seriesBy(id) {
  return series.find((s) => s.id === id);
}

function recompute() {
  bracket = computeBracket(series, state, real);
}

function recordOf(sid) {
  return bracket[sid];
}

function pickOf(sid) {
  return bracket[sid].winner;
}

function sides(s) {
  const r = bracket[s.id];
  return { away: r.away, home: r.home };
}

function logoSrc(id) {
  return `/logos/${id}.png`;
}

// Plate is 1280×980 (top band cropped). Model units: 1000 wide.
const VW = 1000, VH = 1000 * 980 / 1280;
const R = 32, R_CHAMP = 46, SPINE = R + 22;
const rOf = (slot) => (slot.side === "winner" ? R_CHAMP : R);
const BG_SRC = "/static/poster-bg-wide.jpg?v=9";
const SLOTS = [
  { id: "F_1", side: "away", x: 72, y: 266 },
  { id: "F_1", side: "home", x: 72, y: 396 },
  { id: "F_2", side: "away", x: 72, y: 586 },
  { id: "F_2", side: "home", x: 72, y: 716 },
  { id: "D_2", side: "away", x: 200, y: 266 },
  { id: "D_2", side: "home", x: 200, y: 396 },
  { id: "D_1", side: "away", x: 200, y: 586 },
  { id: "D_1", side: "home", x: 200, y: 716 },
  { id: "L_1", side: "away", x: 325, y: 331 },
  { id: "L_1", side: "home", x: 325, y: 651 },
  { id: "W_1", side: "away", x: 426, y: 491 },
  { id: "W_1", side: "winner", x: 503, y: 382 },
  { id: "W_1", side: "home", x: 580, y: 491 },
  { id: "L_2", side: "away", x: 678, y: 331 },
  { id: "L_2", side: "home", x: 678, y: 651 },
  { id: "D_4", side: "away", x: 800, y: 266 },
  { id: "D_4", side: "home", x: 800, y: 396 },
  { id: "D_3", side: "away", x: 800, y: 586 },
  { id: "D_3", side: "home", x: 800, y: 716 },
  { id: "F_3", side: "away", x: 928, y: 266 },
  { id: "F_3", side: "home", x: 928, y: 396 },
  { id: "F_4", side: "away", x: 928, y: 586 },
  { id: "F_4", side: "home", x: 928, y: 716 },
];
const LABELS = [
  ["AL CHAMPION", "W_1", "away"],
  ["NL CHAMPION", "W_1", "home"],
];
const GOLD = "#e6c56a", GOLD_HI = "#ffe7a3", CREAM = "#f6e7c1", SEED_RED = "#d50032";
const SERIF = '"Cinzel", "Trajan Pro", Georgia, serif';
const SANS = '"PingFang TC", "Noto Sans TC", sans-serif';

function slotOf(id, side) {
  return SLOTS.find((s) => s.id === id && s.side === side);
}

function bracketSegs() {
  const segs = [];
  const add = (x1, y1, x2, y2) => segs.push([x1, y1, x2, y2]);
  const pair = (id, to, dir) => {
    const tops = SLOTS.filter((s) => s.id === id && s.side !== "winner").sort((a, b) => a.y - b.y);
    const [a, b] = tops;
    const spine = a.x + dir * SPINE;
    const mid = (a.y + b.y) / 2;
    const tx = to.x - dir * rOf(to);
    add(a.x + dir * R, a.y, spine, a.y);
    add(b.x + dir * R, b.y, spine, b.y);
    add(spine, a.y, spine, b.y);
    if (Math.abs(to.y - mid) < 3) add(spine, mid, tx, mid);
    else {
      const elbow = spine + dir * Math.max(18, Math.abs(tx - spine) * 0.45);
      add(spine, mid, elbow, mid);
      add(elbow, mid, elbow, to.y);
      add(elbow, to.y, tx, to.y);
    }
  };
  const dot = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ra = rOf(a), rb = rOf(b);
    add(a.x + dx / len * ra, a.y + dy / len * ra, b.x - dx / len * rb, b.y - dy / len * rb);
  };
  pair("F_1", slotOf("D_2", "away"), 1);
  pair("F_2", slotOf("D_1", "away"), 1);
  pair("D_2", slotOf("L_1", "away"), 1);
  pair("D_1", slotOf("L_1", "home"), 1);
  pair("L_1", slotOf("W_1", "away"), 1);
  pair("F_3", slotOf("D_4", "away"), -1);
  pair("F_4", slotOf("D_3", "away"), -1);
  pair("D_4", slotOf("L_2", "away"), -1);
  pair("D_3", slotOf("L_2", "home"), -1);
  pair("L_2", slotOf("W_1", "home"), -1);
  dot(slotOf("W_1", "away"), slotOf("W_1", "winner"));
  dot(slotOf("W_1", "home"), slotOf("W_1", "winner"));
  return segs;
}

function slotTeam(slot) {
  if (slot.side === "winner") return pickOf(slot.id);
  const pair = sides(seriesBy(slot.id));
  return pair[slot.side];
}

// A team that lost this series (World Series finalists stay bright: both are league champions).
function eliminated(slot, teamId) {
  if (slot.id === "W_1" || !real(teamId)) return false;
  const w = pickOf(slot.id);
  return w != null && w !== teamId;
}

const DIM_ALPHA = 0.38, GOLD_DIM = "rgba(230, 197, 106, .45)";

// Seed only where a team first enters the bracket.
function slotSeed(slot) {
  if (slot.side === "winner") return null;
  const s = seriesBy(slot.id);
  if (s.gameType !== "F" && s.gameType !== "D") return null;
  return slot.side === "away" ? s.awaySeed : s.homeSeed;
}

// Score pill sits on the spine between the two teams; W_1's sits between the champions.
function scoreSpot(sid) {
  const mates = SLOTS.filter((s) => s.id === sid && s.side !== "winner");
  if (sid === "W_1") return { x: (mates[0].x + mates[1].x) / 2, y: mates[0].y };
  const x = mates[0].x, dir = x < VW / 2 ? 1 : -1;
  return { x: x + dir * SPINE, y: (mates[0].y + mates[1].y) / 2 };
}

// Changing a series' winner wipes every later round on its path.
function commit(sid, mutate) {
  const before = pickOf(sid);
  state.wins = state.wins || {};
  mutate();
  recompute();
  // A changed winner wipes every later round on its path; then drop records of unset series.
  if (before != null && pickOf(sid) !== before) {
    for (const id of laterRounds(series, sid)) delete state.wins[id];
    recompute();
  }
  for (const s of series) {
    if (state.wins[s.id] && !recordOf(s.id).ready) delete state.wins[s.id];
  }
  persist();
  render();
}

function bump(sid, teamId, delta) {
  if (!editable()) return;
  const next = bumpRecord(recordOf(sid), teamId, delta);
  if (next) commit(sid, () => { state.wins[sid] = next; });
}

function resetSeries(sid) {
  commit(sid, () => { delete state.wins[sid]; });
}

const imgCache = {};
function cachedImg(src) {
  if (!imgCache[src]) {
    const img = new Image();
    img.onload = () => requestAnimationFrame(paintPoster);
    img.src = src;
    imgCache[src] = img;
  }
  return imgCache[src];
}
const ready = (img) => img.complete && img.naturalWidth > 0;

function spacedWidth(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((n, c) => n + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
}

// Centered text with manual letter spacing (canvas letterSpacing isn't everywhere).
function spacedText(ctx, text, x, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = spacedWidth(ctx, text, spacing);
  let cx = x - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  return total;
}

function goldRule(ctx, cx, y, half, width = 0.9) {
  const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, "rgba(230,197,106,0)");
  g.addColorStop(0.5, GOLD);
  g.addColorStop(1, "rgba(230,197,106,0)");
  ctx.strokeStyle = g;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();
}

// Series record in a small framed box. Vertical (top team over bottom team) on the
// spines; horizontal for W_1, whose teams sit left and right.
function recordBox(ctx, x, y, top, bottom, vertical) {
  const w = vertical ? 22 : 44, h = vertical ? 52 : 22;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 7);
  ctx.fillStyle = "rgba(4, 16, 40, .92)";
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  ctx.font = `700 14px ${SERIF}`;
  if (vertical) {
    ctx.fillText(String(top), x, y - 15);
    ctx.fillText(String(bottom), x, y + 16);
    ctx.font = `700 12px ${SERIF}`;
    ctx.fillText(":", x, y);
  } else {
    ctx.fillText(`${top}:${bottom}`, x, y + 0.5);
  }
}

// Draws the whole poster in model units; used for both screen and export.
function drawPoster(ctx, width) {
  const k = width / VW;
  ctx.save();
  ctx.scale(k, k);
  ctx.textBaseline = "middle";

  const bg = cachedImg(BG_SRC);
  if (ready(bg)) ctx.drawImage(bg, 0, 0, VW, VH);
  else { ctx.fillStyle = "#06122a"; ctx.fillRect(0, 0, VW, VH); }

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (const [x1, y1, x2, y2] of bracketSegs()) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (const slot of SLOTS) {
    const teamId = slotTeam(slot);
    const hot = real(teamId) && pickOf(slot.id) === teamId;
    const out = eliminated(slot, teamId);
    ctx.beginPath();
    const r = rOf(slot);
    ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(2, 10, 24, .6)";
    ctx.fill();
    if (real(teamId)) {
      const img = cachedImg(logoSrc(teamId));
      if (ready(img)) {
        const d = r * 2 - 5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, d / 2, 0, Math.PI * 2);
        ctx.clip();
        if (out) ctx.globalAlpha = DIM_ALPHA;
        ctx.drawImage(img, slot.x - d / 2, slot.y - d / 2, d, d);
        ctx.restore();
      }
    }
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
    ctx.lineWidth = slot.side === "winner" ? 3.6 : hot ? 3.4 : 2.4;
    ctx.strokeStyle = hot ? GOLD_HI : out ? GOLD_DIM : GOLD;
    ctx.stroke();
  }

  for (const slot of SLOTS) {
    const seed = slotSeed(slot);
    if (seed == null || !real(slotTeam(slot))) continue;
    drawSeed(ctx, slot.x + R * 0.74, slot.y - R * 0.74, seed);
  }

  for (const [text, sid, side] of LABELS) {
    const s = slotOf(sid, side);
    const y = s.y + R + 17;
    ctx.font = `700 8.6px ${SERIF}`;
    ctx.save();
    ctx.shadowColor = "rgba(2, 8, 20, .95)";
    ctx.shadowBlur = 6;
    const grad = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    grad.addColorStop(0, "#fff3cf");
    grad.addColorStop(1, GOLD);
    ctx.fillStyle = grad;
    const w = spacedText(ctx, text, s.x, y + 0.5, 1.8);
    ctx.restore();
    goldRule(ctx, s.x, y - 8, w / 2 + 6);
    goldRule(ctx, s.x, y + 8, w / 2 + 6);
  }

  for (const s of series) {
    const r = recordOf(s.id);
    if (!r.a && !r.h) continue;
    const p = scoreSpot(s.id);
    recordBox(ctx, p.x, p.y, r.a, r.h, s.id !== "W_1");
  }

  if (showHits) drawHits(ctx);

  ctx.restore();
}

// Red seed badge (poster units; scale the context for other layouts).
function drawSeed(ctx, x, y, seed) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = SEED_RED;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `800 12.5px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(seed), x, y + 0.6);
}

// Gold ✓ (guessed right) or grey ✗ badge.
function drawMark(ctx, x, y, ok) {
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = ok ? GOLD : "#5b6475";
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ok ? "#041e42" : "#fff";
  if (ok) {
    ctx.moveTo(x - 4, y + 0.5);
    ctx.lineTo(x - 1, y + 3.5);
    ctx.lineTo(x + 4.5, y - 3);
  } else {
    ctx.moveTo(x - 3.5, y - 3.5);
    ctx.lineTo(x + 3.5, y + 3.5);
    ctx.moveTo(x + 3.5, y - 3.5);
    ctx.lineTo(x - 3.5, y + 3.5);
  }
  ctx.stroke();
}

// Draws fn in a context scaled by k around (x, y), so poster-sized helpers fit other layouts.
function scaledAt(ctx, x, y, k, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  fn();
  ctx.restore();
}

// ✓ / ✗ on the slot each predicted winner moved into, plus the 猜中 count.
function drawHits(ctx) {
  const h = hits();
  const ids = Object.keys(h);
  if (!ids.length) return;
  for (const sid of ids) {
    if (pickOf(sid) == null) continue;
    const slot = advancedSlot(sid);
    const r = rOf(slot);
    drawMark(ctx, slot.x + r * 0.74, slot.y + r * 0.74, h[sid]);
  }
  const got = ids.filter((sid) => h[sid]).length;
  const y = VH - 16;
  ctx.font = `700 10px ${SERIF}`;
  ctx.save();
  ctx.shadowColor = "rgba(2, 8, 20, .95)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = CREAM;
  const w = spacedText(ctx, `CORRECT PICKS  ${got} / ${ids.length}`, VW / 2, y, 1.8);
  ctx.restore();
  goldRule(ctx, VW / 2, y - 9, w / 2 + 8);
}

function paintPoster() {
  const canvas = $("poster").querySelector("canvas");
  if (!canvas) return;
  const w = canvas.clientWidth;
  if (!w) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * VH / VW * dpr);
  const ctx = canvas.getContext("2d");
  drawPoster(ctx, canvas.width);
}

function renderPoster() {
  const poster = $("poster");
  poster.innerHTML = "";
  const canvas = document.createElement("canvas");
  poster.appendChild(canvas);
  for (const slot of SLOTS) {
    const teamId = slotTeam(slot);
    if (!real(teamId)) continue;
    if (slot.side === "winner") continue;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "slot";
    const open = editable() && recordOf(slot.id).ready;
    el.disabled = !open;
    el.title = open ? `${zh(teamId)}：點一下 +1 勝，右鍵或長按 −1 勝` : zh(teamId);
    el.style.left = (slot.x / VW * 100) + "%";
    el.style.top = (slot.y / VH * 100) + "%";
    el.style.width = (rOf(slot) * 2 / VW * 100) + "%";
    let timer = null, held = false;
    const stop = () => { clearTimeout(timer); timer = null; };
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      held = false;
      timer = setTimeout(() => { held = true; bump(slot.id, teamId, -1); }, 500);
    });
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointerleave", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("click", () => {
      if (held) { held = false; return; }
      bump(slot.id, teamId, 1);
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (held) return;
      bump(slot.id, teamId, -1);
    });
    poster.appendChild(el);
  }
  paintPoster();
}

new ResizeObserver(() => paintPoster()).observe($("poster"));

const FORMAT = { F: "三戰兩勝", D: "五戰三勝", L: "七戰四勝", W: "七戰四勝" };
const ROUNDS = [
  ["外卡賽", ["F_1", "F_2", "F_3", "F_4"]],
  ["分區賽", ["D_2", "D_1", "D_4", "D_3"]],
  ["聯盟冠軍賽", ["L_1", "L_2"]],
  ["世界大賽", ["W_1"]],
];

function seedOf(teamId) {
  for (const s of series) {
    if (s.away === teamId && s.awaySeed) return s.awaySeed;
    if (s.home === teamId && s.homeSeed) return s.homeSeed;
  }
  return null;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function teamLabel(teamId) {
  const box = el("span", "tm");
  const seed = real(teamId) ? seedOf(teamId) : null;
  if (seed) box.appendChild(el("span", "seed", String(seed)));
  if (real(teamId)) {
    const img = el("img");
    img.src = logoSrc(teamId);
    img.alt = "";
    box.appendChild(img);
  }
  box.appendChild(el("span", "nm", zh(teamId)));
  return box;
}

function seriesRow(s) {
  const r = recordOf(s.id);
  const row = el("div", "rec" + (r.winner != null ? " done" : ""));
  const name = el("span", "rname", s.zh);
  name.appendChild(el("small", "", FORMAT[s.gameType]));
  const hit = hits()[s.id];
  if (hit != null) name.appendChild(el("span", "tag " + (hit ? "hit" : "miss"), hit ? "猜中" : "沒猜中"));
  const left = teamLabel(r.away);
  if (r.winner != null && r.winner === r.away) left.classList.add("won");
  const right = teamLabel(r.home);
  if (r.winner != null && r.winner === r.home) right.classList.add("won");
  const score = el("span", "rscore", `${r.a} : ${r.h}`);
  row.append(name, left, score, right);
  if (r.manual && editable()) {
    const undo = el("button", "undo", mode === "actual" ? "改回官網" : "重設");
    undo.type = "button";
    undo.addEventListener("click", () => resetSeries(s.id));
    row.appendChild(undo);
  }
  return row;
}

function renderEditor() {
  const root = $("editor");
  root.innerHTML = "";
  const head = el("h2", "", "戰績");
  const h = Object.values(hits());
  if (h.length) head.appendChild(el("span", "score-sum", `猜中 ${h.filter(Boolean).length} / ${h.length}`));
  root.appendChild(head);
  root.appendChild(el("p", "sub", mode === "prediction"
    ? "在海報上點隊徽＝那隊在該系列 +1 勝；右鍵或長按＝−1 勝。贏到門檻自動晉級，前面輪次一改，後面輪次自動清空。"
      + (canEdit ? "" : "你的預測只存在這個瀏覽器。")
    : canEdit
      ? "比分來自 MLB。一樣可以在海報上點隊徽 +1／右鍵或長按 −1 手動改；「改回官網」還原。"
      : "實際戰績（唯讀）。"));
  for (const [name, ids] of ROUNDS) {
    const sec = el("section", "round-sec");
    sec.appendChild(el("h3", "", name));
    for (const id of ids) sec.appendChild(seriesRow(seriesBy(id)));
    root.appendChild(sec);
  }
}

function renderSchedule() {
  const root = $("schedule");
  root.innerHTML = "<h2>台灣時間賽程</h2>";
  const groups = [];
  const map = new Map();
  const games = [...state.games].sort((a, b) => (a.gameDate || "").localeCompare(b.gameDate || ""));
  for (const g of games) {
    if (!g.gameDate) continue;
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(g.gameDate));
    if (!map.has(key)) {
      const arr = [];
      map.set(key, arr);
      groups.push([key, arr]);
    }
    map.get(key).push(g);
  }
  for (const [key, arr] of groups) {
    const day = document.createElement("div");
    day.className = "day";
    const d = new Date(arr[0].gameDate);
    const head = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei", month: "numeric", day: "numeric", weekday: "short",
    }).format(d);
    day.innerHTML = `<h3>${head}</h3>`;
    const ul = document.createElement("ul");
    for (const g of arr) {
      const li = document.createElement("li");
      const tbd = g.startTimeTBD ? "時間待定" : new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false, hourCycle: "h23",
      }).format(new Date(g.gameDate));
      const extra = g.ifNecessary ? "（若需要）" : "";
      const s = seriesBy(g.seriesId);
      li.textContent = `${tbd}　${s ? s.zh : ""} G${g.gameNumber}　${zh(g.away)} @ ${zh(g.home)}${extra}`;
      ul.appendChild(li);
    }
    day.appendChild(ul);
    root.appendChild(day);
  }
}

function render() {
  recompute();
  $("hits-toggle").hidden = !Object.keys(hits()).length;
  $("chk-hits").checked = showHits;
  $("btn-pred").classList.toggle("on", mode === "prediction");
  $("btn-actual").classList.toggle("on", mode === "actual");
  $("btn-sync").hidden = mode !== "actual" || !canEdit;
  $("hint").textContent = mode === "prediction"
    ? "預測：點隊徽 +1 勝，右鍵／長按 −1 勝。"
    : canEdit ? "實際：按「從 MLB 更新」抓比分；點隊徽可手動改。" : "實際戰績（唯讀）";
  renderPoster();
  renderEditor();
  renderSchedule();
}

function persist() {
  if (!canEdit) {
    if (mode !== "prediction") return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state.wins || {}));
    } catch {}
    return;
  }
  fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, state }),
  });
}

async function load(nextMode) {
  mode = nextMode;
  const res = await fetch("/api/state?mode=" + mode);
  const data = await res.json();
  teams = data.teams;
  series = data.series;
  canEdit = !!data.canEdit;
  state = data.state;
  delete state.picks;
  if (!canEdit && mode === "prediction") state = { ...data.state, wins: readLocalWins() };
  actualBracket = {};
  if (mode === "prediction") {
    const act = await (await fetch("/api/state?mode=actual")).json();
    actualBracket = computeBracket(series, act.state, real);
  }
  render();
}

// mlb-2026-預測-20260929-1430.png / mlb-2026-預測-限動-20260929-1430.png (viewer's local time)
function exportName(d, kind = "") {
  const p2 = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
  return `mlb-2026-${mode === "actual" ? "實際" : "預測"}${kind ? "-" + kind : ""}-${stamp}.png`;
}

async function assetsReady() {
  await document.fonts.load(`700 20px ${SERIF}`).catch(() => {});
  await document.fonts.ready;
  const srcs = [BG_SRC, ...SLOTS.map(slotTeam).filter(real).map(logoSrc)];
  await Promise.all(srcs.map((s) => cachedImg(s).decode().catch(() => {})));
}

function download(canvas, name) {
  return new Promise((res, rej) => {
    canvas.toBlob((blob) => {
      if (!blob) return rej(new Error("toBlob failed"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      res();
    }, "image/png");
  });
}

async function exportPng() {
  await assetsReady();
  const canvas = document.createElement("canvas");
  canvas.width = 2560;
  canvas.height = Math.round(2560 * VH / VW);
  drawPoster(canvas.getContext("2d"), canvas.width);
  await download(canvas, exportName(new Date()));
}

async function exportStory() {
  await assetsReady();
  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  drawStory(canvas.getContext("2d"));
  await download(canvas, exportName(new Date(), "限動"));
}

$("btn-pred").onclick = () => load("prediction");
$("chk-hits").onchange = () => {
  showHits = $("chk-hits").checked;
  try {
    localStorage.setItem(HITS_KEY, showHits ? "1" : "0");
  } catch {}
  paintPoster();
};
$("btn-actual").onclick = () => load("actual");
for (const [id, run] of [["btn-export", exportPng], ["btn-story", exportStory]]) {
  $(id).onclick = async () => {
    $(id).disabled = true;
    try {
      await run();
    } catch (e) {
      alert("輸出失敗：" + e);
    } finally {
      $(id).disabled = false;
    }
  };
}
$("btn-sync").onclick = async () => {
  $("btn-sync").disabled = true;
  try {
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "sync failed");
    await load("actual");
  } catch (e) {
    alert("更新失敗：" + e.message);
  } finally {
    $("btn-sync").disabled = false;
  }
};

load("prediction");
