import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useChatStore } from './chat'

describe('会中聊天 store（10-M13 M13-4 / O14）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('自己发的消息右对齐且不计未读', () => {
    const chat = useChatStore()
    chat.send('  你好  ', { id: 'me', name: '我' })
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0]?.text).toBe('你好')
    expect(chat.messages[0]?.self).toBe(true)
    expect(chat.unread).toBe(0)
  })

  it('空消息不发送', () => {
    const chat = useChatStore()
    chat.send('   ', { id: 'me', name: '我' })
    expect(chat.messages).toHaveLength(0)
  })

  it('远端消息累计未读，打开面板清零', () => {
    const chat = useChatStore()
    chat.receive({ id: 'm1', senderId: 'u1', senderName: '李明', text: '收到', at: 1 })
    chat.receive({ id: 'm2', senderId: 'u2', senderName: '王芳', text: '好的', at: 2 })
    expect(chat.unread).toBe(2)
    chat.markRead()
    expect(chat.unread).toBe(0)
  })

  it('弹幕只取最近三条，可关闭', () => {
    const chat = useChatStore()
    for (let i = 0; i < 5; i += 1) {
      chat.receive({
        id: `m${String(i)}`,
        senderId: 'u',
        senderName: '李明',
        text: `第${String(i)}条`,
        at: i,
      })
    }
    expect(chat.recent.map((item) => item.text)).toEqual(['第2条', '第3条', '第4条'])
    chat.setBarrage(false)
    expect(chat.barrageOn).toBe(false)
  })

  it('reset 清空消息与未读', () => {
    const chat = useChatStore()
    chat.receive({ id: 'm1', senderId: 'u1', senderName: '李明', text: '收到', at: 1 })
    chat.reset()
    expect(chat.messages).toEqual([])
    expect(chat.unread).toBe(0)
    expect(chat.barrageOn).toBe(true)
  })
})
