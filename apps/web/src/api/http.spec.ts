import { afterEach, describe, expect, it, vi } from 'vitest'

import { ACCESS_TOKEN_KEY, ApiError, getAccessToken, request, setTokens } from './http'

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

describe('http 刷新单飞', () => {
  it('access 失效（20101）→ refresh 一次 → 用新 token 重试成功', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    setTokens({ accessToken: 'old-at', refreshToken: 'rt-1' })
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push(String(url))
        if (String(url).endsWith('/auth/sessions:refresh')) {
          return new Response(
            JSON.stringify({ tokens: { accessToken: 'new-at', refreshToken: 'rt-2' } }),
            { status: 200 },
          )
        }
        const auth = new Headers(init.headers).get('authorization')
        if (auth === 'Bearer new-at')
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        return new Response(JSON.stringify({ status: 401, code: 20101, title: '登录状态已失效' }), {
          status: 401,
        })
      }),
    )

    await expect(request<{ ok: boolean }>('/auth/me')).resolves.toEqual({ ok: true })
    expect(calls).toEqual(['/api/v1/auth/me', '/api/v1/auth/sessions:refresh', '/api/v1/auth/me'])
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-at')
  })

  it('并发 401 只触发一次 refresh', async () => {
    vi.stubGlobal('localStorage', makeStorage())
    setTokens({ accessToken: 'old-at', refreshToken: 'rt-1' })
    let refreshCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (String(url).endsWith('/auth/sessions:refresh')) {
          refreshCalls += 1
          return new Response(
            JSON.stringify({ tokens: { accessToken: 'new-at', refreshToken: 'rt-2' } }),
            { status: 200 },
          )
        }
        const auth = new Headers(init.headers).get('authorization')
        if (auth === 'Bearer new-at')
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        return new Response(JSON.stringify({ status: 401, code: 20101, title: '登录状态已失效' }), {
          status: 401,
        })
      }),
    )

    const [first, second] = await Promise.all([request('/auth/me'), request('/auth/me')])

    expect(first).toEqual({ ok: true })
    expect(second).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
  })
})
