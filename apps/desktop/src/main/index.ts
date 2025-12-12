import { join } from 'node:path'

import { app, BrowserWindow, session, shell, webContents } from 'electron'

import type { SourcePicker } from './picker'
import { registerIpcHandlers, watchMaximize } from './ipc'
import { WindowManager } from './windows'
import { mainWindowOptions } from './window-options'

function createMainWindow(): BrowserWindow {
  const preload = join(import.meta.dirname, '../preload/index.mjs')
  const window = new BrowserWindow(mainWindowOptions(process.platform, preload))

  window.once('ready-to-show', () => window.show())
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

app.whenReady().then(() => {
  const mainWindow = createMainWindow()
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
