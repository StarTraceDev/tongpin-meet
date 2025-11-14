import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type { AuthUser } from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

import { toAuthUser } from './auth-user'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { TokenService } from './token.service'

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>
  user?: AuthUser
  sessionId?: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization
    const token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined
    if (token === undefined) throw new ApiError(ERROR_CODES.ACCESS_EXPIRED, '登录状态已失效', 401)

    const payload = await this.tokens.verifyAccessToken(token)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    })

    // tokenVersion 一变大，所有已签发的 access 立即失效（踢人 / 复用检测）
    if (
      user === null ||
      user.deletedAt !== null ||
      user.status !== 'ACTIVE' ||
      user.tokenVersion !== payload.ver
    ) {
      throw new ApiError(ERROR_CODES.ACCESS_EXPIRED, '登录状态已失效', 401)
    }

    // 单设备吊销：refresh 被踢或用户主动踢设备后，这把 access 立刻失效
    const session = await this.prisma.deviceSession.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    })
    if (
      session === null ||
      session.userId !== user.id ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new ApiError(ERROR_CODES.ACCESS_EXPIRED, '登录状态已失效', 401)
    }

    request.user = toAuthUser(user)
    request.sessionId = payload.sid
    return true
  }
}
