import { join } from 'node:path'

import { app, BrowserWindow, shell } from 'electron'

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

app.whenReady().then(() => {
  const mainWindow = createMainWindow()
  const windows = new WindowManager({
    mainWindow,
    rendererDir: join(import.meta.dirname, '../renderer'),
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
  })
  registerIpcHandlers({
    windows,
    storagePath: join(app.getPath('userData'), 'tongpin-storage.json'),
  })
  watchMaximize(mainWindow)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
