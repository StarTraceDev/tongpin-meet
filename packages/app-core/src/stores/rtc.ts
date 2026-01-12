import { defineStore } from 'pinia'
import { ref } from 'vue'

import { createMockRtcAdapter } from '../rtc/mock'
import type { RtcAdapter, RtcMember, RtcStatus } from '../rtc/types'

/** D13 验证用：VITE_MOCK_MEMBERS=11 时 mock 造 11 个远端成员；生产不带该变量 → 0 */
const MOCK_MEMBERS = Number(import.meta.env.VITE_MOCK_MEMBERS ?? 0) || 0

let adapter: RtcAdapter = createMockRtcAdapter({ extraParticipants: MOCK_MEMBERS })

/** 测试或接 LiveKit 时替换实现（M13 阶段固定 mock） */
export function setRtcAdapter(next: RtcAdapter): void {
  adapter = next
}

/** 连接状态与本地设备开关的唯一真相（10-M13 O14）；面板只读这里，不各自连麦 */
export const useRtcStore = defineStore('rtc', () => {
  const status = ref<RtcStatus>('idle')
  const micOn = ref(true)
  const cameraOn = ref(false)
  const sharing = ref(false)
  const error = ref('')
  /** 远端成员镜像；说话态/开关麦都从这里读，瓦片不各自探测（O14） */
  const members = ref<RtcMember[]>([])

  async function connect(token: string): Promise<void> {
    status.value = 'connecting'
    error.value = ''
    try {
      await adapter.connect(token)
      await adapter.setMicEnabled(micOn.value)
      await adapter.setCameraEnabled(cameraOn.value)
      members.value = adapter.roster()
      status.value = 'connected'
    } catch (err) {
      status.value = 'disconnected'
      error.value = err instanceof Error ? err.message : '音视频连接失败'
    }
  }

  async function disconnect(): Promise<void> {
    await adapter.disconnect()
    status.value = 'idle'
    sharing.value = false
    members.value = []
  }

  async function toggleMic(): Promise<void> {
    micOn.value = !micOn.value
    await adapter.setMicEnabled(micOn.value)
  }

  async function toggleCamera(): Promise<void> {
    cameraOn.value = !cameraOn.value
    await adapter.setCameraEnabled(cameraOn.value)
  }

  async function setSharing(on: boolean): Promise<void> {
    sharing.value = on
    await adapter.setScreenSharing(on)
  }

  function reset(): void {
    status.value = 'idle'
    micOn.value = true
    cameraOn.value = false
    sharing.value = false
    error.value = ''
    members.value = []
  }

  return {
    status,
    micOn,
    cameraOn,
    sharing,
    error,
    members,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    setSharing,
    reset,
  }
})
