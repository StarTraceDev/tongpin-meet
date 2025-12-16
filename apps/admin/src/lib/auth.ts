import type { AuthUser, SessionResponse } from '@tongpin/shared/types'

import { clearTokens, getAccessToken, request, storeTokens } from './http'

export interface LoginInput {
  phone: string
  password: string
}

/** 密码登录（04 §5.2）。图形验证码后端尚未提供，M11-1 先只做账号密码。 */
export async function login(input: LoginInput): Promise<AuthUser> {
  const session = await request<SessionResponse>('/auth/sessions:password', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  storeTokens(session.tokens)
  return session.user
}

export function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

/** 刷新页面后恢复会话：没有令牌或令牌失效都回到未登录，不打断启动。 */
export async function restoreSession(): Promise<AuthUser | null> {
  if (getAccessToken() === null) {
    return null
  }

  try {
    return await fetchMe()
  } catch {
    clearTokens()
    return null
  }
}

export function logout(): void {
  clearTokens()
}
