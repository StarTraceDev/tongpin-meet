/**
 * 统一错误响应（04 §4.5）：失败一律 `application/problem+json`，不套 `{ code, msg, data }` 信封。
 * 字段固定为 type / title / status / code / detail / instance / traceId。
 */
export interface ProblemDetails {
  /** 形如 https://tongpin.dev/errors/30402，code 是唯一稳定标识 */
  type: string
  title: string
  status: number
  code: number
  detail?: string
  instance: string
  traceId: string
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json'

/** 文档里点名的三处错误码，其余由 ApiError 显式给出 */
export const DOCUMENTED_CODES = {
  ACCESS_EXPIRED: 20101,
  REFRESH_EXPIRED: 20102,
  MEETING_ENDED: 30402,
} as const

const GENERIC_CODE = 10000
const INTERNAL_CODE = 90000

const STATUS_TITLES: Record<number, string> = {
  400: '请求参数不合法',
  401: '登录状态失效',
  403: '没有访问权限',
  404: '资源不存在',
  405: '请求方法不允许',
  409: '资源状态冲突',
  413: '请求体过大',
  415: '不支持的媒体类型',
  429: '请求过于频繁',
  500: '服务器内部错误',
  502: '上游服务不可用',
  503: '服务暂不可用',
}

export function problemType(code: number): string {
  return `https://tongpin.dev/errors/${code}`
}

export function statusTitle(status: number): string {
  return STATUS_TITLES[status] ?? (status >= 500 ? '服务器内部错误' : '请求失败')
}

/** 没显式带业务码时：5xx 落 90xxx，其余落 10xxx 通用段（04 §4.5 的分段约定） */
export function statusCode(status: number): number {
  if (status >= 500) return INTERNAL_CODE
  if (status === 401) return DOCUMENTED_CODES.ACCESS_EXPIRED
  return GENERIC_CODE
}

export function buildProblem(input: {
  status: number
  code: number
  title: string
  detail?: string
  instance: string
  traceId: string
}): ProblemDetails {
  return {
    type: problemType(input.code),
    title: input.title,
    status: input.status,
    code: input.code,
    ...(input.detail === undefined ? {} : { detail: input.detail }),
    instance: input.instance,
    traceId: input.traceId,
  }
}
