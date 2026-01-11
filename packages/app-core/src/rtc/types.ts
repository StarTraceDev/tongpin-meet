/**
 * RTC 适配层：会中所有音视频能力只经过这个接口。
 * M13 阶段先用 mock（10-M13：RTC 先用 mock adapter 隔离），接 LiveKit 时只换实现。
 */
export type RtcStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface RtcAdapter {
  connect(token: string): Promise<void>
  disconnect(): Promise<void>
  setMicEnabled(on: boolean): Promise<void>
  setCameraEnabled(on: boolean): Promise<void>
  setScreenSharing(on: boolean): Promise<void>
}

export interface RtcAdapterOptions {
  /** mock 连接耗时，测试可传 0 */
  connectDelayMs?: number
}
