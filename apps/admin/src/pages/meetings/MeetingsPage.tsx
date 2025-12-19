import type { AdminMeetingItem, AdminMeetingList, MeetingStatusValue } from '@tongpin/shared/types'
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router'

import { fetchMeetings, forceEndMeeting } from '../../features/meetings/api'
import { formatMeetingTime } from '../../features/meetings/format'
import type { MeetingListQuery } from '../../features/meetings/query'
import { meetingQueryString, parseMeetingQuery, withQuery } from '../../features/meetings/query'
import { canForceEnd, statusMeta } from '../../features/meetings/status'

const STATUS_OPTIONS: { value: 'all' | MeetingStatusValue; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'SCHEDULED', label: '预定中' },
  { value: 'ONGOING', label: '进行中' },
  { value: 'ENDED', label: '已结束' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXPIRED', label: '已过期' },
]

type TableChange = NonNullable<TableProps<AdminMeetingItem>['onChange']>

export function MeetingsPage(): ReactElement {
  const { message } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = parseMeetingQuery(searchParams)
  const search = searchParams.toString()

  const [data, setData] = useState<AdminMeetingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [active, setActive] = useState<AdminMeetingItem | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)

  useEffect((): (() => void) => {
    let live = true
    setLoading(true)
    setError('')

    fetchMeetings(parseMeetingQuery(new URLSearchParams(search)))
      .then((result) => {
        if (live) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((reason: unknown) => {
        if (live) {
          setError(reason instanceof Error ? reason.message : '加载失败')
          setLoading(false)
        }
      })

    return (): void => {
      live = false
    }
  }, [search, reloadKey])

  const apply = (patch: Partial<MeetingListQuery>): void => {
    const encoded = meetingQueryString(withQuery(parseMeetingQuery(searchParams), patch))
    setSearchParams(new URLSearchParams(encoded))
  }

  const handleTableChange: TableChange = (pagination, _filters, sorter): void => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter
    const nextSort =
      single?.order === 'ascend' ? 'startAt' : single?.order === 'descend' ? '-startAt' : '-startAt'
    apply({
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
      sort: nextSort,
    })
  }

  const handleForceEnd = async (row: AdminMeetingItem): Promise<void> => {
    setEndingId(row.id)
    try {
      await forceEndMeeting(row.id)
      message.success(`已结束「${row.title}」`)
      setActive(null)
      setReloadKey((value: number): number => value + 1)
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '结束会议失败')
    } finally {
      setEndingId(null)
    }
  }

  const columns: TableProps<AdminMeetingItem>['columns'] = [
    { title: '会议号', dataIndex: 'meetingNo', width: 120 },
    { title: '主题', dataIndex: 'title', ellipsis: true },
    { title: '主持人', dataIndex: 'hostName', width: 130 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: MeetingStatusValue): ReactElement => {
        const meta = statusMeta(status)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startAt',
      width: 180,
      sorter: true,
      sortOrder: query.sort === 'startAt' ? 'ascend' : query.sort === '-startAt' ? 'descend' : null,
      render: (value: string): string => formatMeetingTime(value),
    },
    { title: '人数', dataIndex: 'participantCount', width: 80, align: 'right' },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_value: unknown, row: AdminMeetingItem): ReactElement => (
        <Space size="small">
          <Button type="link" size="small" onClick={(): void => setActive(row)}>
            详情
          </Button>
          {canForceEnd(row.status) ? (
            <Popconfirm
              title="强制结束这场会议？"
              description="会内所有成员会被移出，且不可恢复。"
              okText="结束"
              cancelText="取消"
              onConfirm={(): Promise<void> => handleForceEnd(row)}
            >
              <Button type="link" size="small" danger loading={endingId === row.id}>
                强制结束
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div className="meetings">
      <div className="meetings-head">
        <div>
          <Typography.Title level={3} className="dashboard-title">
            会议管理
          </Typography.Title>
          <Typography.Text type="secondary">筛选、排序与分页都写在地址栏里。</Typography.Text>
        </div>
      </div>

      <div className="meetings-filters">
        <Input.Search
          key={query.keyword}
          className="meetings-keyword"
          allowClear
          defaultValue={query.keyword}
          placeholder="搜索会议号或主题"
          onSearch={(value: string): void => apply({ keyword: value.trim(), page: 1 })}
        />
        <Select
          className="meetings-status"
          value={query.status ?? 'all'}
          options={STATUS_OPTIONS}
          onChange={(value: 'all' | MeetingStatusValue): void =>
            apply({ status: value === 'all' ? undefined : value, page: 1 })
          }
        />
      </div>

      {error === '' ? null : (
        <Alert
          type="error"
          showIcon
          message="会议列表加载失败"
          description={error}
          action={
            <Button size="small" onClick={(): void => setReloadKey((value: number) => value + 1)}>
              重试
            </Button>
          }
        />
      )}

      <Table<AdminMeetingItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        onChange={handleTableChange}
        locale={{ emptyText: '没有符合条件的会议' }}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total: number): string => `共 ${total} 场`,
        }}
        scroll={{ x: 900 }}
      />

      <Drawer
        open={active !== null}
        width={420}
        title="会议详情"
        onClose={(): void => setActive(null)}
      >
        {active === null ? null : (
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              { key: 'no', label: '会议号', children: active.meetingNo },
              { key: 'title', label: '主题', children: active.title },
              { key: 'host', label: '主持人', children: active.hostName },
              {
                key: 'status',
                label: '状态',
                children: (
                  <Tag color={statusMeta(active.status).color}>
                    {statusMeta(active.status).label}
                  </Tag>
                ),
              },
              { key: 'start', label: '计划开始', children: formatMeetingTime(active.startAt) },
              {
                key: 'actualStart',
                label: '实际开始',
                children: formatMeetingTime(active.actualStartAt),
              },
              {
                key: 'actualEnd',
                label: '实际结束',
                children: formatMeetingTime(active.actualEndAt),
              },
              { key: 'count', label: '参会人数', children: active.participantCount },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}
