import { describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { AdminStatsService, TREND_DAYS } from './admin-stats.service'

function createPrisma(): {
  user: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  meeting: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  meetingParticipant: { count: ReturnType<typeof vi.fn> }
  meetingFile: { findMany: ReturnType<typeof vi.fn> }
} {
  return {
    user: { count: vi.fn(), findMany: vi.fn() },
    meeting: { count: vi.fn(), findMany: vi.fn() },
    meetingParticipant: { count: vi.fn() },
    meetingFile: { findMany: vi.fn() },
  }
}

function serviceWith(prisma: ReturnType<typeof createPrisma>): AdminStatsService {
  return new AdminStatsService(prisma as unknown as PrismaService)
}

describe('AdminStatsService', () => {
  it('概览并行取四个计数', async () => {
    const prisma = createPrisma()
    prisma.user.count.mockResolvedValue(12)
    prisma.meeting.count.mockResolvedValueOnce(30).mockResolvedValueOnce(3)
    prisma.meetingParticipant.count.mockResolvedValue(5)

    await expect(serviceWith(prisma).overview()).resolves.toEqual({
      usersTotal: 12,
      meetingsTotal: 30,
      ongoingMeetings: 3,
      onlineParticipants: 5,
    })
    expect(prisma.meeting.count).toHaveBeenNthCalledWith(2, {
      where: { deletedAt: null, status: 'ONGOING' },
    })
  })

  it('会议趋势按 UTC 日期分桶，范围外的数据不进桶', async () => {
    const prisma = createPrisma()
    prisma.meeting.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-03T09:00:00.000Z') },
      { createdAt: new Date('2026-01-01T23:59:00.000Z') },
      { createdAt: new Date('2025-12-01T00:00:00.000Z') },
    ])

    const trend = await serviceWith(prisma).meetingTrend(new Date('2026-01-03T12:00:00.000Z'))

    expect(trend.points).toHaveLength(TREND_DAYS)
    expect(trend.points[0]).toEqual({ date: '2025-12-21', count: 0 })
    expect(trend.points.at(-1)).toEqual({ date: '2026-01-03', count: 1 })
    expect(trend.points.find((point) => point.date === '2026-01-01')?.count).toBe(1)
  })

  it('用户增长按注册日期分桶', async () => {
    const prisma = createPrisma()
    prisma.user.findMany.mockResolvedValue([
      { createdAt: new Date('2026-01-02T01:00:00.000Z') },
      { createdAt: new Date('2026-01-02T02:00:00.000Z') },
    ])

    const growth = await serviceWith(prisma).userGrowth(new Date('2026-01-02T12:00:00.000Z'))

    expect(growth.points.at(-1)).toEqual({ date: '2026-01-02', count: 2 })
  })

  it('用量按 MIME 归组并按字节倒序', async () => {
    const prisma = createPrisma()
    prisma.meetingFile.findMany.mockResolvedValue([
      { mime: 'image/png', sizeBytes: 100 },
      { mime: 'image/jpeg', sizeBytes: 50 },
      { mime: 'application/pdf', sizeBytes: 200 },
      { mime: null, sizeBytes: 10 },
    ])

    await expect(serviceWith(prisma).usage()).resolves.toEqual({
      slices: [
        { name: '文档', value: 200 },
        { name: '图片', value: 150 },
        { name: '其他', value: 10 },
      ],
    })
  })

  it('没有文件时返回空切片', async () => {
    const prisma = createPrisma()
    prisma.meetingFile.findMany.mockResolvedValue([])

    await expect(serviceWith(prisma).usage()).resolves.toEqual({ slices: [] })
  })

  it('实时房间带主持人与在线人数', async () => {
    const prisma = createPrisma()
    prisma.meeting.findMany.mockResolvedValue([
      {
        id: 'm_1',
        meetingNo: '123456789',
        title: '周会',
        actualStartAt: new Date('2026-01-01T02:00:00.000Z'),
        host: { name: '管理员' },
        participants: [{ id: 'p_1' }, { id: 'p_2' }],
      },
    ])

    await expect(serviceWith(prisma).rooms()).resolves.toEqual({
      items: [
        {
          meetingId: 'm_1',
          meetingNo: '123456789',
          title: '周会',
          hostName: '管理员',
          onlineCount: 2,
          startedAt: '2026-01-01T02:00:00.000Z',
        },
      ],
    })
    expect(prisma.meeting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, status: 'ONGOING' } }),
    )
  })
})
