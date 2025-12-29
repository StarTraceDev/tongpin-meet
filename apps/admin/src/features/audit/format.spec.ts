import { describe, expect, it } from 'vitest'

import { formatAuditTime, formatTarget } from './format'

describe('审计日志展示', () => {
  it('时间转北京时间到秒', () => {
    expect(formatAuditTime('2026-01-01T02:03:04.000Z')).toBe('2026-01-01 10:03:04')
  })

  it('目标类型与 ID 拼接', () => {
    expect(formatTarget('meeting', 'm_1')).toBe('meeting / m_1')
    expect(formatTarget(null, 'm_1')).toBe('— / m_1')
    expect(formatTarget(null, null)).toBe('—')
  })
})
