import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { createWebPlatform } from '@tongpin/platform/web'

import { createApp } from './index'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createApp', () => {
  it('挂载骨架路由，默认落在登录占位页', async () => {
    const container = document.createElement('div')
    document.body.append(container)

    const app = createApp({ platform: createWebPlatform() })
    app.mount(container)
    await app.router.isReady()

    expect(container.textContent).toContain('登录')
  })

  it('装好 pinia 与自定义路由', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const Home = defineComponent({
      setup: () => (): ReturnType<typeof h> => h('div', '自定义首页'),
    })

    const app = createApp({
      platform: createWebPlatform(),
      routes: [{ path: '/', component: Home }],
    })
    app.mount(container)
    await app.router.isReady()

    expect(container.textContent).toContain('自定义首页')
    expect(app.pinia).toBeDefined()
  })
})
