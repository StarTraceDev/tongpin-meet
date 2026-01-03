import type {
  ExportOperationAction,
  ExportOperationItem,
  ExportOperationList,
  ExportOperationQuery,
  ExportResource,
} from '@tongpin/shared'

import { request, requestText } from '@/lib/http'

export function startExport(resource: ExportResource): Promise<ExportOperationAction> {
  return request<ExportOperationAction>(`/admin/${resource}:export`)
}

export function fetchExports(query: ExportOperationQuery): Promise<ExportOperationList> {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.resource !== undefined) {
    params.set('resource', query.resource)
  }
  return request<ExportOperationList>(`/admin/exports?${params.toString()}`)
}

export function fetchExportOperation(id: string): Promise<ExportOperationItem> {
  return request<ExportOperationItem>(`/admin/exports/${encodeURIComponent(id)}`)
}

export function downloadExport(id: string): Promise<string> {
  return requestText(`/admin/exports/${encodeURIComponent(id)}/file`)
}
