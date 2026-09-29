"""One check: 2/3/4 wins to advance, and one known UTC → Taiwan clock."""

from bracket import apply_winners, series_winner, taiwan_clock, wins_needed

assert wins_needed("F") == 2
assert wins_needed("D") == 3
assert wins_needed("L") == 4
assert wins_needed("W") == 4

games = [
    {"seriesId": "F_1", "away": 145, "home": 117, "awayScore": 1, "homeScore": 5},
    {"seriesId": "F_1", "away": 145, "home": 117, "awayScore": 2, "homeScore": 8},
]
assert series_winner(games, "F_1", 2) == 117
assert series_winner(games[:1], "F_1", 2) is None

ds = [
    {"seriesId": "D_1", "away": 147, "home": 139, "awayScore": 3, "homeScore": 2},
    {"seriesId": "D_1", "away": 147, "home": 139, "awayScore": 4, "homeScore": 1},
    {"seriesId": "D_1", "away": 147, "home": 139, "awayScore": 5, "homeScore": 0},
]
assert series_winner(ds, "D_1", 3) == 147

# Clicked wins beat box scores, and a stale team downstream doesn't advance.
state = {"games": games, "wins": {"F_1": {"145": 2, "117": 1}, "D_2": {"117": 3}}}
apply_winners(state)
assert state["picks"]["F_1"] == 145
assert "D_2" not in state["picks"]
assert apply_winners({"games": games})["picks"]["F_1"] == 117
# No winner while the opponent is still undecided.
assert "W_1" not in apply_winners({"games": [], "wins": {"W_1": {"139": 4}}})["picks"]

assert taiwan_clock("2026-09-29T18:00:00Z") == "2026-09-30 02:00"
print("ok")
