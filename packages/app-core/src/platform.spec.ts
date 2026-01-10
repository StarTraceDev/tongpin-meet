import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { createWebPlatform } from '@tongpin/platform/web'

import { createApp } from './index'
import { usePlatform } from './platform'

const Probe = defineComponent({
  setup: () => {
    const platform = usePlatform()
    return (): ReturnType<typeof h> => h('div', { class: 'probe-os' }, platform.os)
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('usePlatform', () => {
  it('在 createApp 的组件树里注入壳传入的实例', async () => {
    const platform = createWebPlatform()
    const container = document.createElement('div')
    document.body.append(container)

    const app = createApp({ platform, guard: false, routes: [{ path: '/', component: Probe }] })
    app.mount(container)
    await app.router.isReady()

    expect(container.querySelector('.probe-os')?.textContent).toBe('web')
  })

  it('没有 provider 时抛错并提示 createApp', () => {
    expect(() => usePlatform()).toThrowError(/createApp/)
  })
})
