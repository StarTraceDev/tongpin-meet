export function formatAuditTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/\//g, '-')
}

export function formatTarget(targetType: string | null, targetId: string | null): string {
  if (targetType === null && targetId === null) {
    return '—'
  }
  return [targetType ?? '—', targetId ?? '—'].join(' / ')
}
