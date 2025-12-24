import { describe, expect, it } from 'vitest'

import { formatConfigValue, parseConfigJson } from './format'

describe('配置项展示', () => {
  it('对象压成一行 JSON，过长截断', () => {
    expect(formatConfigValue({ a: 1 })).toBe('{"a":1}')
    expect(formatConfigValue('x'.repeat(200)).endsWith('…')).toBe(true)
  })

  it('解析合法 JSON', () => {
    expect(parseConfigJson('{"enabled":true}')).toEqual({ ok: true, value: { enabled: true } })
    expect(parseConfigJson('100')).toEqual({ ok: true, value: 100 })
  })

  it('拒绝空值与坏 JSON', () => {
    expect(parseConfigJson('  ')).toMatchObject({ ok: false })
    expect(parseConfigJson('{oops')).toMatchObject({ ok: false })
  })
})
