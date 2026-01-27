import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({ request: vi.fn() }))

const { request } = await import('./http')
const { createMeeting, listMeetings } = await import('./meeting')

const mocked = vi.mocked(request)

describe('meeting api', () => {
  beforeEach(() => {
    mocked.mockReset()
    mocked.mockResolvedValue({ items: [] })
  })

  it('建会走 POST /meetings，body 原样透传', async () => {
    const input = {
      title: '快速会议',
      startAt: '2026-11-07T09:00:00.000Z',
      endAt: '2026-11-07T10:00:00.000Z',
      inviteeIds: [],
      allowWaitingRoom: false,
      settings: { muteOnJoin: true, watermark: false, allowGuest: true, autoRecord: false },
    }

    await createMeeting(input)

    expect(mocked).toHaveBeenCalledWith('/meetings', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('列表把 scope / keyword 拼进 query，空白 keyword 不传', async () => {
    await listMeetings({ scope: 'ended', keyword: '周会' })
    expect(mocked.mock.calls[0]?.[0]).toContain('scope=ended')
    expect(mocked.mock.calls[0]?.[0]).toContain('keyword=%E5%91%A8%E4%BC%9A')

    mocked.mockClear()
    await listMeetings({ scope: 'ended', keyword: '   ' })
    expect(mocked.mock.calls[0]?.[0]).not.toContain('keyword=')
  })
})
