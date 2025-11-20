import type { AuthUser } from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { fetchMe, loginByPassword, type LoginPayload } from '@/api/auth'
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

  return { user, accessToken, isLoggedIn, login, loadMe, logout }
})
