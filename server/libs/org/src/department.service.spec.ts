import { describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../../infra/src/prisma/prisma.service'

import { DepartmentService } from './department.service'

interface FakePrisma {
  dept: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  user: { count: ReturnType<typeof vi.fn> }
}

function createPrisma(
  rows: { id: string; name: string; parentId: string | null; sort: number }[] = [],
): FakePrisma {
  return {
    dept: {
      findMany: vi.fn(async () => rows),
      findFirst: vi.fn(async () => ({ id: 'd_1' })),
      create: vi.fn(
        async ({ data }: { data: { name: string; parentId: string | null; sort: number } }) => ({
          id: 'd_new',
          ...data,
        }),
      ),
      update: vi.fn(async () => ({ id: 'd_1', name: '改名后', parentId: null, sort: 2 })),
      count: vi.fn(async () => 0),
    },
    user: { count: vi.fn(async () => 0) },
  }
}

function service(prisma: FakePrisma): DepartmentService {
  return new DepartmentService(prisma as unknown as PrismaService)
}

describe('DepartmentService.tree', () => {
  it('按 sort 组装树，父节点缺失时降级为根', async () => {
    const prisma = createPrisma([
      { id: 'd_1', name: '产品部', parentId: null, sort: 1 },
      { id: 'd_2', name: '设计组', parentId: 'd_1', sort: 2 },
      { id: 'd_3', name: '孤儿', parentId: 'd_x', sort: 3 },
    ])

    const tree = await service(prisma).tree()

    expect(tree.items).toHaveLength(2)
    expect(tree.items[0]).toMatchObject({
      id: 'd_1',
      children: [{ id: 'd_2', parentId: 'd_1', children: [] }],
    })
    expect(tree.items[1]?.id).toBe('d_3')
    expect(prisma.dept.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true, sort: true },
    })
  })
})

describe('DepartmentService.create', () => {
  it('父部门存在时写入 parentId 与 sort', async () => {
    const prisma = createPrisma()

    const created = await service(prisma).create({ name: '新部门', parentId: 'd_1', sort: 5 })

    expect(created).toMatchObject({ id: 'd_new', name: '新部门', parentId: 'd_1', sort: 5 })
    expect(prisma.dept.create).toHaveBeenCalledWith({
      data: { name: '新部门', parentId: 'd_1', sort: 5 },
      select: { id: true, name: true, parentId: true, sort: true },
    })
  })

  it('父部门不存在时 404', async () => {
    const prisma = createPrisma()
    prisma.dept.findFirst.mockResolvedValue(null)

    await expect(
      service(prisma).create({ name: '子部门', parentId: 'd_x', sort: 0 }),
    ).rejects.toMatchObject({
      status: 404,
      code: 50003,
    })
  })
})

describe('DepartmentService.update', () => {
  it('拒绝把部门挂到自己下面', async () => {
    const prisma = createPrisma()

    await expect(service(prisma).update('d_1', { parentId: 'd_1' })).rejects.toMatchObject({
      status: 409,
      code: 50005,
    })
  })

  it('拒绝把部门挂到自己的子部门下', async () => {
    const prisma = createPrisma([
      { id: 'd_1', name: '产品部', parentId: null, sort: 0 },
      { id: 'd_2', name: '设计组', parentId: 'd_1', sort: 0 },
    ])

    await expect(service(prisma).update('d_1', { parentId: 'd_2' })).rejects.toMatchObject({
      status: 409,
      code: 50005,
    })
  })

  it('只更新传入字段', async () => {
    const prisma = createPrisma()

    const updated = await service(prisma).update('d_1', { name: '改名后', sort: 2 })

    expect(updated.name).toBe('改名后')
    expect(prisma.dept.update).toHaveBeenCalledWith({
      where: { id: 'd_1' },
      data: { name: '改名后', sort: 2 },
      select: { id: true, name: true, parentId: true, sort: true },
    })
  })
})

describe('DepartmentService.remove', () => {
  it('有子部门或成员时拒绝删除', async () => {
    const prisma = createPrisma()
    prisma.dept.count.mockResolvedValue(1)

    await expect(service(prisma).remove('d_1')).rejects.toMatchObject({ status: 409, code: 50004 })
    expect(prisma.dept.update).not.toHaveBeenCalled()
  })

  it('空部门软删除', async () => {
    const prisma = createPrisma()

    await service(prisma).remove('d_1')

    expect(prisma.dept.update).toHaveBeenCalledWith({
      where: { id: 'd_1' },
      data: { deletedAt: expect.any(Date) },
    })
  })
})
