/**
 * 全部从 zod schema 推导（04 §4.1），不手写两遍类型。
 * 前端不许自己写 interface 描述接口返回，一律从这里取。
 */
import type { z } from 'zod'

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
  checkinResultSchema,
  checkinSchema,
  createCheckinSchema,
  createVoteSchema,
  interactionStatusSchema,
  submitVoteSchema,
  updateVoteSchema,
  voteQuestionSchema,
  voteResultsSchema,
  voteSchema,
  voteStatusSchema,
  voteSubmissionResultSchema,
} from '../schemas/interaction'
import type { wsEnvelopeSchema, wsTicketSchema } from '../schemas/ws'

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
