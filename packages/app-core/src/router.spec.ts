import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from './router'

describe('createAppRouter', () => {
  it('根路径重定向到登录页', async () => {
    const router = createAppRouter({ history: createMemoryHistory() })
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('能进入会议页，未知路径回落登录页', async () => {
    const router = createAppRouter({ history: createMemoryHistory() })
    await router.push('/home')
    expect(router.currentRoute.value.name).toBe('home')

    await router.push('/no-such-page')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('自定义路由替换骨架路由', async () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/only', name: 'only', component: { template: '<div>only</div>' } }],
    })
    await router.push('/only')
    expect(router.currentRoute.value.name).toBe('only')
  })
})
