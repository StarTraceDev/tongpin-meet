import type { Meeting } from '@tongpin/shared/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { endMeeting, getMeeting, joinMeeting, leaveMeeting } from '../apis/meeting'
import { useMeetingStore } from './meeting'

vi.mock('../apis/meeting', () => ({
  getMeeting: vi.fn(),
  joinMeeting: vi.fn(),
  leaveMeeting: vi.fn(),
  endMeeting: vi.fn(),
}))

const meeting = {
  id: 'm_1',
  meetingNo: '100000001',
  title: '产品周会',
  hostId: 'u_1',
} as Meeting

const participant = { id: 'p_1', role: 'HOST', guestName: null } as const
const rtc = { token: 'token-1', url: 'wss://rtc.example', expiresAt: '2026-01-01T00:00:00Z' }

describe('useMeetingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getMeeting).mockReset().mockResolvedValue(meeting)
    vi.mocked(joinMeeting)
      .mockReset()
      .mockResolvedValue({ meetingId: 'm_1', roomName: 'room-1', rtc, participant })
    vi.mocked(leaveMeeting).mockReset().mockResolvedValue()
    vi.mocked(endMeeting).mockReset().mockResolvedValue(meeting)
  })

  it('进会：详情 + 入会结果写进 store', async () => {
    const store = useMeetingStore()
    const ok = await store.enter('m_1')
    expect(ok).toBe(true)
    expect(store.meetingId).toBe('m_1')
    expect(store.title).toBe('产品周会')
    expect(store.self?.id).toBe('p_1')
    expect(store.rtc?.token).toBe('token-1')
    expect(store.isHost).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('等候室：不发会议室，只留提示文案', async () => {
    vi.mocked(joinMeeting).mockResolvedValue({ meetingId: 'm_1', waiting: true, entryId: 'e_1' })
    const store = useMeetingStore()
    const ok = await store.enter('m_1')
    expect(ok).toBe(false)
    expect(store.meeting).toBeNull()
    expect(store.error).toContain('等候室')
  })

  it('离会：先清本地状态再尽力通知服务端', async () => {
    const store = useMeetingStore()
    await store.enter('m_1')
    vi.mocked(leaveMeeting).mockRejectedValue(new Error('network'))
    await store.leave()
    expect(store.meeting).toBeNull()
    expect(store.self).toBeNull()
    expect(store.joinedAt).toBeNull()
    expect(leaveMeeting).toHaveBeenCalledWith('m_1')
  })

  it('结束会议：先调结束接口再离会', async () => {
    const store = useMeetingStore()
    await store.enter('m_1')
    await store.end()
    expect(endMeeting).toHaveBeenCalledWith('m_1')
    expect(store.meeting).toBeNull()
  })
})
