import type { Permission } from '@tongpin/shared/constants'

export interface PermissionOption {
  code: Permission
  label: string
}

export interface PermissionGroup {
  title: string
  options: PermissionOption[]
}

/** 权限点的中文文案与分组：03 §5.6 只给了 code，按钮矩阵在管理台落地成可读表格 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: '会议',
    options: [
      { code: 'meeting:read', label: '查看会议' },
      { code: 'meeting:forceEnd', label: '强制结束会议' },
      { code: 'meeting:export', label: '导出会议' },
    ],
  },
  {
    title: '用户与组织',
    options: [
      { code: 'user:read', label: '查看用户' },
      { code: 'user:write', label: '新增与编辑用户' },
      { code: 'user:disable', label: '禁用 / 启用用户' },
      { code: 'user:resetPwd', label: '重置用户密码' },
      { code: 'dept:write', label: '管理部门' },
      { code: 'role:write', label: '管理角色' },
      { code: 'permission:read', label: '查看权限点' },
    ],
  },
  {
    title: '短信',
    options: [
      { code: 'sms:read', label: '查看短信配置' },
      { code: 'sms:write', label: '编辑短信配置' },
      { code: 'sms:secret', label: '查看短信密钥' },
    ],
  },
  {
    title: 'AI',
    options: [
      { code: 'ai:read', label: '查看 AI 配置' },
      { code: 'ai:write', label: '编辑 AI 配置' },
      { code: 'ai:secret', label: '查看 AI 密钥' },
    ],
  },
  {
    title: '内容与反馈',
    options: [
      { code: 'feedback:read', label: '查看反馈' },
      { code: 'feedback:write', label: '处理反馈' },
    ],
  },
  {
    title: '系统',
    options: [
      { code: 'config:read', label: '查看系统配置' },
      { code: 'config:write', label: '编辑系统配置' },
      { code: 'alert:read', label: '查看告警规则' },
      { code: 'alert:write', label: '编辑告警规则' },
      { code: 'audit:read', label: '查看审计日志' },
      { code: 'stats:read', label: '查看统计' },
      { code: 'cost:read', label: '查看成本' },
      { code: 'host:read', label: '查看主机监控' },
    ],
  },
]

const LABELS = new Map<string, string>(
  PERMISSION_GROUPS.flatMap((group) =>
    group.options.map((option): [string, string] => [option.code, option.label]),
  ),
)

export function permissionLabel(code: string): string {
  return LABELS.get(code) ?? code
}

export function permissionGroupTitles(code: string): string[] {
  return PERMISSION_GROUPS.filter((group) =>
    group.options.some((option) => option.code === code),
  ).map((group) => group.title)
}
