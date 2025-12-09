import { describe, expect, it } from 'vitest'

import { mainWindowOptions } from './window-options'

describe('mainWindowOptions', () => {
  it('主窗口 1065×700 且不可再小', () => {
    const options = mainWindowOptions('darwin', '/tmp/preload.mjs')
    expect(options).toMatchObject({ width: 1065, height: 700, minWidth: 1065, minHeight: 700 })
  })

  it('mac 用 hiddenInset 保留系统按钮；win/linux 无边框', () => {
    expect(mainWindowOptions('darwin', '/tmp/preload.mjs')).toMatchObject({
      titleBarStyle: 'hiddenInset',
      frame: true,
    })
    expect(mainWindowOptions('win32', '/tmp/preload.mjs')).toMatchObject({
      titleBarStyle: 'default',
      frame: false,
    })
  })

  it('渲染进程隔离：contextIsolation 开、nodeIntegration 关', () => {
    const options = mainWindowOptions('linux', '/tmp/preload.mjs')
    expect(options.webPreferences).toMatchObject({
      preload: '/tmp/preload.mjs',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    })
  })
})
