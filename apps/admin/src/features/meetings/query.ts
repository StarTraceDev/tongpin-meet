import { MEETING_STATUS } from '@tongpin/shared/constants'
import type { MeetingStatusValue } from '@tongpin/shared/types'

export interface MeetingListQuery {
  page: number
  pageSize: number
  status: MeetingStatusValue | undefined
  keyword: string
  sort: string
}

const PAGE_SIZES = new Set([10, 20, 50])
const SORT_FIELDS = new Set(['startAt', 'createdAt', 'actualStartAt', 'title'])
export const DEFAULT_SORT = '-startAt'

function positiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function readStatus(raw: string | null): MeetingStatusValue | undefined {
  if (raw === null) {
    return undefined
  }
  return Object.values(MEETING_STATUS).includes(raw as MeetingStatusValue)
    ? (raw as MeetingStatusValue)
    : undefined
}

function readSort(raw: string | null): string {
  if (raw === null) {
    return DEFAULT_SORT
  }
  const descending = raw.startsWith('-')
  const field = descending ? raw.slice(1) : raw
  return SORT_FIELDS.has(field) ? raw : DEFAULT_SORT
}

/** URL 是筛选状态的唯一来源：刷新、分享、后退都能还原列表 */
export function parseMeetingQuery(params: URLSearchParams): MeetingListQuery {
  const page = positiveInt(params.get('page'), 1)
  const pageSize = positiveInt(params.get('pageSize'), 20)

  return {
    page,
    pageSize: PAGE_SIZES.has(pageSize) ? pageSize : 20,
    status: readStatus(params.get('status')),
    keyword: (params.get('keyword') ?? '').trim().slice(0, 50),
    sort: readSort(params.get('sort')),
  }
}

export function meetingQueryString(query: MeetingListQuery): string {
  const params = new URLSearchParams()
  if (query.page !== 1) {
    params.set('page', String(query.page))
  }
  if (query.pageSize !== 20) {
    params.set('pageSize', String(query.pageSize))
  }
  if (query.status !== undefined) {
    params.set('status', query.status)
  }
  if (query.keyword !== '') {
    params.set('keyword', query.keyword)
  }
  if (query.sort !== DEFAULT_SORT) {
    params.set('sort', query.sort)
  }
  return params.toString()
}

export function withQuery(
  query: MeetingListQuery,
  patch: Partial<MeetingListQuery>,
): MeetingListQuery {
  return { ...query, ...patch }
}
