import type {
  Break,
  BreakOverview,
  BreakRecord,
  BreakRecordInput,
  BreakRecordResult,
  CreateBreakInput,
  UpdateBreakInput,
} from '@tongpin/shared/types'

import { request } from './http'

function base(meetingId: string): string {
  return `/meetings/${encodeURIComponent(meetingId)}/breaks`
}

export function listBreaks(meetingId: string): Promise<Break[]> {
  return request<Break[]>(base(meetingId))
}

export function createBreak(meetingId: string, input: CreateBreakInput): Promise<Break> {
  return request<Break>(base(meetingId), { method: 'POST', body: JSON.stringify(input) })
}

export function updateBreak(
  meetingId: string,
  breakId: string,
  input: UpdateBreakInput,
): Promise<Break> {
  return request<Break>(`${base(meetingId)}/${encodeURIComponent(breakId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function closeBreak(meetingId: string, breakId: string): Promise<Break> {
  return request<Break>(`${base(meetingId)}/${encodeURIComponent(breakId)}:close`, {
    method: 'POST',
  })
}

export function getBreakOverview(meetingId: string, breakId: string): Promise<BreakOverview> {
  return request<BreakOverview>(`${base(meetingId)}/${encodeURIComponent(breakId)}/records`)
}

export function markBreakRecord(
  meetingId: string,
  breakId: string,
  input: BreakRecordInput,
): Promise<BreakRecordResult> {
  return request<BreakRecordResult>(`${base(meetingId)}/${encodeURIComponent(breakId)}/records`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type { Break, BreakOverview, BreakRecord }
