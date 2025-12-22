import type { RoleAction, RoleCreateInput, RoleList, RoleUpdateInput } from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchRoles(): Promise<RoleList> {
  return request<RoleList>('/roles')
}

export async function createRole(input: RoleCreateInput): Promise<RoleAction> {
  return request<RoleAction>('/roles', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateRole(id: string, input: RoleUpdateInput): Promise<RoleAction> {
  return request<RoleAction>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteRole(id: string): Promise<void> {
  return request<void>(`/roles/${id}`, { method: 'DELETE' })
}
