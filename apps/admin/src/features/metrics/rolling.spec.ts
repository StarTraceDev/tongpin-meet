import { describe, expect, it } from 'vitest'

import { appendSample } from './rolling'

describe('实时采样缓冲', () => {
  it('追加并保持顺序', () => {
    expect(appendSample([1, 2], 3)).toEqual([1, 2, 3])
  })

  it('超过上限丢最旧的', () => {
    expect(appendSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4])
  })

  it('不改原数组', () => {
    const buffer = [1]
    appendSample(buffer, 2)
    expect(buffer).toEqual([1])
  })
})
