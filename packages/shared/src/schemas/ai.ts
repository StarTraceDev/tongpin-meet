import { z } from 'zod'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

/** 04 §6.8 管理台的 AI 配置（06 §11.9）；密钥只写不读，返回掩码 */
export const aiProviderItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().min(1),
  model: z.string().min(1),
  apiKeyMasked: z.string().min(1),
  enabled: z.boolean(),
  createdAt: isoDateTimeSchema,
})

export const aiProviderListSchema = z.object({
  items: z.array(aiProviderItemSchema),
})

export const aiProviderCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .transform((value) => value.toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-Z][A-Z0-9_]{1,31}$/, '服务商编码只能用大写字母、数字和下划线，且以字母开头'),
    ),
  name: z.string().trim().min(1, '请填写服务商名称').max(30),
  baseUrl: z.url('请填写合法的接口地址'),
  model: z.string().trim().min(1, '请填写默认模型').max(80),
  apiKey: z.string().trim().min(1, '请填写 API Key').max(200),
  enabled: z.boolean().default(true),
})

export const aiProviderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  baseUrl: z.url().optional(),
  model: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
})

export const aiProviderActionSchema = z.object({
  provider: aiProviderItemSchema,
})

export const aiRouteItemSchema = z.object({
  id: z.string().min(1),
  scene: z.string().min(1),
  providerId: z.string().nullable(),
  providerName: z.string().nullable(),
  modelOverride: z.string().nullable(),
  enabled: z.boolean(),
})

export const aiRouteListSchema = z.object({
  items: z.array(aiRouteItemSchema),
})

export const aiRouteCreateSchema = z.object({
  scene: z
    .string()
    .trim()
    .min(1, '请填写场景')
    .max(40)
    .regex(/^[a-z][a-z0-9_-]*$/, '场景用小写字母、数字、下划线或中划线'),
  providerId: z.string().min(1).nullable().optional(),
  modelOverride: z.string().trim().max(80).nullable().optional(),
  enabled: z.boolean().default(true),
})

export const aiRouteUpdateSchema = z.object({
  providerId: z.string().min(1).nullable().optional(),
  modelOverride: z.string().trim().max(80).nullable().optional(),
  enabled: z.boolean().optional(),
})

export const aiRouteActionSchema = z.object({
  route: aiRouteItemSchema,
})

export const aiUsageItemSchema = z.object({
  id: z.string().min(1),
  scene: z.string().min(1),
  providerName: z.string().nullable(),
  promptTokens: z.int().nonnegative(),
  completionTokens: z.int().nonnegative(),
  costCents: z.int().nonnegative(),
  createdAt: isoDateTimeSchema,
})

export const aiUsageQuerySchema = paginationQuerySchema.extend({
  scene: z.string().trim().max(40).optional(),
})

export const aiUsageTotalsSchema = z.object({
  calls: z.int().nonnegative(),
  promptTokens: z.int().nonnegative(),
  completionTokens: z.int().nonnegative(),
  costCents: z.int().nonnegative(),
})

export const aiUsageListSchema = paginatedSchema(aiUsageItemSchema).extend({
  totals: aiUsageTotalsSchema,
})
