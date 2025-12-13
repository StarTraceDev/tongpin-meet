import type { BrowserWindow } from 'electron'
import type { AppUpdater } from 'electron-updater'

import type { UpdateState } from '@tongpin/platform'
import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

import { mapUpdateEvent } from './update-state'

export interface UpdaterOptions {
  isPackaged: boolean
  feedUrl?: string
  getWindow: () => BrowserWindow | null
}

export interface UpdaterController {
  status: () => UpdateState
  check: () => Promise<UpdateState>
  install: () => Promise<void>
}

type UpdaterModule = { autoUpdater: AppUpdater }

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * electron-updater 只在打包后、且配置了更新源时加载：
 * 开发态没有 app-update.yml，提前 import 会让 checkForUpdates 直接抛错。
 */
export function createUpdater(options: UpdaterOptions): UpdaterController {
  let loaded: UpdaterModule | null = null
  let current: UpdateState = { status: options.isPackaged ? 'idle' : 'unsupported' }

  const broadcast = (state: UpdateState): void => {
    current = state
    const window = options.getWindow()
    if (window !== null && !window.isDestroyed()) {
      window.webContents.send(ELECTRON_CHANNELS.eventUpdateState, state)
    }
  }

  const load = async (): Promise<UpdaterModule> => {
    if (loaded !== null) return loaded
    const module: UpdaterModule = await import('electron-updater')
    const { autoUpdater } = module
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    if (options.feedUrl !== undefined && options.feedUrl !== '') {
      autoUpdater.setFeedURL({ provider: 'generic', url: options.feedUrl })
    }
    autoUpdater.on('checking-for-update', () => broadcast(mapUpdateEvent({ type: 'checking' })))
    autoUpdater.on('update-available', (info) =>
      broadcast(mapUpdateEvent({ type: 'available', version: info.version })),
    )
    autoUpdater.on('update-not-available', () =>
      broadcast(mapUpdateEvent({ type: 'not-available' })),
    )
    autoUpdater.on('download-progress', (progress) =>
      broadcast(mapUpdateEvent({ type: 'progress', percent: progress.percent })),
    )
    autoUpdater.on('update-downloaded', (info) =>
      broadcast(mapUpdateEvent({ type: 'downloaded', version: info.version })),
    )
    autoUpdater.on('error', (error) =>
      broadcast(mapUpdateEvent({ type: 'error', message: reasonOf(error) })),
    )
    loaded = module
    return module
  }

  const check = async (): Promise<UpdateState> => {
    if (!options.isPackaged) return current
    if (options.feedUrl === undefined || options.feedUrl === '') {
      broadcast({ status: 'error', error: '未配置更新源（TONGPIN_UPDATE_URL）' })
      return current
    }
    try {
      const module = await load()
      await module.autoUpdater.checkForUpdates()
    } catch (error) {
      broadcast(mapUpdateEvent({ type: 'error', message: reasonOf(error) }))
    }
    return current
  }

  const install = async (): Promise<void> => {
    if (!options.isPackaged || current.status !== 'ready') return
    const module = await load()
    module.autoUpdater.quitAndInstall()
  }

  return { status: () => current, check, install }
}
