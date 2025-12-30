import { describe, expect, it, vi } from 'vitest'

import { FeedbackService } from './feedback.service'

const row = {
  id: 'fb_1',
  category: 'COMPLAINT' as const,
  content: '会议中途掉线',
  contact: '13800000001',
  status: 'PENDING' as const,
  source: 'USER' as const,
  reporterId: 'u_1',
  handledBy: null,
  reply: null,
  handledAt: null,
  createdAt: new Date('2026-01-01T02:00:00Z'),
  updatedAt: new Date('2026-01-01T02:00:00Z'),
}

function createPrisma(): never {
  return {
    feedback: {
      count: vi.fn(async () => 3),
      findMany: vi.fn(async () => [row]),
      create: vi.fn(async () => ({ ...row, source: 'ADMIN' })),
      findUnique: vi.fn(async () => row),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...row,
        status: data.status,
        handledBy: data.handledBy,
        handledAt: data.handledAt,
        reply: data.reply,
      })),
    },
    user: {
      findMany: vi.fn(async () => [
        { id: 'u_1', name: '张明' },
        { id: 'u_9', name: '运营管理员' },
      ]),
    },
    $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
  } as never
}

describe('FeedbackService', () => {
  it('列表过滤并补提交人 / 处理人姓名', async () => {
    const prisma = createPrisma()
    const service = new FeedbackService(prisma)

    const result = await service.list({ page: 1, pageSize: 20, status: 'PENDING', keyword: '掉线' })

    expect(result.items[0]).toMatchObject({
      id: 'fb_1',
      reporterName: '张明',
      status: 'PENDING',
      createdAt: '2026-01-01T02:00:00.000Z',
    })
    const args = (prisma as never as { feedback: { findMany: ReturnType<typeof vi.fn> } }).feedback
      .findMany.mock.calls[0]?.[0]
    expect(args).toMatchObject({
      where: {
        status: 'PENDING',
        OR: [
          { content: { contains: '掉线', mode: 'insensitive' } },
          { contact: { contains: '掉线' } },
        ],
      },
      skip: 0,
      take: 20,
    })
  })

  it('代录固定为管理员来源、待处理状态', async () => {
    const prisma = createPrisma()
    const service = new FeedbackService(prisma)

    await service.create({ category: 'ISSUE', content: '投影没声音', contact: null })

    expect(
      (prisma as never as { feedback: { create: ReturnType<typeof vi.fn> } }).feedback.create,
    ).toHaveBeenCalledWith({
      data: {
        category: 'ISSUE',
        content: '投影没声音',
        contact: null,
        status: 'PENDING',
        source: 'ADMIN',
      },
    })
  })

  it('详情不存在返回 404', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { feedback: { findUnique: ReturnType<typeof vi.fn> } }
    ).feedback.findUnique.mockResolvedValue(null)
    const service = new FeedbackService(prisma)

    await expect(service.detail('nope')).rejects.toMatchObject({ status: 404 })
  })

  it('拒绝跨状态流转', async () => {
    const prisma = createPrisma()
    const service = new FeedbackService(prisma)

    await expect(
      service.handle('fb_1', { status: 'RESOLVED', reply: '已处理' }, 'u_9'),
    ).rejects.toMatchObject({ status: 409, title: '当前状态不可流转到 RESOLVED' })
  })

  it('处理中 -> 已解决并写处理人、时间与回复', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { feedback: { findUnique: ReturnType<typeof vi.fn> } }
    ).feedback.findUnique.mockResolvedValue({
      ...row,
      status: 'PROCESSING',
      handledBy: 'u_9',
    })
    const service = new FeedbackService(prisma)

    const result = await service.handle(
      'fb_1',
      { status: 'RESOLVED', reply: '已确认网络问题' },
      'u_9',
    )

    expect(result.feedback).toMatchObject({
      status: 'RESOLVED',
      handledBy: 'u_9',
      handledName: '运营管理员',
      reply: '已确认网络问题',
    })
    const args = (prisma as never as { feedback: { update: ReturnType<typeof vi.fn> } }).feedback
      .update.mock.calls[0]?.[0]
    expect(args.data).toMatchObject({
      status: 'RESOLVED',
      handledBy: 'u_9',
      reply: '已确认网络问题',
    })
    expect(args.data.handledAt).toBeInstanceOf(Date)
  })
})
