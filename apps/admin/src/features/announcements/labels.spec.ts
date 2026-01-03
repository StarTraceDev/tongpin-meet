import { describe, expect, it } from 'vitest'

import { announcementStatusMeta, formatAnnouncementTime } from './labels'

describe('公告展示', () => {
  it('三种状态都有中文文案', () => {
    expect(announcementStatusMeta('SCHEDULED').label).toBe('定时中')
    expect(announcementStatusMeta('PUBLISHED').label).toBe('已发布')
    expect(announcementStatusMeta('EXPIRED').label).toBe('已过期')
  })

  it('时间转北京时间，空值显示破折号', () => {
    expect(formatAnnouncementTime('2026-01-01T02:03:00.000Z')).toBe('2026-01-01 10:03')
    expect(formatAnnouncementTime(null)).toBe('—')
  })
})
