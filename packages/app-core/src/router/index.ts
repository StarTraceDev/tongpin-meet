import type { Component } from 'vue'
import { createRouter, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router'

import { hydrateSession, onUnauthorized, session } from '../apis/http'
import { useAuthStore } from '../stores/auth'
import { ROUTE_NAMES } from './names'

/** 懒加载返回组件实例；直接写 `() => import()` 会撞 explicit-function-return-type */
function lazy(loader: () => Promise<{ default: Component }>): () => Promise<Component> {
  return () => loader().then((module) => module.default)
}

export interface AppRouterOptions {
  history: RouterHistory
  /** 业务域按需替换；不传则用内置路由 */
  routes?: RouteRecordRaw[]
  /** 测试里可关掉鉴权守卫（守卫依赖已安装的 pinia） */
  guard?: boolean
}

export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: lazy(() => import('../layouts/AppShell.vue')),
    children: [
      {
        path: '',
        name: ROUTE_NAMES.home,
        component: lazy(() => import('../views/HomeView.vue')),
        meta: { title: '会议' },
      },
      {
        path: 'recordings',
        name: ROUTE_NAMES.recordings,
        component: lazy(() => import('../views/RecordingsView.vue')),
        meta: { title: '录制' },
      },
      {
        path: 'settings',
        name: ROUTE_NAMES.settings,
        component: lazy(() => import('../views/SettingsView.vue')),
        meta: { title: '设置' },
      },
    ],
  },
  {
    path: '/meeting/:id',
    name: ROUTE_NAMES.meeting,
    component: lazy(() => import('../views/meeting/MeetingRoom.vue')),
    meta: { title: '会议室' },
  },
  {
    path: '/login',
    name: ROUTE_NAMES.login,
    component: lazy(() => import('../views/LoginView.vue')),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/meetings/:id/ended',
    name: ROUTE_NAMES.meetingEnded,
    component: lazy(() => import('../views/MeetingEndView.vue')),
    meta: { title: '会议结束' },
  },
  {
    path: '/device',
    name: ROUTE_NAMES.device,
    component: lazy(() => import('../views/DeviceView.vue')),
    meta: { title: '确认设备登录' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: lazy(() => import('../views/NotFoundView.vue')),
    meta: { public: true },
  },
]

/** 同一进程只保留一个 401 跳转监听，重复 createApp（测试）不会叠加 */
let unregisterUnauthorized: (() => void) | null = null

/** 未登录一律回登录页；有 token 但没 user（刷新页面）先拉 /auth/me 验活 */
export function installAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    if (to.meta.public === true) return true
    await hydrateSession()
    const auth = useAuthStore()
    if (session.accessToken === null) {
      return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } }
    }
    if (auth.user === null) {
      try {
        await auth.loadMe()
      } catch {
        auth.logout()
        return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } }
      }
    }
    document.title = to.meta.title === undefined ? '同频会议' : `${to.meta.title} · 同频会议`
    return true
  })

  // O9：刷新失败/被踢只在这里跳一次，组件不用各自处理 401
  unregisterUnauthorized?.()
  unregisterUnauthorized = onUnauthorized(() => {
    const current = router.currentRoute.value
    if (current.name === ROUTE_NAMES.login) return
    useAuthStore().logout()
    void router.replace({ name: ROUTE_NAMES.login, query: { redirect: current.fullPath } })
  })
}

export function createAppRouter(options: AppRouterOptions): Router {
  const router = createRouter({
    history: options.history,
    routes: options.routes ?? appRoutes,
  })
  if (options.guard !== false) installAuthGuard(router)
  return router
}
