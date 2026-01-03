import { z } from 'zod'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

/** 06 §11.17 通用导出；资源名即路径里的 `{resource}` */
export const exportResourceSchema = z.enum(['meetings', 'users', 'audit-logs', 'feedbacks'])

export const exportStatusSchema = z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'])

export const exportResultSchema = z.object({
  fileName: z.string(),
  rowCount: z.int().nonnegative(),
  sizeBytes: z.int().nonnegative(),
  url: z.string(),
})

export const exportOperationItemSchema = z.object({
  id: z.string(),
  resource: exportResourceSchema,
  status: exportStatusSchema,
  progress: z.int().min(0).max(100),
  error: z.string().nullable(),
  result: exportResultSchema.nullable(),
  createdAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
})

export const exportOperationListSchema = paginatedSchema(exportOperationItemSchema)

export const exportOperationQuerySchema = paginationQuerySchema.extend({
  resource: exportResourceSchema.optional(),
})

export const exportOperationActionSchema = z.object({ operation: exportOperationItemSchema })
