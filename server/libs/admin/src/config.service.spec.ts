import { describe, expect, it, vi } from 'vitest'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'

import { ConfigService } from './config.service'

type FakePrisma = {
  sysConfig: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  featureFlag: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  user: { findMany: ReturnType<typeof vi.fn> }
}

function createPrisma(): FakePrisma {
  return {
    sysConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    featureFlag: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn(async () => []) },
  }
}

const row = {
  key: 'meeting.maxParticipants',
  value: 100,
  description: '单会议人数上限',
  updatedById: 'u_1',
  updatedAt: new Date('2026-01-01T02:00:00Z'),
}

describe('ConfigService', () => {
  it('列表按 key 排序并补更新人姓名', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findMany.mockResolvedValue([row])
    prisma.user.findMany.mockResolvedValue([{ id: 'u_1', name: '张明' }])
    const service = new ConfigService(prisma as never)

    const result = await service.configs()

    expect(result.items).toEqual([
      {
        key: 'meeting.maxParticipants',
        value: 100,
        description: '单会议人数上限',
        updatedById: 'u_1',
        updatedByName: '张明',
        updatedAt: '2026-01-01T02:00:00.000Z',
      },
    ])
    expect(prisma.sysConfig.findMany).toHaveBeenCalledWith({ orderBy: { key: 'asc' } })
  })

  it('新增重复键返回 409', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findUnique.mockResolvedValue(row)
    const service = new ConfigService(prisma as never)

    await expect(
      service.create({ key: 'meeting.maxParticipants', value: 80 }, 'u_1'),
    ).rejects.toMatchObject({ code: ERROR_CODES.SYSTEM_CONFIG_TAKEN, status: 409 })
  })

  it('新增写入操作人与说明', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findUnique.mockResolvedValue(null)
    prisma.sysConfig.create.mockResolvedValue({ ...row, description: null })
    const service = new ConfigService(prisma as never)

    await service.create({ key: 'meeting.maxParticipants', value: 80 }, 'u_2')

    expect(prisma.sysConfig.create).toHaveBeenCalledWith({
      data: {
        key: 'meeting.maxParticipants',
        value: 80,
        description: null,
        updatedById: 'u_2',
      },
    })
  })

  it('更新不存在的键返回 404', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findUnique.mockResolvedValue(null)
    const service = new ConfigService(prisma as never)

    await expect(service.update('nope', { value: 1 }, 'u_1')).rejects.toMatchObject({
      code: ERROR_CODES.COMMON_NOT_FOUND,
      status: 404,
    })
  })

  it('更新只写传入字段并记录操作人', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findUnique.mockResolvedValue(row)
    prisma.sysConfig.update.mockResolvedValue({ ...row, value: 50 })
    const service = new ConfigService(prisma as never)

    await service.update('meeting.maxParticipants', { value: 50 }, 'u_3')

    expect(prisma.sysConfig.update).toHaveBeenCalledWith({
      where: { key: 'meeting.maxParticipants' },
      data: { value: 50, description: undefined, updatedById: 'u_3' },
    })
  })

  it('删除先确认存在', async () => {
    const prisma = createPrisma()
    prisma.sysConfig.findUnique.mockResolvedValue(null)
    const service = new ConfigService(prisma as never)

    await expect(service.remove('nope')).rejects.toMatchObject({ status: 404 })
    expect(prisma.sysConfig.delete).not.toHaveBeenCalled()
  })

  it('开关列表与更新', async () => {
    const prisma = createPrisma()
    prisma.featureFlag.findMany.mockResolvedValue([
      {
        key: 'whiteboard',
        enabled: false,
        description: null,
        rolloutPct: 0,
        payload: null,
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      },
    ])
    prisma.featureFlag.findUnique.mockResolvedValue({ key: 'whiteboard' })
    prisma.featureFlag.update.mockResolvedValue({
      key: 'whiteboard',
      enabled: true,
      description: null,
      rolloutPct: 30,
      payload: { teams: ['design'] },
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    })
    const service = new ConfigService(prisma as never)

    const list = await service.flags()
    expect(list.items[0]?.key).toBe('whiteboard')
    expect(list.items[0]?.updatedAt).toBe('2026-01-02T00:00:00.000Z')

    const result = await service.updateFlag('whiteboard', {
      enabled: true,
      rolloutPct: 30,
      payload: { teams: ['design'] },
    })
    expect(result.flag.enabled).toBe(true)
    expect(prisma.featureFlag.update).toHaveBeenCalledWith({
      where: { key: 'whiteboard' },
      data: {
        enabled: true,
        rolloutPct: 30,
        description: undefined,
        payload: { teams: ['design'] },
      },
    })
  })
})
