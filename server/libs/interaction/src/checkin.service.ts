import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AuthUser,
  Checkin,
  CheckinOverview,
  CheckinResult,
  CreateCheckinInput,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from '../../meeting/src/meeting.service'

interface MeetingScope {
  id: string
  status: string
  hostId: string
}

interface CheckinRow {
  id: string
  meetingId: string
  title: string
  status: 'ONGOING' | 'CLOSED'
  anonymous: boolean
  createdById: string
  createdAt: Date
  closedAt: Date | null
}

function toCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    meetingId: row.meetingId,
    title: row.title,
    status: row.status,
    anonymous: row.anonymous,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt === null ? null : row.closedAt.toISOString(),
  }
}

/** 签到：06 §M5-5.1；状态单向 ONGOING → CLOSED（03 §5.4），重开请新建 */
@Injectable()
export class CheckinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meetings: MeetingService,
  ) {}

  async create(user: AuthUser, meetingId: string, input: CreateCheckinInput): Promise<Checkin> {
    const meeting = await this.assertManage(user, meetingId)
    if (meeting.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.MEETING_ENDED, '会议尚未开始或已结束', 409)
    }
    const row = (await this.prisma.checkin.create({
      data: {
        meetingId,
        title: input.title,
        anonymous: input.anonymous ?? false,
        createdById: user.id,
      },
    })) as unknown as CheckinRow
    await this.meetings.appendEvent(meetingId, 'meeting.checkin.started', user.id, {
      checkinId: row.id,
      title: row.title,
      anonymous: row.anonymous,
    })
    return toCheckin(row)
  }

  async list(user: AuthUser, meetingId: string): Promise<Checkin[]> {
    await this.assertVisible(user, meetingId)
    const rows = (await this.prisma.checkin.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    })) as unknown as CheckinRow[]
    return rows.map(toCheckin)
  }

  async close(user: AuthUser, meetingId: string, checkinId: string): Promise<Checkin> {
    await this.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, checkinId)
    if (row.status === 'CLOSED') {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '签到已关闭', 409)
    }
    const updated = (await this.prisma.checkin.update({
      where: { id: row.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    })) as unknown as CheckinRow
    await this.meetings.appendEvent(meetingId, 'meeting.checkin.closed', user.id, {
      checkinId: row.id,
    })
    return toCheckin(updated)
  }

  /** 提交签到：重复提交幂等，不再发事件（避免重连刷屏） */
  async record(user: AuthUser, meetingId: string, checkinId: string): Promise<CheckinResult> {
    await this.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, checkinId)
    if (row.status === 'CLOSED') {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '签到已关闭', 409)
    }
    const existing = (await this.prisma.checkinRecord.findUnique({
      where: { checkinId_userId: { checkinId: row.id, userId: user.id } },
    })) as { respondedAt: Date } | null
    if (existing !== null) {
      return {
        checkinId: row.id,
        respondedAt: existing.respondedAt.toISOString(),
        alreadyRecorded: true,
      }
    }
    const created = (await this.prisma.checkinRecord.create({
      data: { checkinId: row.id, userId: user.id },
    })) as unknown as { respondedAt: Date }
    const joined = await this.prisma.checkinRecord.count({ where: { checkinId: row.id } })
    await this.meetings.appendEvent(meetingId, 'meeting.checkin.recorded', user.id, {
      checkinId: row.id,
      joined,
      anonymous: row.anonymous,
      ...(row.anonymous ? {} : { userId: user.id }),
    })
    return {
      checkinId: row.id,
      respondedAt: created.respondedAt.toISOString(),
      alreadyRecorded: false,
    }
  }

  async overview(user: AuthUser, meetingId: string, checkinId: string): Promise<CheckinOverview> {
    await this.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, checkinId)
    const [records, total] = await Promise.all([
      this.prisma.checkinRecord.findMany({
        where: { checkinId: row.id },
        orderBy: { respondedAt: 'asc' },
      }) as Promise<Array<{ userId: string; respondedAt: Date }>>,
      this.prisma.meetingParticipant.count({ where: { meetingId } }),
    ])
    const names = await this.namesOf(records.map((item) => item.userId))
    return {
      checkin: toCheckin(row),
      total,
      joined: records.length,
      records: records.map((item) => ({
        userId: row.anonymous ? null : item.userId,
        userName: row.anonymous ? '匿名' : (names.get(item.userId) ?? '未知用户'),
        respondedAt: item.respondedAt.toISOString(),
      })),
    }
  }

  /** 导出 CSV：匿名签到时同样不写实名 */
  async exportCsv(user: AuthUser, meetingId: string, checkinId: string): Promise<string> {
    const overview = await this.overview(user, meetingId, checkinId)
    const lines = ['签到主题,会议ID,签到人,签到时间']
    for (const item of overview.records) {
      lines.push(
        [overview.checkin.title, meetingId, item.userName, item.respondedAt]
          .map((cell) => `"${cell.replaceAll('"', '""')}"`)
          .join(','),
      )
    }
    return lines.join('\n')
  }

  private async namesOf(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map()
    const users = (await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    })) as Array<{ id: string; name: string }>
    return new Map(users.map((item) => [item.id, item.name]))
  }

  private async findOwned(meetingId: string, checkinId: string): Promise<CheckinRow> {
    const row = (await this.prisma.checkin.findFirst({
      where: { id: checkinId, meetingId },
    })) as unknown as CheckinRow | null
    if (row === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '签到不存在', 404)
    return row
  }

  private async meetingOf(meetingId: string): Promise<MeetingScope> {
    const row = (await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, status: true, hostId: true, deletedAt: true },
    })) as unknown as (MeetingScope & { deletedAt: Date | null }) | null
    if (row === null || row.deletedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    return row
  }

  private async assertVisible(user: AuthUser, meetingId: string): Promise<MeetingScope> {
    const meeting = await this.meetingOf(meetingId)
    if (meeting.hostId === user.id) return meeting
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })
    if (participant === null) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '不在会议中，无法参与互动', 403)
    }
    return meeting
  }

  private async assertManage(user: AuthUser, meetingId: string): Promise<MeetingScope> {
    const meeting = await this.assertVisible(user, meetingId)
    if (meeting.hostId === user.id) return meeting
    const participant = (await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })) as { role: string } | null
    if (participant === null || (participant.role !== 'HOST' && participant.role !== 'COHOST')) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有主持人或联席主持人可以操作', 403)
    }
    return meeting
  }
}
