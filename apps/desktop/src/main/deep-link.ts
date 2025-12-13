export interface DeepLink {
  meetingNo: string
}

const PROTOCOL = 'tongpin:'
const JOIN_HOST = 'join'

/** 只认 `tongpin://join?no=...`；会议号格式交给 shared 的 schema 校验。 */
export function parseDeepLink(input: string): DeepLink | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  if (url.protocol !== PROTOCOL || url.hostname !== JOIN_HOST) return null
  const meetingNo = url.searchParams.get('no')?.trim() ?? ''
  if (meetingNo === '') return null
  return { meetingNo }
}

/** Windows/Linux 会把链接混在 argv 里，可能带一层引号。 */
export function findDeepLink(argv: readonly string[]): string | null {
  for (const arg of argv) {
    const value = arg.replace(/^"+|"+$/g, '')
    if (value.startsWith(PROTOCOL)) return value
  }
  return null
}
