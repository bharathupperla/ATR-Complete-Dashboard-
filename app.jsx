// app.jsx — root component: data fetching, mode routing, loading/error states
const { useState: _aUseState, useEffect: _aUseEffect, useRef: _aUseRef } = React;

function App() {
  _aUseEffect(() => { injectGlobalStyles(); }, []);

  const [mode, setMode]               = _aUseState('entry');
  const [stocksData, setStocksData]   = _aUseState(null);
  const [portData, setPortData]       = _aUseState(null);
  const [loading, setLoading]         = _aUseState(false);
  const [apiError, setApiError]       = _aUseState(null);
  const lastStockParams               = _aUseRef(null);

  // ── Stock signals fetch ────────────────────────────────────────────────────
  const fetchStocks = async ({ tickers, baseDate }) => {
    lastStockParams.current = { tickers, baseDate };
    setLoading(true);
    setApiError(null);
    try {
      const url = `${API_BASE}/api/stocks`
        + `?entries=${encodeURIComponent(tickers)}`
        + `&base_date=${encodeURIComponent(baseDate)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server returned ${res.status}`);
      }
      const json = await res.json();
      if (!json.stocks || json.stocks.length === 0) {
        throw new Error('No data returned — check ticker symbols and dates');
      }
      setStocksData(transformStocksData(json.stocks));
      setMode('stocks');
    } catch (e) {
      setApiError(e.message || 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  };

  // ── Portfolio fetch ────────────────────────────────────────────────────────
  const fetchPortfolio = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/api/portfolio`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server returned ${res.status}`);
      }
      const json = await res.json();
      setPortData(transformPortfolioData(json));
      setMode('portfolio');
    } catch (e) {
      setApiError(e.message || 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh (re-runs last fetch) ──────────────────────────────────────────
  const handleRefresh = () => {
    if (mode === 'stocks' && lastStockParams.current) fetchStocks(lastStockParams.current);
    else if (mode === 'portfolio') fetchPortfolio();
  };

  // ── Back to entry ─────────────────────────────────────────────────────────
  const handleBack = () => {
    setMode('entry');
    setApiError(null);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text }}>
      {mode === 'entry' ? (
        <EntryScreen
          onSelectStocks={fetchStocks}
          onSelectPortfolio={fetchPortfolio}
          error={apiError}
          onClearError={() => setApiError(null)} />
      ) : mode === 'stocks' ? (
        <StockDashboard
          stocks={stocksData}
          onBack={handleBack}
          onRefresh={handleRefresh} />
      ) : (
        <PortfolioDashboard
          portfolio={portData}
          onBack={handleBack}
          onRefresh={handleRefresh} />
      )}
    </div>
  );
}

const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(<App />);
