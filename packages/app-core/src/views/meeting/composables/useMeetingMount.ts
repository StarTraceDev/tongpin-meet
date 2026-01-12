import { computed, onMounted, onUnmounted, ref, type ComputedRef } from 'vue'

import { useAuthStore } from '../../../stores/auth'
import { useMeetingStore } from '../../../stores/meeting'
import {
  toParticipant,
  useParticipantsStore,
  type ParticipantRole,
} from '../../../stores/participants'
import { useRtcStore } from '../../../stores/rtc'

function formatElapsed(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 进会生命周期：拉详情 → 入会 → 建本地成员 → 连 RTC（mock）→ 起计时器；
 * 卸载时离会、断开、清成员，避免回到首页还挂着上一场会议。
 */
export function useMeetingMount(meetingId: () => string): {
  elapsed: ComputedRef<string>
  loading: ComputedRef<boolean>
  error: ComputedRef<string>
  retry: () => Promise<void>
} {
  const auth = useAuthStore()
  const meeting = useMeetingStore()
  const participants = useParticipantsStore()
  const rtc = useRtcStore()

  const elapsedSeconds = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function startClock(): void {
    if (timer !== undefined) return
    timer = setInterval(() => {
      if (meeting.joinedAt === null) return
      elapsedSeconds.value = Math.floor((Date.now() - meeting.joinedAt) / 1000)
    }, 1000)
  }

  async function mount(): Promise<void> {
    const ok = await meeting.enter(meetingId())
    if (!ok) return

    const self = meeting.self
    if (self !== null) {
      const name = auth.user?.name ?? self.guestName ?? '我'
      const role = (self.role ?? (meeting.isHost ? 'HOST' : 'MEMBER')) as ParticipantRole
      participants.setSelf(toParticipant(self, name, role))
    }

    elapsedSeconds.value = 0
    await rtc.connect(meeting.rtc?.token ?? '')

    // 远端成员由 RTC 提供（mock 阶段是合成成员），角色一律 MEMBER；自己已在上面放好
    if (rtc.members.length > 0) {
      const selfMember = participants.self
      const remotes = rtc.members.map((member) => ({
        ...member,
        role: 'MEMBER' as const,
      }))
      participants.replaceAll(selfMember === null ? remotes : [selfMember, ...remotes])
    }
    startClock()
  }

  onMounted(() => {
    void mount()
  })

  onUnmounted(() => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
    void rtc.disconnect()
    void meeting.leave()
    participants.reset()
  })

  return {
    elapsed: computed(() => formatElapsed(elapsedSeconds.value)),
    loading: computed(() => meeting.loading),
    error: computed(() => meeting.error),
    retry: mount,
  }
}
