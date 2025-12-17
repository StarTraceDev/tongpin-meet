const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

const START_FORMAT = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 2026-01-03 → 01-03，X 轴不出年份，避免 14 天刻度挤在一起 */
export function formatDay(date: string): string {
  return date.slice(5).replace('-', '/')
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B'
  }

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }

  const text = unit === 0 || value >= 10 ? String(Math.round(value)) : value.toFixed(1)
  return `${text} ${BYTE_UNITS[unit] ?? 'B'}`
}

export function formatStartedAt(iso: string | null): string {
  if (iso === null) {
    return '—'
  }
  return START_FORMAT.format(new Date(iso)).replace(/\//g, '-')
}
