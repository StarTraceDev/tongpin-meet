import { z } from 'zod'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

export const announcementStatusSchema = z.enum(['SCHEDULED', 'PUBLISHED', 'EXPIRED'])

export const announcementItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  pinned: z.boolean(),
  publishAt: isoDateTimeSchema,
  expireAt: isoDateTimeSchema.nullable(),
  status: announcementStatusSchema,
  createdBy: z.string(),
  createdByName: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})

export const announcementListSchema = paginatedSchema(announcementItemSchema)

export const announcementQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(100).optional(),
})

export const announcementCreateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(5000),
  pinned: z.boolean().default(false),
  publishAt: isoDateTimeSchema,
  expireAt: isoDateTimeSchema.nullable().optional(),
})

export const announcementUpdateSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
  publishAt: isoDateTimeSchema.optional(),
  expireAt: isoDateTimeSchema.nullable().optional(),
})

export const announcementActionSchema = z.object({ announcement: announcementItemSchema })
