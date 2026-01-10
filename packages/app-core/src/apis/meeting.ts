import type { ListMeetingsQuery, Meeting, Paginated } from '@tongpin/shared/types'

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
