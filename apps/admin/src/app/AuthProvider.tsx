import type { AuthUser } from '@tongpin/shared/types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { login, logout, restoreSession } from '../lib/auth'
import type { LoginInput } from '../lib/auth'

export interface AuthContextValue {
  user: AuthUser | null
  status: 'loading' | 'ready'
  signIn(input: LoginInput): Promise<void>
  signOut(): void
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

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut }),
    [user, status, signIn, signOut],
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
