import type { AdminMeetingAction, AdminMeetingList } from '@tongpin/shared/types'

import { request } from '../../lib/http'

import type { MeetingListQuery } from './query'
import { meetingQueryString } from './query'

export function fetchMeetings(query: MeetingListQuery): Promise<AdminMeetingList> {
  const search = meetingQueryString(query)
  return request<AdminMeetingList>(search === '' ? '/admin/meetings' : `/admin/meetings?${search}`)
}

export function forceEndMeeting(id: string): Promise<AdminMeetingAction> {
  return request<AdminMeetingAction>(`/admin/meetings/${encodeURIComponent(id)}:forceEnd`, {
    method: 'POST',
  })
}
