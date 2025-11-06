import { type ArgumentsHost, Logger, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { ZodError } from 'zod'

import { ApiError } from '../errors/api-error'
import { PROBLEM_CONTENT_TYPE } from '../errors/problem'
import { ProblemJsonFilter } from './problem-json.filter'

interface CapturedResponse {
  statusCode: number
  headers: Record<string, string>
  body: unknown
}

function createHost(headers: Record<string, string> = {}): {
  host: ArgumentsHost
  response: CapturedResponse
} {
  const response: CapturedResponse & {
    status(code: number): unknown
    setHeader(name: string, value: string): void
    type(value: string): unknown
    json(body: unknown): void
  } = {
    statusCode: 0,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    type(value) {
      this.headers['content-type'] = value
      return this
    },
    json(body) {
      this.body = body
    },
  }

  const request = {
    url: '/api/v1/meetings/abc:join',
    originalUrl: '/api/v1/meetings/abc:join',
    headers,
  }

  const host = {
    switchToHttp: (): { getRequest: () => unknown; getResponse: () => unknown } => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost

  return { host, response }
}

describe('ProblemJsonFilter', () => {
  beforeEach(() => {
    Logger.overrideLogger(false)
  })

  it('把 ApiError 的业务码原样写进 problem+json', () => {
    const { host, response } = createHost()
    new ProblemJsonFilter().catch(
      new ApiError(30402, '会议已结束', 409, '该会议已于 2026-11-04 15:00 结束'),
      host,
    )

    expect(response.statusCode).toBe(409)
    expect(response.headers['content-type']).toBe(PROBLEM_CONTENT_TYPE)
    expect(response.body).toMatchObject({
      type: 'https://tongpin.dev/errors/30402',
      title: '会议已结束',
      status: 409,
      code: 30402,
      detail: '该会议已于 2026-11-04 15:00 结束',
      instance: '/api/v1/meetings/abc:join',
    })
    expect((response.body as { traceId: string }).traceId).toMatch(/[0-9a-f-]{16,}/)
  })

  it('ZodError 转 400 / 10001，并把每个字段的错拼进 detail', () => {
    const result = z.object({ title: z.string().min(1) }).safeParse({ title: '' })
    expect(result.success).toBe(false)
    const { host, response } = createHost()
    new ProblemJsonFilter().catch(result.error as ZodError, host)

    expect(response.statusCode).toBe(400)
    expect(response.body).toMatchObject({ status: 400, code: 10001, title: '请求参数不合法' })
    expect((response.body as { detail: string }).detail).toContain('title:')
  })

  it('框架 HttpException 用通用段错误码，detail 保留 message', () => {
    const { host, response } = createHost()
    new ProblemJsonFilter().catch(new NotFoundException('会议不存在'), host)

    expect(response.statusCode).toBe(404)
    expect(response.body).toMatchObject({ code: 10000, detail: '会议不存在' })
  })

  it('未知异常一律 500 / 90000，不把内部信息泄露给调用方', () => {
    const { host, response } = createHost()
    new ProblemJsonFilter().catch(new Error('boom: password=hunter2'), host)

    expect(response.statusCode).toBe(500)
    expect(response.body).toMatchObject({ code: 90000, title: '服务器内部错误' })
    expect((response.body as { detail?: string }).detail).toBeUndefined()
    expect(JSON.stringify(response.body)).not.toContain('hunter2')
  })

  it('沿用上游 x-request-id，并回写到响应头', () => {
    const { host, response } = createHost({ 'x-request-id': 'trace-from-gateway' })
    new ProblemJsonFilter().catch(new ApiError(30402, '会议已结束', 409), host)

    expect((response.body as { traceId: string }).traceId).toBe('trace-from-gateway')
    expect(response.headers['x-request-id']).toBe('trace-from-gateway')
  })
})
