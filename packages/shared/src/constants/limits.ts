/**
 * 03 §5.5 的限制值与配额，前后端共用。
 * 前端拿它做输入框 max，后端拿它做 zod .max()，两边不许各写一个数。
 *
 * 单位写进键名（Hours / Days / Mb / Seconds / Bytes），避免调用方猜。
 */
export const LIMITS = {
  /** 单会议最大参会人（SysConfig 可配） */
  MEETING_MAX_PARTICIPANTS: 100,
  /** 单场会议最长时长（SysConfig 可配） */
  MEETING_MAX_DURATION_HOURS: 24,
  /** 会议最长预约跨度，不可配 */
  MEETING_MAX_ADVANCE_DAYS: 365,
  MEETING_TITLE_MIN_LENGTH: 1,
  MEETING_TITLE_MAX_LENGTH: 120,
  MEETING_PASSWORD_MIN_LENGTH: 4,
  MEETING_PASSWORD_MAX_LENGTH: 32,
  /** 单用户同时只能在一场会中（SysConfig 可配） */
  MEETING_MAX_CONCURRENT_PER_USER: 1,

  /** 单文件大小（SysConfig 可配） */
  FILE_MAX_SIZE_MB: 200,
  /** 单会议附件总量（SysConfig 可配） */
  MEETING_ATTACHMENTS_MAX_TOTAL_MB: 2048,
  /** 分片大小固定 5 MB */
  UPLOAD_PART_SIZE_MB: 5,

  CHAT_MESSAGE_MAX_LENGTH: 2000,
  /** SysConfig 可配 */
  CHAT_IMAGE_MAX_SIZE_MB: 10,
  WHITEBOARD_SYNC_MAX_BYTES: 64 * 1024,

  VOTE_MAX_QUESTIONS: 10,
  VOTE_MAX_OPTIONS_PER_QUESTION: 20,
  INVITE_MAX_PER_REQUEST: 200,

  /** 同号发送间隔（SysConfig 可配） */
  SMS_INTERVAL_SECONDS: 60,
  /** 同号每日条数（SysConfig 可配） */
  SMS_DAILY_PER_PHONE: 10,
  /** 同 IP 每小时条数（SysConfig 可配） */
  SMS_HOURLY_PER_IP: 20,
  /** 验证码错误次数，超过即作废 */
  SMS_CODE_MAX_ATTEMPTS: 5,

  /** 登录失败锁定（SysConfig 可配） */
  LOGIN_MAX_FAILURES: 5,
  LOGIN_LOCK_MINUTES: 15,

  /** 导出任务文件保留（SysConfig 可配） */
  EXPORT_RETENTION_HOURS: 24,
  TRASH_RETENTION_DAYS: 30,
  RECORDING_RETENTION_DAYS: 90,
  AUDIT_LOG_RETENTION_DAYS: 365,
} as const

/** 归 SysConfig 管、运行时可覆盖的项；落地时在 infra 层读配置覆盖 LIMITS 的默认值 */
export const CONFIGURABLE_LIMITS = [
  'MEETING_MAX_PARTICIPANTS',
  'MEETING_MAX_DURATION_HOURS',
  'MEETING_MAX_CONCURRENT_PER_USER',
  'FILE_MAX_SIZE_MB',
  'MEETING_ATTACHMENTS_MAX_TOTAL_MB',
  'CHAT_IMAGE_MAX_SIZE_MB',
  'SMS_INTERVAL_SECONDS',
  'SMS_DAILY_PER_PHONE',
  'SMS_HOURLY_PER_IP',
  'LOGIN_MAX_FAILURES',
  'LOGIN_LOCK_MINUTES',
  'EXPORT_RETENTION_HOURS',
  'TRASH_RETENTION_DAYS',
  'RECORDING_RETENTION_DAYS',
  'AUDIT_LOG_RETENTION_DAYS',
] as const satisfies readonly (keyof typeof LIMITS)[]

export type ConfigurableLimitKey = (typeof CONFIGURABLE_LIMITS)[number]
