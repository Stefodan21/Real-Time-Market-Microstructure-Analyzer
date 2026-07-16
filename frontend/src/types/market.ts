/** Shared domain types for the Market Microstructure Analyzer. */

/** A single price level in the order book. */
export interface OrderBookLevel {
  /** Price at this level. */
  price: number;
  /** Aggregated resting bid volume at this price. */
  bidVolume: number;
  /** Aggregated resting ask volume at this price. */
  askVolume: number;
}

/** A time-stamped bid-ask spread sample, measured in basis points. */
export interface SpreadPoint {
  /** Human readable HH:MM:SS label used on the X-axis. */
  time: string;
  /** Epoch milliseconds for ordering. */
  ts: number;
  /** Spread in basis points. */
  spreadBps: number;
}

/** A single OHLC candle with aggregated volume for one time bucket. */
export interface Candle {
  /** Human readable HH:MM:SS label used on the X-axis. */
  time: string;
  /** Epoch milliseconds of the bucket start (used for bucketing/ordering). */
  ts: number;
  /** Mid price at the start of the bucket. */
  open: number;
  /** Highest mid price during the bucket. */
  high: number;
  /** Lowest mid price during the bucket. */
  low: number;
  /** Most recent mid price in the bucket. */
  close: number;
  /** Total traded/observed volume aggregated over the bucket. */
  volume: number;
}

/** A full snapshot pushed from the backend. */
export interface MarketSnapshot {
  ticker: string;
  /** Epoch milliseconds when the snapshot was produced. */
  timestamp: number;
  /** Order book depth, ordered from lowest to highest price. */
  orderBook: OrderBookLevel[];
  /** Bid-ask spread in basis points. */
  spreadBps: number;
  /** End-to-end refresh latency in milliseconds. */
  latencyMs: number;
}

/** Tickers selectable in the header. */
export const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'] as const;
export type Ticker = (typeof TICKERS)[number];
