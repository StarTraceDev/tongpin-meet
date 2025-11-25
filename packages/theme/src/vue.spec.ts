import { describe, expect, it, vi } from 'vitest'

import type { ThemeCore } from './core'
import { setThemeCore, useTheme } from './vue'

function stubCore(): ThemeCore {
  return {
    getMode: vi.fn<() => 'system' | 'light' | 'dark'>(() => 'system'),
    getResolved: vi.fn<() => 'light' | 'dark'>(() => 'light'),
    setMode: vi.fn(),
    toggle: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    forceDark: vi.fn(),
    destroy: vi.fn(),
  }
}

describe('useTheme', () => {
  it('返回响应式 mode/resolved 与 isDark', () => {
    const core = stubCore()
    setThemeCore(core)
    const theme = useTheme()
    expect(theme.mode.value).toBe('system')
    expect(theme.resolved.value).toBe('light')
    expect(theme.isDark.value).toBe(false)
    setThemeCore(null)
  })

  it('setMode 委托核心并同步状态', () => {
    const core = stubCore()
    let mode: 'system' | 'light' | 'dark' = 'system'
    core.getMode = vi.fn(() => mode)
    core.getResolved = vi.fn(() => (mode === 'dark' ? 'dark' : 'light'))
    core.setMode = vi.fn((next) => {
      mode = next
    })
    setThemeCore(core)
    const theme = useTheme()
    theme.setMode('dark')
    expect(core.setMode).toHaveBeenCalledWith('dark')
    expect(theme.mode.value).toBe('dark')
    expect(theme.isDark.value).toBe(true)
    setThemeCore(null)
  })

  it('forceDark 透传核心', () => {
    const core = stubCore()
    setThemeCore(core)
    const theme = useTheme()
    theme.forceDark(true)
    expect(core.forceDark).toHaveBeenCalledWith(true)
    setThemeCore(null)
  })
})
