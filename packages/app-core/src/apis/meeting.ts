import type {
  ListMeetingsQuery,
  Meeting,
  MeetingJoinResult,
  MeetingWaiting,
  Paginated,
} from '@tongpin/shared/types'

import { request } from './http'

/** 会议列表。字段名对齐 04 §5.3 的 query 参数，组件里不再手拼 URL（O3） */
export function listMeetings(query: Partial<ListMeetingsQuery> = {}): Promise<Paginated<Meeting>> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('pageSize', String(query.pageSize ?? 20))
  if (query.scope !== undefined) params.set('scope', query.scope)
  if (query.status !== undefined) params.set('status', query.status)
  if (query.keyword !== undefined && query.keyword.trim() !== '') {
    params.set('keyword', query.keyword.trim())
  }
  return request<Paginated<Meeting>>(`/meetings?${params.toString()}`)
}

/** 会议详情（进会议室时拿标题/会议号/主持人） */
export function getMeeting(id: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${encodeURIComponent(id)}`)
}

/** 入会：拿到 participant 与 RTC token；等候室返回 { waiting: true, entryId } */
export function joinMeeting(
  id: string,
  options: { password?: string } = {},
): Promise<MeetingJoinResult | MeetingWaiting> {
  return request<MeetingJoinResult | MeetingWaiting>(`/meetings/${encodeURIComponent(id)}:join`, {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

/** 离会；已离会时服务端幂等，失败也不阻塞关窗 */
export function leaveMeeting(id: string): Promise<void> {
  return request<void>(`/meetings/${encodeURIComponent(id)}:leave`, { method: 'POST' })
}

/** 结束会议（仅主持人） */
export function endMeeting(id: string): Promise<Meeting> {
  return request<Meeting>(`/meetings/${encodeURIComponent(id)}:end`, { method: 'POST' })
}
