import type { FeedbackCategory, FeedbackStatus } from '@tongpin/shared'

export type TagColor = 'green' | 'blue' | 'orange' | 'red' | 'default'

export function categoryMeta(category: FeedbackCategory): { label: string; color: TagColor } {
  switch (category) {
    case 'SUGGESTION':
      return { label: '建议', color: 'blue' }
    case 'COMPLAINT':
      return { label: '投诉', color: 'red' }
    case 'ISSUE':
      return { label: '故障', color: 'orange' }
    case 'OTHER':
      return { label: '其他', color: 'default' }
  }
}

export function statusMeta(status: FeedbackStatus): { label: string; color: TagColor } {
  switch (status) {
    case 'PENDING':
      return { label: '待处理', color: 'orange' }
    case 'PROCESSING':
      return { label: '处理中', color: 'blue' }
    case 'RESOLVED':
      return { label: '已解决', color: 'green' }
    case 'REJECTED':
      return { label: '已驳回', color: 'red' }
  }
}

export function sourceLabel(source: 'ADMIN' | 'USER'): string {
  return source === 'ADMIN' ? '管理台代录' : '用户提交'
}

export function formatFeedbackTime(iso: string): string {
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
