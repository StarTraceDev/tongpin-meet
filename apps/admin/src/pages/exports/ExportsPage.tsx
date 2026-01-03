import type { ExportOperationItem, ExportOperationList, ExportResource } from '@tongpin/shared'
import { App, Alert, Button, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'

import {
  EXPORT_RESOURCES,
  exportStatusMeta,
  formatExportTime,
  resourceLabel,
} from '@/features/exports/labels'
import { downloadExport, fetchExports, startExport } from '@/features/exports/api'

const PAGE_SIZE = 20

export function ExportsPage(): React.JSX.Element {
  const { message } = App.useApp()
  const [data, setData] = useState<ExportOperationList | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<ExportResource | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback((): void => setReloadKey((key) => key + 1), [])

  const hasActive = (data?.items ?? []).some(
    (item) => item.status === 'PENDING' || item.status === 'RUNNING',
  )

  useEffect(() => {
    let active = true
    void fetchExports({ page: 1, pageSize: PAGE_SIZE })
      .then((result): void => {
        if (!active) {
          return
        }
        setData(result)
        setError(null)
      })
      .catch((cause: unknown): void => {
        if (!active) {
          return
        }
        setError(cause instanceof Error ? cause.message : '导出任务加载失败')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return (): void => {
      active = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!hasActive) {
      return undefined
    }
    const id = setInterval((): void => {
      void fetchExports({ page: 1, pageSize: PAGE_SIZE }).then(setData)
    }, 2000)
    return (): void => {
      clearInterval(id)
    }
  }, [hasActive])

  const handleStart = (resource: ExportResource): void => {
    setStarting(resource)
    void startExport(resource)
      .then(() => {
        void message.success(`已创建${resourceLabel(resource)}导出任务`)
        reload()
      })
      .catch((cause: unknown): void => {
        void message.error(cause instanceof Error ? cause.message : '导出任务创建失败')
      })
      .finally(() => setStarting(null))
  }

  const handleDownload = (item: ExportOperationItem): void => {
    setDownloading(item.id)
    void downloadExport(item.id)
      .then((text) => {
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = item.result?.fileName ?? `${item.id}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
      })
      .catch((cause: unknown): void => {
        void message.error(cause instanceof Error ? cause.message : '下载失败')
      })
      .finally(() => setDownloading(null))
  }

  const columns: ColumnsType<ExportOperationItem> = [
    {
      title: '类型',
      key: 'resource',
      width: 120,
      render: (_value, item) => `${resourceLabel(item.resource)}导出`,
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_value, item): React.JSX.Element => {
        const meta = exportStatusMeta(item.status)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 160,
      render: (_value, item): React.JSX.Element => (
        <Progress
          percent={item.progress}
          size="small"
          status={item.status === 'FAILED' ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: '创建时间',
      key: 'createdAt',
      width: 150,
      render: (_value, item) => formatExportTime(item.createdAt),
    },
    {
      title: '完成时间',
      key: 'finishedAt',
      width: 150,
      render: (_value, item) => formatExportTime(item.finishedAt),
    },
    {
      title: '行数',
      key: 'rows',
      width: 100,
      render: (_value, item) => (item.result === null ? '—' : item.result.rowCount),
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      render: (_value, item): React.JSX.Element =>
        item.status === 'SUCCEEDED' ? (
          <Button
            type="link"
            size="small"
            loading={downloading === item.id}
            onClick={() => handleDownload(item)}
          >
            下载
          </Button>
        ) : (
          <Typography.Text type="secondary">
            {item.status === 'FAILED' ? (item.error ?? '生成失败') : '生成中'}
          </Typography.Text>
        ),
    },
  ]

  return (
    <div className="exports">
      <header className="exports-head">
        <div>
          <Typography.Title level={3} className="exports-title">
            下载中心
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="exports-subtitle">
            导出任务在服务端排队生成，完成后可在这里下载 CSV。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          {EXPORT_RESOURCES.map((resource) => (
            <Button
              key={resource.value}
              icon={<DownloadOutlined />}
              loading={starting === resource.value}
              onClick={() => handleStart(resource.value)}
            >
              导出{resource.label}
            </Button>
          ))}
        </Space>
      </header>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={reload}>
              重试
            </Button>
          }
        />
      )}

      <Table<ExportOperationItem>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{ emptyText: '还没有导出任务' }}
      />

      {data !== null && data.total > PAGE_SIZE && (
        <Typography.Paragraph type="secondary" className="exports-total">
          共 {data.total} 个任务，仅展示最近 {PAGE_SIZE} 个。
        </Typography.Paragraph>
      )}
    </div>
  )
}
