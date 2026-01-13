import { beforeEach, describe, expect, it, vi } from 'vitest'

const created: FakeWindow[] = []

class FakeWindow {
  destroyed = false
  minimized = false
  focused = false
  shown = false
  loaded: string | undefined
  handlers = new Map<string, () => void>()
  webContents = { send: vi.fn() }

  constructor(public options: Record<string, unknown>) {
    created.push(this)
  }

  static getAllWindows(): FakeWindow[] {
    return created.filter((window) => !window.isDestroyed())
  }

  isDestroyed(): boolean {
    return this.destroyed
  }
  isMinimized(): boolean {
    return this.minimized
  }
  restore(): void {
    this.minimized = false
  }
  focus(): void {
    this.focused = true
  }
  show(): void {
    this.shown = true
  }
  loadURL(url: string): Promise<void> {
    this.loaded = url
    return Promise.resolve()
  }
  once(event: string, handler: () => void): void {
    this.handlers.set(event, handler)
  }
  on(event: string, handler: () => void): void {
    this.handlers.set(event, handler)
  }
  close(): void {
    this.destroyed = true
    this.handlers.get('closed')?.()
  }
}

vi.mock('electron', () => ({ BrowserWindow: FakeWindow }))

const { WindowManager } = await import('./windows')

function manager(): InstanceType<typeof WindowManager> {
  const main = new FakeWindow({})
  return new WindowManager({
    mainWindow: main as never,
    rendererDir: '/app/out/renderer',
    rendererUrl: 'http://localhost:5173/',
  })
}

beforeEach(() => {
  created.splice(0)
})

describe('WindowManager', () => {
  it('同一 key 只开一个子窗口，重复打开只聚焦', () => {
    const windows = manager()
    windows.openSub('join', { title: '入会' })
    windows.openSub('join', { title: '入会' })
    expect(created).toHaveLength(2) // 1 个主窗口 + 1 个子窗口
    expect(created[1]?.focused).toBe(true)
  })

  it('子窗口带 key 与 payload 加载渲染层', () => {
    const windows = manager()
    windows.openSub('sharePicker', { payload: { meetingId: 'm1' } })
    expect(created[1]?.loaded).toBe(
      'http://localhost:5173/?sub=sharePicker&payload=%7B%22meetingId%22%3A%22m1%22%7D',
    )
  })

  it('关闭子窗口通知主窗口并允许重开', () => {
    const windows = manager()
    windows.openSub('schedule')
    const sub = created[1]
    windows.closeSub('schedule')
    expect(sub?.destroyed).toBe(true)
    expect(created[0]?.webContents.send).toHaveBeenCalledWith('window:sub-closed', 'schedule')
    windows.openSub('schedule')
    expect(created).toHaveLength(3)
  })
})
