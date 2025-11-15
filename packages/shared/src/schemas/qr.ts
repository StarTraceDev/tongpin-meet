import { z } from 'zod'

import { sessionResponseSchema } from './auth'
import { isoDateTimeSchema } from './common'

/**
 * 04 §6.1：本期用设备码替代手机扫码，PC 创建会话后显示 6 位码，
 * 任一已登录浏览器确认；PC 轮询到 CONFIRMED 时一次性取走 token。
 */
export const qrSessionStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CONSUMED',
  'REJECTED',
  'EXPIRED',
])

export const qrSessionSchema = z.object({
  id: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
  status: qrSessionStatusSchema,
  expiresAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
})

/** 轮询返回；只有首次拿到 CONFIRMED 时带 session，之后不再重复下发 */
export const qrPollSchema = z.object({
  id: z.string().min(1),
  status: qrSessionStatusSchema,
  expiresAt: isoDateTimeSchema,
  session: sessionResponseSchema.optional(),
})
