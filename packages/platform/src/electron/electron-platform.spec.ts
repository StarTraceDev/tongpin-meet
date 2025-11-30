import { describe, expect, it, vi } from 'vitest'
import { createElectronPlatform, type ElectronBridge } from './index'
import { ELECTRON_CHANNELS } from './channels'
import type { CaptureSource, UpdateState } from '../types'

interface RecordedCall {
  channel: string
  payload: unknown
}

function createBridge(): {
  bridge: ElectronBridge
  calls: RecordedCall[]
  emit: (channel: string, payload: unknown) => void
  unsubscribed: string[]
} {
  const calls: RecordedCall[] = []
  const listeners = new Map<string, Set<(payload: unknown) => void>>()
  const unsubscribed: string[] = []

  const bridge: ElectronBridge = {
    os: 'mac',
    invoke: <T>(channel: string, payload?: unknown): Promise<T> => {
      calls.push({ channel, payload })
      if (channel === ELECTRON_CHANNELS.windowIsMaximized) return Promise.resolve(true as T)
      if (channel === ELECTRON_CHANNELS.storageGet) return Promise.resolve('stored' as T)
      if (channel === ELECTRON_CHANNELS.captureCheckPermission)
        return Promise.resolve('granted' as T)
      if (channel === ELECTRON_CHANNELS.captureRequestPermission) return Promise.resolve(true as T)
      if (channel === ELECTRON_CHANNELS.updateCheck) {
        return Promise.resolve({ status: 'idle' } as T)
      }
      if (channel === ELECTRON_CHANNELS.capturePickSource) {
        return Promise.resolve({ id: 'screen:1', name: '显示器 1', kind: 'screen' } as T)
      }
      return Promise.resolve(undefined as T)
    },
    on: (channel, listener) => {
      const set = listeners.get(channel) ?? new Set()
      set.add(listener)
      listeners.set(channel, set)
      return () => {
        set.delete(listener)
        unsubscribed.push(channel)
      }
    },
  }

  const emit = (channel: string, payload: unknown): void => {
    for (const listener of listeners.get(channel) ?? []) listener(payload)
  }

  return { bridge, calls, emit, unsubscribed }
}

describe('createElectronPlatform', () => {
  it('标记为 electron 并取桥上报的系统', () => {
    const { bridge } = createBridge()
    const platform = createElectronPlatform(bridge)
    expect(platform.kind).toBe('electron')
    expect(platform.os).toBe('mac')
    expect(platform.window.canResizeForPanel).toBe(true)
    expect(platform.storage.secure).toBe(true)
    expect(platform.update.supported).toBe(true)
  })

  it('窗口动作全部走 IPC', async () => {
    const { bridge, calls } = createBridge()
    const platform = createElectronPlatform(bridge)

    await platform.window.minimize()
    await platform.window.toggleMaximize()
    await platform.window.close()
    await platform.window.setFullscreen(true)

    expect(calls.map((call) => call.channel)).toEqual([
      ELECTRON_CHANNELS.windowMinimize,
      ELECTRON_CHANNELS.windowToggleMaximize,
      ELECTRON_CHANNELS.windowClose,
      ELECTRON_CHANNELS.windowSetFullscreen,
    ])
    expect(calls[3]?.payload).toEqual({ on: true })
    await expect(platform.window.isMaximized()).resolves.toBe(true)
  })

  it('子窗口开关传 key 与参数，关闭事件能退订', async () => {
    const { bridge, calls, emit, unsubscribed } = createBridge()
    const platform = createElectronPlatform(bridge)
    const closed = vi.fn()

    const off = platform.window.onSubClosed(closed)
    await platform.window.openSub('whiteboard', { title: '白板', width: 1200 })
    await platform.window.closeSub('whiteboard')
    emit(ELECTRON_CHANNELS.eventSubClosed, 'whiteboard')
    off()

    expect(calls[0]).toEqual({
      channel: ELECTRON_CHANNELS.windowOpenSub,
      payload: { key: 'whiteboard', opts: { title: '白板', width: 1200 } },
    })
    expect(closed).toHaveBeenCalledWith('whiteboard')
    expect(unsubscribed).toContain(ELECTRON_CHANNELS.eventSubClosed)
  })

  it('采集、存储、外壳直接映射到桥', async () => {
    const { bridge } = createBridge()
    const platform = createElectronPlatform(bridge)

    await expect(platform.capture.pickSource()).resolves.toEqual({
      id: 'screen:1',
      name: '显示器 1',
      kind: 'screen',
    } satisfies CaptureSource)
    await expect(platform.capture.checkPermission()).resolves.toBe('granted')
    await expect(platform.capture.requestPermission()).resolves.toBe(true)
    await expect(platform.storage.get('refresh')).resolves.toBe('stored')
    await expect(platform.update.check()).resolves.toEqual({ status: 'idle' } satisfies UpdateState)
  })

  it('最大化与更新状态只在载荷合法时回调', () => {
    const { bridge, emit } = createBridge()
    const platform = createElectronPlatform(bridge)
    const maximized = vi.fn()
    const updateState = vi.fn()

    platform.window.onMaximizedChange(maximized)
    platform.update.onState(updateState)
    emit(ELECTRON_CHANNELS.eventMaximizedChanged, true)
    emit(ELECTRON_CHANNELS.eventUpdateState, null)
    emit(ELECTRON_CHANNELS.eventUpdateState, { status: 'downloading', progress: 42 })

    expect(maximized).toHaveBeenCalledWith(true)
    expect(updateState).toHaveBeenCalledTimes(1)
    expect(updateState).toHaveBeenCalledWith({ status: 'downloading', progress: 42 })
  })

  it('通知点击只触发最近一次注册的回调', async () => {
    const { bridge, calls, emit } = createBridge()
    const platform = createElectronPlatform(bridge)
    const first = vi.fn()
    const second = vi.fn()

    await platform.notify.show({ title: '会议开始', body: '点击入会', onClick: first })
    await platform.notify.show({ title: '会议结束', body: '查看纪要', onClick: second })
    emit(ELECTRON_CHANNELS.eventNotifyClicked, undefined)
    emit(ELECTRON_CHANNELS.eventNotifyClicked, undefined)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(calls[0]?.payload).toEqual({ title: '会议开始', body: '点击入会', clickable: true })
  })

  it('保存文件把 Blob 转成可结构化克隆的 ArrayBuffer', async () => {
    const { bridge, calls } = createBridge()
    const platform = createElectronPlatform(bridge)
    const blob = new Blob(['hello'])

    await platform.shell.saveFile({ filename: 'minutes.txt', blob })

    const payload = calls[0]?.payload as { filename: string; bytes: ArrayBuffer }
    expect(payload.filename).toBe('minutes.txt')
    expect(new TextDecoder().decode(payload.bytes)).toBe('hello')
  })
})
