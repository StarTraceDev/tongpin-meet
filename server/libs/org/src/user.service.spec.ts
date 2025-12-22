import argon2 from 'argon2'
import { describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { AdminUsersService } from './user.service'

const role = { id: 'r_member', code: 'MEMBER', name: '普通成员', builtin: true }

interface RowLike {
  id: string
  phone: string
  name: string
  email: string | null
  avatarUrl: string | null
  status: 'ACTIVE' | 'DISABLED'
  deptId: string | null
  dept: { name: string } | null
  roles: { role: typeof role }[]
  lastLoginAt: Date | null
  createdAt: Date
}

function row(overrides: Partial<RowLike> = {}): RowLike {
  return {
    id: 'u_1',
    phone: '13800000001',
    name: '张明',
    email: null,
    avatarUrl: null,
    status: 'ACTIVE',
    deptId: 'd_1',
    dept: { name: '产品部' },
    roles: [{ role }],
    lastLoginAt: null,
    createdAt: new Date('2026-01-02T01:00:00.000Z'),
    ...overrides,
  }
}

interface FakePrisma {
  user: {
    count: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  role: { findMany: ReturnType<typeof vi.fn> }
  deviceSession: { updateMany: ReturnType<typeof vi.fn> }
  userRole: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

function createPrisma(userRow: RowLike = row()): FakePrisma {
  const fake = {
    user: {
      count: vi.fn(async () => 1),
      findMany: vi.fn(async () => [userRow]),
      findUnique: vi.fn(async () => userRow),
      findFirst: vi.fn(async () => ({ id: userRow.id })),
      create: vi.fn(async () => userRow),
      update: vi.fn(async () => userRow),
    },
    role: { findMany: vi.fn(async () => [role]) },
    deviceSession: { updateMany: vi.fn(async () => ({ count: 1 })) },
    userRole: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    $transaction: vi.fn(),
  } as unknown as FakePrisma

  fake.$transaction = vi.fn(async (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: FakePrisma) => Promise<unknown>)(fake),
  )

  return fake
}

function service(prisma: FakePrisma): AdminUsersService {
  return new AdminUsersService(prisma as unknown as PrismaService)
}

describe('AdminUsersService.list', () => {
  it('按关键词与状态过滤并映射部门、角色', async () => {
    const prisma = createPrisma()

    const result = await service(prisma).list({
      page: 2,
      pageSize: 20,
      status: 'ACTIVE',
      keyword: '张',
    })

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: [{ phone: { contains: '张' } }, { name: { contains: '张', mode: 'insensitive' } }],
      },
    })
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, skip: 20, take: 20 }),
    )
    expect(result).toMatchObject({
      total: 1,
      page: 2,
      pageSize: 20,
      items: [
        {
          id: 'u_1',
          phone: '13800000001',
          deptName: '产品部',
          status: 'ACTIVE',
          roles: [role],
          lastLoginAt: null,
          createdAt: '2026-01-02T01:00:00.000Z',
        },
      ],
    })
  })
})

describe('AdminUsersService.create', () => {
  it('哈希密码并按 roleIds 建立角色关联', async () => {
    const prisma = createPrisma()
    prisma.user.findUnique.mockResolvedValue(null)

    const created = await service(prisma).create({
      phone: '13800000002',
      name: '李雪',
      password: 'secret-pass-1',
      roleIds: ['r_member'],
    })

    expect(created.id).toBe('u_1')
    const call = prisma.user.create.mock.calls[0]?.[0] as {
      data: { passwordHash: string; roles: { create: { roleId: string }[] }; phone: string }
    }
    expect(call.data.phone).toBe('13800000002')
    expect(call.data.roles.create).toEqual([{ roleId: 'r_member' }])
    await expect(argon2.verify(call.data.passwordHash, 'secret-pass-1')).resolves.toBe(true)
  })

  it('手机号已存在时返回 409', async () => {
    const prisma = createPrisma()

    await expect(
      service(prisma).create({
        phone: '13800000001',
        name: '重复',
        password: 'secret-pass-1',
        roleIds: [],
      }),
    ).rejects.toMatchObject({ status: 409, code: 50001 })
  })

  it('角色不存在时拒绝创建', async () => {
    const prisma = createPrisma()
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.role.findMany.mockResolvedValue([])

    await expect(
      service(prisma).create({
        phone: '13800000003',
        name: '未知',
        password: 'secret-pass-1',
        roleIds: ['r_x'],
      }),
    ).rejects.toMatchObject({ status: 400, code: 50002 })
  })
})

describe('AdminUsersService.update', () => {
  it('只允许改名与邮箱，且用户必须存在', async () => {
    const prisma = createPrisma()
    await service(prisma).update('u_1', { name: '张明2', email: null })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u_1' },
      data: { name: '张明2', email: null },
      include: expect.any(Object),
    })

    prisma.user.findFirst.mockResolvedValue(null)
    await expect(service(prisma).update('u_404', { name: 'x' })).rejects.toMatchObject({
      status: 404,
    })
  })
})

describe('AdminUsersService.disable / enable / resetPassword', () => {
  it('禁用时递增 tokenVersion 并吊销全部会话', async () => {
    const prisma = createPrisma()

    await service(prisma).disable('u_1')

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'DISABLED', tokenVersion: { increment: 1 } },
      }),
    )
    expect(prisma.deviceSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u_1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
  })

  it('启用只改状态，不碰 tokenVersion', async () => {
    const prisma = createPrisma()

    await service(prisma).enable('u_1')

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ACTIVE' } }),
    )
  })

  it('重置密码写新哈希并踢掉旧会话', async () => {
    const prisma = createPrisma()

    await service(prisma).resetPassword('u_1', 'next-pass-9')

    const data = prisma.user.update.mock.calls[0]?.[0] as { data: { passwordHash: string } }
    await expect(argon2.verify(data.data.passwordHash, 'next-pass-9')).resolves.toBe(true)
    expect(prisma.deviceSession.updateMany).toHaveBeenCalled()
  })
})

describe('AdminUsersService.setRoles', () => {
  it('先清空再按新角色写入', async () => {
    const prisma = createPrisma()

    const updated = await service(prisma).setRoles('u_1', ['r_member'])

    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u_1' } })
    expect(prisma.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u_1', roleId: 'r_member' }],
    })
    expect(updated.roles).toEqual([role])
  })

  it('空角色列表只清空关联', async () => {
    const prisma = createPrisma()

    await service(prisma).setRoles('u_1', [])

    expect(prisma.userRole.createMany).not.toHaveBeenCalled()
  })
})
