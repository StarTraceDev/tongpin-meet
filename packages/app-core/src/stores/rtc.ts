import { defineStore } from 'pinia'
import { ref } from 'vue'

import { createMockRtcAdapter } from '../rtc/mock'
import type { RtcAdapter, RtcStatus } from '../rtc/types'

let adapter: RtcAdapter = createMockRtcAdapter()

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

  async function connect(token: string): Promise<void> {
    status.value = 'connecting'
    error.value = ''
    try {
      await adapter.connect(token)
      await adapter.setMicEnabled(micOn.value)
      await adapter.setCameraEnabled(cameraOn.value)
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
  }

  return {
    status,
    micOn,
    cameraOn,
    sharing,
    error,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    setSharing,
    reset,
  }
})
