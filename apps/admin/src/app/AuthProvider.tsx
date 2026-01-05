import type { Permission } from '@tongpin/shared'
import type { AuthUser } from '@tongpin/shared/types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { login, logout, restoreSession } from '../lib/auth'
import type { LoginInput } from '../lib/auth'
import { hasPermission } from '../lib/permissions'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'ready'
  signIn(input: LoginInput): Promise<void>
  signOut(): void
  can(permission: Permission): boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  useEffect((): (() => void) => {
    let active = true

    void restoreSession()
      .then((me) => {
        if (!active) {
          return
        }
        setUser(me)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setUser(null)
        setStatus('ready')
      })

    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (input: LoginInput): Promise<void> => {
    const me = await login(input)
    setUser(me)
  }, [])

  const signOut = useCallback((): void => {
    logout()
    setUser(null)
  }, [])

  const can = useCallback(
    (permission: Permission): boolean => hasPermission(user, permission),
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, can }),
    [user, status, signIn, signOut, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }

  return context
}
