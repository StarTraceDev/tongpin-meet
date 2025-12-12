import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubWindowKey } from '../types'
import { createWebPlatform } from './index'

function fakeStream(label = '屏幕 1'): MediaStream {
  const track = {
    id: 'track-1',
    label,
    addEventListener: vi.fn(),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
}

describe('createWebPlatform', () => {
  beforeEach(() => {
    localStorage.clear()
    document.title = '同频会议'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('kind/os 为 web，六个 Port 齐全', () => {
    const platform = createWebPlatform()
    expect(platform.kind).toBe('web')
    expect(platform.os).toBe('web')
    expect(platform.window.canResizeForPanel).toBe(false)
    expect(platform.storage.secure).toBe(false)
    expect(platform.update.supported).toBe(false)
  })

  it('storage 走 localStorage 并加前缀', async () => {
    const platform = createWebPlatform({ storagePrefix: 'test:' })
    await platform.storage.set('token', 'abc')
    expect(localStorage.getItem('test:token')).toBe('abc')
    await expect(platform.storage.get('token')).resolves.toBe('abc')
    await platform.storage.remove('token')
    expect(localStorage.getItem('test:token')).toBeNull()
  })

  it('update 不支持自动更新，check 返回 unsupported', async () => {
    const platform = createWebPlatform()
    await expect(platform.update.check()).resolves.toEqual({ status: 'unsupported' })
    await expect(platform.update.install()).rejects.toThrow('Web 端不支持自动更新')
    expect(typeof platform.update.onState(() => undefined)).toBe('function')
  })

  it('openSub 可被壳捕获，closeSub 触发 onSubClosed', async () => {
    const opened: SubWindowKey[] = []
    const closed: SubWindowKey[] = []
    const platform = createWebPlatform({ subWindows: { open: (key) => opened.push(key) } })
    platform.window.onSubClosed((key) => closed.push(key))
    await platform.window.openSub('join', { title: '加入会议' })
    await platform.window.openSub('whiteboard', {})
    expect(opened).toEqual(['join', 'whiteboard'])
    await platform.window.closeSub('join')
    expect(closed).toEqual(['join'])
    await platform.window.closeAllSubs()
    expect(closed).toEqual(['join', 'whiteboard'])
  })

  it('capture 用 getDisplayMedia，stop 停止轨道', async () => {
    const stream = fakeStream('窗口 A')
    const getDisplayMedia = vi.fn(async () => stream)
    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia } })
    const platform = createWebPlatform()
    const source = await platform.capture.pickSource()
    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false })
    expect(source?.name).toBe('窗口 A')
    expect(source?.stream).toBe(stream)
    await platform.capture.stop()
    const stopped = stream.getTracks()[0]?.stop as unknown as ReturnType<typeof vi.fn>
    expect(stopped).toHaveBeenCalled()
  })

  it('没有 getDisplayMedia 时 pickSource 返回 null、权限为 unknown', async () => {
    vi.stubGlobal('navigator', {})
    const platform = createWebPlatform()
    await expect(platform.capture.pickSource()).resolves.toBeNull()
    await expect(platform.capture.checkPermission()).resolves.toBe('unknown')
    // 自定义选择器只在 Electron 壳里存在，Web 端两个辅助方法都降级为空
    await expect(platform.capture.listSources('session-1')).resolves.toBeNull()
    await expect(platform.capture.chooseSource('session-1', null)).resolves.toBeUndefined()
  })

  it('notify.show 在已授权时弹系统通知', async () => {
    const instances: Array<{ title: string; body?: string }> = []
    class FakeNotification {
      static permission: NotificationPermission = 'granted'
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
      onclick: (() => void) | null = null
      constructor(
        public title: string,
        public options?: { body?: string },
      ) {
        instances.push({ title, body: options?.body })
      }
    }
    vi.stubGlobal('Notification', FakeNotification)
    const platform = createWebPlatform()
    await platform.notify.show({ title: '会议开始', body: '产品评审' })
    expect(instances).toEqual([{ title: '会议开始', body: '产品评审' }])
  })

  it('setBadge 写标题前缀并可清除', async () => {
    const platform = createWebPlatform()
    await platform.notify.setBadge(3)
    expect(document.title).toBe('(3) 同频会议')
    await platform.notify.setBadge(0)
    expect(document.title).toBe('同频会议')
  })

  it('saveFile 用 Blob + <a download> 落盘', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const platform = createWebPlatform()
    await platform.shell.saveFile({ filename: '纪要.txt', blob: new Blob(['hi']) })
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
  })

  it('openExternal 新窗口打开且带 noopener', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    const platform = createWebPlatform()
    await platform.shell.openExternal('https://tongpin.dev')
    expect(open).toHaveBeenCalledWith('https://tongpin.dev', '_blank', 'noopener,noreferrer')
  })
})
