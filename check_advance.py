"""Python-side check: UTC → Taiwan clock, and manual scores survive an MLB sync.
Win/advance rules are checked by check_rules.js."""

from bracket import merge_games, taiwan_clock

assert taiwan_clock("2026-09-29T18:00:00Z") == "2026-09-30 02:00"

mine = [{"gamePk": 1, "away": 145, "home": 117, "awayScore": 9, "homeScore": 1, "manual": True}]
mlb = [{"gamePk": 1, "away": 145, "home": 117, "awayScore": 2, "homeScore": 3,
        "officialAway": 2, "officialHome": 3}]
row = merge_games(mine, mlb, respect_manual=True)[0]
assert (row["awayScore"], row["homeScore"], row["manual"]) == (9, 1, True)
assert (row["officialAway"], row["officialHome"]) == (2, 3)
print("ok")
