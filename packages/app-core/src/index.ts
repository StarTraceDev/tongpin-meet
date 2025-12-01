import { createPinia, type Pinia } from 'pinia'
import { createApp as createVueApp, type App } from 'vue'
import {
  createMemoryHistory,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router'

import type { Platform } from '@tongpin/platform'

import AppRoot from './App.vue'
import { providePlatform } from './platform'
import { createAppRouter } from './router'

export interface CreateAppOptions {
  platform: Platform
  /** Web 用 createWebHistory，Electron 用 createWebHashHistory；默认 memory 供测试 */
  history?: RouterHistory
  routes?: RouteRecordRaw[]
}

export interface TongpinApp {
  app: App<Element>
  router: Router
  pinia: Pinia
  mount: (target: string | Element) => void
}

/** 05 §3.3：壳只调这一处，业务代码从 @tongpin/app-core 出发 */
export function createApp(options: CreateAppOptions): TongpinApp {
  const app = createVueApp(AppRoot)
  const pinia = createPinia()
  const router = createAppRouter({
    history: options.history ?? createMemoryHistory(),
    ...(options.routes === undefined ? {} : { routes: options.routes }),
  })

  app.use(pinia)
  app.use(router)
  providePlatform(app, options.platform)

  return {
    app,
    router,
    pinia,
    mount: (target: string | Element): void => {
      app.mount(target)
    },
  }
}

export { PLATFORM_KEY, providePlatform, usePlatform } from './platform'
export { createAppRouter, skeletonRoutes, type AppRouterOptions } from './router'
