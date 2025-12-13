import { describe, expect, it } from 'vitest'

import { mapUpdateEvent } from './update-state'

describe('更新状态映射', () => {
  it('检查中与无更新都回到可再次检查的状态', () => {
    expect(mapUpdateEvent({ type: 'checking' })).toEqual({ status: 'checking' })
    expect(mapUpdateEvent({ type: 'not-available' })).toEqual({ status: 'idle' })
  })

  it('发现新版本时带上版本号', () => {
    expect(mapUpdateEvent({ type: 'available', version: '1.2.3' })).toEqual({
      status: 'available',
      version: '1.2.3',
    })
  })

  it('下载进度取整并夹在 0 到 100 之间', () => {
    expect(mapUpdateEvent({ type: 'progress', percent: 42.6 })).toEqual({
      status: 'downloading',
      progress: 43,
    })
    expect(mapUpdateEvent({ type: 'progress', percent: -5 })).toEqual({
      status: 'downloading',
      progress: 0,
    })
    expect(mapUpdateEvent({ type: 'progress', percent: 160 })).toEqual({
      status: 'downloading',
      progress: 100,
    })
  })

  it('下载完成可安装，失败透出原因', () => {
    expect(mapUpdateEvent({ type: 'downloaded', version: '1.2.3' })).toEqual({
      status: 'ready',
      version: '1.2.3',
    })
    expect(mapUpdateEvent({ type: 'error', message: '网络不可用' })).toEqual({
      status: 'error',
      error: '网络不可用',
    })
  })
})
