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
  /** 404：资源不存在（文档未点名，通用段兜底码） */
  COMMON_NOT_FOUND: 10000,
  /** 403：已登录但角色 / 权限不足（通用段自补，10001 留给参数校验） */
  COMMON_FORBIDDEN: 10003,
  /** 401：access 失效，前端单飞刷新后重放 */
  ACCESS_EXPIRED: 20101,
  /** 401：refresh 失效，前端立即登出，不重试 */
  REFRESH_EXPIRED: 20102,
  /** 401：手机号或密码错误（文档未点名，按 20xxx 段自补，见 PROGRESS §5） */
  AUTH_INVALID_CREDENTIALS: 20103,
  /** 403：账号已禁用 */
  AUTH_ACCOUNT_DISABLED: 20104,
  /** 429：短信验证码触发频控（文档未点名，按 20xxx 段自补） */
  AUTH_SMS_RATE_LIMITED: 20105,
  /** 409：会议已结束 */
  MEETING_ENDED: 30402,
  /** 409：签到 / 投票已关闭（单向终态，重开请新建） */
  INTERACTION_CLOSED: 30403,
  /** 409：投票当前状态不允许该操作（未开始 / 已截止 / 已公布） */
  VOTE_INVALID_STATE: 30404,
  /** 404：部门不存在（org 段自补） */
  ORG_DEPT_NOT_FOUND: 50003,
  /** 409：部门下还有子部门 / 成员，不能删除（org 段自补） */
  ORG_DEPT_NOT_EMPTY: 50004,
  /** 409：不能把部门挂到自己或自己的子部门下（org 段自补） */
  ORG_DEPT_CYCLE: 50005,
  /** 409：手机号已被其他账号使用（org 段自补） */
  ORG_PHONE_TAKEN: 50001,
  /** 409：角色编码已被占用（org 段自补） */
  ORG_ROLE_TAKEN: 50006,
  /** 409：内置角色不可删除 / 不可改权限（org 段自补） */
  ORG_ROLE_BUILTIN: 50007,
  /** 409：角色仍被用户使用（org 段自补） */
  ORG_ROLE_IN_USE: 50008,
  /** 400：引用的部门 / 角色不存在（org 段自补） */
  ORG_REFERENCE_MISSING: 50002,
  /** 409：同一用户重复投票 */
  VOTE_ALREADY_SUBMITTED: 30405,
  MINUTES_VERSION_CONFLICT: 30406,
  /** 409：文件上传状态或分片不完整 */
  FILE_UPLOAD_INVALID: 60001,
  /** 400：分片序号 / 大小不合法 */
  FILE_PART_INVALID: 60002,
  /** 410：下载链接过期 */
  FILE_DOWNLOAD_EXPIRED: 60003,
  /** 500：未配置 TONGPIN_CONFIG_KEY，无法加密短信密钥（system 段自补） */
  SYSTEM_SECRET_KEY_MISSING: 90001,
  /** 409：短信服务商编码已被占用（system 段自补） */
  SYSTEM_SMS_PROVIDER_TAKEN: 90002,
  /** 409：短信模板编码已被占用（system 段自补） */
  SYSTEM_SMS_TEMPLATE_TAKEN: 90003,
  /** 409：AI 服务商编码已被占用（system 段自补） */
  SYSTEM_AI_PROVIDER_TAKEN: 90004,
  /** 409：AI 场景路由已存在（system 段自补） */
  SYSTEM_AI_ROUTE_TAKEN: 90005,
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
