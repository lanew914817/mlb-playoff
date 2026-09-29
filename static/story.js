// 9:16 Stories image (1080×1920): AL on top, NL at the bottom, both advancing to the World
// Series in the middle. Uses the bracket state and drawing helpers from app.js.

const STORY_W = 1080, STORY_H = 1920;
const S_R = 50, S_RC = 74, S_SP = S_R + 26, S_CX = 540, S_K = 1.55;
const S_AL = { wc: 425, ds: 580, cs: 735, ch: 895 };
const S_WSY = 1040;
const S_NL = { ch: 1185, cs: 1345, ds: 1500, wc: 1655 };
const S_C4 = [120, 330, 750, 960], S_C2 = [225, 855];

// Pieces cut from the 1280×980 plate: [x, y, w, h].
const S_CROP = {
  title: [429, 26, 436, 126],
  wcL: [14, 182, 156, 34], alds: [175, 173, 160, 52], alcs: [352, 203, 156, 53],
  wcR: [1110, 182, 156, 34], nlds: [943, 173, 160, 53], nlcs: [772, 202, 156, 54],
  ws: [546, 203, 188, 118],
  trophy: [548, 412, 198, 294],
  marble: [0, 330, 540, 360],
};

const STORY_SLOTS = [
  ["F_1", "away", S_C4[0], S_AL.wc], ["F_1", "home", S_C4[1], S_AL.wc],
  ["F_2", "away", S_C4[2], S_AL.wc], ["F_2", "home", S_C4[3], S_AL.wc],
  ["D_2", "away", S_C4[0], S_AL.ds], ["D_2", "home", S_C4[1], S_AL.ds],
  ["D_1", "away", S_C4[2], S_AL.ds], ["D_1", "home", S_C4[3], S_AL.ds],
  ["L_1", "away", S_C2[0], S_AL.cs], ["L_1", "home", S_C2[1], S_AL.cs],
  ["W_1", "away", S_CX, S_AL.ch], ["W_1", "winner", S_CX, S_WSY], ["W_1", "home", S_CX, S_NL.ch],
  ["L_2", "away", S_C2[0], S_NL.cs], ["L_2", "home", S_C2[1], S_NL.cs],
  ["D_4", "away", S_C4[0], S_NL.ds], ["D_4", "home", S_C4[1], S_NL.ds],
  ["D_3", "away", S_C4[2], S_NL.ds], ["D_3", "home", S_C4[3], S_NL.ds],
  ["F_3", "away", S_C4[0], S_NL.wc], ["F_3", "home", S_C4[1], S_NL.wc],
  ["F_4", "away", S_C4[2], S_NL.wc], ["F_4", "home", S_C4[3], S_NL.wc],
].map(([id, side, x, y]) => ({ id, side, x, y }));

const storySlot = (id, side) => STORY_SLOTS.find((s) => s.id === id && s.side === side);
const storyR = (slot) => (slot.side === "winner" ? S_RC : S_R);

function storySegs() {
  const segs = [];
  const add = (x1, y1, x2, y2) => segs.push([x1, y1, x2, y2]);
  // Two slots side by side feed a slot below (dir 1, AL) or above (dir −1, NL).
  const pair = (id, to, dir) => {
    const [a, b] = STORY_SLOTS.filter((s) => s.id === id && s.side !== "winner").sort((p, q) => p.x - q.x);
    const bar = a.y + dir * S_SP, mid = (a.x + b.x) / 2, ty = to.y - dir * storyR(to);
    add(a.x, a.y + dir * S_R, a.x, bar);
    add(b.x, b.y + dir * S_R, b.x, bar);
    add(a.x, bar, b.x, bar);
    if (Math.abs(to.x - mid) < 3) add(mid, bar, mid, ty);
    else {
      const elbow = bar + dir * Math.max(14, Math.abs(ty - bar) * 0.45);
      add(mid, bar, mid, elbow);
      add(mid, elbow, to.x, elbow);
      add(to.x, elbow, to.x, ty);
    }
  };
  pair("F_1", storySlot("D_2", "away"), 1);
  pair("F_2", storySlot("D_1", "away"), 1);
  pair("D_2", storySlot("L_1", "away"), 1);
  pair("D_1", storySlot("L_1", "home"), 1);
  pair("L_1", storySlot("W_1", "away"), 1);
  pair("F_3", storySlot("D_4", "away"), -1);
  pair("F_4", storySlot("D_3", "away"), -1);
  pair("D_4", storySlot("L_2", "away"), -1);
  pair("D_3", storySlot("L_2", "home"), -1);
  pair("L_2", storySlot("W_1", "home"), -1);
  add(S_CX, S_AL.ch + S_R, S_CX, S_WSY - S_RC);
  add(S_CX, S_WSY + S_RC, S_CX, S_NL.ch - S_R);
  return segs;
}

// A plate crop lightened onto the dark background; `feather` fades its edges out.
function storyCrop(ctx, plate, key, cx, cy, h, feather = 0) {
  const [sx, sy, sw, sh] = S_CROP[key];
  const w = sw * h / sh;
  const off = document.createElement("canvas");
  off.width = Math.ceil(w);
  off.height = Math.ceil(h);
  const o = off.getContext("2d");
  o.drawImage(plate, sx, sy, sw, sh, 0, 0, w, h);
  if (feather) {
    o.globalCompositeOperation = "destination-in";
    const g = o.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * feather);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g;
    o.fillRect(0, 0, w, h);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighten";
  ctx.drawImage(off, cx - w / 2, cy - h / 2);
  ctx.restore();
}

// Mirrored tiles of clean marble from the plate, darkened toward the top and bottom.
function storyBackground(ctx, plate, height = STORY_H) {
  const [mx, my, mw, mh] = S_CROP.marble;
  for (let row = 0; row * mh < height; row++) {
    for (let col = 0; col * mw < STORY_W; col++) {
      ctx.save();
      ctx.translate(col * mw + (col % 2 ? mw : 0), row * mh + (row % 2 ? mh : 0));
      ctx.scale(col % 2 ? -1 : 1, row % 2 ? -1 : 1);
      ctx.drawImage(plate, mx, my, mw, mh, 0, 0, mw, mh);
      ctx.restore();
    }
  }
  const v = ctx.createLinearGradient(0, 0, 0, height);
  v.addColorStop(0, "rgba(2,8,22,.75)");
  v.addColorStop(0.2, "rgba(2,8,22,.25)");
  v.addColorStop(0.5, "rgba(2,8,22,.1)");
  v.addColorStop(0.8, "rgba(2,8,22,.25)");
  v.addColorStop(1, "rgba(2,8,22,.8)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, STORY_W, height);
}

function drawStory(ctx) {
  const plate = cachedImg(BG_SRC);
  ctx.textBaseline = "middle";
  if (ready(plate)) {
    storyBackground(ctx, plate);
    storyCrop(ctx, plate, "title", S_CX, 285, 140);
    drawMlbLogo(ctx, S_CX - 55, 146, 110);
    storyCrop(ctx, plate, "wcL", S_CX, S_AL.wc, 30);
    storyCrop(ctx, plate, "alds", S_CX, S_AL.ds, 40);
    storyCrop(ctx, plate, "alcs", S_CX, S_AL.cs - 6, 40);
    storyCrop(ctx, plate, "nlcs", S_CX, S_NL.cs + 6, 40);
    storyCrop(ctx, plate, "nlds", S_CX, S_NL.ds, 40);
    storyCrop(ctx, plate, "wcR", S_CX, S_NL.wc, 30);
    storyCrop(ctx, plate, "trophy", 230, S_WSY, 330, 0.62);
    storyCrop(ctx, plate, "ws", 850, S_WSY, 116, 0.75);
  } else {
    ctx.fillStyle = "#06122a";
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  for (const [x1, y1, x2, y2] of storySegs()) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (const slot of STORY_SLOTS) {
    const teamId = slotTeam(slot);
    const hot = real(teamId) && pickOf(slot.id) === teamId;
    const out = eliminated(slot, teamId);
    const r = storyR(slot);
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(2, 10, 24, .7)";
    ctx.fill();
    if (real(teamId)) {
      const img = cachedImg(logoSrc(teamId));
      if (ready(img)) {
        const d = r * 2 - 8;
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
    ctx.lineWidth = slot.side === "winner" ? 5.5 : hot ? 5 : 3.4;
    ctx.strokeStyle = hot || slot.side === "winner" ? GOLD_HI : out ? GOLD_DIM : GOLD;
    ctx.stroke();
  }

  for (const slot of STORY_SLOTS) {
    const seed = slotSeed(slot);
    if (seed == null || !real(slotTeam(slot))) continue;
    scaledAt(ctx, slot.x + S_R * 0.74, slot.y - S_R * 0.74, S_K, () => drawSeed(ctx, 0, 0, seed));
  }

  // Side-by-side pairs read left:right on their bar; the World Series reads AL over NL.
  for (const s of series) {
    const r = recordOf(s.id);
    if (!r.a && !r.h) continue;
    if (s.id === "W_1") {
      scaledAt(ctx, S_CX + S_RC + 34, S_WSY, S_K, () => recordBox(ctx, 0, 0, r.a, r.h, true));
      continue;
    }
    const [a, b] = STORY_SLOTS.filter((x) => x.id === s.id).sort((p, q) => p.x - q.x);
    const dir = a.y < S_WSY ? 1 : -1;
    scaledAt(ctx, (a.x + b.x) / 2, a.y + dir * S_SP, S_K, () => recordBox(ctx, 0, 0, r.a, r.h, false));
  }

  for (const [text, y] of [["AL CHAMPION", S_AL.ch], ["NL CHAMPION", S_NL.ch]]) {
    ctx.font = `700 21px ${SERIF}`;
    const w = spacedWidth(ctx, text, 4);
    const x = S_CX + S_R + 26 + w / 2;
    ctx.save();
    ctx.shadowColor = "rgba(2, 8, 20, .95)";
    ctx.shadowBlur = 8;
    const g = ctx.createLinearGradient(0, y - 12, 0, y + 12);
    g.addColorStop(0, "#fff3cf");
    g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    spacedText(ctx, text, x, y + 1, 4);
    ctx.restore();
    goldRule(ctx, x, y - 20, w / 2 + 12, 1.4);
    goldRule(ctx, x, y + 20, w / 2 + 12, 1.4);
  }

  if (showHits) {
    const h = hits();
    const ids = Object.keys(h);
    for (const sid of ids) {
      if (pickOf(sid) == null) continue;
      const slot = advancedSlot(sid, storySlot);
      const r = storyR(slot);
      scaledAt(ctx, slot.x + r * 0.74, slot.y + r * 0.74, S_K, () => drawMark(ctx, 0, 0, h[sid]));
    }
    if (ids.length) {
      const got = ids.filter((sid) => h[sid]).length;
      ctx.font = `700 19px ${SERIF}`;
      ctx.fillStyle = CREAM;
      ctx.textBaseline = "middle";
      const w = spacedText(ctx, `CORRECT PICKS  ${got} / ${ids.length}`, 850, S_WSY + 82, 3);
      goldRule(ctx, 850, S_WSY + 66, w / 2 + 8, 1.2);
    }
  }
}
