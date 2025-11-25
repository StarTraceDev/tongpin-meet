import { computed, getCurrentScope, onScopeDispose, readonly, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { createBrowserTheme } from './core'
import type { ResolvedMode, ThemeCore, ThemeMode } from './core'

export interface UseThemeResult {
  /** 用户的选择：light / dark / system */
  mode: Readonly<Ref<ThemeMode>>
  /** 实际生效：light / dark */
  resolved: Readonly<Ref<ResolvedMode>>
  isDark: ComputedRef<boolean>
  setMode(mode: ThemeMode): void
  toggle(): void
  forceDark(on: boolean): void
}

let shared: ThemeCore | null = null

export function getThemeCore(): ThemeCore {
  shared ??= createBrowserTheme()
  return shared
}

/** 测试或自定义宿主替换核心实例 */
export function setThemeCore(core: ThemeCore | null): void {
  shared = core
}

export function useTheme(): UseThemeResult {
  const core = getThemeCore()
  const mode = ref<ThemeMode>(core.getMode())
  const resolved = ref<ResolvedMode>(core.getResolved())
  const isDark = computed(() => resolved.value === 'dark')

  const sync = (): void => {
    mode.value = core.getMode()
    resolved.value = core.getResolved()
  }
  const unsubscribe = core.subscribe(() => {
    resolved.value = core.getResolved()
  })
  if (getCurrentScope() !== undefined) onScopeDispose(unsubscribe)

  return {
    mode: readonly(mode),
    resolved: readonly(resolved),
    isDark,
    setMode: (next: ThemeMode): void => {
      core.setMode(next)
      sync()
    },
    toggle: (): void => {
      core.toggle()
      sync()
    },
    forceDark: (on: boolean): void => {
      core.forceDark(on)
      sync()
    },
  }
}
