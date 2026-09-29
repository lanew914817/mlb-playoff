// Checks the bracket rules in static/rules.js against the real bracket in bracket.py.
// node check_rules.js  →  ok
const assert = require("assert");
const { execSync } = require("child_process");
const { WINS, computeBracket, bumpRecord, laterRounds, compareBrackets } = require("./static/rules.js");

const { SERIES, TEAMS } = JSON.parse(execSync(
  `python3 -c "import json, bracket; print(json.dumps({'SERIES': bracket.SERIES, 'TEAMS': bracket.TEAMS}))"`,
  { cwd: __dirname },
));
const isTeam = (id) => id != null && TEAMS[id] != null;
const run = (st) => computeBracket(SERIES, { games: [], ...st }, isTeam);

// 2 / 3 / 4 wins to advance.
assert.deepStrictEqual(WINS, { F: 2, D: 3, L: 4, W: 4 });

// Box scores decide a Wild Card series; HOU (home) moves into the ALDS.
const games = [
  { seriesId: "F_1", away: 145, home: 117, awayScore: 1, homeScore: 5 },
  { seriesId: "F_1", away: 145, home: 117, awayScore: 2, homeScore: 8 },
];
let b = run({ games });
assert.strictEqual(b.F_1.winner, 117);
assert.strictEqual(b.D_2.away, 117);
assert.strictEqual(run({ games: games.slice(0, 1) }).F_1.winner, null);

// Clicked wins override box scores; a stale team downstream doesn't count.
b = run({ games, wins: { F_1: { 145: 2, 117: 1 }, D_2: { 117: 3 } } });
assert.strictEqual(b.F_1.winner, 145);
assert.strictEqual(b.D_2.away, 145);
assert.strictEqual(b.D_2.winner, null);

// No winner (and no record) until both teams are known.
b = run({ wins: { W_1: { 139: 4 } } });
assert.strictEqual(b.W_1.ready, false);
assert.strictEqual(b.W_1.winner, null);

// +1 / −1 stay legal: no win past the clinch, none below zero, none after the other side clinched.
b = run({ wins: { F_1: { 117: 1, 145: 0 } } });
assert.deepStrictEqual(bumpRecord(b.F_1, 117, 1), { 145: 0, 117: 2 });
assert.strictEqual(bumpRecord(b.F_1, 145, -1), null);
assert.strictEqual(bumpRecord(b.F_1, 111, 1), null);
b = run({ wins: { F_1: { 117: 2, 145: 1 } } });
assert.strictEqual(bumpRecord(b.F_1, 117, 1), null);
assert.strictEqual(bumpRecord(b.F_1, 145, 1), null);
assert.strictEqual(bumpRecord(run({}).D_2, 114, 1), null);

// Changing a Wild Card clears ALDS → ALCS → World Series.
assert.deepStrictEqual(laterRounds(SERIES, "F_1"), ["D_2", "L_1", "W_1"]);
assert.deepStrictEqual(laterRounds(SERIES, "W_1"), []);

// 猜中: only series the real games decided count; no prediction = miss.
const actual = run({ games });
assert.deepStrictEqual(compareBrackets(run({ wins: { F_1: { 117: 2, 145: 0 } } }), actual), { F_1: true });
assert.deepStrictEqual(compareBrackets(run({ wins: { F_1: { 145: 2, 117: 0 } } }), actual), { F_1: false });
assert.deepStrictEqual(compareBrackets(run({}), actual), { F_1: false });

console.log("ok");
