import type { Problem } from '@tongpin/shared/types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'
const ACCESS_TOKEN_KEY = 'tongpin.admin.accessToken'
const REFRESH_TOKEN_KEY = 'tongpin.admin.refreshToken'

// 令牌失效的错误码（04 §5），只有它能触发刷新；其余 401 直接清空会话
const TOKEN_EXPIRED_CODE = 20101

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

export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeTokens(tokens: StoredTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

let refreshing: Promise<boolean> | null = null

async function runRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()

  if (refreshToken === null) {
    return false
  }

  try {
    const response = await fetch(`${API_BASE}/auth/sessions:refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const session = (await response.json()) as { tokens: StoredTokens }
    storeTokens(session.tokens)
    return true
  } catch {
    // 网络失败同样视为会话不可恢复，避免带着坏令牌继续请求
    clearTokens()
    return false
  }
}

export function refreshSession(): Promise<boolean> {
  refreshing ??= runRefresh().finally(() => {
    refreshing = null
  })

  return refreshing
}

async function readProblem(response: Response): Promise<Partial<Problem>> {
  try {
    return (await response.json()) as Partial<Problem>
  } catch {
    return {}
  }
}

async function authorizedFetch(
  path: string,
  init: RequestInit,
  retried: boolean,
): Promise<Response> {
  const headers = new Headers(init.headers)
  const accessToken = getAccessToken()

  if (accessToken !== null) {
    headers.set('authorization', `Bearer ${accessToken}`)
  }

  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!response.ok) {
    const problem = await readProblem(response)
    const canRetry = response.status === 401 && problem.code === TOKEN_EXPIRED_CODE && !retried

    if (canRetry && (await refreshSession())) {
      return authorizedFetch(path, init, true)
    }

    if (response.status === 401) {
      clearTokens()
    }

    throw new ApiError(response.status, problem.code ?? 10000, problem.title ?? response.statusText)
  }

  return response
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init, false)

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** 导出接口返回 CSV 等非 JSON，复用同一套鉴权与刷新逻辑 */
export async function requestText(path: string, init: RequestInit = {}): Promise<string> {
  const response = await authorizedFetch(path, init, false)
  return response.text()
}
