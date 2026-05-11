// lib.jsx — shared hooks, helpers, palette, API config, data transforms
const API_BASE = 'http://localhost:8006';

const { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } = React;

// =============================================================
// PALETTE
// =============================================================
const PALETTE = {
  bg: '#05080f',
  surface: '#0b1322',
  surfaceHi: '#121b2e',
  border: '#1d2a44',
  borderHi: '#2a3a5a',
  text: '#e6edf7',
  textDim: '#8b99b5',
  textMute: '#4e5e7d',
  bullish: '#2dd49b',
  bearish: '#f25068',
  neutral: '#8c7df0',
  amber: '#e8a23a',
  cyan: '#3fbdf2',
};

const SIGNAL_META = {
  'BUY MORE':   { color: PALETTE.bullish, label: 'BUY MORE',   short: 'BUY'  },
  'SQUARE OFF': { color: PALETTE.bearish, label: 'SQUARE OFF', short: 'EXIT' },
  'NEUTRAL':    { color: PALETTE.neutral, label: 'NEUTRAL',    short: 'HOLD' },
};

// =============================================================
// GLOBAL ANIMATIONS — injected once
// =============================================================
function injectGlobalStyles() {
  if (document.getElementById('sw-global-anim')) return;
  const s = document.createElement('style');
  s.id = 'sw-global-anim';
  s.textContent = `
@keyframes sw-pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 var(--c, #2dd49b); }
  50%      { transform: scale(1.15); opacity: .85; box-shadow: 0 0 0 6px rgba(0,0,0,0); }
}
@keyframes sw-breathe {
  0%, 100% { box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.16),
      inset 0 -1px 0 rgba(0,0,0,0.55),
      inset 0 0 0 1px rgba(255,255,255,0.04),
      0 0 12px var(--g, rgba(45,212,155,0.35));
  }
  50%      { box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.22),
      inset 0 -1px 0 rgba(0,0,0,0.55),
      inset 0 0 0 1px rgba(255,255,255,0.06),
      0 0 22px var(--g2, rgba(45,212,155,0.65));
  }
}
@keyframes sw-scanline {
  0%   { transform: translateY(100%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-200%); opacity: 0; }
}
@keyframes sw-grid-shift {
  0%   { background-position: 0 0; }
  100% { background-position: 0 60px; }
}
@keyframes sw-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes sw-card-in {
  0%   { opacity: 0; transform: perspective(900px) rotateX(12deg) translateY(28px); }
  100% { opacity: 1; transform: perspective(900px) rotateX(4deg) translateY(0); }
}
@keyframes sw-spring-up {
  0%   { opacity: 0; transform: translateY(40px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes sw-drawer-right {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
@keyframes sw-drawer-bottom {
  0%   { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
@keyframes sw-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes sw-draw {
  0%   { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
}
@keyframes sw-glow-text {
  0%, 100% { filter: drop-shadow(0 0 18px rgba(63,189,242,0.35)) drop-shadow(0 0 60px rgba(45,212,155,0.18)); }
  50%      { filter: drop-shadow(0 0 28px rgba(63,189,242,0.55)) drop-shadow(0 0 80px rgba(232,162,58,0.22)); }
}
.sw-shimmer {
  background: linear-gradient(90deg, #0b1322 0%, #162038 50%, #0b1322 100%);
  background-size: 200% 100%;
  animation: sw-shimmer 1.6s linear infinite;
}
`;
  document.head.appendChild(s);
}

// =============================================================
// HOOKS
// =============================================================

function useCountUp(target, duration = 1100, deps = []) {
  const [v, setV] = useState(0);
  const startRef = useRef(0);
  const fromRef  = useRef(0);
  useEffect(() => {
    fromRef.current = 0;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (t) => {
      const k = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(fromRef.current + (target - fromRef.current) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [target, duration, ...deps]);
  return v;
}

function useCardTilt({ max = 9, lift = 14, baseX = 4 } = {}) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const [t, setT] = useState({ rx: baseX, ry: 0, mx: 50, my: 50 });

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    const ry = (cx - 0.5) * (max * 2);
    const rx = baseX + (0.5 - cy) * (max * 2);
    setT({ rx, ry, mx: cx * 100, my: cy * 100 });
  }, [max, baseX]);

  const onEnter = useCallback(() => setHover(true), []);
  const onLeave = useCallback(() => { setHover(false); setT({ rx: baseX, ry: 0, mx: 50, my: 50 }); }, [baseX]);

  const style = {
    transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(0) translateY(${hover ? -lift : 0}px)`,
    transition: hover ? 'transform 90ms linear, box-shadow 200ms ease' : 'transform 380ms cubic-bezier(.2,.8,.2,1), box-shadow 380ms ease',
    willChange: 'transform',
  };

  const handlers = { onMouseMove: onMove, onMouseEnter: onEnter, onMouseLeave: onLeave };
  return { ref, style, handlers, hover, mx: t.mx, my: t.my };
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = (e) => setMatch(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}

// =============================================================
// FORMATTERS
// =============================================================
const fmtPct  = (x, d = 2) => `${x >= 0 ? '+' : ''}${(x).toFixed(d)}%`;
const fmtUsd  = (x, d = 2) => `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const fmtNum  = (x, d = 2) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour12: false }) + ' UTC' + (d.getTimezoneOffset() <= 0 ? '+' : '-') + Math.abs(d.getTimezoneOffset() / 60).toString().padStart(2, '0');
const fmtDate = (s) => {
  const d = (s instanceof Date) ? s : new Date(s);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
};

// =============================================================
// API DATA TRANSFORMS
// Maps backend snake_case shapes → frontend camelCase shapes expected by components
// =============================================================

/**
 * Transform /api/stocks response array into frontend StockCard-compatible objects.
 */
function transformStocksData(apiStocks) {
  return (apiStocks || []).map(s => ({
    ticker:       s.ticker,
    name:         s.ticker,
    signal:       s.signal        || 'NEUTRAL',
    entryDate:    s.entry_date    || '',
    weeksHeld:    s.weeks_held    || 0,
    returnPct:    s.return_since_base || 0,
    weekDelta:    s.this_week_return  || 0,
    prevWeekDelta: s.prev_week_return || 0,
    atr: {
      current: s.atr_1w_current || 0,
      p25:     s.atr_p25        || 0,
      p75:     s.atr_p75        || 0,
      history: s.atr_history_13w || Array(13).fill(0),
    },
    trend: {
      slope: s.slope || 0,
      angle: s.angle || 0,
      r2:    s.r2    || 0,
    },
    returnHistory: s.return_history  || [0],
    bestFitLine:   s.best_fit_line   || [],
    livePrice:     0,
  }));
}

/**
 * Transform /api/portfolio response into frontend PortfolioDashboard-compatible object.
 * Computes derived metrics (sharpe, drawdown, win-rate, volatility) from chart_data.
 */
function transformPortfolioData(api) {
  // Holdings
  const holdings = (api.holdings || []).map(h => ({
    ticker:    h.ticker,
    qty:       h.qty,
    entry:     h.entry_price,
    live:      h.live_price,
    invested:  h.cost,
    market:    h.market_value,
    pnl:       h.pnl,
    returnPct: h.return_pct,
  }));

  // Weekly return + ATR series from chart_data
  const chartData    = api.chart_data || [];
  const returnHistory = chartData.map((d, i) => ({
    week: d.label || `W${i + 1}`,
    idx:  i,
    ret:  typeof d.ytd === 'number' ? d.ytd : 0,
  }));
  const atrHistory = chartData.map(d => ({
    week:  d.label || '',
    atr1W: d.atr_1w || 0,
    atr1M: d.atr_1m || 0,
  }));

  // Derived metrics from weekly returns
  const rets          = returnHistory.map(d => d.ret);
  const weeklyDeltas  = rets.length > 1 ? rets.slice(1).map((r, i) => r - rets[i]) : [];
  const nc            = weeklyDeltas.length;

  let mean = 0, std = 1, sharpe = 0, maxDD = 0;
  if (nc > 0) {
    mean   = weeklyDeltas.reduce((s, x) => s + x, 0) / nc;
    const variance = weeklyDeltas.reduce((s, x) => s + (x - mean) ** 2, 0) / nc;
    std    = Math.sqrt(variance) || 1;
    sharpe = +(mean / std).toFixed(2);
  }
  let peak = -Infinity;
  for (const r of rets) {
    if (r > peak) peak = r;
    const dd = r - peak;
    if (dd < maxDD) maxDD = dd;
  }
  const winRate  = nc > 0 ? Math.round((weeklyDeltas.filter(x => x > 0).length / nc) * 100) : 0;
  const bestIdx  = nc > 0 ? weeklyDeltas.reduce((bi, v, i) => v > weeklyDeltas[bi] ? i : bi, 0) : 0;
  const worstIdx = nc > 0 ? weeklyDeltas.reduce((wi, v, i) => v < weeklyDeltas[wi] ? i : wi, 0) : 0;

  return {
    holdings,
    realizedPnl: api.realised_pnl        || 0,
    signal:      api.signal               || 'NEUTRAL',
    ytdReturn:   api.ytd_return           || 0,
    totalPnl:    api.live_profit          || 0,
    invested:    api.total_cost           || 0,
    market:      api.total_market_value   || 0,
    atr1W:       api.atr_1w              || 0,
    atr1M:       api.atr_1m              || 0,
    atrHistory,
    returnHistory,
    trend: {
      slope: api.slope || 0,
      angle: api.angle || 0,
      r2:    api.r2    || 0,
    },
    metrics: {
      bestWeek:    { week: returnHistory[bestIdx + 1]?.week  || 'W2', value: +(weeklyDeltas[bestIdx]  || 0).toFixed(2) },
      worstWeek:   { week: returnHistory[worstIdx + 1]?.week || 'W2', value: +(weeklyDeltas[worstIdx] || 0).toFixed(2) },
      sharpe,
      maxDrawdown: +maxDD.toFixed(2),
      winRate,
      volatility:  +(std * Math.sqrt(52)).toFixed(1),
    },
  };
}

// =============================================================
// MOCK DATA (fallback / dev mode)
// =============================================================
function _genHistory(seed, weeks, base, vol, drift) {
  let x = seed;
  const r = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const arr = [];
  let v = base;
  for (let i = 0; i < weeks; i++) {
    v = Math.max(0.4, v + (r() - 0.5) * vol + drift);
    arr.push(+v.toFixed(3));
  }
  return arr;
}

function _genReturnSeries(seed, weeks, totalReturn) {
  let x = seed;
  const r = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const arr = [];
  for (let i = 0; i < weeks; i++) {
    const target = (totalReturn / (weeks - 1)) * i;
    arr.push(+(target + (r() - 0.5) * 4.2).toFixed(2));
  }
  arr[arr.length - 1] = totalReturn;
  return arr;
}

const STOCKS = [
  { ticker:'ALB',  signal:'BUY MORE',   entryDate:'2024-08-15', returnPct: 33.78, weekDelta: 2.41, prevWeekDelta: 1.18, atr:{ current:4.82, p25:3.10, p75:5.40, history:_genHistory(11,13,4.0,0.55,0.06) }, trend:{ slope:2.41, angle:23.6, r2:0.87 } },
  { ticker:'LRCX', signal:'SQUARE OFF', entryDate:'2024-11-04', returnPct: 17.06, weekDelta:-1.95, prevWeekDelta:-0.82, atr:{ current:2.18, p25:2.40, p75:4.20, history:_genHistory(22,13,3.6,0.45,-0.12) }, trend:{ slope:0.84, angle:9.1, r2:0.41 } },
  { ticker:'GLW',  signal:'SQUARE OFF', entryDate:'2025-01-12', returnPct: 13.84, weekDelta:-0.62, prevWeekDelta:-1.04, atr:{ current:1.12, p25:1.55, p75:2.80, history:_genHistory(7,13,2.2,0.32,-0.09) }, trend:{ slope:0.51, angle:5.4, r2:0.32 } },
  { ticker:'FIX',  signal:'BUY MORE',   entryDate:'2024-06-21', returnPct: 52.88, weekDelta: 3.18, prevWeekDelta: 2.06, atr:{ current:38.20, p25:22.50, p75:36.10, history:_genHistory(31,13,28,3.1,0.85) }, trend:{ slope:3.92, angle:31.7, r2:0.92 } },
  { ticker:'NVDA', signal:'BUY MORE',   entryDate:'2024-04-08', returnPct: 59.55, weekDelta: 4.02, prevWeekDelta: 3.41, atr:{ current:6.48, p25:4.10, p75:6.20, history:_genHistory(13,13,4.6,0.62,0.18) }, trend:{ slope:4.55, angle:35.2, r2:0.94 } },
  { ticker:'TSLA', signal:'SQUARE OFF', entryDate:'2024-09-30', returnPct:-15.02, weekDelta:-3.40, prevWeekDelta:-2.85, atr:{ current:9.12, p25:5.40, p75:8.80, history:_genHistory(41,13,7.4,1.1,0.05) }, trend:{ slope:-1.85, angle:-16.8, r2:0.61 } },
  { ticker:'AAPL', signal:'NEUTRAL',    entryDate:'2025-02-14', returnPct:  2.98, weekDelta: 0.21, prevWeekDelta:-0.15, atr:{ current:3.20, p25:2.80, p75:4.10, history:_genHistory(53,13,3.4,0.30,-0.01) }, trend:{ slope:0.18, angle:1.8, r2:0.12 } },
  { ticker:'MSFT', signal:'NEUTRAL',    entryDate:'2025-01-28', returnPct:  2.98, weekDelta: 0.45, prevWeekDelta: 0.62, atr:{ current:5.60, p25:4.90, p75:6.80, history:_genHistory(67,13,5.7,0.44,0.01) }, trend:{ slope:0.32, angle:3.1, r2:0.18 } },
];
STOCKS.forEach((s, i) => {
  s.name       = s.ticker;
  s.livePrice  = 0;
  s.weeksHeld  = Math.max(1, Math.round((Date.now() - new Date(s.entryDate).getTime()) / (7 * 86400000)));
  s.returnHistory = _genReturnSeries(i * 7 + 1, Math.min(s.weeksHeld, 26), s.returnPct);
});

const _PORTFOLIO_HOLDINGS_MOCK = [
  { ticker:'ALB',  qty:59.85,  entry:167.86,  live:224.58 },
  { ticker:'FIX',  qty:8.90,   entry:1165.63, live:1782.04 },
  { ticker:'LRCX', qty:142.5,  entry:78.10,   live:91.42 },
  { ticker:'GLW',  qty:308.0,  entry:41.55,   live:47.30 },
  { ticker:'TSLA', qty:64.20,  entry:248.50,  live:211.18 },
  { ticker:'AAPL', qty:70.10,  entry:226.10,  live:232.84 },
  { ticker:'MSFT', qty:38.40,  entry:414.20,  live:426.55 },
  { ticker:'AMD',  qty:95.00,  entry:138.40,  live:162.18 },
  { ticker:'AVGO', qty:22.50,  entry:1410.20, live:1602.40 },
  { ticker:'CRM',  qty:48.00,  entry:281.40,  live:308.10 },
  { ticker:'NOW',  qty:19.20,  entry:826.40,  live:942.55 },
  { ticker:'PANW', qty:41.10,  entry:322.40,  live:348.20 },
  { ticker:'INTU', qty:33.50,  entry:612.80,  live:645.10 },
  { ticker:'ORCL', qty:88.00,  entry:142.50,  live:168.40 },
  { ticker:'GOOGL',qty:105.0,  entry:168.20,  live:182.45 },
  { ticker:'META', qty:28.50,  entry:482.10,  live:568.30 },
  { ticker:'CRWD', qty:26.00,  entry:312.50,  live:286.40 },
  { ticker:'SNOW', qty:52.00,  entry:168.20,  live:152.40 },
  { ticker:'NVDA', qty:124.0,  entry:89.42,   live:142.67 },
  { ticker:'ASML', qty:14.80,  entry:712.50,  live:845.30 },
];
_PORTFOLIO_HOLDINGS_MOCK.forEach((h) => {
  h.invested  = h.qty * h.entry;
  h.market    = h.qty * h.live;
  h.pnl       = h.market - h.invested;
  h.returnPct = ((h.live - h.entry) / h.entry) * 100;
});

const PORTFOLIO = {
  holdings: _PORTFOLIO_HOLDINGS_MOCK,
  realizedPnl: 18420.55,
  signal: 'BUY MORE',
  ytdReturn: 24.18,
  totalPnl:   _PORTFOLIO_HOLDINGS_MOCK.reduce((a, h) => a + h.pnl, 0) + 18420.55,
  invested:   _PORTFOLIO_HOLDINGS_MOCK.reduce((a, h) => a + h.invested, 0),
  market:     _PORTFOLIO_HOLDINGS_MOCK.reduce((a, h) => a + h.market, 0),
  atr1W: 4.82,
  atr1M: 18.40,
  atrHistory: (() => {
    let v1 = 3.6, v2 = 14.2, x = 99;
    const r = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    return Array.from({ length: 26 }, (_, i) => {
      v1 = Math.max(1.5, v1 + (r() - 0.5) * 0.6 + 0.05);
      v2 = Math.max(8,   v2 + (r() - 0.5) * 1.2 + 0.18);
      return { week: `W${i + 1}`, atr1W: +v1.toFixed(2), atr1M: +v2.toFixed(2) };
    });
  })(),
  returnHistory: (() => {
    let cum = 0, x = 17;
    const r = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    const arr = Array.from({ length: 26 }, (_, i) => {
      cum = +((24.18 / 25) * i + (r() - 0.5) * 3.4).toFixed(2);
      return { week: `W${i + 1}`, idx: i, ret: cum };
    });
    arr[arr.length - 1].ret = 24.18;
    return arr;
  })(),
  trend: { slope: 0.97, angle: 22.4, r2: 0.89 },
  metrics: {
    bestWeek:    { week: 'W18', value:  6.42 },
    worstWeek:   { week: 'W07', value: -3.18 },
    sharpe:      1.84,
    maxDrawdown: -8.42,
    winRate:     68,
    volatility:  14.6,
  },
};

// =============================================================
// SHARED PRIMITIVES
// =============================================================

function panelShadow(hover = false, depth = 1) {
  if (hover) {
    return [
      'inset 0 1px 0 rgba(255,255,255,0.10)',
      'inset 0 -1px 0 rgba(0,0,0,0.65)',
      'inset 0 0 0 1px rgba(255,255,255,0.04)',
      '0 2px 0 rgba(0,0,0,0.6)',
      '0 16px 30px rgba(0,0,0,0.55)',
      '0 40px 80px rgba(0,0,0,0.65)',
      '0 0 0 1px rgba(255,255,255,0.02)',
    ].join(', ');
  }
  return [
    'inset 0 1px 0 rgba(255,255,255,0.07)',
    'inset 0 -1px 0 rgba(0,0,0,0.55)',
    'inset 0 0 0 1px rgba(255,255,255,0.03)',
    `0 ${2 * depth}px 0 rgba(0,0,0,0.55)`,
    `0 ${10 * depth}px 24px rgba(0,0,0,0.45)`,
    `0 ${24 * depth}px 60px rgba(0,0,0,0.5)`,
  ].join(', ');
}

function PerspectiveGrid() {
  return (
    <div aria-hidden style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', perspective:'900px', perspectiveOrigin:'50% 50%', overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:'-50%', right:'-50%', top:'55%', height:'160%',
        transform:'rotateX(75deg)', transformOrigin:'top center',
        backgroundImage:'linear-gradient(rgba(63,189,242,0.18) 1px, transparent 1px),linear-gradient(90deg, rgba(63,189,242,0.12) 1px, transparent 1px)',
        backgroundSize:'60px 60px, 60px 60px',
        animation:'sw-grid-shift 7s linear infinite',
        maskImage:'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 35%, transparent 75%)',
        WebkitMaskImage:'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 35%, transparent 75%)',
      }} />
      <div style={{ position:'absolute', left:'50%', top:'50%', width:700, height:700, marginLeft:-350, marginTop:-550, background:'radial-gradient(closest-side, rgba(63,189,242,0.10), rgba(0,0,0,0) 70%)', filter:'blur(20px)' }} />
      <div style={{ position:'absolute', left:0, right:0, bottom:0, height:240, background:'linear-gradient(to top, rgba(63,189,242,0.10), rgba(63,189,242,0.0))', animation:'sw-scanline 9s linear infinite', mixBlendMode:'screen' }} />
      <div style={{ position:'absolute', left:0, right:0, top:'55%', height:1, background:'linear-gradient(90deg, transparent, rgba(63,189,242,0.55), transparent)', boxShadow:'0 0 12px rgba(63,189,242,0.4)' }} />
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center top, rgba(5,8,15,0) 0%, rgba(5,8,15,0.55) 60%, rgba(5,8,15,0.95) 100%)' }} />
    </div>
  );
}

function SignalBadge({ signal, size = 'md' }) {
  const meta = SIGNAL_META[signal] || SIGNAL_META.NEUTRAL;
  const pad = size === 'sm' ? '4px 8px' : size === 'lg' ? '8px 14px' : '6px 11px';
  const fs  = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;
  return (
    <span style={{
      '--c': meta.color, '--g': meta.color + '4D', '--g2': meta.color + 'B3',
      display:'inline-flex', alignItems:'center', gap:6,
      padding:pad,
      fontFamily:'Chakra Petch, sans-serif', fontWeight:700, fontSize:fs, letterSpacing:'0.14em',
      color:meta.color,
      background:`linear-gradient(180deg, ${meta.color}1F, ${meta.color}0A)`,
      border:`1px solid ${meta.color}55`,
      borderRadius:999,
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04), 0 0 14px ' + meta.color + '55',
      animation:'sw-breathe 3.2s ease-in-out infinite',
      textTransform:'uppercase', whiteSpace:'nowrap',
    }}>
      <span style={{ width:6, height:6, borderRadius:999, background:meta.color, boxShadow:`0 0 8px ${meta.color}` }} />
      {meta.label}
    </span>
  );
}

function PulsingDot({ color = PALETTE.bullish, size = 8 }) {
  return (
    <span aria-hidden style={{
      '--c': color,
      display:'inline-block', width:size, height:size, borderRadius:'50%',
      background:color,
      boxShadow:`0 0 10px ${color}, 0 0 24px ${color}55`,
      animation:'sw-pulse-dot 1.6s ease-in-out infinite',
    }} />
  );
}

function TermButton({ children, onClick, color = PALETTE.cyan, ghost = false, style = {}, ...rest }) {
  return (
    <button onClick={onClick} {...rest} style={{
      background: ghost ? 'transparent' : `linear-gradient(180deg, ${color}26, ${color}0F)`,
      color: PALETTE.text,
      border: `1px solid ${color}55`,
      borderRadius: 6,
      padding: '10px 16px',
      fontFamily: 'Chakra Petch, sans-serif',
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      boxShadow: ghost ? 'none' : `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 14px ${color}33`,
      transition: 'transform 120ms ease, box-shadow 200ms ease',
      ...style,
    }} />
  );
}

// =============================================================
// LOADING SCREEN
// =============================================================
function LoadingScreen({ message = 'Fetching live data…' }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:PALETTE.bg,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:22,
    }}>
      <PerspectiveGrid />
      <div style={{ position:'relative', zIndex:5, textAlign:'center' }}>
        <svg width="56" height="56" viewBox="0 0 56 56"
          style={{ animation:'sw-spin 1.1s linear infinite', display:'block', margin:'0 auto' }}>
          <circle cx="28" cy="28" r="24" stroke={PALETTE.border} strokeWidth="3" fill="none" />
          <circle cx="28" cy="28" r="24" stroke={PALETTE.cyan} strokeWidth="3" fill="none"
            strokeDasharray="38 112" strokeLinecap="round" />
        </svg>
        <div style={{
          marginTop:20,
          fontFamily:'Chakra Petch', fontWeight:700,
          fontSize:13, letterSpacing:'0.32em', textTransform:'uppercase',
          color:PALETTE.textDim,
        }}>{message}</div>
        <div style={{
          marginTop:8,
          fontFamily:'Space Mono', fontSize:10,
          color:PALETTE.textMute, letterSpacing:'0.18em',
        }}>Connecting to backend · localhost:8006</div>
      </div>
    </div>
  );
}

// =============================================================
// TERMINAL CHROME (header)
// =============================================================
function TerminalHeader({ title = 'SIGNAL WATCH', mode, onBack, badges = [], onRefresh }) {
  const now = useNow(1000);
  const [spin, setSpin] = useState(false);

  const handleRefresh = () => {
    setSpin(true);
    setTimeout(() => setSpin(false), 800);
    if (onRefresh) onRefresh();
  };

  return (
    <header style={{
      position:'sticky', top:0, zIndex:30, height:64,
      display:'grid', gridTemplateColumns:'auto 1fr auto', alignItems:'center',
      padding:'0 clamp(14px, 3vw, 28px)',
      background:'linear-gradient(180deg, rgba(11,19,34,0.85), rgba(11,19,34,0.65))',
      backdropFilter:'blur(14px) saturate(1.4)',
      WebkitBackdropFilter:'blur(14px) saturate(1.4)',
      borderBottom:`1px solid ${PALETTE.border}`,
      boxShadow:'0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        {onBack ? (
          <button onClick={onBack} aria-label="Back" style={{
            width:36, height:36, borderRadius:6,
            background:'rgba(255,255,255,0.03)',
            border:`1px solid ${PALETTE.border}`,
            color:PALETTE.textDim, cursor:'pointer',
            display:'grid', placeItems:'center',
            boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.5)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 6 L9 12 L15 18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        <PulsingDot color={PALETTE.bullish} />
        <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
          <span style={{ fontFamily:'Chakra Petch', fontWeight:700, letterSpacing:'0.22em', fontSize:14, color:PALETTE.text }}>{title}</span>
          {mode ? (
            <span style={{ fontFamily:'Space Mono', fontSize:10, letterSpacing:'0.2em', color:PALETTE.textMute, borderLeft:`1px solid ${PALETTE.border}`, paddingLeft:10 }}>{mode}</span>
          ) : null}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
        {badges}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{
          fontFamily:'Space Mono', fontSize:12, color:PALETTE.textDim,
          letterSpacing:'0.08em', padding:'6px 10px',
          border:`1px solid ${PALETTE.border}`,
          background:'rgba(0,0,0,0.35)', borderRadius:4,
        }}>
          {now.toLocaleTimeString('en-US', { hour12: false })}
        </div>
        <button onClick={handleRefresh} aria-label="Refresh" style={{
          width:36, height:36, borderRadius:6,
          background:`linear-gradient(180deg, rgba(63,189,242,0.18), rgba(63,189,242,0.05))`,
          border:`1px solid ${PALETTE.cyan}55`,
          color:PALETTE.cyan, cursor:'pointer',
          display:'grid', placeItems:'center',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 12px rgba(63,189,242,0.3)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ animation: spin ? 'sw-spin 0.8s cubic-bezier(.4,0,.2,1)' : 'none' }}>
            <path d="M21 12a9 9 0 1 1-3.5-7.1" strokeLinecap="round" />
            <path d="M21 4 v5 h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// =============================================================
// EXPORT EVERYTHING TO WINDOW
// =============================================================
Object.assign(window, {
  API_BASE,
  PALETTE, SIGNAL_META,
  injectGlobalStyles,
  useCountUp, useCardTilt, useNow, useMediaQuery,
  fmtPct, fmtUsd, fmtNum, fmtTime, fmtDate,
  transformStocksData, transformPortfolioData,
  STOCKS, PORTFOLIO,
  panelShadow,
  PerspectiveGrid, SignalBadge, PulsingDot, TermButton, TerminalHeader, LoadingScreen,
});
