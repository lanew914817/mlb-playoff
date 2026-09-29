// Shareable Taiwan-time schedule image: 1080 wide, at most 1920 tall (phone sharing).
// One detailed column when it fits; otherwise two compact columns (time and result only);
// otherwise several images. Uses the plate, logos and helpers from story.js / app.js.

const SCH_W = 1080, SCH_MAX_H = 1920, SCH_MIN_H = 1080;
const SCH_HEAD = 290, SCH_FOOT = 86, SCH_X = 40;
const SCH_DAY1 = 72, SCH_ROW1 = 122;            // one column
const SCH_DAY2 = 56, SCH_ROW2 = 62, SCH_GAP = 24; // two columns
const SCH_COL_W = (SCH_W - 2 * SCH_X - SCH_GAP) / 2;

const TW = "Asia/Taipei";
const TW_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: TW, year: "numeric", month: "2-digit", day: "2-digit" });
const dayKeys = new Map();
function twDayKey(iso) {
  if (!dayKeys.has(iso)) dayKeys.set(iso, TW_DAY.format(new Date(iso)));
  return dayKeys.get(iso);
}
function twDayLabel(iso) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("zh-TW", {
    timeZone: TW, month: "numeric", day: "numeric", weekday: "short",
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month}/${parts.day}（${parts.weekday.replace("週", "")}）`;
}
function twTime(g) {
  if (g.startTimeTBD) return "待定";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TW, hour: "2-digit", minute: "2-digit", hour12: false, hourCycle: "h23",
  }).format(new Date(g.gameDate));
}

// "final" (both scores, game over), "live" (scores, still playing) or "" (not started).
function gameStage(g) {
  const scored = g.awayScore != null && g.homeScore != null && g.awayScore !== "" && g.homeScore !== "";
  if (!scored) return "";
  return (g.status === "Final" || g.manual) && gameScoreWinner(g) != null ? "final" : "live";
}

function groupByDay(games) {
  const days = [];
  for (const g of games) {
    const key = twDayKey(g.gameDate);
    if (!days.length || days[days.length - 1].key !== key) days.push({ key, label: twDayLabel(g.gameDate), games: [] });
    days[days.length - 1].games.push(g);
  }
  return days;
}

// Pages of columns; each column is a list of {day} / {game} entries.
function layoutSchedule(games) {
  const days = groupByDay(games);
  const single = SCH_HEAD + SCH_FOOT + days.reduce((n, d) => n + SCH_DAY1 + d.games.length * SCH_ROW1, 0);
  if (single <= SCH_MAX_H) {
    const col = [];
    for (const d of days) {
      col.push({ day: d.label });
      for (const g of d.games) col.push({ game: g });
    }
    return [{ compact: false, cols: [col], height: Math.max(SCH_MIN_H, single) }];
  }
  // Two columns: fill a page while its games still split into two columns that fit,
  // splitting where the columns come out most even (preferably between days).
  const room = SCH_MAX_H - SCH_HEAD - SCH_FOOT;
  const pages = [];
  let rest = games, prevKey = null;
  while (rest.length) {
    let best = null;
    for (let n = 1; n <= rest.length; n++) {
      const split = bestSplit(rest.slice(0, n));
      if (split.tall > room && best) break;
      best = { n, ...split };
    }
    const chunk = rest.slice(0, best.n);
    const left = chunk.slice(0, best.k), right = chunk.slice(best.k);
    const cols = [columnEntries(left, prevKey)];
    if (right.length) cols.push(columnEntries(right, left.length ? twDayKey(left[left.length - 1].gameDate) : prevKey));
    pages.push({ compact: true, cols, height: Math.max(SCH_MIN_H, SCH_HEAD + SCH_FOOT + best.tall) });
    prevKey = twDayKey(chunk[chunk.length - 1].gameDate);
    rest = rest.slice(best.n);
  }
  return pages;
}

// Height of a compact column: a day header whenever the day changes, then one row per game.
function columnHeight(games) {
  let h = 0, key = null;
  for (const g of games) {
    const k = twDayKey(g.gameDate);
    if (k !== key) {
      h += SCH_DAY2;
      key = k;
    }
    h += SCH_ROW2;
  }
  return h;
}

// Where to cut games into left/right columns so the taller one is as short as possible.
function bestSplit(games) {
  let best = { k: games.length, tall: columnHeight(games) };
  for (let k = 1; k < games.length; k++) {
    const midDay = twDayKey(games[k - 1].gameDate) === twDayKey(games[k].gameDate);
    const tall = Math.max(columnHeight(games.slice(0, k)), columnHeight(games.slice(k)));
    if (tall + (midDay ? SCH_ROW2 / 2 : 0) < best.tall + (best.midDay ? SCH_ROW2 / 2 : 0)) best = { k, tall, midDay };
  }
  return best;
}

// Entries for one column; a day that carries over from the previous column is marked 續.
function columnEntries(games, prevKey) {
  const out = [];
  let key = null;
  for (const g of games) {
    const k = twDayKey(g.gameDate);
    if (k !== key) {
      out.push({ day: twDayLabel(g.gameDate) + (key === null && k === prevKey ? " 續" : "") });
      key = k;
    }
    out.push({ game: g });
  }
  return out;
}

function schLogo(ctx, teamId, x, y, r, faded) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(2, 10, 24, .75)";
  ctx.fill();
  const img = real(teamId) ? cachedImg(logoSrc(teamId)) : null;
  if (img && ready(img)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.clip();
    if (faded) ctx.globalAlpha = DIM_ALPHA;
    ctx.drawImage(img, x - r + 3, y - r + 3, 2 * r - 6, 2 * r - 6);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = faded || !real(teamId) ? GOLD_DIM : GOLD;
  ctx.stroke();
}

// Team name colour: winner bright gold, loser faded, otherwise cream.
function schNameStyle(g, teamId) {
  const w = gameStage(g) === "final" ? gameScoreWinner(g) : null;
  if (w == null) return { color: CREAM, faded: false, bold: false };
  return w === teamId ? { color: GOLD_HI, faded: false, bold: true } : { color: "rgba(246,231,193,.45)", faded: true, bold: false };
}

function schScore(g) {
  return gameStage(g) ? `${g.awayScore} : ${g.homeScore}` : "@";
}

function drawGameWide(ctx, g, y) {
  const x0 = SCH_X, x1 = SCH_W - SCH_X, h = SCH_ROW1 - 12;
  ctx.beginPath();
  ctx.roundRect(x0, y, x1 - x0, h, 14);
  ctx.fillStyle = "rgba(4, 16, 40, .78)";
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(230, 197, 106, .55)";
  ctx.stroke();
  const cy = y + 42;
  ctx.textBaseline = "middle";

  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  ctx.font = g.startTimeTBD ? `700 30px ${SANS}` : `700 38px ${SERIF}`;
  ctx.fillText(twTime(g), x0 + 100, y + h / 2);
  ctx.beginPath();
  ctx.moveTo(x0 + 190, y + 18);
  ctx.lineTo(x0 + 190, y + h - 18);
  ctx.strokeStyle = "rgba(230, 197, 106, .35)";
  ctx.stroke();

  const cx = 640;
  const a = schNameStyle(g, g.away), hm = schNameStyle(g, g.home);
  schLogo(ctx, g.away, cx - 130, cy, 30, a.faded);
  schLogo(ctx, g.home, cx + 130, cy, 30, hm.faded);
  ctx.font = `${a.bold ? 800 : 600} 32px ${SANS}`;
  ctx.fillStyle = a.color;
  ctx.textAlign = "right";
  ctx.fillText(zh(g.away), cx - 176, cy);
  ctx.font = `${hm.bold ? 800 : 600} 32px ${SANS}`;
  ctx.fillStyle = hm.color;
  ctx.textAlign = "left";
  ctx.fillText(zh(g.home), cx + 176, cy);

  const stage = gameStage(g);
  ctx.beginPath();
  ctx.roundRect(cx - 62, cy - 25, 124, 50, 12);
  ctx.fillStyle = "rgba(2, 8, 22, .95)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stage ? GOLD : GOLD_DIM;
  ctx.stroke();
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  ctx.font = stage ? `700 30px ${SERIF}` : `600 26px ${SANS}`;
  ctx.fillText(schScore(g), cx, cy + 1);

  const s = seriesBy(g.seriesId);
  const tags = [s ? s.zh : "", "G" + g.gameNumber];
  if (stage === "live") tags.push("進行中");
  else if (!stage && g.ifNecessary) tags.push("若需要");
  ctx.font = `500 21px ${SANS}`;
  ctx.fillStyle = "rgba(246, 231, 193, .7)";
  ctx.fillText(tags.filter(Boolean).join(" · "), cx, y + h - 22);
}

function drawGameCompact(ctx, g, x0, y) {
  const h = SCH_ROW2 - 8;
  ctx.beginPath();
  ctx.roundRect(x0, y, SCH_COL_W, h, 10);
  ctx.fillStyle = "rgba(4, 16, 40, .78)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(230, 197, 106, .45)";
  ctx.stroke();
  const cy = y + h / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = CREAM;
  ctx.font = g.startTimeTBD ? `700 20px ${SANS}` : `700 25px ${SERIF}`;
  ctx.fillText(twTime(g), x0 + 14, cy + 1);

  const a = schNameStyle(g, g.away), hm = schNameStyle(g, g.home);
  schLogo(ctx, g.away, x0 + 124, cy, 19, a.faded);
  ctx.font = `${a.bold ? 800 : 600} 23px ${SANS}`;
  ctx.fillStyle = a.color;
  ctx.fillText(zh(g.away), x0 + 150, cy);

  const stage = gameStage(g);
  ctx.textAlign = "center";
  ctx.fillStyle = stage ? CREAM : "rgba(246, 231, 193, .6)";
  ctx.font = stage ? `700 24px ${SERIF}` : `600 21px ${SANS}`;
  ctx.fillText(schScore(g), x0 + 290, cy + 1);

  schLogo(ctx, g.home, x0 + 352, cy, 19, hm.faded);
  ctx.textAlign = "left";
  ctx.font = `${hm.bold ? 800 : 600} 23px ${SANS}`;
  ctx.fillStyle = hm.color;
  ctx.fillText(zh(g.home), x0 + 378, cy);
}

function drawDayHeader(ctx, label, x0, y, w, compact) {
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = GOLD_HI;
  ctx.font = `700 ${compact ? 25 : 30}px ${SANS}`;
  const cy = y + (compact ? SCH_DAY2 : SCH_DAY1) / 2 + 2;
  ctx.fillText(label, x0 + 4, cy);
  const tw = ctx.measureText(label).width;
  const g = ctx.createLinearGradient(x0 + tw + 16, 0, x0 + w, 0);
  g.addColorStop(0, GOLD);
  g.addColorStop(1, "rgba(230,197,106,0)");
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0 + tw + 16, cy);
  ctx.lineTo(x0 + w, cy);
  ctx.stroke();
}

function drawSchedulePage(ctx, page, subtitle, index, total, when) {
  const plate = cachedImg(BG_SRC);
  const H = page.height;
  if (ready(plate)) {
    storyBackground(ctx, plate, H);
    storyCrop(ctx, plate, "title", SCH_W / 2, 118, 118);
  } else {
    ctx.fillStyle = "#06122a";
    ctx.fillRect(0, 0, SCH_W, H);
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `700 34px ${SANS}`;
  ctx.fillStyle = CREAM;
  ctx.fillText(`台灣時間賽程 · ${subtitle}`, SCH_W / 2, 226);
  goldRule(ctx, SCH_W / 2, 262, 300, 1.4);

  page.cols.forEach((col, ci) => {
    const x0 = page.compact ? SCH_X + ci * (SCH_COL_W + SCH_GAP) : SCH_X;
    const w = page.compact ? SCH_COL_W : SCH_W - 2 * SCH_X;
    let y = SCH_HEAD;
    for (const e of col) {
      if (e.day) {
        drawDayHeader(ctx, e.day, x0, y, w, page.compact);
        y += page.compact ? SCH_DAY2 : SCH_DAY1;
      } else if (page.compact) {
        drawGameCompact(ctx, e.game, x0, y);
        y += SCH_ROW2;
      } else {
        drawGameWide(ctx, e.game, y);
        y += SCH_ROW1;
      }
    }
  });

  ctx.textBaseline = "middle";
  ctx.font = `500 21px ${SANS}`;
  ctx.fillStyle = "rgba(246, 231, 193, .65)";
  ctx.textAlign = "left";
  ctx.fillText(`時間為台灣時間（UTC+8）· ${when}`, SCH_X, H - SCH_FOOT / 2);
  if (total > 1) {
    ctx.textAlign = "right";
    ctx.font = `700 24px ${SERIF}`;
    ctx.fillStyle = CREAM;
    ctx.fillText(`${index + 1} / ${total}`, SCH_W - SCH_X, H - SCH_FOOT / 2);
  }
}

// Canvases for the given games (already in time order).
function scheduleCanvases(games, subtitle) {
  const pages = layoutSchedule(games);
  const when = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TW, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  return pages.map((page, i) => {
    const c = document.createElement("canvas");
    c.width = SCH_W;
    c.height = page.height;
    drawSchedulePage(c.getContext("2d"), page, subtitle, i, pages.length, `產生於 ${when}`);
    return c;
  });
}
