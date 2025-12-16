import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, getAccessToken, request, storeTokens } from './http'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    json: async (): Promise<unknown> => body,
  } as unknown as Response
}

describe('admin HTTP 客户端', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('带访问令牌请求并解出 JSON', async () => {
    storeTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    const fetchMock = vi.fn(async (): Promise<Response> => jsonResponse({ id: 'u1' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request<{ id: string }>('/auth/me')).resolves.toEqual({ id: 'u1' })

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    expect(calls[0]?.[0]).toBe('/api/v1/auth/me')
    expect(new Headers(calls[0]?.[1].headers).get('authorization')).toBe('Bearer access-1')
  })

  it('401 且 code=20101 时刷新令牌并重试一次', async () => {
    storeTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 20101, title: '令牌过期' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ tokens: { accessToken: 'new', refreshToken: 'refresh-2' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'u1' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request<{ id: string }>('/auth/me')).resolves.toEqual({ id: 'u1' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/sessions:refresh')
    expect(getAccessToken()).toBe('new')
  })

  it('刷新失败时清空令牌并抛出 ApiError', async () => {
    storeTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 20101, title: '令牌过期' }, 401))
      .mockResolvedValueOnce(jsonResponse({ code: 20101, title: '刷新令牌失效' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(getAccessToken()).toBeNull()
  })

  it('204 响应返回 undefined', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => jsonResponse(undefined, 204))
    vi.stubGlobal('fetch', fetchMock)

    await expect(request('/auth/sessions:current')).resolves.toBeUndefined()
  })
})
