import { Alert, Card, Col, Row, Spin, Statistic, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { HostMetrics } from '@tongpin/shared'

import { fetchHostMetrics } from '@/features/metrics/api'
import { formatBytes, formatClock, formatPercent } from '@/features/metrics/format'
import { MetricChart } from '@/features/metrics/MetricChart'
import type { MetricPoint } from '@/features/metrics/MetricChart'
import { appendSample } from '@/features/metrics/rolling'
import { useTheme } from '@/app/theme'
import type { ChartPalette } from '@/lib/chart-colors'
import { readChartPalette } from '@/lib/chart-colors'

const POLL_MS = 5_000
const MAX_POINTS = 60

export function HostPage(): React.JSX.Element {
  const { resolved } = useTheme()
  const [samples, setSamples] = useState<HostMetrics[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (): Promise<void> => {
    try {
      const sample = await fetchHostMetrics()
      setSamples((current) => appendSample(current, sample, MAX_POINTS))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取主机指标失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const run = async (): Promise<void> => {
      if (!active) return
      await load()
    }
    void run()
    const timer = setInterval(() => {
      void run()
    }, POLL_MS)
    return (): void => {
      active = false
      clearInterval(timer)
    }
  }, [load])

  const palette = useMemo<ChartPalette>((): ChartPalette => readChartPalette(), [resolved])

  const latest = samples.at(-1)
  const cpuPoints: MetricPoint[] = samples.map((sample) => ({
    label: formatClock(sample.sampledAt),
    value: sample.cpuPercent,
  }))
  const memoryPoints: MetricPoint[] = samples.map((sample) => ({
    label: formatClock(sample.sampledAt),
    value:
      sample.memoryTotalBytes === 0 ? 0 : (sample.memoryUsedBytes / sample.memoryTotalBytes) * 100,
  }))
  const connectionPoints: MetricPoint[] = samples.map((sample) => ({
    label: formatClock(sample.sampledAt),
    value: sample.connections,
  }))

  return (
    <div className="host">
      <header className="host-head">
        <div>
          <Typography.Title level={2} className="host-title">
            主机监控
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="host-subtitle">
            每 5 秒采样一次，页面保留最近 {MAX_POINTS} 个点；连接数当前用进行中会议的在线人数近似。
          </Typography.Paragraph>
        </div>
      </header>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Typography.Link onClick={() => void load()}>重试</Typography.Link>}
        />
      )}

      {loading && samples.length === 0 ? (
        <div className="host-loading">
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="CPU 使用率"
                  value={latest === undefined ? '—' : formatPercent(latest.cpuPercent)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="内存使用"
                  value={latest === undefined ? '—' : formatBytes(latest.memoryUsedBytes)}
                  suffix={
                    latest === undefined ? undefined : `/ ${formatBytes(latest.memoryTotalBytes)}`
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="在线连接（近似）"
                  value={latest?.connections ?? '—'}
                  suffix="个"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={8}>
              <Card title="CPU" size="small" className="host-card">
                <MetricChart
                  palette={palette}
                  data={cpuPoints}
                  color={palette.brand}
                  unit="%"
                  domain={[0, 100]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="内存" size="small" className="host-card">
                <MetricChart
                  palette={palette}
                  data={memoryPoints}
                  color={palette.success}
                  unit="%"
                  domain={[0, 100]}
                />
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="连接数" size="small" className="host-card">
                <MetricChart
                  palette={palette}
                  data={connectionPoints}
                  color={palette.warning}
                  unit=""
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
