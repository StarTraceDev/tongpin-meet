import type { Permission } from '@tongpin/shared'
import { Result } from 'antd'
import { Link } from 'react-router'
import type { ReactElement, ReactNode } from 'react'

import { useAuth } from './AuthProvider'

export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission
  children: ReactNode
  fallback?: ReactNode
}): ReactElement {
  const { can } = useAuth()

  return <>{can(perm) ? children : fallback}</>
}

export function RequirePermission({
  perm,
  children,
}: {
  perm: Permission
  children: ReactNode
}): ReactElement {
  const { can } = useAuth()

  if (can(perm)) {
    return <>{children}</>
  }

  return (
    <Result
      status="403"
      title="没有访问权限"
      subTitle={`当前账号缺少 ${perm} 权限，请联系管理员分配角色。`}
      extra={<Link to="/">返回仪表盘</Link>}
    />
  )
}
