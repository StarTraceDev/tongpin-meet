import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type { AuthUser, Minutes, UpdateMinutesInput } from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface MinutesRow {
  meetingId: string
  content: string
  status: 'PENDING' | 'GENERATING' | 'READY'
  version: number
  updatedById: string | null
  createdAt: Date
  updatedAt: Date
}

interface MeetingRow {
  id: string
  hostId: string
  deletedAt: Date | null
}

interface ParticipantRow {
  role: 'HOST' | 'COHOST' | 'ATTENDEE' | 'GUEST'
  leftAt: Date | null
}

function toMinutes(row: MinutesRow): Minutes {
  return {
    meetingId: row.meetingId,
    content: row.content,
    status: row.status,
    version: row.version,
    updatedById: row.updatedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class MinutesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 读：参会人可见；没有纪要时建一份空草稿，省得前端处理 404 */
  async get(user: AuthUser, meetingId: string): Promise<Minutes> {
    await this.assertVisible(user, meetingId)
    const row = await this.prisma.meetingMinutes.upsert({
      where: { meetingId },
      update: {},
      create: { meetingId },
    })
    return toMinutes(row as MinutesRow)
  }

  /** 写：主持/联席；version 必须与服务端一致（乐观锁） */
  async update(user: AuthUser, meetingId: string, input: UpdateMinutesInput): Promise<Minutes> {
    await this.assertManage(user, meetingId)
    const current = await this.prisma.meetingMinutes.findUnique({ where: { meetingId } })
    if (current === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '纪要还没创建', 404)
    }
    if (current.version !== input.version) {
      throw new ApiError(ERROR_CODES.MINUTES_VERSION_CONFLICT, '纪要被别人改过，刷新后再存', 409)
    }
    const row = await this.prisma.meetingMinutes.update({
      where: { meetingId },
      data: { content: input.content, version: { increment: 1 }, updatedById: user.id },
    })
    return toMinutes(row as MinutesRow)
  }

  /** AI 生成：先把状态推成 GENERATING 占位，真正的模型调用在 M12 接 */
  async generate(user: AuthUser, meetingId: string): Promise<Minutes> {
    await this.assertManage(user, meetingId)
    const current = await this.prisma.meetingMinutes.findUnique({ where: { meetingId } })
    if (current !== null && current.status === 'GENERATING') {
      return toMinutes(current as MinutesRow)
    }
    const row = await this.prisma.meetingMinutes.upsert({
      where: { meetingId },
      update: { status: 'GENERATING', version: { increment: 1 }, updatedById: user.id },
      create: { meetingId, status: 'GENERATING', updatedById: user.id },
    })
    return toMinutes(row as MinutesRow)
  }

  private async meetingOf(meetingId: string): Promise<MeetingRow> {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } })
    if (meeting === null || meeting.deletedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    return meeting as MeetingRow
  }

  private async assertVisible(user: AuthUser, meetingId: string): Promise<MeetingRow> {
    const meeting = await this.meetingOf(meetingId)
    if (meeting.hostId === user.id) return meeting
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })
    if (participant === null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    return meeting
  }

  private async assertManage(user: AuthUser, meetingId: string): Promise<MeetingRow> {
    const meeting = await this.meetingOf(meetingId)
    if (meeting.hostId === user.id) return meeting
    const participant = (await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: user.id } },
    })) as ParticipantRow | null
    if (participant === null || (participant.role !== 'HOST' && participant.role !== 'COHOST')) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN ?? 10003, '只有主持人或联席可以改纪要', 403)
    }
    return meeting
  }
}
