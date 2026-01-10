import ElementPlus from 'element-plus'
import { createPinia, type Pinia } from 'pinia'
import { createApp as createVueApp, type App } from 'vue'
import {
  createMemoryHistory,
  type RouteRecordRaw,
  type Router,
  type RouterHistory,
} from 'vue-router'

import type { Platform } from '@tongpin/platform'

// 样式顺序固定：Element Plus 官方 → 暗色变量 → tokens → el-* 映射（PROGRESS §4 #27）
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@tongpin/tokens'
import './styles/element-plus.css'

import AppRoot from './App.vue'
import { configureHttp } from './apis/http'
import { providePlatform } from './platform'
import { createAppRouter } from './router'

export interface CreateAppOptions {
  platform: Platform
  /** Web 用 createWebHistory，Electron 用 createWebHashHistory；默认 memory 供测试 */
  history?: RouterHistory
  routes?: RouteRecordRaw[]
  /** 关掉鉴权守卫，仅测试用 */
  guard?: boolean
}

export interface TongpinApp {
  app: App<Element>
  router: Router
  pinia: Pinia
  mount: (target: string | Element) => void
}

/** 05 §3.3：壳只调这一处，业务代码从 @tongpin/app-core 出发 */
export function createApp(options: CreateAppOptions): TongpinApp {
  // token 存储与请求层都从这里拿到平台（O7/O8），必须在 router 装配前就绪
  configureHttp(options.platform)
  const app = createVueApp(AppRoot)
  const pinia = createPinia()
  const router = createAppRouter({
    history: options.history ?? createMemoryHistory(),
    ...(options.routes === undefined ? {} : { routes: options.routes }),
    ...(options.guard === undefined ? {} : { guard: options.guard }),
  })

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
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
export { appRoutes, createAppRouter, installAuthGuard, type AppRouterOptions } from './router'
export { ROUTE_NAMES, type RouteName } from './router/names'
export { useAuthStore } from './stores/auth'
export { session, hydrateSession, onUnauthorized } from './apis/http'
export { listMeetings } from './apis/meeting'
export { default as SubWindowHost } from './subwindow/SubWindowHost.vue'
export { subWindowRoutes, type SubWindowOverrides, type SubWindowRequest } from './subwindow/routes'
