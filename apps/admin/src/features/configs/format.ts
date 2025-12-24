export function formatConfigValue(value: unknown): string {
  const text = JSON.stringify(value) ?? 'null'
  return text.length > 96 ? `${text.slice(0, 96)}…` : text
}

export type ParseResult = { ok: true; value: unknown } | { ok: false; message: string }

export function parseConfigJson(text: string): ParseResult {
  if (text.trim() === '') {
    return { ok: false, message: '配置值不能为空' }
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, message: '不是合法的 JSON' }
  }
}

export function formatConfigTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/\//g, '-')
}
