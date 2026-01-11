import type { RtcAdapter, RtcAdapterOptions } from './types'

/**
 * mock RTC：不连任何媒体服务器，只把「连接状态 + 本地设备开关」模拟出来。
 * 接 LiveKit 时新增 `livekit.ts` 实现同一个 RtcAdapter，store 不用改。
 */
export function createMockRtcAdapter(options: RtcAdapterOptions = {}): RtcAdapter {
  const delay = options.connectDelayMs ?? 200

  const wait = (): Promise<void> =>
    delay <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, delay))

  return {
    async connect(token: string): Promise<void> {
      if (token === '') throw new Error('RTC token 为空')
      await wait()
    },
    async disconnect(): Promise<void> {
      await wait()
    },
    async setMicEnabled(): Promise<void> {
      await wait()
    },
    async setCameraEnabled(): Promise<void> {
      await wait()
    },
    async setScreenSharing(): Promise<void> {
      await wait()
    },
  }
}
