<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useChatStore } from '../../../stores/chat'
import { useMeetingStore } from '../../../stores/meeting'
import { useParticipantsStore } from '../../../stores/participants'
import { useRtcStore } from '../../../stores/rtc'

const chat = useChatStore()
const rtc = useRtcStore()
const meeting = useMeetingStore()
const participants = useParticipantsStore()

const draft = ref('')
const scroller = ref<HTMLElement | null>(null)

const selfName = computed<string>(() => participants.self?.name ?? meeting.self?.guestName ?? '我')
const selfId = computed<string>(() => participants.self?.id ?? 'self')

/** 设计里只在顶部放一条「今天 15:42」，这里按最后一条消息的时间出 */
const dayLabel = computed<string>(() => {
  const last = chat.messages[chat.messages.length - 1]
  if (last === undefined) return ''
  const date = new Date(last.at)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `今天 ${hh}:${mm}`
})

function submit(): void {
  const text = draft.value.trim()
  if (text === '') return
  chat.send(text, { id: selfId.value, name: selfName.value })
  rtc.sendChat(text)
  draft.value = ''
}

function scrollToEnd(): void {
  const el = scroller.value
  if (el !== null) el.scrollTop = el.scrollHeight
}

watch(
  () => chat.messages.length,
  () => {
    void nextTick(scrollToEnd)
  },
)
</script>

<template>
  <div ref="scroller" class="panel-scroll chat-panel">
    <p v-if="chat.messages.length === 0" class="chat-empty">还没有消息，说点什么吧</p>
    <template v-else>
      <p v-if="dayLabel !== ''" class="chat-day">{{ dayLabel }}</p>
      <div
        v-for="message in chat.messages"
        :key="message.id"
        class="chat-msg"
        :class="{ self: message.self }"
      >
        <span class="chat-avatar" />
        <div class="chat-body">
          <div class="chat-name">{{ message.self ? '我' : message.senderName }}</div>
          <div class="chat-bubble">{{ message.text }}</div>
        </div>
      </div>
    </template>
  </div>

  <footer class="chat-foot">
    <div class="chat-tools">
      <AppIcon name="emoji" :size="18" />
      <AppIcon name="file" :size="18" />
    </div>
    <input
      v-model="draft"
      class="chat-input"
      type="text"
      placeholder="输入消息，按回车发送"
      @keyup.enter="submit"
    />
  </footer>
</template>
