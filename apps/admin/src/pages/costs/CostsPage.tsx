import { Alert, Card, Col, Row, Segmented, Spin, Statistic, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Costs } from '@tongpin/shared'

import { useTheme } from '@/app/theme'
import { fetchCosts } from '@/features/costs/api'
import { formatCostDay, formatMoney, formatMoneyTick } from '@/features/costs/format'
import type { ChartPalette } from '@/lib/chart-colors'
import { readChartPalette } from '@/lib/chart-colors'

const RANGE_OPTIONS = [
  { label: '7 天', value: 7 },
  { label: '14 天', value: 14 },
  { label: '30 天', value: 30 },
]

const SERIES = [
  { key: 'aiCents', name: 'AI', color: 'brand' },
  { key: 'meetingCents', name: '会议', color: 'success' },
  { key: 'smsCents', name: '短信', color: 'warning' },
  { key: 'storageCents', name: '存储', color: 'muted' },
] as const

export function CostsPage(): React.JSX.Element {
  const { resolved } = useTheme()
  const [days, setDays] = useState(14)
  const [data, setData] = useState<Costs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (range: number): Promise<void> => {
    setLoading(true)
    try {
      setData(await fetchCosts(range))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取成本失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const run = async (): Promise<void> => {
      if (!active) return
      await load(days)
    }
    void run()
    return (): void => {
      active = false
    }
  }, [days, load])

  const palette = useMemo<ChartPalette>((): ChartPalette => readChartPalette(), [resolved])
  const colorOf: Record<string, string> = {
    brand: palette.brand,
    success: palette.success,
    warning: palette.warning,
    muted: palette.muted,
  }
  const totals = data?.totals ?? { aiCents: 0, meetingCents: 0, smsCents: 0, storageCents: 0 }
  const total = totals.aiCents + totals.meetingCents + totals.smsCents + totals.storageCents

  return (
    <div className="costs">
      <header className="costs-head">
        <div>
          <Typography.Title level={2} className="costs-title">
            成本统计
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="costs-subtitle">
            AI 费用取用量表实额；会议/短信/存储按系统配置里的单价换算（
            <Typography.Text code>cost.*_cents</Typography.Text>，未配置记 0）。
          </Typography.Paragraph>
        </div>
        <Segmented
          options={RANGE_OPTIONS}
          value={days}
          onChange={(value) => setDays(Number(value))}
        />
      </header>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Typography.Link onClick={() => void load(days)}>重试</Typography.Link>}
        />
      )}

      {loading && data === null ? (
        <div className="costs-loading">
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={8}>
              <Card>
                <Statistic title="总成本" value={formatMoney(total)} />
              </Card>
            </Col>
            {SERIES.map((series) => (
              <Col xs={24} sm={12} xl={4} key={series.key}>
                <Card>
                  <Statistic title={series.name} value={formatMoney(totals[series.key])} />
                </Card>
              </Col>
            ))}
          </Row>

          {total === 0 && (
            <Alert
              type="info"
              showIcon
              message="还没有成本数据"
              description="到系统配置里新增 cost.meeting_per_minute_cents / cost.sms_per_message_cents / cost.storage_per_gb_day_cents，AI 费用会随用量自动出现。"
            />
          )}

          <Card title="按天成本" size="small">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data?.days ?? []} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={palette.border} strokeDasharray="3 6" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string): string => formatCostDay(value)}
                  tick={{ fontSize: 12, fill: palette.text }}
                  minTickGap={16}
                />
                <YAxis
                  width={64}
                  tickFormatter={(value: number): string => formatMoneyTick(value)}
                  tick={{ fontSize: 12, fill: palette.text }}
                />
                <Tooltip
                  cursor={{ fill: palette.brandSoft }}
                  contentStyle={{
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 8,
                    color: palette.text,
                  }}
                  labelFormatter={(label: unknown): string =>
                    typeof label === 'string' ? label : ''
                  }
                  formatter={(value: unknown, name: unknown): [string, string] => {
                    const cents = typeof value === 'number' ? value : 0
                    const seriesName =
                      SERIES.find((item) => item.key === name)?.name ?? String(name)
                    return [formatMoney(cents), seriesName]
                  }}
                />
                {SERIES.map((series) => (
                  <Bar
                    key={series.key}
                    dataKey={series.key}
                    name={series.key}
                    stackId="cost"
                    fill={colorOf[series.color]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="costs-legend">
              {SERIES.map((series) => (
                <span key={series.key} className="costs-legend-item">
                  <i style={{ background: colorOf[series.color] }} />
                  {series.name}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
