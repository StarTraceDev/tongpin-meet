import { z } from 'zod'

import { MEETING_STATUS } from '../constants/enums'
import { LIMITS } from '../constants/limits'
import { isoDateTimeSchema, meetingNoSchema, paginationQuerySchema } from './common'
import { participantRoleSchema } from './participant'

export const meetingStatusSchema = z.enum(MEETING_STATUS)

/** 03 §5.3：settings 是 Json，四个开关都有默认值 */
export const meetingSettingsSchema = z.object({
  muteOnJoin: z.boolean().default(true),
  watermark: z.boolean().default(false),
  allowGuest: z.boolean().default(false),
  autoRecord: z.boolean().default(false),
})

const meetingInputShape = {
  title: z.string().min(LIMITS.MEETING_TITLE_MIN_LENGTH).max(LIMITS.MEETING_TITLE_MAX_LENGTH),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  password: z
    .string()
    .min(LIMITS.MEETING_PASSWORD_MIN_LENGTH)
    .max(LIMITS.MEETING_PASSWORD_MAX_LENGTH)
    .optional(),
  inviteeIds: z.array(z.string().min(1)).max(LIMITS.INVITE_MAX_PER_REQUEST).default([]),
}

/** PATCH 只传部分字段时，两个时间都给了才校验先后 */
function hasValidTimeRange(value: { startAt?: string; endAt?: string }): boolean {
  if (value.startAt === undefined || value.endAt === undefined) {
    return true
  }
  return new Date(value.endAt).getTime() > new Date(value.startAt).getTime()
}

export const createMeetingSchema = z
  .object({
    ...meetingInputShape,
    // prefault 是输入侧默认：{} 会先补成完整对象，再走 settings 内层的四个 default
    settings: meetingSettingsSchema.prefault({}),
  })
  .refine(hasValidTimeRange, { message: '结束时间必须晚于开始时间', path: ['endAt'] })

// PATCH 不能复用 create 的形状再 .partial()：内层 default 仍会生效，
// 没传的 inviteeIds 会被补成 []，service 一写库就把已有受邀人清空
export const updateMeetingSchema = z
  .object({
    title: meetingInputShape.title.optional(),
    startAt: meetingInputShape.startAt.optional(),
    endAt: meetingInputShape.endAt.optional(),
    password: meetingInputShape.password,
    inviteeIds: z.array(z.string().min(1)).max(LIMITS.INVITE_MAX_PER_REQUEST).optional(),
    settings: meetingSettingsSchema.partial().optional(),
  })
  .refine(hasValidTimeRange, { message: '结束时间必须晚于开始时间', path: ['endAt'] })

/** POST /meetings/{id}:join 的密码校验；会议无密码时可以不传 */
export const joinMeetingSchema = z.object({
  password: z.string().min(1).optional(),
})

/** POST /meetings:joinAsGuest：客户端只传 meetingNo，roomName 由服务端生成 */
export const joinAsGuestSchema = z.object({
  meetingNo: meetingNoSchema,
  nickname: z.string().min(1).max(50),
  password: z.string().min(1).optional(),
})

/** POST /meetings/{id}:claimHost：6 位主持人密钥 */
export const claimHostSchema = z.object({
  hostKey: z.string().regex(/^\d{6}$/, '主持人密钥是 6 位数字'),
})

/** 列表筛选（06 §M4-2）：全部 / 我主持的 / 我参与的 / 即将开始 / 已结束 */
export const MEETING_SCOPE = {
  ALL: 'all',
  HOSTING: 'hosting',
  PARTICIPATING: 'participating',
  UPCOMING: 'upcoming',
  ENDED: 'ended',
} as const
export type MeetingScope = (typeof MEETING_SCOPE)[keyof typeof MEETING_SCOPE]

export const meetingScopeSchema = z.enum(MEETING_SCOPE)

export const listMeetingsQuerySchema = paginationQuerySchema.extend({
  scope: meetingScopeSchema.default('all'),
  status: meetingStatusSchema.optional(),
  keyword: z.string().trim().max(50).optional(),
})

/** 会议对外形状；密码与 hostKey 永不出现在这里 */
export const meetingSchema = z.object({
  id: z.string().min(1),
  meetingNo: meetingNoSchema,
  title: z.string(),
  hostId: z.string().min(1),
  status: meetingStatusSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema,
  timezone: z.string(),
  settings: meetingSettingsSchema,
  allowWaitingRoom: z.boolean(),
  locked: z.boolean(),
  actualStartAt: isoDateTimeSchema.nullable(),
  actualEndAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

/** 创建响应额外带一次性明文 hostKey（主持人密钥，之后只能重置） */
export const meetingCreatedSchema = meetingSchema.extend({
  hostKey: z.string().regex(/^\d{6}$/),
})

/** RTC 入会凭证；token 只在内存/网关流转，不落库（04 §6.3） */
export const rtcTokenSchema = z.object({
  token: z.string().min(1),
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema,
})

/** :join / :joinAsGuest 的返回 */
export const meetingJoinResultSchema = z.object({
  meetingId: z.string().min(1),
  roomName: z.string().min(1),
  rtc: rtcTokenSchema,
  participant: z.object({
    id: z.string().min(1),
    role: participantRoleSchema.nullable(),
    guestName: z.string().nullable(),
  }),
})
