import { describe, expect, it, vi } from 'vitest'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'

import { AuditLogService } from './audit-log.service'

const row = {
  id: 'al_1',
  actorId: 'u_1',
  action: 'meeting.force-end',
  targetType: 'meeting',
  targetId: 'm_1',
  detail: { from: 'ONGOING', to: 'ENDED' },
  ip: '127.0.0.1',
  ua: 'vitest',
  createdAt: new Date('2026-01-01T02:00:00Z'),
}

function createPrisma(): { [key: string]: never } {
  const prisma = {
    auditLog: {
      count: vi.fn(async () => 3),
      findMany: vi.fn(async () => [row]),
      findUnique: vi.fn(async () => row),
    },
    user: { findMany: vi.fn(async () => [{ id: 'u_1', name: '张明' }]) },
    $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
  }
  return prisma as unknown as { [key: string]: never }
}

describe('AuditLogService', () => {
  it('列表补操作者姓名并按时间倒序分页', async () => {
    const prisma = createPrisma()
    const service = new AuditLogService(prisma as never)

    const result = await service.list({ page: 2, pageSize: 20, action: 'force' })

    expect(result.total).toBe(3)
    expect(result.items[0]).toMatchObject({
      id: 'al_1',
      actorName: '张明',
      action: 'meeting.force-end',
      createdAt: '2026-01-01T02:00:00.000Z',
    })
    const where = (prisma as never as { auditLog: { findMany: ReturnType<typeof vi.fn> } }).auditLog
      .findMany.mock.calls[0]?.[0]
    expect(where).toMatchObject({
      where: { action: { contains: 'force', mode: 'insensitive' } },
      skip: 20,
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
  })

  it('时间范围与操作者会传进 where', async () => {
    const prisma = createPrisma()
    const service = new AuditLogService(prisma as never)

    await service.list({
      page: 1,
      pageSize: 20,
      actorId: 'u_1',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
    })

    const args = (prisma as never as { auditLog: { findMany: ReturnType<typeof vi.fn> } }).auditLog
      .findMany.mock.calls[0]?.[0]
    expect(args).toMatchObject({
      where: {
        actorId: 'u_1',
        createdAt: { gte: new Date('2026-01-01T00:00:00Z'), lte: new Date('2026-01-02T00:00:00Z') },
      },
    })
  })

  it('详情不存在返回 404', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { auditLog: { findUnique: ReturnType<typeof vi.fn> } }
    ).auditLog.findUnique.mockResolvedValue(null)
    const service = new AuditLogService(prisma as never)

    await expect(service.detail('nope')).rejects.toMatchObject({
      code: ERROR_CODES.COMMON_NOT_FOUND,
      status: 404,
    })
  })

  it('导出 CSV 转义逗号与引号', async () => {
    const prisma = createPrisma()
    ;(
      prisma as never as { auditLog: { findMany: ReturnType<typeof vi.fn> } }
    ).auditLog.findMany.mockResolvedValue([{ ...row, ua: 'Mozilla, "test"' }])
    const service = new AuditLogService(prisma as never)

    const csv = await service.exportCsv({ page: 1, pageSize: 20 })

    expect(csv.startsWith('\uFEFF时间,操作者ID,操作者,动作')).toBe(true)
    expect(csv).toContain('"Mozilla, ""test"""')
    const detailJson = JSON.stringify({ from: 'ONGOING', to: 'ENDED' })
    expect(csv).toContain(`"${detailJson.replace(/"/g, '""')}"`)
  })
})
