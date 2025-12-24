import { z } from 'zod'

export const alertMetricSchema = z.enum(['cpu', 'memory', 'connections', 'storage', 'errorRate'])
export const alertComparatorSchema = z.enum(['GT', 'LT'])
export const alertChannelSchema = z.enum(['INBOX', 'SMS', 'EMAIL', 'WEBHOOK'])

export const alertRuleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: alertMetricSchema,
  comparator: alertComparatorSchema,
  threshold: z.int().min(0).max(100000),
  channel: alertChannelSchema,
  target: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const alertRuleListSchema = z.object({ items: z.array(alertRuleItemSchema) })

export const alertRuleCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  metric: alertMetricSchema,
  comparator: alertComparatorSchema,
  threshold: z.int().min(0).max(100000),
  channel: alertChannelSchema,
  target: z.string().trim().max(200).nullish(),
  enabled: z.boolean().default(true),
})

export const alertRuleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  metric: alertMetricSchema.optional(),
  comparator: alertComparatorSchema.optional(),
  threshold: z.int().min(0).max(100000).optional(),
  channel: alertChannelSchema.optional(),
  target: z.string().trim().max(200).nullish(),
  enabled: z.boolean().optional(),
})

export const alertRuleActionSchema = z.object({ rule: alertRuleItemSchema })
