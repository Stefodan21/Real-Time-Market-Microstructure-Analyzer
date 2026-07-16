import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PricePoint } from '../types/market';

interface SpreadChartProps {
  data: PricePoint[];
}

const PRICE = '#3b82f6';

/** Line chart: live Yahoo price updates over time. */
export default function SpreadChart({ data }: SpreadChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          width={44}
          domain={['auto', 'auto']}
          unit=""
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1f2937',
            borderRadius: 8,
            color: '#e2e8f0',
          }}
          formatter={(value: number) => [`${value.toFixed(2)}`, 'Price']}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke={PRICE}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
