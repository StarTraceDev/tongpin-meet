import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type {
  AuthUser,
  Break,
  BreakOverview,
  BreakRecord,
  BreakRecordResult,
  CreateBreakInput,
  UpdateBreakInput,
} from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { MeetingService } from '../../meeting/src/meeting.service'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { InteractionAccess } from './interaction-access'

interface BreakRow {
  id: string
  meetingId: string
  title: string | null
  status: 'ONGOING' | 'CLOSED'
  plannedSec: number | null
  createdById: string
  startedAt: Date
  endedAt: Date | null
}

function toBreak(row: BreakRow): Break {
  return {
    id: row.id,
    meetingId: row.meetingId,
    title: row.title,
    status: row.status,
    plannedSec: row.plannedSec,
    createdById: row.createdById,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt === null ? null : row.endedAt.toISOString(),
  }
}

/** 休息：06 §M5-5.4；单向 ONGOING → CLOSED，同一会议同时只能有一个进行中的休息 */
@Injectable()
export class BreakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: InteractionAccess,
    private readonly meetings: MeetingService,
  ) {}

  async list(user: AuthUser, meetingId: string): Promise<Break[]> {
    await this.access.assertVisible(user, meetingId)
    const rows = (await this.prisma.break.findMany({
      where: { meetingId },
      orderBy: { startedAt: 'desc' },
    })) as unknown as BreakRow[]
    return rows.map(toBreak)
  }

  async create(user: AuthUser, meetingId: string, input: CreateBreakInput): Promise<Break> {
    const meeting = await this.access.assertManage(user, meetingId)
    if (meeting.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.MEETING_ENDED, '会议尚未开始或已结束', 409)
    }
    const active = (await this.prisma.break.findFirst({
      where: { meetingId, status: 'ONGOING' },
      select: { id: true },
    })) as { id: string } | null
    if (active !== null) {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '已有进行中的休息，先结束再发起', 409)
    }
    const row = (await this.prisma.break.create({
      data: {
        meetingId,
        title: input.title ?? null,
        plannedSec: input.plannedSec ?? null,
        createdById: user.id,
      },
    })) as unknown as BreakRow
    await this.meetings.appendEvent(meetingId, 'meeting.break.started', user.id, {
      breakId: row.id,
      plannedSec: row.plannedSec,
    })
    return toBreak(row)
  }

  async update(
    user: AuthUser,
    meetingId: string,
    breakId: string,
    input: UpdateBreakInput,
  ): Promise<Break> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, breakId)
    if (row.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '休息已结束，不能再改', 409)
    }
    const updated = (await this.prisma.break.update({
      where: { id: row.id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.plannedSec === undefined ? {} : { plannedSec: input.plannedSec }),
      },
    })) as unknown as BreakRow
    return toBreak(updated)
  }

  async close(user: AuthUser, meetingId: string, breakId: string): Promise<Break> {
    await this.access.assertManage(user, meetingId)
    const row = await this.findOwned(meetingId, breakId)
    if (row.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '休息已结束', 409)
    }
    const updated = (await this.prisma.break.update({
      where: { id: row.id },
      data: { status: 'CLOSED', endedAt: new Date() },
    })) as unknown as BreakRow
    await this.meetings.appendEvent(meetingId, 'meeting.break.ended', user.id, {
      breakId: row.id,
    })
    return toBreak(updated)
  }

  async overview(user: AuthUser, meetingId: string, breakId: string): Promise<BreakOverview> {
    await this.access.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, breakId)
    return this.overviewOf(row)
  }

  async setRecord(
    user: AuthUser,
    meetingId: string,
    breakId: string,
    resting: boolean,
  ): Promise<BreakRecordResult> {
    await this.access.assertVisible(user, meetingId)
    const row = await this.findOwned(meetingId, breakId)
    if (row.status !== 'ONGOING') {
      throw new ApiError(ERROR_CODES.INTERACTION_CLOSED, '休息已结束', 409)
    }
    const record = (await this.prisma.breakRecord.upsert({
      where: { breakId_userId: { breakId: row.id, userId: user.id } },
      create: { breakId: row.id, userId: user.id, resting },
      update: { resting, changedAt: new Date() },
    })) as unknown as { resting: boolean; changedAt: Date }
    const restingCount = await this.prisma.breakRecord.count({
      where: { breakId: row.id, resting: true },
    })
    await this.meetings.appendEvent(meetingId, 'meeting.break.member-changed', user.id, {
      breakId: row.id,
      resting: record.resting,
      restingCount,
    })
    return {
      breakId: row.id,
      resting: record.resting,
      restingCount,
      changedAt: record.changedAt.toISOString(),
    }
  }

  private async overviewOf(row: BreakRow): Promise<BreakOverview> {
    const records = (await this.prisma.breakRecord.findMany({
      where: { breakId: row.id },
      orderBy: { changedAt: 'asc' },
    })) as Array<{ userId: string; resting: boolean; changedAt: Date }>
    const names = await this.namesOf(records.map((item) => item.userId))
    const mapped: BreakRecord[] = records.map((item) => ({
      userId: item.userId,
      userName: names.get(item.userId) ?? '未知用户',
      resting: item.resting,
      changedAt: item.changedAt.toISOString(),
    }))
    return {
      break: toBreak(row),
      restingCount: mapped.filter((item) => item.resting).length,
      records: mapped,
    }
  }

  private async namesOf(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map()
    const users = (await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    })) as Array<{ id: string; name: string }>
    return new Map(users.map((item) => [item.id, item.name]))
  }

  private async findOwned(meetingId: string, breakId: string): Promise<BreakRow> {
    const row = (await this.prisma.break.findFirst({
      where: { id: breakId, meetingId },
    })) as unknown as BreakRow | null
    if (row === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '休息不存在', 404)
    return row
  }
}
