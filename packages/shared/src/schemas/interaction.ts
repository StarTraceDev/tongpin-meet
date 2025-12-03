import { z } from 'zod'

import { idSchema, isoDateTimeSchema } from './common'

/** 03 §5.4：签到 / 休息共用 ONGOING → CLOSED，单向不重开 */
export const interactionStatusSchema = z.enum(['ONGOING', 'CLOSED'])

/** 06 §M5-5.1：发起签到 */
export const createCheckinSchema = z.object({
  title: z.string().trim().min(1).max(120).default('全员签到'),
  anonymous: z.boolean().default(false),
})

export const checkinSchema = z.object({
  id: idSchema,
  meetingId: idSchema,
  title: z.string(),
  status: interactionStatusSchema,
  anonymous: z.boolean(),
  createdById: idSchema,
  createdAt: isoDateTimeSchema,
  closedAt: isoDateTimeSchema.nullable(),
})

/** 匿名签到不展示实名：userId 置空、userName 统一「匿名」 */
export const checkinRecordSchema = z.object({
  userId: idSchema.nullable(),
  userName: z.string(),
  respondedAt: isoDateTimeSchema,
})

export const checkinOverviewSchema = z.object({
  checkin: checkinSchema,
  total: z.int().nonnegative(),
  joined: z.int().nonnegative(),
  records: z.array(checkinRecordSchema),
})

export const checkinResultSchema = z.object({
  checkinId: idSchema,
  respondedAt: isoDateTimeSchema,
  alreadyRecorded: z.boolean(),
})
