import { describe, expect, it } from 'vitest'

import { findDeepLink, parseDeepLink } from './deep-link'

describe('深链解析', () => {
  it('解析加入会议的会议号', () => {
    expect(parseDeepLink('tongpin://join?no=123456789')).toEqual({ meetingNo: '123456789' })
    expect(parseDeepLink('tongpin://join?no=%20123456789%20')).toEqual({ meetingNo: '123456789' })
  })

  it('缺会议号、错主机、错协议都拒绝', () => {
    expect(parseDeepLink('tongpin://join')).toBeNull()
    expect(parseDeepLink('tongpin://join?no=')).toBeNull()
    expect(parseDeepLink('tongpin://join?no=%20')).toBeNull()
    expect(parseDeepLink('tongpin://schedule?no=1')).toBeNull()
    expect(parseDeepLink('https://join?no=1')).toBeNull()
  })

  it('不是合法 URL 时返回 null', () => {
    expect(parseDeepLink('tongpin://')).toBeNull()
    expect(parseDeepLink('not a url')).toBeNull()
  })
})

describe('从 argv 找深链', () => {
  it('跳过可执行文件参数并去掉引号', () => {
    expect(findDeepLink(['/Applications/Tongpin.app', '--flag', '"tongpin://join?no=1"'])).toBe(
      'tongpin://join?no=1',
    )
  })

  it('没有链接时返回 null', () => {
    expect(findDeepLink(['/Applications/Tongpin.app'])).toBeNull()
    expect(findDeepLink(['https://example.com'])).toBeNull()
  })
})
