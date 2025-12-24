import type {
  AlertRuleAction,
  AlertRuleCreateInput,
  AlertRuleList,
  AlertRuleUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchAlertRules(): Promise<AlertRuleList> {
  return request<AlertRuleList>('/admin/alert-rules')
}

export function createAlertRule(input: AlertRuleCreateInput): Promise<AlertRuleAction> {
  return request<AlertRuleAction>('/admin/alert-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAlertRule(id: string, input: AlertRuleUpdateInput): Promise<AlertRuleAction> {
  return request<AlertRuleAction>(`/admin/alert-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteAlertRule(id: string): Promise<void> {
  return request<void>(`/admin/alert-rules/${id}`, { method: 'DELETE' })
}
