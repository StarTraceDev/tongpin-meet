import type {
  AiProviderAction,
  AiProviderCreateInput,
  AiProviderList,
  AiProviderUpdateInput,
  AiRouteAction,
  AiRouteCreateInput,
  AiRouteList,
  AiRouteUpdateInput,
  AiUsageList,
  AiUsageQuery,
} from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchAiProviders(): Promise<AiProviderList> {
  return request<AiProviderList>('/admin/ai/providers')
}

export function createAiProvider(input: AiProviderCreateInput): Promise<AiProviderAction> {
  return request<AiProviderAction>('/admin/ai/providers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAiProvider(
  id: string,
  input: AiProviderUpdateInput,
): Promise<AiProviderAction> {
  return request<AiProviderAction>(`/admin/ai/providers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteAiProvider(id: string): Promise<void> {
  return request<void>(`/admin/ai/providers/${id}`, { method: 'DELETE' })
}

export function fetchAiRoutes(): Promise<AiRouteList> {
  return request<AiRouteList>('/admin/ai/routes')
}

export function createAiRoute(input: AiRouteCreateInput): Promise<AiRouteAction> {
  return request<AiRouteAction>('/admin/ai/routes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateAiRoute(id: string, input: AiRouteUpdateInput): Promise<AiRouteAction> {
  return request<AiRouteAction>(`/admin/ai/routes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteAiRoute(id: string): Promise<void> {
  return request<void>(`/admin/ai/routes/${id}`, { method: 'DELETE' })
}

export function fetchAiUsage(query: AiUsageQuery): Promise<AiUsageList> {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.scene !== undefined && query.scene !== '') {
    params.set('scene', query.scene)
  }
  return request<AiUsageList>(`/admin/ai/usage?${params.toString()}`)
}
