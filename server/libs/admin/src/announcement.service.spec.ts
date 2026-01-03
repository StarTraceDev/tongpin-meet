import { describe, expect, it, vi } from 'vitest'

import { AnnouncementService, announcementStatusOf } from './announcement.service'

const row = {
  id: 'an_1',
  title: '系统维护通知',
  content: '本周六 22:00 升级，预计 30 分钟',
  pinned: true,
  publishAt: new Date('2026-01-01T00:00:00Z'),
  expireAt: null as Date | null,
  createdBy: 'u_9',
  createdAt: new Date('2025-12-30T00:00:00Z'),
}

function createPrisma(): never {
  return {
    announcement: {
      count: vi.fn(async () => 1),
      findMany: vi.fn(async () => [row]),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...row,
        ...data,
        createdAt: new Date('2026-01-05T00:00:00Z'),
      })),
      findUnique: vi.fn(async () => row),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...row,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      })),
      delete: vi.fn(async () => row),
    },
    user: { findMany: vi.fn(async () => [{ id: 'u_9', name: '运营管理员' }]) },
    $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
  } as never
}

describe('announcementStatusOf', () => {
  it('按发布时间与过期时间推导状态', () => {
    const now = new Date('2026-01-05T00:00:00Z')
    expect(announcementStatusOf(new Date('2026-01-06T00:00:00Z'), null, now)).toBe('SCHEDULED')
    expect(announcementStatusOf(new Date('2026-01-01T00:00:00Z'), null, now)).toBe('PUBLISHED')
    expect(
      announcementStatusOf(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-04T00:00:00Z'), now),
    ).toBe('EXPIRED')
  })
})

describe('AnnouncementService', () => {
  it('列表按置顶与发布时间排序，补创建人姓名', async () => {
    const prisma = createPrisma()
    const service = new AnnouncementService(prisma)

    const result = await service.list({ page: 1, pageSize: 20, keyword: '维护' })

    expect(result.items[0]).toMatchObject({
      id: 'an_1',
      pinned: true,
      createdByName: '运营管理员',
      status: 'PUBLISHED',
    })
    const args = (prisma as never as { announcement: { findMany: ReturnType<typeof vi.fn> } })
      .announcement.findMany.mock.calls[0]?.[0]
    expect(args).toMatchObject({
      where: { title: { contains: '维护', mode: 'insensitive' } },
      orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
    })
  })

  it('新建写入创建人并默认非置顶', async () => {
    const prisma = createPrisma()
    const service = new AnnouncementService(prisma)

    await service.create(
      {
        title: '新公告',
        content: '正文',
        pinned: false,
        publishAt: '2026-01-06T00:00:00.000Z',
      },
      'u_9',
    )

    const args = (prisma as never as { announcement: { create: ReturnType<typeof vi.fn> } })
      .announcement.create.mock.calls[0]?.[0]
    expect(args.data).toMatchObject({
      title: '新公告',
      content: '正文',
      pinned: false,
      createdBy: 'u_9',
      expireAt: null,
    })
    expect(args.data.publishAt).toBeInstanceOf(Date)
  })

  it('更新不存在的公告返回 404', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { announcement: { findUnique: ReturnType<typeof vi.fn> } }
    ).announcement.findUnique.mockResolvedValue(null)
    const service = new AnnouncementService(prisma)

    await expect(service.update('nope', { pinned: true })).rejects.toMatchObject({ status: 404 })
  })

  it('更新只写传入字段，可清空过期时间', async () => {
    const prisma = createPrisma()
    const service = new AnnouncementService(prisma)

    await service.update('an_1', { pinned: false, expireAt: null })

    const args = (prisma as never as { announcement: { update: ReturnType<typeof vi.fn> } })
      .announcement.update.mock.calls[0]?.[0]
    expect(args.data).toEqual({
      title: undefined,
      content: undefined,
      pinned: false,
      publishAt: undefined,
      expireAt: null,
    })
  })

  it('删除不存在的公告返回 404，存在则直接删', async () => {
    const prisma = createPrisma()
    const service = new AnnouncementService(prisma)

    await service.remove('an_1')
    expect(
      (prisma as never as { announcement: { delete: ReturnType<typeof vi.fn> } }).announcement
        .delete,
    ).toHaveBeenCalledWith({ where: { id: 'an_1' } })
  })
})
