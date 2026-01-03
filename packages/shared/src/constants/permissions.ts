/**
 * 03 §5.6 的后台权限点，存 Role 表；前端 usePermission().can() 与后端守卫读同一份。
 */
export const PERMISSIONS = [
  'meeting:read',
  'meeting:forceEnd',
  'meeting:export',
  'user:read',
  'user:write',
  'user:disable',
  'user:resetPwd',
  'dept:write',
  'role:write',
  'permission:read',
  'sms:read',
  'sms:write',
  'sms:secret',
  'ai:read',
  'ai:write',
  'ai:secret',
  'config:read',
  'config:write',
  'alert:read',
  'alert:write',
  'audit:read',
  'feedback:read',
  'feedback:write',
  'announcement:read',
  'announcement:write',
  'stats:read',
  'cost:read',
  'host:read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: unknown): value is Permission {
  // 只读元组没有 includes(string)，收窄成 string[] 再查，避免调用方先断言
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}
