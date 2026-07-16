/** Shared domain types for the Market Microstructure Analyzer. */

/** Yahoo websocket payload decoded by yfinance AsyncWebSocket. */
export interface YahooPricingData {
  id: string;
  price: number;
  time: number | string;
  currency: string;
  exchange: string;
  quote_type: number;
  market_hours: number;
  change_percent: number;
  day_volume: number | string;
  day_high: number;
  day_low: number;
  change: number;
  short_name: string;
  expire_date: number | string;
  open_price: number;
  previous_close: number;
  strike_price: number;
  underlying_symbol: string;
  open_interest: number | string;
  options_type: number;
  mini_option: boolean;
  last_size: number | string;
  bid: number;
  bid_size: number | string;
  ask: number;
  ask_size: number | string;
  price_hint: number | string;
  vol_24hr: number | string;
  vol_all_currencies: number | string;
  from_currency: string;
  last_market: string;
  circulating_supply: number;
  market_cap: number | string;
}

/** Error payload produced when the websocket decoder cannot parse a message. */
export interface YahooErrorMessage {
  error: string;
  raw_base64: string;
}

/** Union of supported websocket messages. */
export type YahooWebSocketMessage = YahooPricingData | YahooErrorMessage;

/** A time-stamped live price sample for the line chart. */
export interface PricePoint {
  time: string;
  ts: number;
  price: number;
  changePercent: number;
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

/** Tickers selectable in the header. */
export const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'] as const;
export type Ticker = (typeof TICKERS)[number];
