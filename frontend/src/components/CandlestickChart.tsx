import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Candle } from '../types/market';

interface CandlestickChartProps {
  data: Candle[];
}

const UP = '#22c55e';
const DOWN = '#ef4444';

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Candle;
}

/**
 * Custom candle glyph. The parent {@link Bar} is bound to the `[low, high]`
 * range, so `y`→`high` and `y + height`→`low`; we interpolate the open/close
 * body positions from that mapping.
 */
function CandleShape({ x = 0, y = 0, width = 0, height = 0, payload }: CandleShapeProps) {
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? UP : DOWN;

  const range = high - low || 1;
  const pixel = (v: number) => y + ((high - v) / range) * height;

  const bodyTop = pixel(Math.max(open, close));
  const bodyBottom = pixel(Math.min(open, close));
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const cx = x + width / 2;
  const bodyWidth = Math.max(1, width * 0.6);

  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={cx - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={0.5}
      />
    </g>
  );
}

interface CandleTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Candle }>;
}

function CandleTooltip({ active, payload }: CandleTooltipProps) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  const up = c.close >= c.open;
  return (
    <div className="candle-tooltip">
      <div className="candle-tooltip__time">{c.time}</div>
      <div className="candle-tooltip__row">
        <span>O</span>
        <b>{c.open.toFixed(2)}</b>
        <span>H</span>
        <b>{c.high.toFixed(2)}</b>
      </div>
      <div className="candle-tooltip__row">
        <span>L</span>
        <b>{c.low.toFixed(2)}</b>
        <span>C</span>
        <b style={{ color: up ? UP : DOWN }}>{c.close.toFixed(2)}</b>
      </div>
      <div className="candle-tooltip__vol">Vol {Math.round(c.volume).toLocaleString()}</div>
    </div>
  );
}

/** OHLC candlestick chart with a volume histogram underneath. */
export default function CandlestickChart({ data }: CandlestickChartProps) {
  const rows = data.map((d) => ({ ...d, range: [d.low, d.high] as [number, number] }));

  return (
    <div className="candles">
      <div className="candles__price">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" tick={false} height={0} />
            <YAxis
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              width={52}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip content={<CandleTooltip />} cursor={{ stroke: '#334155' }} />
            <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="candles__volume">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 0, right: 12, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis orientation="right" tick={{ fill: '#94a3b8', fontSize: 9 }} width={52} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #1f2937',
                borderRadius: 8,
                color: '#e2e8f0',
              }}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              formatter={(value: number) => [Math.round(value).toLocaleString(), 'Volume']}
            />
            <Bar dataKey="volume" isAnimationActive={false} radius={[1, 1, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.close >= r.open ? UP : DOWN} fillOpacity={0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
