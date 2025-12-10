import { writeFile } from 'node:fs/promises'

import { app, dialog, ipcMain, Notification, safeStorage, shell, systemPreferences } from 'electron'

import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

import type { SubWindowKey, SubWindowOptions, UpdateState } from '@tongpin/platform'

import { createStorage, type StorageCipher } from './storage'
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

/** 05 §3.4：25 个通道的主进程侧实现，渲染进程只能经 preload 白名单调用。 */
export function registerIpcHandlers(context: IpcContext): void {
  const storage = createStorage(context.storagePath, safeStorageCipher())
  const { windows } = context

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

  // 自定义选择器在 M10-4 接 desktopCapturer；先返回 null，业务层按「用户取消」处理。
  ipcMain.handle(ELECTRON_CHANNELS.capturePickSource, () => null)
  ipcMain.handle(ELECTRON_CHANNELS.captureCheckPermission, () => screenPermission())
  ipcMain.handle(ELECTRON_CHANNELS.captureRequestPermission, () => screenPermission() === 'granted')
  ipcMain.handle(ELECTRON_CHANNELS.captureStop, () => undefined)

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

  // 真正的 electron-updater 接线在 M10-5；在此之前返回 idle，不伪造版本。
  const idleState: UpdateState = { status: 'idle' }
  ipcMain.handle(ELECTRON_CHANNELS.updateCheck, () => idleState)
  ipcMain.handle(ELECTRON_CHANNELS.updateInstall, () => undefined)

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
