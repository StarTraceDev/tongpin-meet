import { Injectable, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * zod 校验管道：DTO 由 `createZodDto` 生成后自带静态 `schema`，
 * 这里只看 metatype 上有没有合法的 zod schema，有就 parse，没有就放行。
 * 校验失败抛 ZodError，由 `ProblemJsonFilter` 转成 400 / 10001。
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown, metadata: { metatype?: unknown }): unknown {
    const schema = this.schema ?? resolveSchema(metadata.metatype)
    if (schema === undefined) return value

    const result = schema.safeParse(value)
    if (!result.success) throw result.error
    return result.data
  }
}

function resolveSchema(metatype: unknown): ZodType | undefined {
  if (typeof metatype !== 'function') return undefined
  const candidate = (metatype as { schema?: unknown }).schema
  return isZodType(candidate) ? candidate : undefined
}

function isZodType(value: unknown): value is ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { safeParse?: unknown }).safeParse === 'function'
  )
}
