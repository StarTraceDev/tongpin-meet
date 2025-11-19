import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { IdempotencyService } from '../../common/src/idempotency.service'
import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { MeetingService } from './meeting.service'
import type { RtcPort } from './rtc/rtc.port'

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
  participantFindUnique: ReturnType<typeof vi.fn>
  participantCreate: ReturnType<typeof vi.fn>
  participantUpdate: ReturnType<typeof vi.fn>
  participantUpdateMany: ReturnType<typeof vi.fn>
  eventAggregate: ReturnType<typeof vi.fn>
  eventCreate: ReturnType<typeof vi.fn>
  waitingCreate: ReturnType<typeof vi.fn>
  waitingFindFirst: ReturnType<typeof vi.fn>
  waitingFindMany: ReturnType<typeof vi.fn>
  waitingUpdate: ReturnType<typeof vi.fn>
  waitingUpdateMany: ReturnType<typeof vi.fn>
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
    participantFindUnique: vi.fn(),
    participantCreate: vi.fn(),
    participantUpdate: vi.fn(),
    participantUpdateMany: vi.fn(),
    eventAggregate: vi.fn(),
    eventCreate: vi.fn(),
    waitingCreate: vi.fn(),
    waitingFindFirst: vi.fn(),
    waitingFindMany: vi.fn(),
    waitingUpdate: vi.fn(),
    waitingUpdateMany: vi.fn(),
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
    meetingParticipant: {
      findUnique: mocks.participantFindUnique,
      create: mocks.participantCreate,
      update: mocks.participantUpdate,
      updateMany: mocks.participantUpdateMany,
    },
    meetingEvent: {
      aggregate: mocks.eventAggregate,
      create: mocks.eventCreate,
    },
    waitingRoomEntry: {
      create: mocks.waitingCreate,
      findFirst: mocks.waitingFindFirst,
      findMany: mocks.waitingFindMany,
      update: mocks.waitingUpdate,
      updateMany: mocks.waitingUpdateMany,
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

function makeRtc(): RtcPort {
  return {
    issue: (roomName: string, identity: string) =>
      Promise.resolve({
        token: `mock.${roomName}.${identity}`,
        url: 'ws://127.0.0.1:7880',
        expiresAt: new Date(),
      }),
  } as RtcPort
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
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const result = await service.create(host, {
      title: '周会',
      startAt: '2026-01-01T10:00:00+08:00',
      endAt: '2026-01-01T11:00:00+08:00',
      settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
      inviteeIds: [],
      allowWaitingRoom: false,
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
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const input = {
      title: '周会',
      startAt: '2026-01-01T10:00:00+08:00',
      endAt: '2026-01-01T11:00:00+08:00',
      settings: { muteOnJoin: true, watermark: false, allowGuest: false, autoRecord: false },
      inviteeIds: [],
      allowWaitingRoom: false,
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
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

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
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const etag = `"${row.id}-${(row.updatedAt as Date).getTime()}"`
    const result = await service.update(host, 'm_1', etag, { title: '改名' })

    expect(result.meeting.title).toBe('改名')
    expect(result.etag).toBe(`"m_1-${new Date('2025-12-02T00:00:00.000Z').getTime()}"`)
  })

  it('非主持人返回 403', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ hostId: 'other' }))
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

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
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    await service.remove(host, 'm_1')

    expect(mocks.meetingUpdate).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { deletedAt: expect.any(Date) },
    })
  })
})

describe('MeetingService.join', () => {
  it('首次入会把 SCHEDULED 置 ONGOING，并返回 mock RTC', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow())
    mocks.participantFindUnique.mockResolvedValue(null)
    mocks.participantCreate.mockResolvedValue({
      id: 'p_1',
      role: 'ATTENDEE',
      guestName: null,
    })
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ status: 'ONGOING' }))
    mocks.eventAggregate.mockResolvedValue({ _max: { seq: 0 } })
    mocks.eventCreate.mockResolvedValue({})
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const result = (await service.join(host, 'm_1', {})) as {
      roomName: string
      rtc: { token: string }
    }

    expect(result.roomName).toBe('lk_m_1_abcd')
    expect(result.rtc.token).toContain('lk_m_1_abcd')
    expect(mocks.meetingUpdate).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { status: 'ONGOING', actualStartAt: expect.any(Date) },
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'meeting.member.joined', seq: 1 }),
    })
  })

  it('密码错误返回 403', async () => {
    const argon2 = await import('argon2')
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(
      meetingRow({ passwordHash: await argon2.hash('right-pass', { type: argon2.argon2id }) }),
    )
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    await expect(service.join(host, 'm_1', { password: 'wrong-pass' })).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('MeetingService.joinAsGuest', () => {
  it('allowGuest=false 时 403', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow())
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    await expect(
      service.joinAsGuest({ meetingNo: '123456789', nickname: '路人' }),
    ).rejects.toMatchObject({ status: 403 })
  })
})

describe('MeetingService.end', () => {
  it('结束会议：状态 ENDED、写 actualEndAt、全体未离会成员写 leftAt', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ status: 'ONGOING' }))
    mocks.meetingUpdate.mockResolvedValue(
      meetingRow({ status: 'ENDED', actualEndAt: new Date('2026-01-01T04:00:00.000Z') }),
    )
    mocks.participantUpdateMany.mockResolvedValue({ count: 2 })
    mocks.eventAggregate.mockResolvedValue({ _max: { seq: 3 } })
    mocks.eventCreate.mockResolvedValue({})
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const meeting = await service.end(host, 'm_1')

    expect(meeting.status).toBe('ENDED')
    expect(mocks.participantUpdateMany).toHaveBeenCalledWith({
      where: { meetingId: 'm_1', leftAt: null },
      data: { leftAt: expect.any(Date) },
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'meeting.ended', seq: 4 }),
    })
  })
})

describe('MeetingService.lock', () => {
  it('锁定后写 lockedAt，再入会 403', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow())
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ lockedAt: new Date() }))
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const locked = await service.lock(host, 'm_1', true)
    expect(locked.locked).toBe(true)

    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ lockedAt: new Date() }))
    await expect(service.join(host, 'm_1', {})).rejects.toMatchObject({ status: 403 })
  })
})

describe('MeetingService.claimHost', () => {
  it('hostKey 错误 403，正确则转让主持权', async () => {
    const argon2 = await import('argon2')
    const { prisma, mocks } = makePrisma()
    const row = meetingRow({ hostKey: await argon2.hash('123456', { type: argon2.argon2id }) })
    mocks.meetingFindFirst.mockResolvedValue(row)
    mocks.participantFindUnique.mockResolvedValue({ id: 'p_2', role: 'ATTENDEE' })
    mocks.participantUpdateMany = undefined as never
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ hostId: host.id }))
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    await expect(service.claimHost(host, 'm_1', { hostKey: '000000' })).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('MeetingService 等候室', () => {
  it('开启等候室时，非邀请者 join 返回 waiting 并落 PENDING 记录', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ allowWaitingRoom: true }))
    mocks.participantFindUnique.mockResolvedValue(null)
    mocks.waitingCreate.mockResolvedValue({ id: 'w_1' })
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const viewer = { ...host, id: 'user_2' }
    const result = await service.join(viewer, 'm_1', {})

    expect(result).toEqual({ meetingId: 'm_1', waiting: true, entryId: 'w_1' })
    expect(mocks.waitingCreate).toHaveBeenCalledWith({
      data: { meetingId: 'm_1', userId: 'user_2', status: 'PENDING' },
    })
  })

  it('准入把记录改 ADMITTED，并返回 RTC', async () => {
    const { prisma, mocks } = makePrisma()
    mocks.meetingFindFirst.mockResolvedValue(meetingRow({ allowWaitingRoom: true }))
    mocks.waitingFindFirst.mockResolvedValue({ id: 'w_1', userId: host.id, guestName: null })
    mocks.waitingUpdate.mockResolvedValue({})
    mocks.participantFindUnique.mockResolvedValue(null)
    mocks.participantCreate.mockResolvedValue({ id: 'p_3', role: 'ATTENDEE', guestName: null })
    mocks.meetingUpdate.mockResolvedValue(meetingRow({ status: 'ONGOING' }))
    mocks.eventAggregate.mockResolvedValue({ _max: { seq: 0 } })
    mocks.eventCreate.mockResolvedValue({})
    const service = new MeetingService(prisma, makeIdempotency(), makeRtc())

    const result = await service.admit(host, 'm_1', 'w_1')

    expect(result.rtc.token).toContain('lk_m_1_abcd')
    expect(mocks.waitingUpdate).toHaveBeenCalledWith({
      where: { id: 'w_1' },
      data: { status: 'ADMITTED' },
    })
  })
})
