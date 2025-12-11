import { contextBridge, ipcRenderer } from 'electron'

import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'

const CHANNELS = new Set<string>(Object.values(ELECTRON_CHANNELS))

const OS: 'mac' | 'win' | 'linux' =
  process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux'

const bridge = {
  os: OS,
  invoke: (channel: string, payload?: unknown): Promise<unknown> => {
    if (!CHANNELS.has(channel)) return Promise.reject(new Error(`未注册的 IPC 通道：${channel}`))
    return ipcRenderer.invoke(channel, payload) as Promise<unknown>
  },
  on: (channel: string, listener: (payload: unknown) => void): (() => void) => {
    if (!CHANNELS.has(channel)) throw new Error(`未注册的 IPC 通道：${channel}`)
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
}

contextBridge.exposeInMainWorld('tongpin', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  bridge,
})
