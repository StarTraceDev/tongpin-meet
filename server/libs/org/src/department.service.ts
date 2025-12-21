import { Injectable } from '@nestjs/common'

import type { DeptCreateInput, DeptNode, DeptUpdateInput } from '@tongpin/shared'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface DeptRowLike {
  id: string
  name: string
  parentId: string | null
  sort: number
}

function toNode(row: DeptRowLike): DeptNode {
  return { id: row.id, name: row.name, parentId: row.parentId, sort: row.sort, children: [] }
}

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async tree(): Promise<{ items: DeptNode[] }> {
    const rows = (await this.prisma.dept.findMany({
      where: { deletedAt: null },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, parentId: true, sort: true },
    })) as DeptRowLike[]

    const nodes = new Map(rows.map((row) => [row.id, toNode(row)]))
    const roots: DeptNode[] = []
    for (const row of rows) {
      const node = nodes.get(row.id)
      if (node === undefined) continue
      const parent = row.parentId === null ? undefined : nodes.get(row.parentId)
      if (parent === undefined) {
        roots.push(node)
      } else {
        parent.children.push(node)
      }
    }

    return { items: roots }
  }

  async create(input: DeptCreateInput): Promise<DeptNode> {
    if (input.parentId !== undefined && input.parentId !== null) {
      await this.requireDept(input.parentId)
    }
    const row = (await this.prisma.dept.create({
      data: {
        name: input.name,
        parentId: input.parentId ?? null,
        sort: input.sort ?? 0,
      },
      select: { id: true, name: true, parentId: true, sort: true },
    })) as DeptRowLike

    return toNode(row)
  }

  async update(id: string, input: DeptUpdateInput): Promise<DeptNode> {
    await this.requireDept(id)
    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        throw new ApiError(ERROR_CODES.ORG_DEPT_CYCLE, '不能把部门挂到自己下面', 409)
      }
      await this.requireDept(input.parentId)
      if (await this.isDescendant(input.parentId, id)) {
        throw new ApiError(ERROR_CODES.ORG_DEPT_CYCLE, '不能把部门挂到自己的子部门下', 409)
      }
    }

    const row = (await this.prisma.dept.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
        ...(input.sort === undefined ? {} : { sort: input.sort }),
      },
      select: { id: true, name: true, parentId: true, sort: true },
    })) as DeptRowLike

    return toNode(row)
  }

  async remove(id: string): Promise<void> {
    await this.requireDept(id)
    const [children, members] = await Promise.all([
      this.prisma.dept.count({ where: { parentId: id, deletedAt: null } }),
      this.prisma.user.count({ where: { deptId: id, deletedAt: null } }),
    ])
    if (children > 0 || members > 0) {
      throw new ApiError(ERROR_CODES.ORG_DEPT_NOT_EMPTY, '部门下还有子部门或成员，不能删除', 409)
    }
    await this.prisma.dept.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  private async requireDept(id: string): Promise<void> {
    const dept = await this.prisma.dept.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (dept === null) {
      throw new ApiError(ERROR_CODES.ORG_DEPT_NOT_FOUND, '部门不存在', 404)
    }
  }

  /** candidate 是 id 的祖先时返回 true，防止成环 */
  private async isDescendant(candidate: string, id: string): Promise<boolean> {
    const rows = (await this.prisma.dept.findMany({
      where: { deletedAt: null },
      select: { id: true, parentId: true },
    })) as { id: string; parentId: string | null }[]
    const parents = new Map(rows.map((row) => [row.id, row.parentId]))

    let cursor: string | null | undefined = candidate
    const seen = new Set<string>()
    while (cursor !== null && cursor !== undefined) {
      if (cursor === id) return true
      if (seen.has(cursor)) return false
      seen.add(cursor)
      cursor = parents.get(cursor) ?? null
    }
    return false
  }
}
