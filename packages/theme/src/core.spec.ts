import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createThemeCore } from './core'
import type { ThemeMode, ThemePersistence } from './core'

function fakeDocument(): { dataset: Record<string, string>; classes: Set<string> } {
  const dataset: Record<string, string> = {}
  const classes = new Set<string>()
  const root = {
    dataset,
    classList: {
      toggle: (name: string, force?: boolean): boolean => {
        const on = force ?? !classes.has(name)
        if (on) classes.add(name)
        else classes.delete(name)
        return on
      },
    },
  }
  ;(globalThis as unknown as { document: Document }).document = {
    documentElement: root,
  } as unknown as Document
  return { dataset, classes }
}

function memoryPersistence(
  initial: ThemeMode | null = null,
): ThemePersistence & { value: ThemeMode | null } {
  return {
    value: initial,
    get(): ThemeMode | null {
      return this.value
    },
    set(mode: ThemeMode): void {
      this.value = mode
    },
  }
}

describe('createThemeCore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'document')
  })

  it('system + 系统深色时 resolved=dark，并写 data-theme 与 .dark', () => {
    const { dataset, classes } = fakeDocument()
    createThemeCore({
      storageKey: 't',
      systemSource: () => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })
    expect(dataset.theme).toBe('dark')
    expect(classes.has('dark')).toBe(true)
  })

  it('无 localStorage 记录时默认 system；system 且系统浅色则 light', () => {
    const { dataset } = fakeDocument()
    const core = createThemeCore({
      storageKey: 't',
      systemSource: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })
    expect(core.getMode()).toBe('system')
    expect(core.getResolved()).toBe('light')
    expect(dataset.theme).toBe('light')
  })

  it('setMode 持久化并立即生效', () => {
    const { dataset } = fakeDocument()
    const persistence = memoryPersistence()
    const core = createThemeCore({ storageKey: 't', persistence, systemSource: () => null })
    core.setMode('dark')
    expect(core.getMode()).toBe('dark')
    expect(core.getResolved()).toBe('dark')
    expect(persistence.value).toBe('dark')
    expect(dataset.theme).toBe('dark')
  })

  it('toggle 在 light/dark 间切换，不轮转到 system', () => {
    fakeDocument()
    const persistence = memoryPersistence('light')
    const core = createThemeCore({ storageKey: 't', persistence, systemSource: () => null })
    core.toggle()
    expect(core.getMode()).toBe('dark')
    expect(persistence.value).toBe('dark')
    core.toggle()
    expect(core.getMode()).toBe('light')
  })

  it('forceDark 只改 resolved，不改 mode 也不落盘', () => {
    fakeDocument()
    const persistence = memoryPersistence('light')
    const core = createThemeCore({ storageKey: 't', persistence, systemSource: () => null })
    core.forceDark(true)
    expect(core.getResolved()).toBe('dark')
    expect(core.getMode()).toBe('light')
    expect(persistence.value).toBe('light')
    core.forceDark(false)
    expect(core.getResolved()).toBe('light')
  })

  it('subscribe 在 resolved 变化时回调，退订后不再触发', () => {
    fakeDocument()
    const core = createThemeCore({
      storageKey: 't',
      persistence: memoryPersistence('light'),
      systemSource: () => null,
    })
    const seen: string[] = []
    const off = core.subscribe((resolved) => seen.push(resolved))
    core.setMode('dark')
    expect(seen).toEqual(['dark'])
    off()
    core.setMode('light')
    expect(seen).toEqual(['dark'])
  })

  it('system 模式下系统偏好变化才跟随；显式模式下忽略系统变化', () => {
    fakeDocument()
    let matches = false
    const media = {
      handler: null as (() => void) | null,
      get matches(): boolean {
        return matches
      },
      addEventListener: (_type: 'change', listener: () => void): void => {
        media.handler = listener
      },
      removeEventListener: (): void => {
        media.handler = null
      },
    }
    const core = createThemeCore({
      storageKey: 't',
      persistence: memoryPersistence(null),
      systemSource: () => media,
    })
    matches = true
    media.handler?.()
    expect(core.getResolved()).toBe('dark')
    core.setMode('light')
    matches = false
    media.handler?.()
    expect(core.getResolved()).toBe('light')
  })

  it('持久化里的非法值回退到默认 system', () => {
    fakeDocument()
    const persistence = {
      get: (): ThemeMode => 'blue' as unknown as ThemeMode,
      set: (): void => undefined,
    }
    const core = createThemeCore({ storageKey: 't', persistence, systemSource: () => null })
    expect(core.getMode()).toBe('system')
  })
})
