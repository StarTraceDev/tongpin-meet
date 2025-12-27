import type { HostMetrics } from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchHostMetrics(): Promise<HostMetrics> {
  return request<HostMetrics>('/admin/metrics/hosts')
}
