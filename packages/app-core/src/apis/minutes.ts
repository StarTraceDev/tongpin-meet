import type { Minutes, UpdateMinutesInput } from '@tongpin/shared/types'

import { request } from './http'

export function fetchMinutes(meetingId: string): Promise<Minutes> {
  return request<Minutes>(`/meetings/${meetingId}/minutes`)
}

export function saveMinutes(meetingId: string, input: UpdateMinutesInput): Promise<Minutes> {
  return request<Minutes>(`/meetings/${meetingId}/minutes`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** 只把状态推成 GENERATING；真正的生成结果在 M12 的 AI 模块回来 */
export function generateMinutes(meetingId: string): Promise<Minutes> {
  return request<Minutes>(`/meetings/${meetingId}/minutes:generate`, { method: 'POST' })
}
