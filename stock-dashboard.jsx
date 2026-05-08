// stock-dashboard.jsx — Stock signals grid + detail drawer
const { useState: _sUseState, useEffect: _sUseEffect, useMemo: _sUseMemo, useRef: _sUseRef } = React;
const RC = window.Recharts;

// =============================================================
// SIGNAL PILL BADGE — header counts
// =============================================================
function HeaderCountPill({ label, count, color, tickers }) {
  const [hover, setHover] = _sUseState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}>
      <div style={{
        '--c': color, '--g': color + '4D', '--g2': color + 'B3',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 14px',
        background: `linear-gradient(180deg, ${color}24, ${color}0A)`,
        border: `1px solid ${color}55`,
        borderRadius: 999,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 18px ${color}44`,
        cursor: 'default', animation: 'sw-breathe 3.2s ease-in-out infinite',
      }}>
        <PulsingDot color={color} size={6} />
        <span style={{
          fontFamily: 'Chakra Petch', fontWeight: 700, fontSize: 11,
          letterSpacing: '0.18em', color, textTransform: 'uppercase',
        }}>{label}</span>
        <span style={{
          fontFamily: 'Space Mono', fontSize: 13, color: PALETTE.text, fontWeight: 700,
          paddingLeft: 8, borderLeft: `1px solid ${color}33`,
        }}>{count}</span>
      </div>
      {hover && tickers.length > 0 ? (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(4,8,16,0.96)',
          border: `1px solid ${color}55`,
          borderRadius: 8, padding: '8px 12px',
          boxShadow: `0 12px 28px rgba(0,0,0,0.6), 0 0 14px ${color}33`,
          fontFamily: 'Space Mono', fontSize: 11, color: PALETTE.text,
          letterSpacing: '0.12em', whiteSpace: 'nowrap', zIndex: 50,
        }}>{tickers.join(' · ')}</div>
      ) : null}
    </div>
  );
}

// =============================================================
// COUNT-UP NUMBER
// =============================================================
function CountNumber({ value, decimals = 2, suffix = '', prefix = '', color, style }) {
  const v = useCountUp(value, 1100);
  return (
    <span style={{ fontFamily: 'Space Mono, monospace', fontVariantNumeric: 'tabular-nums', color, ...style }}>
      {prefix}{v.toFixed(decimals)}{suffix}
    </span>
  );
}

// =============================================================
// ATR GAUGE BAR
// =============================================================
function AtrGauge({ atr }) {
  // Build 0..max scale from p25/p75 with padding
  const max = Math.max(atr.current, atr.p75) * 1.35;
  const min = 0;
  const pct = (v) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  const inZone = atr.current >= atr.p25 && atr.current <= atr.p75;
  const needleColor = inZone ? PALETTE.bullish : PALETTE.bearish;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        position: 'relative', height: 22,
        background: '#040810',
        borderRadius: 6,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        {/* danger zones */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(atr.p25),
          background: `linear-gradient(90deg, ${PALETTE.bearish}33, ${PALETTE.bearish}10)`,
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          left: pct(atr.p75),
          background: `linear-gradient(270deg, ${PALETTE.bearish}33, ${PALETTE.bearish}10)`,
        }} />
        {/* green zone */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: pct(atr.p25), width: `calc(${pct(atr.p75)} - ${pct(atr.p25)})`,
          background: `linear-gradient(90deg, ${PALETTE.bullish}40, ${PALETTE.bullish}25)`,
          boxShadow: `inset 0 0 12px ${PALETTE.bullish}33`,
        }} />
        {/* p25/p75 markers */}
        {[atr.p25, atr.p75].map((v, i) => (
          <div key={i} style={{
            position: 'absolute', top: -1, bottom: -1,
            left: pct(v), width: 1, background: PALETTE.text, opacity: 0.55,
          }} />
        ))}
        {/* Needle */}
        <div style={{
          position: 'absolute', top: -3, bottom: -3,
          left: pct(atr.current),
          width: 3, marginLeft: -1.5,
          background: needleColor,
          boxShadow: `0 0 10px ${needleColor}, 0 0 20px ${needleColor}88`,
          borderRadius: 1,
          transition: 'left 1.1s cubic-bezier(.2,.8,.2,1)',
        }} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        marginTop: 6,
        fontFamily: 'Space Mono', fontSize: 9.5, color: PALETTE.textMute,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>
        <span>P25 {atr.p25.toFixed(2)}</span>
        <span style={{ textAlign: 'center', color: needleColor }}>ATR {atr.current.toFixed(2)}</span>
        <span style={{ textAlign: 'right' }}>P75 {atr.p75.toFixed(2)}</span>
      </div>
    </div>
  );
}

// =============================================================
// MINI SPARKLINE
// =============================================================
function AtrSparkline({ data }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: '100%', height: 44 }}>
      <RC.ResponsiveContainer>
        <RC.LineChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <RC.Line
            dataKey="v"
            type="monotone"
            stroke={PALETTE.amber}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={true}
            animationDuration={1100}
            animationEasing="ease-out" />
        </RC.LineChart>
      </RC.ResponsiveContainer>
    </div>
  );
}

// =============================================================
// STOCK CARD
// =============================================================
function StockCard({ s, idx, onOpen }) {
  const meta = SIGNAL_META[s.signal];
  const tilt = useCardTilt({ max: 8, lift: 14, baseX: 4 });

  const pos = s.returnPct >= 0;
  const retColor = s.signal === 'SQUARE OFF' ? PALETTE.bearish : pos ? PALETTE.bullish : PALETTE.bearish;

  return (
    <div
      ref={tilt.ref}
      {...tilt.handlers}
      onClick={() => onOpen(s)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(s); }}
      style={{
        position: 'relative',
        background: `linear-gradient(165deg, ${PALETTE.surfaceHi} 0%, ${PALETTE.surface} 60%, #060c18 100%)`,
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 12,
        padding: 18,
        cursor: 'pointer',
        boxShadow: panelShadow(tilt.hover, 1),
        overflow: 'hidden',
        animation: `sw-card-in 600ms cubic-bezier(.2,.8,.2,1) ${idx * 50}ms both`,
        ...tilt.style,
      }}>
      {/* Cursor specular */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 12,
        background: `radial-gradient(360px circle at ${tilt.mx}% ${tilt.my}%, ${meta.color}1F, transparent 60%)`,
        opacity: tilt.hover ? 1 : 0, transition: 'opacity 200ms ease',
      }} />
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 10, bottom: 10, width: 3,
        background: meta.color, boxShadow: `0 0 14px ${meta.color}, 0 0 24px ${meta.color}66`,
        borderRadius: 3,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{
            fontFamily: 'Chakra Petch', fontWeight: 700,
            fontSize: 'clamp(22px, 2.2vw, 26px)',
            letterSpacing: '0.06em', color: PALETTE.text, lineHeight: 1,
          }}>{s.ticker}</div>
          <div style={{
            marginTop: 4,
            fontFamily: 'Space Mono', fontSize: 10, color: PALETTE.textMute,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            {fmtDate(s.entryDate)} · {s.weeksHeld}W HELD
          </div>
        </div>
        <SignalBadge signal={s.signal} size="sm" />
      </div>

      {/* Big return */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 18 }}>
        <CountNumber
          value={s.returnPct}
          decimals={2}
          suffix="%"
          prefix={pos ? '+' : ''}
          color={retColor}
          style={{
            fontWeight: 700, fontSize: 'clamp(34px, 4.4vw, 46px)',
            letterSpacing: '-0.02em',
            textShadow: `0 0 22px ${retColor}55`,
          }} />
        <span style={{
          fontFamily: 'Space Mono', fontSize: 11, color: PALETTE.textMute,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>RET</span>
      </div>

      {/* Week deltas */}
      <div style={{
        display: 'flex', gap: 18, marginTop: 6,
        fontFamily: 'Space Mono', fontSize: 11,
      }}>
        <div>
          <span style={{ color: PALETTE.textMute, letterSpacing: '0.14em' }}>1W </span>
          <span style={{ color: s.weekDelta >= 0 ? PALETTE.bullish : PALETTE.bearish }}>
            {fmtPct(s.weekDelta)}
          </span>
        </div>
        <div>
          <span style={{ color: PALETTE.textMute, letterSpacing: '0.14em' }}>PRV </span>
          <span style={{ color: s.prevWeekDelta >= 0 ? PALETTE.bullish : PALETTE.bearish }}>
            {fmtPct(s.prevWeekDelta)}
          </span>
        </div>
      </div>

      {/* ATR gauge */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'Chakra Petch', fontSize: 10,
          color: PALETTE.textDim, letterSpacing: '0.22em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          <span>ATR Gauge</span>
          <span style={{ color: PALETTE.amber }}>{s.atr.current.toFixed(2)}</span>
        </div>
        <AtrGauge atr={s.atr} />
      </div>

      {/* Sparkline */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'Chakra Petch', fontSize: 10,
          color: PALETTE.textDim, letterSpacing: '0.22em',
          textTransform: 'uppercase', marginBottom: 2,
        }}>
          <span>13W ATR</span>
          <span style={{ color: PALETTE.textMute }}>SLP {s.trend.angle.toFixed(1)}°</span>
        </div>
        <AtrSparkline data={s.atr.history} />
      </div>
    </div>
  );
}

// =============================================================
// SKELETON CARD
// =============================================================
function SkeletonCard({ idx }) {
  return (
    <div style={{
      background: PALETTE.surface,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 12, padding: 18,
      boxShadow: panelShadow(false, 1),
      animation: `sw-card-in 600ms cubic-bezier(.2,.8,.2,1) ${idx * 50}ms both`,
    }}>
      <div className="sw-shimmer" style={{ width: 80, height: 22, borderRadius: 4 }} />
      <div className="sw-shimmer" style={{ width: 130, height: 12, borderRadius: 4, marginTop: 10 }} />
      <div className="sw-shimmer" style={{ width: 180, height: 38, borderRadius: 4, marginTop: 22 }} />
      <div className="sw-shimmer" style={{ width: '100%', height: 22, borderRadius: 4, marginTop: 22 }} />
      <div className="sw-shimmer" style={{ width: '100%', height: 44, borderRadius: 4, marginTop: 16 }} />
    </div>
  );
}

// =============================================================
// DETAIL DRAWER
// =============================================================
function StockDrawer({ stock, onClose }) {
  const isMobile = useMediaQuery('(max-width: 720px)');
  const [mounted, setMounted] = _sUseState(false);
  _sUseEffect(() => { const id = setTimeout(() => setMounted(true), 10); return () => clearTimeout(id); }, []);

  // Close on ESC
  _sUseEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!stock) return null;
  const meta = SIGNAL_META[stock.signal];

  // Build chart data
  const retSeries = stock.returnHistory.map((v, i) => {
    const target = (stock.trend.slope * i) + (stock.returnHistory[0] || 0);
    return { i, week: `W${i + 1}`, ret: v, fit: +target.toFixed(2) };
  });
  const atrSeries = stock.atr.history.map((v, i) => ({
    i, week: `W${i + 1}`, atr: v, p25: stock.atr.p25, p75: stock.atr.p75,
  }));

  const drawerWidth = isMobile ? '100%' : 'min(560px, 92vw)';
  const drawerHeight = isMobile ? '90vh' : '100vh';

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(2,4,8,0.66)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 220ms ease',
        }} />
      <aside
        role="dialog"
        aria-label={`${stock.ticker} detail`}
        style={{
          position: 'fixed',
          ...(isMobile
            ? { left: 0, right: 0, bottom: 0, height: drawerHeight, borderTop: `1px solid ${PALETTE.border}`, borderTopLeftRadius: 16, borderTopRightRadius: 16 }
            : { top: 0, right: 0, height: drawerHeight, width: drawerWidth, borderLeft: `1px solid ${PALETTE.border}` }),
          zIndex: 100,
          background: `linear-gradient(180deg, ${PALETTE.surfaceHi} 0%, ${PALETTE.bg} 100%)`,
          color: PALETTE.text,
          boxShadow: '0 -20px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: `${isMobile ? 'sw-drawer-bottom' : 'sw-drawer-right'} 360ms cubic-bezier(.2,.8,.2,1) both`,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
        {/* Drawer Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: `1px solid ${PALETTE.border}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{
              fontFamily: 'Chakra Petch', fontWeight: 700,
              fontSize: 28, letterSpacing: '0.06em',
              color: PALETTE.text,
            }}>{stock.ticker}</span>
            <span style={{
              fontFamily: 'Space Mono', fontSize: 11,
              color: PALETTE.textMute, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>{stock.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SignalBadge signal={stock.signal} />
            <button onClick={onClose} aria-label="Close"
              style={{
                width: 34, height: 34, borderRadius: 6,
                background: 'transparent', color: PALETTE.textDim,
                border: `1px solid ${PALETTE.border}`, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 5 L19 19 M19 5 L5 19" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ overflow: 'auto', padding: 22, flex: 1 }}>
          {/* Metric table */}
          <SectionLabel>Metrics</SectionLabel>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1,
            background: PALETTE.border, border: `1px solid ${PALETTE.border}`, borderRadius: 8, overflow: 'hidden',
          }}>
            <Metric label="Return"   value={fmtPct(stock.returnPct)} color={stock.returnPct >= 0 ? PALETTE.bullish : PALETTE.bearish} />
            <Metric label="ATR"       value={stock.atr.current.toFixed(2)} color={PALETTE.amber} />
            <Metric label="P25"       value={stock.atr.p25.toFixed(2)} color={PALETTE.bullish} />
            <Metric label="P75"       value={stock.atr.p75.toFixed(2)} color={PALETTE.bearish} />
            <Metric label="Slope"     value={stock.trend.slope.toFixed(2)} />
            <Metric label="Angle"     value={`${stock.trend.angle.toFixed(1)}°`} />
            <Metric label="R²"        value={stock.trend.r2.toFixed(2)} color={PALETTE.cyan} />
            <Metric label="Live"      value={fmtUsd(stock.livePrice)} />
          </div>

          {/* Return history */}
          <SectionLabel style={{ marginTop: 22 }}>Return History</SectionLabel>
          <ChartFrame height={200}>
            <span style={{ position: 'absolute', top: 10, right: 14, zIndex: 2 }}>
              <span style={{
                display: 'inline-flex', gap: 8,
                background: 'rgba(4,8,16,0.7)',
                border: `1px solid ${PALETTE.amber}55`,
                padding: '4px 10px', borderRadius: 999,
                fontFamily: 'Space Mono', fontSize: 10, color: PALETTE.amber,
                letterSpacing: '0.16em',
              }}>{stock.trend.angle.toFixed(1)}° · R² {stock.trend.r2.toFixed(2)}</span>
            </span>
            <RC.ResponsiveContainer>
              <RC.AreaChart data={retSeries} margin={{ top: 12, right: 14, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="retfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={PALETTE.bullish} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.bullish} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <RC.CartesianGrid stroke={PALETTE.border} strokeDasharray="2 5" vertical={false} />
                <RC.XAxis dataKey="week" tick={{ fill: PALETTE.textMute, fontSize: 10, fontFamily: 'Space Mono' }} interval={Math.max(0, Math.floor(retSeries.length / 6))} stroke={PALETTE.border} />
                <RC.YAxis tick={{ fill: PALETTE.textMute, fontSize: 10, fontFamily: 'Space Mono' }} stroke={PALETTE.border} />
                <RC.Tooltip content={<TermTooltip suffix="%" />} />
                <RC.Area dataKey="ret" type="monotone" stroke={PALETTE.bullish} fill="url(#retfill)" strokeWidth={2} animationDuration={1200} />
                <RC.Line dataKey="fit" type="linear" stroke={PALETTE.amber} strokeDasharray="5 5" strokeWidth={1.5} dot={false} animationDuration={1400} />
              </RC.AreaChart>
            </RC.ResponsiveContainer>
          </ChartFrame>

          {/* ATR history */}
          <SectionLabel style={{ marginTop: 22 }}>ATR History</SectionLabel>
          <ChartFrame height={180}>
            <RC.ResponsiveContainer>
              <RC.LineChart data={atrSeries} margin={{ top: 12, right: 50, left: -10, bottom: 0 }}>
                <RC.CartesianGrid stroke={PALETTE.border} strokeDasharray="2 5" vertical={false} />
                <RC.XAxis dataKey="week" tick={{ fill: PALETTE.textMute, fontSize: 10, fontFamily: 'Space Mono' }} stroke={PALETTE.border} />
                <RC.YAxis tick={{ fill: PALETTE.textMute, fontSize: 10, fontFamily: 'Space Mono' }} stroke={PALETTE.border} />
                <RC.Tooltip content={<TermTooltip />} />
                <RC.ReferenceLine y={stock.atr.p25} stroke={PALETTE.bullish} strokeDasharray="5 5"
                  label={{ value: `P25 ${stock.atr.p25.toFixed(2)}`, position: 'right', fill: PALETTE.bullish, fontSize: 10, fontFamily: 'Space Mono' }} />
                <RC.ReferenceLine y={stock.atr.p75} stroke={PALETTE.bearish} strokeDasharray="5 5"
                  label={{ value: `P75 ${stock.atr.p75.toFixed(2)}`, position: 'right', fill: PALETTE.bearish, fontSize: 10, fontFamily: 'Space Mono' }} />
                <RC.Line dataKey="atr" type="monotone" stroke={PALETTE.amber} strokeWidth={2} dot={false} animationDuration={1200}
                  label={({ x, y, value, index }) => index === atrSeries.length - 1 ? (
                    <text x={x + 6} y={y + 4} fill={PALETTE.amber} fontSize="10" fontFamily="Space Mono">{value.toFixed(2)}</text>
                  ) : null} />
              </RC.LineChart>
            </RC.ResponsiveContainer>
          </ChartFrame>

          {/* Why this signal */}
          <SectionLabel style={{ marginTop: 22 }}>Why This Signal</SectionLabel>
          <div style={{
            background: '#040810',
            border: `1px solid ${PALETTE.border}`,
            borderLeft: `3px solid ${meta.color}`,
            borderRadius: 8,
            padding: 16,
            fontSize: 13,
            lineHeight: 1.6,
            color: PALETTE.textDim,
          }}>
            {explainSignal(stock)}
          </div>
        </div>
      </aside>
    </>
  );
}

function explainSignal(s) {
  const inZone = s.atr.current >= s.atr.p25 && s.atr.current <= s.atr.p75;
  if (s.signal === 'BUY MORE') {
    return `Trend strength is high (R² ${s.trend.r2.toFixed(2)}, slope angle ${s.trend.angle.toFixed(1)}°) and ATR ${s.atr.current.toFixed(2)} sits ${inZone ? 'inside' : s.atr.current < s.atr.p25 ? 'below' : 'above'} the [${s.atr.p25.toFixed(2)} – ${s.atr.p75.toFixed(2)}] healthy band. Momentum continues; size up the position.`;
  }
  if (s.signal === 'SQUARE OFF') {
    return `Recent week deltas ${fmtPct(s.weekDelta)} / ${fmtPct(s.prevWeekDelta)} indicate momentum exhaustion. ATR ${s.atr.current.toFixed(2)} is ${s.atr.current > s.atr.p75 ? 'above the P75 ceiling — volatility regime expanding' : 'compressing below the P25 floor — trend losing energy'}. Take profit / cut.`;
  }
  return `Slope angle ${s.trend.angle.toFixed(1)}° with R² ${s.trend.r2.toFixed(2)} indicates a low-conviction trend. ATR ${s.atr.current.toFixed(2)} is ${inZone ? 'within' : 'outside'} the healthy band. Hold and re-evaluate next week.`;
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontFamily: 'Chakra Petch', fontWeight: 600,
      fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase',
      color: PALETTE.textDim, marginBottom: 10,
      ...style,
    }}>{children}</div>
  );
}

function Metric({ label, value, color = PALETTE.text }) {
  return (
    <div style={{
      background: PALETTE.surface, padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: 'Chakra Petch', fontSize: 9.5, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: PALETTE.textMute,
      }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontFamily: 'Space Mono', fontWeight: 700, fontSize: 16, color,
      }}>{value}</div>
    </div>
  );
}

function ChartFrame({ children, height = 200 }) {
  return (
    <div style={{
      position: 'relative',
      background: '#040810',
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 8,
      padding: '6px 4px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 30px rgba(0,0,0,0.5)',
      height,
    }}>{children}</div>
  );
}

function TermTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'rgba(4,8,16,0.95)',
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 6,
      padding: '8px 12px',
      fontFamily: 'Space Mono', fontSize: 11,
      color: PALETTE.text,
      boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
    }}>
      <div style={{ color: PALETTE.textMute, letterSpacing: '0.14em', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, color: p.color }}>
          <span>{p.dataKey}</span>
          <span>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// STOCK DASHBOARD ROOT
// =============================================================
function StockDashboard({ onBack }) {
  const [loaded, setLoaded] = _sUseState(false);
  const [active, setActive] = _sUseState(null);
  const [error, setError] = _sUseState(null);

  _sUseEffect(() => {
    const id = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(id);
  }, []);

  const counts = _sUseMemo(() => {
    const buckets = { 'BUY MORE': [], 'SQUARE OFF': [], 'NEUTRAL': [] };
    STOCKS.forEach((s) => buckets[s.signal].push(s.ticker));
    return buckets;
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text }}>
      <PerspectiveGrid />
      <div style={{ position: 'relative', zIndex: 5 }}>
        <TerminalHeader
          title="SIGNAL WATCH"
          mode="STOCK SIGNALS"
          onBack={onBack}
          badges={[
            <HeaderCountPill key="b"  label="Buy More"   count={counts['BUY MORE'].length}   color={PALETTE.bullish} tickers={counts['BUY MORE']} />,
            <HeaderCountPill key="s"  label="Square Off" count={counts['SQUARE OFF'].length} color={PALETTE.bearish} tickers={counts['SQUARE OFF']} />,
            <HeaderCountPill key="n"  label="Neutral"    count={counts['NEUTRAL'].length}    color={PALETTE.neutral} tickers={counts['NEUTRAL']} />,
          ]} />

        {error ? (
          <div style={{
            margin: '18px clamp(14px, 3vw, 28px)', padding: '12px 16px',
            background: `linear-gradient(180deg, ${PALETTE.amber}1F, ${PALETTE.amber}08)`,
            border: `1px solid ${PALETTE.amber}66`, borderRadius: 8,
            color: PALETTE.amber, fontFamily: 'Space Mono', fontSize: 12,
            letterSpacing: '0.14em',
          }}>⚠  {error}</div>
        ) : null}

        <main style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'clamp(16px, 2vw, 22px)',
          }}>
            {!loaded
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} idx={i} />)
              : STOCKS.map((s, i) => <StockCard key={s.ticker} s={s} idx={i} onOpen={setActive} />)
            }
          </div>
        </main>
      </div>

      {active ? <StockDrawer stock={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}

Object.assign(window, { StockDashboard, HeaderCountPill, CountNumber, ChartFrame, SectionLabel, Metric, TermTooltip });
