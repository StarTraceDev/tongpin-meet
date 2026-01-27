<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { createMeeting } from '../apis/meeting'
import { usePlatform } from '../platform'
import { useAuthStore } from '../stores/auth'
import type { Meeting } from '@tongpin/shared/types'

const platform = usePlatform()
const auth = useAuthStore()

const meeting = ref<Meeting | null>(null)
const videoOn = ref(false)
const loading = ref(true)
const error = ref('')

/** 会议号按 3 位分组，和设计稿一致 */
const meetingNoText = computed<string>(() => {
  const no = meeting.value?.meetingNo ?? ''
  return no.replace(/(\d{3})(?=\d)/g, '$1 ')
})

const canEnter = computed<boolean>(() => meeting.value !== null)

async function create(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    const end = new Date(now.getTime() + 60 * 60_000)
    meeting.value = await createMeeting({
      title: `${auth.user?.name ?? '我'}的快速会议`,
      startAt: now.toISOString(),
      endAt: end.toISOString(),
      inviteeIds: [],
      allowWaitingRoom: false,
      settings: { muteOnJoin: true, watermark: false, allowGuest: true, autoRecord: false },
    })
  } catch {
    error.value = '创建会议失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

async function enter(): Promise<void> {
  if (meeting.value === null) return
  await platform.window.openSub('meeting', { payload: { meetingId: meeting.value.id } })
  await platform.window.closeSub('quick')
}

async function copyNo(): Promise<void> {
  const no = meeting.value?.meetingNo ?? ''
  if (no === '') return
  await navigator.clipboard.writeText(no)
  ElMessage.success('会议号已复制')
}

onMounted(create)
</script>

<template>
  <div class="quick-window">
    <header class="quick-head">快速会议</header>

    <div class="quick-body">
      <section class="quick-card quick-row">
        <span>开启视频</span>
        <button
          class="switch"
          :class="{ on: videoOn }"
          type="button"
          role="switch"
          :aria-checked="videoOn"
          @click="videoOn = !videoOn"
        >
          <i />
        </button>
      </section>

      <section class="quick-card">
        <div class="quick-row quick-row-top">
          <span>会议号</span>
          <span class="quick-no">
            <template v-if="loading">创建中…</template>
            <template v-else-if="error !== ''">{{ error }}</template>
            <template v-else>{{ meetingNoText }}</template>
            <button
              v-if="meeting !== null"
              class="quick-copy"
              type="button"
              title="复制会议号"
              @click="copyNo"
            >
              <AppIcon name="copy" :size="18" />
            </button>
          </span>
        </div>
        <p v-if="meeting !== null" class="quick-hint">
          <AppIcon name="info" :size="14" />
          进入会议后可邀请他人加入
        </p>
        <p v-else-if="error !== ''" class="quick-hint quick-hint-error">创建失败后可直接重试</p>
      </section>
    </div>

    <footer class="quick-foot">
      <button class="sub-primary" type="button" :disabled="!canEnter" @click="enter">
        进入会议
      </button>
    </footer>
  </div>
</template>

<style scoped>
.quick-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.quick-head {
  flex: none;
  height: 36px;
  color: var(--tp-text-title);
  font-size: 18px;
  font-weight: 500;
  line-height: 36px;
  text-align: center;
  -webkit-app-region: drag;
}

.quick-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 0;
  overflow-y: auto;
}

.quick-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--tp-radius-m);
  background: var(--tp-fill);
}

.quick-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  color: var(--tp-text-primary);
}

.quick-row-top {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--tp-border);
}

.quick-no {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--tp-text-primary);
  font-variant-numeric: tabular-nums;
}

.quick-copy {
  display: inline-flex;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--tp-text-secondary);
  cursor: pointer;
}

.quick-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: var(--tp-radius-s);
  background: var(--tp-brand-tint);
  color: var(--tp-text-secondary);
  font-size: 12px;
}

.quick-hint-error {
  color: var(--tp-danger);
}

.quick-foot {
  flex: none;
  padding: 16px 24px 20px;
}

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 11px;
  background: var(--tp-border);
  cursor: pointer;
  transition: background 0.15s;
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}

.switch.on {
  background: var(--tp-brand);
}

.switch.on i {
  transform: translateX(18px);
}
</style>
