import { describe, expect, it } from 'vitest'

import { formatLastLogin, userStatusMeta } from './labels'

describe('userStatusMeta', () => {
  it('区分正常与禁用', () => {
    expect(userStatusMeta('ACTIVE')).toEqual({ label: '正常', color: 'green' })
    expect(userStatusMeta('DISABLED')).toEqual({ label: '已禁用', color: 'red' })
  })
})

describe('formatLastLogin', () => {
  it('空值给破折号，否则按北京时间到分钟', () => {
    expect(formatLastLogin(null)).toBe('—')
    expect(formatLastLogin('2026-01-03T02:00:00.000Z')).toBe('01-03 10:00')
  })
})
