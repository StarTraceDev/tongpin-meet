import { Spin } from 'antd'
import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }): ReactElement {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="admin-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (user === null) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <>{children}</>
}
