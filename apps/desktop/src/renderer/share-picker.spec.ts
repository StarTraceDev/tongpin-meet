import { describe, expect, it, vi } from 'vitest'

import type { CaptureSourceListing } from '@tongpin/platform'

import { renderSharePicker } from './share-picker'

const LISTINGS: CaptureSourceListing[] = [
  { id: 'screen:0:0', name: '显示器 1', kind: 'screen', thumbnail: 'data:image/png;base64,AA' },
  { id: 'window:5:0', name: '周会', kind: 'window', thumbnail: 'data:image/png;base64,BB' },
]

function setup(listings: CaptureSourceListing[] = LISTINGS): {
  root: HTMLElement
  listSources: ReturnType<typeof vi.fn>
  chooseSource: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
} {
  document.body.innerHTML = '<div id="app"></div>'
  const root = document.getElementById('app')
  if (root === null) throw new Error('缺少测试挂载点')
  return {
    root,
    listSources: vi.fn(async () => listings),
    chooseSource: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  }
}

function cards(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.source-card'))
}

describe('renderSharePicker', () => {
  it('按候选源渲染缩略图卡片', async () => {
    const { root, listSources, chooseSource, close } = setup()

    await renderSharePicker(root, { listSources, chooseSource, close }, 'session-1')

    expect(listSources).toHaveBeenCalledWith('session-1')
    const rendered = cards(root)
    expect(rendered).toHaveLength(2)
    expect(rendered.map((card) => card.querySelector('.source-name')?.textContent)).toEqual([
      '显示器 1',
      '周会',
    ])
    expect(rendered[0]?.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA')
    expect(rendered[1]?.querySelector('.source-kind')?.textContent).toBe('窗口')
    expect(root.querySelector('#picker-status')?.textContent).toContain('2')
  })

  it('点卡片回传 sourceId 并关闭窗口，重复点击只生效一次', async () => {
    const { root, listSources, chooseSource, close } = setup()
    await renderSharePicker(root, { listSources, chooseSource, close }, 'session-1')

    const first = cards(root)[0]
    first?.click()
    first?.click()

    await vi.waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1)
    })
    expect(chooseSource).toHaveBeenCalledTimes(1)
    expect(chooseSource).toHaveBeenCalledWith('session-1', 'screen:0:0')
    expect(first?.getAttribute('aria-selected')).toBe('true')
  })

  it('取消按钮回传 null', async () => {
    const { root, listSources, chooseSource, close } = setup()
    await renderSharePicker(root, { listSources, chooseSource, close }, 'session-1')

    root.querySelector<HTMLButtonElement>('#pick-cancel')?.click()

    await vi.waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1)
    })
    expect(chooseSource).toHaveBeenCalledWith('session-1', null)
  })

  it('Esc 等同取消', async () => {
    const { root, listSources, chooseSource, close } = setup()
    await renderSharePicker(root, { listSources, chooseSource, close }, 'session-2')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await vi.waitFor(() => {
      expect(chooseSource).toHaveBeenCalledWith('session-2', null)
    })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('没有候选源时给出提示且不渲染卡片', async () => {
    const { root, listSources, chooseSource, close } = setup([])

    await renderSharePicker(root, { listSources, chooseSource, close }, 'session-1')

    expect(root.querySelector('#picker-status')?.textContent).toBe('没有可共享的屏幕或窗口。')
    expect(cards(root)).toHaveLength(0)
  })

  it('列表读取失败时提示重试，不静默失败', async () => {
    const { root, chooseSource, close } = setup()

    await renderSharePicker(
      root,
      { listSources: vi.fn(async () => Promise.reject(new Error('boom'))), chooseSource, close },
      'session-1',
    )

    expect(root.querySelector('#picker-status')?.textContent).toContain('读取共享源失败')
    expect(cards(root)).toHaveLength(0)
  })
})
