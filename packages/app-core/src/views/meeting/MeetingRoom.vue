<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppIcon from '../../components/AppIcon.vue'
import { ROUTE_NAMES } from '../../router/names'
import { usePlatform } from '../../platform'
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
import SpeakingPill from './components/SpeakingPill.vue'
import Whiteboard from './whiteboard/Whiteboard.vue'
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
const router = useRouter()
const platform = usePlatform()
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
const sharing = ref(false)
let shareStream: MediaStream | null = null

/** 桌面端走 M10-4 的自定义选择器，web 端走系统 getDisplayMedia */
async function toggleShare(): Promise<void> {
  if (sharing.value) {
    shareStream?.getTracks().forEach((track) => track.stop())
    shareStream = null
    sharing.value = false
    await rtc.setSharing(false)
    ElMessage.success('已停止共享')
    return
  }
  const source = await platform.capture.pickSource()
  if (source === null) return
  shareStream = source.stream ?? null
  sharing.value = true
  await rtc.setSharing(true)
  ElMessage.success(`正在共享：${source.name}`)
}

const speakingName = computed<string>(() => {
  const talking = participants.participants.find(
    (item) => item.speaking && item.id !== participants.self?.id,
  )
  return talking?.name ?? ''
})

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

type MorePick = SidePanelKey | 'recording' | 'whiteboard'

/** 白板内嵌时占掉视频区，并让工具栏的共享按钮变成「停止共享」 */
const whiteboardOpen = ref(false)

/** 更多菜单：录制留到 M13-8，白板内嵌，其余都开对应面板 */
function openWhiteboardWindow(): void {
  if (meetingId.value === '') return
  platform.window.openSub('whiteboard', { payload: { meetingId: meetingId.value } })
}

function openFromMore(panel: MorePick): void {
  if (panel === 'recording') {
    ElMessage.info('会议录制将在 M13-8 接入')
    return
  }
  if (panel === 'whiteboard') {
    whiteboardOpen.value = true
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

const leaveOpen = ref(false)
const ended = ref(false)

/**
 * 主持人可以「全员结束」，参会人只有「离开会议」。
 * web 端结束后跳结束页（/meetings/:id/ended）；桌面端会议室是独立子窗，
 * 子窗路由里没有结束页，就地显示结束卡片再关窗。
 */
async function confirmLeave(all: boolean): Promise<void> {
  leaveOpen.value = false
  try {
    if (all) await meeting.end()
    else await meeting.leave()
  } finally {
    if (platform.kind === 'electron') ended.value = true
    else void router.replace({ name: ROUTE_NAMES.meetingEnded, params: { id: meetingId.value } })
  }
}

function backHome(): void {
  if (platform.kind === 'electron') {
    closeRoom()
    return
  }
  void router.replace({ name: ROUTE_NAMES.home })
}
</script>

<template>
  <div class="room">
    <div v-if="ended" class="room-ended">
      <h2>会议已结束</h2>
      <p class="room-ended-meta">{{ meeting.title }}</p>
      <div class="room-ended-actions">
        <button class="sub-primary" type="button" @click="backHome">返回首页</button>
      </div>
    </div>

    <template v-else-if="meeting.title !== ''">
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
        <Whiteboard
          v-if="whiteboardOpen"
          embedded
          @close="whiteboardOpen = false"
          @detach="openWhiteboardWindow"
        />
        <BreakStage v-else-if="interaction.activeBreak !== null" />
        <MeetingStage
          v-else-if="!sharing"
          :participants="participants.participants"
          :layout="layoutMode"
        />
        <div v-else class="share-stage">
          <div class="share-card">
            <AppIcon name="monitor" :size="34" />
            <p class="share-title">正在共享屏幕</p>
            <p class="share-hint">共享内容只对其他参会人可见，点击工具栏「停止共享」结束</p>
          </div>
        </div>
        <SpeakingPill
          v-if="speakingName !== '' && !sharing && !whiteboardOpen"
          :name="speakingName"
        />
        <SidePanelsDock v-if="panels.hasPanels" @detach="detachPanel" />
      </div>
      <MeetingToolbar
        :mic-on="rtc.micOn"
        :camera-on="rtc.cameraOn"
        :member-count="participants.count"
        :barrage-on="chat.barrageOn"
        :unread="chat.unread"
        :vote-count="ongoingVotes"
        :share-active="sharing"
        :leave-open="leaveOpen"
        @toggle-mic="rtc.toggleMic()"
        @toggle-camera="rtc.toggleCamera()"
        @toggle-barrage="toggleBarrage"
        @send-chat="sendChat"
        @share="toggleShare"
        @members="openSidePanel('members')"
        @chat="openSidePanel('chat')"
        @open-panel="openFromMore"
        @end="leaveOpen = !leaveOpen"
      />

      <div v-if="rtc.status === 'reconnecting'" class="reconnect-bar">
        网络连接已断开，正在重连…
      </div>

      <div v-if="leaveOpen" class="leave-pop">
        <button v-if="meeting.isHost" class="leave-all" type="button" @click="confirmLeave(true)">
          全员结束会议
        </button>
        <button class="leave-one" type="button" @click="confirmLeave(false)">离开会议</button>
      </div>
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
