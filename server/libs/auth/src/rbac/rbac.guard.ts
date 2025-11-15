import { Injectable } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { Reflector } from '@nestjs/core'

import { ERROR_CODES } from '../../../../../packages/shared/src/constants'
import type { AuthUser } from '@tongpin/shared/types'

import { ApiError } from '../../../common/src/errors/api-error'
import { PERMISSIONS_KEY } from './permissions.decorator'
import { ROLES_KEY } from './roles.decorator'

interface RequestWithUser {
  user?: AuthUser
}

/**
 * 03 §5.6 / 06 §M3-3.8：`@Roles()` 命中任一角色 + `@RequirePermissions()` 全部具备。
 * 未标注的接口直接放行；SUPER_ADMIN 视为拥有全部角色与权限。
 * 必须挂在 JwtAuthGuard 之后（依赖 req.user）。
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const permissions = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if ((roles?.length ?? 0) === 0 && (permissions?.length ?? 0) === 0) {
      return true
    }

    const user = context.switchToHttp().getRequest<RequestWithUser>().user
    if (user === undefined) {
      throw new ApiError(ERROR_CODES.ACCESS_EXPIRED, '登录状态已失效', 401)
    }
    if (user.roles.includes('SUPER_ADMIN')) {
      return true
    }
    if ((roles?.length ?? 0) > 0 && !roles?.some((role) => user.roles.includes(role))) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '当前角色无权访问', 403)
    }
    if (
      (permissions?.length ?? 0) > 0 &&
      !permissions?.every((permission) => user.permissions.includes(permission))
    ) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '缺少所需权限', 403)
    }
    return true
  }
}
