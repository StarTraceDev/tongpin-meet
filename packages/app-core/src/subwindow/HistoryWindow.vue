<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { listMeetings } from '../apis/meeting'
import { useAuthStore } from '../stores/auth'
import type { Meeting } from '@tongpin/shared/types'

const auth = useAuthStore()

const meetings = ref<Meeting[]>([])
const keyword = ref('')
const loading = ref(true)
const editing = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null

interface Group {
  key: string
  label: string
  year: string
  items: Meeting[]
}

function dayLabel(date: Date): string {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((startOfToday - startOfDay) / 86_400_000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const groups = computed<Group[]>(() => {
  const buckets = new Map<string, Group>()
  for (const item of meetings.value) {
    const start = new Date(item.actualStartAt ?? item.startAt)
    const key = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`
    const existing = buckets.get(key)
    if (existing === undefined) {
      buckets.set(key, {
        key,
        label: dayLabel(start),
        year: String(start.getFullYear()),
        items: [item],
      })
    } else {
      existing.items.push(item)
    }
  }
  return [...buckets.values()]
})

function meetingNoText(meeting: Meeting): string {
  return meeting.meetingNo.replace(/(\d{3})(?=\d)/g, '$1 ')
}

function timeRange(meeting: Meeting): string {
  const start = new Date(meeting.actualStartAt ?? meeting.startAt)
  const end = new Date(meeting.actualEndAt ?? meeting.endAt)
  return `${clock(start)}–${clock(end)}`
}

function hostName(meeting: Meeting): string {
  if (auth.user !== null && meeting.hostId === auth.user.id) return auth.user.name
  return '—'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const page = await listMeetings({ scope: 'ended', pageSize: 50, keyword: keyword.value })
    meetings.value = page.items
  } catch {
    meetings.value = []
  } finally {
    loading.value = false
  }
}

function onSearch(): void {
  if (timer !== null) clearTimeout(timer)
  timer = setTimeout(() => void load(), 300)
}

function remove(id: string): void {
  meetings.value = meetings.value.filter((item) => item.id !== id)
}

onMounted(load)
</script>

<template>
  <div class="history-window">
    <header class="history-head">
      <span class="history-title">历史会议</span>
      <button class="history-edit" type="button" @click="editing = !editing">
        {{ editing ? '完成' : '编辑' }}
      </button>
    </header>

    <label class="history-search">
      <AppIcon name="search" :size="16" />
      <input
        v-model="keyword"
        type="search"
        placeholder="会议名称、会议备注、会议号、发起人"
        @input="onSearch"
      />
    </label>

    <div class="history-list">
      <p v-if="loading" class="history-tip">加载中…</p>
      <p v-else-if="groups.length === 0" class="history-tip">暂无历史会议</p>

      <template v-for="group in groups" :key="group.key">
        <div class="history-day">
          <span>{{ group.label }}</span>
          <span>{{ group.year }}</span>
        </div>
        <article v-for="item in group.items" :key="item.id" class="history-row">
          <div class="history-main">
            <p class="history-no">{{ meetingNoText(item) }}</p>
            <p class="history-name">{{ item.title }}</p>
            <p class="history-meta">
              <span>发起人：{{ hostName(item) }}</span>
              <span>时间：{{ timeRange(item) }}</span>
            </p>
          </div>
          <button v-if="editing" class="history-remove" type="button" @click="remove(item.id)">
            删除
          </button>
        </article>
      </template>

      <p v-if="!loading && groups.length > 0" class="history-end">— 没有更多了 —</p>
    </div>
  </div>
</template>

<style scoped>
.history-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.history-head {
  position: relative;
  flex: none;
  height: 36px;
  color: var(--tp-text-title);
  font-size: 18px;
  font-weight: 500;
  line-height: 36px;
  text-align: center;
  -webkit-app-region: drag;
}

.history-edit {
  position: absolute;
  top: 0;
  right: 16px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tp-brand);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.history-search {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: 40px;
  margin: 4px 16px 8px;
  padding: 0 12px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  color: var(--tp-text-placeholder);
}

.history-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 14px;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.history-tip {
  margin: 32px 0;
  color: var(--tp-text-tertiary);
  font-size: 13px;
  text-align: center;
}

.history-day {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--tp-surface-secondary);
  color: var(--tp-text-secondary);
  font-size: 13px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--tp-border-light);
}

.history-main {
  flex: 1;
  min-width: 0;
}

.history-no {
  margin: 0;
  color: var(--tp-text-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.history-name {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--tp-text-title);
  font-size: 17px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: flex;
  gap: 16px;
  margin: 6px 0 0;
  color: var(--tp-text-tertiary);
  font-size: 12px;
}

.history-remove {
  flex: none;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--tp-danger);
  border-radius: var(--tp-radius-s);
  background: transparent;
  color: var(--tp-danger);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.history-end {
  margin: 20px 0 24px;
  color: var(--tp-text-placeholder);
  font-size: 12px;
  text-align: center;
}
</style>
