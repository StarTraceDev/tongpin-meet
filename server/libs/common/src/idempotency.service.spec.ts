import { describe, expect, it } from 'vitest'

import { IdempotencyService, IDEMPOTENCY_TTL_MS } from './idempotency.service'

describe('IdempotencyService', () => {
  it('同 key 返回第一次存的值', () => {
    const service = new IdempotencyService()
    service.put('k', { id: 1 })
    expect(service.get<{ id: number }>('k')).toEqual({ id: 1 })
  })

  it('不存在的 key 返回 undefined', () => {
    expect(new IdempotencyService().get('missing')).toBeUndefined()
  })

  it('默认 TTL 是 24h', () => {
    expect(IDEMPOTENCY_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('过期后取不到', () => {
    const service = new IdempotencyService()
    service.put('k', 'v', -1)
    expect(service.get('k')).toBeUndefined()
  })

  it('clear 清空全部', () => {
    const service = new IdempotencyService()
    service.put('a', 1)
    service.put('b', 2)
    service.clear()
    expect(service.get('a')).toBeUndefined()
    expect(service.get('b')).toBeUndefined()
  })
})
