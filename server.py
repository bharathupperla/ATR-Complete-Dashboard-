#!/usr/bin/env python3
"""
server.py — Signal Watch frontend server (port 5026)
=====================================================
Dynamically stitches the JSX source files into a complete HTML document on
every request.  Any change to a .jsx file is reflected on the next browser
refresh — no build step required.

Usage
-----
    python3 server.py
    # or via start.sh
"""
from __future__ import annotations

import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ROOT  = Path(__file__).parent
PORT  = 5026

# JSX files are concatenated in this order inside one <script type="text/babel">
JSX_ORDER = [
    "lib.jsx",
    "entry.jsx",
    "stock-dashboard.jsx",
    "portfolio-dashboard.jsx",
    "app.jsx",
]

# ─── HTML shell ───────────────────────────────────────────────────────────────
# The placeholder <!-- JSX_BUNDLE --> is replaced with the concatenated JSX.
_HTML_SHELL = """\
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Signal Watch — Quantitative Momentum Intelligence</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
<style>
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: #05080f;
    color: #e6edf7;
    font-family: 'Chakra Petch', system-ui, sans-serif;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
  }
  *, *::before, *::after { box-sizing: border-box; }
  ::selection { background: rgba(0, 229, 255, 0.35); color: #fff; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #050a14; }
  ::-webkit-scrollbar-thumb { background: #1a2d4a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #2c4673; }
  button { font-family: inherit; }
  textarea, input { font-family: 'Space Mono', monospace; }
</style>
</head>
<body>
<div id="root"></div>

<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
<script src="https://unpkg.com/recharts@2.12.7/umd/Recharts.js"></script>

<script type="text/babel" data-presets="env,react">
<!-- JSX_BUNDLE -->
</script>
</body>
</html>
"""


def _build_page() -> bytes:
    """Concatenate all JSX source files and inject them into the HTML shell."""
    parts: list[str] = []
    for fname in JSX_ORDER:
        fpath = ROOT / fname
        if fpath.exists():
            parts.append(f"// ─── {fname} {'─' * max(0, 50 - len(fname))}\n{fpath.read_text('utf-8')}")
        else:
            print(f"  [WARN] {fname} not found — skipping")
    bundle = "\n\n".join(parts)
    return _HTML_SHELL.replace("<!-- JSX_BUNDLE -->", bundle).encode("utf-8")


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = self.path.split("?")[0].rstrip("/")
        if path in ("", "/index.html"):
            body = _build_page()
            self._respond(200, "text/html; charset=utf-8", body)
        else:
            # Serve other static files (images, favicons, etc.) if present
            fpath = ROOT / path.lstrip("/")
            if fpath.is_file():
                ctype = _mime(fpath.suffix)
                self._respond(200, ctype, fpath.read_bytes())
            else:
                self._respond(404, "text/plain", b"Not found")

    def _respond(self, code: int, ct: str, body: bytes) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:  # silence access log
        pass


def _mime(ext: str) -> str:
    return {
        ".html": "text/html",
        ".js":   "application/javascript",
        ".jsx":  "application/javascript",
        ".css":  "text/css",
        ".png":  "image/png",
        ".svg":  "image/svg+xml",
        ".ico":  "image/x-icon",
    }.get(ext.lower(), "application/octet-stream")


if __name__ == "__main__":
    os.chdir(ROOT)
    server = HTTPServer(("0.0.0.0", PORT), _Handler)
    print(f"\n  ◆  Signal Watch — Frontend Server")
    print(f"  ▶  http://localhost:{PORT}")
    print(f"  ◇  Serving: {', '.join(JSX_ORDER)}")
    print(f"  ◇  Every browser refresh picks up .jsx changes\n")
    server.serve_forever()
