<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useInteractionStore } from '../../../stores/interaction'
import { useMeetingStore } from '../../../stores/meeting'
import { useParticipantsStore } from '../../../stores/participants'

const meeting = useMeetingStore()
const interaction = useInteractionStore()
const participants = useParticipantsStore()

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const active = computed(() => interaction.activeBreak)

const returnAt = computed<string>(() => {
  if (active.value === null) return '--:--'
  const date = new Date(
    new Date(active.value.startedAt).getTime() + (active.value.plannedSec ?? 0) * 1000,
  )
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

const remainingText = computed<string>(() => {
  if (active.value === null) return '--:--'
  const deadline =
    new Date(active.value.startedAt).getTime() + (active.value.plannedSec ?? 0) * 1000
  return format(deadline - now.value)
})

const backCount = computed<number>(
  () => (interaction.breakOverview?.records ?? []).filter((item) => !item.resting).length,
)

interface Row {
  id: string
  name: string
  back: boolean
}

const rows = computed<Row[]>(() => {
  const records = interaction.breakOverview?.records ?? []
  const map = new Map(records.map((item) => [item.userId, !item.resting]))
  return participants.participants.map((item) => ({
    id: item.id,
    name: item.name,
    back: map.get(item.id) === true,
  }))
})

function format(duration: number): string {
  const total = Math.max(0, Math.ceil(duration / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function emitBack(): void {
  const current = active.value
  if (current === null || meeting.meetingId === '') return
  void interaction.markBreak(meeting.meetingId, current.id, false)
}

onMounted(async () => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  if (meeting.meetingId !== '') await interaction.loadBreaks(meeting.meetingId)
})

onBeforeUnmount(() => {
  if (clock !== null) clearInterval(clock)
})
</script>

<template>
  <section v-if="active !== null" class="break-stage">
    <header class="break-stage-head">
      <AppIcon name="clock" :size="18" />
      <span>休息一下</span>
    </header>
    <div class="break-stage-body">
      <div class="break-stage-left">
        <h2><AppIcon name="clock" :size="26" />已开启会间休息</h2>
        <div class="break-stage-card">
          <div class="break-clock big">
            <strong>{{ returnAt }}</strong>
            <span>回来</span>
          </div>
          <div class="break-pill">剩余 {{ remainingText }} <em>修改时间</em></div>
          <p class="break-backline">
            已回来：<b>{{ backCount }}</b
            >/{{ rows.length }}人
            <span class="break-detail">详情 <AppIcon name="right" :size="13" /></span>
          </p>
          <div class="break-stage-actions">
            <button
              class="sub-ghost"
              type="button"
              @click="interaction.endBreak(meeting.meetingId, active.id)"
            >
              结束休息
            </button>
            <button class="sub-primary" type="button" @click="emitBack">我回来了</button>
          </div>
        </div>
      </div>
      <aside class="break-side">
        <p class="break-side-head">
          已回来：<b>{{ backCount }}</b> / {{ rows.length }}人
        </p>
        <ul class="break-side-list">
          <li v-for="row in rows" :key="row.id">
            <span class="break-avatar" />
            <span class="break-name">{{ row.name }}</span>
            <span class="break-state" :class="{ back: row.back }">{{
              row.back ? '已回来' : '休息中'
            }}</span>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
