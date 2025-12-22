import type {
  SmsLogList,
  SmsLogsQuery,
  SmsProviderAction,
  SmsProviderCreateInput,
  SmsProviderList,
  SmsProviderUpdateInput,
  SmsTemplateAction,
  SmsTemplateCreateInput,
  SmsTemplateList,
  SmsTemplateUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

function logsQuery(query: SmsLogsQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.phone !== undefined && query.phone !== '') {
    params.set('phone', query.phone)
  }
  if (query.status !== undefined) {
    params.set('status', query.status)
  }
  return params.toString()
}

export function fetchSmsProviders(): Promise<SmsProviderList> {
  return request<SmsProviderList>('/admin/sms/providers')
}

export function createSmsProvider(input: SmsProviderCreateInput): Promise<SmsProviderAction> {
  return request<SmsProviderAction>('/admin/sms/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSmsProvider(
  id: string,
  input: SmsProviderUpdateInput,
): Promise<SmsProviderAction> {
  return request<SmsProviderAction>(`/admin/sms/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteSmsProvider(id: string): Promise<void> {
  return request<void>(`/admin/sms/providers/${id}`, { method: 'DELETE' })
}

export function fetchSmsTemplates(): Promise<SmsTemplateList> {
  return request<SmsTemplateList>('/admin/sms/templates')
}

export function createSmsTemplate(input: SmsTemplateCreateInput): Promise<SmsTemplateAction> {
  return request<SmsTemplateAction>('/admin/sms/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSmsTemplate(
  id: string,
  input: SmsTemplateUpdateInput,
): Promise<SmsTemplateAction> {
  return request<SmsTemplateAction>(`/admin/sms/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteSmsTemplate(id: string): Promise<void> {
  return request<void>(`/admin/sms/templates/${id}`, { method: 'DELETE' })
}

export function fetchSmsLogs(query: SmsLogsQuery): Promise<SmsLogList> {
  return request<SmsLogList>(`/admin/sms/logs?${logsQuery(query)}`)
}
