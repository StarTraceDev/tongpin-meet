import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AuditLogItem,
  AuditLogList,
  AuditLogQuery,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { Prisma } from '../../infra/src/generated/prisma/client'

type AuditRow = {
  id: string
  actorId: string
  action: string
  targetType: string | null
  targetId: string | null
  detail: unknown
  ip: string | null
  ua: string | null
  createdAt: Date
}

/** 04 §6.8 `GET /admin/audit-logs`：只读列表 + 详情；导出走通用导出任务 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQuery): Promise<AuditLogList> {
    const where = this.where(query)
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    const names = await this.actorNames(rows.map((row) => row.actorId))
    return {
      items: rows.map((row) => this.toItem(row, names)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async detail(id: string): Promise<AuditLogItem> {
    const row = await this.prisma.auditLog.findUnique({ where: { id } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '审计记录不存在', 404)
    }
    const names = await this.actorNames([row.actorId])
    return this.toItem(row, names)
  }

  private where(query: AuditLogQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {}
    if (query.action !== undefined) {
      where.action = { contains: query.action, mode: 'insensitive' }
    }
    if (query.actorId !== undefined) {
      where.actorId = query.actorId
    }
    if (query.from !== undefined || query.to !== undefined) {
      where.createdAt = {
        ...(query.from === undefined ? {} : { gte: new Date(query.from) }),
        ...(query.to === undefined ? {} : { lte: new Date(query.to) }),
      }
    }
    return where
  }

  private async actorNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) {
      return new Map()
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    })
    return new Map(users.map((user) => [user.id, user.name]))
  }

  private toItem(row: AuditRow, names: Map<string, string>): AuditLogItem {
    return {
      id: row.id,
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? null,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      detail: row.detail,
      ip: row.ip,
      ua: row.ua,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
