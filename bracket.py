"""2026 MLB postseason bracket: teams, path, MLB schedule, Taiwan time.
Win/advance rules live in static/rules.js (tested by check_rules.js)."""

from datetime import datetime
from zoneinfo import ZoneInfo

TEAMS = {
    145: {"zh": "白襪", "en": "CWS"},
    117: {"zh": "太空人", "en": "HOU"},
    111: {"zh": "紅襪", "en": "BOS"},
    147: {"zh": "洋基", "en": "NYY"},
    114: {"zh": "守護者", "en": "CLE"},
    139: {"zh": "光芒", "en": "TB"},
    143: {"zh": "費城人", "en": "PHI"},
    144: {"zh": "勇士", "en": "ATL"},
    112: {"zh": "小熊", "en": "CHC"},
    135: {"zh": "教士", "en": "SD"},
    119: {"zh": "道奇", "en": "LAD"},
    158: {"zh": "釀酒人", "en": "MIL"},
}

# MLB placeholder clubs until a series is set (HOU/CWS, AL Higher Seed, …)
PLACEHOLDER_IDS = {
    2710, 2711, 5513, 5517, 5521, 5525, 5528, 5529, 5532, 5533,
}

SERIES = [
    {"id": "F_1", "gameType": "F", "zh": "美聯外卡", "league": "AL",
     "away": 145, "home": 117, "awaySeed": 6, "homeSeed": 3, "next": "D_2"},
    {"id": "F_2", "gameType": "F", "zh": "美聯外卡", "league": "AL",
     "away": 111, "home": 147, "awaySeed": 5, "homeSeed": 4, "next": "D_1"},
    {"id": "D_2", "gameType": "D", "zh": "美聯分區賽", "league": "AL",
     "away": None, "home": 114, "awaySeed": None, "homeSeed": 2, "next": "L_1", "from": "F_1"},
    {"id": "D_1", "gameType": "D", "zh": "美聯分區賽", "league": "AL",
     "away": None, "home": 139, "awaySeed": None, "homeSeed": 1, "next": "L_1", "from": "F_2"},
    {"id": "L_1", "gameType": "L", "zh": "美聯冠軍賽", "league": "AL",
     "away": None, "home": None, "next": "W_1", "from": ["D_2", "D_1"]},
    {"id": "F_3", "gameType": "F", "zh": "國聯外卡", "league": "NL",
     "away": 143, "home": 144, "awaySeed": 6, "homeSeed": 3, "next": "D_4"},
    {"id": "F_4", "gameType": "F", "zh": "國聯外卡", "league": "NL",
     "away": 112, "home": 135, "awaySeed": 5, "homeSeed": 4, "next": "D_3"},
    {"id": "D_4", "gameType": "D", "zh": "國聯分區賽", "league": "NL",
     "away": None, "home": 119, "awaySeed": None, "homeSeed": 2, "next": "L_2", "from": "F_3"},
    {"id": "D_3", "gameType": "D", "zh": "國聯分區賽", "league": "NL",
     "away": None, "home": 158, "awaySeed": None, "homeSeed": 1, "next": "L_2", "from": "F_4"},
    {"id": "L_2", "gameType": "L", "zh": "國聯冠軍賽", "league": "NL",
     "away": None, "home": None, "next": "W_1", "from": ["D_4", "D_3"]},
    {"id": "W_1", "gameType": "W", "zh": "世界大賽", "league": "WS",
     "away": None, "home": None, "next": None, "from": ["L_1", "L_2"]},
]

SERIES_BY_ID = {s["id"]: s for s in SERIES}
TW = ZoneInfo("Asia/Taipei")

# Real gamePks / UTC from statsapi (Wild Card only; later rounds come from sync).
FALLBACK_GAMES = [
    {"gamePk": 849849, "seriesId": "F_1", "gameType": "F", "gameNumber": 1,
     "away": 145, "home": 117, "gameDate": "2026-09-29T21:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "美聯外卡 G1"},
    {"gamePk": 849846, "seriesId": "F_1", "gameType": "F", "gameNumber": 2,
     "away": 145, "home": 117, "gameDate": "2026-09-30T21:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "美聯外卡 G2"},
    {"gamePk": 849850, "seriesId": "F_1", "gameType": "F", "gameNumber": 3,
     "away": 145, "home": 117, "gameDate": "2026-10-01T21:00:00Z",
     "ifNecessary": True, "startTimeTBD": False, "description": "美聯外卡 G3"},
    {"gamePk": 849851, "seriesId": "F_2", "gameType": "F", "gameNumber": 1,
     "away": 111, "home": 147, "gameDate": "2026-09-30T00:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "美聯外卡 G1"},
    {"gamePk": 849848, "seriesId": "F_2", "gameType": "F", "gameNumber": 2,
     "away": 111, "home": 147, "gameDate": "2026-10-01T00:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "美聯外卡 G2"},
    {"gamePk": 849847, "seriesId": "F_2", "gameType": "F", "gameNumber": 3,
     "away": 111, "home": 147, "gameDate": "2026-10-02T00:00:00Z",
     "ifNecessary": True, "startTimeTBD": False, "description": "美聯外卡 G3"},
    {"gamePk": 849845, "seriesId": "F_3", "gameType": "F", "gameNumber": 1,
     "away": 143, "home": 144, "gameDate": "2026-09-29T18:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "國聯外卡 G1"},
    {"gamePk": 849841, "seriesId": "F_3", "gameType": "F", "gameNumber": 2,
     "away": 143, "home": 144, "gameDate": "2026-09-30T18:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "國聯外卡 G2"},
    {"gamePk": 849844, "seriesId": "F_3", "gameType": "F", "gameNumber": 3,
     "away": 143, "home": 144, "gameDate": "2026-10-01T18:00:00Z",
     "ifNecessary": True, "startTimeTBD": False, "description": "國聯外卡 G3"},
    {"gamePk": 849843, "seriesId": "F_4", "gameType": "F", "gameNumber": 1,
     "away": 112, "home": 135, "gameDate": "2026-09-30T02:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "國聯外卡 G1"},
    {"gamePk": 849842, "seriesId": "F_4", "gameType": "F", "gameNumber": 2,
     "away": 112, "home": 135, "gameDate": "2026-10-01T02:00:00Z",
     "ifNecessary": False, "startTimeTBD": False, "description": "國聯外卡 G2"},
    {"gamePk": 849840, "seriesId": "F_4", "gameType": "F", "gameNumber": 3,
     "away": 112, "home": 135, "gameDate": "2026-10-02T02:00:00Z",
     "ifNecessary": True, "startTimeTBD": False, "description": "國聯外卡 G3"},
]


def taiwan_clock(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(TW)
    return dt.strftime("%Y-%m-%d %H:%M")


def is_real_team(tid) -> bool:
    return tid in TEAMS


def empty_game(g):
    return {
        **g,
        "awayScore": None,
        "homeScore": None,
        "status": "Preview",
        "manual": False,
        "officialAway": None,
        "officialHome": None,
    }


def empty_state(games=None):
    src = games if games is not None else FALLBACK_GAMES
    return {"wins": {}, "games": [empty_game(g) for g in src]}


def parse_mlb(payload):
    games = []
    for block in payload.get("series") or []:
        meta = block.get("series") or {}
        sid = meta.get("id")
        gtype = meta.get("gameType")
        for g in block.get("games") or []:
            away = g["teams"]["away"]
            home = g["teams"]["home"]
            st = g.get("status") or {}
            games.append({
                "gamePk": g["gamePk"],
                "seriesId": sid,
                "gameType": gtype,
                "gameNumber": g.get("seriesGameNumber") or 1,
                "away": away["team"]["id"],
                "home": home["team"]["id"],
                "awayScore": away.get("score"),
                "homeScore": home.get("score"),
                "status": st.get("abstractGameState") or "Preview",
                "ifNecessary": g.get("ifNecessary") == "Y",
                "startTimeTBD": bool(st.get("startTimeTBD")),
                "gameDate": g.get("gameDate"),
                "officialDate": g.get("officialDate"),
                "description": g.get("description") or g.get("seriesDescription") or sid,
                "manual": False,
                "officialAway": away.get("score"),
                "officialHome": home.get("score"),
            })
    return games


def merge_games(existing, incoming, respect_manual):
    old = {g["gamePk"]: g for g in existing}
    out = []
    for g in incoming:
        prev = old.get(g["gamePk"])
        row = dict(g)
        if respect_manual and prev and prev.get("manual"):
            row["awayScore"] = prev.get("awayScore")
            row["homeScore"] = prev.get("homeScore")
            row["manual"] = True
            row["officialAway"] = g.get("officialAway")
            row["officialHome"] = g.get("officialHome")
        elif not respect_manual and prev:
            row["awayScore"] = prev.get("awayScore")
            row["homeScore"] = prev.get("homeScore")
            row["manual"] = False
        else:
            if not is_real_team(row.get("away")):
                row["awayScore"] = None
            if not is_real_team(row.get("home")):
                row["homeScore"] = None
        out.append(row)
    return out
