/**
 * 全部状态 / 角色 / 类型的取值，前后端共用这一份。
 * 02 §2.5-4：不用 enum，用 as const 对象 + typeof 取联合类型。
 */

export const MEETING_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ONGOING: 'ONGOING',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const
export type MeetingStatus = (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS]

export const PARTICIPANT_ROLE = {
  HOST: 'HOST',
  COHOST: 'COHOST',
  ATTENDEE: 'ATTENDEE',
  GUEST: 'GUEST',
} as const
export type ParticipantRole = (typeof PARTICIPANT_ROLE)[keyof typeof PARTICIPANT_ROLE]

/** 后台账号角色，四级；GUEST 只是会议内角色，没有账号（03 §5.6） */
export const ACCOUNT_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
} as const
export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE]

/** 文档只给了默认值 ACTIVE；DISABLED 对应后台的「禁用 / 批量禁用」 */
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export const VOTE_STATUS = {
  DRAFT: 'DRAFT',
  ONGOING: 'ONGOING',
  CLOSED: 'CLOSED',
  PUBLISHED: 'PUBLISHED',
} as const
export type VoteStatus = (typeof VOTE_STATUS)[keyof typeof VOTE_STATUS]

/** 签到与休息共用：单向，关闭后不可重开（03 §5.4） */
export const INTERACTION_STATUS = {
  ONGOING: 'ONGOING',
  CLOSED: 'CLOSED',
} as const
export type InteractionStatus = (typeof INTERACTION_STATUS)[keyof typeof INTERACTION_STATUS]

export const FEEDBACK_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const
export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS]

export const RECORDING_STATUS = {
  REQUESTED: 'REQUESTED',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const
export type RecordingStatus = (typeof RECORDING_STATUS)[keyof typeof RECORDING_STATUS]

export const WAITING_STATUS = {
  PENDING: 'PENDING',
  ADMITTED: 'ADMITTED',
  DENIED: 'DENIED',
} as const
export type WaitingStatus = (typeof WAITING_STATUS)[keyof typeof WAITING_STATUS]

export const NOTIFICATION_TYPE = {
  MEETING_INVITE: 'MEETING_INVITE',
  MEETING_START: 'MEETING_START',
  SYSTEM: 'SYSTEM',
  FEEDBACK_REPLY: 'FEEDBACK_REPLY',
} as const
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

/** 设备码 / 扫码登录会话状态（04 §6.1） */
export const QR_SESSION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CONSUMED: 'CONSUMED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const
export type QrSessionStatus = (typeof QR_SESSION_STATUS)[keyof typeof QR_SESSION_STATUS]
