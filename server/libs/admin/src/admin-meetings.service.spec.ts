import { describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { MeetingService } from '../../meeting/src/meeting.service'

import { AdminMeetingsService } from './admin-meetings.service'

interface RowLike {
  id: string
  meetingNo: string
  title: string
  status: string
  startAt: Date
  actualStartAt: Date | null
  actualEndAt: Date | null
  host: { name: string }
  _count: { participants: number }
}

function row(overrides: Partial<RowLike> = {}): RowLike {
  return {
    id: 'm_1',
    meetingNo: '123456789',
    title: '产品周会',
    status: 'ONGOING',
    startAt: new Date('2026-01-05T02:00:00.000Z'),
    actualStartAt: new Date('2026-01-05T02:03:00.000Z'),
    actualEndAt: null,
    host: { name: '运营管理员' },
    _count: { participants: 8 },
    ...overrides,
  }
}

function createPrisma(rows: RowLike[] = [row()]): {
  prisma: {
    meeting: {
      count: ReturnType<typeof vi.fn>
      findMany: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
    }
    $transaction: ReturnType<typeof vi.fn>
  }
} {
  const prisma = {
    meeting: {
      count: vi.fn(async () => 42),
      findMany: vi.fn(async () => rows),
      findUnique: vi.fn(async () => rows[0] ?? null),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }
  return { prisma }
}

function serviceWith(
  prisma: ReturnType<typeof createPrisma>['prisma'],
  forceEnd = vi.fn(async () => ({ id: 'm_1' })),
): AdminMeetingsService {
  return new AdminMeetingsService(
    prisma as unknown as PrismaService,
    { forceEnd } as unknown as MeetingService,
  )
}

describe('AdminMeetingsService.list', () => {
  it('默认按 startAt 倒序并分页', async () => {
    const { prisma } = createPrisma()

    const result = await serviceWith(prisma).list({
      page: 2,
      pageSize: 20,
      sort: undefined,
      status: undefined,
      keyword: undefined,
    })

    expect(result).toEqual({
      items: [
        {
          id: 'm_1',
          meetingNo: '123456789',
          title: '产品周会',
          hostName: '运营管理员',
          status: 'ONGOING',
          startAt: '2026-01-05T02:00:00.000Z',
          actualStartAt: '2026-01-05T02:03:00.000Z',
          actualEndAt: null,
          participantCount: 8,
        },
      ],
      total: 42,
      page: 2,
      pageSize: 20,
    })
    expect(prisma.meeting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { startAt: 'desc' }, skip: 20, take: 20 }),
    )
  })

  it('状态与关键词合并成过滤条件，未知排序字段回落到 startAt', async () => {
    const { prisma } = createPrisma()

    await serviceWith(prisma).list({
      page: 1,
      pageSize: 10,
      sort: 'nope',
      status: 'ENDED',
      keyword: '周会',
    })

    expect(prisma.meeting.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'ENDED',
        OR: [
          { title: { contains: '周会', mode: 'insensitive' } },
          { meetingNo: { contains: '周会' } },
        ],
      },
    })
    expect(prisma.meeting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { startAt: 'asc' } }),
    )
  })

  it('允许按 title 正序', async () => {
    const { prisma } = createPrisma()

    await serviceWith(prisma).list({
      page: 1,
      pageSize: 20,
      sort: 'title',
      status: undefined,
      keyword: undefined,
    })

    expect(prisma.meeting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { title: 'asc' } }),
    )
  })
})

describe('AdminMeetingsService.forceEnd', () => {
  it('转调会议域状态机并把结果补成列表行', async () => {
    const { prisma } = createPrisma()
    const forceEnd = vi.fn(async () => ({ id: 'm_1' }))

    await expect(serviceWith(prisma, forceEnd).forceEnd('m_1')).resolves.toMatchObject({
      id: 'm_1',
      status: 'ONGOING',
      hostName: '运营管理员',
    })
    expect(forceEnd).toHaveBeenCalledWith('m_1')
  })

  it('结束后查不到会议行时返回 404 形状', async () => {
    const { prisma } = createPrisma()
    prisma.meeting.findUnique.mockResolvedValue(null)

    await expect(serviceWith(prisma).forceEnd('m_1')).rejects.toMatchObject({ status: 404 })
  })
})
