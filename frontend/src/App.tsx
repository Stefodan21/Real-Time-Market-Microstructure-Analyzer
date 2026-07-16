import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import SpreadChart from './components/SpreadChart';
import CandlestickChart from './components/CandlestickChart';
import { TICKERS, type Candle, type PricePoint, type Ticker, type YahooPricingData } from './types/market';
import { buildSubscribeMessage, decodeYahooPricingMessage } from './utils/yahooWebSocket';
/** WebSocket endpoint provided via VITE_WS_URL. */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'wss://streamer.finance.yahoo.com/?version=2';
const SUBSCRIPTION_INTERVAL_MS = 15_000;
const CACHE_WINDOW_MS = 30 * 60 * 1000;

const MAX_PRICE_POINTS = 60;
const MAX_CANDLES = 40;

function toNumber(value: number | string | boolean | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

interface TickerCache {
  latestQuote: YahooPricingData | null;
  priceHistory: PricePoint[];
  candles: Candle[];
}

function createEmptyCache(): Record<Ticker, TickerCache> {
  return TICKERS.reduce((acc, ticker) => {
    acc[ticker] = { latestQuote: null, priceHistory: [], candles: [] };
    return acc;
  }, {} as Record<Ticker, TickerCache>);
}

function pruneWindow<T extends { ts: number }>(items: T[], now = Date.now()): T[] {
  const cutoff = now - CACHE_WINDOW_MS;
  return items.filter((item) => item.ts >= cutoff);
}

function updateTickerCache(prev: TickerCache, message: YahooPricingData): TickerCache {
  const ts = Date.now();
  const price = toNumber(message.price);
  const close = price;
  const volume = toNumber(message.last_size) || 1;

  const priceHistory = pruneWindow([
    ...prev.priceHistory,
    {
      time: new Date(ts).toLocaleTimeString('en-GB', { hour12: false }),
      ts,
      price,
      changePercent: toNumber(message.change_percent),
    },
  ]);

  const candles = pruneWindow([
    ...prev.candles,
    {
      time: new Date(ts).toLocaleTimeString('en-GB', { hour12: false }),
      ts,
      open: price,
      high: price,
      low: price,
      close,
      volume,
    },
  ]);

  return {
    latestQuote: message,
    priceHistory,
    candles,
  };
}

export default function App() {
  const [ticker, setTicker] = useState<Ticker>('AAPL');
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);

  const [latestQuote, setLatestQuote] = useState<YahooPricingData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);

  const tickerRef = useRef(ticker);
  tickerRef.current = ticker;
  const cacheRef = useRef<Record<Ticker, TickerCache>>(createEmptyCache());

  const syncVisibleTicker = useCallback((selectedTicker: Ticker) => {
    const cached = cacheRef.current[selectedTicker];
    setLatestQuote(cached.latestQuote);
    setPriceHistory(cached.priceHistory.slice(-MAX_PRICE_POINTS));
    setCandles(cached.candles.slice(-MAX_CANDLES));
  }, []);

  const processMessage = useCallback((message: YahooPricingData) => {
    const symbol = message.id as Ticker;
    if (!TICKERS.includes(symbol)) return;

    const nextCache = updateTickerCache(cacheRef.current[symbol], message);
    cacheRef.current[symbol] = nextCache;

    if (symbol !== tickerRef.current) return;

    setLatestQuote(nextCache.latestQuote);
    setPriceHistory(nextCache.priceHistory.slice(-MAX_PRICE_POINTS));
    setCandles(nextCache.candles.slice(-MAX_CANDLES));
  }, []);

  // Show cached data immediately when the selection changes.
  useEffect(() => {
    syncVisibleTicker(ticker);
  }, [ticker, syncVisibleTicker]);

  // Keep the Yahoo subscription alive in the background and subscribe to all
  // tracked tickers so the cache stays warm even when nobody is viewing them.
  useEffect(() => {
    if (!live) return;
    if (!WS_URL) {
      setConnected(false);
      return;
    }

    let ws: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        ws?.send(buildSubscribeMessage(TICKERS));

        heartbeat = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(buildSubscribeMessage(TICKERS));
          }
        }, SUBSCRIPTION_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        const raw = decodeYahooPricingMessage(event.data as string);
        if (raw) processMessage(raw);
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }

    return () => {
      setConnected(false);
      if (heartbeat) clearInterval(heartbeat);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        ws.close();
      }
    };
  }, [live, processMessage]);

  const latencyMs = latestQuote ? Math.max(0, Date.now() - toNumber(latestQuote.time) * 1000) : 0;

  return (
    <div className="app">
      <Header
        ticker={ticker}
        onTickerChange={setTicker}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        latencyMs={latencyMs}
        connected={connected}
      />

      <main className="grid">
        <section className="panel panel--orderbook">
          <div className="panel__head">
            <h2>Live Quote</h2>
            <span className="panel__legend">
              <i className="dot dot--bid" /> Yahoo raw dict
            </span>
          </div>
          <div className="panel__body">
            {latestQuote ? (
              <div className="quote-card">
                <div className="quote-card__title">{latestQuote.short_name || latestQuote.id}</div>
                <div className="quote-card__price">
                  {latestQuote.currency} {toNumber(latestQuote.price).toFixed(2)}
                </div>
                <div className="quote-card__grid">
                  <div><span>Change</span><b style={{ color: toNumber(latestQuote.change) >= 0 ? '#22c55e' : '#ef4444' }}>{toNumber(latestQuote.change).toFixed(2)}</b></div>
                  <div><span>Change %</span><b>{toNumber(latestQuote.change_percent).toFixed(2)}%</b></div>
                  <div><span>Day High</span><b>{toNumber(latestQuote.day_high).toFixed(2)}</b></div>
                  <div><span>Day Low</span><b>{toNumber(latestQuote.day_low).toFixed(2)}</b></div>
                  <div><span>Volume</span><b>{toNumber(latestQuote.day_volume).toLocaleString()}</b></div>
                  <div><span>Exchange</span><b>{latestQuote.exchange}</b></div>
                </div>
              </div>
            ) : (
              <div className="panel__empty">Waiting for live quote…</div>
            )}
          </div>
        </section>

        <section className="panel panel--spread">
          <div className="panel__head">
            <h2>Price Trend</h2>
            <span className="panel__legend">
              <i className="dot dot--spread" /> Price over time
            </span>
          </div>
          <div className="panel__body">
            {priceHistory.length > 0 ? (
              <SpreadChart data={priceHistory} />
            ) : (
              <div className="panel__empty">Waiting for live price updates…</div>
            )}
          </div>
        </section>

        <section className="panel panel--candles">
          <div className="panel__head">
            <h2>Yahoo Candle</h2>
            <span className="panel__legend">
              <i className="dot dot--bid" /> Up
              <i className="dot dot--ask" /> Down
              <span className="panel__legend-text">OHLC + day volume</span>
            </span>
          </div>
          <div className="panel__body">
            {candles.length > 0 ? (
              <CandlestickChart data={candles} />
            ) : (
              <div className="panel__empty">Waiting for candle data…</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
