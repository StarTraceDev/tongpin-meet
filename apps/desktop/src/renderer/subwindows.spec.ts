import { describe, expect, it } from 'vitest'

import { readSubWindowRequest, SUB_WINDOWS } from './subwindows'

describe('readSubWindowRequest', () => {
  it('解析 key 与 JSON payload', () => {
    expect(readSubWindowRequest('?sub=join&payload=%7B%22no%22%3A%22100000001%22%7D')).toEqual({
      key: 'join',
      payload: { no: '100000001' },
    })
  })

  it('没有 payload 时保持 undefined', () => {
    expect(readSubWindowRequest('?sub=whiteboard')).toEqual({
      key: 'whiteboard',
      payload: undefined,
    })
  })

  it('非法 key 返回 null', () => {
    expect(readSubWindowRequest('?sub=admin')).toBeNull()
    expect(readSubWindowRequest('')).toBeNull()
  })

  it('坏 JSON 不炸，退回 undefined', () => {
    expect(readSubWindowRequest('?sub=schedule&payload=not-json')).toEqual({
      key: 'schedule',
      payload: undefined,
    })
  })

  it('四个 key 都有标题与提示', () => {
    for (const spec of Object.values(SUB_WINDOWS)) {
      expect(spec.title.length).toBeGreaterThan(0)
      expect(spec.hint.length).toBeGreaterThan(0)
    }
  })
})
