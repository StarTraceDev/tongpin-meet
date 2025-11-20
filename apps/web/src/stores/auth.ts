import type { AuthUser } from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  fetchMe,
  loginByPassword,
  loginBySms,
  type LoginPayload,
  type SmsLoginPayload,
} from '@/api/auth'
import { clearTokens, getAccessToken, setTokens } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const accessToken = ref<string | null>(getAccessToken())

  const isLoggedIn = computed(() => accessToken.value !== null)

  async function login(payload: LoginPayload): Promise<void> {
    const session = await loginByPassword(payload)
    setTokens(session.tokens)
    accessToken.value = session.tokens.accessToken
    user.value = session.user
  }

  async function loginSms(payload: SmsLoginPayload): Promise<void> {
    const session = await loginBySms(payload)
    setTokens(session.tokens)
    accessToken.value = session.tokens.accessToken
    user.value = session.user
  }

  /** 设备码确认后把服务端签好的会话落到本地 */
  function adoptSession(session: {
    tokens: { accessToken: string; refreshToken: string }
    user: AuthUser
  }): void {
    setTokens(session.tokens)
    accessToken.value = session.tokens.accessToken
    user.value = session.user
  }

  async function loadMe(): Promise<AuthUser> {
    const me = await fetchMe()
    user.value = me
    return me
  }

  function logout(): void {
    clearTokens()
    accessToken.value = null
    user.value = null
  }

  return { user, accessToken, isLoggedIn, login, loginSms, adoptSession, loadMe, logout }
})
