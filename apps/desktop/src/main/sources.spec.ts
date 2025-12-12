import { describe, expect, it } from 'vitest'

import { sourceKind, toCaptureListings, type DesktopSourceLike } from './sources'

function source(
  id: string,
  name: string,
  dataUrl = `data:image/png;base64,${id}`,
): DesktopSourceLike {
  return { id, name, thumbnail: { toDataURL: () => dataUrl } }
}

describe('sourceKind', () => {
  it('按 id 前缀区分屏幕与窗口', () => {
    expect(sourceKind('screen:0:0')).toBe('screen')
    expect(sourceKind('window:42:0')).toBe('window')
  })
})

describe('toCaptureListings', () => {
  it('屏幕优先，同类型按名称排序，缩略图转 data URL', () => {
    const listings = toCaptureListings([
      source('window:2:0', '终端'),
      source('screen:1:0', '显示器 2'),
      source('window:1:0', '编辑器'),
      source('screen:0:0', '显示器 1'),
    ])

    expect(listings.map((item) => item.name)).toEqual(['显示器 1', '显示器 2', '编辑器', '终端'])
    expect(listings.map((item) => item.kind)).toEqual(['screen', 'screen', 'window', 'window'])
    expect(listings[0]?.thumbnail).toBe('data:image/png;base64,screen:0:0')
  })

  it('标题为空时给可读兜底，并去掉首尾空白', () => {
    const listings = toCaptureListings([
      source('window:9:0', '   '),
      source('screen:0:0', ''),
      source('window:8:0', '  周会  '),
    ])
    const names = listings.map((item) => item.name)

    expect(listings).toHaveLength(3)
    expect(names).toContain('未命名屏幕')
    expect(names).toContain('未命名窗口')
    expect(names).toContain('周会')
  })

  it('没有源时返回空数组', () => {
    expect(toCaptureListings([])).toEqual([])
  })
})
