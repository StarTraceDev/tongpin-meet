import type { Permission } from '@tongpin/shared'
import type { AuthUser } from '@tongpin/shared/types'

/** 03 §5.6：超管直通，其余按角色上的权限点判断 */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN'

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (user === null) {
    return false
  }
  if (user.roles.includes(SUPER_ADMIN_ROLE)) {
    return true
  }
  return user.permissions.includes(permission)
}
