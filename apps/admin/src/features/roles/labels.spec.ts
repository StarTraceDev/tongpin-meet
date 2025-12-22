import { PERMISSIONS } from '@tongpin/shared/constants'
import { describe, expect, it } from 'vitest'

import { PERMISSION_GROUPS, permissionGroupTitles, permissionLabel } from './labels'

describe('权限点文案', () => {
  it('覆盖 03 §5.6 的全部权限且不重复', () => {
    const covered = PERMISSION_GROUPS.flatMap((group) => group.options.map((option) => option.code))

    expect(covered.slice().sort()).toEqual([...PERMISSIONS].sort())
    expect(new Set(covered).size).toBe(covered.length)
  })

  it('未知权限回退成原 code', () => {
    expect(permissionLabel('meeting:read')).toBe('查看会议')
    expect(permissionLabel('unknown:read')).toBe('unknown:read')
  })

  it('能查到权限所在分组', () => {
    expect(permissionGroupTitles('sms:secret')).toEqual(['短信'])
    expect(permissionGroupTitles('unknown')).toEqual([])
  })
})
