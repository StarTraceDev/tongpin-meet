/**
 * 全部从 zod schema 推导（04 §4.1），不手写两遍类型。
 * 前端不许自己写 interface 描述接口返回，一律从这里取。
 */
import type { z } from 'zod'

import type { auditLogItemSchema, auditLogListSchema, auditLogQuerySchema } from '../schemas/audit'
import type {
  announcementActionSchema,
  announcementCreateSchema,
  announcementItemSchema,
  announcementListSchema,
  announcementQuerySchema,
  announcementUpdateSchema,
} from '../schemas/announcement'
import type {
  feedbackActionSchema,
  feedbackCategorySchema,
  feedbackCreateSchema,
  feedbackItemSchema,
  feedbackListSchema,
  feedbackQuerySchema,
  feedbackUpdateSchema,
} from '../schemas/feedback'
import type { costDaySchema, costsSchema, costTotalsSchema } from '../schemas/costs'
import type { hostMetricsSchema } from '../schemas/metrics'

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
  deptCreateSchema,
  deptUpdateSchema,
  permissionListSchema,
  roleActionSchema,
  roleCreateSchema,
  roleItemSchema,
  roleListSchema,
  roleUpdateSchema,
} from '../schemas/org'
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
import type {
  configActionSchema,
  configCreateSchema,
  configItemSchema,
  configListSchema,
  configUpdateSchema,
  featureFlagActionSchema,
  featureFlagItemSchema,
  featureFlagListSchema,
  featureFlagUpdateSchema,
} from '../schemas/config'
import type {
  alertRuleActionSchema,
  alertRuleCreateSchema,
  alertRuleItemSchema,
  alertRuleListSchema,
  alertRuleUpdateSchema,
} from '../schemas/alert'
import type {
  aiProviderActionSchema,
  aiProviderCreateSchema,
  aiProviderItemSchema,
  aiProviderListSchema,
  aiProviderUpdateSchema,
  aiRouteActionSchema,
  aiRouteCreateSchema,
  aiRouteItemSchema,
  aiRouteListSchema,
  aiRouteUpdateSchema,
  aiUsageItemSchema,
  aiUsageListSchema,
  aiUsageQuerySchema,
  aiUsageTotalsSchema,
} from '../schemas/ai'
import type {
  smsLogItemSchema,
  smsLogListSchema,
  smsLogsQuerySchema,
  smsProviderActionSchema,
  smsProviderCreateSchema,
  smsProviderItemSchema,
  smsProviderListSchema,
  smsProviderUpdateSchema,
  smsTemplateActionSchema,
  smsTemplateCreateSchema,
  smsTemplateItemSchema,
  smsTemplateListSchema,
  smsTemplateUpdateSchema,
} from '../schemas/sms'
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
export type HostMetrics = z.infer<typeof hostMetricsSchema>
export type CostDay = z.infer<typeof costDaySchema>
export type CostTotals = z.infer<typeof costTotalsSchema>
export type Costs = z.infer<typeof costsSchema>
export type AuditLogItem = z.infer<typeof auditLogItemSchema>
export type AuditLogList = z.infer<typeof auditLogListSchema>
export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>
export type FeedbackItem = z.infer<typeof feedbackItemSchema>
export type FeedbackList = z.infer<typeof feedbackListSchema>
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>
export type FeedbackCreateInput = z.input<typeof feedbackCreateSchema>
export type FeedbackUpdateInput = z.input<typeof feedbackUpdateSchema>
export type FeedbackAction = z.infer<typeof feedbackActionSchema>
export type AnnouncementItem = z.infer<typeof announcementItemSchema>
export type AnnouncementList = z.infer<typeof announcementListSchema>
export type AnnouncementQuery = z.infer<typeof announcementQuerySchema>
export type AnnouncementCreateInput = z.input<typeof announcementCreateSchema>
export type AnnouncementUpdateInput = z.input<typeof announcementUpdateSchema>
export type AnnouncementAction = z.infer<typeof announcementActionSchema>
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>
export type DeptCreateInput = z.infer<typeof deptCreateSchema>
export type DeptUpdateInput = z.infer<typeof deptUpdateSchema>
export type RoleItem = z.infer<typeof roleItemSchema>
export type RoleList = z.infer<typeof roleListSchema>
export type RoleCreateInput = z.input<typeof roleCreateSchema>
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>
export type RoleAction = z.infer<typeof roleActionSchema>
export type PermissionList = z.infer<typeof permissionListSchema>
export type SmsProviderItem = z.infer<typeof smsProviderItemSchema>
export type SmsProviderList = z.infer<typeof smsProviderListSchema>
export type SmsProviderCreateInput = z.input<typeof smsProviderCreateSchema>
export type SmsProviderUpdateInput = z.infer<typeof smsProviderUpdateSchema>
export type SmsProviderAction = z.infer<typeof smsProviderActionSchema>
export type SmsTemplateItem = z.infer<typeof smsTemplateItemSchema>
export type SmsTemplateList = z.infer<typeof smsTemplateListSchema>
export type SmsTemplateCreateInput = z.input<typeof smsTemplateCreateSchema>
export type SmsTemplateUpdateInput = z.infer<typeof smsTemplateUpdateSchema>
export type SmsTemplateAction = z.infer<typeof smsTemplateActionSchema>
export type SmsLogItem = z.infer<typeof smsLogItemSchema>
export type SmsLogList = z.infer<typeof smsLogListSchema>
export type SmsLogsQuery = z.infer<typeof smsLogsQuerySchema>
export type AiProviderItem = z.infer<typeof aiProviderItemSchema>
export type AiProviderList = z.infer<typeof aiProviderListSchema>
export type AiProviderCreateInput = z.input<typeof aiProviderCreateSchema>
export type AiProviderUpdateInput = z.infer<typeof aiProviderUpdateSchema>
export type AiProviderAction = z.infer<typeof aiProviderActionSchema>
export type AiRouteItem = z.infer<typeof aiRouteItemSchema>
export type AiRouteList = z.infer<typeof aiRouteListSchema>
export type AiRouteCreateInput = z.input<typeof aiRouteCreateSchema>
export type AiRouteUpdateInput = z.infer<typeof aiRouteUpdateSchema>
export type AiRouteAction = z.infer<typeof aiRouteActionSchema>
export type AiUsageItem = z.infer<typeof aiUsageItemSchema>
export type AiUsageQuery = z.infer<typeof aiUsageQuerySchema>
export type AiUsageTotals = z.infer<typeof aiUsageTotalsSchema>
export type AiUsageList = z.infer<typeof aiUsageListSchema>
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

export type ConfigItem = z.infer<typeof configItemSchema>
export type ConfigList = z.infer<typeof configListSchema>
export type ConfigCreateInput = z.infer<typeof configCreateSchema>
export type ConfigUpdateInput = z.infer<typeof configUpdateSchema>
export type ConfigAction = z.infer<typeof configActionSchema>
export type FeatureFlagItem = z.infer<typeof featureFlagItemSchema>
export type FeatureFlagList = z.infer<typeof featureFlagListSchema>
export type FeatureFlagUpdateInput = z.infer<typeof featureFlagUpdateSchema>
export type FeatureFlagAction = z.infer<typeof featureFlagActionSchema>

export type AlertRuleItem = z.infer<typeof alertRuleItemSchema>
export type AlertRuleList = z.infer<typeof alertRuleListSchema>
export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>
export type AlertRuleUpdateInput = z.infer<typeof alertRuleUpdateSchema>
export type AlertRuleAction = z.infer<typeof alertRuleActionSchema>
