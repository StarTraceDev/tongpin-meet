import { Reflector } from '@nestjs/core'
import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import { RequirePermissions } from './permissions.decorator'
import { RbacGuard } from './rbac.guard'
import { Roles } from './roles.decorator'

const user: AuthUser = {
  id: 'user_1',
  phone: '13800000001',
  name: '张三',
  avatarUrl: null,
  roles: ['ADMIN'],
  permissions: ['user:read'],
}

class DemoController {
  @Roles('ADMIN')
  @RequirePermissions('user:read')
  adminOnly(): void {}

  @Roles('SUPER_ADMIN')
  superOnly(): void {}

  plain(): void {}
}

function ctxFor(method: keyof DemoController, currentUser: AuthUser | undefined): ExecutionContext {
  return {
    getHandler: () => DemoController.prototype[method],
    getClass: () => DemoController,
    switchToHttp: () => ({ getRequest: () => ({ user: currentUser }) }),
  } as unknown as ExecutionContext
}

function guard(): RbacGuard {
  return new RbacGuard(new Reflector())
}

describe('RbacGuard', () => {
  it('未标注的接口直接放行（也不要求登录）', () => {
    expect(guard().canActivate(ctxFor('plain', undefined))).toBe(true)
  })

  it('角色与权限都满足时放行', () => {
    expect(guard().canActivate(ctxFor('adminOnly', user))).toBe(true)
  })

  it('角色不满足时 403', () => {
    const member: AuthUser = { ...user, roles: ['MEMBER'] }
    expect(() => guard().canActivate(ctxFor('adminOnly', member))).toThrowError(
      expect.objectContaining({ status: 403, code: 10003 }),
    )
  })

  it('角色满足但缺权限时 403', () => {
    const noPerm: AuthUser = { ...user, permissions: [] }
    expect(() => guard().canActivate(ctxFor('adminOnly', noPerm))).toThrowError(
      expect.objectContaining({ status: 403 }),
    )
  })

  it('SUPER_ADMIN 绕过角色与权限检查', () => {
    const superAdmin: AuthUser = { ...user, roles: ['SUPER_ADMIN'], permissions: [] }
    expect(guard().canActivate(ctxFor('superOnly', superAdmin))).toBe(true)
    expect(guard().canActivate(ctxFor('adminOnly', superAdmin))).toBe(true)
  })

  it('缺少 req.user（Guard 顺序挂错）时 401', () => {
    expect(() => guard().canActivate(ctxFor('adminOnly', undefined))).toThrowError(
      expect.objectContaining({ status: 401, code: 20101 }),
    )
  })
})
