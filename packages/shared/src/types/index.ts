/**
 * 全部从 zod schema 推导（04 §4.1），不手写两遍类型。
 * 前端不许自己写 interface 描述接口返回，一律从这里取。
 */
import type { z } from 'zod'

import type {
  adminMeetingActionSchema,
  adminRoleOptionListSchema,
  adminRoleOptionSchema,
  adminUserActionSchema,
  adminUserCreateSchema,
  adminUserItemSchema,
  adminUserListSchema,
  adminUserUpdateSchema,
  adminUsersQuerySchema,
  adminMeetingItemSchema,
  adminMeetingListSchema,
  adminMeetingsQuerySchema,
  adminRoomListSchema,
  adminRoomSchema,
  adminStatsOverviewSchema,
  adminTrendPointSchema,
  adminTrendSchema,
  adminUsageSchema,
  adminUsageSliceSchema,
} from '../schemas/admin'
import type {
  authSessionSchema,
  authUserSchema,
  loginByPasswordSchema,
  loginBySmsSchema,
  qrConfirmSchema,
  refreshSessionSchema,
  sendSmsSchema,
  sessionResponseSchema,
  sessionTokensSchema,
} from '../schemas/auth'
import type { paginationQuerySchema, problemSchema } from '../schemas/common'
import type { minutesSchema, updateMinutesSchema } from '../schemas/minutes'
import type {
  createUploadSchema,
  downloadUrlSchema,
  meetingFileSchema,
  uploadSessionSchema,
} from '../schemas/file'
import type { qrSessionSchema, qrPollSchema } from '../schemas/qr'
import type {
  listMeetingsQuerySchema,
  meetingCreatedSchema,
  meetingJoinResultSchema,
  meetingSchema,
  meetingWaitingSchema,
  transferHostSchema,
  waitingEntrySchema,
  rtcTokenSchema,
} from '../schemas/meeting'
import type {
  claimHostSchema,
  createMeetingSchema,
  joinAsGuestSchema,
  joinMeetingSchema,
  updateMeetingSchema,
} from '../schemas/meeting'
import type { mediaStateSchema } from '../schemas/participant'
import type {
  checkinOverviewSchema,
  checkinRecordSchema,
  breakOverviewSchema,
  breakRecordInputSchema,
  breakRecordResultSchema,
  breakRecordSchema,
  breakSchema,
  checkinResultSchema,
  checkinSchema,
  createBreakSchema,
  createCheckinSchema,
  createVoteSchema,
  interactionStatusSchema,
  submitVoteSchema,
  updateBreakSchema,
  updateVoteSchema,
  voteQuestionSchema,
  voteResultsSchema,
  voteSchema,
  voteStatusSchema,
  voteSubmissionResultSchema,
} from '../schemas/interaction'
import type { wsEnvelopeSchema, wsTicketSchema } from '../schemas/ws'

export type AdminStatsOverview = z.infer<typeof adminStatsOverviewSchema>
export type AdminTrendPoint = z.infer<typeof adminTrendPointSchema>
export type AdminTrend = z.infer<typeof adminTrendSchema>
export type AdminUsageSlice = z.infer<typeof adminUsageSliceSchema>
export type AdminUsage = z.infer<typeof adminUsageSchema>
export type AdminMeetingItem = z.infer<typeof adminMeetingItemSchema>
export type AdminMeetingList = z.infer<typeof adminMeetingListSchema>
export type AdminMeetingsQuery = z.infer<typeof adminMeetingsQuerySchema>
export type AdminMeetingAction = z.infer<typeof adminMeetingActionSchema>
export type AdminRoleOption = z.infer<typeof adminRoleOptionSchema>
export type AdminRoleOptionList = z.infer<typeof adminRoleOptionListSchema>
export type AdminUserItem = z.infer<typeof adminUserItemSchema>
export type AdminUserList = z.infer<typeof adminUserListSchema>
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
export type AdminUserAction = z.infer<typeof adminUserActionSchema>
export type AdminRoom = z.infer<typeof adminRoomSchema>
export type AdminRoomList = z.infer<typeof adminRoomListSchema>

export type LoginByPasswordInput = z.infer<typeof loginByPasswordSchema>
export type LoginBySmsInput = z.infer<typeof loginBySmsSchema>
export type SendSmsInput = z.infer<typeof sendSmsSchema>
export type QrConfirmInput = z.infer<typeof qrConfirmSchema>
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>
export type AuthUser = z.infer<typeof authUserSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type QrSession = z.infer<typeof qrSessionSchema>
export type QrPoll = z.infer<typeof qrPollSchema>
export type Meeting = z.infer<typeof meetingSchema>
export type MeetingStatusValue = Meeting['status']
export type MeetingCreated = z.infer<typeof meetingCreatedSchema>
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>
export type MeetingListScope = ListMeetingsQuery['scope']
export type RtcToken = z.infer<typeof rtcTokenSchema>
export type MeetingJoinResult = z.infer<typeof meetingJoinResultSchema>
export type MeetingWaiting = z.infer<typeof meetingWaitingSchema>
export type WaitingEntry = z.infer<typeof waitingEntrySchema>
export type TransferHostInput = z.infer<typeof transferHostSchema>
export type SessionTokens = z.infer<typeof sessionTokensSchema>
export type SessionResponse = z.infer<typeof sessionResponseSchema>

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type Problem = z.infer<typeof problemSchema>

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>
export type JoinAsGuestInput = z.infer<typeof joinAsGuestSchema>
export type ClaimHostInput = z.infer<typeof claimHostSchema>

export type MediaState = z.infer<typeof mediaStateSchema>
export type WsEnvelope = z.infer<typeof wsEnvelopeSchema>
export type WsTicket = z.infer<typeof wsTicketSchema>

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type CheckinStatus = z.infer<typeof interactionStatusSchema>
export type Checkin = z.infer<typeof checkinSchema>
export type CheckinRecord = z.infer<typeof checkinRecordSchema>
export type CheckinOverview = z.infer<typeof checkinOverviewSchema>
export type CheckinResult = z.infer<typeof checkinResultSchema>
export type CreateCheckinInput = z.infer<typeof createCheckinSchema>
export type VoteState = z.infer<typeof voteStatusSchema>
export type VoteOption = z.infer<typeof voteQuestionSchema>['options'][number]
export type VoteQuestion = z.infer<typeof voteQuestionSchema>
export type Vote = z.infer<typeof voteSchema>
export type VoteResults = z.infer<typeof voteResultsSchema>
export type VoteSubmissionResult = z.infer<typeof voteSubmissionResultSchema>
export type CreateVoteInput = z.infer<typeof createVoteSchema>
export type UpdateVoteInput = z.infer<typeof updateVoteSchema>
export type SubmitVoteInput = z.infer<typeof submitVoteSchema>
export type Break = z.infer<typeof breakSchema>
export type BreakRecord = z.infer<typeof breakRecordSchema>
export type BreakOverview = z.infer<typeof breakOverviewSchema>
export type BreakRecordResult = z.infer<typeof breakRecordResultSchema>
export type CreateBreakInput = z.infer<typeof createBreakSchema>
export type UpdateBreakInput = z.infer<typeof updateBreakSchema>
export type BreakRecordInput = z.infer<typeof breakRecordInputSchema>
export type MeetingFile = z.infer<typeof meetingFileSchema>
export type UploadSession = z.infer<typeof uploadSessionSchema>
export type DownloadUrl = z.infer<typeof downloadUrlSchema>
export type CreateUploadInput = z.infer<typeof createUploadSchema>
export type Minutes = z.infer<typeof minutesSchema>
export type UpdateMinutesInput = z.infer<typeof updateMinutesSchema>
