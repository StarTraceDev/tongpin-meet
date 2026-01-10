import type { AuthUser } from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  fetchMe,
  loginByPassword,
  loginBySms,
  type LoginPayload,
  type SmsLoginPayload,
} from '../apis/auth'
import { clearTokens, session, setTokens } from '../apis/http'

/**
 * O8：store 只存 user，token 的唯一真相在 apis/http 的内存副本（session）。
 * 这里保留 getter 只是给模板读，不再自己 set token。
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)

  const accessToken = computed(() => session.accessToken)
  const isLoggedIn = computed(() => session.accessToken !== null)

  async function login(payload: LoginPayload): Promise<void> {
    const result = await loginByPassword(payload)
    setTokens(result.tokens)
    user.value = result.user
  }

  async function loginSms(payload: SmsLoginPayload): Promise<void> {
    const result = await loginBySms(payload)
    setTokens(result.tokens)
    user.value = result.user
  }

  /** 设备码确认后把服务端签好的会话落到本地 */
  function adoptSession(result: {
    tokens: { accessToken: string; refreshToken: string }
    user: AuthUser
  }): void {
    setTokens(result.tokens)
    user.value = result.user
  }

  async function loadMe(): Promise<AuthUser> {
    const me = await fetchMe()
    user.value = me
    return me
  }

  function logout(): void {
    clearTokens()
    user.value = null
  }

  return {
    user,
    accessToken,
    isLoggedIn,
    login,
    loginSms,
    adoptSession,
    loadMe,
    logout,
  }
})
