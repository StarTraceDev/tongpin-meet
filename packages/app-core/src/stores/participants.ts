import type {
  MeetingJoinResult,
  MeetingParticipant as ServerParticipant,
} from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ParticipantRole = 'HOST' | 'COHOST' | 'MEMBER' | 'GUEST'

/** 会中成员视图模型：视频墙、成员面板、姓名条都读这一份（M13-2/M13-4 复用） */
export interface MeetingParticipant {
  id: string
  name: string
  role: ParticipantRole
  micOn: boolean
  cameraOn: boolean
  speaking: boolean
}

export const useParticipantsStore = defineStore('participants', () => {
  const participants = ref<MeetingParticipant[]>([])
  const selfId = ref<string | null>(null)

  const count = computed<number>(() => participants.value.length)
  const self = computed<MeetingParticipant | null>(
    () => participants.value.find((item) => item.id === selfId.value) ?? null,
  )
  const hosts = computed<MeetingParticipant[]>(() =>
    participants.value.filter((item) => item.role === 'HOST' || item.role === 'COHOST'),
  )

  /** 入会后把自己放进来（RTC 拿到远端成员后再增量合并，不整表覆盖） */
  function setSelf(member: MeetingParticipant): void {
    selfId.value = member.id
    const index = participants.value.findIndex((item) => item.id === member.id)
    if (index === -1) participants.value.push(member)
    else participants.value[index] = member
  }

  function update(id: string, patch: Partial<MeetingParticipant>): void {
    const index = participants.value.findIndex((item) => item.id === id)
    const current = participants.value[index]
    if (current === undefined) return
    participants.value[index] = { ...current, ...patch }
  }

  /** RTC 连上后整体覆盖（自己 + 远端），避免旧成员残留 */
  function replaceAll(list: MeetingParticipant[]): void {
    participants.value = list
  }

  /** 主持人「全体静音 / 解除全体静音」：只改成员状态，真正下发给 RTC 由 M13-8 接 */
  function setAllMic(on: boolean): void {
    participants.value = participants.value.map((item) =>
      item.role === 'HOST' ? item : { ...item, micOn: on },
    )
  }

  const roleOf = (role: ServerParticipant['role']): ParticipantRole => {
    if (role === 'HOST') return 'HOST'
    if (role === 'COHOST') return 'COHOST'
    if (role === 'GUEST') return 'GUEST'
    return 'MEMBER'
  }

  /** 服务端成员表是权威数据；说话态仍用本地 RTC 的值 */
  function syncFromServer(list: ServerParticipant[]): void {
    const speaking = new Map(participants.value.map((item) => [item.id, item.speaking]))
    participants.value = list.map((item) => ({
      id: item.id,
      name: item.name,
      role: roleOf(item.role),
      micOn: item.audioOn,
      cameraOn: item.videoOn,
      speaking: speaking.get(item.id) ?? false,
    }))
  }

  function reset(): void {
    participants.value = []
    selfId.value = null
  }

  return {
    participants,
    selfId,
    count,
    self,
    hosts,
    setSelf,
    update,
    replaceAll,
    syncFromServer,
    setAllMic,
    reset,
  }
})

/** 入会接口只给 id/role/guestName，昵称由本地用户补齐 */
export function toParticipant(
  participant: MeetingJoinResult['participant'],
  name: string,
  role: ParticipantRole,
): MeetingParticipant {
  return {
    id: participant.id,
    name,
    role,
    micOn: true,
    cameraOn: false,
    speaking: false,
  }
}
