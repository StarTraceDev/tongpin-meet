import { describe, expect, it, vi } from 'vitest'

import type { AuthUser, SessionResponse } from '@tongpin/shared/types'

import { ApiError } from '../../../common/src/errors/api-error'
import type { PrismaService } from '../../../infra/src/prisma/prisma.service'
import type { AuthService } from '../auth.service'

import { QrSessionService } from './qr-session.service'

const user: AuthUser = {
  id: 'user_1',
  phone: '13800000001',
  name: '张三',
  avatarUrl: null,
  roles: ['MEMBER'],
  permissions: ['meeting:read'],
}

const session: SessionResponse = {
  user,
  tokens: {
    accessToken: 'access',
    accessExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    refreshToken: 'refresh',
    refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'qr_1',
    code: '123456',
    status: 'PENDING',
    userId: null,
    deviceSessionId: null,
    confirmedAt: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 300_000),
    ...overrides,
  }
}

function makePrisma(): {
  prisma: PrismaService
  qr: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
  user: { findUnique: ReturnType<typeof vi.fn> }
  loginLog: { create: ReturnType<typeof vi.fn> }
} {
  const qr = {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  }
  const userModel = { findUnique: vi.fn() }
  const loginLog = { create: vi.fn().mockResolvedValue({}) }
  const prisma = { qrSession: qr, user: userModel, loginLog } as unknown as PrismaService
  return { prisma, qr, user: userModel, loginLog }
}

describe('QrSessionService.create', () => {
  it('生成 6 位数字码，5 分钟后过期', async () => {
    const { prisma, qr } = makePrisma()
    qr.findFirst.mockResolvedValue(null)
    qr.create.mockImplementation(async ({ data }: { data: { code: string; expiresAt: Date } }) =>
      row({ code: data.code, expiresAt: data.expiresAt }),
    )
    const auth = { issueSession: vi.fn() } as unknown as AuthService
    const service = new QrSessionService(prisma, auth)

    const result = await service.create()

    expect(result.code).toMatch(/^\d{6}$/)
    expect(result.status).toBe('PENDING')
    const ttl = new Date(result.expiresAt).getTime() - Date.now()
    expect(ttl).toBeGreaterThan(4 * 60_000)
    expect(ttl).toBeLessThanOrEqual(5 * 60_000)
  })
})

describe('QrSessionService.poll', () => {
  it('PENDING 时只回状态，不下发会话', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(row())
    const auth = { issueSession: vi.fn() } as unknown as AuthService
    const service = new QrSessionService(prisma, auth)

    const result = await service.poll('qr_1', {})

    expect(result.status).toBe('PENDING')
    expect(result.session).toBeUndefined()
    expect(auth.issueSession).not.toHaveBeenCalled()
  })

  it('CONFIRMED 时一次性下发 token 并转 CONSUMED；再轮询不再下发', async () => {
    const { prisma, qr, user: userModel, loginLog } = makePrisma()
    qr.findUnique.mockResolvedValueOnce(row({ status: 'CONFIRMED', userId: user.id }))
    qr.updateMany.mockResolvedValue({ count: 1 })
    qr.update.mockResolvedValue(row({ status: 'CONSUMED', userId: user.id }))
    userModel.findUnique.mockResolvedValue({ ...user, tokenVersion: 0, roles: [] })
    const auth = { issueSession: vi.fn().mockResolvedValue({ session, sessionId: 'sess_1' }) }
    const service = new QrSessionService(prisma, auth as unknown as AuthService)

    const first = await service.poll('qr_1', { ip: '127.0.0.1', ua: 'test' })
    expect(first.status).toBe('CONSUMED')
    expect(first.session?.tokens.accessToken).toBe('access')
    expect(qr.update).toHaveBeenCalledWith({
      where: { id: 'qr_1' },
      data: { deviceSessionId: 'sess_1' },
    })
    expect(loginLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ channel: 'qr', success: true }),
    })

    qr.findUnique.mockResolvedValueOnce(row({ status: 'CONSUMED', userId: user.id }))
    const second = await service.poll('qr_1', {})
    expect(second.status).toBe('CONSUMED')
    expect(second.session).toBeUndefined()
    expect(auth.issueSession).toHaveBeenCalledTimes(1)
  })

  it('过期后首次轮询把状态改为 EXPIRED', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1000) }))
    qr.update.mockResolvedValue(row({ status: 'EXPIRED', expiresAt: new Date(Date.now() - 1000) }))
    const service = new QrSessionService(prisma, {
      issueSession: vi.fn(),
    } as unknown as AuthService)

    const result = await service.poll('qr_1', {})

    expect(result.status).toBe('EXPIRED')
    expect(qr.update).toHaveBeenCalledWith({ where: { id: 'qr_1' }, data: { status: 'EXPIRED' } })
  })
})

describe('QrSessionService.confirm', () => {
  it('设备码不匹配时抛 20103，不写库', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(row({ code: '123456' }))
    const service = new QrSessionService(prisma, {
      issueSession: vi.fn(),
    } as unknown as AuthService)

    await expect(service.confirm('qr_1', '000000', user)).rejects.toMatchObject({
      code: 20103,
      status: 400,
    })
    expect(qr.update).not.toHaveBeenCalled()
  })

  it('确认成功后写 CONFIRMED + 确认人', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(row())
    qr.update.mockResolvedValue(row({ status: 'CONFIRMED', userId: user.id }))
    const service = new QrSessionService(prisma, {
      issueSession: vi.fn(),
    } as unknown as AuthService)

    await service.confirm('qr_1', '123456', user)

    expect(qr.update).toHaveBeenCalledWith({
      where: { id: 'qr_1' },
      data: expect.objectContaining({ status: 'CONFIRMED', userId: user.id }),
    })
  })
})

describe('QrSessionService.reject', () => {
  it('拒绝后状态为 REJECTED', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(row())
    qr.update.mockResolvedValue(row({ status: 'REJECTED' }))
    const service = new QrSessionService(prisma, {
      issueSession: vi.fn(),
    } as unknown as AuthService)

    await service.reject('qr_1', user)

    expect(qr.update).toHaveBeenCalledWith({
      where: { id: 'qr_1' },
      data: expect.objectContaining({ status: 'REJECTED' }),
    })
  })

  it('不存在的 id 抛 404/10000', async () => {
    const { prisma, qr } = makePrisma()
    qr.findUnique.mockResolvedValue(null)
    const service = new QrSessionService(prisma, {
      issueSession: vi.fn(),
    } as unknown as AuthService)

    await expect(service.reject('missing', user)).rejects.toBeInstanceOf(ApiError)
    await expect(service.reject('missing', user)).rejects.toMatchObject({ status: 404 })
  })
})
