import { z } from 'zod'

/**
 * 04 §4.1 的公共 schema 原件。
 * zod v4：带 offset 的 ISO 8601 用 z.iso.datetime({ offset: true })，z.string().datetime() 已废弃。
 */
export const isoDateTimeSchema = z.iso.datetime({ offset: true })

export const idSchema = z.string().min(1)

/** 会议号：9 位数字，对外可见（03 §5.3） */
export const meetingNoSchema = z.string().regex(/^\d{9}$/, '会议号是 9 位数字')

export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确')

/** 06 §M1-1.3：?page=1&pageSize=20&sort=-startAt */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^-?[a-zA-Z][a-zA-Z0-9_]*$/, '排序格式为 field 或 -field')
    .optional(),
})

export const problemSchema = z.object({
  type: z.url(),
  title: z.string().min(1),
  status: z.int().min(400).max(599),
  code: z.int().min(10000).max(99999),
  detail: z.string().optional(),
  instance: z.string().optional(),
  traceId: z.string().min(1),
})

/** 分页返回体：{ items, total, page, pageSize } */
export function paginatedSchema<T extends z.ZodType>(
  item: T,
): z.ZodObject<{
  items: z.ZodArray<T>
  total: z.ZodNumber
  page: z.ZodNumber
  pageSize: z.ZodNumber
}> {
  return z.object({
    items: z.array(item),
    total: z.int().nonnegative(),
    page: z.int().min(1),
    pageSize: z.int().min(1),
  })
}
