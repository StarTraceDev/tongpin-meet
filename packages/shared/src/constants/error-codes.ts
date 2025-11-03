/**
 * 04 §4.5 的错误码分段与已知码。
 * 目前文档只点名了三个具体码，其余在各自模块落地时按分段追加，不要提前占号。
 */
export const ERROR_CODE_RANGES = {
  COMMON: [10000, 19999],
  AUTH: [20000, 29999],
  MEETING: [30000, 39999],
  RTC: [40000, 49999],
  ORG: [50000, 59999],
  FILE: [60000, 69999],
  FEEDBACK: [70000, 79999],
  SYSTEM: [90000, 99999],
} as const

export type ErrorCodeDomain = keyof typeof ERROR_CODE_RANGES

export const ERROR_CODES = {
  /** 401：access 失效，前端单飞刷新后重放 */
  ACCESS_EXPIRED: 20101,
  /** 401：refresh 失效，前端立即登出，不重试 */
  REFRESH_EXPIRED: 20102,
  /** 409：会议已结束 */
  MEETING_ENDED: 30402,
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** 码属于哪一段；落在分段之外返回 undefined（说明码写错了） */
export function errorCodeDomain(code: number): ErrorCodeDomain | undefined {
  for (const [domain, [min, max]] of Object.entries(ERROR_CODE_RANGES)) {
    if (code >= min && code <= max) {
      // Object.entries 把键 widen 成 string，这里按映射表收窄回去
      return domain as ErrorCodeDomain
    }
  }
  return undefined
}
