import { Injectable } from '@nestjs/common'

import { ERROR_CODES } from '../../../../packages/shared/src/constants'
import { recordingStatusSchema } from '../../../../packages/shared/src/schemas'
import type { AuthUser, Recording, RecordingDetail, RecordingList } from '@tongpin/shared/types'

import { ApiError } from '../../common/src/errors/api-error'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

interface RecordingRow {
  id: string
  meetingId: string
  startedById: string
  status: string
  durationSec: number | null
  sizeBytes: number | null
  startedAt: Date
  stoppedAt: Date | null
  meeting?: { title: string }
  segments?: {
    id: string
    index: number
    startSec: number | null
    endSec: number | null
    sizeBytes: number | null
  }[]
}

function toRecording(row: RecordingRow): Recording {
  return {
    id: row.id,
    meetingId: row.meetingId,
    meetingTitle: row.meeting?.title ?? '会议录制',
    startedById: row.startedById,
    status: recordingStatusSchema.parse(row.status),
    durationSec: row.durationSec,
    sizeBytes: row.sizeBytes,
    startedAt: row.startedAt.toISOString(),
    stoppedAt: row.stoppedAt === null ? null : row.stoppedAt.toISOString(),
  }
}

@Injectable()
export class RecordingService {
  constructor(private readonly prisma: PrismaService) {}

  /** 主持人开始录制；同一会议同时只允许一条进行中的录制 */
  async start(user: AuthUser, meetingId: string): Promise<Recording> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
    })
    if (meeting === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    if (meeting.hostId !== user.id) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有主持人可以开始录制', 403)
    }
    const running = await this.prisma.recording.findFirst({
      where: { meetingId, status: { in: ['REQUESTED', 'RECORDING'] } },
    })
    if (running !== null) {
      throw new ApiError(ERROR_CODES.RECORDING_ALREADY_RUNNING, '当前已有录制进行中', 409)
    }
    const created = await this.prisma.recording.create({
      data: { meetingId, startedById: user.id, status: 'RECORDING', startedAt: new Date() },
      include: { meeting: { select: { title: true } } },
    })
    return toRecording(created)
  }

  /** 停止录制：算出时长，进入处理中，后续由转码任务置 READY（本期没有真实转码） */
  async stop(user: AuthUser, meetingId: string, recordingId: string): Promise<Recording> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
    })
    if (meeting === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    if (meeting.hostId !== user.id) {
      throw new ApiError(ERROR_CODES.COMMON_FORBIDDEN, '只有主持人可以停止录制', 403)
    }
    const row = await this.prisma.recording.findFirst({
      where: { id: recordingId, meetingId },
    })
    if (row === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '录制不存在', 404)
    if (row.status !== 'RECORDING' && row.status !== 'REQUESTED') {
      throw new ApiError(ERROR_CODES.RECORDING_STATE_INVALID, '录制已结束', 409)
    }
    const stoppedAt = new Date()
    const durationSec = Math.max(
      0,
      Math.round((stoppedAt.getTime() - row.startedAt.getTime()) / 1000),
    )
    const updated = await this.prisma.recording.update({
      where: { id: row.id },
      data: { status: 'READY', stoppedAt, durationSec },
      include: { meeting: { select: { title: true } } },
    })
    return toRecording(updated)
  }

  /** 我参与过的会议的录制（录制页列表） */
  async listMine(user: AuthUser): Promise<RecordingList> {
    const rows = await this.prisma.recording.findMany({
      where: {
        meeting: {
          deletedAt: null,
          OR: [{ hostId: user.id }, { participants: { some: { userId: user.id } } }],
        },
      },
      include: { meeting: { select: { title: true } } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })
    return { items: rows.map(toRecording), total: rows.length }
  }

  async listByMeeting(user: AuthUser, meetingId: string): Promise<RecordingList> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, deletedAt: null },
    })
    if (meeting === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '会议不存在', 404)
    const rows = await this.prisma.recording.findMany({
      where: { meetingId },
      include: { meeting: { select: { title: true } } },
      orderBy: { startedAt: 'desc' },
    })
    void user
    return { items: rows.map(toRecording), total: rows.length }
  }

  async detail(user: AuthUser, recordingId: string): Promise<RecordingDetail> {
    const row = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        meeting: {
          OR: [{ hostId: user.id }, { participants: { some: { userId: user.id } } }],
        },
      },
      include: {
        meeting: { select: { title: true } },
        segments: { orderBy: { index: 'asc' } },
      },
    })
    if (row === null) throw new ApiError(ERROR_CODES.COMMON_NOT_FOUND, '录制不存在', 404)
    return {
      ...toRecording(row),
      segments: (row.segments ?? []).map((segment) => ({
        id: segment.id,
        index: segment.index,
        startSec: segment.startSec,
        endSec: segment.endSec,
        sizeBytes: segment.sizeBytes,
      })),
    }
  }
}
