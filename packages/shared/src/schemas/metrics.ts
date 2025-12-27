import { z } from 'zod'

import { isoDateTimeSchema } from './common'

/** 04 §6.8 主机监控：一次采样，前端按 5s 轮询自己攒曲线 */
export const hostMetricsSchema = z.object({
  sampledAt: isoDateTimeSchema,
  cpuPercent: z.number().min(0).max(100),
  memoryUsedBytes: z.int().nonnegative(),
  memoryTotalBytes: z.int().nonnegative(),
  connections: z.int().nonnegative(),
})
