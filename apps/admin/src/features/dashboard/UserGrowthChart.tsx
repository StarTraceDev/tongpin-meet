import type { AdminTrendPoint } from '@tongpin/shared/types'
import type { ReactElement, ReactNode } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ChartPalette } from '@/lib/chart-colors'
import { formatDay } from './format'

interface UserGrowthChartProps {
  points: AdminTrendPoint[]
  palette: ChartPalette
}

const AXIS_FONT_SIZE = 12
const AXIS_TICK = { fontSize: AXIS_FONT_SIZE }
const GRADIENT_ID = 'admin-user-growth'

export function UserGrowthChart({ points, palette }: UserGrowthChartProps): ReactElement {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.brand} stopOpacity={0.35} />
            <stop offset="100%" stopColor={palette.brand} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="count"
          name="新增用户"
          stroke={palette.brand}
          strokeWidth={2}
          fill={`url(#${GRADIENT_ID})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
