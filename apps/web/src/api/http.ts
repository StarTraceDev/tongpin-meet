import type { Problem } from '@tongpin/shared/types'

export const ACCESS_TOKEN_KEY = 'tongpin.accessToken'
export const REFRESH_TOKEN_KEY = 'tongpin.refreshToken'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

/** 后端失败一律 application/problem+json（04 §4.5），前端只认 code/status */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getAccessToken(): string | null {
  return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  globalThis.localStorage?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearTokens(): void {
  globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY)
  globalThis.localStorage?.removeItem(REFRESH_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return globalThis.localStorage?.getItem(REFRESH_TOKEN_KEY) ?? null
}

let refreshing: Promise<boolean> | null = null

/**
 * 刷新单飞：并发 401 只发一次 refresh（04 §6.1 旋转，重放会被判复用）
 * 失败即清 token，调用方负责跳登录。
 */
export function refreshSession(): Promise<boolean> {
  if (refreshing === null) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (refreshToken === null) return false
  const response = await fetch(`${API_BASE}/auth/sessions:refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) {
    clearTokens()
    return false
  }
  const data = (await response.json()) as { tokens: { accessToken: string; refreshToken: string } }
  setTokens(data.tokens)
  return true
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (token !== null) headers.set('authorization', `Bearer ${token}`)
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!response.ok) {
    let problem: Partial<Problem> = {}
    try {
      problem = (await response.json()) as Partial<Problem>
    } catch {
      // 非 JSON 错误体（网关 502 之类）直接退回状态码
    }
    if (response.status === 401 && problem.code === 20101 && !retried) {
      if (await refreshSession()) return request<T>(path, init, true)
      clearTokens()
    } else if (response.status === 401) {
      clearTokens()
    }
    throw new ApiError(response.status, problem.code ?? 10000, problem.title ?? response.statusText)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
