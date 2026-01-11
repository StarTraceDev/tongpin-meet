<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { Meeting } from '@tongpin/shared/types'

import AppIcon from '../components/AppIcon.vue'
import { listMeetings } from '../apis/meeting'
import { usePlatform } from '../platform'
import { ROUTE_NAMES } from '../router/names'

const platform = usePlatform()
const router = useRouter()

const meetings = ref<Meeting[]>([])
const loading = ref(false)
const keyword = ref('')

const entries = [
  { key: 'join', label: '加入会议', icon: 'plus', tone: 'amber' },
  { key: 'quick', label: '快速会议', icon: 'zap', tone: 'blue' },
  { key: 'schedule', label: '预定会议', icon: 'cal-plus', tone: 'purple' },
  { key: 'share', label: '共享屏幕', icon: 'monitor', tone: 'teal' },
] as const

function formatNo(meetingNo: string): string {
  return meetingNo.replace(/(\d{3})(?=\d)/g, '$1 ')
}

const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function timeOf(meeting: Meeting): string {
  return timeFormat.format(new Date(meeting.startAt))
}

function dayLabel(meeting: Meeting): string {
  const start = new Date(meeting.startAt)
  const today = new Date()
  const dayOf = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((dayOf(start) - dayOf(today)) / 86_400_000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  return `${String(start.getMonth() + 1).padStart(2, '0')}月${String(start.getDate()).padStart(2, '0')}日`
}

function soon(meeting: Meeting): boolean {
  const diff = new Date(meeting.startAt).getTime() - Date.now()
  return diff >= 0 && diff <= 3_600_000
}

function tagText(meeting: Meeting): string {
  if (meeting.status === 'ONGOING') return '进行中'
  if (meeting.status === 'ENDED') return '已结束'
  return soon(meeting) ? '即将开始' : '待开始'
}

function tagTone(meeting: Meeting): string {
  if (meeting.status === 'ONGOING') return 'live'
  if (meeting.status === 'ENDED') return 'muted'
  return soon(meeting) ? 'brand' : 'muted'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listMeetings({
      scope: 'upcoming',
      page: 1,
      pageSize: 20,
      ...(keyword.value.trim() === '' ? {} : { keyword: keyword.value.trim() }),
    })
    meetings.value = result.items
  } catch {
    ElMessage.error('会议列表加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/** 搜索停止输入 300ms 再请求，避免每敲一个字打一次后端 */
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, () => {
  if (searchTimer !== null) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void load()
  }, 300)
})

function openEntry(key: (typeof entries)[number]['key']): void {
  if (key === 'join') {
    void platform.window.openSub('join', { title: '加入会议' })
    return
  }
  if (key === 'schedule') {
    void platform.window.openSub('schedule', { title: '预定会议' })
    return
  }
  ElMessage.info(key === 'quick' ? '快速会议将在 M13-1 接入' : '共享屏幕将在 M13-8 接入')
}

function openMeeting(meeting: Meeting): void {
  if (meeting.status === 'ENDED') {
    void router.push({ name: ROUTE_NAMES.meetingEnded, params: { id: meeting.id } })
    return
  }
  // 桌面端会议室是独立窗 1065×710（10-M13 §二），web 端同一 tab 走路由
  if (platform.kind === 'electron') {
    void platform.window.openSub('meeting', { payload: { meetingId: meeting.id } })
    return
  }
  void router.push({ name: ROUTE_NAMES.meeting, params: { id: meeting.id } })
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="home">
    <section class="pane-left">
      <div class="entry-grid">
        <button
          v-for="entry in entries"
          :key="entry.key"
          class="entry"
          type="button"
          @click="openEntry(entry.key)"
        >
          <span class="glyph" :class="entry.tone">
            <AppIcon :name="entry.icon" :size="22" />
          </span>
          <span>{{ entry.label }}</span>
        </button>
      </div>
    </section>

    <section class="pane-right">
      <div class="search-row">
        <label class="search-box">
          <AppIcon name="search" :size="16" />
          <input v-model="keyword" type="search" placeholder="搜索" aria-label="搜索会议" />
        </label>
        <button class="link-more" type="button" @click="ElMessage.info('历史记录将在 M13-9 接入')">
          历史记录
          <AppIcon name="right" :size="12" />
        </button>
      </div>

      <div class="tabs">
        <span class="tab active">即将开始</span>
      </div>

      <div class="list">
        <button
          v-for="meeting in meetings"
          :key="meeting.id"
          class="meeting-row"
          type="button"
          @click="openMeeting(meeting)"
        >
          <span class="time">
            <span class="time-main">{{ timeOf(meeting) }}</span>
            <span class="time-sub">{{ dayLabel(meeting) }}</span>
          </span>
          <span class="main">
            <span class="title">{{ meeting.title }}</span>
            <span class="sub">会议号 {{ formatNo(meeting.meetingNo) }}</span>
          </span>
          <span class="tag" :class="tagTone(meeting)">{{ tagText(meeting) }}</span>
        </button>

        <div v-if="!loading && meetings.length === 0" class="empty">
          <span class="empty-art"><AppIcon name="inbox" :size="76" :stroke-width="1.1" /></span>
          <span class="empty-text">暂无相关内容</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--tp-canvas);
}

.pane-left {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 340px;
  padding-top: 38px;
  border-right: 1px solid var(--tp-border);
  -webkit-app-region: drag;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 108px);
  gap: 20px;
  justify-content: center;
  margin: auto 0;
  padding: 0 0 40px;
  -webkit-app-region: no-drag;
}

.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 108px;
  padding: 0;
  border: 0;
  border-radius: var(--tp-radius-m);
  background: var(--tp-fill);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.entry:hover {
  background: var(--tp-fill-hover);
}

.glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--tp-radius-l);
  color: #fff;
}

.glyph.amber {
  background: #ffb020;
}

.glyph.blue {
  background: var(--tp-brand);
}

.glyph.purple {
  background: var(--tp-purple);
}

.glyph.teal {
  background: var(--tp-success);
}

.pane-right {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding-top: 38px;
}

.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 240px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  color: var(--tp-text-placeholder);
}

.search-box input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.search-box input::placeholder {
  color: var(--tp-text-placeholder);
}

.search-box input::-webkit-search-cancel-button {
  display: none;
}

.link-more {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: var(--tp-fill);
  color: var(--tp-text-secondary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.link-more:hover {
  background: var(--tp-fill-hover);
}

.tabs {
  display: flex;
  gap: 22px;
  padding: 0 16px;
}

.tab {
  position: relative;
  padding: 6px 0 9px;
  font-size: 13px;
  color: var(--tp-text-secondary);
}

.tab.active {
  color: var(--tp-brand);
  font-weight: 500;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: var(--tp-brand);
  transform: translateX(-50%);
}

.list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.meeting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  height: 64px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid var(--tp-border-light);
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.meeting-row:hover {
  background: var(--tp-fill);
}

.time {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 92px;
  font-variant-numeric: tabular-nums;
}

.time-main {
  font-size: 13px;
  color: var(--tp-text-primary);
}

.time-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--tp-text-tertiary);
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.title {
  overflow: hidden;
  font-size: 13px;
  color: var(--tp-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin-top: 3px;
  overflow: hidden;
  font-size: 12px;
  color: var(--tp-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex: none;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.tag.brand {
  background: var(--tp-brand-tint);
  color: var(--tp-brand);
}

.tag.live {
  background: var(--tp-success-soft, #e8faf6);
  color: var(--tp-success);
}

.tag.muted {
  background: var(--tp-fill);
  color: var(--tp-text-tertiary);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex: 1;
}

.empty-art {
  color: var(--tp-icon-empty, #dcdfe6);
}

.empty-text {
  font-size: 13px;
  color: var(--tp-text-tertiary);
}
</style>
