import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import OrderBookChart from './components/OrderBookChart';
import SpreadChart from './components/SpreadChart';
import CandlestickChart from './components/CandlestickChart';
import type { Candle, MarketSnapshot, SpreadPoint, Ticker } from './types/market';
import .env from '../../backend/.env';
/** Backend stream endpoint; overridable via VITE_WS_URL at build time. */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/stream';

const MAX_SPREAD_POINTS = 60;
const MAX_CANDLES = 40;
/** Duration of each OHLC candle bucket, in milliseconds. */
const CANDLE_BUCKET_MS = 2000;

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

/** Best bid/ask mid price derived from the order book. */
function midPrice(snap: MarketSnapshot): number {
  let bestBid = 0;
  let bestAsk = Infinity;
  for (const level of snap.orderBook) {
    if (level.bidVolume > 0 && level.price > bestBid) bestBid = level.price;
    if (level.askVolume > 0 && level.price < bestAsk) bestAsk = level.price;
  }
  if (bestBid > 0 && bestAsk < Infinity) return (bestBid + bestAsk) / 2;
  if (bestBid > 0) return bestBid;
  return bestAsk < Infinity ? bestAsk : 0;
}

export default function App() {
  const [ticker, setTicker] = useState<Ticker>('AAPL');
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);

  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [spreadHistory, setSpreadHistory] = useState<SpreadPoint[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);

  const tickerRef = useRef(ticker);
  tickerRef.current = ticker;

  const processSnapshot = useCallback((snap: MarketSnapshot) => {
    // Ignore stale messages for a ticker we've since switched away from.
    if (snap.ticker !== tickerRef.current) return;

    setSnapshot(snap);

    setSpreadHistory((prev) => {
      const next: SpreadPoint = {
        time: timeLabel(snap.timestamp),
        ts: snap.timestamp,
        spreadBps: snap.spreadBps,
      };
      return [...prev, next].slice(-MAX_SPREAD_POINTS);
    });

    const mid = midPrice(snap);
    const volume = snap.orderBook.reduce((sum, l) => sum + l.bidVolume + l.askVolume, 0);

    setCandles((prev) => {
      const bucket = Math.floor(snap.timestamp / CANDLE_BUCKET_MS);
      const last = prev[prev.length - 1];

      // Same bucket as the last candle: update it live.
      if (last && Math.floor(last.ts / CANDLE_BUCKET_MS) === bucket) {
        const updated: Candle = {
          ...last,
          high: Math.max(last.high, mid),
          low: Math.min(last.low, mid),
          close: mid,
          volume: last.volume + volume,
        };
        return [...prev.slice(0, -1), updated];
      }

      // New bucket: open a fresh candle.
      const candle: Candle = {
        time: timeLabel(snap.timestamp),
        ts: snap.timestamp,
        open: mid,
        high: mid,
        low: mid,
        close: mid,
        volume,
      };
      return [...prev, candle].slice(-MAX_CANDLES);
    });
  }, []);

  // Reset per-ticker history when the selection changes.
  useEffect(() => {
    setSnapshot(null);
    setSpreadHistory([]);
    setCandles([]);
  }, [ticker]);

  // Manage the live feed: only use the backend WebSocket.
  useEffect(() => {
    if (!live) return;

    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        ws?.send(JSON.stringify({ type: 'subscribe', ticker: tickerRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const snap = JSON.parse(event.data as string) as MarketSnapshot;
          processSnapshot(snap);
        } catch {
          /* ignore malformed frames */
        }
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
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        ws.close();
      }
    };
  }, [live, ticker, processSnapshot]);

  return (
    <div className="app">
      <Header
        ticker={ticker}
        onTickerChange={setTicker}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        latencyMs={snapshot?.latencyMs ?? 0}
        connected={connected}
      />

      <main className="grid">
        <section className="panel panel--orderbook">
          <div className="panel__head">
            <h2>Order Book Depth</h2>
            <span className="panel__legend">
              <i className="dot dot--bid" /> Bids
              <i className="dot dot--ask" /> Asks
            </span>
          </div>
          <div className="panel__body">
            {snapshot ? (
              <OrderBookChart data={snapshot.orderBook} />
            ) : (
              <div className="panel__empty">Waiting for order book…</div>
            )}
          </div>
        </section>

        <section className="panel panel--spread">
          <div className="panel__head">
            <h2>Spread Tracker</h2>
            <span className="panel__legend">
              <i className="dot dot--spread" /> Spread (bps)
            </span>
          </div>
          <div className="panel__body">
            {spreadHistory.length > 0 ? (
              <SpreadChart data={spreadHistory} />
            ) : (
              <div className="panel__empty">Waiting for spread data…</div>
            )}
          </div>
        </section>

        <section className="panel panel--candles">
          <div className="panel__head">
            <h2>Price Candlestick</h2>
            <span className="panel__legend">
              <i className="dot dot--bid" /> Up
              <i className="dot dot--ask" /> Down
              <span className="panel__legend-text">OHLC + volume</span>
            </span>
          </div>
          <div className="panel__body">
            {candles.length > 0 ? (
              <CandlestickChart data={candles} />
            ) : (
              <div className="panel__empty">Building candles…</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
