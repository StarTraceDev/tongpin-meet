import type {
  AdminRoleOption,
  AdminRoleOptionList,
  AdminUserAction,
  AdminUserCreateInput,
  AdminUserItem,
  AdminUserList,
  AdminUsersQuery,
  AdminUserUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

function queryString(query: AdminUsersQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.status !== undefined) {
    params.set('status', query.status)
  }
  if (query.keyword !== undefined && query.keyword !== '') {
    params.set('keyword', query.keyword)
  }
  return params.toString()
}

export function fetchUsers(query: AdminUsersQuery): Promise<AdminUserList> {
  return request<AdminUserList>(`/users?${queryString(query)}`)
}

export function fetchRoleOptions(): Promise<AdminRoleOption[]> {
  return request<AdminRoleOptionList>('/roles').then((data) => data.items)
}

export async function createUser(input: AdminUserCreateInput): Promise<AdminUserItem> {
  return request<AdminUserItem>('/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateUser(id: string, input: AdminUserUpdateInput): Promise<AdminUserItem> {
  return request<AdminUserItem>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function setUserDisabled(id: string, disabled: boolean): Promise<AdminUserItem> {
  const action = disabled ? 'disable' : 'enable'
  const data = await request<AdminUserAction>(`/users/${id}:${action}`, { method: 'POST' })
  return data.user
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  await request<void>(`/users/${id}:resetPassword`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function setUserRoles(id: string, roleIds: string[]): Promise<AdminUserItem> {
  const data = await request<AdminUserAction>(`/users/${id}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
  })
  return data.user
}
