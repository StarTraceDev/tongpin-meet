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

// ---------------------------------------------------------------------------
// 投票（03 §5.4：DRAFT → ONGOING → CLOSED → PUBLISHED；只有 ONGOING 收提交）
// ---------------------------------------------------------------------------

export const voteStatusSchema = z.enum(['DRAFT', 'ONGOING', 'CLOSED', 'PUBLISHED'])
export const voteQuestionTypeSchema = z.enum(['SINGLE', 'MULTI', 'RATING'])

export const voteOptionInputSchema = z.object({
  content: z.string().trim().min(1).max(120),
})

export const voteQuestionInputSchema = z.object({
  content: z.string().trim().min(1).max(200),
  type: voteQuestionTypeSchema.default('SINGLE'),
  options: z.array(voteOptionInputSchema).max(20).default([]),
})

export const createVoteSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    anonymous: z.boolean().default(false),
    questions: z.array(voteQuestionInputSchema).min(1).max(10),
  })
  .superRefine((value, ctx) => {
    value.questions.forEach((question, index) => {
      if (question.type === 'RATING') {
        if (question.options.length > 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['questions', index, 'options'],
            message: '评分题不需要选项',
          })
        }
        return
      }
      if (question.options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'options'],
          message: '单选/多选题至少两个选项',
        })
      }
    })
  })

export const updateVoteSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    anonymous: z.boolean().optional(),
    questions: z.array(voteQuestionInputSchema).min(1).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: '至少修改一项' })

export const voteAnswerSchema = z.object({
  questionId: idSchema,
  optionIds: z.array(idSchema).default([]),
  rating: z.int().min(1).max(5).optional(),
})

export const submitVoteSchema = z.object({
  answers: z.array(voteAnswerSchema).min(1),
})

export const voteOptionSchema = z.object({
  id: idSchema,
  index: z.int().min(1),
  content: z.string(),
})

export const voteQuestionSchema = z.object({
  id: idSchema,
  index: z.int().min(1),
  content: z.string(),
  type: voteQuestionTypeSchema,
  options: z.array(voteOptionSchema),
})

export const voteSchema = z.object({
  id: idSchema,
  meetingId: idSchema,
  title: z.string(),
  status: voteStatusSchema,
  anonymous: z.boolean(),
  createdById: idSchema,
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  closedAt: isoDateTimeSchema.nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  questions: z.array(voteQuestionSchema),
})

export const voteResultsSchema = z.object({
  voteId: idSchema,
  status: voteStatusSchema,
  totalRecords: z.int().nonnegative(),
  questions: z.array(
    z.object({
      questionId: idSchema,
      content: z.string(),
      type: voteQuestionTypeSchema,
      options: z.array(z.object({ optionId: idSchema, content: z.string(), count: z.int() })),
      ratingCounts: z.record(z.string(), z.int()),
    }),
  ),
})

export const voteSubmissionResultSchema = z.object({
  voteId: idSchema,
  submittedAt: isoDateTimeSchema,
  alreadySubmitted: z.boolean(),
})
