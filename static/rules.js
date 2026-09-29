// Bracket rules, the only copy: the page loads this file and check_rules.js tests it.
// Pure functions — no DOM, no globals.

const WINS = { F: 2, D: 3, L: 4, W: 4 };

function gameScoreWinner(g) {
  if (!g || g.awayScore == null || g.homeScore == null || g.awayScore === "" || g.homeScore === "") return null;
  const a = +g.awayScore, h = +g.homeScore;
  if (a === h) return null;
  return h > a ? g.home : g.away;
}

// Record of every series. `series` must list feeder series before the series they feed.
// Clicked wins (st.wins) override box-score counts; only teams currently in the series count,
// and a series has no winner until both teams are known.
function computeBracket(series, st, isTeam) {
  const out = {};
  const winnerOf = (sid) => (out[sid] ? out[sid].winner : null);
  for (const s of series) {
    let away = s.away, home = s.home;
    if (typeof s.from === "string") away = winnerOf(s.from);
    else if (Array.isArray(s.from)) {
      away = winnerOf(s.from[0]);
      home = winnerOf(s.from[1]);
    }
    const need = WINS[s.gameType];
    let src = (st.wins || {})[s.id];
    const manual = src != null;
    if (!manual) {
      src = {};
      for (const g of st.games || []) {
        if (g.seriesId !== s.id) continue;
        const w = gameScoreWinner(g);
        if (w != null) src[w] = (src[w] || 0) + 1;
      }
    }
    const ready = !!(isTeam(away) && isTeam(home));
    const a = ready ? Math.min(need, +src[away] || 0) : 0;
    const h = ready ? Math.min(need, +src[home] || 0) : 0;
    const winner = a >= need ? away : h >= need ? home : null;
    out[s.id] = { away, home, need, a, h, winner, manual, ready };
  }
  return out;
}

// The record after giving teamId +1 / −1 win, or null when that would be illegal.
function bumpRecord(r, teamId, delta) {
  if (!r.ready || (teamId !== r.away && teamId !== r.home)) return null;
  const mine = teamId === r.away ? r.a : r.h;
  const theirs = teamId === r.away ? r.h : r.a;
  const n = mine + delta;
  if (n < 0 || n > r.need || (delta > 0 && theirs >= r.need)) return null;
  return {
    [r.away]: teamId === r.away ? n : r.a,
    [r.home]: teamId === r.home ? n : r.h,
  };
}

// Series ids that follow sid on its path to the World Series.
function laterRounds(series, sid) {
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  const ids = [];
  for (let nx = byId[sid].next; nx; nx = byId[nx].next) ids.push(nx);
  return ids;
}

// Predicted vs actual for every series the real games have decided:
// true = predicted that winner; false = predicted someone else or nobody.
function compareBrackets(predicted, actual) {
  const out = {};
  for (const [sid, r] of Object.entries(actual)) {
    if (r.winner == null) continue;
    out[sid] = !!predicted[sid] && predicted[sid].winner === r.winner;
  }
  return out;
}

if (typeof module !== "undefined") {
  module.exports = { WINS, gameScoreWinner, computeBracket, bumpRecord, laterRounds, compareBrackets };
}
