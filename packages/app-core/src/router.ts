import { createRouter, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router'

import HomePlaceholder from './views/HomePlaceholder.vue'
import LoginPlaceholder from './views/LoginPlaceholder.vue'

export interface AppRouterOptions {
  history: RouterHistory
  /** 业务域按需替换；不传则用骨架路由 */
  routes?: RouteRecordRaw[]
}

export const skeletonRoutes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: LoginPlaceholder },
  { path: '/home', name: 'home', component: HomePlaceholder },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

export function createAppRouter(options: AppRouterOptions): Router {
  return createRouter({
    history: options.history,
    routes: options.routes ?? skeletonRoutes,
  })
}
