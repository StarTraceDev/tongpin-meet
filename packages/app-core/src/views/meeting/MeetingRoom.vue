<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'
import { useInteractionStore } from '../../stores/interaction'
import { useMeetingStore } from '../../stores/meeting'
import type { SidePanelKey } from '../../stores/panels'
import { useParticipantsStore } from '../../stores/participants'
import { useRtcStore } from '../../stores/rtc'
import BreakStage from './components/BreakStage.vue'
import MeetingStage from './components/MeetingStage.vue'
import SidePanelsDock from './components/SidePanelsDock.vue'
import MeetingToolbar from './components/MeetingToolbar.vue'
import MeetingTopBar from './components/MeetingTopBar.vue'
import { useMeetingLayout } from './composables/useMeetingLayout'
import { useMeetingMount } from './composables/useMeetingMount'
import { useSidePanels } from './composables/useSidePanels'
import { useMeetingWindow } from './composables/useMeetingWindow'
import { useTitlebar } from './composables/useTitlebar'
import '../../styles/meeting.css'

const props = defineProps<{
  payload?: { meetingId?: string; panels?: SidePanelKey[] }
}>()

const route = useRoute()
const meeting = useMeetingStore()
const participants = useParticipantsStore()
const rtc = useRtcStore()
const chat = useChatStore()
const interaction = useInteractionStore()
const auth = useAuthStore()

/** 桌面端从子窗口 payload 进会，web 端从 /meeting/:id 进会 */
const meetingId = computed<string>(() => {
  if (props.payload?.meetingId !== undefined) return props.payload.meetingId
  const fromRoute = route.params.id
  return Array.isArray(fromRoute) ? (fromRoute[0] ?? '') : (fromRoute ?? '')
})

const { elapsed, loading, error, retry } = useMeetingMount(() => meetingId.value)
const { toggleFullscreen, openPanel, closeRoom } = useMeetingWindow()
const { onDoubleClick } = useTitlebar(() => meeting.title)
const { layoutMode, setLayoutPreference } = useMeetingLayout()
const { panels, openPanel: openSidePanel, detachPanel } = useSidePanels(() => meetingId.value)
const ongoingVotes = computed<number>(
  () => interaction.votes.filter((vote) => vote.status === 'ONGOING').length,
)

/** 深链带面板（`payload.panels` / `?panels=a,b`）时按顺序铺开，便于直达多面板态 */
onMounted(() => {
  const fromQuery = route.query.panels
  const list =
    props.payload?.panels ??
    (typeof fromQuery === 'string' ? (fromQuery.split(',') as SidePanelKey[]) : [])
  for (const key of list) panels.open(key)
  if (meetingId.value !== '') {
    void interaction.loadVotes(meetingId.value).catch(() => undefined)
    void interaction.loadBreaks(meetingId.value).catch(() => undefined)
  }
})

/** 更多菜单：录制留到 M13-8，其余都开对应面板 */
function openFromMore(panel: SidePanelKey | 'recording'): void {
  if (panel === 'recording') {
    ElMessage.info('会议录制将在 M13-8 接入')
    return
  }
  openSidePanel(panel)
}

const startTime = computed<string>(() => {
  const startAt = meeting.meeting?.startAt
  if (startAt === undefined) return ''
  const date = new Date(startAt)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

/** 工具栏胶囊回车：自己回显一条，同时丢给适配层（真实实现会广播给远端） */
function sendChat(text: string): void {
  const name = participants.self?.name ?? auth.user?.name ?? '我'
  const id = participants.self?.id ?? 'self'
  chat.send(text, { id, name })
  rtc.sendChat(text)
}

function toggleBarrage(): void {
  chat.setBarrage(!chat.barrageOn)
}

async function handleEnd(): Promise<void> {
  await meeting.leave()
  closeRoom()
}
</script>

<template>
  <div class="room">
    <template v-if="meeting.title !== ''">
      <MeetingTopBar
        :start-time="startTime"
        :elapsed="elapsed"
        :layout-mode="layoutMode"
        :member-count="participants.count"
        @dblclick="onDoubleClick"
        @detail="openPanel('meetingDetail')"
        @fullscreen="toggleFullscreen"
        @select-layout="setLayoutPreference"
      />
      <div class="room-body">
        <BreakStage v-if="interaction.activeBreak !== null" />
        <MeetingStage v-else :participants="participants.participants" :layout="layoutMode" />
        <SidePanelsDock v-if="panels.hasPanels" @detach="detachPanel" />
      </div>
      <MeetingToolbar
        :mic-on="rtc.micOn"
        :camera-on="rtc.cameraOn"
        :member-count="participants.count"
        :barrage-on="chat.barrageOn"
        :unread="chat.unread"
        :vote-count="ongoingVotes"
        @toggle-mic="rtc.toggleMic()"
        @toggle-camera="rtc.toggleCamera()"
        @toggle-barrage="toggleBarrage"
        @send-chat="sendChat"
        @share="ElMessage.info('屏幕共享将在 M13-8 接入')"
        @members="openSidePanel('members')"
        @chat="openSidePanel('chat')"
        @open-panel="openFromMore"
        @end="handleEnd"
      />
    </template>

    <div v-else class="room-state">
      <p v-if="loading">正在进入会议…</p>
      <p v-else>{{ error === '' ? '会议不存在或已结束' : error }}</p>
      <button v-if="!loading" class="room-state-btn" type="button" @click="retry">重试</button>
      <button v-if="!loading" class="room-state-btn" type="button" @click="closeRoom">
        返回首页
      </button>
    </div>
  </div>
</template>

<style scoped>
.room-state-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--tp-border);
  border-radius: 6px;
  background: #fff;
  color: var(--tp-text-primary);
  font-size: 13px;
  cursor: pointer;
}
</style>
