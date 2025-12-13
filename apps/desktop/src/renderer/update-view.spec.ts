import { describe, expect, it } from 'vitest'

import { updateText } from './update-view'

describe('更新状态文案', () => {
  it('检查中、最新、不可用各有明确文案', () => {
    expect(updateText({ status: 'checking' })).toBe('正在检查更新…')
    expect(updateText({ status: 'idle' })).toBe('已是最新版本。')
    expect(updateText({ status: 'unsupported' })).toContain('打包后才启用')
  })

  it('发现新版本与下载进度带上版本号、百分比', () => {
    expect(updateText({ status: 'available', version: '1.2.3' })).toBe(
      '发现新版本 1.2.3，正在下载。',
    )
    expect(updateText({ status: 'downloading', progress: 42 })).toBe('正在下载更新 42%。')
    expect(updateText({ status: 'downloading' })).toBe('正在下载更新 0%。')
  })

  it('就绪与失败提示下一步动作', () => {
    expect(updateText({ status: 'ready', version: '1.2.3' })).toBe(
      '新版本 1.2.3 已就绪，重启后安装。',
    )
    expect(updateText({ status: 'error', error: '网络不可用' })).toBe('更新失败：网络不可用')
    expect(updateText({ status: 'error' })).toBe('更新失败：未知错误')
  })
})
