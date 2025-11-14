import { JwtService } from '@nestjs/jwt'
import argon2 from 'argon2'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import type { UserWithRoles } from './auth-user'
import { AuthService } from './auth.service'
import type { SmsCodeStore } from './sms/sms-code.store'
import { TokenService } from './token.service'

const PASSWORD = 'admin123'
const jwt = new JwtService({ secret: 'x'.repeat(40), signOptions: { expiresIn: '15m' } })
const tokens = new TokenService(jwt)

function makeUser(hash: string, overrides: Partial<UserWithRoles> = {}): UserWithRoles {
  return {
    id: 'user_1',
    legacyId: null,
    phone: '13800000000',
    passwordHash: hash,
    name: '系统管理员',
    avatarUrl: null,
    email: null,
    deptId: null,
    tokenVersion: 0,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roles: [
      {
        id: 'ur_1',
        userId: 'user_1',
        roleId: 'role_1',
        grantedAt: new Date(),
        role: {
          id: 'role_1',
          code: 'SUPER_ADMIN',
          name: '超级管理员',
          permissions: ['meeting:read'],
          builtin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      },
    ],
    ...overrides,
  }
}

function makePrisma(): {
  prisma: PrismaService
  mocks: {
    findFirst: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    userUpdate: ReturnType<typeof vi.fn>
    sessionCreate: ReturnType<typeof vi.fn>
    sessionFind: ReturnType<typeof vi.fn>
    sessionUpdate: ReturnType<typeof vi.fn>
    sessionUpdateMany: ReturnType<typeof vi.fn>
    loginLogCreate: ReturnType<typeof vi.fn>
    roleFind: ReturnType<typeof vi.fn>
    userCreate: ReturnType<typeof vi.fn>
  }
} {
  const mocks = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    userUpdate: vi.fn().mockResolvedValue({}),
    sessionCreate: vi.fn().mockResolvedValue({}),
    sessionFind: vi.fn(),
    sessionUpdate: vi.fn().mockResolvedValue({}),
    sessionUpdateMany: vi.fn().mockResolvedValue({ count: 1 }),
    loginLogCreate: vi.fn().mockResolvedValue({}),
    roleFind: vi.fn(),
    userCreate: vi.fn(),
  }
  const prisma = {
    user: {
      findFirst: mocks.findFirst,
      findUnique: mocks.findUnique,
      update: mocks.userUpdate,
      create: mocks.userCreate,
    },
    role: { findUnique: mocks.roleFind },
    deviceSession: {
      create: mocks.sessionCreate,
      findUnique: mocks.sessionFind,
      update: mocks.sessionUpdate,
      updateMany: mocks.sessionUpdateMany,
    },
    loginLog: { create: mocks.loginLogCreate },
  } as unknown as PrismaService
  return { prisma, mocks }
}

describe('AuthService.loginWithPassword', () => {
  let service: AuthService
  let ctx: { prisma: PrismaService; mocks: ReturnType<typeof makePrisma>['mocks'] }
  let hash: string

  beforeEach(async () => {
    ctx = makePrisma()
    service = new AuthService(ctx.prisma, tokens, { verify: vi.fn() } as unknown as SmsCodeStore)
    hash = await argon2.hash(PASSWORD, { type: argon2.argon2id })
  })

  it('密码正确：发双 token、落 DeviceSession、记成功日志', async () => {
    ctx.mocks.findFirst.mockResolvedValue(makeUser(hash))
    const result = await service.loginWithPassword(
      { phone: '13800000000', password: PASSWORD },
      { ip: '127.0.0.1', ua: 'vitest' },
    )

    expect(result.user.id).toBe('user_1')
    expect(result.user.roles).toEqual(['SUPER_ADMIN'])
    expect(result.tokens.accessToken.split('.')).toHaveLength(3)

    const created = ctx.mocks.sessionCreate.mock.calls[0]?.[0] as {
      data: { refreshHash: string; expiresAt: Date }
    }
    const parsed = tokens.parseRefreshToken(result.tokens.refreshToken)
    expect(created.data.refreshHash).toBe(tokens.hashRefreshSecret(parsed.secret))
    expect(created.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(ctx.mocks.loginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: true, channel: 'password' }),
    })
  })

  it('用户不存在 / 密码错：都返回 20103，且日志记失败', async () => {
    ctx.mocks.findFirst.mockResolvedValue(null)
    await expect(
      service.loginWithPassword({ phone: '13800000000', password: PASSWORD }, {}),
    ).rejects.toMatchObject({ code: 20103 })

    ctx.mocks.findFirst.mockResolvedValue(makeUser(hash))
    await expect(
      service.loginWithPassword({ phone: '13800000000', password: 'wrong' }, {}),
    ).rejects.toMatchObject({ code: 20103 })
    expect(ctx.mocks.loginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false }),
    })
  })

  it('账号被禁用：403 + 20104', async () => {
    ctx.mocks.findFirst.mockResolvedValue(makeUser(hash, { status: 'DISABLED' }))
    await expect(
      service.loginWithPassword({ phone: '13800000000', password: PASSWORD }, {}),
    ).rejects.toMatchObject({
      code: 20104,
      status: 403,
    })
  })
})

describe('AuthService.refresh', () => {
  it('正常刷新：旋转 refresh，并把上一次哈希挪到 prevRefreshHash', async () => {
    const { prisma, mocks } = makePrisma()
    const service = new AuthService(prisma, tokens, { verify: vi.fn() } as unknown as SmsCodeStore)
    const old = tokens.createRefreshToken('session_1', '30d')
    const parsed = tokens.parseRefreshToken(old.token)

    mocks.sessionFind.mockResolvedValue({
      id: 'session_1',
      userId: 'user_1',
      refreshHash: old.hash,
      prevRefreshHash: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      ip: null,
      ua: null,
    })
    mocks.findUnique.mockResolvedValue(makeUser('unused'))

    const result = await service.refresh({ refreshToken: old.token }, {})
    expect(result.tokens.refreshToken).not.toBe(old.token)
    const update = mocks.sessionUpdate.mock.calls[0]?.[0] as {
      data: { prevRefreshHash: string; refreshHash: string }
    }
    expect(update.data.prevRefreshHash).toBe(old.hash)
    expect(update.data.refreshHash).toBe(
      tokens.hashRefreshSecret(tokens.parseRefreshToken(result.tokens.refreshToken).secret),
    )
    expect(parsed.sessionId).toBe('session_1')
  })

  it('旧 refresh 二次使用：吊销全部会话 + tokenVersion+1 + 20102', async () => {
    const { prisma, mocks } = makePrisma()
    const service = new AuthService(prisma, tokens, { verify: vi.fn() } as unknown as SmsCodeStore)
    const old = tokens.createRefreshToken('session_1', '30d')
    const parsed = tokens.parseRefreshToken(old.token)

    mocks.sessionFind.mockResolvedValue({
      id: 'session_1',
      userId: 'user_1',
      refreshHash: 'current-hash',
      prevRefreshHash: old.hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      ip: null,
      ua: null,
    })

    await expect(service.refresh({ refreshToken: old.token }, {})).rejects.toMatchObject({
      code: 20102,
    })
    expect(parsed.secret).not.toBe('')
    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { tokenVersion: { increment: 1 } },
    })
  })
})

describe('AuthService.loginWithSms', () => {
  it('用户不存在且允许自动注册：建 MEMBER 用户、按 sms 记成功日志', async () => {
    const { prisma, mocks } = makePrisma()
    const verify = vi.fn()
    const service = new AuthService(prisma, tokens, { verify } as unknown as SmsCodeStore)

    mocks.findFirst.mockResolvedValue(null)
    mocks.roleFind.mockResolvedValue({ id: 'role_member' })
    const memberUser = makeUser('unused', {
      id: 'user_new',
      phone: '13800000002',
      name: '用户0002',
      roles: [
        {
          id: 'ur_2',
          userId: 'user_new',
          roleId: 'role_member',
          grantedAt: new Date(),
          role: {
            id: 'role_member',
            code: 'MEMBER',
            name: '普通成员',
            permissions: ['meeting:read'],
            builtin: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        },
      ],
    })
    mocks.userCreate.mockResolvedValue(memberUser)

    const result = await service.loginWithSms(
      { phone: '13800000002', code: '123456' },
      { ip: '127.0.0.1' },
    )

    expect(verify).toHaveBeenCalledWith('13800000002', '123456')
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: '13800000002',
        roles: { create: { roleId: 'role_member' } },
      }),
      include: expect.any(Object),
    })
    expect(result.user.roles).toEqual(['MEMBER'])
    expect(mocks.loginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ channel: 'sms', success: true }),
    })
  })
})
