import type {
  ConfigAction,
  ConfigCreateInput,
  ConfigList,
  ConfigUpdateInput,
  FeatureFlagAction,
  FeatureFlagList,
  FeatureFlagUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchConfigs(): Promise<ConfigList> {
  return request<ConfigList>('/admin/configs')
}

export function createConfig(input: ConfigCreateInput): Promise<ConfigAction> {
  return request<ConfigAction>('/admin/configs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateConfig(key: string, input: ConfigUpdateInput): Promise<ConfigAction> {
  return request<ConfigAction>(`/admin/configs/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteConfig(key: string): Promise<void> {
  return request<void>(`/admin/configs/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export function fetchFeatureFlags(): Promise<FeatureFlagList> {
  return request<FeatureFlagList>('/admin/feature-flags')
}

export function updateFeatureFlag(
  key: string,
  input: FeatureFlagUpdateInput,
): Promise<FeatureFlagAction> {
  return request<FeatureFlagAction>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
