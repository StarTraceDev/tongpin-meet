import { describe, expect, it } from 'vitest'

import { formatBytes, formatDay, formatStartedAt } from './format'

describe('formatDay', () => {
  it('只保留月日', () => {
    expect(formatDay('2026-01-03')).toBe('01/03')
  })
})

describe('formatBytes', () => {
  it('小于 1KB 按字节展示', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('按 1024 换单位并保留一位小数', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10 * 1024)).toBe('10 KB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
  })
})

describe('formatStartedAt', () => {
  it('空值给占位符', () => {
    expect(formatStartedAt(null)).toBe('—')
  })

  it('按北京时间展示月日与时间', () => {
    expect(formatStartedAt('2026-01-01T02:00:00.000Z')).toBe('01-01 10:00')
  })
})
