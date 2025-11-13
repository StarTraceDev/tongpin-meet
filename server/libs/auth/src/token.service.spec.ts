import { JwtService } from '@nestjs/jwt'
import { describe, expect, it } from 'vitest'

import { parseDuration, TokenService } from './token.service'

const jwt = new JwtService({ secret: 'x'.repeat(40), signOptions: { expiresIn: '15m' } })
const tokens = new TokenService(jwt)

describe('parseDuration', () => {
  it('把 15m / 30d 换算成毫秒', () => {
    expect(parseDuration('15m')).toBe(900_000)
    expect(parseDuration('30d')).toBe(2_592_000_000)
  })

  it('非法值直接抛，不静默兜底', () => {
    expect(() => parseDuration('15 min')).toThrow()
    expect(() => parseDuration('abc')).toThrow()
  })
})

describe('access token', () => {
  it('签发后能验回 sub / ver，并带出 ISO 过期时间', async () => {
    const { token, expiresAt } = await tokens.signAccessToken('user_1', 3)
    const payload = await tokens.verifyAccessToken(token)
    expect(payload.sub).toBe('user_1')
    expect(payload.ver).toBe(3)
    expect(Number.isNaN(Date.parse(expiresAt))).toBe(false)
  })

  it('篡改后按 20101 拒绝', async () => {
    const { token } = await tokens.signAccessToken('user_1', 0)
    await expect(tokens.verifyAccessToken(`${token}x`)).rejects.toMatchObject({ code: 20101 })
  })
})

describe('refresh token', () => {
  it('库里的哈希与明文无关，且能按 sessionId 找回', () => {
    const created = tokens.createRefreshToken('session_1', '30d')
    const parsed = tokens.parseRefreshToken(created.token)
    expect(parsed.sessionId).toBe('session_1')
    expect(created.hash).toBe(tokens.hashRefreshSecret(parsed.secret))
    expect(created.hash).not.toContain(parsed.secret)
  })

  it('形状不对按 20102 拒绝', () => {
    expect(() => tokens.parseRefreshToken('no-dot')).toThrow()
    expect(() => tokens.parseRefreshToken('a.b.c')).toThrow()
  })
})
