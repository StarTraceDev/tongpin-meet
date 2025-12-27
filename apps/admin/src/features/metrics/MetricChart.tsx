import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ChartPalette } from '@/lib/chart-colors'

export type MetricPoint = { label: string; value: number }

type Props = {
  palette: ChartPalette
  data: readonly MetricPoint[]
  color: string
  unit: string
  domain?: [number, number]
  height?: number
}

export function MetricChart({
  palette,
  data,
  color,
  unit,
  domain,
  height = 220,
}: Props): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={[...data]} margin={{ top: 8, right: 28, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={palette.border} strokeDasharray="3 6" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: palette.text }} minTickGap={24} />
        <YAxis
          width={52}
          domain={domain ?? ['auto', 'auto']}
          allowDecimals={false}
          tick={{ fontSize: 12, fill: palette.text }}
        />
        <Tooltip
          contentStyle={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            color: palette.text,
          }}
          formatter={(value: unknown): string =>
            `${typeof value === 'number' ? value.toFixed(1) : String(value)}${unit}`
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
