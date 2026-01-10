import { describe, expect, it, vi } from 'vitest'

import type { Platform, SubWindowKey } from './types'

function stubPlatform(): Platform {
  const noop = async (): Promise<void> => undefined
  const off = (): void => undefined
  return {
    kind: 'web',
    os: 'web',
    window: {
      minimize: noop,
      toggleMaximize: noop,
      close: noop,
      isMaximized: async () => false,
      setFullscreen: noop,
      onMaximizedChange: () => off,
      openSub: noop,
      closeSub: noop,
      closeAllSubs: noop,
      onSubClosed: () => off,
    },
    capture: {
      pickSource: async () => null,
      listSources: async () => null,
      chooseSource: noop,
      checkPermission: async () => 'unknown',
      requestPermission: async () => false,
      stop: noop,
    },
    storage: {
      secure: false,
      get: async () => null,
      set: noop,
      remove: noop,
    },
    update: {
      supported: false,
      check: async () => ({ status: 'unsupported' }),
      install: noop,
      onState: () => off,
    },
    notify: {
      show: noop,
      setBadge: noop,
    },
    shell: {
      openExternal: noop,
      saveFile: noop,
    },
  }
}

describe('Platform 契约', () => {
  it('web 实现可以只靠六个 Port 组装出 Platform', () => {
    const platform = stubPlatform()
    expect(Object.keys(platform).sort()).toEqual([
      'capture',
      'kind',
      'notify',
      'os',
      'shell',
      'storage',
      'update',
      'window',
    ])
    expect(platform.update.supported).toBe(false)
    expect(platform.storage.secure).toBe(false)
  })

  it('窗口 Port 的子窗口方法返回 Promise 且 key 是受限联合类型', async () => {
    const platform = stubPlatform()
    const key: SubWindowKey = 'sharePicker'
    await expect(platform.window.openSub(key, { title: '选择共享内容' })).resolves.toBeUndefined()
    await expect(platform.window.closeAllSubs()).resolves.toBeUndefined()
  })

  it('订阅类方法返回退订函数', () => {
    const platform = stubPlatform()
    const offMax = platform.window.onMaximizedChange(vi.fn())
    const offSub = platform.window.onSubClosed(vi.fn())
    const offUpdate = platform.update.onState(vi.fn())
    expect(typeof offMax).toBe('function')
    expect(typeof offSub).toBe('function')
    expect(typeof offUpdate).toBe('function')
  })
})
