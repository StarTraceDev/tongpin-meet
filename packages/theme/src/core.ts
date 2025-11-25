export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedMode = 'light' | 'dark'

/** 宿主注入的持久化：Web 用 localStorage，Electron 走 IPC */
export interface ThemePersistence {
  get(): ThemeMode | null
  set(mode: ThemeMode): void
}

export interface ThemeCoreOptions {
  /** 存储键，Web 为 'tongpin:theme' */
  storageKey: string
  /** 缺省 'system'（05 §7.1） */
  defaultMode?: ThemeMode
  persistence?: ThemePersistence
  /** system 模式下的系统偏好来源；返回 null 表示不支持 */
  systemSource?: () => MediaQueryListLike | null
}

/** 只依赖 MediaQueryList 的三个成员，测试里可以给假对象 */
export interface MediaQueryListLike {
  matches: boolean
  addEventListener: (type: 'change', listener: () => void) => void
  removeEventListener: (type: 'change', listener: () => void) => void
}

export interface ThemeCore {
  getMode(): ThemeMode
  getResolved(): ResolvedMode
  setMode(mode: ThemeMode): void
  /** light <-> dark 直接切，不轮转到 system */
  toggle(): void
  subscribe(listener: (resolved: ResolvedMode) => void): () => void
  /** 会中强制暗色，退出时传 false 恢复 */
  forceDark(on: boolean): void
  destroy(): void
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * 05 §7.2：核心只做一件事——算出 resolved 并写到根节点。
 * 同时写 data-theme（我们自己的 token）和 .dark（Element Plus 只认它）。
 */
export function createThemeCore(options: ThemeCoreOptions): ThemeCore {
  const media = options.systemSource?.() ?? null
  const listeners = new Set<(resolved: ResolvedMode) => void>()

  const stored = options.persistence?.get() ?? null
  let mode: ThemeMode = isThemeMode(stored) ? stored : (options.defaultMode ?? 'system')
  let forcedDark = false
  let resolved: ResolvedMode = compute()

  const onSystemChange = (): void => {
    if (mode === 'system') refresh()
  }
  media?.addEventListener('change', onSystemChange)
  apply()

  function compute(): ResolvedMode {
    if (forcedDark) return 'dark'
    if (mode === 'system') return media?.matches === true ? 'dark' : 'light'
    return mode
  }

  function apply(): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.theme = resolved
    root.classList.toggle('dark', resolved === 'dark')
  }

  function refresh(): void {
    const next = compute()
    if (next === resolved) return
    resolved = next
    apply()
    for (const listener of listeners) listener(next)
  }

  function setMode(next: ThemeMode): void {
    mode = next
    options.persistence?.set(next)
    refresh()
  }

  return {
    getMode: () => mode,
    getResolved: () => resolved,
    setMode,
    toggle: (): void => {
      setMode(resolved === 'dark' ? 'light' : 'dark')
    },
    subscribe: (listener: (resolved: ResolvedMode) => void): (() => void) => {
      listeners.add(listener)
      return (): void => {
        listeners.delete(listener)
      }
    },
    forceDark: (on: boolean): void => {
      forcedDark = on
      refresh()
    },
    destroy: (): void => {
      media?.removeEventListener('change', onSystemChange)
      listeners.clear()
    },
  }
}

/** Web/默认宿主：localStorage + matchMedia */
export function createBrowserTheme(storageKey = 'tongpin:theme'): ThemeCore {
  const persistence: ThemePersistence = {
    get: (): ThemeMode | null => {
      if (typeof window === 'undefined') return null
      try {
        const raw = window.localStorage.getItem(storageKey)
        return isThemeMode(raw) ? raw : null
      } catch {
        return null
      }
    },
    set: (mode: ThemeMode): void => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(storageKey, mode)
      } catch {
        // 隐私模式下 localStorage 会抛，主题退回内存态
      }
    },
  }
  return createThemeCore({
    storageKey,
    persistence,
    systemSource: () =>
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(prefers-color-scheme: dark)')
        : null,
  })
}
