import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as breakApi from '../apis/break'
import * as checkinApi from '../apis/checkin'
import { useInteractionStore } from './interaction'

vi.mock('../apis/checkin', () => ({
  listCheckins: vi.fn(),
  createCheckin: vi.fn(),
  closeCheckin: vi.fn(),
  getCheckinOverview: vi.fn(),
  respondCheckin: vi.fn(),
}))

vi.mock('../apis/vote', () => ({
  listVotes: vi.fn(),
  createVote: vi.fn(),
  getVote: vi.fn(),
  updateVote: vi.fn(),
  deleteVote: vi.fn(),
  startVote: vi.fn(),
  closeVote: vi.fn(),
  publishVote: vi.fn(),
  submitVote: vi.fn(),
  getVoteResults: vi.fn(),
}))

vi.mock('../apis/break', () => ({
  listBreaks: vi.fn(),
  createBreak: vi.fn(),
  updateBreak: vi.fn(),
  closeBreak: vi.fn(),
  getBreakOverview: vi.fn(),
  markBreakRecord: vi.fn(),
}))

const checkin = {
  id: 'c_1',
  meetingId: 'm_1',
  title: '全员签到',
  status: 'ONGOING' as const,
  anonymous: false,
  createdById: 'u_1',
  createdAt: new Date().toISOString(),
  closedAt: null,
}

const breakItem = {
  id: 'b_1',
  meetingId: 'm_1',
  title: '休息 10 分钟',
  status: 'ONGOING' as const,
  plannedSec: 600,
  createdById: 'u_1',
  startedAt: new Date().toISOString(),
  endedAt: null,
}

describe('interaction store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(checkinApi.listCheckins).mockResolvedValue([checkin])
    vi.mocked(checkinApi.getCheckinOverview).mockResolvedValue({
      checkin,
      total: 12,
      joined: 8,
      records: [],
    })
    vi.mocked(breakApi.listBreaks).mockResolvedValue([breakItem])
    vi.mocked(breakApi.getBreakOverview).mockResolvedValue({
      break: breakItem,
      restingCount: 8,
      records: [],
    })
  })

  it('进行中的签到会被选成 activeCheckin，并带出人数', async () => {
    const store = useInteractionStore()
    await store.loadCheckins('m_1')

    expect(store.activeCheckin?.id).toBe('c_1')
    expect(store.checkinJoined).toBe(8)
    expect(store.checkinTotal).toBe(12)
  })

  it('发起签到后写入本地倒计时，终止后清掉', async () => {
    vi.mocked(checkinApi.createCheckin).mockResolvedValue(checkin)
    vi.mocked(checkinApi.closeCheckin).mockResolvedValue({
      ...checkin,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
    })
    const store = useInteractionStore()
    const before = Date.now()
    await store.startCheckin('m_1', { title: '全员签到', anonymous: false }, 5)

    expect(store.checkinDeadline).not.toBeNull()
    expect(store.checkinDeadline ?? 0).toBeGreaterThanOrEqual(before + 5 * 60_000)

    await store.endCheckin('m_1', 'c_1')
    expect(store.checkinDeadline).toBeNull()
    expect(store.activeCheckin).toBeNull()
  })

  it('休息进行中时 activeBreak 指向它，结束后清空', async () => {
    vi.mocked(breakApi.closeBreak).mockResolvedValue({
      ...breakItem,
      status: 'CLOSED',
      endedAt: new Date().toISOString(),
    })
    const store = useInteractionStore()
    await store.loadBreaks('m_1')

    expect(store.activeBreak?.id).toBe('b_1')
    expect(store.breakOverview?.restingCount).toBe(8)

    await store.endBreak('m_1', 'b_1')
    expect(store.activeBreak).toBeNull()
  })
})
