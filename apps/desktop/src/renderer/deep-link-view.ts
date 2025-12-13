export interface DeepLinkNotice {
  url: string
  meetingNo: string
}

export function readDeepLinkNotice(payload: unknown): DeepLinkNotice | null {
  if (typeof payload !== 'object' || payload === null) return null
  const { url, meetingNo } = payload as { url?: unknown; meetingNo?: unknown }
  if (typeof url !== 'string' || url === '') return null
  if (typeof meetingNo !== 'string' || meetingNo === '') return null
  return { url, meetingNo }
}

export function deepLinkText(notice: DeepLinkNotice | null): string {
  if (notice === null) return '用 tongpin://join?no=… 拉起应用后，会在这里显示会议号。'
  return `已收到 ${notice.url}，会议号 ${notice.meetingNo}。`
}
