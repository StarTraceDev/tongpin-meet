import { join } from 'node:path'

import { BrowserWindow } from 'electron'

import type { SubWindowKey, SubWindowOptions } from '@tongpin/platform'

const SUB_WINDOW_DEFAULTS: Record<SubWindowKey, { width: number; height: number }> = {
  join: { width: 480, height: 640 },
  schedule: { width: 720, height: 760 },
  sharePicker: { width: 960, height: 640 },
  whiteboard: { width: 1280, height: 800 },
}

export interface WindowManagerOptions {
  mainWindow: BrowserWindow
  rendererDir: string
  /** 开发态由 electron-vite 注入，生产态为 file:// 目录 */
  rendererUrl?: string
}

/** 10.2：窗口池按 key 去重；子窗口关闭时通知主窗口，渲染层不用轮询。 */
export class WindowManager {
  private readonly subs = new Map<SubWindowKey, BrowserWindow>()
  private readonly closedListeners = new Set<(key: SubWindowKey) => void>()

  constructor(private readonly opts: WindowManagerOptions) {}

  get main(): BrowserWindow {
    return this.opts.mainWindow
  }

  /** 子窗口被用户直接关掉时（没走 closeSub）主进程也需要知道，用于取消选择器会话 */
  onClosed(listener: (key: SubWindowKey) => void): () => void {
    this.closedListeners.add(listener)
    return () => this.closedListeners.delete(listener)
  }

  openSub(key: SubWindowKey, options: SubWindowOptions = {}): void {
    const existing = this.subs.get(key)
    if (existing !== undefined && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore()
      existing.focus()
      return
    }

    const size = SUB_WINDOW_DEFAULTS[key]
    const window = new BrowserWindow({
      width: options.width ?? size.width,
      height: options.height ?? size.height,
      title: options.title ?? '',
      parent: this.opts.mainWindow,
      show: false,
      webPreferences: {
        preload: join(this.opts.rendererDir, '../preload/index.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    const query = new URLSearchParams({ sub: key })
    if (options.payload !== undefined) query.set('payload', JSON.stringify(options.payload))
    const target = this.opts.rendererUrl ?? `file://${join(this.opts.rendererDir, 'index.html')}`
    void window.loadURL(`${target}?${query.toString()}`)

    window.once('ready-to-show', () => window.show())
    window.on('closed', () => {
      this.subs.delete(key)
      const main = this.opts.mainWindow
      if (!main.isDestroyed()) main.webContents.send('window:sub-closed', key)
      for (const listener of this.closedListeners) listener(key)
    })
    this.subs.set(key, window)
  }

  closeSub(key: SubWindowKey): void {
    const window = this.subs.get(key)
    if (window === undefined) return
    window.close()
  }

  closeAllSubs(): void {
    for (const window of [...this.subs.values()]) window.close()
  }
}
