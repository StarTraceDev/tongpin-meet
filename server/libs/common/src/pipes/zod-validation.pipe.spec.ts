import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ZodValidationPipe } from './zod-validation.pipe'

class CreateThingDto {
  static readonly schema = z.object({ title: z.string().min(1) })
}

describe('ZodValidationPipe', () => {
  it('按 metatype 上的 schema 校验并剔除多余字段', () => {
    const pipe = new ZodValidationPipe()
    const parsed = pipe.transform(
      { title: '周会', extra: 'should-be-stripped' },
      { metatype: CreateThingDto },
    )

    expect(parsed).toEqual({ title: '周会' })
  })

  it('校验失败抛 ZodError，交给 ProblemJsonFilter 转 400', () => {
    const pipe = new ZodValidationPipe()
    expect(() => pipe.transform({ title: '' }, { metatype: CreateThingDto })).toThrowError(
      z.ZodError,
    )
  })

  it('metatype 没有 schema 时原样放行（健康检查这类无入参接口）', () => {
    const pipe = new ZodValidationPipe()
    const value = { anything: true }

    expect(pipe.transform(value, { metatype: undefined })).toBe(value)
    expect(pipe.transform(value, { metatype: String })).toBe(value)
  })

  it('显式传入 schema 时优先用它', () => {
    const pipe = new ZodValidationPipe(z.object({ id: z.string().regex(/^\d+$/) }))

    expect(pipe.transform({ id: '123' }, {})).toEqual({ id: '123' })
    expect(() => pipe.transform({ id: 'abc' }, {})).toThrowError(z.ZodError)
  })
})
