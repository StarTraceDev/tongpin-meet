import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import type { AuthUser } from '@tongpin/shared/types'

import type { AuthenticatedRequest } from './jwt-auth.guard'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (request.user === undefined) throw new Error('CurrentUser 用在 JwtAuthGuard 之前了')
    return request.user
  },
)
