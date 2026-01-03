import type {
  AnnouncementAction,
  AnnouncementCreateInput,
  AnnouncementList,
  AnnouncementQuery,
  AnnouncementUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

function announceQueryString(query: AnnouncementQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.keyword !== undefined && query.keyword !== '') {
    params.set('keyword', query.keyword)
  }
  return params.toString()
}

export function fetchAnnouncements(query: AnnouncementQuery): Promise<AnnouncementList> {
  return request<AnnouncementList>(`/admin/announcements?${announceQueryString(query)}`)
}

export function createAnnouncement(input: AnnouncementCreateInput): Promise<AnnouncementAction> {
  return request<AnnouncementAction>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAnnouncement(
  id: string,
  input: AnnouncementUpdateInput,
): Promise<AnnouncementAction> {
  return request<AnnouncementAction>(`/admin/announcements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteAnnouncement(id: string): Promise<void> {
  return request<void>(`/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
