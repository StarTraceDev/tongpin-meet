import type { DeptCreateInput, DeptNode, DeptUpdateInput } from '@tongpin/shared'

import { request } from '@/lib/http'

export function fetchDepartments(): Promise<DeptNode[]> {
  return request<{ items: DeptNode[] }>('/departments').then((data) => data.items)
}

export function createDepartment(input: DeptCreateInput): Promise<DeptNode> {
  return request<{ department: DeptNode }>('/departments', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((data) => data.department)
}

export function updateDepartment(id: string, input: DeptUpdateInput): Promise<DeptNode> {
  return request<{ department: DeptNode }>(`/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((data) => data.department)
}

export async function deleteDepartment(id: string): Promise<void> {
  await request<void>(`/departments/${id}`, { method: 'DELETE' })
}
