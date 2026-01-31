import type { Recording, RecordingDetail, RecordingList } from '@tongpin/shared/types'

import { request } from './http'

export function listRecordings(): Promise<RecordingList> {
  return request<RecordingList>('/recordings')
}

export function getRecording(id: string): Promise<RecordingDetail> {
  return request<RecordingDetail>(`/recordings/${encodeURIComponent(id)}`)
}

export function listMeetingRecordings(meetingId: string): Promise<RecordingList> {
  return request<RecordingList>(`/meetings/${encodeURIComponent(meetingId)}/recordings`)
}

export function startRecording(meetingId: string): Promise<Recording> {
  return request<Recording>(`/meetings/${encodeURIComponent(meetingId)}/recordings:start`, {
    method: 'POST',
  })
}

export function stopRecording(meetingId: string, recordingId: string): Promise<Recording> {
  return request<Recording>(
    `/meetings/${encodeURIComponent(meetingId)}/recordings/${encodeURIComponent(recordingId)}:stop`,
    { method: 'POST' },
  )
}
