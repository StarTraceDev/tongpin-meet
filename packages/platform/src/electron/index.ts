import type {
  CapturePort,
  CaptureSource,
  NotifyPort,
  Platform,
  PlatformOs,
  ShellPort,
  StoragePort,
  SubWindowKey,
  SubWindowOptions,
  UpdatePort,
  UpdateState,
  WindowPort,
} from '../types'
import { ELECTRON_CHANNELS } from './channels'

export { ELECTRON_CHANNELS, type ElectronChannel } from './channels'

/**
 * preload 暴露给渲染进程的最小桥：
 * - `invoke` 对应 ipcRenderer.invoke，主进程返回 JSON 可序列化结果
 * - `on` 订阅主进程推送，返回退订函数
 *
 * 业务代码不接触它，只有 `createElectronPlatform` 用。
 */
export interface ElectronBridge {
  readonly os: Exclude<PlatformOs, 'web'>
  invoke<T = undefined>(channel: string, payload?: unknown): Promise<T>
  on(channel: string, listener: (payload: unknown) => void): () => void
}

/**
 * 05 §3.4/§3.5：Electron 端实现。窗口、采集、存储、更新、通知、外壳都走 IPC，
 * 渲染进程因此不需要 import electron，也不需要判断 process.platform。
 */
export function createElectronPlatform(bridge: ElectronBridge): Platform {
  let pendingNotifyClick: (() => void) | undefined

  const window: WindowPort = {
    minimize: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.windowMinimize),
    toggleMaximize: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.windowToggleMaximize),
    close: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.windowClose),
    isMaximized: (): Promise<boolean> =>
      bridge.invoke<boolean>(ELECTRON_CHANNELS.windowIsMaximized).then((value) => value === true),
    setFullscreen: (on: boolean): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.windowSetFullscreen, { on }),
    onMaximizedChange: (cb: (value: boolean) => void): (() => void) =>
      bridge.on(ELECTRON_CHANNELS.eventMaximizedChanged, (payload) => cb(payload === true)),
    openSub: (key: SubWindowKey, opts: SubWindowOptions): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.windowOpenSub, { key, opts }),
    closeSub: (key: SubWindowKey): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.windowCloseSub, { key }),
    closeAllSubs: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.windowCloseAllSubs),
    onSubClosed: (cb: (key: SubWindowKey) => void): (() => void) =>
      bridge.on(ELECTRON_CHANNELS.eventSubClosed, (payload) => cb(payload as SubWindowKey)),
    canResizeForPanel: true,
  }

  const capture: CapturePort = {
    pickSource: (): Promise<CaptureSource | null> =>
      bridge.invoke<CaptureSource | null>(ELECTRON_CHANNELS.capturePickSource),
    checkPermission: (): Promise<'granted' | 'denied' | 'unknown'> =>
      bridge.invoke<'granted' | 'denied' | 'unknown'>(ELECTRON_CHANNELS.captureCheckPermission),
    requestPermission: (): Promise<boolean> =>
      bridge
        .invoke<boolean>(ELECTRON_CHANNELS.captureRequestPermission)
        .then((value) => value === true),
    stop: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.captureStop),
  }

  const storage: StoragePort = {
    get: (key: string): Promise<string | null> =>
      bridge.invoke<string | null>(ELECTRON_CHANNELS.storageGet, { key }),
    set: (key: string, value: string): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.storageSet, { key, value }),
    remove: (key: string): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.storageRemove, { key }),
    secure: true,
  }

  const update: UpdatePort = {
    supported: true,
    check: (): Promise<UpdateState> => bridge.invoke<UpdateState>(ELECTRON_CHANNELS.updateCheck),
    install: (): Promise<void> => bridge.invoke(ELECTRON_CHANNELS.updateInstall),
    onState: (cb: (state: UpdateState) => void): (() => void) =>
      bridge.on(ELECTRON_CHANNELS.eventUpdateState, (payload) => {
        if (payload === null || typeof payload !== 'object' || !('status' in payload)) {
          return
        }
        cb(payload as UpdateState)
      }),
  }

  // 通知点击无法跨 IPC 回传回调：主进程推 `notify:clicked`，适配器记住最近一次 onClick。
  bridge.on(ELECTRON_CHANNELS.eventNotifyClicked, () => {
    const handler = pendingNotifyClick
    pendingNotifyClick = undefined
    handler?.()
  })

  const notify: NotifyPort = {
    show: async (opts: { title: string; body: string; onClick?: () => void }): Promise<void> => {
      pendingNotifyClick = opts.onClick
      await bridge.invoke(ELECTRON_CHANNELS.notifyShow, {
        title: opts.title,
        body: opts.body,
        clickable: opts.onClick !== undefined,
      })
    },
    setBadge: (count: number): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.notifySetBadge, { count: Math.max(0, count) }),
  }

  const shell: ShellPort = {
    openExternal: (url: string): Promise<void> =>
      bridge.invoke(ELECTRON_CHANNELS.shellOpenExternal, { url }),
    saveFile: (opts: { filename: string; blob: Blob }): Promise<void> => {
      return opts.blob.arrayBuffer().then((buffer) =>
        bridge.invoke(ELECTRON_CHANNELS.shellSaveFile, {
          filename: opts.filename,
          bytes: buffer,
        }),
      )
    },
  }

  return {
    kind: 'electron',
    os: bridge.os,
    window,
    capture,
    storage,
    update,
    notify,
    shell,
  }
}
