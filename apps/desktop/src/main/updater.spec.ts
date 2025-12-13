import type { BrowserWindow } from 'electron'

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('node:events')
  class FakeUpdater extends EventEmitter {
    autoDownload = false
    autoInstallOnAppQuit = false
    setFeedURL = vi.fn()
    checkForUpdates = vi.fn(async (): Promise<null> => null)
    quitAndInstall = vi.fn()
  }
  return { autoUpdater: new FakeUpdater() }
})

import { createUpdater } from './updater'
import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

interface FakeUpdater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  setFeedURL: Mock
  checkForUpdates: Mock
  quitAndInstall: Mock
  emit: (event: string, payload?: unknown) => void
}

function fakeWindow(): { window: BrowserWindow; send: Mock } {
  const send = vi.fn()
  const window = {
    isDestroyed: (): boolean => false,
    webContents: { send },
  } as unknown as BrowserWindow
  return { window, send }
}

describe('自动更新控制器', () => {
  let autoUpdater: FakeUpdater

  beforeEach(async () => {
    autoUpdater = (await import('electron-updater')).autoUpdater as unknown as FakeUpdater
    autoUpdater.checkForUpdates.mockClear()
    autoUpdater.quitAndInstall.mockClear()
    autoUpdater.setFeedURL.mockClear()
  })

  it('开发态不加载 electron-updater，直接回 unsupported', async () => {
    const { window, send } = fakeWindow()
    const updater = createUpdater({ isPackaged: false, getWindow: () => window })

    await expect(updater.check()).resolves.toEqual({ status: 'unsupported' })
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('打包但没配更新源时给出明确错误', async () => {
    const { window, send } = fakeWindow()
    const updater = createUpdater({ isPackaged: true, getWindow: () => window })

    await expect(updater.check()).resolves.toEqual({
      status: 'error',
      error: '未配置更新源（TONGPIN_UPDATE_URL）',
    })
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled()
    expect(send).toHaveBeenCalledWith(ELECTRON_CHANNELS.eventUpdateState, {
      status: 'error',
      error: '未配置更新源（TONGPIN_UPDATE_URL）',
    })
  })

  it('配置更新源后按事件广播进度，下载完可安装', async () => {
    const { window, send } = fakeWindow()
    const updater = createUpdater({
      isPackaged: true,
      feedUrl: 'https://updates.tongpin.me/desktop',
      getWindow: () => window,
    })

    await updater.check()
    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://updates.tongpin.me/desktop',
    })
    expect(autoUpdater.autoDownload).toBe(true)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

    autoUpdater.emit('checking-for-update')
    autoUpdater.emit('update-available', { version: '1.2.3' })
    autoUpdater.emit('download-progress', { percent: 42.6 })
    autoUpdater.emit('update-downloaded', { version: '1.2.3' })

    expect(send.mock.calls.map((call) => call[1])).toEqual([
      { status: 'checking' },
      { status: 'available', version: '1.2.3' },
      { status: 'downloading', progress: 43 },
      { status: 'ready', version: '1.2.3' },
    ])

    await updater.install()
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('未就绪时不执行安装', async () => {
    const { window } = fakeWindow()
    const updater = createUpdater({ isPackaged: true, getWindow: () => window })

    await updater.install()
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })

  it('更新器报错时转成 error 状态', async () => {
    const { window, send } = fakeWindow()
    const updater = createUpdater({
      isPackaged: true,
      feedUrl: 'https://updates.tongpin.me/desktop',
      getWindow: () => window,
    })
    await updater.check()

    autoUpdater.emit('error', new Error('网络不可用'))
    expect(send).toHaveBeenLastCalledWith(ELECTRON_CHANNELS.eventUpdateState, {
      status: 'error',
      error: '网络不可用',
    })
  })
})
