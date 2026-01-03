import type { ExportOperationItem, ExportResource } from '@tongpin/shared'

export const EXPORT_RESOURCES: { value: ExportResource; label: string }[] = [
  { value: 'meetings', label: '会议' },
  { value: 'users', label: '用户' },
  { value: 'audit-logs', label: '审计日志' },
  { value: 'feedbacks', label: '反馈' },
]

export function resourceLabel(resource: ExportResource): string {
  return EXPORT_RESOURCES.find((item) => item.value === resource)?.label ?? resource
}

const STATUS_META: Record<ExportOperationItem['status'], { label: string; color: string }> = {
  PENDING: { label: '排队中', color: 'default' },
  RUNNING: { label: '生成中', color: 'processing' },
  SUCCEEDED: { label: '已完成', color: 'green' },
  FAILED: { label: '失败', color: 'red' },
}

export function exportStatusMeta(status: ExportOperationItem['status']): {
  label: string
  color: string
} {
  return STATUS_META[status]
}

export function formatExportTime(iso: string | null): string {
  if (iso === null) {
    return '—'
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/\//g, '-')
}
