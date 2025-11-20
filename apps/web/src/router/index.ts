import type { Component } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

/** 懒加载返回组件实例；直接写 `() => import()` 会撞 explicit-function-return-type */
function lazy(loader: () => Promise<{ default: Component }>): () => Promise<Component> {
  return () => loader().then((module) => module.default)
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: lazy(() => import('@/views/HomeView.vue')),
      meta: { title: '首页' },
    },
    {
      path: '/login',
      name: 'login',
      component: lazy(() => import('@/views/LoginView.vue')),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: lazy(() => import('@/views/NotFoundView.vue')),
      meta: { public: true },
    },
  ],
})

/** 未登录一律回登录页；有 token 但没 user（刷新页面）先拉 /auth/me 验活 */
router.beforeEach(async (to) => {
  if (to.meta.public === true) return true
  const auth = useAuthStore()
  if (auth.accessToken === null) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (auth.user === null) {
    try {
      await auth.loadMe()
    } catch {
      auth.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  document.title = to.meta.title === undefined ? '同频会议' : `${to.meta.title} · 同频会议`
  return true
})

export default router
