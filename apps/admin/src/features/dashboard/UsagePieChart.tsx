import type { AdminUsageSlice } from '@tongpin/shared/types'
import type { ReactElement } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { ChartPalette } from './colors'
import { formatBytes } from './format'

interface UsagePieChartProps {
  slices: AdminUsageSlice[]
  palette: ChartPalette
}

const INNER_RADIUS = 52
const OUTER_RADIUS = 80
const CHART_HEIGHT = 220

export function UsagePieChart({ slices, palette }: UsagePieChartProps): ReactElement {
  const colors = [palette.brand, palette.brandSoft, palette.success, palette.warning, palette.muted]
  const total = slices.reduce((sum: number, slice) => sum + slice.value, 0)
  const colorOf = (index: number): string => colors[index % colors.length] ?? palette.brand

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={INNER_RADIUS}
            outerRadius={OUTER_RADIUS}
            paddingAngle={2}
            stroke={palette.surface}
          >
            {slices.map((slice, index) => (
              <Cell key={slice.name} fill={colorOf(index)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown): string =>
              formatBytes(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={{
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.text,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="usage-legend">
        {slices.map((slice, index) => (
          <li key={slice.name} className="usage-legend-item">
            <span className="usage-legend-dot" style={{ background: colorOf(index) }} />
            <span className="usage-legend-name">{slice.name}</span>
            <span className="usage-legend-value">{formatBytes(slice.value)}</span>
            <span className="usage-legend-percent">
              {total === 0 ? '0%' : `${Math.round((slice.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
