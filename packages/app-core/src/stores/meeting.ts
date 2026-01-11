import type { Meeting, MeetingJoinResult } from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { ApiError } from '../apis/http'
import { endMeeting, getMeeting, joinMeeting, leaveMeeting } from '../apis/meeting'
import { useAuthStore } from './auth'

/**
 * 当前会议的唯一真相（10-M13 O14）：标题/会议号/我的角色/入会时间都从这里读，
 * 面板与顶栏不再各自 fetch。
 */
export const useMeetingStore = defineStore('meeting', () => {
  const meeting = ref<Meeting | null>(null)
  const self = ref<MeetingJoinResult['participant'] | null>(null)
  const rtc = ref<MeetingJoinResult['rtc'] | null>(null)
  const joinedAt = ref<number | null>(null)
  const loading = ref(false)
  const error = ref('')

  const meetingId = computed<string>(() => meeting.value?.id ?? '')
  const title = computed<string>(() => meeting.value?.title ?? '')
  const meetingNo = computed<string>(() => meeting.value?.meetingNo ?? '')
  const isHost = computed<boolean>(() => {
    const auth = useAuthStore()
    if (self.value?.role === 'HOST') return true
    return meeting.value !== null && auth.user !== null && meeting.value.hostId === auth.user.id
  })

  /** 进会：先拿详情再入会；等候室/密码错等失败写进 error，由壳展示 */
  async function enter(id: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const detail = await getMeeting(id)
      const result = await joinMeeting(id)
      if ('waiting' in result) {
        error.value = '会议已开启等候室，请在主窗口等待主持人准入'
        return false
      }
      meeting.value = detail
      self.value = result.participant
      rtc.value = result.rtc
      joinedAt.value = Date.now()
      return true
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : '进入会议失败，请返回后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  async function leave(): Promise<void> {
    const id = meeting.value?.id
    meeting.value = null
    self.value = null
    rtc.value = null
    joinedAt.value = null
    if (id !== undefined) {
      try {
        await leaveMeeting(id)
      } catch {
        // 离会失败不阻塞关窗（服务端幂等，断线时本来也可能调不通）
      }
    }
  }

  async function end(): Promise<void> {
    const id = meeting.value?.id
    if (id === undefined) return
    await endMeeting(id)
    await leave()
  }

  return {
    meeting,
    self,
    rtc,
    joinedAt,
    loading,
    error,
    meetingId,
    title,
    meetingNo,
    isHost,
    enter,
    leave,
    end,
  }
})
