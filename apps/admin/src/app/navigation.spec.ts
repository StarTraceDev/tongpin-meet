import { describe, expect, it } from 'vitest'

import { breadcrumbLabels } from './navigation'

describe('breadcrumbLabels', () => {
  it('按层级收集路由 handle 上的 crumb', () => {
    expect(
      breadcrumbLabels([{ handle: { crumb: '首页' } }, { handle: { crumb: '仪表盘' } }]),
    ).toEqual(['首页', '仪表盘'])
  })

  it('跳过没有 handle 或 handle 不是对象的层级', () => {
    expect(
      breadcrumbLabels([{}, { handle: '首页' }, { handle: null }, { handle: { crumb: '会议' } }]),
    ).toEqual(['会议'])
  })

  it('跳过空串和非字符串 crumb', () => {
    expect(
      breadcrumbLabels([
        { handle: { crumb: '' } },
        { handle: { crumb: 42 } },
        { handle: { crumb: '用户' } },
      ]),
    ).toEqual(['用户'])
  })

  it('没有匹配层级时返回空数组', () => {
    expect(breadcrumbLabels([])).toEqual([])
  })
})
