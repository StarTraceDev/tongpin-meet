import { z } from 'zod'

import { FEEDBACK_STATUS } from '../constants/enums'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

/** 03 §5.4 反馈状态机；与 FEEDBACK_TRANSITIONS 对齐 */
export const feedbackStatusSchema = z.enum([
  FEEDBACK_STATUS.PENDING,
  FEEDBACK_STATUS.PROCESSING,
  FEEDBACK_STATUS.RESOLVED,
  FEEDBACK_STATUS.REJECTED,
])

export const feedbackCategorySchema = z.enum(['SUGGESTION', 'COMPLAINT', 'ISSUE', 'OTHER'])
export const feedbackSourceSchema = z.enum(['ADMIN', 'USER'])

export const feedbackItemSchema = z.object({
  id: z.string(),
  category: feedbackCategorySchema,
  content: z.string(),
  contact: z.string().nullable(),
  status: feedbackStatusSchema,
  source: feedbackSourceSchema,
  reporterId: z.string().nullable(),
  reporterName: z.string().nullable(),
  handledBy: z.string().nullable(),
  handledName: z.string().nullable(),
  reply: z.string().nullable(),
  handledAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

export const feedbackListSchema = paginatedSchema(feedbackItemSchema)

export const feedbackQuerySchema = paginationQuerySchema.extend({
  status: feedbackStatusSchema.optional(),
  category: feedbackCategorySchema.optional(),
  keyword: z.string().trim().max(100).optional(),
})

export const feedbackCreateSchema = z.object({
  category: feedbackCategorySchema.default('OTHER'),
  content: z.string().trim().min(1).max(2000),
  contact: z.string().trim().max(100).nullable().optional(),
})

export const feedbackUpdateSchema = z.object({
  status: feedbackStatusSchema,
  reply: z.string().trim().max(1000).nullable().optional(),
})

export const feedbackActionSchema = z.object({ feedback: feedbackItemSchema })
