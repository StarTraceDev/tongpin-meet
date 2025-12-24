import type { AlertRuleItem } from '@tongpin/shared'

export const ALERT_METRICS = [
  { value: 'cpu', label: 'CPU 使用率', unit: '%' },
  { value: 'memory', label: '内存使用率', unit: '%' },
  { value: 'connections', label: '连接数', unit: '个' },
  { value: 'storage', label: '存储使用率', unit: '%' },
  { value: 'errorRate', label: '5xx 错误率', unit: '%' },
] as const

export const ALERT_CHANNELS = [
  { value: 'INBOX', label: '站内信' },
  { value: 'SMS', label: '短信' },
  { value: 'EMAIL', label: '邮件' },
  { value: 'WEBHOOK', label: 'Webhook' },
] as const

export const ALERT_COMPARATORS = [
  { value: 'GT', label: '高于' },
  { value: 'LT', label: '低于' },
] as const

export function metricMeta(metric: AlertRuleItem['metric']): { label: string; unit: string } {
  return ALERT_METRICS.find((item) => item.value === metric) ?? { label: metric, unit: '' }
}

export function channelLabel(channel: AlertRuleItem['channel']): string {
  return ALERT_CHANNELS.find((item) => item.value === channel)?.label ?? channel
}

export function comparatorLabel(comparator: AlertRuleItem['comparator']): string {
  return ALERT_COMPARATORS.find((item) => item.value === comparator)?.label ?? comparator
}

export function ruleCondition(rule: AlertRuleItem): string {
  const meta = metricMeta(rule.metric)
  const sign = rule.comparator === 'GT' ? '>' : '<'
  return `${meta.label} ${sign} ${rule.threshold}${meta.unit}`
}
