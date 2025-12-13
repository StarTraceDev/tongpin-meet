import { join } from 'node:path'

import { app, BrowserWindow, session, shell, webContents, type Tray } from 'electron'

import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

import { findDeepLink, parseDeepLink } from './deep-link'
import { registerIpcHandlers, watchMaximize } from './ipc'
import type { SourcePicker } from './picker'
import { createTray } from './tray'
import { mainWindowOptions } from './window-options'
import { WindowManager } from './windows'

const PROTOCOL = 'tongpin'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let pendingDeepLink: string | null = null

function createMainWindow(): BrowserWindow {
  const preload = join(import.meta.dirname, '../preload/index.mjs')
  const window = new BrowserWindow(mainWindowOptions(process.platform, preload))

  window.once('ready-to-show', () => window.show())
  window.on('close', (event) => {
    // 关闭按钮收进托盘；真正退出走托盘菜单（before-quit 会置 isQuitting）。
    if (isQuitting) return
    event.preventDefault()
    window.hide()
  })
  window.webContents.on('did-finish-load', () => {
    if (pendingDeepLink === null) return
    const url = pendingDeepLink
    pendingDeepLink = null
    deliverDeepLink(url)
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl !== undefined) {
    void window.loadURL(devUrl)
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
  return window
}

function showMainWindow(): void {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** 窗口还没加载完时先缓存，did-finish-load 后再补发，避免链接丢失。 */
function deliverDeepLink(url: string): void {
  const link = parseDeepLink(url)
  if (link === null) return
  const window = mainWindow
  if (window === null || window.isDestroyed() || window.webContents.isLoadingMainFrame()) {
    pendingDeepLink = url
    return
  }
  window.webContents.send(ELECTRON_CHANNELS.appDeepLink, {
    url,
    meetingNo: link.meetingNo,
  })
  if (!window.isVisible()) window.show()
  window.focus()
}

/**
 * Electron 39 起 getDisplayMedia 只能由主进程决定采哪个源（deviceId 不再生效）。
 * 渲染进程先经自定义选择器拿到 id，这里再把它兑成一次性的视频源。
 */
function registerDisplayMediaHandler(capture: SourcePicker): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      const frame = request.frame
      const owner = frame === null ? undefined : webContents.fromFrame(frame)
      const selected = owner === undefined ? null : capture.takeSelected(owner.id)
      if (selected === null) {
        // 空 Streams 等价于拒绝本次 getDisplayMedia
        callback({})
        return
      }
      callback({ video: { id: selected.id, name: selected.name } })
    },
    { useSystemPicker: false },
  )
}

function registerProtocol(): void {
  // 开发态 electron 可执行文件就是进程本身，要把入口脚本一起注册。
  const script = process.argv[1]
  if (process.defaultApp && script !== undefined) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [script])
    return
  }
  app.setAsDefaultProtocolClient(PROTOCOL)
}

async function bootstrap(): Promise<void> {
  registerProtocol()
  mainWindow = createMainWindow()
  const windows = new WindowManager({
    mainWindow,
    rendererDir: join(import.meta.dirname, '../renderer'),
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
  })
  const handlers = registerIpcHandlers({
    windows,
    storagePath: join(app.getPath('userData'), 'tongpin-storage.json'),
  })
  registerDisplayMediaHandler(handlers.capture)
  windows.onClosed((key) => {
    if (key === 'sharePicker') handlers.capture.cancel()
  })
  watchMaximize(mainWindow)

  tray = createTray({
    isPackaged: app.isPackaged,
    platform: process.platform,
    onShow: showMainWindow,
    onQuit: () => app.quit(),
  })

  const initialLink = findDeepLink(process.argv)
  if (initialLink !== null) deliverDeepLink(initialLink)

  app.on('activate', () => showMainWindow())
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    showMainWindow()
    const url = findDeepLink(argv)
    if (url !== null) deliverDeepLink(url)
  })
  app.on('open-url', (event, url) => {
    event.preventDefault()
    deliverDeepLink(url)
  })
  app.on('before-quit', () => {
    isQuitting = true
    tray?.destroy()
  })
  void app.whenReady().then(bootstrap)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
