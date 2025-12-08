import { z } from 'zod'

import { idSchema, isoDateTimeSchema } from './common'

export const minutesStatusSchema = z.enum(['PENDING', 'GENERATING', 'READY'])

/** Markdown 正文；上限 200k 字符，避免把整本书塞进来 */
export const MINUTES_MAX_LENGTH = 200_000

export const updateMinutesSchema = z.object({
  content: z.string().max(MINUTES_MAX_LENGTH),
  /** 乐观锁：必须等于服务端当前版本，否则 409/30406 */
  version: z.int().min(0),
})

export const minutesSchema = z.object({
  meetingId: idSchema,
  content: z.string(),
  status: minutesStatusSchema,
  version: z.int().nonnegative(),
  updatedById: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
