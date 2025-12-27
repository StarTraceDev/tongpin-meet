import type { AdminTrendPoint } from '@tongpin/shared/types'
import type { ReactElement, ReactNode } from 'react'
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
import { formatDay } from './format'

interface MeetingTrendChartProps {
  points: AdminTrendPoint[]
  palette: ChartPalette
}

const AXIS_FONT_SIZE = 12
const AXIS_TICK = { fontSize: AXIS_FONT_SIZE }

export function MeetingTrendChart({ points, palette }: MeetingTrendChartProps): ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={palette.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          minTickGap={16}
          tick={{ ...AXIS_TICK, fill: palette.text }}
          stroke={palette.border}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ ...AXIS_TICK, fill: palette.text }}
          stroke={palette.border}
          tickLine={false}
        />
        <Tooltip
          labelFormatter={(label: unknown): ReactNode =>
            typeof label === 'string' ? formatDay(label) : null
          }
          contentStyle={{
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.text,
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="会议数"
          stroke={palette.brand}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
