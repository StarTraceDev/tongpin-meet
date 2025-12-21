import { z } from 'zod'

import { USER_STATUS } from '../constants/enums'

import {
  isoDateTimeSchema,
  meetingNoSchema,
  paginatedSchema,
  paginationQuerySchema,
  phoneSchema,
} from './common'
import { meetingStatusSchema } from './meeting'

export const userStatusSchema = z.enum(USER_STATUS)

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

/** 06 §11.4 会议管理列表行：hostName 是主持人昵称，participantCount 去重人数 */
export const adminMeetingItemSchema = z.object({
  id: z.string().min(1),
  meetingNo: meetingNoSchema,
  title: z.string(),
  hostName: z.string(),
  status: meetingStatusSchema,
  startAt: isoDateTimeSchema,
  actualStartAt: isoDateTimeSchema.nullable(),
  actualEndAt: isoDateTimeSchema.nullable(),
  participantCount: z.int().nonnegative(),
})

export const adminMeetingsQuerySchema = paginationQuerySchema.extend({
  status: meetingStatusSchema.optional(),
  keyword: z.string().trim().max(50).optional(),
})

export const adminMeetingListSchema = paginatedSchema(adminMeetingItemSchema)

/** 强制结束的返回体与列表行同形状，前端可以直接原地替换 */
export const adminMeetingActionSchema = z.object({
  meeting: adminMeetingItemSchema,
})

export const adminRoleOptionSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  builtin: z.boolean(),
})

export const adminRoleOptionListSchema = z.object({
  items: z.array(adminRoleOptionSchema),
})

export const adminUserItemSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: userStatusSchema,
  deptId: z.string().nullable(),
  deptName: z.string().nullable(),
  roles: z.array(adminRoleOptionSchema),
  lastLoginAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
})

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  status: userStatusSchema.optional(),
  keyword: z.string().trim().max(50).optional(),
})

export const adminUserListSchema = paginatedSchema(adminUserItemSchema)

export const adminPasswordSchema = z.string().min(8, '密码至少 8 位').max(64, '密码最多 64 位')

export const adminUserCreateSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1, '请填写姓名').max(30),
  email: z.email().optional(),
  password: adminPasswordSchema,
  roleIds: z.array(z.string().min(1)).default([]),
})

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  email: z.email().nullable().optional(),
})

export const adminUserActionSchema = z.object({
  user: adminUserItemSchema,
})

export const adminUserRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)),
})

export const adminResetPasswordSchema = z.object({
  password: adminPasswordSchema,
})
