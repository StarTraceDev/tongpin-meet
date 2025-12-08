import { createMemoryHistory } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { createAppRouter } from './router'

describe('createAppRouter', () => {
  it('首页与登录页各就各位', async () => {
    const router = createAppRouter({ history: createMemoryHistory(), guard: false })
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('会议结束页带会议 id', async () => {
    const router = createAppRouter({ history: createMemoryHistory(), guard: false })
    await router.push('/meetings/m_1/ended')
    expect(router.currentRoute.value.name).toBe('meeting-ended')
    expect(router.currentRoute.value.params.id).toBe('m_1')
  })

  it('未知路径落 404 页', async () => {
    const router = createAppRouter({ history: createMemoryHistory(), guard: false })
    await router.push('/no-such-page')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('自定义路由替换骨架路由', async () => {
    const router = createAppRouter({
      history: createMemoryHistory(),
      guard: false,
      routes: [{ path: '/only', name: 'only', component: { template: '<div>only</div>' } }],
    })
    await router.push('/only')
    expect(router.currentRoute.value.name).toBe('only')
  })
})
