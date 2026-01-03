import type { AuditLogItem, AuditLogList, AuditLogQuery } from '@tongpin/shared'

import { request } from '@/lib/http'

export function auditQueryString(query: AuditLogQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.action !== undefined && query.action !== '') {
    params.set('action', query.action)
  }
  if (query.actorId !== undefined && query.actorId !== '') {
    params.set('actorId', query.actorId)
  }
  if (query.from !== undefined) {
    params.set('from', query.from)
  }
  if (query.to !== undefined) {
    params.set('to', query.to)
  }
  return params.toString()
}

export function fetchAuditLogs(query: AuditLogQuery): Promise<AuditLogList> {
  return request<AuditLogList>(`/admin/audit-logs?${auditQueryString(query)}`)
}

export function fetchAuditLog(id: string): Promise<AuditLogItem> {
  return request<AuditLogItem>(`/admin/audit-logs/${encodeURIComponent(id)}`)
}
