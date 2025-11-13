import { createHash, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { JwtService } from '@nestjs/jwt'

import { ApiError } from '../../common/src/errors/api-error'
import { ERROR_CODES } from '../../../../packages/shared/src/constants'

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

/** 把 `15m` / `30d` 这类 env 值换算成毫秒；非法值直接抛，避免静默用错 TTL */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value)
  const amount = match?.[1]
  const unit = match?.[2]
  if (amount === undefined || unit === undefined || DURATION_UNITS[unit] === undefined) {
    throw new Error(`时长格式不合法（应为 15m / 30d 这类）：${value}`)
  }
  return Number(amount) * DURATION_UNITS[unit]
}

/** env 在 import 阶段还没加载（bootstrap 里才 loadEnvFile），所以 TTL 与密钥都用函数取 */
export function accessTtl(): string {
  return process.env.JWT_ACCESS_TTL ?? '15m'
}

export function refreshTtl(): string {
  return process.env.JWT_REFRESH_TTL ?? '30d'
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret === undefined || secret.length < 32) {
    throw new Error('JWT_SECRET 未配置或长度不足 32 位（07 §13.3）')
  }
  return secret
}

export interface AccessPayload {
  sub: string
  ver: number
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  async signAccessToken(
    userId: string,
    tokenVersion: number,
  ): Promise<{ token: string; expiresAt: string }> {
    const token = await this.jwt.signAsync({ sub: userId, ver: tokenVersion })
    const payload = this.jwt.decode(token) as { exp?: number } | null
    if (payload?.exp === undefined) throw new Error('签发的 access token 缺少 exp')
    return { token, expiresAt: new Date(payload.exp * 1000).toISOString() }
  }

  async verifyAccessToken(token: string): Promise<AccessPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token)
      if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
        throw new Error('payload 形状不对')
      }
      return payload
    } catch {
      throw new ApiError(ERROR_CODES.ACCESS_EXPIRED, '登录状态已失效', 401)
    }
  }

  /** refresh 是随机 256bit 不透明串：`{sessionId}.{secret}`，库里只存 secret 的哈希 */
  createRefreshToken(
    sessionId: string,
    ttl: string,
  ): { token: string; hash: string; expiresAt: Date } {
    const secret = randomBytes(32).toString('base64url')
    return {
      token: `${sessionId}.${secret}`,
      hash: this.hashRefreshSecret(secret),
      expiresAt: new Date(Date.now() + parseDuration(ttl)),
    }
  }

  hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex')
  }

  parseRefreshToken(token: string): { sessionId: string; secret: string } {
    const parts = token.split('.')
    const sessionId = parts[0]
    const secret = parts[1]
    if (
      parts.length !== 2 ||
      sessionId === undefined ||
      secret === undefined ||
      sessionId === '' ||
      secret === ''
    ) {
      throw new ApiError(ERROR_CODES.REFRESH_EXPIRED, '登录已过期，请重新登录', 401)
    }
    return { sessionId, secret }
  }
}
