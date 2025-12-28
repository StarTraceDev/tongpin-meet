import type { Costs } from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchCosts(days: number): Promise<Costs> {
  return request<Costs>(`/admin/costs?days=${days}`)
}
