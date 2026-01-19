import type { CaptureSourceListing, Platform } from '@tongpin/platform'
import { createWebPlatform } from '@tongpin/platform/web'
import { providePlatform } from '@tongpin/app-core'
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SharePicker from './SharePicker.vue'

const LISTINGS: CaptureSourceListing[] = [
  { id: 'screen:0:0', name: '显示器 1', kind: 'screen', thumbnail: 'data:image/png;base64,AA' },
  { id: 'window:5:0', name: '周会', kind: 'window', thumbnail: 'data:image/png;base64,BB' },
]

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

let mounted: App | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
})

async function setup(
  listSources: (sessionId: string) => Promise<CaptureSourceListing[] | null> = async () => LISTINGS,
): Promise<{ platform: Platform; root: HTMLElement }> {
  document.body.innerHTML = '<div id="app"></div>'
  const platform = createWebPlatform()
  vi.spyOn(platform.capture, 'listSources').mockImplementation(listSources)
  vi.spyOn(platform.capture, 'chooseSource').mockResolvedValue(undefined)
  vi.spyOn(platform.window, 'closeSub').mockResolvedValue(undefined)

  const app = createApp(SharePicker, { payload: { sessionId: 'session-1' } })
  providePlatform(app, platform)
  app.mount('#app')
  mounted = app
  await nextTick()
  await flush()

  const root = document.getElementById('app')
  if (root === null) throw new Error('缺少测试挂载点')
  return { platform, root }
}

function cards(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.source-card'))
}

function primary(root: HTMLElement): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>('.btn.primary')
}

describe('SharePicker', () => {
  it('渲染 4 个共享类型与候选源缩略图', async () => {
    const { platform, root } = await setup()

    expect(platform.capture.listSources).toHaveBeenCalledWith('session-1')
    expect(root.querySelectorAll('.mode-card')).toHaveLength(4)
    expect(cards(root)).toHaveLength(2)
    expect(root.querySelector('.source-name')?.textContent).toBe('显示器 1')
    expect(root.querySelector('.source-card img')?.getAttribute('src')).toBe(
      'data:image/png;base64,AA',
    )
    expect(primary(root)?.textContent).toContain('开始共享')
  })

  it('选中卡片后点「开始共享」把 sourceId 交回主进程并关窗', async () => {
    const { platform, root } = await setup()

    cards(root)[1]?.click()
    await flush()
    primary(root)?.click()
    await flush()

    expect(platform.capture.chooseSource).toHaveBeenCalledWith('session-1', 'window:5:0')
    expect(platform.window.closeSub).toHaveBeenCalledWith('sharePicker')
  })

  it('选「白板」时回传 whiteboard', async () => {
    const { platform, root } = await setup()

    root.querySelectorAll<HTMLButtonElement>('.mode-card')[1]?.click()
    await flush()
    primary(root)?.click()
    await flush()

    expect(platform.capture.chooseSource).toHaveBeenCalledWith('session-1', 'whiteboard')
  })

  it('取消传 null，避免主进程一直等', async () => {
    const { platform, root } = await setup()

    root.querySelector<HTMLButtonElement>('.btn.ghost')?.click()
    await flush()

    expect(platform.capture.chooseSource).toHaveBeenCalledWith('session-1', null)
  })

  it('没有可共享源时给出提示', async () => {
    const { root } = await setup(async () => [])

    expect(cards(root)).toHaveLength(0)
    expect(root.querySelector('.picker-empty')?.textContent).toContain('没有可共享')
  })
})
