import os from 'node:os'

import { Injectable } from '@nestjs/common'

import type { HostMetrics } from '../../../../packages/shared/src/types'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest 构造函数注入需要运行时类
import { PrismaService } from '../../infra/src/prisma/prisma.service'

type CpuTimes = { idle: number; total: number }

function readCpuTimes(): CpuTimes {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const times = cpu.times
    idle += times.idle
    total += times.user + times.nice + times.sys + times.idle + times.irq
  }
  return { idle, total }
}

/**
 * 04 §6.8 的 `GET /admin/metrics/hosts`：不落库，一次一个快照。
 * CPU 用两次采样的 idle/total 差值，第一次退化为 loadavg 近似；
 * 「连接数」当前用进行中会议的在线参会人数近似（WS 连接数在 gateway 进程，api 拿不到）。
 */
@Injectable()
export class HostMetricsService {
  private previous: CpuTimes | null = null

  constructor(private readonly prisma: PrismaService) {}

  async sample(): Promise<HostMetrics> {
    const current = readCpuTimes()
    const previous = this.previous
    this.previous = current

    const cpuPercent = this.cpuPercent(previous, current)
    const total = os.totalmem()

    const connections = await this.prisma.meetingParticipant.count({
      where: {
        leftAt: null,
        joinedAt: { not: null },
        meeting: { deletedAt: null, status: 'ONGOING' },
      },
    })

    return {
      sampledAt: new Date().toISOString(),
      cpuPercent: Math.round(cpuPercent * 10) / 10,
      memoryUsedBytes: total - os.freemem(),
      memoryTotalBytes: total,
      connections,
    }
  }

  private cpuPercent(previous: CpuTimes | null, current: CpuTimes): number {
    if (previous !== null) {
      const idleDelta = current.idle - previous.idle
      const totalDelta = current.total - previous.total
      if (totalDelta > 0) {
        return Math.min(100, Math.max(0, (1 - idleDelta / totalDelta) * 100))
      }
    }
    const cores = os.cpus().length || 1
    return Math.min(100, ((os.loadavg()[0] ?? 0) / cores) * 100)
  }
}
