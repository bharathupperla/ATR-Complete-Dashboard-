"""
Signal Watch — compute.py  (v5.0)
==================================
Signal logic:
    BUY MORE  : return fell AND atr > rolling p75 AND atr still rising
    SQUARE OFF: return rose  AND atr < rolling p25
    NEUTRAL   : everything else

Rolling window: 4 weeks (1 month) for p25/p75 band — no look-ahead.
Signal computed as of TODAY — weekly_dates always ends with today.
Per-stock entry dates — each stock anchored to its own entry date.
No caching — always computes fresh.
"""

import numpy as np
import pandas as pd
import yfinance as yf
import warnings
from typing import List, Dict, Any, Optional, Tuple

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
ATR_WINDOW     = 5   # 5 trading days = 1 week ATR
ROLLING_WINDOW = 4   # 4 weeks lookback for rolling p25/p75
MIN_WIN_POINTS = 2   # minimum points before percentiles computed


# ─────────────────────────────────────────────────────────────────────────────
# 1.  MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
def compute_all(entries: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
    """
    Process all (ticker, entry_date) pairs and return StockData dicts.
    Each stock is independent — weekly_dates run from its own entry_date to TODAY.
    """
    today = pd.Timestamp.now().normalize()

    print(f"\n{'='*65}")
    print(f"  compute_all: {len(entries)} stocks  |  as-of: {today.strftime('%Y-%m-%d')}")
    print(f"{'='*65}")

    results = []
    for ticker, entry_date_str in entries:
        print(f"  [{ticker}] entry={entry_date_str}", end=" ", flush=True)
        try:
            entry_ts = pd.Timestamp(entry_date_str)

            dl_start = (entry_ts - pd.DateOffset(years=1)).strftime("%Y-%m-%d")
            dl_end   = (today + pd.DateOffset(days=1)).strftime("%Y-%m-%d")

            last_fri = _last_friday(today)

            if last_fri >= entry_ts:
                weekly_dates = pd.date_range(
                    start=entry_date_str, end=last_fri, freq="W-FRI"
                )
            else:
                weekly_dates = pd.DatetimeIndex([entry_ts])

            if today not in weekly_dates:
                weekly_dates = weekly_dates.append(pd.DatetimeIndex([today]))

            if len(weekly_dates) == 0:
                weekly_dates = pd.DatetimeIndex([entry_ts])

            df = _download_ticker(ticker, dl_start, dl_end)
            if df is None or len(df) < 5:
                print("no data")
                results.append(_empty_stock(ticker, entry_date_str))
                continue

            stock_data = _compute_one_stock(
                ticker, df, entry_ts, weekly_dates, entry_date_str
            )
            print(
                f"ret={stock_data['return_since_base']:+.1f}%  "
                f"atr={stock_data['atr_1w_current']:.2f}%  "
                f"p25={stock_data['atr_p25']:.2f}  "
                f"p75={stock_data['atr_p75']:.2f}  "
                f"sig={stock_data['signal']}"
            )
            results.append(stock_data)

        except Exception as exc:
            import traceback
            traceback.print_exc()
            print(f"ERROR: {exc}")
            results.append(_empty_stock(ticker, entry_date_str))

    buy_list  = [s["ticker"] for s in results if s["signal"] == "BUY MORE"]
    sell_list = [s["ticker"] for s in results if s["signal"] == "SQUARE OFF"]
    print(f"\n  BUY MORE   ({len(buy_list)}):  {buy_list}")
    print(f"  SQUARE OFF ({len(sell_list)}): {sell_list}")
    print(f"  NEUTRAL    : {len(results) - len(buy_list) - len(sell_list)} stocks")

    return results


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DOWNLOAD
# ─────────────────────────────────────────────────────────────────────────────
def _download_ticker(ticker: str, start: str, end: str) -> Optional[pd.DataFrame]:
    """
    Download daily OHLC using yfinance Ticker.history().
    Returns DataFrame with [High, Low, Close] or None on failure.
    """
    try:
        t  = yf.Ticker(ticker)
        df = t.history(start=start, end=end, auto_adjust=True)

        if df is None or df.empty:
            print(f"    yfinance returned empty for {ticker} ({start} -> {end})")
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.rename(columns={c: c.strip().title() for c in df.columns})

        needed = {"High", "Low", "Close"}
        if not needed.issubset(set(df.columns)):
            print(f"    Missing columns for {ticker}: {df.columns.tolist()}")
            return None

        df = df[["High", "Low", "Close"]].dropna()
        df.index = pd.to_datetime(df.index).tz_localize(None)

        if len(df) < 5:
            print(f"    Too few rows for {ticker}: {len(df)}")
            return None

        return df

    except Exception as exc:
        print(f"    Download error for {ticker}: {exc}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 3.  PER-STOCK COMPUTATION
# ─────────────────────────────────────────────────────────────────────────────
def _compute_one_stock(
    ticker        : str,
    df            : pd.DataFrame,
    base_ts       : pd.Timestamp,
    weekly_dates  : pd.DatetimeIndex,
    entry_date_str: str,
) -> Dict[str, Any]:
    """Full metric computation for one stock, anchored to its own entry date."""

    atr_series = _compute_atr_pct(df, ATR_WINDOW)

    returns: List[float] = []
    atrs:    List[float] = []

    for wk in weekly_dates:
        returns.append(_get_weekly_return(df, base_ts, wk))
        atrs.append(_get_weekly_atr(atr_series, wk))

    n = len(returns)
    if n < 2:
        return _empty_stock(ticker, entry_date_str)

    signals, p25_track, p75_track = _classify_signals(returns, atrs)

    valid_atrs = [v for v in atrs if not np.isnan(v)]
    avg_atr    = round(float(np.nanmean(atrs)), 3) if valid_atrs else 0.0

    latest_p25 = p25_track[-1] if not np.isnan(p25_track[-1]) else (
        float(np.percentile(valid_atrs, 25)) if valid_atrs else 2.0)
    latest_p75 = p75_track[-1] if not np.isnan(p75_track[-1]) else (
        float(np.percentile(valid_atrs, 75)) if valid_atrs else 6.0)

    cur_atr = atrs[-1] if not np.isnan(atrs[-1]) else 0.0

    if   cur_atr < latest_p25: atr_position = "below_p25"
    elif cur_atr > latest_p75: atr_position = "above_p75"
    else:                      atr_position = "in_band"

    current_signal = signals[-1]

    this_week_return = round(returns[-1] - returns[-2], 2) if n >= 2 else 0.0
    prev_week_return = round(returns[-2] - returns[-3], 2) if n >= 3 else 0.0

    reg = _linear_regression(list(range(n)), returns)

    raw_13       = atrs[max(0, n - 13):]
    atr_hist_13w = [round(v, 3) if not np.isnan(v) else 0.0 for v in raw_13]
    while len(atr_hist_13w) < 13:
        atr_hist_13w.insert(0, atr_hist_13w[0] if atr_hist_13w else 0.0)

    return_history  = [round(v, 2) if not np.isnan(v) else 0.0 for v in returns]
    best_fit_line   = [round(v, 2) if not np.isnan(v) else 0.0 for v in reg["fitted"]]
    p25_history     = [round(v, 3) if not np.isnan(v) else 0.0 for v in p25_track]
    p75_history     = [round(v, 3) if not np.isnan(v) else 0.0 for v in p75_track]
    signals_history = signals

    buy_count  = signals.count("BUY MORE")
    sell_count = signals.count("SQUARE OFF")

    weeks_held = max(0, len(weekly_dates) - 1)

    return {
        "ticker":            ticker,
        "entry_date":        entry_date_str,
        "weeks_held":        weeks_held,
        "return_since_base": round(returns[-1], 2) if not np.isnan(returns[-1]) else 0.0,
        "this_week_return":  this_week_return,
        "prev_week_return":  prev_week_return,
        "atr_1w_current":    round(cur_atr, 3),
        "atr_p25":           round(latest_p25, 3),
        "atr_p75":           round(latest_p75, 3),
        "atr_position":      atr_position,
        "signal":            current_signal,
        "signal_is_live":    True,
        "slope":             reg["slope"],
        "angle":             reg["angle"],
        "r2":                reg["r2"],
        "atr_history_13w":   atr_hist_13w,
        "return_history":    return_history,
        "best_fit_line":     best_fit_line,
        "avg_atr":           avg_atr,
        "p25_history":       p25_history,
        "p75_history":       p75_history,
        "signals_history":   signals_history,
        "buy_count":         buy_count,
        "sell_count":        sell_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4.  ATR CALCULATION
# ─────────────────────────────────────────────────────────────────────────────
def _compute_atr_pct(df: pd.DataFrame, window: int = ATR_WINDOW) -> pd.Series:
    """ATR as % of closing price. True Range = max(H-L, |H-Cprev|, |L-Cprev|)."""
    h, l, c = df["High"], df["Low"], df["Close"]
    tr = pd.concat([
        h - l,
        (h - c.shift(1)).abs(),
        (l - c.shift(1)).abs(),
    ], axis=1).max(axis=1)
    atr = tr.rolling(window, min_periods=max(1, window // 2)).mean()
    return (atr / c * 100)


# ─────────────────────────────────────────────────────────────────────────────
# 5.  WEEKLY RETURN
# ─────────────────────────────────────────────────────────────────────────────
def _get_weekly_return(df: pd.DataFrame, base_date: pd.Timestamp, week_date: pd.Timestamp) -> float:
    """Cumulative % return from base_date close to week_date close."""
    base_rows = df[df.index <= base_date]["Close"]
    if base_rows.empty:
        return np.nan
    base_price = float(base_rows.iloc[-1])
    if base_price == 0:
        return np.nan
    week_rows = df[df.index <= week_date]["Close"]
    if week_rows.empty:
        return np.nan
    return round((float(week_rows.iloc[-1]) / base_price - 1) * 100, 3)


# ─────────────────────────────────────────────────────────────────────────────
# 6.  WEEKLY ATR
# ─────────────────────────────────────────────────────────────────────────────
def _get_weekly_atr(atr_series: pd.Series, week_date: pd.Timestamp) -> float:
    """Most recent ATR% on or before week_date."""
    sub = atr_series[atr_series.index <= week_date]
    return float(sub.iloc[-1]) if not sub.empty else np.nan


# ─────────────────────────────────────────────────────────────────────────────
# 7.  SIGNAL CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────
def _classify_signals(
    returns: List[float],
    atrs:    List[float],
) -> Tuple[List[str], List[float], List[float]]:
    """
    BUY MORE:   return fell AND atr > p75 AND atr still rising
    SQUARE OFF: return rose  AND atr < p25
    NEUTRAL:    everything else
    """
    n         = len(returns)
    signals   = ["NEUTRAL"] * n
    p25_track = [np.nan]    * n
    p75_track = [np.nan]    * n

    for i in range(1, n):
        rn = returns[i]
        rp = returns[i - 1]
        an = atrs[i]     if not np.isnan(atrs[i])     else np.nan
        ap = atrs[i - 1] if not np.isnan(atrs[i - 1]) else np.nan

        if np.isnan(rn) or np.isnan(rp) or np.isnan(an):
            continue

        win_start = max(0, i - ROLLING_WINDOW)
        window    = [v for v in atrs[win_start:i] if not np.isnan(v)]

        if len(window) < MIN_WIN_POINTS:
            continue

        p25 = float(np.percentile(window, 25))
        p75 = float(np.percentile(window, 75))

        p25_track[i] = round(p25, 3)
        p75_track[i] = round(p75, 3)

        r_falling  = rn < rp
        r_rising   = rn > rp
        atr_rising = (not np.isnan(ap)) and (an > ap)

        if r_falling and an > p75 and atr_rising:
            signals[i] = "BUY MORE"
        elif r_rising and an < p25:
            signals[i] = "SQUARE OFF"

    return signals, p25_track, p75_track


# ─────────────────────────────────────────────────────────────────────────────
# 8.  LINEAR REGRESSION
# ─────────────────────────────────────────────────────────────────────────────
def _linear_regression(xs: List[float], ys: List[float]) -> Dict[str, Any]:
    """OLS regression on weekly return series."""
    xa = np.array(xs, dtype=float)
    ya = np.array(ys, dtype=float)
    v  = ~np.isnan(ya)

    if v.sum() < 3:
        return {"slope": 0.0, "angle": 0.0, "r2": 0.0, "fitted": [0.0] * len(xa)}

    xv, yv = xa[v], ya[v]
    mx, my = xv.mean(), yv.mean()
    sxy = ((xv - mx) * (yv - my)).sum()
    sxx = ((xv - mx) ** 2).sum()
    s   = sxy / sxx if sxx != 0 else 0.0
    ic  = my - s * mx

    yp     = s * xv + ic
    ss_res = ((yv - yp) ** 2).sum()
    ss_tot = ((yv - my) ** 2).sum()
    r2     = float(max(0.0, min(1.0, 1 - ss_res / ss_tot))) if ss_tot else 1.0

    fitted = [round(float(s * x + ic), 2) for x in xa]
    return {
        "slope":  round(float(s), 3),
        "angle":  round(float(np.degrees(np.arctan(s))), 2),
        "r2":     round(r2, 3),
        "fitted": fitted,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9.  HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _last_friday(today: pd.Timestamp) -> pd.Timestamp:
    days_since = (today.weekday() - 4) % 7
    return today - pd.Timedelta(days=days_since)


def _empty_stock(ticker: str, entry_date: str = "2025-01-01") -> Dict[str, Any]:
    return {
        "ticker":            ticker,
        "entry_date":        entry_date,
        "weeks_held":        0,
        "return_since_base": 0.0,
        "this_week_return":  0.0,
        "prev_week_return":  0.0,
        "atr_1w_current":    0.0,
        "atr_p25":           0.0,
        "atr_p75":           0.0,
        "atr_position":      "in_band",
        "signal":            "NEUTRAL",
        "signal_is_live":    False,
        "slope":             0.0,
        "angle":             0.0,
        "r2":                0.0,
        "atr_history_13w":   [0.0] * 13,
        "return_history":    [0.0],
        "best_fit_line":     [0.0],
        "avg_atr":           0.0,
        "p25_history":       [0.0],
        "p75_history":       [0.0],
        "signals_history":   ["NEUTRAL"],
        "buy_count":         0,
        "sell_count":        0,
    }
