import { createBrowserTheme } from '@tongpin/theme/core'
import type { ResolvedMode, ThemeMode } from '@tongpin/theme/core'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface ThemeContextValue {
  mode: ThemeMode
  resolved: ResolvedMode
  setMode(mode: ThemeMode): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * 主题核心留在 @tongpin/theme，React 只负责订阅；
 * 这样 token 变量和 data-theme 的写法与 Web / 桌面端保持一致。
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [core] = useState(() => createBrowserTheme())
  const [mode, setModeState] = useState<ThemeMode>(() => core.getMode())
  const [resolved, setResolved] = useState<ResolvedMode>(() => core.getResolved())

  useEffect((): (() => void) => core.subscribe(setResolved), [core])
  useEffect((): (() => void) => () => core.destroy(), [core])

  const setMode = useCallback(
    (next: ThemeMode): void => {
      core.setMode(next)
      setModeState(next)
    },
    [core],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (context === null) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用')
  }

  return context
}
