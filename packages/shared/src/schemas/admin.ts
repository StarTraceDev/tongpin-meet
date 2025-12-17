import { z } from 'zod'

import { isoDateTimeSchema } from './common'

/** 04 §6.8：管理台仪表盘四个统计卡 */
export const adminStatsOverviewSchema = z.object({
  usersTotal: z.int().nonnegative(),
  meetingsTotal: z.int().nonnegative(),
  ongoingMeetings: z.int().nonnegative(),
  onlineParticipants: z.int().nonnegative(),
})

/** 折线 / 面积图的单日点，日期为 UTC 的 YYYY-MM-DD */
export const adminTrendPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.int().nonnegative(),
})

export const adminTrendSchema = z.object({
  points: z.array(adminTrendPointSchema),
})

/** 饼图切片：name 是展示名，value 是字节数 */
export const adminUsageSliceSchema = z.object({
  name: z.string().min(1),
  value: z.int().nonnegative(),
})

export const adminUsageSchema = z.object({
  slices: z.array(adminUsageSliceSchema),
})

export const adminRoomSchema = z.object({
  meetingId: z.string().min(1),
  meetingNo: z.string().min(1),
  title: z.string().min(1),
  hostName: z.string().min(1),
  onlineCount: z.int().nonnegative(),
  startedAt: isoDateTimeSchema.nullable(),
})

export const adminRoomListSchema = z.object({
  items: z.array(adminRoomSchema),
})
