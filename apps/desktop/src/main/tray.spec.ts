import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const setTemplateImage = vi.fn()
  const createFromPath = vi.fn((_path: string) => ({ setTemplateImage }))
  const buildFromTemplate = vi.fn((template: unknown) => template)
  const setToolTip = vi.fn()
  const setContextMenu = vi.fn()
  const on = vi.fn()
  const trays: unknown[] = []
  return {
    setTemplateImage,
    createFromPath,
    buildFromTemplate,
    setToolTip,
    setContextMenu,
    on,
    trays,
  }
})

vi.mock('electron', () => {
  class FakeTray {
    setToolTip = mocks.setToolTip
    setContextMenu = mocks.setContextMenu
    on = mocks.on

    constructor() {
      mocks.trays.push(this)
    }
  }
  return {
    app: { getAppPath: (): string => '/app' },
    Menu: { buildFromTemplate: mocks.buildFromTemplate },
    nativeImage: { createFromPath: mocks.createFromPath },
    Tray: FakeTray,
  }
})

import { createTray, trayIconPath } from './tray'

interface MenuItem {
  label?: string
  type?: string
  click?: () => void
}

describe('托盘图标路径', () => {
  it('mac 用模板图，其它平台用彩色图', () => {
    expect(trayIconPath('darwin', false, '/res', '/app')).toBe(
      '/app/resources/tray/trayTemplate.png',
    )
    expect(trayIconPath('win32', false, '/res', '/app')).toBe('/app/resources/tray/tray.png')
  })

  it('打包后从 Resources/tray 读取', () => {
    expect(trayIconPath('darwin', true, '/res', '/app')).toBe('/res/tray/trayTemplate.png')
  })
})

describe('托盘菜单', () => {
  it('mac 标记模板图，菜单提供显示与退出', () => {
    const onShow = vi.fn()
    const onQuit = vi.fn()
    const tray = createTray({ isPackaged: false, platform: 'darwin', onShow, onQuit })

    expect(mocks.createFromPath).toHaveBeenCalledWith('/app/resources/tray/trayTemplate.png')
    expect(mocks.setTemplateImage).toHaveBeenCalled()
    expect(mocks.setToolTip).toHaveBeenCalledWith('同频会议')
    expect(mocks.on).toHaveBeenCalledWith('click', onShow)
    expect(tray).toBe(mocks.trays[0])

    const template = mocks.buildFromTemplate.mock.calls[0]?.[0] as MenuItem[]
    expect(template.map((item) => item.label ?? item.type)).toEqual([
      '显示主窗口',
      'separator',
      '退出',
    ])
    template[0]?.click?.()
    template[2]?.click?.()
    expect(onShow).toHaveBeenCalledTimes(1)
    expect(onQuit).toHaveBeenCalledTimes(1)
  })

  it('非 mac 不设置模板图', () => {
    mocks.setTemplateImage.mockClear()
    createTray({ isPackaged: false, platform: 'win32', onShow: vi.fn(), onQuit: vi.fn() })

    expect(mocks.createFromPath).toHaveBeenLastCalledWith('/app/resources/tray/tray.png')
    expect(mocks.setTemplateImage).not.toHaveBeenCalled()
  })
})
