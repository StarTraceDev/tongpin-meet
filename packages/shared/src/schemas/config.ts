import { z } from 'zod'

/** 配置键：小写字母开头，允许数字、下划线、点与短横线，最长 64 */
export const configKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_.-]*$/, '配置键需以小写字母开头，只能含小写字母、数字、_ . -')

export const configItemSchema = z.object({
  key: configKeySchema,
  value: z.unknown(),
  description: z.string().nullable(),
  updatedById: z.string().nullable(),
  updatedByName: z.string().nullable(),
  updatedAt: z.string(),
})

export const configListSchema = z.object({ items: z.array(configItemSchema) })

export const configCreateSchema = z.object({
  key: configKeySchema,
  value: z.unknown(),
  description: z.string().trim().max(200).nullish(),
})

export const configUpdateSchema = z.object({
  value: z.unknown().optional(),
  description: z.string().trim().max(200).nullish(),
})

export const configActionSchema = z.object({ config: configItemSchema })

export const featureFlagItemSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  rolloutPct: z.int().min(0).max(100),
  payload: z.unknown().nullable(),
  updatedAt: z.string(),
})

export const featureFlagListSchema = z.object({ items: z.array(featureFlagItemSchema) })

export const featureFlagUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPct: z.int().min(0).max(100).optional(),
  description: z.string().trim().max(200).nullish(),
  payload: z.unknown().nullish(),
})

export const featureFlagActionSchema = z.object({ flag: featureFlagItemSchema })
