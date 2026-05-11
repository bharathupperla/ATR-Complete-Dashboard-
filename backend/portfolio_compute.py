"""
portfolio_compute.py  v2
=========================
Portfolio-level momentum dashboard.

ATR Logic (correct):
    Every week, for the 20 stocks held that month:
        1W ATR% = mean of each stock's (5-day rolling TR / Close × 100)
        1M ATR% = mean of each stock's (23-day rolling TR / Close × 100)
    Rebalance happens 1st trading day each month — stocks switch, series continues.

YTD:
    Historical: hardcoded from Excel
    Live: (Realised PnL + Live Unrealised) / AVERAGE(all weekly investments) × 100
"""

from __future__ import annotations
import math, numpy as np, pandas as pd, yfinance as yf, warnings
from typing import Any
warnings.filterwarnings("ignore")

# ─── Monthly rebalance lists ──────────────────────────────────────────────────
REBALANCE_HISTORY = {
    "2025-08": {"date":"2025-08-01","tickers":["PLTR","APP","HOOD","GEV","VST","CVNA","TPR","AXON","NRG","DASH","FIX","LITE","IBKR","AVGO","CEG","RCL","JBL","HWM","VRT","CRWD"]},
    "2025-09": {"date":"2025-09-02","tickers":["APP","PLTR","HOOD","SATS","GEV","TPR","UAL","CVNA","LITE","VST","RCL","FIX","AXON","IBKR","DASH","AVGO","JBL","CCL","RL","NRG"]},
    "2025-10": {"date":"2025-10-01","tickers":["HOOD","APP","PLTR","SATS","LITE","WDC","CIEN","GEV","STX","TPR","CVNA","WBD","FIX","IBKR","HWM","AVGO","APH","GLW","DASH","COIN"]},
    "2025-11": {"date":"2025-11-03","tickers":["HOOD","PLTR","APP","WDC","LITE","SATS","CIEN","WBD","STX","FIX","MU","TPR","LRCX","APH","AVGO","HWM","NRG","GEV","IBKR","GLW"]},
    "2025-12": {"date":"2025-12-01","tickers":["LITE","HOOD","WDC","SATS","CIEN","STX","PLTR","MU","AVGO","WBD","NEM","LRCX","APH","FIX","APP","GOOGL","TPR","GOOG","KLAC","GLW"]},
    "2026-01": {"date":"2026-01-02","tickers":["SATS","LITE","WDC","MU","STX","HOOD","CIEN","NEM","WBD","LRCX","FIX","PLTR","GEV","COHR","KLAC","APH","TPR","INTC","GLW","HWM"]},
    "2026-02": {"date":"2026-02-03","tickers":["WDC","LITE","STX","MU","SATS","CIEN","LRCX","NEM","FIX","WBD","INTC","COHR","TER","HII","GLW","DG","GEV","APH","AMD","ALB"]},
    "2026-03": {"date":"2026-03-03","tickers":["SNDK","LITE","WDC","CIEN","MU","FIX","SATS","COHR","STX","GLW","LRCX","NEM","TER","VRT","HII","GEV","WBD","AMAT","ALB","PWR"]},
    "2026-04": {"date":"2026-04-01","tickers":["SNDK","LITE","WDC","CIEN","STX","SATS","FIX","MU","COHR","TER","VRT","GLW","LRCX","GEV","WBD","ALB","AMAT","NEM","KLAC","CAT"]},
    "2026-05": {"date":"2026-05-01","tickers":["ALB","FIX","GLW","LRCX","MU","NEM","SNDK","STX","TER","WBD","WDC","AMAT","CAT","CIEN","GEV","APA","COHR","LITE","SATS","VRT"]},
}

CURRENT_HOLDINGS = [
    {"ticker":"ALB",  "qty":59.8556,  "entry_price":167.8588135},
    {"ticker":"FIX",  "qty":8.9035,   "entry_price":1165.627001},
    {"ticker":"GLW",  "qty":100.8843, "entry_price":107.4887767},
    {"ticker":"LRCX", "qty":48.2449,  "entry_price":234.6747532},
    {"ticker":"MU",   "qty":27.7869,  "entry_price":421.1211038},
    {"ticker":"NEM",  "qty":92.757,   "entry_price":114.4259732},
    {"ticker":"SNDK", "qty":21.433,   "entry_price":615.0543554},
    {"ticker":"STX",  "qty":28.8837,  "entry_price":419.8641448},
    {"ticker":"TER",  "qty":38.2978,  "entry_price":264.2713158},
    {"ticker":"WBD",  "qty":391.4862, "entry_price":27.39164241},
    {"ticker":"WDC",  "qty":48.8028,  "entry_price":261.2733286},
    {"ticker":"AMAT", "qty":26.1384,  "entry_price":368.8209684},
    {"ticker":"CAT",  "qty":12.8049,  "entry_price":746.1440542},
    {"ticker":"CIEN", "qty":26.0,     "entry_price":356.115},
    {"ticker":"GEV",  "qty":11.6563,  "entry_price":883.8585143},
    {"ticker":"APA",  "qty":243.9746, "entry_price":41.06989006},
    {"ticker":"COHR", "qty":39.0,     "entry_price":254.48},
    {"ticker":"LITE", "qty":13.0,     "entry_price":774.44},
    {"ticker":"SATS", "qty":83.0,     "entry_price":120.8149398},
    {"ticker":"VRT",  "qty":38.0,     "entry_price":262.4},
]

WEEKLY_INVESTMENTS = [
    0,0,0,0,20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,
    26000,46000,46000,92000,46000,46000,46000,101251,101251,101251,104066.07,
    104066.07,103316.87,103316.87,103316.87,103316.87,432458.85,402002.05,
    402002.05,402002.05,500880.15,400474.77,400474.77,400474.77,504320.91,
    404038.54,406493.56,212579.21,212579.21,
]
REALISED_PNL = 50_845.0

HISTORICAL_YTD = [
    ("2025-07-04",0.00),("2025-07-11",0.00),("2025-07-18",0.00),("2025-07-25",0.00),
    ("2025-08-01",0.00),("2025-08-08",5.90),("2025-08-15",1.90),("2025-08-22",-0.60),
    ("2025-08-29",0.20),("2025-09-05",2.40),("2025-09-12",9.10),("2025-09-19",12.30),
    ("2025-09-26",8.80),("2025-10-03",10.20),("2025-10-10",5.60),("2025-10-17",8.40),
    ("2025-10-24",19.00),("2025-10-31",25.20),("2025-11-07",14.40),("2025-11-14",6.10),
    ("2025-11-21",-6.40),("2025-11-28",10.60),("2025-12-05",13.00),("2025-12-12",14.80),
    ("2025-12-19",19.20),("2025-12-26",22.90),("2026-01-02",19.90),("2026-01-09",36.70),
    ("2026-01-16",45.40),("2026-01-23",46.70),("2026-01-30",50.10),("2026-02-06",44.50),
    ("2026-02-13",49.40),("2026-02-20",54.00),("2026-02-27",49.90),("2026-03-06",-6.00),
    ("2026-03-13",12.20),("2026-03-20",25.10),("2026-03-27",8.10),("2026-04-03",23.10),
    ("2026-04-10",61.70),("2026-04-17",67.50),("2026-04-24",74.30),("2026-05-01",78.20),
]


def _fetch_prices(tickers: list, period: str = "1y") -> pd.DataFrame:
    """Download adjusted close prices for a list of tickers."""
    try:
        raw = yf.download(tickers, period=period, auto_adjust=True, progress=False, actions=False)
        if raw.empty:
            return pd.DataFrame()
        if isinstance(raw.columns, pd.MultiIndex):
            lvl0 = raw.columns.get_level_values(0).unique()
            close = raw["Close"] if "Close" in lvl0 else raw.xs("Close", level=1, axis=1)
        else:
            close = raw[["Close"]] if "Close" in raw.columns else raw
        close.index = pd.to_datetime(close.index).tz_localize(None)
        if isinstance(close, pd.Series):
            close = close.to_frame(name=tickers[0])
        return close.dropna(how="all")
    except Exception as e:
        print(f"  Fetch error: {e}")
        return pd.DataFrame()


def _atr_pct(series: pd.Series, window: int) -> float | None:
    """
    Stock-level ATR%:
        TR    = |Close - prev_Close|  (close-only approximation)
        ATR   = rolling mean(TR, window)
        ATR%  = ATR / Close × 100
    """
    s = series.dropna()
    if len(s) < window + 1:
        return None
    tr      = s.diff().abs()
    atr     = tr.rolling(window).mean()
    atr_pct = (atr / s * 100).dropna()
    if atr_pct.empty:
        return None
    return float(atr_pct.iloc[-1])


def _portfolio_atr_on_date(tickers: list, prices: pd.DataFrame,
                            as_of: pd.Timestamp, window: int) -> float | None:
    """Mean ATR% across all 20 stocks as of a given date (no look-ahead)."""
    avail = prices[prices.index <= as_of]
    if avail.empty or len(avail) < window + 1:
        return None
    vals = []
    for t in tickers:
        if t not in avail.columns:
            continue
        v = _atr_pct(avail[t], window)
        if v is not None and not math.isnan(v):
            vals.append(v)
    return round(float(np.mean(vals)), 3) if vals else None


def _get_tickers_for_date(dt: pd.Timestamp) -> list:
    """Return the 20 stocks held on a given date based on rebalance calendar."""
    sorted_months = sorted(REBALANCE_HISTORY.keys())
    for i, m in enumerate(sorted_months):
        start = pd.Timestamp(REBALANCE_HISTORY[m]["date"])
        end   = (pd.Timestamp(REBALANCE_HISTORY[sorted_months[i+1]]["date"])
                 if i + 1 < len(sorted_months) else pd.Timestamp("2099-01-01"))
        if start <= dt < end:
            return REBALANCE_HISTORY[m]["tickers"]
    return REBALANCE_HISTORY[sorted_months[-1]]["tickers"]


def _linear_regression(xs: list, ys: list) -> dict:
    xa, ya = np.array(xs, dtype=float), np.array(ys, dtype=float)
    v = ~np.isnan(ya)
    if v.sum() < 3:
        return {"slope":0.0,"angle":0.0,"r2":0.0,"fitted":[0.0]*len(xa)}
    xv, yv   = xa[v], ya[v]
    mx, my   = xv.mean(), yv.mean()
    sxy      = ((xv-mx)*(yv-my)).sum()
    sxx      = ((xv-mx)**2).sum()
    s        = sxy/sxx if sxx else 0.0
    ic       = my - s*mx
    yp       = s*xv + ic
    ss_res   = ((yv-yp)**2).sum()
    ss_tot   = ((yv-my)**2).sum()
    r2       = float(max(0.0, min(1.0, 1-ss_res/ss_tot))) if ss_tot else 1.0
    fitted   = [round(float(s*x+ic), 2) for x in xa]
    return {
        "slope": round(float(s),3),
        "angle": round(float(np.degrees(np.arctan(s))),2),
        "r2":    round(r2,3),
        "fitted":fitted,
    }


def sanitize(obj: Any) -> Any:
    if isinstance(obj, float):
        return 0.0 if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


def compute_portfolio() -> dict:
    today = pd.Timestamp.now().normalize()
    print(f"\n{'='*60}")
    print(f"  Portfolio compute  |  {today.strftime('%Y-%m-%d')}")
    print(f"{'='*60}")

    all_tickers = list({t for m in REBALANCE_HISTORY.values() for t in m["tickers"]})
    print(f"  Unique tickers across all periods: {len(all_tickers)}")

    print("  Downloading price history...")
    prices = _fetch_prices(all_tickers, period="1y")
    print(f"  Got {prices.shape[1]} tickers × {prices.shape[0]} days")

    # ── Live holdings P&L ─────────────────────────────────────────────────────
    print("\n  Computing live holdings...")
    stock_rows      = []
    live_unrealised = 0.0

    for h in CURRENT_HOLDINGS:
        t, ep, qt = h["ticker"], h["entry_price"], h["qty"]
        lp = None
        if t in prices.columns:
            s = prices[t].dropna()
            if not s.empty:
                lp = float(s.iloc[-1])
        if lp is None:
            lp = ep
        pnl     = (lp - ep) * qt
        ret_pct = (lp / ep - 1) * 100
        live_unrealised += pnl
        stock_rows.append({
            "ticker":       t,
            "entry_price":  round(ep, 4),
            "live_price":   round(lp, 4),
            "qty":          round(qt, 4),
            "cost":         round(ep * qt, 2),
            "market_value": round(lp * qt, 2),
            "pnl":          round(pnl, 2),
            "return_pct":   round(ret_pct, 2),
        })
        print(f"  {t:6s}  entry={ep:.2f}  live={lp:.2f}  pnl={pnl:+,.0f}  ret={ret_pct:+.1f}%")

    # ── Live YTD ─────────────────────────────────────────────────────────────
    current_cost    = sum(h["entry_price"] * h["qty"] for h in CURRENT_HOLDINGS)
    all_investments = WEEKLY_INVESTMENTS + [current_cost]
    live_avg_inv    = float(np.mean(all_investments))
    live_profit     = REALISED_PNL + live_unrealised
    live_ytd        = round(live_profit / live_avg_inv * 100, 2)
    last_ytd        = HISTORICAL_YTD[-1][1]
    week_change     = round(live_ytd - last_ytd, 2)

    print(f"\n  Live unrealised:  ${live_unrealised:,.2f}")
    print(f"  Live total P&L:   ${live_profit:,.2f}")
    print(f"  Avg investment:   ${live_avg_inv:,.2f}")
    print(f"  Live YTD:         {live_ytd:.2f}%  (change: {week_change:+.2f}%)")

    # ── Build weekly ATR series ───────────────────────────────────────────────
    print("\n  Building ATR series...")
    atr_series = []
    for date_str, ytd in HISTORICAL_YTD:
        dt      = pd.Timestamp(date_str)
        tickers = _get_tickers_for_date(dt)
        atr_1w  = _portfolio_atr_on_date(tickers, prices, dt, window=5)
        atr_1m  = _portfolio_atr_on_date(tickers, prices, dt, window=23)
        atr_series.append({"date": date_str, "atr_1w": atr_1w, "atr_1m": atr_1m})

    cur_tickers = [h["ticker"] for h in CURRENT_HOLDINGS]
    live_atr_1w = _portfolio_atr_on_date(cur_tickers, prices, today, window=5)
    live_atr_1m = _portfolio_atr_on_date(cur_tickers, prices, today, window=23)
    atr_series.append({"date": today.strftime("%Y-%m-%d"), "atr_1w": live_atr_1w, "atr_1m": live_atr_1m})

    # ── Full chart data ───────────────────────────────────────────────────────
    all_ytd   = [r for _, r in HISTORICAL_YTD] + [live_ytd]
    all_dates = [d for d, _ in HISTORICAL_YTD] + [today.strftime("%Y-%m-%d")]
    n         = len(all_ytd)
    reg       = _linear_regression(list(range(n)), all_ytd)

    chart_data = []
    for i, (date, ytd) in enumerate(zip(all_dates, all_ytd)):
        atr = atr_series[i] if i < len(atr_series) else {}
        chart_data.append({
            "date":    date,
            "label":   pd.Timestamp(date).strftime("%d %b"),
            "ytd":     round(ytd, 2),
            "fit":     reg["fitted"][i],
            "atr_1w":  atr.get("atr_1w"),
            "atr_1m":  atr.get("atr_1m"),
            "is_live": i == n - 1,
        })

    # ── Signal ────────────────────────────────────────────────────────────────
    prev_atr_1m = atr_series[-2].get("atr_1m") if len(atr_series) >= 2 else live_atr_1m
    return_rose = week_change > 0
    return_fell = week_change < 0
    atr_rising  = live_atr_1m is not None and prev_atr_1m is not None and live_atr_1m > prev_atr_1m
    atr_falling = live_atr_1m is not None and prev_atr_1m is not None and live_atr_1m < prev_atr_1m

    if return_rose and atr_falling:
        signal = "SQUARE OFF"
    elif return_fell and atr_rising:
        signal = "BUY MORE"
    else:
        signal = "NEUTRAL"

    print(f"\n  1W ATR: {live_atr_1w}%  |  1M ATR: {live_atr_1m}%")
    print(f"  Signal: {signal}")

    return sanitize({
        "as_of":              today.strftime("%Y-%m-%d"),
        "last_updated":       pd.Timestamp.now().isoformat(timespec="seconds"),
        "signal":             signal,
        "ytd_return":         live_ytd,
        "ytd_last_week":      last_ytd,
        "this_week_change":   week_change,
        "atr_1w":             live_atr_1w or 0.0,
        "atr_1m":             live_atr_1m or 0.0,
        "atr_1m_prev":        prev_atr_1m or 0.0,
        "atr_rising":         atr_rising,
        "return_rose":        return_rose,
        "slope":              reg["slope"],
        "angle":              reg["angle"],
        "r2":                 reg["r2"],
        "total_cost":         round(current_cost, 2),
        "total_market_value": round(sum(s["market_value"] for s in stock_rows), 2),
        "total_pnl":          round(sum(s["pnl"] for s in stock_rows), 2),
        "live_unrealised":    round(live_unrealised, 2),
        "realised_pnl":       REALISED_PNL,
        "live_profit":        round(live_profit, 2),
        "chart_data":         chart_data,
        "holdings":           sorted(stock_rows, key=lambda x: x["return_pct"], reverse=True),
        "n_weeks":            n,
    })
