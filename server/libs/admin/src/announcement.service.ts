import { Injectable } from '@nestjs/common'

import type {
  AnnouncementAction,
  AnnouncementCreateInput,
  AnnouncementItem,
  AnnouncementList,
  AnnouncementQuery,
  AnnouncementUpdateInput,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { Prisma } from '../../infra/src/generated/prisma/client'

type AnnouncementRow = {
  id: string
  title: string
  content: string
  pinned: boolean
  publishAt: Date
  expireAt: Date | null
  createdBy: string
  createdAt: Date
}

/** 公告状态由展示时间推导：未到发布时间 → 定时中；过了过期时间 → 已过期 */
export function announcementStatusOf(
  publishAt: Date,
  expireAt: Date | null,
  now: Date,
): 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' {
  if (publishAt.getTime() > now.getTime()) {
    return 'SCHEDULED'
  }
  if (expireAt !== null && expireAt.getTime() <= now.getTime()) {
    return 'EXPIRED'
  }
  return 'PUBLISHED'
}

/** 06 §11.16 系统公告：CRUD + 定时发布 + 置顶 */
@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AnnouncementQuery): Promise<AnnouncementList> {
    const where: Prisma.AnnouncementWhereInput =
      query.keyword === undefined || query.keyword === ''
        ? {}
        : { title: { contains: query.keyword, mode: 'insensitive' } }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { publishAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    const names = await this.userNames(rows.map((row) => row.createdBy))
    const now = new Date()
    return {
      items: rows.map((row) => this.toItem(row, names, now)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async create(input: AnnouncementCreateInput, actorId: string): Promise<AnnouncementAction> {
    const row = await this.prisma.announcement.create({
      data: {
        title: input.title,
        content: input.content,
        pinned: input.pinned,
        publishAt: new Date(input.publishAt),
        expireAt:
          input.expireAt === undefined || input.expireAt === null ? null : new Date(input.expireAt),
        createdBy: actorId,
      },
    })
    const names = await this.userNames([actorId])
    return { announcement: this.toItem(row, names, new Date()) }
  }

  async update(id: string, input: AnnouncementUpdateInput): Promise<AnnouncementAction> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } })
    if (existing === null) {
      throw new ApiError(10000, '公告不存在', 404)
    }
    const row = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: input.title,
        content: input.content,
        pinned: input.pinned,
        publishAt: input.publishAt === undefined ? undefined : new Date(input.publishAt),
        expireAt:
          input.expireAt === undefined
            ? undefined
            : input.expireAt === null
              ? null
              : new Date(input.expireAt),
      },
    })
    const names = await this.userNames([row.createdBy])
    return { announcement: this.toItem(row, names, new Date()) }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } })
    if (existing === null) {
      throw new ApiError(10000, '公告不存在', 404)
    }
    await this.prisma.announcement.delete({ where: { id } })
  }

  private async userNames(ids: string[]): Promise<Map<string, string>> {
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

  private toItem(row: AnnouncementRow, names: Map<string, string>, now: Date): AnnouncementItem {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      pinned: row.pinned,
      publishAt: row.publishAt.toISOString(),
      expireAt: row.expireAt === null ? null : row.expireAt.toISOString(),
      status: announcementStatusOf(row.publishAt, row.expireAt, now),
      createdBy: row.createdBy,
      createdByName: names.get(row.createdBy) ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
