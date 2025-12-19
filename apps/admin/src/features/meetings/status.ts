import type { MeetingStatusValue } from '@tongpin/shared/types'

interface StatusMeta {
  label: string
  color: string
}

const STATUS_META: Record<MeetingStatusValue, StatusMeta> = {
  SCHEDULED: { label: '预定中', color: 'blue' },
  ONGOING: { label: '进行中', color: 'green' },
  ENDED: { label: '已结束', color: 'default' },
  CANCELLED: { label: '已取消', color: 'red' },
  EXPIRED: { label: '已过期', color: 'orange' },
}

export function statusMeta(status: MeetingStatusValue): StatusMeta {
  return STATUS_META[status]
}

/** 只有进行中的会议能强制结束，与后端 canRunMeetingAction(status, 'end') 一致 */
export function canForceEnd(status: MeetingStatusValue): boolean {
  return status === 'ONGOING'
}
