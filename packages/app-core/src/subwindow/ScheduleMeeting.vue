<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import { createMeeting } from '../apis/meeting'
import { usePlatform } from '../platform'
import { useAuthStore } from '../stores/auth'

const platform = usePlatform()
const auth = useAuthStore()

const DURATIONS = [30, 60, 120]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const base = new Date(Date.now() + 30 * 60_000)

const topic = ref(`${auth.user?.name ?? '我'}预定的会议`)
const date = ref(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`)
const time = ref(`${pad(base.getHours())}:${pad(base.getMinutes())}`)
const duration = ref(60)
const passwordOn = ref(false)
const password = ref('123456')
const allowWaitingRoom = ref(true)
const watermark = ref(false)
const muteOnJoin = ref(false)
const submitting = ref(false)

const startAt = computed<Date | null>(() => {
  const parsed = new Date(`${date.value}T${time.value}:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
})

const canSubmit = computed<boolean>(
  () =>
    topic.value.trim() !== '' &&
    startAt.value !== null &&
    (!passwordOn.value || password.value.trim().length >= 6),
)

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value || startAt.value === null) return
  submitting.value = true
  try {
    const start = startAt.value
    const end = new Date(start.getTime() + duration.value * 60_000)
    await createMeeting({
      title: topic.value.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      inviteeIds: [],
      allowWaitingRoom: allowWaitingRoom.value,
      ...(passwordOn.value ? { password: password.value.trim() } : {}),
      settings: {
        muteOnJoin: muteOnJoin.value,
        watermark: watermark.value,
        allowGuest: true,
        autoRecord: false,
      },
    })
    ElMessage.success('会议已预定')
    await platform.window.closeSub('schedule')
  } catch {
    ElMessage.error('预定失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="schedule-window">
    <header class="schedule-head">预定会议</header>

    <div class="schedule-body">
      <div class="form-row">
        <label class="form-label" for="schedule-topic">主题</label>
        <input id="schedule-topic" v-model="topic" class="form-input" type="text" />
      </div>

      <div class="form-row">
        <label class="form-label" for="schedule-date">开始</label>
        <div class="form-split">
          <input id="schedule-date" v-model="date" class="form-input" type="date" />
          <input v-model="time" class="form-input form-time" type="time" />
        </div>
      </div>

      <div class="form-row">
        <label class="form-label" for="schedule-duration">时长</label>
        <select id="schedule-duration" v-model.number="duration" class="form-input form-select">
          <option v-for="item in DURATIONS" :key="item" :value="item">
            {{ item === 60 ? '1 小时' : `${item} 分钟` }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <span class="form-label">时区</span>
        <span class="form-static">(GMT+08:00) 北京</span>
      </div>

      <div class="form-row">
        <span class="form-label">安全</span>
        <div class="form-stack">
          <label class="check-line">
            <input v-model="passwordOn" type="checkbox" />
            <span>入会密码</span>
            <input v-model="password" class="form-input form-password" :disabled="!passwordOn" />
          </label>
          <label class="check-line">
            <input v-model="allowWaitingRoom" type="checkbox" />
            <span>允许成员在主持人进会前加入</span>
          </label>
          <label class="check-line">
            <input v-model="watermark" type="checkbox" />
            <span>开启会议水印</span>
          </label>
        </div>
      </div>

      <div class="form-row">
        <span class="form-label">静音</span>
        <div class="form-stack">
          <label class="check-line">
            <input v-model="muteOnJoin" type="radio" :value="true" />
            <span>入会后自动静音</span>
          </label>
          <label class="check-line">
            <input v-model="muteOnJoin" type="radio" :value="false" />
            <span>入会后保持麦克风开启</span>
          </label>
        </div>
      </div>
    </div>

    <footer class="schedule-foot">
      <button
        class="sub-primary"
        type="button"
        :disabled="!canSubmit || submitting"
        @click="submit"
      >
        {{ submitting ? '提交中…' : '预定会议' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.schedule-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.schedule-head {
  flex: none;
  height: 36px;
  color: var(--tp-text-title);
  font-size: 18px;
  font-weight: 500;
  line-height: 36px;
  text-align: center;
  -webkit-app-region: drag;
}

.schedule-body {
  flex: 1;
  min-height: 0;
  padding: 6px 24px 0;
  overflow-y: auto;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.form-label {
  flex: none;
  width: 44px;
  color: var(--tp-text-primary);
  font-size: 14px;
  line-height: 32px;
  text-align: right;
}

.form-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: #fff;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 14px;
}

.form-input:disabled {
  background: var(--tp-fill);
  color: var(--tp-text-tertiary);
}

.form-select {
  cursor: pointer;
}

.form-split {
  display: flex;
  flex: 1;
  gap: 10px;
}

.form-time {
  flex: none;
  width: 110px;
}

.form-static {
  color: var(--tp-text-primary);
  font-size: 14px;
  line-height: 32px;
}

.form-stack {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--tp-text-primary);
  font-size: 14px;
}

.check-line input[type='checkbox'],
.check-line input[type='radio'] {
  width: 16px;
  height: 16px;
  accent-color: var(--tp-brand);
}

.form-password {
  flex: none;
  width: 130px;
}

.schedule-foot {
  flex: none;
  padding: 16px 24px 20px;
}
</style>
