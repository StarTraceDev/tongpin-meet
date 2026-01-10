import { describe, expect, it } from 'vitest'

import { readSubWindowRequest } from './router'

describe('readSubWindowRequest', () => {
  it('解析 key 与 JSON payload', () => {
    expect(
      readSubWindowRequest('?sub=join&payload=%7B%22meetingNo%22%3A%22100000001%22%7D'),
    ).toEqual({ key: 'join', payload: { meetingNo: '100000001' } })
  })

  it('没有 payload 时只返回 key', () => {
    expect(readSubWindowRequest('?sub=whiteboard')).toEqual({ key: 'whiteboard' })
  })

  it('未知 key 或空串返回 null', () => {
    expect(readSubWindowRequest('?sub=admin')).toBeNull()
    expect(readSubWindowRequest('')).toBeNull()
  })

  it('坏 JSON 仍返回 key，由面板自己兜底', () => {
    expect(readSubWindowRequest('?sub=join&payload=not-json')).toEqual({ key: 'join' })
  })
})
