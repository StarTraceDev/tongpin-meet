const SCENE_LABELS: Record<string, string> = {
  minutes: '会议纪要',
  qa: 'AI 问答',
  summary: '会议摘要',
}

export function sceneLabel(scene: string): string {
  return SCENE_LABELS[scene] ?? scene
}

export function formatTokens(value: number): string {
  return value.toLocaleString('zh-CN')
}

export function formatCost(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

export function formatAiTime(iso: string): string {
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
