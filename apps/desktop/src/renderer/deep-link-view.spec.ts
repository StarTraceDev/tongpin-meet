import { describe, expect, it } from 'vitest'

import { deepLinkText, readDeepLinkNotice } from './deep-link-view'

describe('深链提示', () => {
  it('只接受带 url 与会议号的对象', () => {
    expect(readDeepLinkNotice({ url: 'tongpin://join?no=1', meetingNo: '1' })).toEqual({
      url: 'tongpin://join?no=1',
      meetingNo: '1',
    })
    expect(readDeepLinkNotice(null)).toBeNull()
    expect(readDeepLinkNotice('tongpin://join?no=1')).toBeNull()
    expect(readDeepLinkNotice({ url: '', meetingNo: '1' })).toBeNull()
    expect(readDeepLinkNotice({ url: 'tongpin://join?no=1', meetingNo: 1 })).toBeNull()
  })

  it('没有链接时给出示例提示', () => {
    expect(deepLinkText(null)).toContain('tongpin://join?no=')
    expect(deepLinkText({ url: 'tongpin://join?no=1', meetingNo: '1' })).toBe(
      '已收到 tongpin://join?no=1，会议号 1。',
    )
  })
})
