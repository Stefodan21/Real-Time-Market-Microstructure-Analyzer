import { Field, Root, Type } from 'protobufjs/light';
import type { YahooPricingData } from '../types/market';

interface YahooWebSocketFrame {
  message?: string;
  error?: string;
  raw_base64?: string;
}

const pricingDataType = new Type('PricingData')
  .add(new Field('id', 1, 'string'))
  .add(new Field('price', 2, 'float'))
  .add(new Field('time', 3, 'sint64'))
  .add(new Field('currency', 4, 'string'))
  .add(new Field('exchange', 5, 'string'))
  .add(new Field('quote_type', 6, 'int32'))
  .add(new Field('market_hours', 7, 'int32'))
  .add(new Field('change_percent', 8, 'float'))
  .add(new Field('day_volume', 9, 'sint64'))
  .add(new Field('day_high', 10, 'float'))
  .add(new Field('day_low', 11, 'float'))
  .add(new Field('change', 12, 'float'))
  .add(new Field('short_name', 13, 'string'))
  .add(new Field('expire_date', 14, 'sint64'))
  .add(new Field('open_price', 15, 'float'))
  .add(new Field('previous_close', 16, 'float'))
  .add(new Field('strike_price', 17, 'float'))
  .add(new Field('underlying_symbol', 18, 'string'))
  .add(new Field('open_interest', 19, 'sint64'))
  .add(new Field('options_type', 20, 'sint64'))
  .add(new Field('mini_option', 21, 'bool'))
  .add(new Field('last_size', 22, 'sint64'))
  .add(new Field('bid', 23, 'float'))
  .add(new Field('bid_size', 24, 'sint64'))
  .add(new Field('ask', 25, 'float'))
  .add(new Field('ask_size', 26, 'sint64'))
  .add(new Field('price_hint', 27, 'sint64'))
  .add(new Field('vol_24hr', 28, 'sint64'))
  .add(new Field('vol_all_currencies', 29, 'sint64'))
  .add(new Field('from_currency', 30, 'string'))
  .add(new Field('last_market', 31, 'string'))
  .add(new Field('circulating_supply', 32, 'double'))
  .add(new Field('market_cap', 33, 'double'));

const root = new Root().add(pricingDataType);

function normalizeSymbols(symbols: string | readonly string[]): string[] {
  return typeof symbols === 'string' ? [symbols] : Array.from(symbols);
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function decodeYahooPricingMessage(eventData: string): YahooPricingData | null {
  try {
    const frame = JSON.parse(eventData) as YahooWebSocketFrame;
    if (!frame.message) return null;

    const messageType = root.lookupType('PricingData');
    const decoded = messageType.decode(decodeBase64ToBytes(frame.message));
    return messageType.toObject(decoded, {
      longs: Number,
      enums: Number,
      defaults: true,
    }) as YahooPricingData;
  } catch {
    return null;
  }
}

export function buildSubscribeMessage(symbols: string | readonly string[]): string {
  return JSON.stringify({ subscribe: normalizeSymbols(symbols) });
}

export function buildUnsubscribeMessage(symbols: string | readonly string[]): string {
  return JSON.stringify({ unsubscribe: normalizeSymbols(symbols) });
}