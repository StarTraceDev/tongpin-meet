import { randomInt, randomUUID } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import argon2 from 'argon2'

import { meetingSettingsSchema } from '../../../../packages/shared/src/schemas'
import { canRunMeetingAction, ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AuthUser,
  ClaimHostInput,
  CreateMeetingInput,
  JoinAsGuestInput,
  JoinMeetingInput,
  ListMeetingsQuery,
  Meeting,
  MeetingCreated,
  MeetingJoinResult,
  MeetingWaiting,
  Paginated,
  RtcToken,
  TransferHostInput,
  UpdateMeetingInput,
  WaitingEntry,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { IdempotencyService } from '../../common/src/idempotency.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
import type { Prisma } from '../../infra/src/generated/prisma/client'
import { RTC_PORT, RTC_TOKEN_TTL_SECONDS, type RtcPort } from './rtc/rtc.port'

/** 回收站保留 30 天（06 §M4-18） */
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface MeetingRow {
  id: string
  meetingNo: string
  title: string
  hostId: string
  roomName: string
  passwordHash: string | null
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
    @Inject(RTC_PORT) private readonly rtc: RtcPort,
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
          allowWaitingRoom: input.allowWaitingRoom,
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
    if (input.allowWaitingRoom !== undefined) data.allowWaitingRoom = input.allowWaitingRoom

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

  /** 06 §M4-4：校验密码 → 建/复用参会记录 → 首次入会把会议置 ONGOING → 签发 RTC */
  async join(
    user: AuthUser,
    id: string,
    input: JoinMeetingInput,
  ): Promise<MeetingJoinResult | MeetingWaiting> {
    const meeting = await this.findJoinable(id)
    await this.assertPassword(meeting, input.password)

    const existing = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: user.id } },
    })
    if (meeting.allowWaitingRoom && meeting.hostId !== user.id && existing === null) {
      const entry = await this.prisma.waitingRoomEntry.create({
        data: { meetingId: id, userId: user.id, status: 'PENDING' },
      })
      return { meetingId: id, waiting: true, entryId: entry.id }
    }

    const participant = await this.upsertParticipant(id, user.id, null)
    await this.markOngoing(meeting)
    await this.appendEvent(id, 'meeting.member.joined', user.id, {
      participantId: participant.id,
      userId: user.id,
    })
    const rtc = await this.issueToken(meeting.roomName, user.id)
    return buildJoinResult(meeting.id, meeting.roomName, participant, rtc)
  }

  /** 06 §M4-12：游客凭 meetingNo + 昵称入会，allowGuest=false 时 403 */
  async joinAsGuest(input: JoinAsGuestInput): Promise<MeetingJoinResult | MeetingWaiting> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { meetingNo: input.meetingNo, deletedAt: null },
    })
    if (meeting === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    if (!canRunMeetingAction(meeting.status, 'join')) {
      throw new ApiError(ERROR_CODES.MEETING_ENDED, '会议已结束', 409)
    }
    if (meeting.lockedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '会议已锁定', 403)
    }
    if (!meetingSettingsSchema.parse(meeting.settings).allowGuest) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '该会议不允许游客入会', 403)
    }
    await this.assertPassword(meeting, input.password)

    if (meeting.allowWaitingRoom) {
      const entry = await this.prisma.waitingRoomEntry.create({
        data: { meetingId: meeting.id, guestName: input.nickname, status: 'PENDING' },
      })
      return { meetingId: meeting.id, waiting: true, entryId: entry.id }
    }

    const participant = await this.prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        guestName: input.nickname,
        role: 'GUEST',
        joinedAt: new Date(),
        mediaState: { audioOn: false, videoOn: false, screenSharing: false },
      },
    })
    await this.markOngoing(meeting)
    await this.appendEvent(meeting.id, 'meeting.member.joined', null, {
      participantId: participant.id,
      guestName: input.nickname,
    })
    const rtc = await this.issueToken(meeting.roomName, `guest:${participant.id}`)
    return buildJoinResult(meeting.id, meeting.roomName, participant, rtc)
  }

  /** 离会只写 leftAt，不改会议状态；主持人离会由 :end 收尾 */
  async leave(user: AuthUser, id: string): Promise<void> {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: user.id } },
    })
    if (participant === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '你不在这个会议里', 404)
    }
    await this.prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    })
    await this.appendEvent(id, 'meeting.member.left', user.id, { participantId: participant.id })
  }

  /** 06 §M4-6：结束会议 → 状态 ENDED、actualEndAt、所有未离会成员写 leftAt */
  async end(user: AuthUser, id: string): Promise<Meeting> {
    const row = await this.findOwned(user, id)
    if (!canRunMeetingAction(row.status, 'end')) {
      throw new ApiError(10000, '当前会议状态不可结束', 409)
    }
    const endedAt = new Date()
    const updated = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.update({
        where: { id },
        data: { status: 'ENDED', actualEndAt: endedAt },
      })
      await tx.meetingParticipant.updateMany({
        where: { meetingId: id, leftAt: null },
        data: { leftAt: endedAt },
      })
      return meeting
    })
    await this.appendEvent(id, 'meeting.ended', user.id, {})
    return toMeeting(updated)
  }

  /** 重签 RTC：必须是该会议参会人 */
  async issueRtcToken(user: AuthUser, id: string): Promise<RtcToken> {
    const meeting = await this.findJoinable(id)
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: user.id } },
    })
    if (participant === null) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '你不在这个会议里', 403)
    }
    return this.issueToken(meeting.roomName, user.id)
  }

  async lock(user: AuthUser, id: string, locked: boolean): Promise<Meeting> {
    await this.findOwned(user, id)
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { lockedAt: locked ? new Date() : null },
    })
    return toMeeting(updated)
  }

  async transferHost(user: AuthUser, id: string, input: TransferHostInput): Promise<Meeting> {
    const row = await this.findOwned(user, id)
    if (input.userId === row.hostId) {
      throw new ApiError(10000, '目标已经是主持人', 409)
    }
    const target = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: input.userId } },
    })
    if (target === null) {
      throw new ApiError(10000, '目标用户不在会议中', 404)
    }
    const updated = await this.transfer(id, row.hostId, input.userId)
    await this.appendEvent(id, 'meeting.host.transferred', user.id, {
      from: row.hostId,
      to: input.userId,
    })
    return updated
  }

  /** 主持人掉线且没有自动接管时，COHOST 可接管（04 §附录 时序 ③） */
  async takeoverHost(user: AuthUser, id: string): Promise<Meeting> {
    const row = await this.prisma.meeting.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    const caller = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: user.id } },
    })
    if (caller === null || caller.role !== 'COHOST') {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有联席主持人可以接管', 403)
    }
    const host = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: row.hostId } },
    })
    if (host !== null && host.leftAt === null) {
      throw new ApiError(10000, '主持人还在会议中，不能接管', 409)
    }
    const updated = await this.transfer(id, row.hostId, user.id)
    await this.appendEvent(id, 'meeting.host.transferred', user.id, {
      from: row.hostId,
      to: user.id,
      reason: 'takeover',
    })
    return updated
  }

  /** 06 §M4-15：6 位 hostKey 认领主持权 */
  async claimHost(user: AuthUser, id: string, input: ClaimHostInput): Promise<Meeting> {
    const row = await this.prisma.meeting.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    if (row.hostKey === null || !(await argon2.verify(row.hostKey, input.hostKey))) {
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '主持人密钥错误', 403)
    }
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: id, userId: user.id } },
    })
    if (participant === null) {
      await this.prisma.meetingParticipant.create({
        data: {
          meetingId: id,
          userId: user.id,
          role: 'ATTENDEE',
          joinedAt: new Date(),
          mediaState: { audioOn: false, videoOn: false, screenSharing: false },
        },
      })
    }
    const updated = await this.transfer(id, row.hostId, user.id)
    await this.appendEvent(id, 'meeting.host.regained', user.id, { from: row.hostId, to: user.id })
    return updated
  }

  async listWaiting(user: AuthUser, id: string): Promise<WaitingEntry[]> {
    await this.findOwned(user, id)
    const rows = await this.prisma.waitingRoomEntry.findMany({
      where: { meetingId: id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      guestName: row.guestName,
      createdAt: row.createdAt.toISOString(),
    }))
  }

  /** 准入：写 ADMITTED → 建/复用参会记录 → 置 ONGOING → 给该用户签 RTC */
  async admit(user: AuthUser, id: string, entryId: string): Promise<MeetingJoinResult> {
    const meeting = await this.findOwned(user, id)
    const entry = await this.prisma.waitingRoomEntry.findFirst({
      where: { id: entryId, meetingId: id, status: 'PENDING' },
    })
    if (entry === null) {
      throw new ApiError(10000, '等候室里没有这条记录', 404)
    }
    await this.prisma.waitingRoomEntry.update({
      where: { id: entryId },
      data: { status: 'ADMITTED' },
    })
    const participant =
      entry.userId === null
        ? await this.prisma.meetingParticipant.create({
            data: {
              meetingId: id,
              guestName: entry.guestName,
              role: 'GUEST',
              joinedAt: new Date(),
              mediaState: { audioOn: false, videoOn: false, screenSharing: false },
            },
          })
        : await this.upsertParticipant(id, entry.userId, null)
    await this.markOngoing(meeting)
    const identity = entry.userId ?? `guest:${participant.id}`
    await this.appendEvent(id, 'meeting.member.joined', user.id, { participantId: participant.id })
    const rtc = await this.issueToken(meeting.roomName, identity)
    return buildJoinResult(meeting.id, meeting.roomName, participant, rtc)
  }

  async deny(user: AuthUser, id: string, entryId: string): Promise<void> {
    await this.findOwned(user, id)
    const entry = await this.prisma.waitingRoomEntry.findFirst({
      where: { id: entryId, meetingId: id, status: 'PENDING' },
    })
    if (entry === null) {
      throw new ApiError(10000, '等候室里没有这条记录', 404)
    }
    await this.prisma.waitingRoomEntry.update({
      where: { id: entryId },
      data: { status: 'DENIED' },
    })
  }

  async admitAll(user: AuthUser, id: string): Promise<{ count: number }> {
    await this.findOwned(user, id)
    const result = await this.prisma.waitingRoomEntry.updateMany({
      where: { meetingId: id, status: 'PENDING' },
      data: { status: 'ADMITTED' },
    })
    return { count: result.count }
  }

  private async transfer(id: string, fromUserId: string, toUserId: string): Promise<Meeting> {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.meetingParticipant.updateMany({
        where: { meetingId: id, userId: fromUserId },
        data: { role: 'COHOST' },
      })
      await tx.meetingParticipant.updateMany({
        where: { meetingId: id, userId: toUserId },
        data: { role: 'HOST' },
      })
      return tx.meeting.update({ where: { id }, data: { hostId: toUserId } })
    })
    return toMeeting(updated)
  }

  private async findJoinable(id: string): Promise<MeetingRow> {
    const row = await this.prisma.meeting.findFirst({ where: { id, deletedAt: null } })
    if (row === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    if (!canRunMeetingAction(row.status, 'join')) {
      throw new ApiError(ERROR_CODES.MEETING_ENDED, '会议已结束', 409)
    }
    if (row.lockedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '会议已锁定', 403)
    }
    return row
  }

  private async assertPassword(row: MeetingRow, password: string | undefined): Promise<void> {
    if (row.passwordHash === null) return
    if (password === undefined || !(await argon2.verify(row.passwordHash, password))) {
      throw new ApiError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '会议密码错误', 403)
    }
  }

  private async upsertParticipant(
    meetingId: string,
    userId: string,
    guestName: string | null,
  ): Promise<{ id: string; role: string | null; guestName: string | null }> {
    const existing = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    })
    if (existing !== null) {
      await this.prisma.meetingParticipant.update({
        where: { id: existing.id },
        data: { joinedAt: existing.joinedAt ?? new Date(), leftAt: null },
      })
      return { id: existing.id, role: existing.role, guestName: existing.guestName }
    }
    const created = await this.prisma.meetingParticipant.create({
      data: {
        meetingId,
        userId,
        guestName,
        role: 'ATTENDEE',
        joinedAt: new Date(),
        mediaState: { audioOn: false, videoOn: false, screenSharing: false },
      },
    })
    return { id: created.id, role: created.role, guestName: created.guestName }
  }

  private async markOngoing(row: MeetingRow): Promise<void> {
    if (row.status !== 'SCHEDULED') return
    await this.prisma.meeting.update({
      where: { id: row.id },
      data: { status: 'ONGOING', actualStartAt: new Date() },
    })
  }

  private async issueToken(roomName: string, identity: string): Promise<RtcToken> {
    const issued = await this.rtc.issue(roomName, identity, RTC_TOKEN_TTL_SECONDS)
    return {
      token: issued.token,
      url: issued.url,
      expiresAt: issued.expiresAt.toISOString(),
    }
  }

  private async appendEvent(
    meetingId: string,
    type: string,
    fromUid: string | null,
    data: Record<string, unknown>,
  ): Promise<void> {
    const last = await this.prisma.meetingEvent.aggregate({
      where: { meetingId },
      _max: { seq: true },
    })
    await this.prisma.meetingEvent.create({
      data: {
        meetingId,
        type,
        fromUid,
        data: data as Prisma.InputJsonValue,
        seq: (last._max.seq ?? 0) + 1,
      },
    })
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

function buildJoinResult(
  meetingId: string,
  roomName: string,
  participant: { id: string; role: string | null; guestName: string | null },
  rtc: RtcToken,
): MeetingJoinResult {
  return {
    meetingId,
    roomName,
    rtc,
    participant: {
      id: participant.id,
      role: participant.role as MeetingJoinResult['participant']['role'],
      guestName: participant.guestName,
    },
  }
}
