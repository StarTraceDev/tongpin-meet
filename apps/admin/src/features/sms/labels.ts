import type { SmsLogItem } from '@tongpin/shared'

export function smsLogStatusMeta(status: SmsLogItem['status']): {
  label: string
  color: string
} {
  return status === 'SENT' ? { label: '已发送', color: 'green' } : { label: '失败', color: 'red' }
}

export function formatSmsTime(iso: string): string {
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
