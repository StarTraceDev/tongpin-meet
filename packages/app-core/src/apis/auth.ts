import type { AuthUser, QrPoll, QrSession, SessionResponse } from '@tongpin/shared/types'

import { request } from './http'

export interface LoginPayload {
  phone: string
  password: string
}

export interface SmsLoginPayload {
  phone: string
  code: string
}

export function loginByPassword(payload: LoginPayload): Promise<SessionResponse> {
  return request<SessionResponse>('/auth/sessions:password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sendSmsCode(phone: string): Promise<{ sent: boolean }> {
  return request<{ sent: boolean }>('/auth/smsCodes', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
}

export function loginBySms(payload: SmsLoginPayload): Promise<SessionResponse> {
  return request<SessionResponse>('/auth/sessions:sms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createQrSession(): Promise<QrSession> {
  return request<QrSession>('/auth/qrSessions', { method: 'POST' })
}

export function pollQrSession(id: string): Promise<QrPoll> {
  return request<QrPoll>(`/auth/qrSessions/${id}`)
}

export function confirmQrSession(id: string, code: string): Promise<void> {
  return request<void>(`/auth/qrSessions/${id}:confirm`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function rejectQrSession(id: string): Promise<void> {
  return request<void>(`/auth/qrSessions/${id}:reject`, { method: 'POST' })
}

export function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}
