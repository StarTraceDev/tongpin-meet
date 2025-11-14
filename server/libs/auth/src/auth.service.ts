import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import argon2 from 'argon2'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AuthSession,
  LoginByPasswordInput,
  LoginBySmsInput,
  RefreshSessionInput,
  SessionResponse,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

import { toAuthUser, type UserWithRoles } from './auth-user'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { SmsCodeStore } from './sms/sms-code.store'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { refreshTtl, TokenService } from './token.service'

export interface RequestContext {
  ip?: string
  ua?: string
  deviceId?: string
}

const USER_WITH_ROLES = { roles: { include: { role: true } } } as const

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly smsCodes: SmsCodeStore,
  ) {}

  async loginWithPassword(
    input: LoginByPasswordInput,
    ctx: RequestContext,
  ): Promise<SessionResponse> {
    const user = await this.prisma.user.findFirst({
      where: { phone: input.phone, deletedAt: null },
      include: USER_WITH_ROLES,
    })

    if (user === null || user.passwordHash === null) {
      await this.recordLogin(null, input.phone, false, 'user_not_found', ctx)
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '手机号或密码不正确', 401)
    }

    const passwordOk = await argon2.verify(user.passwordHash, input.password).catch(() => false)
    if (!passwordOk) {
      await this.recordLogin(user.id, input.phone, false, 'password_mismatch', ctx)
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '手机号或密码不正确', 401)
    }

    if (user.status !== 'ACTIVE') {
      await this.recordLogin(user.id, input.phone, false, 'account_disabled', ctx)
      throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED, '账号已被禁用', 403)
    }

    const session = await this.createSession(user, ctx)
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await this.recordLogin(user.id, input.phone, true, undefined, ctx)
    return session
  }

  async refresh(input: RefreshSessionInput, ctx: RequestContext): Promise<SessionResponse> {
    const { sessionId, secret } = this.tokens.parseRefreshToken(input.refreshToken)
    const presentedHash = this.tokens.hashRefreshSecret(secret)

    const session = await this.prisma.deviceSession.findUnique({ where: { id: sessionId } })
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new ApiError(ERROR_CODES.REFRESH_EXPIRED, '登录已过期，请重新登录', 401)
    }

    // 旧 refresh 二次使用：判定为泄露，整个用户的会话全部下线并 +tokenVersion
    if (session.prevRefreshHash !== null && session.prevRefreshHash === presentedHash) {
      await this.revokeAllSessions(session.userId, 'refresh_reuse')
      throw new ApiError(ERROR_CODES.REFRESH_EXPIRED, '登录已过期，请重新登录', 401)
    }

    if (session.refreshHash !== presentedHash) {
      throw new ApiError(ERROR_CODES.REFRESH_EXPIRED, '登录已过期，请重新登录', 401)
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: USER_WITH_ROLES,
    })
    if (user === null || user.status !== 'ACTIVE') {
      throw new ApiError(ERROR_CODES.REFRESH_EXPIRED, '登录已过期，请重新登录', 401)
    }

    const rotated = this.tokens.createRefreshToken(session.id, refreshTtl())
    await this.prisma.deviceSession.update({
      where: { id: session.id },
      data: {
        prevRefreshHash: session.refreshHash,
        refreshHash: rotated.hash,
        expiresAt: rotated.expiresAt,
        ip: ctx.ip ?? session.ip,
        ua: ctx.ua ?? session.ua,
      },
    })

    const access = await this.tokens.signAccessToken(user.id, user.tokenVersion, session.id)
    return {
      user: toAuthUser(user),
      tokens: {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken: rotated.token,
        refreshExpiresAt: rotated.expiresAt.toISOString(),
      },
    }
  }

  async sendSmsCode(phone: string, ip: string | undefined): Promise<void> {
    await this.smsCodes.send(phone, ip)
  }

  async loginWithSms(input: LoginBySmsInput, ctx: RequestContext): Promise<SessionResponse> {
    this.smsCodes.verify(input.phone, input.code)

    let user = await this.prisma.user.findFirst({
      where: { phone: input.phone, deletedAt: null },
      include: USER_WITH_ROLES,
    })

    if (user === null) {
      if (process.env.AUTH_AUTO_REGISTER === 'false') {
        await this.recordLogin(null, input.phone, false, 'auto_register_disabled', ctx, 'sms')
        throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '账号不存在，请联系管理员', 401)
      }
      user = await this.registerByPhone(input.phone)
    }

    if (user.status !== 'ACTIVE') {
      await this.recordLogin(user.id, input.phone, false, 'account_disabled', ctx, 'sms')
      throw new ApiError(ERROR_CODES.AUTH_ACCOUNT_DISABLED, '账号已被禁用', 403)
    }

    const session = await this.createSession(user, ctx)
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await this.recordLogin(user.id, input.phone, true, undefined, ctx, 'sms')
    return session
  }

  async listSessions(userId: string): Promise<AuthSession[]> {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId,
      ip: session.ip,
      ua: session.ua,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      current: false,
    }))
  }

  async revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
    const session = await this.prisma.deviceSession.findUnique({ where: { id: sessionId } })
    if (session === null || session.userId !== userId) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会话不存在', 404)
    }
    if (session.revokedAt === null) {
      await this.prisma.deviceSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      })
    }
    // 踢掉的是当前设备时顺带 +tokenVersion，确保手里的 access 立刻失效
    if (sessionId === currentSessionId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      })
    }
  }

  private async registerByPhone(phone: string): Promise<UserWithRoles> {
    const member = await this.prisma.role.findUnique({ where: { code: 'MEMBER' } })
    return this.prisma.user.create({
      data: {
        phone,
        name: `用户${phone.slice(-4)}`,
        status: 'ACTIVE',
        roles: member === null ? undefined : { create: { roleId: member.id } },
      },
      include: USER_WITH_ROLES,
    })
  }

  private async createSession(user: UserWithRoles, ctx: RequestContext): Promise<SessionResponse> {
    const sessionId = randomUUID()
    const refresh = this.tokens.createRefreshToken(sessionId, refreshTtl())
    await this.prisma.deviceSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        deviceId: ctx.deviceId ?? 'unknown',
        refreshHash: refresh.hash,
        ua: ctx.ua,
        ip: ctx.ip,
        expiresAt: refresh.expiresAt,
      },
    })
    const access = await this.tokens.signAccessToken(user.id, user.tokenVersion, sessionId)
    return {
      user: toAuthUser(user),
      tokens: {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken: refresh.token,
        refreshExpiresAt: refresh.expiresAt.toISOString(),
      },
    }
  }

  /** 复用检测命中：吊销该用户全部会话，tokenVersion+1 让已发出去的 access 也立刻作废 */
  private async revokeAllSessions(userId: string, reason: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    })
    await this.prisma.loginLog.create({
      data: { userId, phone: '', channel: 'refresh', success: false, reason },
    })
  }

  private async recordLogin(
    userId: string | null,
    phone: string,
    success: boolean,
    reason: string | undefined,
    ctx: RequestContext,
    channel = 'password',
  ): Promise<void> {
    await this.prisma.loginLog.create({
      data: { userId, phone, channel, success, reason, ip: ctx.ip, ua: ctx.ua },
    })
  }
}
