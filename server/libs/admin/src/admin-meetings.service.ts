import { Injectable } from '@nestjs/common'

import type { AdminMeetingItem, AdminMeetingList, AdminMeetingsQuery } from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from '../../meeting/src/meeting.service'

interface MeetingRowLike {
  id: string
  meetingNo: string
  title: string
  status: string
  startAt: Date
  actualStartAt: Date | null
  actualEndAt: Date | null
  host: { name: string }
  _count: { participants: number }
}

const SORT_FIELDS = new Set(['startAt', 'createdAt', 'actualStartAt', 'title'])

function toItem(row: MeetingRowLike): AdminMeetingItem {
  return {
    id: row.id,
    meetingNo: row.meetingNo,
    title: row.title,
    hostName: row.host.name,
    // 数据库存的是 Prisma 枚举，schema 里已用 meetingStatusSchema 收窄
    status: row.status as AdminMeetingItem['status'],
    startAt: row.startAt.toISOString(),
    actualStartAt: row.actualStartAt?.toISOString() ?? null,
    actualEndAt: row.actualEndAt?.toISOString() ?? null,
    participantCount: row._count.participants,
  }
}

function orderBy(sort: string | undefined): Record<string, 'asc' | 'desc'> {
  const raw = sort ?? '-startAt'
  const descending = raw.startsWith('-')
  const field = descending ? raw.slice(1) : raw
  return {
    [SORT_FIELDS.has(field) ? field : 'startAt']: descending ? 'desc' : 'asc',
  }
}

const LIST_INCLUDE = {
  host: { select: { name: true } },
  _count: { select: { participants: true } },
} as const

@Injectable()
export class AdminMeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meetings: MeetingService,
  ) {}

  async list(query: AdminMeetingsQuery): Promise<AdminMeetingList> {
    const where: Record<string, unknown> = { deletedAt: null }
    if (query.status !== undefined) {
      where.status = query.status
    }
    if (query.keyword !== undefined && query.keyword !== '') {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { meetingNo: { contains: query.keyword } },
      ]
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: orderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])

    return {
      items: (rows as MeetingRowLike[]).map(toItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  /** 强制结束复用会议域的状态机与事件，这里只把结果补成列表行 */
  async forceEnd(id: string): Promise<AdminMeetingItem> {
    const meeting = await this.meetings.forceEnd(id)
    const row = (await this.prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: LIST_INCLUDE,
    })) as MeetingRowLike | null
    if (row === null) {
      throw new ApiError(10000, '会议不存在', 404)
    }
    return toItem(row)
  }
}
