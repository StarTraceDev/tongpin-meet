import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { MeetingService } from '../../meeting/src/meeting.service'

import { CheckinService } from './checkin.service'
import { InteractionAccess } from './interaction-access'

const host: AuthUser = {
  id: 'user_host',
  phone: '13800000000',
  name: '主持人',
  avatarUrl: null,
  roles: ['USER'],
  permissions: [],
}
const attendee: AuthUser = { ...host, id: 'user_2', name: '参会人', phone: '13800000001' }

function checkinRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'c_1',
    meetingId: 'm_1',
    title: '全员签到',
    status: 'ONGOING',
    anonymous: false,
    createdById: host.id,
    createdAt: new Date('2026-01-01T02:00:00.000Z'),
    closedAt: null,
    ...overrides,
  }
}

interface Mocks {
  checkinCreate: ReturnType<typeof vi.fn>
  checkinFindMany: ReturnType<typeof vi.fn>
  checkinFindFirst: ReturnType<typeof vi.fn>
  checkinUpdate: ReturnType<typeof vi.fn>
  recordFindUnique: ReturnType<typeof vi.fn>
  recordCreate: ReturnType<typeof vi.fn>
  recordFindMany: ReturnType<typeof vi.fn>
  recordCount: ReturnType<typeof vi.fn>
  participantFindUnique: ReturnType<typeof vi.fn>
  participantCount: ReturnType<typeof vi.fn>
  meetingFindUnique: ReturnType<typeof vi.fn>
  userFindMany: ReturnType<typeof vi.fn>
  appendEvent: ReturnType<typeof vi.fn>
}

function makeService(): { service: CheckinService; mocks: Mocks } {
  const mocks: Mocks = {
    checkinCreate: vi.fn(),
    checkinFindMany: vi.fn(),
    checkinFindFirst: vi.fn(),
    checkinUpdate: vi.fn(),
    recordFindUnique: vi.fn(),
    recordCreate: vi.fn(),
    recordFindMany: vi.fn(),
    recordCount: vi.fn(),
    participantFindUnique: vi.fn(),
    participantCount: vi.fn(),
    meetingFindUnique: vi.fn(),
    userFindMany: vi.fn(),
    appendEvent: vi.fn(async () => undefined),
  }
  const prisma = {
    checkin: {
      create: mocks.checkinCreate,
      findMany: mocks.checkinFindMany,
      findFirst: mocks.checkinFindFirst,
      update: mocks.checkinUpdate,
    },
    checkinRecord: {
      findUnique: mocks.recordFindUnique,
      create: mocks.recordCreate,
      findMany: mocks.recordFindMany,
      count: mocks.recordCount,
    },
    meetingParticipant: {
      findUnique: mocks.participantFindUnique,
      count: mocks.participantCount,
    },
    meeting: { findUnique: mocks.meetingFindUnique },
    user: { findMany: mocks.userFindMany },
  } as unknown as PrismaService
  const meetings = { appendEvent: mocks.appendEvent } as unknown as MeetingService
  return { service: new CheckinService(prisma, new InteractionAccess(prisma), meetings), mocks }
}

describe('CheckinService', () => {
  it('主持人发起签到并广播 meeting.checkin.started', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.checkinCreate.mockResolvedValue(checkinRow())

    const result = await service.create(host, 'm_1', { title: '全员签到', anonymous: false })

    expect(result.id).toBe('c_1')
    expect(mocks.appendEvent).toHaveBeenCalledWith(
      'm_1',
      'meeting.checkin.started',
      host.id,
      expect.objectContaining({ checkinId: 'c_1' }),
    )
  })

  it('会议未开始时拒绝发起', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'SCHEDULED',
      hostId: host.id,
      deletedAt: null,
    })
    await expect(
      service.create(host, 'm_1', { title: '签到', anonymous: false }),
    ).rejects.toMatchObject({ status: 409, code: 30402 })
  })

  it('普通参会人不能发起签到', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.participantFindUnique.mockResolvedValue({ role: 'ATTENDEE' })
    await expect(
      service.create(attendee, 'm_1', { title: '签到', anonymous: false }),
    ).rejects.toMatchObject({ status: 403, code: 10003 })
  })

  it('重复签到幂等且不重复广播', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.participantFindUnique.mockResolvedValue({ role: 'ATTENDEE' })
    mocks.checkinFindFirst.mockResolvedValue(checkinRow())
    mocks.recordFindUnique.mockResolvedValue({ respondedAt: new Date('2026-01-01T02:01:00.000Z') })

    const result = await service.record(attendee, 'm_1', 'c_1')

    expect(result.alreadyRecorded).toBe(true)
    expect(mocks.appendEvent).not.toHaveBeenCalled()
  })

  it('已关闭的签到不能再关闭', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.checkinFindFirst.mockResolvedValue(checkinRow({ status: 'CLOSED' }))
    await expect(service.close(host, 'm_1', 'c_1')).rejects.toMatchObject({
      status: 409,
      code: 30403,
    })
  })

  it('匿名签到的结果不暴露实名', async () => {
    const { service, mocks } = makeService()
    mocks.meetingFindUnique.mockResolvedValue({
      id: 'm_1',
      status: 'ONGOING',
      hostId: host.id,
      deletedAt: null,
    })
    mocks.checkinFindFirst.mockResolvedValue(checkinRow({ anonymous: true }))
    mocks.recordFindMany.mockResolvedValue([
      { userId: 'user_2', respondedAt: new Date('2026-01-01T02:01:00.000Z') },
    ])
    mocks.participantCount.mockResolvedValue(3)
    mocks.userFindMany.mockResolvedValue([])

    const overview = await service.overview(host, 'm_1', 'c_1')

    expect(overview.total).toBe(3)
    expect(overview.joined).toBe(1)
    expect(overview.records[0]).toMatchObject({ userId: null, userName: '匿名' })
    expect(mocks.userFindMany).toHaveBeenCalled()
  })
})
