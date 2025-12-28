import { z } from 'zod'

/** 04 §6.8 `GET /admin/costs`：按天分桶，金额统一用「分」，便于整数累加 */
export const costDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  aiCents: z.int().nonnegative(),
  meetingCents: z.int().nonnegative(),
  smsCents: z.int().nonnegative(),
  storageCents: z.int().nonnegative(),
})

export const costTotalsSchema = z.object({
  aiCents: z.int().nonnegative(),
  meetingCents: z.int().nonnegative(),
  smsCents: z.int().nonnegative(),
  storageCents: z.int().nonnegative(),
})

export const costsSchema = z.object({
  days: z.array(costDaySchema),
  totals: costTotalsSchema,
})

export const costQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(14),
})
