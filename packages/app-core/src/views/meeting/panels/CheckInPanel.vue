<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useInteractionStore } from '../../../stores/interaction'
import { usePanelContext } from './panelContext'

const interaction = useInteractionStore()
const panelContext = usePanelContext()

const tab = ref<'create' | 'records'>('create')
const durationMin = ref(5)
const note = ref('')
const submitting = ref(false)
const now = ref(Date.now())
const expanded = ref<string | null>(null)
const counts = ref<Record<string, number>>({})
const durationOpen = ref(false)

let clock: ReturnType<typeof setInterval> | null = null

const ongoing = computed(() => interaction.activeCheckin)
const meetingId = computed(() => panelContext.meetingId())

const deadline = computed<number>(() => {
  if (interaction.checkinDeadline !== null) return interaction.checkinDeadline
  if (ongoing.value === null) return 0
  return new Date(ongoing.value.createdAt).getTime() + durationMin.value * 60_000
})

const remaining = computed<number>(() =>
  Math.max(0, Math.round((deadline.value - now.value) / 1000)),
)

const remainingText = computed<string>(() => {
  const total = Math.max(
    0,
    deadline.value === 0 ? 0 : Math.ceil((deadline.value - now.value) / 1000),
  )
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const progress = computed<number>(() => {
  if (ongoing.value === null) return 0
  const span = Math.max(1, deadline.value - new Date(ongoing.value.createdAt).getTime())
  return Math.min(1, Math.max(0, (deadline.value - now.value) / span))
})

const RING = 54
const CIRCUMFERENCE = 2 * Math.PI * RING

const ringDash = computed<string>(() => `${CIRCUMFERENCE * progress.value} ${CIRCUMFERENCE}`)

const canCreate = computed<boolean>(() => note.value.length <= 20 && !submitting.value)

function startClock(): void {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

onMounted(async () => {
  startClock()
  if (meetingId.value !== '') await interaction.loadCheckins(meetingId.value)
})

onBeforeUnmount(() => {
  if (clock !== null) clearInterval(clock)
})

watch(
  () => interaction.activeCheckin?.id,
  () => {
    now.value = Date.now()
  },
)

async function create(): Promise<void> {
  if (meetingId.value === '') return
  submitting.value = true
  try {
    await interaction.startCheckin(
      meetingId.value,
      { title: note.value.trim() === '' ? '全员签到' : note.value.trim(), anonymous: false },
      durationMin.value,
    )
    tab.value = 'create'
    ElMessage.success('签到已发起')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发起签到失败')
  } finally {
    submitting.value = false
  }
}

async function stop(): Promise<void> {
  const current = ongoing.value
  if (current === null || meetingId.value === '') return
  try {
    await interaction.endCheckin(meetingId.value, current.id)
    ElMessage.success('签到已终止')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '终止签到失败')
  }
}

async function signIn(): Promise<void> {
  const current = ongoing.value
  if (current === null || meetingId.value === '') return
  try {
    const result = await interaction.signIn(meetingId.value, current.id)
    ElMessage.success(result.alreadyRecorded ? '你已签到过了' : '签到成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '签到失败')
  }
}

function openRecords(): void {
  tab.value = 'records'
  void loadCounts()
}

function pickDuration(value: number): void {
  durationMin.value = value
  durationOpen.value = false
}

async function loadCounts(): Promise<void> {
  if (meetingId.value === '') return
  for (const item of interaction.checkins.slice(0, 10)) {
    if (counts.value[item.id] !== undefined) continue
    counts.value[item.id] = await interaction.joinedOf(meetingId.value, item.id)
  }
}

async function toggleRecords(id: string): Promise<void> {
  if (expanded.value === id) {
    expanded.value = null
    return
  }
  expanded.value = id
  if (meetingId.value !== '') await interaction.loadCheckinRecords(meetingId.value, id)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<template>
  <div class="checkin-panel">
    <div class="panel-tabs sub-tabs">
      <button
        class="panel-tab"
        :class="{ on: tab === 'create' }"
        type="button"
        @click="tab = 'create'"
      >
        发起签到
      </button>
      <button
        class="panel-tab"
        :class="{ on: tab === 'records' }"
        type="button"
        @click="openRecords"
      >
        签到记录
      </button>
    </div>

    <div v-if="tab === 'create'" class="checkin-body">
      <template v-if="ongoing === null">
        <div class="checkin-card">
          <button class="checkin-row" type="button" @click="durationOpen = !durationOpen">
            <span>签到时长</span>
            <span class="checkin-row-value"
              >{{ durationMin }}分钟 <AppIcon name="right" :size="14"
            /></span>
          </button>
          <div v-if="durationOpen" class="checkin-durations">
            <button
              v-for="option in [5, 10, 15, 30]"
              :key="option"
              type="button"
              class="checkin-duration"
              :class="{ on: durationMin === option }"
              @click="pickDuration(option)"
            >
              {{ option }}分钟
            </button>
          </div>
          <div class="checkin-divider" />
          <textarea
            v-model="note"
            class="checkin-note"
            maxlength="20"
            placeholder="请输入签到说明（选填）"
          />
          <div class="checkin-count">{{ note.length }}/20</div>
        </div>
        <p class="checkin-hint">
          发起签到后，其他成员将收到签到应用通知，成员可在签到应用窗口内完成签到。
        </p>
        <div class="checkin-foot">
          <button class="sub-primary" type="button" :disabled="!canCreate" @click="create">
            立即发起
          </button>
        </div>
      </template>

      <template v-else>
        <div class="checkin-ring-wrap">
          <svg class="checkin-ring" viewBox="0 0 128 128">
            <circle class="ring-track" cx="64" cy="64" :r="RING" />
            <circle
              class="ring-value"
              cx="64"
              cy="64"
              :r="RING"
              :stroke-dasharray="ringDash"
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div class="checkin-ring-center">
            <strong>{{ remainingText }}</strong>
            <span>{{ remaining > 0 ? '剩余时间' : '已结束' }}</span>
          </div>
        </div>
        <p class="checkin-count-line">
          已签到：<b>{{ interaction.checkinJoined }}</b
          >人 您可在「签到记录」中查看详细记录
        </p>
        <div class="checkin-foot">
          <button v-if="!panelContext.isHost()" class="sub-primary" type="button" @click="signIn">
            我签到
          </button>
          <button v-else class="sub-danger" type="button" @click="stop">终止签到</button>
        </div>
      </template>
    </div>

    <div v-else class="checkin-records">
      <p v-if="interaction.checkins.length === 0" class="panel-empty">还没有签到记录</p>
      <template v-for="item in interaction.checkins" :key="item.id">
        <div class="record-card">
          <button class="record-main" type="button" @click="toggleRecords(item.id)">
            <div class="record-title">
              <strong>{{ counts[item.id] ?? 0 }}人签到</strong>
              <span v-if="item.status === 'ONGOING'" class="record-tag">进行中</span>
              <span class="record-detail">详情 <AppIcon name="right" :size="14" /></span>
            </div>
            <p class="record-sub">{{ formatTime(item.createdAt) }} 发起</p>
          </button>
          <ul v-if="expanded === item.id" class="record-list">
            <li
              v-for="record in interaction.checkinRecords"
              :key="record.userName + record.respondedAt"
            >
              <span>{{ record.userName }}</span>
              <span>{{ formatTime(record.respondedAt) }}</span>
            </li>
            <li v-if="interaction.checkinRecords.length === 0" class="record-empty">
              暂无签到记录
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>
