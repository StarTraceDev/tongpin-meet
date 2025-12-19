const MEETING_TIME = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 列表与抽屉统一北京时间，空值给短横线 */
export function formatMeetingTime(iso: string | null): string {
  if (iso === null) {
    return '—'
  }
  return MEETING_TIME.format(new Date(iso)).replace(/\//g, '-')
}
