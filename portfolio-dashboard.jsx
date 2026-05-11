// portfolio-dashboard.jsx — Portfolio dashboard with signal strip + tabs
// Accepts `portfolio` prop from App (live API data) or falls back to mock PORTFOLIO.
const { useState: _pUseState, useEffect: _pUseEffect, useMemo: _pUseMemo } = React;
const RC2 = window.Recharts;

// =============================================================
// SIGNAL STRIP — 5 columns
// =============================================================
function SignalStripItem({ label, color, children, sub }) {
  return (
    <div style={{
      flex:'1 1 0', minWidth:130,
      padding:'clamp(14px, 2vw, 22px) clamp(14px, 2vw, 24px)',
      borderRight:`1px solid ${PALETTE.border}`,
      display:'flex', flexDirection:'column', gap:6,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Chakra Petch', fontSize:10, letterSpacing:'0.26em', textTransform:'uppercase', color:PALETTE.textMute }}>
        {color ? <PulsingDot color={color} size={6} /> : null}
        <span>{label}</span>
      </div>
      <div>{children}</div>
      {sub ? <div style={{ fontFamily:'Space Mono', fontSize:10, color:PALETTE.textMute, letterSpacing:'0.14em' }}>{sub}</div> : null}
    </div>
  );
}

function PortfolioSignalStrip({ p }) {
  const meta     = SIGNAL_META[p.signal] || SIGNAL_META.NEUTRAL;
  const ytdColor = p.ytdReturn >= 0 ? PALETTE.bullish : PALETTE.bearish;
  const pnlColor = p.totalPnl  >= 0 ? PALETTE.bullish : PALETTE.bearish;
  return (
    <div style={{
      margin:'0 clamp(14px, 3vw, 28px)', marginTop:18,
      background:`linear-gradient(180deg, ${PALETTE.surfaceHi}, ${PALETTE.surface})`,
      border:`1px solid ${PALETTE.border}`,
      borderRadius:12,
      boxShadow:panelShadow(false, 1),
      display:'flex', flexWrap:'wrap', overflow:'hidden',
    }}>
      <SignalStripItem label="Signal" color={meta.color}>
        <span style={{ fontFamily:'Chakra Petch', fontWeight:700, fontSize:22, letterSpacing:'0.04em', color:meta.color, textShadow:`0 0 14px ${meta.color}66` }}>{p.signal}</span>
      </SignalStripItem>
      <SignalStripItem label="YTD Return" sub="vs avg investment">
        <CountNumber value={p.ytdReturn} decimals={2} suffix="%" prefix={p.ytdReturn >= 0 ? '+' : ''} color={ytdColor} style={{ fontWeight:700, fontSize:22 }} />
      </SignalStripItem>
      <SignalStripItem label="Total PnL" sub={`Realised ${fmtUsd(p.realizedPnl, 0)}`}>
        <CountNumber value={p.totalPnl} decimals={0} prefix={p.totalPnl >= 0 ? '+$' : '-$'} color={pnlColor} style={{ fontWeight:700, fontSize:22 }} />
      </SignalStripItem>
      <SignalStripItem label="1W ATR" sub="Avg vol">
        <CountNumber value={p.atr1W} decimals={2} color={PALETTE.amber} style={{ fontWeight:700, fontSize:22 }} />
      </SignalStripItem>
      <SignalStripItem label="1M ATR" sub="Trend vol">
        <CountNumber value={p.atr1M} decimals={2} color={PALETTE.cyan} style={{ fontWeight:700, fontSize:22, borderRight:'none' }} />
      </SignalStripItem>
    </div>
  );
}

// =============================================================
// TABS
// =============================================================
function Tabs({ value, onChange, options }) {
  return (
    <div style={{ display:'inline-flex', background:PALETTE.surface, border:`1px solid ${PALETTE.border}`, borderRadius:10, padding:4, boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.5)' }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding:'9px 18px', borderRadius:7, border:'none',
            background: active ? `linear-gradient(180deg, ${PALETTE.cyan}28, ${PALETTE.cyan}10)` : 'transparent',
            color: active ? PALETTE.cyan : PALETTE.textDim,
            fontFamily:'Chakra Petch', fontWeight:600, fontSize:12,
            letterSpacing:'0.22em', textTransform:'uppercase',
            cursor:'pointer',
            boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 14px ${PALETTE.cyan}33` : 'none',
            transition:'all 200ms ease',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// =============================================================
// CHARTS TAB
// =============================================================
function ChartsTab({ p }) {
  const data = (p.returnHistory || []).map((d) => ({
    ...d,
    fit: +(p.trend.slope * d.idx).toFixed(2),
  }));
  return (
    <div style={{ display:'grid', gap:18 }}>
      <PanelCard title="Portfolio Return" subtitle="Weekly YTD %" right={<TrendBadge p={p} />}>
        <div style={{ height:320 }}>
          <RC2.ResponsiveContainer>
            <RC2.AreaChart data={data} margin={{ top:16, right:18, left:-8, bottom:0 }}>
              <defs>
                <linearGradient id="pretfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={PALETTE.neutral} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={PALETTE.neutral} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <RC2.CartesianGrid stroke={PALETTE.border} strokeDasharray="2 6" vertical={false} />
              <RC2.XAxis dataKey="week" interval={Math.max(0, Math.floor(data.length / 8))} tick={{ fill:PALETTE.textMute, fontSize:10, fontFamily:'Space Mono' }} stroke={PALETTE.border} />
              <RC2.YAxis tick={{ fill:PALETTE.textMute, fontSize:10, fontFamily:'Space Mono' }} stroke={PALETTE.border} />
              <RC2.Tooltip content={<TermTooltip suffix="%" />} />
              <RC2.Area dataKey="ret" type="monotone" stroke={PALETTE.neutral} fill="url(#pretfill)" strokeWidth={2.4} animationDuration={1300} />
              <RC2.Line dataKey="fit" type="linear" stroke={PALETTE.amber} strokeDasharray="6 6" strokeWidth={1.5} dot={false} animationDuration={1500} />
              <RC2.ReferenceLine y={0} stroke={PALETTE.border} />
            </RC2.AreaChart>
          </RC2.ResponsiveContainer>
        </div>
      </PanelCard>

      <PanelCard title="Volatility (ATR)" subtitle="1W vs 1M">
        <div style={{ height:220 }}>
          <RC2.ResponsiveContainer>
            <RC2.LineChart data={p.atrHistory || []} margin={{ top:12, right:18, left:-10, bottom:0 }}>
              <RC2.CartesianGrid stroke={PALETTE.border} strokeDasharray="2 6" vertical={false} />
              <RC2.XAxis dataKey="week" interval={Math.max(0, Math.floor((p.atrHistory || []).length / 8))} tick={{ fill:PALETTE.textMute, fontSize:10, fontFamily:'Space Mono' }} stroke={PALETTE.border} />
              <RC2.YAxis tick={{ fill:PALETTE.textMute, fontSize:10, fontFamily:'Space Mono' }} stroke={PALETTE.border} />
              <RC2.Tooltip content={<TermTooltip />} />
              <RC2.Line dataKey="atr1W" name="1W ATR" type="monotone" stroke={PALETTE.amber}   strokeWidth={2} dot={false} animationDuration={1200} />
              <RC2.Line dataKey="atr1M" name="1M ATR" type="monotone" stroke={PALETTE.neutral} strokeWidth={2} dot={false} animationDuration={1300} />
            </RC2.LineChart>
          </RC2.ResponsiveContainer>
        </div>
        <div style={{ display:'flex', gap:22, justifyContent:'center', marginTop:8, fontFamily:'Space Mono', fontSize:11, color:PALETTE.textDim, letterSpacing:'0.14em' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <span style={{ width:14, height:2, background:PALETTE.amber, boxShadow:`0 0 6px ${PALETTE.amber}` }} />1W ATR
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <span style={{ width:14, height:2, background:PALETTE.neutral, boxShadow:`0 0 6px ${PALETTE.neutral}` }} />1M ATR
          </span>
        </div>
      </PanelCard>
    </div>
  );
}

function TrendBadge({ p }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:`linear-gradient(180deg, ${PALETTE.amber}28, ${PALETTE.amber}0A)`, border:`1px solid ${PALETTE.amber}66`, padding:'6px 12px', borderRadius:999, fontFamily:'Space Mono', fontSize:11, color:PALETTE.amber, letterSpacing:'0.16em', boxShadow:`inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${PALETTE.amber}33` }}>
      <span>SLP {p.trend.slope.toFixed(2)}</span>
      <span style={{ opacity:0.6 }}>·</span>
      <span>{p.trend.angle.toFixed(1)}°</span>
      <span style={{ opacity:0.6 }}>·</span>
      <span>R² {p.trend.r2.toFixed(2)}</span>
    </span>
  );
}

// =============================================================
// INFO TAB
// =============================================================
function InfoTab({ p }) {
  const sorted = _pUseMemo(
    () => [...(p.holdings || [])].sort((a, b) => b.market - a.market),
    [p.holdings]
  );
  const totals = _pUseMemo(() => ({
    invested: (p.holdings || []).reduce((a, h) => a + (h.invested || 0), 0),
    market:   (p.holdings || []).reduce((a, h) => a + (h.market   || 0), 0),
    pnl:      (p.holdings || []).reduce((a, h) => a + (h.pnl      || 0), 0),
  }), [p.holdings]);
  const totalReturnPct = totals.invested > 0 ? ((totals.market - totals.invested) / totals.invested) * 100 : 0;

  return (
    <div style={{ display:'grid', gap:18 }}>
      <PanelCard title="Holdings" subtitle={`${(p.holdings || []).length} positions`}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${PALETTE.border}` }}>
                {['Ticker','Qty','Entry','Live','Invested','Market','PnL','Return'].map((h, i) => (
                  <th key={h} style={{ textAlign:i === 0 ? 'left' : 'right', padding:'10px 14px', fontFamily:'Chakra Petch', fontWeight:600, fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:PALETTE.textMute }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h, i) => {
                const pos = h.pnl >= 0;
                return (
                  <tr key={h.ticker + i} style={{ borderBottom:`1px solid ${PALETTE.border}55`, background:i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                    <td style={_cellStyle('left', { fontFamily:'Chakra Petch', fontWeight:700, fontSize:13, color:PALETTE.text, letterSpacing:'0.06em' })}>{h.ticker}</td>
                    <td style={_cellStyle()}>{(h.qty || 0).toFixed(2)}</td>
                    <td style={_cellStyle()}>{fmtUsd(h.entry || 0)}</td>
                    <td style={_cellStyle()}>{fmtUsd(h.live  || 0)}</td>
                    <td style={_cellStyle()}>{fmtUsd(h.invested || 0, 0)}</td>
                    <td style={_cellStyle()}>{fmtUsd(h.market   || 0, 0)}</td>
                    <td style={_cellStyle('right', { color:pos ? PALETTE.bullish : PALETTE.bearish, fontWeight:700 })}>{pos ? '+' : ''}{fmtUsd(h.pnl || 0, 0)}</td>
                    <td style={_cellStyle('right', { color:pos ? PALETTE.bullish : PALETTE.bearish, fontWeight:700 })}>{fmtPct(h.returnPct || 0)}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop:`1px solid ${PALETTE.borderHi}`, background:`linear-gradient(180deg, ${PALETTE.surfaceHi}, ${PALETTE.surface})` }}>
                <td style={_cellStyle('left', { fontFamily:'Chakra Petch', fontWeight:700, fontSize:12, letterSpacing:'0.18em', textTransform:'uppercase', color:PALETTE.textDim })}>Totals</td>
                <td style={_cellStyle()}>—</td>
                <td style={_cellStyle()}>—</td>
                <td style={_cellStyle()}>—</td>
                <td style={_cellStyle('right', { color:PALETTE.text, fontWeight:700 })}>{fmtUsd(totals.invested, 0)}</td>
                <td style={_cellStyle('right', { color:PALETTE.text, fontWeight:700 })}>{fmtUsd(totals.market, 0)}</td>
                <td style={_cellStyle('right', { color:totals.pnl >= 0 ? PALETTE.bullish : PALETTE.bearish, fontWeight:700 })}>{totals.pnl >= 0 ? '+' : ''}{fmtUsd(totals.pnl, 0)}</td>
                <td style={_cellStyle('right', { color:totalReturnPct >= 0 ? PALETTE.bullish : PALETTE.bearish, fontWeight:700 })}>{fmtPct(totalReturnPct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </PanelCard>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:18 }}>
        <PanelCard title="Portfolio Metrics">
          <MetricRow label="Total Invested"  value={fmtUsd(totals.invested, 0)} />
          <MetricRow label="Market Value"    value={fmtUsd(totals.market, 0)} />
          <MetricRow label="Unrealised PnL"  value={`${totals.pnl >= 0 ? '+' : ''}${fmtUsd(totals.pnl, 0)}`} color={totals.pnl >= 0 ? PALETTE.bullish : PALETTE.bearish} />
          <MetricRow label="Realised PnL"    value={fmtUsd(p.realizedPnl || 0, 0)} color={PALETTE.bullish} />
          <MetricRow label="Win Rate"        value={`${(p.metrics || {}).winRate || 0}%`} color={PALETTE.cyan} />
          <MetricRow label="Sharpe (3M)"     value={((p.metrics || {}).sharpe || 0).toFixed(2)} color={PALETTE.cyan} />
        </PanelCard>

        <PanelCard title="Trend Metrics">
          <MetricRow label="Slope"       value={(p.trend.slope || 0).toFixed(2)} />
          <MetricRow label="Slope Angle" value={`${(p.trend.angle || 0).toFixed(1)}°`}    color={PALETTE.amber} />
          <MetricRow label="R²"          value={(p.trend.r2 || 0).toFixed(2)}              color={PALETTE.cyan} />
          <MetricRow label="1W ATR"      value={(p.atr1W || 0).toFixed(2)}                 color={PALETTE.amber} />
          <MetricRow label="1M ATR"      value={(p.atr1M || 0).toFixed(2)}                 color={PALETTE.neutral} />
          <MetricRow label="Volatility"  value={`${((p.metrics || {}).volatility || 0).toFixed(1)}%`} />
          <MetricRow label="Best Week"   value={`${(p.metrics || {}).bestWeek?.week  || '—'} · ${fmtPct((p.metrics || {}).bestWeek?.value  || 0)}`} color={PALETTE.bullish} />
          <MetricRow label="Worst Week"  value={`${(p.metrics || {}).worstWeek?.week || '—'} · ${fmtPct((p.metrics || {}).worstWeek?.value || 0)}`} color={PALETTE.bearish} />
          <MetricRow label="Max Drawdown" value={fmtPct((p.metrics || {}).maxDrawdown || 0)} color={PALETTE.bearish} />
        </PanelCard>
      </div>
    </div>
  );
}

function _cellStyle(align = 'right', extra = {}) {
  return { padding:'10px 14px', textAlign:align, fontFamily:'Space Mono', fontSize:12, color:PALETTE.textDim, fontVariantNumeric:'tabular-nums', ...extra };
}

function MetricRow({ label, value, color = PALETTE.text }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'10px 0', borderBottom:`1px solid ${PALETTE.border}55` }}>
      <span style={{ fontFamily:'Chakra Petch', fontSize:11, letterSpacing:'0.22em', textTransform:'uppercase', color:PALETTE.textMute }}>{label}</span>
      <span style={{ fontFamily:'Space Mono', fontWeight:700, fontSize:14, color }}>{value}</span>
    </div>
  );
}

// =============================================================
// PANEL CARD
// =============================================================
function PanelCard({ title, subtitle, right, children }) {
  return (
    <section style={{ position:'relative', background:`linear-gradient(165deg, ${PALETTE.surfaceHi} 0%, ${PALETTE.surface} 60%, #060c18 100%)`, border:`1px solid ${PALETTE.border}`, borderRadius:12, padding:'clamp(16px, 2.4vw, 22px)', boxShadow:panelShadow(false, 1) }}>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:10 }}>
        <div>
          <div style={{ fontFamily:'Chakra Petch', fontWeight:600, fontSize:13, letterSpacing:'0.22em', textTransform:'uppercase', color:PALETTE.text }}>{title}</div>
          {subtitle ? <div style={{ fontFamily:'Space Mono', fontSize:10, marginTop:3, color:PALETTE.textMute, letterSpacing:'0.14em', textTransform:'uppercase' }}>{subtitle}</div> : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

// =============================================================
// PORTFOLIO DASHBOARD ROOT
// Accepts `portfolio` prop (live API data) or falls back to mock PORTFOLIO.
// =============================================================
function PortfolioDashboard({ onBack, portfolio: portfolioProp, onRefresh }) {
  const p = portfolioProp || PORTFOLIO;

  const [tab, setTab]     = _pUseState('charts');
  const [loaded, setLoaded] = _pUseState(false);
  _pUseEffect(() => {
    setLoaded(false);
    const id = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(id);
  }, [p]);

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:PALETTE.bg, color:PALETTE.text }}>
      <PerspectiveGrid />
      <div style={{ position:'relative', zIndex:5 }}>
        <TerminalHeader
          title="SIGNAL WATCH"
          mode="PORTFOLIO"
          onBack={onBack}
          onRefresh={onRefresh}
          badges={[
            <HeaderCountPill key="ho" label="Holdings" count={(p.holdings || []).length}                            color={PALETTE.cyan}    tickers={(p.holdings || []).map(h => h.ticker)} />,
            <HeaderCountPill key="up" label="Winners"  count={(p.holdings || []).filter(h => h.pnl >= 0).length}   color={PALETTE.bullish} tickers={(p.holdings || []).filter(h => h.pnl >= 0).map(h => h.ticker)} />,
            <HeaderCountPill key="dn" label="Losers"   count={(p.holdings || []).filter(h => h.pnl < 0).length}    color={PALETTE.bearish} tickers={(p.holdings || []).filter(h => h.pnl < 0).map(h => h.ticker)} />,
          ]} />

        <PortfolioSignalStrip p={p} />

        <div style={{ display:'flex', justifyContent:'flex-end', padding:'20px clamp(14px, 3vw, 28px) 0' }}>
          <Tabs value={tab} onChange={setTab}
            options={[{ value:'charts', label:'Charts' }, { value:'info', label:'Info' }]} />
        </div>

        <main style={{ padding:'clamp(18px, 3vw, 28px)' }}>
          {!loaded ? (
            <div style={{ display:'grid', gap:16 }}>
              <div className="sw-shimmer" style={{ height:320, borderRadius:12 }} />
              <div className="sw-shimmer" style={{ height:220, borderRadius:12 }} />
            </div>
          ) : tab === 'charts' ? <ChartsTab p={p} /> : <InfoTab p={p} />}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { PortfolioDashboard, PanelCard });
