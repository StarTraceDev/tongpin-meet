import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, getAccessToken, request, setTokens } from './http'

function makeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length(): number {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('http', () => {
  it('有 token 时带 Authorization，且拼上 /api/v1 前缀', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    setTokens({ accessToken: 'at', refreshToken: 'rt' })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await request<{ ok: boolean }>('/health')

    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/health')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer at')
  })

  it('把 problem+json 转成 ApiError，并清掉过期 token', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    setTokens({ accessToken: 'at', refreshToken: 'rt' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 401, code: 20101, title: '登录已过期' }), {
          status: 401,
          headers: { 'content-type': 'application/problem+json' },
        }),
      ),
    )

    await expect(request('/auth/me')).rejects.toMatchObject({
      status: 401,
      code: 20101,
      message: '登录已过期',
    })
    expect(getAccessToken()).toBeNull()
  })

  it('204 返回 undefined，不解析 body', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(request('/meetings/1')).resolves.toBeUndefined()
  })

  it('非 JSON 错误体也抛 ApiError', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })))

    await expect(request('/health')).rejects.toBeInstanceOf(ApiError)
  })
})
