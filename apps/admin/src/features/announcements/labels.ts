import type { AnnouncementItem } from '@tongpin/shared'

export type AnnouncementStatus = AnnouncementItem['status']

export interface AnnouncementStatusMeta {
  label: string
  color: string
}

const STATUS_META: Record<AnnouncementStatus, AnnouncementStatusMeta> = {
  SCHEDULED: { label: '定时中', color: 'blue' },
  PUBLISHED: { label: '已发布', color: 'green' },
  EXPIRED: { label: '已过期', color: 'default' },
}

export function announcementStatusMeta(status: AnnouncementStatus): AnnouncementStatusMeta {
  return STATUS_META[status]
}

export function formatAnnouncementTime(iso: string | null): string {
  if (iso === null) {
    return '—'
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/\//g, '-')
}
