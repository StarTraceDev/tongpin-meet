<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { renderMarkdown } from './markdown'

interface Bubble {
  id: number
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
}

const QUICK_QUESTIONS = ['总结当前会议重点', '推荐3个值得继续深挖的方向', '列出待办事项']

/** 服务端还没有智能助手接口，先按设计稿做本地流式问答 */
const ANSWERS: Record<string, string> = {
  总结当前会议重点: [
    '**当前会议三个重点：**',
    '- 三季度达成率 92%，缺口在华东',
    '- 续约率环比 +4.6pt，需沉淀打法',
    '- 埋点口径不一致，需本周内对齐',
  ].join('\n'),
  推荐3个值得继续深挖的方向: [
    '1. 华东区域客户流失的共性原因',
    '2. 续约率提升的关键动作可复制性',
    '3. 埋点口径统一的落地成本',
  ].join('\n'),
  列出待办事项: ['- 张涛：补充埋点口径说明（下周一前）', '- 王芳：输出华东区域客户清单'].join('\n'),
}
const FALLBACK = '我记下了这个问题。等会议 AI 服务接入后，我会结合实时转写给出更完整的回答。'

const messages = ref<Bubble[]>([])
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
const streaming = ref(false)
let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null

const quickVisible = computed(() => messages.value.length === 0)

function scrollToEnd(): void {
  void nextTick(() => {
    if (listRef.value !== null) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

function stopTimer(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function stream(bubble: Bubble, text: string, index: number): void {
  const step = 2 + Math.floor(Math.random() * 3)
  bubble.text = text.slice(0, index + step)
  scrollToEnd()
  if (index + step >= text.length) {
    bubble.streaming = false
    streaming.value = false
    return
  }
  timer = setTimeout(() => stream(bubble, text, index + step), 24)
}

function ask(question: string): void {
  const text = question.trim()
  if (text === '' || streaming.value) return
  draft.value = ''
  messages.value.push({ id: (seq += 1), role: 'user', text })
  messages.value.push({ id: (seq += 1), role: 'assistant', text: '', streaming: true })
  streaming.value = true
  scrollToEnd()
  stopTimer()
  // 必须拿数组里的响应式代理再改，直接改 push 进去的原始对象不会触发渲染
  const answer = messages.value[messages.value.length - 1] as Bubble
  stream(answer, ANSWERS[text] ?? FALLBACK, 0)
}

watch(messages, scrollToEnd, { deep: true })
onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="assistant-panel">
    <div ref="listRef" class="assistant-list">
      <div v-if="quickVisible" class="assistant-intro">
        <AppIcon name="sparkle" :size="28" />
        <h3>关于这场会议，你可以问我</h3>
        <div class="assistant-quick">
          <button
            v-for="question in QUICK_QUESTIONS"
            :key="question"
            type="button"
            class="assistant-chip"
            @click="ask(question)"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <template v-for="message in messages" :key="message.id">
        <div v-if="message.role === 'user'" class="assistant-msg user">
          <p>{{ message.text }}</p>
        </div>
        <div v-else class="assistant-msg assistant">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="md" v-html="renderMarkdown(message.text)" />
          <span v-if="message.streaming" class="assistant-caret" />
        </div>
      </template>
    </div>

    <div class="assistant-foot">
      <input
        v-model="draft"
        class="assistant-input"
        placeholder="关于会议有什么想了解的？"
        @keyup.enter="ask(draft)"
      />
      <button class="assistant-send" type="button" title="发送" @click="ask(draft)">
        <AppIcon name="send" :size="16" />
      </button>
    </div>
  </div>
</template>
