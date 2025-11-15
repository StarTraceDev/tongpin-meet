import { SetMetadata } from '@nestjs/common'

/** 权限点（03 §5.6，24 个）：meeting:read / user:write / audit:read … */
export const PERMISSIONS_KEY = 'rbac:permissions'

/** 路由要求的权限点，列出的必须全部具备；SUPER_ADMIN 在 Guard 里直接放行 */
export const RequirePermissions = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions)
