import type { RtcAdapter, RtcAdapterOptions, RtcMember } from './types'

const NAMES = [
  '李明',
  '王芳',
  '张涛',
  '陈静',
  '刘洋',
  '赵敏',
  '孙鹏',
  '周宁',
  '吴磊',
  '郑爽',
  '冯雷',
]

/**
 * mock 适配器：M13 阶段唯一实现，行为只保证「会中界面要的状态都有」。
 * D13 需要多人宫格时用 extraParticipants 造人；默认 0，D12 单人态不变。
 */
export function createMockRtcAdapter(options: RtcAdapterOptions = {}): RtcAdapter {
  const delay = options.connectDelayMs ?? 200
  const extra = options.extraParticipants ?? 0
  let connected = false

  const wait = async (): Promise<void> => {
    if (delay <= 0) return
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay)
    })
  }

  const roster = (): RtcMember[] =>
    Array.from({ length: extra }, (_, index) => ({
      id: `mock_${index + 1}`,
      name: NAMES[index % NAMES.length] ?? `成员${index + 1}`,
      micOn: index % 3 !== 2,
      cameraOn: false,
      speaking: index === 0,
    }))

  return {
    async connect(token: string): Promise<void> {
      if (token === '') throw new Error('RTC token 为空')
      await wait()
      connected = true
    },
    async disconnect(): Promise<void> {
      await wait()
      connected = false
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
    roster(): RtcMember[] {
      return connected ? roster() : []
    },
  }
}
