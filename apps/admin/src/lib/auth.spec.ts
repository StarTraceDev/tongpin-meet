import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { login, logout, restoreSession } from './auth'
import { getAccessToken, getRefreshToken, storeTokens } from './http'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async (): Promise<unknown> => body,
  } as unknown as Response
}

const USER = {
  id: 'u1',
  phone: '13800000000',
  name: '管理员',
  avatarUrl: null,
  roles: ['admin'],
  permissions: [],
}

describe('admin 会话', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('登录成功后保存令牌并返回用户', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (): Promise<Response> =>
        jsonResponse({
          user: USER,
          tokens: {
            accessToken: 'a1',
            accessExpiresAt: '2026-01-01T00:00:00.000Z',
            refreshToken: 'r1',
            refreshExpiresAt: '2026-02-01T00:00:00.000Z',
          },
        }),
      ),
    )

    const user = await login({ phone: '13800000000', password: 'secret' })

    expect(user).toMatchObject({ id: 'u1', name: '管理员' })
    expect(getAccessToken()).toBe('a1')
    expect(getRefreshToken()).toBe('r1')
  })

  it('没有令牌时直接返回 null，不发请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(restoreSession()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('令牌失效时清空并返回 null', async () => {
    storeTokens({ accessToken: 'old', refreshToken: 'r1' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (): Promise<Response> => jsonResponse({ code: 1003, title: '未登录' }, 401)),
    )

    await expect(restoreSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('退出登录清空令牌', () => {
    storeTokens({ accessToken: 'a1', refreshToken: 'r1' })

    logout()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
