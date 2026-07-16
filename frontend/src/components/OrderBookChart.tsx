import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OrderBookLevel } from '../types/market';

interface OrderBookChartProps {
  data: OrderBookLevel[];
}

const BID = '#22c55e';
const ASK = '#ef4444';

/** Depth chart: bid volumes (green) vs ask volumes (red) per price level. */
export default function OrderBookChart({ data }: OrderBookChartProps) {
  // Merge bid/ask into a single "volume" per price for a diverging bar look.
  const rows = data.map((level) => ({
    price: level.price.toFixed(2),
    volume: level.bidVolume > 0 ? level.bidVolume : level.askVolume,
    side: level.bidVolume > 0 ? 'bid' : 'ask',
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="price"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={44} />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: 8,
            color: '#e2e8f0',
          }}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          formatter={(value: number, _n, item) => [
            value.toLocaleString(),
            (item?.payload as { side: string }).side === 'bid' ? 'Bid volume' : 'Ask volume',
          ]}
        />
        <Bar dataKey="volume" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {rows.map((row, i) => (
            <Cell key={i} fill={row.side === 'bid' ? BID : ASK} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
