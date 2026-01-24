import { request } from './http'

export interface Contact {
  id: string
  name: string
  phone: string
  dept: string
  createdAt: string
}

interface OrgUser {
  id: string
  name: string
  phone: string
  deptName: string | null
  createdAt: string
}

interface UserPage {
  items: OrgUser[]
  total: number
}

export interface ListContactsQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

/**
 * 通讯录读的是组织成员（`GET /users`）。服务端没有好友/申请模型，
 * 所以「新朋友」「申请日期」这些字段先用成员资料的创建时间顶上。
 */
export async function listContacts(query: ListContactsQuery = {}): Promise<Contact[]> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(Math.min(query.pageSize ?? 100, 100)),
  })
  if (query.keyword !== undefined && query.keyword !== '') params.set('keyword', query.keyword)

  const page = await request<UserPage>(`/users?${params.toString()}`)
  return page.items.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    dept: item.deptName ?? '未分组',
    createdAt: item.createdAt,
  }))
}

/** 首字母分组：英文取大写首字母，中文和数字统一落到 # */
export function initialOf(name: string): string {
  const first = name.trim().charAt(0).toUpperCase()
  return /^[A-Z]$/.test(first) ? first : '#'
}
