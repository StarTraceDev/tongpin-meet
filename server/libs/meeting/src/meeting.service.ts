import { randomInt, randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import argon2 from 'argon2'

import { meetingSettingsSchema } from '../../../../packages/shared/src/schemas'
import type {
  AuthUser,
  CreateMeetingInput,
  ListMeetingsQuery,
  Meeting,
  MeetingCreated,
  Paginated,
  UpdateMeetingInput,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { IdempotencyService } from '../../common/src/idempotency.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

/** 回收站保留 30 天（06 §M4-18） */
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface MeetingRow {
  id: string
  meetingNo: string
  title: string
  hostId: string
  status: Meeting['status']
  startAt: Date
  endAt: Date
  timezone: string
  settings: unknown
  allowWaitingRoom: boolean
  lockedAt: Date | null
  actualStartAt: Date | null
  actualEndAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

function toMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    meetingNo: row.meetingNo,
    title: row.title,
    hostId: row.hostId,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    settings: meetingSettingsSchema.parse(row.settings),
    allowWaitingRoom: row.allowWaitingRoom,
    locked: row.lockedAt !== null,
    actualStartAt: row.actualStartAt?.toISOString() ?? null,
    actualEndAt: row.actualEndAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** 强 ETag：拿 updatedAt 毫秒值，PATCH 前用 If-Match 比对；并发写只有一个能成功 */
function etagOf(row: { id: string; updatedAt: Date }): string {
  return `"${row.id}-${row.updatedAt.getTime()}"`
}

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async create(
    host: AuthUser,
    input: CreateMeetingInput,
    idempotencyKey?: string,
  ): Promise<MeetingCreated> {
    const cacheKey =
      idempotencyKey === undefined ? undefined : `meetings:create:${host.id}:${idempotencyKey}`
    if (cacheKey !== undefined) {
      const cached = this.idempotency.get<MeetingCreated>(cacheKey)
      if (cached !== undefined) return cached
    }

    const meetingNo = await this.allocateMeetingNo()
    const hostKey = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const passwordHash =
      input.password === undefined
        ? null
        : await argon2.hash(input.password, { type: argon2.argon2id })
    const hostKeyHash = await argon2.hash(hostKey, { type: argon2.argon2id })

    // roomName 要带 id，所以先写占位值再在同一事务里改成 lk_{id}_{rand}
    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          meetingNo,
          title: input.title,
          hostId: host.id,
          roomName: `tmp_${randomUUID()}`,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          passwordHash,
          hostKey: hostKeyHash,
          settings: input.settings,
          participants: {
            create: [
              {
                userId: host.id,
                role: 'HOST',
                mediaState: { audioOn: true, videoOn: true, screenSharing: false },
              },
              ...input.inviteeIds
                .filter((userId) => userId !== host.id)
                .map((userId) => ({
                  userId,
                  role: 'ATTENDEE' as const,
                  mediaState: { audioOn: false, videoOn: false, screenSharing: false },
                })),
            ],
          },
        },
      })
      return tx.meeting.update({
        where: { id: meeting.id },
        data: { roomName: `lk_${meeting.id}_${randomUUID().slice(0, 8)}` },
      })
    })

    const result: MeetingCreated = { ...toMeeting(created), hostKey }
    if (cacheKey !== undefined) this.idempotency.put(cacheKey, result)
    return result
  }

  async list(user: AuthUser, query: ListMeetingsQuery): Promise<Paginated<Meeting>> {
    const now = new Date()
    const where: Record<string, unknown> = { deletedAt: null }

    if (query.scope === 'hosting') where.hostId = user.id
    if (query.scope === 'participating') where.participants = { some: { userId: user.id } }
    if (query.scope === 'upcoming') {
      where.startAt = { gte: now }
      where.status = 'SCHEDULED'
    }
    if (query.scope === 'ended') {
      where.OR = [{ status: 'ENDED' }, { endAt: { lt: now } }]
    }
    if (query.scope === 'all') {
      where.OR = [{ hostId: user.id }, { participants: { some: { userId: user.id } } }]
    }
    if (query.status !== undefined) where.status = query.status
    if (query.keyword !== undefined && query.keyword !== '') {
      where.title = { contains: query.keyword, mode: 'insensitive' }
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.findMany({
        where,
        orderBy: this.orderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return {
      items: rows.map((row) => toMeeting(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(user: AuthUser, id: string): Promise<{ meeting: Meeting; etag: string }> {
    const row = await this.findVisible(user, id)
    return { meeting: toMeeting(row), etag: etagOf(row) }
  }

  async update(
    user: AuthUser,
    id: string,
    ifMatch: string | undefined,
    input: UpdateMeetingInput,
  ): Promise<{ meeting: Meeting; etag: string }> {
    const row = await this.findOwned(user, id)
    if (ifMatch === undefined || ifMatch !== etagOf(row)) {
      throw new ApiError(10000, '会议已被修改，请刷新后重试', 412)
    }
    if (row.status !== 'SCHEDULED') {
      throw new ApiError(10000, '当前会议状态不可修改', 409)
    }

    const data: Record<string, unknown> = {}
    if (input.title !== undefined) data.title = input.title
    if (input.startAt !== undefined) data.startAt = new Date(input.startAt)
    if (input.endAt !== undefined) data.endAt = new Date(input.endAt)
    if (input.password !== undefined) {
      data.passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })
    }
    if (input.settings !== undefined) {
      data.settings = { ...meetingSettingsSchema.parse(row.settings), ...input.settings }
    }

    const updated = await this.prisma.meeting.update({ where: { id }, data })
    return { meeting: toMeeting(updated), etag: etagOf(updated) }
  }

  /** 软删进回收站；30 天内可 restore，超期由定时任务物理删（M8 接任务） */
  async remove(user: AuthUser, id: string): Promise<void> {
    await this.findOwned(user, id)
    await this.prisma.meeting.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async trash(user: AuthUser): Promise<Paginated<Meeting>> {
    const where = { hostId: user.id, deletedAt: { not: null } }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.meeting.count({ where }),
      this.prisma.meeting.findMany({ where, orderBy: { deletedAt: 'desc' }, take: 100 }),
    ])
    return { items: rows.map((row) => toMeeting(row)), page: 1, pageSize: rows.length, total }
  }

  async restore(user: AuthUser, id: string): Promise<Meeting> {
    const row = await this.prisma.meeting.findFirst({ where: { id, hostId: user.id } })
    if (row === null || row.deletedAt === null) {
      throw new ApiError(10000, '回收站里没有这个会议', 404)
    }
    if (Date.now() - row.deletedAt.getTime() > TRASH_TTL_MS) {
      throw new ApiError(10000, '会议已超过 30 天保留期，无法恢复', 410)
    }
    const restored = await this.prisma.meeting.update({ where: { id }, data: { deletedAt: null } })
    return toMeeting(restored)
  }

  /** 9 位随机会议号，碰撞重试（06 §M4-3） */
  private async allocateMeetingNo(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const meetingNo = String(randomInt(100_000_000, 1_000_000_000))
      const exists = await this.prisma.meeting.findUnique({ where: { meetingNo } })
      if (exists === null) return meetingNo
    }
    throw new ApiError(90000, '会议号生成失败，请重试', 503)
  }

  private orderBy(sort: string | undefined): Record<string, 'asc' | 'desc'> {
    const field = sort?.replace(/^-/, '') ?? 'updatedAt'
    const direction: 'asc' | 'desc' =
      sort?.startsWith('-') === true ? 'desc' : sort === undefined ? 'desc' : 'asc'
    const allowed = new Set(['startAt', 'endAt', 'createdAt', 'updatedAt', 'title'])
    return { [allowed.has(field) ? field : 'updatedAt']: direction }
  }

  private async findVisible(user: AuthUser, id: string): Promise<MeetingRow> {
    const row = await this.prisma.meeting.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ hostId: user.id }, { participants: { some: { userId: user.id } } }],
      },
    })
    if (row === null) {
      throw new ApiError(10000, '会议不存在或无权访问', 404)
    }
    return row
  }

  private async findOwned(user: AuthUser, id: string): Promise<MeetingRow> {
    const row = await this.prisma.meeting.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(10000, '会议不存在', 404)
    }
    if (row.hostId !== user.id) {
      throw new ApiError(10003, '只有主持人可以操作这个会议', 403)
    }
    return row
  }
}
