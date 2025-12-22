import { z } from 'zod'

import { isoDateTimeSchema, paginatedSchema, paginationQuerySchema } from './common'

/** 04 §6.8 管理台的短信配置（06 §11.8）；密钥只写不读，返回掩码 */
export const smsProviderItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  endpoint: z.string().nullable(),
  accessKeyId: z.string().min(1),
  secretMasked: z.string().min(1),
  signName: z.string().min(1),
  templateCode: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: isoDateTimeSchema,
})

export const smsProviderListSchema = z.object({
  items: z.array(smsProviderItemSchema),
})

export const smsProviderCreateSchema = z.object({
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
  name: z.string().trim().min(1, '请填写服务商名称').max(30, '服务商名称最多 30 字'),
  endpoint: z.url('请填写合法的接口地址').optional(),
  accessKeyId: z.string().trim().min(1, '请填写 AccessKey ID').max(100),
  secret: z.string().trim().min(1, '请填写 AccessKey Secret').max(200),
  signName: z.string().trim().min(1, '请填写短信签名').max(30),
  templateCode: z.string().trim().max(60).optional(),
  enabled: z.boolean().default(true),
})

export const smsProviderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  endpoint: z.url().nullable().optional(),
  accessKeyId: z.string().trim().min(1).max(100).optional(),
  secret: z.string().trim().min(1).max(200).optional(),
  signName: z.string().trim().min(1).max(30).optional(),
  templateCode: z.string().trim().max(60).nullable().optional(),
  enabled: z.boolean().optional(),
})

export const smsProviderActionSchema = z.object({
  provider: smsProviderItemSchema,
})

export const smsTemplateItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  content: z.string().min(1),
  providerId: z.string().nullable(),
  providerName: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: isoDateTimeSchema,
})

export const smsTemplateListSchema = z.object({
  items: z.array(smsTemplateItemSchema),
})

export const smsTemplateCreateSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(1, '请填写模板名称').max(30),
  content: z.string().trim().min(1, '请填写模板内容').max(500),
  providerId: z.string().min(1).nullable().optional(),
  enabled: z.boolean().default(true),
})

export const smsTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  content: z.string().trim().min(1).max(500).optional(),
  providerId: z.string().min(1).nullable().optional(),
  enabled: z.boolean().optional(),
})

export const smsTemplateActionSchema = z.object({
  template: smsTemplateItemSchema,
})

export const smsLogStatusSchema = z.enum(['SENT', 'FAILED'])

export const smsLogItemSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(1),
  template: z.string().min(1),
  providerName: z.string().nullable(),
  status: smsLogStatusSchema,
  error: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})

export const smsLogsQuerySchema = paginationQuerySchema.extend({
  phone: z.string().trim().max(20).optional(),
  status: smsLogStatusSchema.optional(),
})

export const smsLogListSchema = paginatedSchema(smsLogItemSchema)
