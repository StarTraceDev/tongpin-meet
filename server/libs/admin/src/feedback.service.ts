import { Injectable } from '@nestjs/common'

import { FEEDBACK_TRANSITIONS, canTransition } from '../../../../packages/shared/src/constants'
import type {
  FeedbackAction,
  FeedbackCreateInput,
  FeedbackItem,
  FeedbackList,
  FeedbackQuery,
  FeedbackUpdateInput,
} from '../../../../packages/shared/src/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { Prisma } from '../../infra/src/generated/prisma/client'

type FeedbackRow = {
  id: string
  category: FeedbackItem['category']
  content: string
  contact: string | null
  status: FeedbackItem['status']
  source: FeedbackItem['source']
  reporterId: string | null
  handledBy: string | null
  reply: string | null
  handledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** 06 §11.15 投诉反馈：管理台代录 + 处理闭环 */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: FeedbackQuery): Promise<FeedbackList> {
    const where: Prisma.FeedbackWhereInput = {}
    if (query.status !== undefined) {
      where.status = query.status
    }
    if (query.category !== undefined) {
      where.category = query.category
    }
    if (query.keyword !== undefined && query.keyword !== '') {
      where.OR = [
        { content: { contains: query.keyword, mode: 'insensitive' } },
        { contact: { contains: query.keyword } },
      ]
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    const names = await this.userNames(
      rows
        .flatMap((row) => [row.reporterId, row.handledBy])
        .filter((id): id is string => id !== null),
    )
    return {
      items: rows.map((row) => this.toItem(row, names)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async create(input: FeedbackCreateInput): Promise<FeedbackAction> {
    const row = await this.prisma.feedback.create({
      data: {
        category: input.category,
        content: input.content,
        contact: input.contact ?? null,
        status: 'PENDING',
        source: 'ADMIN',
      },
    })
    return { feedback: this.toItem(row, new Map()) }
  }

  async detail(id: string): Promise<FeedbackItem> {
    const row = await this.prisma.feedback.findUnique({ where: { id } })
    if (row === null) {
      throw new ApiError(10000, '反馈不存在', 404)
    }
    const names = await this.userNames(
      [row.reporterId, row.handledBy].filter((value): value is string => value !== null),
    )
    return this.toItem(row, names)
  }

  async handle(id: string, input: FeedbackUpdateInput, actorId: string): Promise<FeedbackAction> {
    const row = await this.prisma.feedback.findUnique({ where: { id } })
    if (row === null) {
      throw new ApiError(10000, '反馈不存在', 404)
    }
    if (!canTransition(FEEDBACK_TRANSITIONS, row.status, input.status)) {
      throw new ApiError(10000, `当前状态不可流转到 ${input.status}`, 409)
    }

    const finished = input.status === 'RESOLVED' || input.status === 'REJECTED'
    const updated = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: input.status,
        handledBy: actorId,
        handledAt: finished ? new Date() : null,
        reply: input.reply === undefined ? undefined : (input.reply ?? null),
      },
    })
    const names = await this.userNames(
      [updated.reporterId, updated.handledBy].filter((value): value is string => value !== null),
    )
    return { feedback: this.toItem(updated, names) }
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

  private toItem(row: FeedbackRow, names: Map<string, string>): FeedbackItem {
    return {
      id: row.id,
      category: row.category,
      content: row.content,
      contact: row.contact,
      status: row.status,
      source: row.source,
      reporterId: row.reporterId,
      reporterName: row.reporterId === null ? null : (names.get(row.reporterId) ?? null),
      handledBy: row.handledBy,
      handledName: row.handledBy === null ? null : (names.get(row.handledBy) ?? null),
      reply: row.reply,
      handledAt: row.handledAt === null ? null : row.handledAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
