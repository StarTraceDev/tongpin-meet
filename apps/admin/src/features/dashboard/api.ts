import type {
  AdminRoomList,
  AdminStatsOverview,
  AdminTrend,
  AdminUsage,
} from '@tongpin/shared/types'

import { request } from '../../lib/http'

export function fetchOverview(): Promise<AdminStatsOverview> {
  return request<AdminStatsOverview>('/admin/stats/overview')
}

export function fetchMeetingTrend(): Promise<AdminTrend> {
  return request<AdminTrend>('/admin/stats/meetings')
}

export function fetchUserGrowth(): Promise<AdminTrend> {
  return request<AdminTrend>('/admin/stats/users')
}

export function fetchUsage(): Promise<AdminUsage> {
  return request<AdminUsage>('/admin/stats/usage')
}

export function fetchRooms(): Promise<AdminRoomList> {
  return request<AdminRoomList>('/admin/rooms')
}
