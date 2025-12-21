import { Injectable } from '@nestjs/common'

import argon2 from 'argon2'

import { ERROR_CODES } from '../../../../packages/shared/src/constants/error-codes'

import type {
  AdminRoleOption,
  AdminUserCreateInput,
  AdminUserItem,
  AdminUserList,
  AdminUsersQuery,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface RoleRef {
  id: string
  code: string
  name: string
  builtin: boolean
}

interface UserRowLike {
  id: string
  phone: string
  name: string
  email: string | null
  avatarUrl: string | null
  status: AdminUserItem['status']
  deptId: string | null
  dept: { name: string } | null
  roles: { role: RoleRef }[]
  lastLoginAt: Date | null
  createdAt: Date
}

const USER_INCLUDE = {
  dept: { select: { name: true } },
  roles: { include: { role: { select: { id: true, code: true, name: true, builtin: true } } } },
} as const

function toItem(row: UserRowLike): AdminUserItem {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    status: row.status,
    deptId: row.deptId,
    deptName: row.dept?.name ?? null,
    roles: row.roles.map((entry) => entry.role),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminUsersQuery): Promise<AdminUserList> {
    const where: Record<string, unknown> = { deletedAt: null }
    if (query.status !== undefined) {
      where.status = query.status
    }
    if (query.keyword !== undefined && query.keyword !== '') {
      where.OR = [
        { phone: { contains: query.keyword } },
        { name: { contains: query.keyword, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])

    return {
      items: (rows as UserRowLike[]).map(toItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async create(input: AdminUserCreateInput): Promise<AdminUserItem> {
    const exists = await this.prisma.user.findUnique({ where: { phone: input.phone } })
    if (exists !== null) {
      throw new ApiError(ERROR_CODES.ORG_PHONE_TAKEN, '手机号已被使用', 409)
    }

    const roles = await this.findRoles(input.roleIds)
    const row = (await this.prisma.user.create({
      data: {
        phone: input.phone,
        name: input.name,
        email: input.email ?? null,
        passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
      include: USER_INCLUDE,
    })) as UserRowLike

    return toItem(row)
  }

  async update(
    id: string,
    input: { name?: string; email?: string | null },
  ): Promise<AdminUserItem> {
    await this.requireUser(id)
    const row = (await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.email === undefined ? {} : { email: input.email }),
      },
      include: USER_INCLUDE,
    })) as UserRowLike

    return toItem(row)
  }

  async disable(id: string): Promise<AdminUserItem> {
    await this.requireUser(id)
    const row = (await this.prisma.user.update({
      where: { id },
      data: { status: 'DISABLED', tokenVersion: { increment: 1 } },
      include: USER_INCLUDE,
    })) as UserRowLike
    await this.prisma.deviceSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    return toItem(row)
  }

  async enable(id: string): Promise<AdminUserItem> {
    await this.requireUser(id)
    const row = (await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: USER_INCLUDE,
    })) as UserRowLike

    return toItem(row)
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.requireUser(id)
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        tokenVersion: { increment: 1 },
      },
    })
    await this.prisma.deviceSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async setRoles(id: string, roleIds: string[]): Promise<AdminUserItem> {
    await this.requireUser(id)
    const roles = await this.findRoles(roleIds)
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } })
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: id, roleId: role.id })),
        })
      }
    })
    const row = (await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    })) as UserRowLike | null
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '用户不存在', 404)
    }

    return toItem(row)
  }

  async roles(): Promise<AdminRoleOption[]> {
    const rows = await this.prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true, name: true, builtin: true },
    })
    return rows
  }

  private async requireUser(id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (user === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '用户不存在', 404)
    }
  }

  private async findRoles(roleIds: string[]): Promise<RoleRef[]> {
    if (roleIds.length === 0) {
      return []
    }
    const rows = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, deletedAt: null },
      select: { id: true, code: true, name: true, builtin: true },
    })
    if (rows.length !== new Set(roleIds).size) {
      throw new ApiError(ERROR_CODES.ORG_REFERENCE_MISSING, '角色不存在', 400)
    }
    return rows
  }
}
