import type { AuthUser, SessionResponse } from '@tongpin/shared/types'

import { request } from './http'

export interface LoginPayload {
  phone: string
  password: string
}

export function loginByPassword(payload: LoginPayload): Promise<SessionResponse> {
  return request<SessionResponse>('/auth/sessions:password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}
