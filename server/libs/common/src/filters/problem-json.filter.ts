import { randomUUID } from 'node:crypto'

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import { ZodError } from 'zod'

import { ApiError } from '../errors/api-error'
import {
  buildProblem,
  type ProblemDetails,
  PROBLEM_CONTENT_TYPE,
  statusCode,
  statusTitle,
} from '../errors/problem'

interface RequestLike {
  url?: string
  originalUrl?: string
  headers: Record<string, string | string[] | undefined>
}

interface ResponseLike {
  status(code: number): ResponseLike
  setHeader(name: string, value: string): void
  type(contentType: string): ResponseLike
  json(body: unknown): void
}

/**
 * 所有异常的唯一出口：HTTP 错误一律转成 `application/problem+json`（04 §4.5）。
 * 必须在 `NestFactory.create` 之后注册，见 `bootstrap`。
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemJsonFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<RequestLike>()
    const res = ctx.getResponse<ResponseLike>()
    const instance = req.originalUrl ?? req.url ?? ''
    const traceId = readTraceId(req.headers) ?? randomUUID()

    const problem = this.toProblem(exception, instance, traceId)
    res.setHeader('x-request-id', traceId)
    if (problem.status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      this.logger.error(`${problem.status} ${problem.code} ${instance} traceId=${traceId}`, stack)
    }
    res.status(problem.status).type(PROBLEM_CONTENT_TYPE).json(problem)
  }

  private toProblem(exception: unknown, instance: string, traceId: string): ProblemDetails {
    if (exception instanceof ApiError) {
      return buildProblem({
        status: exception.getStatus(),
        code: exception.code,
        title: exception.title,
        detail: exception.detail,
        instance,
        traceId,
      })
    }

    if (exception instanceof ZodError) {
      return buildProblem({
        status: 400,
        code: 10001,
        title: '请求参数不合法',
        detail: formatZodError(exception),
        instance,
        traceId,
      })
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return buildProblem({
        status,
        code: statusCode(status),
        title: statusTitle(status),
        detail: readHttpExceptionDetail(exception),
        instance,
        traceId,
      })
    }

    return buildProblem({
      status: 500,
      code: 90000,
      title: '服务器内部错误',
      instance,
      traceId,
    })
  }
}

function readTraceId(headers: RequestLike['headers']): string | undefined {
  const raw = headers['x-request-id'] ?? headers['x-trace-id']
  if (Array.isArray(raw)) return raw[0]
  return raw
}

function readHttpExceptionDetail(exception: HttpException): string | undefined {
  const body: unknown = exception.getResponse()
  if (typeof body === 'string') return body
  if (body !== null && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    if (Array.isArray(message)) return message.map(String).join('; ')
    if (typeof message === 'string') return message
  }
  return undefined
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('; ')
}
