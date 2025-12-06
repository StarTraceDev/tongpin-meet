import { describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@tongpin/shared/types'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { MeetingService } from '../../meeting/src/meeting.service'

import { BreakService } from './break.service'
import { InteractionAccess } from './interaction-access'

const host: AuthUser = {
  id: 'user_host',
  phone: '13800000000',
  name: '主持人',
  avatarUrl: null,
  roles: ['USER'],
  permissions: [],
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'b_1',
    meetingId: 'm_1',
    title: '茶歇',
    status: 'ONGOING',
    plannedSec: 600,
    createdById: host.id,
    startedAt: new Date('2026-01-01T02:00:00.000Z'),
    endedAt: null,
    ...overrides,
  }
}

function makeService(): {
  service: BreakService
  mocks: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    recordUpsert: ReturnType<typeof vi.fn>
    recordCount: ReturnType<typeof vi.fn>
    recordFindMany: ReturnType<typeof vi.fn>
    userFindMany: ReturnType<typeof vi.fn>
    appendEvent: ReturnType<typeof vi.fn>
  }
} {
  const mocks = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    recordUpsert: vi.fn(),
    recordCount: vi.fn(),
    recordFindMany: vi.fn(),
    userFindMany: vi.fn(),
    appendEvent: vi.fn(async () => undefined),
  }
  const prisma = {
    break: {
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
      findMany: vi.fn(),
    },
    breakRecord: {
      upsert: mocks.recordUpsert,
      count: mocks.recordCount,
      findMany: mocks.recordFindMany,
    },
    user: { findMany: mocks.userFindMany },
    meeting: {
      findUnique: vi.fn(async () => ({
        id: 'm_1',
        status: 'ONGOING',
        hostId: host.id,
        deletedAt: null,
      })),
    },
    meetingParticipant: { findUnique: vi.fn() },
  } as unknown as PrismaService
  const meetings = { appendEvent: mocks.appendEvent } as unknown as MeetingService
  return { service: new BreakService(prisma, new InteractionAccess(prisma), meetings), mocks }
}

describe('BreakService', () => {
  it('会议未开始不能发起休息', async () => {
    const { service } = makeService()
    const prisma = (
      service as unknown as { prisma: { meeting: { findUnique: ReturnType<typeof vi.fn> } } }
    ).prisma
    prisma.meeting.findUnique.mockResolvedValue({
      id: 'm_1',
      status: 'SCHEDULED',
      hostId: host.id,
      deletedAt: null,
    })
    await expect(service.create(host, 'm_1', {})).rejects.toMatchObject({
      status: 409,
      code: 30402,
    })
  })

  it('同一会议已有进行中的休息时拒绝再发起', async () => {
    const { service, mocks } = makeService()
    mocks.findFirst.mockResolvedValue({ id: 'b_0' })
    await expect(service.create(host, 'm_1', {})).rejects.toMatchObject({
      status: 409,
      code: 30403,
    })
  })

  it('发起休息广播 meeting.break.started，结束广播 ended', async () => {
    const { service, mocks } = makeService()
    mocks.findFirst.mockResolvedValue(null)
    mocks.create.mockResolvedValue(row())
    const created = await service.create(host, 'm_1', { title: '茶歇', plannedSec: 600 })
    expect(created.status).toBe('ONGOING')
    expect(mocks.appendEvent).toHaveBeenCalledWith(
      'm_1',
      'meeting.break.started',
      host.id,
      expect.objectContaining({ breakId: 'b_1' }),
    )

    mocks.findFirst.mockResolvedValue(row())
    mocks.update.mockResolvedValue(row({ status: 'CLOSED', endedAt: new Date() }))
    const closed = await service.close(host, 'm_1', 'b_1')
    expect(closed.status).toBe('CLOSED')
    expect(mocks.appendEvent).toHaveBeenCalledWith('m_1', 'meeting.break.ended', host.id, {
      breakId: 'b_1',
    })
  })

  it('重复结束休息返回 409', async () => {
    const { service, mocks } = makeService()
    mocks.findFirst.mockResolvedValue(row({ status: 'CLOSED', endedAt: new Date() }))
    await expect(service.close(host, 'm_1', 'b_1')).rejects.toMatchObject({ status: 409 })
  })

  it('成员标记去休息后统计人数并广播 member-changed', async () => {
    const { service, mocks } = makeService()
    mocks.findFirst.mockResolvedValue(row())
    mocks.recordUpsert.mockResolvedValue({
      resting: true,
      changedAt: new Date('2026-01-01T02:05:00.000Z'),
    })
    mocks.recordCount.mockResolvedValue(3)
    const result = await service.setRecord(host, 'm_1', 'b_1', true)
    expect(result).toMatchObject({ resting: true, restingCount: 3 })
    expect(mocks.appendEvent).toHaveBeenCalledWith(
      'm_1',
      'meeting.break.member-changed',
      host.id,
      expect.objectContaining({ resting: true, restingCount: 3 }),
    )
  })

  it('概览把 record 补上用户名', async () => {
    const { service, mocks } = makeService()
    mocks.findFirst.mockResolvedValue(row())
    mocks.recordFindMany.mockResolvedValue([
      { userId: 'u1', resting: true, changedAt: new Date('2026-01-01T02:01:00.000Z') },
      { userId: 'u2', resting: false, changedAt: new Date('2026-01-01T02:02:00.000Z') },
    ])
    mocks.userFindMany.mockResolvedValue([
      { id: 'u1', name: '张三' },
      { id: 'u2', name: '李四' },
    ])
    const overview = await service.overview(host, 'm_1', 'b_1')
    expect(overview.restingCount).toBe(1)
    expect(overview.records[0]).toMatchObject({ userId: 'u1', userName: '张三', resting: true })
  })
})
