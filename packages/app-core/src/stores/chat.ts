import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { RtcChatMessage } from '../rtc/types'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  at: number
  /** 自己发的消息在面板里右对齐 */
  self: boolean
}

/**
 * 会中聊天（10-M13 M13-4 / O14）：
 * 消息只有这一份，聊天面板、未读红点、弹幕层都从它派生；
 * 传输在 RTC 适配层（真实实现走 LiveKit DataChannel），store 不直连网络。
 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const unread = ref(0)
  /** 弹幕开关（工具栏左侧胶囊上的第一个图标） */
  const barrageOn = ref(true)

  /** 弹幕层只显示最近三条，和 D18 一致 */
  const recent = computed<ChatMessage[]>(() => messages.value.slice(-3))

  function push(message: ChatMessage): void {
    messages.value = [...messages.value, message]
  }

  function send(text: string, sender: { id: string; name: string }): void {
    const trimmed = text.trim()
    if (trimmed === '') return
    push({
      id: `local_${String(Date.now())}_${String(messages.value.length)}`,
      senderId: sender.id,
      senderName: sender.name,
      text: trimmed,
      at: Date.now(),
      self: true,
    })
  }

  function receive(message: RtcChatMessage): void {
    push({ ...message, self: false })
    unread.value += 1
  }

  function markRead(): void {
    unread.value = 0
  }

  function setBarrage(on: boolean): void {
    barrageOn.value = on
  }

  function reset(): void {
    messages.value = []
    unread.value = 0
    barrageOn.value = true
  }

  return {
    messages,
    unread,
    barrageOn,
    recent,
    send,
    receive,
    markRead,
    setBarrage,
    reset,
  }
})
