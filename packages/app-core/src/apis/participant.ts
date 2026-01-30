import type { MeetingParticipant, MeetingParticipantList } from '@tongpin/shared/types'

import { request } from './http'

function base(meetingId: string): string {
  return `/meetings/${encodeURIComponent(meetingId)}/participants`
}

export function listParticipants(meetingId: string): Promise<MeetingParticipantList> {
  return request<MeetingParticipantList>(base(meetingId))
}

export function muteParticipant(
  meetingId: string,
  participantId: string,
  muted: boolean,
): Promise<MeetingParticipant> {
  return request<MeetingParticipant>(
    `${base(meetingId)}/${encodeURIComponent(participantId)}:mute`,
    { method: 'POST', body: JSON.stringify({ muted }) },
  )
}

export function removeParticipant(meetingId: string, participantId: string): Promise<void> {
  return request<void>(`${base(meetingId)}/${encodeURIComponent(participantId)}:remove`, {
    method: 'POST',
  })
}

export function muteAll(meetingId: string, muted: boolean): Promise<{ updated: number }> {
  return request<{ updated: number }>(`${base(meetingId)}:muteAll`, {
    method: 'POST',
    body: JSON.stringify({ muted }),
  })
}
