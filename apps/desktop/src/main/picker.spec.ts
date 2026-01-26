import { afterEach, describe, expect, it, vi } from 'vitest'

import { SourcePicker, type SourcePickerOptions } from './picker'
import type { DesktopSourceLike } from './sources'

const SOURCES: DesktopSourceLike[] = [
  { id: 'window:5:0', name: '周会', thumbnail: { toDataURL: () => 'data:window' } },
  { id: 'screen:0:0', name: '显示器 1', thumbnail: { toDataURL: () => 'data:screen' } },
]

interface Harness {
  picker: SourcePicker
  opened: string[]
  closed: () => number
}

function setup(overrides: Partial<SourcePickerOptions> = {}): Harness {
  let seq = 0
  let closedCount = 0
  const opened: string[] = []
  const picker = new SourcePicker({
    listSources: async (): Promise<DesktopSourceLike[]> => SOURCES,
    openPicker: (sessionId: string): void => {
      opened.push(sessionId)
    },
    closePicker: (): void => {
      closedCount += 1
    },
    createSessionId: (): string => `session-${++seq}`,
    timeoutMs: 120_000,
    ...overrides,
  })
  return { picker, opened, closed: () => closedCount }
}

async function startPick(harness: Harness, ownerId = 7): Promise<{ result: Promise<unknown> }> {
  const result = harness.picker.pick(ownerId)
  await vi.waitFor(() => {
    expect(harness.opened).toHaveLength(1)
  })
  return { result }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SourcePicker', () => {
  it('打开选择器、按 session 返回列表，选中后把结果交给调用方', async () => {
    const harness = setup()
    const { result } = await startPick(harness)

    expect(harness.opened).toEqual(['session-1'])
    expect(harness.picker.list('session-1')?.map((item) => item.name)).toEqual(['显示器 1', '周会'])
    expect(harness.picker.list('session-2')).toBeNull()
    expect(harness.picker.settle('session-2', 'screen:0:0')).toBe(false)
    expect(harness.picker.settle('session-1', 'window:5:0')).toBe(true)

    await expect(result).resolves.toMatchObject({ id: 'window:5:0', name: '周会' })
    // 窗口留给渲染层在拿到 IPC 回执后自己关，避免回执还没发出去窗口就没了
    expect(harness.closed()).toBe(0)
  })

  it('白板/音频/文档这些非采集模式也能回传，并带出伪源', async () => {
    const harness = setup()
    const { result } = await startPick(harness)

    expect(harness.picker.settle('session-1', 'whiteboard')).toBe(true)

    await expect(result).resolves.toMatchObject({ id: 'whiteboard', name: '白板' })
    expect(harness.picker.takeSelected(7)).toEqual({ id: 'whiteboard', name: '白板' })
  })

  it('取消按钮回传 null，不留下待消费的源', async () => {
    const harness = setup()
    const { result } = await startPick(harness)

    expect(harness.picker.settle('session-1', null)).toBe(true)
    await expect(result).resolves.toBeNull()
    expect(harness.picker.takeSelected(7)).toBeNull()
  })

  it('直接关窗时 resolves null 并主动收窗口', async () => {
    const harness = setup()
    const { result } = await startPick(harness)

    harness.picker.cancel()

    await expect(result).resolves.toBeNull()
    expect(harness.closed()).toBe(1)
    expect(harness.picker.list('session-1')).toBeNull()
  })

  it('超时按取消处理', async () => {
    vi.useFakeTimers()
    const harness = setup({ timeoutMs: 5_000 })
    const result = harness.picker.pick(7)
    await vi.advanceTimersByTimeAsync(0)

    await vi.advanceTimersByTimeAsync(5_000)

    await expect(result).resolves.toBeNull()
    expect(harness.closed()).toBe(1)
  })

  it('已有选择器时不再开第二个', async () => {
    const harness = setup()
    const { result: first } = await startPick(harness)

    await expect(harness.picker.pick(8)).resolves.toBeNull()
    expect(harness.opened).toHaveLength(1)
    harness.picker.cancel()
    await first
  })

  it('选中的源只能被发起者消费一次，且会过期', async () => {
    let now = 10_000
    const harness = setup({ now: () => now })
    const { result: first } = await startPick(harness)
    harness.picker.settle('session-1', 'screen:0:0')
    await first

    expect(harness.picker.takeSelected(8)).toBeNull()
    expect(harness.picker.takeSelected(7)).toEqual({ id: 'screen:0:0', name: '显示器 1' })
    expect(harness.picker.takeSelected(7)).toBeNull()

    const { result: second } = await startPick(harness)
    harness.picker.settle('session-2', 'window:5:0')
    await second
    now += 60_001

    expect(harness.picker.takeSelected(7)).toBeNull()
  })

  it('停止共享会取消进行中的选择器并清掉未消费的源', async () => {
    const harness = setup()
    const { result } = await startPick(harness)

    harness.picker.release(7)

    await expect(result).resolves.toBeNull()
    expect(harness.closed()).toBe(1)
  })

  it('没有候选源时不开窗', async () => {
    const harness = setup({ listSources: async () => [] })

    await expect(harness.picker.pick(7)).resolves.toBeNull()
    expect(harness.opened).toEqual([])
  })
})
