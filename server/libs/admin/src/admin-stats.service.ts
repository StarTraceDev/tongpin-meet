import { Injectable } from '@nestjs/common'

import type {
  AdminRoom,
  AdminRoomList,
  AdminStatsOverview,
  AdminTrend,
  AdminTrendPoint,
  AdminUsage,
  AdminUsageSlice,
} from '@tongpin/shared/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

/** 折线 / 面积图默认看最近 14 天（06 §11.3） */
export const TREND_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

const MIME_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ['image/', '图片'],
  ['video/', '视频'],
  ['audio/', '音频'],
]

/** 用量饼按文件类型聚合；M11-3 先用会议文件存储量，AI / 短信用量等有表后再扩。 */
function usageGroup(mime: string | null): string {
  if (mime === null) {
    return '其他'
  }

  for (const [prefix, name] of MIME_GROUPS) {
    if (mime.startsWith(prefix)) {
      return name
    }
  }

  if (
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('presentation')
  ) {
    return '文档'
  }

  return '其他'
}

/** 从 now 往前 count 天（含今天），返回 UTC 日期的桶。 */
function buildDayBuckets(now: Date, count: number): string[] {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const buckets: string[] = []

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    buckets.push(new Date(todayUtc - offset * DAY_MS).toISOString().slice(0, 10))
  }

  return buckets
}

function countByDay(buckets: string[], dates: Date[]): AdminTrendPoint[] {
  const counts = new Map<string, number>(buckets.map((date) => [date, 0]))

  for (const date of dates) {
    const key = date.toISOString().slice(0, 10)
    const current = counts.get(key)

    if (current !== undefined) {
      counts.set(key, current + 1)
    }
  }

  return buckets.map((date) => ({ date, count: counts.get(date) ?? 0 }))
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminStatsOverview> {
    const [usersTotal, meetingsTotal, ongoingMeetings, onlineParticipants] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.meeting.count({ where: { deletedAt: null } }),
      this.prisma.meeting.count({ where: { deletedAt: null, status: 'ONGOING' } }),
      this.prisma.meetingParticipant.count({
        where: {
          leftAt: null,
          joinedAt: { not: null },
          meeting: { deletedAt: null, status: 'ONGOING' },
        },
      }),
    ])

    return { usersTotal, meetingsTotal, ongoingMeetings, onlineParticipants }
  }

  async meetingTrend(now: Date = new Date()): Promise<AdminTrend> {
    const buckets = buildDayBuckets(now, TREND_DAYS)
    const rows = await this.prisma.meeting.findMany({
      where: { deletedAt: null, createdAt: { gte: new Date(`${buckets[0] ?? ''}T00:00:00.000Z`) } },
      select: { createdAt: true },
    })

    return {
      points: countByDay(
        buckets,
        rows.map((row) => row.createdAt),
      ),
    }
  }

  async userGrowth(now: Date = new Date()): Promise<AdminTrend> {
    const buckets = buildDayBuckets(now, TREND_DAYS)
    const rows = await this.prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: new Date(`${buckets[0] ?? ''}T00:00:00.000Z`) } },
      select: { createdAt: true },
    })

    return {
      points: countByDay(
        buckets,
        rows.map((row) => row.createdAt),
      ),
    }
  }

  async usage(): Promise<AdminUsage> {
    const rows = await this.prisma.meetingFile.findMany({
      where: { deletedAt: null, status: 'READY' },
      select: { mime: true, sizeBytes: true },
    })

    const totals = new Map<string, number>()

    for (const row of rows) {
      const name = usageGroup(row.mime)
      totals.set(name, (totals.get(name) ?? 0) + row.sizeBytes)
    }

    const slices: AdminUsageSlice[] = [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value)

    return { slices }
  }

  async rooms(): Promise<AdminRoomList> {
    const rows = await this.prisma.meeting.findMany({
      where: { deletedAt: null, status: 'ONGOING' },
      orderBy: { actualStartAt: 'desc' },
      select: {
        id: true,
        meetingNo: true,
        title: true,
        actualStartAt: true,
        host: { select: { name: true } },
        participants: {
          where: { leftAt: null, joinedAt: { not: null } },
          select: { id: true },
        },
      },
    })

    const items: AdminRoom[] = rows.map((row) => ({
      meetingId: row.id,
      meetingNo: row.meetingNo,
      title: row.title,
      hostName: row.host.name,
      onlineCount: row.participants.length,
      startedAt: row.actualStartAt?.toISOString() ?? null,
    }))

    return { items }
  }
}
