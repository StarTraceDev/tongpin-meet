import type { Problem } from '@tongpin/shared/types'
import type { Platform, StoragePort } from '@tongpin/platform'
import { reactive } from 'vue'

import { readEnv } from './env'

/** platform.storage 的 key（Web 端会自动加 `tongpin:` 前缀） */
export const ACCESS_TOKEN_KEY = 'accessToken'
export const REFRESH_TOKEN_KEY = 'refreshToken'

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

export interface AuthSessionState {
  accessToken: string | null
  refreshToken: string | null
  /** 是否已从 platform.storage 读过一次；request 会等它就绪 */
  hydrated: boolean
}

/**
 * token 的内存副本（10-M13 O7/O8）：启动 hydrate 一次，请求只读这里；
 * 组件与路由通过这个 reactive 对象判断登录态，不再各自存一份。
 */
export const session = reactive<AuthSessionState>({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
})

let storage: StoragePort | null = null
let hydrating: Promise<void> | null = null
let refreshing: Promise<boolean> | null = null
const unauthorizedListeners = new Set<(error: ApiError) => void>()

/** 没接平台时（单测/SSR）退回 localStorage，浏览器语义不变 */
function localAdapter(): StoragePort | null {
  const ls = globalThis.localStorage
  if (ls === undefined) return null
  return {
    secure: false,
    get: async (key: string): Promise<string | null> => ls.getItem(key),
    set: async (key: string, value: string): Promise<void> => {
      ls.setItem(key, value)
    },
    remove: async (key: string): Promise<void> => {
      ls.removeItem(key)
    },
  }
}

function tokenStore(): StoragePort | null {
  return storage ?? localAdapter()
}

/** createApp 装配时调用一次；换平台（含测试）可重复调用 */
export function configureHttp(platform: Platform): void {
  storage = platform.storage
  session.hydrated = false
  hydrating = null
}

/** 启动时读一次 token 到内存，之后 request 不再碰异步存储 */
export function hydrateSession(): Promise<void> {
  if (session.hydrated) return Promise.resolve()
  if (hydrating !== null) return hydrating
  hydrating = (async (): Promise<void> => {
    const store = tokenStore()
    if (store !== null) {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          store.get(ACCESS_TOKEN_KEY),
          store.get(REFRESH_TOKEN_KEY),
        ])
        if (session.accessToken === null) session.accessToken = accessToken
        if (session.refreshToken === null) session.refreshToken = refreshToken
      } catch {
        // 存储不可用时按未登录处理，不阻塞启动
      }
    }
    session.hydrated = true
  })()
  return hydrating
}

export function getAccessToken(): string | null {
  return session.accessToken
}

export function getRefreshToken(): string | null {
  return session.refreshToken
}

export function isAuthenticated(): boolean {
  return session.accessToken !== null
}

async function persistTokens(): Promise<void> {
  const store = tokenStore()
  if (store === null) return
  try {
    await Promise.all([
      session.accessToken === null
        ? store.remove(ACCESS_TOKEN_KEY)
        : store.set(ACCESS_TOKEN_KEY, session.accessToken),
      session.refreshToken === null
        ? store.remove(REFRESH_TOKEN_KEY)
        : store.set(REFRESH_TOKEN_KEY, session.refreshToken),
    ])
  } catch {
    // 写盘失败不回滚内存态，下次启动重新登录即可
  }
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  session.accessToken = tokens.accessToken
  session.refreshToken = tokens.refreshToken
  session.hydrated = true
  void persistTokens()
}

export function clearTokens(): void {
  session.accessToken = null
  session.refreshToken = null
  session.hydrated = true
  void persistTokens()
}

/** 统一 401 出口（O9）：createAppRouter 装配时注册一次，跳登录并带 redirect */
export function onUnauthorized(cb: (error: ApiError) => void): () => void {
  unauthorizedListeners.add(cb)
  return () => {
    unauthorizedListeners.delete(cb)
  }
}

function notifyUnauthorized(error: ApiError): void {
  for (const listener of unauthorizedListeners) listener(error)
}

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
  const refreshToken = session.refreshToken
  if (refreshToken === null) return false
  try {
    const response = await fetch(`${readEnv().apiBase}/auth/sessions:refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      clearTokens()
      return false
    }
    const data = (await response.json()) as {
      tokens: { accessToken: string; refreshToken: string }
    }
    setTokens(data.tokens)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export type RequestOptions = RequestInit & {
  /** 毫秒；0 表示不设超时（长轮询/SSE 用） */
  timeoutMs?: number
}

/** 让 fetch 自己决定 content-type 的 body 类型（O6） */
function isNativeBody(body: BodyInit): boolean {
  return (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    body instanceof URLSearchParams
  )
}

function readProblem(response: Response): Promise<Partial<Problem>> {
  return response
    .json()
    .then((data: unknown) =>
      typeof data === 'object' && data !== null ? (data as Partial<Problem>) : {},
    )
    .catch(() => ({}))
}

export async function request<T>(
  path: string,
  init: RequestOptions = {},
  retried = false,
): Promise<T> {
  await hydrateSession()

  const { timeoutMs = readEnv().requestTimeoutMs, signal: callerSignal, ...rest } = init
  const headers = new Headers(rest.headers)
  if (
    rest.body !== undefined &&
    rest.body !== null &&
    !isNativeBody(rest.body) &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', 'application/json')
  }
  if (session.accessToken !== null) headers.set('authorization', `Bearer ${session.accessToken}`)

  const controller = new AbortController()
  const onCallerAbort = (): void => controller.abort()
  if (callerSignal !== undefined && callerSignal !== null) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', onCallerAbort)
  }
  const timer: ReturnType<typeof setTimeout> | null =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null

  let response: Response
  try {
    response = await fetch(`${readEnv().apiBase}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        0,
        callerSignal?.aborted === true ? '请求已取消' : '请求超时，请稍后重试',
      )
    }
    throw error
  } finally {
    if (timer !== null) clearTimeout(timer)
    callerSignal?.removeEventListener('abort', onCallerAbort)
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    if (response.status === 401 && problem.code === 20101 && !retried) {
      if (await refreshSession()) return request<T>(path, init, true)
    }
    if (response.status === 401) {
      clearTokens()
      notifyUnauthorized(
        new ApiError(401, problem.code ?? 10000, problem.title ?? response.statusText),
      )
    }
    throw new ApiError(response.status, problem.code ?? 10000, problem.title ?? response.statusText)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
