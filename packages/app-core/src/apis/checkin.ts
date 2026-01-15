import type {
  Checkin,
  CheckinOverview,
  CheckinRecord,
  CheckinResult,
  CreateCheckinInput,
} from '@tongpin/shared/types'

import { request } from './http'

function base(meetingId: string): string {
  return `/meetings/${encodeURIComponent(meetingId)}/checkins`
}

/** 签到列表（新→旧，服务端已排序） */
export function listCheckins(meetingId: string): Promise<Checkin[]> {
  return request<Checkin[]>(base(meetingId))
}

export function createCheckin(meetingId: string, input: CreateCheckinInput): Promise<Checkin> {
  return request<Checkin>(base(meetingId), {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function closeCheckin(meetingId: string, checkinId: string): Promise<Checkin> {
  return request<Checkin>(`${base(meetingId)}/${encodeURIComponent(checkinId)}:close`, {
    method: 'POST',
  })
}

export function getCheckinOverview(meetingId: string, checkinId: string): Promise<CheckinOverview> {
  return request<CheckinOverview>(`${base(meetingId)}/${encodeURIComponent(checkinId)}/records`)
}

export function respondCheckin(meetingId: string, checkinId: string): Promise<CheckinResult> {
  return request<CheckinResult>(`${base(meetingId)}/${encodeURIComponent(checkinId)}/records`, {
    method: 'POST',
  })
}

/** 签到记录导出（服务端返回 CSV 文本，M13-5 先不用，留给后续导出按钮） */
export function exportCheckinRecords(meetingId: string, checkinId: string): Promise<string> {
  return request<string>(`${base(meetingId)}/${encodeURIComponent(checkinId)}/records:export`, {
    method: 'GET',
  })
}

export type { Checkin, CheckinOverview, CheckinRecord, CheckinResult }
