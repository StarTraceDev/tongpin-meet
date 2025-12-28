import { describe, expect, it, vi } from 'vitest'

import { CostService } from './cost.service'

type ConfigRow = { key: string; value: unknown }

function createPrisma(options: {
  prices?: ConfigRow[]
  ai?: { createdAt: Date; costCents: number }[]
  meetings?: { actualStartAt: Date | null; actualEndAt: Date | null }[]
  sms?: { createdAt: Date }[]
  storageBytes?: number
}): Record<string, never> {
  return {
    sysConfig: { findMany: vi.fn(async () => options.prices ?? []) },
    aiUsage: { findMany: vi.fn(async () => options.ai ?? []) },
    meeting: { findMany: vi.fn(async () => options.meetings ?? []) },
    smsLog: { findMany: vi.fn(async () => options.sms ?? []) },
    meetingFile: {
      aggregate: vi.fn(async () => ({ _sum: { sizeBytes: options.storageBytes ?? 0 } })),
    },
  } as unknown as Record<string, never>
}

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000)

describe('CostService', () => {
  it('按单价换算四类成本并汇总', async () => {
    const prisma = createPrisma({
      prices: [
        { key: 'cost.meeting_per_minute_cents', value: 2 },
        { key: 'cost.sms_per_message_cents', value: 3 },
        { key: 'cost.storage_per_gb_day_cents', value: 100 },
      ],
      ai: [{ createdAt: new Date(), costCents: 50 }],
      meetings: [{ actualStartAt: minutesAgo(40), actualEndAt: new Date() }],
      sms: [{ createdAt: new Date() }, { createdAt: new Date() }],
      storageBytes: 1024 ** 3,
    })
    const service = new CostService(prisma as never)

    const result = await service.costs(7)

    expect(result.days).toHaveLength(7)
    const today = result.days[6]!
    expect(today.aiCents).toBe(50)
    expect(today.meetingCents).toBe(80)
    expect(today.smsCents).toBe(6)
    expect(today.storageCents).toBe(100)
    expect(result.totals).toEqual({
      aiCents: 50,
      meetingCents: 80,
      smsCents: 6,
      storageCents: 700,
    })
  })

  it('单价缺失时只统计 AI 实额', async () => {
    const prisma = createPrisma({
      ai: [{ createdAt: minutesAgo(1), costCents: 9 }],
      sms: [{ createdAt: minutesAgo(1) }],
      storageBytes: 2 * 1024 ** 3,
    })
    const service = new CostService(prisma as never)

    const result = await service.costs(7)

    expect(result.totals).toEqual({ aiCents: 9, meetingCents: 0, smsCents: 0, storageCents: 0 })
  })

  it('窗口外的费用不进桶', async () => {
    const prisma = createPrisma({
      prices: [{ key: 'cost.sms_per_message_cents', value: 3 }],
      ai: [{ createdAt: new Date('2020-01-01T00:00:00Z'), costCents: 999 }],
      sms: [{ createdAt: new Date('2020-01-01T00:00:00Z') }],
    })
    const service = new CostService(prisma as never)

    const result = await service.costs(7)

    expect(result.totals.aiCents).toBe(0)
    expect(result.totals.smsCents).toBe(0)
    expect(result.days.every((day) => day.aiCents === 0)).toBe(true)
  })
})
