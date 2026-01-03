import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { AuditLogItem } from '@tongpin/shared'

import { fetchAuditLog, fetchAuditLogs } from '@/features/audit/api'
import { startExport } from '@/features/exports/api'
import { formatAuditTime, formatTarget } from '@/features/audit/format'

const { RangePicker } = DatePicker

type Range = { from: string; to: string }

export function AuditLogsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<Range | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AuditLogItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await fetchAuditLogs({
        page,
        pageSize,
        ...(keyword === '' ? {} : { action: keyword }),
        ...(range === null ? {} : { from: range.from, to: range.to }),
      })
      setItems(result.items)
      setTotal(result.total)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取审计日志失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, range])

  useEffect(() => {
    void reload()
  }, [reload])

  const openDetail = async (id: string): Promise<void> => {
    try {
      const item = await fetchAuditLog(id)
      setDetail(item)
      setDetailOpen(true)
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '读取详情失败')
    }
  }

  const exportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      await startExport('audit-logs')
      void message.success('已创建导出任务，请在下载中心查看')
      navigate('/exports')
    } catch (cause) {
      void message.error(cause instanceof Error ? cause.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      render: (value: string) => formatAuditTime(value),
    },
    {
      title: '操作者',
      key: 'actor',
      width: 160,
      render: (_value, item) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{item.actorName ?? '未知用户'}</Typography.Text>
          <Typography.Text type="secondary" className="audit-actor-id">
            {item.actorId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: '目标',
      key: 'target',
      width: 200,
      render: (_value, item) => (
        <Typography.Text type="secondary">
          {formatTarget(item.targetType, item.targetId)}
        </Typography.Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (value: string | null) => value ?? '—',
    },
    {
      title: '来源',
      dataIndex: 'ua',
      key: 'ua',
      ellipsis: true,
      render: (value: string | null) => (value === null ? '—' : <span title={value}>{value}</span>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      render: (_value, item) => (
        <Button type="link" size="small" onClick={() => void openDetail(item.id)}>
          详情
        </Button>
      ),
    },
  ]

  const json = detail === null ? '' : JSON.stringify(detail.detail ?? null, null, 2)

  return (
    <div className="audit">
      <header className="audit-head">
        <div>
          <Typography.Title level={2} className="audit-title">
            审计日志
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="audit-subtitle">
            管理台关键操作留痕，只读；导出任务在下载中心生成并下载（最近 5000 条）。
          </Typography.Paragraph>
        </div>
        <Button loading={exporting} onClick={() => void exportCsv()}>
          导出 CSV
        </Button>
      </header>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={() => void reload()}>
              重试
            </Button>
          }
        />
      )}

      <Space wrap className="audit-filters">
        <Input.Search
          allowClear
          placeholder="按动作筛选，如 meeting.force-end"
          className="audit-keyword"
          onSearch={(value) => {
            setPage(1)
            setKeyword(value.trim())
          }}
        />
        <RangePicker
          onChange={(_dates, strings) => {
            setPage(1)
            setRange(
              strings[0] === '' || strings[1] === ''
                ? null
                : {
                    from: `${strings[0]}T00:00:00+08:00`,
                    to: `${strings[1]}T23:59:59+08:00`,
                  },
            )
          }}
        />
      </Space>

      <Table<AuditLogItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1180 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `共 ${count} 条`,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage)
            setPageSize(nextSize)
          },
        }}
        locale={{ emptyText: '没有符合条件的审计记录' }}
      />

      <Drawer open={detailOpen} width={560} title="审计详情" onClose={() => setDetailOpen(false)}>
        {detail !== null && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="时间">
                {formatAuditTime(detail.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="操作者">
                {detail.actorName ?? '未知用户'}（{detail.actorId}）
              </Descriptions.Item>
              <Descriptions.Item label="动作">
                <Tag>{detail.action}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="目标">
                {formatTarget(detail.targetType, detail.targetId)}
              </Descriptions.Item>
              <Descriptions.Item label="IP">{detail.ip ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="UA">{detail.ua ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} className="audit-detail-title">
              变更详情
            </Typography.Title>
            <pre className="audit-json">{json}</pre>
          </>
        )}
      </Drawer>
    </div>
  )
}
