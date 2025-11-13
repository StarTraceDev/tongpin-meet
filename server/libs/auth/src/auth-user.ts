import type { Prisma } from '../../infra/src/generated/prisma/client'
import type { AuthUser } from '@tongpin/shared/types'

export type UserWithRoles = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } }
}>

/** 用户 + 角色 → 前端契约（roles 是角色编码，permissions 是角色权限点并集） */
export function toAuthUser(user: UserWithRoles): AuthUser {
  const roles = user.roles.map((item) => item.role.code)
  const permissions = [...new Set(user.roles.flatMap((item) => item.role.permissions as string[]))]
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    avatarUrl: user.avatarUrl,
    roles,
    permissions,
  }
}
