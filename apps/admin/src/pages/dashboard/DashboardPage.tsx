import type {
  AdminRoomList,
  AdminStatsOverview,
  AdminTrend,
  AdminUsage,
} from '@tongpin/shared/types'
import { Alert, Button, Card, Col, Empty, Row, Spin, Statistic, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'

import { useTheme } from '../../app/theme'
import {
  fetchMeetingTrend,
  fetchOverview,
  fetchRooms,
  fetchUsage,
  fetchUserGrowth,
} from '../../features/dashboard/api'
import type { ChartPalette } from '../../features/dashboard/colors'
import { readChartPalette } from '../../features/dashboard/colors'
import { LiveRoomsTable } from '../../features/dashboard/LiveRoomsTable'
import { MeetingTrendChart } from '../../features/dashboard/MeetingTrendChart'
import { UsagePieChart } from '../../features/dashboard/UsagePieChart'
import { UserGrowthChart } from '../../features/dashboard/UserGrowthChart'

interface DashboardData {
  overview: AdminStatsOverview
  trend: AdminTrend
  growth: AdminTrend
  usage: AdminUsage
  rooms: AdminRoomList
}

type LoadStatus = 'loading' | 'ready' | 'error'

export function DashboardPage(): ReactElement {
  const { resolved } = useTheme()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect((): (() => void) => {
    let active = true
    setStatus('loading')
    setError('')

    void Promise.all([
      fetchOverview(),
      fetchMeetingTrend(),
      fetchUserGrowth(),
      fetchUsage(),
      fetchRooms(),
    ])
      .then(([overview, trend, growth, usage, rooms]) => {
        if (!active) {
          return
        }
        setData({ overview, trend, growth, usage, rooms })
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }
        setError(reason instanceof Error ? reason.message : '加载失败')
        setStatus('error')
      })

    return (): void => {
      active = false
    }
  }, [reloadKey])

  // 主题切换后 CSS 变量会变，recharts 只吃颜色值，所以靠 resolved 重新取一次
  const palette = useMemo<ChartPalette>((): ChartPalette => readChartPalette(), [resolved])

  const retry = (): void => {
    setReloadKey((value: number): number => value + 1)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div>
          <Typography.Title level={3} className="dashboard-title">
            仪表盘
          </Typography.Title>
          <Typography.Text type="secondary">
            近 14 天会议与用户趋势，以及正在进行的房间。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={retry} loading={status === 'loading'}>
          刷新
        </Button>
      </div>

      {status === 'error' ? (
        <Alert
          type="error"
          showIcon
          message="数据加载失败"
          description={error}
          action={
            <Button size="small" onClick={retry}>
              重试
            </Button>
          }
        />
      ) : null}

      {status === 'loading' && data === null ? (
        <div className="dashboard-loading">
          <Spin size="large" />
        </div>
      ) : null}

      {data === null ? null : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="用户总数" value={data.overview.usersTotal} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="会议总数" value={data.overview.meetingsTotal} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="进行中会议" value={data.overview.ongoingMeetings} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card>
                <Statistic title="在线人数" value={data.overview.onlineParticipants} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="dashboard-row">
            <Col xs={24} xl={12}>
              <Card
                title="会议趋势"
                extra={<Typography.Text type="secondary">近 14 天</Typography.Text>}
              >
                <MeetingTrendChart points={data.trend.points} palette={palette} />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                title="用户增长"
                extra={<Typography.Text type="secondary">近 14 天</Typography.Text>}
              >
                <UserGrowthChart points={data.growth.points} palette={palette} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="dashboard-row">
            <Col xs={24} xl={10}>
              <Card
                title="用量分布"
                extra={<Typography.Text type="secondary">按文件存储</Typography.Text>}
              >
                {data.usage.slices.length === 0 ? (
                  <Empty description="还没有上传文件" className="dashboard-empty" />
                ) : (
                  <UsagePieChart slices={data.usage.slices} palette={palette} />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={14}>
              <Card
                title="实时房间"
                extra={
                  <Typography.Text type="secondary">{data.rooms.items.length} 个</Typography.Text>
                }
              >
                <LiveRoomsTable rooms={data.rooms.items} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
