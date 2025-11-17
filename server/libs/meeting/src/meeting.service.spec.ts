import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { IdempotencyService } from '../../common/src/idempotency.service'
import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { MeetingService } from './meeting.service'

const host: AuthUser = {
  id: 'user_1',
  phone: '13800000000',
  name: '管理员',
  avatarUrl: null,
  roles: ['SUPER_ADMIN'],
  permissions: [],
}

function meetingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'm_1',
    meetingNo: '123456789',
    title: '周会',
    hostId: host.id,
    roomName: 'lk_m_1_abcd',
    status: 'SCHEDULED',
    startAt: new Date('2026-01-01T02:00:00.000Z'),
    endAt: new Date('2026-01-01T03:00:00.000Z'),
    timezone: 'Asia/Shanghai',
    passwordHash: null,
    settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
    actualStartAt: null,
    actualEndAt: null,
    hostKey: 'hash',
    lockedAt: null,
    allowWaitingRoom: false,
    createdAt: new Date('2025-12-01T00:00:00.000Z'),
    updatedAt: new Date('2025-12-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}

interface Mocks {
  meetingCreate: ReturnType<typeof vi.fn>
  meetingUpdate: ReturnType<typeof vi.fn>
  meetingFindFirst: ReturnType<typeof vi.fn>
  meetingFindUnique: ReturnType<typeof vi.fn>
  meetingFindMany: ReturnType<typeof vi.fn>
  meetingCount: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
}

function makePrisma(): { prisma: PrismaService; mocks: Mocks } {
  const mocks: Mocks = {
    meetingCreate: vi.fn(),
    meetingUpdate: vi.fn(),
    meetingFindFirst: vi.fn(),
    meetingFindUnique: vi.fn(),
    meetingFindMany: vi.fn(),
    meetingCount: vi.fn(),
    transaction: vi.fn(),
  }
  const prisma = {
    meeting: {
      create: mocks.meetingCreate,
      update: mocks.meetingUpdate,
      findFirst: mocks.meetingFindFirst,
      findUnique: mocks.meetingFindUnique,
      findMany: mocks.meetingFindMany,
      count: mocks.meetingCount,
    },
    $transaction: mocks.transaction,
  } as unknown as PrismaService
  mocks.transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => unknown)(prisma)
      : Promise.all(arg as unknown[]),
  )
  return { prisma, mocks }
}

function makeIdempotency(): IdempotencyService {
  const store = new Map<string, unknown>()
  return {
    get: (key: string) => store.get(key),
    put: (key: string, value: unknown) => void store.set(key, value),
  } as unknown as IdempotencyService
}

describe('MeetingService.create', () => {
  it('生成 9 位会议号、6 位 hostKey，并把主持人写进参会人', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindUnique.mockResolvedValue(null)
    mocks.meetingCreate.mockResolvedValue(meetingRow())
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ roomName: 'lk_m_1_deadbeef' }))
    const service = new MeetingService(prisma, makeIdempotency())

    const result = await service.create(host, {
      title: '周会',
      startAt: '2026-01-01T10:00:00+08:00',
      endAt: '2026-01-01T11:00:00+08:00',
      settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
      inviteeIds: [],
    })

    expect(result.meetingNo).toMatch(/^\d{9}$/)
    expect(result.hostKey).toMatch(/^\d{6}$/)
    expect(mocks.meetingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        participants: {
          create: [expect.objectContaining({ userId: host.id, role: 'HOST' })],
        },
      }),
    })
    expect(mocks.meetingUpdate).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { roomName: expect.stringMatching(/^lk_m_1_[0-9a-f]{8}$/) },
    })
  })

  it('同一个 Idempotency-Key 第二次直接返回缓存，不再写库', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindUnique.mockResolvedValue(null)
    mocks.meetingCreate.mockResolvedValue(meetingRow())
    mocks.meetingUpdate.mockResolvedValue(meetingRow())
    const service = new MeetingService(prisma, makeIdempotency())

    const input = {
      title: '周会',
      startAt: '2026-01-01T10:00:00+08:00',
      endAt: '2026-01-01T11:00:00+08:00',
      settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
      inviteeIds: [],
    }
    const first = await service.create(host, input, 'key-1')
    const second = await service.create(host, input, 'key-1')

    expect(second).toEqual(first)
    expect(mocks.meetingCreate).toHaveBeenCalledTimes(1)
  })
})

describe('MeetingService.update', () => {
  it('If-Match 缺失或过期返回 412，且不写库', async () => {
    const { prisma, mocks } = makePrisma()
    const row = meetingRow()
    mocks.meetingFindFirst.mockResolvedValue(row)
    const service = new MeetingService(prisma, makeIdempotency())

    await expect(service.update(host, 'm_1', undefined, { title: '改名' })).rejects.toMatchObject({
      status: 412,
    })
    await expect(service.update(host, 'm_1', '"stale"', { title: '改名' })).rejects.toMatchObject({
      status: 412,
    })
    expect(mocks.meetingUpdate).not.toHaveBeenCalled()
  })

  it('ETag 匹配时更新并回新的 ETag', async () => {
    const { prisma, mocks } = makePrisma()
    const row = meetingRow()
    mocks.meetingFindFirst.mockResolvedValue(row)
    const next = meetingRow({ title: '改名', updatedAt: new Date('2025-12-02T00:00:00.000Z') })
    mocks.meetingUpdate.mockResolvedValue(next)
    const service = new MeetingService(prisma, makeIdempotency())

    const etag = `"${row.id}-${(row.updatedAt as Date).getTime()}"`
    const result = await service.update(host, 'm_1', etag, { title: '改名' })

    expect(result.meeting.title).toBe('改名')
    expect(result.etag).toBe(`"m_1-${new Date('2025-12-02T00:00:00.000Z').getTime()}"`)
  })

  it('非主持人返回 403', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ hostId: 'other' }))
    const service = new MeetingService(prisma, makeIdempotency())

    await expect(service.update(host, 'm_1', '"x"', { title: '改名' })).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('MeetingService.remove', () => {
  it('软删写 deletedAt，不物理删', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow())
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ deletedAt: new Date() }))
    const service = new MeetingService(prisma, makeIdempotency())

    await service.remove(host, 'm_1')

    expect(mocks.meetingUpdate).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { deletedAt: expect.any(Date) },
    })
  })
})
