import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import type { AuthUser } from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

export interface MeetingScope {
  id: string
  status: string
  hostId: string
}

/** 互动模块统一的会议可见性 / 管理权限判定（签到、投票、休息共用） */
@Injectable()
export class InteractionAccess {
  constructor(private readonly prisma: PrismaService) {}

  async meetingOf(meetingId: string): Promise<MeetingScope> {
    const row = (await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, status: true, hostId: true, deletedAt: true },
    })) as unknown as (MeetingScope & { deletedAt: Date | null }) | null
    if (row === null || row.deletedAt !== null) {
      throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    }
    return row
  }

  async assertVisible(user: AuthUser, meetingId: string): Promise<MeetingScope> {
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

  async assertManage(user: AuthUser, meetingId: string): Promise<MeetingScope> {
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
