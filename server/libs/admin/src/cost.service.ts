import { Injectable } from '@nestjs/common'

import type { CostDay, Costs, CostTotals } from '../../../../packages/shared/src/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

const GIB = 1024 ** 3
const PRICE_KEYS = {
  meeting: 'cost.meeting_per_minute_cents',
  sms: 'cost.sms_per_message_cents',
  storage: 'cost.storage_per_gb_day_cents',
} as const

type Prices = { meeting: number; sms: number; storage: number }

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 从今天往前数 count 天（UTC，与仪表盘趋势一致） */
function buildBuckets(now: Date, count: number): string[] {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Array.from({ length: count }, (_, index) =>
    dayKey(new Date(start - (count - 1 - index) * 86_400_000)),
  )
}

/**
 * 04 §6.8 `GET /admin/costs`：AI 用 usage 里记的实额；会议/短信/存储没有计费数据，
 * 按 sys_configs 里的单价换算，单价缺失时记 0（图表只剩 AI 一条有数）。
 * 存储按「当前用量 × 单价」平铺到每天，历史用量等有快照表再换。
 */
@Injectable()
export class CostService {
  constructor(private readonly prisma: PrismaService) {}

  async costs(days: number): Promise<Costs> {
    const now = new Date()
    const buckets = buildBuckets(now, days)
    const start = new Date(`${buckets[0] ?? dayKey(now)}T00:00:00.000Z`)
    const prices = await this.prices()
    const index = new Map(buckets.map((date, position) => [date, position]))
    const rows: CostDay[] = buckets.map((date) => ({
      date,
      aiCents: 0,
      meetingCents: 0,
      smsCents: 0,
      storageCents: 0,
    }))

    const [aiRows, meetings, smsRows, storage] = await Promise.all([
      this.prisma.aiUsage.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true, costCents: true },
      }),
      this.prisma.meeting.findMany({
        where: {
          deletedAt: null,
          actualStartAt: { not: null },
          actualEndAt: { not: null, gte: start },
        },
        select: { actualStartAt: true, actualEndAt: true },
      }),
      this.prisma.smsLog.findMany({
        where: { createdAt: { gte: start }, status: 'SENT' },
        select: { createdAt: true },
      }),
      this.prisma.meetingFile.aggregate({
        where: { deletedAt: null, status: 'READY' },
        _sum: { sizeBytes: true },
      }),
    ])

    for (const row of aiRows) {
      const position = index.get(dayKey(row.createdAt))
      if (position !== undefined) rows[position]!.aiCents += row.costCents
    }

    for (const meeting of meetings) {
      if (meeting.actualStartAt === null || meeting.actualEndAt === null) continue
      const position = index.get(dayKey(meeting.actualEndAt))
      if (position === undefined) continue
      const minutes = Math.max(
        0,
        (meeting.actualEndAt.getTime() - meeting.actualStartAt.getTime()) / 60_000,
      )
      rows[position]!.meetingCents += Math.round(minutes * prices.meeting)
    }

    for (const row of smsRows) {
      const position = index.get(dayKey(row.createdAt))
      if (position !== undefined) rows[position]!.smsCents += prices.sms
    }

    const storageCents = Math.round(((storage._sum.sizeBytes ?? 0) / GIB) * prices.storage)
    for (const row of rows) {
      row.storageCents = storageCents
    }

    const totals = rows.reduce<CostTotals>(
      (sum, row) => ({
        aiCents: sum.aiCents + row.aiCents,
        meetingCents: sum.meetingCents + row.meetingCents,
        smsCents: sum.smsCents + row.smsCents,
        storageCents: sum.storageCents + row.storageCents,
      }),
      { aiCents: 0, meetingCents: 0, smsCents: 0, storageCents: 0 },
    )

    return { days: rows, totals }
  }

  private async prices(): Promise<Prices> {
    const rows = await this.prisma.sysConfig.findMany({
      where: { key: { in: Object.values(PRICE_KEYS) } },
      select: { key: true, value: true },
    })
    const read = (key: string): number => {
      const value = rows.find((row) => row.key === key)?.value
      return typeof value === 'number' && value >= 0 ? value : 0
    }
    return {
      meeting: read(PRICE_KEYS.meeting),
      sms: read(PRICE_KEYS.sms),
      storage: read(PRICE_KEYS.storage),
    }
  }
}
