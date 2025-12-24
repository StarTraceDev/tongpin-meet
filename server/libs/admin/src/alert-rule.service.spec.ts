import { describe, expect, it, vi } from 'vitest'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'

import { AlertRuleService } from './alert-rule.service'

type FakePrisma = {
  alertRule: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const row = {
  id: 'ar_1',
  name: 'CPU 过高',
  metric: 'cpu',
  comparator: 'GT',
  threshold: 85,
  channel: 'SMS',
  target: '13800000001',
  enabled: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

function createPrisma(): FakePrisma {
  return {
    alertRule: {
      findMany: vi.fn(async () => [row]),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => row),
      create: vi.fn(async () => row),
      update: vi.fn(async () => row),
    },
  }
}

describe('AlertRuleService', () => {
  it('列表只取未删除规则并序列化时间', async () => {
    const prisma = createPrisma()
    const service = new AlertRuleService(prisma as never)

    const result = await service.list()

    expect(result.items[0]?.updatedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(prisma.alertRule.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ enabled: 'desc' }, { createdAt: 'asc' }],
    })
  })

  it('新增重名规则返回 409', async () => {
    const prisma = createPrisma()
    prisma.alertRule.findUnique.mockResolvedValue(row)
    const service = new AlertRuleService(prisma as never)

    await expect(
      service.create({
        name: 'CPU 过高',
        metric: 'cpu',
        comparator: 'GT',
        threshold: 90,
        channel: 'INBOX',
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_ALERT_NAME_TAKEN, status: 409 })
  })

  it('更新不存在的规则返回 404', async () => {
    const prisma = createPrisma()
    prisma.alertRule.findFirst.mockResolvedValue(null)
    const service = new AlertRuleService(prisma as never)

    await expect(service.update('nope', { threshold: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.COMMON_NOT_FOUND,
      status: 404,
    })
  })

  it('改名时检查名字是否被别的规则占用', async () => {
    const prisma = createPrisma()
    prisma.alertRule.findFirst
      .mockResolvedValueOnce(row) // requireRule
      .mockResolvedValueOnce({ ...row, id: 'ar_2' }) // duplicate
    const service = new AlertRuleService(prisma as never)

    await expect(service.update('ar_1', { name: '内存过高' })).rejects.toMatchObject({
      code: ERROR_CODES.SYSTEM_ALERT_NAME_TAKEN,
    })
  })

  it('删除走软删', async () => {
    const prisma = createPrisma()
    const service = new AlertRuleService(prisma as never)

    await service.remove('ar_1')

    expect(prisma.alertRule.update).toHaveBeenCalledWith({
      where: { id: 'ar_1' },
      data: { deletedAt: expect.any(Date) as Date },
    })
  })
})
