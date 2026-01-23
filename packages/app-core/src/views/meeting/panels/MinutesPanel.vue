<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { fetchMinutes } from '../../../apis/minutes'
import AppIcon from '../../../components/AppIcon.vue'
import { usePanelContext } from './panelContext'
import { renderMarkdown } from './markdown'

const context = usePanelContext()
const meetingId = computed(() => context.meetingId())

/** 服务端还没有真正的 AI 生成：先按设计稿做本地流式，接 M12 后换接口 */
const MOCK_SUMMARY =
  '本季度整体达成率 92%，缺口集中在华东区域；续约率环比 +4.6pt，打法需要沉淀；埋点口径存在分歧，需本周内对齐。'
const MOCK_DOC = [
  '## 一、复盘结论',
  '- 三季度整体达成率 92%，缺口集中在华东区域',
  '## 二、待办',
  '- 张涛：补充埋点口径说明（下周一前）',
  '- 王芳：输出华东区域客户清单',
].join('\n')

const summary = ref('')
const content = ref('')
const streaming = ref(false)
const paused = ref(false)
const finished = ref(false)
const expanded = ref(false)
const draft = ref('')
const generatedAt = ref('')
let timer: ReturnType<typeof setTimeout> | null = null

const html = computed(() => renderMarkdown(content.value))
const canExpand = computed(() => content.value.length > 120)

function stamp(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function stopTimer(): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

/** 一次推 2～3 个字，像真流式那样慢慢长出来 */
function push(target: typeof summary, text: string, index: number, onDone: () => void): void {
  if (paused.value) {
    timer = setTimeout(() => push(target, text, index, onDone), 120)
    return
  }
  const step = 2 + Math.floor(Math.random() * 2)
  target.value = text.slice(0, index + step)
  if (index + step >= text.length) {
    streaming.value = false
    onDone()
    return
  }
  timer = setTimeout(() => push(target, text, index + step, onDone), 26)
}

function startStream(): void {
  stopTimer()
  summary.value = ''
  content.value = ''
  finished.value = false
  streaming.value = true
  paused.value = false
  generatedAt.value = stamp()
  push(summary, MOCK_SUMMARY, 0, () => {
    push(content, MOCK_DOC, 0, () => {
      finished.value = true
      generatedAt.value = stamp()
    })
  })
}

async function copyDoc(): Promise<void> {
  try {
    await navigator.clipboard.writeText(content.value)
  } catch {
    // 剪贴板不可用时静默失败，不打断阅读
  }
}

function togglePause(): void {
  paused.value = !paused.value
}

function ask(): void {
  const text = draft.value.trim()
  if (text === '') return
  draft.value = ''
  startStream()
}

async function bootstrap(): Promise<void> {
  if (meetingId.value === '') {
    startStream()
    return
  }
  try {
    const minutes = await fetchMinutes(meetingId.value)
    if (minutes.content !== '') {
      content.value = minutes.content
      summary.value = minutes.content.split('\n')[0] ?? ''
      generatedAt.value = new Date(minutes.updatedAt).toTimeString().slice(0, 5)
      finished.value = true
      return
    }
  } catch {
    // 没有纪要记录时走本地流式
  }
  startStream()
}

onMounted(() => {
  void bootstrap()
})

onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="minutes-panel">
    <div class="minutes-body">
      <div class="minutes-summary">
        <strong>会议概括</strong>
        <p>{{ summary === '' ? '持续总结中，总结内容仅你可见…' : summary }}</p>
      </div>
      <p class="minutes-meta">{{ generatedAt || '—' }} 内容由AI生成</p>

      <div class="minutes-role">会议助手 <span>刚刚</span></div>
      <div class="minutes-bubble">已生成阶段性纪要，含 3 个结论与 2 项待办。</div>

      <div v-if="content.trim() !== ''" class="minutes-doc" :class="{ expanded }">
        <button class="minutes-copy" type="button" @click="copyDoc">
          <AppIcon name="copy" :size="13" />
          <span>复制</span>
        </button>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="md" v-html="html" />
      </div>
      <button v-if="canExpand" class="minutes-more" type="button" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开全部' }}
      </button>
      <p v-if="!finished && !streaming" class="minutes-empty">还没有纪要，点输入框让助手开始整理</p>
    </div>

    <div class="minutes-foot">
      <AppIcon name="sparkle" :size="18" />
      <input
        v-model="draft"
        class="minutes-input"
        placeholder="洞察讨论观点，总结纪要及待办"
        @keyup.enter="ask"
      />
      <button
        class="minutes-pause"
        type="button"
        :title="paused ? '继续生成' : '暂停生成'"
        @click="togglePause"
      >
        <AppIcon :name="paused ? 'play' : 'pause'" :size="16" />
      </button>
    </div>
  </div>
</template>
