import { describe, expect, it, vi } from 'vitest'

import type { Mock } from 'vitest'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import { RolesService } from './role.service'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

interface RoleRow {
  id: string
  code: string
  name: string
  permissions: unknown
  builtin: boolean
  createdAt: Date
  _count: { users: number }
}

const baseRow: RoleRow = {
  id: 'r_ops',
  code: 'OPS',
  name: '运营',
  permissions: ['meeting:read'],
  builtin: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  _count: { users: 2 },
}

interface PrismaLike {
  role: {
    findMany: Mock<() => Promise<RoleRow[]>>
    findUnique: Mock<() => Promise<RoleRow | null>>
    findFirst: Mock<() => Promise<RoleRow | null>>
    create: Mock<() => Promise<RoleRow>>
    update: Mock<() => Promise<RoleRow>>
  }
  userRole: { count: Mock<() => Promise<number>> }
}

function createPrisma(): PrismaLike {
  const prisma = {
    role: {
      findMany: vi.fn(async (): Promise<RoleRow[]> => [baseRow]),
      findUnique: vi.fn(async (): Promise<RoleRow | null> => null),
      findFirst: vi.fn(async (): Promise<RoleRow | null> => baseRow),
      create: vi.fn(async (): Promise<RoleRow> => baseRow),
      update: vi.fn(async (): Promise<RoleRow> => baseRow),
    },
    userRole: {
      count: vi.fn(async (): Promise<number> => 0),
    },
  }
  return prisma
}

function service(prisma: PrismaLike): RolesService {
  return new RolesService(prisma as unknown as PrismaService)
}

describe('RolesService.list', () => {
  it('返回内置优先的角色与用户数', async () => {
    const result = await service(createPrisma()).list()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'r_ops',
      code: 'OPS',
      permissions: ['meeting:read'],
      userCount: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('权限数组里混入未知值会被过滤', async () => {
    const prisma = createPrisma()
    prisma.role.findMany.mockResolvedValueOnce([
      { ...baseRow, permissions: ['meeting:read', 'nope'] },
    ])

    const result = await service(prisma).list()

    expect(result.items[0]?.permissions).toEqual(['meeting:read'])
  })
})

describe('RolesService.create', () => {
  it('编码重复时 409', async () => {
    const prisma = createPrisma()
    prisma.role.findUnique.mockResolvedValueOnce(baseRow)

    await expect(
      service(prisma).create({ code: 'OPS', name: '运营', permissions: [] }),
    ).rejects.toMatchObject({ code: ERROR_CODES.ORG_ROLE_TAKEN, status: 409 })
  })

  it('写入编码、名称与权限', async () => {
    const prisma = createPrisma()

    await service(prisma).create({ code: 'OPS', name: '运营', permissions: ['meeting:read'] })

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { code: 'OPS', name: '运营', permissions: ['meeting:read'] },
      include: { _count: { select: { users: true } } },
    })
  })
})

describe('RolesService.update', () => {
  it('超管权限锁定', async () => {
    const prisma = createPrisma()
    prisma.role.findFirst.mockResolvedValueOnce({ ...baseRow, code: 'SUPER_ADMIN', builtin: true })

    await expect(
      service(prisma).update('r_ops', { permissions: ['meeting:read'] }),
    ).rejects.toMatchObject({ code: ERROR_CODES.ORG_ROLE_BUILTIN, status: 409 })
    expect(prisma.role.update).not.toHaveBeenCalled()
  })

  it('只写传入的字段', async () => {
    const prisma = createPrisma()

    await service(prisma).update('r_ops', { name: '运营组' })

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 'r_ops' },
      data: { name: '运营组' },
      include: { _count: { select: { users: true } } },
    })
  })

  it('角色不存在时 404', async () => {
    const prisma = createPrisma()
    prisma.role.findFirst.mockResolvedValueOnce(null)

    await expect(service(prisma).update('r_x', { name: 'x' })).rejects.toMatchObject({
      code: ERROR_CODES.COMMON_NOT_FOUND,
      status: 404,
    })
  })
})

describe('RolesService.remove', () => {
  it('内置角色不可删除', async () => {
    const prisma = createPrisma()
    prisma.role.findFirst.mockResolvedValueOnce({ ...baseRow, builtin: true })

    await expect(service(prisma).remove('r_ops')).rejects.toMatchObject({
      code: ERROR_CODES.ORG_ROLE_BUILTIN,
      status: 409,
    })
  })

  it('仍有用户时拒绝删除', async () => {
    const prisma = createPrisma()
    prisma.userRole.count.mockResolvedValueOnce(3)

    await expect(service(prisma).remove('r_ops')).rejects.toMatchObject({
      code: ERROR_CODES.ORG_ROLE_IN_USE,
      status: 409,
    })
  })

  it('空角色软删', async () => {
    const prisma = createPrisma()

    await service(prisma).remove('r_ops')

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 'r_ops' },
      data: { deletedAt: expect.any(Date) as Date },
    })
  })
})

describe('RolesService.permissions', () => {
  it('返回全部权限点', async () => {
    await expect(service(createPrisma()).permissions()).resolves.toContain('role:write')
  })
})
