import { SetMetadata } from '@nestjs/common'

/** 账号角色（03 §5.6）：SUPER_ADMIN / ADMIN / MEMBER / GUEST */
export const ROLES_KEY = 'rbac:roles'

/** 路由要求的角色，命中任意一个即可；SUPER_ADMIN 在 Guard 里直接放行 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles)
