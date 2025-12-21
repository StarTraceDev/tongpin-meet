import type { AdminUserItem } from '@tongpin/shared'

export interface UserStatusMeta {
  label: string
  color: string
}

export function userStatusMeta(status: AdminUserItem['status']): UserStatusMeta {
  return status === 'ACTIVE' ? { label: '正常', color: 'green' } : { label: '已禁用', color: 'red' }
}

const dateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 最近登录只到分钟，没登录过给破折号 */
export function formatLastLogin(iso: string | null): string {
  if (iso === null) {
    return '—'
  }
  return dateTime.format(new Date(iso)).replace(/\//g, '-')
}
