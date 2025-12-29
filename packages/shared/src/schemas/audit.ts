import { z } from 'zod'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

/** 04 §6.8 `GET /admin/audit-logs`：只读，不提供写入 */
export const auditLogItemSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorName: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  detail: z.unknown(),
  ip: z.string().nullable(),
  ua: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})

export const auditLogListSchema = paginatedSchema(auditLogItemSchema)

export const auditLogQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().max(100).optional(),
  actorId: z.string().trim().max(64).optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
})
