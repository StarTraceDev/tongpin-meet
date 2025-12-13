import { writeFile } from 'node:fs/promises'

import {
  app,
  desktopCapturer,
  dialog,
  ipcMain,
  Notification,
  safeStorage,
  shell,
  systemPreferences,
} from 'electron'

import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

import type { SubWindowKey, SubWindowOptions } from '@tongpin/platform'

import { SourcePicker } from './picker'
import { createStorage, type StorageCipher } from './storage'
import { createUpdater } from './updater'
import type { WindowManager } from './windows'

type Permission = 'granted' | 'denied' | 'unknown'

function screenPermission(): Permission {
  if (process.platform !== 'darwin') return 'granted'
  const status = systemPreferences.getMediaAccessStatus('screen')
  if (status === 'granted') return 'granted'
  if (status === 'denied' || status === 'restricted') return 'denied'
  return 'unknown'
}

function safeStorageCipher(): StorageCipher | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined
  return {
    encrypt: (value) => safeStorage.encryptString(value).toString('base64'),
    decrypt: (value) => safeStorage.decryptString(Buffer.from(value, 'base64')),
  }
}

export interface IpcContext {
  windows: WindowManager
  storagePath: string
}

export interface IpcHandlers {
  /** 选源会话之外，主进程还要在 setDisplayMediaRequestHandler 里消费选中结果 */
  capture: SourcePicker
}

/** 05 §3.4：通道的主进程侧实现，渲染进程只能经 preload 白名单调用。 */
export function registerIpcHandlers(context: IpcContext): IpcHandlers {
  const storage = createStorage(context.storagePath, safeStorageCipher())
  const { windows } = context
  const capture = new SourcePicker({
    listSources: (): Promise<Electron.DesktopCapturerSource[]> =>
      desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      }),
    openPicker: (sessionId: string): void => {
      windows.openSub('sharePicker', { title: '选择共享内容', payload: { sessionId } })
    },
    closePicker: (): void => windows.closeSub('sharePicker'),
  })

  ipcMain.handle(ELECTRON_CHANNELS.windowMinimize, () => windows.main.minimize())
  ipcMain.handle(ELECTRON_CHANNELS.windowToggleMaximize, () => {
    if (windows.main.isMaximized()) windows.main.unmaximize()
    else windows.main.maximize()
  })
  ipcMain.handle(ELECTRON_CHANNELS.windowClose, () => windows.main.close())
  ipcMain.handle(ELECTRON_CHANNELS.windowIsMaximized, () => windows.main.isMaximized())
  ipcMain.handle(ELECTRON_CHANNELS.windowSetFullscreen, (_event, payload: unknown) => {
    const on = (payload as { on?: unknown } | undefined)?.on === true
    windows.main.setFullScreen(on)
  })
  ipcMain.handle(ELECTRON_CHANNELS.windowOpenSub, (_event, payload: unknown) => {
    const { key, opts } = (payload ?? {}) as { key?: SubWindowKey; opts?: SubWindowOptions }
    if (key === undefined) return
    windows.openSub(key, opts ?? {})
  })
  ipcMain.handle(ELECTRON_CHANNELS.windowCloseSub, (_event, payload: unknown) => {
    const { key } = (payload ?? {}) as { key?: SubWindowKey }
    if (key !== undefined) windows.closeSub(key)
  })
  ipcMain.handle(ELECTRON_CHANNELS.windowCloseAllSubs, () => windows.closeAllSubs())

  // macOS 首次共享由系统弹窗授权；已拒绝时给不出缩略图，按取消处理。
  ipcMain.handle(ELECTRON_CHANNELS.capturePickSource, (event) => {
    if (screenPermission() === 'denied') return null
    return capture.pick(event.sender.id)
  })
  ipcMain.handle(ELECTRON_CHANNELS.captureListSources, (_event, payload: unknown) => {
    const { sessionId } = (payload ?? {}) as { sessionId?: string }
    if (typeof sessionId !== 'string') return null
    return capture.list(sessionId)
  })
  ipcMain.handle(ELECTRON_CHANNELS.capturePickResult, (_event, payload: unknown) => {
    const { sessionId, sourceId } = (payload ?? {}) as { sessionId?: string; sourceId?: string }
    if (typeof sessionId !== 'string') return
    capture.settle(sessionId, typeof sourceId === 'string' ? sourceId : null)
  })
  ipcMain.handle(ELECTRON_CHANNELS.captureCheckPermission, () => screenPermission())
  ipcMain.handle(ELECTRON_CHANNELS.captureRequestPermission, () => screenPermission() === 'granted')
  ipcMain.handle(ELECTRON_CHANNELS.captureStop, (event) => capture.release(event.sender.id))

  ipcMain.handle(ELECTRON_CHANNELS.storageGet, (_event, payload: unknown) => {
    const { key } = (payload ?? {}) as { key?: string }
    return key === undefined ? null : storage.get(key)
  })
  ipcMain.handle(ELECTRON_CHANNELS.storageSet, (_event, payload: unknown) => {
    const { key, value } = (payload ?? {}) as { key?: string; value?: string }
    if (key !== undefined && typeof value === 'string') storage.set(key, value)
  })
  ipcMain.handle(ELECTRON_CHANNELS.storageRemove, (_event, payload: unknown) => {
    const { key } = (payload ?? {}) as { key?: string }
    if (key !== undefined) storage.remove(key)
  })

  // 开发态没有 app-update.yml，控制器此时只回 unsupported，不加载 electron-updater。
  const updater = createUpdater({
    isPackaged: app.isPackaged,
    feedUrl: process.env.TONGPIN_UPDATE_URL,
    getWindow: () => (windows.main.isDestroyed() ? null : windows.main),
  })
  ipcMain.handle(ELECTRON_CHANNELS.updateCheck, () => updater.check())
  ipcMain.handle(ELECTRON_CHANNELS.updateInstall, () => updater.install())

  ipcMain.handle(ELECTRON_CHANNELS.notifyShow, (_event, payload: unknown) => {
    const { title, body, clickable } = (payload ?? {}) as {
      title?: string
      body?: string
      clickable?: boolean
    }
    if (!Notification.isSupported()) return
    const notification = new Notification({ title: title ?? '', body: body ?? '' })
    if (clickable === true) {
      notification.on('click', () => {
        const main = windows.main
        if (!main.isDestroyed()) main.webContents.send(ELECTRON_CHANNELS.eventNotifyClicked)
      })
    }
    notification.show()
  })
  ipcMain.handle(ELECTRON_CHANNELS.notifySetBadge, (_event, payload: unknown) => {
    const { count } = (payload ?? {}) as { count?: number }
    app.setBadgeCount(typeof count === 'number' && count > 0 ? Math.floor(count) : 0)
  })

  ipcMain.handle(ELECTRON_CHANNELS.shellOpenExternal, async (_event, payload: unknown) => {
    const { url } = (payload ?? {}) as { url?: string }
    if (typeof url === 'string' && /^https?:\/\//.test(url)) await shell.openExternal(url)
  })
  ipcMain.handle(ELECTRON_CHANNELS.shellSaveFile, async (_event, payload: unknown) => {
    const { filename, bytes } = (payload ?? {}) as { filename?: string; bytes?: ArrayBuffer }
    if (typeof filename !== 'string' || bytes === undefined) return
    const result = await dialog.showSaveDialog({ defaultPath: filename })
    if (result.canceled || result.filePath === undefined) return
    await writeFile(result.filePath, Buffer.from(bytes))
  })

  return { capture }
}

export function watchMaximize(window: Electron.BrowserWindow): void {
  const notify = (): void => {
    if (!window.isDestroyed()) {
      window.webContents.send(ELECTRON_CHANNELS.eventMaximizedChanged, window.isMaximized())
    }
  }
  window.on('maximize', notify)
  window.on('unmaximize', notify)
}
