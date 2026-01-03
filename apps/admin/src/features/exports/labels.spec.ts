import { describe, expect, it } from 'vitest'

import { exportStatusMeta, formatExportTime, resourceLabel } from './labels'

describe('导出中心展示', () => {
  it('资源与状态有中文文案', () => {
    expect(resourceLabel('audit-logs')).toBe('审计日志')
    expect(exportStatusMeta('RUNNING').label).toBe('生成中')
    expect(exportStatusMeta('FAILED').color).toBe('red')
  })

  it('时间到分钟，空值破折号', () => {
    expect(formatExportTime('2026-01-01T02:03:00.000Z')).toBe('01-01 10:03')
    expect(formatExportTime(null)).toBe('—')
  })
})
