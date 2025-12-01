import { inject, type App, type InjectionKey } from 'vue'

import type { Platform } from '@tongpin/platform'

/** 业务代码只通过 usePlatform() 取平台能力，不直接读 window / process */
export const PLATFORM_KEY: InjectionKey<Platform> = Symbol('tongpin.platform')

export function providePlatform(app: App, platform: Platform): void {
  app.provide(PLATFORM_KEY, platform)
}

export function usePlatform(): Platform {
  const platform = inject(PLATFORM_KEY)
  if (platform === undefined) {
    throw new Error('[app-core] usePlatform() 必须在 createApp({ platform }) 挂载的组件树里调用')
  }
  return platform
}
