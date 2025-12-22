import { Injectable } from '@nestjs/common'

import { PERMISSIONS, isPermission } from '../../../../packages/shared/src/constants/permissions'
import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import type {
  RoleAction,
  RoleCreateInput,
  RoleItem,
  RoleList,
  RoleUpdateInput,
} from '@tongpin/shared/types'
import type { Permission } from '@tongpin/shared/constants'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

const ROLE_INCLUDE = {
  _count: { select: { users: true } },
} as const

interface RoleRowLike {
  id: string
  code: string
  name: string
  permissions: unknown
  builtin: boolean
  createdAt: Date
  _count: { users: number }
}

function toPermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is Permission => isPermission(entry))
}

function toItem(row: RoleRowLike): RoleItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    permissions: toPermissions(row.permissions),
    builtin: row.builtin,
    userCount: row._count.users,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 03 §5.6 的后台角色；内置角色不可删，超管权限锁定 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<RoleList> {
    const rows = await this.prisma.role.findMany({
      where: { deletedAt: null },
      include: ROLE_INCLUDE,
      orderBy: [{ builtin: 'desc' }, { createdAt: 'asc' }],
    })
    return { items: rows.map(toItem) }
  }

  async create(input: RoleCreateInput): Promise<RoleAction> {
    const taken = await this.prisma.role.findUnique({ where: { code: input.code } })
    if (taken !== null) {
      throw new ApiError(ERROR_CODES.ORG_ROLE_TAKEN, `角色编码 ${input.code} 已被占用`, 409)
    }
    const row = await this.prisma.role.create({
      data: {
        code: input.code,
        name: input.name,
        permissions: input.permissions ?? [],
      },
      include: ROLE_INCLUDE,
    })
    return { role: toItem(row) }
  }

  async update(id: string, input: RoleUpdateInput): Promise<RoleAction> {
    const row = await this.requireRole(id)
    if (row.code === 'SUPER_ADMIN' && input.permissions !== undefined) {
      throw new ApiError(ERROR_CODES.ORG_ROLE_BUILTIN, '超级管理员的权限不可修改', 409)
    }
    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.permissions === undefined ? {} : { permissions: input.permissions }),
      },
      include: ROLE_INCLUDE,
    })
    return { role: toItem(updated) }
  }

  async remove(id: string): Promise<void> {
    const row = await this.requireRole(id)
    if (row.builtin) {
      throw new ApiError(ERROR_CODES.ORG_ROLE_BUILTIN, '内置角色不可删除', 409)
    }
    const userCount = await this.prisma.userRole.count({ where: { roleId: id } })
    if (userCount > 0) {
      throw new ApiError(ERROR_CODES.ORG_ROLE_IN_USE, `还有 ${userCount} 个用户在使用该角色`, 409)
    }
    await this.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  permissions(): Promise<Permission[]> {
    return Promise.resolve([...PERMISSIONS])
  }

  private async requireRole(id: string): Promise<RoleRowLike> {
    const row = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: ROLE_INCLUDE,
    })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '角色不存在', 404)
    }
    return row
  }
}
