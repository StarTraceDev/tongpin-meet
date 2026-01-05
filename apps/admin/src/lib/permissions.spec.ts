import type { AuthUser } from '@tongpin/shared/types'
import { describe, expect, it } from 'vitest'

import { hasPermission } from './permissions'

function user(roles: string[], permissions: string[]): AuthUser {
  return {
    id: 'u_1',
    phone: '13800000000',
    name: '张三',
    avatarUrl: null,
    roles,
    permissions,
  }
}

describe('前端权限判断', () => {
  it('未登录一律不可见', () => {
    expect(hasPermission(null, 'user:write')).toBe(false)
  })

  it('超管直通，不看权限点', () => {
    expect(hasPermission(user(['SUPER_ADMIN'], []), 'announcement:write')).toBe(true)
  })

  it('普通角色按权限点判断', () => {
    const member = user(['OPS'], ['user:read'])
    expect(hasPermission(member, 'user:read')).toBe(true)
    expect(hasPermission(member, 'user:write')).toBe(false)
  })
})
