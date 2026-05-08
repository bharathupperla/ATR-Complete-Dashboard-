"""
backend/main.py  — Signal Watch unified API
============================================
Combines the Portfolio Dashboard and Stock Signals backends into a single
FastAPI application listening on port 8006.

Endpoints
---------
GET /api/portfolio          Live portfolio metrics, YTD, ATR, holdings
GET /api/stocks?entries=... Per-stock ATR signals (BUY MORE / SQUARE OFF / NEUTRAL)
GET /health                 Liveness probe
GET /                       Service info
"""

from __future__ import annotations

import re
import math
import traceback
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import portfolio_compute
import compute

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Signal Watch API",
    description="Portfolio Dashboard + Stock Signals — ATR-based momentum system",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def sanitize(obj):
    """Recursively replace NaN / Inf so JSON serialisation never fails."""
    if isinstance(obj, float):
        return 0.0 if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


def parse_entries(raw: str, global_base: str) -> list[tuple[str, str]]:
    """
    Parse a mixed-format entries string into (ticker, date) pairs.

    Supported per-line formats
    --------------------------
    TICKER                      → uses global_base date
    TICKER YYYY-MM-DD           → space-separated
    TICKER:YYYY-MM-DD           → colon-separated

    Lines / entries may be separated by commas, newlines or semicolons.
    Duplicate tickers are silently de-duplicated (first occurrence wins).
    Maximum 60 entries returned.
    """
    parts = re.split(r"[,\n;]+", raw.strip())
    seen: dict[str, bool] = {}
    results: list[tuple[str, str]] = []

    for chunk in parts:
        chunk = chunk.strip()
        if not chunk:
            continue
        if ":" in chunk:
            tokens = chunk.split(":", 1)
        else:
            tokens = chunk.split()

        ticker = tokens[0].strip().upper()
        if not ticker or not ticker.isalpha() or len(ticker) > 10:
            continue

        entry_date = global_base
        if len(tokens) >= 2:
            candidate = tokens[1].strip()
            try:
                datetime.strptime(candidate, "%Y-%m-%d")
                entry_date = candidate
            except ValueError:
                pass

        if ticker not in seen:
            seen[ticker] = True
            results.append((ticker, entry_date))

    return results[:60]


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/portfolio")
async def get_portfolio():
    """
    Compute live portfolio signal, YTD return, ATR, and holdings.
    Downloads today's prices from yfinance on every call — always live.
    """
    try:
        data = portfolio_compute.compute_portfolio()
        return JSONResponse(content=data)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Compute failed: {exc}")


@app.get("/api/stocks")
async def get_stocks(
    entries: str = Query(..., description="Ticker list — see parse_entries() for accepted formats"),
    base_date: str = Query("2025-01-01", description="Global fallback entry date (YYYY-MM-DD)"),
):
    """
    Compute ATR-based signals for the requested tickers.

    Example
    -------
    /api/stocks?entries=PLTR:2025-03-01,APP&base_date=2025-01-01
    """
    try:
        datetime.strptime(base_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="base_date must be YYYY-MM-DD")

    entry_list = parse_entries(entries, base_date)
    if not entry_list:
        raise HTTPException(status_code=400, detail="No valid ticker entries provided")

    print(f"\n  Stocks request: {len(entry_list)} tickers | base={base_date}")
    print(f"  Entries: {entry_list}")

    try:
        stocks = compute.compute_all(entry_list)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Computation failed: {exc}")

    return JSONResponse(content=sanitize({
        "last_updated": datetime.now().isoformat(timespec="seconds"),
        "count": len(stocks),
        "stocks": stocks,
    }))


@app.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.get("/")
async def root():
    return {
        "service": "Signal Watch API",
        "version": "2.0.0",
        "endpoints": {
            "portfolio":  "GET /api/portfolio",
            "stocks":     "GET /api/stocks?entries=TICKER:YYYY-MM-DD,...&base_date=YYYY-MM-DD",
            "health":     "GET /health",
            "docs":       "GET /docs",
        },
    }
