// app.jsx — root component, mode router
const { useState: _aUseState, useEffect: _aUseEffect } = React;

function App() {
  _aUseEffect(() => { injectGlobalStyles(); }, []);
  const [mode, setMode] = _aUseState('entry'); // 'entry' | 'stocks' | 'portfolio'

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text }}>
      {mode === 'entry' ? (
        <EntryScreen
          onSelectStocks={() => setMode('stocks')}
          onSelectPortfolio={() => setMode('portfolio')} />
      ) : mode === 'stocks' ? (
        <StockDashboard onBack={() => setMode('entry')} />
      ) : (
        <PortfolioDashboard onBack={() => setMode('entry')} />
      )}
    </div>
  );
}

const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(<App />);
