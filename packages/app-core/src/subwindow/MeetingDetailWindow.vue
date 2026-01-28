<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { getMeeting } from '../apis/meeting'
import { usePlatform } from '../platform'
import { useAuthStore } from '../stores/auth'
import type { Meeting } from '@tongpin/shared/types'

const props = defineProps<{ payload?: { meetingId?: string } }>()

const platform = usePlatform()
const auth = useAuthStore()

const meeting = ref<Meeting | null>(null)
const failed = ref(false)

const meetingId = computed(() => props.payload?.meetingId ?? '')

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function clockOf(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dateOf(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const meetingNoText = computed(() =>
  (meeting.value?.meetingNo ?? '').replace(/(\d{3})(?=\d)/g, '$1 '),
)

const durationText = computed(() => {
  if (meeting.value === null) return ''
  const start = new Date(meeting.value.startAt).getTime()
  const end = new Date(meeting.value.endAt).getTime()
  const minutes = Math.max(1, Math.round((end - start) / 60_000))
  if (minutes >= 1440) return `${Math.round(minutes / 1440)}天`
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${hours}小时` : `${hours}小时${rest}分钟`
  }
  return `${minutes}分钟`
})

const statusText = computed(() => {
  switch (meeting.value?.status) {
    case 'ONGOING':
      return '进行中'
    case 'ENDED':
      return '已结束'
    default:
      return '即将开始'
  }
})

const hostName = computed(() => {
  if (meeting.value === null || auth.user === null) return '—'
  return meeting.value.hostId === auth.user.id ? auth.user.name : '—'
})

async function copyNo(): Promise<void> {
  try {
    await navigator.clipboard.writeText(meeting.value?.meetingNo ?? '')
    ElMessage.success('会议号已复制')
  } catch {
    ElMessage.warning('复制失败，请手动选择会议号')
  }
}

async function enter(): Promise<void> {
  if (meetingId.value === '') return
  await platform.window.openSub('meeting', { payload: { meetingId: meetingId.value } })
  await platform.window.closeSub('meetingDetail')
}

onMounted(async () => {
  if (meetingId.value === '') {
    failed.value = true
    return
  }
  try {
    meeting.value = await getMeeting(meetingId.value)
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div class="detail-window">
    <header class="detail-head">会议详情</header>

    <p v-if="failed" class="detail-tip">会议信息加载失败，请关闭后重试</p>
    <p v-else-if="meeting === null" class="detail-tip">加载中…</p>

    <template v-else>
      <div class="detail-body">
        <h1 class="detail-title">
          {{ meeting.title }}
          <span class="detail-tag">{{ statusText }}</span>
        </h1>

        <div class="detail-time">
          <div class="time-side">
            <strong>{{ clockOf(meeting.startAt) }}</strong>
            <span>{{ dateOf(meeting.startAt) }}</span>
          </div>
          <div class="time-mid">
            <span class="time-duration">{{ durationText }}</span>
            <span class="time-zone">(GMT+08:00)</span>
          </div>
          <div class="time-side time-right">
            <strong>{{ clockOf(meeting.endAt) }}</strong>
            <span>{{ dateOf(meeting.endAt) }}</span>
          </div>
        </div>

        <div class="detail-row detail-no">
          <span class="row-label">会议号</span>
          <span class="row-value">{{ meetingNoText }}</span>
          <button class="icon-btn" type="button" title="复制会议号" @click="copyNo">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>

        <div class="detail-row">
          <span class="row-label">发起人</span>
          <span class="host-avatar">{{ hostName.slice(0, 1) }}</span>
          <span class="row-value">{{ hostName }}</span>
        </div>
      </div>

      <footer class="detail-foot">
        <button class="sub-ghost" type="button" @click="copyNo">复制会议号</button>
        <button class="sub-primary" type="button" @click="enter">进入会议</button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.detail-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.detail-head {
  flex: none;
  height: 36px;
  color: var(--tp-text-title);
  font-size: 18px;
  font-weight: 500;
  line-height: 36px;
  text-align: center;
  -webkit-app-region: drag;
}

.detail-tip {
  margin: 40px 0;
  color: var(--tp-text-tertiary);
  font-size: 13px;
  text-align: center;
}

.detail-body {
  flex: 1;
  min-height: 0;
  padding: 8px 24px 0;
  overflow-y: auto;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  color: var(--tp-text-title);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-tag {
  flex: none;
  padding: 2px 8px;
  border-radius: var(--tp-radius-s);
  background: var(--tp-brand-tint);
  color: var(--tp-brand);
  font-size: 12px;
  font-weight: 400;
}

.detail-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}

.time-side {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--tp-text-title);
  font-size: 12px;
}

.time-side strong {
  font-size: 26px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.time-right {
  text-align: right;
}

.time-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--tp-text-tertiary);
  font-size: 12px;
}

.time-duration {
  padding: 2px 8px;
  border-radius: var(--tp-radius-s);
  background: var(--tp-fill);
  color: var(--tp-text-primary);
  font-size: 13px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--tp-border-light);
  font-size: 14px;
}

.row-label {
  flex: none;
  width: 56px;
  color: var(--tp-text-tertiary);
}

.row-value {
  flex: 1;
  min-width: 0;
  color: var(--tp-text-primary);
  font-variant-numeric: tabular-nums;
}

.icon-btn {
  flex: none;
  display: grid;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--tp-radius-s);
  background: transparent;
  color: var(--tp-text-secondary);
  cursor: pointer;
  place-items: center;
}

.icon-btn:hover {
  background: var(--tp-fill);
}

.host-avatar {
  display: grid;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffd6a5, #ff9a76);
  color: #fff;
  font-size: 12px;
  place-items: center;
}

.detail-foot {
  display: flex;
  flex: none;
  gap: 12px;
  padding: 16px 24px 20px;
}

.detail-foot > button {
  flex: 1;
}
</style>
