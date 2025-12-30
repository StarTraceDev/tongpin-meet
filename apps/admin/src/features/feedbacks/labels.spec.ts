import { describe, expect, it } from 'vitest'

import { categoryMeta, sourceLabel, statusMeta } from './labels'

describe('反馈展示文案', () => {
  it('四类反馈与四种状态都有文案', () => {
    expect(categoryMeta('COMPLAINT')).toEqual({ label: '投诉', color: 'red' })
    expect(categoryMeta('ISSUE').label).toBe('故障')
    expect(statusMeta('PENDING').label).toBe('待处理')
    expect(statusMeta('REJECTED').color).toBe('red')
  })

  it('来源区分代录与自助', () => {
    expect(sourceLabel('ADMIN')).toBe('管理台代录')
    expect(sourceLabel('USER')).toBe('用户提交')
  })
})
