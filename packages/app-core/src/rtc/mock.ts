import type { RtcAdapter, RtcAdapterOptions, RtcChatMessage, RtcMember } from './types'

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

  const chatListeners = new Set<(message: RtcChatMessage) => void>()
  const replies = ['收到', '好的', '我这边同步一下', '没问题', '稍等我看下']
  let seq = 0

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
    sendChat(): void {
      if (!connected) return
      const members = roster()
      const speaker = members[0]
      if (speaker === undefined) return
      seq += 1
      const text = replies[seq % replies.length] ?? '收到'
      setTimeout(() => {
        if (!connected) return
        const message: RtcChatMessage = {
          id: `mock_chat_${String(seq)}`,
          senderId: speaker.id,
          senderName: speaker.name,
          text,
          at: Date.now(),
        }
        for (const listener of chatListeners) listener(message)
      }, 700)
    },
    onChatMessage(listener: (message: RtcChatMessage) => void): () => void {
      chatListeners.add(listener)
      return () => {
        chatListeners.delete(listener)
      }
    },
  }
}
