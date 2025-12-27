import { describe, expect, it, vi } from 'vitest'

import { HostMetricsService } from './host-metrics.service'

function createPrisma(count: number): { meetingParticipant: { count: ReturnType<typeof vi.fn> } } {
  return { meetingParticipant: { count: vi.fn(async () => count) } }
}

describe('HostMetricsService', () => {
  it('返回一次可用的采样快照', async () => {
    const prisma = createPrisma(7)
    const service = new HostMetricsService(prisma as never)

    const sample = await service.sample()

    expect(sample.connections).toBe(7)
    expect(sample.cpuPercent).toBeGreaterThanOrEqual(0)
    expect(sample.cpuPercent).toBeLessThanOrEqual(100)
    expect(sample.memoryTotalBytes).toBeGreaterThan(0)
    expect(sample.memoryUsedBytes).toBeGreaterThan(0)
    expect(sample.memoryUsedBytes).toBeLessThanOrEqual(sample.memoryTotalBytes)
    expect(Number.isNaN(Date.parse(sample.sampledAt))).toBe(false)
    expect(prisma.meetingParticipant.count).toHaveBeenCalledWith({
      where: {
        leftAt: null,
        joinedAt: { not: null },
        meeting: { deletedAt: null, status: 'ONGOING' },
      },
    })
  })

  it('第二次采样仍落在 0–100 区间', async () => {
    const prisma = createPrisma(0)
    const service = new HostMetricsService(prisma as never)

    await service.sample()
    const second = await service.sample()

    expect(second.connections).toBe(0)
    expect(second.cpuPercent).toBeGreaterThanOrEqual(0)
    expect(second.cpuPercent).toBeLessThanOrEqual(100)
  })
})
