import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import SpreadChart from './components/SpreadChart';
import CandlestickChart from './components/CandlestickChart';
import type { Candle, PricePoint, Ticker, YahooPricingData } from './types/market';
import { buildSubscribeMessage, decodeYahooPricingMessage } from './utils/yahooWebSocket';
/** WebSocket endpoint provided via VITE_WS_URL. */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'wss://streamer.finance.yahoo.com/?version=2';
const SUBSCRIPTION_INTERVAL_MS = 15_000;

const MAX_PRICE_POINTS = 60;
const MAX_CANDLES = 40;
/** Duration of each OHLC candle bucket, in milliseconds. */
const CANDLE_BUCKET_MS = 2000;

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function toNumber(value: number | string | boolean | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
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

  const processMessage = useCallback((message: YahooPricingData) => {
    // Ignore stale messages for a ticker we've since switched away from.
    if (message.id !== tickerRef.current) return;

    const ts = toNumber(message.time) * 1000;
    const price = toNumber(message.price);
    const high = toNumber(message.day_high) || price;
    const low = toNumber(message.day_low) || price;
    const open = toNumber(message.open_price) || toNumber(message.previous_close) || price;
    const close = price;
    const volume = toNumber(message.day_volume);

    setLatestQuote(message);

    setPriceHistory((prev) => {
      const next: PricePoint = {
        time: timeLabel(ts),
        ts,
        price,
        changePercent: toNumber(message.change_percent),
      };
      return [...prev, next].slice(-MAX_PRICE_POINTS);
    });

    setCandles((prev) => {
      const bucket = Math.floor(ts / CANDLE_BUCKET_MS);
      const last = prev[prev.length - 1];

      // Same bucket as the last candle: update it live.
      if (last && Math.floor(last.ts / CANDLE_BUCKET_MS) === bucket) {
        const updated: Candle = {
          ...last,
          high: Math.max(last.high, high),
          low: Math.min(last.low, low),
          close,
          volume: last.volume + volume,
        };
        return [...prev.slice(0, -1), updated];
      }

      // New bucket: open a fresh candle.
      const candle: Candle = {
        time: timeLabel(ts),
        ts,
        open,
        high,
        low,
        close,
        volume,
      };
      return [...prev, candle].slice(-MAX_CANDLES);
    });
  }, []);

  // Reset per-ticker history when the selection changes.
  useEffect(() => {
    setLatestQuote(null);
    setPriceHistory([]);
    setCandles([]);
  }, [ticker]);

  // Manage the live feed: only use the backend WebSocket.
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
        ws?.send(buildSubscribeMessage(tickerRef.current));

        heartbeat = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(buildSubscribeMessage(tickerRef.current));
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
  }, [live, ticker, processMessage]);

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
