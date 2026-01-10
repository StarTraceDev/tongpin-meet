import type {
  CapturePort,
  CaptureSource,
  NotifyPort,
  Platform,
  ShellPort,
  StoragePort,
  SubWindowKey,
  SubWindowOptions,
  UpdatePort,
  WindowPort,
} from '../types'

export interface WebPlatformOptions {
  /** localStorage 键前缀，默认 'tongpin:' */
  storagePrefix?: string
  /** 覆盖层路由由壳注入；不注入时只派发 DOM 事件，由 app-core 的覆盖层监听 */
  subWindows?: {
    open?: (key: SubWindowKey, opts: SubWindowOptions) => void
    close?: (key: SubWindowKey) => void
  }
}

const SUB_EVENT = 'tongpin:sub'

function noopUnsubscribe(): () => void {
  return () => undefined
}

/** 05 §3.5：Web 降级实现。业务代码只看到 Port，看不到这些分支 */
export function createWebPlatform(options: WebPlatformOptions = {}): Platform {
  const prefix = options.storagePrefix ?? 'tongpin:'
  const subClosed = new Set<(key: SubWindowKey) => void>()
  const activeSubs = new Set<SubWindowKey>()
  const maximizedListeners = new Set<(value: boolean) => void>()
  let captureStream: MediaStream | null = null

  const onFullscreenChange = (): void => {
    const maximized = document.fullscreenElement !== null
    for (const listener of maximizedListeners) listener(maximized)
  }
  document.addEventListener('fullscreenchange', onFullscreenChange)

  const notifySubClosed = (key: SubWindowKey): void => {
    for (const listener of subClosed) listener(key)
    globalThis.dispatchEvent(new CustomEvent(`${SUB_EVENT}:closed`, { detail: { key } }))
  }

  const windowPort: WindowPort = {
    // 浏览器控制条自己管最小化/最大化，这些方法保留为空实现
    minimize: async () => undefined,
    toggleMaximize: async () => undefined,
    close: async () => {
      globalThis.close()
    },
    isMaximized: async () => false,
    setFullscreen: async (on) => {
      if (on) {
        await document.documentElement.requestFullscreen?.()
      } else if (document.fullscreenElement !== null) {
        await document.exitFullscreen?.()
      }
    },
    onMaximizedChange: (cb) => {
      maximizedListeners.add(cb)
      return () => {
        maximizedListeners.delete(cb)
      }
    },
    openSub: async (key, opts) => {
      activeSubs.add(key)
      options.subWindows?.open?.(key, opts)
      globalThis.dispatchEvent(new CustomEvent(`${SUB_EVENT}:open`, { detail: { key, opts } }))
    },
    closeSub: async (key) => {
      if (!activeSubs.delete(key)) return
      options.subWindows?.close?.(key)
      notifySubClosed(key)
    },
    closeAllSubs: async () => {
      for (const key of [...activeSubs]) {
        activeSubs.delete(key)
        options.subWindows?.close?.(key)
        notifySubClosed(key)
      }
    },
    onSubClosed: (cb) => {
      subClosed.add(cb)
      return () => {
        subClosed.delete(cb)
      }
    },
  }

  const capture: CapturePort = {
    pickSource: async () => {
      if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') return null
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      captureStream = stream
      const track = stream.getVideoTracks()[0]
      stream.getVideoTracks().forEach((item) => {
        item.addEventListener('ended', () => {
          if (captureStream === stream) captureStream = null
        })
      })
      const source: CaptureSource = {
        id: track?.id ?? 'display',
        name: track?.label !== undefined && track.label !== '' ? track.label : '屏幕共享',
        kind: 'screen',
        stream,
      }
      return source
    },
    // 浏览器没有自定义选择器：选源由系统弹窗完成，这两条只服务 Electron 的 sharePicker 窗口
    listSources: async () => null,
    chooseSource: async () => undefined,
    checkPermission: async () => {
      if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') return 'unknown'
      // 浏览器只在真正共享时弹授权，这里只能判断 API 与安全上下文
      return globalThis.isSecureContext === false ? 'denied' : 'granted'
    },
    requestPermission: async () => {
      const state = await capture.checkPermission()
      return state === 'granted'
    },
    stop: async () => {
      captureStream?.getTracks().forEach((track) => track.stop())
      captureStream = null
    },
  }

  const storage: StoragePort = {
    secure: false,
    get: async (key) => {
      try {
        return globalThis.localStorage.getItem(`${prefix}${key}`)
      } catch {
        return null
      }
    },
    set: async (key, value) => {
      globalThis.localStorage.setItem(`${prefix}${key}`, value)
    },
    remove: async (key) => {
      globalThis.localStorage.removeItem(`${prefix}${key}`)
    },
  }

  const update: UpdatePort = {
    supported: false,
    check: async () => ({ status: 'unsupported' }),
    install: async () => {
      throw new Error('Web 端不支持自动更新')
    },
    onState: () => noopUnsubscribe(),
  }

  const notify: NotifyPort = {
    show: async ({ title, body, onClick }) => {
      if (typeof globalThis.Notification !== 'function') return
      if (globalThis.Notification.permission === 'default') {
        await globalThis.Notification.requestPermission()
      }
      if (globalThis.Notification.permission !== 'granted') return
      const notification = new globalThis.Notification(title, { body })
      if (onClick !== undefined) {
        notification.onclick = (): void => {
          onClick()
        }
      }
    },
    setBadge: async (count) => {
      const base = document.title.replace(/^\(\d+\)\s*/, '')
      document.title = count > 0 ? `(${count}) ${base}` : base
    },
  }

  const shell: ShellPort = {
    openExternal: async (url) => {
      globalThis.open(url, '_blank', 'noopener,noreferrer')
    },
    saveFile: async ({ filename, blob }) => {
      const href = globalThis.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = filename
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      globalThis.setTimeout(() => {
        globalThis.URL.revokeObjectURL(href)
      }, 1000)
    },
  }

  return {
    kind: 'web',
    os: 'web',
    window: windowPort,
    capture,
    storage,
    update,
    notify,
    shell,
  }
}
