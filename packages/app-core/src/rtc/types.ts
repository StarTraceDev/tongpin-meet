/**
 * RTC 适配层：会中所有音视频能力只经过这个接口。
 * M13 阶段先用 mock（10-M13：RTC 先用 mock adapter 隔离），接 LiveKit 时只换实现。
 */
export type RtcStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

/** 远端成员的最小形状；角色由 meeting store 补齐（RTC 不知道谁是主持人） */
export interface RtcMember {
  id: string
  name: string
  micOn: boolean
  cameraOn: boolean
  speaking: boolean
}

export interface RtcAdapter {
  connect(token: string): Promise<void>
  disconnect(): Promise<void>
  setMicEnabled(on: boolean): Promise<void>
  setCameraEnabled(on: boolean): Promise<void>
  setScreenSharing(on: boolean): Promise<void>
  /** 当前连接里的成员（不含本地；本地由 meeting/participants store 自己放） */
  roster(): RtcMember[]
}

export interface RtcAdapterOptions {
  /** mock 连接耗时，测试可传 0 */
  connectDelayMs?: number
  /** mock 额外成员数：0 = 只有自己（D12 单人态），11 = 12 人宫格（D13） */
  extraParticipants?: number
}
