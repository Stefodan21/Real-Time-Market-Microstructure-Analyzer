import { TICKERS, type Ticker } from '../types/market';

interface HeaderProps {
  ticker: Ticker;
  onTickerChange: (ticker: Ticker) => void;
  live: boolean;
  onToggleLive: () => void;
  latencyMs: number;
  connected: boolean;
}

/** Top bar: project title, ticker selector and live/latency indicator. */
export default function Header({
  ticker,
  onTickerChange,
  live,
  onToggleLive,
  latencyMs,
  connected,
}: HeaderProps) {
  const healthy = live && latencyMs > 0 && latencyMs < 500;

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden />
        <h1 className="topbar__title">Market Microstructure Analyzer</h1>
      </div>

      <div className="topbar__controls">
        <label className="control">
          <span className="control__label">Ticker</span>
          <select
            className="select"
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value as Ticker)}
          >
            {TICKERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`toggle ${live ? 'toggle--on' : ''}`}
          onClick={onToggleLive}
          aria-pressed={live}
        >
          {live ? 'Live' : 'Paused'}
        </button>

        <div
          className={`live-indicator ${
            live ? (healthy ? 'live-indicator--ok' : 'live-indicator--warn') : 'live-indicator--off'
          }`}
          title={connected ? 'Connected to Yahoo feed' : 'Yahoo feed disconnected'}
        >
          <span className="live-indicator__dot" />
          <span className="live-indicator__text">
            {live ? (connected ? `${latencyMs} ms` : 'offline') : 'stopped'}
          </span>
          <span className="live-indicator__source">
            {connected ? 'yahoo' : 'offline'}
          </span>
        </div>
      </div>
    </header>
  );
}
