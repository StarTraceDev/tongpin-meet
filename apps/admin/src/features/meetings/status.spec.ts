import { describe, expect, it } from 'vitest'

import { canForceEnd, statusMeta } from './status'

describe('statusMeta', () => {
  it('五种状态都有中文展示名', () => {
    expect(statusMeta('SCHEDULED').label).toBe('预定中')
    expect(statusMeta('ONGOING').label).toBe('进行中')
    expect(statusMeta('ENDED').label).toBe('已结束')
    expect(statusMeta('CANCELLED').label).toBe('已取消')
    expect(statusMeta('EXPIRED').label).toBe('已过期')
  })
})

describe('canForceEnd', () => {
  it('只有进行中的会议能强制结束', () => {
    expect(canForceEnd('ONGOING')).toBe(true)
    expect(canForceEnd('SCHEDULED')).toBe(false)
    expect(canForceEnd('ENDED')).toBe(false)
  })
})
