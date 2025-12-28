import { describe, expect, it } from 'vitest'

import { formatCostDay, formatMoney, formatMoneyTick } from './format'

describe('成本展示', () => {
  it('金额按分转元', () => {
    expect(formatMoney(0)).toBe('¥0.00')
    expect(formatMoney(1299)).toBe('¥12.99')
  })

  it('坐标轴刻度按量级取精度', () => {
    expect(formatMoneyTick(0)).toBe('¥0')
    expect(formatMoneyTick(50)).toBe('¥0.50')
    expect(formatMoneyTick(2500)).toBe('¥25')
  })

  it('日期只留月日', () => {
    expect(formatCostDay('2026-01-03')).toBe('01-03')
  })
})
