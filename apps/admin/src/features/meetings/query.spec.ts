import { describe, expect, it } from 'vitest'

import { DEFAULT_SORT, meetingQueryString, parseMeetingQuery, withQuery } from './query'

describe('parseMeetingQuery', () => {
  it('空参数给默认值', () => {
    expect(parseMeetingQuery(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      keyword: '',
      sort: DEFAULT_SORT,
    })
  })

  it('非法分页、状态与排序都回落到安全值', () => {
    const query = parseMeetingQuery(
      new URLSearchParams({ page: '0', pageSize: '999', status: 'NOPE', sort: '-id' }),
    )
    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(20)
    expect(query.status).toBeUndefined()
    expect(query.sort).toBe(DEFAULT_SORT)
  })

  it('接受白名单内的分页与排序', () => {
    const query = parseMeetingQuery(
      new URLSearchParams({ page: '3', pageSize: '50', status: 'ONGOING', sort: 'title' }),
    )
    expect(query).toMatchObject({ page: 3, pageSize: 50, status: 'ONGOING', sort: 'title' })
  })

  it('关键词去掉首尾空格并截断到 50 字', () => {
    const keyword = `  ${'会'.repeat(60)}  `
    expect(parseMeetingQuery(new URLSearchParams({ keyword })).keyword).toHaveLength(50)
  })
})

describe('meetingQueryString', () => {
  it('默认值不进 URL', () => {
    expect(
      meetingQueryString({
        page: 1,
        pageSize: 20,
        status: undefined,
        keyword: '',
        sort: DEFAULT_SORT,
      }),
    ).toBe('')
  })

  it('只序列化非默认值', () => {
    expect(
      meetingQueryString({
        page: 2,
        pageSize: 50,
        status: 'ENDED',
        keyword: '周会',
        sort: 'startAt',
      }),
    ).toBe('page=2&pageSize=50&status=ENDED&keyword=%E5%91%A8%E4%BC%9A&sort=startAt')
  })
})

describe('withQuery', () => {
  it('合并补丁且不改入参', () => {
    const query = parseMeetingQuery(new URLSearchParams())
    const next = withQuery(query, { page: 2, status: 'ONGOING' })
    expect(next.page).toBe(2)
    expect(query.page).toBe(1)
  })
})
