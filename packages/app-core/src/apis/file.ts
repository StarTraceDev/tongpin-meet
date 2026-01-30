import type { DownloadUrl, MeetingFile, UploadSession } from '@tongpin/shared/types'

import { request } from './http'

export interface CreateUploadInput {
  meetingId: string
  name: string
  sizeBytes: number
  mime?: string
}

export function listMeetingFiles(meetingId: string): Promise<MeetingFile[]> {
  return request<MeetingFile[]>(`/meetings/${encodeURIComponent(meetingId)}/files`)
}

export function createUpload(input: CreateUploadInput): Promise<UploadSession> {
  return request<UploadSession>('/files:createUpload', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 分片接口吃原始字节：不能带 JSON content-type（O6 已按 body 类型判断） */
export function putPart(fileId: string, index: number, blob: Blob): Promise<void> {
  return request<void>(`/files/${encodeURIComponent(fileId)}/parts?index=${String(index)}`, {
    method: 'POST',
    body: blob,
    // 服务端只对 application/octet-stream 做 raw 解析，缺了会当成文本、字节数对不上
    headers: { 'content-type': 'application/octet-stream' },
  })
}

export function completeUpload(fileId: string): Promise<MeetingFile> {
  return request<MeetingFile>(`/files/${encodeURIComponent(fileId)}:complete`, { method: 'POST' })
}

export function deleteFile(fileId: string): Promise<void> {
  return request<void>(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
}

export function getDownloadUrl(fileId: string): Promise<DownloadUrl> {
  return request<DownloadUrl>(`/files/${encodeURIComponent(fileId)}:download`)
}
