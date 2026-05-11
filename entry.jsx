// entry.jsx — Entry/landing screen: starfield, mode cards, input panels
// Accepts async onSelectStocks / onSelectPortfolio callbacks from App.
// Shows API errors inline below the title.
const { useState: _eUseState, useEffect: _eUseEffect, useRef: _eUseRef } = React;

// =============================================================
// STARFIELD
// =============================================================
function Starfield() {
  const ref = _eUseRef(null);
  _eUseEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = 150;
    const stars = [];
    function resize() { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    function init() {
      stars.length = 0;
      for (let i = 0; i < N; i++) {
        const z = Math.random();
        stars.push({ x:Math.random()*w, y:Math.random()*h, z, r:0.3+z*1.6, vx:(Math.random()-0.5)*0.04, vy:(Math.random()-0.5)*0.025, tw:Math.random()*Math.PI*2, col:Math.random()<0.85?'#cfe6ff':(Math.random()<0.5?'#3fbdf2':'#2dd49b') });
      }
    }
    resize(); init();
    window.addEventListener('resize', () => { resize(); init(); });
    let raf = 0, t0 = performance.now();
    function loop(t) {
      const dt = (t - t0) / 16.67; t0 = t;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w*0.5,h*0.4,0,w*0.5,h*0.4,Math.max(w,h)*0.6);
      grad.addColorStop(0,'rgba(63,189,242,0.06)'); grad.addColorStop(0.6,'rgba(140,125,240,0.03)'); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
      for (const s of stars) {
        s.x += s.vx*(0.4+s.z*1.4)*dt; s.y += s.vy*(0.4+s.z*1.4)*dt; s.tw += 0.04;
        if (s.x<0) s.x=w; if (s.x>w) s.x=0; if (s.y<0) s.y=h; if (s.y>h) s.y=0;
        const a = 0.4+0.6*(0.5+0.5*Math.sin(s.tw))*(0.4+s.z*0.6);
        ctx.beginPath(); ctx.fillStyle = s.col; ctx.globalAlpha = a;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        if (s.z > 0.85) { ctx.globalAlpha = a*0.25; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*4,0,Math.PI*2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none' }} />;
}

// =============================================================
// MODE CARDS
// =============================================================
function ModeCard({ accent, title, label, desc, icon, onClick, depth = 1 }) {
  const tilt = useCardTilt({ max:10, lift:16, baseX:4 });
  return (
    <button ref={tilt.ref} {...tilt.handlers} onClick={onClick} style={{
      position:'relative',
      background:`linear-gradient(165deg, ${PALETTE.surfaceHi} 0%, ${PALETTE.surface} 60%, #060c18 100%)`,
      border:`1px solid ${PALETTE.border}`,
      borderRadius:14, padding:'clamp(20px, 3vw, 32px)',
      textAlign:'left', color:PALETTE.text, cursor:'pointer',
      boxShadow:panelShadow(tilt.hover, depth),
      overflow:'hidden',
      animation:`sw-card-in 600ms cubic-bezier(.2,.8,.2,1) ${depth * 80}ms both`,
      ...tilt.style,
    }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', borderRadius:14, background:`radial-gradient(380px circle at ${tilt.mx}% ${tilt.my}%, ${accent}1F, transparent 60%)`, opacity:tilt.hover?1:0, transition:'opacity 220ms ease' }} />
      <div style={{ position:'absolute', left:0, top:12, bottom:12, width:3, background:accent, boxShadow:`0 0 16px ${accent}, 0 0 28px ${accent}66`, borderRadius:3 }} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div style={{ width:56, height:56, borderRadius:12, display:'grid', placeItems:'center', background:`linear-gradient(180deg, ${accent}1A, ${accent}05)`, border:`1px solid ${accent}55`, boxShadow:`inset 0 1px 0 rgba(255,255,255,0.12), 0 0 18px ${accent}33`, color:accent }}>{icon}</div>
        <span style={{ fontFamily:'Space Mono', fontSize:10, letterSpacing:'0.22em', color:PALETTE.textMute, textTransform:'uppercase' }}>{label}</span>
      </div>
      <h3 style={{ margin:0, fontFamily:'Chakra Petch', fontWeight:700, fontSize:'clamp(22px, 2.4vw, 30px)', letterSpacing:'0.06em', textTransform:'uppercase', color:PALETTE.text }}>{title}</h3>
      <p style={{ marginTop:12, marginBottom:0, color:PALETTE.textDim, fontSize:14, lineHeight:1.5, maxWidth:460 }}>{desc}</p>
      <div style={{ marginTop:26, display:'flex', alignItems:'center', gap:10, color:accent, fontFamily:'Chakra Petch', fontWeight:600, fontSize:13, letterSpacing:'0.2em', textTransform:'uppercase' }}>
        <span>Initialize</span>
        <svg width="22" height="14" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 7 H22" strokeLinecap="round" /><path d="M16 2 L22 7 L16 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

const _StockIcon = (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M5 27 H28" strokeLinecap="round" opacity="0.4" />
    <rect x="7"  y="14" width="3.5" height="9"  rx="0.6" fill="currentColor" opacity="0.85" />
    <path d="M8.75 11 V14 M8.75 23 V25" strokeLinecap="round" />
    <rect x="14" y="9"  width="3.5" height="13" rx="0.6" fill="currentColor" />
    <path d="M15.75 6 V9 M15.75 22 V25" strokeLinecap="round" />
    <rect x="21" y="16" width="3.5" height="6"  rx="0.6" fill="currentColor" opacity="0.6" />
    <path d="M22.75 13 V16 M22.75 22 V25" strokeLinecap="round" />
  </svg>
);

const _PortfolioIcon = (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
    <path d="M16 5 A11 11 0 0 1 26.4 12.5 L16 16 Z" fill="currentColor" />
    <path d="M16 16 L26.4 12.5 A11 11 0 0 1 22.5 25.6 Z" fill="currentColor" opacity="0.6" />
    <path d="M16 16 L22.5 25.6 A11 11 0 0 1 5 16 Z" fill="currentColor" opacity="0.32" />
    <path d="M16 16 L5 16 A11 11 0 0 1 16 5 Z" fill="currentColor" opacity="0.18" />
  </svg>
);

// =============================================================
// INPUT PANEL
// =============================================================
function InputPanel({ accent, title, subtitle, onBack, onSubmit, children, submitLabel }) {
  const tilt = useCardTilt({ max:4, lift:0, baseX:2 });
  return (
    <div style={{ position:'relative', width:'100%', maxWidth:760, animation:'sw-spring-up 520ms cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
      <div ref={tilt.ref} {...tilt.handlers} style={{ position:'relative', background:`linear-gradient(165deg, ${PALETTE.surfaceHi} 0%, ${PALETTE.surface} 60%, #060c18 100%)`, border:`1px solid ${PALETTE.border}`, borderRadius:14, padding:'clamp(20px, 3vw, 32px)', boxShadow:panelShadow(true, 1.4), ...tilt.style }}>
        <div style={{ position:'absolute', left:0, top:12, bottom:12, width:3, background:accent, boxShadow:`0 0 18px ${accent}, 0 0 32px ${accent}55`, borderRadius:3 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, gap:12 }}>
          <div>
            <div style={{ fontFamily:'Space Mono', fontSize:10, letterSpacing:'0.22em', color:PALETTE.textMute, textTransform:'uppercase' }}>{subtitle}</div>
            <h3 style={{ margin:'4px 0 0', fontFamily:'Chakra Petch', fontWeight:700, fontSize:'clamp(20px, 2.2vw, 26px)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{title}</h3>
          </div>
          <button onClick={onBack} aria-label="Back to mode select" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'transparent', border:`1px solid ${PALETTE.border}`, color:PALETTE.textDim, padding:'8px 12px', borderRadius:6, cursor:'pointer', fontFamily:'Chakra Petch', fontSize:12, letterSpacing:'0.18em', textTransform:'uppercase' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6 L9 12 L15 18" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        </div>
        {children}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onSubmit} style={{ display:'inline-flex', alignItems:'center', gap:12, padding:'12px 20px', background:`linear-gradient(180deg, ${accent}33, ${accent}10)`, border:`1px solid ${accent}AA`, color:accent, fontFamily:'Chakra Petch', fontWeight:700, fontSize:13, letterSpacing:'0.22em', textTransform:'uppercase', borderRadius:8, cursor:'pointer', boxShadow:`inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 22px ${accent}66, 0 8px 22px rgba(0,0,0,0.5)` }}>
            <span>{submitLabel}</span>
            <svg width="22" height="12" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M2 7 H22" strokeLinecap="round" /><path d="M16 2 L22 7 L16 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
      <label style={{ fontFamily:'Chakra Petch', fontWeight:600, fontSize:12, letterSpacing:'0.22em', textTransform:'uppercase', color:PALETTE.textDim }}>{children}</label>
      {hint ? <span style={{ fontFamily:'Space Mono', fontSize:10, color:PALETTE.textMute, letterSpacing:'0.1em' }}>{hint}</span> : null}
    </div>
  );
}

const _inputBase = {
  width:'100%', background:'#040810', border:`1px solid ${PALETTE.border}`,
  color:PALETTE.text, padding:'12px 14px', borderRadius:8,
  fontFamily:'Space Mono, monospace', fontSize:13, lineHeight:1.55,
  outline:'none', boxShadow:'inset 0 2px 6px rgba(0,0,0,0.6)',
  transition:'border-color 180ms, box-shadow 180ms',
};

// =============================================================
// ENTRY SCREEN ROOT
// Props: onSelectStocks(fn), onSelectPortfolio(fn), error(string|null), onClearError(fn)
// =============================================================
function EntryScreen({ onSelectStocks, onSelectPortfolio, error, onClearError }) {
  const [panel, setPanel]         = _eUseState(null); // 'stocks' | 'portfolio' | null
  const [tickers, setTickers]     = _eUseState('ALB 2026-05-01\nFIX 2026-05-01\nGLW 2026-05-01\nLRCX 2026-05-01\nMU 2026-05-01');
  const [baseDate, setBaseDate]   = _eUseState('2026-05-01');

  const handleStocksSubmit   = () => onSelectStocks({ tickers, baseDate });
  const handlePortfolioSubmit = () => onSelectPortfolio();

  return (
    <div style={{ position:'relative', minHeight:'100vh', width:'100%', overflow:'hidden', background:'radial-gradient(ellipse at 50% 30%, #06121f 0%, #05080f 60%, #000 100%)' }}>
      <Starfield />
      <PerspectiveGrid />

      <div style={{ position:'relative', zIndex:5, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(36px, 6vw, 80px) clamp(20px, 4vw, 60px) clamp(48px, 6vw, 80px)' }}>
        {/* Status bar */}
        <div style={{ position:'absolute', top:18, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 clamp(18px, 4vw, 36px)', fontFamily:'Space Mono', fontSize:10, color:PALETTE.textMute, letterSpacing:'0.22em', textTransform:'uppercase' }}>
          <span>SW · TERMINAL // v4.0.0</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <PulsingDot color={PALETTE.bullish} size={6} />
            BACKEND · {API_BASE.replace('http://','')}
          </span>
        </div>

        {/* Title block */}
        <div style={{ position:'relative', textAlign:'center', marginBottom:14 }}>
          <div style={{ position:'absolute', inset:0, filter:'blur(28px)', opacity:0.55, pointerEvents:'none' }}>
            <h1 style={_titleStyle}>SIGNAL WATCH</h1>
          </div>
          <h1 style={{ ..._titleStyle, animation:'sw-glow-text 5s ease-in-out infinite' }}>SIGNAL WATCH</h1>
        </div>
        <div style={{ fontFamily:'Space Mono', fontSize:'clamp(11px, 1.2vw, 13px)', letterSpacing:'0.42em', color:PALETTE.textDim, textTransform:'uppercase', marginBottom:'clamp(18px, 3vw, 32px)' }}>
          Quantitative · Momentum · Intelligence
        </div>

        {/* API error banner */}
        {error ? (
          <div style={{
            width:'100%', maxWidth:760,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
            marginBottom:20, padding:'12px 16px',
            background:`linear-gradient(180deg, ${PALETTE.bearish}1A, ${PALETTE.bearish}08)`,
            border:`1px solid ${PALETTE.bearish}55`,
            borderRadius:8,
            fontFamily:'Space Mono', fontSize:12, color:PALETTE.bearish, letterSpacing:'0.12em',
            animation:'sw-spring-up 300ms ease both',
          }}>
            <span>⚠  {error}</span>
            {onClearError ? (
              <button onClick={onClearError} style={{ background:'transparent', border:`1px solid ${PALETTE.bearish}55`, color:PALETTE.bearish, borderRadius:4, padding:'4px 8px', cursor:'pointer', fontFamily:'Space Mono', fontSize:11 }}>✕</button>
            ) : null}
          </div>
        ) : null}

        {/* Mode cards / input panels */}
        {!panel ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(290px, 1fr))', gap:'clamp(18px, 2.4vw, 26px)', width:'100%', maxWidth:980 }}>
            <ModeCard accent={PALETTE.bullish} title="Stock Signals" label="Single Stock Analysis" icon={_StockIcon} depth={1}
              desc="ATR-based BUY MORE and SQUARE OFF signals for individual stocks. Track entry, momentum, and volatility regime per ticker."
              onClick={() => setPanel('stocks')} />
            <ModeCard accent={PALETTE.neutral} title="Portfolio" label="Portfolio Dashboard" icon={_PortfolioIcon} depth={2}
              desc="Portfolio-level ATR signals for momentum strategy. Live holdings, YTD return, ATR volatility regime, and trend strength."
              onClick={() => setPanel('portfolio')} />
          </div>
        ) : panel === 'stocks' ? (
          <InputPanel accent={PALETTE.bullish} title="Stock Signals" subtitle="Single Stock Analysis" submitLabel="Analyse" onBack={() => setPanel(null)} onSubmit={handleStocksSubmit}>
            <FieldLabel hint="One per line · TICKER [YYYY-MM-DD]">Tickers</FieldLabel>
            <textarea value={tickers} onChange={(e) => setTickers(e.target.value)} rows={7}
              placeholder={'ALB 2026-05-01\nFIX 2026-05-01\nGLW 2026-05-01'}
              style={_inputBase}
              onFocus={(e) => { e.target.style.borderColor = PALETTE.bullish; e.target.style.boxShadow = `inset 0 2px 6px rgba(0,0,0,0.6), 0 0 14px ${PALETTE.bullish}33`; }}
              onBlur={(e)  => { e.target.style.borderColor = PALETTE.border;  e.target.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.6)'; }} />
            <div style={{ height:16 }} />
            <FieldLabel hint="Global fallback when no per-row date given">Base Date</FieldLabel>
            <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)}
              style={{ ..._inputBase, maxWidth:240 }} />
            <div style={{ marginTop:12, fontFamily:'Space Mono', fontSize:10, color:PALETTE.textMute, letterSpacing:'0.12em', lineHeight:1.6 }}>
              Signals fetched live from <span style={{ color:PALETTE.cyan }}>{API_BASE}/api/stocks</span>
            </div>
          </InputPanel>
        ) : (
          <InputPanel accent={PALETTE.neutral} title="Portfolio" subtitle="Portfolio Dashboard" submitLabel="Load Live Portfolio" onBack={() => setPanel(null)} onSubmit={handlePortfolioSubmit}>
            <div style={{ padding:'18px 0', fontFamily:'Space Mono', fontSize:12, color:PALETTE.textDim, lineHeight:1.7, letterSpacing:'0.1em' }}>
              <div style={{ marginBottom:8, color:PALETTE.text, fontFamily:'Chakra Petch', fontSize:13, letterSpacing:'0.2em', textTransform:'uppercase' }}>Live Portfolio Feed</div>
              The portfolio dashboard loads real-time data from the backend:<br />
              <span style={{ color:PALETTE.cyan }}>{API_BASE}/api/portfolio</span>
              <br /><br />
              Holdings, live prices, ATR series, YTD return and signal are all computed server-side using yfinance. Click <em>Load Live Portfolio</em> to fetch.
            </div>
            <div style={{ marginTop:8, fontFamily:'Space Mono', fontSize:10, color:PALETTE.textMute, letterSpacing:'0.14em' }}>
              20 holdings · signal: BUY MORE / SQUARE OFF / NEUTRAL
            </div>
          </InputPanel>
        )}
      </div>
    </div>
  );
}

const _titleStyle = {
  margin:0,
  fontFamily:'Chakra Petch, sans-serif',
  fontWeight:700,
  fontSize:'clamp(48px, 9vw, 132px)',
  letterSpacing:'0.04em',
  lineHeight:0.95,
  textTransform:'uppercase',
  background:'linear-gradient(95deg, #ffffff 0%, #3fbdf2 35%, #2dd49b 65%, #e8a23a 100%)',
  WebkitBackgroundClip:'text',
  WebkitTextFillColor:'transparent',
  backgroundClip:'text',
  color:'transparent',
};

Object.assign(window, { EntryScreen });
