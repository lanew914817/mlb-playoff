"""MLB 2026 postseason poster. python3 server.py → http://127.0.0.1:8765 (LAN: http://<ip>:8765)"""

from __future__ import annotations

import json
import os
import posixpath
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import unquote
from urllib.request import Request, urlopen

from bracket import (
    SERIES,
    TEAMS,
    empty_state,
    merge_games,
    parse_mlb,
    FALLBACK_GAMES,
)

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
LOGOS = ROOT / "logos"
STATIC = ROOT / "static"
PORT = 8765
HOST = os.environ.get("HOST", "127.0.0.1")
LOOPBACK = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}
PROXY_HEADERS = ("Cf-Connecting-Ip", "Cf-Ray", "X-Forwarded-For", "Forwarded")
MLB_URL = "https://statsapi.mlb.com/api/v1/schedule/postseason/series?season=2026&sportId=1"
LOGO_URLS = [
    "https://midfield.mlbstatic.com/v1/team/{id}/spots/120",
    "https://www.mlbstatic.com/team-logos/{id}.svg",
]


def _read_json(path: Path, fallback):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return fallback


def _write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def _http_get(url: str, timeout=20):
    req = Request(url, headers={"User-Agent": "mlb-playoff-local/1"})
    with urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get("Content-Type", "")


def download_logos():
    LOGOS.mkdir(parents=True, exist_ok=True)
    for tid in TEAMS:
        if any(LOGOS.glob(f"{tid}.*")):
            continue
        for tmpl in LOGO_URLS:
            try:
                body, ct = _http_get(tmpl.format(id=tid), timeout=5)
            except (URLError, TimeoutError, OSError):
                continue
            if not body or len(body) < 80:
                continue
            ext = ".svg" if "svg" in ct or tmpl.endswith(".svg") else ".png"
            (LOGOS / f"{tid}{ext}").write_bytes(body)
            break


def fetch_mlb_games():
    body, _ = _http_get(MLB_URL)
    return parse_mlb(json.loads(body))


def load_schedule():
    path = DATA / "schedule.json"
    if path.exists():
        return _read_json(path, FALLBACK_GAMES)
    try:
        games = fetch_mlb_games()
        _write_json(path, games)
        return games
    except (URLError, TimeoutError, OSError, json.JSONDecodeError):
        _write_json(path, FALLBACK_GAMES)
        return list(FALLBACK_GAMES)


def load_state(mode: str):
    path = DATA / ("prediction.json" if mode == "prediction" else "actual.json")
    if not path.exists():
        sched = load_schedule()
        state = empty_state(sched)
        _write_json(path, state)
        return state
    return _read_json(path, empty_state())


def save_state(mode: str, state):
    path = DATA / ("prediction.json" if mode == "prediction" else "actual.json")
    _write_json(path, state)
    return state


def sync_actual():
    incoming = fetch_mlb_games()
    _write_json(DATA / "schedule.json", incoming)
    actual = load_state("actual")
    actual["games"] = merge_games(actual.get("games") or [], incoming, respect_manual=True)
    _write_json(DATA / "actual.json", actual)
    pred = load_state("prediction")
    pred["games"] = merge_games(pred.get("games") or [], incoming, respect_manual=False)
    _write_json(DATA / "prediction.json", pred)
    return actual


def payload(mode: str, can_edit: bool):
    return {
        "mode": mode,
        "canEdit": can_edit,
        "teams": TEAMS,
        "series": SERIES,
        "state": load_state(mode),
        "schedule": load_schedule(),
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _json(self, obj, code=200):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def _is_owner(self):
        """Only this machine may write; LAN and tunnel visitors are read-only on the server.
        A tunnel (cloudflared) connects from loopback, so forwarded headers mark a visitor."""
        if any(self.headers.get(h) for h in PROXY_HEADERS):
            return False
        return self.client_address[0] in LOOPBACK

    def do_GET(self):
        raw = self.path
        path = raw.split("?", 1)[0]
        qs = raw.split("?", 1)[1] if "?" in raw else ""
        if path == "/":
            self.path = "/static/index.html"
            return super().do_GET()
        if path == "/api/state":
            mode = "actual" if "actual" in qs else "prediction"
            return self._json(payload(mode, self._is_owner()))
        # Serve only page assets, never data/ or source files.
        clean = posixpath.normpath(unquote(path))
        if clean.startswith(("/static/", "/logos/")) and not path.endswith("/"):
            return super().do_GET()
        self.send_error(404)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if not self._is_owner():
            return self._json({"ok": False, "error": "read only"}, 403)
        try:
            if path == "/api/state":
                body = self._body()
                mode = body.get("mode") or "prediction"
                state = save_state(mode, body.get("state") or empty_state())
                return self._json({"ok": True, "state": state})
            if path == "/api/sync":
                state = sync_actual()
                return self._json({"ok": True, "state": state})
        except Exception as e:
            return self._json({"ok": False, "error": str(e)}, 500)
        self.send_error(404)

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def lan_ip():
    # UDP connect sends nothing; it just picks the outbound interface.
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    LOGOS.mkdir(parents=True, exist_ok=True)
    download_logos()
    load_schedule()
    load_state("prediction")
    load_state("actual")
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"本機（可編輯）: http://127.0.0.1:{PORT}", flush=True)
    if HOST != "127.0.0.1":
        print(f"同網路分享:     http://{lan_ip()}:{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
