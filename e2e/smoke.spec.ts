import { expect, test } from '@playwright/test'
import type { APIRequestContext, APIResponse } from '@playwright/test'

const API = '/api/v1'
const HOST = { phone: '13800000000', password: 'admin123' }
const GUEST = { phone: '13800000001', password: 'user123' }

interface Session {
  tokens: { accessToken: string }
  user: { id: string }
}

interface Meeting {
  id: string
  meetingNo: string
  status: string
}

async function expectOk(response: APIResponse, label: string): Promise<void> {
  const body = await response.text()
  expect(response.ok(), `${label} 失败：${response.status()} ${body}`).toBe(true)
}

async function login(
  request: APIRequestContext,
  input: { phone: string; password: string },
): Promise<Session> {
  const response = await request.post(`${API}/auth/sessions:password`, { data: input })
  await expectOk(response, '登录')
  return (await response.json()) as Session
}

function auth(session: Session): Record<string, string> {
  return { authorization: `Bearer ${session.tokens.accessToken}` }
}

test('登录 → 建会 → 入会 → 签到 → 结束', async ({ request }) => {
  const host = await login(request, HOST)
  const guest = await login(request, GUEST)

  const start = new Date()
  const end = new Date(start.getTime() + 30 * 60_000)

  const created = await request.post(`${API}/meetings`, {
    headers: auth(host),
    data: {
      title: `冒烟会议 ${start.toISOString()}`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    },
  })
  await expectOk(created, '建会')
  expect(created.status()).toBe(201)
  const meeting = (await created.json()) as Meeting
  expect(meeting.meetingNo).toMatch(/^\d{9}$/)

  try {
    const joined = await request.post(`${API}/meetings/${meeting.id}:join`, {
      headers: auth(guest),
      data: {},
    })
    await expectOk(joined, '入会')
    expect(joined.status()).toBe(200)

    const checkinCreated = await request.post(`${API}/meetings/${meeting.id}/checkins`, {
      headers: auth(host),
      data: { title: '冒烟签到' },
    })
    await expectOk(checkinCreated, '发起签到')
    const checkin = (await checkinCreated.json()) as { id: string }
    expect(checkin.id).not.toBe('')

    const recorded = await request.post(
      `${API}/meetings/${meeting.id}/checkins/${checkin.id}/records`,
      { headers: auth(guest) },
    )
    await expectOk(recorded, '签到')

    const overview = await request.get(
      `${API}/meetings/${meeting.id}/checkins/${checkin.id}/records`,
      { headers: auth(host) },
    )
    await expectOk(overview, '签到概览')
    const summary = (await overview.json()) as { total: number }
    expect(summary.total).toBeGreaterThanOrEqual(1)

    const ended = await request.post(`${API}/meetings/${meeting.id}:end`, { headers: auth(host) })
    await expectOk(ended, '结束会议')
    const endedMeeting = (await ended.json()) as Meeting
    expect(endedMeeting.status).toBe('ENDED')
  } finally {
    // 软删，避免冒烟数据堆在会议列表里
    await request.delete(`${API}/meetings/${meeting.id}`, { headers: auth(host) })
  }
})
